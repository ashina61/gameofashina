import * as Phaser from 'phaser'
import { ISLET_SLOTS, TILE } from '../index'
import { mulberry32 } from '../terrain-builder'

type Stamp = (key: string, wx: number, wy: number, tw: number, depth: number, oy?: number, alpha?: number, tint?: number) => Phaser.GameObjects.Image | null

/**
 * KORSAN ADASI: liman ağzındaki küçük kayalık ada (Korsan Kalesi'nin yeri).
 * Sığ su halesi, köpük, kaya tabanı, kum ve çimenli tepe; kenarında kayalar
 * ve birkaç çam. Kale arsanın ortasına oturur, ada boşken de görünür.
 */
export function drawIslet({ scene, stamp }: { scene: Phaser.Scene; stamp: Stamp }) {
  for (const slot of ISLET_SLOTS) {
    const { x, y } = slot.screen
    const rnd = mulberry32(5150 + Math.round(x))
    // Düzensiz kıyı: elips çevresinde gürültülü yarıçap.
    const blob = (rx: number, ry: number, cy: number, wobble: number) => Array.from({ length: 28 }, (_, k) => {
      const t = (k / 28) * Math.PI * 2
      const r = 1 + (rnd() - 0.5) * wobble
      return new Phaser.Math.Vector2(x + Math.cos(t) * rx * r, cy + Math.sin(t) * ry * r)
    })
    const g = scene.add.graphics().setDepth(-897)
    g.fillStyle(0x7fcfc4, 0.30); g.fillEllipse(x, y + TILE.h * 0.36, TILE.w * 5.0, TILE.h * 4.0)
    g.fillStyle(0xb9e6da, 0.22); g.fillEllipse(x, y + TILE.h * 0.30, TILE.w * 4.2, TILE.h * 3.3)
    g.lineStyle(3, 0xffffff, 0.42); g.strokeEllipse(x, y + TILE.h * 0.28, TILE.w * 3.8, TILE.h * 2.95)
    g.fillStyle(0x6d665a, 1); g.fillPoints(blob(TILE.w * 1.8, TILE.h * 1.4, y + TILE.h * 0.32, 0.16), true)
    g.fillStyle(0xd6c18a, 1); g.fillPoints(blob(TILE.w * 1.66, TILE.h * 1.24, y + TILE.h * 0.12, 0.12), true)
    g.fillStyle(0x7d9d54, 1); g.fillPoints(blob(TILE.w * 1.4, TILE.h * 1.0, y - TILE.h * 0.06, 0.10), true)
    g.fillStyle(0x9bb866, 0.55); g.fillEllipse(x - TILE.w * 0.3, y - TILE.h * 0.3, TILE.w * 1.5, TILE.h * 0.6)
    // Kenar kayaları ve arkada birkaç çam (kalenin önünü kapatmaz).
    for (let k = 0; k < 9; k++) {
      const t = Math.PI * (0.05 + (k / 8) * 0.9) + (k % 2 ? Math.PI : 0)
      stamp('d_rock', x + Math.cos(t) * TILE.w * 1.7, y + TILE.h * 0.26 + Math.sin(t) * TILE.h * 1.28, TILE.w * (0.2 + rnd() * 0.14), -705, 0.9, 0.86)
    }
    stamp('d_pine', x - TILE.w * 1.3, y - TILE.h * 0.1, TILE.w * 0.4, y - TILE.h * 0.1, 0.95)
    stamp('d_cypress', x + TILE.w * 1.3, y + TILE.h * 0.05, TILE.w * 0.3, y + TILE.h * 0.05, 0.95)
    stamp('d_bush', x - TILE.w * 0.9, y + TILE.h * 0.7, TILE.w * 0.24, -704, 0.92, 0.8)
  }
}
