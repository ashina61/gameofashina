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
export const DECOR_TILES = ['olive-tree', 'bush', 'flower', 'rock', 'cypress', 'cypress-b'] as const
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
  for (const sh of SHIP_TILES) {
    if (!scene.textures.exists('s_' + sh)) scene.load.image('s_' + sh, asset(`/images/game/ships/${sh}.png`))
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
  /*
   * ORGANİK KIYI (Ikariam koyu). Liman slotlarının önünde kıyı seaLine'da
   * kalır (rıhtımlar yerinden oynamaz); iki yanda kara, asimetrik iki BURUN
   * olarak denize uzanır ve limanı bir koyun içine alır. Burunlarda kıyı
   * dalgalanır. Bütün kara/deniz sınırları bu eğriyi kullanır.
   */
  const bayCx = slotById(HALL_SLOT_ID)!.screen.x
  const bayHalf = Math.max(...COAST_SLOTS.map(s => Math.abs(s.screen.x - bayCx))) + TILE.w * 1.1
  const smooth01 = (t: number) => { const c = Math.min(1, Math.max(0, t)); return c * c * (3 - 2 * c) }
  const shoreY = (x: number) => {
    const d = x - bayCx
    const side = d < 0
    const H = side ? TILE.h * 16 : TILE.h * 11 // sol burun daha derin (asimetri)
    const ramp = side ? TILE.w * 4.6 : TILE.w * 6.2
    const out = smooth01((Math.abs(d) - bayHalf) / ramp)
    // Koylar ve çıkıntılar: düşük frekanslı büyük dalga + küçük kırıntılar.
    const wave = TILE.h * 1.7 * Math.sin(x / (TILE.w * 4.2) + 0.4)
      + TILE.h * 0.85 * Math.sin(x / (TILE.w * 2.1) + 2.2)
      + TILE.h * 0.35 * Math.sin(x / (TILE.w * 0.83) + 1.3)
    const waveOn = smooth01((Math.abs(d) - bayHalf + TILE.w) / (TILE.w * 2))
    return seaLine + H * out + wave * waveOn
  }
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

  const updateRoads = (level: number, activeSlotIds: string[] = occupiedSlotIds) => {
    const tier = roadTierForHallLevel(level)
    const active = new Set(activeSlotIds)
    active.add(HALL_SLOT_ID)
    const roadKey = tier + ':' + [...active].sort().join(',')
    if (roadKey === lastRoadKey) return
    lastRoadKey = roadKey
    syncAmbientDecor(activeSlotIds)
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
      const alpha = r.kind === 'avenue' ? 0.54 : r.kind === 'street' ? 0.24 : 0.62
      roads.lineStyle(TILE.w * s.shoulderW, s.shoulder, s.shoulderAlpha * alpha)
      r.curve.draw(roads, 36)
    }
    for (const r of visibleCurves) {
      const s = roadStyleFor(r.kind, level)
      const alpha = r.kind === 'avenue' ? 0.48 : r.kind === 'street' ? 0.18 : 0.58
      roads.lineStyle(TILE.w * s.borderW, s.border, s.borderAlpha * alpha)
      r.curve.draw(roads, 36)
    }
    for (const r of visibleCurves) {
      const s = roadStyleFor(r.kind, level)
      const alpha = r.kind === 'avenue' ? 0.46 : r.kind === 'street' ? 0.16 : 0.56
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
        roads.fillStyle(isDirt ? 0x675338 : s.stoneColor, isDirt ? 0.085 : 0.10 + rnd() * 0.11)
        roads.fillEllipse(x, y, stoneW, stoneH)
      }
    }
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
  return { updateRoads }
}
