import { MAX_CONCURRENT_CONSTRUCTIONS } from '@/config/Constants';
import { getBuilding } from '@/config/BuildingCatalog';
import { constructionProgress, resolveTaskRefund } from './BuildingResolver';
import type { EventBus } from '@/core/EventBus';
import type { GameState } from '@/core/GameState';
import type { ResourceSystem } from './ResourceSystem';
import type {
  BuildingConstruction,
  BuildingInstance,
  ConstructionKind,
  ConstructionProgress,
  ConstructionTask,
} from '@/types';

/** Gorev baslatma denemesinin sonucu. */
export type RequestResult =
  | { ok: true; task: ConstructionTask; instant: false }
  | { ok: true; task: null; instant: true }
  | { ok: false; reason: 'unknown_building' | 'busy' };

/** Iptal isteginin sonucu. */
export interface CancelResult {
  task: ConstructionTask;
  /** Iptal sonucu iade edilen kaynaklar (cagiran taraf iade etmek zorunda degil). */
  refunded: boolean;
}

/**
 * Insaat ve yukseltme gorevlerini yoneten sistem.
 *
 * SORUMLULUK
 * Bir binanin uzerinde suren zamanli isin baslatilmasi, kuyruklanmasi,
 * ilerlemesi, iptali ve tamamlanmasi. Insa ile yukseltme ayni mekanizmayi
 * paylasir; fark, gorevin turu ve tamamlaninca uygulanan sonuctur.
 *
 * ZAMAN
 * Gercek zaman kullanilmaz - Date.now, setTimeout, setInterval ve
 * performance.now burada yoktur. Tamamlanma kosulu completesAtTick <= tick.
 *
 * KAYNAK GERCEGI (source of truth)
 * Gorev, hedef binanin icinde (BuildingInstance.construction) saklanir ve
 * kayitla birlikte gider. Buradaki active/queued koleksiyonlari yalnizca
 * TURETILMIS indekstir; hicbir zaman tek basina otorite degildir ve her
 * mutasyonda GameState ile birlikte guncellenir. rebuildFromState() bu
 * indeksi durumdan bastan kurabilir.
 *
 * KUYRUK
 * Ayni anda en fazla MAX_CONCURRENT_CONSTRUCTIONS gorev islenir. Slotlar
 * doluyken gelen gorev 'queued' olur: zamani islemez, uretimi etkilemez ve
 * construction:started yayinlamaz. Slot bosalinca sequence sirasina gore
 * (FIFO) aktiflesir ve o anda baslangic tiki hesaplanir.
 */
export class ConstructionSystem {
  private readonly state: GameState;
  private readonly resources: ResourceSystem;
  private readonly bus: EventBus;

  /** Islenen gorevler: hedef uid -> gorev. */
  private readonly active = new Map<string, ConstructionTask>();

  /** Slot bekleyen gorevler; sequence'e gore artan sirada tutulur. */
  private queued: ConstructionTask[] = [];

  constructor(state: GameState, resources: ResourceSystem, bus: EventBus) {
    this.state = state;
    this.resources = resources;
    this.bus = bus;
    this.rebuildFromState();
  }

  // --- Sorgular -------------------------------------------------------------

  get activeCount(): number {
    return this.active.size;
  }

  get queuedCount(): number {
    return this.queued.length;
  }

  /** Bos slot sayisi. */
  get freeSlots(): number {
    return Math.max(0, MAX_CONCURRENT_CONSTRUCTIONS - this.active.size);
  }

  activeTasks(): readonly ConstructionTask[] {
    return [...this.active.values()];
  }

  /** Kuyruktaki gorevler, aktiflesecekleri sirada. */
  queuedTasks(): readonly ConstructionTask[] {
    return [...this.queued];
  }

  /** Binanin gorevi (aktif veya kuyrukta); yoksa null. */
  taskFor(uid: string): ConstructionTask | null {
    return this.active.get(uid) ?? this.queued.find((t) => t.targetUid === uid) ?? null;
  }

  /** Binanin devam eden (aktif veya kuyrukta) bir gorevi var mi? */
  isBusy(uid: string): boolean {
    return this.taskFor(uid) !== null;
  }

  /** Gorevin gecerli tikteki ilerlemesi; gorev yoksa null. */
  progressFor(uid: string): ConstructionProgress | null {
    const task = this.taskFor(uid);
    return task ? constructionProgress(task, this.state.tick) : null;
  }

  // --- Indeks ---------------------------------------------------------------

  /**
   * Aktif/kuyruk indeksini oyun durumundan bastan kurar.
   *
   * Deterministiktir ve idempotenttir: ayni durum uzerinde kac kez cagrilirsa
   * cagrilsin ayni sonucu verir. Yapisal olarak gecersiz gorevler (negatif
   * tik, ters siralama, bilinmeyen tur) duruma geri yazilarak temizlenir -
   * sessizce indekste tutulmazlar.
   *
   * Suresi coktan dolmus bir aktif gorev indekse ALINMAZ; normal tamamlanma
   * yolundan gecirilerek kapatilir. Boylece hem indeks temiz kalir hem de
   * bina yarim durumda asili kalmaz.
   */
  rebuildFromState(): void {
    this.active.clear();
    this.queued = [];

    const collected: ConstructionTask[] = [];

    for (const building of this.state.buildings.values()) {
      const construction = building.construction;
      if (!construction) continue;

      if (!isStructurallyValid(construction)) {
        // Kurtarilamayan gorev: durumu tutarli hale getir.
        this.repairBroken(building);
        continue;
      }
      collected.push({ targetUid: building.uid, ...construction });
    }

    // Deterministik sira: kuyruk davranisi ve slot dagitimi buna dayanir.
    collected.sort((a, b) => a.sequence - b.sequence);

    const due: ConstructionTask[] = [];
    for (const task of collected) {
      if (task.status === 'active') {
        if (task.completesAtTick !== null && task.completesAtTick <= this.state.tick) {
          due.push(task);
          continue;
        }
        if (this.active.size < MAX_CONCURRENT_CONSTRUCTIONS) {
          this.active.set(task.targetUid, task);
        } else {
          // Limit dusurulmusse fazla aktif gorevler kuyruga geri alinir.
          this.queued.push(this.toQueued(task));
        }
      } else {
        this.queued.push(task);
      }
    }

    // Suresi dolmus gorevler normal yoldan kapatilir.
    for (const task of due) {
      this.settle(task, true);
    }

    this.promoteFromQueue(true);
  }

  // --- Gorev baslatma -------------------------------------------------------

  /**
   * Yeni kurulan bina icin insa gorevi talep eder.
   * Sure 0 ise gorev olusturulmaz; bina aninda devreye girer.
   */
  requestBuild(building: BuildingInstance, durationTicks: number): RequestResult {
    return this.request(building.uid, 'build', durationTicks);
  }

  /** Yukseltme gorevi talep eder. */
  requestUpgrade(targetUid: string, durationTicks: number): RequestResult {
    return this.request(targetUid, 'upgrade', durationTicks);
  }

  /**
   * Gorev talebi: slot varsa aktif, yoksa kuyruga alinir.
   * Sure 0 ise gorev hic olusturulmaz, sonuc aninda uygulanir.
   */
  request(targetUid: string, kind: ConstructionKind, durationTicks: number): RequestResult {
    const building = this.state.buildings.get(targetUid);
    if (!building) return { ok: false, reason: 'unknown_building' };
    if (this.isBusy(targetUid)) return { ok: false, reason: 'busy' };

    const duration = Math.max(0, Math.trunc(durationTicks));

    // Suresiz gorev: kuyruga girmez, aninda sonuclanir.
    if (duration === 0) {
      this.applyInstant(targetUid, kind);
      return { ok: true, task: null, instant: true };
    }

    const sequence = this.state.nextConstructionSequence();
    const canStart = this.active.size < MAX_CONCURRENT_CONSTRUCTIONS;

    const construction: BuildingConstruction = canStart
      ? {
          kind,
          status: 'active',
          durationTicks: duration,
          sequence,
          startedAtTick: this.state.tick,
          completesAtTick: this.state.tick + duration,
        }
      : {
          kind,
          status: 'queued',
          durationTicks: duration,
          sequence,
          startedAtTick: null,
          completesAtTick: null,
        };

    this.state.setBuildingConstruction(targetUid, construction);

    // Insa gorevi (aktif ya da kuyrukta) boyunca bina calismaz.
    if (kind === 'build') {
      this.state.setBuildingState(targetUid, 'constructing');
    }

    const task: ConstructionTask = { targetUid, ...construction };

    if (canStart) {
      this.active.set(targetUid, task);
      this.bus.emit('construction:started', task);
    } else {
      this.queued.push(task);
    }

    return { ok: true, task, instant: false };
  }

  // --- Ilerleme -------------------------------------------------------------

  /**
   * Tamamlanma tikine ulasan gorevleri isler, sonra bosalan slotlari kuyruktan
   * doldurur. Yalnizca aktif gorevler uzerinde gezer.
   */
  advance(options: { silent?: boolean } = {}): void {
    const silent = options.silent === true;

    if (this.active.size > 0) {
      const now = this.state.tick;
      let finished: ConstructionTask[] | null = null;

      for (const task of this.active.values()) {
        if (task.completesAtTick !== null && task.completesAtTick <= now) {
          (finished ??= []).push(task);
        }
      }

      if (finished) {
        for (const task of finished) {
          this.settle(task, silent);
        }
      }
    }

    this.promoteFromQueue(silent);
  }

  // --- Iptal ----------------------------------------------------------------

  /**
   * Gorevi iptal eder ve politikaya gore kaynak iade eder.
   *
   * Iade orani CANCEL_REFUND_RATE'ten gelir: kuyruktaki gorev hic baslamadigi
   * icin tam, aktif gorev yarisi. Iade hesabi BuildingResolver'dan okunur.
   *
   * refundResources=false verilirse yalnizca yasam dongusu temizligi yapilir;
   * kaynagi cagiran taraf yonetir (yikim boyle kullanir, cift iade olmaz).
   */
  cancel(targetUid: string, options: { refundResources?: boolean } = {}): CancelResult | null {
    const task = this.taskFor(targetUid);
    if (!task) return null;

    this.removeFromIndex(targetUid);
    this.state.setBuildingConstruction(targetUid, undefined);

    const building = this.state.buildings.get(targetUid);
    const refundResources = options.refundResources !== false;
    let refunded = false;

    if (building && refundResources) {
      const refund = resolveTaskRefund(
        getBuilding(building.type),
        building.level,
        task.kind,
        task.status,
      );
      this.resources.recalculateCapacity();
      this.resources.add(refund);
      refunded = true;
    }

    this.bus.emit('construction:cancelled', task);

    // Iptal bir slot bosaltmis olabilir.
    this.promoteFromQueue(false);

    return { task, refunded };
  }

  /**
   * Insaati bitmis veya suresiz kurulmus binayi devreye alir.
   * Kapasiteyi tazeler ve arayuze haber verir.
   */
  activate(uid: string): void {
    const building = this.state.buildings.get(uid);
    if (!building) return;

    this.resources.recalculateCapacity();
    this.resources.emitChange();
    this.bus.emit('building:completed', building);
  }

  // --- Ic isleyis -----------------------------------------------------------

  /** Bos slotlari kuyruktan FIFO sirasiyla doldurur. */
  private promoteFromQueue(silent: boolean): void {
    while (this.queued.length > 0 && this.active.size < MAX_CONCURRENT_CONSTRUCTIONS) {
      const next = this.queued.shift();
      if (!next) break;

      // Hedef bina bu arada yok olduysa gorev de dusurulur.
      const building = this.state.buildings.get(next.targetUid);
      if (!building) continue;

      const startedAtTick = this.state.tick;
      const construction: BuildingConstruction = {
        kind: next.kind,
        status: 'active',
        durationTicks: next.durationTicks,
        sequence: next.sequence,
        startedAtTick,
        completesAtTick: startedAtTick + next.durationTicks,
      };

      this.state.setBuildingConstruction(next.targetUid, construction);
      const task: ConstructionTask = { targetUid: next.targetUid, ...construction };
      this.active.set(next.targetUid, task);

      // Kuyruktaki gorev icin baslangic olayi ancak burada yayinlanir.
      if (!silent) {
        this.bus.emit('construction:started', task);
      }
    }
  }

  /** Gorevi kapatir ve turune gore sonucu uygular. */
  private settle(task: ConstructionTask, silent: boolean): void {
    this.removeFromIndex(task.targetUid);
    this.state.setBuildingConstruction(task.targetUid, undefined);

    if (task.kind === 'build') {
      this.state.setBuildingState(task.targetUid, 'active');
      if (!silent) this.activate(task.targetUid);
    } else {
      this.applyUpgrade(task.targetUid, silent);
    }

    if (!silent) {
      this.bus.emit('construction:completed', task);
    }
  }

  /**
   * Suresiz gorevi aninda uygular.
   * Olay yasam dongusu normal gorevle ayni kalsin diye tamamlanma olayi
   * burada da yayinlanir; boylece arayuz iki yolu ayirt etmek zorunda kalmaz.
   */
  private applyInstant(targetUid: string, kind: ConstructionKind): void {
    const sequence = this.state.nextConstructionSequence();
    const tick = this.state.tick;

    const task: ConstructionTask = {
      targetUid,
      kind,
      status: 'active',
      durationTicks: 0,
      sequence,
      startedAtTick: tick,
      completesAtTick: tick,
    };

    this.bus.emit('construction:started', task);

    if (kind === 'build') {
      this.state.setBuildingState(targetUid, 'active');
      this.activate(targetUid);
    } else {
      this.applyUpgrade(targetUid, false);
    }

    this.bus.emit('construction:completed', task);
  }

  /** Seviyeyi bir artirir ve kapasiteyi tazeler. */
  private applyUpgrade(targetUid: string, silent: boolean): void {
    const building = this.state.buildings.get(targetUid);
    if (!building) return;

    this.state.setBuildingLevel(targetUid, building.level + 1);
    this.resources.recalculateCapacity();
    if (!silent) this.resources.emitChange();
  }

  /** Gorevi her iki indeksten de cikarir. */
  private removeFromIndex(targetUid: string): void {
    this.active.delete(targetUid);
    const index = this.queued.findIndex((t) => t.targetUid === targetUid);
    if (index >= 0) this.queued.splice(index, 1);
  }

  /** Aktif gorevi kuyruk formuna cevirir (limit dusurulmesi durumunda). */
  private toQueued(task: ConstructionTask): ConstructionTask {
    return { ...task, status: 'queued', startedAtTick: null, completesAtTick: null };
  }

  /**
   * Kurtarilamayan gorevi durumdan temizler ve binayi tutarli hale getirir.
   * Insa gorevi bozuksa bina tamamlanmis sayilir; yukseltme gorevi bozuksa
   * bina mevcut seviyesinde kalir.
   */
  private repairBroken(building: BuildingInstance): void {
    this.state.setBuildingConstruction(building.uid, undefined);
    if (building.state === 'constructing') {
      this.state.setBuildingState(building.uid, 'active');
    }
  }
}

/**
 * Gorevin yapisal olarak gecerli olup olmadigi.
 * Zamanla ilgili "suresi dolmus mu" sorusu burada sorulmaz; o, tamamlanma
 * mantiginin isidir.
 */
function isStructurallyValid(construction: BuildingConstruction): boolean {
  const { kind, status, durationTicks, sequence, startedAtTick, completesAtTick } = construction;

  if (kind !== 'build' && kind !== 'upgrade') return false;
  if (status !== 'queued' && status !== 'active') return false;
  if (!Number.isFinite(durationTicks) || durationTicks < 0) return false;
  if (!Number.isFinite(sequence) || sequence < 0) return false;

  if (status === 'queued') {
    // Kuyruktaki gorevin zaman alanlari bos olmalidir.
    return startedAtTick === null && completesAtTick === null;
  }

  if (startedAtTick === null || completesAtTick === null) return false;
  if (!Number.isFinite(startedAtTick) || !Number.isFinite(completesAtTick)) return false;
  if (startedAtTick < 0 || completesAtTick < 0) return false;
  if (completesAtTick < startedAtTick) return false;

  return true;
}
