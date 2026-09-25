/**
 * ŞEHRİN CANLI KATMANI (sahnenin üstünde, her kare güncellenir).
 *
 *  - FlagField: sancak kumaşları rüzgârda dalgalanır. Direk ve alem sabit
 *    (dokuya pişmiş) çizimde kalır; yalnızca kumaş burada her kare çizilir.
 *  - SmokeField: bacalardan tüten duman; tek bir yumuşak daire dokusundan
 *    havuzlanmış görüntüler yükselir, büyür, söner.
 */
import * as Phaser from 'phaser'

export type FlagSpec = {
  /** Kumaşın direğe bağlandığı üst nokta. */
  x: number
  y: number
  w: number
  h: number
  depth: number
  color?: number
  crescent?: boolean
}

type LiveFlag = FlagSpec & { g: Phaser.GameObjects.Graphics; ph: number; group: string }

export class FlagField {
  private flags: LiveFlag[] = []
  private t = 0
  constructor(private scene: Phaser.Scene) {}

  add(f: FlagSpec, group = 'static') {
    const g = this.scene.add.graphics().setDepth(f.depth)
    this.flags.push({ ...f, g, ph: (f.x * 0.013 + f.y * 0.007) % (Math.PI * 2), group })
    this.draw(this.flags[this.flags.length - 1])
  }

  removeGroup(group: string) {
    for (const f of this.flags) if (f.group === group) f.g.destroy()
    this.flags = this.flags.filter(f => f.group !== group)
  }

  update(dt: number) {
    this.t += dt
    for (const f of this.flags) this.draw(f)
  }

  private draw(f: LiveFlag) {
    const g = f.g
    const N = 7
    const top: Phaser.Math.Vector2[] = [], bottom: Phaser.Math.Vector2[] = []
    const wave = (u: number) => Math.sin(this.t * 4.2 + f.ph - u * 3.4) * f.h * 0.17 * u + u * f.h * 0.06
    for (let i = 0; i <= N; i++) {
      const u = i / N
      const x = f.x + u * f.w * (1 - 0.06 * Math.abs(Math.sin(this.t * 2 + f.ph + u * 2)))
      const y = f.y + wave(u)
      top.push(new Phaser.Math.Vector2(x, y))
      bottom.push(new Phaser.Math.Vector2(x, y + f.h * (1 - 0.08 * u)))
    }
    g.clear()
    g.fillStyle(f.color ?? 0xb3261e, 1)
    g.fillPoints([...top, ...bottom.reverse()], true)
    // Gölgeli kıvrım: dalganın çukurunda koyu şerit.
    g.fillStyle(0x000000, 0.12)
    for (let i = 1; i < N; i += 2) {
      const u = i / N
      if (Math.sin(this.t * 4.2 + f.ph - u * 3.4) > 0) continue
      const a = top[i], b = bottom[N - i]
      g.fillRect(a.x - f.w / N / 2, a.y, f.w / N, b.y - a.y)
    }
    if (f.crescent !== false) {
      const u = 0.42, cx = f.x + u * f.w, cy = f.y + wave(u) + f.h * 0.5
      g.fillStyle(0xf6efe0, 1); g.fillCircle(cx, cy, f.h * 0.24)
      g.fillStyle(f.color ?? 0xb3261e, 1); g.fillCircle(cx + f.h * 0.07, cy, f.h * 0.2)
      const su = 0.66, sx = f.x + su * f.w, sy = f.y + wave(su) + f.h * 0.5
      g.fillStyle(0xf6efe0, 1); g.fillCircle(sx, sy, f.h * 0.075)
    }
  }
}

type Puff = { img: Phaser.GameObjects.Image; life: number; max: number; vx: number; vy: number; s0: number }

export class SmokeField {
  private sources: Array<{ x: number; y: number; rate: number; acc: number; group: string; tint: number }> = []
  private puffs: Puff[] = []
  private pool: Phaser.GameObjects.Image[] = []
  constructor(private scene: Phaser.Scene) {
    if (!scene.textures.exists('puff')) {
      const g = scene.add.graphics()
      for (let r = 16; r > 0; r -= 2) { g.fillStyle(0xffffff, 0.09); g.fillCircle(16, 16, r) }
      g.generateTexture('puff', 32, 32)
      g.destroy()
    }
  }

  addSource(x: number, y: number, group = 'static', rate = 1.4, tint = 0xe9e4da) {
    this.sources.push({ x, y, rate, acc: Math.random(), group, tint })
  }

  removeGroup(group: string) {
    this.sources = this.sources.filter(s => s.group !== group)
  }

  update(dt: number) {
    for (const s of this.sources) {
      s.acc += dt * s.rate
      while (s.acc >= 1) {
        s.acc -= 1
        const img = this.pool.pop() ?? this.scene.add.image(0, 0, 'puff')
        img.setVisible(true).setPosition(s.x + (Math.random() - 0.5) * 4, s.y).setDepth(1e5).setTint(s.tint)
        this.puffs.push({ img, life: 0, max: 3.2 + Math.random() * 1.4, vx: 5 + Math.random() * 5, vy: -(14 + Math.random() * 6), s0: 0.35 + Math.random() * 0.15 })
      }
    }
    for (let i = this.puffs.length - 1; i >= 0; i--) {
      const p = this.puffs[i]
      p.life += dt
      const k = p.life / p.max
      if (k >= 1) { p.img.setVisible(false); this.pool.push(p.img); this.puffs.splice(i, 1); continue }
      p.img.x += p.vx * dt; p.img.y += p.vy * dt
      p.img.setScale(p.s0 + k * 1.3).setAlpha(0.55 * (1 - k) * Math.min(1, k * 6))
    }
  }
}
