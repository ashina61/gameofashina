/*
 * CANLI ŞEHİR SAHNESİ — yeni city-map slot sistemi üzerinde.
 *
 * Bu sahne artık /map-debug'da doğrulanan katmanlı zemini (terrain-builder) ve
 * city-slots.json slot geometrisini kullanır. Oyun MANTIĞI (ekonomi, inşaat
 * sırası, işçiler, kayıt/göç, yükseltme) React + engine.ts tarafında kalır;
 * sahne yalnızca durumu alır (sync) ve dokunuşu geri bildirir (events).
 *
 * DEĞİŞMEZ: slot koordinatları, 2x2 footprint, belediye çakılı (city_hall),
 * coast/defense slotları, bina anchor/scale metadata, road graph, terrain
 * görünümü, CITY VIEW kamera davranışı. Motorun sayısal "plot index"i
 * live-adapter ile city-map slotuna bağlanır.
 *
 * Phaser'in ESM paketinde varsayılan dışa aktarım yok; ad alanı olarak alınır.
 */
import * as Phaser from 'phaser'
import { TILE, COAST_SLOTS, HALL_SLOT_ID, slotById } from '@/lib/game/city-map'
import { LIVE_SLOTS, liveSlotByIndex, type LiveSlot } from '@/lib/game/city-map/live-adapter'
import { buildCityTerrain, preloadTerrain, cityWorldRect, cityContentRect } from '@/lib/game/city-map/terrain-builder'
import { assetById, groundScale, GROUND_TARGET_W, BUILDING_RENDER_SCALE } from '@/lib/game/city-map/building-assets'
import { visualSignature } from '@/lib/game/city-render'
import { BUILDINGS, BUILDING_IDS, activeJob, zoneOf, type BuildingId, type Game } from '@/lib/game/engine'
import { buildingImage } from '@/lib/asset'

export type CityEvents = {
  onBuilding: (id: BuildingId) => void
  onPlot: (index: number) => void
  /** (Artık kullanılmıyor — yollar güvenli road graph'tan zemine pişer.) */
  onRoad: (cell: string) => void
  /** Taşıma kipinde hedef arsa değişti (sürükleme/dokunuş). */
  onMovePlot: (plot: number) => void
}

/** Sürüklemeyi dokunuştan ayıran eşik (ekran pikseli). */
const TAP_SLOP = 12
function isTap(p: Phaser.Input.Pointer) {
  return p.downTime > 0 && Phaser.Math.Distance.Between(p.downX, p.downY, p.upX, p.upY) < TAP_SLOP
}

export class CityScene extends Phaser.Scene {
  /** Oyun durumu. `game` adı Phaser.Scene tarafından kullanılıyor. */
  private state!: Game
  private events$!: CityEvents
  private built = false
  /** Divan seviyesi değişince yalnızca yol katmanı yenilenir. */
  private terrainRoads: { updateRoads: (level: number, activeSlotIds?: string[]) => void } | null = null
  /** Bina/arsa/rozet parçaları — her redraw'da temizlenir (zemin dokunulmaz). */
  private pieces: Phaser.GameObjects.GameObject[] = []
  private signature = ''
  private showLabels = false
  private placing = false
  private moving: BuildingId | null = null
  private movePlot: number | null = null

  // Kamera (map-debug ile aynı davranış): CITY VIEW varsayılan, pinch + drag.
  private minZoom = 0.15
  private maxZoom = 1.3
  private cityZoom = 0.58
  private velocity = { x: 0, y: 0 }
  private pinchStart: { distance: number; zoom: number } | null = null

  constructor() { super('city') }

  init(data: { game: Game; events: CityEvents }) {
    this.state = data.game
    this.events$ = data.events
  }

  preload() {
    for (const id of BUILDING_IDS) if (BUILDINGS[id].art && !this.textures.exists(id)) this.load.image(id, buildingImage(id))
    preloadTerrain(this)
  }

  create() {
    this.cameras.main.setBackgroundColor('#12333b')
    this.terrainRoads = buildCityTerrain(this, this.state.buildings.divan, this.occupiedSlotIds(this.state)) // dünya + yaşayan yol ağı
    this.built = true
    this.setupCamera()
    this.installCamera()
    this.redraw()
  }

  /* ------------------------------------------------------------------ KAMERA */

  private worldRect() { return cityWorldRect() }

  private setupCamera() {
    const wr = this.worldRect()
    this.cameras.main.setBounds(wr.x, wr.y, wr.w, wr.h)
    this.minZoom = Math.min(this.scale.width / wr.w, this.scale.height / wr.h) * 0.92
    this.cityZoom = Math.max(0.58, this.minZoom)
    this.setCityView()
    this.scale.on('resize', () => {
      const w = this.worldRect()
      this.minZoom = Math.min(this.scale.width / w.w, this.scale.height / w.h) * 0.92
      this.cameras.main.setZoom(Phaser.Math.Clamp(this.cameras.main.zoom, this.minZoom, this.maxZoom))
    })
  }

  /** CITY VIEW: belediye MERKEZDE, okunur yakınlık (varsayılan mobil görünüm). */
  setCityView() {
    const hall = slotById(HALL_SLOT_ID)!
    this.cameras.main.setZoom(Phaser.Math.Clamp(this.cityZoom, this.minZoom, this.maxZoom))
    this.cameras.main.centerOn(hall.screen.x, hall.screen.y - TILE.h)
    this.velocity = { x: 0, y: 0 }
  }

  /** OVERVIEW (opsiyonel): şehir + savunma + kıyıyı sıkı kadrajla gösterir. */
  setOverview() {
    const cr = cityContentRect()
    const z = Math.min(this.scale.width / cr.w, this.scale.height / cr.h) * 0.98
    this.cameras.main.setZoom(Phaser.Math.Clamp(z, this.minZoom, this.maxZoom))
    this.cameras.main.centerOn(cr.x + cr.w / 2, cr.y + cr.h / 2)
  }

  /** React kontrolü: kamerayı CITY VIEW'e döndür. */
  recenter() { if (this.built) this.setCityView() }

  /** Donanma/tersane kuruluysa doğrudan onun slotunu, değilse kıyıyı gösterir. */
  focusHarbour() {
    if (!this.built) return
    const shipyardIndex = this.state.placement.tersane
    const harbourIndex = this.state.placement.liman
    const shipyard = shipyardIndex === null ? null : liveSlotByIndex(shipyardIndex)
    const harbour = harbourIndex === null ? null : liveSlotByIndex(harbourIndex)
    const destination = shipyard?.zone === 'liman'
      ? shipyard.screen
      : harbour?.zone === 'liman'
        ? harbour.screen
        : COAST_SLOTS[Math.floor(COAST_SLOTS.length / 2)].screen
    // Alt HUD kıyının üstünü kapatmasın: kamera merkezini biraz DENİZE doğru
    // kaydırınca hedef rıhtım ekranda orta-üst bölgede görünür.
    this.cameras.main.setZoom(Phaser.Math.Clamp(Math.max(this.cityZoom, 0.66), this.minZoom, this.maxZoom))
    this.cameras.main.centerOn(destination.x, destination.y + TILE.h * 2.6)
    this.velocity = { x: 0, y: 0 }
  }
  /** React kontrolü: yakınlaştırmayı çarpanla değiştir. */
  zoomBy(factor: number) {
    if (!this.built) return
    const cam = this.cameras.main
    cam.setZoom(Phaser.Math.Clamp(cam.zoom * factor, this.minZoom, this.maxZoom))
  }

  private pointerGap() {
    const a = this.input.pointer1, b = this.input.pointer2
    return a && b ? Phaser.Math.Distance.Between(a.x, a.y, b.x, b.y) : 0
  }

  private installCamera() {
    this.input.addPointer(1)
    let last: { x: number; y: number } | null = null
    const clampZoom = (z: number) => Phaser.Math.Clamp(z, this.minZoom, this.maxZoom)

    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => {
      if (this.input.pointer1?.isDown && this.input.pointer2?.isDown) {
        this.pinchStart = { distance: this.pointerGap(), zoom: this.cameras.main.zoom }; last = null; return
      }
      if (this.moving) { this.updateMoveTarget(p); return } // taşımada parmak binayı sürükler
      last = { x: p.x, y: p.y }
      this.velocity = { x: 0, y: 0 }
    })

    this.input.on('pointermove', (p: Phaser.Input.Pointer) => {
      const cam = this.cameras.main
      if (this.moving) { if (p.isDown) this.updateMoveTarget(p); return }
      if (this.pinchStart && this.input.pointer1?.isDown && this.input.pointer2?.isDown) {
        const gap = this.pointerGap()
        if (gap > 0 && this.pinchStart.distance > 0) cam.setZoom(clampZoom(this.pinchStart.zoom * (gap / this.pinchStart.distance)))
        return
      }
      if (!p.isDown || !last) return
      const dx = p.x - last.x, dy = p.y - last.y
      last = { x: p.x, y: p.y }
      cam.scrollX -= dx / cam.zoom
      cam.scrollY -= dy / cam.zoom
      this.velocity = { x: -dx / cam.zoom, y: -dy / cam.zoom }
    })

    this.input.on('pointerup', () => {
      last = null
      if (!this.input.pointer1?.isDown && !this.input.pointer2?.isDown) this.pinchStart = null
    })

    this.input.on('wheel', (_p: unknown, _o: unknown, _dx: number, dy: number) => {
      const cam = this.cameras.main
      cam.setZoom(clampZoom(cam.zoom * (dy > 0 ? 0.9 : 1.1)))
    })
  }

  update() {
    if (Math.abs(this.velocity.x) < 0.08 && Math.abs(this.velocity.y) < 0.08) return
    if (this.input.activePointer.isDown) return
    const cam = this.cameras.main
    cam.scrollX += this.velocity.x; cam.scrollY += this.velocity.y
    this.velocity.x *= 0.92; this.velocity.y *= 0.92
  }

  /* ------------------------------------------------------------- YERLEŞTİRME */

  /** Slotun ZEMİN TEMAS noktası (footprint alt köşesi). */
  private anchor(slot: LiveSlot) {
    return { x: slot.screen.x, baseY: slot.screen.y + (slot.fh / 2) * TILE.h }
  }

  /** Bir binanın slottan bağımsız ölçeği (zemin temasına göre). */
  private scaleFor(id: BuildingId, imgW: number) {
    const a = assetById(id)
    // liman/tersane de kara binalarıyla aynı görsel küçültmeyi kullanır.
    return a ? groundScale(imgW, a) : (GROUND_TARGET_W * BUILDING_RENDER_SCALE) / (imgW * 0.8)
  }

  private occupiedSlotIds(game: Game) {
    const ids: string[] = []
    for (const id of BUILDING_IDS) {
      const at = game.placement[id]
      if (at === null || at === undefined) continue
      const slot = liveSlotByIndex(at)
      if (slot) ids.push(slot.slotId)
    }
    return ids
  }

  /** React tarafından çağrılır; yalnızca GÖRÜNEN bir şey değiştiyse çizer. */
  sync(game: Game, showLabels: boolean, placing: boolean, moving: BuildingId | null = null, movePlot: number | null = null) {
    this.state = game
    if (!this.built) return
    this.terrainRoads?.updateRoads(game.buildings.divan, this.occupiedSlotIds(game))
    const next = `${visualSignature(game)}|${showLabels}|${placing}|${moving ?? '-'}|${movePlot ?? '-'}`
    if (next === this.signature) return
    this.showLabels = showLabels
    this.placing = placing
    this.moving = moving
    this.movePlot = movePlot
    this.redraw()
  }

  /** Taşıma kipinde bir binanın oturabileceği arsalar (boş + kendi arsası). */
  private eligibleMovePlots(): Set<number> {
    const set = new Set<number>()
    if (!this.moving) return set
    const targetZone = zoneOf(this.moving)
    const others = new Set(BUILDING_IDS.filter(b => b !== this.moving).map(b => this.state.placement[b]).filter((p): p is number => p !== null))
    for (const s of LIVE_SLOTS) if (s.zone === targetZone && !others.has(s.index)) set.add(s.index)
    return set
  }

  private updateMoveTarget(p: Phaser.Input.Pointer) {
    const eligible = this.eligibleMovePlots()
    let best: number | null = null, bestD = Infinity
    for (const s of LIVE_SLOTS) {
      if (!eligible.has(s.index)) continue
      const d = Math.hypot(s.screen.x - p.worldX, s.screen.y - p.worldY)
      if (d < bestD) { bestD = d; best = s.index }
    }
    if (best !== null && best !== this.movePlot) {
      this.movePlot = best
      this.redraw()
      this.events$.onMovePlot(best)
    }
  }

  private redraw() {
    this.signature = `${visualSignature(this.state)}|${this.showLabels}|${this.placing}|${this.moving ?? '-'}|${this.movePlot ?? '-'}`
    for (const piece of this.pieces) piece.destroy()
    this.pieces = []

    const running = activeJob(this.state)?.id
    /*
     * ETKİN yerleşim: taşınan bina, kaydedilmemiş HEDEF arsasında gösterilir;
     * eski arsası boş görünür (oyuncu ✓'lemeden önce sonucu görür).
     */
    const plotOf = (id: BuildingId) => (id === this.moving && this.movePlot !== null ? this.movePlot : this.state.placement[id])
    const occupant = new Map<number, BuildingId>()
    for (const id of BUILDING_IDS) { const at = plotOf(id); if (at !== null && at !== undefined) occupant.set(at, id) }

    for (const slot of LIVE_SLOTS) {
      const id = occupant.get(slot.index)
      if (id) this.addBuilding(id, slot, running === id)
      else this.addEmptyPlot(slot)
    }
    if (this.moving && this.movePlot !== null) {
      const s = liveSlotByIndex(this.movePlot)
      if (s) this.drawMoveFrame(s)
    }
  }

  private diamond(cx: number, cy: number, w: number, h: number) {
    return [new Phaser.Math.Vector2(cx, cy - h / 2), new Phaser.Math.Vector2(cx + w / 2, cy),
      new Phaser.Math.Vector2(cx, cy + h / 2), new Phaser.Math.Vector2(cx - w / 2, cy)]
  }

  private addBuilding(id: BuildingId, slot: LiveSlot, active: boolean) {
    const anc = this.anchor(slot)
    const level = this.state.buildings[id]
    let dispW = TILE.w * 2, dispH = TILE.h * 2

    // Normal görünümde hazır platform yok. Sadece çok hafif bir temas gölgesi:
    // bina araziye basıyor ama altına kare/elmas bir 'asset kaidesi' eklenmiyor.
    const shadow = this.add.graphics().setDepth(anc.baseY - 0.3)
    shadow.fillStyle(0x283021, 0.045)
    shadow.fillEllipse(anc.x + 1, anc.baseY - TILE.h * 0.20,
      GROUND_TARGET_W * 0.30, GROUND_TARGET_W * 0.065)
    this.pieces.push(shadow)

    if (BUILDINGS[id].art && this.textures.exists(id)) {
      const img = this.add.image(anc.x, anc.baseY, id).setOrigin(0.5, 1)
      const scale = this.scaleFor(id, img.width)
      img.setScale(scale).setDepth(anc.baseY)
      img.setFlipX(this.state.flips.includes(id))
      // Farklı kaynaklardan gelen sprite'ları tek sıcak Akdeniz paletine yaklaştır.
      // Çok hafif multiply tint: kırmızıyı korur, mavi/soğuk tonu sakinleştirir.
      img.setTint(0xfff1dc)
      img.setAlpha(active ? 0.82 : 1) // inşaat sürerken hafif soluk
      dispW = img.width * scale; dispH = img.height * scale
      this.pieces.push(img)
    } else {
      // Görseli olmayan yapı: basit taş kaide (yalnızca yedek).
      const g = this.add.graphics().setDepth(anc.baseY)
      g.fillStyle(0xb9a877, 1); g.fillPoints(this.diamond(anc.x, anc.baseY - TILE.h * 0.5, GROUND_TARGET_W * 0.8, GROUND_TARGET_W * 0.4), true)
      this.pieces.push(g)
    }

    // Dokunuş: binaya dokun → panel aç.
    const hit = this.add.rectangle(anc.x, anc.baseY - dispH * 0.4, dispW * 0.7, dispH * 0.6)
      .setInteractive({ useHandCursor: true }).setFillStyle(0xffffff, 0).setDepth(anc.baseY + 0.2)
    hit.on('pointerup', (p: Phaser.Input.Pointer) => { if (isTap(p) && !this.moving) this.events$.onBuilding(id) })
    this.pieces.push(hit)

    // Seviye rozeti (+ inşaat sürerken vurgulu).
    this.pieces.push(this.makeBadge(anc.x + dispW * 0.21, anc.baseY - TILE.h * 0.46, level, anc.baseY + 0.4, active))
    if (this.showLabels) this.pieces.push(this.makeLabel(anc.x, anc.baseY + TILE.h * 1.2, BUILDINGS[id].name, anc.baseY + 0.5, active))
  }

  /** BOŞ ARSA: normal şehir görünümünde yalnızca zemin görünür.
   * Bayraklar İnşa/Taşıma kipinde açılır; ekran sürekli kırmızı flamayla dolmaz.
   */
  private addEmptyPlot(slot: LiveSlot) {
    const anc = this.anchor(slot)
    if (this.placing) {
      this.drawBuildPad(slot)
      this.drawBuildFlag(anc.x, anc.baseY)
    }
    const hit = this.add.rectangle(anc.x, anc.baseY - TILE.h, TILE.w * 1.4, TILE.h * 1.6)
      .setInteractive({ useHandCursor: true }).setFillStyle(0xffffff, 0).setDepth(anc.baseY + 0.2)
    hit.on('pointerup', (p: Phaser.Input.Pointer) => { if (isTap(p) && !this.moving) this.events$.onPlot(slot.index) })
    this.pieces.push(hit)
  }

  /** İnşa kipinde standard 2x2 alanı göster; normal şehirde tamamen kaybolur. */
  private drawBuildPad(slot: LiveSlot) {
    const g = this.add.graphics().setDepth(slot.screen.y + 0.05)
    const w = TILE.w * 1.86, h = TILE.h * 1.86
    const fill = slot.zone === 'liman' ? 0x5f9d91 : 0xc5ad72
    const edge = slot.zone === 'liman' ? 0x9fd0c7 : 0xead197
    g.fillStyle(fill, 0.13)
    g.fillPoints(this.diamond(slot.screen.x, slot.screen.y, w, h), true)
    g.lineStyle(2.2, edge, 0.66)
    g.strokePoints(this.diamond(slot.screen.x, slot.screen.y, w, h), true)
    this.pieces.push(g)
  }

  /** Küçük inşa bayrağı: kısa direk + kırmızı flama. "Buraya kur." */
  private drawBuildFlag(x: number, baseY: number) {
    const s = TILE.w
    const g = this.add.graphics().setDepth(baseY)
    const poleH = s * 0.34
    g.fillStyle(0x0d1c16, 0.10); g.fillEllipse(x + 1, baseY - 1, s * 0.20, s * 0.075)
    g.fillStyle(0x5a3d24, 0.92); g.fillRect(x - s * 0.018, baseY - poleH, s * 0.036, poleH)
    g.fillStyle(0xa64a37, 0.92)
    g.fillPoints([new Phaser.Math.Vector2(x + s * 0.018, baseY - poleH),
      new Phaser.Math.Vector2(x + s * 0.018, baseY - poleH + s * 0.12),
      new Phaser.Math.Vector2(x + s * 0.19, baseY - poleH + s * 0.06)], true)
    g.fillStyle(0xcaa24a, 0.88); g.fillCircle(x, baseY - poleH, s * 0.025)
    this.pieces.push(g)
  }

  /** TAŞIMA hedefinin yeşil çerçevesi. */
  private drawMoveFrame(slot: LiveSlot) {
    const x = slot.screen.x, y = slot.screen.y
    const g = this.add.graphics().setDepth(9000)
    const w = TILE.w * 2, h = TILE.h * 2
    g.fillStyle(0x5dff86, 0.16); g.fillPoints(this.diamond(x, y, w, h), true)
    g.lineStyle(3, 0x74ff92, 0.95); g.strokePoints(this.diamond(x, y, w, h), true)
    this.pieces.push(g)
  }

  private makeLabel(x: number, y: number, text: string, depth: number, active: boolean) {
    const label = this.add.text(0, 0, text, {
      fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
      fontSize: '18px', color: '#fff2d8', fontStyle: '600',
    }).setOrigin(0.5, 0.5).setResolution(2)
    const padX = 10, padY = 6
    const w = label.width + padX * 2, h = label.height + padY * 2
    const plate = this.add.graphics()
    plate.fillStyle(active ? 0x5a4728 : 0x14281f, 0.92)
    plate.fillRoundedRect(-w / 2, -h / 2, w, h, 5)
    plate.lineStyle(3, 0xc5aa72, active ? 1 : 0.55)
    plate.strokeRoundedRect(-w / 2, -h / 2, w, h, 5)
    return this.add.container(x, y, [plate, label]).setDepth(depth)
  }

  private makeBadge(x: number, y: number, level: number, depth: number, active: boolean) {
    const r = 11
    const plate = this.add.graphics()
    plate.fillStyle(active ? 0x5a4728 : 0x173127, 0.90)
    plate.fillCircle(0, 0, r)
    plate.lineStyle(1.4, 0xc5aa72, active ? 0.94 : 0.62)
    plate.strokeCircle(0, 0, r)
    const text = this.add.text(0, 0, String(level), {
      fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
      fontSize: '12px', color: '#f5e2b4', fontStyle: '700',
    }).setOrigin(0.5, 0.5).setResolution(2)
    return this.add.container(x, y, [plate, text]).setDepth(depth)
  }
}
