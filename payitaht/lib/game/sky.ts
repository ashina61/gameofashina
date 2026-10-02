/**
 * GÜN IŞIĞI — şehir sahnesinin örtüsü ve hava simgesi aynı saati kullanır.
 * Phaser'sız tutulur; arayüz bileşenleri de içe aktarabilir.
 */
const KEY = 'payitaht-gece'
/** Oyuncu gece-gündüz döngüsünü kapatabilir (Ayarlar). Varsayılan açık. */
export function dayNightEnabled(): boolean {
  try { return typeof localStorage === 'undefined' || localStorage.getItem(KEY) !== 'kapali' } catch { return true }
}
export function setDayNight(on: boolean) {
  try { localStorage.setItem(KEY, on ? 'acik' : 'kapali') } catch { /* oturumluk */ }
}

/**
 * Günün saatine göre örtü rengi ve gücü (0 = gündüz, yok). Akşam en çok
 * oynanan saattir: gece şehri karartmaz, mavi bir alacakaranlık verir;
 * fenerler yine yanar.
 */
export function skyTint(date: Date, enabled = dayNightEnabled()): { color: number; alpha: number; night: number } {
  if (!enabled) return { color: 0xffffff, alpha: 0, night: 0 }
  const h = date.getHours() + date.getMinutes() / 60
  // Gece 21-5, şafak 5-7, gündüz 7-17.5, akşam 17.5-21.
  if (h >= 21 || h < 5) return { color: 0x4a5a9a, alpha: 0.3, night: 1 }
  if (h < 7) { const k = (7 - h) / 2; return { color: 0xd9a08a, alpha: 0.2 * k, night: k * 0.6 } }
  if (h < 17.5) return { color: 0xffffff, alpha: 0, night: 0 }
  const k = (h - 17.5) / 3.5
  return { color: k < 0.55 ? 0xe0955a : 0x6a5a9a, alpha: 0.1 + 0.2 * k, night: Math.max(0, (k - 0.5) * 2) }
}

