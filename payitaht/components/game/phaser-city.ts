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
import { TILE, CITY_SLOTS, COAST_SLOTS, DEFENSE_SLOTS, DEFENSE_FOUNDATION, ROAD_GRAPH, HALL_SLOT_ID, ROAD_EXITS, WALL_GATES, PLAZA, slotById } from '@/lib/game/city-map'
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
/** Bina görsellerinde zemin elmasının merkezi, resmin altından bu kadar yukarıda (sanat pikseli, 600px tuval). */
const ART_GROUND_PX = 118
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
    this.addBirds()
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
  private framedDivan = -1
  private static readonly HUD_TOP = 0.13
  private static readonly HUD_BOTTOM = 0.15

  /**
   * KASABA kutusu: açık city slotları, bina silüetlerinin taşmasıyla. Ikariam'daki
   * gibi varsayılan görünüm bütün şehri tek ekranda gösterir; liman hemen
   * altta görünür, çapa düğmesi (focusHarbour) ona yakınlaşır.
   */
  private townRect() {
    // Yalnızca AÇIK arsalar: şehir büyüdükçe kadraj da genişler (Ikariam gibi).
    const open = new Set(this.openSlotIds(this.state))
    const openCity = CITY_SLOTS.filter(s => open.has(s.id))
    const box = (slots: typeof CITY_SLOTS) => {
      const xs = slots.map(s => s.screen.x), ys = slots.map(s => s.screen.y)
      const padX = FOOTPRINT_DIAMOND_W * 0.62
      const padTop = TILE.h * 5 // en üst sıradaki binaların çatı/kubbe payı
      const padBottom = TILE.h * 1.5
      const x = Math.min(...xs) - padX, y = Math.min(...ys) - padTop
      return { x, y, w: Math.max(...xs) + padX - x, h: Math.max(...ys) + padBottom - y }
    }
    const full = box(CITY_SLOTS)
    if (openCity.length < 3) return full
    // Küçük kasabada bile fazla yakın olmasın: tam şehrin en az ~%90 genişliği kadrajda.
    const t = box(openCity)
    const w = Math.max(t.w, full.w * 0.9), h = Math.max(t.h, full.h * 0.7)
    return { x: t.x + t.w / 2 - w / 2, y: t.y + t.h / 2 - h / 2, w, h }
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
    // Açılışta şehrin ortası yakın: en dış sütunlar kenarda hafifçe kesilir, kaydırarak görülür.
    return Math.min(this.scale.width / (t.w * 0.8), bandH / (t.h * 0.78))
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
    this.stepBirds(Math.min(delta, 100) / 1000)
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
  private artScale() { return (FOOTPRINT_DIAMOND_W / ART_DIAMOND_PX) * 1.8 }

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
    for (const id of ROAD_EXITS) ids.add(id) // kapılardan çıkan caddeler hep açık
    return [...ids]
  }

  /** React tarafından çağrılır; yalnızca GÖRÜNEN bir şey değiştiyse çizer. */
  sync(game: Game, showLabels: boolean, placing: boolean, moving: BuildingId | null = null, movePlot: number | null = null) {
    this.state = game
    if (!this.built) return
    if (game.buildings.divan !== this.framedDivan) { // yeni arsalar açıldı: "şehir" kadrajı büyür
      this.framedDivan = game.buildings.divan
      this.cityZoom = Math.max(this.townZoom(), this.minZoom)
    }
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
   * SURLAR — şehri ve limanı saran kalın kumtaşı duvar, savunma yuvalarında
   * ve köşelerde kuleler. Haritadaki kapılarda açıklık: kara kapılarında
   * kemerli kapı kulesi, limanda iki kule arasında gerili zincir.
   * Duvar seviyeyle yükselir. Parçalar kısa tutulur ve derinlikleri zemin
   * y'sidir: binalar ve ağaçlarla doğru sıralanır.
   */
  private drawWalls(level: number) {
    const ring = DEFENSE_FOUNDATION.map(p => p.screen)
    const n = ring.length
    const wallH = TILE.h * (1.05 + Math.min(level, 10) * 0.06)
    // KAPILAR haritadan gelir (kara kapıları + limanın deniz kapısı). Açıklık
    // halka boyunca yay uzunluğuyla açılır; köşeye düşse de tam genişlikte olur.
    const segLen = ring.map((p, i) => Math.hypot(ring[(i + 1) % n].x - p.x, ring[(i + 1) % n].y - p.y))
    const segStart: number[] = []
    segLen.reduce((acc, l, i) => { segStart[i] = acc; return acc + l }, 0)
    const perimeter = segLen.reduce((x, y) => x + y, 0)
    const pointAt = (s: number) => {
      const w = ((s % perimeter) + perimeter) % perimeter
      let i = 0
      while (i < n - 1 && segStart[i + 1] <= w) i++
      const u = (w - segStart[i]) / (segLen[i] || 1), A = ring[i], B = ring[(i + 1) % n]
      return { x: A.x + (B.x - A.x) * u, y: A.y + (B.y - A.y) * u }
    }
    const gateSpans = WALL_GATES.map(gate => {
      let best = { s: 0, d: Infinity }
      for (let i = 0; i < n; i++) {
        const A = ring[i], B = ring[(i + 1) % n], dx = B.x - A.x, dy = B.y - A.y
        const u = Math.max(0, Math.min(1, ((gate.screen.x - A.x) * dx + (gate.screen.y - A.y) * dy) / (dx * dx + dy * dy || 1)))
        const d = Math.hypot(A.x + dx * u - gate.screen.x, A.y + dy * u - gate.screen.y)
        if (d < best.d) best = { s: segStart[i] + u * segLen[i], d }
      }
      const half = gate.kind === 'sea' ? TILE.w * 1.3 : TILE.w * 0.5
      return { kind: gate.kind, s0: best.s - half, s1: best.s + half, center: pointAt(best.s) }
    })
    // Her kenar için [t0, t1] açıklıkları.
    const gates: Array<{ seg: number; t0: number; t1: number }> = []
    for (const g of gateSpans) {
      for (let i = 0; i < n; i++) {
        for (const shift of [-perimeter, 0, perimeter]) {
          const a0 = segStart[i] + shift, a1 = a0 + segLen[i]
          const lo = Math.max(a0, g.s0), hi = Math.min(a1, g.s1)
          if (hi > lo) gates.push({ seg: i, t0: (lo - a0) / segLen[i], t1: (hi - a0) / segLen[i] })
        }
      }
    }
    const hits = gateSpans.map(g => g.center)

    const V = (x: number, y: number) => new Phaser.Math.Vector2(x, y)
    const hall = slotById(HALL_SLOT_ID)!.screen
    // Zemin (karo) uzayında dik vektör: duvarın KALINLIĞI şehre doğru uzanır.
    const thick = (p0: { x: number; y: number }, p1: { x: number; y: number }) => {
      const gx = (x: number, y: number) => (x / (TILE.w / 2) + y / (TILE.h / 2)) / 2
      const gy = (x: number, y: number) => (y / (TILE.h / 2) - x / (TILE.w / 2)) / 2
      const dgx = gx(p1.x - p0.x, p1.y - p0.y), dgy = gy(p1.x - p0.x, p1.y - p0.y)
      const l = Math.hypot(dgx, dgy) || 1
      const ngx = -dgy / l * 0.42, ngy = dgx / l * 0.42 // 0.42 karo kalınlık
      const nx = (ngx - ngy) * TILE.w / 2, ny = (ngx + ngy) * TILE.h / 2
      const mx = (p0.x + p1.x) / 2, my = (p0.y + p1.y) / 2
      if ((hall.x - mx) * nx + (hall.y - my) * ny < 0) return { x: -nx, y: -ny }
      return { x: nx, y: ny }
    }
    const piece = (p0: { x: number; y: number }, p1: { x: number; y: number }) => {
      const n = thick(p0, p1)
      // Ön yüz: izleyiciye (ekranda aşağıya) bakan kenar.
      const inFront = n.y > 0
      const f0 = inFront ? { x: p0.x + n.x, y: p0.y + n.y } : p0
      const f1 = inFront ? { x: p1.x + n.x, y: p1.y + n.y } : p1
      const b0 = inFront ? p0 : { x: p0.x + n.x, y: p0.y + n.y }
      const b1 = inFront ? p1 : { x: p1.x + n.x, y: p1.y + n.y }
      const g = this.add.graphics().setDepth(Math.max(f0.y, f1.y) + 1)
      const dx = f1.x - f0.x, dy = f1.y - f0.y
      // Işık sol-üstten: "\\" yönlü yüzler aydınlık, "/" yönlüler gölgede.
      const lit = dx * dy > 0 ? 1 : Math.abs(dy) < Math.abs(dx) * 0.2 ? 0.6 : 0.25
      const face = lit > 0.8 ? 0xdcc497 : lit > 0.5 ? 0xcbb083 : 0xb0936a
      const top = 0xeadbb6
      // Zemin gölgesi.
      g.fillStyle(0x1b2a14, 0.22)
      g.fillPoints([V(f0.x, f0.y), V(f1.x, f1.y), V(f1.x + TILE.w * 0.2, f1.y + TILE.h * 0.3), V(f0.x + TILE.w * 0.2, f0.y + TILE.h * 0.3)], true)
      // Kaide (koyu taş şerit) + ön yüz.
      g.fillStyle(face, 1)
      g.fillPoints([V(f0.x, f0.y), V(f1.x, f1.y), V(f1.x, f1.y - wallH), V(f0.x, f0.y - wallH)], true)
      g.fillStyle(0x7d6444, 0.35)
      g.fillPoints([V(f0.x, f0.y), V(f1.x, f1.y), V(f1.x, f1.y - wallH * 0.14), V(f0.x, f0.y - wallH * 0.14)], true)
      // Taş sıraları ve derzler.
      g.lineStyle(1.2, 0x8a6c47, 0.32)
      for (const f of [0.3, 0.52, 0.74]) g.lineBetween(f0.x, f0.y - wallH * f, f1.x, f1.y - wallH * f)
      const len = Math.hypot(dx, dy), ux = dx / (len || 1), uy = dy / (len || 1)
      for (let d = TILE.w * 0.1, row = 0; d < len; d += TILE.w * 0.11, row++) {
        const lo = row % 2 ? 0.3 : 0.52, hi = row % 2 ? 0.52 : 0.74
        g.lineBetween(f0.x + ux * d, f0.y + uy * d - wallH * lo, f0.x + ux * d, f0.y + uy * d - wallH * hi)
      }
      // Üst yürüyüş yolu (kalınlık görünür).
      g.fillStyle(top, 1)
      g.fillPoints([V(f0.x, f0.y - wallH), V(f1.x, f1.y - wallH), V(b1.x, b1.y - wallH), V(b0.x, b0.y - wallH)], true)
      g.lineStyle(1.4, 0x8a6c47, 0.45)
      g.lineBetween(b0.x, b0.y - wallH, b1.x, b1.y - wallH)
      // Mazgallar (ön kenar boyunca).
      const step = TILE.w * 0.17, mw = TILE.w * 0.09, mh = TILE.h * 0.2
      for (let d = step * 0.3; d + mw <= len; d += step) {
        const a = { x: f0.x + ux * d, y: f0.y + uy * d - wallH }
        const b = { x: a.x + ux * mw, y: a.y + uy * mw }
        g.fillStyle(face, 1)
        g.fillPoints([V(a.x, a.y), V(b.x, b.y), V(b.x, b.y - mh), V(a.x, a.y - mh)], true)
        g.fillStyle(top, 1)
        g.fillPoints([V(a.x, a.y - mh), V(b.x, b.y - mh), V(b.x + n.x * 0.35 * (inFront ? -1 : 1), b.y - mh + n.y * 0.35 * (inFront ? -1 : 1)), V(a.x + n.x * 0.35 * (inFront ? -1 : 1), a.y - mh + n.y * 0.35 * (inFront ? -1 : 1))], true)
      }
      g.lineStyle(1.6, 0x5e4630, 0.6); g.lineBetween(f0.x, f0.y, f1.x, f1.y)
      g.lineStyle(1.2, 0x6e5436, 0.5); g.lineBetween(f0.x, f0.y - wallH, f1.x, f1.y - wallH)
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
        // Her kulede al sancak (ay-yıldız), rüzgârda dalgalı.
        const top = y - w * 0.04 - img.height * (w / img.width) + w * 0.06
        const f = this.add.graphics().setDepth(y + 2.1)
        const fw = w * 0.5, fh = w * 0.3
        f.lineStyle(2.5, 0x4a3a28, 1); f.lineBetween(x, top, x, top - w * 0.62)
        f.fillStyle(0xe2bd78, 1); f.fillCircle(x, top - w * 0.64, 2.6)
        f.fillStyle(0xb3261e, 1)
        f.fillPoints([new Phaser.Math.Vector2(x + 1, top - w * 0.6), new Phaser.Math.Vector2(x + fw * 0.5, top - w * 0.6 - 3), new Phaser.Math.Vector2(x + fw, top - w * 0.6 + 2),
          new Phaser.Math.Vector2(x + fw, top - w * 0.6 + fh + 2), new Phaser.Math.Vector2(x + fw * 0.5, top - w * 0.6 + fh - 3), new Phaser.Math.Vector2(x + 1, top - w * 0.6 + fh)], true)
        f.fillStyle(0xf6efe0, 1); f.fillCircle(x + fw * 0.42, top - w * 0.6 + fh * 0.5, fh * 0.26)
        f.fillStyle(0xb3261e, 1); f.fillCircle(x + fw * 0.47, top - w * 0.6 + fh * 0.5, fh * 0.21)
        f.fillStyle(0xf6efe0, 1); f.fillCircle(x + fw * 0.66, top - w * 0.6 + fh * 0.5, fh * 0.08)
        this.pieces.push(f)
      }
    }
    const placed: Array<{ x: number; y: number }> = []
    for (const s of DEFENSE_SLOTS) {
      tower(s.screen.x, s.screen.y + TILE.h * 0.2, TILE.w * 0.78)
      placed.push(s.screen)
    }
    // KAPILAR. Kara kapısı: iki kule + kemerli kapı kulesi (lento, mazgal,
    // sancak). Deniz kapısı: iki büyük kule arasında gerili liman zinciri.
    for (const g of gateSpans) {
      const land = g.kind === 'land'
      const pad = TILE.w * 0.1
      const L = pointAt(g.s0 - pad), R = pointAt(g.s1 + pad)
      for (const p of [L, R]) {
        placed.push(p)
        tower(p.x, p.y + TILE.h * 0.12, TILE.w * (land ? 0.66 : 0.9))
      }
      const lg = this.add.graphics().setDepth(Math.max(L.y, R.y) + 1.8)
      if (land) {
        // Kapı kulesi: yolun üstüne oturan kemerli taş blok. Kemer, geçidin
        // baktığı yüzde (kuzey kapısında ön yüz, yan kapılarda yan yüz).
        const c = g.center, w = TILE.w * 1.1, h = wallH * 1.7, d = w * 0.34
        const x0 = c.x - w / 2, x1 = c.x + w / 2, y0 = c.y + TILE.h * 0.3
        const tgA = pointAt(g.s0), tgB = pointAt(g.s1)
        const sideGate = Math.abs(tgB.y - tgA.y) > Math.abs(tgB.x - tgA.x) // duvar dikey: geçit doğu-batı
        lg.fillStyle(0x1b2a14, 0.24); lg.fillEllipse(c.x + w * 0.25, y0 + 6, w * 1.5, w * 0.34)
        // Yan yüz (sağ), ön yüz, üst.
        lg.fillStyle(0xb0936a, 1); lg.fillPoints([V(x1, y0), V(x1 + d, y0 - d / 2), V(x1 + d, y0 - d / 2 - h), V(x1, y0 - h)], true)
        lg.fillStyle(0xdcc497, 1); lg.fillRect(x0, y0 - h, w, h)
        lg.fillStyle(0xeadbb6, 1); lg.fillPoints([V(x0, y0 - h), V(x1, y0 - h), V(x1 + d, y0 - d / 2 - h), V(x0 + d, y0 - d / 2 - h)], true)
        // Taş sıraları.
        lg.lineStyle(1.2, 0x8a6c47, 0.32)
        for (const f of [0.25, 0.45, 0.65, 0.85]) lg.lineBetween(x0, y0 - h * f, x1, y0 - h * f)
        lg.fillStyle(0x7d6444, 0.35); lg.fillRect(x0, y0 - h * 0.1, w, h * 0.1)
        // Kemerli geçit (koyu) ve açık ahşap kanat.
        const arch = (cx: number, by: number, aw: number, ah: number, skew: number) => {
          const pts: Phaser.Math.Vector2[] = [V(cx - aw / 2, by - skew * aw / 2)]
          for (let k = 0; k <= 12; k++) {
            const t = Math.PI - k / 12 * Math.PI
            pts.push(V(cx + Math.cos(t) * aw / 2, by - ah - Math.sin(t) * aw * 0.42 + skew * Math.cos(t) * aw / 2))
          }
          pts.push(V(cx + aw / 2, by + skew * aw / 2))
          return pts
        }
        lg.fillStyle(0x2e2216, 0.92)
        if (sideGate) lg.fillPoints(arch(x1 + d / 2, y0 - d / 4, d * 0.78, h * 0.42, -0.5), true)
        else lg.fillPoints(arch(c.x, y0, w * 0.42, h * 0.42, 0), true)
        // Mazgallar ve sancak.
        for (let k = 0; k < 5; k++) {
          const x = x0 + (k + 0.2) * w / 5
          lg.fillStyle(0xdcc497, 1); lg.fillRect(x, y0 - h - 14, w / 10, 14)
          lg.fillStyle(0xeadbb6, 1); lg.fillRect(x, y0 - h - 16, w / 10, 3)
        }
        const mx = c.x + d / 2, my = y0 - h - d / 4
        lg.lineStyle(3, 0x5a4630, 1); lg.lineBetween(mx, my, mx, my - 70)
        lg.fillStyle(0xe2bd78, 1); lg.fillCircle(mx, my - 72, 3.5)
        lg.fillStyle(0xb3261e, 1); lg.fillPoints([V(mx + 2, my - 68), V(mx + 44, my - 60), V(mx + 37, my - 51), V(mx + 44, my - 42), V(mx + 2, my - 36)], true)
        lg.setDepth(y0 + 2)
      } else {
        // Liman zinciri: kulelerden sarkan halkalı zincir + şamandıralar.
        const pts: Phaser.Math.Vector2[] = []
        for (let k = 0; k <= 24; k++) {
          const t = k / 24
          pts.push(V(L.x + (R.x - L.x) * t, L.y + (R.y - L.y) * t - wallH * 0.55 + Math.sin(t * Math.PI) * wallH * 0.5))
        }
        lg.lineStyle(5, 0x2b2622, 0.9); lg.strokePoints(pts, false)
        for (let k = 1; k < 24; k += 1) { lg.fillStyle(0x4a423a, 1); lg.fillCircle(pts[k].x, pts[k].y, 3) }
        for (const t of [0.3, 0.7]) {
          const p = pts[Math.round(t * 24)]
          lg.fillStyle(0xb3261e, 1); lg.fillEllipse(p.x, p.y + 8, 18, 10)
        }
      }
      this.pieces.push(lg)
    }
    // Ara burçlar: halkanın köşelerinde düzenli aralıkla (kapılarda değil).
    for (const p of ring) {
      if (placed.some(q => Math.hypot(q.x - p.x, q.y - p.y) < TILE.w * 3.2)) continue
      if (hits.some(h => Math.hypot(h.x - p.x, h.y - p.y) < TILE.w * 1.2)) continue
      placed.push(p)
      tower(p.x, p.y + TILE.h * 0.15, TILE.w * 0.6)
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
    for (let i = 0; i < count; i++) {
      const g = this.add.graphics()
      this.drawCitizen(g, rnd)
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

  /*
   * OSMANLI HALKI: sarıklı/fesli esnaf, beyaz börklü yeniçeri, feraceli ve
   * yaşmaklı kadın, sırtında yükle hamal. Hepsi birkaç piksellik vektör.
   */
  private drawCitizen(g: Phaser.GameObjects.Graphics, rnd: () => number) {
    const s = 1.3, roll = rnd()
    const skin = 0xd9a77a
    g.fillStyle(0x1b2a14, 0.22); g.fillEllipse(1.5 * s, 0, 9 * s, 3.4 * s)
    const body = (robe: number, sash?: number) => {
      g.fillStyle(robe, 1); g.fillTriangle(-3.6 * s, 0, 3.6 * s, 0, 0, -12 * s)
      g.fillRoundedRect(-2.6 * s, -12 * s, 5.2 * s, 6 * s, 1.6 * s)
      if (sash !== undefined) { g.fillStyle(sash, 1); g.fillRect(-2.7 * s, -7.4 * s, 5.4 * s, 1.4 * s) }
    }
    if (roll < 0.14) {
      // Yeniçeri: lacivert dolama, kırmızı kuşak, uzun beyaz börk.
      body(0x2d4a78, 0xb3261e)
      g.fillStyle(skin, 1); g.fillCircle(0, -14.6 * s, 2.5 * s)
      g.fillStyle(0xf4efe2, 1); g.fillPoints([
        new Phaser.Math.Vector2(-2.4 * s, -16.4 * s), new Phaser.Math.Vector2(2.4 * s, -16.4 * s),
        new Phaser.Math.Vector2(1.2 * s, -23 * s), new Phaser.Math.Vector2(-3.8 * s, -21.5 * s)], true)
      g.fillStyle(0xe2bd78, 1); g.fillRect(-2.4 * s, -17.2 * s, 4.8 * s, 1 * s)
    } else if (roll < 0.40) {
      // Kadın: ferace (koyu renk), beyaz yaşmak.
      const ferace = [0x3b2a5a, 0x5a2a3a, 0x2a4a4a, 0x6a4a2a][Math.floor(rnd() * 4)]
      body(ferace)
      g.fillStyle(0xf6f1e6, 1); g.fillCircle(0, -14.8 * s, 2.9 * s)
      g.fillStyle(skin, 1); g.fillEllipse(0.6 * s, -14.4 * s, 2.4 * s, 1.6 * s)
    } else if (roll < 0.52) {
      // Hamal: kahverengi yelek, sırtında denk.
      body(0x7a5230)
      g.fillStyle(skin, 1); g.fillCircle(0, -14.6 * s, 2.5 * s)
      g.fillStyle(0x6a3a22, 1); g.fillRect(-2 * s, -18.4 * s, 4 * s, 2.2 * s)
      g.fillStyle(0xc9a46a, 1); g.fillRoundedRect(-7.4 * s, -16 * s, 5.4 * s, 8 * s, 1.2 * s)
      g.lineStyle(1, 0x7a5a30, 1); g.lineBetween(-7.4 * s, -12 * s, -2 * s, -12 * s)
    } else {
      // Esnaf: renkli entari, fes ya da sarık.
      const robes = [0xb8412f, 0x3f6f9a, 0x4f7d4a, 0xd6a93a, 0x7a4f8a, 0xe9dcc0, 0x8a5a35]
      body(robes[Math.floor(rnd() * robes.length)], rnd() < 0.5 ? 0xe9dcc0 : undefined)
      g.fillStyle(skin, 1); g.fillCircle(0, -14.6 * s, 2.5 * s)
      if (rnd() < 0.5) { g.fillStyle(0xa8322a, 1); g.fillRect(-2 * s, -18.6 * s, 4 * s, 2.6 * s); g.fillStyle(0x1b1b1b, 1); g.fillRect(-0.3 * s, -19 * s, 0.6 * s, 0.6 * s) }
      else { g.fillStyle(0xf2ead8, 1); g.fillEllipse(0, -17 * s, 6.2 * s, 3.6 * s); g.fillStyle(0xb3261e, 1); g.fillCircle(0, -18.2 * s, 1 * s) }
    }
  }

  /*
   * KUŞLAR: meydanda şadırvan çevresinde yem toplayan güvercinler (arada bir
   * sürü halinde havalanıp döner, yeniden konar) ve limanın üstünde süzülen
   * martılar.
   */
  private birds: Array<{ g: Phaser.GameObjects.Graphics; kind: 'pigeon' | 'gull'; hx: number; hy: number; x: number; y: number; ph: number; r: number; sp: number }> = []
  private flockClock = 0
  private addBirds() {
    for (const b of this.birds) b.g.destroy()
    this.birds = []
    let seed = 0xb12d
    const rnd = () => { seed = (Math.imul(seed, 1664525) + 1013904223) | 0; return (seed >>> 0) / 4294967296 }
    const P = PLAZA.screen
    for (let i = 0; i < 16; i++) {
      const a = rnd() * Math.PI * 2, r = 0.45 + rnd() * 0.5
      let hx = P.x + Math.cos(a) * PLAZA.rx * r * 0.7, hy = P.y + PLAZA.ry * 0.74 + Math.sin(a) * PLAZA.ry * r * 0.3
      if (Math.abs(hx - P.x) < 60 && Math.abs(hy - (P.y + PLAZA.ry * 0.74)) < 30) hx += 90
      const g = this.add.graphics()
      const tone = [0x8e9296, 0xa7abae, 0x6f7377, 0xd9d6cf][i % 4]
      g.fillStyle(0x1b2a14, 0.2); g.fillEllipse(0.5, 0.4, 7, 2.2)
      g.fillStyle(tone, 1); g.fillEllipse(0, -2.4, 7.4, 4.2)
      g.fillStyle(0x5b6a6e, 1); g.fillCircle(3.2, -4.6, 1.9)
      g.fillStyle(0x3a3a3a, 1); g.fillRect(-4.6, -3.2, 2.2, 1.2)
      g.fillStyle(0xe0a060, 1); g.fillRect(4.8, -4.8, 1.4, 0.8)
      this.birds.push({ g, kind: 'pigeon', hx, hy, x: hx, y: hy, ph: rnd() * 10, r: 60 + rnd() * 90, sp: 0.8 + rnd() * 0.5 })
    }
    const sea = COAST_SLOTS.reduce((m, c) => ({ x: m.x + c.screen.x / COAST_SLOTS.length, y: Math.max(m.y, c.screen.y) }), { x: 0, y: -Infinity })
    for (let i = 0; i < 6; i++) {
      const g = this.add.graphics()
      g.lineStyle(2.6, 0xf7f7f2, 1)
      g.beginPath(); g.moveTo(-9, -2); g.lineTo(-3, 1); g.lineTo(0, 0); g.lineTo(3, 1); g.lineTo(9, -2); g.strokePath()
      g.fillStyle(0x3a3a3a, 1); g.fillCircle(-9, -2, 1); g.fillCircle(9, -2, 1)
      this.birds.push({ g, kind: 'gull', hx: sea.x + (rnd() - 0.5) * 900, hy: sea.y + 260 + rnd() * 320, x: 0, y: 0, ph: rnd() * 10, r: 90 + rnd() * 160, sp: 0.25 + rnd() * 0.2 })
    }
    this.stepBirds(0)
  }
  private stepBirds(dt: number) {
    this.flockClock += dt
    // 18 sn döngü: ~14 sn yerde, ~4 sn havada.
    const cycle = this.flockClock % 18, flying = cycle > 14
    const lift = flying ? Math.sin((cycle - 14) / 4 * Math.PI) : 0
    for (const b of this.birds) {
      b.ph += dt * b.sp
      if (b.kind === 'gull') {
        b.x = b.hx + Math.cos(b.ph) * b.r
        b.y = b.hy + Math.sin(b.ph) * b.r * 0.4 - 140
        b.g.setPosition(b.x, b.y).setDepth(1e5).setScale(1, 0.6 + 0.4 * Math.abs(Math.sin(b.ph * 9)))
        continue
      }
      if (flying) {
        const a = b.ph * 2.6
        b.g.setPosition(b.hx + Math.cos(a) * b.r * lift, b.hy - lift * (110 + b.r * 0.4) + Math.sin(a) * b.r * 0.3 * lift)
        b.g.setScale(Math.cos(a) > 0 ? 1 : -1, 0.5 + 0.5 * Math.abs(Math.sin(b.ph * 30))).setDepth(1e5)
      } else {
        // Gagalama: küçük sıçrama ve dönüş.
        const peck = Math.max(0, Math.sin(b.ph * 5)) * 1.6
        b.g.setPosition(b.hx + Math.sin(b.ph * 0.7) * 6, b.hy - peck).setScale(Math.sin(b.ph * 0.35) > 0 ? 1 : -1, 1).setDepth(b.hy)
      }
    }
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

  /*
   * AVLU: kurulu her kara binasının çevresinde alçak taş bahçe duvarı. Yola
   * bakan kenarda iki babalı bir avlu kapısı açılır (sokak girişi oradan
   * geçer). Yan köşelerde servi, arkada meyve ağacı, kapı yanında çiçek.
   */
  private addGardenWall(slot: LiveSlot, imgY: number, artS: number) {
    const V = (x: number, y: number) => new Phaser.Math.Vector2(x, y)
    const cx = slot.screen.x, cy = slot.screen.y
    // Avlu mümkünse geniş (×1.3); yakındaki bir cadde/yol (ve servi sırası)
    // duvarın içinde kalıyorsa yola değmeyene kadar daraltılır.
    const nodeAt = new Map(ROAD_GRAPH.nodes.map(n => [n.id, n.screen]))
    const roadPts: Array<{ x: number; y: number }> = []
    for (const e of ROAD_GRAPH.edges) {
      if (e.from === slot.slotId || e.to === slot.slotId) continue
      const A = nodeAt.get(e.from), B = nodeAt.get(e.to)
      if (!A || !B || Math.min(Math.hypot(A.x - cx, A.y - cy), Math.hypot(B.x - cx, B.y - cy), Math.hypot(e.ctrl.x - cx, e.ctrl.y - cy)) > TILE.w * 6) continue
      for (let k = 0; k <= 24; k++) {
        const t = k / 24, u = 1 - t
        roadPts.push({ x: u * u * A.x + 2 * u * t * e.ctrl.x + t * t * B.x, y: u * u * A.y + 2 * u * t * e.ctrl.y + t * t * B.y })
      }
    }
    let f = 1.3
    const base = 211 * artS
    while (f > 1.06 && roadPts.some(p => Math.abs(p.x - cx) / (base * f) + Math.abs(p.y - cy) / (base * f / 2) < 1 + TILE.w * 0.62 / (base * f))) f -= 0.03
    const hw = base * f, hh = hw / 2
    const N = { x: cx, y: cy - hh }, E = { x: cx + hw, y: cy }, S = { x: cx, y: cy + hh }, W = { x: cx - hw, y: cy }
    const ring = [N, E, S, W]
    // Kapı: bu arsaya bağlanan yol düğümüne bakan noktada.
    const edge = ROAD_GRAPH.edges.find(e => e.from === slot.slotId || e.to === slot.slotId)
    const other = edge ? ROAD_GRAPH.nodes.find(n => n.id === (edge.from === slot.slotId ? edge.to : edge.from))?.screen : undefined
    const dx = (other?.x ?? cx) - cx, dy = (other?.y ?? cy + 1) - cy
    const k = 1 / (Math.abs(dx) / hw + Math.abs(dy) / hh || 1)
    const gate = { x: cx + dx * k, y: cy + dy * k }
    const segs = ring.map((a, i) => [a, ring[(i + 1) % 4]] as const)
    const onSeg = (p: { x: number; y: number }, a: { x: number; y: number }, b: { x: number; y: number }) => {
      const l2 = (b.x - a.x) ** 2 + (b.y - a.y) ** 2
      const t = ((p.x - a.x) * (b.x - a.x) + (p.y - a.y) * (b.y - a.y)) / l2
      return { t, d: Math.hypot(a.x + (b.x - a.x) * t - p.x, a.y + (b.y - a.y) * t - p.y) }
    }
    const gateSeg = segs.map(([a, b], i) => ({ i, ...onSeg(gate, a, b) })).sort((p, q) => p.d - q.d)[0]
    const segLen = Math.hypot(hw, hh), gapHalf = TILE.w * 0.36 / segLen
    const wallH = TILE.h * 0.3
    const rnd = (() => { let sd = (slot.index + 7) * 0x9e3779b1; return () => { sd = (Math.imul(sd, 1664525) + 1013904223) | 0; return (sd >>> 0) / 4294967296 } })()
    const stone = [0xe6d7b4, 0xdccba5, 0xe9dcc0][slot.index % 3]

    const piece = (a: { x: number; y: number }, b: { x: number; y: number }, front: boolean) => {
      const g = this.add.graphics().setDepth(front ? imgY + 0.1 : cy - hh - 1)
      g.fillStyle(0x1b2a14, 0.18)
      g.fillPoints([V(a.x, a.y), V(b.x, b.y), V(b.x + 6, b.y + 5), V(a.x + 6, a.y + 5)], true)
      g.fillStyle(Phaser.Display.Color.ValueToColor(stone).darken(front ? 10 : 22).color, 1)
      g.fillPoints([V(a.x, a.y), V(b.x, b.y), V(b.x, b.y - wallH), V(a.x, a.y - wallH)], true)
      g.fillStyle(stone, 1)
      g.fillPoints([V(a.x, a.y - wallH), V(b.x, b.y - wallH), V(b.x, b.y - wallH - 4), V(a.x, a.y - wallH - 4)], true)
      g.lineStyle(1, 0x8a6c47, 0.35); g.lineBetween(a.x, a.y - wallH * 0.5, b.x, b.y - wallH * 0.5)
      this.pieces.push(g)
    }
    const pillar = (p: { x: number; y: number }, front: boolean) => {
      const g = this.add.graphics().setDepth(front ? imgY + 0.12 : cy - hh - 0.9)
      g.fillStyle(Phaser.Display.Color.ValueToColor(stone).darken(14).color, 1); g.fillRect(p.x - 5, p.y - wallH - 14, 10, wallH + 14)
      g.fillStyle(stone, 1); g.fillRect(p.x - 6, p.y - wallH - 18, 12, 5)
      g.fillStyle(0xb3261e, 1); g.fillCircle(p.x, p.y - wallH - 20, 2.4)
      this.pieces.push(g)
    }
    const lerp = (a: { x: number; y: number }, b: { x: number; y: number }, t: number) => ({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t })
    // Avlu zemini: bakımlı çimen, kenarında koyu bordür; kapıdan binaya taş yol.
    const yard = this.add.graphics().setDepth(cy - hh - 2)
    yard.fillStyle(0x6f9447, 0.55); yard.fillPoints(ring.map(p => V(p.x, p.y)), true)
    yard.fillStyle(0x86ab58, 0.45); yard.fillPoints(ring.map(p => V(cx + (p.x - cx) * 0.9, cy + (p.y - cy) * 0.9)), true)
    const padEdge = { x: cx + (gate.x - cx) * 0.7, y: cy + (gate.y - cy) * 0.7 }
    yard.lineStyle(TILE.w * 0.2, 0xcdb88c, 1); yard.lineBetween(gate.x, gate.y, padEdge.x, padEdge.y)
    yard.lineStyle(TILE.w * 0.14, 0xe2d3ae, 1); yard.lineBetween(gate.x, gate.y, padEdge.x, padEdge.y)
    this.pieces.push(yard)
    segs.forEach(([a, b], i) => {
      const front = i === 1 || i === 2 // E→S ve S→W: izleyiciye bakan kenarlar
      if (i !== gateSeg.i) { piece(a, b, front); return }
      const t0 = Math.max(0.05, gateSeg.t - gapHalf), t1 = Math.min(0.95, gateSeg.t + gapHalf)
      piece(a, lerp(a, b, t0), front); piece(lerp(a, b, t1), b, front)
      pillar(lerp(a, b, t0), front); pillar(lerp(a, b, t1), front)
    })

    // Ağaçlar ve çiçekler (sprite: arazi dekoru dokuları).
    const tree = (key: string, x: number, y: number, w: number, tint?: number) => {
      if (!this.textures.exists(key)) return
      const img = this.add.image(x, y, key).setOrigin(0.5, 0.92).setDepth(y)
      const src = this.textures.get(key).getSourceImage() as HTMLImageElement
      img.setDisplaySize(w, w * src.height / src.width)
      if (tint !== undefined) img.setTint(tint)
      this.pieces.push(img)
    }
    const nearGate = (p: { x: number; y: number }) => Math.hypot(p.x - gate.x, p.y - gate.y) < TILE.w * 0.7
    const inside = (p: { x: number; y: number }, f: number) => ({ x: cx + (p.x - cx) * f, y: cy + (p.y - cy) * f })
    // Yan köşelerde (içeride) servi çifti, kapı o köşeye düşmüyorsa.
    for (const c of [W, E]) {
      if (nearGate(c)) continue
      const a = inside(c, 0.9), b = inside(c, 0.8)
      tree(rnd() < 0.5 ? 'd_cypress' : 'd_cypress-b', a.x, a.y - 4, TILE.w * 0.27)
      tree('d_cypress', b.x, b.y + 10, TILE.w * 0.23)
    }
    // Ön köşede çalı kümesi, arka köşede meyve (zeytin/nar) ağacı.
    if (!nearGate(S)) { const p = inside(S, 0.84); tree('d_bush', p.x - 14, p.y - 2, TILE.w * 0.26); tree('d_flower', p.x + 16, p.y + 2, TILE.w * 0.2) }
    if (!nearGate(N)) { const p = inside(N, 0.72); tree('d_olive-tree', p.x + (rnd() < 0.5 ? -1 : 1) * 30, p.y, TILE.w * 0.62, rnd() < 0.5 ? 0xd8ecc0 : undefined) }
    // Kapının iki yanında çiçek saksısı / çalı.
    for (const t of [-1, 1]) {
      const p = lerp(segs[gateSeg.i][0], segs[gateSeg.i][1], Math.min(0.97, Math.max(0.03, gateSeg.t + t * (gapHalf + 0.07))))
      tree(rnd() < 0.6 ? 'd_flower' : 'd_bush', p.x, p.y + 4, TILE.w * 0.2)
    }
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
    // Divanhane meydanın gösterişli merkezi: diğer binalardan büyük.
    const artS = this.artScale() * (slot.slotId === HALL_SLOT_ID ? 1.5 : 1)
    // Görselin zemin elması resmin altından ART_GROUND_PX yukarıda: elmas
    // arsanın (belediyede meydanın) tam ortasına düz oturur. Liman görselleri
    // rıhtıma göre çizildiği için eski temas noktasını kullanır.
    const imgY = slot.zone === 'liman' ? anc.baseY : slot.screen.y + ART_GROUND_PX * artS
    let dispW = TILE.w * 2, dispH = TILE.h * 2

    // Boş slot görünmez; yalnızca kurulu yapının altında doğal açıklık oluşur.
    this.addOccupiedClearing(id, slot, anc.baseY)
    if (slot.zone !== 'liman' && slot.slotId !== HALL_SLOT_ID) this.addGardenWall(slot, imgY, artS)

    // Çok hafif temas gölgesi: doğal açıklığın üstünde yapıyı zemine bağlar.
    // Güneş sol üstten: bina gölgesi sağ-alta düşer.
    const shadow = this.add.graphics().setDepth(anc.baseY - 0.3)
    if (slot.zone !== 'liman') {
      shadow.fillStyle(0x223018, 0.22)
      shadow.fillEllipse(anc.x + TILE.w * 0.28, anc.baseY - TILE.h * 0.62, GROUND_TARGET_W * 0.62, GROUND_TARGET_W * 0.2)
      shadow.fillStyle(0x223018, 0.14)
      shadow.fillEllipse(anc.x + TILE.w * 0.55, anc.baseY - TILE.h * 0.45, GROUND_TARGET_W * 0.5, GROUND_TARGET_W * 0.14)
    }
    this.pieces.push(shadow)

    // Ikariam: seviye 0 iken (ilk inşaat) temel + iskele; sonra seviye aşamasının görseli.
    const textureKey = level === 0 && this.textures.exists('b_site') ? 'b_site' : `${id}-${buildingStage(level)}`
    if (BUILDINGS[id].art && this.textures.exists(textureKey)) {
      const img = this.add.image(anc.x, imgY, textureKey).setOrigin(0.5, 1)
      const scale = artS
      img.setScale(scale).setDepth(imgY)
      img.setFlipX(this.state.flips.includes(id))
      dispW = img.width * scale; dispH = img.height * scale
      this.pieces.push(img)
      // Yükseltme sürerken binanın önünde ahşap iskele durur.
      if (active && level > 0 && this.textures.exists('b_scaffold')) {
        const sc = this.add.image(anc.x, imgY, 'b_scaffold').setOrigin(0.5, 1).setScale(scale).setDepth(imgY + 0.05)
        this.pieces.push(sc)
      }
    } else {
      // Görseli olmayan yapı: basit taş kaide (yalnızca yedek).
      const g = this.add.graphics().setDepth(anc.baseY)
      g.fillStyle(0xb9a877, 1); g.fillPoints(this.diamond(anc.x, anc.baseY - TILE.h * 0.5, GROUND_TARGET_W * 0.8, GROUND_TARGET_W * 0.4), true)
      this.pieces.push(g)
    }

    // Dokunuş: binaya dokun → panel aç.
    const hit = this.add.rectangle(anc.x, imgY - dispH * 0.4, dispW * 0.7, dispH * 0.6)
      .setInteractive({ useHandCursor: true }).setFillStyle(0xffffff, 0).setDepth(imgY + 0.2)
    hit.on('pointerup', (p: Phaser.Input.Pointer) => { if (isTap(p) && !this.moving) this.events$.onBuilding(id) })
    this.pieces.push(hit)

    // Normal şehir görünümünde UI bina sanatının üstüne binmez.
    // Seviye rozeti yalnızca etiketler açıldığında veya inşaat aktifken görünür.
    // Boyalı etiket: seviye dairesi + isim plakası (binanın alt yarısında, her şeyin üstünde).
    if (this.showLabels || active) {
      this.pieces.push(this.makePaintedLabel(anc.x, imgY - dispH * 0.30, level, BUILDINGS[id].name, 1e6 + imgY))
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
