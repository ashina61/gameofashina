/**
 * AHİ TEKKESİ VE LONCA HİMAYESİ — Osmanlı esnaf loncalarının kalıcı bonusları.
 * (Tanrılar ayrı sistemdir: bkz. gods.ts, Ongun Mabedi.)
 *
 * Tekke dakikada HİMMET biriktirir (seviyeyle artar). Oyuncu himmeti bir
 * loncaya ADAR; adanan himmet loncanın derecesini (0-10) yükseltir. Ama
 * yalnızca HİMAYE ettiğin loncalar etki eder: Tekke 1'de bir, 5'te iki,
 * 10'da üç lonca himaye edilebilir. Himayeden çıkarılan lonca derecesini
 * korur; yeni bir değişiklik için yarım saat beklenir.
 */
import type { Game } from './engine'

export const GUILD_IDS = ['demirci', 'gemici', 'tuccar', 'dulger', 'katip', 'kahveci'] as const
export type GuildId = typeof GUILD_IDS[number]
export const GUILDS: Record<GuildId, { name: string; craft: string; per: number; effect: (level: number) => string }> = {
  demirci: { name: 'Demirciler', craft: 'Kılıç, zırh ve nal döverler.', per: 0.02, effect: l => `Kara birliklerinin saldırısı +%${2 * l}` },
  gemici: { name: 'Gemiciler', craft: 'Kalafat, yelken ve halat işi.', per: 0.02, effect: l => `Gemilerin saldırısı ve zırhı +%${2 * l}` },
  tuccar: { name: 'Tüccarlar', craft: 'Çarşının ve kervanın esnafı.', per: 0.03, effect: l => `Akçe geliri +%${3 * l}` },
  dulger: { name: 'Dülgerler ve Taşçılar', craft: 'Çatıyı, duvarı ve kemeri kurarlar.', per: 0.02, effect: l => `Binaların kereste ve taş maliyeti −%${2 * l}` },
  katip: { name: 'Kâtipler ve Sahaflar', craft: 'Kitap yazar, cilt yapar, satarlar.', per: 0.03, effect: l => `İlim üretimi +%${3 * l}` },
  kahveci: { name: 'Kahveciler ve Aşçılar', craft: 'Kahveyi, şerbeti ve sofrayı kurarlar.', per: 6, effect: l => `Huzur +${6 * l}` },
}
export type Guilds = { himmet: number; devotion: Record<GuildId, number>; patrons: GuildId[]; changedAt: number }
export const GUILD_MAX = 10
export const PATRON_COOLDOWN_MS = 30 * 60_000
export const emptyGuilds = (): Guilds => ({ himmet: 0, devotion: Object.fromEntries(GUILD_IDS.map(id => [id, 0])) as Record<GuildId, number>, patrons: [], changedAt: 0 })

/** Loncanın derecesi: n. derece için toplam 100·n² himmet adanır. */
export function guildLevel(devotion: number) { return Math.min(GUILD_MAX, Math.floor(Math.sqrt(Math.max(0, devotion) / 100))) }
export function devotionFor(level: number) { return 100 * level * level }
/** Aynı anda himaye edilebilecek lonca sayısı (Tekke seviyesiyle). */
export function patronSlots(tekke: number) { return tekke <= 0 ? 0 : tekke >= 10 ? 3 : tekke >= 5 ? 2 : 1 }
/** Dakikalık himmet (Tekke seviyesi başına 0,4; Loncalar yönetimi %25 fazla). */
export function himmetRate(g: Game) { return (g.buildings.tekke ?? 0) * 0.4 * (g.government?.id === 'loncalar' ? 1.25 : 1) }
export function himmetCap(g: Game) { return 1500 + 500 * (g.buildings.tekke ?? 0) }

/** Himaye edilen loncanın derecesi (himayede değilse 0). */
export function guildBonus(g: Game, id: GuildId) {
  const s = g.guilds
  if (!s || !(g.buildings.tekke > 0) || !s.patrons.includes(id)) return 0
  return guildLevel(s.devotion[id] ?? 0)
}
