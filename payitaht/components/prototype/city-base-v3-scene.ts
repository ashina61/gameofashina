import * as Phaser from 'phaser'
import { CityBaseV2Scene } from './city-base-v2-scene'
import {
  LAND_VISUAL_ANCHORS,
  COAST_VISUAL_ANCHORS,
  phaseForHallLevel,
  type CityPhase,
  type VisualAnchor,
} from './city-visual-plan'

type Walker = {
  go: Phaser.GameObjects.Arc
  x: number
  y: number
  ampX: number
  ampY: number
  speed: number
  phase: number
}

type BobbingBoat = {
  go: Phaser.GameObjects.Image
  x: number
  y: number
  phase: number
}

const PHASE_LABEL: Record<CityPhase['id'], string> = {
  settlement: 'YERLEŞİM',
  town: 'KASABA',
  city: 'ŞEHİR',
  grandCity: 'BÜYÜK ŞEHİR',
  capital: 'PAYİTAHT',
}

/**
 * CITY BASE V3 — Ikariam'dan alınan ana fikir: motor slotları sabit kalır,
 * şehir zemini Belediye seviyesiyle görsel olarak zenginleşir. Bu sahne yalnız
 * prototip render katmanıdır; LIVE_SLOTS / engine / save verisini değiştirmez.
 */
export class CityBaseV3Scene extends CityBaseV2Scene {
  initialHallLevel = 10

  private hallLevel = 10
  private phaseObjects: Phaser.GameObjects.GameObject[] = []
  private walkers: Walker[] = []
  private boats: BobbingBoat[] = []

  constructor() { super('city-base-v3') }

  create() {
    super.create()
    this.hallLevel = this.initialHallLevel
    this.renderGrowthPhase()
  }

  getHallLevel() { return this.hallLevel }

  setHallLevel(level: number) {
    const next = Phaser.Math.Clamp(Math.floor(Number(level) || 1), 1, 40)
    if (next === this.hallLevel) return
    this.hallLevel = next
    this.renderGrowthPhase()
  }

  private keep<T extends Phaser.GameObjects.GameObject>(go: T): T {
    this.phaseObjects.push(go)
    return go
  }

  private clearPhase() {
    this.walkers = []
    this.boats = []
    for (const go of this.phaseObjects) go.destroy()
    this.phaseObjects = []
  }

  private anchorPoint(anchor: VisualAnchor) {
    // city-visual-plan kendi geniş kompozisyon uzayında tutulur. Bu sahnede
    // adanın merkez platosuna sığdırılır; engine koordinatı değildir.
    return {
      x: anchor.world.x * .43,
      y: anchor.world.y * .39 - 20,
    }
  }

  private renderGrowthPhase() {
    this.clearPhase()
    const phase = phaseForHallLevel(this.hallLevel)

    this.drawUrbanGround(phase)
    this.drawNeighbourhoodFillers(phase)
    this.drawUrbanGreenery(phase)
    this.drawHarbourActivity(phase)
    this.spawnCitizens(phase)

    this.onInfo?.(`BELEDİYE ${this.hallLevel} · ${PHASE_LABEL[phase.id]} · yollar ${phase.roadTier}/5 · mahalle %${Math.round(phase.fillerDensity * 100)} · liman %${Math.round(phase.harbourActivity * 100)}`)
  }

  private drawUrbanGround(phase: CityPhase) {
    const g = this.keep(this.add.graphics().setDepth(-655))
    const tier = phase.roadTier

    // Belediye büyüdükçe meydan taşlaşır fakat bina/slot izi çizilmez.
    const plazaW = 300 + tier * 48
    const plazaH = 126 + tier * 18
    g.fillStyle(tier >= 4 ? 0xb9a98b : 0xab9978, .14 + tier * .035)
    g.fillEllipse(0, -20, plazaW, plazaH)
    g.lineStyle(3 + tier, 0xd7c49f, .10 + tier * .035)
    g.strokeEllipse(0, -20, plazaW, plazaH)

    // 10+ seviyede çevre yolu hissi, 15+ seviyede ikinci halka. Bunlar slot
    // çizgileri değil, mahalle dokusunu birleştiren kesik taş promenadlar.
    if (tier >= 3) {
      g.lineStyle(12 + tier * 2, 0xb5a078, .22)
      g.strokeEllipse(0, 20, 1260, 560)
      g.lineStyle(3, 0xddcba8, .18)
      g.strokeEllipse(0, 20, 1260, 560)
    }
    if (tier >= 4) {
      g.lineStyle(15 + tier * 2, 0xaa9470, .18)
      g.strokeEllipse(0, 30, 2080, 880)
    }

    // Faz yükseldikçe anchor çevresinde doğal avlu taşlaşması oluşur. Anchor
    // merkezleri görünmez; elmas/grid/slot işareti yoktur.
    const pavedCount = Math.round(LAND_VISUAL_ANCHORS.length * phase.fillerDensity)
    LAND_VISUAL_ANCHORS.slice(0, pavedCount).forEach((anchor, i) => {
      if (anchor.engineIndex === 0) return
      const p = this.anchorPoint(anchor)
      const w = 120 + (i % 4) * 18
      const h = 54 + (i % 3) * 10
      g.fillStyle(i % 3 === 0 ? 0xc1b18f : 0xa99574, .06 + tier * .015)
      g.fillEllipse(p.x, p.y + 20, w, h)
    })
  }

  private drawNeighbourhoodFillers(phase: CityPhase) {
    const rnd = new Phaser.Math.RandomDataGenerator([`city-v3-fill-${phase.id}`])
    const active = LAND_VISUAL_ANCHORS.filter(a => a.engineIndex !== 0)
    const anchorCount = Math.max(3, Math.round(active.length * phase.fillerDensity))
    const perAnchor = phase.roadTier <= 1 ? 1 : phase.roadTier <= 3 ? 2 : 3

    active.slice(0, anchorCount).forEach((anchor, anchorIndex) => {
      const center = this.anchorPoint(anchor)
      for (let j = 0; j < perAnchor; j++) {
        // Gerçek bina anchor'ının merkezini boş bırak: dolgu evleri çevresine
        // oturur. İleride hero building bu boş merkeze gelecek.
        const angle = rnd.realInRange(.15, Math.PI * 1.85)
        const radius = rnd.integerInRange(105, 185)
        const x = center.x + Math.cos(angle) * radius
        const y = center.y + Math.sin(angle) * radius * .42
        const scale = rnd.realInRange(.82, 1.12)
        this.drawFillerHouse(x, y, scale, anchorIndex + j, phase.roadTier)
      }
    })

    if (phase.roadTier >= 3 && this.textures.exists('b_pazar')) {
      const img = this.keep(this.add.image(135, 30, 'b_pazar').setOrigin(.5, .86).setDepth(36).setAlpha(.72))
      const src = this.textures.get('b_pazar').getSourceImage() as HTMLImageElement
      if (src?.width) img.setDisplaySize(210, 210 * src.height / src.width)
    }
  }

  private drawFillerHouse(x: number, y: number, scale: number, seed: number, tier: number) {
    const g = this.keep(this.add.graphics().setDepth(y + 5))
    const w = (46 + (seed % 3) * 7) * scale
    const h = (28 + (seed % 2) * 5) * scale
    const wall = tier >= 4 ? 0xd8c7a5 : 0xcbb890
    const roof = seed % 2 ? 0x9b5e43 : 0xa96a49

    g.fillStyle(0x223028, .15).fillEllipse(x + 9, y + 10, w * 1.15, h * .55)
    g.fillStyle(wall, .90).fillRect(x - w / 2, y - h / 2, w, h)
    g.fillStyle(roof, .96)
    g.fillTriangle(x - w * .62, y - h / 2, x + w * .62, y - h / 2, x, y - h * 1.18)
    g.fillStyle(0x594637, .72).fillRect(x - 4, y + 1, 8, h / 2)
    if (tier >= 3) {
      g.fillStyle(0x5b7250, .55).fillCircle(x - w * .62, y + h * .15, 6 * scale)
      g.fillCircle(x + w * .60, y + h * .12, 5 * scale)
    }
  }

  private drawUrbanGreenery(phase: CityPhase) {
    const keys = ['d_cypress', 'd_olive-tree', 'd_bush', 'd_flower', 'd_tulip-clump']
    const rnd = new Phaser.Math.RandomDataGenerator([`city-v3-green-${phase.id}`])
    const count = Math.round(26 * phase.greenery + 6)

    for (let i = 0; i < count; i++) {
      const key = keys[i % keys.length]
      if (!this.textures.exists(key)) continue
      const a = LAND_VISUAL_ANCHORS[1 + (i * 5) % Math.max(1, LAND_VISUAL_ANCHORS.length - 1)]
      const p = this.anchorPoint(a)
      const x = p.x + rnd.integerInRange(-190, 190)
      const y = p.y + rnd.integerInRange(-90, 90)
      const img = this.keep(this.add.image(x, y, key).setOrigin(.5, .9).setDepth(y + 4).setAlpha(.72 + rnd.frac() * .2))
      const src = this.textures.get(key).getSourceImage() as HTMLImageElement
      if (!src?.width) continue
      const w = key === 'd_bush' || key === 'd_flower' || key === 'd_tulip-clump'
        ? rnd.integerInRange(28, 48)
        : rnd.integerInRange(46, 76)
      img.setDisplaySize(w, w * src.height / src.width)
    }

    // Büyük şehirde park/çeşme/pazar dekoru artar; düşük seviyede kır hayatı baskın.
    const civic = phase.roadTier >= 4
      ? ['d_cesme', 'd_stone-bench', 'd_coffee-garden', 'd_tezgah']
      : ['d_well', 'd_woodpile', 'd_haystack']
    civic.forEach((key, i) => {
      if (!this.textures.exists(key)) return
      const x = -260 + i * 170
      const y = 105 + (i % 2) * 55
      const img = this.keep(this.add.image(x, y, key).setOrigin(.5, .85).setDepth(y + 8).setAlpha(.86))
      const src = this.textures.get(key).getSourceImage() as HTMLImageElement
      if (src?.width) img.setDisplaySize(70, 70 * src.height / src.width)
    })
  }

  private drawHarbourActivity(phase: CityPhase) {
    const count = Math.round(1 + phase.harbourActivity * 5)
    const keys = ['s_fishing', 's_ship-a', 's_ship-b']
    const harbourY = 760

    for (let i = 0; i < count; i++) {
      const key = keys[i % keys.length]
      if (!this.textures.exists(key)) continue
      const x = -520 + i * (1040 / Math.max(1, count - 1))
      const y = harbourY + (i % 2) * 78
      const img = this.keep(this.add.image(x, y, key).setOrigin(.5, .72).setDepth(y + 16).setAlpha(.76 + phase.harbourActivity * .18))
      const src = this.textures.get(key).getSourceImage() as HTMLImageElement
      if (src?.width) {
        const w = key === 's_fishing' ? 118 : 178
        img.setDisplaySize(w, w * src.height / src.width)
      }
      this.boats.push({ go: img, x, y, phase: i * .9 })
    }

    // Kıyı anchor'ları yalnız görsel kompozisyon için küçük kargo kümeleriyle
    // çevrelenir; anchor'ın kendisi boş kalır.
    const cargo = this.keep(this.add.graphics().setDepth(705))
    COAST_VISUAL_ANCHORS.forEach(a => {
      const p = this.anchorPoint(a)
      cargo.fillStyle(0x866849, .38 + phase.harbourActivity * .30)
      const n = 1 + Math.round(phase.harbourActivity * 3)
      for (let j = 0; j < n; j++) cargo.fillRect(p.x - 95 + j * 26, p.y + 54 + (j % 2) * 8, 18, 14)
    })
  }

  private spawnCitizens(phase: CityPhase) {
    const count = Math.round(4 + phase.citizenDensity * 28)
    const rnd = new Phaser.Math.RandomDataGenerator([`city-v3-life-${phase.id}`])
    for (let i = 0; i < count; i++) {
      const a = LAND_VISUAL_ANCHORS[(i * 7) % LAND_VISUAL_ANCHORS.length]
      const p = this.anchorPoint(a)
      const x = p.x + rnd.integerInRange(-150, 150)
      const y = p.y + rnd.integerInRange(-65, 65)
      const body = this.keep(this.add.circle(x, y, i % 5 === 0 ? 5 : 4, i % 3 === 0 ? 0x7d3028 : 0x3f4f52, .78).setDepth(y + 20))
      this.walkers.push({
        go: body,
        x,
        y,
        ampX: rnd.integerInRange(25, 85),
        ampY: rnd.integerInRange(8, 24),
        speed: rnd.realInRange(.00025, .00055),
        phase: rnd.realInRange(0, Math.PI * 2),
      })
    }
  }

  update(time: number, delta: number) {
    super.update(time, delta)
    for (const w of this.walkers) {
      const t = time * w.speed + w.phase
      w.go.setPosition(w.x + Math.sin(t) * w.ampX, w.y + Math.sin(t * .63) * w.ampY)
      w.go.setDepth(w.go.y + 20)
    }
    for (const b of this.boats) {
      const t = time * .00055 + b.phase
      b.go.setPosition(b.x + Math.sin(t) * 9, b.y + Math.cos(t * .8) * 4)
      b.go.setRotation(Math.sin(t * .7) * .012)
    }
  }
}
