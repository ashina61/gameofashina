import * as Phaser from 'phaser'
import { preloadTerrain } from '@/lib/game/city-map/terrain-builder'

type M = { u: number; v: number; h?: number }
type Wave = { go: Phaser.GameObjects.Ellipse; x: number; y: number; phase: number; speed: number; amp: number }
type Flow = { go: Phaser.GameObjects.Ellipse; t: number; speed: number; lane: number }

const WORLD = { x: -3200, y: -1850, w: 6400, h: 3600 }
const ISO_X = 0.82
const ISO_Y = 0.34
const HEIGHT = 1.0

const LAND: M[] = [
  { u: -1650, v: -520 }, { u: -1080, v: -1240 }, { u: -220, v: -1510 },
  { u: 720, v: -1370 }, { u: 1490, v: -760 }, { u: 1770, v: 120 },
  { u: 1390, v: 900 }, { u: 480, v: 1320 }, { u: -480, v: 1270 },
  { u: -1370, v: 760 }, { u: -1770, v: 40 },
]

const RIVER_MAP: M[] = [
  { u: -1280, v: -760 }, { u: -1040, v: -500 }, { u: -820, v: -190 },
  { u: -520, v: 80 }, { u: -170, v: 310 }, { u: 170, v: 520 },
  { u: 480, v: 740 }, { u: 720, v: 930 },
]

const project = (p: M) => ({
  x: (p.u - p.v) * ISO_X,
  y: (p.u + p.v) * ISO_Y - (p.h ?? 0) * HEIGHT,
})

const vec = (p: M) => {
  const q = project(p)
  return new Phaser.Math.Vector2(q.x, q.y)
}

export class CityBaseV2Scene extends Phaser.Scene {
  onInfo?: (text: string) => void

  private waves: Wave[] = []
  private flows: Flow[] = []
  private riverPath = new Phaser.Curves.Spline(RIVER_MAP.map(vec))
  private minZoom = .2
  private maxZoom = 1.22
  private cityZoom = .58
  private dragStart: { x: number; y: number; sx: number; sy: number } | null = null
  private pinch: { dist: number; zoom: number } | null = null

  constructor(key = 'city-base-v2') { super(key) }

  preload() { preloadTerrain(this) }

  create() {
    this.cameras.main.setBackgroundColor('#143f50')
    this.drawAtmosphere()
    this.drawSea()
    this.drawMainLand()
    this.drawRaisedTerrain()
    this.drawGroundTexture()
    this.drawRiver()
    this.drawRoads()
    this.drawForests()
    this.drawHarbour()
    this.spawnSeaMotion()
    this.spawnRiverFlow()
    this.setupCamera()
    this.installInput()
    this.onInfo?.('CITY BASE V2 · izometrik 2.5D dünya · bina/slot yok.')
  }

  private polygon(points: M[], h = 0) {
    return points.map(p => vec({ ...p, h }))
  }

  private drawAtmosphere() {
    const far = this.add.graphics().setDepth(-1500).setScrollFactor(.72)
    far.fillStyle(0x173f4b, 1).fillRect(-4300, -2600, 8600, 5200)
    const layers = [
      { y: -1120, c: 0x34595a, a: .95, sf: .58 },
      { y: -980, c: 0x43685d, a: .95, sf: .68 },
      { y: -830, c: 0x557762, a: .92, sf: .78 },
    ]
    layers.forEach((l, band) => {
      const g = this.add.graphics().setDepth(-1450 + band).setScrollFactor(l.sf)
      const pts = [new Phaser.Math.Vector2(-3900, l.y)]
      for (let x = -3700; x <= 3700; x += 320) {
        const y = l.y - Math.sin(x * .0024 + band) * (120 - band * 18) - Math.cos(x * .005 + band * .7) * 60
        pts.push(new Phaser.Math.Vector2(x, y))
      }
      pts.push(new Phaser.Math.Vector2(3900, 700), new Phaser.Math.Vector2(-3900, 700))
      g.fillStyle(l.c, l.a).fillPoints(pts, true)
    })
  }

  private drawSea() {
    const g = this.add.graphics().setDepth(-1300)
    g.fillStyle(0x174e60, 1).fillRect(WORLD.x, -200, WORLD.w, WORLD.h)
    g.fillStyle(0x2b7885, .78).fillRect(WORLD.x, 430, WORLD.w, 520)
    g.fillStyle(0x4b9a99, .62).fillRect(WORLD.x, 250, WORLD.w, 320)
    g.fillStyle(0x79bbb0, .25).fillRect(WORLD.x, 180, WORLD.w, 170)
  }

  private drawMainLand() {
    const top = this.polygon(LAND, 0)
    const drop1 = top.map(p => new Phaser.Math.Vector2(p.x + 20, p.y + 125))
    const drop2 = top.map(p => new Phaser.Math.Vector2(p.x + 8, p.y + 68))
    const shadow = this.add.graphics().setDepth(-1190)
    shadow.fillStyle(0x0c2930, .36).fillPoints(top.map(p => new Phaser.Math.Vector2(p.x + 80, p.y + 175)), true)
    const land = this.add.graphics().setDepth(-1180)
    land.fillStyle(0x514a3a, 1).fillPoints(drop1, true)
    land.fillStyle(0x82745a, 1).fillPoints(drop2, true)
    land.fillStyle(0x789b58, 1).fillPoints(top, true)
    land.lineStyle(12, 0xd6c395, .65).strokePoints(top, true)
    const cliff = this.add.graphics().setDepth(-1170)
    cliff.lineStyle(5, 0x493f33, .25)
    for (let i = 0; i < top.length; i++) {
      const a = top[i], b = top[(i + 1) % top.length]
      if ((a.y + b.y) / 2 < 180) continue
      for (let t = .1; t < 1; t += .12) {
        const x = Phaser.Math.Linear(a.x, b.x, t)
        const y = Phaser.Math.Linear(a.y, b.y, t)
        cliff.lineBetween(x, y + 16, x + 8, y + 82)
      }
    }
  }

  private raisedPatch(points: M[], height: number, topColor: number, sideColor: number, depth: number) {
    const bottom = this.polygon(points, 0)
    const top = this.polygon(points, height)
    const g = this.add.graphics().setDepth(depth)
    g.fillStyle(0x1a261e, .20).fillPoints(bottom.map(p => new Phaser.Math.Vector2(p.x + 34, p.y + 50)), true)
    g.fillStyle(sideColor, 1).fillPoints(bottom, true)
    g.fillStyle(topColor, 1).fillPoints(top, true)
    g.lineStyle(8, 0xc3b184, .26).strokePoints(top, true)
    return top
  }

  private drawRaisedTerrain() {
    this.raisedPatch([
      { u: -820, v: -500 }, { u: -180, v: -860 }, { u: 620, v: -690 },
      { u: 1010, v: -120 }, { u: 760, v: 500 }, { u: 100, v: 760 },
      { u: -620, v: 540 }, { u: -980, v: 30 },
    ], 72, 0x88a45e, 0x6a7450, -1110)
    this.raisedPatch([
      { u: -1490, v: -690 }, { u: -1180, v: -1080 }, { u: -700, v: -1110 },
      { u: -430, v: -760 }, { u: -700, v: -420 }, { u: -1180, v: -360 },
    ], 155, 0x637d4d, 0x4c5e42, -1090)
    this.raisedPatch([
      { u: -1330, v: -760 }, { u: -1080, v: -990 }, { u: -770, v: -960 },
      { u: -640, v: -730 }, { u: -900, v: -560 },
    ], 235, 0x536a45, 0x414f3c, -1080)
    this.raisedPatch([
      { u: 780, v: -820 }, { u: 1210, v: -690 }, { u: 1470, v: -300 },
      { u: 1290, v: 80 }, { u: 930, v: 40 }, { u: 650, v: -300 },
    ], 128, 0x657f4d, 0x4f6244, -1095)
  }

  private drawGroundTexture() {
    const rnd = new Phaser.Math.RandomDataGenerator(['city-base-v2-ground'])
    const keys = ['t_grass', 't_grass-shade', 't_grass-dry', 't_dirt']
    for (let i = 0; i < 42; i++) {
      const key = keys[i % keys.length]
      if (!this.textures.exists(key)) continue
      const p = vec({ u: rnd.integerInRange(-1250, 1250), v: rnd.integerInRange(-850, 850), h: i % 5 === 0 ? 72 : 0 })
      const img = this.add.image(p.x, p.y, key).setDepth(-1060 + p.y * .001).setAlpha(key === 't_dirt' ? .08 : .13)
      const src = this.textures.get(key).getSourceImage() as HTMLImageElement
      if (!src?.width) continue
      const w = rnd.integerInRange(520, 980)
      img.setDisplaySize(w, w * src.height / src.width * .62)
      img.setAngle(rnd.realInRange(-9, 9))
      img.setBlendMode(Phaser.BlendModes.MULTIPLY)
    }
  }

  private drawRiver() {
    const g = this.add.graphics().setDepth(-920)
    g.lineStyle(120, 0x394d46, .30); this.riverPath.draw(g, 90)
    g.lineStyle(104, 0xbba979, .55); this.riverPath.draw(g, 90)
    g.lineStyle(82, 0x397d86, 1); this.riverPath.draw(g, 100)
    g.lineStyle(62, 0x55a1a1, .94); this.riverPath.draw(g, 100)
    g.lineStyle(14, 0xa4d2c6, .22); this.riverPath.draw(g, 100)
    const mouth = project({ u: 760, v: 960 })
    g.fillStyle(0x5ba5a2, .78).fillEllipse(mouth.x, mouth.y, 480, 150)
    g.fillStyle(0x83c2b6, .18).fillEllipse(mouth.x + 20, mouth.y + 24, 760, 220)
    const b = project({ u: -410, v: 100, h: 16 })
    const bridge = this.add.graphics().setDepth(-720)
    bridge.fillStyle(0x4f463a, .35).fillRoundedRect(b.x - 150, b.y + 24, 310, 74, 20)
    bridge.fillStyle(0x9b8a70, 1).fillRoundedRect(b.x - 156, b.y - 12, 312, 72, 20)
    bridge.lineStyle(7, 0xd0b995, .75).strokeRoundedRect(b.x - 156, b.y - 12, 312, 72, 20)
    for (let x = b.x - 120; x <= b.x + 120; x += 48) bridge.lineStyle(3, 0x66594a, .48).lineBetween(x, b.y - 3, x, b.y + 48)
  }

  private roadCurve(points: M[], width: number, depth: number) {
    const curve = new Phaser.Curves.Spline(points.map(p => vec({ ...p, h: 75 })))
    const g = this.add.graphics().setDepth(depth)
    g.lineStyle(width + 18, 0x5e4f3d, .24); curve.draw(g, 80)
    g.lineStyle(width, 0xb59f75, .92); curve.draw(g, 80)
    g.lineStyle(4, 0xe0cda4, .28); curve.draw(g, 80)
  }

  private drawRoads() {
    this.roadCurve([
      { u: -1210, v: 230 }, { u: -820, v: 120 }, { u: -380, v: -20 }, { u: 70, v: -80 },
      { u: 480, v: 20 }, { u: 860, v: 220 }, { u: 1180, v: 510 },
    ], 46, -800)
    this.roadCurve([
      { u: -620, v: -720 }, { u: -410, v: -430 }, { u: -210, v: -150 }, { u: 20, v: 40 },
      { u: 250, v: 280 }, { u: 520, v: 590 }, { u: 720, v: 850 },
    ], 40, -798)
    this.roadCurve([
      { u: 360, v: -720 }, { u: 480, v: -430 }, { u: 430, v: -140 }, { u: 560, v: 120 },
      { u: 820, v: 330 }, { u: 1080, v: 520 },
    ], 30, -797)
    const p = project({ u: 0, v: 0, h: 78 })
    const plaza = this.add.graphics().setDepth(-790)
    plaza.fillStyle(0xb9a37b, .95).fillEllipse(p.x, p.y, 560, 250)
    plaza.lineStyle(9, 0x826f58, .52).strokeEllipse(p.x, p.y, 560, 250)
  }

  private drawForests() {
    const keys = ['d_olive-tree', 'd_cypress', 'd_pine', 'd_plane-tree', 'd_poplar', 'd_bush']
    const rnd = new Phaser.Math.RandomDataGenerator(['city-base-v2-forest'])
    const clusters = [
      { u: -1120, v: -760, ru: 410, rv: 300, h: 235, n: 58 },
      { u: 1050, v: -470, ru: 360, rv: 270, h: 128, n: 48 },
      { u: -1160, v: 520, ru: 300, rv: 260, h: 0, n: 35 },
      { u: 1190, v: 520, ru: 300, rv: 240, h: 0, n: 34 },
    ]
    for (const c of clusters) for (let i = 0; i < c.n; i++) {
      const a = rnd.realInRange(0, Math.PI * 2)
      const r = Math.sqrt(rnd.frac())
      const m = { u: c.u + Math.cos(a) * c.ru * r, v: c.v + Math.sin(a) * c.rv * r, h: c.h }
      const p = project(m)
      const key = keys[rnd.integerInRange(0, keys.length - 1)]
      if (!this.textures.exists(key)) continue
      const shadow = this.add.ellipse(p.x + 16, p.y + 8, 58, 18, 0x1f2d23, .22).setDepth(p.y - 1)
      shadow.setRotation(-.18)
      const img = this.add.image(p.x, p.y, key).setOrigin(.5, .9).setDepth(p.y + 2)
      const src = this.textures.get(key).getSourceImage() as HTMLImageElement
      if (!src?.width) continue
      const w = rnd.integerInRange(72, 124)
      img.setDisplaySize(w, w * src.height / src.width)
      img.setAlpha(rnd.realInRange(.88, 1))
    }
  }

  private drawHarbour() {
    const c = project({ u: 880, v: 820, h: 10 })
    const g = this.add.graphics().setDepth(-690)
    g.fillStyle(0x5d9e9a, .20).fillEllipse(c.x, c.y + 45, 1250, 280)
    g.lineStyle(52, 0x796d5a, .75)
    g.beginPath(); g.moveTo(c.x - 520, c.y - 20); g.lineTo(c.x - 210, c.y + 30); g.lineTo(c.x + 120, c.y + 8); g.lineTo(c.x + 470, c.y - 80); g.strokePath()
    g.lineStyle(32, 0xb7a789, .96)
    g.beginPath(); g.moveTo(c.x - 520, c.y - 20); g.lineTo(c.x - 210, c.y + 30); g.lineTo(c.x + 120, c.y + 8); g.lineTo(c.x + 470, c.y - 80); g.strokePath()
    for (const dx of [-250, 20, 290]) {
      g.fillStyle(0xa79579, .86).fillEllipse(c.x + dx, c.y - 55, 220, 94)
      g.lineStyle(5, 0xd4c3a2, .42).strokeEllipse(c.x + dx, c.y - 55, 220, 94)
    }
  }

  private spawnSeaMotion() {
    const rnd = new Phaser.Math.RandomDataGenerator(['city-base-v2-sea'])
    for (let i = 0; i < 130; i++) {
      const x = rnd.integerInRange(-3000, 3000)
      const y = rnd.integerInRange(470, 1550)
      const go = this.add.ellipse(x, y, rnd.integerInRange(45, 140), rnd.integerInRange(3, 7), 0xc4e5dc, rnd.realInRange(.07, .22)).setDepth(-650)
      this.waves.push({ go, x, y, phase: rnd.realInRange(0, Math.PI * 2), speed: rnd.realInRange(.0003, .00068), amp: rnd.realInRange(12, 38) })
    }
  }

  private spawnRiverFlow() {
    for (let i = 0; i < 38; i++) {
      const t = i / 38
      const p = this.riverPath.getPoint(t)
      const go = this.add.ellipse(p.x, p.y, 28, 6, 0xd0e9df, .30).setDepth(-670)
      this.flows.push({ go, t, speed: .021 + (i % 6) * .003, lane: (i % 3 - 1) * 15 })
    }
  }

  private setupCamera() {
    const cam = this.cameras.main
    cam.setBounds(WORLD.x, WORLD.y, WORLD.w, WORLD.h)
    const fit = Math.min(this.scale.width / 5100, this.scale.height / 2500) * .95
    this.minZoom = Math.max(.18, fit)
    this.cityZoom = Math.max(this.minZoom * 1.85, .54)
    if (this.scale.height > this.scale.width * 1.25) this.setCityView()
    else this.setOverview()
  }

  setOverview() {
    const cam = this.cameras.main
    const z = Math.min(this.scale.width / 5100, this.scale.height / 2500) * .95
    cam.setZoom(Phaser.Math.Clamp(z, this.minZoom, this.maxZoom))
    cam.centerOn(0, 40)
  }

  setCityView() {
    const cam = this.cameras.main
    cam.setZoom(Phaser.Math.Clamp(this.cityZoom, this.minZoom, this.maxZoom))
    cam.centerOn(0, 40)
  }

  focusRiver() {
    this.cameras.main.setZoom(Phaser.Math.Clamp(this.cityZoom * 1.08, this.minZoom, this.maxZoom))
    this.cameras.main.centerOn(-220, 50)
  }

  focusHarbour() {
    const p = project({ u: 880, v: 820 })
    this.cameras.main.setZoom(Phaser.Math.Clamp(this.cityZoom * 1.12, this.minZoom, this.maxZoom))
    this.cameras.main.centerOn(p.x, p.y)
  }

  private installInput() {
    this.input.addPointer(1)
    const gap = () => Phaser.Math.Distance.Between(this.input.pointer1.x, this.input.pointer1.y, this.input.pointer2.x, this.input.pointer2.y)
    const clamp = (z: number) => Phaser.Math.Clamp(z, this.minZoom, this.maxZoom)
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
        cam.setZoom(clamp(this.pinch.zoom * gap() / this.pinch.dist)); return
      }
      if (!p.isDown || !this.dragStart) return
      cam.scrollX = this.dragStart.sx - (p.x - this.dragStart.x) / cam.zoom
      cam.scrollY = this.dragStart.sy - (p.y - this.dragStart.y) / cam.zoom
    })
    this.input.on('pointerup', () => {
      if (!(this.input.pointer1.isDown && this.input.pointer2.isDown)) this.pinch = null
      this.dragStart = null
    })
    this.input.on('wheel', (_p: Phaser.Input.Pointer, _go: unknown[], _dx: number, dy: number) => {
      const cam = this.cameras.main
      cam.setZoom(clamp(cam.zoom * (dy > 0 ? .91 : 1.1)))
    })
  }

  update(time: number, delta: number) {
    for (const w of this.waves) {
      const t = time * w.speed + w.phase
      w.go.setPosition(w.x + Math.sin(t) * w.amp, w.y + Math.cos(t * .7) * 6)
      w.go.setAlpha(.08 + (Math.sin(t * 1.6) + 1) * .055)
    }
    for (const f of this.flows) {
      f.t = (f.t + f.speed * delta / 1000) % 1
      const p = this.riverPath.getPoint(f.t)
      const q = this.riverPath.getPoint(Math.min(.999, f.t + .006))
      const dx = q.x - p.x, dy = q.y - p.y, len = Math.max(1, Math.hypot(dx, dy))
      const nx = -dy / len, ny = dx / len
      f.go.setPosition(p.x + nx * f.lane, p.y + ny * f.lane)
      f.go.setRotation(Math.atan2(dy, dx))
      f.go.setAlpha(.18 + Math.sin(time * .002 + f.t * 17) * .08)
    }
  }
}
