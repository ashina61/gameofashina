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
import { edgeKey, roadEdgeKeysForTargets } from './road-tree'

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
function arterialEdgeKeys(): Set<string> {
  return roadEdgeKeysForTargets(COAST_SLOTS.map(s => s.id))
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
  // Deniz tek keskin iki renk BLOK değil; sığdan derine kademeli ton.
  const waterBands = [0x5aa9a2, 0x4b9b98, 0x3e8c8d, 0x317c81, 0x276e75, 0x1d6068, 0x17545a]
  const seaH = Math.max(1, wr.y + wr.h - seaLine)
  const bandH = seaH / waterBands.length
  for (let i = 0; i < waterBands.length; i++) {
    g0.fillStyle(waterBands[i], 1)
    g0.fillRect(wr.x, seaLine + i * bandH, wr.w, bandH + 2)
  }

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

  // Kıyı kenarında her yeri kaplamayan kaya çıkıntıları. Coast build slotlarının
  // önünü kapatmaz; sadece kıyı çizgisini "cetvelle çizilmiş" olmaktan çıkarır.
  for (let i = 2; i < shoreTop.length - 2; i += 3) {
    if (coastRnd() > 0.44) continue
    const p = shoreTop[i]
    const width = TILE.w * (0.20 + coastRnd() * 0.18)
    stamp('d_rock', p.x + (coastRnd() - 0.5) * TILE.w * 0.18,
      p.y - TILE.h * (0.02 + coastRnd() * 0.15),
      width, -705, 0.90, 0.72 + coastRnd() * 0.15)
  }

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

  // Savunma geometrisi normal şehir görünümünde saklıdır.
  // Sur/inşa kipi gerektiğinde ayrı etkileşim katmanı bunu gösterebilir.
  const fpts = [...DEFENSE_FOUNDATION, DEFENSE_FOUNDATION[0]].map(p => V(p.screen.x, p.screen.y))
  g.lineStyle(TILE.w * 0.035, 0x6c593f, 0.035); g.strokePoints(fpts, false)

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

    // Yalnızca Divanhane'den GERÇEKTEN kurulu slotlara ulaşan yol ağacı.
    // Boş parsellerin komşu yolları artık sırf yakında bina var diye görünmez.
    const visibleKeys = roadEdgeKeysForTargets(active)
    const hasHarbour = COAST_SLOTS.some(s => active.has(s.id))
    const visibleCurves = curves.filter(r => {
      const key = edgeKey(r.from, r.to)
      if (r.kind !== 'quay') return visibleKeys.has(key)
      if (!hasHarbour) return false
      const cityId = r.from.startsWith('coast_') ? r.to : r.from
      return visibleKeys.has(key) || active.has(cityId)
    })

    // Kıyı promenadı bir slot göstergesi değildir; ilk liman/tersane
    // kurulunca dünyaya doğal biçimde eklenir.
    if (hasHarbour) {
      const quayStyle = roadStyleFor('quay', level)
      roads.lineStyle(TILE.w * 0.25, 0x5e5548, 0.20)
      quaySpine.draw(roads, 60)
      roads.lineStyle(TILE.w * 0.18, quayStyle.border, 0.40)
      quaySpine.draw(roads, 60)
      roads.lineStyle(TILE.w * 0.125, quayStyle.fill, 0.58)
      quaySpine.draw(roads, 60)
    }

    // Çok geçişli çizim, kavşakların düzgün birleşmesini sağlar.
    for (const r of visibleCurves) {
      const s = roadStyleFor(r.kind, level)
      const alpha = r.kind === 'avenue' ? 0.62 : r.kind === 'street' ? 0.28 : 0.70
      roads.lineStyle(TILE.w * s.shoulderW, s.shoulder, s.shoulderAlpha * alpha)
      r.curve.draw(roads, 36)
    }
    for (const r of visibleCurves) {
      const s = roadStyleFor(r.kind, level)
      const alpha = r.kind === 'avenue' ? 0.58 : r.kind === 'street' ? 0.24 : 0.68
      roads.lineStyle(TILE.w * s.borderW, s.border, s.borderAlpha * alpha)
      r.curve.draw(roads, 36)
    }
    for (const r of visibleCurves) {
      const s = roadStyleFor(r.kind, level)
      const alpha = r.kind === 'avenue' ? 0.52 : r.kind === 'street' ? 0.20 : 0.62
      roads.lineStyle(TILE.w * s.fillW, s.fill, alpha)
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
        roads.fillStyle(isDirt ? 0x675338 : s.stoneColor, isDirt ? 0.11 : 0.13 + rnd() * 0.13)
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
  // Normal şehir ekranı SLOT GÖSTERMEZ. Yalnızca Divanhane çevresinde
  // çok hafif, doğal bir sıkıştırılmış toprak açıklığı kalır.
  pad(
    hall.screen.x, hall.screen.y + 1,
    FOOTPRINT_DIAMOND_W * 1.02, FOOTPRINT_DIAMOND_W * 0.51,
    0xb3a174, 0x8d7b58, 0.075, 0.08,
  )

  // 4) DEKOR. Dama gibi eşit serpme yerine yol kenarı KÜMELERİ + seyrek boş arazi.
  const occ = [...CITY_SLOTS, ...COAST_SLOTS, ...DEFENSE_SLOTS]
  // Yol üstüne ağaç/çalı çıkmasın (önceden yalnızca arsalara bakılıyordu).
  const roadSamples = [
    ...curves.flatMap(r => Array.from({ length: 24 }, (_, i) => r.curve.getPoint(i / 23))),
    ...Array.from({ length: 48 }, (_, i) => quaySpine.getPoint(i / 47)),
  ]
  const initialOccupied = new Set(occupiedSlotIds)
  initialOccupied.add(HALL_SLOT_ID)
  const clearForDecor = (wx: number, wy: number, margin = 0.9) =>
    wy < seaLine - TILE.h * 0.58 &&
    !occ.some(s => nearSlot(
      wx, wy, s,
      initialOccupied.has(s.id) ? margin : Math.min(margin, s.fixed ? 0.90 : 0.66),
    )) &&
    !roadSamples.some(p => Math.hypot(p.x - wx, p.y - wy) < TILE.w * 0.18)
  const kinds = ['d_olive-tree', 'd_bush', 'd_flower', 'd_rock']
  let di = 0
  const decorRnd = mulberry32(4242)
  const decorWidth = (key: string) =>
    key.includes('olive')
      ? TILE.w * (0.56 + decorRnd() * 0.12)
      : key.includes('rock')
        ? TILE.w * (0.28 + decorRnd() * 0.10)
        : TILE.w * (0.24 + decorRnd() * 0.10)
  const placeDecor = (
    wx: number, wy: number, forced?: string, alpha = 1, margin = 0.76,
  ) => {
    if (!clearForDecor(wx, wy, margin)) return
    const key = forced ?? kinds[di++ % kinds.length]
    stamp(key, wx, wy, decorWidth(key), -700, 0.92, alpha)
  }

  // Ikariam hissi: tekil objeler yerine küçük DOĞAL KÜMELER.
  // Kümeler slotları örtmez ama aralarındaki boşluğu resim gibi birleştirir.
  const clusterRnd = mulberry32(9917)
  const clusterCenters: Array<{ x: number; y: number; size: number }> = []

  // Yol dışı geniş alanlarda 22 ana küme; boş slotların kenarına yaklaşarak
  // gizli slot düzenini yeşil kütlelerle örter.
  let guard = 0
  while (clusterCenters.length < 22 && guard++ < 300) {
    const x = wr.x + wr.w * (0.07 + clusterRnd() * 0.86)
    const y = wr.y + (seaLine - wr.y) * (0.07 + clusterRnd() * 0.82)
    if (!clearForDecor(x, y, 0.82)) continue
    if (clusterCenters.some(c => Math.hypot(c.x - x, c.y - y) < TILE.w * 1.6)) continue
    clusterCenters.push({ x, y, size: 3 + Math.floor(clusterRnd() * 5) })
  }

  for (const c of clusterCenters) {
    // 1 ana zeytin + çevresinde çalı/çiçek/kaya: tek PNG damgası hissi vermesin.
    placeDecor(c.x, c.y, 'd_olive-tree', 0.88 + clusterRnd() * 0.08, 0.74)
    for (let i = 1; i < c.size; i++) {
      const a = clusterRnd() * Math.PI * 2
      const rx = TILE.w * (0.18 + clusterRnd() * 0.52)
      const ry = TILE.h * (0.20 + clusterRnd() * 0.80)
      const key = clusterRnd() < 0.50 ? 'd_bush' : clusterRnd() < 0.80 ? 'd_flower' : 'd_rock'
      placeDecor(
        c.x + Math.cos(a) * rx,
        c.y + Math.sin(a) * ry,
        key,
        0.68 + clusterRnd() * 0.20,
        0.70,
      )
    }
  }

  // Ana yol kenarında sadece birkaç küçük doğal küme.
  for (const r of curves.filter(r => r.kind === 'avenue')) {
    for (const t of [0.22, 0.52, 0.78]) {
      if (clusterRnd() > 0.36) continue
      const p = r.curve.getPoint(t)
      const tangent = r.curve.getTangent(t)
      const len = Math.hypot(tangent.x, tangent.y) || 1
      const side = clusterRnd() > 0.5 ? 1 : -1
      const nx = -tangent.y / len, ny = tangent.x / len
      const distance = TILE.w * (0.46 + clusterRnd() * 0.16)
      const x = p.x + nx * distance * side
      const y = p.y + ny * distance * side
      placeDecor(x, y, 'd_bush', 0.78, 0.72)
      if (clusterRnd() < 0.55) {
        placeDecor(x + nx * 18, y + ny * 10, 'd_flower', 0.70, 0.70)
      }
    }
  }

  return { updateRoads }
}
