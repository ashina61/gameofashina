/**
 * ROZET BÜTÇESİ (V2 Faz 2.10) — ekranda aynı anda en çok iki sayılı kırmızı
 * rozet. Önceliği yüksek ilk ikisi sayı gösterir, kalan haberler yalnız
 * nokta olur: oyuncu "neye önce bakmalıyım" sorusunun cevabını görür.
 */
export type BadgeMode = 'count' | 'dot' | null

/** Düşük sayı = daha acil. */
export const BADGE_PRIORITY = {
  army: 1, // baskın, kuşatma, yeni savaş raporu
  objectives: 2, // alınmayı bekleyen ödül
  diplo: 3, // mektup ve teklif
  offers: 4, // haritadaki elçi mektubu
  alliance: 5, // okunmamış genelge
  city: 6, // şehir günlüğü
  research: 7, // boştaki âlimler
} as const
export type BadgeKey = keyof typeof BADGE_PRIORITY

export function badgeBudget(counts: Partial<Record<BadgeKey, number>>, max = 2): Record<BadgeKey, BadgeMode> {
  const keys = Object.keys(BADGE_PRIORITY) as BadgeKey[]
  const active = keys.filter(k => (counts[k] ?? 0) > 0).sort((a, b) => BADGE_PRIORITY[a] - BADGE_PRIORITY[b])
  const out = Object.fromEntries(keys.map(k => [k, null])) as Record<BadgeKey, BadgeMode>
  active.forEach((k, i) => { out[k] = i < max ? 'count' : 'dot' })
  return out
}
