import { decorLanes, decorGroundRadius, decorGroundViolation, HOUSE_ART_WIDTH, HOUSE_ART_HEIGHT } from './terrain/decor-clearance'
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
import { COAST_SLOTS, DEFENSE_FOUNDATION, ROAD_GRAPH, ROAD_EXITS, HALL_SLOT_ID, slotById, SLOTS, TILE, type CitySlot, type ScreenPoint } from './index'
import { GROUND_TARGET_W, GROUND_TARGET_D, FOOTPRINT_DIAMOND_W } from './building-assets'
import { asset } from '@/lib/asset'
import { liteMode } from '@/lib/motion'
import { type RoadKind } from './road-style'
import { edgeKey, roadEdgeKeysForTargets } from './road-tree'
import { shoreYAt } from './city-extras'
import { BakeAtlas } from './bake'
import { drawLand } from './terrain/land'
import { drawPlaza } from './terrain/plaza'
import { drawCityLife } from './terrain/life'
import { buildRoads } from './terrain/roads'
import { placeDecor } from './terrain/decor'

/** G4 boyalı arazi/dekor; üretim tarifleri tools/art/prompts/g4.md. */
export const TERRAIN_TILES = ['grass', 'dirt', 'grass-shade', 'grass-dry', 'plaza-stone', 'cobble', 'quay-stone', 'shore-sand', 'water-shallow', 'water-deep', 'hills'] as const
export const DECOR_TILES = [
  'olive-tree', 'bush', 'flower', 'rock', 'cypress', 'cypress-b',
  // 0.26: çeşitlilik — fıstık çamı, çınar, kavak, meyve ağacı ve kır hayatı.
  'pine', 'plane-tree', 'poplar', 'fruit-tree', 'haystack', 'well', 'woodpile', 'beehives', 'tulip-bed',
  // 0.29: Osmanlı'nın lalesi — çimende kendiliğinden bitmiş lale öbekleri.
  'tulip-clump',
  // V2 Faz 4.4: mahalle dekoru — çeşme, pazar tezgâhı, bostan, mezarlık, yel değirmeni.
  'cesme', 'tezgah', 'bostan', 'mezarlik', 'degirmen',
  // G4: meyve, kıyı ve mahalle çeşitleri.
  'fig-tree', 'orange-tree', 'pomegranate-tree', 'reed-clump', 'dry-grass', 'lavender',
  'terracotta-pots', 'grain-sacks', 'stone-bench', 'coffee-garden',
] as const
/**
 * ADA MADENİ yeri: kuzey kulesinin batısında, surların hemen dışında.
 * Orman burayı boş bırakır; sahne adanın kaynağına göre maden çizer.
 */
export function mineSite() {
  const hall = slotById(HALL_SLOT_ID)!.screen
  const top = Math.min(...DEFENSE_FOUNDATION.map(p => p.screen.y))
  return { x: hall.x - TILE.w * 3.4, y: top - TILE.h * 2.4 }
}
/** MEZARLIK yeri: kuzey kapısının doğusunda, surların dışında servilik. */
export function cemeterySite() {
  const hall = slotById(HALL_SLOT_ID)!.screen
  const top = Math.min(...DEFENSE_FOUNDATION.map(p => p.screen.y))
  return { x: hall.x + TILE.w * 4.6, y: top - TILE.h * 3.2 }
}
/** Kara taban rengi (burunlar dahil her yerde aynı). */
const LAND_BASE = 0x83a45c
/** Koyda demirli gemiler (tools/art/gen-procedural-assets.py). */
export const SHIP_TILES = ['ship-a', 'ship-b', 'fishing'] as const

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
  /*
   * IKARIAM KOMPOZİSYONU (dikey telefon): kompakt şehir ekrana sığdırıldığında
   * görünür alan şehirden çok daha UZUN olur. Dünya bu yüzden şehrin üstünde
   * tepe/orman, altında açık deniz barındıracak kadar yüksektir; kamera hiçbir
   * zoom'da dünyanın dışındaki boşluğu göstermez (bkz. phaser-city minZoom).
   */
  const mx = TILE.w * 4, topPad = TILE.h * 26
  const bottomPad = TILE.h * 24
  const minX = Math.min(...xs) - mx, minY = Math.min(...ys) - topPad
  return { x: minX, y: minY, w: Math.max(...xs) + mx - minX, h: Math.max(...ys) + bottomPad - minY }
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
    if (!scene.textures.exists('t_' + t)) scene.load.image('t_' + t, asset(`/images/game/terrain/${t}.webp`))
  }
  for (const d of DECOR_TILES) {
    if (!scene.textures.exists('d_' + d)) scene.load.image('d_' + d, asset(`/images/game/decor/${d}${scene.scale.width <= 600 || liteMode() ? '-sm' : ''}.webp`))
  }
  if (!scene.textures.exists('b_pazar')) scene.load.image('b_pazar', asset('/images/game/buildings/pazar.webp'))
  if (!scene.textures.exists('b_pier')) scene.load.image('b_pier', asset('/images/game/buildings/pier.webp'))
  for (const sh of SHIP_TILES) {
    if (!scene.textures.exists('s_' + sh)) scene.load.image('s_' + sh, asset(`/images/game/ships/${sh}.webp`))
  }
}

export type RoadCurve = {
  from: string
  to: string
  kind: RoadKind
  curve: Phaser.Curves.QuadraticBezier | Phaser.Curves.Line
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
/** Ana caddeler: meydandan limana ve sur kapılarına giden yollar. */
function arterialEdgeKeys(): Set<string> {
  return roadEdgeKeysForTargets([...COAST_SLOTS.map(s => s.id), ...ROAD_EXITS])
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

export function roadCurves(V: (x: number, y: number) => Phaser.Math.Vector2): RoadCurve[] {
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
    // Yol kontrol noktalarını fazla düzleştirmek şehirde "teknik bağlantı çizgisi"
    // hissi veriyordu. Haritanın çizdiği kıvrımı daha fazla koru; ana cadde
    // sakin, mahalle sokakları biraz daha organik kalsın.
    const maxBend = segment * (kind === 'avenue' ? 0.28 : kind === 'street' ? 0.34 : 0.18)
    // Çevre yolu (st_r*) kenarları elips yayını AYNEN izler; kırpılmaz.
    const ringArc = e.from.startsWith('st_r') && e.to.startsWith('st_r')
    const bendScale = ringArc ? 1 : bend > 0 ? Math.min(1, maxBend / bend) : 0
    const blend = ringArc ? 1 : kind === 'avenue' ? 0.74 : kind === 'street' ? 0.82 : 0.50
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
export function displayRoadCurves(curves: RoadCurve[]): RoadCurve[] {
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
export function nearSlot(wx: number, wy: number, slot: CitySlot, margin = 1) {
  const dx = Math.abs(slot.screen.x - wx)
  const dy = Math.abs(slot.screen.y - wy)
  return dx + 2 * dy < FOOTPRINT_DIAMOND_W * margin
}

/** A shared soft material boundary avoids square texture seams. */
export function paintedGroundTexture(scene: Phaser.Scene, sourceKey: string) {
  const key = sourceKey + '__ground'
  if (scene.textures.exists(key)) return key
  const source = scene.textures.get(sourceKey).getSourceImage() as HTMLImageElement
  if (!source?.width || !source?.height) return null
  const texture = scene.textures.createCanvas(key, source.width, source.height)
  if (!texture) return null
  const context = texture.getContext()
  context.clearRect(0, 0, source.width, source.height)
  context.drawImage(source, 0, 0)
  const image = context.getImageData(0, 0, source.width, source.height)
  const w = source.width, h = source.height
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const index = (y * w + x) * 4 + 3
    if (image.data[index] === 0) continue
    const oval = Math.hypot((x - w * 0.5) / (w * 0.49),
      (y - h * 0.5) / (h * 0.49))
    const ovalT = Phaser.Math.Clamp((1.00 - oval) / 0.42, 0, 1)
    const soft = (t: number) => t * t * (3 - 2 * t)
    if (sourceKey === 't_grass' || sourceKey === 't_grass-shade') {
      image.data[index - 3] = Math.round(image.data[index - 3] * 0.88)
      image.data[index - 2] = Math.min(255, Math.round(image.data[index - 2] * 1.16))
    }
    image.data[index] = Math.round(image.data[index] * soft(ovalT))
  }
  context.putImageData(image, 0, 0)
  texture.refresh()
  return key
}

/** Katmanlı şehir zeminini sahneye kurar. Bina sprite'larından ÖNCE bir kez çağrılır. */
export function buildCityTerrain(scene: Phaser.Scene, divanLevel = 1, occupiedSlotIds: string[] = []) {
  const existing = new Set(scene.children.list)
  /*
   * KADEMELİ GELİŞME: şehir süsleri Divanhane seviyesiyle açılır. Oluşturulan
   * her nesne o anki `tier` ile etiketlenir; setDevelopment(level) görünürlüğü
   * ayarlar (arazi yeniden kurulmaz).
   */
  const T = { tier: 0 }
  const tierOf = new Map<Phaser.GameObjects.GameObject, number>()
  const onAdded = (go: Phaser.GameObjects.GameObject) => { if (T.tier > 1) tierOf.set(go, T.tier) }
  scene.sys.events.on(Phaser.Scenes.Events.ADDED_TO_SCENE, onAdded)
  const wr = cityWorldRect()
  const V = (x: number, y: number) => new Phaser.Math.Vector2(x, y)
  const coastMinY = Math.min(...COAST_SLOTS.map(s => s.screen.y))
  const seaLine = coastMinY - TILE.h * 0.75
  /*
   * ORGANİK KIYI (Ikariam koyu). Liman slotlarının önünde kıyı seaLine'da
   * kalır (rıhtımlar yerinden oynamaz); iki yanda kara, asimetrik iki BURUN
   * olarak denize uzanır ve limanı bir koyun içine alır. Burunlarda kıyı
   * dalgalanır. Bütün kara/deniz sınırları bu eğriyi kullanır.
   */
  const bayCx = slotById(HALL_SLOT_ID)!.screen.x
  const bayHalf = Math.max(...COAST_SLOTS.map(s => Math.abs(s.screen.x - bayCx))) + TILE.w * 1.1
  const smooth01 = (t: number) => { const c = Math.min(1, Math.max(0, t)); return c * c * (3 - 2 * c) }
  const shoreY = shoreYAt // kıyı eğrisi city-extras'ta: dere ve arazi aynı çizgiyi kullanır
  /** Burun kıyısında mı (limanın dışında)? Kayalık/uçurum yoğunluğu için. */
  const headland = (x: number) => smooth01((Math.abs(x - bayCx) - bayHalf) / (TILE.w * 2))

  const clearanceCurves = displayRoadCurves(roadCurves(V))
  const clearanceQuay = new Phaser.Curves.Spline([...COAST_SLOTS].sort((a, b) => a.screen.x - b.screen.x).map(s => V(s.screen.x, s.screen.y - TILE.h * 0.12)))
  const clearanceLanes = decorLanes([...clearanceCurves, { kind: 'quay', curve: clearanceQuay }])
  scene.registry.set('decorClearanceLanes', clearanceLanes)
  let decorOrdinal = 0
  const treeZoom = (scene as Phaser.Scene & { townZoom?: () => number }).townZoom?.() ?? 0.22
  const stamp = (
    key: string, wx: number, wy: number, tw: number, depth: number,
    oy = 0.55, alpha = 1, tint?: number,
  ) => {
    const src = scene.textures.get(key).getSourceImage() as HTMLImageElement
    if (!src?.width) return null
    if (key.startsWith('d_')) {
      const tree = /tree|cypress|pine|poplar/.test(key)
      if (key === 'd_stone-bench') tw = HOUSE_ART_WIDTH / 4
      else if (key === 'd_terracotta-pots') tw = HOUSE_ART_WIDTH / 6
      else {
        tw *= /rock|mezarlik|degirmen/.test(key) ? 1.15 : 1.8
        if (tree) tw = Math.min(Math.max(tw, 45 / treeZoom * src.width / src.height), 65 / treeZoom * src.width / src.height)
      }
      if (/cypress/.test(key)) tw = Math.min(tw, HOUSE_ART_HEIGHT * src.width / src.height)
      if (decorGroundViolation(wx, wy, decorGroundRadius(key, tw), clearanceLanes)) return null
    }
    const img = scene.add.image(wx, wy, key).setOrigin(0.5, oy).setDepth(depth).setAlpha(alpha)
    if (key.startsWith('d_')) {
      img.setData('decorOrdinal', ++decorOrdinal)
      img.setData('decorGroundRadius', decorGroundRadius(key, tw))
      img.setVisible(!liteMode() || decorOrdinal % 2 === 1)
    }
    img.setDisplaySize(tw, tw * src.height / src.width)
    if (tint !== undefined) img.setTint(tint)
    return img
  }

  // Boyalı arazi malzemesinin sınırını yumuşatarak birbirine geçen geniş
  // lekeler üretir. Kaynak görseller tam yüzeydir; eski karo yan yüzü yoktur.
  const softSurfaceTexture = (key: string) => paintedGroundTexture(scene, key)

  // 1) TABAN — karo dışında hiçbir koyu boşluk kalmasın.
  const g0 = scene.add.graphics().setDepth(-1000)
  // Ikariam paleti: canlı ama yumuşak Akdeniz yeşili (eski kuru haki 0xa1a875).
  g0.fillStyle(LAND_BASE, 1); g0.fillRect(wr.x, wr.y, wr.w, wr.h)
  // Deniz 7 belirgin şerit yerine çok daha sık, yumuşak sığ->derin geçiş.
  const shallow = [0x62, 0xae, 0xaa] as const
  const deep = [0x1a, 0x58, 0x66] as const
  const seaH = Math.max(1, wr.y + wr.h - seaLine)
  const bandCount = 96
  const bandH = seaH / bandCount
  for (let i = 0; i < bandCount; i++) {
    const t0 = i / Math.max(1, bandCount - 1)
    const t = t0 * t0 * (3 - 2 * t0)
    const r = Math.round(shallow[0] + (deep[0] - shallow[0]) * t)
    const g = Math.round(shallow[1] + (deep[1] - shallow[1]) * t)
    const b = Math.round(shallow[2] + (deep[2] - shallow[2]) * t)
    g0.fillStyle((r << 16) | (g << 8) | b, 1)
    g0.fillRect(wr.x, seaLine + i * bandH, wr.w, bandH + 2)
  }
  {
    // Burunlar: kıyı eğrisinin üstünde kalan kısım karadır.
    const xs: number[] = []
    for (let x = wr.x - TILE.w; x <= wr.x + wr.w + TILE.w; x += TILE.w * 0.25) xs.push(x)
    const curve = xs.map(x => V(x, shoreY(x)))
    // Sığ su saçağı: burun diplerinde de su kıyıya yakın açık renkli.
    g0.fillStyle(0x5fa9a4, 0.55)
    g0.fillPoints([...curve, ...[...curve].reverse().map(p => V(p.x, p.y + TILE.h * 2.6))], true)
    g0.fillStyle(0x76bab2, 0.45)
    g0.fillPoints([...curve, ...[...curve].reverse().map(p => V(p.x, p.y + TILE.h * 1.1))], true)
    g0.fillStyle(LAND_BASE, 1)
    g0.fillPoints([V(xs[0], seaLine - 4), ...curve, V(xs[xs.length - 1], seaLine - 4)], true)
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
  const landColors = [0x5f8a45, 0x86a85a, 0x9fa565, 0x6f9650, 0x8d9a58, 0x557a3e]
  for (let i = 0; i < 24; i++) {
    const x = wr.x + landRnd() * wr.w
    const y = wr.y + landRnd() * Math.max(TILE.h, shoreY(x) - wr.y - TILE.h)
    organicPatch(
      x, y,
      TILE.w * (1.2 + landRnd() * 3.4),
      TILE.h * (1.3 + landRnd() * 3.8),
      landColors[i % landColors.length],
      0.028 + landRnd() * 0.055,
      9 + Math.floor(landRnd() * 6),
    )
  }

  // Grid'den bağımsız boyalı çim ve seyrek sıkıştırılmış toprak lekeleri.
  const grassSurface = softSurfaceTexture('t_grass')
  const dirtSurface = softSurfaceTexture('t_dirt')
  const meadowSurfaces = ['t_grass', 't_grass-shade'].map(softSurfaceTexture).filter((key): key is string => !!key)
  const surfaceRnd = mulberry32(72831)
  // Burunlar kıvrılırken bir lekenin merkezindeki kıyı çizgisi yeterli
  // değildir: görünür genişlik boyunca en içeride kalan kara sınırını al.
  const safeShore = (x: number, size: number) => Math.min(
    ...Array.from({ length: 9 }, (_, i) => shoreY(x + (i - 4) * size / 8)),
  )
  if (grassSurface && dirtSurface) for (let i = 0; i < 220; i++) {
    const dirt = i % 23 === 0
    const key = dirt ? dirtSurface : meadowSurfaces[i % meadowSurfaces.length]
    const size = TILE.w * (6.8 + surfaceRnd() * 4.5)
    const x = wr.x + wr.w * (0.025 + surfaceRnd() * 0.95)
    const maxY = safeShore(x, size) - size * 0.35
    if (maxY <= wr.y) continue
    // Kıyıya yakın şerit de malzeme alsın; geniş elips kara sınırını aşmaz.
    const y = i % 5 === 0 ? maxY - size * surfaceRnd() * 0.22
      : wr.y + (maxY - wr.y) * surfaceRnd()
    const img = stamp(key, x, y, size, -895, 0.5, dirt ? 0.15 : 0.58)
    img?.setFlipX(surfaceRnd() > 0.5)
    img?.setAngle((surfaceRnd() - 0.5) * 18)
  }
  // Geniş lekelerin yumuşak kenarı sahilde tek renk bant bırakmasın.
  if (grassSurface) for (let i = 0; i < 70; i++) {
    const size = TILE.w * (2.2 + surfaceRnd() * 2.5)
    const x = wr.x + wr.w * (0.02 + surfaceRnd() * 0.96)
    const y = safeShore(x, size) - size * (0.34 + surfaceRnd() * 0.25)
    stamp(grassSurface, x, y, size, -895, 0.5, 0.51)
  }

  // Kuru çim yalnız dünya kenarı/yamaçta küçük, seyrek lekeler.
  const drySurface = softSurfaceTexture('t_grass-dry')
  if (drySurface) for (let i = 0; i < 24; i++) {
    const x = wr.x + wr.w * (i % 2 ? 0.04 + surfaceRnd() * 0.05 : 0.91 + surfaceRnd() * 0.05)
    const size = TILE.w * (1.4 + surfaceRnd())
    const y = wr.y + (safeShore(x, size) - wr.y) * (0.12 + surfaceRnd() * 0.65)
    stamp(drySurface, x, y, size, -894.9, 0.5, 0.22)
  }

  // Kesintisiz, hafif düzensiz sahil şeridi: çim → kuru kum → ıslak kum → su.
  const coastRnd = mulberry32(2209)
  const shoreTop: Phaser.Math.Vector2[] = []
  const wetLine: Phaser.Math.Vector2[] = []
  const shoreBottom: Phaser.Math.Vector2[] = []
  const coastStep = TILE.w * 0.52
  for (let x = wr.x - coastStep; x <= wr.x + wr.w + coastStep; x += coastStep) {
    const y = shoreY(x) + (coastRnd() - 0.5) * TILE.h * 0.36
    const depth = TILE.h * (0.86 + coastRnd() * 0.34)
    shoreTop.push(V(x, y))
    wetLine.push(V(x, y + depth * 0.54))
    shoreBottom.push(V(x, y + depth))
  }
  // Örneklenen zikzak köşeleri spline ile yumuşat. Kıyı artık düz
  // poligon dişleri değil, tutarlı ve hafif kıvrımlı tek bant gibi okunur.
  const smoothShore = (points: Phaser.Math.Vector2[]) =>
    new Phaser.Curves.Spline(points).getPoints(points.length * 4)
  const smoothTop = smoothShore(shoreTop)
  const smoothWet = smoothShore(wetLine)
  const smoothBottom = smoothShore(shoreBottom)
  terrain.fillStyle(0xd0bc86, 0.92)
  terrain.fillPoints([...smoothTop, ...[...smoothBottom].reverse()], true)
  terrain.fillStyle(0xa99468, 0.28)
  terrain.fillPoints([...smoothWet, ...[...smoothBottom].reverse()], true)
  terrain.lineStyle(2.2, 0xeee3c2, 0.38)
  terrain.strokePoints(smoothWet, false)
  terrain.lineStyle(1.2, 0xffffff, 0.12)
  terrain.strokePoints(smoothBottom, false)
  terrain.lineStyle(1.7, 0x66794d, 0.18)
  terrain.strokePoints(smoothTop, false)

  // Boyalı kum/ince köpük aynı kıyı eğrisini izler; liman girişleri açık.
  const sandSurface = softSurfaceTexture('t_shore-sand')
  if (sandSurface) for (let i = 1; i < shoreTop.length - 1; i++) {
    const p = shoreTop[i]
    if (COAST_SLOTS.some(slot => Math.hypot(slot.screen.x - p.x, slot.screen.y - p.y) < GROUND_TARGET_W)) continue
    const img = stamp(sandSurface, p.x, shoreY(p.x) + TILE.h * 0.45, TILE.w * 1.25, -899.5, 0.5, 0.65)
    img?.setDisplaySize(TILE.w * 1.25, TILE.h * 0.70)
  }

  // Kıyıda tek tek serpilmiş taş yerine seyrek KAYA KÜMELERİ.
  // Coast inşa slotlarının önü bilinçli olarak açık kalır.
  for (let i = 3; i < shoreTop.length - 3; i += 2) {
    const p = shoreTop[i]
    // Burunlarda sık kayalık (uçurum hissi), koyda seyrek.
    if (coastRnd() > 0.15 + 0.6 * headland(p.x)) continue
    if (COAST_SLOTS.some(s => Math.hypot(s.screen.x - p.x, s.screen.y - p.y) < GROUND_TARGET_W * 1.05)) continue

    const count = 2 + Math.floor(coastRnd() * 2)
    for (let k = 0; k < count; k++) {
      const dx = (k - (count - 1) / 2) * TILE.w * (0.12 + coastRnd() * 0.08)
      const dy = -TILE.h * (0.03 + coastRnd() * 0.18)
      stamp(
        'd_rock',
        p.x + dx + (coastRnd() - 0.5) * TILE.w * 0.08,
        p.y + dy,
        TILE.w * (0.18 + coastRnd() * 0.13),
        -705, 0.90, 0.70 + coastRnd() * 0.14,
      )
    }
    if (coastRnd() < 0.34) {
      stamp('d_bush', p.x + (coastRnd() - 0.5) * TILE.w * 0.24,
        p.y - TILE.h * 0.20, TILE.w * 0.22, -704, 0.92, 0.62)
    }
  }

  // Sakin su yüzeyi: az sayıda geniş, düşük alfa boya izi.
  const water = scene.add.graphics().setDepth(-899)
  const waterRnd = mulberry32(8145)
  for (let i = 0; i < 56; i++) {
    const x = wr.x + waterRnd() * wr.w
    const top = shoreY(x) + TILE.h * 0.9
    const y = top + waterRnd() * Math.max(TILE.h, wr.y + wr.h - top)
    const w = TILE.w * (0.65 + waterRnd() * 1.65)
    const h = 0.9 + waterRnd() * 1.5
    water.fillStyle(waterRnd() > 0.40 ? 0xdcebe4 : 0x8fc6c1, 0.045 + waterRnd() * 0.085)
    water.fillEllipse(x, y, w, h)
  }
  // G4 su malzemeleri: yumuşak boya lekeleri yalnızca kıyıdan sonra.
  const shallowSurface = softSurfaceTexture('t_water-shallow')
  const deepSurface = softSurfaceTexture('t_water-deep')
  if (shallowSurface && deepSurface) for (let i = 0; i < 100; i++) {
    const size = TILE.w * (3.5 + waterRnd() * 4.5)
    const x = wr.x + waterRnd() * wr.w
    const top = Math.max(...Array.from({ length: 9 }, (_, j) => shoreY(x + (j - 4) * size / 8)))
    const shallow = i % 3 === 0
    const minY = top + size * 0.32 + TILE.h * 0.8
    const maxY = wr.y + wr.h - size * 0.28
    if (maxY <= minY) continue
    const y = shallow ? minY : minY + waterRnd() * (maxY - minY)
    const img = stamp(shallow ? shallowSurface : deepSurface, x, y, size, -898.9, 0.5, shallow ? 0.48 : 0.34)
    img?.setDisplaySize(size, size * 0.52)
  }
  // Kare/su çerçevesi barındıran eski tile PNG'leri burada basılmaz.

  const pierX = COAST_SLOTS[1].screen.x - TILE.w * 1.15
  const pier = stamp('b_pier', pierX, shoreY(pierX) + TILE.h * 0.85, TILE.w * 1.25, -694, 0.95)
  const showPier = (ids: readonly string[]) => pier?.setVisible(COAST_SLOTS.some(slot => ids.includes(slot.id)))
  showPier(occupiedSlotIds)

  // KOYDA DEMİRLİ GEMİLER (Ikariam limanı canlı görünür): rıhtımların önünde
  // ve açıkta birkaç yelkenli; su üstünde yavaşça sallanır. Deniz katmanının
  // üstünde, şehrin altında durur; rıhtımlara/liman binalarına değmez.
  const ships: Array<[string, number, number, number, boolean]> = [
    // [doku, x ofseti (TILE.w), kıyıdan derinlik (TILE.h), genişlik (TILE.w), ayna]
    ['s_ship-a', -2.9, 5.3, 1.05, false],
    ['s_ship-b', 2.5, 7.0, 1.2, true],
    ['s_fishing', 0.0, 8.9, 0.65, true],
  ]
  const merchantShips: Phaser.GameObjects.Image[] = []
  ships.forEach(([key, ox, oy, w, flip], i) => {
    const x = bayCx + ox * TILE.w
    const y = shoreY(x) + oy * TILE.h
    if (y > wr.y + wr.h - TILE.h) return
    const img = stamp(key, x, y, TILE.w * w, -690, 0.86)
    if (!img) return
    img.setFlipX(flip)
    merchantShips.push(img)
    scene.tweens.add({
      targets: img, y: y + 5, angle: flip ? -1.4 : 1.4,
      duration: 2300 + i * 450, ease: 'Sine.easeInOut', yoyo: true, repeat: -1, delay: i * 380,
    })
  })

  // Yakın plan mikro doku: kuru ot, çakıl, renk kırılması.
  const micro = scene.add.graphics().setDepth(-887)
  const microRnd = mulberry32(77123)
  for (let i = 0; i < 160; i++) {
    const x = wr.x + microRnd() * wr.w
    const y = wr.y + microRnd() * Math.max(0, shoreY(x) - wr.y - TILE.h)
    const roll = microRnd()
    micro.fillStyle(roll > 0.62 ? 0xd8c78c : roll > 0.28 ? 0x546d43 : 0x8d764e, 0.035 + microRnd() * 0.065)
    micro.fillEllipse(x, y, 1.5 + microRnd() * 5.5, 0.8 + microRnd() * 2.1)
  }
  /*
   * ÇİM DOKUSU (0.26): düz yeşil yerine yaşayan çayır. Yonca lekeleri,
   * binlerce ot tutamı ve küme küme kır çiçekleri. Hepsi tek Graphics'te,
   * dokuya pişirilir (kamerada ek maliyet yok); deniz ve kumsala girmez.
   */
  {
    const land = (x: number) => Math.max(0, shoreY(x) - wr.y - TILE.h * 1.6)
    for (let i = 0; i < 48; i++) {
      const x = wr.x + microRnd() * wr.w, y = wr.y + microRnd() * land(x)
      micro.fillStyle(microRnd() > 0.5 ? 0x4f7a38 : 0x9bb866, 0.07 + microRnd() * 0.06)
      micro.fillEllipse(x, y, TILE.w * (0.5 + microRnd() * 1.1), TILE.h * (0.4 + microRnd() * 0.8))
    }
    const bladeCols = [0x4a6e32, 0x5d8a3c, 0x7da04e, 0xa9c070]
    for (let i = 0; i < 700; i++) {
      const x = wr.x + microRnd() * wr.w, y = wr.y + microRnd() * land(x)
      const h = 3 + microRnd() * 5, c = bladeCols[Math.floor(microRnd() * bladeCols.length)]
      micro.lineStyle(1.3, c, 0.35 + microRnd() * 0.3)
      micro.lineBetween(x, y, x - 2.2, y - h)
      micro.lineBetween(x, y, x + 0.4, y - h * 1.15)
      micro.lineBetween(x, y, x + 2.4, y - h * 0.9)
    }
    const petals = [0xf6f1e4, 0xf2d24c, 0xc46fb0, 0xd9534a, 0x9ab6e0]
    for (let k = 0; k < 36; k++) {
      const cx = wr.x + microRnd() * wr.w, cy = wr.y + microRnd() * land(cx)
      const col = petals[Math.floor(microRnd() * petals.length)]
      const n = 5 + Math.floor(microRnd() * 9)
      for (let j = 0; j < n; j++) {
        const x = cx + (microRnd() - 0.5) * TILE.w * 0.9, y = cy + (microRnd() - 0.5) * TILE.h * 0.7
        micro.fillStyle(0x3f6a2e, 0.5); micro.fillCircle(x + 0.6, y + 0.8, 1.6)
        micro.fillStyle(col, 0.9); micro.fillCircle(x, y, 1.5 + microRnd())
      }
    }
  }

  // Büyük yumuşak ton geçişleri.
  const variation = scene.add.graphics().setDepth(-880)
  const patchRnd = mulberry32(6161)
  const patchColors = [0x557b3f, 0xa89c60, 0x6b9148, 0x8a7c4f]
  for (let i = 0; i < 14; i++) {
    const x = wr.x + wr.w * (0.04 + patchRnd() * 0.92)
    const y = wr.y + (shoreY(x) - wr.y) * (0.03 + patchRnd() * 0.94)
    variation.fillStyle(patchColors[i % patchColors.length], 0.022 + patchRnd() * 0.032)
    variation.fillEllipse(x, y, TILE.w * (4 + patchRnd() * 7), TILE.h * (3 + patchRnd() * 6))
  }

  drawLand({ V, scene, shoreY, stamp, wr })
  const { flags, plazaDecor } = drawPlaza({ T, V, dirtSurface, scene, shoreY, stamp })
  drawCityLife({ T, V, plazaDecor, scene, stamp })
  const { ambientDecor, curves, quaySpine, roads, syncAmbientDecor, updateRoads } = buildRoads({ V, divanLevel, occupiedSlotIds, scene, shoreY, stamp })
  placeDecor({ ambientDecor, curves, occupiedSlotIds, quaySpine, scene, seaLine, shoreY, stamp, wr })
  syncAmbientDecor(occupiedSlotIds)
  // Sabit arazi katmanlarını dokuya pişir (yollar ayrı: her güncellemede).
  T.tier = 0
  scene.sys.events.off(Phaser.Scenes.Events.ADDED_TO_SCENE, onAdded)
  const atlas = new BakeAtlas(scene, 'terrain-atlas')
  for (const o of scene.children.list.filter(o => !existing.has(o))) {
    if (!(o instanceof Phaser.GameObjects.Graphics) || o === roads) continue
    const t = tierOf.get(o)
    const out = atlas.bake(o)
    if (t) { tierOf.delete(o); for (const r of out) tierOf.set(r, t) }
  }
  atlas.finish()
  /** Divanhane seviyesine göre şehir süslerini göster/gizle. */
  const setDevelopment = (level: number) => {
    for (const [o, t] of tierOf) {
      const decor = o instanceof Phaser.GameObjects.Image && o.texture.key.startsWith('d_')
      const allowed = !decor || !liteMode() || (o.getData('decorPairOrdinal') ?? o.getData('decorOrdinal')) % 2 === 1
      ;(o as unknown as Phaser.GameObjects.Components.Visible).setVisible(level >= t && allowed)
    }
  }
  const setBlockaded = (blockaded: boolean) => { for (const ship of merchantShips) ship.setVisible(!blockaded) }
  return { updateRoads, flags, setDevelopment, setBlockaded, syncAmbientDecor: (ids: string[]) => { syncAmbientDecor(ids); showPier(ids) } }
}
