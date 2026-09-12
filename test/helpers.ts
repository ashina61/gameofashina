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
import { BuildingPlotSystem } from '@/systems/BuildingPlotSystem';
import { CityDecorSystem } from '@/systems/CityDecorSystem';
import { BuildingSystem } from '@/systems/BuildingSystem';
import { UpgradeSystem } from '@/systems/UpgradeSystem';
import { EconomySystem } from '@/systems/EconomySystem';
import { PopulationSystem } from '@/systems/PopulationSystem';
import { NavigationSystem } from '@/systems/NavigationSystem';
import { WorkforceSystem } from '@/systems/WorkforceSystem';
import type { BuildingId, GridPoint } from '@/types';

export interface TestWorld {
  state: GameState;
  bus: EventBus;
  resources: ResourceSystem;
  construction: ConstructionSystem;
  plots: BuildingPlotSystem;
  decor: CityDecorSystem;
  buildings: BuildingSystem;
  upgrades: UpgradeSystem;
  population: PopulationSystem;
  navigation: NavigationSystem;
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
  const plots = new BuildingPlotSystem(state.grid);
  const decor = new CityDecorSystem(state.grid, plots);
  const buildings = new BuildingSystem(state, resources, construction, bus, plots);
  const upgrades = new UpgradeSystem(state, resources, construction);
  const population = new PopulationSystem(state, resources, bus);
  const navigation = new NavigationSystem(state.grid);
  const workforce = new WorkforceSystem(state, bus, navigation);
  const economy = new EconomySystem(state, resources, population, bus);
  const simulation = new Simulation(state, construction, population, workforce, economy);

  // GameWorld ile ayni sira.
  workforce.restorePositions();
  workforce.reconcile();
  population.rebuildFromState();
  bus.on('building:removed', (building) => workforce.releaseAll(building.uid));
  bus.on('building:placed', () => workforce.reroute());

  return {
    state,
    bus,
    resources,
    construction,
    plots,
    decor,
    buildings,
    upgrades,
    population,
    navigation,
    workforce,
    economy,
    simulation,
  };
}

/**
 * Bir bina turu icin bos yapi alaninin baslangic karosu.
 *
 * Sprint 12'den beri bina "uygun herhangi bir karoya" degil YAPI ALANINA
 * kurulur. Testlerin sabit koordinat yazmasi artik calismaz: o koordinat
 * sokak olabilir. Bu yardimci, koordinati yerlesimden TURETIR.
 *
 * Donen karo ADA BASINA hizalidir (gx ve gy'nin 3'e kalani 1), yani
 * (gx, gy) ve (gx + 1, gy) ikisi de gecerli birer plottur. Testlerin
 * yaygin "yan yana iki bina" kalibi boylece bozulmadan calisir.
 */
export function blockSpot(
  world: TestWorld,
  types: BuildingId | BuildingId[] = 'house',
): GridPoint {
  const wanted = Array.isArray(types) ? types : [types];
  const usable = (gx: number, gy: number): boolean => {
    const plot = world.plots.plotAt(gx, gy);
    if (!plot || !world.plots.isFree(plot)) return false;
    return wanted.every((type) => world.plots.accepts(plot, type));
  };

  for (const plot of world.plots.plots) {
    if (plot.gx % 3 !== 1 || plot.gy % 3 !== 1) continue;
    /*
     * Yalnizca karonun kendisi ve SAGINDAKI istenir. Adanin dordunu birden
     * sart kosmak cok katiydi: zemin ada icinde degisebiliyor ve hicbir ada
     * "hem ev hem ciftlik" kabul etmiyordu. Testlerin yaygin kalibi
     * (c) ve (c + 1) ikilisidir.
     */
    if (!usable(plot.gx, plot.gy)) continue;
    if (!usable(plot.gx + 1, plot.gy)) continue;
    return { gx: plot.gx, gy: plot.gy };
  }
  throw new Error(`${wanted.join('+')} icin ada basi bos plot yok`);
}

/** Sehir merkezinin ozel 2x2 alaninin koordinati. */
export function hallSpot(world: TestWorld): GridPoint {
  const plot = world.plots.plots.find((p) => p.zone === 'civic');
  if (!plot) throw new Error('sehir merkezi alani yok');
  return { gx: plot.gx, gy: plot.gy };
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
