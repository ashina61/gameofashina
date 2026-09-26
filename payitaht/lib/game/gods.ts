/**
 * KADİM TANRILAR — Ikariam'ın tanrılar sisteminin Türk mitolojisi karşılığı.
 *
 * ONGUN MABEDİ dakikada LÜTUF biriktirir; SUNU (akçe, kereste, taş ya da lüks
 * mal) lütfü hızla artırır. Şehir bir tanrıyı HAMİ seçer:
 *  - Hami tanrının SÜREKLİ LÜTFU mabet seviyesiyle büyür.
 *  - Hami tanrının KUDRETİ lütuf harcanarak çağrılır; sonra tanrı dinlenir.
 * Hami değiştirmek 6 saat bekletir (tanrılar küser).
 */
import type { Game } from './engine'

export const GOD_IDS = ['tengri', 'umay', 'ulgen', 'kayra', 'erlik', 'kizagan', 'su', 'yel'] as const
export type GodId = typeof GOD_IDS[number]
export type God = {
  name: string; title: string; domain: string
  /** Mabet seviyesi başına sürekli lütuf. */
  per: number; passive: (level: number) => string
  power: string; powerText: string; cost: number
  /** Kudret süreli ise dakika (değilse anında etki). */
  minutes?: number
}
export const GODS: Record<GodId, God> = {
  tengri: { name: 'Tengri', title: 'Gök Tanrı', domain: 'Gök, kut ve kader', per: 0.01, passive: l => `Bütün üretim +%${l}`,
    power: 'Kut', powerText: 'Bir saatlik üretim anında ambara iner.', cost: 600 },
  umay: { name: 'Umay Ana', title: 'Bereket ve analar', domain: 'Doğum, çocuk, bereket', per: 0.03, passive: l => `Nüfus artışı +%${3 * l}, huzur +${4 * l}`,
    power: 'Bereket Yağmuru', powerText: 'Şehrin nüfusu hemen tavana ulaşır.', cost: 500 },
  ulgen: { name: 'Ülgen', title: 'İyilik ve bilgelik', domain: 'Işık, bilgi, iyilik', per: 0.02, passive: l => `İlim üretimi +%${2 * l}`,
    power: 'Aydınlanma', powerText: 'Süren araştırmanın kalan süresi yarıya iner.', cost: 400 },
  kayra: { name: 'Kayra Han', title: 'Yaratıcı', domain: 'Yaratılış ve yapı', per: 0.015, passive: l => `İnşaat süresi −%${(1.5 * l).toFixed(1)}`,
    power: 'Yaratış', powerText: 'Süren inşaatın kalan süresi yarıya iner.', cost: 450 },
  erlik: { name: 'Erlik Han', title: 'Yeraltının hanı', domain: 'Korku, ölüm, yeraltı', per: 0.015, passive: l => `Kara saldırısı +%${(1.5 * l).toFixed(1)}`,
    power: 'Karanlık Korku', powerText: 'Bir saat içinde şehre gelen baskınların askeri üçte bir azalır.', cost: 550, minutes: 60 },
  kizagan: { name: 'Kızagan', title: 'Savaş tanrısı', domain: 'Savaş ve kahramanlık', per: 0.015, passive: l => `Kara savunması ve sur +%${(1.5 * l).toFixed(1)}`,
    power: 'Savaş Narası', powerText: 'Bir saat boyunca kara birliklerinin saldırısı +%20.', cost: 500, minutes: 60 },
  su: { name: 'Su İyesi', title: 'Suların sahibi', domain: 'Deniz, ırmak, pınar', per: 0.02, passive: l => `Gemilerin saldırısı ve zırhı +%${2 * l}`,
    power: 'Dalga Kalkanı', powerText: 'Bir saat boyunca gemiler +%25 güçlü.', cost: 500, minutes: 60 },
  yel: { name: 'Yel Ana', title: 'Rüzgârların anası', domain: 'Rüzgâr ve yolculuk', per: 0.02, passive: l => `Yolculuk süresi −%${2 * l}`,
    power: 'Poyraz', powerText: 'Bir saat boyunca yola çıkan seferler %30 hızlı.', cost: 400, minutes: 60 },
}
export type Gods = {
  lutuf: number
  patron: GodId | null
  changedAt: number
  /** Kudretin tekrar çağrılabileceği an (tanrı başına). */
  rest: Partial<Record<GodId, number>>
  /** Süren süreli kudret. */
  buff: { god: GodId; until: number } | null
}
export const emptyGods = (): Gods => ({ lutuf: 0, patron: null, changedAt: 0, rest: {}, buff: null })
export const PATRON_CHANGE_MS = 6 * 3600_000
export const POWER_REST_MS = 4 * 3600_000
/** Sunu karşılığı: bu kadar mal = 1 lütuf. */
export const OFFER_RATE = { gold: 40, wood: 60, stone: 50, luxury: 8 } as const
export function lutufRate(g: Game) {
  return (g.buildings.mabet ?? 0) * 0.3 * (g.research?.includes('ongun_toresi') ? 1.2 : 1) * (1 + (g.future?.mitoloji ?? 0) * 0.05)
}
export function lutufCap(g: Game) { return (1000 + 400 * (g.buildings.mabet ?? 0)) * (g.research?.includes('balbal') ? 1.5 : 1) }
/** Kudretten sonra dinlenme (Kam Ayinleri 3 saate indirir). */
export function powerRestMs(g: Game) { return g.research?.includes('kam_ayini') ? 3 * 3600_000 : POWER_REST_MS }
/** Hami değiştirme beklemesi (Töre 3 saate indirir). */
export function patronChangeMs(g: Game) { return g.research?.includes('tore') ? 3 * 3600_000 : PATRON_CHANGE_MS }
/** Hami tanrının sürekli lütfünün derecesi (mabet seviyesi, en fazla 20). */
export function blessing(g: Game, id: GodId) {
  const s = g.gods
  if (!s || s.patron !== id || !(g.buildings.mabet > 0)) return 0
  const kut = g.research?.includes('gok_kutu')
  return Math.min(kut ? 25 : 20, g.buildings.mabet + (kut ? 2 : 0))
}
/** Süreli kudret şu an etkin mi? */
export function godBuff(g: Game, id: GodId, now = g.updatedAt) {
  const b = g.gods?.buff
  return !!b && b.god === id && now < b.until
}
