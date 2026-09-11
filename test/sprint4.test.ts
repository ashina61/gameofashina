/**
 * Sprint 4 - ekonomi cekirdegi.
 *
 * Kapsam: kaynak giris/cikis kurallari, uretimin hangi sartlarda olustugu,
 * kadro ve seviyenin uretime etkisi, sistemler arasi zincirin uctan uca
 * calismasi, tik sirasi ve determinizm.
 */
import { describe, expect, it } from 'vitest';
import { GameState } from '@/core/GameState';
import { getBuilding } from '@/config/BuildingCatalog';
import { resolveBuilding } from '@/systems/BuildingResolver';
import { BASE_STORAGE_CAPACITY, SAVE_VERSION } from '@/config/Constants';
import { grant, makeWorld, staff, staffAll, wrap } from './helpers';
import type { TestWorld } from './helpers';
import type { BuildingId, BuildingInstance } from '@/types';

/** Verilen turu kurulabilecek ilk noktaya kurar. */
function place(world: TestWorld, type: BuildingId): BuildingInstance {
  for (const tile of world.state.grid.allTiles()) {
    const result = world.buildings.place(type, tile.gx, tile.gy);
    if (result.ok) return result.building;
  }
  throw new Error(`${type} icin uygun yer bulunamadi`);
}

/** Tum insaatlari bitirir ve nufusu kapasiteye oturtur. */
function settle(world: TestWorld): void {
  world.simulation.advance(900);
}

const resolve = (world: TestWorld, b: BuildingInstance) =>
  resolveBuilding(b, getBuilding(b.type), world.state.tick);

describe('kaynak kurallari', () => {
  it('ekleme depo tavanini asmaz, tasan miktar kaybolur', () => {
    const world = makeWorld();
    const capacity = world.resources.capacity;
    world.state.setResource('wood', capacity - 50);

    world.resources.add({ wood: 500 });

    expect(world.state.resources.wood).toBe(capacity);
  });

  it('dusme sifirin altina inmez', () => {
    const world = makeWorld();
    world.state.setResource('stone', 30);

    world.resources.subtract({ stone: 100 });

    expect(world.state.resources.stone).toBe(0);
  });

  it('yetersiz kaynakta harcama HICBIR SEY dusurmez', () => {
    const world = makeWorld();
    const before = { ...world.state.resources };

    expect(world.resources.spend({ wood: 999_999, stone: 1 })).toBe(false);
    expect(world.state.resources).toEqual(before);
  });

  it('depo kapasitesi resolver uzerinden binalardan gelir', () => {
    const world = makeWorld();
    expect(world.resources.capacity).toBe(BASE_STORAGE_CAPACITY);

    grant(world, { wood: 400, stone: 400, food: 400, gold: 400 });
    const warehouse = place(world, 'warehouse');
    settle(world);

    const resolved = resolve(world, warehouse);
    expect(resolved.storageCapacity).toBeGreaterThan(0);
    expect(world.resources.capacity).toBe(BASE_STORAGE_CAPACITY + resolved.storageCapacity);
  });
});

describe('uretim hangi sartlarda olusur', () => {
  it('insaati suren bina uretmez', () => {
    const world = makeWorld();
    grant(world, { wood: 400, stone: 400, food: 120 });
    place(world, 'house');
    const farm = place(world, 'farm');
    world.simulation.advance(1);

    expect(farm.state).toBe('constructing');
    expect(resolve(world, farm).operational).toBe(false);
    expect(resolve(world, farm).effectiveProduction).toEqual({});
  });

  /**
   * Bu test bir hatayi yakaladi ve duzeltmeyi kilitliyor.
   *
   * resolveBuilding'in "tam kadro" kestirmesi uretimi katalogdan DOGRUDAN
   * okuyor ve `operational` kontrolunu atliyordu: devre disi ama tam kadrolu
   * bir bina TAM uretim bildiriyordu. Ekonomi ayrica operational kontrol
   * ettigi icin kaynak uretmiyordu, ama resolver "tek hesap kaynagi"
   * oldugundan bu degeri okuyan arayuz yanlis gosteriyordu.
   */
  it('devre disi bina uretmez', () => {
    const world = makeWorld();
    grant(world, { wood: 400, stone: 400, food: 120 });
    place(world, 'house');
    const farm = place(world, 'farm');
    settle(world);
    staff(world, farm.uid);
    expect(resolve(world, farm).staffed).toBe(true);
    expect(resolve(world, farm).effectiveProduction.food).toBeGreaterThan(0);

    world.state.setBuildingState(farm.uid, 'disabled');

    expect(resolve(world, farm).operational).toBe(false);
    expect(resolve(world, farm).effectiveProduction).toEqual({});
  });

  it('calisir ve kadrolu bina uretir', () => {
    const world = makeWorld();
    grant(world, { wood: 400, stone: 400, food: 120 });
    place(world, 'house');
    const farm = place(world, 'farm');
    settle(world);
    staff(world, farm.uid);

    const resolved = resolve(world, farm);
    expect(resolved.operational).toBe(true);
    expect(resolved.staffed).toBe(true);
    expect(resolved.effectiveProduction.food).toBe(resolved.production.food);
  });

  it('devre disi bina depo kapasitesi de saglamaz', () => {
    const world = makeWorld();
    grant(world, { wood: 400, stone: 400, food: 400, gold: 400 });
    const warehouse = place(world, 'warehouse');
    settle(world);
    expect(world.resources.capacity).toBeGreaterThan(BASE_STORAGE_CAPACITY);

    world.state.setBuildingState(warehouse.uid, 'disabled');
    world.resources.recalculateCapacity();

    expect(world.resources.capacity).toBe(BASE_STORAGE_CAPACITY);
  });
});

describe('kadro uretimi olcekler', () => {
  it('isci yoksa uretim sifirdir', () => {
    const world = makeWorld();
    grant(world, { wood: 400, stone: 400, food: 120 });
    const farm = place(world, 'farm'); // konut yok
    settle(world);

    expect(farm.assignedWorkers).toBe(0);
    expect(resolve(world, farm).effectiveProduction.food ?? 0).toBe(0);
  });

  it('kismi kadro oransal uretir', () => {
    const world = makeWorld();
    grant(world, { wood: 400, stone: 400, food: 120 });
    place(world, 'house'); // 5 kapasite
    const farm = place(world, 'farm'); // 2 isci
    const quarry = place(world, 'quarry'); // 4 isci -> 3 kalir
    settle(world);
    // Once ciftlik doldurulur, kalan 3 isci tasocagina gider.
    staff(world, farm.uid);
    staff(world, quarry.uid);

    const resolved = resolve(world, quarry);
    expect(resolved.assignedWorkers).toBe(3);
    expect(resolved.staffing).toBeCloseTo(3 / 4, 9);
    expect(resolved.effectiveProduction.stone).toBeCloseTo(
      (resolved.production.stone ?? 0) * (3 / 4),
      9,
    );
  });

  it('ekonomi ozeti kadro doluluğunu bildirir', () => {
    const world = makeWorld();
    grant(world, { wood: 400, stone: 400, food: 120 });
    place(world, 'house');
    place(world, 'farm');
    place(world, 'quarry');
    settle(world);
    staffAll(world);
    world.simulation.advance(1);

    const snap = world.economy.snapshot;
    expect(snap.workersNeeded).toBe(6);
    expect(snap.populationUsed).toBe(5);
    expect(snap.efficiency).toBeCloseTo(5 / 6, 9);
  });
});

describe('seviye uretimi ve kapasiteyi degistirir', () => {
  it('yukseltme tamamlanmadan eski seviye degerleri gecerlidir', () => {
    const world = makeWorld();
    grant(world, { wood: 400, stone: 400, food: 120, gold: 300 });
    place(world, 'house');
    const farm = place(world, 'farm');
    settle(world);
    const before = resolve(world, farm).production.food;

    grant(world, { wood: 400, stone: 400, food: 120, gold: 300 });
    expect(world.upgrades.requestUpgrade(farm.uid).ok).toBe(true);
    world.simulation.advance(1);

    expect(farm.level).toBe(1);
    expect(resolve(world, farm).production.food).toBe(before);
  });

  it('yukseltme tamamlaninca uretim artar', () => {
    const world = makeWorld();
    grant(world, { wood: 400, stone: 400, food: 120, gold: 300 });
    place(world, 'house');
    const farm = place(world, 'farm');
    settle(world);
    const before = resolve(world, farm).production.food ?? 0;

    grant(world, { wood: 400, stone: 400, food: 120, gold: 300 });
    world.upgrades.requestUpgrade(farm.uid);
    settle(world);

    expect(farm.level).toBe(2);
    expect(resolve(world, farm).production.food ?? 0).toBeGreaterThan(before);
  });

  it('seviye depo ve nufus kapasitesini de degistirir', () => {
    const world = makeWorld();
    grant(world, { wood: 400, stone: 400, food: 400, gold: 400 });
    const warehouse = place(world, 'warehouse');
    const house = place(world, 'house');
    settle(world);
    const storageBefore = resolve(world, warehouse).storageCapacity;
    const popBefore = resolve(world, house).populationCapacity;

    grant(world, { wood: 400, stone: 400, food: 400, gold: 400 });
    world.upgrades.requestUpgrade(warehouse.uid);
    world.upgrades.requestUpgrade(house.uid);
    settle(world);

    expect(resolve(world, warehouse).storageCapacity).toBeGreaterThan(storageBefore);
    expect(resolve(world, house).populationCapacity).toBeGreaterThan(popBefore);
  });
});

describe('tik sirasi', () => {
  /**
   * Sira: tik sayaci -> insaat -> nufus -> ekonomi.
   *
   * Insaat en basta islenir ki pencerede biten bina o pencerenin uretimine
   * katilsin. Nufus uretimden ONCE islenir; boylece gelen vatandas ayni
   * pencerede calisir ve ayni pencerede yemegini yer.
   */
  it('pencerede biten bina ayni pencerede uretime katilir', () => {
    const world = makeWorld();
    // Yiyecek depo tavaninin ALTINDA baslar; tavanda baslarsa artis gorunmez
    // olur ve test uretimi degil kirpilmayi olcerdi.
    grant(world, { wood: 400, stone: 400, food: 100 });
    place(world, 'house');
    const farm = place(world, 'farm');
    world.simulation.advance(200);
    staff(world, farm.uid);

    const before = world.state.resources.food;
    world.simulation.advance(200);

    expect(world.state.resources.food).toBeGreaterThan(before);
  });

  it('nufus uretimden once islenir: yeni vatandas ayni pencerede calisir', () => {
    const world = makeWorld();
    grant(world, { wood: 400, stone: 400, food: 100 });
    place(world, 'house');
    const farm = place(world, 'farm');
    world.simulation.advance(60);
    staff(world, farm.uid);
    world.simulation.advance(1);

    expect(world.state.population).toBeGreaterThan(0);
    expect(farm.assignedWorkers).toBeGreaterThan(0);
    expect(world.economy.snapshot.populationUsed).toBe(farm.assignedWorkers);
  });
});

describe('uctan uca zincir', () => {
  it('insa -> nufus -> isci -> uretim -> kaynak', () => {
    const world = makeWorld();
    grant(world, { wood: 400, stone: 400, food: 100, gold: 100 });

    const house = place(world, 'house');
    const farm = place(world, 'farm');
    expect(house.state).toBe('constructing');
    expect(farm.state).toBe('constructing');

    world.simulation.advance(60);
    expect(house.state).toBe('active');
    expect(farm.state).toBe('active');
    expect(world.state.population).toBeGreaterThan(0);

    // Sprint 8: isci OYUNCU tarafindan atanir, otomatik degil.
    staff(world, farm.uid);
    expect(farm.assignedWorkers).toBeGreaterThan(0);

    const foodBefore = world.state.resources.food;
    world.simulation.advance(120);
    expect(world.state.resources.food).toBeGreaterThan(foodBefore);
    expect(world.economy.snapshot.netPerMinute.food).toBeGreaterThan(0);
  });

  it('kayit -> yukle -> ekonomi kaldigi yerden devam eder', () => {
    const world = makeWorld();
    grant(world, { wood: 400, stone: 400, food: 100 });
    place(world, 'house');
    const farm = place(world, 'farm');
    settle(world);
    staff(world, farm.uid);

    const before = {
      tick: world.state.tick,
      population: world.state.population,
      resources: { ...world.state.resources },
      level: farm.level,
      workers: farm.assignedWorkers,
      state: farm.state,
    };

    const reloaded = wrap(GameState.fromSave(world.state.toSave(SAVE_VERSION)));
    const reloadedFarm = [...reloaded.state.buildings.values()].find((b) => b.type === 'farm');

    expect(reloaded.state.tick).toBe(before.tick);
    expect(reloaded.state.population).toBe(before.population);
    expect(reloaded.state.resources).toEqual(before.resources);
    expect(reloadedFarm?.level).toBe(before.level);
    expect(reloadedFarm?.assignedWorkers).toBe(before.workers);
    expect(reloadedFarm?.state).toBe(before.state);

    const foodBefore = reloaded.state.resources.food;
    reloaded.simulation.advance(120);
    expect(reloaded.state.resources.food).toBeGreaterThan(foodBefore);
  });

  it('kaynak yetersizligi insayi dogru engeller', () => {
    const world = makeWorld();
    grant(world, { wood: 0, stone: 0, food: 0, gold: 0 });
    const before = world.state.buildings.size;

    let placed = false;
    for (const tile of world.state.grid.allTiles()) {
      if (world.buildings.place('house', tile.gx, tile.gy).ok) {
        placed = true;
        break;
      }
    }

    expect(placed).toBe(false);
    expect(world.state.buildings.size).toBe(before);
    expect(world.state.resources.wood).toBe(0);
  });
});

describe('determinizm', () => {
  it('ayni girdi ayni cikti', () => {
    function run(): string {
      const world = makeWorld(555);
      grant(world, { wood: 400, stone: 400, food: 120, gold: 100 });
      place(world, 'house');
      place(world, 'farm');
      world.simulation.advance(500);
      return JSON.stringify({
        tick: world.state.tick,
        population: world.state.population,
        resources: world.state.resources,
      });
    }
    expect(run()).toBe(run());
  });

  it('durum degismeyen pencerede toplu ve adim adim ilerletme ortusur', () => {
    const bulk = makeWorld(31337);
    const step = makeWorld(31337);
    for (const world of [bulk, step]) {
      grant(world, { wood: 400, stone: 400, food: 120, gold: 100 });
      place(world, 'house');
      place(world, 'farm');
      settle(world);
    }

    bulk.simulation.advance(100);
    for (let i = 0; i < 100; i += 1) step.simulation.advance(1);

    expect(bulk.state.population).toBe(step.state.population);
    for (const key of ['food', 'wood', 'stone', 'gold'] as const) {
      expect(bulk.state.resources[key]).toBeCloseTo(step.state.resources[key], 6);
    }
  });

  /**
   * BILINEN SINIRLAMA - Sprint 1'den miras, Sprint 4'te BUYUMEDI.
   *
   * Toplu ilerletme, pencerenin sonundaki orani pencerenin tamamina uygular.
   * Pencere icinde bir durum gecisi olursa (bina tamamlanmasi, nufus artisi)
   * toplu ve adim adim sonuclar ayrisir. Ayni senaryoda olculen fark Sprint 4
   * oncesi ve sonrasi BIREBIR ayni: nufus 1, yiyecek ~4.1, odun ~2.78.
   *
   * Pratik etkisi cevrimdisi telafiyle sinirlidir (60 tiklik parcalar).
   * Sunucu otoritesi hedeflenirse uretim, durum gecislerinde pencere
   * bolunerek uygulanmalidir.
   */
  it('gecis iceren pencerede toplu ilerletme daha comerttir', () => {
    const bulk = makeWorld(31337);
    const step = makeWorld(31337);
    for (const world of [bulk, step]) {
      grant(world, { wood: 400, stone: 400, food: 120, gold: 100 });
      place(world, 'house');
      place(world, 'farm');
    }

    bulk.simulation.advance(100);
    for (let i = 0; i < 100; i += 1) step.simulation.advance(1);

    // Nufus buyumesi hala bir durum gecisidir; toplu ilerletme daha comert.
    expect(bulk.state.population).toBeGreaterThan(step.state.population);
  });
});
