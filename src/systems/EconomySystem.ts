import {
  GAME_SECONDS_PER_HOUR,
  GOLD_PER_IDLE_CITIZEN,
  LUXURY_PER_WORKER_HOUR,
  OVERLOAD_LUXURY_WORKERS_PER_UNIT,
  OVERLOAD_WOOD_WORKERS_PER_UNIT,
  PRODUCTION_BUILDING_BONUS_PER_LEVEL,
  SCIENTIST_GOLD_DIRECT,
  WOOD_PER_WORKER_HOUR,
} from '@/config/Constants';
import { getShip } from '@/config/ShipCatalog';
import { getUnit } from '@/config/UnitCatalog';
import { TIER_UPKEEP_MULTIPLIER } from '@/config/Tiers';
import { buildingLevel } from '@/core/CityQuery';
import type { EventBus } from '@/core/EventBus';
import type { GameState } from '@/core/GameState';
import { aggregateEffects } from './ResearchEffects';
import type { CitizenSystem } from './CitizenSystem';
import type { HappinessSystem } from './HappinessSystem';
import type { ResourceSystem } from './ResourceSystem';
import type { WonderSystem } from './WonderSystem';
import type { CitySnapshot, CityState, MaterialKey, MaterialPool } from '@/types';

/**
 * Uretim, altin akisi ve bakim ucretleri.
 *
 * Ikariam'in ekonomisi uc ayri akistir ve hepsi VATANDAS ROLUNDEN turer:
 *
 *   odun   = hizar iscisi sayisi      (isci basina 1/saat)
 *   luks   = maden iscisi sayisi      (isci basina 1/saat)
 *   altin  = bos vatandas * 3 - bilim adami * 6 - bakim ucretleri
 *   AP     = bilim adami * 1 * carpan
 *
 * ONEMLI: yatagin SEVIYESI uretimi carpmaz, isci kapasitesini acar.
 * 450 isci saatte 450 odun verir. Seviye yalnizca 450 iscinin sigmasini
 * saglar. Bu, Ikariam'i diger sehir kurma oyunlarindan ayiran temel
 * farktir ve buraya bilerek bu sekilde islenmistir.
 *
 * YARDIMCI ELLER (asiri yukleme)
 * Kapasitenin ustundeki her 4 odun iscisi saatte 1 odun, her 8 luks
 * iscisi saatte 1 luks uretir. Arastirma yoksa kapasite asilamaz.
 *
 * YOLSUZLUK uretimi kirpar ama altin akisini KIRPMAZ: Ikariam'da
 * yolsuzluk kaynak uretimine uygulanir.
 */

/** Bir sehrin saatlik akis dokumu. */
export interface CityFlow {
  wood: number;
  luxury: number;
  luxuryKind: MaterialKey | null;
  gold: number;
  research: number;
  corruption: number;
}

export class EconomySystem {
  constructor(
    private readonly state: GameState,
    private readonly resources: ResourceSystem,
    private readonly citizens: CitizenSystem,
    private readonly happiness: HappinessSystem,
    private readonly wonders: WonderSystem,
    private readonly bus: EventBus,
    private readonly receiveResearch: (points: number) => void,
  ) {}

  // --- Uretim --------------------------------------------------------------

  /** Uretim binasinin (Ormanci Evi vb.) seviye basina bonusu. */
  private productionBonus(city: CityState, resource: MaterialKey): number {
    const buildingId = PRODUCTION_BUILDING_FOR[resource];
    const level = buildingId ? buildingLevel(city, buildingId) : 0;
    return 1 + level * PRODUCTION_BUILDING_BONUS_PER_LEVEL;
  }

  /**
   * Asiri yuklemeli isci sayisindan EFEKTIF isci sayisini hesaplar.
   *
   * Kapasiteye kadar 1:1, kapasite ustunde 1/4 (odun) veya 1/8 (luks).
   */
  private effectiveWorkers(workers: number, capacity: number, overloadRatio: number): number {
    if (workers <= capacity) return workers;
    const excess = workers - capacity;
    return capacity + excess / Math.max(1, overloadRatio);
  }

  /** Sehrin saatlik odun uretimi. */
  woodPerHour(city: CityState): number {
    const capacity = this.citizens.woodCapacity(city);
    const workers = this.citizens.canOverload()
      ? this.effectiveWorkers(city.assignment.wood, capacity, OVERLOAD_WOOD_WORKERS_PER_UNIT)
      : Math.min(city.assignment.wood, capacity);
    if (workers <= 0) return 0;

    const corruption = this.happiness.corruptionOf(city);
    return workers * WOOD_PER_WORKER_HOUR * this.productionBonus(city, 'wood') * (1 - corruption);
  }

  /** Sehrin saatlik luks kaynak uretimi. */
  luxuryPerHour(city: CityState): number {
    // Zenginlik arastirmasi olmadan luks kaynak islenemez.
    if (!this.state.hasResearch('wealth')) return 0;

    const capacity = this.citizens.luxuryCapacity(city);
    const workers = this.citizens.canOverload()
      ? this.effectiveWorkers(city.assignment.luxury, capacity, OVERLOAD_LUXURY_WORKERS_PER_UNIT)
      : Math.min(city.assignment.luxury, capacity);
    if (workers <= 0) return 0;

    const island = this.state.islandOf(city.islandId);
    if (!island) return 0;

    const corruption = this.happiness.corruptionOf(city);
    return (
      workers *
      LUXURY_PER_WORKER_HOUR *
      this.productionBonus(city, island.luxury) *
      (1 - corruption)
    );
  }

  /** Sehrin saatlik altin katkisi (bakim ucreti HARIC). */
  cityGoldPerHour(city: CityState): number {
    return (
      city.assignment.idle * GOLD_PER_IDLE_CITIZEN -
      city.assignment.scientist * SCIENTIST_GOLD_DIRECT
    );
  }

  /** Sehrin saatlik arastirma puani. */
  researchPerHour(city: CityState): number {
    const scientists = Math.min(
      city.assignment.scientist,
      this.citizens.scientistCapacity(city),
    );
    if (scientists <= 0) return 0;
    const effects = aggregateEffects(this.state.completedResearch);
    return scientists * effects.researchMultiplier;
  }

  /** Tum sehirlerin saatlik arastirma puani. */
  totalResearchPerHour(): number {
    return this.state.cities.reduce((sum, city) => sum + this.researchPerHour(city), 0);
  }

  // --- Bakim ucretleri -----------------------------------------------------

  /** Bir sehrin kara birlikleri + gemileri icin saatlik bakim. */
  private cityUpkeep(city: CityState): number {
    const effects = aggregateEffects(this.state.completedResearch);
    const reduction = Math.max(0, 1 - effects.upkeepReduction);

    let total = 0;
    for (const stack of city.garrison) {
      const def = getUnit(stack.id);
      if (!def) continue;
      total += def.upkeepGold * TIER_UPKEEP_MULTIPLIER[stack.tier] * stack.count;
    }
    for (const stack of city.warfleet) {
      const def = getShip(stack.id);
      if (!def) continue;
      total += def.upkeepGold * TIER_UPKEEP_MULTIPLIER[stack.tier] * stack.count;
    }
    // Yuk gemileri de bakim ister.
    const transport = getShip('transport_ship');
    if (transport) total += transport.upkeepGold * city.cargoShips;

    return total * reduction;
  }

  /** Yoldaki filolarin saatlik bakimi. */
  private fleetUpkeep(): number {
    const effects = aggregateEffects(this.state.completedResearch);
    const reduction = Math.max(0, 1 - effects.upkeepReduction);

    let total = 0;
    for (const fleet of this.state.fleets) {
      for (const stack of fleet.units) {
        const def = getUnit(stack.id);
        if (def) total += def.upkeepGold * TIER_UPKEEP_MULTIPLIER[stack.tier] * stack.count;
      }
      for (const stack of fleet.ships) {
        const def = getShip(stack.id);
        if (def) total += def.upkeepGold * TIER_UPKEEP_MULTIPLIER[stack.tier] * stack.count;
      }
      const transport = getShip('transport_ship');
      if (transport) total += transport.upkeepGold * fleet.cargoShips;
    }
    return total * reduction;
  }

  /** Oyuncunun toplam saatlik bakim ucreti. */
  upkeepPerHour(): number {
    return (
      this.state.cities.reduce((sum, city) => sum + this.cityUpkeep(city), 0) + this.fleetUpkeep()
    );
  }

  /** Oyuncunun toplam saatlik NET altin akisi. */
  goldPerHour(): number {
    const income = this.state.cities.reduce((sum, city) => sum + this.cityGoldPerHour(city), 0);
    return income - this.upkeepPerHour();
  }

  /** Sehrin akis dokumu (arayuz icin). */
  flowOf(city: CityState): CityFlow {
    const island = this.state.islandOf(city.islandId);
    return {
      wood: this.woodPerHour(city),
      luxury: this.luxuryPerHour(city),
      luxuryKind: island?.luxury ?? null,
      gold: this.cityGoldPerHour(city),
      research: this.researchPerHour(city),
      corruption: this.happiness.corruptionOf(city),
    };
  }

  // --- Zaman ---------------------------------------------------------------

  /**
   * Bir tikin uretimini uygular.
   *
   * ADIM SIRASI onemlidir:
   *   1. Maddesel uretim (odun + luks) depo tavanina kirpilarak eklenir.
   *   2. Arastirma puani uretilip arastirma sistemine devredilir.
   *   3. Altin akisi uygulanir (gelir - bakim).
   *   4. Altin bitti ve gelir negatifse birlikler TERK EDER.
   *
   * Son adim Ikariam'in gercek kuralidir: altinsiz kalan oyuncunun ordusu
   * dagilir. Bu kural olmadan bakim ucreti anlamini yitirir ve oyuncu
   * sinirsiz ordu besleyebilir.
   */
  advance(gameSeconds: number): void {
    if (gameSeconds <= 0) return;
    const hours = gameSeconds / GAME_SECONDS_PER_HOUR;

    // 1. Maddesel uretim
    for (const city of this.state.cities) {
      const island = this.state.islandOf(city.islandId);
      const wood = this.woodPerHour(city) * hours;
      const luxury = this.luxuryPerHour(city) * hours;
      if (wood <= 0 && luxury <= 0) continue;

      const gained: Partial<Record<MaterialKey, number>> = {};
      if (wood > 0) gained.wood = wood;
      if (luxury > 0 && island) gained[island.luxury] = luxury;
      this.resources.add(city, gained);
    }

    // 2. Arastirma puani
    const research = this.totalResearchPerHour() * hours;
    if (research > 0) this.receiveResearch(research);

    // 3. Altin
    const gold = this.goldPerHour() * hours;
    if (gold !== 0) this.resources.addGold(gold);

    // 4. Altin bitti: ordu dagilir
    if (this.state.gold <= 0 && this.goldPerHour() < 0) this.disbandUnpaid();
  }

  /**
   * Altini biten oyuncunun ordusundan birlik birakir.
   *
   * EN PAHALIDAN baslanir: oyuncunun en az gozden cikaracagi birlik degil,
   * ekonomiyi en cok zorlayan birlik once gider. Boylece tek bir tik
   * altin sorununu cozmez ama orduyu da bir anda silmez.
   */
  private disbandUnpaid(): void {
    const stacks: Array<{ city: CityState; kind: 'unit' | 'ship'; index: number; cost: number }> = [];

    for (const city of this.state.cities) {
      city.garrison.forEach((stack, index) => {
        const def = getUnit(stack.id);
        if (def && stack.count > 0) stacks.push({ city, kind: 'unit', index, cost: def.upkeepGold });
      });
      city.warfleet.forEach((stack, index) => {
        const def = getShip(stack.id);
        if (def && stack.count > 0) stacks.push({ city, kind: 'ship', index, cost: def.upkeepGold });
      });
    }

    stacks.sort((a, b) => b.cost - a.cost);
    const target = stacks[0];
    if (!target) return;

    const list = target.kind === 'unit' ? target.city.garrison : target.city.warfleet;
    const stack = list[target.index];
    if (!stack) return;

    stack.count -= 1;
    if (stack.count <= 0) list.splice(target.index, 1);

    this.state.pushNotice({
      atTick: this.state.tick,
      title: 'Altın yetmedi',
      body: `${target.city.name} şehrinde bakım ücreti ödenemediği için bir birlik ordudan ayrıldı.`,
      tone: 'error',
      read: false,
    });
    this.bus.emit('notice:added', 'Altın yetmedi', 'Birlik ordudan ayrıldı.', 'error');
  }

  /** Athena harikasi: yagmaya karsi korunacak kaynak miktari. */
  safeStorage(city: CityState): number {
    const base = this.resources.storageCapacity(city);
    const bonus = this.wonders.safeResourceBonus(city.islandId);
    return Math.round(base * (1 + bonus));
  }

  /**
   * Sehrin TEK PARCA anlik goruntusu.
   *
   * Arayuz her karede nufus, mutluluk, akis, depo ve bakimi AYNI anda
   * gosterir. Bunlari ayri ayri hesaplatmak hem tekrar olur hem de
   * hesaplarin farkli karelerde yapilmasi ekranda birbiriyle celisen
   * sayilarin yan yana durmasina yol acar. Bu yuzden tek bir fonksiyon
   * hepsini ayni durum aninda okur ve tek bir nesne doner.
   */
  snapshot(city: CityState): CitySnapshot {
    const flow = this.flowOf(city);
    const perHour: MaterialPool = { wood: 0, marble: 0, wine: 0, sulfur: 0, crystal: 0 };
    perHour.wood = Math.round(flow.wood);
    if (flow.luxuryKind) perHour[flow.luxuryKind] = Math.round(flow.luxury);

    return {
      cityId: city.id,
      citizens: city.citizens,
      maxPopulation: this.citizens.maxPopulation(city),
      happiness: Math.round(this.happiness.happiness(city)),
      surplus: Math.round(this.happiness.surplus(city)),
      growthPerHour: this.citizens.growthPerHour(city),
      assignment: { ...city.assignment },
      perHour,
      researchPointsPerHour: Math.round(this.researchPerHour(city) * 10) / 10,
      storageCapacity: this.resources.storageCapacity(city),
      safeStorage: this.safeStorage(city),
      corruption: this.happiness.corruptionOf(city),
      goldPerHour: Math.round(this.cityGoldPerHour(city)),
      upkeepPerHour: Math.round(this.upkeepPerHour()),
      scientistCapacity: this.citizens.scientistCapacity(city),
    };
  }
}

/** Hangi kaynak icin hangi uretim binasi calisir. */
const PRODUCTION_BUILDING_FOR: Record<MaterialKey, string> = {
  wood: 'foresters_house',
  marble: 'stonemason',
  wine: 'winegrower',
  sulfur: 'alchemists_tower',
  crystal: 'glassblower',
};
