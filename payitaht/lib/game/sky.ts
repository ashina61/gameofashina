/**
 * GÜN IŞIĞI — şehir sahnesinin örtüsü ve hava simgesi aynı saati kullanır.
 * Phaser'sız tutulur; arayüz bileşenleri de içe aktarabilir.
 */
/** Günün saatine göre örtü rengi ve gücü (0 = gündüz, yok). */
export function skyTint(date: Date): { color: number; alpha: number; night: number } {
  const h = date.getHours() + date.getMinutes() / 60
  // Gece 21-5, şafak 5-7, gündüz 7-17.5, akşam 17.5-21.
  if (h >= 21 || h < 5) return { color: 0x26336e, alpha: 0.6, night: 1 }
  if (h < 7) { const k = (7 - h) / 2; return { color: 0xc98a7a, alpha: 0.4 * k, night: k * 0.6 } }
  if (h < 17.5) return { color: 0xffffff, alpha: 0, night: 0 }
  const k = (h - 17.5) / 3.5
  return { color: k < 0.55 ? 0xd9854a : 0x5a4a8a, alpha: 0.18 + 0.4 * k, night: Math.max(0, (k - 0.5) * 2) }
}

