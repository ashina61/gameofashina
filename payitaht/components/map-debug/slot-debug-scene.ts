/**
 * SLOT DEBUG SAHNESİ — FİNAL organik şehir geometrisi.
 *
 * Canlı oyundan bağımsız: city-map'in FİNAL slotlarını (organik dağılmış 24
 * city + çakılı belediye), kıyı slotlarını, savunma yuvalarını, boş savunma
 * temel hattını ve YOL GRAFİĞİNİ izometrik olarak çizer. Binalar
 * BuildingSlotSystem üzerinden yerleşir; "Randomize" ve "Exhaustive Test"
 * düğmeleri buradan sürülür.
 *
 * ÖNEMLİ: bütün binalar AYNI sabit taban genişliğiyle (BASE_WIDTH, ORTAK),
 * originX=0.5, originY=1.0 çizilir. Slot değişince SCALE DEĞİŞMEZ.
 */
import * as Phaser from 'phaser'
import {
  CITY_SLOTS, COAST_SLOTS, DEFENSE_SLOTS, DEFENSE_FOUNDATION, ROAD_GRAPH, CITY_BOUNDS,
  HALL_SLOT_ID, footprintDiamond, slotById, SLOTS, TILE, type CitySlot,
} from '@/lib/game/city-map'
import { BuildingSlotSystem } from '@/lib/game/building-slot-system'
import { slotAnchor, spriteScale, runExhaustivePlacementTest } from '@/lib/game/city-map/placement-test'
import { buildingImage } from '@/lib/asset'

const MOVABLE_BUILDINGS = ['saray', 'kisla', 'medrese', 'carsi', 'ambar', 'hamam', 'konut', 'kereste', 'tas', 'elcilik']
const HALL_BUILDING = 'divan'

export class SlotDebugScene extends Phaser.Scene {
  private slotSys!: BuildingSlotSystem
  private gfx!: Phaser.GameObjects.Graphics
  private sprites = new Map<string, Phaser.GameObjects.Image>()
  private labels: Phaser.GameObjects.Text[] = []
  private selected: string | null = null
  showDebug = true
  onSelect?: (text: string) => void

  constructor() { super('slot-debug') }

  preload() {
    for (const b of [...MOVABLE_BUILDINGS, HALL_BUILDING]) {
      if (!this.textures.exists(b)) this.load.image(b, buildingImage(b))
    }
  }

  create() {
    this.cameras.main.setBackgroundColor('#22333b')
    this.gfx = this.add.graphics().setDepth(-10)

    this.slotSys = new BuildingSlotSystem()
    this.slotSys.placeBuilding(HALL_BUILDING, HALL_SLOT_ID)
    const movable = CITY_SLOTS.filter(s => !s.fixed)
    MOVABLE_BUILDINGS.forEach((b, i) => { if (movable[i]) this.slotSys.placeBuilding(b, movable[i].id) })

    this.buildSprites()
    this.redraw()
    this.fitCamera()
    this.installCamera()
  }

  /** Kamerayı şehir kutusuna sığdır (dikey şehri tam gör). */
  private fitCamera() {
    const b = CITY_BOUNDS
    const w = (b.maxX - b.minX) + TILE.w * 4
    const h = (b.maxY - b.minY) + TILE.h * 8
    const cam = this.cameras.main
    const zoom = Math.min(this.scale.width / w, this.scale.height / h)
    cam.setZoom(Phaser.Math.Clamp(zoom, 0.12, 1.2))
    cam.centerOn((b.minX + b.maxX) / 2, (b.minY + b.maxY) / 2)
  }

  private buildSprites() {
    for (const b of [...MOVABLE_BUILDINGS, HALL_BUILDING]) {
      if (!this.textures.exists(b)) continue
      const img = this.add.image(0, 0, b).setOrigin(0.5, 1.0)
      img.setScale(spriteScale(img.width)) // SABİT kural — slottan bağımsız
      this.sprites.set(b, img)
    }
    this.positionSprites()
  }

  private positionSprites() {
    for (const [buildingId, img] of this.sprites) {
      const slot = this.slotSys.slotOf(buildingId)
      if (!slot) { img.setVisible(false); continue }
      const a = slotAnchor(slot)
      img.setPosition(a.x, a.baseY).setDepth(a.baseY).setVisible(true)
    }
  }

  private diamond(g: Phaser.GameObjects.Graphics, s: CitySlot, line: number, fill: number, lw = 2, fa = 0.1) {
    const pts = footprintDiamond(s).map(p => new Phaser.Math.Vector2(p.x, p.y))
    g.fillStyle(fill, fa); g.fillPoints(pts, true)
    g.lineStyle(lw, line, 0.95); g.strokePoints(pts, true)
    g.fillStyle(0xffffff, 0.85); g.fillCircle(s.screen.x, s.screen.y, 3)
  }

  private redraw() {
    this.gfx.clear()
    for (const t of this.labels) t.destroy()
    this.labels = []
    if (!this.showDebug) return
    const g = this.gfx

    // Savunma temel hattı (boş sur/hendek halkası).
    const ring = DEFENSE_FOUNDATION.map(p => new Phaser.Math.Vector2(p.screen.x, p.screen.y))
    g.lineStyle(3, 0xe0734f, 0.5); g.strokePoints(ring, true)

    // Yol grafiği: kıvrım ipucu (quadratic bezier, ctrl noktasıyla).
    const nodeById = new Map(ROAD_GRAPH.nodes.map(n => [n.id, n]))
    g.lineStyle(6, 0xc9b27a, 0.35)
    for (const e of ROAD_GRAPH.edges) {
      const A = nodeById.get(e.from)!, B = nodeById.get(e.to)!
      const curve = new Phaser.Curves.QuadraticBezier(
        new Phaser.Math.Vector2(A.screen.x, A.screen.y),
        new Phaser.Math.Vector2(e.ctrl.x, e.ctrl.y),
        new Phaser.Math.Vector2(B.screen.x, B.screen.y))
      curve.draw(g, 24)
    }

    // Slotlar: coast (teal), defense (turuncu), city (cyan), belediye (altın), seçili (yeşil).
    for (const s of COAST_SLOTS) this.diamond(g, s, 0x33c8c0, 0x33c8c0, s.id === this.selected ? 3 : 2, 0.12)
    for (const s of DEFENSE_SLOTS) this.diamond(g, s, 0xe0894f, 0xe0894f, s.id === this.selected ? 3 : 2, 0.12)
    for (const s of CITY_SLOTS) {
      const sel = s.id === this.selected
      this.diamond(g, s, sel ? 0x6dff92 : s.fixed ? 0xffcf5a : 0x36d3ff, sel ? 0x6dff92 : s.fixed ? 0xffcf5a : 0x36d3ff, sel ? 3 : 2, sel ? 0.28 : 0.1)
    }
    // Etiketler
    for (const s of SLOTS) {
      const txt = s.type === 'city' ? (s.fixed ? 'BLD' : s.id.replace('city_', '')) : s.id.replace('coast_', 'C').replace('defense_', 'D:')
      this.labels.push(this.add.text(s.screen.x, s.screen.y - 5, txt, {
        fontFamily: 'monospace', fontSize: '16px', color: s.id === this.selected ? '#052' : '#04222b',
      }).setOrigin(0.5, 0.5).setDepth(50000))
    }
  }

  randomize() {
    const buildings = [...this.sprites.keys()].filter(b => b !== HALL_BUILDING)
    const movable = CITY_SLOTS.filter(s => !s.fixed).map(s => s.id)
    for (let i = movable.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1));[movable[i], movable[j]] = [movable[j], movable[i]] }
    for (const b of buildings) this.slotSys.removeBuilding(b)
    buildings.forEach((b, i) => this.slotSys.placeBuilding(b, movable[i]))
    this.positionSprites() // scale DEĞİŞMEZ
    this.redraw()
    this.onSelect?.(`Randomize: ${buildings.length} bina yeni slotlara taşındı (scale değişmedi).`)
  }

  /** Exhaustive Placement Test'i çalıştırıp özet döndürür (React butonu için). */
  runExhaustive() {
    const r = runExhaustivePlacementTest()
    const tick = (b: boolean) => (b ? '✓' : '✗')
    this.onSelect?.(`Exhaustive: ${r.combos} kombinasyon (${r.buildings}×${r.movableSlots}) · footprint ${tick(r.footprintOk)} · anchor ${tick(r.anchorOk)} · çakışma-yok ${tick(r.overlapFree)} · scale-sabit ${tick(r.scaleStable)} · ${r.passed ? 'GEÇTİ' : 'KALDI: ' + r.failures.join('; ')}`)
  }

  setDebug(on: boolean) { this.showDebug = on; this.redraw() }

  private installCamera() {
    let last: { x: number; y: number } | null = null
    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => { last = { x: p.x, y: p.y } })
    this.input.on('pointermove', (p: Phaser.Input.Pointer) => {
      if (!p.isDown || !last) return
      const cam = this.cameras.main
      cam.scrollX -= (p.x - last.x) / cam.zoom
      cam.scrollY -= (p.y - last.y) / cam.zoom
      last = { x: p.x, y: p.y }
    })
    this.input.on('pointerup', (p: Phaser.Input.Pointer) => {
      const moved = last && Phaser.Math.Distance.Between(p.downX, p.downY, p.upX, p.upY) > 10
      last = null
      if (moved) return
      const wx = p.worldX, wy = p.worldY
      let best: CitySlot | null = null, bestD = Infinity
      for (const s of SLOTS) { const dd = Math.hypot(s.screen.x - wx, s.screen.y - wy); if (dd < bestD) { bestD = dd; best = s } }
      if (best && bestD < TILE.w) {
        this.selected = best.id
        const occ = this.slotSys.buildingAt(best.id)
        this.redraw()
        this.onSelect?.(`Slot ${best.id} · tip ${best.type} · gx=${best.gx} gy=${best.gy} · footprint ${best.fw}x${best.fh} · ${occ ? 'dolu: ' + occ : 'boş'}`)
      }
    })
    this.input.on('wheel', (_p: unknown, _o: unknown, _dx: number, dy: number) => {
      const cam = this.cameras.main
      cam.setZoom(Phaser.Math.Clamp(cam.zoom * (dy > 0 ? 0.9 : 1.1), 0.1, 1.5))
    })
  }
}
