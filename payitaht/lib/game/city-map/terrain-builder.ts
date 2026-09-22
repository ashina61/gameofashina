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
import { roadStyleFor, roadTierForHallLevel, type RoadKind } from './road-style'

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

/**
 * Kıyıda eski görünümde her coast slotuna şehirden ayrı uzun bir yol gidiyordu;
 * mobilde bu altı kollu bir "örümcek" gibi görünüyordu. RoadGraph değişmeden,
 * yalnızca GÖRSELDE her kara bağlantı grubunun kıyıya en doğal tek besleyicisi
 * tutulur. Coast slotlarının birbirine bağlantısı aşağıdaki rıhtım promenadıdır.
 */
function displayRoadCurves(curves: RoadCurve[]): RoadCurve[] {
  const inland = curves.filter(r => r.kind !== 'quay')
  const grouped = new Map<string, RoadCurve[]>()
  for (const r of curves.filter(r => r.kind === 'quay')) {
    const cityId = r.from.startsWith('coast_') ? r.to : r.from
    const list = grouped.get(cityId) ?? []
    list.push(r)
    grouped.set(cityId, list)
  }
  const feeders: RoadCurve[] = []
  for (const [cityId, list] of grouped) {
    const city = slotById(cityId)
    if (!city) continue
    const best = [...list].sort((a, b) => {
      const aid = a.from.startsWith('coast_') ? a.from : a.to
      const bid = b.from.startsWith('coast_') ? b.from : b.to
      const ax = slotById(aid)?.screen.x ?? 0
      const bx = slotById(bid)?.screen.x ?? 0
      return Math.abs(ax - city.screen.x) - Math.abs(bx - city.screen.x)
    })[0]
    if (best) feeders.push(best)
  }
  return [...inland, ...feeders]
}

/** İzometrik footprint'e yeterince yakın mı? Dekoru arsalardan uzak tutar. */
function nearSlot(wx: number, wy: number, slot: CitySlot, margin = 1) {
  const dx = Math.abs(slot.screen.x - wx)
  const dy = Math.abs(slot.screen.y - wy)
  return dx + 2 * dy < FOOTPRINT_DIAMOND_W * margin
}

/** Katmanlı şehir zeminini sahneye kurar. Bina sprite'larından ÖNCE bir kez çağrılır. */
export function buildCityTerrain(scene: Phaser.Scene, divanLevel = 1) {
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
  g0.fillStyle(0x829a5b, 1); g0.fillRect(wr.x, wr.y, wr.w, wr.h)
  g0.fillStyle(0x398b8a, 1); g0.fillRect(wr.x, seaLine, wr.w, wr.y + wr.h - seaLine)
  g0.fillStyle(0x17545a, 1); g0.fillRect(wr.x, seaLine + TILE.h * 3.1, wr.w, wr.y + wr.h - seaLine - TILE.h * 3.1)

  // 2) ARAZİ DOKUSU.
  // Grass PNG artık "ana zemin" değildir; opak damalar ekran görüntüsünde
  // dev satranç tahtası gibi görünüyordu. Düz tabanın üstüne düşük alfa,
  // üst üste binen ve hafif kaydırılmış doku lekeleri serilir.
  const TW = TILE.w * 3.15
  const landRnd = mulberry32(90210)
  const grassTints = [0xffffff, 0xf4efd7, 0xe7eed5, 0xeee4c7, 0xf6f2df]
  for (let gx = 20; gx <= 102; gx += 3) for (let gy = 38; gy <= 120; gy += 3) {
    const baseX = (gx - gy) * (TILE.w / 2), baseY = (gx + gy) * (TILE.h / 2)
    const wx = baseX + (landRnd() - 0.5) * TILE.w * 0.55
    const wy = baseY + (landRnd() - 0.5) * TILE.h * 0.72
    if (wx < wr.x - TW || wx > wr.x + wr.w + TW || wy < wr.y - TW || wy > wr.y + wr.h + TW) continue
    if (wy < seaLine - TILE.h) {
      const tint = grassTints[(gx * 17 + gy * 31) % grassTints.length]
      stamp('t_grass', wx, wy, TW, -900, 0.55, 0.34, tint)
      const roll = landRnd()
      if (roll < 0.16) stamp('t_dirt', wx + (landRnd() - 0.5) * TILE.w * 1.5, wy, TW * 0.95, -886, 0.55, 0.10)
      else if (roll < 0.23) stamp('t_stone', wx, wy, TW * 0.80, -886, 0.55, 0.065)
    } else if (wy < seaLine + TILE.h * 1.2) {
      stamp(['t_shore-a', 't_shore-b', 't_shore-c'][(gx + gy) % 3], wx, wy, TW, -900, 0.55, 0.72)
    } else {
      stamp((gx + gy) % 2 ? 't_water' : 't_water-deep', wx, wy, TW * 1.08, -900, 0.55, 0.58)
    }
  }

  // Yakından bakıldığında zemin boş bir renk alanı olmasın: tek Graphics
  // üzerinde çok hafif kuru ot/çakıl benekleri. Izgara hizasına bağlı değildir.
  const micro = scene.add.graphics().setDepth(-887)
  const microRnd = mulberry32(77123)
  for (let i = 0; i < 420; i++) {
    const x = wr.x + microRnd() * wr.w
    const y = wr.y + microRnd() * Math.max(0, seaLine - wr.y - TILE.h)
    if (y >= seaLine - TILE.h) continue
    const pale = microRnd() > 0.48
    micro.fillStyle(pale ? 0xd0c28b : 0x566f43, 0.08 + microRnd() * 0.08)
    micro.fillEllipse(x, y, 2 + microRnd() * 5, 1 + microRnd() * 2.4)
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
  g.lineStyle(TILE.w * 0.48, 0x766045, 0.20); g.strokePoints(fpts, false)
  g.lineStyle(TILE.w * 0.20, 0x5b4636, 0.30); g.strokePoints(fpts, false)
  g.lineStyle(TILE.w * 0.045, 0xa8926c, 0.34); g.strokePoints(fpts, false)

  // Yollar zemin/pad altında AYRI Graphics katmanında: Divan yükselince
  // yalnızca bu katman yenilenir; ağaçlar, binalar, kamera ve kayıt değişmez.
  const allCurves = roadCurves(V)
  const curves = displayRoadCurves(allCurves)
  const coastSorted = [...COAST_SLOTS].sort((a, b) => a.screen.x - b.screen.x)
  const quaySpine = new Phaser.Curves.Spline(
    coastSorted.map(s => V(s.screen.x, s.screen.y - TILE.h * 0.12)),
  )
  const roads = scene.add.graphics().setDepth(-801)
  let lastRoadTier = 0

  const updateRoads = (level: number) => {
    const tier = roadTierForHallLevel(level)
    if (tier === lastRoadTier) return
    lastRoadTier = tier
    roads.clear()

    // Altı ayrı uzun iskele yolunun yerine tek kıyı promenadı + iki besleyici.
    const quayStyle = roadStyleFor('quay', level)
    roads.lineStyle(TILE.w * 0.46, 0x5e5548, 0.56)
    quaySpine.draw(roads, 60)
    roads.lineStyle(TILE.w * 0.33, quayStyle.border, 0.86)
    quaySpine.draw(roads, 60)
    roads.lineStyle(TILE.w * 0.245, quayStyle.fill, 0.95)
    quaySpine.draw(roads, 60)

    // Çok geçişli çizim, kavşakların düzgün birleşmesini sağlar.
    for (const r of curves) {
      const s = roadStyleFor(r.kind, level)
      roads.lineStyle(TILE.w * s.shoulderW, s.shoulder, s.shoulderAlpha)
      r.curve.draw(roads, 36)
    }
    for (const r of curves) {
      const s = roadStyleFor(r.kind, level)
      roads.lineStyle(TILE.w * s.borderW, s.border, s.borderAlpha)
      r.curve.draw(roads, 36)
    }
    for (const r of curves) {
      const s = roadStyleFor(r.kind, level)
      roads.lineStyle(TILE.w * s.fillW, s.fill, 0.94)
      r.curve.draw(roads, 36)
    }

    // Boyalı merkez şeridi YOK: küçük düzensiz taşlar ve toprak tonları
    // Osmanlı sokak dokusu verir; desen sabittir ve kamera kayınca oynamaz.
    const rnd = mulberry32(68511)
    for (const r of curves) {
      const s = roadStyleFor(r.kind, level)
      const count = Math.max(4, Math.min(260, Math.round(
        r.curve.getLength() / TILE.w * (s.stoneDensity || 3),
      )))
      for (let i = 0; i < count; i++) {
        const t = (i + 0.2 + rnd() * 0.6) / count
        const p = r.curve.getPoint(t)
        const tangent = r.curve.getTangent(t)
        const len = Math.hypot(tangent.x, tangent.y) || 1
        const offset = (rnd() - 0.5) * TILE.w * s.fillW * 0.66
        const x = p.x - tangent.y / len * offset
        const y = p.y + tangent.x / len * offset
        const isDirt = tier === 1 && r.kind !== 'quay'
        const stoneW = isDirt ? 2 + rnd() * 3 : 2.5 + rnd() * (tier >= 3 ? 5 : 4)
        const stoneH = isDirt ? 1.4 + rnd() * 1.6 : 1.4 + rnd() * 2.2
        roads.fillStyle(isDirt ? 0x675338 : s.stoneColor, isDirt ? 0.20 : 0.24 + rnd() * 0.22)
        roads.fillEllipse(x, y, stoneW, stoneH)
      }
    }
  }
  updateRoads(divanLevel)

  const pad = (
    cx: number, cy: number, w: number, h: number,
    fill: number, edge: number, fillAlpha = 0.72, edgeAlpha = 0.7,
  ) => {
    const d = diamond(cx, cy, w, h)
    g.fillStyle(fill, fillAlpha); g.fillPoints(d, true)
    g.lineStyle(2.2, edge, edgeAlpha); g.strokePoints(d, true)
  }

  const hall = slotById(HALL_SLOT_ID)!
  // Divanhane altında ekran görüntüsündeki dev gri platform yok:
  // yapının tabanından yalnızca biraz büyük, sıcak taşlı kompakt meydan.
  pad(hall.screen.x, hall.screen.y + 2, FOOTPRINT_DIAMOND_W * 1.28, FOOTPRINT_DIAMOND_W * 0.64, 0xa89670, 0x817052, 0.46, 0.50)
  pad(hall.screen.x, hall.screen.y - 1, GROUND_TARGET_W * 0.94, GROUND_TARGET_D * 0.94, 0xc2b38c, 0x9c8964, 0.25, 0.26)

  // Her normal parsel AYNI 2x2 footprint: alçak taş bordür ve doğal toprak.
  // Düzenli dolu bej kare değil; kenarlarda ufak, düzensiz taş köşeler.
  for (const s of CITY_SLOTS) {
    if (s.id === HALL_SLOT_ID) continue
    pad(s.screen.x, s.screen.y + 3, GROUND_TARGET_W * 1.05, GROUND_TARGET_D * 1.05, 0x796b4c, 0x75674a, 0.22, 0.32)
    pad(s.screen.x, s.screen.y, GROUND_TARGET_W, GROUND_TARGET_D, 0xb3a177, 0x998660, 0.40, 0.68)
    pad(s.screen.x, s.screen.y - 1, GROUND_TARGET_W * 0.87, GROUND_TARGET_D * 0.87, 0xb6aa81, 0xa69971, 0.15, 0.20)
    for (const side of [-1, 1]) {
      g.fillStyle(0xc9bb96, 0.50)
      g.fillEllipse(s.screen.x + side * GROUND_TARGET_W * 0.42, s.screen.y, 9, 4)
    }
  }

  // 6 coast slotu tek bir liman semtinin parçaları gibi görünür.
  // Her slot yine bağımsız ve aynı footprint; aralarında ortak kıyı promenadı var.
  for (const s of COAST_SLOTS) {
    const x = s.screen.x, y = s.screen.y
    pad(x, y + 6, GROUND_TARGET_W * 1.28, GROUND_TARGET_D * 1.18, 0x4d574f, 0x384942, 0.34, 0.20)
    pad(x, y, GROUND_TARGET_W * 1.20, GROUND_TARGET_D * 1.12, 0x9d8f70, 0x655948, 0.94, 0.92)
    pad(x, y - 2, GROUND_TARGET_W * 0.96, GROUND_TARGET_D * 0.92, 0xb7aa89, 0xcec09d, 0.54, 0.46)
    // Çok uzun ince köprü yerine kısa ve geniş bağlama çıkıntısı.
    g.fillStyle(0x654d35, 0.78)
    g.fillPoints([V(x - 22, y + GROUND_TARGET_D * 0.42), V(x + 22, y + GROUND_TARGET_D * 0.42),
      V(x + 22, y + GROUND_TARGET_D * 0.86), V(x - 22, y + GROUND_TARGET_D * 0.86)], true)
    g.lineStyle(2, 0xc0a77b, 0.55)
    g.lineBetween(x - 19, y + GROUND_TARGET_D * 0.63, x + 19, y + GROUND_TARGET_D * 0.63)
  }

  // Savunma yapılmadan sur KURULMUŞ görünmesin: toprak kazı + seyrek taş izi.
  for (const s of DEFENSE_SLOTS) {
    pad(s.screen.x, s.screen.y, GROUND_TARGET_W * 0.96, GROUND_TARGET_D * 0.96, 0x78664a, 0x544632, 0.38, 0.46)
    pad(s.screen.x, s.screen.y, GROUND_TARGET_W * 0.65, GROUND_TARGET_D * 0.65, 0x554838, 0x6e5b41, 0.12, 0.20)
    g.fillStyle(0xb2a17a, 0.42)
    for (const side of [-1, 0, 1]) g.fillEllipse(s.screen.x + side * 20, s.screen.y - 3, 8, 3)
  }

  // 4) DEKOR. Dama gibi eşit serpme yerine yol kenarı KÜMELERİ + seyrek boş arazi.
  const occ = [...CITY_SLOTS, ...COAST_SLOTS, ...DEFENSE_SLOTS]
  // Yol üstüne ağaç/çalı çıkmasın (önceden yalnızca arsalara bakılıyordu).
  const roadSamples = [
    ...curves.flatMap(r => Array.from({ length: 24 }, (_, i) => r.curve.getPoint(i / 23))),
    ...Array.from({ length: 48 }, (_, i) => quaySpine.getPoint(i / 47)),
  ]
  const clearForDecor = (wx: number, wy: number, margin = 0.9) =>
    wy < seaLine - TILE.h * 0.9 &&
    !occ.some(s => nearSlot(wx, wy, s, margin)) &&
    !roadSamples.some(p => Math.hypot(p.x - wx, p.y - wy) < TILE.w * 0.26)
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
  return { updateRoads }
}
