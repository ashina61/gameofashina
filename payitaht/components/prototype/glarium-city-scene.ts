import * as Phaser from 'phaser'
import { asset } from '@/lib/asset'
import { GLARIUM_GROWTH_STAGES, glariumGrowthForLevel } from '@/lib/game/glarium-city-growth'

/** Original visual study. No engine, save, construction or production imports. */
export class GlariumCityScene extends Phaser.Scene {
  onReady?: () => void
  onError?: () => void
  onStageChanged?: (level: number, name: string) => void
  initialHallLevel = 1
  private mapImage?: Phaser.GameObjects.Image
  private mapWidth = 2460
  private mapHeight = 1794
  private fit = 1
  private drag: { x: number; y: number; sx: number; sy: number } | null = null
  private pinch: { distance: number; zoom: number; x: number; y: number } | null = null

  constructor() { super('glarium-ottoman-study') }

  preload() {
    for (const stage of GLARIUM_GROWTH_STAGES) {
      this.load.image(stage.texture, asset(`/images/prototype/glarium-growth/hall-${String(stage.level).padStart(2, '0')}.webp`))
    }
    this.load.once('loaderror', () => this.onError?.())
  }

  create() {
    const stage = glariumGrowthForLevel(this.initialHallLevel)
    if (!this.textures.exists(stage.texture)) return
    const image = this.add.image(0, 0, stage.texture).setOrigin(0)
    this.mapImage = image
    this.mapWidth = image.width
    this.mapHeight = image.height
    this.cameras.main.setBackgroundColor('#173e41')
    this.cameras.main.setBounds(0, 0, image.width, image.height)
    this.overview()
    this.input.addPointer(1)
    const distance = () => Phaser.Math.Distance.Between(this.input.pointer1.x, this.input.pointer1.y, this.input.pointer2.x, this.input.pointer2.y)
    const midpoint = () => ({ x: (this.input.pointer1.x + this.input.pointer2.x) / 2, y: (this.input.pointer1.y + this.input.pointer2.y) / 2 })
    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => {
      const cam = this.cameras.main
      if (this.input.pointer1.isDown && this.input.pointer2.isDown) {
        const mid = midpoint()
        cam.preRender()
        const world = cam.getWorldPoint(mid.x, mid.y)
        this.pinch = { distance: Math.max(1, distance()), zoom: cam.zoom, x: world.x, y: world.y }
        this.drag = null
      } else this.drag = { x: p.x, y: p.y, sx: cam.scrollX, sy: cam.scrollY }
    })
    this.input.on('pointermove', (p: Phaser.Input.Pointer) => {
      const cam = this.cameras.main
      if (this.pinch && this.input.pointer1.isDown && this.input.pointer2.isDown) {
        const mid = midpoint()
        this.zoomAt(this.pinch.zoom * distance() / this.pinch.distance, mid.x, mid.y, this.pinch)
      } else if (p.isDown && this.drag) {
        cam.setScroll(this.drag.sx - (p.x - this.drag.x) / cam.zoom, this.drag.sy - (p.y - this.drag.y) / cam.zoom)
      }
    })
    const release = () => { this.drag = null; this.pinch = null }
    this.input.on('pointerup', release)
    this.input.on('pointerupoutside', release)
    this.input.on('gameout', release)
    this.input.on('wheel', (p: Phaser.Input.Pointer, _objects: unknown[], _dx: number, dy: number) => {
      this.zoomAt(this.cameras.main.zoom * Math.exp(-dy * .001), p.x, p.y)
    })
    this.scale.on('resize', this.overview, this)
    this.events.once('shutdown', () => this.scale.off('resize', this.overview, this))
    this.onReady?.()
    this.setHallLevel(this.initialHallLevel)
  }

  setHallLevel(level: number) {
    const safe = Number.isFinite(level) ? Math.max(1, Math.floor(level)) : 1
    this.initialHallLevel = safe
    if (!this.mapImage) return
    const stage = glariumGrowthForLevel(safe)
    if (!this.textures.exists(stage.texture)) { this.onError?.(); return }
    // Preserve camera and frame dimensions when comparing development stages.
    this.mapImage.setTexture(stage.texture).setDisplaySize(this.mapWidth, this.mapHeight)
    this.onStageChanged?.(safe, stage.name)
  }

  overview() {
    const cam = this.cameras.main
    this.fit = Math.min(cam.width / this.mapWidth, cam.height / this.mapHeight)
    cam.setZoom(this.fit).centerOn(this.mapWidth / 2, this.mapHeight / 2)
  }

  focus(section: 'city' | 'harbour') {
    const cam = this.cameras.main
    cam.setZoom(Math.max(this.fit, cam.width / (this.mapWidth * .55), cam.height / (this.mapHeight * .75)))
    cam.centerOn(this.mapWidth * .5, this.mapHeight * (section === 'city' ? .36 : .70))
  }

  zoomBy(factor: number) {
    const cam = this.cameras.main
    this.zoomAt(cam.zoom * factor, cam.width / 2, cam.height / 2)
  }

  private zoomAt(zoom: number, x: number, y: number, anchor?: { x: number; y: number }) {
    const cam = this.cameras.main
    cam.preRender()
    const before = anchor ?? cam.getWorldPoint(x, y)
    cam.setZoom(Phaser.Math.Clamp(zoom, this.fit, Math.max(this.fit * 5, 1)))
    cam.preRender()
    const after = cam.getWorldPoint(x, y)
    cam.setScroll(cam.scrollX + before.x - after.x, cam.scrollY + before.y - after.y)
  }
}
