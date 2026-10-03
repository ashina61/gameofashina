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
import { BakeAtlas } from '@/lib/game/city-map/bake'
import { FlagField, SmokeField, type FlagLook } from './city-life'
import { SkyLayer } from './city-sky'
import { TILE, CITY_SLOTS, COAST_SLOTS, HALL_SLOT_ID, ROAD_EXITS, WALL_GATES, PLAZA, slotById } from '@/lib/game/city-map'
import { LIVE_SLOTS, liveSlotByIndex, type LiveSlot } from '@/lib/game/city-map/live-adapter'
import { buildCityTerrain, preloadTerrain, cityWorldRect, cityContentRect, mineSite } from '@/lib/game/city-map/terrain-builder'
import { FOOTPRINT_DIAMOND_W, ART_DIAMOND_PX, visualProfile, type BuildingVisualProfile } from '@/lib/game/city-map/building-assets'
import { visualSignature } from '@/lib/game/city-render'
import { BUILDINGS, BUILDING_IDS, activeJob, plotOpen, zoneOf, type BuildingId, type Game } from '@/lib/game/engine'
import { asset, buildingArtKey, buildingImage } from '@/lib/asset'
import { PEACEFUL_CITY, siegeAppearanceKey, type SiegeAppearance } from '@/lib/game/siege-appearance'
import { CitySiegeLayer, preloadSiegeArt } from './city-siege'
import { cityArtSize, type Walker, type RoadEdge, type CityEvents, isTap } from './city/shared'
import { drawWalls, wallFront, scaffoldOn, drawWallSite } from './city/walls'
import { syncWalkers, drawCitizen, addBirds, addTroops, stepTroops, stepLife, drawSoldier, addLife, stepCaravan, stepBirds, stepWalkers } from './city/citizens'
import { addGardenWall, addOccupiedClearing, addBuildingProps, addPaintedYardProps, addBuilding, addEmptyPlot, drawBuildPad, drawBuildFlag, drawMoveFrame } from './city/buildings'
import { fxShip, fxSail, fxMarch, setRaidAlert, celebrateBuilding, dustBuilding, flashBuildingTap } from './city/effects'
import { headingFont, makePaintedLabel, makeLevelBadge, fitHudItem, makeTimer, paintTimer } from './city/labels'
export type { CityEvents } from './city/shared'

export class CityScene extends Phaser.Scene {
  /** Oyun durumu. `game` adı Phaser.Scene tarafından kullanılıyor. */
  state!: Game
  events$!: CityEvents
  built = false
  /** Divan seviyesi değişince yalnızca yol katmanı yenilenir. */
  terrainRoads: ReturnType<typeof buildCityTerrain> | null = null
  /** Bina/arsa/rozet parçaları — her redraw'da temizlenir (zemin dokunulmaz). */
  pieces: Phaser.GameObjects.GameObject[] = []
  pieceAtlas: BakeAtlas | null = null
  flagField: FlagField | null = null
  smoke: SmokeField | null = null
  /** Bulut gölgeleri, gün ışığı ve gece pencere ışıkları (city-sky.ts). */
  sky: SkyLayer | null = null
  walkers: Walker[] = []
  walkerKey = ''
  signature = ''
  showLabels = false
  placing = false
  moving: BuildingId | null = null
  movePlot: number | null = null
  /** Runtime'da istenen bina texture'ları; aynı dosyayı paralel iki kez istemeyiz. */
  loadingBuildingTextures = new Set<string>()
  siege: SiegeAppearance = PEACEFUL_CITY
  siegeLayer: CitySiegeLayer | null = null
  // Kamera (map-debug ile aynı davranış): CITY VIEW varsayılan, pinch + drag.
  minZoom = 0.15
  maxZoom = 1.3
  cityZoom = 0.92
  velocity = { x: 0, y: 0 }
  pinchStart: { distance: number; zoom: number } | null = null
  constructor() { super('city') }
  /** Oyuncunun sancağı: şehirdeki bütün bayraklar bununla çizilir. */
  look: FlagLook | null = null
  init(data: { game: Game; events: CityEvents; look?: FlagLook; siege?: SiegeAppearance }) {
    this.state = data.game
    this.events$ = data.events
    this.look = data.look ?? null
    this.siege = data.siege ?? PEACEFUL_CITY
  }
  sceneBanner(): FlagLook {
    return this.siege.occupation
      ? { color: this.siege.occupation.color, shape: 'cifte', crest: 'kilic' }
      : this.look ?? { color: 0xb3261e, shape: 'kirlangic', crest: 'hilal' }
  }
  setBanner(look: FlagLook) {
    const changed = this.look?.color !== look.color
    this.look = look
    this.flagField?.setLook(this.sceneBanner())
    // Yüksek surlardaki asılı flamalar dokuya pişirilir: renk değişince yeniden çizilir.
    if (changed && this.state && this.state.buildings.surlar >= 8 && this.pieces.length) this.redraw()
  }
  preload() {
    preloadSiegeArt(this)
    // Eskiden 38 bina × 3 stage = 114 WebP açılışta yükleniyordu. Şehir sahnesi
    // yalnızca gerçekten kurulu binaların MEVCUT stage'ini preload eder; yeni
    // bina/stage gerektiğinde ensureBuildingTexture() onu runtime'da getirir.
    for (const id of BUILDING_IDS) {
      const level = this.state.buildings[id]
      if (!BUILDINGS[id].art || level <= 0 || id === 'surlar') continue
      const facing = id === 'liman' || id === 'tersane' ? this.state.coastFacing[id] : undefined
      const key = buildingArtKey(id, level, facing)
      if (!this.textures.exists(key)) this.load.image(key, buildingImage(id, level, facing, cityArtSize()))
    }
    if (!this.textures.exists('b_site')) this.load.image('b_site', asset('/images/game/buildings/site.webp'))
    for (const lux of ['uzum', 'mermer', 'kristal', 'kukurt']) {
      if (!this.textures.exists('mine-' + lux)) this.load.image('mine-' + lux, asset(`/images/game/buildings/mine-${lux}.webp`))
    }
    // İnşaat iskelesi (tools/art/buildings.py).
    if (!this.textures.exists('b_scaffold')) this.load.image('b_scaffold', asset('/images/game/buildings/scaffold.webp'))
    preloadTerrain(this)
    if (!this.textures.exists('w_tower')) this.load.svg('w_tower', asset('/images/game/walls/tower-round.svg'))
  }
  /**
   * Yeni bina kurulduğunda veya seviye 4/8 eşiğinde sanat stage'i değiştiğinde
   * sadece gereken WebP'yi getir. Yükleme bitince görünür imzayı sıfırlayıp
   * sahneyi yeniden çiziyoruz; save/oyun mekaniği beklemez.
   */
  ensureBuildingTexture(id: BuildingId, level: number) {
    if (!BUILDINGS[id].art || level <= 0 || id === 'surlar') return
    const facing = id === 'liman' || id === 'tersane' ? this.state.coastFacing[id] : undefined
    const key = buildingArtKey(id, level, facing)
    if (this.textures.exists(key) || this.loadingBuildingTextures.has(key)) return
    this.loadingBuildingTextures.add(key)
    this.load.image(key, buildingImage(id, level, facing, cityArtSize()))
    this.load.once(`filecomplete-image-${key}`, () => {
      this.loadingBuildingTextures.delete(key)
      if (!this.built) return
      this.signature = ''
      this.redraw()
    })
    if (!this.load.isLoading()) this.load.start()
  }
  create() {
    this.cameras.main.setBackgroundColor('#12333b')
    this.flagField = new FlagField(this)
    this.flagField.setLook(this.sceneBanner())
    this.smoke = new SmokeField(this)
    this.terrainRoads = buildCityTerrain(this, this.state.buildings.divan, this.openSlotIds(this.state)) // dünya + büyüyen sokak ağı
    this.terrainRoads.setBlockaded(!!this.siege.blockade)
    for (const f of this.terrainRoads.flags) this.flagField.add(f, 'static', f.minLevel)
    this.applyDevelopment()
    this.built = true
    this.syncWalkers()
    this.addBirds()
    this.sky = new SkyLayer(this, cityWorldRect())
    // Meydanın çevresinde ve kapı yollarında sokak fenerleri (V2 Faz 4.5).
    if (this.sky) {
      for (let i = 0; i < 8; i++) {
        const ang = (i / 8) * Math.PI * 2 + Math.PI / 8
        const lx = PLAZA.screen.x + Math.cos(ang) * PLAZA.rx * 1.12, ly = PLAZA.screen.y + Math.sin(ang) * PLAZA.ry * 1.12
        this.sky.addLantern(lx, ly, ly + 1, 'static', 1.25)
      }
      for (const gate of WALL_GATES.filter(g => g.kind === 'land')) {
        for (const k of [0.32, 0.62]) {
          const lx = PLAZA.screen.x + (gate.screen.x - PLAZA.screen.x) * k + TILE.w * 0.28, ly = PLAZA.screen.y + (gate.screen.y - PLAZA.screen.y) * k
          this.sky.addLantern(lx, ly, ly + 1, 'static', 1.15)
        }
      }
    }
    this.drawMine()
    this.setupCamera()
    this.installCamera()
    this.redraw()
    this.events.once('shutdown', () => { this.siegeLayer?.destroy(); this.siegeLayer = null; delete document.documentElement.dataset.cityReady })
    this.events$.onReady?.()
  }
  /* ------------------------------------------------------------------ KAMERA */

  worldRect() { return cityWorldRect() }
  /*
   * HUD PAYLARI (ekran yüksekliğinin oranı). Arayüz tuvalin ÜSTÜNDE yüzer:
   * üstte başlık + oyuncu kartı + kaynak şeridi, altta günlük + menü. Kasaba
   * bu ikisinin arasındaki AÇIK BANTTA ortalanır; aksi halde tam ortalanan
   * şehrin üstü kaynak şeridinin, limanı menünün arkasında kalır.
   */
  framedDivan = -1
  static readonly HUD_TOP = 0.13
  static readonly HUD_BOTTOM = 0.15
  /**
   * KASABA kutusu: açık city slotları, bina silüetlerinin taşmasıyla. Ikariam'daki
   * gibi varsayılan görünüm bütün şehri tek ekranda gösterir; liman hemen
   * altta görünür, çapa düğmesi (focusHarbour) ona yakınlaşır.
   */
  townRect() {
    // Yalnızca AÇIK arsalar: şehir büyüdükçe kadraj da genişler (Ikariam gibi).
    const open = new Set(this.openSlotIds(this.state))
    const openCity = CITY_SLOTS.filter(s => open.has(s.id))
    const box = (slots: typeof CITY_SLOTS) => {
      const xs = slots.map(s => s.screen.x), ys = slots.map(s => s.screen.y)
      const padX = FOOTPRINT_DIAMOND_W * 0.54
      const padTop = TILE.h * 4.4 // çatı/kubbe için pay; dağ manzarasını kadraja zorlamaz
      const padBottom = TILE.h * 2.8 // alt bantta kıyı/liman yönü nefes alsın
      const x = Math.min(...xs) - padX, y = Math.min(...ys) - padTop
      return { x, y, w: Math.max(...xs) + padX - x, h: Math.max(...ys) + padBottom - y }
    }
    const full = box(CITY_SLOTS)
    if (openCity.length < 3) return full
    // Kasaba büyüdükçe kadraj genişler; erken oyunda bütün boş slot alanını
    // göstermek yerine yaşayan merkez baskın kalır.
    const t = box(openCity)
    const w = Math.max(t.w, full.w * 0.82), h = Math.max(t.h, full.h * 0.66)
    return { x: t.x + t.w / 2 - w / 2, y: t.y + t.h / 2 - h / 2, w, h }
  }
  /** Dünyayı KAPLAYAN en uzak zoom: dünyanın dışındaki boşluk hiç görünmez. */
  coverZoom() {
    const wr = this.worldRect()
    return Math.max(this.scale.width / wr.w, this.scale.height / wr.h)
  }
  /** Kasabayı HUD'un açık bıraktığı banda sığdıran zoom. */
  townZoom() {
    const t = this.townRect()
    const bandH = this.scale.height * (1 - CityScene.HUD_TOP - CityScene.HUD_BOTTOM)
    // Dikey mobil kompozisyon: şehir ekranda baskın, ama çatı ve alt kıyı
    // ipuçları görünür. Kenarlar bilinçli olarak hafifçe ekran dışına taşabilir.
    return Math.min(this.scale.width / (t.w * 0.78), bandH / (t.h * 0.80))
  }
  /** Bir dünya noktasını açık bandın ortasına getirir (HUD'a göre kaydırılmış). */
  centerInBand(x: number, y: number) {
    const cam = this.cameras.main
    const bandMid = (CityScene.HUD_TOP + (1 - CityScene.HUD_BOTTOM)) / 2 // 0..1
    const shift = (bandMid - 0.5) * this.scale.height / cam.zoom
    cam.centerOn(x, y - shift)
  }
  setupCamera() {
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
    // Belediye görsel odağıdır; kamera bir miktar güneye kayar ki alt tarafta
    // kıyı/liman yönü hissedilsin, fakat şehir merkezi HUD altında ezilmesin.
    const focusY = Phaser.Math.Clamp(hall.screen.y + TILE.h * 1.15, t.y + t.h * 0.42, t.y + t.h * 0.58)
    this.centerInBand(hall.screen.x, focusY)
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
    const hasShipyard = shipyard?.zone === 'liman'
    const hasHarbour = harbour?.zone === 'liman'
    // İkisi de kuruluysa "donanma ve liman" düğmesi tek yapıya değil bütün
    // kıyı kompleksine bakar. Mobilde yalnız Tersane'ye aşırı zoom yapmak
    // Ticaret Limanı'nı kadraj dışına atıyordu.
    const destination = hasShipyard && hasHarbour
      ? {
          x: (shipyard.screen.x + harbour.screen.x) / 2,
          y: (shipyard.screen.y + harbour.screen.y) / 2,
        }
      : hasShipyard
        ? shipyard.screen
        : hasHarbour
          ? harbour.screen
          : COAST_SLOTS[Math.floor(COAST_SLOTS.length / 2)].screen
    // İki kıyı yapısını boyalı sprite'ların tam genişliğiyle kadraja al.
    // Eski 210px zemin elması hesabı yeni iskele/kızakların uçlarını kesiyordu.
    const bothCoast = hasShipyard && hasHarbour
    const coastSpriteW = 600 * this.artScale()
      * Math.max(visualProfile('liman').scale, visualProfile('tersane').scale) * 1.08
    const pairWorldW = bothCoast
      ? Math.abs(shipyard.screen.x - harbour.screen.x) + coastSpriteW
      : 0
    const pairFitZoom = bothCoast
      ? (this.scale.width * 0.94) / Math.max(1, pairWorldW)
      : Infinity
    const zoom = this.siege.blockade
      ? Math.max(this.minZoom, this.scale.width * 0.88 / 1420)
      : bothCoast
      ? Math.max(this.minZoom, pairFitZoom)
      : Math.max(this.cityZoom * 1.55, 0.66)
    this.cameras.main.setZoom(Phaser.Math.Clamp(zoom, this.minZoom, this.maxZoom))
    this.centerInBand(this.siege.blockade ? COAST_SLOTS[1].screen.x : destination.x,
      this.siege.blockade ? COAST_SLOTS[1].screen.y + 220 : destination.y - TILE.h * (bothCoast ? 0.18 : 0.45))
    this.velocity = { x: 0, y: 0 }
  }
  fxShip(sail: number, flag: number, size = 1) { return fxShip(this, sail, flag, size) }
  fxSail() { return fxSail(this) }
  fxMarch() { return fxMarch(this) }
  /** Baskın geliyor: ufukta al yelkenli düşman gemileri ve meydanda nöbetçiler. */
  raid: Phaser.GameObjects.Graphics[] = []
  raidWanted = false
  setRaidAlert(on: boolean) { return setRaidAlert(this, on) }
  /** React kontrolü: yakınlaştırmayı çarpanla değiştir. */
  zoomBy(factor: number) {
    if (!this.built) return
    const cam = this.cameras.main
    cam.setZoom(Phaser.Math.Clamp(cam.zoom * factor, this.minZoom, this.maxZoom))
  }
  pointerGap() {
    const a = this.input.pointer1, b = this.input.pointer2
    return a && b ? Phaser.Math.Distance.Between(a.x, a.y, b.x, b.y) : 0
  }
  installCamera() {
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
    this.stepCaravan(Math.min(delta, 100) / 1000)
    this.stepTroops(Math.min(delta, 100) / 1000)
    this.flagField?.update(Math.min(delta, 100) / 1000)
    this.smoke?.update(Math.min(delta, 100) / 1000)
    this.sky?.update(Math.min(delta, 100) / 1000)
    this.siegeLayer?.update(Math.min(delta, 100) / 1000)
    this.stepLife(Math.min(delta, 100) / 1000)
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
  anchor(slot: LiveSlot) {
    return { x: slot.screen.x, baseY: slot.screen.y + (slot.fh / 2) * TILE.h }
  }
  /**
   * Bütün bina sanatının ortak 2x2 taban ölçeği. Bunun üstündeki küçük farklar
   * footprint'i değiştirmez; yalnızca silüet sınıfını dengeler.
   */
  artScale() { return (FOOTPRINT_DIAMOND_W / ART_DIAMOND_PX) * 1.8 }
  /** Merkezi profil tablosu: ölçek/tint/avlu/prop dili tek yerden gelir. */
  buildingVisualProfile(id: BuildingId, slot: LiveSlot): BuildingVisualProfile {
    const base = visualProfile(id)
    if (slot.slotId === HALL_SLOT_ID) return { ...base, scale: 1.36 }
    return base
  }
  /** Bina + slot kimliğinden deterministik görsel tohum; save verisine ek alan gerekmez. */
  buildingVisualSeed(id: BuildingId, slot: LiveSlot) {
    let seed = Math.imul(slot.index + 17, 0x9e3779b1)
    for (let i = 0; i < id.length; i++) seed = Math.imul(seed ^ id.charCodeAt(i), 0x85ebca6b)
    return seed >>> 0
  }
  /** Aynı bina her redraw/save-load sonrasında aynı mikro-varyasyonu korur. */
  visualRnd(seed0: number) {
    let seed = seed0 | 0
    return () => {
      seed = (seed + 0x6d2b79f5) | 0
      let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296
    }
  }
  /** Aynı yapı tipleri aynı ölçüde damga gibi durmasın; footprint değişmez. */
  buildingMicroScale(id: BuildingId, slot: LiveSlot, profile: BuildingVisualProfile) {
    if (profile.variation <= 0) return 1
    const rnd = this.visualRnd(this.buildingVisualSeed(id, slot) ^ 0x6f13a9d5)
    return 1 + (rnd() * 2 - 1) * profile.variation
  }
  occupiedSlotIds(game: Game, moving: BuildingId | null = null, movePlot: number | null = null) {
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
  openSlotIds(game: Game, moving: BuildingId | null = null, movePlot: number | null = null) {
    const ids = new Set(this.occupiedSlotIds(game, moving, movePlot))
    for (const s of LIVE_SLOTS) if (plotOpen(game, s.index)) ids.add(s.slotId)
    for (const id of ROAD_EXITS) ids.add(id) // kapılardan çıkan caddeler hep açık
    return [...ids]
  }
  /** React tarafından çağrılır; yalnızca GÖRÜNEN bir şey değiştiyse çizer. */
  sync(game: Game, showLabels: boolean, placing: boolean, moving: BuildingId | null = null, movePlot: number | null = null, siege: SiegeAppearance = PEACEFUL_CITY) {
    // Aktif oturumda tamamlanan bina/yükseltmeyi yakala. İlk hydrate'ta kutlama
    // oynatılmaz; yalnızca önceki sahne durumuna göre seviye gerçekten artmışsa.
    const completed = this.built
      ? BUILDING_IDS.filter(id => game.buildings[id] > this.state.buildings[id])
      : []
    // V2 Faz 3.1 / 3.7: yeni başlayan inşaat (toz bulutu) ve biten araştırma (Medrese'de ışık).
    const started = this.built
      ? game.queue.filter(j => j.kind === 'build' && !this.state.queue.some(p => p.id === j.id && p.start === j.start)).map(j => j.id as BuildingId)
      : []
    const learned = this.built && game.research.length > this.state.research.length
    const siegeChanged = siegeAppearanceKey(this.siege) !== siegeAppearanceKey(siege)
    this.state = game
    this.siege = siege
    if (!this.built) return
    if (siegeChanged) {
      this.flagField?.setLook(this.sceneBanner())
      this.terrainRoads?.setBlockaded(!!siege.blockade)
    }
    if (game.buildings.divan !== this.framedDivan) { // yeni arsalar açıldı: "şehir" kadrajı büyür
      this.framedDivan = game.buildings.divan
      this.cityZoom = Math.max(this.townZoom(), this.minZoom)
      this.applyDevelopment()
    }
    this.terrainRoads?.updateRoads(game.buildings.divan, this.openSlotIds(game, moving, movePlot))
    this.syncWalkers()
    if (this.raidWanted && !this.raid.length) this.setRaidAlert(true)
    if (started.length) this.time.delayedCall(60, () => started.slice(0, 2).forEach(id => this.dustBuilding(id)))
    if (learned && game.buildings.medrese > 0) this.time.delayedCall(60, () => this.celebrateBuilding('medrese', 0, 0x9fd3ff))
    const next = `${visualSignature(game)}|${showLabels}|${placing}|${moving ?? '-'}|${movePlot ?? '-'}|${siegeAppearanceKey(siege)}`
    if (next === this.signature) return
    this.showLabels = showLabels
    this.placing = placing
    this.moving = moving
    this.movePlot = movePlot
    this.redraw()
    // Redraw yeni bina sprite'ını yerine koyduktan hemen sonra kısa dünya-içi kutlama.
    if (completed.length) this.time.delayedCall(35, () => completed.slice(0, 3).forEach((id, i) => this.celebrateBuilding(id, i * 90)))
  }
  /** Şehir Divanhane ile kademeli gelişir: süsler ve sancaklar seviyeye göre açılır. */
  applyDevelopment() {
    const lv = this.state.buildings.divan
    this.terrainRoads?.setDevelopment(lv)
    this.flagField?.setLevel(lv)
  }
  /** Taşıma kipinde bir binanın oturabileceği arsalar (boş + kendi arsası). */
  eligibleMovePlots(): Set<number> {
    const set = new Set<number>()
    if (!this.moving) return set
    const targetZone = zoneOf(this.moving)
    const others = new Set(BUILDING_IDS.filter(b => b !== this.moving).map(b => this.state.placement[b]).filter((p): p is number => p !== null))
    for (const s of LIVE_SLOTS) if (s.zone === targetZone && !others.has(s.index) && plotOpen(this.state, s.index)) set.add(s.index)
    return set
  }
  updateMoveTarget(p: Phaser.Input.Pointer) {
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
  redraw() {
    this.signature = `${visualSignature(this.state)}|${this.showLabels}|${this.placing}|${this.moving ?? '-'}|${this.movePlot ?? '-'}|${siegeAppearanceKey(this.siege)}`
    this.siegeLayer?.destroy()
    this.siegeLayer = new CitySiegeLayer(this, this.siege)
    for (const piece of this.pieces) piece.destroy()
    this.pieces = []
    this.pieceAtlas?.destroy()
    this.pieceAtlas = null
    this.flagField?.removeGroup('pieces')
    this.smoke?.removeGroup('pieces')
    this.sky?.removeGroup('pieces')
    for (const o of this.lifeObjs) o.g.destroy()
    this.lifeObjs = []

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
    // Sur yokken aynı halkada kazılmış temel hendeği görünür; dokununca Surlar açılır.
    this.drawWalls(this.state.buildings.surlar)
    // Ağır sabit parçalar (sur, avlu, kule sancakları) dokuya pişirilir: her
    // karede yeniden üçgenlenmezler.
    this.addLife()
    // Alaylar: kışla kurulunca ikinci yeniçeri devriyesi katılır.
    const troopKey = `${this.state.buildings.kisla > 0}|${Math.min(5, this.state.buildings.divan)}|${siegeAppearanceKey(this.siege)}`
    if (troopKey !== this.troopKey) { this.troopKey = troopKey; this.addTroops() }
    const atlas = new BakeAtlas(this, 'pieces-atlas')
    this.pieces = this.pieces.flatMap(p => (p instanceof Phaser.GameObjects.Graphics && !this.tweens.isTweening(p) ? atlas.bake(p) : [p]))
    atlas.finish()
    this.pieceAtlas = atlas
    this.markReady()
  }
  /**
   * HAZIR SİNYALİ: bütün bina dokuları inmiş ve sahne bir kez çizilmişse
   * <html data-city-ready="n"> artar. QA sabit süre beklemek yerine bunu bekler.
   */
  readyCount = 0
  markReady() {
    if (!this.built || this.load.isLoading() || this.loadingBuildingTextures.size) return
    this.game.events.once(Phaser.Core.Events.POST_RENDER, () => {
      if (typeof document !== 'undefined') document.documentElement.dataset.cityReady = String(++this.readyCount)
    })
  }
  drawWalls(level: number) { return drawWalls(this, level) }
  wallFront(ring: Array<{ x: number; y: number }>) { return wallFront(this, ring) }
  scaffoldOn(f0: { x: number; y: number }, f1: { x: number; y: number }, h: number, depth: number) { return scaffoldOn(this, f0, f1, h, depth) }
  drawWallSite(ring: Array<{ x: number; y: number }>) { return drawWallSite(this, ring) }
  syncWalkers() { return syncWalkers(this) }
  roadEdges: RoadEdge[] = []
  mineSprite: Phaser.GameObjects.Image | null = null
  /** Adanın lüks kaynak madeni (bağ, mermer ocağı, kristal mağarası, kükürt çukuru). */
  drawMine() {
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
  drawCitizen(g: Phaser.GameObjects.Graphics, rnd: () => number) { return drawCitizen(this, g, rnd) }
  /*
   * KUŞLAR: meydanda şadırvan çevresinde yem toplayan güvercinler (arada bir
   * sürü halinde havalanıp döner, yeniden konar) ve limanın üstünde süzülen
   * martılar.
   */
  birds: Array<{ g: Phaser.GameObjects.Graphics; kind: 'pigeon' | 'gull' | 'sheep' | 'boat' | 'ripple' | 'duck' | 'wheel'; minLv?: number; hx: number; hy: number; x: number; y: number; ph: number; r: number; sp: number }> = []
  flockClock = 0
  addBirds() { return addBirds(this) }
  streamPath: Array<{ x: number; y: number }> | null = null
  streamLen = 1
  caravan: Phaser.GameObjects.Graphics[] = []
  caravanPath: Phaser.Curves.Path | null = null
  caravanLen = 0
  caravanT = 0
  /*
   * ASKER VE ALAY: yeniçeri devriyeleri (bayraktar önde, tüfekli neferler iki
   * sıra), meydanı dönen mehter takımı (tuğ, kös, zurna), doğu-batı caddesinde
   * mızraklı sipahiler. Hepsi caddeler ve meydan çevresi boyunca yürür.
   */
  troopKey = ''
  troops: Array<{
    members: Array<{ g: Phaser.GameObjects.Graphics; along: number; side: number }>
    pts: Array<{ x: number; y: number }>; len: number; t: number; dir: 1 | -1; speed: number; loop: boolean; bob: number
  }> = []
  addTroops() { return addTroops(this) }
  stepTroops(dt: number) { return stepTroops(this, dt) }
  /*
   * CANLI SAHNELER (her yeniden çizimde binaların yerine göre kurulur):
   *  - Kışla avlusunda talim: iki sıra yeniçeri çavuşun karşısında ileri
   *    yürür, durur, tüfek selamı verir, geri döner.
   *  - İnşaat süren binanın önünde çekiç sallayan ustalar.
   *  - Meydanda şadırvanın çevresinde koşuşan çocuklar.
   *  - Caminin avlusunda yem toplayan güvercinler.
   *  - Hamam, tophane, simyahane, camcı ve saray mutfağı bacalarından duman.
   */
  lifeObjs: Array<{ g: Phaser.GameObjects.Graphics; update: (t: number) => void }> = []
  lifeClock = 0
  stepLife(dt: number) { return stepLife(this, dt) }
  /** Bina görselindeki bir noktayı (sanat birimi: 0..2 taban, z yükseklik) dünyaya çevirir. */
  artPoint(slot: LiveSlot, ax: number, ay: number, az = 0, hall = false) {
    const k = this.artScale() * (hall ? visualProfile('divan').scale : 1)
    return { x: slot.screen.x + (ax - ay) * 120 * k, y: slot.screen.y + ((ax + ay - 2) * 60 - az * 128) * k }
  }
  slotOfBuilding(id: BuildingId) {
    const at = this.state.placement[id]
    return at === null || at === undefined || !this.state.buildings[id] ? null : liveSlotByIndex(at) ?? null
  }
  drawSoldier(g: Phaser.GameObjects.Graphics, s: number, coat = 0x24406e) { return drawSoldier(this, g, s, coat) }
  addLife() { return addLife(this) }
  stepCaravan(dt: number) { return stepCaravan(this, dt) }
  stepBirds(dt: number) { return stepBirds(this, dt) }
  stepWalkers(dt: number) { return stepWalkers(this, dt) }
  diamond(cx: number, cy: number, w: number, h: number) {
    return [new Phaser.Math.Vector2(cx, cy - h / 2), new Phaser.Math.Vector2(cx + w / 2, cy),
      new Phaser.Math.Vector2(cx, cy + h / 2), new Phaser.Math.Vector2(cx - w / 2, cy)]
  }
  addGardenWall(slot: LiveSlot, imgY: number, artS: number, id: BuildingId) { return addGardenWall(this, slot, imgY, artS, id) }
  addOccupiedClearing(id: BuildingId, slot: LiveSlot, depth: number) { return addOccupiedClearing(this, id, slot, depth) }
  addBuildingProps(id: BuildingId, slot: LiveSlot, level: number, imgY: number) { return addBuildingProps(this, id, slot, level, imgY) }
  addPaintedYardProps(id: BuildingId, slot: LiveSlot, level: number, imgY: number) { return addPaintedYardProps(this, id, slot, level, imgY) }
  celebrateBuilding(id: BuildingId, delay = 0, tint = 0xf2d37d) { return celebrateBuilding(this, id, delay, tint) }
  dustBuilding(id: BuildingId) { return dustBuilding(this, id) }
  flashBuildingTap(x: number, y: number, radius: number, depth: number) { return flashBuildingTap(this, x, y, radius, depth) }
  addBuilding(id: BuildingId, slot: LiveSlot, active: boolean) { return addBuilding(this, id, slot, active) }
  headingFont() { return headingFont(this) }
  fontCache: { heading: string; body: string } | null = null
  /** Binanın seviye etiketi: seviye atlayınca madalyon büyüyüp küçülür (V2 Faz 3.3). */
  labelOf = new Map<BuildingId, Phaser.GameObjects.Container>()
  makePaintedLabel(x: number, y: number, level: number, name: string, depth: number) { return makePaintedLabel(this, x, y, level, name, depth) }
  makeLevelBadge(x: number, y: number, level: number, depth: number) { return makeLevelBadge(this, x, y, level, depth) }
  /*
   * Etiket ve sayaçlar EKRANDA sabit boyda kalır (Ikariam'daki gibi): uzak
   * görünümde okunur, yakında binayı örtmez. Tuval cihaz pikselindedir
   * (city-canvas: zoom 1/dpr), yani ekranda 1 CSS pikseli = dpr / kamera zoom'u
   * dünya birimi.
   */
  hudItems: { c: Phaser.GameObjects.Container; width: number; height: number; css: number; max?: number }[] = []
  fitHudItem(h: { c: Phaser.GameObjects.Container; width: number; height: number; css: number; max?: number }) { return fitHudItem(this, h) }
  makeTimer(x: number, y: number, start: number, end: number, depth: number) { return makeTimer(this, x, y, start, end, depth) }
  lastHudZoom = 0
  timers: { bar: Phaser.GameObjects.Graphics; text: Phaser.GameObjects.Text; start: number; end: number }[] = []
  paintTimer(t: { bar: Phaser.GameObjects.Graphics; text: Phaser.GameObjects.Text; start: number; end: number }) { return paintTimer(this, t) }
  addEmptyPlot(slot: LiveSlot) { return addEmptyPlot(this, slot) }
  drawBuildPad(slot: LiveSlot) { return drawBuildPad(this, slot) }
  drawBuildFlag(x: number, cy: number, sea = false) { return drawBuildFlag(this, x, cy, sea) }
  drawMoveFrame(slot: LiveSlot) { return drawMoveFrame(this, slot) }
}
