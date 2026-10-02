import * as Phaser from 'phaser'
import { skyTint } from '@/lib/game/sky'

/**
 * GÖKYÜZÜ KATMANI — şehir sahnesine atmosfer.
 *
 *  • Bulut gölgeleri: haritanın üstünden yavaşça süzülen yumuşak lekeler.
 *  • Gün ışığı: cihazın saatine göre sabah serinliği, akşam kızıllığı, gece
 *    lacivert; ekrana sabit, çarpma (multiply) karışımlı bir örtü.
 *  • Gece ışıkları: binaların pencerelerinde sıcak kandil ışıltısı (toplamalı).
 * Hepsi dokunmayı engellemez; performans için örtü tek bir dikdörtgendir.
 */
type Light = { img: Phaser.GameObjects.Image; group: string; ph: number; pool?: boolean }
type Cloud = { img: Phaser.GameObjects.Image; vx: number }

export class SkyLayer {
  private shade: Phaser.GameObjects.Rectangle
  private clouds: Cloud[] = []
  private lights: Light[] = []
  private clock = 0
  private night = 0
  private sampled = -1
  constructor(private scene: Phaser.Scene, private bounds: { x: number; y: number; w: number; h: number }) {
    if (!scene.textures.exists('sky-cloud')) {
      const g = scene.add.graphics()
      for (let r = 64; r > 0; r -= 4) { g.fillStyle(0x0b1f18, 0.018); g.fillEllipse(128, 64, r * 3.6, r * 1.6) }
      g.generateTexture('sky-cloud', 256, 128)
      g.destroy()
    }
    if (!scene.textures.exists('sky-glow')) {
      const g = scene.add.graphics()
      for (let r = 20; r > 0; r -= 2) { g.fillStyle(0xffc766, 0.07); g.fillCircle(20, 20, r) }
      g.fillStyle(0xfff0b8, 0.9); g.fillCircle(20, 20, 2.2)
      g.generateTexture('sky-glow', 40, 40)
      g.destroy()
    }
    if (!scene.textures.exists('sky-pool')) {
      // Fener halkası: zeminde basık, kenarı yumuşak sıcak ışık (V2 Faz 4.5).
      const g = scene.add.graphics()
      for (let r = 32; r > 0; r -= 2) { g.fillStyle(0xffb85a, 0.035); g.fillEllipse(64, 32, r * 4, r * 2) }
      g.generateTexture('sky-pool', 128, 64)
      g.destroy()
    }
    const { x, y, w, h } = bounds
    for (let i = 0; i < 7; i++) {
      const img = scene.add.image(x + Math.random() * w, y + Math.random() * h, 'sky-cloud')
        .setScale(3 + Math.random() * 3, 2 + Math.random() * 1.6).setDepth(2e5).setAlpha(0.9)
      this.clouds.push({ img, vx: 6 + Math.random() * 8 })
    }
    this.shade = scene.add.rectangle(0, 0, 10, 10, 0xffffff, 0).setOrigin(0).setScrollFactor(0).setDepth(3e5)
      .setBlendMode(Phaser.BlendModes.MULTIPLY)
    this.fit()
    scene.scale.on('resize', () => this.fit())
  }

  private fit() {
    // Ekrana sabit ama kamera yakınlaştırması onu da ölçekler: en uzak
    // yakınlaştırmada bile ekranı kaplayacak kadar büyük tutulur.
    const cam = this.scene.cameras.main
    const span = Math.max(cam.width, cam.height) * 16
    this.shade.setSize(span, span).setPosition(cam.width / 2 - span / 2, cam.height / 2 - span / 2)
  }

  addLight(x: number, y: number, group: string) {
    // Işık gece örtüsünün de üstünde: karanlıkta parlar.
    const img = this.scene.add.image(x, y, 'sky-glow').setDepth(3e5 + 1).setBlendMode(Phaser.BlendModes.ADD).setAlpha(0).setScale(2)
    this.lights.push({ img, group, ph: Math.random() * 10 })
  }

  /**
   * SOKAK FENERİ (V2 Faz 4.5): gündüz küçük bir demir direk ve fener, gece
   * camı yanar ve zemine yumuşak bir ışık halkası düşer.
   */
  addLantern(x: number, y: number, depth: number, group: string, size = 1) {
    const g = this.scene.add.graphics().setDepth(depth)
    const s = size
    g.fillStyle(0x0d1c16, 0.2); g.fillEllipse(x + 3 * s, y, 14 * s, 5 * s)
    g.fillStyle(0x2c2620, 1); g.fillRect(x - 1.6 * s, y - 34 * s, 3.2 * s, 34 * s)
    g.fillStyle(0x3a3128, 1); g.fillRect(x - 5 * s, y - 44 * s, 10 * s, 11 * s)
    g.fillStyle(0xf4d38a, 1); g.fillRect(x - 3.4 * s, y - 42.5 * s, 6.8 * s, 8 * s)
    g.fillStyle(0x2c2620, 1); g.fillTriangle(x - 6.5 * s, y - 44 * s, x + 6.5 * s, y - 44 * s, x, y - 50 * s)
    const pool = this.scene.add.image(x, y, 'sky-pool').setDepth(3e5 + 1).setBlendMode(Phaser.BlendModes.ADD).setAlpha(0).setScale(1.6 * s)
    const glow = this.scene.add.image(x, y - 38 * s, 'sky-glow').setDepth(3e5 + 1).setBlendMode(Phaser.BlendModes.ADD).setAlpha(0).setScale(1.4 * s)
    this.lights.push({ img: pool, group, ph: x * 0.01, pool: true }, { img: glow, group, ph: x * 0.01 })
    return g
  }

  removeGroup(group: string) {
    for (const l of this.lights) if (l.group === group) l.img.destroy()
    this.lights = this.lights.filter(l => l.group !== group)
  }

  update(dt: number) {
    this.clock += dt
    const { x, y, w, h } = this.bounds
    for (const c of this.clouds) {
      c.img.x += c.vx * dt
      c.img.y += c.vx * 0.25 * dt
      if (c.img.x - 400 > x + w) { c.img.x = x - 500; c.img.y = y + Math.random() * h }
      if (c.img.y - 200 > y + h) c.img.y = y - 200
    }
    // Gün ışığı saniyede bir örneklenir.
    if (this.clock - this.sampled >= 1) {
      this.sampled = this.clock
      const t = skyTint(new Date())
      this.shade.setFillStyle(t.color, t.alpha)
      this.night = t.night
      for (const c of this.clouds) c.img.setVisible(t.night < 0.8)
    }
    for (const l of this.lights) l.img.setAlpha(this.night * (l.pool ? 0.85 + 0.1 * Math.sin(this.clock * 2 + l.ph) : 0.75 + 0.25 * Math.sin(this.clock * 3 + l.ph)))
  }
}
