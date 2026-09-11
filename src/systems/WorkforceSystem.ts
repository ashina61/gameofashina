import { WORKER_TRAVEL_TICKS } from '@/config/Constants';
import { getBuilding, levelOf } from '@/config/BuildingCatalog';
import type { EventBus } from '@/core/EventBus';
import type { GameState } from '@/core/GameState';
import type { WorkerRecord, WorkforceSnapshot } from '@/types';

/** Atama denemesinin reddedilme nedeni. */
export type AssignError = 'unknown_building' | 'not_operational' | 'no_slots' | 'no_idle_worker';

/** Isci geri alma denemesinin reddedilme nedeni. */
export type ReleaseError = 'unknown_building' | 'no_worker';

export type AssignResult = { ok: true; worker: WorkerRecord } | { ok: false; reason: AssignError };
export type ReleaseResult = { ok: true; worker: WorkerRecord } | { ok: false; reason: ReleaseError };

/** Hata kodlarinin kullaniciya gosterilecek karsiliklari. */
export const WORKFORCE_MESSAGES: Record<AssignError | ReleaseError, string> = {
  unknown_building: 'Bina bulunamadi.',
  not_operational: 'Bina henuz calismiyor.',
  no_slots: 'Bu binada bos yer yok.',
  no_idle_worker: 'Bosta isci yok.',
  no_worker: 'Bu binada isci yok.',
};

/**
 * Is gucu: isci kayitlari, atama ve yolculuk.
 *
 * NEDEN VAR
 * Sprint 8'e kadar isciler yalnizca SAYIydi ve PopulationSystem her tik
 * binalara kurulus sirasina gore OTOMATIK dagitiyordu. Oyuncunun bir isciyi
 * belirli bir binaya yonlendirmesi mumkun degildi; elle yapilan herhangi bir
 * atama bir sonraki tikte eziliyordu. Artik atama OYUNCUNUN kararidir ve
 * kalicidir.
 *
 * SORUMLULUK SINIRI
 * Bu sistem KIMIN NEREDE calistigini belirler. Kac vatandas oldugu
 * PopulationSystem'in, ne uretildigi EconomySystem'in isidir. Kaynak
 * havuzuna dokunmaz.
 *
 * TURETILMIS DEGER
 * BuildingInstance.assignedWorkers artik bu sistemin ciktisidir ve yalnizca
 * 'working' durumundaki iscileri sayar. Yolda olan isci uretime KATKIDA
 * BULUNMAZ - atamanin bedeli budur.
 *
 * Gercek zaman yoktur; yalnizca verilen tik sayisi islenir.
 */
export class WorkforceSystem {
  private readonly state: GameState;
  private readonly bus: EventBus;

  private lastSnapshot: WorkforceSnapshot = emptySnapshot();

  constructor(state: GameState, bus: EventBus) {
    this.state = state;
    this.bus = bus;
  }

  /** En son hesaplanan is gucu ozeti. */
  get snapshot(): WorkforceSnapshot {
    return this.lastSnapshot;
  }

  /** Bir binanin kac isci alabilecegi; katalogdaki seviye degeri. */
  capacityOf(uid: string): number {
    const building = this.state.buildings.get(uid);
    if (!building || building.state !== 'active') return 0;
    return levelOf(getBuilding(building.type), building.level)?.workerRequirement ?? 0;
  }

  /** Binaya atanmis (yolda olanlar dahil) isci sayisi. */
  claimedBy(uid: string): number {
    let count = 0;
    for (const worker of this.state.workers) {
      if (worker.buildingUid === uid) count += 1;
    }
    return count;
  }

  /** Bosta bekleyen isci sayisi. */
  get idleCount(): number {
    let count = 0;
    for (const worker of this.state.workers) {
      if (worker.state === 'idle') count += 1;
    }
    return count;
  }

  /**
   * Bosta bir isciyi verilen binaya yollar.
   *
   * Isci ANINDA calismaya baslamaz: once yola cikar (state 'moving') ve
   * WORKER_TRAVEL_TICKS sonra 'working' olur. Yer kontrolu yolda olanlari da
   * sayar, aksi halde ayni slota birden fazla isci yollanabilirdi.
   */
  assign(uid: string): AssignResult {
    const building = this.state.buildings.get(uid);
    if (!building) return { ok: false, reason: 'unknown_building' };
    if (building.state !== 'active') return { ok: false, reason: 'not_operational' };

    const capacity = this.capacityOf(uid);
    if (capacity <= 0 || this.claimedBy(uid) >= capacity) {
      return { ok: false, reason: 'no_slots' };
    }

    const worker = this.state.workers.find((w) => w.state === 'idle');
    if (!worker) return { ok: false, reason: 'no_idle_worker' };

    this.state.setWorkerJob(worker.id, uid, 'moving', 0);
    this.syncBuilding(uid);
    this.publish();
    this.bus.emit('workforce:changed', this.lastSnapshot);
    return { ok: true, worker };
  }

  /**
   * Binadan bir isciyi geri alir ve bosa cikarir.
   * Once YOLDAKI isci geri cagrilir; calisan bir isciyi sokmek uretimi
   * gereksiz yere keserdi.
   */
  release(uid: string): ReleaseResult {
    const building = this.state.buildings.get(uid);
    if (!building) return { ok: false, reason: 'unknown_building' };

    const workers = this.state.workers.filter((w) => w.buildingUid === uid);
    if (workers.length === 0) return { ok: false, reason: 'no_worker' };

    const worker = workers.find((w) => w.state === 'moving') ?? workers[workers.length - 1];
    this.state.setWorkerJob(worker.id, null, 'idle', 1);
    this.syncBuilding(uid);
    this.publish();
    this.bus.emit('workforce:changed', this.lastSnapshot);
    return { ok: true, worker };
  }

  /** Binadaki TUM iscileri bosa cikarir; yikim ve devre disi birakma icin. */
  releaseAll(uid: string): number {
    let freed = 0;
    for (const worker of this.state.workers) {
      if (worker.buildingUid !== uid) continue;
      this.state.setWorkerJob(worker.id, null, 'idle', 1);
      freed += 1;
    }
    if (freed > 0) {
      this.syncBuilding(uid);
      this.publish();
      this.bus.emit('workforce:changed', this.lastSnapshot);
    }
    return freed;
  }

  /**
   * Verilen tik kadar yolculugu ilerletir.
   *
   * Yalnizca YOLDAKI isciler dolasilir; calisan ve bosta isciler her tikte
   * taranmaz. Yolculuk suresi sabittir (mesafe hesabi, rota bulma yoktur).
   */
  advance(ticks: number, options: { silent?: boolean } = {}): WorkforceSnapshot {
    if (!Number.isFinite(ticks) || ticks <= 0) return this.lastSnapshot;
    const whole = Math.floor(ticks);
    if (whole <= 0) return this.lastSnapshot;

    const step = whole / WORKER_TRAVEL_TICKS;
    const arrived = new Set<string>();

    for (const worker of this.state.workers) {
      if (worker.state !== 'moving') continue;
      const next = worker.travel + step;
      if (next >= 1) {
        this.state.setWorkerJob(worker.id, worker.buildingUid, 'working', 1);
        if (worker.buildingUid) arrived.add(worker.buildingUid);
      } else {
        this.state.setWorkerJob(worker.id, worker.buildingUid, 'moving', next);
      }
    }

    for (const uid of arrived) this.syncBuilding(uid);

    this.publish();
    if (!options.silent && arrived.size > 0) {
      this.bus.emit('workforce:changed', this.lastSnapshot);
    }
    return this.lastSnapshot;
  }

  /**
   * Isci kayitlarini nufusla ve bina durumlariyla hizalar.
   *
   * - Nufus arttiysa yeni isciler BOSTA dogar; otomatik atanmazlar.
   * - Nufus azaldiysa once BOSTA isciler gider; sehir once issizini kaybeder.
   * - Artik calismayan (yikilan, insaata giren, devre disi kalan) binadaki
   *   isciler bosa cikar - sahipsiz referans kalmaz.
   * - Kapasitesinin ustunde isci tutan bina fazlasini birakir.
   *
   * Yukleme sonrasi ve her ilerlemede cagrilir.
   */
  reconcile(): WorkforceSnapshot {
    // 1. Gecersiz veya fazla atamalari coz.
    const claims = new Map<string, string[]>();
    for (const worker of this.state.workers) {
      if (!worker.buildingUid) continue;
      const list = claims.get(worker.buildingUid);
      if (list) list.push(worker.id);
      else claims.set(worker.buildingUid, [worker.id]);
    }

    for (const [uid, ids] of claims) {
      const capacity = this.capacityOf(uid);
      // Kapasiteyi asan veya artik calismayan binadaki isciler bosa cikar.
      for (let i = capacity; i < ids.length; i += 1) {
        this.state.setWorkerJob(ids[i], null, 'idle', 1);
      }
    }

    // 2. Isci sayisini nufusa esitle.
    const target = this.state.population;
    let current = this.state.workers.length;

    while (current < target) {
      this.state.addWorker();
      current += 1;
    }
    while (current > target) {
      const victim =
        [...this.state.workers].reverse().find((w) => w.state === 'idle') ??
        [...this.state.workers].reverse().find((w) => w.state === 'moving') ??
        this.state.workers[this.state.workers.length - 1];
      if (!victim) break;
      if (victim.buildingUid) this.state.setWorkerJob(victim.id, null, 'idle', 1);
      this.state.removeWorker(victim.id);
      current -= 1;
    }

    // 3. Bina sayaclarini tazele.
    for (const building of this.state.buildings.values()) this.syncBuilding(building.uid);

    this.publish();
    return this.lastSnapshot;
  }

  /** Arayuze son durumu bildirir. */
  publishChange(): void {
    this.publish();
    this.bus.emit('workforce:changed', this.lastSnapshot);
  }

  /** Binanin assignedWorkers degerini CALISAN isci sayisiyla esitler. */
  private syncBuilding(uid: string): void {
    let working = 0;
    for (const worker of this.state.workers) {
      if (worker.buildingUid === uid && worker.state === 'working') working += 1;
    }
    const building = this.state.buildings.get(uid);
    if (building && building.assignedWorkers !== working) {
      this.state.setAssignedWorkers(uid, working);
    }
  }

  /** Ozeti yeniden hesaplar. */
  private publish(): void {
    let idle = 0;
    let moving = 0;
    let working = 0;
    for (const worker of this.state.workers) {
      if (worker.state === 'idle') idle += 1;
      else if (worker.state === 'moving') moving += 1;
      else working += 1;
    }
    this.lastSnapshot = { total: this.state.workers.length, idle, moving, working };
  }
}

function emptySnapshot(): WorkforceSnapshot {
  return { total: 0, idle: 0, moving: 0, working: 0 };
}
