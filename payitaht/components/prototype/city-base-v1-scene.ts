import * as Phaser from 'phaser'
import { preloadTerrain } from '@/lib/game/city-map/terrain-builder'

type Pt = { x: number; y: number }
type WaterGlint = { go: Phaser.GameObjects.Ellipse; baseX: number; baseY: number; amp: number; speed: number; phase: number }
type RiverSpark = { go: Phaser.GameObjects.Ellipse; t: number; speed: number; lane: number }

const WORLD = { x: -2700, y: -1850, w: 5400, h: 3500 }
const SEA_TOP = 930

const RIVER_POINTS = [
  new Phaser.Math.Vector2(-1830, -1190),
  new Phaser.Math.Vector2(-1420, -910),
  new Phaser.Math.Vector2(-1210, -510),
  new Phaser.Math.Vector2(-840, -210),
  new Phaser.Math.Vector2(-460, 80),
  new Phaser.Math.Vector2(-170, 330),
  new Phaser.Math.Vector2(110, 560),
  new Phaser.Math.Vector2(330, 800),
  new Phaser.Math.Vector2(410, 1035),
]

/**
 * CITY BASE V1
 * ------------
 * Sadece dünya/arka plan deneyi. Canlı oyunun slot, ekonomi, bina, save ve
 * render koduna dokunmaz. Amaç önce "üzerine şehir kurulacak yaşayan 2.5D arazi"
 * hissini çözmek: geniş pan/zoom, katmanlı topoğrafya, akan nehir ve hareketli deniz.
 */
export class CityBaseV1Scene extends Phaser.Scene {
  onInfo?: (text: string) => void

  private waterGlints: WaterGlint[] = []
  private riverSparks: RiverSpark[] = []
  private riverPath = new Phaser.Curves.Spline(RIVER_POINTS)
  private minZoom = 0.24
  private maxZoom = 1.18
  private cityZoom = 0.48
  private dragStart: { x: number; y: number; sx: number; sy: number } | null = null
  private pinch: { dist: number; zoom: number } | null = null

  constructor() { super('city-base-v1') }

  preload() {
    preloadTerrain(this)
  }

  create() {
    this.cameras.main.setBackgroundColor('#123d50')
    this.drawFarBackdrop()
    this.drawSea()
    this.drawLandMass()
    this.drawCliffsAndRidges()
    this.drawRiver()
    this.drawRoadSkeleton()
    this.drawForestMasses()
    this.drawHarbourCove()
    this.spawnWaterMotion()
    this.spawnRiverMotion()
    this.setupCamera()
    this.installInput()
    this.onInfo?.('CITY BASE V1 · yalnız dünya tabanı · sürükle ve pinch ile gez.')
  }

  private drawFarBackdrop() {
    const far = this.add.graphics().setDepth(-1200).setScrollFactor(0.72)
    far.fillStyle(0x214c53, 1).fillRect(-3600, -2400, 7200, 5200)

    // Uzak silüetler; kamera hareketinde daha yavaş kayarak derinlik verir.
    const mountainColors = [0x385f58, 0x476e5d, 0x557861]
    for (let band = 0; band < 3; band++) {
      far.fillStyle(mountainColors[band], 1)
      const pts: Phaser.Math.Vector2[] = [new Phaser.Math.Vector2(-3400, -1030 + band * 140)]
      for (let x = -3300; x <= 3300; x += 380) {
        const y = -1080 + band * 145 - Math.sin((x + band * 430) * 0.0024) * (120 - band * 18) - Math.cos(x * 0.0047) * 70
        pts.push(new Phaser.Math.Vector2(x, y))
      }
      pts.push(new Phaser.Math.Vector2(3400, 800), new Phaser.Math.Vector2(-3400, 800))
      far.fillPoints(pts, true)
    }
  }

  private drawSea() {
    const sea = this.add.graphics().setDepth(-1100)
    sea.fillStyle(0x174f61, 1).fillRect(WORLD.x, SEA_TOP, WORLD.w, WORLD.h)

    const bands = [
      { y: SEA_TOP, h: 210, c: 0x5fa6a1, a: .92 },
      { y: SEA_TOP + 180, h: 300, c: 0x3e8d91, a: .82 },
      { y: SEA_TOP + 430, h: 360, c: 0x287585, a: .90 },
      { y: SEA_TOP + 730, h: 750, c: 0x174f61, a: 1 },
    ]
    bands.forEach(b => sea.fillStyle(b.c, b.a).fillRect(WORLD.x, b.y, WORLD.w, b.h))

    // Kıyıya yaklaşırken yumuşak sığlık lekeleri.
    sea.fillStyle(0x7bc1b4, .20)
    sea.fillEllipse(-1320, 1040, 1650, 330)
    sea.fillEllipse(260, 1010, 2050, 360)
    sea.fillEllipse(1610, 1110, 1100, 260)
  }

  private landShape() {
    return [
      new Phaser.Math.Vector2(-2460, -1420),
      new Phaser.Math.Vector2(-1870, -1620),
      new Phaser.Math.Vector2(-1120, -1530),
      new Phaser.Math.Vector2(-390, -1650),
      new Phaser.Math.Vector2(420, -1460),
      new Phaser.Math.Vector2(1130, -1320),
      new Phaser.Math.Vector2(1820, -930),
      new Phaser.Math.Vector2(2230, -410),
      new Phaser.Math.Vector2(2350, 210),
      new Phaser.Math.Vector2(2110, 660),
      new Phaser.Math.Vector2(1670, 850),
      new Phaser.Math.Vector2(1170, 770),
      new Phaser.Math.Vector2(760, 900),
      new Phaser.Math.Vector2(360, 840),
      new Phaser.Math.Vector2(-80, 740),
      new Phaser.Math.Vector2(-520, 850),
      new Phaser.Math.Vector2(-1020, 760),
      new Phaser.Math.Vector2(-1490, 910),
      new Phaser.Math.Vector2(-2010, 690),
      new Phaser.Math.Vector2(-2350, 230),
      new Phaser.Math.Vector2(-2500, -410),
    ]
  }

  private drawLandMass() {
    const land = this.add.graphics().setDepth(-1000)
    const shape = this.landShape()

    // Önce koyu alt yüzey: 2.5D uçurum kalınlığı.
    land.fillStyle(0x655b44, 1)
    land.fillPoints(shape.map(p => new Phaser.Math.Vector2(p.x + 24, p.y + 105)), true)
    land.fillStyle(0x8d805d, 1)
    land.fillPoints(shape.map(p => new Phaser.Math.Vector2(p.x + 10, p.y + 58)), true)

    // Ana toprak.
    land.fillStyle(0x789a56, 1)
    land.fillPoints(shape, true)
    land.lineStyle(20, 0xd6c18b, .58)
    land.strokePoints(shape, true)

    // Büyük organik arazi renkleri; karo/grid yok.
    const patches = this.add.graphics().setDepth(-980)
    const colors = [0x5e8548, 0x88a760, 0x9aa467, 0x6e9251, 0x8f9d5e, 0x557a43]
    const rnd = new Phaser.Math.RandomDataGenerator(['payitaht-city-base-v1'])
    for (let i = 0; i < 44; i++) {
      const x = rnd.integerInRange(-2150, 2100)
      const y = rnd.integerInRange(-1320, 620)
      const rx = rnd.integerInRange(260, 720)
      const ry = rnd.integerInRange(130, 350)
      patches.fillStyle(colors[i % colors.length], rnd.realInRange(.035, .09))
      patches.fillEllipse(x, y, rx * 2, ry * 2)
    }

    // Geniş şehir platosu: slot çizmeden, sadece inşa edilebilir doğal düzlük.
    patches.fillStyle(0xa9a36e, .10)
    patches.fillEllipse(80, -150, 2780, 1320)
  }

  private drawCliffsAndRidges() {
    const g = this.add.graphics().setDepth(-930)

    // Kuzeybatı yüksek arazisi.
    g.fillStyle(0x617948, .68)
    g.fillEllipse(-1550, -990, 1350, 610)
    g.fillStyle(0x50663f, .72)
    g.fillEllipse(-1760, -1100, 820, 390)
    g.lineStyle(26, 0x7e7357, .62)
    g.beginPath(); g.moveTo(-2290, -770); g.lineTo(-1970, -920); g.lineTo(-1620, -850); g.lineTo(-1320, -940); g.lineTo(-940, -760); g.strokePath()
    g.lineStyle(8, 0xb5a57c, .36)
    g.beginPath(); g.moveTo(-2270, -790); g.lineTo(-1940, -940); g.lineTo(-1600, -870); g.lineTo(-1300, -960); g.lineTo(-930, -780); g.strokePath()

    // Doğu sırtları.
    g.fillStyle(0x657f4a, .52)
    g.fillEllipse(1540, -670, 1120, 520)
    g.lineStyle(18, 0x756b52, .46)
    g.beginPath(); g.moveTo(1130, -760); g.lineTo(1420, -880); g.lineTo(1710, -770); g.lineTo(2050, -590); g.strokePath()

    // Şehir merkezi çevresinde çok hafif teras basamakları.
    g.lineStyle(6, 0xd4c08d, .17)
    g.strokeEllipse(40, -140, 3000, 1260)
    g.strokeEllipse(60, -120, 2520, 1000)
  }

  private drawRiver() {
    const river = this.add.graphics().setDepth(-820)

    // Yatak gölgesi ve toprak kenarı.
    river.lineStyle(132, 0x5f654e, .34)
    this.riverPath.draw(river, 80)
    river.lineStyle(108, 0xd0bd88, .52)
    this.riverPath.draw(river, 80)

    // Su kütlesi katmanları.
    river.lineStyle(88, 0x397f86, 1)
    this.riverPath.draw(river, 100)
    river.lineStyle(66, 0x55a0a0, .88)
    this.riverPath.draw(river, 100)
    river.lineStyle(20, 0x8cc6b9, .25)
    this.riverPath.draw(river, 100)

    // Nehir ağzında delta.
    river.fillStyle(0x55a0a0, .82)
    river.fillEllipse(430, 1005, 420, 180)
    river.fillStyle(0x78bcb0, .24)
    river.fillEllipse(420, 1040, 700, 210)

    // Taş köprü — şimdilik çevresel altyapı, bina değil.
    const bridge = this.add.graphics().setDepth(-700)
    bridge.fillStyle(0x8f806a, 1)
    bridge.fillRoundedRect(-560, -4, 300, 90, 24)
    bridge.lineStyle(8, 0xc7b492, .85)
    bridge.strokeRoundedRect(-560, -4, 300, 90, 24)
    for (let x = -520; x <= -310; x += 52) bridge.lineStyle(3, 0x675c4d, .5).lineBetween(x, 8, x, 70)
  }

  private drawRoadSkeleton() {
    const roads = this.add.graphics().setDepth(-760)
    const path = (pts: Pt[], width: number) => {
      roads.lineStyle(width + 18, 0x6c5a43, .28)
      roads.strokePoints(pts.map(p => new Phaser.Math.Vector2(p.x, p.y)), false)
      roads.lineStyle(width, 0xb6a077, .88)
      roads.strokePoints(pts.map(p => new Phaser.Math.Vector2(p.x, p.y)), false)
      roads.lineStyle(4, 0xd4bf94, .36)
      roads.strokePoints(pts.map(p => new Phaser.Math.Vector2(p.x, p.y)), false)
    }

    // Yalnız altyapı iskeleti; slotlara bağlanmış grid değil.
    path([{ x: -1880, y: -450 }, { x: -1240, y: -230 }, { x: -720, y: -120 }, { x: -120, y: -160 }, { x: 570, y: -90 }, { x: 1320, y: 140 }, { x: 1840, y: 430 }], 56)
    path([{ x: -1050, y: -920 }, { x: -780, y: -590 }, { x: -430, y: -330 }, { x: -120, y: -160 }, { x: 180, y: 90 }, { x: 420, y: 370 }, { x: 700, y: 700 }], 48)
    path([{ x: 220, y: -970 }, { x: 380, y: -610 }, { x: 350, y: -300 }, { x: 560, y: -20 }, { x: 930, y: 190 }, { x: 1260, y: 430 }], 38)

    const plaza = this.add.graphics().setDepth(-750)
    plaza.fillStyle(0xbca67f, .88).fillEllipse(-100, -150, 650, 300)
    plaza.lineStyle(11, 0x89765d, .46).strokeEllipse(-100, -150, 650, 300)
  }

  private drawForestMasses() {
    const keys = ['d_olive-tree', 'd_cypress', 'd_pine', 'd_plane-tree', 'd_poplar', 'd_bush']
    const rnd = new Phaser.Math.RandomDataGenerator(['forest-city-base-v1'])

    const clusters = [
      { x: -1840, y: -1020, rx: 620, ry: 360, n: 58 },
      { x: 1580, y: -720, rx: 570, ry: 330, n: 50 },
      { x: -2050, y: 230, rx: 430, ry: 380, n: 34 },
      { x: 1880, y: 350, rx: 360, ry: 300, n: 30 },
    ]

    for (const c of clusters) {
      for (let i = 0; i < c.n; i++) {
        const a = rnd.realInRange(0, Math.PI * 2)
        const r = Math.sqrt(rnd.frac())
        const x = c.x + Math.cos(a) * c.rx * r
        const y = c.y + Math.sin(a) * c.ry * r
        const key = keys[rnd.integerInRange(0, keys.length - 1)]
        if (!this.textures.exists(key)) continue
        const img = this.add.image(x, y, key).setOrigin(.5, .88).setDepth(y + 20)
        const src = this.textures.get(key).getSourceImage() as HTMLImageElement
        if (!src?.width) continue
        const w = rnd.integerInRange(62, 112)
        img.setDisplaySize(w, w * src.height / src.width)
        img.setAlpha(rnd.realInRange(.84, 1))
      }
    }
  }

  private drawHarbourCove() {
    const h = this.add.graphics().setDepth(-710)
    // Doğal koy ve rıhtım omurgası.
    h.fillStyle(0x527d77, .24).fillEllipse(1020, 890, 1500, 360)
    h.lineStyle(58, 0x8a7d67, .72)
    h.beginPath(); h.moveTo(620, 760); h.lineTo(880, 820); h.lineTo(1160, 800); h.lineTo(1420, 730); h.strokePath()
    h.lineStyle(36, 0xb9a88c, .96)
    h.beginPath(); h.moveTo(620, 760); h.lineTo(880, 820); h.lineTo(1160, 800); h.lineTo(1420, 730); h.strokePath()

    // Üç geniş liman/tersane bölgesi; slot çizgisi değil, zemin hazırlığı.
    for (const x of [760, 1040, 1320]) {
      h.fillStyle(0xa9977c, .78).fillEllipse(x, 735, 250, 110)
      h.lineStyle(6, 0xd2c2a1, .46).strokeEllipse(x, 735, 250, 110)
    }
  }

  private spawnWaterMotion() {
    const rnd = new Phaser.Math.RandomDataGenerator(['sea-motion-v1'])
    for (let i = 0; i < 110; i++) {
      const y = rnd.realInRange(990, 1580)
      const x = rnd.realInRange(-2550, 2550)
      const w = rnd.realInRange(36, 125)
      const go = this.add.ellipse(x, y, w, rnd.realInRange(3, 7), 0xbce2d8, rnd.realInRange(.08, .24)).setDepth(-690)
      this.waterGlints.push({ go, baseX: x, baseY: y, amp: rnd.realInRange(10, 34), speed: rnd.realInRange(.00028, .00062), phase: rnd.realInRange(0, Math.PI * 2) })
    }
  }

  private spawnRiverMotion() {
    for (let i = 0; i < 34; i++) {
      const t = (i / 34 + .03) % 1
      const p = this.riverPath.getPoint(t)
      const go = this.add.ellipse(p.x, p.y, 30, 7, 0xc4e4da, .34).setDepth(-680)
      this.riverSparks.push({ go, t, speed: .022 + (i % 5) * .0035, lane: (i % 3 - 1) * 16 })
    }
  }

  private setupCamera() {
    const cam = this.cameras.main
    cam.setBounds(WORLD.x, WORLD.y, WORLD.w, WORLD.h)
    this.setOverview()
  }

  setOverview() {
    const cam = this.cameras.main
    const z = Math.min(this.scale.width / WORLD.w, this.scale.height / WORLD.h) * .94
    this.minZoom = Math.max(.18, z)
    this.cityZoom = Math.max(this.minZoom * 1.85, .46)
    cam.setZoom(Phaser.Math.Clamp(z, this.minZoom, this.maxZoom))
    cam.centerOn(0, 80)
  }

  setCityView() {
    const cam = this.cameras.main
    cam.setZoom(Phaser.Math.Clamp(this.cityZoom, this.minZoom, this.maxZoom))
    cam.centerOn(-120, -20)
  }

  focusRiver() {
    const cam = this.cameras.main
    cam.setZoom(Phaser.Math.Clamp(this.cityZoom * 1.08, this.minZoom, this.maxZoom))
    cam.centerOn(-300, 120)
  }

  focusHarbour() {
    const cam = this.cameras.main
    cam.setZoom(Phaser.Math.Clamp(this.cityZoom * 1.12, this.minZoom, this.maxZoom))
    cam.centerOn(1050, 760)
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
      cam.scrollX = this.dragStart.sx - (p.x - this.dragStart.x) / cam.zoom
      cam.scrollY = this.dragStart.sy - (p.y - this.dragStart.y) / cam.zoom
    })

    this.input.on('pointerup', () => {
      if (!(this.input.pointer1.isDown && this.input.pointer2.isDown)) this.pinch = null
      this.dragStart = null
    })

    this.input.on('wheel', (_p: Phaser.Input.Pointer, _go: unknown[], _dx: number, dy: number) => {
      const cam = this.cameras.main
      cam.setZoom(clampZoom(cam.zoom * (dy > 0 ? .91 : 1.10)))
    })
  }

  update(time: number, delta: number) {
    for (const w of this.waterGlints) {
      const t = time * w.speed + w.phase
      w.go.x = w.baseX + Math.sin(t) * w.amp
      w.go.y = w.baseY + Math.cos(t * .72) * 7
      w.go.alpha = .10 + (Math.sin(t * 1.7) + 1) * .06
    }

    for (const s of this.riverSparks) {
      s.t = (s.t + s.speed * delta / 1000) % 1
      const p = this.riverPath.getPoint(s.t)
      const ahead = this.riverPath.getPoint(Math.min(.999, s.t + .006))
      const dx = ahead.x - p.x, dy = ahead.y - p.y
      const len = Math.max(1, Math.hypot(dx, dy))
      const nx = -dy / len, ny = dx / len
      s.go.setPosition(p.x + nx * s.lane, p.y + ny * s.lane)
      s.go.setRotation(Math.atan2(dy, dx))
      s.go.setAlpha(.16 + Math.sin(time * .002 + s.t * 19) * .08)
    }
  }
}
