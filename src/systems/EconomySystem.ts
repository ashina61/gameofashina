import { FOOD_UPKEEP_PER_CITIZEN, RESOURCE_ORDER, TICKS_PER_SECOND } from '@/config/Constants';
import { getBuilding } from '@/config/BuildingCatalog';
import { resolveBuilding } from './BuildingResolver';
import type { EventBus } from '@/core/EventBus';
import type { GameState } from '@/core/GameState';
import type { PopulationSystem } from './PopulationSystem';
import type { ResourceSystem } from './ResourceSystem';
import type { EconomySnapshot, ResourcePool } from '@/types';

/** Bir dakikadaki tik sayisi; uretim oranlari dakika cinsinden tanimlidir. */
const TICKS_PER_MINUTE = 60 * TICKS_PER_SECOND;

/**
 * Ekonomi simulasyonu: uretim ve yiyecek gideri.
 *
 * SORUMLULUK SINIRI
 * Bu sistem YALNIZCA ekonomik uretimden sorumludur. Kimin nerede calistigi
 * PopulationSystem'in, gorevlerin ilerlemesi ConstructionSystem'in, tik
 * sayacini ilerletmek Simulation orkestratorunun isidir.
 *
 * Bu sistem kendisine verilen tik sayisini isler, zamani kendisi ilerletmez.
 *
 * DENGE KURALLARI (Sprint 3'te nufusa baglandi)
 * - Uretim BINA BAZINDA kadroyla olceklenir; resolver'in effectiveProduction
 *   degeri okunur, burada yeniden hesaplanmaz.
 * - Her VATANDAS dakikada sabit yiyecek tuketir; issiz vatandas da yer.
 * - Aclik cezasi artik uretim carpani degil: yiyecek bitince nufus azalir
 *   (PopulationSystem), isci sayisi duser, uretim kendiliginden geriler.
 *   Iki cezayi ust uste bindirmek ayni olayin bedelini iki kez odetirdi.
 */
export class EconomySystem {
  private readonly state: GameState;
  private readonly resources: ResourceSystem;
  private readonly population: PopulationSystem;
  private readonly bus: EventBus;

  private lastSnapshot: EconomySnapshot = emptySnapshot();

  constructor(
    state: GameState,
    resources: ResourceSystem,
    population: PopulationSystem,
    bus: EventBus,
  ) {
    this.state = state;
    this.resources = resources;
    this.population = population;
    this.bus = bus;
  }

  /** En son hesaplanan ekonomi ozeti. */
  get snapshot(): EconomySnapshot {
    return this.lastSnapshot;
  }

  /**
   * Verilen tik sayisi kadar uretimi uygular.
   *
   * Cagrildiginda tik sayaci ZATEN ilerletilmis ve biten gorevler ZATEN
   * uygulanmis olur (bkz. Simulation). Boylece bu pencerede tamamlanan bir
   * bina pencerenin uretimine dahil olur - prototipteki davranisin aynisi.
   */
  advance(ticks: number, options: { silent?: boolean } = {}): EconomySnapshot {
    if (!Number.isFinite(ticks) || ticks <= 0) return this.lastSnapshot;
    const whole = Math.floor(ticks);
    if (whole <= 0) return this.lastSnapshot;

    const snapshot = this.computeSnapshot();
    this.lastSnapshot = snapshot;

    const minutes = whole / TICKS_PER_MINUTE;
    const delta: ResourcePool = { food: 0, wood: 0, stone: 0, gold: 0 };
    for (const key of RESOURCE_ORDER) {
      delta[key] = snapshot.netPerMinute[key] * minutes;
    }

    this.resources.applyDelta(delta, 1);
    if (!options.silent) {
      this.resources.emitChange();
      this.bus.emit('economy:updated', snapshot);
    }
    return snapshot;
  }

  /** Cevrimdisi telafi sonrasi arayuze son durumu bildirir. */
  publish(): void {
    this.resources.recalculateCapacity();
    this.resources.emitChange();
    this.bus.emit('economy:updated', this.lastSnapshot);
  }

  /**
   * Nufus, isci ve uretim dengesini bastan hesaplar.
   *
   * Bina basina degerler resolver'dan gelir; burada seviye, durum veya
   * kapasite mantigi tekrarlanmaz.
   */
  private computeSnapshot(): EconomySnapshot {
    const people = this.population.snapshot;
    const netPerMinute: ResourcePool = { food: 0, wood: 0, stone: 0, gold: 0 };

    for (const building of this.state.buildings.values()) {
      const resolved = resolveBuilding(building, getBuilding(building.type), this.state.tick);
      if (!resolved.operational) continue;

      // Kadro carpani resolver'da uygulanmistir; burada tekrar carpilmaz.
      for (const key of RESOURCE_ORDER) {
        netPerMinute[key] += resolved.effectiveProduction[key] ?? 0;
      }
    }

    // Sehirde yasayan herkes yer - calissin veya calismasin.
    netPerMinute.food -= this.state.population * FOOD_UPKEEP_PER_CITIZEN;

    return {
      netPerMinute,
      population: this.state.population,
      populationUsed: people.employed,
      populationCapacity: people.capacity,
      workersNeeded: people.workersNeeded,
      storageCapacity: this.resources.capacity,
      efficiency: people.workersNeeded > 0 ? people.employed / people.workersNeeded : 1,
      growth: people.trend,
    };
  }
}

function emptySnapshot(): EconomySnapshot {
  return {
    netPerMinute: { food: 0, wood: 0, stone: 0, gold: 0 },
    population: 0,
    populationUsed: 0,
    populationCapacity: 0,
    workersNeeded: 0,
    storageCapacity: 0,
    efficiency: 1,
    growth: 'stable',
  };
}
