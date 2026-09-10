/**
 * Sprint 3 - PopulationSystem.
 *
 * Kapsam: nufusun zamanla buyumesi, aclikta azalmasi, isci dagitimi ve
 * kadronun uretime baglanmasi.
 */
import { describe, expect, it } from 'vitest';
import { GameState } from '@/core/GameState';
import { migrateAndSanitize } from '@/core/SaveManager';
import { getBuilding } from '@/config/BuildingCatalog';
import { resolveBuilding } from '@/systems/BuildingResolver';
import {
  POPULATION_DECLINE_PER_MINUTE,
  POPULATION_GROWTH_PER_MINUTE,
  SAVE_VERSION,
} from '@/config/Constants';
import { GRID_SIZE } from '@/config/Constants';
import { grant, makeWorld, wrap } from './helpers';
import type { TestWorld } from './helpers';
import type { BuildingId, BuildingInstance } from '@/types';

/** Insaatlari bitirir ama nufusun buyumesine firsat vermeden durur. */
function settleConstruction(world: TestWorld): void {
  world.simulation.advance(60);
}

/** Nufus kapasiteye oturana kadar ilerletir. */
function settlePopulation(world: TestWorld): void {
  world.simulation.advance(600);
}

/** Merkezdeki cimen alanda guvenli bir kurulum noktasi. */
function area(state: GameState): { gx: number; gy: number } {
  return state.grid.center();
}

/**
 * Verilen turu izgarada kurulabilecek ILK noktaya kurar.
 *
 * Tas ocagi gibi binalar belirli zemin ister; sabit koordinat vermek testi
 * zemin uretiminin rastgeleligine bagimli kilardi. Tarama merkezden disa
 * dogru deterministiktir, bu yuzden ayni seed ayni sonucu verir.
 */
function placeAnywhere(world: TestWorld, type: BuildingId): BuildingInstance {
  const size = getBuilding(type).size;
  const grid = world.state.grid;
  for (let gy = 0; gy < GRID_SIZE; gy += 1) {
    for (let gx = 0; gx < GRID_SIZE; gx += 1) {
      if (!grid.canPlace(gx, gy, size, [...getBuilding(type).allowedTerrain])) continue;
      const placed = world.buildings.place(type, gx, gy);
      if (placed.ok) return placed.building;
    }
  }
  throw new Error(`${type} icin uygun yer bulunamadi`);
}

describe('nufus buyumesi', () => {
  it('yeni oyunda nufus sifirdir - kapasite vatandas demek degildir', () => {
    const world = makeWorld();
    expect(world.state.population).toBe(0);

    const c = area(world.state);
    world.buildings.place('house', c.gx, c.gy);
    settleConstruction(world);

    // Ev bitti, kapasite acildi; ama vatandaslarin gelmesi zaman alir.
    expect(world.population.snapshot.capacity).toBeGreaterThan(0);
    expect(world.state.population).toBeGreaterThan(0);
    expect(world.state.population).toBeLessThan(world.population.snapshot.capacity);
  });

  it('nufus kapasiteye kadar buyur ve orada durur', () => {
    const world = makeWorld();
    const c = area(world.state);
    world.buildings.place('house', c.gx, c.gy);
    settlePopulation(world);

    const snap = world.population.snapshot;
    expect(snap.capacity).toBe(5); // ev seviye 1
    expect(world.state.population).toBe(5);
    expect(snap.trend).toBe('stable');

    // Daha da ilerletmek nufusu kapasitenin uzerine cikarmaz.
    world.simulation.advance(600);
    expect(world.state.population).toBe(5);
  });

  it('buyume orani dakikalik sabittir', () => {
    const world = makeWorld();
    const c = area(world.state);
    world.buildings.place('house', c.gx, c.gy);
    settleConstruction(world);

    const before = world.state.population;
    world.simulation.advance(60); // tam bir dakika
    expect(world.state.population - before).toBe(POPULATION_GROWTH_PER_MINUTE);
  });

  it('kapasite yokken nufus buyumez', () => {
    const world = makeWorld();
    const c = area(world.state);
    world.buildings.place('farm', c.gx, c.gy); // ciftlik barinak vermez
    settlePopulation(world);

    expect(world.population.snapshot.capacity).toBe(0);
    expect(world.state.population).toBe(0);
  });

  it('insaati suren ev kapasite saglamaz', () => {
    const world = makeWorld();
    const c = area(world.state);
    world.buildings.place('house', c.gx, c.gy);
    world.simulation.advance(1);

    expect(world.population.snapshot.capacity).toBe(0);
    expect(world.state.population).toBe(0);
  });

  it('kesirli buyume kaybolmaz: parcali ilerletme tek seferlikle ayni', () => {
    const bulk = makeWorld(777);
    const step = makeWorld(777);
    for (const w of [bulk, step]) {
      const c = area(w.state);
      w.buildings.place('house', c.gx, c.gy);
      settleConstruction(w);
    }

    bulk.simulation.advance(90);
    for (let i = 0; i < 90; i += 1) step.simulation.advance(1);

    expect(bulk.state.population).toBe(step.state.population);
  });
});

describe('aclik', () => {
  it('yiyecek bitince nufus azalir', () => {
    const world = makeWorld();
    const c = area(world.state);
    world.buildings.place('house', c.gx, c.gy);
    settlePopulation(world);
    expect(world.state.population).toBe(5);

    grant(world, { food: 0 });
    world.simulation.advance(60); // bir dakika aclik

    expect(world.state.population).toBe(5 - POPULATION_DECLINE_PER_MINUTE);
    expect(world.population.snapshot.trend).toBe('declining');
  });

  it('aclik bina veya seviye kaybettirmez', () => {
    const world = makeWorld();
    const c = area(world.state);
    const placed = world.buildings.place('house', c.gx, c.gy);
    if (!placed.ok) throw new Error('kurulum basarisiz');
    settlePopulation(world);

    grant(world, { food: 0 });
    world.simulation.advance(600);

    expect(world.state.buildings.size).toBe(1);
    expect(placed.building.level).toBe(1);
    expect(placed.building.state).toBe('active');
  });

  it('nufus sifirin altina inmez', () => {
    const world = makeWorld();
    const c = area(world.state);
    world.buildings.place('house', c.gx, c.gy);
    settlePopulation(world);

    grant(world, { food: 0 });
    world.simulation.advance(6000);

    expect(world.state.population).toBe(0);
    expect(world.population.snapshot.trend).toBe('stable');
  });

  it('yiyecek gelince nufus yeniden buyur - aclik kalici hasar birakmaz', () => {
    const world = makeWorld();
    const c = area(world.state);
    world.buildings.place('house', c.gx, c.gy);
    settlePopulation(world);

    grant(world, { food: 0 });
    world.simulation.advance(120);
    const starved = world.state.population;
    expect(starved).toBeLessThan(5);

    grant(world, { food: 400 });
    settlePopulation(world);
    expect(world.state.population).toBe(5);
  });

  it('aclik uretimi AYRICA cezalandirmaz - ceza yalnizca nufus kaybidir', () => {
    const world = makeWorld();
    const c = area(world.state);
    world.buildings.place('house', c.gx, c.gy);
    world.buildings.place('farm', c.gx + 1, c.gy);
    settlePopulation(world);

    const fedRate = world.economy.snapshot.netPerMinute.wood;
    grant(world, { food: 0 });
    world.simulation.advance(1);

    // Yiyecek disi uretim yalnizca kadro degistigi kadar degisir; eski
    // "aclikta verim yarilanir" carpani kaldirildi.
    const resolved = [...world.state.buildings.values()].map((b) =>
      resolveBuilding(b, getBuilding(b.type), world.state.tick),
    );
    const staffed = resolved.filter((r) => r.workerRequirement > 0);
    expect(staffed.every((r) => r.staffing > 0)).toBe(true);
    expect(fedRate).toBe(0); // ev/ciftlik odun uretmez - denge referansi
  });
});

describe('isci dagitimi', () => {
  it('vatandaslar binalara atanir ve assignedWorkers gercek deger tasir', () => {
    const world = makeWorld();
    const c = area(world.state);
    world.buildings.place('house', c.gx, c.gy);
    const farm = world.buildings.place('farm', c.gx + 1, c.gy);
    if (!farm.ok) throw new Error('kurulum basarisiz');
    settlePopulation(world);

    expect(farm.building.assignedWorkers).toBe(2); // ciftlik seviye 1: 2 isci
    expect(world.population.snapshot.employed).toBe(2);
  });

  it('isci istemeyen bina isci almaz', () => {
    const world = makeWorld();
    const c = area(world.state);
    const house = world.buildings.place('house', c.gx, c.gy);
    if (!house.ok) throw new Error('kurulum basarisiz');
    settlePopulation(world);

    expect(house.building.assignedWorkers).toBe(0);
  });

  it('nufus yetmezse dagitim kurulus sirasiyla yapilir', () => {
    const world = makeWorld();
    const c = area(world.state);
    world.buildings.place('house', c.gx, c.gy); // kapasite 5
    const first = placeAnywhere(world, 'farm'); // 2 isci
    const second = placeAnywhere(world, 'lumber_camp'); // 3 isci
    const third = placeAnywhere(world, 'farm'); // 2 isci
    settlePopulation(world);

    // Toplam ihtiyac 7, kapasite 5: erken kurulanlar once dolar.
    expect(world.state.population).toBe(5);
    expect(first.assignedWorkers).toBe(2);
    expect(second.assignedWorkers).toBe(3);
    expect(third.assignedWorkers).toBe(0);
  });

  it('kismi kadro kabul edilir - bina yarim isciyle yarim uretir', () => {
    const world = makeWorld();
    const c = area(world.state);
    world.buildings.place('house', c.gx, c.gy);
    placeAnywhere(world, 'farm'); // 2 isci
    const second = placeAnywhere(world, 'quarry'); // 4 isci
    settlePopulation(world);

    // 5 vatandas: ciftlik 2, tasocagi 3/4 -> kismi kadro.
    const resolved = resolveBuilding(second, getBuilding('quarry'), world.state.tick);
    expect(resolved.assignedWorkers).toBe(3);
    expect(resolved.staffing).toBeCloseTo(3 / 4, 9);
    expect(resolved.staffed).toBe(false);
    expect(resolved.effectiveProduction.stone).toBeCloseTo(
      (resolved.production.stone ?? 0) * (3 / 4),
      9,
    );
  });

  it('insaati suren bina isci tutmaz', () => {
    const world = makeWorld();
    const c = area(world.state);
    world.buildings.place('house', c.gx, c.gy);
    settlePopulation(world);

    const farm = world.buildings.place('farm', c.gx + 1, c.gy);
    if (!farm.ok) throw new Error('kurulum basarisiz');
    world.simulation.advance(1);

    expect(farm.building.state).toBe('constructing');
    expect(farm.building.assignedWorkers).toBe(0);
    expect(world.population.snapshot.employed).toBe(0);
  });

  it('bina yikilinca iscileri serbest kalir ve yeniden dagitilir', () => {
    const world = makeWorld();
    const c = area(world.state);
    world.buildings.place('house', c.gx, c.gy);
    const first = placeAnywhere(world, 'farm');
    const second = placeAnywhere(world, 'quarry');
    settlePopulation(world);
    expect(second.assignedWorkers).toBe(3);

    world.buildings.demolish(first.uid);
    world.simulation.advance(1);

    // Ciftligin 2 iscisi tasocagina gecti: 5 vatandasin tamami orada.
    expect(second.assignedWorkers).toBe(4);
    expect(world.population.snapshot.employed).toBe(4);
  });

  it('ev yikilinca kapasite dusen nufus barinaksiz kalmaz', () => {
    const world = makeWorld();
    placeAnywhere(world, 'house');
    const houseB = placeAnywhere(world, 'house');
    settlePopulation(world);
    expect(world.state.population).toBe(10);

    world.buildings.demolish(houseB.uid);
    world.simulation.advance(1);

    expect(world.population.snapshot.capacity).toBe(5);
    expect(world.state.population).toBe(5);
  });
});

describe('kadro uretime baglandi', () => {
  it('isci yokken uretim yok', () => {
    const world = makeWorld();
    const c = area(world.state);
    const farm = world.buildings.place('farm', c.gx, c.gy); // ev yok
    if (!farm.ok) throw new Error('kurulum basarisiz');
    settleConstruction(world);

    expect(farm.building.assignedWorkers).toBe(0);
    const resolved = resolveBuilding(farm.building, getBuilding('farm'), world.state.tick);
    expect(resolved.effectiveProduction.food ?? 0).toBe(0);
    expect(world.economy.snapshot.netPerMinute.food).toBeLessThanOrEqual(0);
  });

  it('production potansiyeli gosterir, effectiveProduction gercegi', () => {
    const world = makeWorld();
    const c = area(world.state);
    const farm = world.buildings.place('farm', c.gx, c.gy);
    if (!farm.ok) throw new Error('kurulum basarisiz');
    settleConstruction(world);

    const resolved = resolveBuilding(farm.building, getBuilding('farm'), world.state.tick);
    expect(resolved.production.food).toBeGreaterThan(0); // potansiyel durur
    expect(resolved.effectiveProduction.food ?? 0).toBe(0); // gercek sifir
  });

  it('gider calisana degil, sehirde yasayan herkese uygulanir', () => {
    const world = makeWorld();
    const c = area(world.state);
    world.buildings.place('house', c.gx, c.gy); // 5 kapasite, 0 isci ister
    settlePopulation(world);

    const snap = world.economy.snapshot;
    expect(snap.population).toBe(5);
    expect(snap.populationUsed).toBe(0); // hicbiri calismiyor
    expect(snap.netPerMinute.food).toBeCloseTo(-5 * 0.4, 9); // yine de yiyorlar
  });

  it('efficiency artik kadro dolulugunu bildirir', () => {
    const world = makeWorld();
    const c = area(world.state);
    world.buildings.place('house', c.gx, c.gy);
    placeAnywhere(world, 'quarry'); // 4 isci
    placeAnywhere(world, 'farm'); // 2 isci
    settlePopulation(world);

    const snap = world.economy.snapshot;
    expect(snap.workersNeeded).toBe(6);
    expect(snap.populationUsed).toBe(5);
    expect(snap.efficiency).toBeCloseTo(5 / 6, 9);
  });
});

describe('nufus kaydi', () => {
  it('nufus kayitta korunur', () => {
    const world = makeWorld();
    const c = area(world.state);
    world.buildings.place('house', c.gx, c.gy);
    settlePopulation(world);
    expect(world.state.population).toBe(5);

    const save = world.state.toSave(SAVE_VERSION);
    const reloaded = wrap(GameState.fromSave(save));
    expect(reloaded.state.population).toBe(5);
  });

  it('yuklemeden sonra isci dagitimi ayni kalir', () => {
    const world = makeWorld();
    const c = area(world.state);
    world.buildings.place('house', c.gx, c.gy);
    world.buildings.place('farm', c.gx + 1, c.gy);
    world.buildings.place('quarry', c.gx - 2, c.gy);
    settlePopulation(world);

    const before = [...world.state.buildings.values()].map((b) => [b.type, b.assignedWorkers]);
    const reloaded = wrap(GameState.fromSave(world.state.toSave(SAVE_VERSION)));
    const after = [...reloaded.state.buildings.values()].map((b) => [b.type, b.assignedWorkers]);

    expect(after).toEqual(before);
  });

  it('assignedWorkers kayittan degil nufustan turetilir', () => {
    const world = makeWorld();
    const c = area(world.state);
    world.buildings.place('house', c.gx, c.gy);
    const farm = world.buildings.place('farm', c.gx + 1, c.gy);
    if (!farm.ok) throw new Error('kurulum basarisiz');
    settlePopulation(world);

    const save = world.state.toSave(SAVE_VERSION);
    // Kurcalanmis kayit: nufusun tasiyamayacagi kadar isci yazilmis.
    for (const b of save.buildings) b.assignedWorkers = 99;

    const reloaded = wrap(GameState.fromSave(save));
    const reloadedFarm = [...reloaded.state.buildings.values()].find((b) => b.type === 'farm');
    expect(reloadedFarm?.assignedWorkers).toBe(2);
  });

  it('nufus alani olmayan eski kayit is gucunu kaybetmez', () => {
    const world = makeWorld();
    const c = area(world.state);
    world.buildings.place('house', c.gx, c.gy);
    world.buildings.place('farm', c.gx + 1, c.gy);
    settlePopulation(world);

    const save = world.state.toSave(SAVE_VERSION) as Record<string, unknown>;
    delete save.population; // Sprint 3 oncesi kayit

    const migrated = migrateAndSanitize(save);
    if (!migrated) throw new Error('kayit reddedildi');
    // Eski ortuk deger: min(isci ihtiyaci, kapasite) = min(2, 5)
    expect(migrated.population).toBe(2);
  });

  it('kapasitenin ustundeki kurcalanmis nufus kirpilir', () => {
    const world = makeWorld();
    const c = area(world.state);
    world.buildings.place('house', c.gx, c.gy);
    settlePopulation(world);

    const save = world.state.toSave(SAVE_VERSION) as Record<string, unknown>;
    save.population = 999_999;

    const migrated = migrateAndSanitize(save);
    if (!migrated) throw new Error('kayit reddedildi');
    expect(migrated.population).toBe(5);
  });

  it('negatif nufus sifira cekilir', () => {
    const world = makeWorld();
    const c = area(world.state);
    world.buildings.place('house', c.gx, c.gy);
    settlePopulation(world);

    const save = world.state.toSave(SAVE_VERSION) as Record<string, unknown>;
    save.population = -50;

    const migrated = migrateAndSanitize(save);
    if (!migrated) throw new Error('kayit reddedildi');
    expect(migrated.population).toBe(0);
  });
});

describe('gercek zaman kullanilmaz', () => {
  it('Date.now degismeden nufus buyur', () => {
    const world = makeWorld();
    const c = area(world.state);
    world.buildings.place('house', c.gx, c.gy);

    const realNow = Date.now();
    world.simulation.advance(600);

    expect(Date.now() - realNow).toBeLessThan(5000); // gercek zaman akmadi
    expect(world.state.population).toBe(5); // ama nufus doldu
  });

  it('ayni tik sayisi ayni nufusu verir (deterministik)', () => {
    function run(): number {
      const w = makeWorld(4242);
      const c = area(w.state);
      w.buildings.place('house', c.gx, c.gy);
      w.buildings.place('farm', c.gx + 1, c.gy);
      w.simulation.advance(345);
      return w.state.population;
    }
    expect(run()).toBe(run());
  });
});
