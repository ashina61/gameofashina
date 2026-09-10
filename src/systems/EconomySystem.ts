import {
  BASE_POPULATION_CAPACITY,
  FOOD_UPKEEP_PER_WORKER,
  MAX_OFFLINE_SECONDS,
  RESOURCE_ORDER,
} from '@/config/Constants';
import { getBuilding } from '@/config/BuildingCatalog';
import type { EventBus } from '@/core/EventBus';
import type { GameState } from '@/core/GameState';
import type { BuildingSystem } from './BuildingSystem';
import type { ResourceSystem } from './ResourceSystem';
import type { EconomySnapshot, ResourcePool } from '@/types';

/**
 * Ekonomi simulasyonu: insaat sayaclari, isci dagilimi, uretim ve yiyecek gideri.
 *
 * Denge kurallari:
 * - Uretim binalari isci ister; toplam isci ihtiyaci nufus kapasitesini asarsa
 *   tum uretim ayni oranda dusurulur (verim carpani).
 * - Her isci dakikada sabit miktarda yiyecek tuketir.
 * - Yiyecek bittiginde verim yarilanir; oyuncu aclik krizini gormezden gelemez.
 */
export class EconomySystem {
  private readonly state: GameState;
  private readonly resources: ResourceSystem;
  private readonly buildings: BuildingSystem;
  private readonly bus: EventBus;

  private lastSnapshot: EconomySnapshot = emptySnapshot();

  constructor(
    state: GameState,
    resources: ResourceSystem,
    buildings: BuildingSystem,
    bus: EventBus,
  ) {
    this.state = state;
    this.resources = resources;
    this.buildings = buildings;
    this.bus = bus;
  }

  /** En son hesaplanan ekonomi ozeti. */
  get snapshot(): EconomySnapshot {
    return this.lastSnapshot;
  }

  /**
   * Simulasyonu deltaSeconds kadar ilerletir.
   * Hem gercek zamanli tick hem de cevrimdisi telafi bu fonksiyonu kullanir.
   */
  tick(deltaSeconds: number, options: { silent?: boolean } = {}): EconomySnapshot {
    if (deltaSeconds <= 0) return this.lastSnapshot;

    this.advanceConstruction(deltaSeconds, options.silent === true);

    const snapshot = this.computeSnapshot();
    this.lastSnapshot = snapshot;

    const minutes = deltaSeconds / 60;
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

  /**
   * Oyun kapaliyken gecen sureyi telafi eder.
   * Ust sinir MAX_OFFLINE_SECONDS; tek seferde uygulanir ve kazanci dondurur.
   */
  applyOfflineProgress(elapsedSeconds: number): number {
    const capped = Math.min(Math.max(0, elapsedSeconds), MAX_OFFLINE_SECONDS);
    if (capped < 1) return 0;

    // Uzun sureyi tek adimda uygulamak insaat sayaclarinda hataya yol acar;
    // bu yuzden en fazla 60 saniyelik dilimler halinde ilerletilir.
    let remaining = capped;
    while (remaining > 0) {
      const step = Math.min(60, remaining);
      this.tick(step, { silent: true });
      remaining -= step;
    }

    this.resources.recalculateCapacity();
    this.resources.emitChange();
    this.bus.emit('economy:updated', this.lastSnapshot);
    return capped;
  }

  /** Insaat halindeki binalarin sayaclarini isletir. */
  private advanceConstruction(deltaSeconds: number, silent: boolean): void {
    for (const building of this.state.buildings.values()) {
      if (building.complete) continue;

      building.remainingBuildTime -= deltaSeconds;
      if (building.remainingBuildTime <= 0) {
        this.buildings.completeBuilding(building);
      } else if (!silent) {
        const total = getBuilding(building.defId).buildTime;
        const ratio = total > 0 ? 1 - building.remainingBuildTime / total : 1;
        this.bus.emit('building:progress', building, ratio);
      }
    }
  }

  /** Nufus, isci ve uretim dengesini bastan hesaplar. */
  private computeSnapshot(): EconomySnapshot {
    let populationCapacity = BASE_POPULATION_CAPACITY;
    let workersNeeded = 0;
    const gross: ResourcePool = { food: 0, wood: 0, stone: 0, gold: 0 };

    for (const building of this.state.buildings.values()) {
      if (!building.complete) continue;
      const def = getBuilding(building.defId);
      populationCapacity += def.populationCapacity ?? 0;
      workersNeeded += def.workers ?? 0;

      if (def.production) {
        for (const key of RESOURCE_ORDER) {
          gross[key] += def.production[key] ?? 0;
        }
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
