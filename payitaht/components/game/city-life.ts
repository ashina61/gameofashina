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
  /** Kumaşın uzandığı yön (bina aynalanınca -1). */
  dir?: 1 | -1
  /** Oyuncunun sancağı değil (ör. korsan); verilirse sabit renk/hilal kullanılır. */
  color?: number
  crescent?: boolean
}
/** Oyuncunun sancağı: renk, biçim, arma (lib/game/banner.ts). */
export type FlagLook = { color: number; shape: 'kirlangic' | 'cifte' | 'ucgen' | 'duz'; crest: string }

type LiveFlag = FlagSpec & { g: Phaser.GameObjects.Graphics; ph: number; group: string; minLevel: number }
const PAPER = 0xf6efe0

export class FlagField {
  private flags: LiveFlag[] = []
  private t = 0
  private level = 99
  private look: FlagLook = { color: 0xb3261e, shape: 'kirlangic', crest: 'hilal' }
  constructor(private scene: Phaser.Scene) {}

  add(f: FlagSpec, group = 'static', minLevel = 0) {
    const g = this.scene.add.graphics().setDepth(f.depth).setVisible(this.level >= minLevel)
    this.flags.push({ ...f, g, ph: (f.x * 0.013 + f.y * 0.007) % (Math.PI * 2), group, minLevel })
    this.draw(this.flags[this.flags.length - 1])
  }

  /** Sancak değişince bütün bayraklar yeni renk, biçim ve armayla çizilir. */
  setLook(look: FlagLook) {
    this.look = look
    for (const f of this.flags) this.draw(f)
  }

  removeGroup(group: string) {
    for (const f of this.flags) if (f.group === group) f.g.destroy()
    this.flags = this.flags.filter(f => f.group !== group)
  }

  /** Kademeli gelişme: bayrağın açıldığı seviyeden düşükse gizlenir. */
  setLevel(level: number) {
    this.level = level
    for (const f of this.flags) f.g.setVisible(level >= f.minLevel)
  }

  update(dt: number) {
    this.t += dt
    for (const f of this.flags) if (f.g.visible) this.draw(f)
  }

  private draw(f: LiveFlag) {
    const g = f.g
    const N = 7
    const dir = f.dir ?? 1
    const own = f.color === undefined
    const shape = own ? this.look.shape : 'duz'
    const color = own ? this.look.color : f.color!
    const top: Phaser.Math.Vector2[] = [], bottom: Phaser.Math.Vector2[] = []
    const wave = (u: number) => Math.sin(this.t * 4.2 + f.ph - u * 3.4) * f.h * 0.17 * u + u * f.h * 0.06
    const X = (u: number) => f.x + dir * u * f.w * (1 - 0.06 * Math.abs(Math.sin(this.t * 2 + f.ph + u * 2)))
    for (let i = 0; i <= N; i++) {
      const u = i / N
      const x = X(u), y = f.y + wave(u)
      const pinch = shape === 'ucgen' ? u * f.h * 0.46 : 0
      top.push(new Phaser.Math.Vector2(x, y + pinch))
      bottom.push(new Phaser.Math.Vector2(x, y + f.h * (1 - 0.08 * u) - pinch))
    }
    // Uçtaki kesik: kırlangıç kuyruk ve çifte dil.
    const tipU = 1, tx = X(tipU), mid = f.y + wave(tipU) + f.h * 0.46
    const notch: Phaser.Math.Vector2[] = shape === 'kirlangic' ? [new Phaser.Math.Vector2(tx - dir * f.w * 0.26, mid)]
      : shape === 'cifte' ? [new Phaser.Math.Vector2(tx - dir * f.w * 0.04, mid - f.h * 0.3), new Phaser.Math.Vector2(tx - dir * f.w * 0.1, mid - f.h * 0.12),
        new Phaser.Math.Vector2(tx - dir * f.w * 0.44, mid), new Phaser.Math.Vector2(tx - dir * f.w * 0.1, mid + f.h * 0.12), new Phaser.Math.Vector2(tx - dir * f.w * 0.04, mid + f.h * 0.3)]
      : []
    g.clear()
    g.fillStyle(color, 1)
    g.fillPoints([...top, ...notch, ...bottom.reverse()], true)
    // Gölgeli kıvrım: dalganın çukurunda koyu şerit.
    g.fillStyle(0x000000, 0.12)
    for (let i = 1; i < N - 1; i += 2) {
      const u = i / N
      if (Math.sin(this.t * 4.2 + f.ph - u * 3.4) > 0) continue
      const a = top[i], b = bottom[N - i]
      g.fillRect(a.x - f.w / N / 2, a.y, f.w / N, b.y - a.y)
    }
    if (!own && f.crescent === false) return
    // Arma: kumaşın ortasında, dalgayla birlikte.
    const u = shape === 'ucgen' ? 0.3 : 0.4
    const cx = X(u), cy = f.y + wave(u) + f.h * 0.5, s = f.h * (shape === 'ucgen' ? 0.2 : 0.26)
    const crest = own ? this.look.crest : 'hilal'
    g.fillStyle(PAPER, 1); g.lineStyle(Math.max(1, s * 0.22), PAPER, 1)
    switch (crest) {
      case 'lale':
        g.fillEllipse(cx, cy - s * 0.1, s * 1.1, s * 1.2)
        g.fillTriangle(cx - s * 0.55, cy - s * 0.2, cx - s * 0.3, cy - s * 1.05, cx - s * 0.05, cy - s * 0.4)
        g.fillTriangle(cx + s * 0.55, cy - s * 0.2, cx + s * 0.3, cy - s * 1.05, cx + s * 0.05, cy - s * 0.4)
        g.lineBetween(cx, cy + s * 0.4, cx, cy + s * 1.1)
        break
      case 'kilic':
        g.lineBetween(cx - s, cy + s, cx + s, cy - s); g.lineBetween(cx + s, cy + s, cx - s, cy - s)
        break
      case 'gemi':
        g.fillPoints([new Phaser.Math.Vector2(cx - s, cy + s * 0.35), new Phaser.Math.Vector2(cx + s, cy + s * 0.35), new Phaser.Math.Vector2(cx + s * 0.6, cy + s * 0.85), new Phaser.Math.Vector2(cx - s * 0.6, cy + s * 0.85)], true)
        g.fillTriangle(cx - s * 0.05, cy - s, cx - s * 0.05, cy + s * 0.25, cx + s * 0.75, cy + s * 0.25)
        break
      case 'kule':
        g.fillRect(cx - s * 0.6, cy - s * 0.5, s * 1.2, s * 1.4)
        for (const k of [-0.6, -0.1, 0.4]) g.fillRect(cx + s * k, cy - s * 0.85, s * 0.28, s * 0.4)
        break
      case 'kitap':
        g.fillPoints([new Phaser.Math.Vector2(cx, cy - s * 0.5), new Phaser.Math.Vector2(cx - s, cy - s * 0.7), new Phaser.Math.Vector2(cx - s, cy + s * 0.6), new Phaser.Math.Vector2(cx, cy + s * 0.8)], true)
        g.fillPoints([new Phaser.Math.Vector2(cx, cy - s * 0.5), new Phaser.Math.Vector2(cx + s, cy - s * 0.7), new Phaser.Math.Vector2(cx + s, cy + s * 0.6), new Phaser.Math.Vector2(cx, cy + s * 0.8)], true)
        break
      default: {
        g.fillCircle(cx, cy, s * 0.95)
        g.fillStyle(color, 1); g.fillCircle(cx + dir * s * 0.28, cy, s * 0.78)
        g.fillStyle(PAPER, 1); g.fillCircle(cx + dir * s * 0.95, cy, s * 0.28)
      }
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
