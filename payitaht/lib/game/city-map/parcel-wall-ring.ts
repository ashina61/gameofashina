import { CITY_ROADS, PARCEL_PLOTS, type ParcelPoint } from './parcel-city'

export type WallGate = {
  name: string
  center: ParcelPoint
  left: ParcelPoint
  right: ParcelPoint
  edge: number
  t: number
  halfWidth: number
}
export type WallSpan = { start: ParcelPoint; end: ParcelPoint }
export type WallPlan = {
  ring: ParcelPoint[]
  gates: WallGate[]
  spans: WallSpan[]
  towers: ParcelPoint[]
  perimeter: number
}

const distance = (a: ParcelPoint, b: ParcelPoint) => Math.hypot(a.x - b.x, a.y - b.y)
const lerp = (a: ParcelPoint, b: ParcelPoint, t: number): ParcelPoint => ({
  x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t,
})
const cross = (o: ParcelPoint, a: ParcelPoint, b: ParcelPoint) =>
  (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x)

export function wallHull(points: readonly ParcelPoint[]): ParcelPoint[] {
  const sorted = [...points].sort((a, b) => a.x - b.x || a.y - b.y)
  const side = (items: ParcelPoint[]) => {
    const out: ParcelPoint[] = []
    for (const point of items) {
      while (out.length >= 2 && cross(out[out.length - 2], out[out.length - 1], point) <= 0) out.pop()
      out.push(point)
    }
    return out.slice(0, -1)
  }
  return [...side(sorted), ...side([...sorted].reverse())]
}

export function wallDistanceToSegment(point: ParcelPoint, a: ParcelPoint, b: ParcelPoint) {
  const dx = b.x - a.x, dy = b.y - a.y
  const t = Math.max(0, Math.min(1, ((point.x - a.x) * dx + (point.y - a.y) * dy) / (dx * dx + dy * dy || 1)))
  const nearest = lerp(a, b, t)
  return { distance: distance(point, nearest), t, nearest }
}

/** The wall follows the outermost painted parcel limits, not engine grid slots.
 * The city centre and all plot identities remain untouched.
 * A gap is cut into every entrance before the wall spans are returned.
 */
export function createCityWallPlan(
  footprints: readonly (readonly ParcelPoint[])[],
  entrances: readonly { name: string; road: ParcelPoint }[],
  padding = 120,
): WallPlan {
  const all = footprints.flatMap(p => [...p])
  const centre = {
    x: all.reduce((total, p) => total + p.x, 0) / all.length,
    y: all.reduce((total, p) => total + p.y, 0) / all.length,
  }
  const ring = wallHull(all).map(p => {
    const length = distance(centre, p) || 1
    return { x: p.x + (p.x - centre.x) * padding / length, y: p.y + (p.y - centre.y) * padding / length }
  })
  const edges = ring.map((start, i) => ({ start, end: ring[(i + 1) % ring.length] }))
  const perimeter = edges.reduce((sum, e) => sum + distance(e.start, e.end), 0)
  const gates: WallGate[] = entrances.map(({ name, road }) => {
    const projections = edges.map((e, edge) => ({ ...wallDistanceToSegment(road, e.start, e.end), edge }))
    const nearest = projections.reduce((best, item) => item.distance < best.distance ? item : best)
    const { start, end } = edges[nearest.edge]
    const halfWidth = 54
    const length = distance(start, end)
    return {
      name, edge: nearest.edge, t: nearest.t, center: nearest.nearest, halfWidth,
      left: lerp(start, end, Math.max(0, nearest.t - halfWidth / length)),
      right: lerp(start, end, Math.min(1, nearest.t + halfWidth / length)),
    }
  })
  const spans: WallSpan[] = []
  for (const [index, edge] of edges.entries()) {
    const length = distance(edge.start, edge.end)
    const gaps = gates.filter(g => g.edge === index)
      .map(g => [Math.max(0, g.t - g.halfWidth / length), Math.min(1, g.t + g.halfWidth / length)] as const)
      .sort((a, b) => a[0] - b[0])
    let cursor = 0
    for (const [from, to] of gaps) {
      if (from - cursor > .001) spans.push({ start: lerp(edge.start, edge.end, cursor), end: lerp(edge.start, edge.end, from) })
      cursor = Math.max(cursor, to)
    }
    if (1 - cursor > .001) spans.push({ start: lerp(edge.start, edge.end, cursor), end: edge.end })
  }
  // Towers at corners and at regular intervals on the long straight fronts.
  // Gate flanks are drawn separately, so avoid overlapping those towers.
  const candidates = edges.flatMap(({ start, end }) => {
    const length = distance(start, end)
    return [start, ...Array.from({ length: Math.max(0, Math.floor(length / 280) - 1) }, (_, i) =>
      lerp(start, end, (i + 1) * 280 / length))]
  })
  const towers: ParcelPoint[] = []
  for (const point of candidates) {
    if (gates.some(g => distance(point, g.left) < 95 || distance(point, g.right) < 95)) continue
    if (towers.some(other => distance(point, other) < 150)) continue
    towers.push(point)
  }
  return { ring, gates, spans, towers, perimeter }
}

// The first road actually crosses the northern rim at its second survey point.
// Others are the western approach, northern hill road and two harbour roads.
export const CITY_WALL_PLAN = createCityWallPlan(
  PARCEL_PLOTS.slice(0, 25).map(p => p.polygon),
  [
    { name: 'kuzey', road: CITY_ROADS[0][1] },
    { name: 'dogu-kuzey', road: CITY_ROADS[1][CITY_ROADS[1].length - 1] },
    { name: 'bati', road: CITY_ROADS[3][0] },
    { name: 'liman-bati', road: CITY_ROADS[1][0] },
    { name: 'liman-dogu', road: CITY_ROADS[2][0] },
  ],
)
