/**
 * HÜKÜMDAR PROFİLİ (Ikariam'daki oyuncu profili): adın, unvanın, armanın,
 * puanların, şehirlerin, istatistiklerin ve başarımların. Unvan puanla
 * yükselir; başarımlar kayıttan hesaplanır, ayrıca saklanmaz.
 */
import { BUILDING_IDS, RESEARCH_IDS, UNIT_IDS, UNITS, population, soldiers } from './engine'
import { advanceEmpire, type Empire } from './empire'
import { counters } from './daily'
import { playerScore, rankings, RIVALS, FACTIONS, type RankKey } from './rivals'

export const CRESTS = ['hilal', 'lale', 'kilic', 'gemi', 'kule', 'kitap', 'gunes', 'kartal', 'kurt', 'okyay', 'cinar', 'cark'] as const
export type CrestId = typeof CRESTS[number]
export const CREST_NAMES: Record<CrestId, string> = {
  hilal: 'Hilal ve yıldız', lale: 'Lale', kilic: 'Çifte kılıç', gemi: 'Kadırga', kule: 'Burç', kitap: 'Kitap', gunes: 'Güneş', kartal: 'Kartal', kurt: 'Bozkurt', okyay: 'Ok ve yay', cinar: 'Çınar', cark: 'Sekiz köşeli yıldız',
}
export const CREST_COLORS = ['#b3261e', '#2f6b4c', '#24406e', '#6a2a3a', '#8a5a22', '#2f7a92', '#49336f', '#9b642e', '#1c4441', '#a54d35', '#34404d', '#796529'] as const
/** Sancak biçimi (profilin başında dalgalanır). */
export const BANNERS = ['kirlangic', 'cifte', 'ucgen', 'duz', 'sivri', 'oyuk', 'yuvarlak', 'testere', 'ucdil', 'dar'] as const
export type BannerId = typeof BANNERS[number]
export const BANNER_NAMES: Record<BannerId, string> = { kirlangic: 'Kırlangıç kuyruk', cifte: 'Çifte dil', ucgen: 'Üçgen flama', duz: 'Dört köşe', sivri: 'Mızrak uç', oyuk: 'Derin kuyruk', yuvarlak: 'Yuvarlak uç', testere: 'Dişli uç', ucdil: 'Üç dil', dar: 'İnce flama' }
export type Profile = { ruler: string; crest: CrestId; color: string; motto: string; since: number; banner?: BannerId }

export function profileOf(empire: Empire): Profile {
  return empire.profile ?? { ruler: 'Ertuğrul', crest: 'hilal', color: CREST_COLORS[0], motto: '', since: empire.world?.start ?? empire.cities[0].game.updatedAt }
}

/** Unvan puanla yükselir (Ikariam'daki sıralama unvanlarının karşılığı). */
export const TITLES: { min: number; name: string }[] = [
  { min: 0, name: 'Bey' }, { min: 5_000, name: 'Sancakbeyi' }, { min: 15_000, name: 'Beylerbeyi' },
  { min: 35_000, name: 'Vezir' }, { min: 70_000, name: 'Sadrazam' }, { min: 150_000, name: 'Sultan' },
]
export function rulerTitle(score: number) {
  let t = TITLES[0]
  for (const x of TITLES) if (score >= x.min) t = x
  const next = TITLES[TITLES.indexOf(t) + 1]
  return { name: t.name, next: next?.name, need: next ? next.min - score : 0, progress: next ? (score - t.min) / (next.min - t.min) : 1 }
}

export function setProfile(source: Empire, patch: Partial<Pick<Profile, 'ruler' | 'crest' | 'color' | 'motto' | 'banner'>>, now: number): { empire: Empire; error?: string } {
  const empire = advanceEmpire(source, now)
  const p = { ...profileOf(empire) }
  if (patch.ruler !== undefined) {
    const name = patch.ruler.trim().replace(/\s+/g, ' ')
    if (name.length < 2 || name.length > 24) return { empire, error: 'Ad 2-24 harf olmalı.' }
    p.ruler = name
  }
  if (patch.motto !== undefined) {
    const m = patch.motto.trim()
    if (m.length > 60) return { empire, error: 'Düstur en fazla 60 harf.' }
    p.motto = m
  }
  if (patch.crest !== undefined) {
    if (!CRESTS.includes(patch.crest)) return { empire, error: 'Bilinmeyen arma.' }
    p.crest = patch.crest
  }
  if (patch.banner !== undefined) {
    if (!BANNERS.includes(patch.banner)) return { empire, error: 'Bilinmeyen sancak.' }
    p.banner = patch.banner
  }
  if (patch.color !== undefined) {
    if (!(CREST_COLORS as readonly string[]).includes(patch.color)) return { empire, error: 'Bilinmeyen renk.' }
    p.color = patch.color
  }
  empire.profile = p
  return { empire }
}

export function parseProfile(raw: unknown): Profile | undefined {
  if (raw === undefined) return undefined
  const p = raw as Profile
  if (!p || typeof p.ruler !== 'string' || p.ruler.length < 1 || p.ruler.length > 24 || !CRESTS.includes(p.crest) ||
      !(CREST_COLORS as readonly string[]).includes(p.color) || typeof p.motto !== 'string' || p.motto.length > 60 ||
      typeof p.since !== 'number' || !Number.isFinite(p.since) || (p.banner !== undefined && !BANNERS.includes(p.banner))) throw new Error('Profil kaydı okunamadı.')
  return { ruler: p.ruler, crest: p.crest, color: p.color, motto: p.motto, since: p.since, ...(p.banner ? { banner: p.banner } : {}) }
}

/** Profil sayfasının istatistikleri. */
export function profileStats(empire: Empire) {
  const c = counters(empire)
  const reports = empire.reports ?? []
  const battles = reports.filter(r => r.kind === 'raid' || r.kind === 'occupy' || r.kind === 'defense' || r.kind === 'piracy' || r.kind === 'blockade' || r.kind === 'support')
  return {
    ...c,
    cities: empire.cities.length,
    population: empire.cities.reduce((s, x) => s + population(x.game), 0),
    soldiers: empire.cities.reduce((s, x) => s + soldiers(x.game), 0),
    levels: empire.cities.reduce((s, x) => s + BUILDING_IDS.reduce((a, id) => a + x.game.buildings[id], 0), 0),
    research: Math.max(...empire.cities.map(x => x.game.research.length)),
    won: battles.filter(r => r.success).length,
    lost: battles.filter(r => !r.success).length,
    fame: empire.cities.reduce((s, x) => s + (x.game.piracy ?? 0), 0),
    wonder: Math.max(...empire.cities.map(x => x.game.temple?.wonderLevel ?? 0)),
  }
}

/** Madalya derecesi: 1 tunç, 2 gümüş, 3 altın. */
export type MedalTier = 1 | 2 | 3
export type Achievement = { id: string; name: string; description: string; value: number; goal: number; tier: MedalTier }
/**
 * Başarımlar (V2 Faz 5.7): 30 madalya, kayıttan hesaplanır, ilerleme
 * çubuğuyla gösterilir. Tunç madalyalar ilk saatlerde, altınlar uzun
 * oyunda gelir; profilin vitrini kazanılanları dereceye göre dizer.
 */
export function achievements(empire: Empire): Achievement[] {
  const s = profileStats(empire)
  const maxDivan = Math.max(...empire.cities.map(x => x.game.buildings.divan))
  const maxWall = Math.max(...empire.cities.map(x => x.game.buildings.surlar))
  const ships = empire.cities.reduce((a, x) => a + UNIT_IDS.filter(id => UNITS[id].branch === 'deniz').reduce((b, id) => b + x.game.army[id], 0), 0)
  const allied = empire.world?.alliance || empire.world?.pact ? 1 : 0
  const streak = empire.daily?.streak ?? 0
  const a = (id: string, tier: MedalTier, name: string, description: string, value: number, goal: number): Achievement => ({ id, name, description, value, goal, tier })
  return [
    a('ilk-tas', 1, 'İlk taş', '10 yapı kur ya da yükselt.', s.builds, 10),
    a('kurucu', 1, 'Şehrin kurucusu', 'Divanhane 5. seviyeye ulaşsın.', maxDivan, 5),
    a('beyler', 2, 'Sancak şehri', 'Divanhane 10. seviyeye ulaşsın.', maxDivan, 10),
    a('payitaht', 3, 'Payitaht', 'Divanhane 15. seviyeye ulaşsın.', maxDivan, 15),
    a('sur', 1, 'Kale kapısı', 'Surları 5. seviyeye çıkar.', maxWall, 5),
    a('mimar', 2, 'Mimarbaşı', 'Toplam 150 bina seviyesi kur.', s.levels, 150),
    a('usta', 3, 'Koca Sinan', '300 yapı kur ya da yükselt.', s.builds, 300),
    a('koloni', 2, 'Denizler ötesi', 'Üç şehre hükmet.', s.cities, 3),
    a('adalar', 3, 'Adalar efendisi', 'Beş şehre hükmet.', s.cities, 5),
    a('kalabalik', 2, 'Kalabalık memleket', 'İmparatorluğun nüfusu 1.000 olsun.', s.population, 1000),
    a('kalabalik2', 3, 'Cihan şehri', 'İmparatorluğun nüfusu 5.000 olsun.', s.population, 5000),
    a('talebe', 1, 'Talebe', '5 araştırma tamamla.', s.research, 5),
    a('alim', 2, 'Âlimler meclisi', '20 araştırma tamamla.', s.research, 20),
    a('allame', 3, 'Allâme', `Bütün araştırmaları (${RESEARCH_IDS.length}) tamamla.`, s.research, RESEARCH_IDS.length),
    a('talim', 1, 'Talimhane', '50 birlik eğit.', s.trained, 50),
    a('ordu', 2, 'Kapıkulu', '300 asker ve tayfa besle.', s.soldiers, 300),
    a('donanma', 2, 'Kaptan-ı Derya', '20 gemi denize indir.', ships, 20),
    a('ilk-zafer', 1, 'İlk zafer', 'Bir savaş kazan.', s.won, 1),
    a('zafer', 2, 'Gazi', '10 savaş kazan.', s.won, 10),
    a('zafer2', 3, 'Fatih', '50 savaş kazan.', s.won, 50),
    a('yagma', 2, 'Akıncı', '15 sefer yağması yap.', s.raids, 15),
    a('korsan1', 1, 'Levent', 'Bir korsan seferine çık.', s.piracy, 1),
    a('korsan', 3, 'Barbaros', '50 korsan şöhreti topla.', s.fame, 50),
    a('casus1', 1, 'Kulak', 'Bir casus görevi yürüt.', s.spies, 1),
    a('casus', 2, 'Gözcübaşı', '10 casus görevi yürüt.', s.spies, 10),
    a('kervan', 1, 'Kervancı', '10 nakliye gönder.', s.shipments, 10),
    a('hayir', 2, 'Hayırsever', 'Adaya 5.000 kereste bağışla.', s.donated, 5000),
    a('harika', 3, 'Harikanın hamisi', 'Adanın harikasını 3. seviyeye çıkar.', s.wonder, 3),
    a('ittifak', 1, 'Birliğin sancağı', 'Bir ittifaka katıl.', allied, 1),
    a('sadakat', 2, 'Sadık hükümdar', 'Yedi gün üst üste oyuna gir.', streak, 7),
  ]
}

/** Sıralamadaki yerin (1 = ilk) her kolda. */
export function profileRanks(empire: Empire, now: number) {
  const place = (key: RankKey) => rankings(empire, now, key).findIndex(x => x.you) + 1
  const keys: RankKey[] = ['total', 'builder', 'military', 'offense', 'defense', 'science', 'gold', 'trade']
  return { ...(Object.fromEntries(keys.map(k => [k, place(k)])) as Record<RankKey, number>), of: RIVALS.length + 1 }
}
export const allianceName = (empire: Empire) => empire.world?.pact ? `${empire.world.pact.name} [${empire.world.pact.tag}]` : empire.world?.alliance ? FACTIONS[empire.world.alliance].name : null
export { playerScore }

/**
 * YAPAY RAKİP ARMASI (V2 Faz 2.3) — rakipler kayıtta arma saklamaz; arma ve
 * renk kimlikten türetilir, her açılışta aynı çıkar. Sembol üslubu anlatır
 * (savaşçıda kılıç, âlimde kitap...), renk sıradan gelir: iki rakip aynı
 * arma ve rengi birlikte taşımaz.
 */
const STYLE_CRESTS: Record<'tuccar' | 'savasci' | 'alim' | 'denizci', CrestId[]> = {
  savasci: ['kilic', 'kartal', 'kurt', 'okyay'], tuccar: ['lale', 'cark', 'gunes', 'hilal'], alim: ['kitap', 'cinar', 'gunes', 'kule'], denizci: ['gemi', 'hilal', 'kule', 'cark'],
}
export function rivalHeraldry(rivalId: string): { crest: CrestId; color: string } {
  const i = Math.max(0, RIVALS.findIndex(r => r.id === rivalId))
  const r = RIVALS[i]
  const pool = STYLE_CRESTS[r.style]
  const nth = RIVALS.slice(0, i).filter(x => x.style === r.style).length
  return { crest: pool[nth % pool.length], color: CREST_COLORS[(i * 5 + 1) % CREST_COLORS.length] }
}
