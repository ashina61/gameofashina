/** Courtyard anchors measured from sahilhisar-town-v2.webp (percentage of image).
 * Roads, terraces and gardens are painted into the environment. Buildings remain
 * separate interactive sprites. Never place a plot on a street to fill a grid.
 * fillMissing() relocates former out-of-range plots to a free matching zone.
 */
import type { Zone } from './layout'
export const MEASURED_TILE_W = 11
const city: [number, number][] = [
  [50, 41], // Municipal plaza
  [21, 27], [64, 20], [58, 27], [29, 47],
  [72, 36], [35, 35], [70, 47], [50, 56],
  [30, 17], [42, 21], [73, 13], [79, 27],
  [18, 39], [24, 57], [72, 60],
]
export const MEASURED: { x: number; y: number; zone: Zone }[] = [
  ...city.map(([x, y]) => ({ x, y, zone: 'sehir' as const })),
  { x: 33, y: 79, zone: 'liman' }, { x: 66, y: 79, zone: 'liman' },
]
