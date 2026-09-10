import {
  BASE_POPULATION_CAPACITY,
  FOOD_UPKEEP_PER_WORKER,
  RESOURCE_ORDER,
  TICKS_PER_SECOND,
} from '@/config/Constants';
import { getBuilding } from '@/config/BuildingCatalog';
import { resolveBuilding } from './BuildingResolver';
import type { EventBus } from '@/core/EventBus';
import type { GameState } from '@/core/GameState';
import type { ResourceSystem } from './ResourceSystem';
import type { EconomySnapshot, ResourcePool } from '@/types';

/** Bir dakikadaki tik sayisi; uretim oranlari dakika cinsinden tanimlidir. */
const TICKS_PER_MINUTE = 60 * TICKS_PER_SECOND;

/**
 * Ekonomi simulasyonu: isci dagilimi, uretim ve yiyecek gideri.
 *
 * SORUMLULUK SINIRI
 * Bu sistem YALNIZCA ekonomik uretimden sorumludur. Insaat ve yukseltme
 * gorevlerinin ilerlemesi ve tamamlanmasi ConstructionSystem'in isidir;
 * tik sayacini ilerletmek ise Simulation orkestratorunun.
 *
 * Bu sistem kendisine verilen tik sayisini isler, zamani kendisi ilerletmez.
 *
 * DENGE KURALLARI (prototipten degismedi)
 * - Uretim binalari isci ister; toplam isci ihtiyaci nufus kapasitesini asarsa
 *   tum uretim ayni oranda dusurulur (verim carpani).
 * - Her isci dakikada sabit miktarda yiyecek tuketir.
 * - Yiyecek bittiginde verim yarilanir.
 */
export class EconomySystem {
  private readonly state: GameState;
  private readonly resources: ResourceSystem;
  private readonly bus: EventBus;

  private lastSnapshot: EconomySnapshot = emptySnapshot();

  constructor(state: GameState, resources: ResourceSystem, bus: EventBus) {
    this.state = state;
    this.resources = resources;
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
    let populationCapacity = BASE_POPULATION_CAPACITY;
    let workersNeeded = 0;
    const gross: ResourcePool = { food: 0, wood: 0, stone: 0, gold: 0 };

    for (const building of this.state.buildings.values()) {
      const resolved = resolveBuilding(building, getBuilding(building.type), this.state.tick);
      if (!resolved.operational) continue;

      populationCapacity += resolved.populationCapacity;
      workersNeeded += resolved.workerRequirement;

      for (const key of RESOURCE_ORDER) {
        gross[key] += resolved.production[key] ?? 0;
      }
    }

    // Isci yetersizse tum uretim ayni oranda dusurulur.
    let efficiency = workersNeeded > 0 ? Math.min(1, populationCapacity / workersNeeded) : 1;

    // Aclik cezasi: depoda yiyecek yoksa uretim yarilanir.
    const starving = this.resources.amountOf('food') <= 0 && workersNeeded > 0;
    if (starving) efficiency *= 0.5;

    const populationUsed = Math.min(workersNeeded, populationCapacity);
    const upkeep = populationUsed * FOOD_UPKEEP_PER_WORKER;

    const netPerMinute: ResourcePool = { food: 0, wood: 0, stone: 0, gold: 0 };
    for (const key of RESOURCE_ORDER) {
      netPerMinute[key] = gross[key] * efficiency;
    }
    netPerMinute.food -= upkeep;

    return {
      netPerMinute,
      populationUsed,
      populationCapacity,
      storageCapacity: this.resources.capacity,
      efficiency,
    };
  }
}

function emptySnapshot(): EconomySnapshot {
  return {
    netPerMinute: { food: 0, wood: 0, stone: 0, gold: 0 },
    populationUsed: 0,
    populationCapacity: 0,
    storageCapacity: 0,
    efficiency: 1,
  };
}
