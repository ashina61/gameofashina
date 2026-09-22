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
export function buildCityTerrain(scene: Phaser.Scene, divanLevel = 1, occupiedSlotIds: string[] = []) {
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
  g0.fillStyle(0x9aa46b, 1); g0.fillRect(wr.x, wr.y, wr.w, wr.h)
  g0.fillStyle(0x58a7aa, 1); g0.fillRect(wr.x, seaLine, wr.w, wr.y + wr.h - seaLine)
  g0.fillStyle(0x2d777f, 1); g0.fillRect(wr.x, seaLine + TILE.h * 3.1, wr.w, wr.y + wr.h - seaLine - TILE.h * 3.1)

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
  for (let i = 0; i < 36; i++) {
    const x = wr.x + landRnd() * wr.w
    const y = wr.y + landRnd() * Math.max(TILE.h, seaLine - wr.y - TILE.h)
    organicPatch(
      x, y,
      TILE.w * (1.2 + landRnd() * 3.4),
      TILE.h * (1.3 + landRnd() * 3.8),
      landColors[i % landColors.length],
      0.028 + landRnd() * 0.055,
      9 + Math.floor(landRnd() * 6),
    )
  }

  // Çok az sayıda gerçek doku; rastgele konum, farklı ölçek ve çok düşük alfa.
  // Bu yalnızca yüzeye boya tanesi verir, karo oluşturmaz.
  for (let i = 0; i < 11; i++) {
    const x = wr.x + landRnd() * wr.w
    const y = wr.y + landRnd() * Math.max(TILE.h, seaLine - wr.y - TILE.h)
    const key = i % 5 === 0 ? 't_dirt' : i % 7 === 0 ? 't_stone' : 't_grass'
    const size = TILE.w * (3.8 + landRnd() * 3.2)
    stamp(key, x, y, size, -895, 0.55, key === 't_grass' ? 0.055 : 0.038)
  }

  // Kesintisiz, hafif düzensiz sahil şeridi: çim → kuru kum → ıslak kum → su.
  const coastRnd = mulberry32(2209)
  const shoreTop: Phaser.Math.Vector2[] = []
  const wetLine: Phaser.Math.Vector2[] = []
  const shoreBottom: Phaser.Math.Vector2[] = []
  const coastStep = TILE.w * 0.52
  for (let x = wr.x - coastStep; x <= wr.x + wr.w + coastStep; x += coastStep) {
    const y = seaLine + (coastRnd() - 0.5) * TILE.h * 0.36
    const depth = TILE.h * (0.86 + coastRnd() * 0.34)
    shoreTop.push(V(x, y))
    wetLine.push(V(x, y + depth * 0.54))
    shoreBottom.push(V(x, y + depth))
  }
  terrain.fillStyle(0xd0bc86, 0.96)
  terrain.fillPoints([...shoreTop, ...[...shoreBottom].reverse()], true)
  terrain.fillStyle(0xa99468, 0.36)
  terrain.fillPoints([...wetLine, ...[...shoreBottom].reverse()], true)
  terrain.lineStyle(4, 0xe6d8ad, 0.50)
  terrain.strokePoints(wetLine, false)
  terrain.lineStyle(2, 0x66794d, 0.22)
  terrain.strokePoints(shoreTop, false)

  // Su artık karo değil: iki tonlu taban üstünde yatay/kıvrımlı köpük izleri.
  const water = scene.add.graphics().setDepth(-899)
  const waterRnd = mulberry32(8145)
  for (let i = 0; i < 68; i++) {
    const x = wr.x + waterRnd() * wr.w
    const y = seaLine + TILE.h * 0.8 + waterRnd() * Math.max(TILE.h, wr.y + wr.h - seaLine - TILE.h)
    const w = TILE.w * (0.35 + waterRnd() * 1.35)
    const h = 1.2 + waterRnd() * 2.2
    water.fillStyle(waterRnd() > 0.35 ? 0xd3e8df : 0x8dc6c3, 0.055 + waterRnd() * 0.11)
    water.fillEllipse(x, y, w, h)
  }
  for (let i = 0; i < 7; i++) {
    const x = wr.x + waterRnd() * wr.w
    const y = seaLine + TILE.h * (1.6 + waterRnd() * 5.4)
    stamp(i % 2 ? 't_water' : 't_water-deep', x, y, TILE.w * (4.5 + waterRnd() * 3), -898, 0.55, 0.09)
  }

  // Yakın plan mikro doku: kuru ot, çakıl, renk kırılması.
  const micro = scene.add.graphics().setDepth(-887)
  const microRnd = mulberry32(77123)
  for (let i = 0; i < 320; i++) {
    const x = wr.x + microRnd() * wr.w
    const y = wr.y + microRnd() * Math.max(0, seaLine - wr.y - TILE.h)
    const roll = microRnd()
    micro.fillStyle(roll > 0.62 ? 0xd8c78c : roll > 0.28 ? 0x546d43 : 0x8d764e, 0.035 + microRnd() * 0.065)
    micro.fillEllipse(x, y, 1.5 + microRnd() * 5.5, 0.8 + microRnd() * 2.1)
  }

  // Büyük yumuşak ton geçişleri.
  const variation = scene.add.graphics().setDepth(-880)
  const patchRnd = mulberry32(6161)
  const patchColors = [0x5f7b47, 0xb09562, 0x718d50, 0x8b754d]
  for (let i = 0; i < 24; i++) {
    const x = wr.x + wr.w * (0.04 + patchRnd() * 0.92)
    const y = wr.y + (seaLine - wr.y) * (0.03 + patchRnd() * 0.94)
    variation.fillStyle(patchColors[i % patchColors.length], 0.022 + patchRnd() * 0.032)
    variation.fillEllipse(x, y, TILE.w * (4 + patchRnd() * 7), TILE.h * (3 + patchRnd() * 6))
  }

  // 3) TAŞ / TOPRAK katmanı.
  const g = scene.add.graphics().setDepth(-800)

  // Savunma temeli: siyah geometrik çizgi yerine toprak hendek + ince taş iz.
  const fpts = [...DEFENSE_FOUNDATION, DEFENSE_FOUNDATION[0]].map(p => V(p.screen.x, p.screen.y))
  g.lineStyle(TILE.w * 0.11, 0x725d43, 0.035); g.strokePoints(fpts, false)
  g.lineStyle(TILE.w * 0.035, 0x584735, 0.055); g.strokePoints(fpts, false)

  // Yollar zemin/pad altında AYRI Graphics katmanında: Divan yükselince
  // yalnızca bu katman yenilenir; ağaçlar, binalar, kamera ve kayıt değişmez.
  const allCurves = roadCurves(V)
  const curves = displayRoadCurves(allCurves)
  const coastSorted = [...COAST_SLOTS].sort((a, b) => a.screen.x - b.screen.x)
  const quaySpine = new Phaser.Curves.Spline(
    coastSorted.map(s => V(s.screen.x, s.screen.y - TILE.h * 0.12)),
  )
  const roads = scene.add.graphics().setDepth(-801)
  let lastRoadKey = ''

  const updateRoads = (level: number, activeSlotIds: string[] = occupiedSlotIds) => {
    const tier = roadTierForHallLevel(level)
    const active = new Set(activeSlotIds)
    active.add(HALL_SLOT_ID)
    const roadKey = tier + ':' + [...active].sort().join(',')
    if (roadKey === lastRoadKey) return
    lastRoadKey = roadKey
    roads.clear()

    // Ikariam benzeri sunum: boş arsalara giden sokaklar görünmez.
    // Ana omurga çok hafif kalır; yan yollar yalnızca kurulu bir yapıya
    // gerçekten hizmet ediyorsa çizilir.
    const visibleCurves = curves.filter(r =>
      r.kind === 'avenue' || active.has(r.from) || active.has(r.to),
    )

    // Liman semti oyuncuya sistem geometrisi olarak gösterilmez.
    // İlk liman/tersane kurulunca ortak rıhtım yolu sahneye doğal biçimde gelir.
    const hasHarbour = COAST_SLOTS.some(s => active.has(s.id))
    if (hasHarbour) {
      const quayStyle = roadStyleFor('quay', level)
      roads.lineStyle(TILE.w * 0.27, 0x5e5548, 0.28)
      quaySpine.draw(roads, 60)
      roads.lineStyle(TILE.w * 0.19, quayStyle.border, 0.48)
      quaySpine.draw(roads, 60)
      roads.lineStyle(TILE.w * 0.135, quayStyle.fill, 0.66)
      quaySpine.draw(roads, 60)
    }

    // Çok geçişli çizim, kavşakların düzgün birleşmesini sağlar.
    for (const r of visibleCurves) {
      const s = roadStyleFor(r.kind, level)
      roads.lineStyle(TILE.w * s.shoulderW, s.shoulder, s.shoulderAlpha)
      r.curve.draw(roads, 36)
    }
    for (const r of visibleCurves) {
      const s = roadStyleFor(r.kind, level)
      roads.lineStyle(TILE.w * s.borderW, s.border, s.borderAlpha)
      r.curve.draw(roads, 36)
    }
    for (const r of visibleCurves) {
      const s = roadStyleFor(r.kind, level)
      const fillAlpha = r.kind === 'avenue' ? 0.68 : r.kind === 'quay' ? 0.70 : 0.50
      roads.lineStyle(TILE.w * s.fillW, s.fill, fillAlpha)
      r.curve.draw(roads, 36)
    }

    // Boyalı merkez şeridi YOK: küçük düzensiz taşlar ve toprak tonları
    // Osmanlı sokak dokusu verir; desen sabittir ve kamera kayınca oynamaz.
    const rnd = mulberry32(68511)
    for (const r of visibleCurves) {
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
        roads.fillStyle(isDirt ? 0x675338 : s.stoneColor, isDirt ? 0.12 : 0.14 + rnd() * 0.14)
        roads.fillEllipse(x, y, stoneW, stoneH)
      }
    }
  }
  updateRoads(divanLevel, occupiedSlotIds)

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
  pad(hall.screen.x, hall.screen.y + 2, FOOTPRINT_DIAMOND_W * 1.08, FOOTPRINT_DIAMOND_W * 0.54, 0xae9c73, 0x8d7d5d, 0.18, 0.16)

  // Normal şehir görünümünde boş arsaların footprint'i tamamen gizlidir.
  // Etkileşim alanı ve inşa highlight'ı Phaser katmanında korunur.

  // Coast slotları da normal görünümde platform/elmas olarak çizilmez.
  // Rıhtım kimliğini ortak kıyı promenadı ve kurulu liman/tersane verir.

  // Savunma slotları normal görünümde gizli; sur inşa edilince bina katmanı gösterir.

  // 4) DOĞAL KÜMELER. Tek tek serpilmiş objeler yerine büyük yeşil kütleler.
  const occ = [...CITY_SLOTS, ...COAST_SLOTS, ...DEFENSE_SLOTS]
  const roadSamples = [
    ...curves.flatMap(r => Array.from({ length: 24 }, (_, i) => r.curve.getPoint(i / 23))),
    ...Array.from({ length: 48 }, (_, i) => quaySpine.getPoint(i / 47)),
  ]
  const initialOccupied = new Set(occupiedSlotIds)
  initialOccupied.add(HALL_SLOT_ID)
  const clearForDecor = (wx: number, wy: number, margin = 0.88) =>
    wy < seaLine - TILE.h * 0.55 &&
    !occ.some(s => nearSlot(
      wx, wy, s,
      initialOccupied.has(s.id) ? margin : Math.min(margin, s.fixed ? 0.90 : 0.66),
    )) &&
    !roadSamples.some(p => Math.hypot(p.x - wx, p.y - wy) < TILE.w * 0.18)

  const groveFloor = scene.add.graphics().setDepth(-706)
  const clusterRnd = mulberry32(9917)
  const put = (key: string, x: number, y: number, width: number, alpha = 1) => {
    if (!clearForDecor(x, y)) return false
    stamp(key, x, y, width, -700, 0.92, alpha)
    return true
  }
  const cluster = (cx: number, cy: number, radiusX: number, radiusY: number, strength = 1) => {
    if (!clearForDecor(cx, cy, 0.72)) return
    groveFloor.fillStyle(0x526f3d, 0.028 * strength)
    groveFloor.fillEllipse(cx, cy + TILE.h * 0.16, radiusX * 1.45, radiusY * 0.95)
    const count = 3 + Math.floor(clusterRnd() * 4 * strength)
    for (let i = 0; i < count; i++) {
      const a = clusterRnd() * Math.PI * 2
      const rr = Math.sqrt(clusterRnd())
      const x = cx + Math.cos(a) * radiusX * rr
      const y = cy + Math.sin(a) * radiusY * rr
      const roll = clusterRnd()
      const key = roll < 0.42 ? 'd_olive-tree' : roll < 0.76 ? 'd_bush' : roll < 0.90 ? 'd_flower' : 'd_rock'
      const width = key === 'd_olive-tree'
        ? TILE.w * (0.50 + clusterRnd() * 0.12)
        : key === 'd_bush'
          ? TILE.w * (0.24 + clusterRnd() * 0.08)
          : TILE.w * (0.20 + clusterRnd() * 0.07)
      put(key, x, y, width, 0.78 + clusterRnd() * 0.16)
    }
  }

  // Yol kenarlarında az ama belirgin bitki kütleleri.
  for (const r of curves) {
    for (const t of [0.22, 0.74]) {
      if (clusterRnd() > (r.kind === 'avenue' ? 0.34 : 0.22)) continue
      const p = r.curve.getPoint(t)
      const tangent = r.curve.getTangent(t)
      const len = Math.hypot(tangent.x, tangent.y) || 1
      const nx = -tangent.y / len, ny = tangent.x / len
      const side = clusterRnd() > 0.5 ? 1 : -1
      const off = TILE.w * (0.52 + clusterRnd() * 0.18) * side
      cluster(p.x + nx * off, p.y + ny * off, TILE.w * 0.48, TILE.h * 0.72, 0.9)
    }
  }

  // Büyük boşlukları 20–24 doğal koruluk doldurur; grid hissi vermez.
  for (let i = 0; i < 34; i++) {
    const x = wr.x + wr.w * (0.06 + clusterRnd() * 0.88)
    const y = wr.y + (seaLine - wr.y) * (0.07 + clusterRnd() * 0.84)
    if (clusterRnd() < 0.68) {
      cluster(
        x, y,
        TILE.w * (0.52 + clusterRnd() * 0.58),
        TILE.h * (0.62 + clusterRnd() * 0.82),
        0.82 + clusterRnd() * 0.42,
      )
    }
  }

  // Sahile yakın yerlerde az sayıda kaya/çalı kütlesi.
  for (let i = 0; i < 16; i++) {
    const x = wr.x + wr.w * (0.05 + clusterRnd() * 0.90)
    const y = seaLine - TILE.h * (0.65 + clusterRnd() * 2.3)
    if (!clearForDecor(x, y, 0.68)) continue
    put('d_rock', x, y, TILE.w * (0.24 + clusterRnd() * 0.10), 0.76)
    if (clusterRnd() < 0.46) put('d_bush', x + (clusterRnd() - 0.5) * 42, y - 8, TILE.w * 0.24, 0.74)
  }
  return { updateRoads }
}
