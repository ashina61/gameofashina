/**
 * YOKLUĞUNDA OLANLAR — oyun açılınca kayıttaki eski hâl ile çevrimdışı
 * ilerletilmiş hâl karşılaştırılır: biten inşaatlar, araştırmalar, yetişen
 * birlikler, biriken kaynaklar, gelen raporlar ve dünyadan haberler.
 * Kısa aralar (20 dakikadan az) özet çıkarmaz.
 */
import { BUILDINGS, BUILDING_IDS, RESEARCH, UNITS, UNIT_IDS, capacity, type ResearchId } from './engine'
import type { Empire } from './empire'

export type AwaySummary = {
  minutes: number
  built: string[]
  researched: string[]
  trained: string[]
  gained: { gold: number; wood: number; stone: number; knowledge: number }
  reports: { title: string; success: boolean }[]
  news: string[]
  /** Ambarı dolu kalan şehir var mı (üretim boşa gitti). */
  full: boolean
}

export const AWAY_MIN_MS = 20 * 60_000

const lastSeen = (e: Empire) => Math.max(...e.cities.map(c => c.game.updatedAt))

export function awaySummary(before: Empire, after: Empire): AwaySummary | null {
  const since = lastSeen(before)
  const ms = lastSeen(after) - since
  if (ms < AWAY_MIN_MS) return null
  const built: string[] = [], researched: string[] = [], trained: string[] = []
  const gained = { gold: 0, wood: 0, stone: 0, knowledge: 0 }
  for (const c of after.cities) {
    const old = before.cities.find(o => o.id === c.id)
    if (!old) continue
    for (const id of BUILDING_IDS) {
      if (c.game.buildings[id] > old.game.buildings[id]) built.push(`${BUILDINGS[id].name} ${c.game.buildings[id]}. seviye${after.cities.length > 1 ? ` (${c.name})` : ''}`)
    }
    for (const id of c.game.research as ResearchId[]) if (!old.game.research.includes(id)) researched.push(RESEARCH[id].name)
    for (const id of UNIT_IDS) {
      const d = (c.game.army[id] ?? 0) - (old.game.army[id] ?? 0)
      if (d > 0) trained.push(`${d} ${UNITS[id].name}`)
    }
    for (const k of Object.keys(gained) as (keyof typeof gained)[]) gained[k] += Math.max(0, Math.round(c.game.resources[k] - old.game.resources[k]))
  }
  const reports = (after.reports ?? []).filter(r => r.time > since && !(before.reports ?? []).some(o => o.id === r.id))
    .map(r => ({ title: r.title, success: r.success }))
  const news = (after.world?.news ?? []).filter(n => n.time > since && !(before.world?.news ?? []).some(o => o.id === n.id)).map(n => n.text)
  const full = after.cities.some(c => (['gold', 'wood', 'stone'] as const).some(k => c.game.resources[k] >= capacity(c.game) - 1))
  return { minutes: Math.round(ms / 60_000), built, researched, trained, gained, reports: reports.slice(0, 6), news: [...new Set(news)].slice(0, 5), full }
}

/** "3 sa 20 dk", "2 gün 4 sa" gibi. */
export function awayLength(minutes: number): string {
  if (minutes < 60) return `${minutes} dakika`
  const h = Math.floor(minutes / 60)
  if (h < 24) return `${h} saat${minutes % 60 ? ` ${minutes % 60} dakika` : ''}`
  return `${Math.floor(h / 24)} gün${h % 24 ? ` ${h % 24} saat` : ''}`
}
