/**
 * BÜYÜK HEDEFLER — başlangıç görevleri bitince oyuncuyu aylarca taşıyan,
 * ödüllü kilometre taşları. İlerleme kayıttan hesaplanır (ayrı sayaç
 * tutulmaz); kayıtta yalnızca ödülü alınmış hedeflerin kimliği durur.
 */
import { capacity, logEvent, population, type Resource } from './engine'
import { activeCity, type Empire } from './empire'

export type Milestone = {
  id: string; title: string; text: string; need: number
  progress: (e: Empire) => number
  reward: Partial<Record<Resource, number>>
}

const maxOf = (e: Empire, f: (g: Empire['cities'][number]['game']) => number) => Math.max(0, ...e.cities.map(c => f(c.game)))
const sumOf = (e: Empire, f: (g: Empire['cities'][number]['game']) => number) => e.cities.reduce((s, c) => s + f(c.game), 0)
const army = (g: Empire['cities'][number]['game']) => Object.values(g.army).reduce((s, n) => s + (n ?? 0), 0)

export const MILESTONES: Milestone[] = [
  { id: 'divan10', title: 'Sancak merkezi', text: 'Bir Divanhane\'yi 10. seviyeye çıkar', need: 10, progress: e => maxOf(e, g => g.buildings.divan), reward: { gold: 3000, wood: 3000 } },
  { id: 'colony2', title: 'Denizaşırı', text: 'İkinci şehrini kur', need: 2, progress: e => e.cities.length, reward: { gold: 4000, wood: 2000 } },
  { id: 'research15', title: 'İlim meclisi', text: '15 araştırmayı tamamla', need: 15, progress: e => maxOf(e, g => g.research.length), reward: { knowledge: 1500, gold: 2000 } },
  { id: 'army200', title: 'Ocak kuruldu', text: '200 asker ve gemiden oluşan bir ordu besle', need: 200, progress: e => sumOf(e, army), reward: { gold: 5000 } },
  { id: 'raids10', title: 'Akıncı beyi', text: '10 seferi zaferle bitir', need: 10, progress: e => e.stats?.raids ?? 0, reward: { gold: 6000, wood: 3000 } },
  { id: 'walls10', title: 'Kale şehir', text: 'Surları 10. seviyeye çıkar', need: 10, progress: e => maxOf(e, g => g.buildings.surlar), reward: { gold: 3000, wood: 3000 } },
  { id: 'pop2000', title: 'Kalabalık başkent', text: 'İmparatorluğunun nüfusu 2.000\'e ulaşsın', need: 2000, progress: e => sumOf(e, population), reward: { gold: 8000 } },
  { id: 'divan15', title: 'Beylerbeyilik', text: 'Bir Divanhane\'yi 15. seviyeye çıkar', need: 15, progress: e => maxOf(e, g => g.buildings.divan), reward: { gold: 10000, wood: 11000 } },
  { id: 'colony4', title: 'Adalar sultanı', text: 'Dört şehre hükmet', need: 4, progress: e => e.cities.length, reward: { gold: 15000, wood: 3000 } },
  { id: 'saray5', title: 'Saray halkı', text: 'Sarayı 5. seviyeye çıkar', need: 5, progress: e => maxOf(e, g => g.buildings.saray), reward: { gold: 8000 } },
  { id: 'research40', title: 'Ulema', text: '40 araştırmayı tamamla', need: 40, progress: e => maxOf(e, g => g.research.length), reward: { knowledge: 5000, gold: 6000 } },
  { id: 'divan20', title: 'Payitaht', text: 'Bir Divanhane\'yi 20. seviyeye çıkar', need: 20, progress: e => maxOf(e, g => g.buildings.divan), reward: { gold: 30000, wood: 30000 } },
]

export const milestoneProgress = (e: Empire, m: Milestone) => Math.min(m.need, m.progress(e))
export const milestoneDone = (e: Empire, m: Milestone) => m.progress(e) >= m.need

/** Ödülü alır (empire yerinde değişir); hata metni döner. */
export function claimMilestone(empire: Empire, id: string, now: number): string | undefined {
  const m = MILESTONES.find(x => x.id === id)
  if (!m) return 'Böyle bir hedef yok.'
  if (empire.milestones?.includes(id)) return 'Ödül zaten alındı.'
  if (!milestoneDone(empire, m)) return 'Hedef henüz tamamlanmadı.'
  empire.milestones = [...(empire.milestones ?? []), id]
  const g = activeCity(empire).game
  for (const [r, n] of Object.entries(m.reward) as [Resource, number][]) g.resources[r] = Math.min(capacity(g), g.resources[r] + n)
  logEvent(g, `Büyük hedef: ${m.title}. Ödül hazinede.`, now)
}

export function parseMilestones(raw: unknown): string[] | undefined {
  if (raw === undefined) return undefined
  if (!Array.isArray(raw) || raw.length > MILESTONES.length || !raw.every(id => typeof id === 'string' && MILESTONES.some(m => m.id === id)) ||
      new Set(raw).size !== raw.length) throw new Error('Büyük hedef kaydı okunamadı.')
  return raw.length ? [...raw] : undefined
}
