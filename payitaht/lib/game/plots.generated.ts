/** Art-directed coordinates on sahilhisar-coast.png. IDs stay stable for saved cities.
 * Do not run measure-plots over this plan; terrain never defines game geometry.
 */
import type { Zone } from './layout'
export const MEASURED_TILE_W = 11
const city: [number, number][] = [
  [50, 46], [35, 38], [65, 38], [35, 54], [65, 54],
  [50, 30], [20, 46], [80, 46], [50, 62],
  [20, 30], [80, 30], [20, 62], [80, 62],
  [35, 22], [65, 22], [35, 70], [65, 70],
  [20, 22], [80, 22], [20, 70], [80, 70], [50, 18], [50, 70],
]
export const MEASURED: { x: number; y: number; zone: Zone }[] = [
  ...city.map(([x, y]) => ({ x, y, zone: 'sehir' as const })),
  { x: 35, y: 79, zone: 'liman' }, { x: 65, y: 79, zone: 'liman' },
]
