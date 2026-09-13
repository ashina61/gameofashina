import { TIER_WORKSHOP_REQUIREMENT } from '@/config/Constants';
import { getShip, SHIPS, shipsForShipyardLevel, transportShip } from '@/config/ShipCatalog';
import { getUnit, UNITS, unitsForBarracksLevel } from '@/config/UnitCatalog';
import { nextTier, TIER_NAMES } from '@/config/Tiers';
import { barracksLevel, shipyardLevel, workshopLevel } from '@/core/CityQuery';
import { mergeStacks, subtractStacks, totalStacks } from '@/utils/Stacks';
import type { EventBus } from '@/core/EventBus';
import type { GameState } from '@/core/GameState';
import type { ConstructionSystem } from './ConstructionSystem';
import type { ResearchSystem } from './ResearchSystem';
import type { ResourceSystem } from './ResourceSystem';
import type {
  CityState,
  MaterialKey,
  ResourceAmounts,
  ShipStack,
  TrainingTask,
  UnitStack,
  UpgradeTier,
} from '@/types';

/**
 * Askeri uretim: birlikler Kisla'dan, gemiler Tersane'den.
 *
 * IKI AYRI KUYRUK
 * Ikariam'da kışla ve tersane BAGIMSIZ calisir: ayni anda hem birlik
 * egitilebilir hem gemi insa edilebilir. Tek kuyruk olsaydi oyuncu
 * donanma ile ordu arasinda sahte bir tercih yapmaya zorlanirdi. Her
 * kuyrugun ICINDE ise ayni anda yalnizca bir gorev ilerler.
 *
 * KADEMELER OYUNCU GENELINDE
 * Bronz/Gumus/Altin kademesi birim TURU basinadir ve tum sehirlerde
 * gecerlidir (GameState.tiers). Ikariam'da Atolye gelistirmesi
 * hesabiniza baglidir, tek bir sehire degil; sehre bagli tutmak ayni
 * birliktin iki sehirde farkli guclulukte savasmasi demek olurdu.
 *
 * BAKIM GLOBAL ALTINDAN
 * Uretilen birlik sehirde durur ama bakimi oyuncunun TEK altin
 * havuzundan odenir (EconomySystem). Bakim odenemezse birlikler dagilir.
 */

export type TierKind = 'unit' | 'ship';

export class MilitarySystem {
  constructor(
    private readonly state: GameState,
    private readonly resources: ResourceSystem,
    private readonly construction: ConstructionSystem,
    private readonly research: ResearchSystem,
    private readonly bus: EventBus,
  ) {}

  // --- Kilitleme -----------------------------------------------------------

  /**
   * Bir birimin sehirde egitilip egitilemeyecegi.
   *
   * Uc kapi vardir ve hepsi Ikariam'dan gelir:
   *   1. Arastirma (orn. Kilic Ustaligi olmadan Kilicli egitilemez)
   *   2. Kisla seviyesi (birimin `requiredBarracksLevel` esigi)
   *   3. Sehirde Kisla bulunmasi
   */
  unitLock(city: CityState, unitId: string): string | null {
    const def = getUnit(unitId);
    if (!def) return 'Bilinmeyen birlik.';

    const barracks = barracksLevel(city);
    if (barracks <= 0) return 'Önce Kışla inşa edin.';
    if (barracks < def.requiredBarracksLevel) {
      return `${def.name} için Kışla seviyesi ${def.requiredBarracksLevel} olmalı (şu an ${barracks}).`;
    }
    if (def.requiresResearch && !this.research.isDone(def.requiresResearch)) {
      return `${def.name} için gereken araştırma tamamlanmadı.`;
    }
    if (!this.research.unitUnlocked(unitId)) return 'Bu birlik henüz açılmadı.';
    return null;
  }

  /** Bir geminin insa edilip edilemeyecegi. */
  shipLock(city: CityState, shipId: string): string | null {
    const def = getShip(shipId);
    if (!def) return 'Bilinmeyen gemi.';

    const yard = shipyardLevel(city);
    if (yard <= 0) return 'Önce Tersane inşa edin.';
    if (yard < def.requiredShipyardLevel) {
      return `${def.name} için Tersane seviyesi ${def.requiredShipyardLevel} olmalı (şu an ${yard}).`;
    }
    if (def.requiresResearch && !this.research.isDone(def.requiresResearch)) {
      return `${def.name} için gereken araştırma tamamlanmadı.`;
    }
    return null;
  }

  /** Sehirde egitilebilecek birlikler (kilitli olmayanlar). */
  trainableUnits(city: CityState): UnitStack[] {
    const level = barracksLevel(city);
    return unitsForBarracksLevel(level)
      .filter((u) => this.unitLock(city, u.id) === null)
      .map((u) => ({ id: u.id, count: 0, tier: this.state.unitTier(u.id) }));
  }

  /** Sehirde insa edilebilecek gemiler. */
  buildableShips(city: CityState): ShipStack[] {
    const level = shipyardLevel(city);
    return shipsForShipyardLevel(level)
      .filter((s) => this.shipLock(city, s.id) === null)
      .map((s) => ({ id: s.id, count: 0, tier: this.state.shipTier(s.id) }));
  }

  // --- Maliyet ve sure -----------------------------------------------------

  /**
   * Bir adet birimin maliyeti.
   *
   * Ikariam'da arastirma ve bina bonuslari INSASAT maliyetini dusurur.
   * Ayni indirim birim maliyetine de uygulanir; aksi halde arastirma
   * agacinin ekonomi dali yalnizca binalarda ise yarar ve askeride
   * karsiligi olmayan bir dal olurdu.
   */
  unitCost(city: CityState, unitId: string, count = 1): ResourceAmounts {
    const def = getUnit(unitId);
    if (!def) return {};
    return this.scaled(city, def.cost, count);
  }

  /** Bir adet geminin maliyeti. */
  shipCost(city: CityState, shipId: string, count = 1): ResourceAmounts {
    const def = getShip(shipId);
    if (!def) return {};
    return this.scaled(city, def.cost, count);
  }

  /** Indirim uygulanmis maliyet. */
  private scaled(city: CityState, base: ResourceAmounts, count: number): ResourceAmounts {
    const out: ResourceAmounts = {};
    for (const key of Object.keys(base) as MaterialKey[]) {
      const raw = base[key] ?? 0;
      if (raw <= 0) continue;
      const reduced = raw * (1 - this.construction.reductionFor(city, key));
      out[key] = Math.max(1, Math.ceil(reduced * Math.max(1, count)));
    }
    // Altin indirime tabi degildir: indirim bina/kaynak ekonomisine aittir,
    // altin maliyetini kirmak bakim dengesini de bozardi.
    const gold = base.gold ?? 0;
    if (gold > 0) out.gold = Math.ceil(gold * Math.max(1, count));
    return out;
  }

  /** Bir birimin egitim suresi (oyun saniyesi). Kisla seviyesi hizlandirir. */
  unitTime(city: CityState, unitId: string): number {
    const def = getUnit(unitId);
    if (!def) return 0;
    const speedup = 1 / (1 + Math.max(0, barracksLevel(city)) * 0.06);
    return Math.max(1, Math.round(def.trainTime * speedup));
  }

  /** Bir geminin insa suresi (oyun saniyesi). Tersane seviyesi hizlandirir. */
  shipTime(city: CityState, shipId: string): number {
    const def = getShip(shipId);
    if (!def) return 0;
    const speedup = 1 / (1 + Math.max(0, shipyardLevel(city)) * 0.06);
    return Math.max(1, Math.round(def.buildTime * speedup));
  }

  // --- Egitim --------------------------------------------------------------

  /** Birim egitimi mumkun mu? */
  canTrain(city: CityState, unitId: string, count: number): string | null {
    if (!Number.isFinite(count) || count <= 0) return 'Adet sıfırdan büyük olmalı.';
    const lock = this.unitLock(city, unitId);
    if (lock) return lock;

    const each = this.unitCost(city, unitId, 1);
    // Depo tavani kisiti: tek birimin maliyeti bile depoya sigmiyorsa
    // kaynak hic biriktirilemez; oyuncuya once depo kurmasi soylenir.
    const capacity = this.resources.storageCapacity(city);
    for (const key of Object.keys(each) as MaterialKey[]) {
      if ((each[key] ?? 0) > capacity) {
        return 'Birim maliyeti depo kapasitesini aşıyor; önce Depo inşa edin.';
      }
    }
    if (!this.resources.affordable(city, this.unitCost(city, unitId, count))) {
      return 'Kaynaklar yetmiyor.';
    }
    return null;
  }

  /** Birim egitir; kuyruga ekler. */
  train(city: CityState, unitId: string, count: number): boolean {
    if (this.canTrain(city, unitId, count)) return false;
    if (!this.resources.spend(city, this.unitCost(city, unitId, count))) return false;

    const perUnit = this.unitTime(city, unitId);
    city.unitQueue.push({
      id: unitId,
      count,
      remainingGameSeconds: perUnit * count,
      perUnitGameSeconds: perUnit,
      tier: this.state.unitTier(unitId),
      startedAtTick: this.state.tick,
    });
    this.bus.emit('training:started', city.id, unitId, count);
    this.bus.emit('resources:changed', city.id);
    return true;
  }

  /** Gemi insa kosulu. */
  canBuildShip(city: CityState, shipId: string, count: number): string | null {
    if (!Number.isFinite(count) || count <= 0) return 'Adet sıfırdan büyük olmalı.';
    const lock = this.shipLock(city, shipId);
    if (lock) return lock;

    const each = this.shipCost(city, shipId, 1);
    const capacity = this.resources.storageCapacity(city);
    for (const key of Object.keys(each) as MaterialKey[]) {
      if ((each[key] ?? 0) > capacity) {
        return 'Gemi maliyeti depo kapasitesini aşıyor; önce Depo inşa edin.';
      }
    }
    if (!this.resources.affordable(city, this.shipCost(city, shipId, count))) {
      return 'Kaynaklar yetmiyor.';
    }
    return null;
  }

  /** Gemi insa eder. */
  buildShip(city: CityState, shipId: string, count: number): boolean {
    if (this.canBuildShip(city, shipId, count)) return false;
    if (!this.resources.spend(city, this.shipCost(city, shipId, count))) return false;

    const perShip = this.shipTime(city, shipId);
    city.shipQueue.push({
      id: shipId,
      count,
      remainingGameSeconds: perShip * count,
      perUnitGameSeconds: perShip,
      tier: this.state.shipTier(shipId),
      startedAtTick: this.state.tick,
    });
    this.bus.emit('training:started', city.id, shipId, count);
    this.bus.emit('resources:changed', city.id);
    return true;
  }

  /** Nakliye gemisi kisayolu. */
  buildTransport(city: CityState, count: number): boolean {
    return this.buildShip(city, transportShip().id, count);
  }

  /** Kuyruktaki bir gorevi iptal eder; kalan kisim iade edilir. */
  cancel(city: CityState, kind: TierKind, index: number): boolean {
    const queue = kind === 'unit' ? city.unitQueue : city.shipQueue;
    if (index < 0 || index >= queue.length) return false;

    const task = queue[index];
    const done = task.perUnitGameSeconds > 0
      ? Math.floor((task.count * task.perUnitGameSeconds - task.remainingGameSeconds) / task.perUnitGameSeconds)
      : 0;
    const undone = Math.max(0, task.count - done);
    if (undone > 0) {
      const refund = kind === 'unit'
        ? this.unitCost(city, task.id, undone)
        : this.shipCost(city, task.id, undone);
      // Altin ayri havuzdadir: sehir deposuna degil oyuncunun havuzuna
      // geri gider. Ikisi karistirilirsa iade depo tavanina takilip
      // kaybolur.
      const gold = refund.gold ?? 0;
      delete refund.gold;
      if (gold > 0) this.state.addGold(gold);
      this.resources.add(city, refund);
    }

    queue.splice(index, 1);
    this.bus.emit('training:cancelled', city.id, task.id);
    this.bus.emit('resources:changed', city.id);
    return true;
  }

  // --- Kademe gelistirme ---------------------------------------------------

  /** Bir tur icin mevcut kademe (oyuncu genelinde). */
  tierOf(kind: TierKind, id: string): UpgradeTier {
    return kind === 'unit' ? this.state.unitTier(id) : this.state.shipTier(id);
  }

  /**
   * Kademe gelistirme kosulu.
   *
   * Ikariam'da kademe gelistirmesi Atolye'de yapilir ve Invention
   * arastirmasi gerektirir. Maliyet SAHIP OLUNAN birim sayisiyla carpar:
   * tek bir birimi yukseltmek yoktur, tum ordu yukselir.
   */
  canUpgradeTier(city: CityState, kind: TierKind, id: string): string | null {
    if (workshopLevel(city) <= 0) return 'Önce Atölye inşa edin.';
    if (!this.research.isDone('invention')) return 'Önce İcatlar araştırmasını tamamlayın.';

    const def = kind === 'unit' ? getUnit(id) : getShip(id);
    if (!def) return 'Bilinmeyen birim.';

    const current = this.tierOf(kind, id);
    const target = nextTier(current);
    if (!target) return `${def.name} zaten azami kademede.`;

    const required = TIER_WORKSHOP_REQUIREMENT[target] ?? 1;
    if (workshopLevel(city) < required) {
      return `${TIER_NAMES[target]} kademesi için Atölye seviyesi ${required} olmalı (şu an ${workshopLevel(city)}).`;
    }
    if (!this.resources.affordable(city, this.tierCost(city, kind, id))) {
      return 'Kaynaklar yetmiyor.';
    }
    return null;
  }

  /** Kademe gelistirme maliyeti: sahip olunan her birim basina. */
  tierCost(city: CityState, kind: TierKind, id: string): ResourceAmounts {
    const def = kind === 'unit' ? getUnit(id) : getShip(id);
    if (!def) return {};
    const target = nextTier(this.tierOf(kind, id));
    if (!target) return {};

    const perUnit = def.upgradeCost?.[target] ?? {};
    const owned = this.ownedCount(kind, id);
    // Yeni egitilecek birlikler de ayni kademede cikacagi icin maliyet
    // yalnizca MEVCUT sayiya gore alinir; Ikariam'da da boyle.
    const count = Math.max(1, owned);

    const out: ResourceAmounts = {};
    for (const key of Object.keys(perUnit) as MaterialKey[]) {
      const raw = perUnit[key] ?? 0;
      if (raw <= 0) continue;
      out[key] = Math.ceil(raw * count * (1 - this.construction.reductionFor(city, key)));
    }
    const gold = perUnit.gold ?? 0;
    if (gold > 0) out.gold = Math.ceil(gold * count);
    return out;
  }

  /** Bir turden sehirde kac adet var (kuyruktakiler haric). */
  ownedCount(kind: TierKind, id: string): number {
    let total = 0;
    for (const city of this.state.cities) {
      const stacks = kind === 'unit' ? city.garrison : city.warfleet;
      total += stacks.filter((s) => s.id === id).reduce((sum, s) => sum + s.count, 0);
    }
    return total;
  }

  /** Kademeyi gelistirir; oyuncunun TUM sehirlerindeki birimlere uygulanir. */
  upgradeTier(city: CityState, kind: TierKind, id: string): boolean {
    if (this.canUpgradeTier(city, kind, id)) return false;
    if (!this.resources.spend(city, this.tierCost(city, kind, id))) return false;

    const target = nextTier(this.tierOf(kind, id));
    if (!target) return false;

    const table = kind === 'unit' ? this.state.tiers.units : this.state.tiers.ships;
    table[id] = target;

    // Mevcut yiginlar ve kuyruktaki gorevler yeni kademeye tasinir.
    for (const other of this.state.cities) {
      const stacks = (kind === 'unit' ? other.garrison : other.warfleet) as UnitStack[] | ShipStack[];
      for (const stack of stacks) if (stack.id === id) stack.tier = target;
      const queue = kind === 'unit' ? other.unitQueue : other.shipQueue;
      for (const task of queue) if (task.id === id) task.tier = target;
    }

    this.bus.emit('tier:upgraded', kind, id, target);
    this.bus.emit('resources:changed', city.id);
    return true;
  }

  // --- Kuyruk ilerletme ----------------------------------------------------

  /**
   * Askeri kuyruklari ilerletir.
   *
   * Her kuyruktan ayni anda yalnizca ILK gorev islenir. Kalan sure gorev
   * bazinda tutulur; bittiginde birimler garnizona, gemiler filoya eklenir.
   * Nakliye gemileri savas gemisi degildir: dogrudan sehrin yuk gemisi
   * havuzuna yazilir.
   */
  advance(gameSeconds: number): void {
    if (gameSeconds <= 0) return;

    for (const city of this.state.cities) {
      this.advanceQueue(city, city.unitQueue, 'unit', gameSeconds);
      this.advanceQueue(city, city.shipQueue, 'ship', gameSeconds);
    }
  }

  private advanceQueue(
    city: CityState,
    queue: TrainingTask[],
    kind: TierKind,
    gameSeconds: number,
  ): void {
    let budget = gameSeconds;
    while (budget > 0 && queue.length > 0) {
      const task = queue[0];
      const step = Math.min(budget, task.remainingGameSeconds);
      task.remainingGameSeconds -= step;
      budget -= step;
      if (task.remainingGameSeconds > 0) break;

      queue.shift();
      if (kind === 'unit') {
        mergeStacks(city.garrison, [{ id: task.id, count: task.count, tier: task.tier }]);
      } else if (getShip(task.id)?.shipClass === 'transport') {
        city.cargoShips += task.count;
      } else {
        mergeStacks(city.warfleet, [{ id: task.id, count: task.count, tier: task.tier }]);
      }
      this.bus.emit('training:completed', city.id, task.id, task.count);
    }
  }

  /** Sehrin toplam kara birliği. */
  cityUnitCount(city: CityState): number {
    return totalStacks(city.garrison);
  }

  /** Sehrin toplam savas gemisi (nakliye haric). */
  cityShipCount(city: CityState): number {
    return totalStacks(city.warfleet);
  }

  /** Birlikleri sehirden ayirir (filoya binerken). */
  detach(city: CityState, units: readonly UnitStack[], ships: readonly ShipStack[]): void {
    subtractStacks(city.garrison, units);
    subtractStacks(city.warfleet, ships);
  }

  /** Birlikleri sehre geri koyar (filo dondugunde). */
  attach(city: CityState, units: readonly UnitStack[], ships: readonly ShipStack[]): void {
    mergeStacks(city.garrison, units);
    mergeStacks(city.warfleet, ships);
  }

  /** Tum birlik turleri (arayuz listesi icin). */
  allUnits(): readonly UnitStack[] {
    return UNITS.map((u) => ({ id: u.id, count: 0, tier: 'base' as UpgradeTier }));
  }

  /** Tum gemi turleri (arayuz listesi icin). */
  allShips(): readonly ShipStack[] {
    return SHIPS.map((s) => ({ id: s.id, count: 0, tier: 'base' as UpgradeTier }));
  }
}
