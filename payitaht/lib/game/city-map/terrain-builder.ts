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
export const DECOR_TILES = ['olive-tree', 'bush', 'flower', 'rock', 'amphora', 'bench', 'cart', 'crate', 'lamp', 'barrel', 'barrel-water', 'fountain', 'market-stall', 'sign', 'statue'] as const

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

    // Tiled kontrol noktası topolojiyi belirler ama ekranda bazı yollar
    // gereğinden fazla yay çiziyordu. Kontrol noktasını orta noktaya doğru
    // sınırlandır; yol organik kalsın ama dev boş alanda dönüp dolaşmasın.
    const mx = (start.x + end.x) / 2
    const my = (start.y + end.y) / 2
    const vx = e.ctrl.x - mx
    const vy = e.ctrl.y - my
    const segment = Math.hypot(end.x - start.x, end.y - start.y)
    const bend = Math.hypot(vx, vy)
    const maxBend = segment * (kind === 'avenue' ? 0.20 : kind === 'street' ? 0.24 : 0.16)
    const bendScale = bend > 0 ? Math.min(1, maxBend / bend) : 0
    const blend = kind === 'avenue' ? 0.48 : kind === 'street' ? 0.56 : 0.42
    const ctrl = V(mx + vx * bendScale * blend, my + vy * bendScale * blend)

    out.push({
      from: e.from,
      to: e.to,
      kind,
      curve: new Phaser.Curves.QuadraticBezier(
        V(start.x, start.y),
        ctrl,
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

  // 2) ORGANİK ARAZİ.
  // Artık grid üstünde grass/water stamp YOK. Büyük ekranda görünen dama
  // deseninin ana sebebi buydu. Düz bir renk tabanı üstünde serbest biçimli
  // lekeler, birkaç düşük alfa doku ve mikro detay kullanılır.
  const terrain = scene.add.graphics().setDepth(-900)
  const landRnd = mulberry32(90210)
  const organicPatch = (
    cx: number, cy: number, rx: number, ry: number,
    color: number, alpha: number, points = 12,
  ) => {
    const verts: Phaser.Math.Vector2[] = []
    for (let i = 0; i < points; i++) {
      const a = (i / points) * Math.PI * 2
      const jitter = 0.72 + landRnd() * 0.38
      verts.push(V(cx + Math.cos(a) * rx * jitter, cy + Math.sin(a) * ry * jitter))
    }
    terrain.fillStyle(color, alpha)
    terrain.fillPoints(verts, true)
  }

  // Büyük doğal renk bölgeleri: izometrik hücrelere bağlı değiller.
  const landColors = [0x718b50, 0x93a765, 0xa99a62, 0x7e9559, 0x8c8356, 0x687f4a]
  for (let i = 0; i < 54; i++) {
    const x = wr.x + landRnd() * wr.w
    const y = wr.y + landRnd() * Math.max(TILE.h, seaLine - wr.y - TILE.h)
    organicPatch(
      x, y,
      TILE.w * (1.2 + landRnd() * 3.4),
      TILE.h * (1.3 + landRnd() * 3.8),
      landColors[i % landColors.length],
      0.035 + landRnd() * 0.075,
      9 + Math.floor(landRnd() * 6),
    )
  }

  // Çok az sayıda gerçek doku; rastgele konum, farklı ölçek ve çok düşük alfa.
  // Bu yalnızca yüzeye boya tanesi verir, karo oluşturmaz.
  for (let i = 0; i < 18; i++) {
    const x = wr.x + landRnd() * wr.w
    const y = wr.y + landRnd() * Math.max(TILE.h, seaLine - wr.y - TILE.h)
    const key = i % 5 === 0 ? 't_dirt' : i % 7 === 0 ? 't_stone' : 't_grass'
    const size = TILE.w * (3.8 + landRnd() * 3.2)
    stamp(key, x, y, size, -895, 0.55, key === 't_grass' ? 0.08 : 0.055)
  }

  // Kesintisiz, hafif düzensiz sahil şeridi.
  const coastRnd = mulberry32(2209)
  const shoreTop: Phaser.Math.Vector2[] = []
  const shoreBottom: Phaser.Math.Vector2[] = []
  const coastStep = TILE.w * 0.55
  for (let x = wr.x - coastStep; x <= wr.x + wr.w + coastStep; x += coastStep) {
    const y = seaLine + (coastRnd() - 0.5) * TILE.h * 0.42
    shoreTop.push(V(x, y))
    shoreBottom.push(V(x, y + TILE.h * (0.82 + coastRnd() * 0.38)))
  }
  terrain.fillStyle(0xc7af79, 0.94)
  terrain.fillPoints([...shoreTop, ...shoreBottom.reverse()], true)
  terrain.lineStyle(5, 0xe2d2a1, 0.62)
  terrain.strokePoints(shoreTop, false)

  // Su artık karo değil: iki tonlu taban üstünde yatay/kıvrımlı köpük izleri.
  const water = scene.add.graphics().setDepth(-899)
  const waterRnd = mulberry32(8145)
  for (let i = 0; i < 115; i++) {
    const x = wr.x + waterRnd() * wr.w
    const y = seaLine + TILE.h * 0.8 + waterRnd() * Math.max(TILE.h, wr.y + wr.h - seaLine - TILE.h)
    const w = TILE.w * (0.35 + waterRnd() * 1.35)
    const h = 1.2 + waterRnd() * 2.2
    water.fillStyle(waterRnd() > 0.35 ? 0xcce3d5 : 0x85c5c1, 0.08 + waterRnd() * 0.18)
    water.fillEllipse(x, y, w, h)
  }
  for (let i = 0; i < 11; i++) {
    const x = wr.x + waterRnd() * wr.w
    const y = seaLine + TILE.h * (1.6 + waterRnd() * 5.4)
    stamp(i % 2 ? 't_water' : 't_water-deep', x, y, TILE.w * (4.5 + waterRnd() * 3), -898, 0.55, 0.09)
  }

  // Yakın plan mikro doku: kuru ot, çakıl, renk kırılması.
  const micro = scene.add.graphics().setDepth(-887)
  const microRnd = mulberry32(77123)
  for (let i = 0; i < 760; i++) {
    const x = wr.x + microRnd() * wr.w
    const y = wr.y + microRnd() * Math.max(0, seaLine - wr.y - TILE.h)
    const roll = microRnd()
    micro.fillStyle(roll > 0.62 ? 0xd8c78c : roll > 0.28 ? 0x546d43 : 0x8d764e, 0.055 + microRnd() * 0.10)
    micro.fillEllipse(x, y, 1.5 + microRnd() * 5.5, 0.8 + microRnd() * 2.1)
  }

  // Büyük yumuşak ton geçişleri.
  const variation = scene.add.graphics().setDepth(-880)
  const patchRnd = mulberry32(6161)
  const patchColors = [0x5f7b47, 0xb09562, 0x718d50, 0x8b754d]
  for (let i = 0; i < 38; i++) {
    const x = wr.x + wr.w * (0.04 + patchRnd() * 0.92)
    const y = wr.y + (seaLine - wr.y) * (0.03 + patchRnd() * 0.94)
    variation.fillStyle(patchColors[i % patchColors.length], 0.028 + patchRnd() * 0.048)
    variation.fillEllipse(x, y, TILE.w * (4 + patchRnd() * 7), TILE.h * (3 + patchRnd() * 6))
  }

  // 3) TAŞ / TOPRAK katmanı.
  const g = scene.add.graphics().setDepth(-800)

  // Savunma temeli: siyah geometrik çizgi yerine toprak hendek + ince taş iz.
  const fpts = [...DEFENSE_FOUNDATION, DEFENSE_FOUNDATION[0]].map(p => V(p.screen.x, p.screen.y))
  g.lineStyle(TILE.w * 0.20, 0x725d43, 0.12); g.strokePoints(fpts, false)
  g.lineStyle(TILE.w * 0.085, 0x584735, 0.17); g.strokePoints(fpts, false)
  g.lineStyle(TILE.w * 0.022, 0xa99570, 0.24); g.strokePoints(fpts, false)

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

  // Normal şehir görünümünde 24 arsa "bej elmas" olarak bağırmaz.
  // Yalnızca çok hafif sıkıştırılmış toprak izi vardır; gerçek build highlight
  // Phaser etkileşim katmanında, yalnızca İnşa/Taşıma kipinde gösterilir.
  for (const s of CITY_SLOTS) {
    if (s.id === HALL_SLOT_ID) continue
    pad(s.screen.x, s.screen.y + 1, GROUND_TARGET_W * 0.98, GROUND_TARGET_D * 0.98, 0x9a8b65, 0x7e704f, 0.055, 0.10)
    pad(s.screen.x, s.screen.y, GROUND_TARGET_W * 0.80, GROUND_TARGET_D * 0.80, 0xb5a77e, 0xa59670, 0.035, 0.045)
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

  // Savunma yuvaları da başlangıçta ancak yakından fark edilen kazı izleri.
  for (const s of DEFENSE_SLOTS) {
    pad(s.screen.x, s.screen.y, GROUND_TARGET_W * 0.90, GROUND_TARGET_D * 0.90, 0x78664a, 0x544632, 0.12, 0.20)
    g.fillStyle(0xb2a17a, 0.22)
    for (const side of [-1, 0, 1]) g.fillEllipse(s.screen.x + side * 18, s.screen.y - 2, 6, 2.5)
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
  const kinds = [
    'd_olive-tree', 'd_bush', 'd_flower', 'd_bush', 'd_rock',
    'd_olive-tree', 'd_flower', 'd_amphora', 'd_crate',
  ]
  let di = 0
  const decorRnd = mulberry32(4242)
  const decorWidth = (key: string) =>
    key.includes('olive') ? TILE.w * (0.66 + decorRnd() * 0.14)
      : key.includes('cart') ? TILE.w * 0.52
        : key.includes('bench') ? TILE.w * 0.38
          : key.includes('lamp') ? TILE.w * 0.26
            : key.includes('amphora') || key.includes('crate') ? TILE.w * 0.24
              : TILE.w * (0.32 + decorRnd() * 0.12)
  const placeDecor = (wx: number, wy: number, forced?: string, alpha = 1) => {
    if (!clearForDecor(wx, wy)) return
    const key = forced ?? kinds[di++ % kinds.length]
    stamp(key, wx, wy, decorWidth(key), -700, 0.92, alpha)
  }

  // Yol kenarları artık daha yaşanmış: doğal kümeler + seyrek şehir mobilyası.
  const clusterRnd = mulberry32(9917)
  for (let i = 0; i < curves.length; i++) {
    const r = curves[i]
    for (const t of [0.18, 0.40, 0.68, 0.84]) {
      if (clusterRnd() > (r.kind === 'avenue' ? 0.66 : 0.50)) continue
      const p = r.curve.getPoint(t)
      const tangent = r.curve.getTangent(t)
      const side = clusterRnd() > 0.5 ? 1 : -1
      const offset = TILE.w * (0.36 + clusterRnd() * 0.24) * side
      const len = Math.hypot(tangent.x, tangent.y) || 1
      const nx = -tangent.y / len, ny = tangent.x / len
      const x = p.x + nx * offset, y = p.y + ny * offset
      const urban = r.kind === 'avenue' && clusterRnd() < 0.38
      placeDecor(x, y, urban ? (clusterRnd() < 0.55 ? 'd_lamp' : 'd_bench') : undefined, 0.88)
      if (!urban && clusterRnd() < 0.52) {
        placeDecor(x + nx * TILE.w * 0.18 + (clusterRnd() - 0.5) * 18, y + ny * TILE.h * 0.28, 'd_flower', 0.82)
      }
      if (r.kind === 'avenue' && clusterRnd() < 0.18) {
        placeDecor(x - nx * TILE.w * 0.16, y - ny * TILE.h * 0.24, clusterRnd() < 0.5 ? 'd_amphora' : 'd_crate', 0.90)
      }
    }
  }

  // Oynanabilir alanın boş bölgeleri tamamen ölü görünmesin; grid koordinatına
  // bağlı olmayan deterministik tekil kümeler.
  const sparseRnd = mulberry32(1337)
  for (let i = 0; i < 96; i++) {
    const wx = wr.x + wr.w * (0.05 + sparseRnd() * 0.90)
    const wy = wr.y + (seaLine - wr.y) * (0.05 + sparseRnd() * 0.88)
    if (sparseRnd() < 0.72) placeDecor(wx, wy)
  }

  // Merkez çevresine birkaç medeniyet izi. clearForDecor çakışanı otomatik atlar.
  const hallProps: Array<[number, number, string]> = [
    [-TILE.w * 1.65, -TILE.h * 0.35, 'd_lamp'],
    [ TILE.w * 1.55, -TILE.h * 0.20, 'd_lamp'],
    [-TILE.w * 1.35,  TILE.h * 1.15, 'd_bench'],
    [ TILE.w * 1.42,  TILE.h * 1.05, 'd_amphora'],
  ]
  for (const [dx, dy, key] of hallProps) placeDecor(hall.screen.x + dx, hall.screen.y + dy, key, 0.92)
  return { updateRoads }
}
