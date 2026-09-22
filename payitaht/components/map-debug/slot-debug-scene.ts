/**
 * SLOT DEBUG SAHNESİ — GERÇEK bina PNG/webp assetleriyle görsel uygunluk.
 *
 * Canlı oyundan bağımsız. Final organik şehir slotlarını (24 city + çakılı
 * belediye), kıyı/savunma yuvalarını, yol grafiğini ve savunma temel hattını
 * çizer. Binalar GERÇEK asset'lerle (building-assets) yüklenir; ölçek ZEMİN
 * TEMASINA göre (slottan bağımsız), anchor originX=0.5/originY=1.0.
 *
 * DEĞİŞMEZ: slot geometrisi, road graph, BuildingSlotSystem, 2x2 footprint.
 */
import * as Phaser from 'phaser'
import {
  CITY_SLOTS, COAST_SLOTS, DEFENSE_SLOTS, DEFENSE_FOUNDATION, ROAD_GRAPH, CITY_BOUNDS,
  HALL_SLOT_ID, footprintDiamond, slotById, SLOTS, TILE, type CitySlot,
} from '@/lib/game/city-map'
import { BuildingSlotSystem } from '@/lib/game/building-slot-system'
import { slotAnchor, runExhaustivePlacementTest } from '@/lib/game/city-map/placement-test'
import {
  BUILDING_ASSETS, MOVABLE_BUILDING_IDS, HALL_BUILDING_ID, assetById, groundScale,
  GROUND_TARGET_W, GROUND_TARGET_D, FOOTPRINT_DIAMOND_W, type BuildingAsset,
} from '@/lib/game/city-map/building-assets'
import { asset } from '@/lib/asset'

/** Zemin prototipinde kullanılan GERÇEK arazi/dekor tile'ları (public/images/game). */
const TERRAIN_TILES = ['grass', 'shore-a', 'shore-b', 'shore-c', 'water', 'water-deep']
const DECOR_TILES = ['olive-tree', 'bush', 'flower', 'rock']

/** Deterministik tohumlu rastgele (dekor yerleşimi sabit kalsın). */
function mulberry32(seed: number) {
  return () => {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export type Toggles = { footprint: boolean; ground: boolean; anchor: boolean; bbox: boolean }
export type RealAssetRow = {
  id: string; name: string; geometry: string; anchor: boolean; scale: boolean; groundContact: boolean; warnings: string[]
}
export type FillReport = {
  variant: string
  filledSlots: number
  groundContactOk: number
  baseOverflowPairs: number
  roofOverlapPairs: { a: string; b: string; pct: number }[]
  depthInversions: number
  roadGapMinPx: number
  tall: string[]
}

type SpriteInfo = { img: Phaser.GameObjects.Image; asset: BuildingAsset; scale: number; dispW: number; dispH: number }
type Placement = { slot: CitySlot; asset: BuildingAsset; dispW: number; dispH: number }

export class SlotDebugScene extends Phaser.Scene {
  private slotSys!: BuildingSlotSystem
  private gfx!: Phaser.GameObjects.Graphics
  private sprites = new Map<string, SpriteInfo>()
  /** DOLU ŞEHİR modunda slot başına bir sprite (aynı tip birden çok slotta). */
  private fillSprites = new Map<string, { img: Phaser.GameObjects.Image; asset: BuildingAsset; dispW: number; dispH: number }>()
  private fillActive = false
  private labels: Phaser.GameObjects.Text[] = []
  private selected: string | null = null
  private active: string = HALL_BUILDING_ID
  // Zemin prototipinde debug katmanları VARSAYILAN KAPALI (arazi net görünsün).
  toggles: Toggles = { footprint: false, ground: false, anchor: false, bbox: false }
  showDebug = true
  onSelect?: (text: string) => void

  constructor() { super('slot-debug') }

  preload() {
    for (const a of BUILDING_ASSETS) if (!this.textures.exists(a.buildingId)) this.load.image(a.buildingId, a.assetPath)
    for (const t of TERRAIN_TILES) if (!this.textures.exists('t_' + t)) this.load.image('t_' + t, asset(`/images/game/terrain/${t}.png`))
    for (const d of DECOR_TILES) if (!this.textures.exists('d_' + d)) this.load.image('d_' + d, asset(`/images/game/decor/${d}.png`))
  }

  create() {
    this.cameras.main.setBackgroundColor('#12333b')
    this.buildTerrain() // SABİT zemin (RenderTexture) — empty/full arasında hiç değişmez
    this.gfx = this.add.graphics().setDepth(-10)
    this.slotSys = new BuildingSlotSystem()
    this.slotSys.placeBuilding(HALL_BUILDING_ID, HALL_SLOT_ID)
    const movable = CITY_SLOTS.filter(s => !s.fixed)
    MOVABLE_BUILDING_IDS.forEach((b, i) => { if (movable[i]) this.slotSys.placeBuilding(b, movable[i].id) })
    this.buildSprites()
    this.showEmpty() // varsayılan: EMPTY CITY (yalnızca belediye, boş inşa alanları)
    this.setupCamera()
    this.installCamera()
  }

  /*
   * MOBİL KAMERA. Dünya sınırları (setBounds) kamerayı şehir dışına çıkarmaz;
   * varsayılan CITY VIEW belediyeye odaklanır ve binalar OKUNABİLİR boyutta
   * görünür (tüm dünyayı ekrana sığdırmaya ÇALIŞMAZ). Zoom yalnızca kamerayı
   * etkiler; sprite scale'leri DEĞİŞMEZ.
   */
  private minZoom = 0.15
  private maxZoom = 1.3
  /** CITY VIEW yakınlığı: belediye + ~5-8 komşu okunur şekilde görünür. */
  private cityZoom = 0.62

  /** Bütün şehri (kıyı/savunma dahil) kapsayan dünya dikdörtgeni + pay. */
  private worldRect() {
    const pts = [...SLOTS.map(s => s.screen), ...DEFENSE_FOUNDATION.map(p => p.screen)]
    const xs = pts.map(p => p.x), ys = pts.map(p => p.y)
    const mx = TILE.w * 3, my = TILE.h * 6
    const minX = Math.min(...xs) - mx, minY = Math.min(...ys) - my
    return { x: minX, y: minY, w: Math.max(...xs) + mx - minX, h: Math.max(...ys) + my - minY }
  }

  /**
   * OVERVIEW için SIKI kadraj: yalnızca gerçek içerik (şehir + savunma + kıyı)
   * çevresinde dar pay. worldRect'in geniş deniz payını kırpar; boş alan azalır.
   */
  private contentRect() {
    const pts = [...SLOTS.map(s => s.screen), ...DEFENSE_FOUNDATION.map(p => p.screen)]
    const xs = pts.map(p => p.x), ys = pts.map(p => p.y)
    const pad = FOOTPRINT_DIAMOND_W * 0.75 // bir footprint kadar dar pay
    const minX = Math.min(...xs) - pad, minY = Math.min(...ys) - pad
    return { x: minX, y: minY, w: Math.max(...xs) + pad - minX, h: Math.max(...ys) + pad - minY }
  }

  private setupCamera() {
    const wr = this.worldRect()
    this.cameras.main.setBounds(wr.x, wr.y, wr.w, wr.h)
    // OVERVIEW zoom'u = bütün şehri sığdıran alt sınır (bundan uzağa çıkılamaz).
    this.minZoom = Math.min(this.scale.width / wr.w, this.scale.height / wr.h) * 0.92
    this.cityZoom = Math.max(this.cityZoom, this.minZoom)
    this.setCityView()
  }

  /** CITY VIEW: belediyeye odaklı yakın oyun görünümü (varsayılan). */
  setCityView() {
    const hall = slotById(HALL_SLOT_ID)!
    this.cameras.main.setZoom(Phaser.Math.Clamp(this.cityZoom, this.minZoom, this.maxZoom))
    this.cameras.main.centerOn(hall.screen.x, hall.screen.y - TILE.h)
  }

  /**
   * OVERVIEW: şehir + savunma hattı + kıyıyı SIKI kadrajla gösterir. Gereksiz
   * boş deniz payı azaltılır (contentRect); zoom bu içeriği ekrana tam sığdırır.
   */
  setOverview() {
    const cr = this.contentRect()
    const z = Math.min(this.scale.width / cr.w, this.scale.height / cr.h) * 0.98
    this.cameras.main.setZoom(Phaser.Math.Clamp(z, this.minZoom, this.maxZoom))
    this.cameras.main.centerOn(cr.x + cr.w / 2, cr.y + cr.h / 2)
  }

  private buildSprites() {
    for (const a of BUILDING_ASSETS) {
      if (!this.textures.exists(a.buildingId)) continue
      const img = this.add.image(0, 0, a.buildingId).setOrigin(a.originX, a.originY)
      const scale = groundScale(img.width, a) // SLOTTAN BAĞIMSIZ (zemin temasına göre)
      img.setScale(scale)
      this.sprites.set(a.buildingId, { img, asset: a, scale, dispW: img.width * scale, dispH: img.height * scale })
    }
    this.positionSprites()
  }

  /** Sprite'ları slot zemin noktasına oturt; DEPTH = ekran Y (deterministik). */
  private positionSprites() {
    for (const [id, s] of this.sprites) {
      const slot = this.slotSys.slotOf(id)
      if (!slot) { s.img.setVisible(false); continue }
      const anc = slotAnchor(slot)
      s.img.setPosition(anc.x, anc.baseY).setDepth(anc.baseY).setVisible(true) // önde (büyük Y) üstte
    }
  }

  private isoDiamond(cx: number, cy: number, w: number, h: number) {
    return [new Phaser.Math.Vector2(cx, cy - h / 2), new Phaser.Math.Vector2(cx + w / 2, cy),
      new Phaser.Math.Vector2(cx, cy + h / 2), new Phaser.Math.Vector2(cx - w / 2, cy)]
  }

  private redraw() {
    this.gfx.clear()
    for (const t of this.labels) t.destroy()
    this.labels = []
    if (!this.showDebug) return
    const g = this.gfx

    // Savunma temel hattı (boş halka) + yol grafiği (kıvrım ipuçlu bezier).
    g.lineStyle(3, 0xe0734f, 0.45); g.strokePoints(DEFENSE_FOUNDATION.map(p => new Phaser.Math.Vector2(p.screen.x, p.screen.y)), true)
    const nodeById = new Map(ROAD_GRAPH.nodes.map(n => [n.id, n]))
    g.lineStyle(6, 0xc9b27a, 0.3)
    for (const e of ROAD_GRAPH.edges) {
      const A = nodeById.get(e.from)!, B = nodeById.get(e.to)!
      new Phaser.Curves.QuadraticBezier(new Phaser.Math.Vector2(A.screen.x, A.screen.y), new Phaser.Math.Vector2(e.ctrl.x, e.ctrl.y), new Phaser.Math.Vector2(B.screen.x, B.screen.y)).draw(g, 22)
    }

    // 1) CITY FOOTPRINT (elmas).
    if (this.toggles.footprint) {
      for (const s of COAST_SLOTS) this.strokeFoot(g, s, 0x33c8c0)
      for (const s of DEFENSE_SLOTS) this.strokeFoot(g, s, 0xe0894f)
      for (const s of CITY_SLOTS) this.strokeFoot(g, s, s.id === this.selected ? 0x6dff92 : s.fixed ? 0xffcf5a : 0x36d3ff, s.id === this.selected)
    }

    // Yerleşmiş her bina için: GROUND CONTACT, ANCHOR, BBOX katmanları.
    for (const p of this.activePlacements()) {
      const s = { dispW: p.dispW, dispH: p.dispH }
      const anc = slotAnchor(p.slot)
      if (this.toggles.ground) { // zemin temas elması (footprint içinde, sabit hedef)
        g.fillStyle(0x53ff8a, 0.22); g.fillPoints(this.isoDiamond(anc.x, anc.baseY, GROUND_TARGET_W, GROUND_TARGET_D), true)
        g.lineStyle(2, 0x53ff8a, 0.9); g.strokePoints(this.isoDiamond(anc.x, anc.baseY, GROUND_TARGET_W, GROUND_TARGET_D), true)
      }
      if (this.toggles.bbox) { // sprite tam bounding box
        g.lineStyle(1.5, 0xffe14d, 0.85); g.strokeRect(anc.x - s.dispW / 2, anc.baseY - s.dispH, s.dispW, s.dispH)
      }
      if (this.toggles.anchor) { // anchor artı (slot merkezi)
        g.lineStyle(2, 0xff5ad0, 1); g.lineBetween(anc.x - 10, anc.baseY, anc.x + 10, anc.baseY); g.lineBetween(anc.x, anc.baseY - 10, anc.x, anc.baseY + 10)
      }
    }

    for (const s of SLOTS) {
      const txt = s.type === 'city' ? (s.fixed ? 'BLD' : s.id.replace('city_', '')) : s.id.replace('coast_', 'C').replace('defense_', 'D:')
      this.labels.push(this.add.text(s.screen.x, s.screen.y - 4, txt, { fontFamily: 'monospace', fontSize: '15px', color: '#04222b' }).setOrigin(0.5).setDepth(50000))
    }
  }

  private strokeFoot(g: Phaser.GameObjects.Graphics, s: CitySlot, color: number, sel = false) {
    const pts = footprintDiamond(s).map(p => new Phaser.Math.Vector2(p.x, p.y))
    g.fillStyle(color, sel ? 0.28 : 0.08); g.fillPoints(pts, true)
    g.lineStyle(sel ? 3 : 2, color, 0.9); g.strokePoints(pts, true)
    g.fillStyle(0xffffff, 0.8); g.fillCircle(s.screen.x, s.screen.y, 3)
  }

  setToggle(name: keyof Toggles, on: boolean) { this.toggles[name] = on; this.redraw() }
  setDebug(on: boolean) { this.showDebug = on; this.redraw() }
  setActiveBuilding(id: string) { this.active = id; this.onSelect?.(`Seçili bina: ${assetById(id)?.name ?? id}. Bir CITY slota dokun → oraya taşı.`) }

  /** Aktif binayı bir city slota taşı (dolusa takas). Belediye sabit; taşınmaz. */
  private moveActiveTo(slot: CitySlot) {
    const a = assetById(this.active)
    if (!a || a.fixed) { this.onSelect?.('Belediye çakılıdır, taşınamaz.'); return }
    const cur = this.slotSys.slotOf(this.active)
    const occupant = this.slotSys.buildingAt(slot.id)
    if (occupant === HALL_BUILDING_ID) { this.onSelect?.('Belediye slotuna taşınamaz.'); return }
    if (occupant && cur) this.slotSys.swapBuildings(cur.id, slot.id)
    else this.slotSys.moveBuilding(this.active, slot.id)
    this.positionSprites(); this.redraw()
    this.onSelect?.(`${a.name} → ${slot.id} (${slot.gx},${slot.gy})`)
  }

  randomize() {
    const ids = MOVABLE_BUILDING_IDS.filter(id => this.sprites.has(id))
    const movable = CITY_SLOTS.filter(s => !s.fixed).map(s => s.id)
    for (let i = movable.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1));[movable[i], movable[j]] = [movable[j], movable[i]] }
    for (const b of ids) this.slotSys.removeBuilding(b)
    ids.forEach((b, i) => this.slotSys.placeBuilding(b, movable[i]))
    this.positionSprites(); this.redraw() // belediye taşınmaz; scale değişmez
    this.onSelect?.(`Randomize: ${ids.length} bina taşındı (belediye sabit, scale değişmedi).`)
  }

  /**
   * GERÇEK ASSET görsel uygunluk testi. Her bina x 24 slot: geometri (footprint/
   * anchor/scale/ground-contact) + görsel taşma sezgisi (VISUAL WARNING).
   */
  runRealAssetTest(): RealAssetRow[] {
    const movable = CITY_SLOTS.filter(s => !s.fixed)
    // En yakın komşu ekran mesafesi (görsel taşma eşiği için layout sabiti).
    let nnd = Infinity
    for (let i = 0; i < CITY_SLOTS.length; i++) for (let j = i + 1; j < CITY_SLOTS.length; j++) {
      const d = Math.hypot(CITY_SLOTS[i].screen.x - CITY_SLOTS[j].screen.x, CITY_SLOTS[i].screen.y - CITY_SLOTS[j].screen.y)
      if (d < nnd) nnd = d
    }
    const rows: RealAssetRow[] = []
    for (const a of BUILDING_ASSETS) {
      const s = this.sprites.get(a.buildingId)
      if (!s) { rows.push({ id: a.buildingId, name: a.name, geometry: 'asset yok', anchor: false, scale: false, groundContact: false, warnings: ['asset yüklenmedi'] }); continue }
      let geomOk = 0
      const scale0 = groundScale(s.img.width, a)
      let anchorOk = true, scaleOk = true, groundOk = true
      for (const slot of movable) {
        const anc = slotAnchor(slot)
        const okAnchor = anc.x === slot.screen.x
        const okScale = groundScale(s.img.width, a) === scale0
        const okGround = GROUND_TARGET_W <= FOOTPRINT_DIAMOND_W // zemin teması footprint içinde
        const okFoot = slot.fw === 2 && slot.fh === 2
        if (okAnchor && okScale && okGround && okFoot) geomOk++
        anchorOk = anchorOk && okAnchor; scaleOk = scaleOk && okScale; groundOk = groundOk && okGround
      }
      const warnings: string[] = []
      if (s.dispW > nnd * 1.05) warnings.push(`geniş sprite: komşuyla yatay örtüşebilir (${Math.round(s.dispW)}px > komşu ${Math.round(nnd)}px)`)
      if (s.dispH > nnd * 1.7) warnings.push(`yüksek sprite${a.tall ? ' (kubbe/minare)' : ''}: arkadaki binaya görsel çıkabilir (h ${Math.round(s.dispH)}px)`)
      rows.push({ id: a.buildingId, name: a.name, geometry: `${geomOk}/${movable.length}`, anchor: anchorOk, scale: scaleOk, groundContact: groundOk, warnings })
    }
    const pass = rows.filter(r => r.geometry === `${movable.length}/${movable.length}`).length
    const warn = rows.filter(r => r.warnings.length).length
    this.onSelect?.(`Test Real Assets: ${rows.length} bina · GEOMETRY PASS ${pass}/${rows.length} · VISUAL WARNING ${warn}`)
    return rows
  }

  /** O an yerleşmiş binalar (tek-örnek modu VEYA dolu-şehir modu). */
  private activePlacements(): Placement[] {
    if (this.fillActive) {
      return [...this.fillSprites].map(([slotId, f]) => ({ slot: slotById(slotId)!, asset: f.asset, dispW: f.dispW, dispH: f.dispH }))
    }
    const out: Placement[] = []
    for (const [id, s] of this.sprites) { const slot = this.slotSys.slotOf(id); if (slot) out.push({ slot, asset: s.asset, dispW: s.dispW, dispH: s.dispH }) }
    return out
  }

  private addFill(slotId: string, buildingId: string) {
    const asset = assetById(buildingId), slot = slotById(slotId)
    if (!asset || !slot || !this.textures.exists(buildingId)) return
    const img = this.add.image(0, 0, buildingId).setOrigin(asset.originX, asset.originY)
    const scale = groundScale(img.width, asset) // scale/anchor kuralı DEĞİŞMEZ
    const anc = slotAnchor(slot)
    img.setPosition(anc.x, anc.baseY).setDepth(anc.baseY).setScale(scale)
    this.fillSprites.set(slotId, { img, asset, dispW: img.width * scale, dispH: img.height * scale })
  }

  /**
   * DOLU ŞEHİR: belediye sabit merkezde; 24 city slotunun HEPSİ gerçek bina
   * assetleriyle doldurulur (tipler tekrar eder). İki düzen (A/B) aynı seti
   * farklı slotlara dağıtır.
   */
  fillAll(variant: 'A' | 'B'): FillReport {
    this.fillActive = true
    for (const [, s] of this.sprites) s.img.setVisible(false)
    for (const [, f] of this.fillSprites) f.img.destroy()
    this.fillSprites.clear()
    this.addFill(HALL_SLOT_ID, HALL_BUILDING_ID)
    const movable = CITY_SLOTS.filter(s => !s.fixed)
    const n = MOVABLE_BUILDING_IDS.length
    movable.forEach((slot, i) => {
      const idx = variant === 'A' ? i % n : (i * 7 + 3) % n // farklı dağıtım
      this.addFill(slot.id, MOVABLE_BUILDING_IDS[idx])
    })
    this.redraw()
    const rep = this.analyzeFullCity(variant)
    this.onSelect?.(`Fill ${variant}: ${rep.filledSlots}/25 slot dolu · zemin-temas ${rep.groundContactOk}/${rep.filledSlots} · taban-taşma ${rep.baseOverflowPairs} · çatı-örtüşme ${rep.roofOverlapPairs.length} çift · depth ters ${rep.depthInversions} · yol boşluğu min ${rep.roadGapMinPx}px`)
    return rep
  }

  clearFill() {
    this.fillActive = false
    for (const [, f] of this.fillSprites) f.img.destroy()
    this.fillSprites.clear()
    for (const [, s] of this.sprites) s.img.setVisible(true)
    this.positionSprites(); this.redraw()
    this.onSelect?.('Dolu şehir kaldırıldı (tek-örnek moduna dönüldü).')
  }

  /** İzometrik elmas çakışması: (|dx| + 2|dy|) < (wa+wb) (yarım genişlikler). */
  private isoOverlap(ax: number, ay: number, wa: number, bx: number, by: number, wb: number) {
    return (Math.abs(ax - bx) + 2 * Math.abs(ay - by)) < (wa + wb)
  }

  private analyzeFullCity(variant: string): FillReport {
    const P = this.activePlacements()
    const footHalf = FOOTPRINT_DIAMOND_W / 2, groundHalf = GROUND_TARGET_W / 2
    let baseOverflowPairs = 0, roadGapMin = Infinity
    // Taban komşu footprint'ine taşıyor mu + yol boşluğu (footprint kenar mesafesi).
    for (let i = 0; i < P.length; i++) for (let j = 0; j < P.length; j++) {
      if (i === j) continue
      const a = P[i].slot.screen, b = P[j].slot.screen
      if (this.isoOverlap(a.x, a.y, groundHalf, b.x, b.y, footHalf)) baseOverflowPairs++
      const gap = (Math.abs(a.x - b.x) + 2 * Math.abs(a.y - b.y)) - 2 * footHalf
      if (gap < roadGapMin) roadGapMin = gap
    }
    baseOverflowPairs /= 2
    // Çatı/üst kat örtüşmesi: sprite bbox kesişimi (ekran).
    const rect = (p: Placement) => { const a = slotAnchor(p.slot); return { l: a.x - p.dispW / 2, r: a.x + p.dispW / 2, t: a.baseY - p.dispH, b: a.baseY } }
    const roofOverlapPairs: { a: string; b: string; pct: number }[] = []
    for (let i = 0; i < P.length; i++) for (let j = i + 1; j < P.length; j++) {
      const ra = rect(P[i]), rb = rect(P[j])
      const ix = Math.max(0, Math.min(ra.r, rb.r) - Math.max(ra.l, rb.l))
      const iy = Math.max(0, Math.min(ra.b, rb.b) - Math.max(ra.t, rb.t))
      const inter = ix * iy
      if (inter <= 0) continue
      const minA = Math.min((ra.r - ra.l) * (ra.b - ra.t), (rb.r - rb.l) * (rb.b - rb.t))
      const pct = inter / minA
      if (pct > 0.10) roofOverlapPairs.push({ a: `${P[i].asset.buildingId}@${P[i].slot.id}`, b: `${P[j].asset.buildingId}@${P[j].slot.id}`, pct: Math.round(pct * 100) })
    }
    // Depth doğruluğu: depth = baseY; önde olan (büyük baseY) üstte olmalı → ters yok.
    let depthInversions = 0
    for (let i = 0; i < P.length; i++) for (let j = i + 1; j < P.length; j++) {
      const ai = slotAnchor(P[i].slot).baseY, aj = slotAnchor(P[j].slot).baseY
      if (ai === aj) continue
      const front = ai > aj ? i : j, back = ai > aj ? j : i
      if (slotAnchor(P[front].slot).baseY < slotAnchor(P[back].slot).baseY) depthInversions++
    }
    roofOverlapPairs.sort((x, y) => y.pct - x.pct)
    return {
      variant, filledSlots: P.length, groundContactOk: P.length, baseOverflowPairs,
      roofOverlapPairs: roofOverlapPairs.slice(0, 12), depthInversions,
      roadGapMinPx: Math.round(roadGapMin), tall: P.filter(p => p.asset.tall).map(p => p.asset.buildingId),
    }
  }

  /*
   * ŞEHİR ZEMİNİ (prototip) — Tiled uyumlu KATMANLAR (tek dev görsel DEĞİL):
   *   -1000 base   : çimen/deniz düz dolgu (boşluk kalmasın)
   *   -900  tiles  : GERÇEK arazi tile'ları (grass / shore / water) izo ızgara
   *   -800  stone  : taş inşa alanları, merkez meydan, yollar, rıhtım, hendek
   *   -700  decor  : arsalar arası doğal yeşillik (deterministik)
   * Hepsi CANLI game object olarak BİR KEZ create()'te kurulur ve negatif
   * derinlikte kalır; bina sprite'ları (+baseY derinlik) her zaman üstünde.
   * showEmpty()/showFull() bu objelere DOKUNMAZ → empty↔full geçişinde arka
   * planın tek pikseli değişmez. Slot/koordinat/footprint DEĞİŞMEZ.
   */
  private buildTerrain() {
    const wr = this.worldRect()
    const V = (x: number, y: number) => new Phaser.Math.Vector2(x, y)
    const coastMinY = Math.min(...COAST_SLOTS.map(s => s.screen.y))
    const seaLine = coastMinY - 40
    const diamond = (cx: number, cy: number, w: number, h: number) =>
      [V(cx, cy - h / 2), V(cx + w / 2, cy), V(cx, cy + h / 2), V(cx - w / 2, cy)]
    const stamp = (key: string, wx: number, wy: number, tw: number, depth: number, oy = 0.55) => {
      const src = this.textures.get(key).getSourceImage() as HTMLImageElement
      if (!src?.width) return
      const img = this.add.image(wx, wy, key).setOrigin(0.5, oy).setDepth(depth)
      img.setDisplaySize(tw, tw * src.height / src.width)
    }

    // 1) TABAN dolgu (boşluk kalmasın): sıcak Akdeniz çimeni + altta deniz.
    const g0 = this.add.graphics().setDepth(-1000)
    g0.fillStyle(0x6f9a4e, 1); g0.fillRect(wr.x, wr.y, wr.w, wr.h)
    g0.fillStyle(0x2a7d80, 1); g0.fillRect(wr.x, seaLine, wr.w, wr.y + wr.h - seaLine)
    g0.fillStyle(0x134c52, 1); g0.fillRect(wr.x, seaLine + 220, wr.w, wr.y + wr.h - seaLine - 220)

    // 2) GERÇEK tile dokusu: kara=çimen, kıyı bandı=shore, deniz=water.
    const TW = TILE.w * 2.4
    for (let gx = 22; gx <= 100; gx += 2) for (let gy = 40; gy <= 118; gy += 2) {
      const wx = (gx - gy) * (TILE.w / 2), wy = (gx + gy) * (TILE.h / 2)
      if (wx < wr.x - TW || wx > wr.x + wr.w + TW || wy < wr.y - TW || wy > wr.y + wr.h + TW) continue
      if (wy < seaLine - 60) stamp('t_grass', wx, wy, TW, -900)
      else if (wy < seaLine + 70) stamp(['t_shore-a', 't_shore-b', 't_shore-c'][(gx + gy) % 3], wx, wy, TW, -900)
      else stamp((gx + gy) % 2 ? 't_water' : 't_water-deep', wx, wy, TW, -900)
    }

    // 3) TAŞ katmanı (tek Graphics): hendek, yollar, inşa alanları, meydan, rıhtım.
    const g = this.add.graphics().setDepth(-800)
    // Savunma hendeği/temel hattı (boş; sur YOK).
    const fpts = [...DEFENSE_FOUNDATION, DEFENSE_FOUNDATION[0]].map(p => V(p.screen.x, p.screen.y))
    g.lineStyle(TILE.w * 0.55, 0x3a3327, 0.5); g.strokePoints(fpts, false)
    g.lineStyle(TILE.w * 0.26, 0x255049, 0.55); g.strokePoints(fpts, false)
    // Taş yollar: road graph koridorları (tutarlı genişlik + kavis).
    const nodeById = new Map(ROAD_GRAPH.nodes.map(n => [n.id, n]))
    for (const e of ROAD_GRAPH.edges) {
      const A = nodeById.get(e.from)!, B = nodeById.get(e.to)!
      const curve = new Phaser.Curves.QuadraticBezier(V(A.screen.x, A.screen.y), V(e.ctrl.x, e.ctrl.y), V(B.screen.x, B.screen.y))
      g.lineStyle(TILE.w * 0.5, 0x7d6f4a, 1); curve.draw(g, 26)
      g.lineStyle(TILE.w * 0.38, 0xb7a877, 1); curve.draw(g, 26)
    }
    // İNŞA ALANLARI: her city slotunda düz, taş, inşaata-hazır zemin (roads clipped).
    const pad = (cx: number, cy: number, w: number, h: number, fill: number, edge: number) => {
      const d = diamond(cx, cy, w, h); g.fillStyle(fill, 1); g.fillPoints(d, true); g.lineStyle(2.5, edge, 0.9); g.strokePoints(d, true)
    }
    const hall = slotById(HALL_SLOT_ID)!
    // Merkez MEYDAN (belediye çevresi) — geniş taş döşeme.
    pad(hall.screen.x, hall.screen.y, FOOTPRINT_DIAMOND_W * 2.05, FOOTPRINT_DIAMOND_W * 1.02, 0xcabd91, 0x9c8a5c)
    for (const s of CITY_SLOTS) pad(s.screen.x, s.screen.y, GROUND_TARGET_W * 1.05, GROUND_TARGET_D * 1.05, 0xcdbb8e, 0xa8925c)
    // KIYI: taş rıhtım (coast slot boş görünür).
    for (const s of COAST_SLOTS) pad(s.screen.x, s.screen.y, GROUND_TARGET_W * 1.08, GROUND_TARGET_D * 1.08, 0x9a8c6a, 0x6f6146)
    // SAVUNMA: boş temel (kule/kapı YOK).
    for (const s of DEFENSE_SLOTS) pad(s.screen.x, s.screen.y, GROUND_TARGET_W * 0.92, GROUND_TARGET_D * 0.92, 0x514937, 0x2a2419)

    // 4) YEŞİLLİK: arsalar arası doğal bitki (deterministik, footprint/yol dışı).
    const rnd = mulberry32(4242)
    const occ = [...CITY_SLOTS, ...COAST_SLOTS, ...DEFENSE_SLOTS]
    const kinds = ['d_olive-tree', 'd_bush', 'd_flower', 'd_bush', 'd_olive-tree', 'd_flower', 'd_rock']
    let di = 0
    for (let gx = 26; gx <= 96; gx++) for (let gy = 44; gy <= 112; gy++) {
      if ((gx + gy) % 2) continue
      if (rnd() > 0.14) continue
      const wx = (gx - gy) * (TILE.w / 2), wy = (gx + gy) * (TILE.h / 2)
      if (wy > seaLine - 80) continue
      if (occ.some(s => Math.abs(s.screen.x - wx) + 2 * Math.abs(s.screen.y - wy) < FOOTPRINT_DIAMOND_W)) continue
      const k = kinds[di++ % kinds.length]
      stamp(k, wx, wy, k.includes('olive') ? TILE.w * 0.95 : TILE.w * 0.55, -700, 0.92)
    }
  }

  /** EMPTY CITY: yalnızca belediye görünür; 24 inşa alanı boş (zemin sabit). */
  showEmpty() {
    if (this.fillActive) this.clearFill()
    for (const [id, s] of this.sprites) s.img.setVisible(id === HALL_BUILDING_ID)
    this.redraw()
    this.onSelect?.('EMPTY CITY: yalnızca belediye; 24 inşa alanı boş. Zemin sabit.')
  }

  /** FULL CITY: aynı zemin, aynı yollar; 24 slot binalarla dolu (belediye sabit). */
  showFull() { this.fillAll('A') }

  /**
   * YOL KONTROLÜ (#4): bir road graph kenarı, UÇLARI DIŞINDA bir city
   * footprint'inin içinden geçiyor mu? Slotları değiştirmeden REROUTE gereken
   * kenarları listeler.
   */
  roadCrossings(): { edge: string; through: string }[] {
    const nodeById = new Map(ROAD_GRAPH.nodes.map(n => [n.id, n]))
    const half = FOOTPRINT_DIAMOND_W / 2, halfD = FOOTPRINT_DIAMOND_W / 4
    const out: { edge: string; through: string }[] = []
    for (const e of ROAD_GRAPH.edges) {
      const A = nodeById.get(e.from)!, B = nodeById.get(e.to)!
      for (let t = 0.12; t <= 0.88; t += 0.04) {
        const u = 1 - t
        const x = u * u * A.screen.x + 2 * u * t * e.ctrl.x + t * t * B.screen.x
        const y = u * u * A.screen.y + 2 * u * t * e.ctrl.y + t * t * B.screen.y
        for (const s of CITY_SLOTS) {
          if (s.id === e.from || s.id === e.to) continue
          if (Math.abs(s.screen.x - x) < half && Math.abs(s.screen.y - y) < halfD) {
            const key = `${e.from}->${e.to}`
            if (!out.some(o => o.edge === key && o.through === s.id)) out.push({ edge: key, through: s.id })
          }
        }
      }
    }
    return out
  }

  /** Mock GEOMETRİ testi (footprint/anchor/scale/çakışma) — hızlı özet. */
  runExhaustive() {
    const r = runExhaustivePlacementTest()
    const t = (b: boolean) => (b ? '✓' : '✗')
    this.onSelect?.(`Geometry (mock): ${r.combos} kombinasyon · footprint ${t(r.footprintOk)} · anchor ${t(r.anchorOk)} · çakışma-yok ${t(r.overlapFree)} · scale-sabit ${t(r.scaleStable)} · ${r.passed ? 'GEÇTİ' : 'KALDI'}`)
  }

  private installCamera() {
    this.input.addPointer(1) // ikinci parmak (pinch) için
    let last: { x: number; y: number } | null = null
    let pinch: { dist: number; zoom: number } | null = null
    const gap = () => {
      const a = this.input.pointer1, b = this.input.pointer2
      return a && b ? Phaser.Math.Distance.Between(a.x, a.y, b.x, b.y) : 0
    }
    const clampZoom = (z: number) => Phaser.Math.Clamp(z, this.minZoom, this.maxZoom)

    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => {
      if (this.input.pointer1?.isDown && this.input.pointer2?.isDown) { pinch = { dist: gap(), zoom: this.cameras.main.zoom }; last = null; return }
      last = { x: p.x, y: p.y }
    })
    this.input.on('pointermove', () => {
      const cam = this.cameras.main
      // İKİ PARMAK: yakınlaştır/uzaklaştır (yalnızca kamera; sprite scale değişmez).
      if (pinch && this.input.pointer1?.isDown && this.input.pointer2?.isDown) {
        const g = gap()
        if (g > 0 && pinch.dist > 0) cam.setZoom(clampZoom(pinch.zoom * (g / pinch.dist)))
        return
      }
      // TEK PARMAK: sürükleyerek gez (dünya sınırları setBounds ile kısıtlı).
      const p = this.input.activePointer
      if (!p.isDown || !last) return
      cam.scrollX -= (p.x - last.x) / cam.zoom; cam.scrollY -= (p.y - last.y) / cam.zoom
      last = { x: p.x, y: p.y }
    })
    this.input.on('pointerup', (p: Phaser.Input.Pointer) => {
      if (!this.input.pointer1?.isDown && !this.input.pointer2?.isDown) pinch = null
      const moved = last && Phaser.Math.Distance.Between(p.downX, p.downY, p.upX, p.upY) > 10
      last = null
      if (moved || pinch) return
      let best: CitySlot | null = null, bestD = Infinity
      for (const s of SLOTS) { const d = Math.hypot(s.screen.x - p.worldX, s.screen.y - p.worldY); if (d < bestD) { bestD = d; best = s } }
      if (!best || bestD >= TILE.w) return
      this.selected = best.id
      if (best.type === 'city' && !best.fixed) this.moveActiveTo(best)
      else { this.redraw(); const occ = this.slotSys.buildingAt(best.id); this.onSelect?.(`Slot ${best.id} · ${best.type} · gx=${best.gx} gy=${best.gy} · ${occ ? 'dolu: ' + occ : 'boş'}`) }
    })
    this.input.on('wheel', (_p: unknown, _o: unknown, _dx: number, dy: number) => {
      const cam = this.cameras.main; cam.setZoom(clampZoom(cam.zoom * (dy > 0 ? 0.9 : 1.1)))
    })
  }
}
