import {
  COLONY_CARGO_SHIPS,
  COLONY_WOOD_COST_PER_PALACE_LEVEL,
  ISLAND_PLOT_COUNT,
} from '@/config/Constants';
import { getBuilding } from '@/config/BuildingCatalog';
import { ikariamCost } from '@/config/Formulas';
import { generateIslandLayout } from '@/core/IslandLayout';
import { createPlayerCity, PLAYER_ID } from '@/core/WorldFactory';
import { hashString } from '@/utils/Rng';
import { palaceLevel } from '@/core/CityQuery';
import type { EventBus } from '@/core/EventBus';
import type { GameState } from '@/core/GameState';
import type { ResourceSystem } from './ResourceSystem';
import type { ConstructionSystem } from './ConstructionSystem';
import type { CityState, IslandState, MaterialKey, ResourceAmounts } from '@/types';

/**
 * Ada yonetimi: ortak kaynak yataklari, alanlar ve koloni kurma.
 *
 * Ikariam'da ada PAYLASILAN bir alandir. Hizar ve luks kaynak yatagi
 * adadaki TUM sehirler icin tek bir seviyeye sahiptir; bir sehir
 * yukseltirse herkes faydalanir. Bu, Ikariam'da ayni adada oturan
 * oyunculari isbirligine (veya catismaya) iten temel mekaniktir.
 *
 * Bu surumde NPC'ler yatagi yukseltmez; maliyeti yalnizca oyuncu oder.
 */

/** Koloni kurma sonucu. */
export interface ColonyRequest {
  ok: boolean;
  reason: string | null;
  city: CityState | null;
}

export class IslandSystem {
  constructor(
    private readonly state: GameState,
    private readonly resources: ResourceSystem,
    private readonly construction: ConstructionSystem,
    private readonly bus: EventBus,
  ) {}

  /** Oyuncunun aktif sehrinin adasi. */
  get homeIsland(): IslandState | null {
    const city = this.state.activeCity;
    return city ? this.state.islandOf(city.islandId) : null;
  }

  /** Adanin cizim verisi (tohumdan turetilir, kayda yazilmaz). */
  layoutOf(island: IslandState) {
    return generateIslandLayout(hashString(island.id) ^ this.state.seed);
  }

  /** Adanin bos alanlari. */
  freePlots(islandId: string): number[] {
    const island = this.state.islandOf(islandId);
    if (!island) return [];
    return island.plots.filter((p) => p.ownerId === null).map((p) => p.index);
  }

  /** Bir alanin sahibi. */
  plotOwner(islandId: string, plot: number): string | null {
    return this.state.islandOf(islandId)?.plots[plot]?.ownerId ?? null;
  }

  /** Oyuncunun bir adada sehri var mi? */
  hasCityOn(islandId: string): boolean {
    return this.state.cities.some((c) => c.islandId === islandId);
  }

  // --- Yatag yukseltme -----------------------------------------------------

  /** Yatagin bir sonraki seviyesinin maliyeti. */
  depositCost(island: IslandState, resource: MaterialKey, city: CityState): ResourceAmounts {
    const deposit = resource === 'wood' ? island.wood : island.luxuryDeposit;
    const def = getBuilding(deposit.buildingId);
    if (!def) return {};

    const toLevel = deposit.level + 1;
    const cost: ResourceAmounts = {};
    for (const [key, coefficients] of Object.entries(def.cost) as Array<
      [MaterialKey, (typeof def.cost)[MaterialKey]]
    >) {
      if (!coefficients) continue;
      const raw = ikariamCost(coefficients, toLevel);
      if (raw <= 0) continue;
      cost[key] = Math.max(1, Math.floor(raw * (1 - this.construction.reductionFor(city, key))));
    }
    return cost;
  }

  /** Yatagin yukseltme suresi (oyun saniyesi). */
  depositTime(island: IslandState, resource: MaterialKey): number {
    const deposit = resource === 'wood' ? island.wood : island.luxuryDeposit;
    return this.construction.timeFor(deposit.buildingId, deposit.level + 1);
  }

  /** Yatag yukseltilebilir mi? */
  canUpgradeDeposit(
    island: IslandState,
    resource: MaterialKey,
    city: CityState,
  ): string | null {
    const deposit = resource === 'wood' ? island.wood : island.luxuryDeposit;
    const def = getBuilding(deposit.buildingId);
    if (!def) return 'Bilinmeyen yatık.';
    if (deposit.construction) return 'Yatakta zaten bir yükseltme sürüyor.';
    if (deposit.level >= def.maxLevel) return 'Yatak azami seviyede.';

    // Ikariam'in depo tavani kisiti burada da gecerlidir.
    const cost = this.depositCost(island, resource, city);
    const capacity = this.resources.storageCapacity(city);
    for (const value of Object.values(cost)) {
      if (value > capacity) return 'Gereken miktar depo kapasitesini aşıyor; önce Depo kurun.';
    }
    if (!this.resources.affordable(city, cost)) return 'Kaynaklar yetmiyor.';
    return null;
  }

  /** Yatagi yukseltir. Maliyeti ODEYEN sehir karsilar, seviyeden ada faydalanir. */
  upgradeDeposit(island: IslandState, resource: MaterialKey, city: CityState): boolean {
    if (this.canUpgradeDeposit(island, resource, city)) return false;

    const deposit = resource === 'wood' ? island.wood : island.luxuryDeposit;
    const cost = this.depositCost(island, resource, city);
    if (!this.resources.spend(city, cost)) return false;

    deposit.construction = {
      kind: 'upgrade',
      toLevel: deposit.level + 1,
      durationGameSeconds: Math.max(1, this.depositTime(island, resource)),
      remainingGameSeconds: Math.max(1, this.depositTime(island, resource)),
      paidCost: cost,
      sequence: this.state.nextSequence(),
      startedAtTick: this.state.tick,
    };
    this.bus.emit('construction:started', city.id, deposit.buildingId, deposit.level + 1);
    return true;
  }

  /** Adadaki tum yatag gorevlerini ilerletir. */
  advance(gameSeconds: number): void {
    if (gameSeconds <= 0) return;

    for (const island of this.state.world.islands) {
      for (const deposit of [island.wood, island.luxuryDeposit]) {
        const task = deposit.construction;
        if (!task) continue;
        task.remainingGameSeconds -= gameSeconds;
        if (task.remainingGameSeconds > 0) continue;

        deposit.level = task.toLevel;
        deposit.construction = undefined;
        this.bus.emit('island:deposit-upgraded', island.id, deposit.resource, deposit.level);
      }
    }
  }

  // --- Koloni kurma --------------------------------------------------------

  /**
   * Koloni kurma kosullari.
   *
   * Ikariam'in gercek kosullari:
   *   1. Genisleme (Expansion) arastirmasi
   *   2. Saray seviyesi > mevcut koloni sayisi
   *   3. Hedef adada BOS bir alan
   *   4. Bos yuk gemileri (malzeme tasimasi icin)
   *   5. Odun maliyeti (Saray seviyesiyle artar)
   */
  canFoundColony(islandId: string, plot: number, fromCity: CityState): string | null {
    if (!this.state.hasResearch('expansion')) {
      return 'Önce Genişleme araştırmasını tamamlayın.';
    }

    const capital = this.state.capital;
    if (!capital) return 'Başkent bulunamadı.';
    const palace = palaceLevel(capital);
    if (palace <= 0) return 'Önce başkente Saray kurun.';
    if (palace <= this.state.colonyCount) {
      return `Saray seviyesi ${palace}, koloni sayısı ${this.state.colonyCount}. Yeni koloni için Sarayı yükseltin.`;
    }

    const island = this.state.islandOf(islandId);
    if (!island) return 'Ada bulunamadı.';
    if (plot < 0 || plot >= ISLAND_PLOT_COUNT) return 'Geçersiz alan.';

    const slot = island.plots[plot];
    if (!slot) return 'Alan bulunamadı.';
    if (slot.ownerId !== null) return 'Bu alan dolu. Önce buradaki şehri almalısınız.';

    const freeShips = this.freeCargoShips();
    if (freeShips < COLONY_CARGO_SHIPS) {
      return `Koloni için ${COLONY_CARGO_SHIPS} boş yük gemisi gerekiyor (${freeShips} uygun).`;
    }

    const cost = this.colonyCost(capital);
    if (!this.resources.affordable(fromCity, cost)) return 'Kaynaklar yetmiyor.';
    return null;
  }

  /** Koloni maliyeti. */
  colonyCost(capital: CityState): ResourceAmounts {
    const palace = Math.max(1, palaceLevel(capital));
    return { wood: COLONY_WOOD_COST_PER_PALACE_LEVEL * palace };
  }

  /** Yolda olmayan (meşgul edilmemiş) yük gemisi sayısı. */
  freeCargoShips(): number {
    const total = this.state.cities.reduce((sum, city) => sum + city.cargoShips, 0);
    const inUse = this.state.fleets.reduce((sum, fleet) => sum + fleet.cargoShips, 0);
    return Math.max(0, total - inUse);
  }

  /** Toplam yuk gemisi sayisi. */
  totalCargoShips(): number {
    return this.state.cities.reduce((sum, city) => sum + city.cargoShips, 0);
  }

  /** Koloni kurar. */
  foundColony(islandId: string, plot: number, name: string, fromCity: CityState): ColonyRequest {
    const reason = this.canFoundColony(islandId, plot, fromCity);
    if (reason) return { ok: false, reason, city: null };

    const capital = this.state.capital;
    if (!capital) return { ok: false, reason: 'Başkent yok.', city: null };

    if (!this.resources.spend(fromCity, this.colonyCost(capital))) {
      return { ok: false, reason: 'Kaynaklar yetmiyor.', city: null };
    }

    const city = createPlayerCity(islandId, plot, name);
    city.isCapital = false;
    // Koloni hazir Valilik ile baslar; baskentle ayni seviyede degildir.
    city.townHall.level = 1;
    city.resources = { wood: 500, marble: 0, wine: 0, sulfur: 0, crystal: 0 };
    city.citizens = 40;
    city.assignment = { idle: 40, wood: 0, luxury: 0, scientist: 0 };
    city.cargoShips = 0;

    this.state.addCity(city);

    this.state.pushNotice({
      atTick: this.state.tick,
      title: 'Yeni koloni',
      body: `${name} şehri kuruldu. Yolsuzluğu önlemek için buraya Vali Konağı inşa edin.`,
      tone: 'success',
      read: false,
    });
    this.bus.emit('colony:founded', city);
    this.bus.emit('notice:added', 'Yeni koloni', name, 'success');

    return { ok: true, reason: null, city };
  }

  /** Aktif sehri degistirir. */
  setActiveCity(cityId: string): boolean {
    const city = this.state.cityOf(cityId);
    if (!city || city.ownerId !== PLAYER_ID) return false;
    this.state.activeCityId = cityId;
    this.bus.emit('active-city:changed', cityId);
    return true;
  }
}
