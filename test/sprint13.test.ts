/**
 * Sprint 13: sehir gorsel donusumu.
 *
 * Bu sprint gorsel ve UX odaklidir; bu yuzden testlerin cogu "yeni sey
 * calisiyor mu" degil, "yeni sey oyunu BOZMADI mi" sorusunu sorar. Dekor,
 * yollar ve ikonlar oyun durumuna dokunmamalidir.
 */
import { describe, expect, it } from 'vitest';
import { GameState } from '@/core/GameState';
import { CityDecorSystem } from '@/systems/CityDecorSystem';
import { BuildingPlotSystem, isBuildable } from '@/systems/BuildingPlotSystem';
import { NavigationSystem } from '@/systems/NavigationSystem';
import { migrateAndSanitize } from '@/core/SaveManager';
import {
  BOTTOM_UI_BAND,
  GRID_SIZE,
  RESOURCE_ORDER,
  SAVE_VERSION,
  TOP_UI_BAND,
  TextureKeys,
} from '@/config/Constants';
import { allBuildings } from '@/config/BuildingCatalog';
import { artCanvasFor } from '@/render/BuildingArt';
import { DECOR_SPEC, decorKeyFor } from '@/render/DecorArt';
import { ICON_ART, iconKeyFor } from '@/render/IconArt';
import { MAX_VISUAL_LEVEL, visualKeyFor } from '@/render/BuildingVisuals';
import { TOUCH_TARGET } from '@/ui/UIStyle';
import { blockSpot, makeWorld } from './helpers';
import type { DecorKind } from '@/types';

function decorFor(seed: number): CityDecorSystem {
  const state = new GameState(seed);
  return new CityDecorSystem(state.grid, new BuildingPlotSystem(state.grid));
}

function fingerprint(decor: CityDecorSystem): string {
  return decor.items.map((i) => `${i.gx},${i.gy},${i.kind},${i.offsetU},${i.offsetV}`).join('|');
}

describe('sehir dekoru: deterministik', () => {
  it('ayni seed ayni dekoru verir', () => {
    expect(fingerprint(decorFor(4242))).toBe(fingerprint(decorFor(4242)));
  });

  it('farkli seed farkli dekor verir', () => {
    expect(fingerprint(decorFor(1))).not.toBe(fingerprint(decorFor(2)));
  });

  it('sehri dolduracak kadar var ama haritayi kaplamaz', () => {
    const decor = decorFor(12345);
    expect(decor.items.length).toBeGreaterThan(10);
    // Dekor karolarin yarisindan azini kullanir; sehir kalabaliklasmamali.
    expect(decor.items.length).toBeLessThan((GRID_SIZE * GRID_SIZE) / 2);
  });
});

describe('sehir dekoru: oyunu etkilemez', () => {
  it('hicbir dekor YAPI ALANINA konmaz', () => {
    const state = new GameState(777);
    const plots = new BuildingPlotSystem(state.grid);
    const decor = new CityDecorSystem(state.grid, plots);

    for (const item of decor.items) {
      expect(plots.plotAt(item.gx, item.gy)).toBeNull();
    }
  });

  it('dekor karolari yapiya kapali karolardir', () => {
    const state = new GameState(99);
    const decor = new CityDecorSystem(state.grid, new BuildingPlotSystem(state.grid));
    for (const item of decor.items) {
      // Ya sokak, ya da zemini yuzunden alan olamayan bir karo.
      const street = !isBuildable(item.gx, item.gy);
      const tile = state.grid.getTile(item.gx, item.gy);
      expect(street || tile?.terrain === 'rock' || tile?.terrain === 'soil' || tile?.terrain === 'grass').toBe(true);
    }
  });

  it('suya dekor konmaz', () => {
    const state = new GameState(31337);
    const decor = new CityDecorSystem(state.grid, new BuildingPlotSystem(state.grid));
    for (const item of decor.items) {
      expect(state.grid.getTile(item.gx, item.gy)?.terrain).not.toBe('water');
    }
  });

  it('izgara dolulugunu degistirmez', () => {
    const state = new GameState(55);
    const before = state.grid.allTiles().map((t) => t.occupantUid).join(',');
    new CityDecorSystem(state.grid, new BuildingPlotSystem(state.grid));
    expect(state.grid.allTiles().map((t) => t.occupantUid).join(',')).toBe(before);
  });

  it('isci rotalari dekordan etkilenmez', () => {
    const state = new GameState(2024);
    const nav = new NavigationSystem(state.grid);
    const from = { gx: 1, gy: 1 };
    const to = { gx: 11, gy: 10 };
    const before = nav.findPath(from, to);

    new CityDecorSystem(state.grid, new BuildingPlotSystem(state.grid));
    const after = nav.findPath(from, to);

    expect(after).toEqual(before);
  });

  it('karo MERKEZI bos kalir; dekor kenara cekilir', () => {
    const decor = decorFor(8080);
    expect(decor.items.length).toBeGreaterThan(0);
    for (const item of decor.items) {
      // Kaydirma her zaman var (merkezde durmaz) ve karo disina tasmaz.
      expect(Math.abs(item.offsetU)).toBeGreaterThan(0);
      expect(Math.abs(item.offsetU)).toBeLessThanOrEqual(0.5);
      expect(Math.abs(item.offsetV)).toBeGreaterThan(0);
      expect(Math.abs(item.offsetV)).toBeLessThanOrEqual(0.5);
    }
  });

  it('dekor kayda yazilmaz ve kayit surumu artmaz', () => {
    const world = makeWorld(606);
    const spot = blockSpot(world, 'house');
    world.buildings.place('house', spot.gx, spot.gy);

    const save = world.state.toSave(SAVE_VERSION) as unknown as Record<string, unknown>;
    expect(save.decor).toBeUndefined();
    expect(save.version).toBe(3);
    // Eski kayit hala okunur.
    expect(migrateAndSanitize(save)).not.toBeNull();
  });
});

describe('sehir yerlesimi: Sprint 12 kurallari korunuyor', () => {
  it('sokaklar hala yapiya kapali', () => {
    const state = new GameState(1234);
    const plots = new BuildingPlotSystem(state.grid);
    for (const plot of plots.plots) {
      expect(isBuildable(plot.gx, plot.gy)).toBe(true);
    }
  });

  it('yollarin cizilecegi karolar plot OLMAYAN kara karolaridir', () => {
    const state = new GameState(4321);
    const plots = new BuildingPlotSystem(state.grid);
    let paved = 0;
    for (const tile of state.grid.allTiles()) {
      if (tile.terrain === 'water' || isBuildable(tile.gx, tile.gy)) continue;
      paved += 1;
      expect(plots.plotAt(tile.gx, tile.gy)).toBeNull();
    }
    expect(paved).toBeGreaterThan(0);
  });
});

describe('gorsel varliklar', () => {
  it('her kaynagin bir ikonu var', () => {
    for (const key of RESOURCE_ORDER) {
      expect(ICON_ART[key]).toBeTypeOf('function');
      expect(iconKeyFor(key)).toBe(`icon:${key}`);
    }
  });

  it('ana aksiyon ve kilit ikonlari tanimli', () => {
    expect(ICON_ART.hammer).toBeTypeOf('function');
    expect(ICON_ART.lock).toBeTypeOf('function');
  });

  it('her dekor cesidinin cizimi ve olcusu var', () => {
    for (const kind of Object.keys(DECOR_SPEC) as DecorKind[]) {
      const spec = DECOR_SPEC[kind];
      expect(spec.width).toBeGreaterThan(0);
      expect(spec.height).toBeGreaterThan(0);
      // Taban noktasi dokunun icinde olmali; aksi halde oge havada durur.
      expect(spec.baseY).toBeLessThan(spec.height);
      expect(decorKeyFor(kind)).toBe(`deco:${kind}`);
    }
  });

  it('yol, meydan ve kilit dokulari tanimli', () => {
    expect(TextureKeys.TileStreet).toBeTruthy();
    expect(TextureKeys.TilePlaza).toBeTruthy();
    expect(TextureKeys.TileLocked).toBeTruthy();
    // Anahtarlar benzersiz olmali; ayni ad iki dokuyu ezerdi.
    const keys = Object.values(TextureKeys);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it('her binanin HER seviyesi ayri bir siluet uretir', () => {
    for (const def of allBuildings()) {
      const keys = new Set<string>();
      let previousHeight = 0;
      for (let level = 1; level <= MAX_VISUAL_LEVEL; level += 1) {
        keys.add(visualKeyFor(def.id, level));
        // Siluet zarfi her basamakta buyur.
        const canvas = artCanvasFor(def.id, def.size, level);
        expect(canvas.height, `${def.id} Sv${level}`).toBeGreaterThan(previousHeight);
        previousHeight = canvas.height;
      }
      expect(keys.size).toBe(MAX_VISUAL_LEVEL);
    }
    expect(MAX_VISUAL_LEVEL).toBe(3);
  });
});

describe('mobil yerlesim sabitleri', () => {
  it('arayuz bantlari ekranin makul bir kismini kaplar', () => {
    expect(TOP_UI_BAND).toBeGreaterThan(0);
    expect(BOTTOM_UI_BAND).toBeGreaterThan(TOP_UI_BAND);
    // En kisa hedef ekranda (800 mantiksal piksel) arayuz yarisini gecmemeli.
    expect(TOP_UI_BAND + BOTTOM_UI_BAND).toBeLessThan(800 * 0.4);
  });

  it('en dar ekranda bes sekme de dokunulabilir genislikte', () => {
    const narrowest = 360;
    expect(narrowest / 5).toBeGreaterThanOrEqual(TOUCH_TARGET);
  });
});
