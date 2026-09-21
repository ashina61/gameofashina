/**
 * SLOT DEBUG SAHNESİ.
 *
 * Tiled tabanlı slot sisteminin GEOMETRİK doğruluğunu kanıtlayan bağımsız bir
 * sahne (canlı oyunu HİÇ kullanmaz). city-map slotlarını izometrik elmaslarla
 * çizer, numaralar, footprint sınırı, tıklanan slotu vurgular; binaları
 * BuildingSlotSystem üzerinden yerleştirir ve "Randomize" ile normal binaları
 * rastgele city slotları arasında değiştirir.
 *
 * ÖNEMLİ: bütün binalar AYNI sabit taban genişliğiyle çizilir (originX=0.5,
 * originY=1.0). Randomize sırasında hiçbir sprite scale'i değişmez — amaç, bir
 * saray/kışla/pazar hangi normal slota giderse gitsin düzgün oturuyor mu görmek.
 */
import * as Phaser from 'phaser'
import { CITY_SLOTS, HALL_SLOT_ID, footprintDiamond, TILE, slotById, type CitySlot } from '@/lib/game/city-map'
import { BuildingSlotSystem } from '@/lib/game/building-slot-system'
import { buildingImage } from '@/lib/asset'

/** Taşınabilir normal binalar (belediye hariç). */
const MOVABLE_BUILDINGS = ['saray', 'kisla', 'medrese', 'carsi', 'ambar', 'hamam', 'konut', 'kereste', 'tas', 'elcilik']
const HALL_BUILDING = 'divan'
/** SABİT taban genişliği — HER binada aynı (footprint standardı). */
const BASE_WIDTH = TILE.w * 1.7

export class SlotDebugScene extends Phaser.Scene {
  private slotSys!: BuildingSlotSystem
  private slotGfx!: Phaser.GameObjects.Graphics
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
    this.slotGfx = this.add.graphics().setDepth(-10)

    this.slotSys = new BuildingSlotSystem()
    this.slotSys.placeBuilding(HALL_BUILDING, HALL_SLOT_ID)
    const movable = CITY_SLOTS.filter(s => !s.fixed)
    MOVABLE_BUILDINGS.forEach((b, i) => { if (movable[i]) this.slotSys.placeBuilding(b, movable[i].id) })

    this.buildSprites()
    this.redraw()

    const hall = slotById(HALL_SLOT_ID)!
    this.cameras.main.centerOn(hall.screen.x, hall.screen.y - 40)
    this.cameras.main.setZoom(0.5)
    this.installCamera()
  }

  /** Her bina için bir sprite; hepsi AYNI sabit taban genişliği. */
  private buildSprites() {
    for (const b of [...MOVABLE_BUILDINGS, HALL_BUILDING]) {
      if (!this.textures.exists(b)) continue
      const img = this.add.image(0, 0, b).setOrigin(0.5, 1.0)
      img.setScale(BASE_WIDTH / img.width) // SABİT — asla değişmez
      this.sprites.set(b, img)
    }
    this.positionSprites()
  }

  /** Sprite'ları slot merkezlerine oturt (footprint tabanına). */
  private positionSprites() {
    for (const [buildingId, img] of this.sprites) {
      const slot = this.slotSys.slotOf(buildingId)
      if (!slot) { img.setVisible(false); continue }
      // Taban, footprint elmasının ALT ucunda (izometrik oturma noktası).
      const baseY = slot.screen.y + (slot.fh / 2) * TILE.h
      img.setPosition(slot.screen.x, baseY).setDepth(baseY).setVisible(true)
    }
  }

  /** Slot elmasları + numaralar + footprint + seçili vurgusu. */
  private redraw() {
    this.slotGfx.clear()
    for (const t of this.labels) t.destroy()
    this.labels = []
    if (!this.showDebug) return

    for (const s of CITY_SLOTS) {
      const d = footprintDiamond(s)
      const pts = d.map(p => new Phaser.Math.Vector2(p.x, p.y))
      const isHall = s.fixed
      const isSel = s.id === this.selected
      // Footprint dolgusu
      this.slotGfx.fillStyle(isSel ? 0x6dff92 : isHall ? 0xffcf5a : 0x36d3ff, isSel ? 0.28 : 0.1)
      this.slotGfx.fillPoints(pts, true)
      // Footprint sınırı (izometrik elmas çizgi)
      this.slotGfx.lineStyle(isSel ? 3 : 2, isSel ? 0x6dff92 : isHall ? 0xffcf5a : 0x36d3ff, 0.95)
      this.slotGfx.strokePoints(pts, true)
      // Merkez noktası
      this.slotGfx.fillStyle(0xffffff, 0.9)
      this.slotGfx.fillCircle(s.screen.x, s.screen.y, 3)
      // Slot numarası / adı
      const label = this.add.text(s.screen.x, s.screen.y - 6, isHall ? 'BLD' : s.id.replace('city_', ''), {
        fontFamily: 'monospace', fontSize: '18px', color: isSel ? '#052' : '#04222b',
      }).setOrigin(0.5, 0.5).setDepth(50000)
      this.labels.push(label)
    }
  }

  /** React tarafından çağrılır: normal binaları rastgele slotlara dağıt. */
  randomize() {
    const buildings = [...this.sprites.keys()].filter(b => b !== HALL_BUILDING)
    const movable = CITY_SLOTS.filter(s => !s.fixed).map(s => s.id)
    // Fisher-Yates ile slotları karıştır, ilk N'ini binalara ata.
    for (let i = movable.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));[movable[i], movable[j]] = [movable[j], movable[i]]
    }
    for (const b of buildings) this.slotSys.removeBuilding(b)
    buildings.forEach((b, i) => this.slotSys.placeBuilding(b, movable[i]))
    this.positionSprites() // scale DEĞİŞMEZ, yalnızca konum
    this.redraw()
    this.onSelect?.(`Randomize: ${buildings.length} bina yeni slotlara taşındı (scale değişmedi).`)
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
      // Tıklanan en yakın slotu seç.
      const wx = p.worldX, wy = p.worldY
      let best: CitySlot | null = null, bestD = Infinity
      for (const s of CITY_SLOTS) {
        const dd = Math.hypot(s.screen.x - wx, s.screen.y - wy)
        if (dd < bestD) { bestD = dd; best = s }
      }
      if (best && bestD < TILE.w) {
        this.selected = best.id
        const occ = this.slotSys.buildingAt(best.id)
        this.redraw()
        this.onSelect?.(`Slot ${best.id} · tip ${best.type} · gx=${best.gx} gy=${best.gy} · footprint ${best.fw}x${best.fh} · ${occ ? 'dolu: ' + occ : 'boş'}`)
      }
    })
    this.input.on('wheel', (_p: unknown, _o: unknown, _dx: number, dy: number) => {
      const cam = this.cameras.main
      cam.setZoom(Phaser.Math.Clamp(cam.zoom * (dy > 0 ? 0.9 : 1.1), 0.25, 1.5))
    })
  }
}
