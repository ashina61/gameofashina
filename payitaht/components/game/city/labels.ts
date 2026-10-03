import * as Phaser from 'phaser'
import { canvasDpr } from '@/lib/render-dpr'
import type { CityScene } from '../phaser-city'

/** Canvas yazıları için sayfanın başlık fontu (next/font değişkeninden). */
export function headingFont(scene: CityScene) {
  if (!scene.fontCache) {
    const css = typeof document !== 'undefined' ? getComputedStyle(document.body).getPropertyValue('--font-heading').trim() : ''
    const body = typeof document !== 'undefined' ? getComputedStyle(document.body).getPropertyValue('--font-body').trim() : ''
    scene.fontCache = { heading: css || 'Georgia, serif', body: body || 'system-ui, sans-serif' }
  }
  return scene.fontCache
}
/** Ikariam etiketi: kahverengi seviye dairesi + parşömen isim şeridi (vektör). */
export function makePaintedLabel(scene: CityScene, x: number, y: number, level: number, name: string, depth: number) {
  const f = scene.headingFont()
  const nameText = scene.add.text(128, 0, name, { fontFamily: f.heading, fontSize: '48px', color: '#3a2310', fontStyle: '700' })
    .setOrigin(0, 0.5).setResolution(2)
  const w = Math.round(128 + nameText.width + 34)
  const g = scene.add.graphics()
  // Parşömen şerit, kahverengi kenar.
  g.fillStyle(0x2a170a, 0.35); g.fillRoundedRect(44, -34, w - 40, 76, 16)
  g.fillStyle(0xfbf2d6, 0.97); g.fillRoundedRect(40, -38, w - 40, 76, 16)
  g.lineStyle(5, 0x8a5a22, 1); g.strokeRoundedRect(40, -38, w - 40, 76, 16)
  // Seviye dairesi: koyu kahverengi, altın halka.
  g.fillStyle(0x2a170a, 0.35); g.fillCircle(66, 6, 62)
  g.fillStyle(0x5a3517, 1); g.fillCircle(62, 0, 60)
  g.lineStyle(7, 0xe2bd78, 1); g.strokeCircle(62, 0, 57)
  const lvl = scene.add.text(62, 2, String(level), { fontFamily: f.heading, fontSize: '56px', color: '#fbe9bb', fontStyle: '800' })
    .setOrigin(0.5, 0.5).setResolution(2)
  const parts: Phaser.GameObjects.GameObject[] = [g, nameText, lvl]
  // Etiket ve sayaçlar gece örtüsünün (city-sky, 3e5) üstünde: karanlıkta da okunur.
  const c = scene.add.container(x, y, parts).setDepth(4e5 + depth / 1e4)
  scene.hudItems.push({ c, width: w, height: 140, css: 22 })
  scene.fitHudItem(scene.hudItems[scene.hudItems.length - 1])
  return c
}
/** Yalnız seviye dairesi (sur kapısı): etiketin madalyonu, isim şeridi yok. */
export function makeLevelBadge(scene: CityScene, x: number, y: number, level: number, depth: number) {
  const f = scene.headingFont()
  const g = scene.add.graphics()
  g.fillStyle(0x2a170a, 0.35); g.fillCircle(64, 4, 58)
  g.fillStyle(0x5a3517, 1); g.fillCircle(60, 0, 56)
  g.lineStyle(7, 0xe2bd78, 1); g.strokeCircle(60, 0, 53)
  const t = scene.add.text(60, 2, String(level), { fontFamily: f.heading, fontSize: '58px', color: '#fbe9bb', fontStyle: '800' })
    .setOrigin(0.5, 0.5).setResolution(2)
  const c = scene.add.container(x, y, [g, t]).setDepth(4e5 + depth / 1e4)
  scene.hudItems.push({ c, width: 120, height: 120, css: 24, max: 4 }) // uzak görünümde de okunur
  scene.fitHudItem(scene.hudItems[scene.hudItems.length - 1])
  return c
}
export function fitHudItem(scene: CityScene, h: { c: Phaser.GameObjects.Container; width: number; height: number; css: number; max?: number }) {
  const dpr = canvasDpr()
  const zoom = scene.cameras.main.zoom || 1
  const s = Math.min(h.max ?? 0.6, (h.css * dpr) / zoom / h.height)
  h.c.setScale(s)
  // Konteyner sol kenardan kurulur; ortalamak için yarı genişlik kadar sola kayar.
  const baseX = h.c.getData('baseX') ?? h.c.x
  h.c.setData('baseX', baseX)
  h.c.x = baseX - (h.width * s) / 2
}
/** Süre çubuğu; update() her karede ilerlemeyi ve kalan süreyi tazeler. */
export function makeTimer(scene: CityScene, x: number, y: number, start: number, end: number, depth: number) {
  const f = scene.headingFont()
  // Kahverengi çerçeve, parşömen iç, yeşil ilerleme, sağda çekiç dairesi.
  const frame = scene.add.graphics()
  frame.fillStyle(0x2a170a, 0.35); frame.fillRoundedRect(4, -40, 470, 84, 18)
  frame.fillStyle(0x5a3517, 1); frame.fillRoundedRect(0, -44, 470, 84, 18)
  frame.fillStyle(0xf3e3b6, 1); frame.fillRoundedRect(10, -34, 390, 64, 12)
  frame.fillStyle(0x5a3517, 1); frame.fillCircle(430, -2, 34)
  frame.lineStyle(5, 0xe2bd78, 1); frame.strokeCircle(430, -2, 32)
  frame.fillStyle(0xe2bd78, 1); frame.fillTriangle(430, -22, 414, 2, 446, 2); frame.fillRect(424, 0, 12, 16)
  const bar = scene.add.graphics()
  const text = scene.add.text(205, -2, '', { fontFamily: f.body, fontSize: '40px', color: '#2e1807', fontStyle: '800' })
    .setOrigin(0.5, 0.5).setResolution(2)
  const parts: Phaser.GameObjects.GameObject[] = [frame, bar, text]
  // Etiket ve sayaçlar gece örtüsünün (city-sky, 3e5) üstünde: karanlıkta da okunur.
  const c = scene.add.container(x, y, parts).setDepth(4e5 + depth / 1e4)
  scene.hudItems.push({ c, width: 478, height: 100, css: 20 })
  scene.fitHudItem(scene.hudItems[scene.hudItems.length - 1])
  scene.timers.push({ bar, text, start, end })
  scene.paintTimer(scene.timers[scene.timers.length - 1])
  return c
}
export function paintTimer(scene: CityScene, t: { bar: Phaser.GameObjects.Graphics; text: Phaser.GameObjects.Text; start: number; end: number }) {
  if (!t.bar.active) return
  const now = Date.now()
  const p = Math.max(0, Math.min(1, (now - t.start) / Math.max(1, t.end - t.start)))
  t.bar.clear()
  t.bar.fillStyle(0x5a9b2e, 1); t.bar.fillRoundedRect(10, -34, Math.max(24, 390 * p), 64, 12)
  t.bar.fillStyle(0x9ad160, 1); t.bar.fillRoundedRect(10, -34, Math.max(24, 390 * p), 24, { tl: 12, tr: 12, bl: 0, br: 0 })
  const left = Math.max(0, Math.ceil((t.end - now) / 1000))
  const h = Math.floor(left / 3600), m = Math.floor((left % 3600) / 60), sec = left % 60
  t.text.setText(h > 0 ? `${h}sa ${m}dk` : m > 0 ? `${m}dk ${sec}sn` : `${sec}sn`)
}
