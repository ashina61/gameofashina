/**
 * ŞEHİR ZEMİNİ — PAYLAŞILAN katmanlı arazi kurucu.
 *
 * Hem /map-debug hem CANLI şehir AYNI zemini kullanır. Bu dosya yalnızca
 * render/art-direction katmanıdır: slot koordinatları, 2x2 footprint, bina
 * anchor/scale, ekonomi ve kayıt mantığı burada DEĞİŞMEZ.
 *
 * Katmanlar:
 *   -1000 base    sıcak kara + deniz dolgu
 *   -900 terrain  gerçek grass/shore/water dokuları
 *   -880 variation büyük, düşük alfa doğal leke katmanı (tile tekrarını kırar)
 *   -800 stone    hendek, dar taş yollar, doğal build pad'leri, rıhtımlar
 *   -700 decor    yol kenarı kümeleri + seyrek arazi dekoru
 */
import * as Phaser from 'phaser'
import {
  CITY_SLOTS, COAST_SLOTS, DEFENSE_SLOTS, DEFENSE_FOUNDATION, ROAD_GRAPH,
  HALL_SLOT_ID, slotById, SLOTS, TILE, type CitySlot, type ScreenPoint,
} from './index'
import { GROUND_TARGET_W, GROUND_TARGET_D, FOOTPRINT_DIAMOND_W } from './building-assets'
import { asset } from '@/lib/asset'

/** Gerçek arazi/dekor tile'ları. */
export const TERRAIN_TILES = [
  'grass', 'dirt', 'stone',
  'shore-a', 'shore-b', 'shore-c',
  'water', 'water-deep',
] as const
export const DECOR_TILES = ['olive-tree', 'bush', 'flower', 'rock'] as const

/** Deterministik tohumlu rastgele (dekor/terrain her açılışta aynı kalsın). */
export function mulberry32(seed: number) {
  return () => {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** Bütün şehri (kıyı/savunma dahil) kapsayan dünya dikdörtgeni + hareket payı. */
export function cityWorldRect() {
  const pts = [...SLOTS.map(s => s.screen), ...DEFENSE_FOUNDATION.map(p => p.screen)]
  const xs = pts.map(p => p.x), ys = pts.map(p => p.y)
  const mx = TILE.w * 3, my = TILE.h * 5
  const minX = Math.min(...xs) - mx, minY = Math.min(...ys) - my
  return { x: minX, y: minY, w: Math.max(...xs) + mx - minX, h: Math.max(...ys) + my - minY }
}

/** OVERVIEW: yalnızca şehir+savunma+kıyı, gereksiz koyu deniz payı olmadan. */
export function cityContentRect() {
  const pts = [...SLOTS.map(s => s.screen), ...DEFENSE_FOUNDATION.map(p => p.screen)]
  const xs = pts.map(p => p.x), ys = pts.map(p => p.y)
  const padX = FOOTPRINT_DIAMOND_W * 0.72
  const padTop = FOOTPRINT_DIAMOND_W * 0.55
  const padBottom = FOOTPRINT_DIAMOND_W * 0.42
  const minX = Math.min(...xs) - padX
  const minY = Math.min(...ys) - padTop
  return {
    x: minX,
    y: minY,
    w: Math.max(...xs) + padX - minX,
    h: Math.max(...ys) + padBottom - minY,
  }
}

/** Terrain + dekor tile'larını sahneye yükler (scene.preload içinde). */
export function preloadTerrain(scene: Phaser.Scene) {
  for (const t of TERRAIN_TILES) {
    if (!scene.textures.exists('t_' + t)) scene.load.image('t_' + t, asset(`/images/game/terrain/${t}.png`))
  }
  for (const d of DECOR_TILES) {
    if (!scene.textures.exists('d_' + d)) scene.load.image('d_' + d, asset(`/images/game/decor/${d}.png`))
  }
}

type RoadKind = 'avenue' | 'street' | 'quay'

type RoadCurve = {
  from: string
  to: string
  kind: RoadKind
  curve: Phaser.Curves.QuadraticBezier
}

/**
 * Yol ağı görsel olarak iki seviyeye ayrılır:
 * - avenue: belediyeden kıyı slotlarına giden ortak ana omurga
 * - street: mahalle/arsa bağlantıları
 * - quay: son coast bağlantısı; rıhtım taşı tonuna geçer
 *
 * Ana omurga ELLE seçilmez. ROAD_GRAPH üzerinde belediyeden bütün coast
 * slotlarına en kısa yolların birleşimi alınır. Böylece slot/graph değişirse
 * görsel yol hiyerarşisi de otomatik uyum sağlar.
 */
function edgeKey(a: string, b: string) {
  return a < b ? `${a}|${b}` : `${b}|${a}`
}

function arterialEdgeKeys(): Set<string> {
  const adj = new Map<string, { to: string; key: string }[]>()
  const add = (from: string, to: string) => {
    const arr = adj.get(from) ?? []
    arr.push({ to, key: edgeKey(from, to) })
    adj.set(from, arr)
  }

  for (const e of ROAD_GRAPH.edges) {
    add(e.from, e.to)
    add(e.to, e.from)
  }

  const parent = new Map<string, { node: string; key: string }>()
  const seen = new Set<string>([HALL_SLOT_ID])
  const queue = [HALL_SLOT_ID]

  for (let qi = 0; qi < queue.length; qi++) {
    const node = queue[qi]
    for (const next of adj.get(node) ?? []) {
      if (seen.has(next.to)) continue
      seen.add(next.to)
      parent.set(next.to, { node, key: next.key })
      queue.push(next.to)
    }
  }

  const arterial = new Set<string>()
  for (const target of COAST_SLOTS.map(s => s.id)) {
    let node = target
    while (node !== HALL_SLOT_ID) {
      const p = parent.get(node)
      if (!p) break
      arterial.add(p.key)
      node = p.node
    }
  }
  return arterial
}

const ROAD_STYLE: Record<RoadKind, {
  shoulderW: number
  shoulder: number
  shoulderAlpha: number
  borderW: number
  border: number
  fillW: number
  fill: number
  highlightW: number
  highlight: number
}> = {
  avenue: {
    shoulderW: 0.46, shoulder: 0x665a42, shoulderAlpha: 0.62,
    borderW: 0.36, border: 0x75684d,
    fillW: 0.275, fill: 0xc1b284,
    highlightW: 0.024, highlight: 0xe2d6ae,
  },
  street: {
    shoulderW: 0.34, shoulder: 0x6a6048, shoulderAlpha: 0.48,
    borderW: 0.285, border: 0x76694d,
    fillW: 0.205, fill: 0xb7a97b,
    highlightW: 0.017, highlight: 0xd6c89d,
  },
  quay: {
    shoulderW: 0.42, shoulder: 0x5d594f, shoulderAlpha: 0.66,
    borderW: 0.335, border: 0x6d685d,
    fillW: 0.25, fill: 0xaaa48f,
    highlightW: 0.021, highlight: 0xd8d2bf,
  },
}

/** Bir yönde, slot elmasının DIŞ kenarına çıkan nokta. Yol bina altına girmez. */
function footprintExit(slot: CitySlot, toward: ScreenPoint, scale = 1.08): ScreenPoint {
  const dx = toward.x - slot.screen.x
  const dy = toward.y - slot.screen.y
  if (Math.abs(dx) + Math.abs(dy) < 0.001) return { ...slot.screen }
  const halfW = GROUND_TARGET_W * 0.55
  const halfH = GROUND_TARGET_D * 0.55
  const t = 1 / (Math.abs(dx) / halfW + Math.abs(dy) / halfH)
  return {
    x: slot.screen.x + dx * t * scale,
    y: slot.screen.y + dy * t * scale,
  }
}

function roadCurves(V: (x: number, y: number) => Phaser.Math.Vector2): RoadCurve[] {
  const nodeById = new Map(ROAD_GRAPH.nodes.map(n => [n.id, n]))
  const arterial = arterialEdgeKeys()
  const out: RoadCurve[] = []

  for (const e of ROAD_GRAPH.edges) {
    const A = nodeById.get(e.from), B = nodeById.get(e.to)
    if (!A || !B) continue

    const sa = slotById(e.from), sb = slotById(e.to)
    const start = sa ? footprintExit(sa, B.screen) : A.screen
    const end = sb ? footprintExit(sb, A.screen) : B.screen
    const coastLink = e.from.startsWith('coast_') || e.to.startsWith('coast_')
    const kind: RoadKind = coastLink
      ? 'quay'
      : arterial.has(edgeKey(e.from, e.to))
        ? 'avenue'
        : 'street'

    out.push({
      from: e.from,
      to: e.to,
      kind,
      curve: new Phaser.Curves.QuadraticBezier(
        V(start.x, start.y),
        V(e.ctrl.x, e.ctrl.y),
        V(end.x, end.y),
      ),
    })
  }
  return out
}

/** İzometrik footprint'e yeterince yakın mı? Dekoru arsalardan uzak tutar. */
function nearSlot(wx: number, wy: number, slot: CitySlot, margin = 1) {
  const dx = Math.abs(slot.screen.x - wx)
  const dy = Math.abs(slot.screen.y - wy)
  return dx + 2 * dy < FOOTPRINT_DIAMOND_W * margin
}

/** Katmanlı şehir zeminini sahneye kurar. Bina sprite'larından ÖNCE bir kez çağrılır. */
export function buildCityTerrain(scene: Phaser.Scene) {
  const wr = cityWorldRect()
  const V = (x: number, y: number) => new Phaser.Math.Vector2(x, y)
  const coastMinY = Math.min(...COAST_SLOTS.map(s => s.screen.y))
  const seaLine = coastMinY - TILE.h * 0.75
  const diamond = (cx: number, cy: number, w: number, h: number) =>
    [V(cx, cy - h / 2), V(cx + w / 2, cy), V(cx, cy + h / 2), V(cx - w / 2, cy)]

  const stamp = (
    key: string, wx: number, wy: number, tw: number, depth: number,
    oy = 0.55, alpha = 1, tint?: number,
  ) => {
    const src = scene.textures.get(key).getSourceImage() as HTMLImageElement
    if (!src?.width) return
    const img = scene.add.image(wx, wy, key).setOrigin(0.5, oy).setDepth(depth).setAlpha(alpha)
    img.setDisplaySize(tw, tw * src.height / src.width)
    if (tint !== undefined) img.setTint(tint)
  }

  // 1) TABAN — karo dışında hiçbir koyu boşluk kalmasın.
  const g0 = scene.add.graphics().setDepth(-1000)
  g0.fillStyle(0x799b55, 1); g0.fillRect(wr.x, wr.y, wr.w, wr.h)
  g0.fillStyle(0x398b8a, 1); g0.fillRect(wr.x, seaLine, wr.w, wr.y + wr.h - seaLine)
  g0.fillStyle(0x17545a, 1); g0.fillRect(wr.x, seaLine + TILE.h * 3.1, wr.w, wr.y + wr.h - seaLine - TILE.h * 3.1)

  // 2) ARAZİ DOKUSU. Aynı grass stamp'inin dama görünümünü tint + leke katmanı kırar.
  const TW = TILE.w * 2.42
  const landRnd = mulberry32(90210)
  const grassTints = [0xffffff, 0xf5f0d9, 0xeaf1dc, 0xf0ead0, 0xf7f5e8]
  for (let gx = 22; gx <= 100; gx += 2) for (let gy = 40; gy <= 118; gy += 2) {
    const wx = (gx - gy) * (TILE.w / 2), wy = (gx + gy) * (TILE.h / 2)
    if (wx < wr.x - TW || wx > wr.x + wr.w + TW || wy < wr.y - TW || wy > wr.y + wr.h + TW) continue
    if (wy < seaLine - TILE.h) {
      const tint = grassTints[(gx * 17 + gy * 31) % grassTints.length]
      stamp('t_grass', wx, wy, TW, -900, 0.55, 1, tint)
      // Seyrek, düşük alfa geniş doku: büyük ölçekli renk lekesi oluşturur.
      const roll = landRnd()
      if (roll < 0.075) stamp('t_dirt', wx + (landRnd() - 0.5) * TILE.w, wy, TW * 1.35, -885, 0.55, 0.13)
      else if (roll < 0.115) stamp('t_stone', wx, wy, TW * 1.18, -885, 0.55, 0.09)
    } else if (wy < seaLine + TILE.h * 1.2) {
      stamp(['t_shore-a', 't_shore-b', 't_shore-c'][(gx + gy) % 3], wx, wy, TW, -900)
    } else {
      stamp((gx + gy) % 2 ? 't_water' : 't_water-deep', wx, wy, TW, -900)
    }
  }

  // Büyük ve yumuşak doğal ton lekeleri (checkerboard algısını daha da kırar).
  const variation = scene.add.graphics().setDepth(-880)
  const patchRnd = mulberry32(6161)
  const patchColors = [0x6f8e4e, 0x9c925c, 0x718d50, 0x947b50]
  for (let i = 0; i < 30; i++) {
    const x = wr.x + wr.w * (0.08 + patchRnd() * 0.84)
    const y = wr.y + (seaLine - wr.y) * (0.05 + patchRnd() * 0.9)
    const w = TILE.w * (3.5 + patchRnd() * 5)
    const h = TILE.h * (2.5 + patchRnd() * 4)
    variation.fillStyle(patchColors[i % patchColors.length], 0.055 + patchRnd() * 0.045)
    variation.fillEllipse(x, y, w, h)
  }

  // 3) TAŞ / TOPRAK katmanı.
  const g = scene.add.graphics().setDepth(-800)

  // Savunma temeli: siyah geometrik çizgi yerine toprak hendek + ince taş iz.
  const fpts = [...DEFENSE_FOUNDATION, DEFENSE_FOUNDATION[0]].map(p => V(p.screen.x, p.screen.y))
  g.lineStyle(TILE.w * 0.34, 0x66523b, 0.42); g.strokePoints(fpts, false)
  g.lineStyle(TILE.w * 0.18, 0x40382b, 0.26); g.strokePoints(fpts, false)
  g.lineStyle(TILE.w * 0.055, 0xa38f68, 0.58); g.strokePoints(fpts, false)

  // Yol hiyerarşisi: ana arter > yan sokak > kıyı/rıhtım bağlantısı.
  // Çok-geçişli çizim kavşaklarda tek tek yol üst üste binme izlerini azaltır.
  const curves = roadCurves(V)

  for (const r of curves) {
    const s = ROAD_STYLE[r.kind]
    g.lineStyle(TILE.w * s.shoulderW, s.shoulder, s.shoulderAlpha)
    r.curve.draw(g, 32)
  }
  for (const r of curves) {
    const s = ROAD_STYLE[r.kind]
    g.lineStyle(TILE.w * s.borderW, s.border, 0.96)
    r.curve.draw(g, 32)
  }
  for (const r of curves) {
    const s = ROAD_STYLE[r.kind]
    g.lineStyle(TILE.w * s.fillW, s.fill, 0.99)
    r.curve.draw(g, 32)
  }
  for (const r of curves) {
    const s = ROAD_STYLE[r.kind]
    g.lineStyle(TILE.w * s.highlightW, s.highlight, r.kind === 'avenue' ? 0.46 : 0.38)
    r.curve.draw(g, 32)
  }

  const pad = (
    cx: number, cy: number, w: number, h: number,
    fill: number, edge: number, fillAlpha = 0.72, edgeAlpha = 0.7,
  ) => {
    const d = diamond(cx, cy, w, h)
    g.fillStyle(fill, fillAlpha); g.fillPoints(d, true)
    g.lineStyle(2.2, edge, edgeAlpha); g.strokePoints(d, true)
  }

  const hall = slotById(HALL_SLOT_ID)!
  // Belediye meydanı: görkemli ama bina tabanını yutmayan, iki tonlu taş plaza.
  pad(hall.screen.x, hall.screen.y, FOOTPRINT_DIAMOND_W * 1.72, FOOTPRINT_DIAMOND_W * 0.86, 0xbfae82, 0x8e7c59, 0.8, 0.72)
  pad(hall.screen.x, hall.screen.y, GROUND_TARGET_W * 1.02, GROUND_TARGET_D * 1.02, 0xd4c79f, 0xa7956d, 0.52, 0.42)

  // Normal arsalar: düz dev bej elmas değil; zemine karışan taş bordür + sıkıştırılmış toprak.
  for (const s of CITY_SLOTS) {
    if (s.id === HALL_SLOT_ID) continue
    pad(s.screen.x, s.screen.y, GROUND_TARGET_W * 1.02, GROUND_TARGET_D * 1.02, 0xb9aa7c, 0x91805c, 0.62, 0.58)
    pad(s.screen.x, s.screen.y + 1, GROUND_TARGET_W * 0.83, GROUND_TARGET_D * 0.83, 0xb8a56f, 0xa18d60, 0.28, 0.26)
  }

  // Kıyı: yol denize saplanmaz; yol footprint kenarında biter, burada rıhtım/apron başlar.
  for (const s of COAST_SLOTS) {
    pad(s.screen.x, s.screen.y, GROUND_TARGET_W * 1.24, GROUND_TARGET_D * 1.18, 0x998a68, 0x655943, 0.88, 0.82)
    pad(s.screen.x, s.screen.y - TILE.h * 0.08, GROUND_TARGET_W * 0.92, GROUND_TARGET_D * 0.88, 0xb1a17d, 0x7c6d50, 0.58, 0.5)
  }

  // Savunma yuvaları: koyu siyah karo yerine kazılmış toprak temel.
  for (const s of DEFENSE_SLOTS) {
    pad(s.screen.x, s.screen.y, GROUND_TARGET_W * 0.96, GROUND_TARGET_D * 0.96, 0x78664a, 0x544632, 0.54, 0.62)
    pad(s.screen.x, s.screen.y, GROUND_TARGET_W * 0.68, GROUND_TARGET_D * 0.68, 0x554838, 0x6e5b41, 0.2, 0.28)
  }

  // 4) DEKOR. Dama gibi eşit serpme yerine yol kenarı KÜMELERİ + seyrek boş arazi.
  const occ = [...CITY_SLOTS, ...COAST_SLOTS, ...DEFENSE_SLOTS]
  const clearForDecor = (wx: number, wy: number, margin = 0.9) =>
    wy < seaLine - TILE.h * 0.9 && !occ.some(s => nearSlot(wx, wy, s, margin))
  const kinds = ['d_olive-tree', 'd_bush', 'd_flower', 'd_bush', 'd_olive-tree', 'd_flower', 'd_rock']
  let di = 0
  const decorRnd = mulberry32(4242)
  const placeDecor = (wx: number, wy: number, forced?: string, alpha = 1) => {
    if (!clearForDecor(wx, wy)) return
    const key = forced ?? kinds[di++ % kinds.length]
    const width = key.includes('olive') ? TILE.w * (0.78 + decorRnd() * 0.15) : TILE.w * (0.42 + decorRnd() * 0.16)
    stamp(key, wx, wy, width, -700, 0.92, alpha)
  }

  // Yol kenarı kümeleri: curve tangent'ının dikine 55–100 px dışarı.
  const clusterRnd = mulberry32(9917)
  for (let i = 0; i < curves.length; i++) {
    const r = curves[i]
    if (i % 2 !== 0 && clusterRnd() > 0.45) continue
    for (const t of [0.28, 0.68]) {
      if (clusterRnd() > 0.62) continue
      const p = r.curve.getPoint(t)
      const tangent = r.curve.getTangent(t)
      const side = clusterRnd() > 0.5 ? 1 : -1
      const offset = TILE.w * (0.44 + clusterRnd() * 0.28) * side
      const len = Math.hypot(tangent.x, tangent.y) || 1
      const nx = -tangent.y / len, ny = tangent.x / len
      const x = p.x + nx * offset, y = p.y + ny * offset
      placeDecor(x, y)
      if (clusterRnd() < 0.42) placeDecor(x + nx * TILE.w * 0.2 + (clusterRnd() - 0.5) * 20, y + ny * TILE.h * 0.35, 'd_flower', 0.9)
    }
  }

  // Şehrin boş alanlarında çok daha seyrek tekil dekor.
  const sparseRnd = mulberry32(1337)
  for (let gx = 25; gx <= 97; gx += 2) for (let gy = 43; gy <= 112; gy += 2) {
    if (sparseRnd() > 0.055) continue
    const wx = (gx - gy) * (TILE.w / 2) + (sparseRnd() - 0.5) * TILE.w * 0.35
    const wy = (gx + gy) * (TILE.h / 2) + (sparseRnd() - 0.5) * TILE.h * 0.5
    placeDecor(wx, wy)
  }
}
