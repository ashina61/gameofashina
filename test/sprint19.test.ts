import { describe, expect, it } from 'vitest';
import {
  GRID_SIZE,
  LEGACY_STREET_EVERY,
  SAVE_VERSION,
  STREET_EVERY,
} from '@/config/Constants';
import { GameState } from '@/core/GameState';
import { GridMap } from '@/core/GridMap';
import { migrateAndSanitize } from '@/core/SaveManager';
import {
  BuildingPlotSystem,
  isBuildable,
  isCourtyard,
} from '@/systems/BuildingPlotSystem';
import { NavigationSystem, isWalkableTile } from '@/systems/NavigationSystem';
import { terrainAssets } from '@/render/AssetManifest';
import { SKIN_PALETTE } from '@/render/PanelSkin';
import { TERRAIN_COLORS } from '@/render/TextureFactory';

const SEEDS = [1, 4242, 31337, 8888];

/**
 * Sprint 19 / adim 1: YAPI ADASI YENIDEN DUZENI.
 *
 * Olculen sorun: aralik 3 iken 3x3 bloklarin yalnizca 2x2 ici yapiya
 * aciliyordu, yani haritanin yarisindan fazlasi kalici sokakti ve sehir
 * kareli defter gibi okunuyordu. Aralik 4'e cikti; ada ici 3x3 oldu ve
 * ortasina AVLU kondu.
 */
describe('yapi adasi duzeni', () => {
  it('yeni sehirler genis adalarda kurulur, eskiler kendi araliginda kalir', () => {
    expect(STREET_EVERY).toBe(4);
    expect(LEGACY_STREET_EVERY).toBe(3);
    expect(new GridMap(1).streetEvery).toBe(STREET_EVERY);
  });

  it('yapiya acik karo orani belirgin artti', () => {
    const count = (period: number) => {
      let open = 0;
      for (let gy = 0; gy < GRID_SIZE; gy += 1) {
        for (let gx = 0; gx < GRID_SIZE; gx += 1) {
          if (isBuildable(gx, gy, period)) open += 1;
        }
      }
      return open / (GRID_SIZE * GRID_SIZE);
    };
    // Eski yerlesim %44,4; yenisi %52,2 olmali.
    expect(count(LEGACY_STREET_EVERY)).toBeCloseTo(0.444, 2);
    expect(count(STREET_EVERY)).toBeGreaterThan(count(LEGACY_STREET_EVERY));
    expect(count(STREET_EVERY)).toBeCloseTo(0.522, 2);
  });

  it('avlu yalnizca genis adalarda vardir', () => {
    // Eski yerlesimde ada ici 2x2; orta karo diye bir sey yok.
    for (let g = 0; g < GRID_SIZE; g += 1) {
      expect(isCourtyard(g, g, LEGACY_STREET_EVERY)).toBe(false);
    }
    // Yeni yerlesimde her adanin tam ortasinda bir avlu var.
    expect(isCourtyard(2, 2, STREET_EVERY)).toBe(true);
    expect(isCourtyard(6, 2, STREET_EVERY)).toBe(true);
    expect(isCourtyard(1, 2, STREET_EVERY)).toBe(false);
    // Avlu, sokak DEGILDIR - yapiya acik ama plot verilmez.
    expect(isBuildable(2, 2, STREET_EVERY)).toBe(true);
  });

  it('avluya yapi alani acilmaz', () => {
    for (const seed of SEEDS) {
      const grid = new GridMap(seed);
      const plots = new BuildingPlotSystem(grid);
      for (const plot of plots.plots) {
        for (let dy = 0; dy < plot.height; dy += 1) {
          for (let dx = 0; dx < plot.width; dx += 1) {
            const gx = plot.gx + dx;
            const gy = plot.gy + dy;
            // Merkez ve anit alanlari 2x2'dir ve adanin ortasini yutabilir;
            // kural yalnizca 1x1 alanlar icin gecerli.
            if (plot.width > 1 || plot.height > 1) continue;
            expect(
              isCourtyard(gx, gy, grid.streetEvery),
              `avluda plot: ${gx},${gy} (seed ${seed})`,
            ).toBe(false);
          }
        }
      }
    }
  });

  /**
   * Avlunun VAROLUS SEBEBI budur.
   *
   * Ada ici 3x3 olunca orta karonun dort komsusu da yapi olabiliyor; sehir
   * tamamen dolunca o karo gezinti agindan kopuyordu. Avlu bos kaldigi icin
   * her yapi alani DOLU SEHIRDE BILE yurunebilir bir karoya komsu kalir.
   */
  it('sehir TAMAMEN dolduğunda bile her yapi alani yurunebilir bir karoya komsu', () => {
    for (const seed of SEEDS) {
      const grid = new GridMap(seed);
      const plots = new BuildingPlotSystem(grid);

      // Butun alanlari doldur: her plot karosunu isgal edilmis say.
      let uid = 0;
      for (const plot of plots.plots) {
        grid.occupy(plot.gx, plot.gy, Math.max(plot.width, plot.height), `b${uid++}`);
      }

      for (const plot of plots.plots) {
        let reachable = false;
        for (let dy = -1; dy <= plot.height; dy += 1) {
          for (let dx = -1; dx <= plot.width; dx += 1) {
            const inside = dx >= 0 && dy >= 0 && dx < plot.width && dy < plot.height;
            if (inside) continue;
            if (isWalkableTile(grid.getTile(plot.gx + dx, plot.gy + dy))) reachable = true;
          }
        }
        expect(reachable, `kopuk alan: ${plot.id} (seed ${seed})`).toBe(true);
      }
    }
  });

  /**
   * Avlu DOLU SEHIRDE KAPALI KALIR - ve bu dogrudur.
   *
   * Ada tamamen kurulunca ortadaki avlunun dort komsusu da yapi olur, yani
   * avlu sokak agindan kopar. Gercek bir sehir adasinin ic avlusu da
   * boyledir. Oyun acisindan zararsizdir cunku avluda PLOT YOKTUR: oraya
   * gitmesi gereken bir isci ya da gorev olusmaz. Onemli olan degismez, bir
   * alttaki testtir - YAPI ALANLARI kopmamali.
   *
   * Bu test o siniri belgeler: avlunun kapanmasi beklenen davranistir,
   * kesfedilmemis bir hata degil.
   */
  it('dolu adanin avlusu kapanir; bu beklenen davranistir', () => {
    const grid = new GridMap(4242);
    const plots = new BuildingPlotSystem(grid);
    let uid = 0;
    for (const plot of plots.plots) {
      grid.occupy(plot.gx, plot.gy, Math.max(plot.width, plot.height), `b${uid++}`);
    }

    const enclosed = grid
      .allTiles()
      .filter((t) => isCourtyard(t.gx, t.gy, grid.streetEvery) && isWalkableTile(t))
      .filter((t) =>
        [
          [0, -1],
          [1, 0],
          [0, 1],
          [-1, 0],
        ].every(([dx, dy]) => !isWalkableTile(grid.getTile(t.gx + dx, t.gy + dy))),
      );
    expect(enclosed.length).toBeGreaterThan(0);
  });

  /**
   * ASIL DEGISMEZ: sehir tamamen dolu olsa bile her yapi alani SOKAK
   * AGINDAN yuruyerek erisilebilir olmali.
   *
   * Yalnizca "komsusunda bos karo var" demek yetmez: o bos karo kapali bir
   * avlu olabilir. Bu yuzden erisim, sokak agindan gercek bir BFS ile
   * dogrulanir.
   */
  it('sehir TAMAMEN dolduğunda her yapi alani SOKAK AGINDAN erisilebilir', () => {
    for (const seed of SEEDS) {
      const grid = new GridMap(seed);
      const plots = new BuildingPlotSystem(grid);
      const nav = new NavigationSystem(grid);
      let uid = 0;
      for (const plot of plots.plots) {
        grid.occupy(plot.gx, plot.gy, Math.max(plot.width, plot.height), `b${uid++}`);
      }

      /*
       * Baslangic SEHIR MERKEZININ yanindaki sokak olmali.
       *
       * Once satir sirasindaki ilk yurunebilir sokak seciliyordu; harita
       * kosesindeki (0,0) suyla cevrili tek karolik bir CEP oldugunda test
       * butun sehri kopuk sanip yaniltici bir hata veriyordu.
       */
      const civic = plots.plots.find((p) => p.zone === 'civic');
      if (!civic) throw new Error('sehir merkezi alani yok');
      const from = nav
        .ringAround(civic.gx, civic.gy, 2)
        .find((pt) => !isBuildable(pt.gx, pt.gy, grid.streetEvery));
      if (!from) throw new Error('merkezin yaninda sokak yok');

      for (const plot of plots.plots) {
        const span = Math.max(plot.width, plot.height);
        const reachable = nav
          .ringAround(plot.gx, plot.gy, span)
          .some((point) => nav.findPath(from, point).length > 0);
        expect(reachable, `sokaktan kopuk alan: ${plot.id} (seed ${seed})`).toBe(true);
      }
    }
  });

  /**
   * Bolge tercihi bir ONCELIKTIR, veto degil: yapiya acik ve uygun zeminli
   * bir karo, bolge listesi onu kabul etmedigi icin kalici bosluga
   * donusmemeli.
   */
  it('yapiya acik hicbir kara karo bolge yuzunden bos birakilmaz', () => {
    for (const seed of SEEDS) {
      const grid = new GridMap(seed);
      const plots = new BuildingPlotSystem(grid);

      for (const tile of grid.allTiles()) {
        if (!isBuildable(tile.gx, tile.gy, grid.streetEvery)) continue;
        if (isCourtyard(tile.gx, tile.gy, grid.streetEvery)) continue;
        if (tile.terrain === 'water') continue;
        // Sokak agindan hizmet almayan karoya bilerek plot acilmaz.
        if (!plots.isStreetServed(tile.gx, tile.gy)) continue;

        expect(
          plots.plotAt(tile.gx, tile.gy),
          `bos birakilan karo: ${tile.gx},${tile.gy} (${tile.terrain}, seed ${seed})`,
        ).not.toBeNull();
      }
    }
  });

  /**
   * Yukaridaki test tek basina zayif olurdu: isStreetServed her seye false
   * dese o da gecerdi. Bu test kuralin GERCEKTEN dar oldugunu olcer -
   * yapiya acik kara karolarin ezici cogunlugu hizmet almali.
   */
  it('sokak agi kurali dar bir istisnadir, genel bir bahane degil', () => {
    for (const seed of SEEDS) {
      const grid = new GridMap(seed);
      const plots = new BuildingPlotSystem(grid);
      let land = 0;
      let served = 0;
      for (const tile of grid.allTiles()) {
        if (!isBuildable(tile.gx, tile.gy, grid.streetEvery)) continue;
        if (isCourtyard(tile.gx, tile.gy, grid.streetEvery)) continue;
        if (tile.terrain === 'water') continue;
        land += 1;
        if (plots.isStreetServed(tile.gx, tile.gy)) served += 1;
      }
      expect(served / land, `seed ${seed}`).toBeGreaterThan(0.95);
    }
  });
});

describe('yerlesim kaydi', () => {
  it('yeni kayit kendi sokak araligini tasir', () => {
    const state = new GameState(777);
    const save = state.toSave(SAVE_VERSION);
    expect(save.streetEvery).toBe(STREET_EVERY);

    const migrated = migrateAndSanitize(save as unknown as Record<string, unknown>);
    if (!migrated) throw new Error('kayit reddedildi');
    expect(GameState.fromSave(migrated).grid.streetEvery).toBe(STREET_EVERY);
  });

  it('ALANI OLMAYAN eski kayit eski yerlesimde kalir', () => {
    const state = new GameState(777);
    const save = state.toSave(SAVE_VERSION) as unknown as Record<string, unknown>;
    delete save.streetEvery;

    const migrated = migrateAndSanitize(save);
    if (!migrated) throw new Error('kayit reddedildi');
    const loaded = GameState.fromSave(migrated);
    expect(loaded.grid.streetEvery).toBe(LEGACY_STREET_EVERY);
  });

  it('kayit surumu ARTMADI - alan geriye donuk uyumlu', () => {
    expect(SAVE_VERSION).toBe(3);
  });
});

/**
 * Sprint 19 / adim 2: DUNYA ILE ARAYUZUN RENK AYRIMI.
 *
 * Olculen sorun: gercek ekran goruntusunde piksellerin %64,7'si tek bir ton
 * diliminde (bej-sari) topluyordu. Panel parsomeni, meydan dosemesi ve bina
 * duvarlari ayni krem ailesindendi; goz arayuzu sehirden ayiramiyordu.
 *
 * Arayuz parsomen KALIR - bilincli bir tercih. Ayrisma zeminden gelir:
 * cimen doygunlasir, su derinlesir, doseme koyulasir.
 */
describe('zemin ve arayuz paleti ayrisir', () => {
  /** Iki rengin RGB uzayindaki uzakligi (0..441). */
  const distance = (a: number, b: number): number => {
    const dr = ((a >> 16) & 0xff) - ((b >> 16) & 0xff);
    const dg = ((a >> 8) & 0xff) - ((b >> 8) & 0xff);
    const db = (a & 0xff) - (b & 0xff);
    return Math.sqrt(dr * dr + dg * dg + db * db);
  };
  const parseHex = (css: string): number => Number.parseInt(css.replace('#', ''), 16);

  it('hicbir zemin rengi panel parsomenine yakin degil', () => {
    const parchments = [
      SKIN_PALETTE.parchmentLight,
      SKIN_PALETTE.parchment,
      SKIN_PALETTE.parchmentDark,
    ].map(parseHex);

    for (const [name, colors] of Object.entries(TERRAIN_COLORS)) {
      for (const parchment of parchments) {
        expect(
          distance(colors.top, parchment),
          `${name} zemini panel parsomenine cok yakin`,
        ).toBeGreaterThan(60);
      }
    }
  });

  it('cimen GERCEKTEN yesil: yesil kanal baskin ve doygunluk yeterli', () => {
    const { top } = TERRAIN_COLORS.grass;
    const r = (top >> 16) & 0xff;
    const g = (top >> 8) & 0xff;
    const b = top & 0xff;
    expect(g, 'yesil kanal kirmizidan baskin olmali').toBeGreaterThan(r + 30);
    expect(g, 'yesil kanal maviden baskin olmali').toBeGreaterThan(b + 60);
    // Doygunluk: en yuksek ve en dusuk kanal arasindaki fark.
    expect(g - b).toBeGreaterThan(80);
  });

  it('su GERCEKTEN mavi ve zeminlerin en koyusu', () => {
    const { top } = TERRAIN_COLORS.water;
    const b = top & 0xff;
    expect(b).toBeGreaterThan((top >> 16) & 0xff);
    const luma = (c: number) =>
      0.299 * ((c >> 16) & 0xff) + 0.587 * ((c >> 8) & 0xff) + 0.114 * (c & 0xff);
    for (const [name, colors] of Object.entries(TERRAIN_COLORS)) {
      if (name === 'water') continue;
      expect(luma(TERRAIN_COLORS.water.top), `su ${name}'dan acik`).toBeLessThan(luma(colors.top));
    }
  });

  /**
   * PLACEHOLDER ZEMIN PNG'LERI GERI GELMEMELI.
   *
   * Sprint 18'de boru hattini gostermek icin dort duz karo islenmisti.
   * Bunlar prosedurel zemini TAMAMEN golgeliyordu: palet duzeltmesi
   * ekrana hic ulasmadi ve sorun ancak doku pikseli okunarak bulundu
   * (olculdu: doku rgb(134,162,87) - yani eski renk - yeni kod calisirken).
   *
   * Hat calismaya devam ediyor; yalnizca DEPODA hazir dosya durmuyor.
   */
  it('depoda prosedurel zemini golgeleyen placeholder karo yok', () => {
    expect(terrainAssets()).toEqual([]);
  });
});
