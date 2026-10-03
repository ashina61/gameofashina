/**
 * HAFTALIK OLAYLAR (V2 Faz 5.6) — her hafta bir mevsim olayı döner:
 *
 *   Kervan haftası  Çarşı ve Ticaret Merkezi günlük alım-satım sınırı ×1,5, gemiler ×1,5 yük
 *   Korsan sezonu   baskınlar daha sık gelir, seferlerde ganimet ×1,5
 *   Hasat           kereste üretimi ×1,25
 *   Ramazan         şehirde huzur +100
 *
 * Takvim altı haftalık bir çevrim (iki hafta sakin). Haftalar pazartesi
 * 00:00 UTC'de başlar. Takvimin başlangıcından (5 Ocak 2026) önce olay
 * yoktur; eski kayıtlar ve testler etkilenmez. Saf fonksiyonlar; motor
 * etkileri `updatedAt` ile sorar.
 */
export type SeasonId = 'kervan' | 'korsan' | 'hasat' | 'ramazan'

export const WEEK_MS = 7 * 24 * 3600_000
export const SEASON_EPOCH = Date.UTC(2026, 0, 5)
export const SEASON_CYCLE: (SeasonId | null)[] = ['kervan', null, 'korsan', 'hasat', null, 'ramazan']

export const SEASONS: Record<SeasonId, { name: string; effect: string; start: string; end: string }> = {
  kervan: { name: 'Kervan haftası', effect: 'Çarşı ve Ticaret Merkezi daha çok alıp satar (×1,5), gemiler daha çok yük taşır (×1,5).', start: 'Kervanlar adaya ulaştı: bu hafta ticaret bereketli.', end: 'Kervanlar yola çıktı; ticaret olağan hâline döndü.' },
  korsan: { name: 'Korsan sezonu', effect: 'Korsan baskınları daha sık gelir; seferlerde ganimet ×1,5.', start: 'Korsan sezonu açıldı: sularda kara bayraklar çoğaldı. Surlarını ve donanmanı hazırla.', end: 'Korsan sezonu kapandı; denizler yatıştı.' },
  hasat: { name: 'Hasat', effect: 'Kereste üretimi ×1,25.', start: 'Hasat zamanı: ormanlarda ve tarlalarda iş bereketli.', end: 'Hasat bitti.' },
  ramazan: { name: 'Ramazan', effect: 'Bütün şehirlerde huzur +100.', start: 'Ramazan geldi: iftar sofraları kuruldu, şehirde huzur arttı.', end: 'Ramazan bayramı kutlandı; ay sona erdi.' },
}

/** Bu anın haftalık olayı (yoksa null). */
export function seasonAt(t: number): SeasonId | null {
  if (t < SEASON_EPOCH) return null
  const week = Math.floor((t - SEASON_EPOCH) / WEEK_MS)
  return SEASON_CYCLE[week % SEASON_CYCLE.length]
}

/** Bu anın haftası: olay, başlangıç ve bitiş. */
export function seasonWeek(t: number): { id: SeasonId | null; start: number; end: number } {
  const week = Math.floor((Math.max(t, SEASON_EPOCH) - SEASON_EPOCH) / WEEK_MS)
  const start = SEASON_EPOCH + week * WEEK_MS
  return { id: seasonAt(t), start, end: start + WEEK_MS }
}

export const tradeMul = (t: number) => seasonAt(t) === 'kervan' ? 1.5 : 1
export const woodMul = (t: number) => seasonAt(t) === 'hasat' ? 1.25 : 1
export const lootMul = (t: number) => seasonAt(t) === 'korsan' ? 1.5 : 1
export const threatIntervalMul = (t: number) => seasonAt(t) === 'korsan' ? 0.6 : 1
export const seasonContentment = (t: number) => seasonAt(t) === 'ramazan' ? 100 : 0

/** İki an arasında başlayan ve biten olaylar (zaman sırasıyla). */
export function seasonChanges(from: number, to: number): { time: number; id: SeasonId; kind: 'start' | 'end' }[] {
  const out: { time: number; id: SeasonId; kind: 'start' | 'end' }[] = []
  if (to <= from) return out
  // Uzun yoklukta yalnız son iki geçiş yeter (haberler taşmasın).
  let w = seasonWeek(from).end
  const first = Math.max(w, to - 2 * WEEK_MS)
  while (w <= to) {
    if (w >= first) {
      const prev = seasonAt(w - 1), next = seasonAt(w)
      if (prev && prev !== next) out.push({ time: w, id: prev, kind: 'end' })
      if (next && prev !== next) out.push({ time: w, id: next, kind: 'start' })
    }
    w += WEEK_MS
  }
  return out
}
