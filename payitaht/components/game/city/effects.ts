import * as Phaser from 'phaser'
import { TILE, COAST_SLOTS, HALL_SLOT_ID, WALL_GATES, PLAZA } from '@/lib/game/city-map'
import { LIVE_SLOTS, liveSlotByIndex } from '@/lib/game/city-map/live-adapter'
import { GROUND_TARGET_W } from '@/lib/game/city-map/building-assets'
import { type BuildingId } from '@/lib/game/engine'
import { lowMotion, particles } from '@/lib/motion'
import type { CityScene } from '../phaser-city'

/* ------------------------------------------------ V2 Faz 3.5 / 3.6 */

/** Yelkenli: tekne, direk, yelken (renk), tepede küçük sancak. */
export function fxShip(scene: CityScene, sail: number, flag: number, size = 1) {
  const V = (x: number, y: number) => new Phaser.Math.Vector2(x * size, y * size)
  const g = scene.add.graphics()
  g.lineStyle(1.4, 0xd9f0ea, 0.5); g.lineBetween(-34 * size, 6 * size, -60 * size, 14 * size)
  g.fillStyle(0x1b3a4a, 0.3); g.fillEllipse(2 * size, 5 * size, 70 * size, 12 * size)
  g.fillStyle(0x6b4424, 1); g.fillPoints([V(-34, -4), V(34, -4), V(24, 7), V(-26, 7)], true)
  g.fillStyle(0xe2bd78, 1); g.fillRect(-32 * size, -6 * size, 64 * size, 2.5 * size)
  g.lineStyle(2 * size, 0x3a2a1c, 1); g.lineBetween(0, -4 * size, 0, -58 * size)
  g.fillStyle(sail, 1); g.fillPoints([V(2, -54), V(30, -14), V(2, -10)], true)
  g.fillStyle(sail, 0.92); g.fillPoints([V(-2, -50), V(-24, -16), V(-2, -12)], true)
  g.fillStyle(flag, 1); g.fillPoints([V(0, -58), V(14, -55), V(0, -51)], true)
  return g
}
/** Sefer çıktı: limandan (yoksa deniz kapısından) bir yelkenli açığa açılır. */
export function fxSail(scene: CityScene) {
  if (!scene.built || lowMotion()) return
  const index = scene.state.placement.liman ?? scene.state.placement.tersane
  const slot = index === null ? null : liveSlotByIndex(index)
  const from = slot?.zone === 'liman' ? slot.screen : (WALL_GATES.find(g => g.kind === 'sea')?.screen ?? COAST_SLOTS[1].screen)
  const ship = scene.fxShip(0xf6ecd6, scene.look?.color ?? 0xb3261e, 2).setPosition(from.x, from.y + TILE.h * 1.2).setDepth(from.y + 2400)
  const side = from.x < COAST_SLOTS[1].screen.x ? -1 : 1
  scene.tweens.add({ targets: ship, x: from.x + side * TILE.w * 7, y: from.y + TILE.h * 4.5, scaleX: 0.6, scaleY: 0.6, duration: 5200, ease: 'Sine.easeIn' })
  scene.tweens.add({ targets: ship, alpha: 0, delay: 3800, duration: 1400, onComplete: () => ship.destroy() })
  scene.tweens.add({ targets: ship, angle: 4, duration: 700, yoyo: true, repeat: 3, ease: 'Sine.easeInOut' })
}
/** Ordu döndü: deniz kapısından meydana uzun bir asker kolu yürür. */
export function fxMarch(scene: CityScene) {
  if (!scene.built || lowMotion()) return
  const gate = WALL_GATES.find(g => g.kind === 'sea')?.screen ?? COAST_SLOTS[1].screen
  const to = PLAZA.screen
  const n = particles(8)
  for (let i = 0; i < n; i++) {
    const g = scene.add.graphics()
    scene.drawSoldier(g, 1.55, scene.look?.color ?? 0x24406e)
    const lag = i * 220
    g.setPosition(gate.x + (i % 2 ? 10 : -10), gate.y).setDepth(gate.y + 10).setAlpha(0)
    scene.tweens.add({ targets: g, alpha: 1, delay: lag, duration: 250 })
    scene.tweens.add({
      targets: g, x: to.x + (i % 2 ? 14 : -14), y: to.y + PLAZA.ry * 0.4, delay: lag, duration: 4200, ease: 'Linear',
      onUpdate: () => g.setDepth(g.y + 10),
    })
    scene.tweens.add({ targets: g, alpha: 0, delay: lag + 3800, duration: 500, onComplete: () => g.destroy() })
  }
}
export function setRaidAlert(scene: CityScene, on: boolean) {
  // Sahne hazır değilse istek saklanır; ilk sync'te uygulanır.
  scene.raidWanted = on
  if (!scene.built) return
  if (!on || lowMotion()) { for (const g of scene.raid) { scene.tweens.killTweensOf(g); g.destroy() } scene.raid = []; if (!on) return }
  if (scene.raid.length || lowMotion()) return
  const sea = COAST_SLOTS[1].screen
  // Mendireğin dışında, limana yaklaşan üç al yelkenli.
  const spots = [[-2.4, 5.4, 2.0], [2.6, 5.9, 1.85], [0.4, 7.2, 1.6]]
  for (let i = 0; i < spots.length; i++) {
    const [dx, dy, size] = spots[i]
    const g = scene.fxShip(0x8a1f14, 0xb3261e, size).setPosition(sea.x + dx * TILE.w, sea.y + dy * TILE.h).setDepth(sea.y + 2600)
    scene.tweens.add({ targets: g, y: g.y - 6, angle: i % 2 ? 3 : -3, duration: 1300 + i * 200, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' })
    scene.raid.push(g)
  }
  // Surda / meydanda nöbetçiler.
  for (let i = 0; i < particles(4); i++) {
    const g = scene.add.graphics()
    scene.drawSoldier(g, 1.7, 0x7a1f1f)
    const a = (i / 4) * Math.PI + Math.PI * 0.1
    g.setPosition(PLAZA.screen.x + Math.cos(a) * PLAZA.rx * 1.15, PLAZA.screen.y + Math.sin(a) * PLAZA.ry * 1.15).setDepth(PLAZA.screen.y + 400)
    scene.tweens.add({ targets: g, scaleY: 1.04, duration: 600, yoyo: true, repeat: -1 })
    scene.raid.push(g)
  }
}
/** İnşaat/yükseltme tamamlanınca kısa, dünyaya bağlı kutlama. */
export function celebrateBuilding(scene: CityScene, id: BuildingId, delay = 0, tint = 0xf2d37d) {
  if (lowMotion()) return
  scene.time.delayedCall(delay, () => {
    let slot = scene.slotOfBuilding(id)
    if (!slot && id === 'surlar') slot = LIVE_SLOTS.find(s => s.slotId === HALL_SLOT_ID) ?? null
    if (!slot) return
    const anc = scene.anchor(slot)
    const x = anc.x
    const y = anc.baseY - TILE.h * (slot.zone === 'liman' ? 0.18 : 0.34)

    // Çok hafif kamera darbesi: başarı hissi verir ama oyuncunun kadrajını bozmaz.
    scene.cameras.main.shake(105, 0.00105)
    const label = scene.labelOf.get(id)
    if (label?.active) {
      const sx = label.scaleX, sy = label.scaleY
      scene.tweens.add({ targets: label, scaleX: sx * 1.35, scaleY: sy * 1.35, duration: 180, yoyo: true, ease: 'Back.easeOut', onComplete: () => label.setScale(sx, sy) })
    }

    const ring = scene.add.graphics().setPosition(x, y).setDepth(3.6e5)
    ring.lineStyle(Math.max(2, TILE.w * 0.020), tint, 0.95)
    ring.strokeEllipse(0, 0, GROUND_TARGET_W * 0.54, TILE.h * 0.76)
    ring.lineStyle(Math.max(1, TILE.w * 0.009), 0xfff1b8, 0.85)
    ring.strokeEllipse(0, 0, GROUND_TARGET_W * 0.36, TILE.h * 0.48)
    ring.setScale(0.62).setAlpha(0.95)
    scene.tweens.add({
      targets: ring,
      scaleX: 1.38,
      scaleY: 1.38,
      alpha: 0,
      duration: 620,
      ease: 'Cubic.easeOut',
      onComplete: () => ring.destroy(),
    })

    // Küçük altın kıvılcımlar; ParticleEmitter açmadan birkaç pooled Graphics.
    // Seviye atlayınca binanın üstünde yükselen ışık sütunu (V2 Faz 3.3).
    const beam = scene.add.graphics().setPosition(x, y).setDepth(3.6e5 - 1)
    beam.fillStyle(tint, 0.22)
    beam.fillRect(-GROUND_TARGET_W * 0.1, -TILE.h * 3.2, GROUND_TARGET_W * 0.2, TILE.h * 3.2)
    beam.fillStyle(0xffffff, 0.18)
    beam.fillRect(-GROUND_TARGET_W * 0.035, -TILE.h * 3.2, GROUND_TARGET_W * 0.07, TILE.h * 3.2)
    beam.setScale(1, 0.2).setAlpha(0)
    scene.tweens.add({ targets: beam, scaleY: 1, alpha: 1, duration: 260, ease: 'Quad.easeOut', yoyo: true, hold: 240, onComplete: () => beam.destroy() })
    const n = particles(12)
    for (let i = 0; i < n; i++) {
      const a = (Math.PI * 2 * i) / n + (i % 2) * 0.13
      const dist = GROUND_TARGET_W * (0.16 + (i % 3) * 0.035)
      const spark = scene.add.graphics().setPosition(x, y).setDepth(3.6e5 + 1)
      spark.fillStyle(i % 3 === 0 ? 0xfff0a8 : 0xe8bc55, 1)
      spark.fillCircle(0, 0, i % 3 === 0 ? 3.2 : 2.3)
      scene.tweens.add({
        targets: spark,
        x: x + Math.cos(a) * dist,
        y: y + Math.sin(a) * dist * 0.42 - TILE.h * 0.18,
        alpha: 0,
        scaleX: 0.55,
        scaleY: 0.55,
        duration: 430 + (i % 4) * 45,
        ease: 'Quad.easeOut',
        onComplete: () => spark.destroy(),
      })
    }
  })
}
/**
 * İNŞAAT BAŞLADI (V2 Faz 3.1): binanın dibinde kahverengi toz bulutu
 * kabarır ve dağılır; iskele, yeni sprite'la zaten görünür.
 */
export function dustBuilding(scene: CityScene, id: BuildingId) {
  if (lowMotion()) return
  let slot = scene.slotOfBuilding(id)
  if (!slot && id === 'surlar') slot = LIVE_SLOTS.find(s => s.slotId === HALL_SLOT_ID) ?? null
  if (!slot) return
  const anc = scene.anchor(slot)
  const n = particles(14)
  for (let i = 0; i < n; i++) {
    const a = (Math.PI * 2 * i) / n + (i % 3) * 0.2
    const r = GROUND_TARGET_W * (0.12 + (i % 4) * 0.05)
    const puff = scene.add.graphics().setPosition(anc.x + Math.cos(a) * r * 0.4, anc.baseY - TILE.h * 0.05).setDepth(3.6e5)
    puff.fillStyle(i % 2 ? 0xd8bf96 : 0xb89a70, 0.62)
    puff.fillCircle(0, 0, TILE.w * (0.14 + (i % 3) * 0.06))
    puff.setScale(0.5)
    scene.tweens.add({
      targets: puff,
      x: anc.x + Math.cos(a) * r,
      y: anc.baseY - TILE.h * (0.1 + (i % 5) * 0.07) + Math.sin(a) * r * 0.3,
      scaleX: 1.6, scaleY: 1.4, alpha: 0,
      delay: (i % 4) * 40,
      duration: 700 + (i % 3) * 120,
      ease: 'Quad.easeOut',
      onComplete: () => puff.destroy(),
    })
  }
  scene.cameras.main.shake(90, 0.0008)
}
/** Dokunma geri bildirimi: binayı kapatmadan zeminde kısa altın halka. */
export function flashBuildingTap(scene: CityScene, x: number, y: number, radius: number, depth: number) {
  const g = scene.add.graphics().setPosition(x, y).setDepth(depth)
  g.lineStyle(Math.max(2, TILE.w * 0.018), 0xe7c978, 0.9)
  g.strokeEllipse(0, 0, radius * 2, radius * 0.72)
  g.fillStyle(0xf5e1a2, 0.08)
  g.fillEllipse(0, 0, radius * 1.7, radius * 0.56)
  g.setScale(0.72).setAlpha(0.9)
  scene.tweens.add({
    targets: g,
    scaleX: 1.18,
    scaleY: 1.18,
    alpha: 0,
    duration: 230,
    ease: 'Cubic.easeOut',
    onComplete: () => g.destroy(),
  })
}
