import * as Phaser from 'phaser'
import { asset } from '@/lib/asset'
import { COAST_SLOTS, PLAZA, TILE, WALL_GATES } from '@/lib/game/city-map'
import { PEACEFUL_CITY, type SiegeAppearance } from '@/lib/game/siege-appearance'
import { FlagField } from './city-life'

export function preloadSiegeArt(scene: Phaser.Scene) {
  if (!scene.textures.exists('siege-warship')) scene.load.image('siege-warship', asset('/images/game/ships/blockade.webp'))
  if (!scene.textures.exists('siege-checkpoint')) scene.load.image('siege-checkpoint', asset('/images/game/siege/checkpoint.webp'))
}

/** A bounded, disposable presentation layer. No economy, save or input changes. */
export class CitySiegeLayer {
  private objects: Phaser.GameObjects.GameObject[] = []
  private flags: FlagField
  private ships: Array<{ image: Phaser.GameObjects.Image; y: number; phase: number }> = []
  private clock = 0
  constructor(private scene: Phaser.Scene, private appearance: SiegeAppearance = PEACEFUL_CITY) {
    this.flags = new FlagField(scene)
    const occupation = appearance.occupation
    if (occupation) {
      this.flags.setLook({ color: occupation.color, shape: 'cifte', crest: 'kilic' })
      // Two headquarters at the plaza rim, away from the fixed town hall footprint.
      for (const side of [-1, 1]) {
        this.checkpoint(PLAZA.screen.x + side * PLAZA.rx * 0.85, PLAZA.screen.y + PLAZA.ry * 0.42, occupation.color)
      }
      for (const gate of WALL_GATES.filter(g => g.kind === 'land')) {
        this.checkpoint(gate.screen.x + 55, gate.screen.y + 30, occupation.color)
      }
      this.standard(PLAZA.screen.x + 95, PLAZA.screen.y - 145, occupation.color, 125)
    }
    const blockade = appearance.blockade
    if (blockade) {
      const center = COAST_SLOTS[1].screen
      // Stay inside the bay, in front of the coast slots, including an unbuilt harbour.
      for (const [i, dx] of [-490, -240, 10, 260, 510].entries()) {
        const x = center.x + dx, y = center.y + 470 + Math.abs(dx) * 0.06
        const wake = scene.add.graphics().setPosition(x, y).setDepth(y - 0.5)
        wake.fillStyle(0x102d37, 0.25); wake.fillEllipse(0, 0, 235, 48)
        wake.lineStyle(2, 0xd3e7db, 0.35); wake.strokeEllipse(0, 2, 245, 52)
        this.objects.push(wake)
        const image = scene.add.image(x, y, 'siege-warship').setOrigin(0.5, 1).setDisplaySize(260, 200).setDepth(y)
        this.objects.push(image)
        this.ships.push({ image, y, phase: i * 1.7 })
        this.standard(x + 27, y - 158, blockade.color, 28, true)
      }
      // Enemy pickets at the quays: the shore itself now reads as closed.
      for (const slot of COAST_SLOTS) this.standard(slot.screen.x + 70, slot.screen.y + 70, blockade.color, 100, true)
    }
  }

  private standard(x: number, y: number, color: number, height: number, naval = false) {
    const g = this.scene.add.graphics().setDepth(y + 0.6)
    g.lineStyle(4, 0x473d2b, 1); g.lineBetween(x, y, x, y - height)
    g.lineStyle(1, 0xccb787, 0.9); g.lineBetween(x - 1, y, x - 1, y - height)
    g.fillStyle(0xd2ad60, 1); g.fillCircle(x, y - height - 3, 4)
    this.objects.push(g)
    // Fixed enemy colour: changing the player's banner cannot recolour the occupiers.
    this.flags.add({ x, y: y - height + 4, w: naval ? 39 : 64, h: naval ? 24 : 40,
      color, crescent: false, depth: y + 0.7 })
    const crest = this.scene.add.graphics().setDepth(y + 0.8)
    const cx = x + (naval ? 15 : 24), cy = y - height + (naval ? 15 : 24)
    crest.lineStyle(2, 0xeed7a1, 1)
    crest.lineBetween(cx - 6, cy - 6, cx + 6, cy + 6)
    crest.lineBetween(cx + 6, cy - 6, cx - 6, cy + 6)
    this.objects.push(crest)
  }

  private checkpoint(x: number, y: number, color: number) {
    const image = this.scene.add.image(x, y, 'siege-checkpoint').setOrigin(0.5, 1).setDisplaySize(TILE.w * 1.65, TILE.h * 2.2).setDepth(y)
    this.objects.push(image)
    this.standard(x + 72, y - 8, color, 110)
    // Sentries and stakes flanking the road entrance, with metallic highlights.
    for (const dx of [-85, -65, 90]) {
      const g = this.scene.add.graphics().setPosition(x + dx, y + 6).setDepth(y + 6)
      g.fillStyle(0x182522, 0.3); g.fillEllipse(2, 0, 14, 6)
      g.fillStyle(color, 1); g.fillTriangle(-5, -2, 5, -2, 0, -22)
      g.fillStyle(0xbca887, 1); g.fillCircle(0, -25, 4)
      g.fillStyle(0x646e71, 1); g.fillEllipse(0, -29, 11, 7)
      g.lineStyle(2, 0x443a2c, 1); g.lineBetween(7, -4, 8, -43)
      g.fillStyle(0xc5c9c1, 1); g.fillTriangle(5, -41, 11, -41, 8, -49)
      this.objects.push(g)
    }
  }

  update(dt: number) {
    this.clock += dt
    this.flags.update(dt)
    for (const ship of this.ships) ship.image.y = ship.y + Math.sin(this.clock * 1.2 + ship.phase) * 2.5
  }

  destroy() {
    this.flags.removeGroup('static')
    for (const object of this.objects) object.destroy()
    this.objects = []
    this.ships = []
  }
}
