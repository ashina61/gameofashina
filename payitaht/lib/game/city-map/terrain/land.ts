import { CITY_SLOTS, DEFENSE_FOUNDATION, HALL_SLOT_ID, slotById, TILE } from '../index'
import * as Phaser from 'phaser'
import { mulberry32 } from '../terrain-builder'

export function drawLand({ V: _V, scene, shoreY, stamp, wr }: { V: (x: number, y: number) => Phaser.Math.Vector2; scene: Phaser.Scene; shoreY: (x: number) => number; stamp: (key: string, wx: number, wy: number, tw: number, depth: number, oy?: number, alpha?: number, tint?: number | undefined) => Phaser.GameObjects.Image | null; wr: { x: number; y: number; w: number; h: number; } }) {
  // G4: boyalı uzak sırt; sur ve maden bandının arkasında kalır.
  {
    const ringTop = Math.min(...DEFENSE_FOUNDATION.map(p => p.screen.y))
    const backdrop = scene.add.graphics().setDepth(-871)
    backdrop.fillStyle(0xa9b594, 1)
    backdrop.fillRect(wr.x, wr.y, wr.w, Math.max(0, ringTop - TILE.h * 12 - wr.y))
    stamp('t_hills', wr.x + wr.w / 2, ringTop - TILE.h * 2.8, wr.w * 1.04, -870, 1, 0.96)
  }

  // 2c) ŞEHİR DÜZLÜĞÜ: şehir hafifçe daha açık ve güneşli oval bir yaylada.
  {
    const tg = scene.add.graphics().setDepth(-860)
    const xs = CITY_SLOTS.map(c => c.screen.x), ys = CITY_SLOTS.map(c => c.screen.y)
    const cx = (Math.min(...xs) + Math.max(...xs)) / 2
    const cy = (Math.min(...ys) + Math.max(...ys)) / 2
    const rx = (Math.max(...xs) - Math.min(...xs)) / 2 + TILE.w * 1.7
    const ry = (Math.max(...ys) - Math.min(...ys)) / 2 + TILE.h * 3.2
    tg.fillStyle(0xc9d18a, 0.16); tg.fillEllipse(cx, cy, rx * 2, ry * 2)
    tg.fillStyle(0xd6d894, 0.10); tg.fillEllipse(cx - rx * 0.1, cy - ry * 0.12, rx * 1.5, ry * 1.4)
  }

  // 2d) BOYALI ZEMİN: izometrik yönde binlerce kısa fırça darbesi + güneşin
  // sol üstten vurduğu sıcak ışık. Düz yeşil yüzey resim gibi görünür.
  {
    const brush = scene.add.graphics().setDepth(-885)
    const br = mulberry32(24680)
    const greens = [0x5d8a3f, 0x7ea453, 0x98b562, 0x6f9448, 0xa9bd6a, 0x4f7a37, 0xc4c57a]
    for (let i = 0; i < 900; i++) {
      const x = wr.x + br() * wr.w
      const y = wr.y + br() * Math.max(0, shoreY(x) - wr.y - TILE.h * 0.5)
      const len = TILE.w * (0.08 + br() * 0.22)
      const dir = br() < 0.5 ? 1 : -1
      brush.lineStyle(2 + br() * 5, greens[Math.floor(br() * greens.length)], 0.05 + br() * 0.09)
      brush.lineBetween(x, y, x + len, y + dir * len * 0.5)
    }
    const light = scene.add.graphics().setDepth(-884)
    const hall = slotById(HALL_SLOT_ID)!.screen
    for (let k = 0; k < 4; k++) {
      light.fillStyle(0xffe6a0, 0.035)
      light.fillEllipse(hall.x - TILE.w * 3, hall.y - TILE.h * 10, TILE.w * (8 + k * 4), TILE.h * (10 + k * 5))
    }
    // Kenarlarda hafif karartma: göz şehrin ortasına çekilir.
    light.fillStyle(0x1e2c14, 0.10); light.fillRect(wr.x, wr.y, TILE.w * 2.5, wr.h)
    light.fillRect(wr.x + wr.w - TILE.w * 2.5, wr.y, TILE.w * 2.5, wr.h)
  }

}
