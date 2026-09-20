/** Ground coordinates in percent of the v4 coastal illustration.
 * Stable indexes preserve saves; the municipality remains at index 0.
 */
import type { Zone } from './layout'
export const MEASURED_TILE_W = 12
const city: [number, number][] = [
  [50, 36], [33.1, 30.4], [66.7, 30.3], [33.9, 46.7], [66, 46],
  [16.5, 44], [84.3, 44], [17.1, 28], [85.6, 29.3],
  [20.6, 16.1], [38.3, 15.2], [62.6, 15.5], [80.9, 17.9], [50, 51.2],
]
export const MEASURED: { x: number; y: number; zone: Zone }[] = [
  ...city.map(([x, y]) => ({ x, y, zone: 'sehir' as const })),
  { x: 30, y: 67, zone: 'liman' }, { x: 74, y: 66, zone: 'liman' },
]
/** Interior paving boundaries, excluding steps, roads and planted borders. */
export const COURTYARDS: [number, number][][] = [
  [[45,32],[55,32],[56,39.5],[44,39.5]],
  [[29.5,26.5],[39.3,26.8],[38,34.5],[27.8,33.7]],
  [[62,25],[72.8,29],[72.4,33.7],[62,35]],
  [[28.5,41.5],[39.9,43],[38.2,51],[27,49.5]],
  [[59.5,43],[70.3,41.8],[72.3,48],[62,51]],
  [[13.5,38.7],[22.2,40.3],[19,48.4],[10.3,46.4]],
  [[78.9,41],[87.6,39.2],[90,44.4],[81.6,49.2]],
  [[12.8,23.5],[22.9,24.8],[20.8,31.8],[10.5,30]],
  [[79.8,26.2],[89.8,24.7],[92,32.3],[80.6,33]],
  [[17.8,12.1],[26.1,12.1],[24.8,19.8],[13.8,19.2]],
  [[31.7,12.4],[43.1,12.2],[44.3,19],[31.2,18.5]],
  [[55.9,11.8],[68.2,11.6],[68.9,18.6],[56,19]],
  [[73.7,14.5],[81.6,13.3],[87,20.4],[76,22]],
  [[45.6,47.5],[54.5,47.5],[55.5,55.2],[44.8,55.2]],
]
/** Conservative rectangular ground envelopes inside the paving. */
export const PLOT_FOOTPRINTS: [number, number][] = [
  [10,6.5], [9,6], [9,6], [10.5,7], [10,6.5], [8.5,6], [8.5,6],
  [9,6], [9,6], [10,6], [11,6], [11,6.5], [9,6], [9,7],
]
