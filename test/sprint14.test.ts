/**
 * Sprint 14: buyuk harita, ozel yapilar ve referans arayuz duzeni.
 *
 * Uc yeni sey oyun kurallarina dokunuyor ve hepsi burada kilitleniyor:
 * izgaranin 18x18 olmasi, kaydin ESKI sehirleri kendi olcusunde tutmasi ve
 * limanin KIYI kurali. Geri kalani gorsel/arayuz oldugu icin testler
 * "bozulmadi mi" sorusunu sorar.
 */
import { describe, expect, it } from 'vitest';
import { GameState } from '@/core/GameState';
import { GridMap } from '@/core/GridMap';
import { migrateAndSanitize } from '@/core/SaveManager';
import { BuildingPlotSystem, isBuildable } from '@/systems/BuildingPlotSystem';
import {
  BOTTOM_UI_BAND,
  GRID_SIZE,
  LEGACY_GRID_SIZE,
  SAVE_VERSION,
  STREET_EVERY,
  TOP_UI_BAND,
} from '@/config/Constants';
import { allBuildings, getBuilding } from '@/config/BuildingCatalog';
import { ICON_ART } from '@/render/IconArt';
import { blockSpot, makeWorld } from './helpers';
import type { BuildingCategory } from '@/types';

const SEEDS = [12345, 777, 2024, 555, 90210];

describe('harita 18x18', () => {
  it('yeni oyun buyuk izgarada baslar', () => {
    expect(GRID_SIZE).toBe(18);
    expect(new GameState(1).grid.size).toBe(18);
  });

  it('yapi alani sayisi Sprint 13 doneminden belirgin artti', () => {
    for (const seed of SEEDS) {
      const plots = new BuildingPlotSystem(new GridMap(seed));
      // 14x14'te ~75 alan vardi; 18x18 en az iki katini vermeli.
      expect(plots.plots.length).toBeGreaterThan(120);
    }
  });

  it('sokak deseni korundu: alanlarin hicbiri sokakta degil', () => {
    const plots = new BuildingPlotSystem(new GridMap(4242));
    for (const plot of plots.plots) {
      for (let dy = 0; dy < plot.height; dy += 1) {
        for (let dx = 0; dx < plot.width; dx += 1) {
          expect(isBuildable(plot.gx + dx, plot.gy + dy)).toBe(true);
        }
      }
    }
  });

  it('merkez ADASI her seed icin temiz; sehir merkezi alani hep var', () => {
    for (const seed of SEEDS) {
      const grid = new GridMap(seed);
      const plots = new BuildingPlotSystem(grid);
      const civic = plots.plots.filter((p) => p.zone === 'civic');
      expect(civic.length, `seed ${seed}`).toBe(1);

      // Alan merkez karonun adasinda.
      const center = grid.center();
      const block = (v: number) => Math.floor(v / STREET_EVERY);
      expect(block(civic[0].gx)).toBe(block(center.gx));
      expect(block(civic[0].gy)).toBe(block(center.gy));
    }
  });

  it('alanlar MERKEZDEN DISARI siralanir', () => {
    const grid = new GridMap(12345);
    const plots = new BuildingPlotSystem(grid);
    const center = grid.center();
    const distance = (p: { gx: number; gy: number }) =>
      Math.max(Math.abs(p.gx - center.gx), Math.abs(p.gy - center.gy));

    const list = plots.availableFor('house');
    expect(list.length).toBeGreaterThan(10);
    for (let i = 1; i < list.length; i += 1) {
      expect(distance(list[i])).toBeGreaterThanOrEqual(distance(list[i - 1]));
    }
  });
});

describe('kayit: eski sehirler kendi olcusunde yasar', () => {
  it('izgara boyutu olmayan kayit 14x14 olarak yuklenir', () => {
    const legacy = {
      version: 3,
      savedAt: Date.now(),
      tick: 5,
      terrainSeed: 4242,
      resources: { food: 100, wood: 100, stone: 100, gold: 100 },
      buildings: [],
    };

    const save = migrateAndSanitize(legacy)!;
    expect(save.gridSize).toBe(LEGACY_GRID_SIZE);
    expect(GameState.fromSave(save).grid.size).toBe(LEGACY_GRID_SIZE);
  });

  it('yeni kayit kendi olcusunu tasir ve gidis-donuste korunur', () => {
    const world = makeWorld(31337);
    const spot = blockSpot(world, 'house');
    world.buildings.place('house', spot.gx, spot.gy);

    const save = world.state.toSave(SAVE_VERSION);
    expect(save.gridSize).toBe(GRID_SIZE);

    const restored = GameState.fromSave(migrateAndSanitize(save)!);
    expect(restored.grid.size).toBe(GRID_SIZE);
    expect(restored.buildings.size).toBe(1);
    // Ayni tohum + ayni olcu => ayni zemin.
    expect(restored.grid.allTiles().map((t) => t.terrain).join(',')).toBe(
      world.state.grid.allTiles().map((t) => t.terrain).join(','),
    );
  });

  it('kayit surumu artmadi', () => {
    expect(SAVE_VERSION).toBe(3);
  });

  it('14x14 bir sehir yuklenince yerlesimi hala tutarli', () => {
    const small = new GameState(999, undefined, LEGACY_GRID_SIZE);
    const plots = new BuildingPlotSystem(small.grid);
    expect(small.grid.size).toBe(14);
    expect(plots.plots.length).toBeGreaterThan(50);
    expect(plots.plots.filter((p) => p.zone === 'civic').length).toBe(1);
  });
});

describe('ozel yapilar: tapinak ve liman', () => {
  it('tapinak 2x2, tek ve OZEL kategoride', () => {
    const temple = getBuilding('temple');
    expect(temple.size).toBe(2);
    expect(temple.maxCount).toBe(1);
    expect(temple.category).toBe('special');
  });

  it('her seed icin tapinaga ayrilmis bir 2x2 alan var', () => {
    for (const seed of SEEDS) {
      const plots = new BuildingPlotSystem(new GridMap(seed));
      const monument = plots.availableFor('temple');
      expect(monument.length, `seed ${seed}`).toBeGreaterThan(0);
      expect(monument[0].width).toBe(2);
      expect(monument[0].height).toBe(2);
    }
  });

  it('liman KIYI ister: suya komsu olmayan alan reddedilir', () => {
    const world = makeWorld(2024);
    for (const key of ['wood', 'stone', 'food', 'gold'] as const) {
      world.state.setResource(key, 5000);
    }

    const touchesWater = (gx: number, gy: number) =>
      [
        [0, -1],
        [1, 0],
        [0, 1],
        [-1, 0],
      ].some(([dx, dy]) => world.state.grid.getTile(gx + dx, gy + dy)?.terrain === 'water');

    // Suya komsu OLMAYAN bir konut alani bul; liman oraya kurulamamali.
    const inland = world.plots.plots.find(
      (p) => p.allowedTypes.includes('house') && !touchesWater(p.gx, p.gy),
    );
    expect(inland).toBeDefined();
    expect(world.buildings.validate('harbor', inland!.gx, inland!.gy).ok).toBe(false);

    // Limana ayrilmis alanlarin HEPSI suya komsu.
    const harborPlots = world.plots.availableFor('harbor');
    expect(harborPlots.length).toBeGreaterThan(0);
    for (const plot of harborPlots) expect(touchesWater(plot.gx, plot.gy)).toBe(true);

    // Ve gercekten kurulabiliyor.
    const placed = world.buildings.place('harbor', harborPlots[0].gx, harborPlots[0].gy);
    expect(placed.ok).toBe(true);
  });

  it('kiyi kurali yalnizca limanda var; diger binalar etkilenmedi', () => {
    for (const def of allBuildings()) {
      if (def.id === 'harbor') expect(def.requiresWaterAdjacent).toBe(true);
      else expect(def.requiresWaterAdjacent).toBeUndefined();
    }
  });

  it('yeni binalar da altin zincirine bagli: her Sv2 altin ister', () => {
    for (const id of ['temple', 'harbor'] as const) {
      const level2 = getBuilding(id).levels.find((l) => l.level === 2);
      expect(level2?.upgradeCost?.gold ?? 0).toBeGreaterThan(0);
    }
  });
});

describe('insa menusu kategorileri', () => {
  it('dort kategorinin her biri en az bir bina icerir', () => {
    const counts: Record<BuildingCategory, number> = {
      housing: 0,
      production: 0,
      commerce: 0,
      special: 0,
    };
    for (const def of allBuildings()) counts[def.category] += 1;

    for (const [category, count] of Object.entries(counts)) {
      expect(count, `${category} bos`).toBeGreaterThan(0);
    }
  });

  it('sehir merkezi ve tapinak OZEL, ev KONUT', () => {
    expect(getBuilding('town_hall').category).toBe('special');
    expect(getBuilding('temple').category).toBe('special');
    expect(getBuilding('harbor').category).toBe('special');
    expect(getBuilding('house').category).toBe('housing');
    expect(getBuilding('market').category).toBe('commerce');
    expect(getBuilding('warehouse').category).toBe('commerce');
    expect(getBuilding('farm').category).toBe('production');
  });
});

describe('arayuz varliklari', () => {
  it('gezinme, kategori ve bildirim ikonlarinin hepsi tanimli', () => {
    const needed = [
      'all',
      'housing',
      'production',
      'commerce',
      'special',
      'cityNav',
      'buildingsNav',
      'people',
      'worker',
      'more',
      'settings',
      'mail',
      'trophy',
      'compass',
      'avatar',
      'ok',
      'warn',
      'info',
      'error',
    ] as const;
    for (const kind of needed) {
      expect(ICON_ART[kind], `${kind} ikonu yok`).toBeTypeOf('function');
    }
  });

  it('arayuz bantlari ekranin makul bir kismini kaplar', () => {
    expect(TOP_UI_BAND).toBe(112);
    expect(BOTTOM_UI_BAND).toBe(168);
    // En kisa hedef ekranda (800 mantiksal piksel) arayuz %40'i gecmemeli.
    expect(TOP_UI_BAND + BOTTOM_UI_BAND).toBeLessThan(800 * 0.4);
  });
});
