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
  CITY_SLOTS, COAST_SLOTS, DEFENSE_SLOTS, DEFENSE_FOUNDATION, ROAD_GRAPH, ROAD_EXITS, PLAZA, RING_ROAD,
  HALL_SLOT_ID, slotById, SLOTS, TILE, type CitySlot, type ScreenPoint,
} from './index'
import { GROUND_TARGET_W, GROUND_TARGET_D, FOOTPRINT_DIAMOND_W, ART_DIAMOND_PX } from './building-assets'
import { asset } from '@/lib/asset'
import { roadStyleFor, roadTierForHallLevel, type RoadKind } from './road-style'
import { edgeKey, roadEdgeKeysForTargets } from './road-tree'
import { aqueductHits, cityAqueduct, cityBazaar, cityFields, cityFountains, cityStream, fieldTier, fountainTier, nearStreamAt, shoreYAt } from './city-extras'
import { bakeGraphics, BakeAtlas } from './bake'

/** Arazi dokuları ve dekor (tools/art/decor.py ile çizilir). */
export const TERRAIN_TILES = ['grass', 'dirt'] as const
export const DECOR_TILES = ['olive-tree', 'bush', 'flower', 'rock', 'cypress', 'cypress-b'] as const
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
const LAND_BASE = 0x8fa964
/** Koyda demirli gemiler (tools/art/gen-procedural-assets.py). */
export const SHIP_TILES = ['ship-a', 'ship-b'] as const

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
    if (!scene.textures.exists('t_' + t)) scene.load.image('t_' + t, asset(`/images/game/terrain/${t}.png`))
  }
  for (const d of DECOR_TILES) {
    if (!scene.textures.exists('d_' + d)) scene.load.image('d_' + d, asset(`/images/game/decor/${d}.png`))
  }
  if (!scene.textures.exists('b_pazar')) scene.load.image('b_pazar', asset('/images/game/buildings/pazar.webp'))
  for (const sh of SHIP_TILES) {
    if (!scene.textures.exists('s_' + sh)) scene.load.image('s_' + sh, asset(`/images/game/ships/${sh}.png`))
  }
}

type RoadCurve = {
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
    // Çevre yolu (st_r*) kenarları elips yayını AYNEN izler; kırpılmaz.
    const ringArc = e.from.startsWith('st_r') && e.to.startsWith('st_r')
    const bendScale = ringArc ? 1 : bend > 0 ? Math.min(1, maxBend / bend) : 0
    const blend = ringArc ? 1 : kind === 'avenue' ? 0.48 : kind === 'street' ? 0.56 : 0.42
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
  const existing = new Set(scene.children.list)
  /*
   * KADEMELİ GELİŞME: şehir süsleri Divanhane seviyesiyle açılır. Oluşturulan
   * her nesne o anki `tier` ile etiketlenir; setDevelopment(level) görünürlüğü
   * ayarlar (arazi yeniden kurulmaz).
   */
  let tier = 0
  const tierOf = new Map<Phaser.GameObjects.GameObject, number>()
  const onAdded = (go: Phaser.GameObjects.GameObject) => { if (tier > 1) tierOf.set(go, tier) }
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
  const diamond = (cx: number, cy: number, w: number, h: number) =>
    [V(cx, cy - h / 2), V(cx + w / 2, cy), V(cx, cy + h / 2), V(cx - w / 2, cy)]

  const stamp = (
    key: string, wx: number, wy: number, tw: number, depth: number,
    oy = 0.55, alpha = 1, tint?: number,
  ) => {
    const src = scene.textures.get(key).getSourceImage() as HTMLImageElement
    if (!src?.width) return null
    const img = scene.add.image(wx, wy, key).setOrigin(0.5, oy).setDepth(depth).setAlpha(alpha)
    img.setDisplaySize(tw, tw * src.height / src.width)
    if (tint !== undefined) img.setTint(tint)
    return img
  }

  // Ressam işi arazi katmanı: mevcut izometrik çim/toprak karolarının SADECE
  // üst yüzeyini alır. Kalın yan yüzler ve dikdörtgen PNG sınırları maskelenir;
  // yüzeyin dış kenarı da yumuşatılır. Böylece zemine karo döşemeden gerçek
  // asset dokusunu büyük, rastgele kesişen boya lekeleri olarak kullanabiliriz.
  const softSurfaceTexture = (sourceKey: string) => {
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
      // Texture'ların üst yüzeyi yaklaşık 2:1 elmas şeklinde. Kenarların
      // içinde başlayarak alpha'yı sıfıra indir; toprağın kalın yan yüzü yok.
      const diamond = Math.abs((x - w * 0.5) / (w * 0.49))
        + Math.abs((y - h * 0.435) / (h * 0.345))
      // Geniş feather: uzak zoomda elmas sınırı veya ayrı yeşil ada kalmasın.
      const oval = Math.hypot((x - w * 0.5) / (w * 0.50),
        (y - h * 0.435) / (h * 0.355))
      const diamondT = Phaser.Math.Clamp((0.92 - diamond) / 0.58, 0, 1)
      const ovalT = Phaser.Math.Clamp((1.00 - oval) / 0.55, 0, 1)
      const soft = (t: number) => t * t * (3 - 2 * t)
      image.data[index] = Math.round(image.data[index] * soft(diamondT) * soft(ovalT))
    }
    context.putImageData(image, 0, 0)
    texture.refresh()
    return key
  }

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
  for (let i = 0; i < 36; i++) {
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

  // Düz renk ekranı kıran, grid'den bağımsız gerçek boyalı arazi dokusu.
  // Eski uygulamada tam karo alpha=0.055 ile sadece 11 kez basılıyordu;
  // büyük şehirde hiç görünmüyordu. Artık karonun yan yüzü yok ve sert sınır
  // yok; geniş yüzeyler farklı boy/konum/açıyla örtüşerek doğal zemini kurar.
  const grassSurface = softSurfaceTexture('t_grass')
  const dirtSurface = softSurfaceTexture('t_dirt')
  const surfaceRnd = mulberry32(72831)
  if (grassSurface && dirtSurface) for (let i = 0; i < 175; i++) {
    const dirt = i % 9 === 0 || (i % 17 === 0)
    const key = dirt ? dirtSurface : grassSurface
    const size = TILE.w * (5.6 + surfaceRnd() * 4.0)
    const x = wr.x + wr.w * (0.025 + surfaceRnd() * 0.95)
    const maxY = shoreY(x) - size * 0.58
    if (maxY <= wr.y) continue
    const y = wr.y + (maxY - wr.y) * surfaceRnd()
    const img = stamp(key, x, y, size, -895, 0.435, dirt ? 0.25 : 0.43)
    img?.setFlipX(surfaceRnd() > 0.5)
    img?.setAngle((surfaceRnd() - 0.5) * 18)
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
  for (let i = 0; i < 92; i++) {
    const x = wr.x + waterRnd() * wr.w
    const top = shoreY(x) + TILE.h * 0.9
    const y = top + waterRnd() * Math.max(TILE.h, wr.y + wr.h - top)
    const w = TILE.w * (0.65 + waterRnd() * 1.65)
    const h = 0.9 + waterRnd() * 1.5
    water.fillStyle(waterRnd() > 0.40 ? 0xdcebe4 : 0x8fc6c1, 0.045 + waterRnd() * 0.085)
    water.fillEllipse(x, y, w, h)
  }
  // Kare/su çerçevesi barındıran eski tile PNG'leri burada basılmaz.

  // KOYDA DEMİRLİ GEMİLER (Ikariam limanı canlı görünür): rıhtımların önünde
  // ve açıkta birkaç yelkenli; su üstünde yavaşça sallanır. Deniz katmanının
  // üstünde, şehrin altında durur; rıhtımlara/liman binalarına değmez.
  const ships: Array<[string, number, number, number, boolean]> = [
    // [doku, x ofseti (TILE.w), kıyıdan derinlik (TILE.h), genişlik (TILE.w), ayna]
    ['s_ship-a', -4.1, 5.4, 1.05, false],
    ['s_ship-b', 3.6, 7.6, 1.3, true],
    ['s_ship-a', -0.4, 12.5, 0.95, true],
  ]
  ships.forEach(([key, ox, oy, w, flip], i) => {
    const x = bayCx + ox * TILE.w
    const y = shoreY(x) + oy * TILE.h
    if (y > wr.y + wr.h - TILE.h) return
    const img = stamp(key, x, y, TILE.w * w, -690, 0.86)
    if (!img) return
    img.setFlipX(flip)
    scene.tweens.add({
      targets: img, y: y + 5, angle: flip ? -1.4 : 1.4,
      duration: 2300 + i * 450, ease: 'Sine.easeInOut', yoyo: true, repeat: -1, delay: i * 380,
    })
  })

  // Yakın plan mikro doku: kuru ot, çakıl, renk kırılması.
  const micro = scene.add.graphics().setDepth(-887)
  const microRnd = mulberry32(77123)
  for (let i = 0; i < 320; i++) {
    const x = wr.x + microRnd() * wr.w
    const y = wr.y + microRnd() * Math.max(0, shoreY(x) - wr.y - TILE.h)
    const roll = microRnd()
    micro.fillStyle(roll > 0.62 ? 0xd8c78c : roll > 0.28 ? 0x546d43 : 0x8d764e, 0.035 + microRnd() * 0.065)
    micro.fillEllipse(x, y, 1.5 + microRnd() * 5.5, 0.8 + microRnd() * 2.1)
  }

  // Büyük yumuşak ton geçişleri.
  const variation = scene.add.graphics().setDepth(-880)
  const patchRnd = mulberry32(6161)
  const patchColors = [0x557b3f, 0xa89c60, 0x6b9148, 0x8a7c4f]
  for (let i = 0; i < 24; i++) {
    const x = wr.x + wr.w * (0.04 + patchRnd() * 0.92)
    const y = wr.y + (shoreY(x) - wr.y) * (0.03 + patchRnd() * 0.94)
    variation.fillStyle(patchColors[i % patchColors.length], 0.022 + patchRnd() * 0.032)
    variation.fillEllipse(x, y, TILE.w * (4 + patchRnd() * 7), TILE.h * (3 + patchRnd() * 6))
  }

  // 2b) DAĞLAR VE YAMAÇLAR (Ikariam): şehir bir tepenin eteğinde, arkasında
  // katman katman sıradağlar, iki yanında ormanlı yamaçlar. Hepsi vektör;
  // surların ve madenin üstüne taşmaz (sur halkasının üstünde biter).
  {
    const hills = scene.add.graphics().setDepth(-870)
    const hr = mulberry32(51515)
    const hall = slotById(HALL_SLOT_ID)!.screen
    const ringTop = Math.min(...DEFENSE_FOUNDATION.map(p => p.screen.y))
    const ringXs = DEFENSE_FOUNDATION.map(p => p.screen.x)
    const ringHalf = Math.max(...ringXs.map(x => Math.abs(x - hall.x)))
    // Tek bir dağ: sol yüz aydınlık, sağ yüz gölgede, tepede kaya.
    const peak = (cx: number, baseY: number, h: number, w: number, light: number, dark: number, rock: number, haze: number) => {
      const top = V(cx + (hr() - 0.5) * w * 0.2, baseY - h)
      const left = V(cx - w, baseY), right = V(cx + w, baseY)
      const midL = V(cx - w * 0.5, baseY - h * (0.45 + hr() * 0.15))
      const midR = V(cx + w * 0.55, baseY - h * (0.4 + hr() * 0.15))
      const foot = V(top.x + w * 0.08, baseY)
      hills.fillStyle(light, haze); hills.fillPoints([left, midL, top, foot], true)
      hills.fillStyle(dark, haze); hills.fillPoints([top, midR, right, foot], true)
      // Kayalık doruk ve sırt çizgisi.
      hills.fillStyle(rock, haze * 0.9)
      hills.fillPoints([V(top.x - w * 0.16, top.y + h * 0.22), top, V(top.x + w * 0.2, top.y + h * 0.26), V(top.x + w * 0.02, top.y + h * 0.3)], true)
      hills.lineStyle(2, 0x3e4a2c, 0.25 * haze); hills.lineBetween(top.x, top.y, foot.x, foot.y)
    }
    // Uzak, orta ve yakın sıra (arkadan öne).
    const ranges = [
      { base: ringTop - TILE.h * 9.5, h: [TILE.h * 7, TILE.h * 11], w: [TILE.w * 2.2, TILE.w * 3.4], light: 0x9fae8b, dark: 0x7d8d6c, rock: 0xc4c0b2, haze: 0.85, n: 9 },
      { base: ringTop - TILE.h * 6.5, h: [TILE.h * 5, TILE.h * 8], w: [TILE.w * 1.8, TILE.w * 2.8], light: 0x8aa062, dark: 0x667d45, rock: 0xb8b09c, haze: 0.95, n: 8 },
      { base: ringTop - TILE.h * 3.6, h: [TILE.h * 2.6, TILE.h * 4.2], w: [TILE.w * 1.6, TILE.w * 2.4], light: 0x7f9a52, dark: 0x5f7a3e, rock: 0xa89f86, haze: 1, n: 8 },
    ]
    for (const r of ranges) {
      const span = wr.w + TILE.w * 4
      for (let i = 0; i < r.n; i++) {
        const cx = wr.x - TILE.w * 2 + span * ((i + 0.5 + (hr() - 0.5) * 0.5) / r.n)
        // Şehrin tam arkasında yakın sıra alçalır: belediye ve kuzey kulesi görünsün.
        const behindCity = Math.abs(cx - hall.x) < ringHalf * 0.6 && r === ranges[2]
        const h = (r.h[0] + hr() * (r.h[1] - r.h[0])) * (behindCity ? 0.55 : 1)
        const w = r.w[0] + hr() * (r.w[1] - r.w[0])
        peak(cx, r.base, h, w, r.light, r.dark, r.rock, r.haze)
      }
      // Dağ eteği araziye yumuşakça karışır.
      hills.fillStyle(r.dark, 0.35)
      hills.fillRect(wr.x, r.base - TILE.h * 0.2, wr.w, TILE.h * 0.8)
    }
    // Sıradağların üstü (dünyanın en üstü): puslu uzak sırt, gökyüzü yok.
    hills.fillStyle(0xa9b594, 1)
    hills.fillRect(wr.x, wr.y, wr.w, Math.max(0, ranges[0].base - TILE.h * 11 - wr.y))
    // YAMAÇLAR: surların iki yanında, kıyıya kadar inen ormanlı tepe sırtları.
    for (const side of [-1, 1]) {
      const x0 = hall.x + side * (ringHalf + TILE.w * 1.4)
      for (let k = 0; k < 5; k++) {
        const y = ringTop + TILE.h * (2 + k * 5.5)
        const x = x0 + side * TILE.w * (0.6 + hr() * 1.4)
        if (y > shoreY(x) - TILE.h * 2) continue
        const rx = TILE.w * (2.4 + hr() * 1.4), ry = TILE.h * (2.2 + hr() * 1.2)
        hills.fillStyle(0x4f6b36, 0.30); hills.fillEllipse(x + side * TILE.w * 0.3, y + ry * 0.35, rx * 2.1, ry * 1.5)
        hills.fillStyle(side < 0 ? 0x7f9a52 : 0x6a8546, 0.9); hills.fillEllipse(x, y, rx * 2, ry * 1.6)
        hills.fillStyle(side < 0 ? 0x94ae62 : 0x7a9550, 0.8); hills.fillEllipse(x - side * rx * 0.25, y - ry * 0.3, rx * 1.2, ry * 0.8)
        // Kaya çıkıntıları.
        for (let q = 0; q < 3; q++) stamp('d_rock', x + (hr() - 0.5) * rx, y + (hr() - 0.3) * ry * 0.6, TILE.w * (0.3 + hr() * 0.2), -869, 0.9, 0.9)
      }
    }
  }

  // 2c) ŞEHİR DÜZLÜĞÜ: şehir hafifçe daha açık ve güneşli oval bir yaylada.
  {
    const tg = scene.add.graphics().setDepth(-860)
    const xs = CITY_SLOTS.map(c => c.screen.x), ys = CITY_SLOTS.map(c => c.screen.y)
    const cx = (Math.min(...xs) + Math.max(...xs)) / 2
    const cy = (Math.min(...ys) + Math.max(...ys)) / 2
    const rx = (Math.max(...xs) - Math.min(...xs)) / 2 + TILE.w * 1.7
    const ry = (Math.max(...ys) - Math.min(...ys)) / 2 + TILE.h * 3.2
    tg.fillStyle(0xc9d18a, 0.16); tg.fillEllipse(cx, cy, rx * 2, ry * 2)
    tg.fillStyle(0xd6d894, 0.10); tg.fillEllipse(cx - rx * 0.1, cy - ry * 0.12, rx * 1.5, ry * 1.4)
  }

  // 2d) BOYALI ZEMİN: izometrik yönde binlerce kısa fırça darbesi + güneşin
  // sol üstten vurduğu sıcak ışık. Düz yeşil yüzey resim gibi görünür.
  {
    const brush = scene.add.graphics().setDepth(-885)
    const br = mulberry32(24680)
    const greens = [0x5d8a3f, 0x7ea453, 0x98b562, 0x6f9448, 0xa9bd6a, 0x4f7a37, 0xc4c57a]
    for (let i = 0; i < 2600; i++) {
      const x = wr.x + br() * wr.w
      const y = wr.y + br() * Math.max(0, shoreY(x) - wr.y - TILE.h * 0.5)
      const len = TILE.w * (0.08 + br() * 0.22)
      const dir = br() < 0.5 ? 1 : -1
      brush.lineStyle(2 + br() * 5, greens[Math.floor(br() * greens.length)], 0.05 + br() * 0.09)
      brush.lineBetween(x, y, x + len, y + dir * len * 0.5)
    }
    const light = scene.add.graphics().setDepth(-884)
    const hall = slotById(HALL_SLOT_ID)!.screen
    for (let k = 0; k < 6; k++) {
      light.fillStyle(0xffe6a0, 0.035)
      light.fillEllipse(hall.x - TILE.w * 3, hall.y - TILE.h * 10, TILE.w * (8 + k * 4), TILE.h * (10 + k * 5))
    }
    // Kenarlarda hafif karartma: göz şehrin ortasına çekilir.
    light.fillStyle(0x1e2c14, 0.10); light.fillRect(wr.x, wr.y, TILE.w * 2.5, wr.h)
    light.fillRect(wr.x + wr.w - TILE.w * 2.5, wr.y, TILE.w * 2.5, wr.h)
  }

  // 2e) MEYDAN VE ÇEVRE DÜZENLEMESİ (Ikariam): Divanhane taş döşeli oval bir
  // meydanın ortasında tek başına durur. Meydanda köşegen çiçek tarhları,
  // önünde şadırvan, girişlerinde bayrak direkleri; meydan ile çevre yolu
  // arası bakımlı çimen. Dört caddenin iki yanı servi ağaçlı.
  const plazaDecor: Phaser.GameObjects.GameObject[] = []
  /** Canlı katmanda dalgalanacak sancak kumaşları (direk/alem burada çizilir). */
  const flags: Array<{ x: number; y: number; w: number; h: number; depth: number; minLevel: number }> = []
  {
    const P = PLAZA.screen, prx = PLAZA.rx, pry = PLAZA.ry
    // Çevre yolunun içi: bakımlı açık yeşil çimen.
    tier = 3
    const lawn = scene.add.graphics().setDepth(-858)
    lawn.fillStyle(0xb9d27a, 0.22); lawn.fillEllipse(P.x, P.y, RING_ROAD.rx * 2, RING_ROAD.ry * 2)
    lawn.fillStyle(0xc6db88, 0.14); lawn.fillEllipse(P.x, P.y, RING_ROAD.rx * 1.6, RING_ROAD.ry * 1.6)

    // Seviye 1: sıkıştırılmış toprak meydan (taş döşeme 2. seviyede gelir).
    tier = 0
    const dirt = scene.add.graphics().setDepth(-796)
    dirt.fillStyle(0x2f421c, 0.16); dirt.fillEllipse(P.x + 8, P.y + 10, prx * 2 + 20, pry * 2 + 16)
    dirt.fillStyle(0xb89e70, 1); dirt.fillEllipse(P.x, P.y, prx * 2 + 10, pry * 2 + 8)
    dirt.fillStyle(0xc9b184, 1); dirt.fillEllipse(P.x - 10, P.y - 6, prx * 1.7, pry * 1.6)
    tier = 2
    let pz = scene.add.graphics().setDepth(-795)
    const ell = (k: number) => Array.from({ length: 64 }, (_, i) => {
      const t = i / 64 * Math.PI * 2
      return V(P.x + Math.cos(t) * prx * k, P.y + Math.sin(t) * pry * k)
    })
    // Bordür + gölge, taş zemin, iki halka bant.
    pz.fillStyle(0x2f421c, 0.22); pz.fillEllipse(P.x + 10, P.y + 12, prx * 2 + 30, pry * 2 + 24)
    pz.fillStyle(0x9a845e, 1); pz.fillEllipse(P.x, P.y, prx * 2 + 22, pry * 2 + 16)
    pz.fillStyle(0xdccba3, 1); pz.fillEllipse(P.x, P.y, prx * 2, pry * 2)
    pz.fillStyle(0xcfbb91, 1); pz.fillEllipse(P.x, P.y, prx * 1.56, pry * 1.56)
    pz.fillStyle(0xe4d6b3, 1); pz.fillEllipse(P.x, P.y, prx * 1.4, pry * 1.4)
    // Döşeme derzleri: halkalar ve ışınlar.
    for (const k of [0.36, 0.55, 0.7, 0.86]) { pz.lineStyle(2, 0xa99270, 0.45); pz.strokePoints(ell(k), true) }
    for (let i = 0; i < 32; i++) {
      const t = i / 32 * Math.PI * 2, c = Math.cos(t), s = Math.sin(t)
      pz.lineStyle(1.6, 0xa99270, 0.35)
      pz.lineBetween(P.x + c * prx * 0.36, P.y + s * pry * 0.36, P.x + c * prx, P.y + s * pry)
    }
    pz.lineStyle(3, 0xf1e6ca, 0.9); pz.strokePoints(ell(1), true)
    // KÜRSÜ: Divanhane'nin iki basamaklı taş kaidesi. Görselin zemin
    // elmasıyla aynı yönde ve ortada: bina meydana düz oturur.
    const podium = (hw: number, lift: number, top: number, side: number, rim: number) => {
      const hh = hw / 2
      const N = V(P.x, P.y - hh - lift), E = V(P.x + hw, P.y - lift), S = V(P.x, P.y + hh - lift), W = V(P.x - hw, P.y - lift)
      pz.fillStyle(side, 1)
      pz.fillPoints([W, S, V(S.x, S.y + 12), V(W.x, W.y + 12)], true)
      pz.fillStyle(Phaser.Display.Color.ValueToColor(side).darken(12).color, 1)
      pz.fillPoints([S, E, V(E.x, E.y + 12), V(S.x, S.y + 12)], true)
      pz.fillStyle(top, 1); pz.fillPoints([N, E, S, W], true)
      pz.lineStyle(2.5, rim, 0.9); pz.strokePoints([N, E, S, W], true)
    }
    // Görseldeki zemin elmasının yarı genişliği: 211 sanat pikseli × bina
    // ölçeği (phaser-city artScale) × belediye büyütmesi 1.5.
    const hallHalf = 211 * (FOOTPRINT_DIAMOND_W / ART_DIAMOND_PX) * 1.8 * 1.5
    const lowHalf = hallHalf * 1.16
    tier = 0; pz = scene.add.graphics().setDepth(-794.9)
    podium(lowHalf, 0, 0xcdb88c, 0xa48b62, 0xeee2c4)
    tier = 3; pz = scene.add.graphics().setDepth(-794.8)
    podium(hallHalf * 1.06, 12, 0xe2d3ae, 0xb49b70, 0xf6ecd2)
    // Kürsünün dört ucunda basamak.
    for (const [dx, dy] of [[0, 0.5], [1, 0], [-1, 0], [0, -0.5]]) {
      const ex = P.x + dx * lowHalf, ey = P.y + dy * lowHalf
      pz.fillStyle(0xa48b62, 1); pz.fillEllipse(ex + dx * 16, ey + dy * 20 + 10, 62, 24)
      pz.fillStyle(0xf1e6ca, 1); pz.fillEllipse(ex + dx * 16, ey + dy * 20 + 4, 62, 24)
    }

    // LALE TARHLARI (arka köşegenler): çitle çevrili, kırmızı-sarı laleler.
    tier = 4; pz = scene.add.graphics().setDepth(-794.7)
    const fr = mulberry32(8080)
    const tulips = (bx: number, by: number, bw: number, bh: number) => {
      pz.fillStyle(0x3e5f2a, 1); pz.fillEllipse(bx, by + 3, bw + 14, bh + 10)
      pz.fillStyle(0x6f9a48, 1); pz.fillEllipse(bx, by, bw, bh)
      const colors = [0xc8231c, 0xe23b2e, 0xf2c230, 0xf6efe0, 0xa31d4f]
      for (let k = 0; k < 34; k++) {
        const a = fr() * Math.PI * 2, r = Math.sqrt(fr()) * 0.4
        const x = bx + Math.cos(a) * bw * r, y = by + Math.sin(a) * bh * r
        pz.lineStyle(1.4, 0x2f5a22, 1); pz.lineBetween(x, y, x, y - 7)
        pz.fillStyle(colors[k % colors.length], 1)
        pz.fillPoints([V(x - 3, y - 7), V(x - 3.4, y - 12), V(x - 1.2, y - 10), V(x, y - 13), V(x + 1.2, y - 10), V(x + 3.4, y - 12), V(x + 3, y - 7)], true)
      }
    }
    for (const deg of [215, 325]) {
      const t = deg * Math.PI / 180
      tulips(P.x + Math.cos(t) * prx * 0.8, P.y + Math.sin(t) * pry * 0.8, TILE.w * 0.9, TILE.h * 0.55)
    }

    // ÇINAR ve SEKİ (ön köşegenler): meydanın gölgelik ulu çınarları, dibinde
    // yuvarlak taş oturma sekisi.
    tier = 3; pz = scene.add.graphics().setDepth(-794.6)
    for (const deg of [35, 145]) {
      const t = deg * Math.PI / 180
      const cx = P.x + Math.cos(t) * prx * 0.8, cy = P.y + Math.sin(t) * pry * 0.8
      pz.fillStyle(0x2f421c, 0.25); pz.fillEllipse(cx + 26, cy + 10, TILE.w * 1.5, TILE.h * 0.7)
      pz.fillStyle(0xa48b62, 1); pz.fillEllipse(cx, cy + 5, TILE.w * 0.62, TILE.h * 0.36)
      pz.fillStyle(0xe9dcbc, 1); pz.fillEllipse(cx, cy, TILE.w * 0.62, TILE.h * 0.36)
      pz.fillStyle(0x6a5a3a, 1); pz.fillEllipse(cx, cy, TILE.w * 0.36, TILE.h * 0.2)
      const img = stamp('d_olive-tree', cx, cy + 2, TILE.w * 1.3, cy + 2, 0.93, 1, 0xb9d49a)
      if (img) plazaDecor.push(img)
    }

    // ŞADIRVAN: sekizgen havuz, sekiz sütun, geniş saçaklı kurşun kubbe, alem.
    const fx = P.x, fy = P.y + pry * 0.74
    const f = scene.add.graphics().setDepth(fy)
    const oct = (rx: number, ry: number, dy = 0) => Array.from({ length: 8 }, (_, i) => {
      const t = (i + 0.5) / 8 * Math.PI * 2
      return V(fx + Math.cos(t) * rx, fy + dy + Math.sin(t) * ry)
    })
    const R = TILE.w * 0.46
    f.fillStyle(0x2f421c, 0.25); f.fillEllipse(fx + 14, fy + 12, R * 2.6, R * 0.9)
    f.fillStyle(0xa48b62, 1); f.fillPoints(oct(R * 1.12, R * 0.56, 4), true)
    f.fillStyle(0xe9dcbc, 1); f.fillPoints(oct(R * 1.12, R * 0.56, -6), true)
    f.fillStyle(0x4f9bb5, 1); f.fillPoints(oct(R * 0.94, R * 0.46, -7), true)
    f.fillStyle(0x8fd0e0, 0.7); f.fillEllipse(fx - 10, fy - 12, R * 0.9, R * 0.22)
    // Sütunlar (arkadakiler önce).
    const colH = TILE.h * 1.25, roofY = fy - 6 - colH
    const cols = Array.from({ length: 8 }, (_, i) => (i + 0.5) / 8 * Math.PI * 2)
      .map(t => ({ x: fx + Math.cos(t) * R * 0.8, y: fy - 6 + Math.sin(t) * R * 0.4 }))
      .sort((a, b) => a.y - b.y)
    for (const c of cols) {
      f.fillStyle(0xf1e8d2, 1); f.fillRect(c.x - 3.5, c.y - colH, 7, colH)
      f.fillStyle(0xc9b893, 1); f.fillRect(c.x + 1, c.y - colH, 2.5, colH)
    }
    // Orta musluk taşı.
    f.fillStyle(0xd9c9a4, 1); f.fillRect(fx - 9, fy - 44, 18, 36)
    // Saçak (geniş sekizgen), kasnak, kurşun kubbe, alem.
    f.fillStyle(0x6d7f7b, 1); f.fillPoints(oct(R * 1.3, R * 0.5, roofY - fy + 6), true)
    f.fillStyle(0x8fa19c, 1); f.fillPoints(oct(R * 1.3, R * 0.5, roofY - fy), true)
    f.fillStyle(0xe8dcc0, 1); f.fillRect(fx - R * 0.55, roofY - 16, R * 1.1, 14)
    f.fillStyle(0x7f9690, 1); f.fillEllipse(fx, roofY - 16, R * 1.1, R * 0.5)
    f.fillStyle(0x9fb3ad, 1); f.fillCircle(fx, roofY - 26, R * 0.52)
    f.fillStyle(0x7f9690, 1); f.fillRect(fx - R * 0.55, roofY - 26, R * 1.1, 10)
    f.fillStyle(0xb9cac5, 0.7); f.fillEllipse(fx - R * 0.2, roofY - 38, R * 0.35, R * 0.22)
    f.fillStyle(0xe2bd78, 1); f.fillRect(fx - 1.5, roofY - 70, 3, 22)
    f.lineStyle(3, 0xe2bd78, 1); f.beginPath(); f.arc(fx + 2, roofY - 74, 6, Math.PI * 0.35, Math.PI * 1.65, false); f.strokePath()
    plazaDecor.push(f)

    tier = 2
    // Girişlerde bayrak direkleri (al sancak, ay-yıldız, altın alem).
    const pole = (x: number, y: number) => {
      const g = scene.add.graphics().setDepth(y)
      g.fillStyle(0x2f421c, 0.25); g.fillEllipse(x + 6, y + 3, 22, 8)
      g.fillStyle(0xb39c74, 1); g.fillRect(x - 7, y - 8, 14, 9)
      g.lineStyle(4, 0x5a4630, 1); g.lineBetween(x, y - 6, x, y - 118)
      g.fillStyle(0xe2bd78, 1); g.fillCircle(x, y - 121, 4)
      flags.push({ x: x + 2, y: y - 114, w: 46, h: 30, depth: y + 0.5, minLevel: tier }) // kumaş canlı katmanda dalgalanır
      plazaDecor.push(g)
    }
    for (const deg of [90, 270, 0, 180]) {
      const t = deg * Math.PI / 180
      const ex = P.x + Math.cos(t) * prx, ey = P.y + Math.sin(t) * pry
      const side = deg % 180 === 0 ? { x: 0, y: TILE.h * 0.62 } : { x: TILE.w * 0.62, y: 0 }
      pole(ex - side.x, ey - side.y); pole(ex + side.x, ey + side.y)
    }
    tier = 5
    // Meydan fenerleri: bordür boyunca demir direkli kandiller.
    for (let k = 0; k < 8; k++) {
      const t = (k + 0.5) / 8 * Math.PI * 2
      const x = P.x + Math.cos(t) * prx * 0.97, y = P.y + Math.sin(t) * pry * 0.97
      const g = scene.add.graphics().setDepth(y)
      g.lineStyle(3, 0x2e2a26, 1); g.lineBetween(x, y, x, y - 58)
      g.lineBetween(x, y - 56, x + 10, y - 60)
      g.fillStyle(0x2e2a26, 1); g.fillTriangle(x + 4, y - 58, x + 16, y - 58, x + 10, y - 66)
      g.fillStyle(0xf6d27a, 1); g.fillRect(x + 6, y - 58, 8, 11)
      g.fillStyle(0x2e2a26, 1); g.fillRect(x + 5, y - 48, 10, 2)
      plazaDecor.push(g)
    }

    tier = 3
    // Caddelerin iki yanı servi ağaçlı (yalnızca sur içinde, arsalardan uzak).
    const wall = DEFENSE_FOUNDATION.map(p => p.screen)
    const insideWall = (x: number, y: number) => {
      let inside = false
      for (let i = 0, j = wall.length - 1; i < wall.length; j = i++) {
        const a = wall[i], b = wall[j]
        if ((a.y > y) !== (b.y > y) && x < (b.x - a.x) * (y - a.y) / (b.y - a.y) + a.x) inside = !inside
      }
      return inside
    }
    const nodeAt = new Map(ROAD_GRAPH.nodes.map(n => [n.id, n.screen]))
    const mainIds = (id: string) => id === HALL_SLOT_ID || /^st_(ave|gate|r0$|r6$|r12$|r18$)/.test(id)
    const tr = mulberry32(2718)
    for (const e of ROAD_GRAPH.edges) {
      if (!mainIds(e.from) || !mainIds(e.to)) continue
      if (e.from.startsWith('st_r') && e.to.startsWith('st_r')) continue
      const A = nodeAt.get(e.from)!, B = nodeAt.get(e.to)!
      const len = Math.hypot(B.x - A.x, B.y - A.y), ux = (B.x - A.x) / len, uy = (B.y - A.y) / len
      const off = TILE.w * 0.44
      for (let d = TILE.w * 0.3; d < len - TILE.w * 0.2; d += TILE.w * 0.52) {
        for (const side of [-1, 1]) {
          const x = A.x + ux * d - uy * off * side, y = A.y + uy * d + ux * off * side * 0.8
          const pr = ((x - P.x) / prx) ** 2 + ((y - P.y) / pry) ** 2
          if (pr < 1.35) continue // meydanın kendisi
          const rr = Math.hypot((x - P.x) / RING_ROAD.rx, (y - P.y) / RING_ROAD.ry)
          if (Math.abs(rr - 1) < 0.1) continue // çevre yolu kavşağı
          if (!insideWall(x, y) || y > shoreY(x) - TILE.h * 1.2) continue
          if (cityFountains().some(c => Math.hypot(x - c.x, (y - c.y) * 1.6) < TILE.w * 0.75)) continue // çeşme başı açık
          if (nearStreamAt(x, y, 40, 40)) continue // dere
          if ([...CITY_SLOTS, ...COAST_SLOTS, ...DEFENSE_SLOTS].some(s => s.id !== HALL_SLOT_ID && nearSlot(x, y, s, 0.95))) continue
          const img = stamp(tr() < 0.5 ? 'd_cypress' : 'd_cypress-b', x, y, TILE.w * (0.24 + tr() * 0.05), y, 0.92)
          if (img) plazaDecor.push(img)
        }
      }
    }
  }

  // 2f) OSMANLI DOKUSU: kuzey kapısı dışında servilikli mezarlık (sarıklı ve
  // fesli şahideler), liman yolunda tenteli çarşı tezgâhları.
  {
    const or = mulberry32(1453)
    // MEZARLIK.
    tier = 2
    const cem = cemeterySite()
    const cg = scene.add.graphics().setDepth(-702)
    cg.fillStyle(0x5f7d3c, 0.35); cg.fillEllipse(cem.x, cem.y, TILE.w * 4.2, TILE.h * 3.4)
    cg.lineStyle(3, 0xb8a47c, 0.8); cg.strokeEllipse(cem.x, cem.y, TILE.w * 4.2, TILE.h * 3.4)
    const stones: Array<{ x: number; y: number }> = []
    for (let r = -2; r <= 2; r++) {
      for (let c = -4; c <= 4; c++) {
        const x = cem.x + c * TILE.w * 0.42 + r * TILE.w * 0.2 + (or() - 0.5) * 12
        const y = cem.y + r * TILE.h * 0.55 + c * TILE.h * 0.1 + (or() - 0.5) * 8
        if (((x - cem.x) / (TILE.w * 1.9)) ** 2 + ((y - cem.y) / (TILE.h * 1.5)) ** 2 > 1) continue
        if (or() < 0.22) {
          const img = stamp(or() < 0.5 ? 'd_cypress' : 'd_cypress-b', x, y, TILE.w * (0.24 + or() * 0.06), y, 0.92)
          if (img) plazaDecor.push(img)
          continue
        }
        stones.push({ x, y })
      }
    }
    for (const st of stones) {
      const g = scene.add.graphics().setDepth(st.y)
      const h = 18 + or() * 12, w = 6 + or() * 2, tilt = (or() - 0.5) * 4
      g.fillStyle(0x2f421c, 0.25); g.fillEllipse(st.x + 5, st.y + 1, w * 2.4, 4)
      g.fillStyle(0xe9e4d6, 1); g.fillPoints([V(st.x - w / 2, st.y), V(st.x + w / 2, st.y), V(st.x + w / 2 + tilt, st.y - h), V(st.x - w / 2 + tilt, st.y - h)], true)
      g.fillStyle(0xc9c2ae, 1); g.fillRect(st.x + w / 2 - 2, st.y - h + 2, 2, h - 2)
      const top = or()
      if (top < 0.45) { // sarık
        g.fillStyle(0xf6f3ea, 1); g.fillEllipse(st.x + tilt, st.y - h - 3, w * 1.9, 8)
        g.lineStyle(1, 0xc9c2ae, 1); g.lineBetween(st.x + tilt - w * 0.8, st.y - h - 3, st.x + tilt + w * 0.8, st.y - h - 5)
      } else if (top < 0.75) { // fes
        g.fillStyle(0xa8322a, 1); g.fillRect(st.x + tilt - w * 0.55, st.y - h - 7, w * 1.1, 7)
      } else { // sivri (kadın mezarı), çiçek motifi
        g.fillStyle(0xe9e4d6, 1); g.fillTriangle(st.x + tilt - w / 2, st.y - h, st.x + tilt + w / 2, st.y - h, st.x + tilt, st.y - h - 7)
        g.fillStyle(0xc8453a, 1); g.fillCircle(st.x + tilt * 0.5, st.y - h * 0.6, 1.6)
      }
      plazaDecor.push(g)
    }

    tier = 5
    // İSKELE PAZARI: binalarla aynı çizim aracından arasta + çadırlı pazar
    // yeri; en yakın yola toprak bir patikayla bağlanır (bkz. cityBazaar).
    const bz = cityBazaar()
    if (bz && scene.textures.exists('b_pazar')) {
      const k = (FOOTPRINT_DIAMOND_W / ART_DIAMOND_PX) * 1.8 * 0.8
      // Patika: pazarın ön köşesinden yola, yol katmanının altında.
      const path = scene.add.graphics().setDepth(-802)
      const front = V(bz.x, bz.y + 211 * k * 0.5 * 0.8)
      const mid = V((front.x + bz.road.x) / 2 + (bz.road.y - front.y) * 0.15, (front.y + bz.road.y) / 2)
      const curve = new Phaser.Curves.QuadraticBezier(front, mid, V(bz.road.x, bz.road.y))
      path.lineStyle(TILE.w * 0.22, 0x9c8458, 0.5); curve.draw(path, 24)
      path.lineStyle(TILE.w * 0.16, 0xc2aa7a, 1); curve.draw(path, 24)
      plazaDecor.push(path)
      const img = scene.add.image(bz.x, bz.y + 118 * k, 'b_pazar').setOrigin(0.5, 1).setScale(k).setDepth(bz.y + 118 * k)
      plazaDecor.push(img)
    }
  }

  // 2g) YAŞAYAN ŞEHİR: sur içindeki bağlar, meyve bahçeleri, bostanlar ve
  // meralar; yol kavşaklarında ve kapı içlerinde Osmanlı çeşmeleri.
  {
    const fr = mulberry32(1071)
    // İzometrik eksenler (karo yönleri): u = gx yönü, v = gy yönü.
    const U = { x: TILE.w / 2, y: TILE.h / 2 }, Vv = { x: -TILE.w / 2, y: TILE.h / 2 }
    const at = (f: { x: number; y: number; hw: number }, a: number, b: number) => {
      // a, b ∈ [-1, 1]: tarla elmasının içinde izometrik koordinat.
      const k = f.hw / TILE.w
      return { x: f.x + (a * U.x + b * Vv.x) * k, y: f.y + (a * U.y + b * Vv.y) * k }
    }
    for (const [fi, f] of cityFields().entries()) {
      tier = fieldTier(fi)
      const g = scene.add.graphics().setDepth(f.y - f.hh)
      const corners = [at(f, -1, -1), at(f, 1, -1), at(f, 1, 1), at(f, -1, 1)].map(p => V(p.x, p.y))
      // Kuru taş sınır duvarı + zemin.
      const soil = f.kind === 'bostan' ? 0x9c7a4c : f.kind === 'bag' ? 0xa89868 : f.kind === 'mera' ? 0x8fb35a : 0x88a658
      g.fillStyle(0x2f421c, 0.18); g.fillPoints(corners.map(p => V(p.x + 6, p.y + 5)), true)
      g.fillStyle(soil, f.kind === 'mera' ? 0.55 : 0.95); g.fillPoints(corners, true)
      if (f.kind !== 'mera') { g.lineStyle(5, 0xcdbd98, 1); g.strokePoints(corners, true); g.lineStyle(1.5, 0x8a7550, 0.6); g.strokePoints(corners, true) }
      else { // Mera: çit kazıkları.
        for (let i = 0; i < 4; i++) {
          const a = corners[i], b = corners[(i + 1) % 4]
          g.lineStyle(2, 0x7a5a30, 0.9); g.lineBetween(a.x, a.y - 8, b.x, b.y - 8)
          for (let k = 0; k <= 8; k++) { const x = a.x + (b.x - a.x) * k / 8, y = a.y + (b.y - a.y) * k / 8; g.lineBetween(x, y, x, y - 12) }
        }
      }
      if (f.kind === 'bag') {
        // BAĞ: kazıklara sarılı asma sıraları, mor salkımlar.
        for (let r = -0.8; r <= 0.81; r += 0.2) {
          const a = at(f, -0.9, r), b = at(f, 0.9, r)
          g.lineStyle(1.5, 0x6a4a2a, 1); g.lineBetween(a.x, a.y - 9, b.x, b.y - 9)
          for (let t = 0; t <= 1.001; t += 0.1) {
            const x = a.x + (b.x - a.x) * t, y = a.y + (b.y - a.y) * t
            g.lineStyle(1.5, 0x6a4a2a, 1); g.lineBetween(x, y, x, y - 12)
            g.fillStyle(fr() < 0.5 ? 0x4f7d34 : 0x5f8f3c, 1); g.fillEllipse(x, y - 12, 13, 8)
            if (fr() < 0.35) { g.fillStyle(0x5b2a5a, 1); g.fillCircle(x + 3, y - 7, 2.4); g.fillCircle(x + 1.5, y - 5, 2) }
          }
        }
      } else if (f.kind === 'bostan') {
        // BOSTAN: toprak sıraları arasında sebze sıraları, bir kuyu ve korkuluk.
        for (let r = -0.85; r <= 0.86; r += 0.17) {
          const a = at(f, -0.9, r), b = at(f, 0.9, r)
          const crop = [0x6d9a3c, 0x8ab04a, 0x4f7d34][Math.round((r + 1) * 6) % 3]
          for (let t = 0; t <= 1.001; t += 0.07) {
            const x = a.x + (b.x - a.x) * t, y = a.y + (b.y - a.y) * t
            g.fillStyle(crop, 1); g.fillCircle(x, y - 2, 3.4)
            if (fr() < 0.08) { g.fillStyle(0xc8453a, 1); g.fillCircle(x + 2, y - 3, 1.8) }
          }
        }
        const w = at(f, 0.62, -0.62)
        g.fillStyle(0x8a8478, 1); g.fillEllipse(w.x, w.y, 26, 13); g.fillStyle(0x3f6f8a, 1); g.fillEllipse(w.x, w.y - 3, 18, 8)
        g.lineStyle(2.5, 0x6a4a2a, 1); g.lineBetween(w.x - 11, w.y - 2, w.x - 11, w.y - 26); g.lineBetween(w.x + 11, w.y - 2, w.x + 11, w.y - 26); g.lineBetween(w.x - 13, w.y - 26, w.x + 13, w.y - 26)
        g.lineStyle(1, 0x3a3a3a, 1); g.lineBetween(w.x, w.y - 26, w.x, w.y - 12); g.fillStyle(0x7a5a30, 1); g.fillRect(w.x - 3, w.y - 13, 6, 5)
        const s = at(f, -0.5, 0.55)
        g.lineStyle(2, 0x6a4a2a, 1); g.lineBetween(s.x, s.y, s.x, s.y - 30); g.lineBetween(s.x - 11, s.y - 22, s.x + 11, s.y - 22)
        g.fillStyle(0xb3261e, 1); g.fillRect(s.x - 5, s.y - 24, 10, 12); g.fillStyle(0xe9d7a6, 1); g.fillEllipse(s.x, s.y - 30, 16, 6)
      } else if (f.kind === 'meyve') {
        // MEYVE BAHÇESİ: sıra sıra nar ve zeytin ağaçları.
        for (let a = -0.6; a <= 0.61; a += 0.6) {
          for (let b = -0.6; b <= 0.61; b += 0.6) {
            const p = at(f, a + (fr() - 0.5) * 0.1, b + (fr() - 0.5) * 0.1)
            const pom = fr() < 0.5
            const img = stamp('d_olive-tree', p.x, p.y, TILE.w * (0.5 + fr() * 0.12), p.y, 0.92, 1, pom ? 0xc8e0a0 : undefined)
            if (img) plazaDecor.push(img)
            if (pom) {
              const d = scene.add.graphics().setDepth(p.y + 0.1)
              for (let k = 0; k < 6; k++) { d.fillStyle(0xc8231c, 1); d.fillCircle(p.x + (fr() - 0.5) * TILE.w * 0.36, p.y - TILE.h * (0.55 + fr() * 0.45), 2.6) }
              plazaDecor.push(d)
            }
          }
        }
      }
      plazaDecor.push(g)
    }

    // ÇEŞMELER: mermer ayna taşı, sivri kemerli niş, kitabe, tunç lüle, yalak.
    for (const c of cityFountains()) {
      tier = fountainTier(c)
      const g = scene.add.graphics().setDepth(c.y)
      const w = TILE.w * 0.52, h = TILE.h * 1.05, d = w * 0.3
      const x0 = c.x - w / 2, x1 = c.x + w / 2, y0 = c.y
      g.fillStyle(0x1b2a14, 0.24); g.fillEllipse(c.x + w * 0.3, y0 + 6, w * 1.5, 16)
      // Yan yüz, ön yüz, saçak.
      g.fillStyle(0xc9bfa8, 1); g.fillPoints([V(x1, y0), V(x1 + d, y0 - d / 2), V(x1 + d, y0 - d / 2 - h), V(x1, y0 - h)], true)
      g.fillStyle(0xf1ece0, 1); g.fillRect(x0, y0 - h, w, h)
      g.fillStyle(0xd9d1bd, 1); g.fillRect(x0, y0 - h * 0.12, w, h * 0.12)
      // Sivri kemerli niş.
      const nw = w * 0.56, nx = c.x, ny = y0 - h * 0.14
      g.fillStyle(0xcfc6b0, 1)
      g.fillPoints([V(nx - nw / 2, ny), V(nx - nw / 2, ny - h * 0.42), V(nx, ny - h * 0.66), V(nx + nw / 2, ny - h * 0.42), V(nx + nw / 2, ny)], true)
      g.lineStyle(1.5, 0xa99f88, 1)
      g.strokePoints([V(nx - nw / 2, ny), V(nx - nw / 2, ny - h * 0.42), V(nx, ny - h * 0.66), V(nx + nw / 2, ny - h * 0.42), V(nx + nw / 2, ny)], false)
      // Kitabe (yeşil zemin üstünde altın satırlar).
      g.fillStyle(0x2f5a44, 1); g.fillRect(x0 + w * 0.12, y0 - h * 0.95, w * 0.76, h * 0.18)
      g.lineStyle(1.2, 0xe2bd78, 1)
      for (const r of [0.33, 0.66]) g.lineBetween(x0 + w * 0.18, y0 - h * (0.95 - 0.18 * r), x0 + w * 0.82, y0 - h * (0.95 - 0.18 * r))
      // Saçak ve tepe.
      g.fillStyle(0x7f9690, 1); g.fillPoints([V(x0 - 6, y0 - h), V(x1 + 6, y0 - h), V(x1 + d + 6, y0 - h - d / 2), V(x0 + d - 6, y0 - h - d / 2)], true)
      g.fillStyle(0x9fb3ad, 1); g.fillEllipse(c.x + d / 2, y0 - h - d / 2 - 2, w * 0.5, 12)
      g.fillStyle(0xe2bd78, 1); g.fillRect(c.x + d / 2 - 1, y0 - h - d / 2 - 16, 2, 10)
      // Lüle, akan su, yalak.
      g.fillStyle(0xb8872e, 1); g.fillRect(nx - 2, ny - h * 0.3, 4, 6)
      g.lineStyle(2, 0x9fd6e8, 0.9); g.lineBetween(nx, ny - h * 0.3 + 6, nx, ny - 4)
      g.fillStyle(0xd9d1bd, 1); g.fillRect(x0 + w * 0.08, y0 - 8, w * 0.84, 10)
      g.fillStyle(0x5aa6c0, 1); g.fillRect(x0 + w * 0.14, y0 - 6, w * 0.72, 4)
      plazaDecor.push(g)
    }
  }

  tier = 0 // dere hep var
  // 2h) DERE: tepeden denize kıvrılan su; kıyıda saz ve taş, yolları geçtiği
  // yerlerde kemerli Osmanlı köprüsü, orta bölümde su değirmeni.
  {
    const st = cityStream()
    const sr = mulberry32(3131)
    const water = scene.add.graphics().setDepth(-803)
    const pass = (extra: number, color: number, alpha: number, scaleW = 1) => {
      for (let i = 0; i + 1 < st.pts.length; i++) {
        const a = st.pts[i], b = st.pts[i + 1]
        water.lineStyle(st.widths[i] * scaleW + extra, color, alpha)
        water.lineBetween(a.x, a.y, b.x, b.y)
      }
      for (let i = 0; i < st.pts.length; i += 3) { water.fillStyle(color, alpha); water.fillCircle(st.pts[i].x, st.pts[i].y, (st.widths[i] * scaleW + extra) / 2) }
    }
    pass(18, 0x5f7a3c, 0.55) // nemli çimen kıyı
    pass(9, 0x8a7a50, 1) // çamur kıyı
    pass(0, 0x3f8aa6, 1) // su
    pass(-6, 0x5aa6c0, 1) // açık su
    pass(-12, 0x8fd0e0, 0.55, 0.5) // parıltı
    // Ağızda denize açılan yelpaze.
    const m = st.pts[st.pts.length - 1]
    water.fillStyle(0x5aa6c0, 0.6); water.fillEllipse(m.x, m.y + 10, 90, 34)
    // Kıyı sazları ve taşlar.
    for (let i = 4; i < st.pts.length - 4; i += 7) {
      const a = st.pts[i - 1], b = st.pts[i + 1], l = Math.hypot(b.x - a.x, b.y - a.y) || 1
      const nx = -(b.y - a.y) / l, ny = (b.x - a.x) / l
      if (st.bridges.some(br => Math.hypot(br.x - st.pts[i].x, br.y - st.pts[i].y) < 60)) continue
      const side = sr() < 0.5 ? 1 : -1, off = st.widths[i] / 2 + 6
      const x = st.pts[i].x + nx * off * side, y = st.pts[i].y + ny * off * side
      const g = scene.add.graphics().setDepth(y)
      if (sr() < 0.7) {
        for (let k = 0; k < 6; k++) {
          const rx = x + (sr() - 0.5) * 16, h = 10 + sr() * 12
          g.lineStyle(1.6, sr() < 0.5 ? 0x4f7d34 : 0x7a9a44, 1); g.lineBetween(rx, y, rx + (sr() - 0.5) * 5, y - h)
          if (sr() < 0.3) { g.fillStyle(0x6a4a2a, 1); g.fillEllipse(rx + 1, y - h, 3, 7) }
        }
      } else {
        g.fillStyle(0x9a948a, 1); g.fillEllipse(x, y - 3, 14, 9); g.fillStyle(0xbab4a8, 1); g.fillEllipse(x - 2, y - 5, 8, 5)
      }
      plazaDecor.push(g)
    }
    // KÖPRÜLER: kambur taş köprü (yol dereyi dik keser).
    for (const br of st.bridges) {
      const g = scene.add.graphics().setDepth(br.y + 2)
      const sx = Math.cos(br.angle), sy = Math.sin(br.angle) // dere yönü
      const rx = -sy, ry = sx // yol yönü
      const L = 78, Wd = 36, hump = 9
      const P = (u: number, v: number, lift = 0) => V(br.x + rx * u + sx * v, br.y + ry * u + sy * v - lift)
      g.fillStyle(0x24424c, 0.45); g.fillEllipse(br.x + sx * 22, br.y + sy * 22 + 6, 46, 16)
      const deck = [P(-L / 2, -Wd / 2), P(0, -Wd / 2, hump), P(L / 2, -Wd / 2), P(L / 2, Wd / 2), P(0, Wd / 2, hump), P(-L / 2, Wd / 2)]
      g.fillStyle(0xb8a67e, 1); g.fillPoints(deck.map(p => V(p.x, p.y + 6)), true)
      g.fillStyle(0xd9c9a4, 1); g.fillPoints(deck, true)
      g.lineStyle(1, 0xa89468, 0.6)
      for (let u = -L / 2 + 10; u < L / 2; u += 10) { const a = P(u, -Wd / 2, hump * (1 - Math.abs(u) / (L / 2))), b = P(u, Wd / 2, hump * (1 - Math.abs(u) / (L / 2))); g.lineBetween(a.x, a.y, b.x, b.y) }
      // Korkuluklar (iki kenar) ve uçlarda taş babalar.
      for (const v of [-Wd / 2, Wd / 2]) {
        const rail = [-1, -0.5, 0, 0.5, 1].map(t => P(t * L / 2, v, hump * (1 - Math.abs(t)) + 7))
        g.lineStyle(6, 0xeee2c4, 1); g.strokePoints(rail, false)
        g.lineStyle(1.5, 0x9c8763, 0.8); g.strokePoints(rail.map(p => V(p.x, p.y + 3)), false)
        for (const t of [-1, 1]) { const q = P(t * L / 2, v, 12); g.fillStyle(0xeee2c4, 1); g.fillRect(q.x - 4, q.y - 4, 8, 10) }
      }
      // Kemer gözü (izleyiciye bakan yüzde).
      const face = sy * 1 >= 0 ? Wd / 2 : -Wd / 2
      const c = P(0, face)
      g.fillStyle(0x2e3a3a, 0.75); g.beginPath(); g.arc(c.x, c.y + 6, 13, Math.PI, 0, false); g.closePath(); g.fillPath()
      plazaDecor.push(g)
    }
    tier = 4
    // SU DEĞİRMENİ: taş zemin kat, ahşap üst kat, kiremit çatı (çark sahnede döner).
    if (st.mill) {
      const { x, y } = st.mill
      const g = scene.add.graphics().setDepth(y)
      const w = 112, h1 = 40, h2 = 34, d = 40
      g.fillStyle(0x1b2a14, 0.25); g.fillEllipse(x + 16, y + 6, w * 1.4, 22)
      g.fillStyle(0xa3998a, 1); g.fillPoints([V(x + w / 2, y), V(x + w / 2 + d, y - d / 2), V(x + w / 2 + d, y - d / 2 - h1), V(x + w / 2, y - h1)], true)
      g.fillStyle(0xc9bfa8, 1); g.fillRect(x - w / 2, y - h1, w, h1)
      g.fillStyle(0x7a5230, 1); g.fillRect(x - w / 2 + 2, y - h1 - h2, w - 4, h2)
      g.fillStyle(0x5f3f22, 1); g.fillPoints([V(x + w / 2 - 2, y - h1), V(x + w / 2 + d - 2, y - d / 2 - h1), V(x + w / 2 + d - 2, y - d / 2 - h1 - h2), V(x + w / 2 - 2, y - h1 - h2)], true)
      g.fillStyle(0x3a2a1c, 1); g.fillRect(x - 11, y - 30, 22, 30); g.fillRect(x - w / 2 + 14, y - h1 - 24, 14, 13); g.fillRect(x + w / 2 - 30, y - h1 - 24, 14, 13)
      g.fillStyle(0xb5532e, 1); g.fillPoints([V(x - w / 2 - 6, y - h1 - h2), V(x + w / 2 + 6, y - h1 - h2), V(x + w / 2 + d + 4, y - h1 - h2 - d / 2), V(x + d / 2, y - h1 - h2 - 46), V(x - w / 2 + d / 2 - 6, y - h1 - h2 - 38)], true)
      g.lineStyle(1.2, 0x8a3a20, 0.7)
      for (let k = 1; k < 7; k++) g.lineBetween(x - w / 2 - 6 + k * 4, y - h1 - h2 - k * 6, x + w / 2 + 6 + k * 4, y - h1 - h2 - k * 6)
      g.fillStyle(0xd9d1bd, 1); g.fillRect(x + 12, y - h1 - h2 - 52, 11, 20) // baca
      // Çuval ve saman.
      g.fillStyle(0xe2d3a6, 1); g.fillEllipse(x - w / 2 - 10, y - 5, 12, 12); g.fillEllipse(x - w / 2 - 20, y - 3, 11, 10)
      plazaDecor.push(g)
    }
  }

  // 2i) SU KEMERİ ve MAKSEM: iki katlı kemer dizisi tepeden şehre su taşır,
  // şehir içindeki maksemde (su terazisi) biter. Her göz ayrı parça; derinliği
  // tabanına göre: binalar ve surla doğru sıralanır.
  {
    tier = 6
    const aq = cityAqueduct()
    if (aq) {
      const dx = aq.to.x - aq.from.x, dy = aq.to.y - aq.from.y
      const len = Math.hypot(dx, dy), ux = dx / len, uy = dy / len
      // Zemin (karo) uzayında dik: kalınlık izleyiciye doğru.
      const gx = (x: number, y: number) => (x / (TILE.w / 2) + y / (TILE.h / 2)) / 2
      const gy = (x: number, y: number) => (y / (TILE.h / 2) - x / (TILE.w / 2)) / 2
      const lg = Math.hypot(gx(dx, dy), gy(dx, dy)) || 1
      let ngx = -gy(dx, dy) / lg * 0.34, ngy = gx(dx, dy) / lg * 0.34
      let nx = (ngx - ngy) * TILE.w / 2, ny = (ngx + ngy) * TILE.h / 2
      if (ny < 0) { nx = -nx; ny = -ny; ngx = -ngx; ngy = -ngy } // ön yüz izleyiciye baksın
      const Pt = (s: number, z: number, off = 0) => V(aq.from.x + ux * s + nx * off, aq.from.y + uy * s + ny * off - z)
      const B = 58, pw = 15
      const H1 = 82, S1 = 48, H2 = 132, S2 = 106, TOP = 146
      const face = 0xd8c39a, faceDk = 0xb9a276, soffit = 0x6e5a3e, cap = 0xeadbb6
      const n = Math.floor((len - 36) / B)
      const arch = (s0: number, s1: number, spring: number, rise: number, off: number) => {
        const pts: Phaser.Math.Vector2[] = []
        for (let k = 0; k <= 10; k++) {
          const a = k / 10
          pts.push(Pt(s0 + (s1 - s0) * a, spring + Math.sin(a * Math.PI) * rise, off))
        }
        return pts
      }
      for (let i = 0; i < n; i++) {
        const s0 = i * B, s1 = s0 + B
        // Surla kesişen göz surdaki su kapısının içinden geçer (bkz. drawWalls).
        const g = scene.add.graphics().setDepth(Math.max(Pt(s0, 0).y, Pt(s1, 0).y) + ny + 1)
        g.fillStyle(0x2f421c, 0.2)
        g.fillPoints([Pt(s0, 0, 1), Pt(s1, 0, 1), V(Pt(s1, 0, 1).x + 22, Pt(s1, 0, 1).y + 16), V(Pt(s0, 0, 1).x + 22, Pt(s0, 0, 1).y + 16)], true)
        for (const [lo, spring, hi, p] of [[0, S1, H1, pw], [H1, S2, H2, pw * 0.8]] as const) {
          const a0 = s0 + p / 2, a1 = s1 - p / 2
          const rise = Math.min((a1 - a0) * 0.55, hi - spring - 6)
          // Kemer altı (tonoz yüzü): ön ve arka kemer eğrisi arasında koyu şerit.
          const fa = arch(a0, a1, spring, rise, ny > 0 ? 1 : 0), ba = arch(a0, a1, spring, rise, ny > 0 ? 0 : 1)
          g.fillStyle(soffit, 1); g.fillPoints([...fa, ...ba.reverse()], true)
          // Ayakların yan yüzü.
          g.fillStyle(faceDk, 1)
          g.fillPoints([Pt(a1, lo, 1), Pt(a1, lo, 0), Pt(a1, spring, 0), Pt(a1, spring, 1)], true)
          // Ön yüz: sol ayak + sağ ayak + kemer üstü kuşak (kemer eğrisiyle).
          g.fillStyle(face, 1)
          g.fillPoints([Pt(s0, lo, 1), Pt(a0, lo, 1), Pt(a0, spring, 1), Pt(s0, spring, 1)], true)
          g.fillPoints([Pt(a1, lo, 1), Pt(s1, lo, 1), Pt(s1, spring, 1), Pt(a1, spring, 1)], true)
          g.fillPoints([Pt(s0, spring, 1), ...arch(a0, a1, spring, rise, 1), Pt(s1, spring, 1), Pt(s1, hi, 1), Pt(s0, hi, 1)], true)
          // Taş sıraları ve kemer taşları.
          g.lineStyle(1, 0x9c8763, 0.5)
          for (let z = lo + 12; z < hi; z += 12) {
            if (z > spring - 1 && z < spring + rise) { g.lineBetween(Pt(s0, z, 1).x, Pt(s0, z, 1).y, Pt(a0 - 1, z, 1).x, Pt(a0 - 1, z, 1).y); g.lineBetween(Pt(a1 + 1, z, 1).x, Pt(a1 + 1, z, 1).y, Pt(s1, z, 1).x, Pt(s1, z, 1).y) }
            else g.lineBetween(Pt(s0, z, 1).x, Pt(s0, z, 1).y, Pt(s1, z, 1).x, Pt(s1, z, 1).y)
          }
          g.lineStyle(2, 0xb39c74, 1); g.strokePoints(arch(a0, a1, spring, rise, 1), false)
          g.fillStyle(cap, 1)
          g.fillPoints([Pt(s0, hi, 1), Pt(s1, hi, 1), Pt(s1, hi + 3, 1), Pt(s0, hi + 3, 1)], true)
        }
        // Su yolu (oluk): üst yüz, içinde akan su.
        g.fillStyle(face, 1); g.fillPoints([Pt(s0, H2, 1), Pt(s1, H2, 1), Pt(s1, TOP, 1), Pt(s0, TOP, 1)], true)
        g.fillStyle(cap, 1); g.fillPoints([Pt(s0, TOP, 1), Pt(s1, TOP, 1), Pt(s1, TOP, 0), Pt(s0, TOP, 0)], true)
        g.fillStyle(0x4f9bb5, 1); g.fillPoints([Pt(s0, TOP + 0.5, 0.65), Pt(s1, TOP + 0.5, 0.65), Pt(s1, TOP + 0.5, 0.35), Pt(s0, TOP + 0.5, 0.35)], true)
        plazaDecor.push(g)
      }
      // MAKSEM: kare taş kule, sivri kemerli pencere, kurşun kırma çatı, alem.
      const m = aq.to, hw = TILE.w * 0.42, hh = hw / 2, mh = 150
      const W_ = V(m.x - hw, m.y), S_ = V(m.x, m.y + hh), E_ = V(m.x + hw, m.y), N_ = V(m.x, m.y - hh)
      const up = (p: Phaser.Math.Vector2, z: number) => V(p.x, p.y - z)
      const mg = scene.add.graphics().setDepth(m.y + hh + 2)
      mg.fillStyle(0x2f421c, 0.25); mg.fillEllipse(m.x + 26, m.y + hh + 4, hw * 2.6, hh * 1.6)
      mg.fillStyle(face, 1); mg.fillPoints([W_, S_, up(S_, mh), up(W_, mh)], true)
      mg.fillStyle(faceDk, 1); mg.fillPoints([S_, E_, up(E_, mh), up(S_, mh)], true)
      mg.lineStyle(1, 0x9c8763, 0.5)
      for (let z = 14; z < mh; z += 14) { mg.lineBetween(W_.x, W_.y - z, S_.x, S_.y - z); mg.lineBetween(S_.x, S_.y - z, E_.x, E_.y - z) }
      // Pencereler (sivri kemer) ve su ağzı.
      for (const [a, b] of [[W_, S_], [S_, E_]] as const) {
        const cx = (a.x + b.x) / 2, cy = (a.y + b.y) / 2
        mg.fillStyle(0x3a2d24, 1)
        mg.fillPoints([V(cx - 7, cy - 70), V(cx + 7, cy - 70 + (b.y - a.y) * 0.12), V(cx + 7, cy - 96 + (b.y - a.y) * 0.12), V(cx, cy - 106), V(cx - 7, cy - 96)], true)
      }
      mg.fillStyle(cap, 1); mg.fillPoints([up(W_, mh), up(S_, mh), up(E_, mh), up(N_, mh)], true)
      const apex = V(m.x, m.y - mh - 46)
      mg.fillStyle(0x7b949c, 1); mg.fillPoints([up(W_, mh - 4), up(S_, mh - 4), apex], true)
      mg.fillStyle(0x8fa7ae, 1); mg.fillPoints([up(S_, mh - 4), up(E_, mh - 4), apex], true)
      mg.fillStyle(0xe2bd78, 1); mg.fillRect(apex.x - 1.5, apex.y - 14, 3, 14); mg.fillCircle(apex.x, apex.y - 16, 3)
      plazaDecor.push(mg)
    }
  }

  tier = 0
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
  // Ambient ağaç/çalılar boş slotların çevresine kadar yaklaşabilir. Bir slot
  // sonradan inşa edilince statik terrain'i yeniden üretmek yerine yalnızca
  // o binayla çakışan ambient sprite'ları gizleriz (save/slot etkilenmez).
  const ambientDecor: Array<{ image: Phaser.GameObjects.Image; x: number; y: number }> = []
  const syncAmbientDecor = (activeSlotIds: string[]) => {
    const active = new Set(activeSlotIds)
    active.add(HALL_SLOT_ID)
    const occupiedSlots = [...active].map(id => slotById(id)).filter(
      (slot): slot is NonNullable<typeof slot> => slot != null,
    )
    for (const item of ambientDecor) {
      item.image.setVisible(!occupiedSlots.some(slot => nearSlot(item.x, item.y, slot, 1.14)))
    }
  }

  let lastRoadKey = ''
  let roadTextures: Phaser.GameObjects.GameObject[] = []

  const updateRoads = (level: number, activeSlotIds: string[] = occupiedSlotIds) => {
    const tier = roadTierForHallLevel(level)
    const active = new Set(activeSlotIds)
    active.add(HALL_SLOT_ID)
    const roadKey = tier + ':' + [...active].sort().join(',')
    if (roadKey === lastRoadKey) return
    lastRoadKey = roadKey
    syncAmbientDecor(activeSlotIds)
    roads.clear().setVisible(true)
    for (const o of roadTextures) o.destroy()
    roadTextures = []

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

    // Henüz açılmamış bir arsanın İÇİNDEN geçen yol, arsa kenarında kesik
    // kalmasın: uçları arsa ortasına bağlanır, yol tek parça görünür.
    const through: RoadCurve[] = []
    for (const r of visibleCurves) {
      for (const [id, end] of [[r.from, r.curve.getPoint(0)], [r.to, r.curve.getPoint(1)]] as const) {
        const slot = active.has(id) ? null : slotById(id)
        if (!slot || slot.type !== 'city') continue
        through.push({ from: id, to: id, kind: r.kind, curve: new Phaser.Curves.Line(end, V(slot.screen.x, slot.screen.y)) })
      }
    }
    visibleCurves.push(...through)

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
      const alpha = r.kind === 'avenue' ? 1 : r.kind === 'street' ? 0.95 : 1
      roads.lineStyle(TILE.w * s.shoulderW, s.shoulder, s.shoulderAlpha * alpha)
      r.curve.draw(roads, 36)
    }
    for (const r of visibleCurves) {
      const s = roadStyleFor(r.kind, level)
      const alpha = r.kind === 'avenue' ? 1 : r.kind === 'street' ? 0.95 : 1
      roads.lineStyle(TILE.w * s.borderW, s.border, s.borderAlpha * alpha)
      r.curve.draw(roads, 36)
    }
    for (const r of visibleCurves) {
      const s = roadStyleFor(r.kind, level)
      const alpha = r.kind === 'avenue' ? 1 : r.kind === 'street' ? 0.95 : 1
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
        roads.fillStyle(isDirt ? 0x675338 : s.stoneColor, isDirt ? 0.25 : 0.35 + rnd() * 0.3)
        roads.fillEllipse(x, y, stoneW, stoneH)
      }
    }
    // Yol ağı (binlerce taş) dokuya pişirilir; yollar ana görsel olduğundan bütçesi yüksek.
    roadTextures = bakeGraphics(scene, roads, { keep: true, maxPixels: 4_000_000 }).filter(o => o !== roads)
  }
  updateRoads(divanLevel, occupiedSlotIds)

  // Normal görünümde sabit arsa / Divanhane meydan plakası çizilmez.
  // Kurulu yapıların doğal açıklığı Phaser bina katmanında dinamik üretilir.

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
    wy < shoreY(wx) - TILE.h * 0.58 &&
    ((wx - PLAZA.screen.x) / PLAZA.rx) ** 2 + ((wy - PLAZA.screen.y) / PLAZA.ry) ** 2 > 1.5 &&
    !cityFields().some(f => Math.abs(wx - f.x) / (f.hw + 30) + Math.abs(wy - f.y) / (f.hh + 15) < 1) &&
    !cityFountains().some(c => Math.hypot(wx - c.x, (wy - c.y) * 2) < TILE.w * 0.8) &&
    !nearStreamAt(wx, wy, 46, 30) &&
    !aqueductHits(wx, wy, 40, 26) &&
    !(cityBazaar() && Math.abs(cityBazaar()!.x - wx) < 200 && wy > cityBazaar()!.y - 120 && wy < cityBazaar()!.y + 100) &&
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
    const image = stamp(key, wx, wy, decorWidth(key), -700, 0.92, alpha)
    if (image) ambientDecor.push({ image, x: wx, y: wy })
  }

  // Ikariam hissi: dekor "nesne" değil, YEŞİL KÜTLE gibi davranır.
  const clusterRnd = mulberry32(9917)
  const clusterCenters: Array<{ x: number; y: number; size: number; spread: number }> = []

  const placeCluster = (cx: number, cy: number, size: number, spread: number) => {
    // 2-3 zeytin ağacı aynı kütlenin omurgasını kurar.
    const treeCount = Math.min(3, Math.max(2, Math.round(size / 3)))
    for (let i = 0; i < treeCount; i++) {
      const a = (i / treeCount) * Math.PI * 2 + clusterRnd() * 0.7
      const r = TILE.w * spread * (i === 0 ? 0.05 : 0.24 + clusterRnd() * 0.18)
      placeDecor(
        cx + Math.cos(a) * r,
        cy + Math.sin(a) * r * 0.42,
        clusterRnd() < 0.3 ? 'd_cypress' : 'd_olive-tree',
        0.82 + clusterRnd() * 0.10,
        0.68,
      )
    }

    for (let i = treeCount; i < size; i++) {
      const a = clusterRnd() * Math.PI * 2
      const radius = Math.sqrt(clusterRnd())
      const rx = TILE.w * spread * radius
      const ry = TILE.h * spread * 1.15 * radius
      const roll = clusterRnd()
      const key = roll < 0.60 ? 'd_bush' : roll < 0.83 ? 'd_flower' : 'd_rock'
      placeDecor(
        cx + Math.cos(a) * rx,
        cy + Math.sin(a) * ry,
        key,
        0.62 + clusterRnd() * 0.18,
        0.66,
      )
    }
  }

  // İç alanda az sayıda ama daha büyük koruluk.
  let guard = 0
  while (clusterCenters.length < 14 && guard++ < 320) {
    const x = wr.x + wr.w * (0.08 + clusterRnd() * 0.84)
    const y = wr.y + (shoreY(x) - wr.y) * (0.08 + clusterRnd() * 0.78)
    if (!clearForDecor(x, y, 0.78)) continue
    if (clusterCenters.some(c => Math.hypot(c.x - x, c.y - y) < TILE.w * 2.15)) continue
    clusterCenters.push({
      x, y,
      size: 6 + Math.floor(clusterRnd() * 5),
      spread: 0.48 + clusterRnd() * 0.25,
    })
  }
  for (const c of clusterCenters) placeCluster(c.x, c.y, c.size, c.spread)

  // Haritanın üst/yan kenarlarını koruluklarla hafifçe çerçevele.
  // Bu, sonsuz boş zemin hissini keser ama şehir merkezini kapatmaz.
  const edgeAnchors = [
    [0.10, 0.16], [0.28, 0.09], [0.50, 0.07], [0.72, 0.10], [0.90, 0.17],
    [0.07, 0.38], [0.93, 0.40], [0.09, 0.63], [0.91, 0.64],
  ] as const
  for (const [px, py] of edgeAnchors) {
    const x = wr.x + wr.w * px + (clusterRnd() - 0.5) * TILE.w * 0.45
    const y = wr.y + (shoreY(x) - wr.y) * py + (clusterRnd() - 0.5) * TILE.h * 0.65
    if (clearForDecor(x, y, 0.72)) placeCluster(x, y, 7 + Math.floor(clusterRnd() * 4), 0.56)
  }

  // Yol kenarında sadece birkaç küçük doğal parça; ritmik süs dizisi yok.
  for (const r of curves.filter(r => r.kind === 'avenue')) {
    for (const t of [0.30, 0.72]) {
      if (clusterRnd() > 0.24) continue
      const p = r.curve.getPoint(t)
      const tangent = r.curve.getTangent(t)
      const len = Math.hypot(tangent.x, tangent.y) || 1
      const side = clusterRnd() > 0.5 ? 1 : -1
      const nx = -tangent.y / len, ny = tangent.x / len
      const distance = TILE.w * (0.50 + clusterRnd() * 0.14)
      const x = p.x + nx * distance * side
      const y = p.y + ny * distance * side
      if (clearForDecor(x, y, 0.68)) placeCluster(x, y, 3 + Math.floor(clusterRnd() * 3), 0.30)
    }
  }

  /*
   * IKARIAM ÇERÇEVESİ — kasaba ormanla çevrili bir AÇIKLIKTA durur.
   *
   * Savunma halkasının dışında, merkezden uzaklaştıkça SIKLAŞAN bir zeytinlik/
   * çalılık kuşağı; dış kenarlara doğru kayalık artar. Geniş haritanın boşluğunu
   * şehir değil MANZARA doldurur. Belediye hizasının altında açıklık yalnızca
   * yanlara uzanır; kasaba ile liman arasındaki kıyı şeridi açık kalır. Yollar,
   * slotlar ve deniz clearForDecor ile korunur. Yeni görsel yok: mevcut dekor.
   */
  {
    const hallS = slotById(HALL_SLOT_ID)!.screen
    const ringXs = DEFENSE_FOUNDATION.map(p => p.screen.x)
    const ringYs = DEFENSE_FOUNDATION.map(p => p.screen.y)
    const clearRx = Math.max(...ringXs.map(x => Math.abs(x - hallS.x))) + TILE.w * 0.9
    const clearTop = hallS.y - Math.min(...ringYs) + TILE.h * 2.2
    // Orman burunlara da iner; kıyıdan kum/kayalık şeridi kadar geride durur.
    const coastTop = seaLine + TILE.h * 16
    const wildRnd = mulberry32(31337)
    const mine = mineSite()
    const cem = cemeterySite()
    const tints = [0xffffff, 0xeef3e2, 0xe3ebd4, 0xf4eedc, 0xdde6cc]
    const wild: Array<{ x: number; y: number; key: string; w: number; tint: number; flip: boolean; clump: number }> = []
    const stepX = TILE.w * 0.62, stepY = TILE.h * 0.95
    // Düşük frekanslı YOĞUNLUK ALANI: ağaçlar tek tek serpilmez, koruluk
    // KÜTLELERİ oluşturur; aralarında çayır boşlukları kalır (≈[-1,1]).
    const S = TILE.w * 3.2
    const grove = (x: number, y: number) => (
      Math.sin(x / S + 1.3) * Math.cos(y / (S * 0.6) - 0.7)
      + 0.6 * Math.sin((x + y * 1.7) / (S * 1.9) + 2.1)
      + 0.35 * Math.cos((x * 0.8 - y) / (S * 1.1) + 0.4)) / 1.95
    for (let y = wr.y + TILE.h * 0.6; y < coastTop; y += stepY) {
      for (let x = wr.x + TILE.w * 0.3; x < wr.x + wr.w; x += stepX) {
        const jx = x + (wildRnd() - 0.5) * stepX * 0.9
        const jy = y + (wildRnd() - 0.5) * stepY * 0.9
        if (jy > shoreY(jx) - TILE.h * 2.4) { wildRnd(); wildRnd(); wildRnd(); continue }
        const dx = (jx - hallS.x) / clearRx
        const dy = jy < hallS.y ? (hallS.y - jy) / clearTop : 0
        const e = Math.hypot(dx, dy)
        const roll = wildRnd(), pick = wildRnd(), size = wildRnd()
        if (e < 1) continue // kasabanın açıklığı
        if (Math.hypot((jx - mine.x) / 2, jy - mine.y) < TILE.h * 3.2) continue // ada madeni
        if (Math.hypot((jx - cem.x) / 2, jy - cem.y) < TILE.h * 3.6) continue // mezarlık
        const t = Math.min(1, (e - 1) / 0.45) // açıklık kenarından uzaklık
        const g = grove(jx, jy)
        const clump = Math.min(1, Math.max(0, (g + 0.15) / 0.6)) // 0 çayır .. 1 koru
        // Koru içinde taç taca (sık kütle), çayırda seyrek; açıklık kenarında incelir.
        if (roll > (0.10 + 0.70 * t) * (0.12 + 1.6 * clump)) continue
        if (!clearForDecor(jx, jy, 0.8)) continue
        const rockBias = 0.08 * t
        const key = pick < 0.52 - rockBias ? 'd_olive-tree'
          : pick < 0.60 - rockBias ? 'd_cypress'
          : pick < 0.66 - rockBias ? 'd_cypress-b'
          : pick < 0.84 - rockBias ? 'd_bush'
          : pick < 0.96 ? 'd_rock' : 'd_flower'
        const w = key === 'd_olive-tree' ? TILE.w * (0.62 + size * 0.34 + clump * 0.36)
          : key.startsWith('d_cypress') ? TILE.w * (0.30 + size * 0.12)
          : key === 'd_rock' ? TILE.w * (0.30 + size * 0.18)
          : key === 'd_bush' ? TILE.w * (0.30 + size * 0.14)
          : TILE.w * (0.24 + size * 0.08)
        wild.push({ x: jx, y: jy, key, w, tint: tints[Math.floor(size * tints.length) % tints.length], flip: pick > 0.5, clump })
      }
    }
    // Orman TABANI: koruların altına yumuşak koyu gölge; taçlar tek tek değil
    // KÜTLE olarak okunur (tek Graphics, ucuz).
    const floor = scene.add.graphics().setDepth(-706)
    for (const p of wild) {
      if (p.clump < 0.45 || p.key !== 'd_olive-tree') continue
      floor.fillStyle(0x2f4a24, 0.10 + 0.10 * p.clump)
      floor.fillEllipse(p.x, p.y - TILE.h * 0.35, p.w * 1.35, p.w * 0.62)
    }
    // Arkadan öne: aşağıdaki ağaç yukarıdakinin gövdesini örter.
    wild.sort((a, b) => a.y - b.y)
    for (const p of wild) {
      const image = stamp(p.key, p.x, p.y, p.w, -700, 0.92, 1, p.tint)
      if (image) { image.setFlipX(p.flip); ambientDecor.push({ image, x: p.x, y: p.y }) }
    }
  }

  // İlk updateRoads çağrısı dekor üretilmeden önce yapılıyor.
  // İlk bina/arsa doluluğunu tüm koruluklar yaratıldıktan sonra da uygula.
  syncAmbientDecor(occupiedSlotIds)
  // Sabit arazi katmanlarını dokuya pişir (yollar ayrı: her güncellemede).
  tier = 0
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
    for (const [o, t] of tierOf) (o as unknown as Phaser.GameObjects.Components.Visible).setVisible(level >= t)
  }
  return { updateRoads, flags, setDevelopment }
}
