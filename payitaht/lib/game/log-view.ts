/**
 * OLAY ZAMAN ÇİZELGESİ (V2 Faz 2.2) — günlük satırlarına tür verir (simge
 * için) ve güne göre gruplar ("Bugün", "Dün", "26 Eyl"). Kayıt değişmez;
 * tür metinden çıkarılır.
 */
import type { Game } from './engine'

export type LogKind = 'war' | 'build' | 'research' | 'trade' | 'reward' | 'faith' | 'other'

const RULES: [LogKind, RegExp][] = [
  ['war', /baskın|sefer|ordu|filo|savaş|zafer|yenilgi|işgal|kuşat|korsan|casus|abluka|takviye|düştü|haraç|birlik|asker/i],
  ['reward', /ödül|büyük hedef|görev/i],
  ['research', /araştırma|âlim|ilim|medrese/i],
  ['trade', /satıldı|alındı|pazar|ticaret|tüccar|gemi|nakliye|hediye|teklif/i],
  ['faith', /mucize|tanrı|lonca|cami|kudretini|karagöz/i],
  ['build', /seviyeye|kuruldu|taşındı|inşa|usta|ilan edildi|nişan|terk edildi/i],
]

export function logKind(text: string): LogKind {
  for (const [kind, re] of RULES) if (re.test(text)) return kind
  return 'other'
}

const DAY = 86_400_000
const dayStart = (t: number) => { const d = new Date(t); d.setHours(0, 0, 0, 0); return d.getTime() }

export function dayLabel(time: number, now: number): string {
  const diff = Math.round((dayStart(now) - dayStart(time)) / DAY)
  if (diff <= 0) return 'Bugün'
  if (diff === 1) return 'Dün'
  return new Date(time).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' })
}

/** En yeni başta gelen satırları güne göre böler (sıra korunur). */
export function dayGroups<T extends { time: number }>(entries: T[], now: number): { label: string; items: T[] }[] {
  const out: { label: string; items: T[] }[] = []
  for (const e of entries) {
    const label = dayLabel(e.time, now)
    const last = out[out.length - 1]
    if (last && last.label === label) last.items.push(e)
    else out.push({ label, items: [e] })
  }
  return out
}

export type LogEntry = Game['log'][number]
