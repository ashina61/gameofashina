/**
 * ŞEHİR DOKUSU YERLEŞİMİ (Phaser'sız, test edilebilir): sur içindeki bağ,
 * bahçe, bostan ve meraların yerleri ile çeşmelerin konumları.
 */
import { COAST_SLOTS, DEFENSE_FOUNDATION, PLAZA, RING_ROAD, ROAD_GRAPH, SLOTS, TILE, WALL_GATES, type ScreenPoint } from './index'
import { FOOTPRINT_DIAMOND_W } from './building-assets'


/** Nokta kümesi için uzamsal ızgara: "(x,y) çevresinde nokta var mı?" hızlı sorgusu. */
function pointGrid(pts: ScreenPoint[], cell = 64) {
  const map = new Map<string, ScreenPoint[]>()
  for (const p of pts) {
    const k = `${Math.floor(p.x / cell)},${Math.floor(p.y / cell)}`
    const arr = map.get(k); if (arr) arr.push(p); else map.set(k, [p])
  }
  /** (x,y) merkezli, yarı eksenleri rx/ry olan kutuda test fonksiyonunu sağlayan nokta var mı? */
  return (x: number, y: number, rx: number, ry: number, test: (p: ScreenPoint) => boolean) => {
    for (let i = Math.floor((x - rx) / cell); i <= Math.floor((x + rx) / cell); i++) {
      for (let j = Math.floor((y - ry) / cell); j <= Math.floor((y + ry) / cell); j++) {
        const arr = map.get(`${i},${j}`)
        if (arr && arr.some(test)) return true
      }
    }
    return false
  }
}

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
  const nearRoad = pointGrid(roadPts), nearStream = pointGrid(cityStream().pts)
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
      if (nearRoad(x, y, hw + 46, hh + 23, p => Math.abs(p.x - x) / (hw + 46) + Math.abs(p.y - y) / (hh + 23) < 1)) continue
      if (wall.some(p => Math.abs(p.x - x) / (hw + 70) + Math.abs(p.y - y) / (hh + 35) < 1)) continue
      if (nearStream(x, y, hw + 40, hh + 20, p => Math.abs(p.x - x) / (hw + 40) + Math.abs(p.y - y) / (hh + 20) < 1)) continue
      if (aqueductHits(x, y, hw + 30, hh + 15)) continue
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
let fountainsCache: ScreenPoint[] | null = null
export function cityFountains(): ScreenPoint[] {
  if (fountainsCache) return fountainsCache
  const P = PLAZA.screen
  const out: ScreenPoint[] = []
  // Dereye düşen çeşme yolun öbür yakasına alınır.
  const nearStream = pointGrid(cityStream().pts)
  const wet = (p: ScreenPoint) => nearStream(p.x, p.y, TILE.w * 0.8, TILE.w * 0.6, q => Math.hypot(q.x - p.x, (q.y - p.y) * 1.4) < TILE.w * 0.8)
  for (const deg of [0, 90, 180, 270]) {
    const t = deg * Math.PI / 180
    const x = P.x + Math.cos(t) * RING_ROAD.rx, y = P.y + Math.sin(t) * RING_ROAD.ry
    const dx = deg === 0 ? -TILE.w * 0.75 : deg === 180 ? TILE.w * 0.75 : -TILE.w * 0.62
    const dy = deg === 90 ? -TILE.h * 1.3 : deg === 270 ? TILE.h * 1.5 : -TILE.h * 0.62
    const opts = [{ x: x + dx, y: y + dy }, { x: x - dx, y: y + dy }, { x: x + dx, y: y - dy * 1.4 }]
    const pick = opts.find(p => !wet(p))
    if (pick) out.push(pick)
  }
  const wall = DEFENSE_FOUNDATION.map(p => p.screen)
  const cx = wall.reduce((a, p) => a + p.x, 0) / wall.length, cy = wall.reduce((a, p) => a + p.y, 0) / wall.length
  for (const g of WALL_GATES) {
    if (g.kind !== 'land') continue
    const dx = cx - g.screen.x, dy = cy - g.screen.y, l = Math.hypot(dx, dy) || 1
    const ux = dx / l, uy = dy / l
    const p = { x: g.screen.x + ux * TILE.w * 1.9 - uy * TILE.w * 0.62, y: g.screen.y + uy * TILE.w * 1.9 + ux * TILE.h * 0.9 }
    if (!wet(p)) out.push(p)
  }
  fountainsCache = out
  return out
}

/*
 * KIYI ÇİZGİSİ (x'e göre kara/deniz sınırı). Liman koyunda düz, iki yanda
 * burunlar denize uzanır. Arazi çizimi ve dere aynı eğriyi kullanır.
 */
const smooth01 = (t: number) => { const c = Math.min(1, Math.max(0, t)); return c * c * (3 - 2 * c) }
let shoreK: { hx: number; seaLine: number; bayHalf: number } | null = null
export function shoreYAt(x: number) {
  if (!shoreK) {
    const hall = SLOTS.find(s => s.fixed && s.type === 'city')!.screen
    shoreK = {
      hx: hall.x,
      seaLine: Math.min(...COAST_SLOTS.map(s => s.screen.y)) - TILE.h * 0.75,
      bayHalf: Math.max(...COAST_SLOTS.map(s => Math.abs(s.screen.x - hall.x))) + TILE.w * 1.1,
    }
  }
  const { hx, seaLine, bayHalf } = shoreK
  const d = x - hx
  const side = d < 0
  const H = side ? TILE.h * 16 : TILE.h * 11 // sol burun daha derin (asimetri)
  const ramp = side ? TILE.w * 4.6 : TILE.w * 6.2
  const out = smooth01((Math.abs(d) - bayHalf) / ramp)
  const wave = TILE.h * 1.7 * Math.sin(x / (TILE.w * 4.2) + 0.4)
    + TILE.h * 0.85 * Math.sin(x / (TILE.w * 2.1) + 2.2)
    + TILE.h * 0.35 * Math.sin(x / (TILE.w * 0.83) + 1.3)
  const waveOn = smooth01((Math.abs(d) - bayHalf + TILE.w) / (TILE.w * 2))
  return seaLine + H * out + wave * waveOn
}

/*
 * DERE: kuzeybatıdaki tepelerden doğar, surun altındaki kemerden şehre girer,
 * arsaların ve meydanın arasından kıvrılarak batı burnunda denize dökülür.
 * Yol en az yol kesecek şekilde bulunur (A*); kestiği yerlerde taş köprü,
 * surdan geçtiği yerlerde su kemeri olur. Bir de su değirmeni yeri seçilir.
 */
export type CityStream = {
  pts: ScreenPoint[]
  widths: number[]
  bridges: Array<{ x: number; y: number; angle: number }>
  wallArches: ScreenPoint[]
  mill: { x: number; y: number; wheel: ScreenPoint } | null
}
let streamCache: CityStream | null = null
export function cityStream(): CityStream {
  if (streamCache) return streamCache
  const hall = SLOTS.find(s => s.fixed && s.type === 'city')!.screen
  const wall = DEFENSE_FOUNDATION.map(p => p.screen)
  const wxs = wall.map(p => p.x), wys = wall.map(p => p.y)
  const nodeAt = new Map(ROAD_GRAPH.nodes.map(n => [n.id, n.screen]))
  const roadPts: ScreenPoint[] = []
  for (const e of ROAD_GRAPH.edges) {
    const A = nodeAt.get(e.from), B = nodeAt.get(e.to)
    if (!A || !B) continue
    const n = Math.max(6, Math.round(Math.hypot(B.x - A.x, B.y - A.y) / 14))
    for (let k = 0; k <= n; k++) {
      const t = k / n, u = 1 - t
      roadPts.push({ x: u * u * A.x + 2 * u * t * e.ctrl.x + t * t * B.x, y: u * u * A.y + 2 * u * t * e.ctrl.y + t * t * B.y })
    }
  }
  const inWall = (x: number, y: number) => {
    let inside = false
    for (let i = 0, j = wall.length - 1; i < wall.length; j = i++) {
      const a = wall[i], b = wall[j]
      if ((a.y > y) !== (b.y > y) && x < (b.x - a.x) * (y - a.y) / (b.y - a.y) + a.x) inside = !inside
    }
    return inside
  }
  const nearRoad = pointGrid(roadPts)
  const segDist = (p: ScreenPoint, a: ScreenPoint, b: ScreenPoint) => {
    const dx = b.x - a.x, dy = b.y - a.y
    const t = Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / (dx * dx + dy * dy || 1)))
    return Math.hypot(a.x + dx * t - p.x, a.y + dy * t - p.y)
  }
  const yardHW = FOOTPRINT_DIAMOND_W * 1.05, yardHH = yardHW / 2
  const start = { x: hall.x - TILE.w * 7.5, y: Math.min(...wys) - TILE.h * 7 }
  const endX = hall.x - TILE.w * 11.5
  const goal = { x: endX, y: shoreYAt(endX) + TILE.h * 1.2 }
  const C = 32
  const x0 = Math.min(...wxs, start.x, goal.x) - C * 4, y0 = Math.min(start.y, ...wys) - C * 4
  const W = Math.ceil((Math.max(...wxs) + C * 4 - x0) / C), H = Math.ceil((Math.max(goal.y, ...wys) + C * 6 - y0) / C)
  const gates = WALL_GATES.map(g => g.screen)
  const cost = new Float32Array(W * H)
  for (let j = 0; j < H; j++) {
    for (let i = 0; i < W; i++) {
      const x = x0 + i * C, y = y0 + j * C
      let c = 1 + 1.6 * (1 + Math.sin(x / 310 + 1.1) * Math.cos(y / 270 - 0.4)) // hafif kıvrım
      if (y > shoreYAt(x) - TILE.h * 0.4 && Math.hypot(x - goal.x, y - goal.y) > C * 4.5) c = Infinity // deniz (ağız hariç)
      // Sur dışı yalnızca kaynakta (tepe) ve ağızda (burun) serbest: dere şehrin içinden akar.
      if (!inWall(x, y) && Math.hypot(x - start.x, y - start.y) > 760 && Math.hypot(x - goal.x, y - goal.y) > 1500) c = Infinity
      if (c !== Infinity) for (const s of SLOTS) {
        if (Math.abs(s.screen.x - x) > yardHW * 1.3 || Math.abs(s.screen.y - y) > yardHH * 1.3) continue
        const k = s.type === 'city' ? 1 : 0.45 // kule ve rıhtım: yalnızca kendi tabanı
        const m = Math.abs(s.screen.x - x) / (yardHW * k) + Math.abs(s.screen.y - y) / (yardHH * k)
        if (m < 1) { c = Infinity; break }
        if (m < 1.3) c += 14
      }
      if (c !== Infinity && Math.hypot((x - PLAZA.screen.x) / (PLAZA.rx * 1.25), (y - PLAZA.screen.y) / (PLAZA.ry * 1.25)) < 1) c = Infinity
      if (c !== Infinity && gates.some(g => Math.hypot(g.x - x, (g.y - y) * 1.6) < TILE.w * 1.6)) c = Infinity
      if (c !== Infinity) {
        let wd = Infinity
        for (let k = 0; k < wall.length; k++) wd = Math.min(wd, segDist({ x, y }, wall[k], wall[(k + 1) % wall.length]))
        if (wd < 40) c += 70
        else if (wd < 200) c += 6 // surun dibinden değil, şehrin içinden aksın
        if (nearRoad(x, y, 30, 22, p => Math.abs(p.x - x) < 30 && Math.abs(p.y - y) < 22)) c += 45
      }
      cost[j * W + i] = c
    }
  }
  // A* (ikili yığın).
  const idx = (p: ScreenPoint) => Math.round((p.y - y0) / C) * W + Math.round((p.x - x0) / C)
  const si = idx(start), gi = idx(goal)
  const g = new Float32Array(W * H).fill(Infinity), from = new Int32Array(W * H).fill(-1)
  const heap: Array<[number, number]> = []
  const push = (f: number, i: number) => { heap.push([f, i]); let k = heap.length - 1; while (k > 0) { const p = (k - 1) >> 1; if (heap[p][0] <= heap[k][0]) break; [heap[p], heap[k]] = [heap[k], heap[p]]; k = p } }
  const pop = () => { const top = heap[0], last = heap.pop()!; if (heap.length) { heap[0] = last; let k = 0; for (;;) { const l = 2 * k + 1, r = l + 1; let m = k; if (l < heap.length && heap[l][0] < heap[m][0]) m = l; if (r < heap.length && heap[r][0] < heap[m][0]) m = r; if (m === k) break; [heap[m], heap[k]] = [heap[k], heap[m]]; k = m } } return top }
  const gx = gi % W, gy = Math.floor(gi / W)
  g[si] = 0; push(0, si)
  while (heap.length) {
    const [, cur] = pop()
    if (cur === gi) break
    const cx = cur % W, cy = Math.floor(cur / W)
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
      if (!dx && !dy) continue
      const nx = cx + dx, ny = cy + dy
      if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue
      const ni = ny * W + nx, step = cost[ni] * (dx && dy ? 1.414 : 1)
      if (!isFinite(step)) continue
      const ng = g[cur] + step
      if (ng < g[ni]) { g[ni] = ng; from[ni] = cur; push(ng + Math.hypot(nx - gx, ny - gy), ni) }
    }
  }
  let raw: ScreenPoint[] = []
  for (let k = gi; k !== -1; k = from[k]) raw.push({ x: x0 + (k % W) * C, y: y0 + Math.floor(k / W) * C })
  raw.reverse()
  if (raw.length < 2 || from[gi] === -1) raw = [start, goal]
  // Chaikin yumuşatma.
  let pts = raw.filter((_, i) => i % 2 === 0 || i === raw.length - 1)
  for (let it = 0; it < 3; it++) {
    const nxt: ScreenPoint[] = [pts[0]]
    for (let i = 0; i + 1 < pts.length; i++) {
      const a = pts[i], b = pts[i + 1]
      nxt.push({ x: a.x * 0.75 + b.x * 0.25, y: a.y * 0.75 + b.y * 0.25 }, { x: a.x * 0.25 + b.x * 0.75, y: a.y * 0.25 + b.y * 0.75 })
    }
    nxt.push(pts[pts.length - 1]); pts = nxt
  }
  const widths = pts.map((_, i) => 22 + 16 * (i / (pts.length - 1)))
  // Köprüler: yolu kestiği her küme için bir köprü.
  const bridges: CityStream['bridges'] = []
  let run: number[] = []
  const flush = () => {
    if (!run.length) return
    const m = run[Math.floor(run.length / 2)], a = pts[Math.max(0, m - 1)], b = pts[Math.min(pts.length - 1, m + 1)]
    bridges.push({ x: pts[m].x, y: pts[m].y, angle: Math.atan2(b.y - a.y, b.x - a.x) })
    run = []
  }
  pts.forEach((p, i) => {
    const near = nearRoad(p.x, p.y, 16, 16, q => Math.hypot(q.x - p.x, q.y - p.y) < 16)
    if (near) run.push(i); else flush()
  })
  flush()
  // Sur kemerleri: dere çizgisinin halkayı kestiği noktalar.
  const wallArches: ScreenPoint[] = []
  const cross = (p: ScreenPoint, q: ScreenPoint, a: ScreenPoint, b: ScreenPoint) => {
    const d = (q.x - p.x) * (b.y - a.y) - (q.y - p.y) * (b.x - a.x)
    if (Math.abs(d) < 1e-6) return null
    const t = ((a.x - p.x) * (b.y - a.y) - (a.y - p.y) * (b.x - a.x)) / d
    const u = ((a.x - p.x) * (q.y - p.y) - (a.y - p.y) * (q.x - p.x)) / d
    return t >= 0 && t <= 1 && u >= 0 && u <= 1 ? { x: p.x + (q.x - p.x) * t, y: p.y + (q.y - p.y) * t } : null
  }
  for (let i = 0; i + 1 < pts.length; i++) {
    for (let k = 0; k < wall.length; k++) {
      const h = cross(pts[i], pts[i + 1], wall[k], wall[(k + 1) % wall.length])
      if (h && !wallArches.some(w => Math.hypot(w.x - h.x, w.y - h.y) < 60)) wallArches.push(h)
    }
  }
  // Değirmen: derenin orta bölümünde, yollardan ve arsalardan en uzak kıyı.
  let mill: CityStream['mill'] = null, best = 0
  for (let i = Math.floor(pts.length * 0.3); i < pts.length * 0.75; i += 2) {
    const a = pts[Math.max(0, i - 1)], b = pts[Math.min(pts.length - 1, i + 1)]
    const l = Math.hypot(b.x - a.x, b.y - a.y) || 1
    const nx = -(b.y - a.y) / l, ny = (b.x - a.x) / l
    for (const side of [1, -1]) {
      const hx = pts[i].x + nx * 96 * side, hy = pts[i].y + ny * 56 * side
      const clear = Math.min(
        ...roadPts.map(q => Math.hypot(q.x - hx, (q.y - hy) * 1.6)),
        ...SLOTS.map(s => Math.abs(s.screen.x - hx) / yardHW + Math.abs(s.screen.y - hy) / yardHH < 1.1 ? 0 : 9999),
        ...wall.map(w => Math.hypot(w.x - hx, w.y - hy) + 0),
      )
      const inside = hy > Math.min(...wys) + 80
      if (inside && clear > best) { best = clear; mill = { x: hx, y: hy, wheel: { x: pts[i].x + nx * 26 * side, y: pts[i].y + ny * 16 * side } } }
    }
  }
  if (best < 70) mill = null
  streamCache = { pts, widths, bridges, wallArches, mill }
  return streamCache
}

let streamNear: ReturnType<typeof pointGrid> | null = null
/** (x,y) dereye (kıyılar dahil) yakın mı? Dekor/ağaç yerleşimi için hızlı sorgu. */
export function nearStreamAt(x: number, y: number, rx: number, ry: number) {
  streamNear ??= pointGrid(cityStream().pts)
  return streamNear(x, y, rx, ry, p => Math.abs(p.x - x) < rx && Math.abs(p.y - y) < ry)
}

/*
 * SU KEMERİ (Bozdoğan / Mağlova gibi): tepelerden izometrik eksen boyunca
 * düz bir hatla gelir, surun üstünden aşar ve şehir içindeki MAKSEM'de (su
 * terazisi kulesi) biter. Hat arsaların görsel alanına, mezarlığa, madene,
 * çeşmelere ve dereye binmez; yolları kemerlerinin altından geçirir.
 */
export type CityAqueduct = { from: ScreenPoint; to: ScreenPoint } | null
/** Bir arsadaki binanın (en yüksek aşamada) ekranda kapladığı kutu. */
function artBox(s: { type: string; screen: ScreenPoint }) {
  if (s.type === 'coast') return { x0: s.screen.x - 250, x1: s.screen.x + 250, y0: s.screen.y + 64 - 400, y1: s.screen.y + 80 }
  if (s.type === 'defense') return { x0: s.screen.x - 60, x1: s.screen.x + 60, y0: s.screen.y - 160, y1: s.screen.y + 30 }
  return { x0: s.screen.x - 280, x1: s.screen.x + 280, y0: s.screen.y - 400, y1: s.screen.y + 150 }
}
const inBox = (b: { x0: number; x1: number; y0: number; y1: number }, x: number, y: number, pad = 0) =>
  x > b.x0 - pad && x < b.x1 + pad && y > b.y0 - pad && y < b.y1 + pad
let aqueductCache: CityAqueduct | undefined
export function cityAqueduct(): CityAqueduct {
  if (aqueductCache !== undefined) return aqueductCache
  const wall = DEFENSE_FOUNDATION.map(p => p.screen)
  const inWall = (x: number, y: number) => {
    let inside = false
    for (let i = 0, j = wall.length - 1; i < wall.length; j = i++) {
      const a = wall[i], b = wall[j]
      if ((a.y > y) !== (b.y > y) && x < (b.x - a.x) * (y - a.y) / (b.y - a.y) + a.x) inside = !inside
    }
    return inside
  }
  const hall = SLOTS.find(s => s.fixed && s.type === 'city')!.screen
  const top = Math.min(...wall.map(p => p.y))
  const avoid = [
    { x: hall.x + TILE.w * 4.6, y: top - TILE.h * 3.2, r: TILE.w * 2.6 }, // mezarlık
    { x: hall.x - TILE.w * 3.4, y: top - TILE.h * 2.4, r: TILE.w * 1.8 }, // ada madeni
    ...cityFountains().map(c => ({ x: c.x, y: c.y, r: TILE.w * 0.9 })),
  ]
  const nearStream = pointGrid(cityStream().pts)
  const boxes = SLOTS.filter(s => s.type === 'city').map(artBox)
  // Sur kuleleri ve kapıları: kemer bunların yanından geçmez (su kapısı açılır).
  const towers = [...SLOTS.filter(s => s.type === 'defense').map(s => s.screen), ...WALL_GATES.map(g => g.screen)]
  const clearAt = (x: number, y: number, pad: number) =>
    !towers.some(t => Math.hypot(t.x - x, (t.y - y) * 1.5) < 260) &&
    !boxes.some(b => inBox(b, x, y, pad)) &&
    !avoid.some(a => Math.hypot(a.x - x, (a.y - y) * 1.6) < a.r) &&
    !nearStream(x, y, pad + 20, pad + 20, p => Math.hypot(p.x - x, p.y - y) < pad + 20)
  let best: CityAqueduct = null, bestScore = Infinity
  // İzometrik eksen yönleri: kuzeydoğu (sağ-yukarı) ya da kuzeybatı (sol-yukarı).
  for (const dir of [{ x: 2 / Math.sqrt(5), y: -1 / Math.sqrt(5) }, { x: -2 / Math.sqrt(5), y: -1 / Math.sqrt(5) }]) {
    for (let my = top + 200; my < hall.y - 500; my += 40) {
      for (let mx = hall.x - 1500; mx <= hall.x + 1500; mx += 40) {
        if (!inWall(mx, my) || !clearAt(mx, my, 60)) continue
        // Hattı dışarı doğru uzat: surdan tepelere (en az 640 px) çıkana kadar.
        let ok = true, outside = 0, len = 0, inside = 0
        for (let d = 60; d < 1700; d += 30) {
          const x = mx + dir.x * d, y = my + dir.y * d
          if (!clearAt(x, y, 24)) { ok = false; break }
          if (!inWall(x, y)) outside += 30; else if (!outside) inside += 30
          len = d
          if (outside >= 640) break // tepelere kadar uzansın
        }
        // Şehir içinde görünür bir kemer dizisi olsun (en az ~6 göz).
        if (!ok || outside < 640 || inside < 350) continue
        // Maksem merkeze yakın, hat çok uzun olmayan seçilir.
        const score = Math.hypot(mx - hall.x, (my - hall.y) * 1.3) + len * 0.25
        if (score < bestScore) { bestScore = score; best = { to: { x: mx, y: my }, from: { x: mx + dir.x * len, y: my + dir.y * len } } }
      }
    }
  }
  aqueductCache = best
  return best
}
/** (x,y) su kemeri hattına (yarı eksenler rx/ry) yakın mı? */
export function aqueductHits(x: number, y: number, rx: number, ry: number) {
  const a = cityAqueduct()
  if (!a) return false
  const n = Math.max(2, Math.ceil(Math.hypot(a.to.x - a.from.x, a.to.y - a.from.y) / 20))
  for (let i = 0; i <= n; i++) {
    const px = a.from.x + (a.to.x - a.from.x) * i / n, py = a.from.y + (a.to.y - a.from.y) * i / n
    if (Math.abs(px - x) / rx + Math.abs(py - y) / ry < 1) return true
  }
  return Math.abs(a.to.x - x) / (rx + 40) + Math.abs(a.to.y - y) / (ry + 30) < 1 // maksem
}

/*
 * İSKELE PAZARI: limana yakın, hiçbir binanın (en yüksek aşamadaki) görsel
 * alanına, tarlaya, dereye, su kemerine, yola binmeyen tek bir alan; pazar
 * görselinin elması bu noktaya oturur. En yakın yol noktası da döner (patika).
 */
export type CityBazaar = { x: number; y: number; road: ScreenPoint } | null
/** Pazar alanının ekrandaki yarı genişliği / üst-alt payı (görsel ~0.8 bina ölçeği). */
export const BAZAAR_BOX = { hw: 190, up: 250, down: 90 }
let bazaarCache: CityBazaar | undefined
export function cityBazaar(): CityBazaar {
  if (bazaarCache !== undefined) return bazaarCache
  const nodeAt = new Map(ROAD_GRAPH.nodes.map(n => [n.id, n.screen]))
  const roadPts: ScreenPoint[] = []
  for (const e of ROAD_GRAPH.edges) {
    const A = nodeAt.get(e.from), B = nodeAt.get(e.to)
    if (!A || !B) continue
    for (let k = 0; k <= 24; k++) { const t = k / 24, u = 1 - t; roadPts.push({ x: u * u * A.x + 2 * u * t * e.ctrl.x + t * t * B.x, y: u * u * A.y + 2 * u * t * e.ctrl.y + t * t * B.y }) }
  }
  const nearRoad = pointGrid(roadPts), nearStream = pointGrid(cityStream().pts)
  // Ana caddeler (meydan–kapılar–liman): oyun başından beri görünür.
  const main = (id: string) => /^(city_hall|st_(ave|gate|out|stairs|r0$|r6$|r12$|r18$))/.test(id) || id.startsWith('coast_')
  const mainPts: ScreenPoint[] = []
  for (const e of ROAD_GRAPH.edges) {
    if (!main(e.from) || !main(e.to)) continue
    const A = nodeAt.get(e.from), B = nodeAt.get(e.to)
    if (!A || !B) continue
    for (let k = 0; k <= 24; k++) { const t = k / 24, u = 1 - t; mainPts.push({ x: u * u * A.x + 2 * u * t * e.ctrl.x + t * t * B.x, y: u * u * A.y + 2 * u * t * e.ctrl.y + t * t * B.y }) }
  }
  const boxes = SLOTS.map(artBox)
  const fields = cityFields()
  const fountains = cityFountains()
  const wall = DEFENSE_FOUNDATION.map(p => p.screen)
  const inWall = (x: number, y: number) => {
    let inside = false
    for (let i = 0, j = wall.length - 1; i < wall.length; j = i++) {
      const a = wall[i], b = wall[j]
      if ((a.y > y) !== (b.y > y) && x < (b.x - a.x) * (y - a.y) / (b.y - a.y) + a.x) inside = !inside
    }
    return inside
  }
  const P = PLAZA.screen
  const { hw, up, down } = BAZAAR_BOX
  const pointFree = (x: number, y: number) =>
    !nearRoad(x, y, 30, 22, p => Math.abs(p.x - x) < 30 && Math.abs(p.y - y) < 22) &&
    !nearStream(x, y, 50, 36, p => Math.abs(p.x - x) < 50 && Math.abs(p.y - y) < 36) &&
    !aqueductHits(x, y, 40, 26) &&
    !fields.some(f => Math.abs(f.x - x) / (f.hw + 20) + Math.abs(f.y - y) / (f.hh + 10) < 1) &&
    !fountains.some(f => Math.hypot(f.x - x, (f.y - y) * 1.5) < 70) &&
    y < shoreYAt(x) - TILE.h * 1.5 && inWall(x, y)
  const stairs = nodeAt.get('st_stairs') ?? roadPts[0]
  let best: CityBazaar = null, bestD = Infinity
  for (let y = Math.min(...wall.map(p => p.y)) + up; y < stairs.y + 300; y += 20) {
    for (let x = Math.min(...wall.map(p => p.x)) + hw; x <= Math.max(...wall.map(p => p.x)) - hw; x += 20) {
      if (y - up < P.y + RING_ROAD.ry) continue // çevre yolunun güneyinde: liman mahallesi
      if (boxes.some(b => x + hw > b.x0 && x - hw < b.x1 && y + down > b.y0 && y - up < b.y1)) continue
      let ok = true
      for (let i = 0; i <= 4 && ok; i++) for (let j = 0; j <= 3 && ok; j++) {
        ok = pointFree(x - hw * 0.8 + (hw * 1.6) * i / 4, y - up * 0.3 + (up * 0.3 + down * 0.8) * j / 3)
      }
      if (!ok) continue
      // En yakın ANA cadde noktası (patika; hep görünen yollar) ve limana uzaklık.
      let road = mainPts[0], rd = Infinity
      for (const p of mainPts) { const d = Math.hypot(p.x - x, (p.y - y) * 1.4); if (d < rd) { rd = d; road = p } }
      if (rd < hw + 60) continue // caddenin servi sırasına binmesin
      const d = Math.hypot(x - stairs.x, (y - stairs.y) * 1.3) + rd * 0.4
      if (d < bestD) { bestD = d; best = { x, y, road } }
    }
  }
  bazaarCache = best
  return best
}

/** Su kemerinin sur halkasını kestiği noktalar (surda su kapısı açılır). */
export function aqueductWallCrossings(): ScreenPoint[] {
  const a = cityAqueduct()
  if (!a) return []
  const ring = DEFENSE_FOUNDATION.map(p => p.screen)
  const out: ScreenPoint[] = []
  for (let k = 0; k < ring.length; k++) {
    const p = ring[k], q = ring[(k + 1) % ring.length]
    const d = (a.to.x - a.from.x) * (q.y - p.y) - (a.to.y - a.from.y) * (q.x - p.x)
    if (Math.abs(d) < 1e-6) continue
    const t = ((p.x - a.from.x) * (q.y - p.y) - (p.y - a.from.y) * (q.x - p.x)) / d
    const u = ((p.x - a.from.x) * (a.to.y - a.from.y) - (p.y - a.from.y) * (a.to.x - a.from.x)) / d
    if (t >= 0 && t <= 1 && u >= 0 && u <= 1) out.push({ x: a.from.x + (a.to.x - a.from.x) * t, y: a.from.y + (a.to.y - a.from.y) * t })
  }
  return out
}

/** Kademeli gelişme: kaçıncı tarla hangi Divanhane seviyesinde açılır. */
export function fieldTier(i: number) { return i < 4 ? 3 : i < 8 ? 4 : 5 }
/** Kavşak çeşmeleri 3., kapı içi çeşmeleri 5. seviyede açılır. */
export function fountainTier(c: ScreenPoint) {
  return Math.hypot((c.x - PLAZA.screen.x) / RING_ROAD.rx, (c.y - PLAZA.screen.y) / RING_ROAD.ry) < 1.3 ? 3 : 5
}
