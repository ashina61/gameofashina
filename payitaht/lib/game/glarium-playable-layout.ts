/** Presentation coordinates in the approved 1469 × 1070 painting.
 * Engine plot IDs and the original city-map geometry remain unchanged.
 * Each broad clearing accommodates two small, independent 2×2 game plots.
 */
export const PAINTED_CITY_SIZE = { width: 1469, height: 1070 } as const
const clearings = [
  [800, 397], [560, 405], [990, 289], [396, 218],
  [285, 347], [1187, 282], [342, 438], [544, 155],
  [1110, 139], [1231, 199], [936, 103], [1212, 505],
] as const
export const PAINTED_PLOTS = [
  { index: 0, x: 730, y: 249, width: 214, height: 152 },
  ...clearings.flatMap(([x, y], pair) => [
    { index: pair * 2 + 1, x: x - 32, y: y - 9, width: 60, height: 36 },
    { index: pair * 2 + 2, x: x + 32, y: y + 9, width: 60, height: 36 },
  ]),
  { index: 25, x: 472, y: 589, width: 134, height: 78 },
  { index: 26, x: 950, y: 583, width: 134, height: 78 },
  { index: 27, x: 720, y: 544, width: 130, height: 76 },
  { index: 28, x: 353, y: 816, width: 154, height: 84 },
] as const
export const paintedPlot = (index: number | null | undefined) => PAINTED_PLOTS.find(p => p.index === index)
