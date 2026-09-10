import { constructionProgress } from './BuildingResolver';
import type { EventBus } from '@/core/EventBus';
import type { GameState } from '@/core/GameState';
import type { ResourceSystem } from './ResourceSystem';
import type {
  BuildingInstance,
  ConstructionKind,
  ConstructionProgress,
  ConstructionTask,
} from '@/types';

/**
 * Insaat ve yukseltme gorevlerini yoneten sistem.
 *
 * SORUMLULUK
 * Bir binanin uzerinde suren zamanli isin baslatilmasi, takibi, tamamlanmasi
 * ve sonucunun duruma uygulanmasi. Insa ile yukseltme ayni mekanizmayi
 * paylasir; aralarindaki tek fark gorevin turu ve tamamlaninca uygulanan
 * sonuctur.
 *
 * ZAMAN
 * Sistem gercek zamani hic kullanmaz - Date.now(), setTimeout, setInterval ve
 * performance.now() burada yoktur. Ilerleme yalnizca simulasyon tikinden
 * turer; tamamlanma kosulu completesAtTick <= state.tick.
 *
 * GOREV SAKLAMA
 * Gorev, hedef binanin icinde (BuildingInstance.construction) saklanir ve
 * kayitla birlikte gider. Bir binanin ayni anda en fazla bir gorevi olabilir,
 * bu yuzden ayri bir gorev kimligine gerek yoktur ve "sahipsiz gorev" ya da
 * "ayni hedefe iki gorev" durumlari olusamaz.
 *
 * Sistem ayrica AKTIF gorevlerin bellek ici bir indeksini tutar; boylece her
 * tikte tum bina koleksiyonu taranmaz, yalnizca devam eden isler islenir.
 */
export class ConstructionSystem {
  private readonly state: GameState;
  private readonly resources: ResourceSystem;
  private readonly bus: EventBus;

  /** Aktif gorevler: hedef uid -> gorev. Koleksiyon taramasini onler. */
  private readonly active = new Map<string, ConstructionTask>();

  constructor(state: GameState, resources: ResourceSystem, bus: EventBus) {
    this.state = state;
    this.resources = resources;
    this.bus = bus;
    this.rebuildFromState();
  }

  /** Devam eden gorev sayisi. */
  get activeCount(): number {
    return this.active.size;
  }

  /** Devam eden gorevlerin salt okunur listesi. */
  activeTasks(): readonly ConstructionTask[] {
    return [...this.active.values()];
  }

  /** Verilen binanin devam eden gorevi; yoksa null. */
  taskFor(uid: string): ConstructionTask | null {
    return this.active.get(uid) ?? null;
  }

  /** Binanin devam eden bir gorevi var mi? */
  isBusy(uid: string): boolean {
    return this.active.has(uid);
  }

  /** Gorevin gecerli tikteki ilerlemesi; gorev yoksa null. */
  progressFor(uid: string): ConstructionProgress | null {
    const task = this.active.get(uid);
    return task ? constructionProgress(task, this.state.tick) : null;
  }

  /**
   * Aktif gorev indeksini oyun durumundan bastan kurar.
   * Kayit yuklendikten sonra ve indeksin tutarsiz kalma ihtimaline karsi
   * cagrilir; indeks turetilmis veridir, kaynagi her zaman GameState'tir.
   */
  rebuildFromState(): void {
    this.active.clear();
    for (const building of this.state.buildings.values()) {
      if (building.construction) {
        this.active.set(building.uid, { targetUid: building.uid, ...building.construction });
      }
    }
  }

  /**
   * Yeni kurulan bir bina icin insa gorevi baslatir.
   * Sure 0 ise gorev olusturulmaz, bina aninda devreye girer.
   */
  startBuild(building: BuildingInstance, durationTicks: number): ConstructionTask | null {
    if (durationTicks <= 0) {
      this.state.setBuildingState(building.uid, 'active');
      this.activate(building.uid);
      return null;
    }
    return this.start(building.uid, 'build', durationTicks);
  }

  /**
   * Yukseltme gorevi baslatir.
   * Bina yukseltme boyunca mevcut seviyesinde calismaya devam eder; seviye
   * ancak gorev tamamlaninca artar.
   */
  startUpgrade(targetUid: string, durationTicks: number): ConstructionTask | null {
    if (durationTicks <= 0) {
      // Suresi olmayan yukseltme aninda uygulanir.
      this.applyUpgrade(targetUid);
      return null;
    }
    return this.start(targetUid, 'upgrade', durationTicks);
  }

  /**
   * Tamamlanma tikine ulasan gorevleri isler.
   *
   * Yalnizca aktif gorevler uzerinde gezer; bina sayisi ne olursa olsun
   * maliyet devam eden is sayisiyla orantilidir.
   */
  advance(options: { silent?: boolean } = {}): void {
    if (this.active.size === 0) return;

    const now = this.state.tick;
    let finished: ConstructionTask[] | null = null;

    for (const task of this.active.values()) {
      if (task.completesAtTick <= now) {
        (finished ??= []).push(task);
      }
    }
    if (!finished) return;

    for (const task of finished) {
      this.complete(task, options.silent === true);
    }
  }

  /** Devam eden gorevi iptal eder (bina yikildiginda kullanilir). */
  cancel(targetUid: string): void {
    this.active.delete(targetUid);
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

  /** Gorevi olusturur, duruma yazar ve baslangici duyurur. */
  private start(
    targetUid: string,
    kind: ConstructionKind,
    durationTicks: number,
  ): ConstructionTask | null {
    const building = this.state.buildings.get(targetUid);
    if (!building) return null;

    // Ayni binada ikinci bir gorev baslatilamaz.
    if (this.active.has(targetUid)) return null;

    const startedAtTick = this.state.tick;
    const task: ConstructionTask = {
      targetUid,
      kind,
      startedAtTick,
      completesAtTick: startedAtTick + Math.max(1, Math.trunc(durationTicks)),
    };

    this.state.setBuildingConstruction(targetUid, {
      kind: task.kind,
      startedAtTick: task.startedAtTick,
      completesAtTick: task.completesAtTick,
    });

    // Insaat suresince bina calismaz; yukseltmede mevcut seviyede calismaya devam eder.
    if (kind === 'build') {
      this.state.setBuildingState(targetUid, 'constructing');
    }

    this.active.set(targetUid, task);
    this.bus.emit('construction:started', task);
    return task;
  }

  /** Gorevi kapatir ve turune gore sonucu uygular. */
  private complete(task: ConstructionTask, silent: boolean): void {
    this.active.delete(task.targetUid);
    this.state.setBuildingConstruction(task.targetUid, undefined);

    if (task.kind === 'build') {
      this.state.setBuildingState(task.targetUid, 'active');
      this.activate(task.targetUid);
    } else {
      this.applyUpgrade(task.targetUid);
    }

    if (!silent) {
      this.bus.emit('construction:completed', task);
    }
  }

  /** Seviyeyi bir artirir ve kapasiteyi tazeler. */
  private applyUpgrade(targetUid: string): void {
    const building = this.state.buildings.get(targetUid);
    if (!building) return;

    this.state.setBuildingLevel(targetUid, building.level + 1);
    this.resources.recalculateCapacity();
    this.resources.emitChange();
  }
}
