import { getBuilding, levelOf } from '@/config/BuildingCatalog';
import { gridToWorld, worldToGrid } from '@/utils/IsoUtils';
import { toWaypoints } from './NavigationSystem';
import {
  idleAnchorFor,
  plazaFor,
  travelTicksFor,
  workAnchorFor,
  workerPosition,
} from './WorkerAnchor';
import type { EventBus } from '@/core/EventBus';
import type { GameState } from '@/core/GameState';
import type { NavigationSystem } from './NavigationSystem';
import type {
  BuildingInstance,
  GridPoint,
  WorkerRecord,
  WorkforceSnapshot,
  WorldPoint,
} from '@/types';

/** Atama denemesinin reddedilme nedeni. */
export type AssignError =
  | 'unknown_building'
  | 'not_operational'
  | 'no_slots'
  | 'no_idle_worker'
  | 'unreachable';

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
  unreachable: 'Buraya yuruyerek gidilemiyor.',
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
  private readonly nav: NavigationSystem;

  /** Bosta iscilerin bekledigi nokta; izgara sabit oldugu icin bir kez hesaplanir. */
  private readonly plaza: WorldPoint;

  /**
   * Devam eden rotalar: isci id -> ara noktalar ve kacinci bacakta oldugu.
   *
   * Rota KAYDA YAZILMAZ. Turetilmis veridir: atama, konum ve harita
   * verildiginde ayni BFS ayni rotayi uretir. Kayit sema degisikligi
   * gerektirmemesinin ve eski kayitlarin calismaya devam etmesinin sebebi
   * budur; yuklemede eksik kuyruk yeniden hesaplanir.
   */
  private readonly routes = new Map<string, WorkerRoute>();

  private lastSnapshot: WorkforceSnapshot = emptySnapshot();

  /** Bu oturumda kac kez rota hesaplandi; olcum icin. */
  private pathQueries = 0;

  constructor(state: GameState, bus: EventBus, nav: NavigationSystem) {
    this.state = state;
    this.bus = bus;
    this.nav = nav;
    this.plaza = plazaFor(state.grid.center());
  }

  /**
   * Simdiye kadar yapilan rota hesabi sayisi.
   *
   * Rota yalnizca ATAMA, GERI CAGIRMA, hedefin gecersizlesmesi ve
   * yuklemede hesaplanir - kare basina ya da tik basina DEGIL. Bu sayac
   * o iddiayi olculebilir kilar.
   */
  get pathQueryCount(): number {
    return this.pathQueries;
  }

  /** Bir iscinin kalan ara noktalari; yalnizca olcum ve test icin. */
  remainingWaypoints(id: string): number {
    const route = this.routes.get(id);
    return route ? route.points.length - route.index : 0;
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

    // Rota YOKSA atama hic yapilmaz: yariya kadar yuruyup takilan bir isci
    // ya da sahipsiz bir atama birakmaktansa komutu bastan reddetmek hem
    // dogru hem de oyuncuya aciklanabilir.
    if (!this.sendToWork(worker, uid, this.freeSlotOf(uid, capacity))) {
      return { ok: false, reason: 'unreachable' };
    }
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

      /*
       * Bir pencere birden fazla BACAK tuketebilir. Artan tikler bir
       * sonraki bacaga devredilir; hepsi tam sayi oldugu icin 10 tiki tek
       * seferde islemekle 10 kez tek tik islemek birebir ayni sonucu verir.
       * Burada rota HESAPLANMAZ, yalnizca onceden kurulmus olan tuketilir.
       */
      let budget = whole;
      while (budget > 0) {
        if (worker.travelLeft > budget) {
          this.state.setWorkerTravelLeft(worker.id, worker.travelLeft - budget);
          break;
        }
        budget -= worker.travelLeft;

        if (this.startNextLeg(worker)) continue;

        touched += 1;
        if (worker.buildingUid) {
          this.state.settleWorker(worker.id, 'working');
          arrived.add(worker.buildingUid);
        } else {
          this.state.settleWorker(worker.id, 'idle');
        }
        break;
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
      this.routes.delete(victim.id);
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
    this.routes.clear();

    for (const worker of this.state.workers) {
      const building = worker.buildingUid ? this.state.buildings.get(worker.buildingUid) : null;
      const home = idleAnchorFor(worker.id, this.plaza);

      // Binasi olmayan isci: bosta ya da meydana donuyor.
      if (!building) {
        if (worker.state === 'moving') {
          if (!this.resumeWalk(worker, home)) this.sendHome(worker);
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
      if (this.resumeWalk(worker, anchor)) continue;
      if (!this.sendToWork(worker, building.uid, worker.slot)) this.sendHome(worker);
    }
    this.publish();
  }

  /**
   * Kayittan gelen YURUYEN isciyi bulundugu bacaktan devam ettirir.
   *
   * Bacagin kendisi kayittadir ve oldugu gibi korunur - iscinin konumu ve
   * kalan suresi degismez. Rotanin KUYRUGU ise kayitta yoktur; bacagin
   * bittigi noktadan hedefe yeniden hesaplanir. Bu sayede rota kayda
   * yazilmadan yukleme sonrasi yuruyus kaldigi yerden surer.
   */
  private resumeWalk(worker: WorkerRecord, target: WorldPoint): boolean {
    if (worker.travelTicks <= 0) return false;
    if (worker.travelLeft <= 0 || worker.travelLeft > worker.travelTicks) return false;

    const legEnd = { x: worker.toX, y: worker.toY };
    const reached = Math.abs(legEnd.x - target.x) < 0.5 && Math.abs(legEnd.y - target.y) < 0.5;
    const building = worker.buildingUid ? this.state.buildings.get(worker.buildingUid) : null;
    const goalTile = building ? this.approachTileFor(building, target) : null;
    const tail = reached ? [] : this.routeBetween(legEnd, target, worker.slot, goalTile);
    // Hedef ulasilamaz hale geldiyse bacagi surdurmenin anlami yok.
    if (!reached && tail.length === 0) return false;

    this.routes.set(worker.id, { points: [legEnd, ...tail], index: 0 });
    return true;
  }

  /**
   * Yoldaki tum iscilerin rotasini BULUNDUKLARI yerden yeniden hesaplar.
   *
   * Bina kurulunca cagrilir: o karo artik kapalidir ve o an yolda olan bir
   * iscinin rotasi yeni binanin icinden geciyor olabilir. Rotalar canli
   * haritadan turedigi icin yeniden hesaplamak yeterli - senkron tutulacak
   * ayri bir engel kopyasi yok.
   *
   * Yalnizca YURUYEN isciler dolasilir ve yalnizca bina yerlesiminde
   * cagrilir; kare basina ya da tik basina rota hesabi YOKTUR.
   */
  reroute(): void {
    for (const worker of this.state.workers) {
      if (worker.state !== 'moving') continue;
      const uid = worker.buildingUid;
      if (!uid) {
        this.sendHome(worker);
        continue;
      }
      if (!this.sendToWork(worker, uid, worker.slot)) this.sendHome(worker);
    }
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

  /**
   * Isciyi binanin onundeki duruş yerine yurutur.
   * Rota kurulamazsa false doner ve isci YERINDE kalir.
   */
  private sendToWork(worker: WorkerRecord, uid: string, slot: number): boolean {
    const building = this.state.buildings.get(uid);
    if (!building) return false;

    const anchor = workAnchorFor(building, slot);
    const approach = this.approachTileFor(building, anchor);
    if (!approach) return false;
    return this.walkTo(worker, uid, slot, anchor, approach);
  }

  /**
   * Iscinin binaya yanasacagi karo: ayak izini saran acik karolardan duruş
   * noktasina en yakini. Hicbiri acik degilse bina ULASILAMAZ.
   */
  private approachTileFor(building: BuildingInstance, anchor: WorldPoint): GridPoint | null {
    const size = getBuilding(building.type).size;
    const ring = this.nav.ringAround(building.gx, building.gy, size);
    if (ring.length === 0) return null;

    let best = ring[0];
    let bestDistance = Number.POSITIVE_INFINITY;
    for (const cell of ring) {
      const at = gridToWorld(cell.gx, cell.gy);
      const distance = Math.hypot(at.x - anchor.x, at.y - anchor.y);
      // Esitlikte ilk gelen kazanir; tarama sirasi sabit oldugu icin secim
      // deterministiktir.
      if (distance < bestDistance) {
        bestDistance = distance;
        best = cell;
      }
    }
    return best;
  }

  /**
   * Isciyi meydana yurutur.
   *
   * Bina baglantisi HEMEN kopar (uretim katkisi ayni tikte biter, yer
   * hemen bosalir) ama isci yurumeye devam eder; varinca 'idle' olur.
   *
   * Meydana rota yoksa isci OLDUGU YERDE bosa gecer: isinlamaktansa
   * yerinde kalmasi hem daha durust hem de uretim acisindan zararsizdir.
   */
  private sendHome(worker: WorkerRecord): void {
    if (this.walkTo(worker, null, -1, idleAnchorFor(worker.id, this.plaza), null)) return;
    this.routes.delete(worker.id);
    this.state.settleWorker(worker.id, 'idle');
  }

  /**
   * Isciyi bulundugu yerden verilen hedefe, GEZILEBILIR bir rota uzerinden
   * yurutur.
   *
   * Hedef noktanin karosu kapaliysa (bina, su) en yakin acik karo hedef
   * alinir ve son adim oraya atilir - isci binanin icine girmez. Baslangic
   * karosu kapaliysa da ayni sey yapilir; boylece sonradan uzerine bina
   * kurulmus bir noktada duran isci kilitlenmez.
   */
  private walkTo(
    worker: WorkerRecord,
    uid: string | null,
    slot: number,
    target: WorldPoint,
    goalTile: GridPoint | null,
  ): boolean {
    const from = workerPosition(worker);
    const points = this.routeBetween(from, target, slot, goalTile);
    if (points.length === 0) return false;

    this.routes.set(worker.id, { points, index: 0 });
    const first = points[0];
    this.state.sendWorkerTo(worker.id, uid, slot, first, travelTicksFor(from, first), from);
    return true;
  }

  /**
   * Iki dunya noktasi arasindaki ara noktalar.
   *
   * Son nokta hedefin KENDISIDIR (duruş yeri korunur). Hedefin karosu
   * kapaliysa son nokta en yakin acik karonun merkezine, duruş yerinin
   * yan kaymasi korunarak, tasinir.
   */
  private routeBetween(
    from: WorldPoint,
    target: WorldPoint,
    slot: number,
    goalTile: GridPoint | null,
  ): WorldPoint[] {
    this.pathQueries += 1;

    const startCell = worldToGrid(from.x, from.y);
    const goalCell = worldToGrid(target.x, target.y);

    // Baslangicta genis arama: uzerine sonradan bina kurulmus bir noktada
    // duran isci kilitlenmemeli.
    const start = this.nav.nearestWalkable(startCell.gx, startCell.gy);
    // Binaya giderken hedef karoyu cagiran belirler (ayak izinin bitisigi);
    // meydana donerken en yakin acik karo yeterlidir.
    const goal = goalTile ?? this.nav.nearestWalkable(goalCell.gx, goalCell.gy);
    if (!start || !goal) return [];

    const path = this.nav.findPath(start, goal);
    if (path.length === 0) return [];

    const waypoints = toWaypoints(path);
    /*
     * Baslangic karosunun merkezi normalde atlanir: isci zaten o karonun
     * icindedir ve komsu karonun merkezine giden dogru bu iki karonun
     * disina cikamaz.
     *
     * ISCI BASKA BIR KARODAYSA atlanamaz. Bu, uzerinde durdugu karo
     * sonradan kapandiginda olur (uzerine bina kuruldu) - o zaman
     * nearestWalkable baslangici komsu bir karoya tasir ve ilk bacak iki
     * karo birden atlayarak KOSE KESER. Olculdu: yogun sehirde isci ilk
     * iki tikte iki evin icinden geciyordu. Artik once kendi cikis
     * karosunun merkezine yuruyor.
     */
    const onStartTile = startCell.gx === start.gx && startCell.gy === start.gy;
    const middle = onStartTile ? waypoints.slice(1) : waypoints.slice(0);

    const reachedGoal = goal.gx === goalCell.gx && goal.gy === goalCell.gy;
    if (reachedGoal) {
      // Hedef karo acik: tam olarak duruş noktasina varilir.
      middle.push({ x: target.x, y: target.y });
      return middle;
    }

    /*
     * Hedef karo kapali. Son acik karonun merkezinde durulur, ama duruş
     * yerinin yan kaymasi korunur ki ayni binaya giden isciler burada da
     * ust uste binmesin.
     */
    const last = waypoints[waypoints.length - 1];
    const lane = slot > 0 ? slot : 0;
    middle.push({ x: last.x + (lane % 2 === 1 ? 14 : -14) * Math.ceil(lane / 2), y: last.y });
    return middle;
  }

  /**
   * Sirada bir ara nokta varsa iscinin bir sonraki bacagini baslatir.
   * Rota bittiyse false doner; varis karari cagirana aittir.
   */
  private startNextLeg(worker: WorkerRecord): boolean {
    const route = this.routes.get(worker.id);
    if (!route || route.index + 1 >= route.points.length) {
      this.routes.delete(worker.id);
      return false;
    }

    route.index += 1;
    const from = { x: worker.toX, y: worker.toY };
    const to = route.points[route.index];
    this.state.sendWorkerTo(
      worker.id,
      worker.buildingUid,
      worker.slot,
      to,
      travelTicksFor(from, to),
      from,
    );
    return true;
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
      if (worker.state === 'moving') {
        if (!this.sendToWork(worker, uid, slot)) this.sendHome(worker);
      } else {
        // Duran isci yeni yerine YURUR; kisa da olsa isinlanmaz.
        this.state.assignWorkerSlot(worker.id, slot);
        if (!this.sendToWork(worker, uid, slot)) {
          this.state.placeWorker(worker.id, workAnchorFor(building, slot));
        }
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

/** Bir iscinin devam eden rotasi; points[index] su anki bacagin hedefidir. */
interface WorkerRoute {
  points: WorldPoint[];
  index: number;
}

function emptySnapshot(): WorkforceSnapshot {
  return { total: 0, idle: 0, moving: 0, working: 0 };
}
