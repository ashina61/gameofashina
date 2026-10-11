import * as Phaser from 'phaser'
import {
  CITY_SLOTS, COAST_SLOTS, DEFENSE_FOUNDATION, HALL_SLOT_ID, PLAZA, ROAD_GRAPH, TILE,
  slotById, type CitySlot,
} from '@/lib/game/city-map'
import {
  BUILDING_ASSETS, HALL_BUILDING_ID, MOVABLE_BUILDING_IDS, assetById, groundScale,
} from '@/lib/game/city-map/building-assets'
import { preloadTerrain, mulberry32 } from '@/lib/game/city-map/terrain-builder'
import { buildingImage } from '@/lib/asset'

type P = { x: number; y: number }
type Walker = { dot: Phaser.GameObjects.Arc; path: Phaser.Curves.QuadraticBezier; t: number; speed: number }
type Puff = { dot: Phaser.GameObjects.Arc; x: number; baseY: number; phase: number; speed: number }

const HALL = slotById(HALL_SLOT_ID)!.screen
const X_STRETCH = 1.38
const Y_COMPRESS = 0.62
const SLOT_W = 300
const SLOT_H = 138

/**
 * CITY V3 PROTOTYPE — CANLI OYUNDAN TAMAMEN BAĞIMSIZ.
 *
 * Mevcut city-slots.json ve road graph yalnızca READ-ONLY topoloji olarak kullanılır.
 * Görsel projeksiyon kasıtlı olarak daha geniş/yataydır: aynı slot sayısı ve bağlantı
 * mantığı korunur, fakat Whiteout/RoK benzeri geniş şehir kompozisyonu denenir.
 * Save, engine, ekonomi ve canlı Phaser sahnesi bu dosyayı bilmez.
 */
export class CityV3Scene extends Phaser.Scene {
  onInfo?: (text: string) => void

  private active = MOVABLE_BUILDING_IDS[0] ?? HALL_BUILDING_ID
  private placements = new Map<string, string>()
  private buildings = new Map<string, Phaser.GameObjects.Image>()
  private filler: Phaser.GameObjects.Image[] = []
  private walkers: Walker[] = []
  private puffs: Puff[] = []
  private selectedSlot: string | null = null
  private selection!: Phaser.GameObjects.Graphics
  private lifeEnabled = true
  private rng = mulberry32(61028)

  private minZoom = 0.22
  private maxZoom = 1.45
  private cityZoom = 0.54
  private dragStart: { x: number; y: number; sx: number; sy: number } | null = null
  private pinch: { dist: number; zoom: number } | null = null

  constructor() { super('city-v3-prototype') }

  private p(p: P): P {
    return { x: (p.x - HALL.x) * X_STRETCH, y: (p.y - HALL.y) * Y_COMPRESS }
  }

  private slotP(slot: CitySlot): P { return this.p(slot.screen) }

  preload() {
    preloadTerrain(this)
    for (const a of BUILDING_ASSETS) {
      const key = `proto-b-${a.buildingId}`
      if (!this.textures.exists(key)) this.load.image(key, a.assetPath)
    }
    if (!this.textures.exists('proto-liman')) this.load.image('proto-liman', buildingImage('liman', 8, 'straight'))
    if (!this.textures.exists('proto-tersane')) this.load.image('proto-tersane', buildingImage('tersane', 8, 'straight'))
  }

  create() {
    this.cameras.main.setBackgroundColor('#164b5d')
    this.seedPlacements()
    this.drawWorld()
    this.drawRoads()
    this.drawFarmsAndOutskirts()
    this.drawFillerNeighbourhoods()
    this.drawCoastBuildings()
    this.drawBuildings()
    this.selection = this.add.graphics().setDepth(20000)
    this.drawSelection()
    this.spawnLife()
    this.spawnSmoke()
    this.setupCamera()
    this.installInput()
    this.onInfo?.('CITY V3 hazır · bina seçip boş olmayan bir parsele dokunarak değiştir · sürükle/pinch aktif.')
  }

  private seedPlacements() {
    this.placements.clear()
    this.placements.set(HALL_SLOT_ID, HALL_BUILDING_ID)
    const slots = CITY_SLOTS.filter(s => !s.fixed)
    slots.forEach((s, i) => this.placements.set(s.id, MOVABLE_BUILDING_IDS[(i * 5 + 2) % MOVABLE_BUILDING_IDS.length]))
  }

  private drawWorld() {
    const g = this.add.graphics().setDepth(-1000)
    // Derin deniz + kıyıya doğru daha açık su.
    g.fillStyle(0x174f61, 1).fillRect(-2700, -1800, 5400, 3900)
    g.fillStyle(0x287789, 1).fillRect(-2700, 760, 5400, 1360)
    g.fillStyle(0x4e9f9f, 0.78).fillRect(-2700, 760, 5400, 260)

    // Geniş, yatay ada gövdesi. Slot topolojisi bu elips içinde kalır.
    const coast = this.add.graphics().setDepth(-980)
    coast.fillStyle(0xcbb889, 1)
    coast.fillEllipse(0, 40, 4700, 2700)
    coast.fillStyle(0x6f9855, 1)
    coast.fillEllipse(0, -8, 4580, 2540)
    coast.lineStyle(30, 0xe3ca94, 0.72)
    coast.strokeEllipse(0, 40, 4660, 2660)

    // Organik renk yamaları: grid hissini kırar.
    const patch = this.add.graphics().setDepth(-970)
    const colors = [0x587f45, 0x7da257, 0x91a866, 0x607f49, 0x8d9b5c]
    for (let i = 0; i < 28; i++) {
      const a = this.rng() * Math.PI * 2
      const r = Math.sqrt(this.rng())
      const x = Math.cos(a) * 1850 * r
      const y = Math.sin(a) * 930 * r - 80
      patch.fillStyle(colors[i % colors.length], 0.10 + this.rng() * 0.07)
      patch.fillEllipse(x, y, 280 + this.rng() * 620, 130 + this.rng() * 300)
    }

    // Belediye meydanı.
    const plaza = this.p(PLAZA.screen)
    const pg = this.add.graphics().setDepth(-720)
    pg.fillStyle(0xc7b08a, 0.94).fillEllipse(plaza.x, plaza.y + 6, 620, 280)
    pg.lineStyle(12, 0x9e896c, 0.65).strokeEllipse(plaza.x, plaza.y + 6, 620, 280)

    // Surların eski topolojisini geniş projeksiyonda hafif savunma hattı olarak göster.
    const wall = this.add.graphics().setDepth(-705)
    wall.lineStyle(30, 0x9b8d75, 0.86)
    wall.strokePoints(DEFENSE_FOUNDATION.map(pt => {
      const q = this.p(pt.screen)
      return new Phaser.Math.Vector2(q.x, q.y)
    }), true)
    wall.lineStyle(7, 0xd6c4a2, 0.7)
    wall.strokePoints(DEFENSE_FOUNDATION.map(pt => {
      const q = this.p(pt.screen)
      return new Phaser.Math.Vector2(q.x, q.y - 5)
    }), true)
  }

  private drawRoads() {
    const nodes = new Map(ROAD_GRAPH.nodes.map(n => [n.id, n]))
    const g = this.add.graphics().setDepth(-700)
    for (const e of ROAD_GRAPH.edges) {
      const a = nodes.get(e.from), b = nodes.get(e.to)
      if (!a || !b) continue
      const A = this.p(a.screen), B = this.p(b.screen), C = this.p(e.ctrl)
      const curve = new Phaser.Curves.QuadraticBezier(
        new Phaser.Math.Vector2(A.x, A.y), new Phaser.Math.Vector2(C.x, C.y), new Phaser.Math.Vector2(B.x, B.y),
      )
      const coast = e.from.startsWith('coast_') || e.to.startsWith('coast_')
      g.lineStyle(coast ? 54 : 46, 0x7e694f, 0.30)
      curve.draw(g, 28)
      g.lineStyle(coast ? 34 : 27, coast ? 0xb5a487 : 0xbfa77f, 0.96)
      curve.draw(g, 28)
      g.lineStyle(5, 0xd9c39b, 0.42)
      curve.draw(g, 28)
    }
  }

  private drawFarmsAndOutskirts() {
    const g = this.add.graphics().setDepth(-650)
    const farms = [
      [-1780, -610], [-1500, -820], [1560, -560], [1760, -290],
      [-1900, 360], [1820, 330], [-1180, 810], [1240, 840],
    ] as const
    for (const [x, y] of farms) {
      g.fillStyle(0xb69a43, 0.82)
      g.fillRoundedRect(x - 150, y - 70, 300, 140, 18)
      g.lineStyle(5, 0x7f6f36, 0.6)
      for (let k = -110; k <= 110; k += 44) g.lineBetween(x + k, y - 58, x + k + 36, y + 58)
    }

    const decorKeys = ['d_olive-tree', 'd_cypress', 'd_pine', 'd_plane-tree', 'd_bush']
    for (let i = 0; i < 92; i++) {
      const a = this.rng() * Math.PI * 2
      const rr = 0.72 + this.rng() * 0.27
      const x = Math.cos(a) * 2150 * rr
      const y = Math.sin(a) * 1120 * rr - 60
      if (y > 930) continue
      if (CITY_SLOTS.some(s => {
        const q = this.slotP(s)
        return Math.abs(q.x - x) + Math.abs(q.y - y) * 1.8 < 330
      })) continue
      const key = decorKeys[i % decorKeys.length]
      if (!this.textures.exists(key)) continue
      const img = this.add.image(x, y, key).setOrigin(0.5, 0.82).setDepth(y - 50)
      const src = this.textures.get(key).getSourceImage() as HTMLImageElement
      const w = 65 + this.rng() * 50
      if (src?.width) img.setDisplaySize(w, w * src.height / src.width)
      img.setAlpha(0.88)
    }
  }

  private drawFillerNeighbourhoods() {
    for (const f of this.filler) f.destroy()
    this.filler = []
    const house = assetById('konut')
    if (!house) return
    const key = 'proto-b-konut'
    const rings = [0.56, 0.72, 0.86]
    let ord = 0
    for (const ring of rings) {
      const count = ring < 0.7 ? 14 : ring < 0.8 ? 18 : 22
      for (let i = 0; i < count; i++) {
        const a = (i / count) * Math.PI * 2 + ring * 0.91
        const x = Math.cos(a) * 2050 * ring + (this.rng() - 0.5) * 150
        const y = Math.sin(a) * 1060 * ring - 50 + (this.rng() - 0.5) * 85
        if (y > 860) continue
        if (CITY_SLOTS.some(s => {
          const q = this.slotP(s)
          return Math.abs(q.x - x) + Math.abs(q.y - y) * 1.8 < 310
        })) continue
        const img = this.add.image(x, y, key).setOrigin(house.originX, house.originY)
        const sc = groundScale(img.width, house) * (0.44 + (ord % 4) * 0.035)
        img.setScale(sc).setDepth(y - 15).setAlpha(0.92)
        if (ord % 3 === 1) img.setTint(0xf2e5d2)
        this.filler.push(img)
        ord++
      }
    }
  }

  private drawCoastBuildings() {
    const sorted = [...COAST_SLOTS].sort((a, b) => a.screen.x - b.screen.x)
    sorted.forEach((slot, i) => {
      const q = this.slotP(slot)
      const key = i === 1 ? 'proto-liman' : 'proto-tersane'
      if (!this.textures.exists(key)) return
      const img = this.add.image(q.x, q.y + 42, key).setOrigin(0.5, 1).setDepth(q.y + 100)
      const src = this.textures.get(key).getSourceImage() as HTMLImageElement
      if (src?.width) img.setDisplaySize(i === 1 ? 390 : 340, (i === 1 ? 390 : 340) * src.height / src.width)
    })
  }

  private drawBuildings() {
    for (const img of this.buildings.values()) img.destroy()
    this.buildings.clear()
    for (const slot of CITY_SLOTS) {
      const id = this.placements.get(slot.id)
      const a = id ? assetById(id) : undefined
      if (!a) continue
      const key = `proto-b-${id}`
      if (!this.textures.exists(key)) continue
      const q = this.slotP(slot)
      const img = this.add.image(q.x, q.y, key).setOrigin(a.originX, a.originY)
      const scale = groundScale(img.width, a) * (id === HALL_BUILDING_ID ? 1.34 : 1.08)
      img.setScale(scale).setDepth(q.y + 100)
      this.buildings.set(slot.id, img)
    }
  }

  private roadPaths() {
    const nodes = new Map(ROAD_GRAPH.nodes.map(n => [n.id, n]))
    return ROAD_GRAPH.edges.flatMap(e => {
      const a = nodes.get(e.from), b = nodes.get(e.to)
      if (!a || !b) return []
      const A = this.p(a.screen), B = this.p(b.screen), C = this.p(e.ctrl)
      return [new Phaser.Curves.QuadraticBezier(
        new Phaser.Math.Vector2(A.x, A.y), new Phaser.Math.Vector2(C.x, C.y), new Phaser.Math.Vector2(B.x, B.y),
      )]
    })
  }

  private spawnLife() {
    const paths = this.roadPaths()
    for (let i = 0; i < 30; i++) {
      const path = paths[(i * 7 + 3) % paths.length]
      const t = this.rng()
      const p = path.getPoint(t)
      const dot = this.add.circle(p.x, p.y, i % 8 === 0 ? 8 : 5, i % 6 === 0 ? 0x8b2f28 : 0x3e342a, 0.96).setDepth(p.y + 420)
      dot.setStrokeStyle(1, 0xead7ae, 0.75)
      this.walkers.push({ dot, path, t, speed: 0.025 + this.rng() * 0.035 })
    }

    // Liman ağzında iki hareketli tekne.
    for (let i = 0; i < 2; i++) {
      const key = i === 0 ? 's_fishing' : 's_ship-a'
      if (!this.textures.exists(key)) continue
      const y = 1270 + i * 170
      const ship = this.add.image(-2250 + i * 700, y, key).setDepth(y + 20).setAlpha(0.92)
      const src = this.textures.get(key).getSourceImage() as HTMLImageElement
      if (src?.width) ship.setDisplaySize(i ? 190 : 120, (i ? 190 : 120) * src.height / src.width)
      this.tweens.add({ targets: ship, x: 2200 - i * 450, duration: 42000 + i * 12000, yoyo: true, repeat: -1, ease: 'Sine.inOut' })
    }
  }

  private spawnSmoke() {
    const slots = CITY_SLOTS.filter((_, i) => i % 4 === 1).slice(0, 7)
    slots.forEach((slot, i) => {
      const q = this.slotP(slot)
      for (let k = 0; k < 2; k++) {
        const dot = this.add.circle(q.x + 35 + k * 9, q.y - 155, 11 + k * 5, 0xe6e0d1, 0.28).setDepth(q.y + 80)
        this.puffs.push({ dot, x: q.x + 35 + k * 9, baseY: q.y - 155, phase: i * 0.7 + k, speed: 0.00016 + k * 0.00004 })
      }
    })
  }

  private overviewRect() { return { x: -2480, y: -1420, w: 4960, h: 3000 } }

  private setupCamera() {
    const wr = this.overviewRect()
    this.cameras.main.setBounds(wr.x, wr.y, wr.w, wr.h)
    const z = Math.min(this.scale.width / wr.w, this.scale.height / wr.h) * 0.98
    this.minZoom = Math.max(0.16, z)
    this.cityZoom = Math.max(this.minZoom * 1.85, 0.46)
    this.setOverview()
  }

  setOverview() {
    const r = this.overviewRect()
    const z = Math.min(this.scale.width / r.w, this.scale.height / r.h) * 0.98
    this.cameras.main.setZoom(Phaser.Math.Clamp(z, this.minZoom, this.maxZoom))
    this.cameras.main.centerOn(0, 90)
  }

  setCityView() {
    this.cameras.main.setZoom(Phaser.Math.Clamp(this.cityZoom, this.minZoom, this.maxZoom))
    this.cameras.main.centerOn(0, 120)
  }

  setActiveBuilding(id: string) {
    if (!MOVABLE_BUILDING_IDS.includes(id)) return
    this.active = id
    this.onInfo?.(`${assetById(id)?.name ?? id} seçildi · değiştirmek istediğin parsele dokun.`)
  }

  randomize() {
    const slots = CITY_SLOTS.filter(s => !s.fixed)
    slots.forEach((slot, i) => {
      const id = MOVABLE_BUILDING_IDS[(Math.floor(this.rng() * MOVABLE_BUILDING_IDS.length) + i) % MOVABLE_BUILDING_IDS.length]
      this.placements.set(slot.id, id)
    })
    this.drawBuildings()
    this.onInfo?.('Yerleşim karıştırıldı. Canlı oyunun save verisi değişmedi.')
  }

  resetCity() {
    this.seedPlacements()
    this.selectedSlot = null
    this.drawBuildings()
    this.drawSelection()
    this.onInfo?.('Prototip başlangıç düzenine döndü.')
  }

  setLifeEnabled(on: boolean) {
    this.lifeEnabled = on
    for (const w of this.walkers) w.dot.setVisible(on)
    for (const p of this.puffs) p.dot.setVisible(on)
    this.onInfo?.(on ? 'Şehir yaşamı açık.' : 'Şehir yaşamı kapalı.')
  }

  private hitSlot(world: P) {
    let best: CitySlot | null = null
    let bestD = Infinity
    for (const s of CITY_SLOTS) {
      const q = this.slotP(s)
      const hit = Math.abs(world.x - q.x) / (SLOT_W / 2) + Math.abs(world.y - q.y) / (SLOT_H / 2) <= 1
      const d = Math.hypot(world.x - q.x, world.y - q.y)
      if (hit && d < bestD) { best = s; bestD = d }
    }
    return best
  }

  private drawSelection() {
    if (!this.selection) return
    this.selection.clear()
    if (!this.selectedSlot) return
    const slot = slotById(this.selectedSlot)
    if (!slot) return
    const q = this.slotP(slot)
    this.selection.lineStyle(7, 0xf1c35e, 0.98)
    this.selection.strokePoints([
      new Phaser.Math.Vector2(q.x, q.y - SLOT_H / 2),
      new Phaser.Math.Vector2(q.x + SLOT_W / 2, q.y),
      new Phaser.Math.Vector2(q.x, q.y + SLOT_H / 2),
      new Phaser.Math.Vector2(q.x - SLOT_W / 2, q.y),
    ], true)
  }

  private installInput() {
    this.input.addPointer(1)
    const gap = () => Phaser.Math.Distance.Between(this.input.pointer1.x, this.input.pointer1.y, this.input.pointer2.x, this.input.pointer2.y)
    const clampZoom = (z: number) => Phaser.Math.Clamp(z, this.minZoom, this.maxZoom)

    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => {
      if (this.input.pointer1.isDown && this.input.pointer2.isDown) {
        this.pinch = { dist: Math.max(1, gap()), zoom: this.cameras.main.zoom }
        this.dragStart = null
        return
      }
      this.dragStart = { x: p.x, y: p.y, sx: this.cameras.main.scrollX, sy: this.cameras.main.scrollY }
    })

    this.input.on('pointermove', (p: Phaser.Input.Pointer) => {
      const cam = this.cameras.main
      if (this.pinch && this.input.pointer1.isDown && this.input.pointer2.isDown) {
        cam.setZoom(clampZoom(this.pinch.zoom * gap() / this.pinch.dist))
        return
      }
      if (!p.isDown || !this.dragStart) return
      const dx = (p.x - this.dragStart.x) / cam.zoom
      const dy = (p.y - this.dragStart.y) / cam.zoom
      cam.scrollX = this.dragStart.sx - dx
      cam.scrollY = this.dragStart.sy - dy
    })

    this.input.on('pointerup', (p: Phaser.Input.Pointer) => {
      const wasPinch = !!this.pinch
      if (!(this.input.pointer1.isDown && this.input.pointer2.isDown)) this.pinch = null
      const start = this.dragStart
      this.dragStart = null
      if (wasPinch || !start || Math.hypot(p.x - start.x, p.y - start.y) > 12) return
      const w = this.cameras.main.getWorldPoint(p.x, p.y)
      const slot = this.hitSlot({ x: w.x, y: w.y })
      if (!slot) return
      if (slot.fixed) {
        this.selectedSlot = slot.id
        this.drawSelection()
        this.onInfo?.('Belediye sabit merkezdir; prototipte de taşınmaz.')
        return
      }
      this.placements.set(slot.id, this.active)
      this.selectedSlot = slot.id
      this.drawBuildings()
      this.drawSelection()
      this.onInfo?.(`${assetById(this.active)?.name ?? this.active} → ${slot.id}. Bu değişiklik yalnız sandbox içinde.`)
    })

    this.input.on('wheel', (_p: Phaser.Input.Pointer, _go: unknown[], _dx: number, dy: number) => {
      const cam = this.cameras.main
      cam.setZoom(clampZoom(cam.zoom * (dy > 0 ? 0.90 : 1.10)))
    })
  }

  update(_time: number, delta: number) {
    if (!this.lifeEnabled) return
    const paths = this.roadPaths()
    for (let i = 0; i < this.walkers.length; i++) {
      const w = this.walkers[i]
      w.t += w.speed * (delta / 1000)
      if (w.t >= 1) {
        w.t = 0
        w.path = paths[(i * 11 + Math.floor(this.rng() * paths.length)) % paths.length]
      }
      const p = w.path.getPoint(w.t)
      w.dot.setPosition(p.x, p.y).setDepth(p.y + 420)
    }
    const now = this.time.now
    for (const p of this.puffs) {
      const t = ((now * p.speed + p.phase) % 1)
      p.dot.setPosition(p.x + Math.sin(t * Math.PI * 2) * 16, p.baseY - t * 120)
      p.dot.setAlpha((1 - t) * 0.30)
      p.dot.setScale(0.7 + t * 0.8)
    }
  }
}
