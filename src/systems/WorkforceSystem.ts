import { getBuilding, levelOf } from '@/config/BuildingCatalog';
import {
  idleAnchorFor,
  plazaFor,
  travelTicksFor,
  workAnchorFor,
  workerPosition,
} from './WorkerAnchor';
import type { EventBus } from '@/core/EventBus';
import type { GameState } from '@/core/GameState';
import type { WorkerRecord, WorkforceSnapshot, WorldPoint } from '@/types';

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
 * YASAM DONGUSU (Sprint 9)
 *   idle -> moving(binaya) -> working
 *   working -> moving(meydana) -> idle
 *   moving(binaya) -> moving(meydana) -> idle     (yolda geri cagrilirsa)
 *
 * Hicbir gecis ISINLAMA degildir: isci her zaman bulundugu noktadan
 * yurumeye baslar. Sure gercek mesafeden turer (WorkerAnchor).
 *
 * Gercek zaman yoktur; yalnizca verilen tik sayisi islenir.
 */
export class WorkforceSystem {
  private readonly state: GameState;
  private readonly bus: EventBus;

  /** Bosta iscilerin bekledigi nokta; izgara sabit oldugu icin bir kez hesaplanir. */
  private readonly plaza: WorldPoint;

  private lastSnapshot: WorkforceSnapshot = emptySnapshot();

  constructor(state: GameState, bus: EventBus) {
    this.state = state;
    this.bus = bus;
    this.plaza = plazaFor(state.grid.center());
  }

  /** Sehir meydaninin dunya konumu. */
  get plazaPoint(): WorldPoint {
    return this.plaza;
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
   * Bos bir isciyi verilen binaya yollar.
   *
   * Isci ANINDA calismaya baslamaz: bulundugu yerden binanin onundeki
   * duruş yerine YURUR ve ancak varinca 'working' olur. Sure mesafeden
   * turer. Yer kontrolu yolda olanlari da sayar, aksi halde ayni yere
   * birden fazla isci yollanabilirdi.
   *
   * Meydana DONMEKTE olan bir isci de gorevlendirilebilir: yolun ortasinda
   * geri doner. Aksi halde oyuncu "-" ye basip hemen "+" ya bastiginda
   * elindeki isci yokmus gibi gorunurdu.
   */
  assign(uid: string): AssignResult {
    const building = this.state.buildings.get(uid);
    if (!building) return { ok: false, reason: 'unknown_building' };
    if (building.state !== 'active') return { ok: false, reason: 'not_operational' };

    const capacity = this.capacityOf(uid);
    if (capacity <= 0 || this.claimedBy(uid) >= capacity) {
      return { ok: false, reason: 'no_slots' };
    }

    const worker = this.pickAvailable();
    if (!worker) return { ok: false, reason: 'no_idle_worker' };

    this.sendToWork(worker, uid, this.freeSlotOf(uid, capacity));
    this.syncBuilding(uid);
    this.publish();
    this.bus.emit('workforce:changed', this.lastSnapshot);
    return { ok: true, worker };
  }

  /**
   * Binadan bir isciyi geri cagirir.
   *
   * Once YOLDAKI isci geri cagrilir; calisan bir isciyi sokmek uretimi
   * gereksiz yere keserdi. Isci ANINDA bosa gecmez - binanin yerini hemen
   * birakir (uretim katkisi ayni tikte biter) ama meydana YURUYEREK doner
   * ve ancak varinca 'idle' olur.
   */
  release(uid: string): ReleaseResult {
    const building = this.state.buildings.get(uid);
    if (!building) return { ok: false, reason: 'unknown_building' };

    const workers = this.state.workers.filter((w) => w.buildingUid === uid);
    if (workers.length === 0) return { ok: false, reason: 'no_worker' };

    const worker = workers.find((w) => w.state === 'moving') ?? workers[workers.length - 1];
    this.sendHome(worker);
    this.syncBuilding(uid);
    this.publish();
    this.bus.emit('workforce:changed', this.lastSnapshot);
    return { ok: true, worker };
  }

  /** Binadaki TUM iscileri meydana yollar; yikim ve devre disi birakma icin. */
  releaseAll(uid: string): number {
    let freed = 0;
    for (const worker of this.state.workers) {
      if (worker.buildingUid !== uid) continue;
      this.sendHome(worker);
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
   * Verilen tik kadar yuruyusleri ilerletir.
   *
   * Yalnizca YOLDAKI isciler dolasilir; calisan ve bosta isciler her tikte
   * taranmaz. Kalan sure TAM SAYI oldugu icin 10 tiki tek seferde islemekle
   * 10 kez tek tik islemek birebir ayni varis anini verir.
   *
   * Varista isci ya ise baslar (hedefi bir binaydi) ya da bosa gecer
   * (hedefi meydandi).
   */
  advance(ticks: number, options: { silent?: boolean } = {}): WorkforceSnapshot {
    if (!Number.isFinite(ticks) || ticks <= 0) return this.lastSnapshot;
    const whole = Math.floor(ticks);
    if (whole <= 0) return this.lastSnapshot;

    let touched = 0;
    const arrived = new Set<string>();

    for (const worker of this.state.workers) {
      if (worker.state !== 'moving') continue;
      const left = worker.travelLeft - whole;
      if (left > 0) {
        this.state.setWorkerTravelLeft(worker.id, left);
        continue;
      }

      touched += 1;
      if (worker.buildingUid) {
        this.state.settleWorker(worker.id, 'working');
        arrived.add(worker.buildingUid);
      } else {
        this.state.settleWorker(worker.id, 'idle');
      }
    }

    for (const uid of arrived) this.syncBuilding(uid);

    this.publish();
    if (!options.silent && touched > 0) {
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
    const claims = new Map<string, WorkerRecord[]>();
    for (const worker of this.state.workers) {
      if (!worker.buildingUid) continue;
      const list = claims.get(worker.buildingUid);
      if (list) list.push(worker);
      else claims.set(worker.buildingUid, [worker]);
    }

    for (const [uid, crew] of claims) {
      const capacity = this.capacityOf(uid);
      // Kapasiteyi asan veya artik calismayan binadaki isciler meydana doner.
      for (let i = capacity; i < crew.length; i += 1) this.sendHome(crew[i]);
      // Kalanlarin duruş yerleri cakisiyorsa duzeltilir: bozuk bir kayit ya
      // da kapasite dusuren bir seviye degisimi ayni yere iki isci koyabilir.
      this.normalizeSlots(uid, crew.slice(0, Math.max(0, capacity)), capacity);
    }

    // 2. Isci sayisini nufusa esitle.
    const target = this.state.population;
    let current = this.state.workers.length;

    while (current < target) {
      // Yeni vatandas meydanda dogar; kimse onu otomatik ise yollamaz.
      const worker = this.state.addWorker(this.plaza.x, this.plaza.y);
      this.state.placeWorker(worker.id, idleAnchorFor(worker.id, this.plaza));
      current += 1;
    }
    while (current > target) {
      const victim =
        [...this.state.workers].reverse().find((w) => w.state === 'idle') ??
        [...this.state.workers].reverse().find((w) => w.state === 'moving') ??
        this.state.workers[this.state.workers.length - 1];
      if (!victim) break;
      this.state.removeWorker(victim.id);
      current -= 1;
    }

    // 3. Bina sayaclarini tazele.
    for (const building of this.state.buildings.values()) this.syncBuilding(building.uid);

    this.publish();
    return this.lastSnapshot;
  }

  /**
   * Kayittan gelen iscileri gecerli bir konuma oturtur.
   *
   * DURAN iscinin konumu her zaman yeniden hesaplanir: calisan bir isci
   * tanimi geregi duruş yerinde, bosta bir isci meydandaki yerindedir.
   * Kayittan okumaya gerek yok, cunku kayit zaten ayni degeri tasirdi -
   * ustelik bina yukseltildiyse ya da duruş yeri degistiyse hesaplanan
   * deger DOGRU, kayittaki bayat olurdu.
   *
   * YURUYEN isci ise yeniden uretilemeyen bir bilgi tasir: yolun neresinde
   * oldugu. Kayitli rota tutarliysa (hedefi hala dogru yer, kalan sure
   * makul) oldugu gibi surdurulur. Degilse - ornegin konum hic tutmayan
   * Sprint 8 sehri - isci meydandan yeniden yola cikarilir.
   */
  restorePositions(): void {
    for (const worker of this.state.workers) {
      const building = worker.buildingUid ? this.state.buildings.get(worker.buildingUid) : null;
      const home = idleAnchorFor(worker.id, this.plaza);

      // Binasi olmayan isci: bosta ya da meydana donuyor.
      if (!building) {
        if (worker.state === 'moving') {
          if (!this.routeLooksValid(worker, home)) this.restartWalk(worker, null, -1, home, this.plaza);
          continue;
        }
        // Binasiz "calisan" olamaz; SaveManager zaten bosa dusurur, burada
        // ikinci bir guvence.
        this.state.settleWorker(worker.id, 'idle');
        this.state.placeWorker(worker.id, home);
        continue;
      }

      const anchor = workAnchorFor(building, worker.slot);
      if (worker.state !== 'moving') {
        this.state.placeWorker(worker.id, anchor);
        continue;
      }
      if (this.routeLooksValid(worker, anchor)) continue;
      this.restartWalk(worker, worker.buildingUid, worker.slot, anchor, home);
    }
    this.publish();
  }

  /** Kayitli rota hala bu hedefe mi gidiyor ve kalan sure makul mu? */
  private routeLooksValid(worker: WorkerRecord, to: WorldPoint): boolean {
    if (worker.travelTicks <= 0) return false;
    if (worker.travelLeft <= 0 || worker.travelLeft > worker.travelTicks) return false;
    return Math.abs(worker.toX - to.x) < 0.5 && Math.abs(worker.toY - to.y) < 0.5;
  }

  /** Rotasi kurtarilamayan isciyi verilen baslangictan yeniden yola cikarir. */
  private restartWalk(
    worker: WorkerRecord,
    uid: string | null,
    slot: number,
    to: WorldPoint,
    from: WorldPoint,
  ): void {
    this.state.sendWorkerTo(worker.id, uid, slot, to, travelTicksFor(from, to), from);
  }

  /** Arayuze son durumu bildirir. */
  publishChange(): void {
    this.publish();
    this.bus.emit('workforce:changed', this.lastSnapshot);
  }

  /**
   * Gorevlendirilebilecek bir isci secer.
   * Once BOSTA olanlar; yoksa meydana donmekte olan biri yolun ortasinda
   * geri cevrilir.
   */
  private pickAvailable(): WorkerRecord | undefined {
    const workers = this.state.workers;
    for (const worker of workers) {
      if (worker.state === 'idle') return worker;
    }
    for (const worker of workers) {
      if (worker.state === 'moving' && !worker.buildingUid) return worker;
    }
    return undefined;
  }

  /** Binadaki ilk BOS duruş yeri; hepsi doluysa son sira. */
  private freeSlotOf(uid: string, capacity: number): number {
    const taken = new Set<number>();
    for (const worker of this.state.workers) {
      if (worker.buildingUid === uid) taken.add(worker.slot);
    }
    for (let slot = 0; slot < capacity; slot += 1) {
      if (!taken.has(slot)) return slot;
    }
    return Math.max(0, capacity - 1);
  }

  /** Isciyi binanin onundeki duruş yerine yurutur. */
  private sendToWork(worker: WorkerRecord, uid: string, slot: number): void {
    const building = this.state.buildings.get(uid);
    if (!building) return;
    const from = workerPosition(worker);
    const to = workAnchorFor(building, slot);
    this.state.sendWorkerTo(worker.id, uid, slot, to, travelTicksFor(from, to), from);
  }

  /**
   * Isciyi meydana yurutur.
   *
   * Bina baglantisi HEMEN kopar (uretim katkisi ayni tikte biter, yer
   * hemen bosalir) ama isci yurumeye devam eder; varinca 'idle' olur.
   */
  private sendHome(worker: WorkerRecord): void {
    const from = workerPosition(worker);
    const to = idleAnchorFor(worker.id, this.plaza);
    this.state.sendWorkerTo(worker.id, null, -1, to, travelTicksFor(from, to), from);
  }

  /**
   * Bir binadaki duruş yerlerini benzersiz hale getirir.
   * Yalnizca cakisma veya kapasite disi bir deger varsa mudahale eder;
   * aksi halde kimse yerinden oynamaz.
   */
  private normalizeSlots(uid: string, crew: WorkerRecord[], capacity: number): void {
    const taken = new Set<number>();
    const needsSlot: WorkerRecord[] = [];

    for (const worker of crew) {
      const valid = Number.isInteger(worker.slot) && worker.slot >= 0 && worker.slot < capacity;
      if (valid && !taken.has(worker.slot)) taken.add(worker.slot);
      else needsSlot.push(worker);
    }
    if (needsSlot.length === 0) return;

    const building = this.state.buildings.get(uid);
    if (!building) return;

    let next = 0;
    for (const worker of needsSlot) {
      while (taken.has(next) && next < capacity) next += 1;
      const slot = Math.min(next, Math.max(0, capacity - 1));
      taken.add(slot);
      const anchor = workAnchorFor(building, slot);
      if (worker.state === 'moving') {
        const from = workerPosition(worker);
        this.state.sendWorkerTo(worker.id, uid, slot, anchor, travelTicksFor(from, anchor), from);
      } else {
        this.state.assignWorkerSlot(worker.id, slot);
        this.state.placeWorker(worker.id, anchor);
      }
    }
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
