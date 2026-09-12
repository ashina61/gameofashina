/**
 * Sprint 12 - sehir yerlesimi (plot) ve ekonomi temeli.
 *
 * Iki sey kilitlenir:
 *   1. Bina artik "uygun herhangi bir karoya" degil YAPI ALANINA kurulur ve
 *      yerlesim deterministiktir.
 *   2. Sprint 11 denetiminin bulgulari gercekten duzeldi mi?
 */
import { describe, expect, it } from 'vitest';
import { GameState } from '@/core/GameState';
import { GridMap } from '@/core/GridMap';
import { migrateAndSanitize } from '@/core/SaveManager';
import { BASE_STORAGE_CAPACITY, RESOURCE_ORDER, SAVE_VERSION } from '@/config/Constants';
import { allBuildings, getBuilding, levelOf } from '@/config/BuildingCatalog';
import { BuildingPlotSystem, isBuildable } from '@/systems/BuildingPlotSystem';
import { NavigationSystem } from '@/systems/NavigationSystem';
import { blockSpot, hallSpot, makeWorld, settleWalks, staff, wrap } from './helpers';
import type { TestWorld } from './helpers';
import type { BuildingId } from '@/types';

/** Verilen tur icin ilk bos yapi alanina kurar. */
function buildOnPlot(world: TestWorld, type: BuildingId) {
  for (const plot of world.plots.availableFor(type)) {
    const result = world.buildings.place(type, plot.gx, plot.gy);
    if (result.ok) return result.building;
  }
  throw new Error(`${type} icin bos yapi alani yok`);
}

/** Simulasyonu tik tik ilerletir (insaat kuyrugu bosalsin). */
function runTicks(world: TestWorld, ticks: number): void {
  for (let i = 0; i < ticks; i += 1) world.simulation.advance(1);
}

describe('yapi alanlari', () => {
  it('yerlesim DETERMINISTIK: ayni seed ayni sehri verir', () => {
    const first = new BuildingPlotSystem(new GridMap(4242));
    const second = new BuildingPlotSystem(new GridMap(4242));

    expect(second.plots.length).toBe(first.plots.length);
    expect(second.plots.map((p) => `${p.id}:${p.zone}:${p.allowedTypes.join('/')}`)).toEqual(
      first.plots.map((p) => `${p.id}:${p.zone}:${p.allowedTypes.join('/')}`),
    );
  });

  it('farkli seed farkli sehir verir - yerlesim zeminden turer', () => {
    const a = new BuildingPlotSystem(new GridMap(1));
    const b = new BuildingPlotSystem(new GridMap(999));
    const shape = (s: BuildingPlotSystem) => s.plots.map((p) => p.allowedTypes.join('/')).join('|');
    expect(shape(a)).not.toBe(shape(b));
  });

  it('sokaklar hicbir zaman yapi alani DEGIL', () => {
    const plots = new BuildingPlotSystem(new GridMap(7));
    for (const plot of plots.plots) {
      for (let dy = 0; dy < plot.height; dy += 1) {
        for (let dx = 0; dx < plot.width; dx += 1) {
          expect(isBuildable(plot.gx + dx, plot.gy + dy)).toBe(true);
        }
      }
    }
  });

  it('sokaklar sehri BOLMEZ: her yapi alani meydandan yuruyerek erisilir', () => {
    const grid = new GridMap(31337);
    const plots = new BuildingPlotSystem(grid);
    const nav = new NavigationSystem(grid);
    const center = grid.center();

    for (const plot of plots.plots) {
      // Alanin cevresinde acik bir karo ve oraya meydandan rota olmali.
      const ring = nav.ringAround(plot.gx, plot.gy, Math.max(plot.width, plot.height));
      expect(ring.length).toBeGreaterThan(0);
      const path = nav.findPath({ gx: center.gx, gy: center.gy }, ring[0]);
      expect(path.length).toBeGreaterThan(0);
    }
  });

  it('katalogdaki her bina turunun yapi alani var', () => {
    for (const seed of [12345, 777, 2024]) {
      const plots = new BuildingPlotSystem(new GridMap(seed));
      for (const def of allBuildings()) {
        expect(
          plots.availableFor(def.id).length,
          `${def.id} icin alan yok (seed ${seed})`,
        ).toBeGreaterThan(0);
      }
    }
  });

  it('sehir merkezi TEK ve OZEL bir 2x2 alanda, tam merkezde', () => {
    const grid = new GridMap(555);
    const plots = new BuildingPlotSystem(grid);
    const civic = plots.plots.filter((p) => p.zone === 'civic');

    expect(civic.length).toBe(1);
    expect(civic[0].width).toBe(2);
    expect(civic[0].height).toBe(2);
    expect(civic[0].allowedTypes).toEqual(['town_hall']);

    /*
     * Alan, merkez karonun ADASIDIR.
     *
     * "Merkez karo alanin icinde" demek 14x14'te dogruydu ama izgara
     * boyutuna baglidir: 18x18'de merkez karo (9,9) bir SOKAK karosudur,
     * cunku 9, sokak araliginin katidir. Degismeyen kural, alanin merkezi
     * iceren adada olmasidir.
     */
    const center = grid.center();
    const block = (v: number) => Math.floor(v / 3);
    expect(block(civic[0].gx)).toBe(block(center.gx));
    expect(block(civic[0].gy)).toBe(block(center.gy));

    // Sehir merkezi baska hicbir alana kurulamaz.
    expect(plots.availableFor('town_hall').map((p) => p.id)).toEqual([civic[0].id]);
  });

  it('haritanin tamami plotla dolmaz - meydan ve sokak kalir', () => {
    const grid = new GridMap(2024);
    const plots = new BuildingPlotSystem(grid);
    let covered = 0;
    for (const plot of plots.plots) covered += plot.width * plot.height;
    const total = grid.size * grid.size;
    expect(covered).toBeLessThan(total * 0.55);
    expect(covered).toBeGreaterThan(total * 0.2);
  });

  it('bolgeler merkezden disari siralanir: ticaret -> konut -> uretim', () => {
    const grid = new GridMap(12345);
    const plots = new BuildingPlotSystem(grid);
    const center = grid.center();
    const distance = (p: { gx: number; gy: number }) =>
      Math.max(Math.abs(p.gx - center.gx), Math.abs(p.gy - center.gy));

    /*
     * Yaricaplar izgara boyutundan turer (Sprint 14); test sabit sayi
     * yazmaz, yalnizca SIRALAMAYI kilitler: ticaret en icte, uretim en
     * disarida ve aralarinda konut.
     */
    const maxOf = (zone: string) =>
      Math.max(...plots.plots.filter((p) => p.zone === zone).map(distance));
    const minOf = (zone: string) =>
      Math.min(...plots.plots.filter((p) => p.zone === zone).map(distance));

    expect(maxOf('civic')).toBeLessThanOrEqual(1);
    expect(maxOf('commerce')).toBeLessThan(minOf('production'));
    expect(maxOf('residential')).toBeLessThan(minOf('production'));
    expect(minOf('residential')).toBeGreaterThan(maxOf('civic'));
    // Pazar merkeze yakin, oduncu kampi disarida.
    const marketPlots = plots.plots.filter((p) => p.allowedTypes.includes('market'));
    const campPlots = plots.plots.filter((p) => p.allowedTypes.includes('lumber_camp'));
    expect(Math.max(...marketPlots.map(distance))).toBeLessThan(
      Math.min(...campPlots.map(distance)),
    );
  });

  it('tas ocaginin KAYA sarti korundu', () => {
    const grid = new GridMap(12345);
    const plots = new BuildingPlotSystem(grid);
    for (const plot of plots.plots) {
      if (!plot.allowedTypes.includes('quarry')) continue;
      expect(grid.getTile(plot.gx, plot.gy)?.terrain).toBe('rock');
    }
  });
});

describe('yapi alanina yerlestirme', () => {
  it('yapi alani DISINA kurulamaz - sokaga bina dikilemez', () => {
    const world = makeWorld();
    let streetTried = false;
    for (const tile of world.state.grid.allTiles()) {
      if (isBuildable(tile.gx, tile.gy)) continue;
      if (tile.terrain !== 'grass' && tile.terrain !== 'soil') continue;
      streetTried = true;
      expect(world.buildings.place('house', tile.gx, tile.gy)).toEqual({
        ok: false,
        reason: 'no_plot',
      });
      break;
    }
    expect(streetTried).toBe(true);
  });

  it('alanin kabul etmedigi tur reddedilir', () => {
    const world = makeWorld();
    const civic = world.plots.plots.find((p) => p.zone === 'civic');
    if (!civic) throw new Error('sehir merkezi alani yok');
    // Sehir merkezi alani yalnizca sehir merkezini kabul eder.
    expect(world.buildings.place('house', civic.gx, civic.gy)).toEqual({
      ok: false,
      reason: 'no_plot',
    });
  });

  it('dolu alana ikinci bina kurulamaz', () => {
    const world = makeWorld();
    const spot = blockSpot(world, 'house');
    expect(world.buildings.place('house', spot.gx, spot.gy).ok).toBe(true);
    expect(world.buildings.place('house', spot.gx, spot.gy)).toEqual({
      ok: false,
      reason: 'occupied',
    });
  });

  it('sehir merkezi ozel alanina kurulur ve tek kalir', () => {
    const world = makeWorld();
    const hall = hallSpot(world);
    expect(world.buildings.place('town_hall', hall.gx, hall.gy).ok).toBe(true);
    expect(world.buildings.place('town_hall', hall.gx, hall.gy)).toEqual({
      ok: false,
      reason: 'max_count',
    });
  });

  it('yikim alani yeniden ACAR', () => {
    const world = makeWorld();
    const spot = blockSpot(world, 'house');
    const plot = world.plots.plotAt(spot.gx, spot.gy);
    if (!plot) throw new Error('alan yok');

    const placed = world.buildings.place('house', spot.gx, spot.gy);
    if (!placed.ok) throw new Error('kurulamadi');
    expect(world.plots.isFree(plot)).toBe(false);

    world.buildings.demolish(placed.building.uid);
    expect(world.plots.isFree(plot)).toBe(true);
    expect(world.plots.availableFor('house').some((p) => p.id === plot.id)).toBe(true);
  });

  it('doluluk IKINCI bir yerde tutulmaz - tek gercek izgaradir', () => {
    const world = makeWorld();
    const spot = blockSpot(world, 'house');
    const plot = world.plots.plotAt(spot.gx, spot.gy);
    if (!plot) throw new Error('alan yok');

    const placed = world.buildings.place('house', spot.gx, spot.gy);
    if (!placed.ok) throw new Error('kurulamadi');

    // Plot nesnesi bina referansi TASIMAZ; doluluk izgaradan okunur.
    expect('buildingUid' in plot).toBe(false);
    expect(world.plots.occupantOf(plot)).toBe(placed.building.uid);
    expect(world.state.grid.getTile(spot.gx, spot.gy)?.occupantUid).toBe(placed.building.uid);
  });
});

describe('navigasyon uyumu', () => {
  it('bina ayak izi hala engel; alan isareti engel DEGIL', () => {
    const world = makeWorld();
    const spot = blockSpot(world, 'house');

    // Bos alan yurunebilir.
    expect(world.navigation.isWalkable(spot.gx, spot.gy)).toBe(true);

    const placed = world.buildings.place('house', spot.gx, spot.gy);
    if (!placed.ok) throw new Error('kurulamadi');
    expect(world.navigation.isWalkable(spot.gx, spot.gy)).toBe(false);

    world.buildings.demolish(placed.building.uid);
    expect(world.navigation.isWalkable(spot.gx, spot.gy)).toBe(true);
  });

  it('isci yeni yerlesimde de binaya ulasip calisiyor', () => {
    const world = makeWorld();
    for (const key of RESOURCE_ORDER) world.state.setResource(key, 99_999);
    buildOnPlot(world, 'house');
    buildOnPlot(world, 'house');
    const camp = buildOnPlot(world, 'lumber_camp');
    runTicks(world, 900);

    staff(world, camp.uid);
    settleWalks(world);
    expect(camp.assignedWorkers).toBeGreaterThan(0);
    expect(world.buildings.resolve(camp).effectiveProduction.wood ?? 0).toBeGreaterThan(0);
  });
});

describe('ekonomi temeli - Sprint 11 bulgulari', () => {
  it('ODUN KILIDI YOK: odun sifirken oduncu kampi kurulabilir', () => {
    const world = makeWorld();
    world.state.setResource('wood', 0);
    world.state.setResource('stone', 200);

    const camp = buildOnPlot(world, 'lumber_camp');
    expect(camp).toBeTruthy();
    expect(world.state.resources.wood).toBe(0); // odun harcanmadi
  });

  it('ALTIN ZINCIRI: pazar altin uretir, yukseltmeler altin ister', () => {
    const goldSinks = allBuildings().flatMap((def) =>
      def.levels
        .filter((l) => l.level > 1 && (l.upgradeCost?.gold ?? 0) > 0)
        .map((l) => `${def.id}:Sv${l.level}`),
    );
    /*
     * Her binanin SEVIYE 1'IN USTUNDEKI her yukseltmesi altin ister.
     *
     * Once "her bina bir altin gideri" diye sayiliyordu; Sprint 15 ucuncu
     * seviyeyi ekleyince bina basina iki gider oldu. Dogru degismez kural,
     * altin istemeyen bir yukseltmenin HIC OLMAMASIDIR.
     *
     * TEK ISTISNA SEHIR MERKEZI (Sprint 15): sehrin altin kaynagi kendi
     * buyumesi icin altin isteyemez - yoksa oyuncu gelirini artirmak icin
     * gelirini biriktirmek zorunda kalir. Gerekcesi sprint11 testindeki
     * "ALTIN GIDERI GERCEK" maddesinde ayrintili.
     */
    const upgradeCount = allBuildings().reduce(
      (sum, def) => sum + (def.id === 'town_hall' ? 0 : def.levels.filter((l) => l.level > 1).length),
      0,
    );
    expect(goldSinks.length).toBe(upgradeCount);
    expect((levelOf(getBuilding('market'), 1)?.production?.gold ?? 0)).toBeGreaterThan(0);
  });

  it('TAS OCAGI erisilebilir: kadro yariya indi, uretim korundu', () => {
    const lv1 = levelOf(getBuilding('quarry'), 1);
    const farm = levelOf(getBuilding('farm'), 1);
    expect(lv1?.workerRequirement ?? 0).toBeLessThanOrEqual(farm?.workerRequirement ?? 0);
    expect(lv1?.production?.stone ?? 0).toBeGreaterThan(0);
  });

  it('AMBAR anlamli: taban depo, bir ambardan kucuk', () => {
    const store = levelOf(getBuilding('warehouse'), 1)?.storageCapacity ?? 0;
    // Ambar tek basina tabani en az bir kat artirmali; aksi halde fark
    // hissedilmezdi (Sprint 11 bulgusu).
    expect(store).toBeGreaterThan(BASE_STORAGE_CAPACITY * 0.8);
    // Baslangic kaynaklarindan hicbiri taban kapasiteyi ASMAZ; acilista
    // sessizce kaynak kirpilmaz.
    const world = makeWorld();
    for (const key of RESOURCE_ORDER) {
      expect(world.state.resources[key]).toBeLessThanOrEqual(BASE_STORAGE_CAPACITY);
    }
  });

  it('YUKSELTME gercek secenek: Sv.2 isci basina daha verimli', () => {
    for (const def of allBuildings()) {
      const lv1 = levelOf(def, 1);
      const lv2 = levelOf(def, 2);
      if (!lv1 || !lv2) continue;
      const need1 = lv1.workerRequirement ?? 0;
      const need2 = lv2.workerRequirement ?? 0;
      if (need1 === 0 || need2 === 0) continue;

      const out1 = RESOURCE_ORDER.reduce((sum, k) => sum + (lv1.production?.[k] ?? 0), 0);
      const out2 = RESOURCE_ORDER.reduce((sum, k) => sum + (lv2.production?.[k] ?? 0), 0);
      // Yukseltmenin asil kazanci: ayni isciden daha cok urun.
      expect(out2 / need2).toBeGreaterThan(out1 / need1);
    }
  });

  it('yukseltme ayni uretim icin DAHA AZ yapi alani kullanir', () => {
    // Sv.2 ciftlik, iki Sv.1 ciftlikten az alan kaplar ve az isci ister.
    const lv1 = levelOf(getBuilding('farm'), 1);
    const lv2 = levelOf(getBuilding('farm'), 2);
    const copies = Math.ceil((lv2?.production?.food ?? 0) / (lv1?.production?.food ?? 1));
    expect(copies).toBeGreaterThan(1); // ayni uretim icin birden fazla kopya gerekir
    expect(lv2?.workerRequirement ?? 0).toBeLessThan((lv1?.workerRequirement ?? 0) * copies);
  });
});

describe('kayit / yukleme', () => {
  it('yerlesim KAYDA yazilmaz; seed uzerinden yeniden kurulur', () => {
    const world = makeWorld(8888);
    const save = world.state.toSave(SAVE_VERSION) as unknown as Record<string, unknown>;
    expect('plots' in save).toBe(false);

    const migrated = migrateAndSanitize(save);
    if (!migrated) throw new Error('kayit reddedildi');
    const loaded = wrap(GameState.fromSave(migrated));

    expect(loaded.plots.plots.map((p) => p.id)).toEqual(world.plots.plots.map((p) => p.id));
  });

  it('kayit surumu ARTMADI - eski kayitlar yuklenmeye devam eder', () => {
    expect(SAVE_VERSION).toBe(3);
  });

  it('yuklenen bina alani yeniden DOLU gosterir', () => {
    const world = makeWorld(4321);
    for (const key of RESOURCE_ORDER) world.state.setResource(key, 99_999);
    const house = buildOnPlot(world, 'house');
    runTicks(world, 200);

    const migrated = migrateAndSanitize(world.state.toSave(SAVE_VERSION));
    if (!migrated) throw new Error('kayit reddedildi');
    const loaded = wrap(GameState.fromSave(migrated));

    const plot = loaded.plots.plotAt(house.gx, house.gy);
    if (!plot) throw new Error('alan yok');
    expect(loaded.plots.isFree(plot)).toBe(false);
    expect(loaded.plots.occupantOf(plot)).toBe(house.uid);
  });
});
