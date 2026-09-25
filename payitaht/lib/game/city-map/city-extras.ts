/**
 * ŞEHİR DOKUSU YERLEŞİMİ (Phaser'sız, test edilebilir): sur içindeki bağ,
 * bahçe, bostan ve meraların yerleri ile çeşmelerin konumları.
 */
import { COAST_SLOTS, DEFENSE_FOUNDATION, PLAZA, RING_ROAD, ROAD_GRAPH, SLOTS, TILE, WALL_GATES, type ScreenPoint } from './index'
import { FOOTPRINT_DIAMOND_W } from './building-assets'

/*
 * ŞEHİR İÇİ TARLALAR: sur içinde arsalardan, yollardan ve meydandan arta
 * kalan boş alanlara bağ, meyve bahçesi, bostan ve koyun merası serpilir.
 * Deterministiktir; hem arazi çizimi hem canlı sahne (koyunlar) kullanır.
 */
export type FieldKind = 'bag' | 'meyve' | 'bostan' | 'mera'
export type CityField = { x: number; y: number; hw: number; hh: number; kind: FieldKind }
let fieldsCache: CityField[] | null = null
export function cityFields(): CityField[] {
  if (fieldsCache) return fieldsCache
  const wall = DEFENSE_FOUNDATION.map(p => p.screen)
  const inWall = (x: number, y: number) => {
    let inside = false
    for (let i = 0, j = wall.length - 1; i < wall.length; j = i++) {
      const a = wall[i], b = wall[j]
      if ((a.y > y) !== (b.y > y) && x < (b.x - a.x) * (y - a.y) / (b.y - a.y) + a.x) inside = !inside
    }
    return inside
  }
  const nodeAt = new Map(ROAD_GRAPH.nodes.map(n => [n.id, n.screen]))
  const roadPts: ScreenPoint[] = []
  for (const e of ROAD_GRAPH.edges) {
    const A = nodeAt.get(e.from), B = nodeAt.get(e.to)
    if (!A || !B) continue
    for (let k = 0; k <= 30; k++) {
      const t = k / 30, u = 1 - t
      roadPts.push({ x: u * u * A.x + 2 * u * t * e.ctrl.x + t * t * B.x, y: u * u * A.y + 2 * u * t * e.ctrl.y + t * t * B.y })
    }
  }
  const P = PLAZA.screen
  const coastTop = Math.min(...COAST_SLOTS.map(s => s.screen.y)) - TILE.h * 5
  const yardHW = FOOTPRINT_DIAMOND_W * 1.1, yardHH = yardHW / 2
  const hw = TILE.w * 1.45, hh = hw / 2
  const xs = wall.map(p => p.x), ys = wall.map(p => p.y)
  const cands: Array<{ x: number; y: number; d: number }> = []
  for (let y = Math.min(...ys); y < Math.max(...ys); y += 40) {
    for (let x = Math.min(...xs); x < Math.max(...xs); x += 60) {
      if (y + hh > coastTop) continue
      if (![[x - hw, y], [x + hw, y], [x, y - hh], [x, y + hh]].every(([cx, cy]) => inWall(cx, cy))) continue
      if (Math.hypot((x - P.x) / RING_ROAD.rx, (y - P.y) / RING_ROAD.ry) < 1.12) continue
      if (SLOTS.some(s => Math.abs(s.screen.x - x) / (hw + yardHW) + Math.abs(s.screen.y - y) / (hh + yardHH) < 1)) continue
      if (roadPts.some(p => Math.abs(p.x - x) / (hw + 46) + Math.abs(p.y - y) / (hh + 23) < 1)) continue
      if (wall.some(p => Math.abs(p.x - x) / (hw + 70) + Math.abs(p.y - y) / (hh + 35) < 1)) continue
      cands.push({ x, y, d: Math.hypot((x - P.x) / RING_ROAD.rx, (y - P.y) / RING_ROAD.ry) })
    }
  }
  cands.sort((a, b) => a.d - b.d || a.y - b.y || a.x - b.x)
  const kinds: FieldKind[] = ['bag', 'meyve', 'bostan', 'bag', 'mera', 'meyve', 'bostan', 'bag', 'mera', 'meyve', 'bag', 'bostan']
  const out: CityField[] = []
  for (const c of cands) {
    if (out.length >= kinds.length) break
    if (out.some(f => Math.abs(f.x - c.x) / (hw * 2 + 50) + Math.abs(f.y - c.y) / (hh * 2 + 25) < 1)) continue
    out.push({ x: c.x, y: c.y, hw, hh, kind: kinds[out.length] })
  }
  fieldsCache = out
  return out
}

/*
 * ÇEŞMELER: çevre yolunun dört caddeyle kesiştiği köşelerde ve kara
 * kapılarının iç yanında, yol kenarında birer Osmanlı çeşmesi.
 */
export function cityFountains(): ScreenPoint[] {
  const P = PLAZA.screen
  const out: ScreenPoint[] = []
  for (const deg of [0, 90, 180, 270]) {
    const t = deg * Math.PI / 180
    const x = P.x + Math.cos(t) * RING_ROAD.rx, y = P.y + Math.sin(t) * RING_ROAD.ry
    out.push({ x: x + (deg === 0 ? -TILE.w * 0.75 : deg === 180 ? TILE.w * 0.75 : -TILE.w * 0.62), y: y + (deg === 90 ? -TILE.h * 1.3 : deg === 270 ? TILE.h * 1.5 : -TILE.h * 0.62) })
  }
  const wall = DEFENSE_FOUNDATION.map(p => p.screen)
  const cx = wall.reduce((a, p) => a + p.x, 0) / wall.length, cy = wall.reduce((a, p) => a + p.y, 0) / wall.length
  for (const g of WALL_GATES) {
    if (g.kind !== 'land') continue
    const dx = cx - g.screen.x, dy = cy - g.screen.y, l = Math.hypot(dx, dy) || 1
    const ux = dx / l, uy = dy / l
    out.push({ x: g.screen.x + ux * TILE.w * 1.9 - uy * TILE.w * 0.62, y: g.screen.y + uy * TILE.w * 1.9 + ux * TILE.h * 0.9 })
  }
  return out
}
