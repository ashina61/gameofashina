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

export interface TestWorld {
  state: GameState;
  bus: EventBus;
  resources: ResourceSystem;
  construction: ConstructionSystem;
  buildings: BuildingSystem;
  upgrades: UpgradeSystem;
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
  const economy = new EconomySystem(state, resources, bus);
  const simulation = new Simulation(state, construction, economy);
  return { state, bus, resources, construction, buildings, upgrades, economy, simulation };
}

/** Kaynaklari testin ihtiyaci kadar doldurur. */
export function grant(world: TestWorld, amounts: Record<string, number>): void {
  for (const [key, value] of Object.entries(amounts)) {
    world.state.setResource(key as 'food' | 'wood' | 'stone' | 'gold', value);
  }
  world.resources.emitChange();
}

/** sprint2_1 testinin tip yeniden disa aktarimi icin takma ad. */
export type TestWorldLike = TestWorld;
