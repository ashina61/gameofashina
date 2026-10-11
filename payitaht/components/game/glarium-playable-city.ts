import * as Phaser from 'phaser'
import { asset, buildingArtKey, buildingImage } from '@/lib/asset'
import { BUILDINGS, BUILDING_IDS, plotFits, plotOpen, type BuildingId, type Game } from '@/lib/game/engine'
import { visualSignature } from '@/lib/game/city-render'
import { GLARIUM_GROWTH_STAGES, glariumGrowthForLevel } from '@/lib/game/glarium-city-growth'
import { fiveStageBuildingArt } from '@/lib/game/building-art-growth'
import { PAINTED_PLOTS, PAINTED_CITY_SIZE } from '@/lib/game/glarium-playable-layout'
import { PEACEFUL_CITY, siegeAppearanceKey, type SiegeAppearance } from '@/lib/game/siege-appearance'
import { liteMode } from '@/lib/motion'
import type { FlagLook } from './city-life'
import { isTap, type CityEvents } from './city/shared'
import { SkyLayer } from './city-sky'

type Plot = typeof PAINTED_PLOTS[number]
/** Approved painting + real game buildings. Only the presentation changes. */
export class CityScene extends Phaser.Scene {
  state!: Game
  events$!: CityEvents
  private built = false
  private map?: Phaser.GameObjects.Image
  private sky?: SkyLayer
  private pieces: Phaser.GameObjects.GameObject[] = []
  private signature = ''
  private labels = false
  private placing = false
  private moving: BuildingId | null = null
  private movePlot: number | null = null
  private siege = PEACEFUL_CITY
  private look: FlagLook = { color: 0xb3261e, shape: 'kirlangic', crest: 'hilal' }
  private raid = false
  private pending = new Set<string>()
  private readyCount = 0
  private minZoom = .1
  private drag: { x: number; y: number; sx: number; sy: number } | null = null
  private pinch: { distance: number; zoom: number; x: number; y: number } | null = null
  constructor() { super('city') }

  init(data: { game: Game; events: CityEvents; look?: FlagLook; siege?: SiegeAppearance }) {
    this.state = data.game
    this.events$ = data.events
    this.look = data.look ?? this.look
    this.siege = data.siege ?? PEACEFUL_CITY
  }
  private art(id: BuildingId) {
    const level = this.state.buildings[id]
    const facing = id === 'liman' || id === 'tersane' ? this.state.coastFacing[id] : undefined
    return { key: buildingArtKey(id, level, facing), url: buildingImage(id, level, facing, 'sm') }
  }
  preload() {
    for (const stage of GLARIUM_GROWTH_STAGES) {
      this.load.image(stage.texture, asset(`/images/prototype/glarium-growth/hall-${String(stage.level).padStart(2, '0')}.webp`))
    }
    this.load.image('painted-site', asset('/images/game/buildings/site.webp'))
    this.load.image('painted-sea', asset('/images/game/terrain/water-deep.webp'))
    for (const id of BUILDING_IDS) {
      if (id === 'divan' || id === 'surlar' || !BUILDINGS[id].art || this.state.buildings[id] <= 0) continue
      const art = this.art(id)
      if (!this.textures.exists(art.key)) this.load.image(art.key, art.url)
    }
    const lux = this.state.mine.specialty
    this.load.image('painted-mine', asset(`/images/game/buildings/mine-${lux}.webp`))
  }
  create() {
    const stage = glariumGrowthForLevel(this.state.buildings.divan)
    this.add.tileSprite(0, -700, PAINTED_CITY_SIZE.width, 3170, 'painted-sea').setOrigin(0).setDepth(-1001)
    this.map = this.add.image(0, 0, stage.texture).setOrigin(0).setDisplaySize(PAINTED_CITY_SIZE.width, PAINTED_CITY_SIZE.height).setDepth(-1000)
    this.cameras.main.setBackgroundColor('#173e41').setBounds(0, -700, PAINTED_CITY_SIZE.width, 3170)
    this.resizeView()
    this.recenter()
    this.installInput()
    this.sky = new SkyLayer(this, { x: 0, y: 0, w: PAINTED_CITY_SIZE.width, h: PAINTED_CITY_SIZE.height })
    this.scale.on('resize', this.resizeView, this)
    this.load.on('complete', () => { if (this.built) { this.redraw(); this.markReady() } })
    const clear = () => {
      this.built = false
      this.scale.off('resize', this.resizeView, this)
      delete document.documentElement.dataset.cityReady
      delete document.documentElement.dataset.paintedCity
      delete document.documentElement.dataset.paintedCamera
      const target = Phaser.GameObjects.Graphics.TargetCamera
      if (target.scene === this) {
        target.destroy()
        Object.assign(Phaser.GameObjects.Graphics, { TargetCamera: new Phaser.Cameras.Scene2D.BaseCamera(0, 0, 0, 0) })
      }
    }
    this.events.once('shutdown', clear)
    this.events.once('destroy', clear)
    this.built = true
    this.redraw()
    this.events$.onReady?.()
  }
  sync(game: Game, labels: boolean, placing: boolean, moving: BuildingId | null = null, movePlot: number | null = null, siege: SiegeAppearance = PEACEFUL_CITY) {
    this.state = game
    this.labels = labels
    this.placing = placing
    this.moving = moving
    this.movePlot = movePlot
    this.siege = siege
    if (!this.built) return
    const next = `${visualSignature(game)}|${labels}|${placing}|${moving}|${movePlot}|${siegeAppearanceKey(siege)}`
    if (next === this.signature) return
    this.signature = next
    this.redraw()
  }
  setBanner(look: FlagLook) { this.look = look; if (this.built) this.redraw() }
  setRaidAlert(raid: boolean) { if (this.raid === raid) return; this.raid = raid; if (this.built) this.redraw() }
  private occupy() {
    const occupied = new Map<number, BuildingId>()
    for (const id of BUILDING_IDS) {
      const at = id === this.moving && this.movePlot !== null ? this.movePlot : this.state.placement[id]
      if (at != null) occupied.set(at, id)
    }
    return occupied
  }
  private eligible(index: number) {
    if (!this.moving || this.moving === 'divan' || !plotFits(index, this.moving) || !plotOpen(this.state, index)) return false
    return !BUILDING_IDS.some(id => id !== this.moving && this.state.placement[id] === index)
  }
  private requestArt(id: BuildingId) {
    const art = this.art(id)
    if (this.textures.exists(art.key) || this.pending.has(art.key)) return art.key
    this.pending.add(art.key)
    this.load.image(art.key, art.url)
    this.load.once(`filecomplete-image-${art.key}`, () => this.pending.delete(art.key))
    this.load.once(`loaderror`, (file: Phaser.Loader.File) => {
      if (file.key === art.key) this.pending.delete(art.key)
    })
    if (!this.load.isLoading()) this.load.start()
    return art.key
  }
  private keep<T extends Phaser.GameObjects.GameObject>(object: T): T { this.pieces.push(object); return object }
  /** Downsample large art once with Canvas2D before GPU minification.
   * A single bilinear WebGL sample across ten source pixels creates shimmer.
   */
  private renderTexture(key: string, width: number) {
    const renderKey = `city-thumbnail-${key}-${width}`
    if (this.textures.exists(renderKey)) return renderKey
    const source = this.textures.get(key).getSourceImage() as HTMLImageElement | HTMLCanvasElement
    const w = Math.ceil(width * 2)
    const h = Math.ceil(source.height / source.width * w)
    const texture = this.textures.createCanvas(renderKey, w, h)
    if (!texture) return key
    const context = texture.getContext()
    context.imageSmoothingEnabled = true
    context.imageSmoothingQuality = 'high'
    context.drawImage(source, 0, 0, w, h)
    texture.refresh()
    return renderKey
  }
  private label(x: number, y: number, text: string) {
    this.keep(this.add.text(x, y, text, { fontFamily: 'Georgia, serif', fontSize: '14px', color: '#fff1cc', backgroundColor: '#392416ee', padding: { x: 5, y: 3 }, align: 'center' }).setOrigin(.5).setDepth(2000))
  }
  private badge(plot: Plot, id: BuildingId) {
    const job = this.state.queue.find(j => j.kind === 'build' && j.id === id)
    if (this.labels) this.label(plot.x, plot.y + 27, `${BUILDINGS[id].name} · ${this.state.buildings[id]}`)
    if (job) {
      const remaining = Math.max(0, Math.ceil((job.end - this.state.updatedAt) / 1000))
      this.label(plot.x, plot.y - 48, `⚒ ${Math.floor(remaining / 60)}:${String(remaining % 60).padStart(2, '0')}`)
    }
  }
  private building(plot: Plot, id: BuildingId) {
    const level = this.state.buildings[id]
    if (id !== 'divan') {
      const key = level > 0 ? this.requestArt(id) : 'painted-site'
      if (this.textures.exists(key)) {
        const growth = level > 0 ? fiveStageBuildingArt(id, level) : null
        const contactWidth = plot.index >= 25 ? plot.width * .82 : 68
        const width = growth ? contactWidth * growth.occupancyScale / growth.contactWidthRatio : contactWidth
        if (growth) this.keep(this.add.ellipse(plot.x + 1.5, plot.y + plot.height * .12, contactWidth * growth.occupancyScale * .92, plot.height * .4, 0x493b27, .17).setDepth(plot.y - .1))
        const img = this.keep(this.add.image(plot.x, plot.y + plot.height * .15, this.renderTexture(key, width)).setOrigin(growth?.originX ?? .5, growth?.originY ?? .88).setDepth(plot.y))
        img.setDisplaySize(width, img.height / img.width * width)
        img.setFlipX(id === 'liman' || id === 'tersane' ? this.state.coastFacing[id] === 'right' : this.state.flips.includes(id))
        if (id === this.moving) img.setAlpha(.7)
      }
    }
    this.badge(plot, id)
    const h = id === 'divan' ? 146 : Math.max(55, plot.height)
    const hit = this.keep(this.add.rectangle(plot.x, plot.y - h * .28, plot.width, h, 0xffffff, 0).setDepth(1500).setInteractive({ useHandCursor: true }))
    hit.on('pointerup', (p: Phaser.Input.Pointer) => { if (!this.moving && this.canTap(p)) this.events$.onBuilding(id) })
  }
  private canTap(p: Phaser.Input.Pointer) { return !this.pinch && isTap(p) }
  private site(plot: Plot) {
    if (!plotOpen(this.state, plot.index)) return
    const eligible = this.eligible(plot.index)
    if (this.moving && !eligible) return
    const selected = this.movePlot === plot.index
    const pad = this.keep(this.add.ellipse(plot.x, plot.y, plot.width, plot.height, selected ? 0x3fbd86 : 0xf2d39a, this.placing ? .28 : 0).setDepth(1000).setInteractive({ useHandCursor: true }))
    if (this.placing) pad.setStrokeStyle(2, selected ? 0x9af1bb : 0xe9c274)
    pad.on('pointerup', (p: Phaser.Input.Pointer) => {
      if (!this.canTap(p)) return
      if (this.moving) this.events$.onMovePlot(plot.index)
      else this.events$.onPlot(plot.index)
    })
  }
  private redraw() {
    for (const piece of this.pieces) piece.destroy()
    this.pieces = []
    const stage = glariumGrowthForLevel(this.state.buildings.divan)
    this.map?.setTexture(stage.texture).setDisplaySize(PAINTED_CITY_SIZE.width, PAINTED_CITY_SIZE.height)
    const occupied = this.occupy()
    for (const plot of PAINTED_PLOTS) {
      const id = occupied.get(plot.index)
      if (id) this.building(plot, id)
      if (!id || id === this.moving) this.site(plot)
    }
    const wall = this.keep(this.add.rectangle(1065, 62, 95, 55, 0xffffff, 0).setDepth(1500).setInteractive({ useHandCursor: true }))
    wall.on('pointerup', (p: Phaser.Input.Pointer) => { if (!this.moving && this.canTap(p)) this.events$.onBuilding('surlar') })
    if (this.labels) this.label(1065, 80, `Surlar · ${this.state.buildings.surlar}`)
    const mine = this.keep(this.add.image(195, 86, 'painted-mine').setOrigin(.5, .88).setDepth(90))
    mine.setDisplaySize(76, mine.height / mine.width * 76)
    const mineHit = this.keep(this.add.rectangle(195, 73, 78, 60, 0xffffff, 0).setDepth(1500).setInteractive({ useHandCursor: true }))
    mineHit.on('pointerup', (p: Phaser.Input.Pointer) => { if (!this.moving && this.canTap(p)) this.events$.onMine() })
    const flag = this.keep(this.add.graphics().setDepth(1000))
    flag.lineStyle(2, 0x78543b).lineBetween(806, 246, 806, 207)
    flag.fillStyle(this.siege.occupation?.color ?? this.look.color).fillTriangle(807, 207, 837, 215, 807, 224)
    if (this.siege.occupation) this.label(730, 276, `${this.siege.occupation.name} · İşgal`)
    if (this.siege.blockade) {
      this.keep(this.add.ellipse(730, 700, 510, 38, this.siege.blockade.color, .3).setStrokeStyle(2, this.siege.blockade.color).setDepth(800))
      this.label(730, 699, `${this.siege.blockade.name} · Abluka`)
    }
    if (this.raid) this.label(865, 780, '⚑ Yaklaşan filo')
    document.documentElement.dataset.paintedCity = JSON.stringify({ stage: stage.level, plots: PAINTED_PLOTS.length, occupied: [...occupied], moving: this.moving, movePlot: this.movePlot })
    this.markReady()
  }
  private markReady() {
    if (!this.built || this.load.isLoading() || this.pending.size) return
    this.game.events.once(Phaser.Core.Events.POST_RENDER, () => {
      if (!this.built) return
      document.documentElement.dataset.cityReady = String(++this.readyCount)
      if (localStorage.getItem('payitaht-qa') === '1') {
        const cam = this.cameras.main
        document.documentElement.dataset.paintedCamera = JSON.stringify({ zoom: cam.zoom, scrollX: cam.scrollX, scrollY: cam.scrollY, width: cam.width, height: cam.height, centerX: cam.midPoint.x, centerY: cam.midPoint.y })
      }
    })
  }
  private resizeView() {
    const cam = this.cameras.main
    // Full-width composition can letterbox horizontally on portrait phones.
    this.minZoom = Math.max(cam.width / PAINTED_CITY_SIZE.width, cam.height / 3170)
    cam.setZoom(Math.max(cam.zoom, this.minZoom))
  }
  recenter() {
    const cam = this.cameras.main
    cam.setZoom(Math.max(this.minZoom, cam.width / 850, cam.height * .65 / 900)).centerOn(735, 520)
  }
  focusHarbour() { const cam = this.cameras.main; cam.setZoom(Math.max(this.minZoom, cam.width / 670)); cam.centerOn(730, 655) }
  zoomBy(factor: number) { const cam = this.cameras.main; this.zoomAt(cam.zoom * factor, cam.width / 2, cam.height / 2) }
  private zoomAt(zoom: number, x: number, y: number, anchor?: { x: number; y: number }) {
    const cam = this.cameras.main
    cam.preRender()
    const before = anchor ?? cam.getWorldPoint(x, y)
    cam.setZoom(Phaser.Math.Clamp(zoom, this.minZoom, Math.max(this.minZoom * 6, 2)))
    cam.preRender()
    const after = cam.getWorldPoint(x, y)
    cam.setScroll(cam.scrollX + before.x - after.x, cam.scrollY + before.y - after.y)
  }
  private installInput() {
    this.input.addPointer(1)
    const distance = () => Phaser.Math.Distance.Between(this.input.pointer1.x, this.input.pointer1.y, this.input.pointer2.x, this.input.pointer2.y)
    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => {
      const cam = this.cameras.main
      if (this.input.pointer1.isDown && this.input.pointer2.isDown) {
        cam.preRender()
        const mid = cam.getWorldPoint((this.input.pointer1.x + this.input.pointer2.x) / 2, (this.input.pointer1.y + this.input.pointer2.y) / 2)
        this.pinch = { distance: Math.max(1, distance()), zoom: cam.zoom, x: mid.x, y: mid.y }
        this.drag = null
      } else this.drag = { x: p.x, y: p.y, sx: cam.scrollX, sy: cam.scrollY }
    })
    this.input.on('pointermove', (p: Phaser.Input.Pointer) => {
      const cam = this.cameras.main
      if (this.pinch && this.input.pointer1.isDown && this.input.pointer2.isDown) {
        this.zoomAt(this.pinch.zoom * distance() / this.pinch.distance, (this.input.pointer1.x + this.input.pointer2.x) / 2, (this.input.pointer1.y + this.input.pointer2.y) / 2, this.pinch)
      } else if (p.isDown && this.moving && this.drag) {
        cam.preRender()
        const point = cam.getWorldPoint(p.x, p.y)
        const target = PAINTED_PLOTS.filter(plot => this.eligible(plot.index))
          .map(plot => ({ plot, distance: Math.hypot(plot.x - point.x, plot.y - point.y) }))
          .sort((a, b) => a.distance - b.distance)[0]
        if (target && target.distance < target.plot.width && target.plot.index !== this.movePlot) {
          this.movePlot = target.plot.index
          this.redraw()
          this.events$.onMovePlot(target.plot.index)
        }
      } else if (p.isDown && this.drag) {
        cam.setScroll(this.drag.sx - (p.x - this.drag.x) / cam.zoom, this.drag.sy - (p.y - this.drag.y) / cam.zoom)
      }
    })
    const release = () => { this.drag = null; if (!this.input.pointer1.isDown && !this.input.pointer2.isDown) this.pinch = null }
    this.input.on('pointerup', release)
    this.input.on('pointerupoutside', release)
    this.input.on('gameout', () => { this.drag = null; this.pinch = null })
    this.input.on('wheel', (p: Phaser.Input.Pointer, _objects: unknown[], _dx: number, dy: number) => this.zoomAt(this.cameras.main.zoom * Math.exp(-dy * .001), p.x, p.y))
  }
  fxSail() { this.effect(690, 623, 760, 810, 0xe7c47b) }
  fxMarch() { this.effect(730, 300, 810, 420, 0xa52b25) }
  private effect(x: number, y: number, tx: number, ty: number, color: number) {
    if (!this.built || liteMode()) return
    const mark = this.add.ellipse(x, y, 12, 6, color).setDepth(1200)
    this.tweens.add({ targets: mark, x: tx, y: ty, duration: 1800, onComplete: () => mark.destroy() })
  }
  update(_time: number, delta: number) { this.sky?.update(Math.min(delta, 100) / 1000) }
}
