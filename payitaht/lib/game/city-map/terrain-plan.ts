/**
 * Payitaht terrain prototype: deterministic, artwork-free routing geometry.
 *
 * The existing .tmj/city-slots.json and all slot coordinates are READ ONLY.
 * Old roadGraph edges join slot CENTRES and are topology, NOT traversable road
 * artwork. Routes below terminate OUTSIDE each 2x2 footprint and avoid all
 * footprints (including coast/defense) in tile-space.
 */
import { CITY_MAP, CITY_SLOTS, COAST_SLOTS, DEFENSE_SLOTS, ROAD_GRAPH, TILE, type CitySlot, type ScreenPoint } from './index'

export type TerrainRoute = {
  from: string
  to: string
  points: ScreenPoint[]
  cells: { gx: number; gy: number }[]
}
export type TerrainPlan = {
  routes: TerrainRoute[]
  failures: string[]
  /** Projected screen Y; sea begins below this band. */
  shoreY: number
  /** Tile dimensions remain those of the canonical Tiled map. */
  tileCount: { w: number; h: number }
}

const allSlots = [...CITY_SLOTS, ...COAST_SLOTS, ...DEFENSE_SLOTS]
const byId = new Map(allSlots.map(s => [s.id, s]))
const screen = (gx: number, gy: number): ScreenPoint => ({
  x: (gx - gy) * TILE.w / 2,
  y: (gx + gy) * TILE.h / 2,
})
const key = (gx: number, gy: number) => gy * CITY_MAP.map.w + gx
const XY = (k: number) => ({ gx: k % CITY_MAP.map.w, gy: Math.floor(k / CITY_MAP.map.w) })
const directions: ReadonlyArray<readonly [number, number]> = [
  [1, 0], [-1, 0], [0, 1], [0, -1],
]

/** The slot is the CLOSED region |gx-s.gx|<=fw/2 && |gy-s.gy|<=fh/2. */
export function isInsideFootprint(gx: number, gy: number, s: CitySlot, margin = 0): boolean {
  return Math.abs(gx - s.gx) <= s.fw / 2 + margin &&
    Math.abs(gy - s.gy) <= s.fh / 2 + margin
}

function passable(gx: number, gy: number): boolean {
  if (gx < 0 || gy < 0 || gx >= CITY_MAP.map.w || gy >= CITY_MAP.map.h) return false
  // Keep the road CENTRELINE at least half a tile off foundations.
  return !allSlots.some(s => isInsideFootprint(gx, gy, s, 0.15))
}

function accessCandidates(slot: CitySlot, target: ScreenPoint) {
  const result: { gx: number; gy: number; score: number }[] = []
  for (const [dx, dy] of [[2, 0], [-2, 0], [0, 2], [0, -2]] as const) {
    const gx = slot.gx + dx, gy = slot.gy + dy
    if (!passable(gx, gy)) continue
    const p = screen(gx, gy)
    result.push({ gx, gy, score: Math.hypot(p.x - target.x, p.y - target.y) })
  }
  return result.sort((a, b) => a.score - b.score)
}

function routeCells(start: { gx: number; gy: number }, goal: { gx: number; gy: number },
  ctrl: ScreenPoint): { gx: number; gy: number }[] | null {
  const W = CITY_MAP.map.w, H = CITY_MAP.map.h, size = W * H
  const startKey = key(start.gx, start.gy), goalKey = key(goal.gx, goal.gy)
  const distance = new Float64Array(size).fill(Infinity)
  const previous = new Int32Array(size).fill(-1)
  const used = new Uint8Array(size)
  // Min-heap, duplicate entries are discarded when popped.
  const heap: [number, number][] = []
  const push = (priority: number, id: number) => {
    let i = heap.length
    heap.push([priority, id])
    while (i > 0) {
      const p = (i - 1) >> 1
      if (heap[p][0] <= priority) break
      heap[i] = heap[p]
      i = p
    }
    heap[i] = [priority, id]
  }
  const pop = (): [number, number] | undefined => {
    if (!heap.length) return undefined
    const out = heap[0], tail = heap.pop()!
    if (heap.length) {
      let i = 0
      while (i * 2 + 1 < heap.length) {
        let child = i * 2 + 1
        if (child + 1 < heap.length && heap[child + 1][0] < heap[child][0]) child++
        if (heap[child][0] >= tail[0]) break
        heap[i] = heap[child]
        i = child
      }
      heap[i] = tail
    }
    return out
  }
  const heuristic = (x: number, y: number) => Math.abs(x - goal.gx) + Math.abs(y - goal.gy)
  distance[startKey] = 0
  push(heuristic(start.gx, start.gy), startKey)
  while (heap.length) {
    const next = pop()!
    const id = next[1]
    if (used[id]) continue
    used[id] = 1
    if (id === goalKey) {
      const out: { gx: number; gy: number }[] = []
      let cur = id
      while (cur !== -1) { out.push(XY(cur)); cur = previous[cur] }
      return out.reverse()
    }
    const p = XY(id)
    for (const [dx, dy] of directions) {
      const gx = p.gx + dx, gy = p.gy + dy
      if (!passable(gx, gy)) continue
      const id2 = key(gx, gy)
      if (used[id2]) continue
      const pos = screen(gx, gy)
      const bend = Math.hypot(pos.x - ctrl.x, pos.y - ctrl.y) / 4000
      const tentative = distance[id] + 1 + bend
      if (tentative >= distance[id2]) continue
      distance[id2] = tentative
      previous[id2] = id
      push(tentative + heuristic(gx, gy), id2)
    }
  }
  return null
}

/**
 * One road endpoint is the padded EXTERIOR of a slot, never its centre.
 * Route cells use tile centres and stay clear of the locked building base.
 */
function exterior(s: CitySlot, cell: { gx: number; gy: number }): ScreenPoint {
  const gx = s.gx + (cell.gx - s.gx) * 0.63
  const gy = s.gy + (cell.gy - s.gy) * 0.63
  return screen(gx, gy)
}

export function buildTerrainPlan(): TerrainPlan {
  const routes: TerrainRoute[] = []
  const failures: string[] = []
  for (const e of ROAD_GRAPH.edges) {
    const a = byId.get(e.from), b = byId.get(e.to)
    if (!a || !b) { failures.push('Missing graph slot: ' + e.from + ' -> ' + e.to); continue }
    const starts = accessCandidates(a, b.screen)
    const ends = accessCandidates(b, a.screen)
    let cells: { gx: number; gy: number }[] | null = null
    let start = starts[0], end = ends[0]
    // Candidate routing, never move a locked slot to make a path fit.
    for (const sa of starts) {
      for (const eb of ends) {
        cells = routeCells(sa, eb, e.ctrl)
        if (cells) { start = sa; end = eb; break }
      }
      if (cells) break
    }
    if (!cells || !start || !end) {
      failures.push('No unobstructed road: ' + e.from + ' -> ' + e.to)
      continue
    }
    routes.push({
      from: e.from, to: e.to, cells,
      points: [exterior(a, start), ...cells.map(c => screen(c.gx, c.gy)), exterior(b, end)],
    })
  }
  const sorted = COAST_SLOTS.map(s => s.screen.y).sort((a, b) => a - b)
  return {
    routes, failures,
    shoreY: (sorted[Math.floor(sorted.length / 2) - 1] + sorted[Math.floor(sorted.length / 2)]) / 2 + TILE.h * 1.8,
    tileCount: { w: CITY_MAP.map.w, h: CITY_MAP.map.h },
  }
}

/** Testable centre-line exclusion check. */
export function roadCrossings(plan: TerrainPlan): string[] {
  const fails: string[] = []
  for (const r of plan.routes) for (const cell of r.cells) {
    if (!passable(cell.gx, cell.gy)) fails.push(r.from + ' -> ' + r.to + ': ' + cell.gx + ',' + cell.gy)
  }
  return fails
}
