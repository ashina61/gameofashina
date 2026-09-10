/** Arayuzde kullanilan sayi ve sure bicimlendiricileri. */

/** Buyuk sayilari kisaltir: 1250 -> 1.2K */
export function formatAmount(value: number): string {
  const rounded = Math.floor(value);
  if (rounded < 1000) return String(rounded);
  if (rounded < 1_000_000) return `${(rounded / 1000).toFixed(rounded < 10_000 ? 1 : 0)}K`;
  return `${(rounded / 1_000_000).toFixed(1)}M`;
}

/** Dakikalik uretim orani: +6.0 / -0.4 */
export function formatRate(value: number): string {
  if (Math.abs(value) < 0.05) return '0';
  const sign = value > 0 ? '+' : '';
  return `${sign}${value.toFixed(1)}`;
}

/** Saniyeyi mm:ss bicimine cevirir. */
export function formatDuration(totalSeconds: number): string {
  const seconds = Math.max(0, Math.ceil(totalSeconds));
  const minutes = Math.floor(seconds / 60);
  const rest = seconds % 60;
  if (minutes <= 0) return `${rest}s`;
  return `${minutes}:${String(rest).padStart(2, '0')}`;
}

/** Cevrimdisi gecen sureyi okunabilir metne cevirir. */
export function formatElapsed(totalSeconds: number): string {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  if (hours > 0) return `${hours} saat ${minutes} dakika`;
  if (minutes > 0) return `${minutes} dakika`;
  return `${Math.floor(totalSeconds)} saniye`;
}
