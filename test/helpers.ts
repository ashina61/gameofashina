/**
 * Testler icin dunya kurulumu.
 *
 * GameWorld.bootstrap() localStorage gerektirdigi icin testler sistemleri
 * dogrudan kurar. Kurulum sirasi GameWorld ile ayni tutulmalidir.
 */
import { GameState } from '@/core/GameState';
import { EventBus } from '@/core/EventBus';
import { Simulation } from '@/core/Simulation';
import { ResourceSystem } from '@/systems/ResourceSystem';
import { ConstructionSystem } from '@/systems/ConstructionSystem';
import { BuildingSystem } from '@/systems/BuildingSystem';
import { UpgradeSystem } from '@/systems/UpgradeSystem';
import { EconomySystem } from '@/systems/EconomySystem';
import { PopulationSystem } from '@/systems/PopulationSystem';
import { WorkforceSystem } from '@/systems/WorkforceSystem';

export interface TestWorld {
  state: GameState;
  bus: EventBus;
  resources: ResourceSystem;
  construction: ConstructionSystem;
  buildings: BuildingSystem;
  upgrades: UpgradeSystem;
  population: PopulationSystem;
  workforce: WorkforceSystem;
  economy: EconomySystem;
  simulation: Simulation;
}

/** Deterministik seed ile bos bir dunya kurar. */
export function makeWorld(seed = 12345): TestWorld {
  const state = new GameState(seed);
  return wrap(state);
}

/** Var olan bir durumun uzerine sistemleri kurar (kayit yukleme testleri icin). */
export function wrap(state: GameState): TestWorld {
  const bus = new EventBus();
  const resources = new ResourceSystem(state, bus);
  const construction = new ConstructionSystem(state, resources, bus);
  const buildings = new BuildingSystem(state, resources, construction, bus);
  const upgrades = new UpgradeSystem(state, resources, construction);
  const population = new PopulationSystem(state, resources, bus);
  const workforce = new WorkforceSystem(state, bus);
  const economy = new EconomySystem(state, resources, population, bus);
  const simulation = new Simulation(state, construction, population, workforce, economy);

  // GameWorld ile ayni sira.
  workforce.restorePositions();
  workforce.reconcile();
  population.rebuildFromState();
  bus.on('building:removed', (building) => workforce.releaseAll(building.uid));

  return {
    state,
    bus,
    resources,
    construction,
    buildings,
    upgrades,
    population,
    workforce,
    economy,
    simulation,
  };
}

/** Kaynaklari testin ihtiyaci kadar doldurur. */
export function grant(world: TestWorld, amounts: Record<string, number>): void {
  for (const [key, value] of Object.entries(amounts)) {
    world.state.setResource(key as 'food' | 'wood' | 'stone' | 'gold', value);
  }
  world.resources.emitChange();
}

/**
 * Binayi kapasitesine kadar isciyle doldurur ve iscilerin VARMASINI saglar.
 *
 * Sprint 8'den once isciler her tik otomatik dagitiliyordu; artik atama
 * oyuncunun komutudur. Uretimi olcen testler bu yuzden once kadroyu kurmali.
 * Yalnizca is gucu ilerletilir - ekonomi ve nufus tiki islenmez, boylece
 * testin olctugu miktarlar kaymaz.
 */
export function staff(world: TestWorld, uid: string): number {
  let assigned = 0;
  for (;;) {
    if (!world.workforce.assign(uid).ok) break;
    assigned += 1;
  }
  settleWalks(world);
  return assigned;
}

/**
 * Yoldaki herkes varana kadar is gucunu ilerletir.
 *
 * Sprint 9'dan beri yuruyus suresi MESAFEDEN turer, yani sabit bir tik
 * sayisi ilerletmek yetmez: uzaktaki bir binaya giden isci hala yolda
 * olabilir. Ust sinir sonsuz donguye karsi; haritanin bir ucundan digerine
 * yuruyus bile 20 tikin altinda.
 */
export function settleWalks(world: TestWorld, limit = 60): void {
  for (let i = 0; i < limit; i += 1) {
    if (world.workforce.snapshot.moving === 0) return;
    world.workforce.advance(1);
  }
}

/** Sehirdeki TUM uretim binalarini kadrolu hale getirir. */
export function staffAll(world: TestWorld): void {
  for (const building of [...world.state.buildings.values()]) staff(world, building.uid);
}

/** sprint2_1 testinin tip yeniden disa aktarimi icin takma ad. */
export type TestWorldLike = TestWorld;
