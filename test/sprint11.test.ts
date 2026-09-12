/**
 * Sprint 11 - ekonomi ve ilerleyis denetimi.
 *
 * Bu dosya DENGE DEGISTIRMEZ. Iki isi vardir:
 *   1. Uretim/tuketim zincirinin dogru calistigini kilitlemek (correctness)
 *   2. Ekonominin olculen YAPISAL gerceklerini yazili hale getirmek, boylece
 *      Sprint 12'de bir denge degisikligi yapildiginda neyin degistigi
 *      belgeli olsun.
 *
 * Olculen degerler katalogdan TURETILIR, elle yazilmaz: katalog degisirse
 * test de birlikte degisir ve yanlis bir guvence vermez.
 */
import { describe, expect, it } from 'vitest';
import { GameState } from '@/core/GameState';
import { migrateAndSanitize } from '@/core/SaveManager';
import {
  BASE_STORAGE_CAPACITY,
  FOOD_UPKEEP_PER_CITIZEN,
  RESOURCE_ORDER,
  SAVE_VERSION,
} from '@/config/Constants';
import { allBuildings, getBuilding, levelOf } from '@/config/BuildingCatalog';
import { makeWorld, settleWalks, staff, wrap } from './helpers';
import type { TestWorld } from './helpers';
import type { BuildingId, BuildingInstance, ResourceKey } from '@/types';

/** Verilen turu kurulabilecek ilk noktaya kurar. */
function place(world: TestWorld, type: BuildingId): BuildingInstance {
  for (const tile of world.state.grid.allTiles()) {
    const result = world.buildings.place(type, tile.gx, tile.gy);
    if (result.ok) return result.building;
  }
  throw new Error(`${type} icin uygun yer bulunamadi`);
}

/**
 * Simulasyonu TIK TIK ilerletir.
 *
 * Tek bir buyuk advance() cagrisi insaat kuyrugunu bosaltmaz: bir gorev
 * bitince yerine gecen kuyruk gorevi O ANKI tikte baslar ve ayni cagri
 * icinde bir daha ilerletilmez. Bu, bilinen ve belgelenmis bir davranistir
 * (bkz. bench/fps.mjs). Ekonomiyi olcerken kuyrugun gercekten bosalmasi
 * gerektigi icin adim adim ilerletiliyor.
 */
function runTicks(world: TestWorld, ticks: number): void {
  for (let i = 0; i < ticks; i += 1) world.simulation.advance(1);
}

/** Bol kaynakli, insaati aninda bitmis bir sehir. */
function richCity(type: BuildingId): { world: TestWorld; target: BuildingInstance } {
  const world = makeWorld();
  for (const key of RESOURCE_ORDER) world.state.setResource(key, 99_999);
  const target = place(world, type);
  runTicks(world, 400);
  return { world, target };
}

/** Bir binanin o anki gercek (kadroya gore olceklenmis) uretimi. */
function output(world: TestWorld, building: BuildingInstance, key: ResourceKey): number {
  return world.buildings.resolve(building).effectiveProduction[key] ?? 0;
}

describe('uretim zinciri - correctness', () => {
  it('isci isteyen bina ISCISIZ uretmez', () => {
    const { world, target } = richCity('lumber_camp');
    expect(target.state).toBe('active');
    expect(target.assignedWorkers).toBe(0);
    expect(output(world, target, 'wood')).toBe(0);
  });

  it('YOLDAKI isci uretmez; varinca uretir', () => {
    const world = makeWorld();
    for (const key of RESOURCE_ORDER) world.state.setResource(key, 99_999);
    place(world, 'house');
    const camp = place(world, 'lumber_camp');
    runTicks(world, 600);

    world.workforce.assign(camp.uid);
    expect(output(world, camp, 'wood')).toBe(0); // henuz yolda

    settleWalks(world);
    expect(output(world, camp, 'wood')).toBeGreaterThan(0);
  });

  it('INSAAT halindeki bina uretmez ve depo kapasitesi vermez', () => {
    const world = makeWorld();
    for (const key of RESOURCE_ORDER) world.state.setResource(key, 99_999);
    const camp = place(world, 'lumber_camp');
    const store = place(world, 'warehouse');

    expect(camp.state).toBe('constructing');
    expect(output(world, camp, 'wood')).toBe(0);
    expect(world.buildings.resolve(store).storageCapacity).toBe(0);
    expect(world.resources.recalculateCapacity()).toBe(BASE_STORAGE_CAPACITY);
  });

  it('DEVRE DISI bina uretmez', () => {
    const { world, target } = richCity('lumber_camp');
    place(world, 'house');
    runTicks(world, 600);
    staff(world, target.uid);
    expect(output(world, target, 'wood')).toBeGreaterThan(0);

    world.state.setBuildingState(target.uid, 'disabled');
    expect(output(world, target, 'wood')).toBe(0);
  });

  it('isci geri alininca uretim ANINDA duser', () => {
    const world = makeWorld();
    for (const key of RESOURCE_ORDER) world.state.setResource(key, 99_999);
    place(world, 'house');
    place(world, 'house');
    const camp = place(world, 'lumber_camp');
    runTicks(world, 900);
    staff(world, camp.uid);

    const full = output(world, camp, 'wood');
    expect(full).toBeGreaterThan(0);
    world.workforce.release(camp.uid);
    expect(output(world, camp, 'wood')).toBeLessThan(full);
  });

  it('yarim kadro YARIM uretir - kadro carpani tek yerde uygulanir', () => {
    const world = makeWorld();
    for (const key of RESOURCE_ORDER) world.state.setResource(key, 99_999);
    place(world, 'house');
    place(world, 'house');
    const camp = place(world, 'lumber_camp');
    runTicks(world, 900);

    const need = world.buildings.resolve(camp).workerRequirement;
    const potential = levelOf(getBuilding('lumber_camp'), 1)?.production?.wood ?? 0;

    world.workforce.assign(camp.uid);
    settleWalks(world);
    expect(output(world, camp, 'wood')).toBeCloseTo(potential / need, 6);
  });

  it('YUKSELTME sirasinda bina eski seviyede uretmeye DEVAM eder', () => {
    const world = makeWorld();
    for (const key of RESOURCE_ORDER) world.state.setResource(key, 99_999);
    for (let i = 0; i < 3; i += 1) place(world, 'house');
    const camp = place(world, 'lumber_camp');
    runTicks(world, 900);
    staff(world, camp.uid);

    const before = output(world, camp, 'wood');
    expect(world.upgrades.requestUpgrade(camp.uid).ok).toBe(true);

    // Bilincli tasarim: yukseltme bina duruyor demek degil.
    expect(camp.state).toBe('active');
    expect(output(world, camp, 'wood')).toBe(before);
    expect(camp.level).toBe(1);
  });

  it('yukseltme bitince uretim YENI seviyeye gecer', () => {
    const world = makeWorld();
    for (const key of RESOURCE_ORDER) world.state.setResource(key, 99_999);
    for (let i = 0; i < 4; i += 1) place(world, 'house');
    const camp = place(world, 'lumber_camp');
    runTicks(world, 900);

    world.upgrades.requestUpgrade(camp.uid);
    runTicks(world, 200);
    expect(camp.level).toBe(2);

    staff(world, camp.uid);
    const lv2 = levelOf(getBuilding('lumber_camp'), 2)?.production?.wood ?? 0;
    expect(output(world, camp, 'wood')).toBeCloseTo(lv2, 6);
  });
});

describe('kaynak muhasebesi - correctness', () => {
  it('yetersiz kaynakta HICBIR SEY harcanmaz', () => {
    const world = makeWorld();
    world.state.setResource('wood', 10);
    const before = world.resources.snapshot();

    expect(world.resources.spend({ wood: 50, stone: 5 })).toBe(false);
    expect(world.resources.snapshot()).toEqual(before);
  });

  it('insa maliyeti TAM BIR KEZ dusulur', () => {
    const world = makeWorld();
    for (const key of RESOURCE_ORDER) world.state.setResource(key, 1000);
    const cost = levelOf(getBuilding('house'), 1)?.buildCost ?? {};
    const before = world.resources.snapshot();

    place(world, 'house');

    for (const key of RESOURCE_ORDER) {
      expect(world.resources.amountOf(key)).toBe(before[key] - (cost[key] ?? 0));
    }
  });

  it('yukseltme maliyeti TAM BIR KEZ dusulur', () => {
    const { world, target } = richCity('house');
    const cost = levelOf(getBuilding('house'), 2)?.upgradeCost ?? {};
    const before = world.resources.snapshot();

    expect(world.upgrades.requestUpgrade(target.uid).ok).toBe(true);

    // Gider ISTEK aninda dusulur. Olcum burada yapilir; tik ilerletmek
    // uretim ve yiyecek giderini isin icine katip olcumu bulandirirdi.
    for (const key of RESOURCE_ORDER) {
      expect(world.resources.amountOf(key)).toBe(before[key] - (cost[key] ?? 0));
    }

    /*
     * Gorev tamamlanirken IKINCI kez odeme yapilmamali.
     *
     * Yalnizca maliyet kalemleri (ev icin odun ve tas) kontrol edilir:
     * sehirde uretim binasi olmadigi icin bu iki kaynagin net akisi
     * sifirdir, dolayisiyla degisirlerse tek aciklama ikinci bir tahsilat
     * olur. Yiyecek disarida birakilir - nufus onu zaten tuketiyor ve
     * olcumu bulandirirdi.
     */
    const afterRequest = world.resources.snapshot();
    runTicks(world, 200);
    expect(target.level).toBe(2);
    for (const key of RESOURCE_ORDER) {
      if ((cost[key] ?? 0) === 0) continue;
      expect(world.resources.amountOf(key)).toBe(afterRequest[key]);
    }
  });

  it('depo dolunca uretilen kaynak SESSIZCE kaybolur', () => {
    const world = makeWorld();
    const cap = world.resources.capacity;
    world.state.setResource('wood', cap);

    world.resources.add({ wood: 500 });
    expect(world.resources.amountOf('wood')).toBe(cap);
  });

  it('yiyecek sifirin ALTINA inmez', () => {
    const world = makeWorld();
    world.state.setResource('food', 1);
    world.resources.subtract({ food: 100 });
    expect(world.resources.amountOf('food')).toBe(0);
  });

  it('ambar tamamlaninca kapasite artar, yikilinca duser', () => {
    const world = makeWorld();
    for (const key of RESOURCE_ORDER) world.state.setResource(key, 99_999);
    const base = world.resources.capacity;

    const store = place(world, 'warehouse');
    runTicks(world, 400);
    const added = levelOf(getBuilding('warehouse'), 1)?.storageCapacity ?? 0;
    expect(world.resources.capacity).toBe(base + added);

    world.buildings.demolish(store.uid);
    expect(world.resources.capacity).toBe(base);
  });
});

describe('nufus ve is gucu ekonomisi', () => {
  it('nufus kapasiteye kadar buyur, sonra DURUR', () => {
    const world = makeWorld();
    for (const key of RESOURCE_ORDER) world.state.setResource(key, 99_999);
    const house = place(world, 'house');
    runTicks(world, 2000);

    const capacity = levelOf(getBuilding('house'), 1)?.populationCapacity ?? 0;
    expect(house.state).toBe('active');
    expect(world.state.population).toBe(capacity);
    expect(world.population.snapshot.trend).toBe('stable');
  });

  it('yiyecek bitince nufus AZALIR; bina ve seviye kaybi olmaz', () => {
    const world = makeWorld();
    for (const key of RESOURCE_ORDER) world.state.setResource(key, 99_999);
    const house = place(world, 'house');
    runTicks(world, 2000);
    const peak = world.state.population;
    expect(peak).toBeGreaterThan(0);

    world.state.setResource('food', 0);
    runTicks(world, 300);

    expect(world.state.population).toBeLessThan(peak);
    expect(world.state.buildings.size).toBe(1);
    expect(house.level).toBe(1);
  });

  it('her VATANDAS yer - issiz olan da', () => {
    const world = makeWorld();
    for (const key of RESOURCE_ORDER) world.state.setResource(key, 99_999);
    place(world, 'house');
    runTicks(world, 2000);

    // Hicbir uretim binasi yok, yani tum vatandaslar issiz.
    expect(world.workforce.snapshot.working).toBe(0);
    expect(world.economy.snapshot.netPerMinute.food).toBeCloseTo(
      -world.state.population * FOOD_UPKEEP_PER_CITIZEN,
      6,
    );
  });
});

/**
 * Ekonominin OLCULEN yapisal gercekleri.
 *
 * Bunlar bug degil, tasarim sonuclari. Testler yalnizca durumu kilitler ki
 * Sprint 12'de bir sey degistiginde sessizce kaymasin.
 */
describe('ekonominin olculen yapisi', () => {
  it('ODUN KAPISI KIRILDI: oduncu kampi odunsuz kurulabilir', () => {
    /*
     * Sprint 11'de yedi binanin YEDISI de odun istiyordu ve bu, odun biten
     * oyuncu icin geri donusu olmayan bir kilit yaratiyordu. Sprint 12'de
     * oduncu kampinin odun maliyeti kaldirildi: kapi artik kirik.
     */
    const camp = levelOf(getBuilding('lumber_camp'), 1)?.buildCost ?? {};
    expect(camp.wood ?? 0).toBe(0);
    expect(camp.stone ?? 0).toBeGreaterThan(0); // yine de bedava degil

    // Odun ureten tek bina hala oduncu kampi.
    const woodProducers = allBuildings().filter((d) =>
      d.levels.some((l) => (l.production?.wood ?? 0) > 0),
    );
    expect(woodProducers.map((d) => d.id)).toEqual(['lumber_camp']);
  });

  it('ALTIN GIDERI GERCEK: her yukseltme altin ister', () => {
    /*
     * Sprint 11'de altinin tum oyunda tek gideri vardi (sehir merkezi Sv.2)
     * ve Pazar'in urettigi altinin alicisi yoktu. Sprint 12'de her
     * yukseltmeye altin bileseni eklendi: Pazar -> altin -> yukseltme
     * zinciri artik kapali bir devre.
     */
    const upgradesWithoutGold: string[] = [];
    for (const def of allBuildings()) {
      for (const entry of def.levels) {
        if (entry.level === 1) continue;
        if ((entry.upgradeCost?.gold ?? 0) <= 0) upgradesWithoutGold.push(`${def.id}:Sv${entry.level}`);
      }
    }
    expect(upgradesWithoutGold).toEqual([]);

    /*
     * Altin uretenler: Pazar ve Sehir Merkezi (Sprint 12), Tapinak ve
     * Liman (Sprint 14). Dordu de altinin ALICISI olan yukseltme zincirini
     * besler; liste buyuyebilir ama altin ureten hicbir bina, altin
     * harcamayan bir yukseltmeye sahip olmamali - ustteki kontrol bunu
     * zaten kilitliyor.
     */
    const goldProducers = allBuildings()
      .filter((d) => d.levels.some((l) => (l.production?.gold ?? 0) > 0))
      .map((d) => d.id)
      .sort();
    expect(goldProducers).toEqual(['harbor', 'market', 'temple', 'town_hall']);
  });

  it('tas yalnizca TAS OCAGINDAN gelir ve ocak KAYA ister', () => {
    const producers = allBuildings().filter((d) =>
      d.levels.some((l) => (l.production?.stone ?? 0) > 0),
    );
    expect(producers.map((d) => d.id)).toEqual(['quarry']);
    expect(getBuilding('quarry').allowedTerrain).toEqual(['rock']);
  });

  it('yiyecegin tek gideri vatandas basina sabit tuketim - bina yiyecek yemez', () => {
    for (const def of allBuildings()) {
      for (const entry of def.levels) {
        expect(entry.buildCost?.food ?? 0).toBe(0);
        expect(entry.upgradeCost?.food ?? 0).toBe(0);
      }
    }
    expect(FOOD_UPKEEP_PER_CITIZEN).toBeGreaterThan(0);
  });

  it('ODUN SIFIRKEN bile oduncu kampi kurulabilir - kilit yok', () => {
    const world = makeWorld();
    world.state.setResource('wood', 0);
    world.state.setResource('stone', 200);
    world.state.setResource('gold', 0);
    world.state.setResource('food', 200);

    // Odun isteyen binalar hala karsilanamaz...
    expect(world.resources.canAfford(levelOf(getBuilding('house'), 1)?.buildCost ?? {})).toBe(false);
    // ...ama uretimi geri getiren bina KARSILANABILIR.
    expect(world.resources.canAfford(levelOf(getBuilding('lumber_camp'), 1)?.buildCost ?? {})).toBe(true);

    // Ve gercekten kurulabiliyor: oyuncu odun uretimine her zaman donebilir.
    let built = false;
    for (const tile of world.state.grid.allTiles()) {
      if (world.buildings.place('lumber_camp', tile.gx, tile.gy).ok) { built = true; break; }
    }
    expect(built).toBe(true);
  });

  it('yikim yine de %50 iade verir - ikinci bir cikis yolu', () => {
    const world = makeWorld();
    for (const key of RESOURCE_ORDER) world.state.setResource(key, 99_999);
    const hall = place(world, 'town_hall');
    runTicks(world, 400);

    /*
     * Odun ISTEYEN bir bina uzerinden olculur. Oduncu kampi artik odunsuz
     * kurulabildigi icin kilidi olcmeye uygun degil.
     */
    world.state.setResource('wood', 0);
    const houseCost = levelOf(getBuilding('house'), 1)?.buildCost ?? {};
    expect(world.resources.canAfford(houseCost)).toBe(false);

    world.buildings.demolish(hall.uid);

    // Yikim %50 iade eder; oyuncu yeniden baslayabilir.
    expect(world.resources.amountOf('wood')).toBeGreaterThan(0);
    expect(world.resources.canAfford(houseCost)).toBe(true);
  });
});

describe('yukseltme getirisi (ROI)', () => {
  it('her yukseltmenin uretim artisi ve odun maliyeti katalogdan okunabilir', () => {
    const rows: Array<{ id: string; woodCost: number; gain: number }> = [];
    for (const def of allBuildings()) {
      const lv1 = levelOf(def, 1);
      const lv2 = levelOf(def, 2);
      if (!lv1 || !lv2) continue;

      const woodCost = lv2.upgradeCost?.wood ?? 0;
      let gain = 0;
      for (const key of RESOURCE_ORDER) {
        gain += (lv2.production?.[key] ?? 0) - (lv1.production?.[key] ?? 0);
      }
      rows.push({ id: def.id, woodCost, gain });
    }

    // Katalogdaki yedi binanin da iki seviyesi tanimli.
    expect(rows.length).toBe(allBuildings().length);
    // Uretim yapan her binanin Sv.2'si daha cok uretir.
    for (const row of rows) {
      const def = getBuilding(row.id as BuildingId);
      const produces = def.levels.some((l) => Object.keys(l.production ?? {}).length > 0);
      if (produces) expect(row.gain).toBeGreaterThan(0);
    }
  });

  it('yukseltme isci ihtiyacini da artirir - bedava degil', () => {
    for (const def of allBuildings()) {
      const lv1 = levelOf(def, 1);
      const lv2 = levelOf(def, 2);
      if (!lv1 || !lv2) continue;
      if ((lv1.workerRequirement ?? 0) === 0) continue;
      expect(lv2.workerRequirement ?? 0).toBeGreaterThan(lv1.workerRequirement ?? 0);
    }
  });
});

describe('kayit / yukleme - ekonomi butunlugu', () => {
  it('kaynak, nufus, seviye ve kadro kayittan aynen geri gelir', () => {
    const world = makeWorld();
    for (const key of RESOURCE_ORDER) world.state.setResource(key, 99_999);
    for (let i = 0; i < 3; i += 1) place(world, 'house');
    const camp = place(world, 'lumber_camp');
    const store = place(world, 'warehouse');
    runTicks(world, 900);
    staff(world, camp.uid);
    world.upgrades.requestUpgrade(camp.uid);
    runTicks(world, 200);

    const before = {
      resources: world.resources.snapshot(),
      population: world.state.population,
      level: camp.level,
      assigned: camp.assignedWorkers,
      capacity: world.resources.capacity,
      production: output(world, camp, 'wood'),
    };

    const save = world.state.toSave(SAVE_VERSION);
    const migrated = migrateAndSanitize(save);
    if (!migrated) throw new Error('kayit reddedildi');
    const loaded = wrap(GameState.fromSave(migrated));
    const reloadedCamp = loaded.state.buildings.get(camp.uid);
    if (!reloadedCamp) throw new Error('bina kaybedildi');

    expect(loaded.resources.snapshot()).toEqual(before.resources);
    expect(loaded.state.population).toBe(before.population);
    expect(reloadedCamp.level).toBe(before.level);
    expect(reloadedCamp.assignedWorkers).toBe(before.assigned);
    // Turetilmis degerler yeniden HESAPLANIR, kayittan okunmaz.
    expect(loaded.resources.capacity).toBe(before.capacity);
    expect(output(loaded, reloadedCamp, 'wood')).toBeCloseTo(before.production, 6);
    expect(store.uid).toBeTruthy();
  });

  it('yukleme sonrasi ekonomi ayni hizda devam eder', () => {
    const world = makeWorld();
    for (const key of RESOURCE_ORDER) world.state.setResource(key, 5_000);
    place(world, 'house');
    const camp = place(world, 'lumber_camp');
    runTicks(world, 900);
    staff(world, camp.uid);
    world.economy.advance(1, { silent: true });

    const save = world.state.toSave(SAVE_VERSION);
    const migrated = migrateAndSanitize(save);
    if (!migrated) throw new Error('kayit reddedildi');
    const loaded = wrap(GameState.fromSave(migrated));
    loaded.economy.advance(1, { silent: true });

    expect(loaded.economy.snapshot.netPerMinute).toEqual(world.economy.snapshot.netPerMinute);
  });
});
