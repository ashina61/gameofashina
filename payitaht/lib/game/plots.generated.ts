/**
 * ÖLÇÜLMÜŞ ARSALAR - elle yazilmaz, uretilir.
 *
 *   node scripts/measure-plots.mjs <resim> lib/game/plots.generated.ts
 *
 * Kaynak: public/images/game/island.png (1024x1024)
 * Bulunan: 7 arsa
 */
import type { Zone } from './layout'

/** Olculen arsa genisliginden turetilen bina genisligi (resim yuzdesi). */
export const MEASURED_TILE_W = 13.3

export const MEASURED: { x: number; y: number; zone: Zone }[] = [
  { x: 48.7, y: 33.2, zone: 'sehir' },
  { x: 38.4, y: 37.7, zone: 'sehir' },
  { x: 28.8, y: 45, zone: 'sehir' },
  { x: 71.3, y: 45.2, zone: 'sehir' },
  { x: 61.6, y: 50.4, zone: 'sehir' },
  { x: 39.6, y: 52.5, zone: 'sehir' },
  { x: 52.9, y: 56.6, zone: 'sehir' },
]
