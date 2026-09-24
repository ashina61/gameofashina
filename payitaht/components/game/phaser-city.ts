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
import { TILE, CITY_SLOTS, COAST_SLOTS, DEFENSE_SLOTS, DEFENSE_FOUNDATION, ROAD_GRAPH, HALL_SLOT_ID, slotById } from '@/lib/game/city-map'
import { LIVE_SLOTS, liveSlotByIndex, type LiveSlot } from '@/lib/game/city-map/live-adapter'
import { buildCityTerrain, preloadTerrain, cityWorldRect, cityContentRect, mineSite } from '@/lib/game/city-map/terrain-builder'
import { GROUND_TARGET_W, FOOTPRINT_DIAMOND_W, ART_DIAMOND_PX } from '@/lib/game/city-map/building-assets'
import { edgeKey, roadEdgeKeysForTargets } from '@/lib/game/city-map/road-tree'
import { visualSignature } from '@/lib/game/city-render'
import { BUILDINGS, BUILDING_IDS, activeJob, plotOpen, population, zoneOf, type BuildingId, type Game } from '@/lib/game/engine'
import { asset, buildingImage, buildingStage } from '@/lib/asset'

/** Yolda yürüyen vatandaş (Ikariam'ın sokaktaki halkı). */
type Walker = { body: Phaser.GameObjects.Graphics; edge: RoadEdge; forward: boolean; t: number; speed: number; side: number }
type RoadEdge = { key: string; from: string; to: string; curve: Phaser.Curves.QuadraticBezier; length: number }

export type CityEvents = {
  onBuilding: (id: BuildingId) => void
  onPlot: (index: number) => void
  /** (Artık kullanılmıyor — yollar güvenli road graph'tan zemine pişer.) */
  onRoad: (cell: string) => void
  /** Taşıma kipinde hedef arsa değişti (sürükleme/dokunuş). */
  onMovePlot: (plot: number) => void
  /** Ada madenine dokunuldu. */
  onMine: () => void
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
  private walkers: Walker[] = []
  private walkerKey = ''
  private signature = ''
  private showLabels = false
  private placing = false
  private moving: BuildingId | null = null
  private movePlot: number | null = null

  // Kamera (map-debug ile aynı davranış): CITY VIEW varsayılan, pinch + drag.
  private minZoom = 0.15
  private maxZoom = 1.3
  private cityZoom = 0.92
  private velocity = { x: 0, y: 0 }
  private pinchStart: { distance: number; zoom: number } | null = null

  constructor() { super('city') }

  init(data: { game: Game; events: CityEvents }) {
    this.state = data.game
    this.events$ = data.events
  }

  preload() {
    // Her bina üç aşamada çizildi (tools/art/buildings.py); seviye yükseldikçe görünüm değişir.
    for (const id of BUILDING_IDS) {
      if (!BUILDINGS[id].art) continue
      for (const [stage, level] of [[1, 1], [2, 4], [3, 8]] as const) {
        const key = `${id}-${stage}`
        if (!this.textures.exists(key)) this.load.image(key, buildingImage(id, level))
      }
    }
    if (!this.textures.exists('b_site')) this.load.image('b_site', asset('/images/game/buildings/site.webp'))
    for (const lux of ['uzum', 'mermer', 'kristal', 'kukurt']) {
      if (!this.textures.exists('mine-' + lux)) this.load.image('mine-' + lux, asset(`/images/game/buildings/mine-${lux}.webp`))
    }
    // İnşaat iskelesi (tools/art/buildings.py).
    if (!this.textures.exists('b_scaffold')) this.load.image('b_scaffold', asset('/images/game/buildings/scaffold.webp'))
    preloadTerrain(this)
    if (!this.textures.exists('w_tower')) this.load.image('w_tower', asset('/images/game/walls/tower-round.png'))
  }

  create() {
    this.cameras.main.setBackgroundColor('#12333b')
    this.terrainRoads = buildCityTerrain(this, this.state.buildings.divan, this.openSlotIds(this.state)) // dünya + büyüyen sokak ağı
    this.built = true
    this.syncWalkers()
    this.drawMine()
    this.setupCamera()
    this.installCamera()
    this.redraw()
  }

  /* ------------------------------------------------------------------ KAMERA */

  private worldRect() { return cityWorldRect() }

  /*
   * HUD PAYLARI (ekran yüksekliğinin oranı). Arayüz tuvalin ÜSTÜNDE yüzer:
   * üstte başlık + oyuncu kartı + kaynak şeridi, altta günlük + menü. Kasaba
   * bu ikisinin arasındaki AÇIK BANTTA ortalanır; aksi halde tam ortalanan
   * şehrin üstü kaynak şeridinin, limanı menünün arkasında kalır.
   */
  private static readonly HUD_TOP = 0.13
  private static readonly HUD_BOTTOM = 0.15

  /**
   * KASABA kutusu: city slotları, bina silüetlerinin taşmasıyla. Ikariam'daki
   * gibi varsayılan görünüm bütün şehri tek ekranda gösterir; liman hemen
   * altta görünür, çapa düğmesi (focusHarbour) ona yakınlaşır.
   */
  private townRect() {
    const pts = CITY_SLOTS.map(s => s.screen)
    const xs = pts.map(p => p.x), ys = pts.map(p => p.y)
    const padX = FOOTPRINT_DIAMOND_W * 0.62
    const padTop = TILE.h * 5 // en üst sıradaki binaların çatı/kubbe payı
    const padBottom = TILE.h * 1.5
    const x = Math.min(...xs) - padX, y = Math.min(...ys) - padTop
    return { x, y, w: Math.max(...xs) + padX - x, h: Math.max(...ys) + padBottom - y }
  }

  /** Dünyayı KAPLAYAN en uzak zoom: dünyanın dışındaki boşluk hiç görünmez. */
  private coverZoom() {
    const wr = this.worldRect()
    return Math.max(this.scale.width / wr.w, this.scale.height / wr.h)
  }

  /** Kasabayı HUD'un açık bıraktığı banda sığdıran zoom. */
  private townZoom() {
    const t = this.townRect()
    const bandH = this.scale.height * (1 - CityScene.HUD_TOP - CityScene.HUD_BOTTOM)
    return Math.min(this.scale.width / (t.w * 1.02), bandH / t.h)
  }

  /** Bir dünya noktasını açık bandın ortasına getirir (HUD'a göre kaydırılmış). */
  private centerInBand(x: number, y: number) {
    const cam = this.cameras.main
    const bandMid = (CityScene.HUD_TOP + (1 - CityScene.HUD_BOTTOM)) / 2 // 0..1
    const shift = (bandMid - 0.5) * this.scale.height / cam.zoom
    cam.centerOn(x, y - shift)
  }

  private setupCamera() {
    const wr = this.worldRect()
    this.cameras.main.setBounds(wr.x, wr.y, wr.w, wr.h)
    this.minZoom = this.coverZoom()
    this.cityZoom = Math.max(this.townZoom(), this.minZoom)
    this.setCityView()
    this.scale.on('resize', () => {
      this.minZoom = this.coverZoom()
      this.cityZoom = Math.max(this.townZoom(), this.minZoom)
      this.cameras.main.setZoom(Phaser.Math.Clamp(this.cameras.main.zoom, this.minZoom, this.maxZoom))
    })
  }

  /**
   * CITY VIEW (Ikariam): BÜTÜN kasaba ve limanı tek ekranda, belediye ortada.
   * Yakından bakmak için iki parmakla yakınlaşılır (maxZoom).
   */
  setCityView() {
    const t = this.townRect()
    const hall = slotById(HALL_SLOT_ID)!
    this.cameras.main.setZoom(Phaser.Math.Clamp(this.cityZoom, this.minZoom, this.maxZoom))
    this.centerInBand(hall.screen.x, t.y + t.h / 2)
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
    // Limana YAKINLAŞ ve rıhtımı HUD'un açık bıraktığı bandın ortasına getir
    // (alt menünün arkasında kalmasın).
    this.cameras.main.setZoom(Phaser.Math.Clamp(Math.max(this.cityZoom * 1.9, 0.7), this.minZoom, this.maxZoom))
    this.centerInBand(destination.x, destination.y - TILE.h)
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

  update(_time: number, delta: number) {
    this.stepWalkers(Math.min(delta, 100) / 1000)
    this.timers = this.timers.filter(t => t.bar.active)
    this.hudItems = this.hudItems.filter(h => h.c.active)
    const zoom = this.cameras.main.zoom
    if (zoom !== this.lastHudZoom) { this.lastHudZoom = zoom; for (const h of this.hudItems) this.fitHudItem(h) }
    for (const t of this.timers) this.paintTimer(t)
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

  /**
   * Bina sanatı tek ölçekle çizildi: görseldeki 2x2 elması (ART_DIAMOND_PX)
   * footprint'ten biraz büyük gösterilir; Ikariam'daki gibi binalar sokağa
   * kadar taşar ve şehir dolu görünür. Bina başına ayar yoktur.
   */
  private artScale() { return (FOOTPRINT_DIAMOND_W / ART_DIAMOND_PX) * 1.55 }

  private occupiedSlotIds(game: Game, moving: BuildingId | null = null, movePlot: number | null = null) {
    const ids: string[] = []
    for (const id of BUILDING_IDS) {
      // Taşıma önizlemesinde gerçek konum değil seçili hedef görünür.
      const at = id === moving && movePlot !== null ? movePlot : game.placement[id]
      if (at === null || at === undefined) continue
      const slot = liveSlotByIndex(at)
      if (slot) ids.push(slot.slotId)
    }
    return ids
  }

  /**
   * AÇIK arsalar (Divanhane seviyesiyle büyür) + üzerinde yapı olanlar. Sokaklar
   * bunlara uzanır, ağaçlar bunlardan temizlenir: şehir dışa doğru büyür.
   */
  private openSlotIds(game: Game, moving: BuildingId | null = null, movePlot: number | null = null) {
    const ids = new Set(this.occupiedSlotIds(game, moving, movePlot))
    for (const s of LIVE_SLOTS) if (plotOpen(game, s.index)) ids.add(s.slotId)
    return [...ids]
  }

  /** React tarafından çağrılır; yalnızca GÖRÜNEN bir şey değiştiyse çizer. */
  sync(game: Game, showLabels: boolean, placing: boolean, moving: BuildingId | null = null, movePlot: number | null = null) {
    this.state = game
    if (!this.built) return
    this.terrainRoads?.updateRoads(game.buildings.divan, this.openSlotIds(game, moving, movePlot))
    this.syncWalkers()
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
    for (const s of LIVE_SLOTS) if (s.zone === targetZone && !others.has(s.index) && plotOpen(this.state, s.index)) set.add(s.index)
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
      this.terrainRoads?.updateRoads(
        this.state.buildings.divan,
        this.openSlotIds(this.state, this.moving, best),
      )
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
      else if (plotOpen(this.state, slot.index)) this.addEmptyPlot(slot)
    }
    if (this.moving && this.movePlot !== null) {
      const s = liveSlotByIndex(this.movePlot)
      if (s) this.drawMoveFrame(s)
    }
    // Ikariam: Sur inşa edilince şehrin çevresinde duvar + kuleler belirir.
    if (this.state.buildings.surlar > 0) this.drawWalls(this.state.buildings.surlar)
  }

  /*
   * SURLAR — savunma halkası boyunca kumtaşı duvar (sur kitinin renkleriyle),
   * savunma yuvalarında boyalı yuvarlak kuleler, yolların surdan geçtiği her
   * noktada iki kuleli KAPI açıklığı (hiçbir yol duvarın içinden geçmez).
   * Duvar seviyeyle yükselir. Parçalar kısa tutulur ve derinlikleri zemin
   * y'sidir: binalar ve ağaçlarla doğru sıralanır.
   */
  private drawWalls(level: number) {
    const ring = DEFENSE_FOUNDATION.map(p => p.screen)
    const n = ring.length
    const wallH = TILE.h * (0.55 + Math.min(level, 10) * 0.05)
    const walk = TILE.h * 0.26
    const gapHalf = TILE.w * 0.34

    // Yol kenarlarının halka kenarlarını kestiği noktalar = kapılar.
    const cross = (p: { x: number; y: number }, q: { x: number; y: number }, a: { x: number; y: number }, b: { x: number; y: number }) => {
      const d = (q.x - p.x) * (b.y - a.y) - (q.y - p.y) * (b.x - a.x)
      if (Math.abs(d) < 1e-6) return null
      const t = ((a.x - p.x) * (b.y - a.y) - (a.y - p.y) * (b.x - a.x)) / d
      const u = ((a.x - p.x) * (q.y - p.y) - (a.y - p.y) * (q.x - p.x)) / d
      return t >= 0 && t <= 1 && u >= 0 && u <= 1 ? u : null
    }
    const nodes = new Map(ROAD_GRAPH.nodes.map(nd => [nd.id, nd.screen]))
    const hits: Array<{ seg: number; u: number; x: number; y: number }> = []
    for (const e of ROAD_GRAPH.edges) {
      const A = nodes.get(e.from), B = nodes.get(e.to)
      if (!A || !B) continue
      let prev = A
      for (let k = 1; k <= 24; k++) {
        const t = k / 24, w = 1 - t
        const cur = { x: w * w * A.x + 2 * w * t * e.ctrl.x + t * t * B.x, y: w * w * A.y + 2 * w * t * e.ctrl.y + t * t * B.y }
        for (let i = 0; i < n; i++) {
          const u = cross(prev, cur, ring[i], ring[(i + 1) % n])
          if (u === null) continue
          const a = ring[i], b = ring[(i + 1) % n]
          hits.push({ seg: i, u, x: a.x + (b.x - a.x) * u, y: a.y + (b.y - a.y) * u })
        }
        prev = cur
      }
    }
    // Yakın geçişler TEK kapıda birleşir (liman yolları gibi demetler tek
    // geniş açıklık olur; köşe aşan demet iki kenarda da açıklık alır).
    const clusters: Array<typeof hits> = []
    for (const h of hits) {
      const near = clusters.filter(c => c.some(o => Math.hypot(o.x - h.x, o.y - h.y) < TILE.w * 1.3))
      if (near.length === 0) { clusters.push([h]); continue }
      const merged = near.flat().concat(h)
      for (const c of near) clusters.splice(clusters.indexOf(c), 1)
      clusters.push(merged)
    }
    const gates: Array<{ seg: number; t0: number; t1: number }> = []
    for (const c of clusters) {
      for (const seg of new Set(c.map(h => h.seg))) {
        const us = c.filter(h => h.seg === seg).map(h => h.u)
        const len = Math.hypot(ring[(seg + 1) % n].x - ring[seg].x, ring[(seg + 1) % n].y - ring[seg].y)
        gates.push({ seg, t0: Math.max(0, Math.min(...us) - gapHalf / len), t1: Math.min(1, Math.max(...us) + gapHalf / len) })
      }
    }

    const V = (x: number, y: number) => new Phaser.Math.Vector2(x, y)
    const piece = (p0: { x: number; y: number }, p1: { x: number; y: number }) => {
      const g = this.add.graphics().setDepth(Math.max(p0.y, p1.y) + 1)
      const dx = p1.x - p0.x, dy = p1.y - p0.y
      // Işık sol-üstten: "\\" yönlü yüzler aydınlık, "/" yönlüler gölgede.
      const lit = dx * dy > 0 ? 1 : dy === 0 ? 0.6 : 0.25
      const face = lit > 0.8 ? 0xd9bf92 : lit > 0.5 ? 0xc9ad80 : 0xb3966c
      const top = 0xe8d6ae
      g.fillStyle(0x1b2a14, 0.20)
      g.fillPoints([V(p0.x, p0.y), V(p1.x, p1.y), V(p1.x + TILE.w * 0.14, p1.y + TILE.h * 0.22), V(p0.x + TILE.w * 0.14, p0.y + TILE.h * 0.22)], true)
      g.fillStyle(face, 1)
      g.fillPoints([V(p0.x, p0.y), V(p1.x, p1.y), V(p1.x, p1.y - wallH), V(p0.x, p0.y - wallH)], true)
      // Taş sıraları.
      g.lineStyle(1.4, 0x8a6c47, 0.30)
      for (const f of [0.33, 0.66]) g.lineBetween(p0.x, p0.y - wallH * f, p1.x, p1.y - wallH * f)
      g.fillStyle(top, 1)
      g.fillPoints([V(p0.x, p0.y - wallH), V(p1.x, p1.y - wallH), V(p1.x, p1.y - wallH - walk), V(p0.x, p0.y - wallH - walk)], true)
      // Mazgallar (ön kenar boyunca).
      const len = Math.hypot(dx, dy), step = TILE.w * 0.15, mw = TILE.w * 0.075, mh = TILE.h * 0.17
      const ux = dx / (len || 1), uy = dy / (len || 1)
      for (let d = step * 0.3; d + mw <= len; d += step) {
        const a = { x: p0.x + ux * d, y: p0.y + uy * d - wallH }
        const b = { x: a.x + ux * mw, y: a.y + uy * mw }
        g.fillStyle(face, 1)
        g.fillPoints([V(a.x, a.y), V(b.x, b.y), V(b.x, b.y - mh), V(a.x, a.y - mh)], true)
        g.fillStyle(top, 1)
        g.fillPoints([V(a.x, a.y - mh), V(b.x, b.y - mh), V(b.x, b.y - mh - walk * 0.4), V(a.x, a.y - mh - walk * 0.4)], true)
      }
      g.lineStyle(1.6, 0x6e5436, 0.55); g.lineBetween(p0.x, p0.y, p1.x, p1.y)
      this.pieces.push(g)
    }

    // Duvar parçaları (kapı açıklıkları atlanır).
    for (let i = 0; i < n; i++) {
      const A = ring[i], B = ring[(i + 1) % n]
      const len = Math.hypot(B.x - A.x, B.y - A.y)
      const holes = gates.filter(g => g.seg === i).map(g => [g.t0, g.t1] as const)
      const count = Math.max(1, Math.ceil(len / (TILE.w * 0.5)))
      for (let k = 0; k < count; k++) {
        let t0 = k / count, t1 = (k + 1) / count
        for (const [h0, h1] of holes) {
          if (t1 <= h0 || t0 >= h1) continue
          if (t0 < h0 && t1 > h1) { // parça açıklığı ortalıyor: iki yana böl
            piece({ x: A.x + (B.x - A.x) * t0, y: A.y + (B.y - A.y) * t0 }, { x: A.x + (B.x - A.x) * h0, y: A.y + (B.y - A.y) * h0 })
            t0 = h1
          } else if (t0 < h0) t1 = h0
          else t0 = h1
        }
        if (t1 - t0 > 0.002) piece({ x: A.x + (B.x - A.x) * t0, y: A.y + (B.y - A.y) * t0 }, { x: A.x + (B.x - A.x) * t1, y: A.y + (B.y - A.y) * t1 })
      }
    }

    // Kuleler: savunma yuvalarında büyük, kapı iki yanında küçük.
    const tower = (x: number, y: number, w: number) => {
      const base = this.add.graphics().setDepth(y + 1.5)
      base.fillStyle(0x1b2a14, 0.24); base.fillEllipse(x + w * 0.18, y + w * 0.08, w * 1.3, w * 0.5)
      base.fillStyle(0xb3966c, 1); base.fillEllipse(x, y, w * 1.02, w * 0.42)
      this.pieces.push(base)
      if (this.textures.exists('w_tower')) {
        const img = this.add.image(x, y - w * 0.04, 'w_tower').setOrigin(0.5, 1).setDepth(y + 2)
        img.setScale(w / img.width)
        this.pieces.push(img)
      }
    }
    const placed: Array<{ x: number; y: number }> = []
    for (const s of DEFENSE_SLOTS) {
      tower(s.screen.x, s.screen.y + TILE.h * 0.2, TILE.w * 0.62)
      placed.push(s.screen)
    }
    // Kapı kuleleri: açıklığın iki ucunda; köşe kulesine ya da başka kuleye
    // çok yakınsa atlanır (kule yığını olmasın).
    for (const g of gates) {
      const A = ring[g.seg], B = ring[(g.seg + 1) % n]
      const len = Math.hypot(B.x - A.x, B.y - A.y)
      const ends: number[] = []
      if (g.t0 > 0) ends.push(g.t0 - TILE.w * 0.1 / len)
      if (g.t1 < 1) ends.push(g.t1 + TILE.w * 0.1 / len)
      for (const u of ends) {
        const x = A.x + (B.x - A.x) * u, y = A.y + (B.y - A.y) * u
        if (placed.some(p => Math.hypot(p.x - x, p.y - y) < TILE.w * 0.7)) continue
        placed.push({ x, y })
        tower(x, y + TILE.h * 0.1, TILE.w * 0.4)
      }
    }
  }

  /*
   * HALK — Ikariam'daki gibi sokaklarda yürüyen küçük vatandaşlar.
   *
   * Yalnızca GÖRÜNÜR yollarda (Divanhane'den kurulu binalara giden ağaç)
   * yürürler; sayı nüfusla artar. Bir düğüme varan vatandaş oradan çıkan
   * başka bir görünür yola sapar, çıkmaz sokakta geri döner.
   */
  private syncWalkers() {
    const visible = roadEdgeKeysForTargets(this.openSlotIds(this.state))
    const count = visible.size ? Math.min(26, 3 + Math.floor(population(this.state) / 22)) : 0
    const key = [...visible].sort().join(',') + '#' + count
    if (key === this.walkerKey) return
    this.walkerKey = key
    for (const w of this.walkers) w.body.destroy()
    this.walkers = []
    const edges: RoadEdge[] = []
    const nodes = new Map(ROAD_GRAPH.nodes.map(n => [n.id, n.screen]))
    for (const e of ROAD_GRAPH.edges) {
      const k = edgeKey(e.from, e.to)
      const A = nodes.get(e.from), B = nodes.get(e.to)
      if (!visible.has(k) || !A || !B) continue
      const curve = new Phaser.Curves.QuadraticBezier(new Phaser.Math.Vector2(A.x, A.y), new Phaser.Math.Vector2(e.ctrl.x, e.ctrl.y), new Phaser.Math.Vector2(B.x, B.y))
      edges.push({ key: k, from: e.from, to: e.to, curve, length: curve.getLength() })
    }
    this.roadEdges = edges
    if (!edges.length) return
    // Deterministik tohum: aynı şehir her açılışta aynı kalabalıkla başlar.
    let seed = 0x5eed ^ count
    const rnd = () => { seed = (Math.imul(seed, 1664525) + 1013904223) | 0; return (seed >>> 0) / 4294967296 }
    const robes = [0xb8412f, 0x3f6f9a, 0x4f7d4a, 0xd6a93a, 0x7a4f8a, 0xe9dcc0, 0x8a5a35]
    for (let i = 0; i < count; i++) {
      const g = this.add.graphics()
      const robe = robes[Math.floor(rnd() * robes.length)]
      const s = 1.3
      g.fillStyle(0x1b2a14, 0.22); g.fillEllipse(1.5 * s, 0, 9 * s, 3.4 * s)
      g.fillStyle(robe, 1); g.fillTriangle(-3.6 * s, 0, 3.6 * s, 0, 0, -12 * s)
      g.fillRoundedRect(-2.6 * s, -12 * s, 5.2 * s, 6 * s, 1.6 * s)
      g.fillStyle(0xd9a77a, 1); g.fillCircle(0, -14.6 * s, 2.5 * s)
      // fes ya da sarık
      if (rnd() < 0.5) { g.fillStyle(0xa8322a, 1); g.fillRect(-2 * s, -18.6 * s, 4 * s, 2.6 * s) }
      else { g.fillStyle(0xf2ead8, 1); g.fillEllipse(0, -17 * s, 5.8 * s, 3.2 * s) }
      const edge = edges[Math.floor(rnd() * edges.length)]
      this.walkers.push({ body: g, edge, forward: rnd() < 0.5, t: rnd(), speed: 16 + rnd() * 12, side: (rnd() - 0.5) * 14 })
    }
    this.stepWalkers(0)
  }

  private roadEdges: RoadEdge[] = []
  private mineSprite: Phaser.GameObjects.Image | null = null

  /** Adanın lüks kaynak madeni (bağ, mermer ocağı, kristal mağarası, kükürt çukuru). */
  private drawMine() {
    const key = 'mine-' + this.state.mine.specialty
    if (this.mineSprite?.texture.key === key) return
    this.mineSprite?.destroy()
    if (!this.textures.exists(key)) return
    const site = mineSite()
    const img = this.add.image(site.x, site.y, key).setOrigin(0.5, 1).setScale(this.artScale() * 1.1).setDepth(site.y)
    img.setInteractive({ useHandCursor: true, pixelPerfect: false })
    img.on('pointerup', (p: Phaser.Input.Pointer) => { if (isTap(p) && !this.moving) this.events$.onMine() })
    this.mineSprite = img
  }

  private stepWalkers(dt: number) {
    for (const w of this.walkers) {
      w.t += (w.speed * dt) / Math.max(1, w.edge.length)
      if (w.t >= 1) {
        const at = w.forward ? w.edge.to : w.edge.from
        const options = this.roadEdges.filter(e => e !== w.edge && (e.from === at || e.to === at))
        const next = options.length ? options[Math.floor(Math.random() * options.length)] : w.edge
        w.forward = next === w.edge ? !w.forward : next.from === at
        w.edge = next
        w.t = 0
      }
      const t = w.forward ? w.t : 1 - w.t
      const p = w.edge.curve.getPoint(t)
      const tan = w.edge.curve.getTangent(t)
      w.body.setPosition(p.x - tan.y * w.side, p.y + tan.x * w.side * 0.5)
      w.body.setScale(w.forward === tan.x > 0 ? 1 : -1, 1)
      w.body.setDepth(w.body.y)
    }
  }

  private diamond(cx: number, cy: number, w: number, h: number) {
    return [new Phaser.Math.Vector2(cx, cy - h / 2), new Phaser.Math.Vector2(cx + w / 2, cy),
      new Phaser.Math.Vector2(cx, cy + h / 2), new Phaser.Math.Vector2(cx - w / 2, cy)]
  }

  /** Yalnızca KURULU kara binasında görünen, kenarı olmayan doğal açıklık. */
  private addOccupiedClearing(id: BuildingId, slot: LiveSlot, depth: number) {
    if (slot.zone === 'liman') return

    let seed = (slot.index + 1) * 0x9e3779b1
    for (let i = 0; i < id.length; i++) seed = Math.imul(seed ^ id.charCodeAt(i), 0x85ebca6b)
    const rnd = () => {
      seed |= 0
      seed = Math.imul(seed ^ (seed >>> 16), 0x7feb352d)
      seed = Math.imul(seed ^ (seed >>> 15), 0x846ca68b)
      seed ^= seed >>> 16
      return (seed >>> 0) / 4294967296
    }

    const g = this.add.graphics().setDepth(depth - 0.58)
    const cx = slot.screen.x
    const cy = slot.screen.y + TILE.h * 0.05
    const scale = id === 'divan' ? 1.02 : 0.88
    const rx = GROUND_TARGET_W * 0.46 * scale
    const ry = GROUND_TARGET_W * 0.18 * scale
    const points: Phaser.Math.Vector2[] = []

    for (let i = 0; i < 14; i++) {
      const a = (i / 14) * Math.PI * 2
      const jitter = 0.82 + rnd() * 0.24
      points.push(new Phaser.Math.Vector2(
        cx + Math.cos(a) * rx * jitter,
        cy + Math.sin(a) * ry * jitter,
      ))
    }

    g.fillStyle(0xb59e6e, id === 'divan' ? 0.075 : 0.055)
    g.fillPoints(points, true)

    // Tek renk yama gibi görünmesin: çok hafif kuru toprak lekeleri.
    for (let i = 0; i < 3; i++) {
      const x = cx + (rnd() - 0.5) * rx * 0.85
      const y = cy + (rnd() - 0.5) * ry * 0.75
      g.fillStyle(i % 2 ? 0xd0bc8d : 0x8d7853, 0.020 + rnd() * 0.018)
      g.fillEllipse(x, y, rx * (0.34 + rnd() * 0.22), ry * (0.25 + rnd() * 0.20))
    }

    this.pieces.push(g)
  }

  private addBuilding(id: BuildingId, slot: LiveSlot, active: boolean) {
    const anc = this.anchor(slot)
    const level = this.state.buildings[id]
    let dispW = TILE.w * 2, dispH = TILE.h * 2

    // Boş slot görünmez; yalnızca kurulu yapının altında doğal açıklık oluşur.
    this.addOccupiedClearing(id, slot, anc.baseY)

    // Çok hafif temas gölgesi: doğal açıklığın üstünde yapıyı zemine bağlar.
    const shadow = this.add.graphics().setDepth(anc.baseY - 0.3)
    shadow.fillStyle(0x283021, 0.022)
    shadow.fillEllipse(anc.x + 1, anc.baseY - TILE.h * 0.18,
      GROUND_TARGET_W * 0.24, GROUND_TARGET_W * 0.048)
    this.pieces.push(shadow)

    // Ikariam: seviye 0 iken (ilk inşaat) temel + iskele; sonra seviye aşamasının görseli.
    const textureKey = level === 0 && this.textures.exists('b_site') ? 'b_site' : `${id}-${buildingStage(level)}`
    if (BUILDINGS[id].art && this.textures.exists(textureKey)) {
      const img = this.add.image(anc.x, anc.baseY, textureKey).setOrigin(0.5, 1)
      const scale = this.artScale()
      img.setScale(scale).setDepth(anc.baseY)
      img.setFlipX(this.state.flips.includes(id))
      dispW = img.width * scale; dispH = img.height * scale
      this.pieces.push(img)
      // Yükseltme sürerken binanın önünde ahşap iskele durur.
      if (active && level > 0 && this.textures.exists('b_scaffold')) {
        const sc = this.add.image(anc.x, anc.baseY, 'b_scaffold').setOrigin(0.5, 1).setScale(scale).setDepth(anc.baseY + 0.05)
        this.pieces.push(sc)
      }
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

    // Normal şehir görünümünde UI bina sanatının üstüne binmez.
    // Seviye rozeti yalnızca etiketler açıldığında veya inşaat aktifken görünür.
    // Boyalı etiket: seviye dairesi + isim plakası (binanın alt yarısında, her şeyin üstünde).
    if (this.showLabels || active) {
      this.pieces.push(this.makePaintedLabel(anc.x, anc.baseY - dispH * 0.30, level, BUILDINGS[id].name, 1e6 + anc.baseY))
    }
    // İnşaat sürüyorsa altında süre çubuğu (çekiç, ilerleme, kalan süre, yeşil ok).
    const job = activeJob(this.state)
    if (active && job) this.pieces.push(this.makeTimer(anc.x, anc.baseY + TILE.h * 0.15, job.start, job.end, 1e6 + anc.baseY + 1))
  }

  /** Canvas yazıları için sayfanın başlık fontu (next/font değişkeninden). */
  private headingFont() {
    if (!this.fontCache) {
      const css = typeof document !== 'undefined' ? getComputedStyle(document.body).getPropertyValue('--font-heading').trim() : ''
      const body = typeof document !== 'undefined' ? getComputedStyle(document.body).getPropertyValue('--font-body').trim() : ''
      this.fontCache = { heading: css || 'Georgia, serif', body: body || 'system-ui, sans-serif' }
    }
    return this.fontCache
  }
  private fontCache: { heading: string; body: string } | null = null

  /** Ikariam etiketi: kahverengi seviye dairesi + parşömen isim şeridi (vektör). */
  private makePaintedLabel(x: number, y: number, level: number, name: string, depth: number) {
    const f = this.headingFont()
    const nameText = this.add.text(128, 0, name, { fontFamily: f.heading, fontSize: '48px', color: '#3a2310', fontStyle: '700' })
      .setOrigin(0, 0.5).setResolution(2)
    const w = Math.round(128 + nameText.width + 34)
    const g = this.add.graphics()
    // Parşömen şerit, kahverengi kenar.
    g.fillStyle(0x2a170a, 0.35); g.fillRoundedRect(44, -34, w - 40, 76, 16)
    g.fillStyle(0xfbf2d6, 0.97); g.fillRoundedRect(40, -38, w - 40, 76, 16)
    g.lineStyle(5, 0x8a5a22, 1); g.strokeRoundedRect(40, -38, w - 40, 76, 16)
    // Seviye dairesi: koyu kahverengi, altın halka.
    g.fillStyle(0x2a170a, 0.35); g.fillCircle(66, 6, 62)
    g.fillStyle(0x5a3517, 1); g.fillCircle(62, 0, 60)
    g.lineStyle(7, 0xe2bd78, 1); g.strokeCircle(62, 0, 57)
    const lvl = this.add.text(62, 2, String(level), { fontFamily: f.heading, fontSize: '56px', color: '#fbe9bb', fontStyle: '800' })
      .setOrigin(0.5, 0.5).setResolution(2)
    const parts: Phaser.GameObjects.GameObject[] = [g, nameText, lvl]
    const c = this.add.container(x, y, parts).setDepth(depth)
    this.hudItems.push({ c, width: w, height: 140, css: 22 })
    this.fitHudItem(this.hudItems[this.hudItems.length - 1])
    return c
  }

  /*
   * Etiket ve sayaçlar EKRANDA sabit boyda kalır (Ikariam'daki gibi): uzak
   * görünümde okunur, yakında binayı örtmez. Tuval cihaz pikselindedir
   * (city-canvas: zoom 1/dpr), yani ekranda 1 CSS pikseli = dpr / kamera zoom'u
   * dünya birimi.
   */
  private hudItems: { c: Phaser.GameObjects.Container; width: number; height: number; css: number }[] = []
  private fitHudItem(h: { c: Phaser.GameObjects.Container; width: number; height: number; css: number }) {
    const dpr = Math.min(2, (typeof window !== 'undefined' && window.devicePixelRatio) || 1)
    const zoom = this.cameras.main.zoom || 1
    const s = Math.min(0.6, (h.css * dpr) / zoom / h.height)
    h.c.setScale(s)
    // Konteyner sol kenardan kurulur; ortalamak için yarı genişlik kadar sola kayar.
    const baseX = h.c.getData('baseX') ?? h.c.x
    h.c.setData('baseX', baseX)
    h.c.x = baseX - (h.width * s) / 2
  }

  /** Süre çubuğu; update() her karede ilerlemeyi ve kalan süreyi tazeler. */
  private makeTimer(x: number, y: number, start: number, end: number, depth: number) {
    const f = this.headingFont()
    // Kahverengi çerçeve, parşömen iç, yeşil ilerleme, sağda çekiç dairesi.
    const frame = this.add.graphics()
    frame.fillStyle(0x2a170a, 0.35); frame.fillRoundedRect(4, -40, 470, 84, 18)
    frame.fillStyle(0x5a3517, 1); frame.fillRoundedRect(0, -44, 470, 84, 18)
    frame.fillStyle(0xf3e3b6, 1); frame.fillRoundedRect(10, -34, 390, 64, 12)
    frame.fillStyle(0x5a3517, 1); frame.fillCircle(430, -2, 34)
    frame.lineStyle(5, 0xe2bd78, 1); frame.strokeCircle(430, -2, 32)
    frame.fillStyle(0xe2bd78, 1); frame.fillTriangle(430, -22, 414, 2, 446, 2); frame.fillRect(424, 0, 12, 16)
    const bar = this.add.graphics()
    const text = this.add.text(205, -2, '', { fontFamily: f.body, fontSize: '40px', color: '#2e1807', fontStyle: '800' })
      .setOrigin(0.5, 0.5).setResolution(2)
    const parts: Phaser.GameObjects.GameObject[] = [frame, bar, text]
    const c = this.add.container(x, y, parts).setDepth(depth)
    this.hudItems.push({ c, width: 478, height: 100, css: 20 })
    this.fitHudItem(this.hudItems[this.hudItems.length - 1])
    this.timers.push({ bar, text, start, end })
    this.paintTimer(this.timers[this.timers.length - 1])
    return c
  }
  private lastHudZoom = 0
  private timers: { bar: Phaser.GameObjects.Graphics; text: Phaser.GameObjects.Text; start: number; end: number }[] = []
  private paintTimer(t: { bar: Phaser.GameObjects.Graphics; text: Phaser.GameObjects.Text; start: number; end: number }) {
    if (!t.bar.active) return
    const now = Date.now()
    const p = Math.max(0, Math.min(1, (now - t.start) / Math.max(1, t.end - t.start)))
    t.bar.clear()
    t.bar.fillStyle(0x5a9b2e, 1); t.bar.fillRoundedRect(10, -34, Math.max(24, 390 * p), 64, 12)
    t.bar.fillStyle(0x9ad160, 1); t.bar.fillRoundedRect(10, -34, Math.max(24, 390 * p), 24, { tl: 12, tr: 12, bl: 0, br: 0 })
    const left = Math.max(0, Math.ceil((t.end - now) / 1000))
    const h = Math.floor(left / 3600), m = Math.floor((left % 3600) / 60), sec = left % 60
    t.text.setText(h > 0 ? `${h}sa ${m}dk` : m > 0 ? `${m}dk ${sec}sn` : `${sec}sn`)
  }

  /** BOŞ ARSA: normal şehir görünümünde yalnızca zemin görünür.
   * Bayraklar İnşa/Taşıma kipinde açılır; ekran sürekli kırmızı flamayla dolmaz.
   */
  private addEmptyPlot(slot: LiveSlot) {
    const anc = this.anchor(slot)
    // Ikariam "inşaat alanı": her boş arsada küçük bir bayrak HER ZAMAN durur
    // (oyuncu nereye kurabileceğini görür). Vurgulu 2x2 zemin yalnızca inşa kipinde.
    if (this.placing) this.drawBuildPad(slot)
    // Bayrak arsanın TAM ORTASINA dikilir (footprint merkezi).
    this.drawBuildFlag(slot.screen.x, slot.screen.y, slot.zone === 'liman')
    const hit = this.add.rectangle(slot.screen.x, slot.screen.y - TILE.h * 0.3, TILE.w * 1.6, TILE.h * 1.8)
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

  /**
   * İnşa arsası (Ikariam): düzlenmiş toprak elmas, taş kenar ve tam ortada
   * kırmızı flamalı bayrak. Denizdeki arsa ahşap iskele olarak çizilir.
   */
  private drawBuildFlag(x: number, cy: number, sea = false) {
    const s = TILE.w
    // Zemin (arsa/iskele) yolların üstünde ama bütün binaların ALTINDA; bayrak ise kendi y'sinde.
    const pad = this.add.graphics().setDepth(-790)
    const g = this.add.graphics().setDepth(cy)
    const poleH = s * 0.5
    const baseY = cy
    {
    const g = pad
    if (sea) {
      g.fillStyle(0x6b4a2b, 0.95); g.fillPoints(this.diamond(x, cy, TILE.w * 1.5, TILE.h * 1.5), true)
      // Kalas çizgileri: sol-üst kenara paralel.
      const hw = TILE.w * 0.75, hh = TILE.h * 0.75
      g.lineStyle(2, 0x3e2a17, 0.7)
      for (let k = 1; k <= 4; k++) {
        const t = k / 5
        g.lineBetween(x - hw + hw * t, cy + hh * t, x + hw * t, cy - hh + hh * t)
      }
      g.lineStyle(3, 0x3e2a17, 0.9); g.strokePoints(this.diamond(x, cy, TILE.w * 1.5, TILE.h * 1.5), true)
    } else {
      // Sade inşaat izi: çimde küçük, yumuşak toprak lekesi (plaka değil).
      g.fillStyle(0xa48b5c, 0.28); g.fillEllipse(x, cy, TILE.w * 0.95, TILE.h * 0.95)
      g.fillStyle(0xc2a878, 0.30); g.fillEllipse(x, cy, TILE.w * 0.6, TILE.h * 0.6)
    }
    }
    this.pieces.push(pad)
    g.fillStyle(0x0d1c16, 0.12); g.fillEllipse(x + 1, baseY - 1, s * 0.24, s * 0.09)
    g.fillStyle(0x5a3d24, 0.92); g.fillRect(x - s * 0.018, baseY - poleH, s * 0.036, poleH)
    g.fillStyle(0xa64a37, 0.95)
    g.fillPoints([new Phaser.Math.Vector2(x + s * 0.018, baseY - poleH),
      new Phaser.Math.Vector2(x + s * 0.018, baseY - poleH + s * 0.16),
      new Phaser.Math.Vector2(x + s * 0.25, baseY - poleH + s * 0.08)], true)
    g.fillStyle(0xcaa24a, 0.9); g.fillCircle(x, baseY - poleH, s * 0.03)
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
}
