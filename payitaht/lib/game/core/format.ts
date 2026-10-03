import { type Job } from './types'

export function formatNumber(n: number) { return Math.floor(n).toLocaleString('tr-TR') }
/**
 * Dar yerler (üst bar) için en fazla 5 karakterlik sayı:
 * 9.876 · 33,2B · 332B · 1,2M (B = bin, M = milyon). Hiçbir zaman
 * yukarı yuvarlamaz: 999.999 "999B" olur, "1.000B" değil.
 */
export function formatShort(n: number) {
  const v = Math.trunc(n) || 0
  const a = Math.abs(v)
  const one = (x: number) => Math.abs(x) < 100 ? x.toLocaleString('tr-TR', { maximumFractionDigits: 1 }) : Math.trunc(x).toLocaleString('tr-TR')
  if (a >= 1_000_000) return `${one(Math.trunc(v / 100_000) / 10)}M`
  if (a >= 10_000) return `${one(Math.trunc(v / 100) / 10)}B`
  return v.toLocaleString('tr-TR')
}
/**
 * Dakikalık/saatlik oran: 100'ün altında tek ondalık, üstünde tam sayı,
 * Türkçe yazımla (1.629 · 12,5). İşaretli hâlde artılar "+" ile başlar.
 */
export function formatRate(n: number, signed = false) {
  const v = Math.abs(n) >= 100 ? Math.round(n) : Math.round(n * 10) / 10
  const s = (Object.is(v, -0) ? 0 : v).toLocaleString('tr-TR', { maximumFractionDigits: 1 })
  return signed && v > 0 ? `+${s}` : s
}
export function timeLeft(job: Job, now: number) { const seconds = Math.max(0, Math.ceil((job.end - now) / 1000)); return `${Math.floor(seconds / 60).toString().padStart(2, '0')}:${(seconds % 60).toString().padStart(2, '0')}` }
