/**
 * KARE SINIRI (V2 Faz 6.3): dokunulmayan şehir tam hızda çizilmez.
 *
 * Phaser'ın döngüsü (TimeStep) sınırı yalnız başlarken okur; burada alanlar
 * güncellenir ve döngü yeniden kurulur. Uyuyan döngü (sayfa şehri örtüyor)
 * uyandırılmaz; uyandığında yeni sınırla başlar.
 */
type Loop = { fpsLimit: number; hasFpsLimit: boolean; running: boolean; sleep(): void; wake(seamless?: boolean): void }

/** Dokunuştan bu kadar sonra şehir boşta sayılır. */
export const IDLE_AFTER_MS = 5000
/** Boştaki şehir. */
export const IDLE_FPS = 20
/** Hafif modda etkileşim sırasında bile üst sınır. */
export const LITE_FPS = 30

export function setFrameCap(loop: Loop, fps: number) {
  const limit = Math.max(0, Math.round(fps))
  if (loop.fpsLimit === limit) return
  loop.fpsLimit = limit
  loop.hasFpsLimit = limit > 0
  ;(loop as unknown as { _limitRate: number })._limitRate = limit > 0 ? 1000 / limit : 0
  if (loop.running) { loop.sleep(); loop.wake(true) }
}

/** Şu anki durumda istenen sınır: 0 = sınırsız. */
export function wantedFps(idle: boolean, lite: boolean) {
  if (idle) return IDLE_FPS
  return lite ? LITE_FPS : 0
}
