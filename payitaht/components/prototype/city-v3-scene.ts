import * as Phaser from 'phaser'
import {
  CITY_SLOTS, COAST_SLOTS, DEFENSE_FOUNDATION, HALL_SLOT_ID, PLAZA, ROAD_GRAPH,
  slotById, type CitySlot,
} from '@/lib/game/city-map'
import {
  BUILDING_ASSETS, HALL_BUILDING_ID, MOVABLE_BUILDING_IDS, assetById, groundScale,
} from '@/lib/game/city-map/building-assets'
import { preloadTerrain, mulberry32 } from '@/lib/game/city-map/terrain-builder'
import { buildingImage } from '@/lib/asset'

type P = { x: number; y: number }
type Walker = { obj: Phaser.GameObjects.Container; path: Phaser.Curves.QuadraticBezier; t: number; speed: number; phase: number }
type Cart = { obj: Phaser.GameObjects.Container; path: Phaser.Curves.QuadraticBezier; t: number; speed: number }
type Puff = { dot: Phaser.GameObjects.Arc; x: number; baseY: number; phase: number; speed: number }

const HALL = slotById(HALL_SLOT_ID)!.screen
const X_STRETCH = 1.38
const Y_COMPRESS = 0.62
const SLOT_W = 300
const SLOT_H = 138

/**
 * CITY V3 PROTOTYPE — CANLI OYUNDAN TAMAMEN BAĞIMSIZ.
 *
 * Mevcut slot/road verisi burada yalnız READ-ONLY topoloji olarak kullanılır.
 * Bu sahnenin projeksiyonu, dekoru, yaşayan şehir katmanı ve sandbox yerleşimi
 * canlı CityScene/engine/save tarafından bilinmez. Amaç geniş Whiteout/RoK
 * kompozisyonunu Payitaht'ın mevcut slot mantığıyla risksiz denemektir.
 */
export class CityV3Scene extends Phaser.Scene {
  onInfo?: (text: string) => void

  private active = MOVABLE_BUILDING_IDS[0] ?? HALL_BUILDING_ID
  private placements = new Map<string, string>()
  private buildings = new Map<string, Phaser.GameObjects.Image>()
  private filler: Phaser.GameObjects.Image[] = []
  private activity: Phaser.GameObjects.GameObject[] = []
  private coastObjects: Phaser.GameObjects.GameObject[] = []
  private walkers: Walker[] = []
  private carts: Cart[] = []
  private puffs: Puff[] = []
  private selectedSlot: string | null = null
  private selection!: Phaser.GameObjects.Graphics
  private shadowLayer: Phaser.GameObjects.Graphics | null = null
  private lifeEnabled = true
  private rng = mulberry32(61028)

  private minZoom = 0.07
  private maxZoom = 1.45
  private cityZoom = 0.19
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
    this.drawBuildPads()
    this.drawFarmsAndOutskirts()
    this.drawFillerNeighbourhoods()
    this.drawCoastBuildings()
    this.drawBuildings()
    this.selection = this.add.graphics().setDepth(30000)
    this.drawSelection()
    this.spawnLife()
    this.spawnSmoke()
    this.setupCamera()
    this.installInput()
    this.onInfo?.('CITY V3 hazır · bina seçip parsele dokun · şehir/kıyı canlı · sürükle ve pinch aktif.')
  }

  private seedPlacements() {
    this.placements.clear()
    this.placements.set(HALL_SLOT_ID, HALL_BUILDING_ID)
    const slots = CITY_SLOTS.filter(s => !s.fixed)
    slots.forEach((s, i) => this.placements.set(s.id, MOVABLE_BUILDING_IDS[(i * 5 + 2) % MOVABLE_BUILDING_IDS.length]))
  }

  private drawWorld() {
    const sea = this.add.graphics().setDepth(-1100)
    sea.fillStyle(0x174858, 1).fillRect(-2750, -1800, 5500, 4000)
    const bands = [0x1b5668, 0x246c7c, 0x328693, 0x4a9f9f]
    bands.forEach((c, i) => {
      sea.fillStyle(c, 0.42 + i * 0.1)
      sea.fillRect(-2750, 700 + i * 105, 5500, 470)
    })

    const coast = this.add.graphics().setDepth(-1000)
    coast.fillStyle(0xd1bd8e, 1).fillEllipse(0, 35, 4820, 2780)
    coast.fillStyle(0x739b58, 1).fillEllipse(0, -16, 4680, 2590)
    coast.lineStyle(24, 0xead2a0, 0.72).strokeEllipse(0, 35, 4770, 2730)

    const patch = this.add.graphics().setDepth(-990)
    const colors = [0x527b41, 0x7fa45a, 0x95aa69, 0x617f49, 0x88985a, 0x698e50]
    for (let i = 0; i < 36; i++) {
      const a = this.rng() * Math.PI * 2
      const r = Math.sqrt(this.rng())
      const x = Math.cos(a) * 1880 * r
      const y = Math.sin(a) * 945 * r - 85
      patch.fillStyle(colors[i % colors.length], 0.07 + this.rng() * 0.08)
      patch.fillEllipse(x, y, 280 + this.rng() * 650, 130 + this.rng() * 330)
    }

    // Su parıltıları ve küçük kıyı dalgaları, tamamen görsel katman.
    const water = this.add.graphics().setDepth(-985)
    water.lineStyle(4, 0xc7ece4, 0.20)
    for (let i = 0; i < 46; i++) {
      const x = -2400 + this.rng() * 4800
      const y = 1040 + this.rng() * 850
      const w = 28 + this.rng() * 90
      water.lineBetween(x - w / 2, y, x + w / 2, y + (this.rng() - 0.5) * 12)
    }

    const plaza = this.p(PLAZA.screen)
    const pg = this.add.graphics().setDepth(-760)
    pg.fillStyle(0xcab28b, 0.98).fillEllipse(plaza.x, plaza.y + 6, 650, 290)
    pg.lineStyle(12, 0x96816a, 0.66).strokeEllipse(plaza.x, plaza.y + 6, 650, 290)
    pg.fillStyle(0x79a9a0, 0.95).fillCircle(plaza.x, plaza.y + 16, 38)
    pg.fillStyle(0xd8d0b7, 0.95).fillCircle(plaza.x, plaza.y + 16, 20)

    // Savunma hattı aynı topolojinin geniş projeksiyonu. Görsel dışında etkisi yok.
    const wallPts = DEFENSE_FOUNDATION.map(pt => {
      const q = this.p(pt.screen)
      return new Phaser.Math.Vector2(q.x, q.y)
    })
    const wall = this.add.graphics().setDepth(-735)
    wall.lineStyle(33, 0x8f816b, 0.90).strokePoints(wallPts, true)
    wall.lineStyle(7, 0xd9c7a5, 0.76).strokePoints(wallPts.map(v => new Phaser.Math.Vector2(v.x, v.y - 5)), true)
    wall.fillStyle(0x867763, 1)
    for (let i = 0; i < wallPts.length; i += 4) wall.fillCircle(wallPts[i].x, wallPts[i].y - 5, 26)

    this.drawHallFlags()
  }

  private drawHallFlags() {
    const flag = (x: number, y: number, flip: number) => {
      const g = this.add.graphics().setDepth(y + 150)
      g.lineStyle(5, 0x5b4430, 1).lineBetween(x, y, x, y - 118)
      g.fillStyle(0xa52a26, 1)
      if (flip > 0) g.fillTriangle(x, y - 112, x + 58, y - 94, x, y - 72)
      else g.fillTriangle(x, y - 112, x - 58, y - 94, x, y - 72)
      g.fillStyle(0xf0d7a0, 0.9).fillCircle(x + flip * 18, y - 94, 7)
    }
    flag(-150, -10, 1)
    flag(150, -10, -1)
  }

  private drawRoads() {
    const nodes = new Map(ROAD_GRAPH.nodes.map(n => [n.id, n]))
    const g = this.add.graphics().setDepth(-720)
    for (const e of ROAD_GRAPH.edges) {
      const a = nodes.get(e.from), b = nodes.get(e.to)
      if (!a || !b) continue
      const A = this.p(a.screen), B = this.p(b.screen), C = this.p(e.ctrl)
      const curve = new Phaser.Curves.QuadraticBezier(
        new Phaser.Math.Vector2(A.x, A.y), new Phaser.Math.Vector2(C.x, C.y), new Phaser.Math.Vector2(B.x, B.y),
      )
      const coastLink = e.from.startsWith('coast_') || e.to.startsWith('coast_')
      g.lineStyle(coastLink ? 58 : 50, 0x6f5d47, 0.32)
      curve.draw(g, 32)
      g.lineStyle(coastLink ? 36 : 29, coastLink ? 0xb6a58a : 0xc2aa82, 0.98)
      curve.draw(g, 32)
      g.lineStyle(4, 0xe2cba1, 0.35)
      curve.draw(g, 32)
    }
  }

  private drawBuildPads() {
    const g = this.add.graphics().setDepth(-690)
    for (const slot of CITY_SLOTS) {
      const q = this.slotP(slot)
      const pts = [
        new Phaser.Math.Vector2(q.x, q.y - SLOT_H / 2),
        new Phaser.Math.Vector2(q.x + SLOT_W / 2, q.y),
        new Phaser.Math.Vector2(q.x, q.y + SLOT_H / 2),
        new Phaser.Math.Vector2(q.x - SLOT_W / 2, q.y),
      ]
      g.fillStyle(slot.fixed ? 0xb9a27d : 0x708158, slot.fixed ? 0.40 : 0.20).fillPoints(pts, true)
      g.lineStyle(slot.fixed ? 5 : 3, slot.fixed ? 0xd7c09a : 0xb7aa82, slot.fixed ? 0.54 : 0.26).strokePoints(pts, true)
    }
  }

  private drawFarmsAndOutskirts() {
    const g = this.add.graphics().setDepth(-650)
    const farms = [
      [-1820, -620], [-1500, -835], [1590, -585], [1840, -300],
      [-1950, 350], [1870, 320], [-1200, 830], [1260, 845],
    ] as const
    for (const [x, y] of farms) {
      g.fillStyle(0xb99a43, 0.84).fillRoundedRect(x - 155, y - 72, 310, 144, 18)
      g.lineStyle(5, 0x766833, 0.65)
      for (let k = -115; k <= 115; k += 42) g.lineBetween(x + k, y - 60, x + k + 35, y + 60)
    }

    const decorKeys = ['d_olive-tree', 'd_cypress', 'd_pine', 'd_plane-tree', 'd_bush', 'd_fig-tree', 'd_orange-tree']
    for (let i = 0; i < 118; i++) {
      const a = this.rng() * Math.PI * 2
      const rr = 0.68 + this.rng() * 0.31
      const x = Math.cos(a) * 2180 * rr
      const y = Math.sin(a) * 1130 * rr - 70
      if (y > 930) continue
      if (CITY_SLOTS.some(s => {
        const q = this.slotP(s)
        return Math.abs(q.x - x) + Math.abs(q.y - y) * 1.8 < 325
      })) continue
      const key = decorKeys[i % decorKeys.length]
      if (!this.textures.exists(key)) continue
      const img = this.add.image(x, y, key).setOrigin(0.5, 0.82).setDepth(y - 45)
      const src = this.textures.get(key).getSourceImage() as HTMLImageElement
      const w = 58 + this.rng() * 58
      if (src?.width) img.setDisplaySize(w, w * src.height / src.width)
      img.setAlpha(0.90)
    }
  }

  private drawFillerNeighbourhoods() {
    for (const f of this.filler) f.destroy()
    this.filler = []
    const house = assetById('konut')
    if (!house) return
    const key = 'proto-b-konut'
    const rings = [0.47, 0.59, 0.71, 0.83]
    let ord = 0
    for (const ring of rings) {
      const count = ring < 0.55 ? 13 : ring < 0.65 ? 17 : ring < 0.78 ? 21 : 25
      for (let i = 0; i < count; i++) {
        const a = (i / count) * Math.PI * 2 + ring * 1.17
        const x = Math.cos(a) * 2090 * ring + (this.rng() - 0.5) * 135
        const y = Math.sin(a) * 1070 * ring - 60 + (this.rng() - 0.5) * 78
        if (y > 875) continue
        if (CITY_SLOTS.some(s => {
          const q = this.slotP(s)
          return Math.abs(q.x - x) + Math.abs(q.y - y) * 1.8 < 292
        })) continue
        const img = this.add.image(x, y, key).setOrigin(house.originX, house.originY)
        const sc = groundScale(img.width, house) * (0.38 + (ord % 5) * 0.027)
        img.setScale(sc).setDepth(y - 18).setAlpha(0.92)
        if (ord % 4 === 1) img.setTint(0xf0dfc9)
        else if (ord % 4 === 2) img.setTint(0xf7ead6)
        this.filler.push(img)
        ord++
      }
    }
  }

  private drawCoastBuildings() {
    for (const o of this.coastObjects) o.destroy()
    this.coastObjects = []
    const sorted = [...COAST_SLOTS].sort((a, b) => a.screen.x - b.screen.x)
    sorted.forEach((slot, i) => {
      const q = this.slotP(slot)
      const key = i === 1 ? 'proto-liman' : 'proto-tersane'
      if (this.textures.exists('b_pier')) {
        const pier = this.add.image(q.x, q.y + 92, 'b_pier').setOrigin(0.5, 0.7).setDepth(q.y + 15).setAlpha(0.96)
        const src = this.textures.get('b_pier').getSourceImage() as HTMLImageElement
        if (src?.width) pier.setDisplaySize(315, 315 * src.height / src.width)
        this.coastObjects.push(pier)
      }
      if (this.textures.exists(key)) {
        const img = this.add.image(q.x, q.y + 40, key).setOrigin(0.5, 1).setDepth(q.y + 115)
        const src = this.textures.get(key).getSourceImage() as HTMLImageElement
        const w = i === 1 ? 410 : 355
        if (src?.width) img.setDisplaySize(w, w * src.height / src.width)
        this.coastObjects.push(img)
      }
      // Liman işçileri: slot değil, yalnız atmosfer.
      for (let k = 0; k < 5; k++) {
        const hamal = this.makePerson(q.x - 105 + k * 52, q.y + 28 + (k % 2) * 24, k % 2 ? 0x6d4833 : 0x4c3b32, 0xd3ad82)
        hamal.setScale(0.86).setDepth(q.y + 260 + k)
        this.coastObjects.push(hamal)
      }
    })
  }

  private drawBuildings() {
    for (const img of this.buildings.values()) img.destroy()
    this.buildings.clear()
    this.shadowLayer?.destroy()
    this.shadowLayer = this.add.graphics().setDepth(-35)

    for (const slot of CITY_SLOTS) {
      const id = this.placements.get(slot.id)
      const a = id ? assetById(id) : undefined
      if (!a) continue
      const key = `proto-b-${id}`
      if (!this.textures.exists(key)) continue
      const q = this.slotP(slot)
      this.shadowLayer.fillStyle(0x263326, id === HALL_BUILDING_ID ? 0.26 : 0.20)
      this.shadowLayer.fillEllipse(q.x + 22, q.y + 18, id === HALL_BUILDING_ID ? 270 : 205, id === HALL_BUILDING_ID ? 88 : 68)
      const img = this.add.image(q.x, q.y, key).setOrigin(a.originX, a.originY)
      const scale = groundScale(img.width, a) * (id === HALL_BUILDING_ID ? 1.37 : 1.08)
      img.setScale(scale).setDepth(q.y + 120)
      this.buildings.set(slot.id, img)
    }
    this.drawDistrictActivity()
  }

  private clearActivity() {
    for (const o of this.activity) o.destroy()
    this.activity = []
  }

  private prop(key: string, x: number, y: number, w: number, depth = y + 80) {
    if (!this.textures.exists(key)) return null
    const src = this.textures.get(key).getSourceImage() as HTMLImageElement
    const img = this.add.image(x, y, key).setOrigin(0.5, 0.8).setDepth(depth)
    if (src?.width) img.setDisplaySize(w, w * src.height / src.width)
    this.activity.push(img)
    return img
  }

  private drawDistrictActivity() {
    this.clearActivity()
    for (const slot of CITY_SLOTS) {
      const id = this.placements.get(slot.id)
      if (!id) continue
      const q = this.slotP(slot)
      if (id === 'carsi') {
        this.prop('b_pazar', q.x - 115, q.y + 42, 118)
        this.prop('b_pazar', q.x + 112, q.y + 46, 110)
        for (let i = 0; i < 5; i++) {
          const p = this.makePerson(q.x - 115 + i * 54, q.y + 70 + (i % 2) * 18, i % 2 ? 0x8a4d37 : 0x4c5f52, 0xd1a37e)
          p.setDepth(q.y + 330 + i)
          this.activity.push(p)
        }
      } else if (id === 'kisla') {
        for (let row = 0; row < 2; row++) for (let col = 0; col < 4; col++) {
          const p = this.makePerson(q.x - 92 + col * 52, q.y + 58 + row * 35, 0x8b302b, 0xc99f7b, true)
          p.setDepth(q.y + 320 + row * 10 + col)
          this.activity.push(p)
        }
      } else if (id === 'ambar') {
        this.prop('d_grain-sacks', q.x - 115, q.y + 52, 76)
        this.prop('d_woodpile', q.x + 112, q.y + 50, 82)
        this.prop('d_haystack', q.x + 35, q.y + 70, 68)
      } else if (id === 'kereste') {
        this.prop('d_woodpile', q.x - 105, q.y + 54, 90)
        this.prop('d_woodpile', q.x + 95, q.y + 66, 74)
        this.prop('d_pine', q.x + 142, q.y - 25, 92, q.y + 40)
      } else if (id === 'medrese') {
        this.prop('d_cypress', q.x - 125, q.y + 8, 72, q.y + 30)
        this.prop('d_cypress-b', q.x + 125, q.y + 8, 72, q.y + 30)
        this.prop('d_well', q.x + 105, q.y + 62, 58)
      } else if (id === 'hamam') {
        this.prop('d_well', q.x - 112, q.y + 55, 62)
        this.prop('d_terracotta-pots', q.x + 112, q.y + 58, 52)
      }
    }
  }

  private makePerson(x: number, y: number, cloth: number, skin: number, soldier = false) {
    const shadow = this.add.ellipse(1, 8, 13, 5, 0x1e2822, 0.28)
    const body = this.add.rectangle(0, 0, soldier ? 10 : 9, soldier ? 18 : 16, cloth, 1)
    body.setStrokeStyle(1, 0x2f241d, 0.58)
    const head = this.add.circle(0, -11, 5, skin, 1)
    head.setStrokeStyle(1, 0x3b2920, 0.65)
    if (soldier) {
      const cap = this.add.rectangle(0, -16, 11, 4, 0x55402e, 1)
      return this.add.container(x, y, [shadow, body, head, cap])
    }
    return this.add.container(x, y, [shadow, body, head])
  }

  private makeCart(x: number, y: number) {
    const horse = this.add.ellipse(-17, -2, 21, 10, 0x70513a, 1)
    const cart = this.add.rectangle(7, 0, 28, 15, 0x8e663e, 1)
    cart.setStrokeStyle(2, 0x493522, 0.8)
    const cargo = this.add.circle(7, -9, 8, 0xb68e56, 1)
    const w1 = this.add.circle(-1, 9, 6, 0x382a20, 1)
    const w2 = this.add.circle(16, 9, 6, 0x382a20, 1)
    return this.add.container(x, y, [horse, cart, cargo, w1, w2])
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
    if (!paths.length) return
    for (let i = 0; i < 42; i++) {
      const path = paths[(i * 7 + 3) % paths.length]
      const t = this.rng()
      const p = path.getPoint(t)
      const cloth = i % 9 === 0 ? 0x9b382e : i % 5 === 0 ? 0x416a61 : i % 3 === 0 ? 0x6b513e : 0x4b4034
      const obj = this.makePerson(p.x, p.y, cloth, 0xd0a27b, i % 11 === 0).setDepth(p.y + 520)
      obj.setScale(0.86 + this.rng() * 0.22)
      this.walkers.push({ obj, path, t, speed: 0.022 + this.rng() * 0.034, phase: this.rng() * Math.PI * 2 })
    }

    for (let i = 0; i < 5; i++) {
      const path = paths[(i * 13 + 8) % paths.length]
      const t = this.rng()
      const p = path.getPoint(t)
      const obj = this.makeCart(p.x, p.y).setDepth(p.y + 500).setScale(0.88)
      this.carts.push({ obj, path, t, speed: 0.010 + i * 0.0015 })
    }

    // Liman ağzında hareketli küçük/büyük gemiler.
    const ships = [
      { key: 's_fishing', y: 1250, x: -2200, to: 1850, w: 120, d: 39000 },
      { key: 's_ship-a', y: 1440, x: -1760, to: 2100, w: 205, d: 52000 },
      { key: 's_ship-b', y: 1650, x: 2050, to: -1900, w: 185, d: 59000 },
    ]
    ships.forEach((s, i) => {
      if (!this.textures.exists(s.key)) return
      const ship = this.add.image(s.x, s.y, s.key).setDepth(s.y + 20).setAlpha(0.94)
      const src = this.textures.get(s.key).getSourceImage() as HTMLImageElement
      if (src?.width) ship.setDisplaySize(s.w, s.w * src.height / src.width)
      if (i === 2) ship.setFlipX(true)
      this.tweens.add({ targets: ship, x: s.to, y: s.y + (i - 1) * 50, duration: s.d, yoyo: true, repeat: -1, ease: 'Sine.inOut' })
    })
  }

  private spawnSmoke() {
    const slots = CITY_SLOTS.filter((_, i) => i % 4 === 1).slice(0, 8)
    slots.forEach((slot, i) => {
      const q = this.slotP(slot)
      for (let k = 0; k < 3; k++) {
        const dot = this.add.circle(q.x + 35 + k * 7, q.y - 158, 10 + k * 4, 0xe9e2d3, 0.25).setDepth(q.y + 85)
        this.puffs.push({ dot, x: q.x + 35 + k * 7, baseY: q.y - 158, phase: i * 0.63 + k * 0.27, speed: 0.00015 + k * 0.000035 })
      }
    })
  }

  private overviewRect() { return { x: -2520, y: -1470, w: 5040, h: 3300 } }

  private setupCamera() {
    const wr = this.overviewRect()
    this.cameras.main.setBounds(wr.x, wr.y, wr.w, wr.h)
    const fit = Math.min(this.scale.width / wr.w, this.scale.height / wr.h) * 0.98
    this.minZoom = Math.max(0.06, fit)
    this.cityZoom = Math.max(this.minZoom * 2.3, 0.18)
    this.setOverview()
  }

  setOverview() {
    const r = this.overviewRect()
    const z = Math.min(this.scale.width / r.w, this.scale.height / r.h) * 0.98
    this.cameras.main.setZoom(Phaser.Math.Clamp(z, this.minZoom, this.maxZoom))
    this.cameras.main.centerOn(0, 105)
  }

  setCityView() {
    this.cameras.main.setZoom(Phaser.Math.Clamp(this.cityZoom, this.minZoom, this.maxZoom))
    this.cameras.main.centerOn(0, 150)
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
    this.onInfo?.('Yerleşim karıştırıldı. Canlı oyun/save değişmedi.')
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
    for (const w of this.walkers) w.obj.setVisible(on)
    for (const c of this.carts) c.obj.setVisible(on)
    for (const p of this.puffs) p.dot.setVisible(on)
    this.onInfo?.(on ? 'Şehir yaşamı açık.' : 'Hareketli şehir katmanı kapalı.')
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
    this.selection.fillStyle(0xf2c761, 0.12)
    this.selection.fillPoints([
      new Phaser.Math.Vector2(q.x, q.y - SLOT_H / 2),
      new Phaser.Math.Vector2(q.x + SLOT_W / 2, q.y),
      new Phaser.Math.Vector2(q.x, q.y + SLOT_H / 2),
      new Phaser.Math.Vector2(q.x - SLOT_W / 2, q.y),
    ], true)
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
        this.onInfo?.('Belediye sabit merkezdir; sandbox içinde de taşınmaz.')
        return
      }
      this.placements.set(slot.id, this.active)
      this.selectedSlot = slot.id
      this.drawBuildings()
      this.drawSelection()
      this.onInfo?.(`${assetById(this.active)?.name ?? this.active} → ${slot.id}. Yalnız prototip belleğinde.`)
    })

    this.input.on('wheel', (_p: Phaser.Input.Pointer, _go: unknown[], _dx: number, dy: number) => {
      const cam = this.cameras.main
      cam.setZoom(clampZoom(cam.zoom * (dy > 0 ? 0.90 : 1.10)))
    })
  }

  update(time: number, delta: number) {
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
      const next = w.path.getPoint(Math.min(1, w.t + 0.01))
      w.obj.setPosition(p.x, p.y + Math.sin(time * 0.006 + w.phase) * 2).setDepth(p.y + 520)
      const sx = next.x < p.x ? -Math.abs(w.obj.scaleX) : Math.abs(w.obj.scaleX)
      w.obj.setScale(sx, Math.abs(w.obj.scaleY))
    }
    for (let i = 0; i < this.carts.length; i++) {
      const c = this.carts[i]
      c.t += c.speed * (delta / 1000)
      if (c.t >= 1) {
        c.t = 0
        c.path = paths[(i * 17 + Math.floor(this.rng() * paths.length)) % paths.length]
      }
      const p = c.path.getPoint(c.t)
      const n = c.path.getPoint(Math.min(1, c.t + 0.012))
      c.obj.setPosition(p.x, p.y).setDepth(p.y + 500)
      c.obj.setScale(n.x < p.x ? -0.88 : 0.88, 0.88)
    }
    for (const p of this.puffs) {
      const t = ((time * p.speed + p.phase) % 1)
      p.dot.setPosition(p.x + Math.sin(t * Math.PI * 2) * 17, p.baseY - t * 125)
      p.dot.setAlpha((1 - t) * 0.28)
      p.dot.setScale(0.68 + t * 0.9)
    }
  }
}
