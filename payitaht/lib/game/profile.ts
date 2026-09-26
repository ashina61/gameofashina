/**
 * HÜKÜMDAR PROFİLİ (Ikariam'daki oyuncu profili): adın, unvanın, armanın,
 * puanların, şehirlerin, istatistiklerin ve başarımların. Unvan puanla
 * yükselir; başarımlar kayıttan hesaplanır, ayrıca saklanmaz.
 */
import { BUILDING_IDS, RESEARCH_IDS, UNIT_IDS, UNITS, population, soldiers } from './engine'
import { advanceEmpire, type Empire } from './empire'
import { counters } from './daily'
import { playerScore, rankings, RIVALS, FACTIONS } from './rivals'

export const CRESTS = ['hilal', 'lale', 'kilic', 'gemi', 'kule', 'kitap'] as const
export type CrestId = typeof CRESTS[number]
export const CREST_NAMES: Record<CrestId, string> = {
  hilal: 'Hilal ve yıldız', lale: 'Lale', kilic: 'Çifte kılıç', gemi: 'Kadırga', kule: 'Burç', kitap: 'Kitap',
}
export const CREST_COLORS = ['#b3261e', '#2f6b4c', '#24406e', '#6a2a3a', '#8a5a22', '#2f7a92'] as const
export type Profile = { ruler: string; crest: CrestId; color: string; motto: string; since: number }

export function profileOf(empire: Empire): Profile {
  return empire.profile ?? { ruler: 'Bey', crest: 'hilal', color: CREST_COLORS[0], motto: '', since: empire.world?.start ?? empire.cities[0].game.updatedAt }
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

export function setProfile(source: Empire, patch: Partial<Pick<Profile, 'ruler' | 'crest' | 'color' | 'motto'>>, now: number): { empire: Empire; error?: string } {
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
      typeof p.since !== 'number' || !Number.isFinite(p.since)) throw new Error('Profil kaydı okunamadı.')
  return { ruler: p.ruler, crest: p.crest, color: p.color, motto: p.motto, since: p.since }
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

export type Achievement = { id: string; name: string; description: string; value: number; goal: number }
/** Başarımlar: kayıttan hesaplanır; ilerleme çubuğuyla gösterilir. */
export function achievements(empire: Empire): Achievement[] {
  const s = profileStats(empire)
  const maxDivan = Math.max(...empire.cities.map(x => x.game.buildings.divan))
  const ships = empire.cities.reduce((a, x) => a + UNIT_IDS.filter(id => UNITS[id].branch === 'deniz').reduce((b, id) => b + x.game.army[id], 0), 0)
  const allied = empire.world?.alliance ? 1 : 0
  return [
    { id: 'kurucu', name: 'Şehrin kurucusu', description: 'Divanhane 5. seviyeye ulaşsın.', value: maxDivan, goal: 5 },
    { id: 'payitaht', name: 'Payitaht', description: 'Divanhane 15. seviyeye ulaşsın.', value: maxDivan, goal: 15 },
    { id: 'koloni', name: 'Denizler ötesi', description: 'Üç şehre hükmet.', value: s.cities, goal: 3 },
    { id: 'kalabalik', name: 'Kalabalık memleket', description: 'İmparatorluğun nüfusu 1.000 olsun.', value: s.population, goal: 1000 },
    { id: 'mimar', name: 'Mimarbaşı', description: 'Toplam 150 bina seviyesi kur.', value: s.levels, goal: 150 },
    { id: 'alim', name: 'Âlimler meclisi', description: '20 araştırma tamamla.', value: s.research, goal: 20 },
    { id: 'allame', name: 'Allâme', description: `Bütün araştırmaları (${RESEARCH_IDS.length}) tamamla.`, value: s.research, goal: RESEARCH_IDS.length },
    { id: 'ordu', name: 'Kapıkulu', description: '300 asker ve tayfa besle.', value: s.soldiers, goal: 300 },
    { id: 'donanma', name: 'Kaptan-ı Derya', description: '20 gemi denize indir.', value: ships, goal: 20 },
    { id: 'zafer', name: 'Gazi', description: '10 savaş kazan.', value: s.won, goal: 10 },
    { id: 'yagma', name: 'Akıncı', description: '15 sefer yağması yap.', value: s.raids, goal: 15 },
    { id: 'korsan', name: 'Barbaros', description: '50 korsan şöhreti topla.', value: s.fame, goal: 50 },
    { id: 'casus', name: 'Gözcübaşı', description: '10 casus görevi yürüt.', value: s.spies, goal: 10 },
    { id: 'harika', name: 'Harikanın hamisi', description: 'Adanın harikasını 3. seviyeye çıkar.', value: s.wonder, goal: 3 },
    { id: 'ittifak', name: 'Birliğin sancağı', description: 'Bir ittifaka katıl.', value: allied, goal: 1 },
  ]
}

/** Sıralamadaki yerin (1 = ilk) her kolda. */
export function profileRanks(empire: Empire, now: number) {
  const place = (key: 'total' | 'military' | 'science' | 'gold') => rankings(empire, now, key).findIndex(x => x.you) + 1
  return { total: place('total'), military: place('military'), science: place('science'), gold: place('gold'), of: RIVALS.length + 1 }
}
export const allianceName = (empire: Empire) => empire.world?.alliance ? FACTIONS[empire.world.alliance].name : null
export { playerScore }
