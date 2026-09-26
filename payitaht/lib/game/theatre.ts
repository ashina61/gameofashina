/**
 * KARAGÖZ PERDESİ — Ikariam'daki tiyatronun Osmanlı karşılığı: gölge oyunu.
 *
 * Perdede bir gösteri sahnelenir ve 12 saat boyunca halkı coşturur. Ardından
 * perde bir süre dinlenir (seviye yükseldikçe kısalır). Aynı anda tek gösteri.
 */
import type { Game } from './engine'

export const SHOW_IDS = ['dram', 'komedi', 'kultur', 'tanrisal'] as const
export type ShowId = typeof SHOW_IDS[number]
export const SHOWS: Record<ShowId, { name: string; play: string; effect: (level: number) => string }> = {
  dram: { name: 'Dram', play: 'Ferhat ile Şirin', effect: () => 'Kereste ve taş üretimi +%10' },
  komedi: { name: 'Komedi', play: 'Kanlı Nigâr', effect: () => 'Lüks mal üretimi +%10' },
  kultur: { name: 'Kültür gösterisi', play: 'Karagöz\'ün Hamamı', effect: l => `Huzur +${showContentment(l)}` },
  tanrisal: { name: 'Tanrısal gösterim', play: 'Tahir ile Zühre', effect: l => `Hemen +${showFavor(l)} lütuf (Ongun Mabedi)` },
}
export type Shows = { active: { id: ShowId; until: number } | null; readyAt: number }
export const emptyShows = (): Shows => ({ active: null, readyAt: 0 })
export const SHOW_MS = 12 * 3600_000
/** Gösterinin süresi (Destanlar araştırması 18 saate çıkarır). */
export function showLength(g: Game) { return g.research?.includes('destan') ? 18 * 3600_000 : SHOW_MS }
/** Gösteriden sonra perdenin yeniden açılması: 24 saatten başlar, seviye başına yarım saat kısalır (en az 12). */
export function showCooldownMs(level: number) { return Math.max(12, 24 - 0.5 * Math.max(0, level - 1)) * 3600_000 }
export function showContentment(level: number) { return 60 + 15 * level }
export function showFavor(level: number) { return 80 + 20 * level }
/** Şu an süren gösteri bu mu? */
export function showOn(g: Game, id: ShowId, now = g.updatedAt) {
  const a = g.shows?.active
  return !!a && a.id === id && now < a.until && (g.buildings.karagoz ?? 0) > 0
}
