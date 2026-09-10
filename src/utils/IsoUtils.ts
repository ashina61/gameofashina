import { TILE_HEIGHT, TILE_WIDTH } from '@/config/Constants';
import type { GridPoint, WorldPoint } from '@/types';

/**
 * Izometrik (2:1 diamond) koordinat donusumleri.
 * Dunya orijini (0,0) izgaranin (0,0) hucresinin ust kosesidir.
 */

const HALF_W = TILE_WIDTH / 2;
const HALF_H = TILE_HEIGHT / 2;

/** Izgara koordinatini karo merkezinin dunya koordinatina cevirir. */
export function gridToWorld(gx: number, gy: number): WorldPoint {
  return {
    x: (gx - gy) * HALF_W,
    y: (gx + gy) * HALF_H,
  };
}

/**
 * Dunya koordinatini izgara koordinatina cevirir.
 * Sonuc yuvarlanir; ekrandaki dokunusu hucreye eslemek icin kullanilir.
 */
export function worldToGrid(x: number, y: number): GridPoint {
  const gx = (x / HALF_W + y / HALF_H) / 2;
  const gy = (y / HALF_H - x / HALF_W) / 2;
  return { gx: Math.floor(gx), gy: Math.floor(gy) };
}

/**
 * Cizim sirasi icin derinlik degeri.
 * Arkadaki karolar once cizilir; buyuk binalarda kaplama alaninin en on
 * kosesi baz alinir.
 */
export function depthFor(gx: number, gy: number, size = 1): number {
  return (gx + gy + (size - 1) * 2) * 10;
}

/** Tum izgaranin dunya koordinatindaki sinir dikdortgeni. */
export function gridBounds(size: number): { x: number; y: number; width: number; height: number } {
  const width = size * TILE_WIDTH;
  const height = size * TILE_HEIGHT;
  return { x: -width / 2, y: 0, width, height };
}
