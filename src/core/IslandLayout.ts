import { ISLAND_GRID_SIZE, ISLAND_PLOT_COUNT } from '@/config/Constants';
import { rng } from '@/utils/Rng';
import type { GridPoint } from '@/types';

/**
 * Ada yerlesimi.
 *
 * Ikariam'in ada gorunumu uc seyden olusur: KARAnin sekli, kiyiya dizilmis
 * 16 SEHIR ALANI ve adanin icindeki uc OZEL NOKTA (Hizar, luks kaynak
 * yatagi, tanri tapinagi/harika).
 *
 * Tamami TOHUMDAN turetilir ve kayda YAZILMAZ: ayni tohum ayni adayi verir.
 * Boylece kayit kucuk kalir ve ada sekli kayit surumlerinden etkilenmez.
 */

/** Ada karo turu. */
export type IslandTile = 'water' | 'sand' | 'grass' | 'rock' | 'plot' | 'deposit';

/** Bir adanin cizim verisi. */
export interface IslandLayout {
  size: number;
  /** Her karonun turu; satir oncelikli duz dizi (size*size). */
  tiles: IslandTile[];
  /** 16 sehr alani; index 0..15. */
  plots: GridPoint[];
  /** Hizarin yeri. */
  woodDeposit: GridPoint;
  /** Luks kaynak yataginin yeri. */
  luxuryDeposit: GridPoint;
  /** Tapinak/harikanin yeri. */
  wonder: GridPoint;
  /** Karanin agirlik merkezi (kamera buraya ortalar). */
  center: GridPoint;
}

/**
 * Ada kiyisina dizilecek 16 alanin ACILARI.
 *
 * Ikariam'da sehr alanlari adanin etrafinda halka biçiminde durur. Esit
 * acilarla yerlestirmek, alanlarin birbirine girmesini ve kiyidan tasmasini
 * engeller. Index 0 oyuncunun baslangic sehrine ayrilir.
 */
function plotAngles(): number[] {
  const angles: number[] = [];
  for (let i = 0; i < ISLAND_PLOT_COUNT; i += 1) {
    // -90 derece kaydirma: ilk alan adanin UST tarafinda olsun, boylece
    // oyuncunun sehri ekranda ilk gorunen yerde durur.
    angles.push((i / ISLAND_PLOT_COUNT) * Math.PI * 2 - Math.PI / 2);
  }
  return angles;
}

/**
 * Adanin kara seklini uretir.
 *
 * Basit bir radyal gurultu kullanilir: merkezden uzaklastikca kara olma
 * olasiligi duser ve sinira sinuzoidal bir dalga eklenir. Boylece ada
 * yuvarlak ama duzenli gorunmeyen, Ikariam adalarina benzer bir sekil alir.
 */
export function generateIslandLayout(seed: number, luxuryTintSeed = 0): IslandLayout {
  const size = ISLAND_GRID_SIZE;
  const random = rng(seed ^ (luxuryTintSeed * 2654435761));
  const tiles: IslandTile[] = new Array<IslandTile>(size * size).fill('water');
  const center = { gx: Math.floor(size / 2), gy: Math.floor(size / 2) };

  // Ada yaricapi: karo cinsinden. 16 alani kiyiya sigdirmak icin ~7 gerekli.
  const baseRadius = size * 0.36;
  // Dalga: her yonde farkli genlik, boylece ada duzgun daire olmaz.
  const wavePhase = random.next() * Math.PI * 2;
  const waveA = 0.10 + random.next() * 0.10;
  const waveB = 0.05 + random.next() * 0.08;

  const radiusAt = (angle: number): number =>
    baseRadius *
    (1 + waveA * Math.sin(angle * 3 + wavePhase) + waveB * Math.cos(angle * 5 - wavePhase));

  const dx0 = Math.cos(wavePhase) * 0.6;
  const dy0 = Math.sin(wavePhase) * 0.6;

  for (let gy = 0; gy < size; gy += 1) {
    for (let gx = 0; gx < size; gx += 1) {
      const dx = gx - center.gx - dx0;
      const dy = gy - center.gy - dy0;
      const distance = Math.sqrt(dx * dx + dy * dy);
      const angle = Math.atan2(dy, dx);
      const radius = radiusAt(angle);

      if (distance > radius + 0.8) continue;

      let tile: IslandTile;
      if (distance > radius - 0.7) tile = 'sand';
      else if (distance > radius * 0.55 && random.chance(0.08)) tile = 'rock';
      else tile = 'grass';
      tiles[gy * size + gx] = tile;
    }
  }

  // --- Sehr alanlari: kiyi halkasina dizilir -------------------------------
  const plots: GridPoint[] = plotAngles().map((angle) => {
    const radius = radiusAt(angle) - 1.1;
    const gx = Math.round(center.gx + dx0 + Math.cos(angle) * radius);
    const gy = Math.round(center.gy + dy0 + Math.sin(angle) * radius);
    return {
      gx: Math.max(1, Math.min(size - 2, gx)),
      gy: Math.max(1, Math.min(size - 2, gy)),
    };
  });

  // Alanlarin uzerine oturacagi karolari duz kara yap; kiyida kalan alan
  // suyun icinde gorunmesin.
  for (const plot of plots) {
    for (let oy = -1; oy <= 1; oy += 1) {
      for (let ox = -1; ox <= 1; ox += 1) {
        const gx = plot.gx + ox;
        const gy = plot.gy + oy;
        if (gx < 0 || gy < 0 || gx >= size || gy >= size) continue;
        const index = gy * size + gx;
        if (tiles[index] !== 'water') tiles[index] = 'plot';
      }
    }
    tiles[plot.gy * size + plot.gx] = 'plot';
  }

  // --- Ozel noktalar: adanin ic halkasinda, alanlara degmeden --------------
  const taken = new Set(plots.map((p) => `${p.gx},${p.gy}`));
  const innerSpots: GridPoint[] = [];
  for (let gy = 1; gy < size - 1; gy += 1) {
    for (let gx = 1; gx < size - 1; gx += 1) {
      const index = gy * size + gx;
      if (tiles[index] !== 'grass') continue;
      const dx = gx - center.gx;
      const dy = gy - center.gy;
      const distance = Math.sqrt(dx * dx + dy * dy);
      if (distance < 1.8 || distance > baseRadius - 2.2) continue;
      // Alan komsuluguna yerlesmesin.
      let nearPlot = false;
      for (let oy = -2; oy <= 2 && !nearPlot; oy += 1) {
        for (let ox = -2; ox <= 2; ox += 1) {
          if (taken.has(`${gx + ox},${gy + oy}`)) {
            nearPlot = true;
            break;
          }
        }
      }
      if (nearPlot) continue;
      innerSpots.push({ gx, gy });
    }
  }

  const spots = random.shuffle(innerSpots);
  const woodDeposit = spots[0] ?? { gx: center.gx - 2, gy: center.gy - 1 };
  const luxuryDeposit = spots[1] ?? { gx: center.gx + 2, gy: center.gy - 1 };
  const wonder = spots[2] ?? { gx: center.gx, gy: center.gy + 2 };

  for (const spot of [woodDeposit, luxuryDeposit, wonder]) {
    tiles[spot.gy * size + spot.gx] = 'deposit';
    taken.add(`${spot.gx},${spot.gy}`);
  }

  return { size, tiles, plots, woodDeposit, luxuryDeposit, wonder, center };
}

/** Bir karonun turunu okur; izgara disinda 'water' doner. */
export function tileAt(layout: IslandLayout, gx: number, gy: number): IslandTile {
  if (gx < 0 || gy < 0 || gx >= layout.size || gy >= layout.size) return 'water';
  return layout.tiles[gy * layout.size + gx] ?? 'water';
}

/** Karada mi? */
export function isLand(layout: IslandLayout, gx: number, gy: number): boolean {
  const tile = tileAt(layout, gx, gy);
  return tile !== 'water';
}

/** Adanin dunya koordinatindaki sinir dikdortgeni. */
export function islandBounds(layout: IslandLayout): {
  x: number;
  y: number;
  width: number;
  height: number;
} {
  return { x: 0, y: 0, width: layout.size, height: layout.size };
}
