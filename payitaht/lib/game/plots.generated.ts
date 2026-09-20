/** Anchors measured from the shared empty / fortified coastal ground.
 * Index 0 is the permanent municipal plaza. Coastal sites are dry sand
 * until construction completes; docks belong to the building sprites.
 */
import type { Zone } from './layout'
export const MEASURED_TILE_W = 12
const city: [number, number][] = [
  [50, 36], // Permanent municipal plaza
  [33, 31], [64, 31], [34, 47], [66, 47],
  [18, 43], [82, 43], [18, 28], [84, 29],
  [20, 17], [38, 16], [62, 16], [80, 18], [50, 53],
]
export const MEASURED: { x: number; y: number; zone: Zone }[] = [
  ...city.map(([x, y]) => ({ x, y, zone: 'sehir' as const })),
  { x: 30, y: 67, zone: 'liman' }, { x: 74, y: 66, zone: 'liman' },
]
