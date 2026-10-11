/** Presentation geometry traced against the approved city painting.
 * Saved engine IDs/geometry are untouched. A clearing is partitioned by its
 * actual edges, not by adding two arbitrary offsets to an approximate centre.
 */
export const PAINTED_CITY_SIZE = { width: 1469, height: 1070 } as const
export type GroundPoint = { x: number; y: number }
export type PaintedPlot = {
  index: number; x: number; y: number; width: number; height: number
  outline: GroundPoint[]; gate: GroundPoint
}
export const PAINTED_CLEARINGS = [
  [[773, 380], [834, 365], [901, 393], [828, 429]],
  [[507, 408], [574, 386], [632, 413], [564, 445]],
  [[928, 287], [993, 261], [1061, 294], [993, 326]],
  [[345, 208], [410, 188], [458, 217], [397, 245]],
  [[163, 342], [226, 321], [290, 350], [226, 384]],
  [[1157, 279], [1199, 265], [1259, 292], [1212, 314]],
  [[246, 410], [310, 389], [377, 419], [309, 454]],
  [[506, 155], [551, 137], [596, 160], [548, 181]],
  [[1059, 130], [1105, 114], [1148, 137], [1104, 159]],
  [[1172, 173], [1222, 152], [1272, 180], [1224, 201]],
  [[910, 114], [954, 96], [987, 111], [949, 135]],
  [[1122, 509], [1196, 546], [1249, 525], [1174, 489]],
  [[274, 290], [328, 272], [391, 301], [330, 328]],
  [[513, 302], [560, 284], [606, 310], [555, 331]],
  [[1018, 207], [1065, 188], [1128, 218], [1078, 242]],
  [[859, 453], [932, 426], [1007, 458], [929, 492]],
  [[353, 510], [426, 485], [500, 519], [427, 548]],
] as const
/** Small clearings host one plot. Only seven broad clearings are split. */
export const PAINTED_CLEARING_CAPACITY = [2, 2, 2, 2, 2, 1, 2, 1, 1, 1, 1, 2, 1, 1, 1, 1, 1] as const
const mid = (a: GroundPoint, b: GroundPoint): GroundPoint => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 })
function parcel(index: number, outline: GroundPoint[]): PaintedPlot {
  const x = outline.reduce((sum, p) => sum + p.x, 0) / outline.length
  const y = outline.reduce((sum, p) => sum + p.y, 0) / outline.length
  const width = Math.max(...outline.map(p => p.x)) - Math.min(...outline.map(p => p.x))
  const height = Math.max(...outline.map(p => p.y)) - Math.min(...outline.map(p => p.y))
  const gate = outline.map((p, i) => mid(p, outline[(i + 1) % outline.length])).sort((a, b) => b.y - a.y)[0]
  return { index, x, y, width, height, outline, gate }
}
function fixed(index: number, x: number, y: number, width: number, height: number) {
  return parcel(index, [{ x: x - width / 2, y: y - height / 2 }, { x: x + width / 2, y: y - height / 2 }, { x: x + width / 2, y: y + height / 2 }, { x: x - width / 2, y: y + height / 2 }])
}
export const PAINTED_PLOTS: PaintedPlot[] = [
  fixed(0, 730, 249, 214, 152),
  ...PAINTED_CLEARINGS.flatMap((corners, pair) => {
    const [a, b, c, d] = corners.map(([x, y]) => ({ x, y }))
    const index = 1 + PAINTED_CLEARING_CAPACITY.slice(0, pair).reduce<number>((sum, n) => sum + n, 0)
    if (PAINTED_CLEARING_CAPACITY[pair] === 1) return [parcel(index, [a, b, c, d])]
    const rear = mid(a, b), front = mid(d, c)
    return [parcel(index, [a, rear, front, d]), parcel(index + 1, [rear, b, c, front])]
  }),
  fixed(25, 472, 589, 134, 78),
  fixed(26, 950, 583, 134, 78),
  fixed(27, 720, 544, 130, 76),
  fixed(28, 353, 816, 154, 84),
]
export const paintedPlot = (index: number | null | undefined) => PAINTED_PLOTS.find(p => p.index === index)
export function groundArea(points: readonly GroundPoint[]) {
  return Math.abs(points.reduce((sum, p, i) => {
    const q = points[(i + 1) % points.length]
    return sum + p.x * q.y - q.x * p.y
  }, 0)) / 2
}
