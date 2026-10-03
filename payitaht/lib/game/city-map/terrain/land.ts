import { CITY_SLOTS, DEFENSE_FOUNDATION, HALL_SLOT_ID, slotById, TILE } from '../index'
import * as Phaser from 'phaser'
import { mulberry32 } from '../terrain-builder'

export function drawLand({ V, scene, shoreY, stamp, wr }: { V: (x: number, y: number) => Phaser.Math.Vector2; scene: Phaser.Scene; shoreY: (x: number) => number; stamp: (key: string, wx: number, wy: number, tw: number, depth: number, oy?: number, alpha?: number, tint?: number | undefined) => Phaser.GameObjects.Image | null; wr: { x: number; y: number; w: number; h: number; } }) {
  // 2b) DAĞLAR VE YAMAÇLAR (Ikariam): şehir bir tepenin eteğinde, arkasında
  // katman katman sıradağlar, iki yanında ormanlı yamaçlar. Hepsi vektör;
  // surların ve madenin üstüne taşmaz (sur halkasının üstünde biter).
  {
    const hills = scene.add.graphics().setDepth(-870)
    const hr = mulberry32(51515)
    const hall = slotById(HALL_SLOT_ID)!.screen
    const ringTop = Math.min(...DEFENSE_FOUNDATION.map(p => p.screen.y))
    const ringXs = DEFENSE_FOUNDATION.map(p => p.screen.x)
    const ringHalf = Math.max(...ringXs.map(x => Math.abs(x - hall.x)))
    // Tek bir dağ: sol yüz aydınlık, sağ yüz gölgede, tepede kaya.
    const peak = (cx: number, baseY: number, h: number, w: number, light: number, dark: number, rock: number, haze: number) => {
      const top = V(cx + (hr() - 0.5) * w * 0.2, baseY - h)
      const left = V(cx - w, baseY), right = V(cx + w, baseY)
      const midL = V(cx - w * 0.5, baseY - h * (0.45 + hr() * 0.15))
      const midR = V(cx + w * 0.55, baseY - h * (0.4 + hr() * 0.15))
      const foot = V(top.x + w * 0.08, baseY)
      hills.fillStyle(light, haze); hills.fillPoints([left, midL, top, foot], true)
      hills.fillStyle(dark, haze); hills.fillPoints([top, midR, right, foot], true)
      // Kayalık yalnızca dorukta; boya katmanları ve kısa yüzey izleri
      // geniş düz üçgenlerin zeminden kopuk görünmesini önler.
      hills.fillStyle(rock, haze * 0.45)
      hills.fillPoints([V(top.x - w * 0.16, top.y + h * 0.22), top, V(top.x + w * 0.2, top.y + h * 0.26), V(top.x + w * 0.02, top.y + h * 0.3)], true)
      for (let j = 0; j < 22; j++) {
        const u = (hr() * 2 - 1) * 0.76, v = 0.30 + hr() * 0.58
        const x = cx + u * w * v, y = top.y + h * v
        hills.lineStyle(1 + hr() * 2, j % 4 === 0 ? rock : j % 3 === 0 ? dark : light, 0.12 * haze)
        hills.lineBetween(x, y, x + (hr() - 0.5) * w * 0.16, y + h * 0.035)
      }
    }
    // Uzak, orta ve yakın sıra (arkadan öne).
    const ranges = [
      { base: ringTop - TILE.h * 9.5, h: [TILE.h * 7, TILE.h * 11], w: [TILE.w * 2.2, TILE.w * 3.4], light: 0x9fae8b, dark: 0x7d8d6c, rock: 0xc4c0b2, haze: 0.85, n: 9 },
      { base: ringTop - TILE.h * 6.5, h: [TILE.h * 5, TILE.h * 8], w: [TILE.w * 1.8, TILE.w * 2.8], light: 0x8aa062, dark: 0x667d45, rock: 0xb8b09c, haze: 0.95, n: 8 },
      { base: ringTop - TILE.h * 3.6, h: [TILE.h * 2.6, TILE.h * 4.2], w: [TILE.w * 1.6, TILE.w * 2.4], light: 0x7f9a52, dark: 0x5f7a3e, rock: 0xa89f86, haze: 1, n: 8 },
    ]
    for (const r of ranges) {
      const span = wr.w + TILE.w * 4
      for (let i = 0; i < r.n; i++) {
        const cx = wr.x - TILE.w * 2 + span * ((i + 0.5 + (hr() - 0.5) * 0.5) / r.n)
        // Şehrin tam arkasında yakın sıra alçalır: belediye ve kuzey kulesi görünsün.
        const behindCity = Math.abs(cx - hall.x) < ringHalf * 0.6 && r === ranges[2]
        const h = (r.h[0] + hr() * (r.h[1] - r.h[0])) * (behindCity ? 0.55 : 1)
        const w = r.w[0] + hr() * (r.w[1] - r.w[0])
        peak(cx, r.base, h, w, r.light, r.dark, r.rock, r.haze)
      }
      // Dağ eteği tek renkli yatay şerit yerine çim dokusuna karışır.
      for (let i = 0; i < 24; i++) {
        const x = wr.x + (i + hr() * 0.7) / 24 * wr.w
        hills.fillStyle(i % 3 === 0 ? r.light : r.dark, 0.08 + hr() * 0.07)
        hills.fillEllipse(x, r.base + (hr() - 0.5) * TILE.h, TILE.w * (0.8 + hr()), TILE.h * (0.5 + hr() * 0.6))
      }
    }
    // Sıradağların üstü (dünyanın en üstü): puslu uzak sırt, gökyüzü yok.
    hills.fillStyle(0xa9b594, 1)
    hills.fillRect(wr.x, wr.y, wr.w, Math.max(0, ranges[0].base - TILE.h * 11 - wr.y))
    // YAMAÇLAR: surların iki yanında, kıyıya kadar inen ormanlı tepe sırtları.
    for (const side of [-1, 1]) {
      const x0 = hall.x + side * (ringHalf + TILE.w * 1.4)
      for (let k = 0; k < 5; k++) {
        const y = ringTop + TILE.h * (2 + k * 5.5)
        const x = x0 + side * TILE.w * (0.6 + hr() * 1.4)
        if (y > shoreY(x) - TILE.h * 2) continue
        const rx = TILE.w * (2.4 + hr() * 1.4), ry = TILE.h * (2.2 + hr() * 1.2)
        hills.fillStyle(0x4f6b36, 0.30); hills.fillEllipse(x + side * TILE.w * 0.3, y + ry * 0.35, rx * 2.1, ry * 1.5)
        hills.fillStyle(side < 0 ? 0x7f9a52 : 0x6a8546, 0.9); hills.fillEllipse(x, y, rx * 2, ry * 1.6)
        hills.fillStyle(side < 0 ? 0x94ae62 : 0x7a9550, 0.8); hills.fillEllipse(x - side * rx * 0.25, y - ry * 0.3, rx * 1.2, ry * 0.8)
        // Kaya çıkıntıları.
        for (let q = 0; q < 3; q++) stamp('d_rock', x + (hr() - 0.5) * rx, y + (hr() - 0.3) * ry * 0.6, TILE.w * (0.3 + hr() * 0.2), -869, 0.9, 0.9)
      }
    }
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
