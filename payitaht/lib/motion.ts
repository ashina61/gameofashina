/**
 * HAREKET AYARI (V2 Faz 3) — bütün oyun hissi efektleri (uçan jetonlar,
 * sayarak değişen sayılar, şehirdeki toz, ışık ve gemiler) iki durumda kapanır:
 * cihazın "hareketi azalt" ayarı ya da oyundaki Ayarlar > "Az hareket".
 * Zayıf cihazda (az bellek / az çekirdek) parçacık sayısı yarıya iner.
 *
 * Ayar `<html data-motion="az">` olarak da yazılır; CSS animasyonları aynı
 * kuralla kısalır (globals.css).
 */
const KEY = 'payitaht-hareket'
const listeners = new Set<(low: boolean) => void>()
let cached: boolean | null = null

export function lowMotionSetting(): boolean {
  if (cached !== null) return cached
  try { cached = typeof localStorage !== 'undefined' && localStorage.getItem(KEY) === 'az' } catch { cached = false }
  return cached
}

export function setLowMotion(on: boolean) {
  cached = on
  try { if (on) localStorage.setItem(KEY, 'az'); else localStorage.removeItem(KEY) } catch { /* oturumluk */ }
  applyMotionAttr()
  for (const f of listeners) f(lowMotion())
}

export function onMotionChange(f: (low: boolean) => void) { listeners.add(f); return () => { listeners.delete(f) } }

/** Cihaz ayarı ya da oyun ayarı: efektler oynamaz, sonuç anında görünür. */
export function lowMotion(): boolean {
  if (lowMotionSetting()) return true
  try { return typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches } catch { return false }
}

export function applyMotionAttr() {
  if (typeof document === 'undefined') return
  if (lowMotionSetting()) document.documentElement.dataset.motion = 'az'
  else delete document.documentElement.dataset.motion
}

/** Zayıf cihaz: 4 GB ya da daha az bellek, 4 ya da daha az çekirdek. */
export function lowDevice(): boolean {
  if (typeof navigator === 'undefined') return false
  const mem = (navigator as Navigator & { deviceMemory?: number }).deviceMemory
  return (mem !== undefined && mem <= 4) || (navigator.hardwareConcurrency ?? 8) <= 4
}

/** Bir efektin parçacık sayısı: az harekette 0, zayıf cihazda yarısı. */
export function particles(n: number): number {
  if (lowMotion()) return 0
  return lowDevice() ? Math.max(1, Math.ceil(n / 2)) : n
}

/** Kaç jeton uçsun: miktar arttıkça biraz çoğalır (2–6). */
export function tokenCount(amount: number): number {
  return Math.max(2, Math.min(6, Math.round(Math.log10(Math.max(1, amount)) * 1.6)))
}
