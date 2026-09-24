/**
 * GÜNLÜK GÖREVLER VE GİRİŞ ÖDÜLÜ (Ikariam'ın günlük görevleri ve günlük giriş bonusu).
 *
 * Her gün (UTC) görev havuzundan üç görev seçilir; ilerleme, günün başındaki
 * sayaçlarla bugünkü sayaçların farkıdır. Giriş ödülü art arda gelinen gün
 * sayısıyla büyür (en fazla 7 gün).
 */
import { capacity, logEvent, type Resource } from './engine'
import { activeCity, type Empire } from './empire'

export type Counters = {
  builds: number; trained: number; researched: number; donated: number
  raids: number; spies: number; piracy: number; shipments: number
}
export type Daily = { day: string; base: Counters; tasks: string[]; claimed: string[]; streak: number; loginDay: string }
export type DailyTask = { id: string; text: string; key: keyof Counters; need: number; reward: Partial<Record<Resource, number>> }

export const DAILY_TASKS: DailyTask[] = [
  { id: 'build2', text: '2 bina yükseltmesini tamamla', key: 'builds', need: 2, reward: { gold: 500, wood: 300 } },
  { id: 'build4', text: '4 bina yükseltmesini tamamla', key: 'builds', need: 4, reward: { gold: 900, stone: 500 } },
  { id: 'train20', text: '20 birlik yetiştir', key: 'trained', need: 20, reward: { gold: 700 } },
  { id: 'research1', text: 'Bir araştırmayı tamamla', key: 'researched', need: 1, reward: { knowledge: 150, gold: 300 } },
  { id: 'donate500', text: 'Adaya 500 kereste bağışla (maden, orman ya da harika)', key: 'donated', need: 500, reward: { gold: 600 } },
  { id: 'raid1', text: 'Bir seferi zaferle bitir', key: 'raids', need: 1, reward: { gold: 800, wood: 400 } },
  { id: 'spy1', text: 'Bir casus görevi gönder', key: 'spies', need: 1, reward: { gold: 400 } },
  { id: 'piracy1', text: 'Bir korsan seferinde gemi ele geçir', key: 'piracy', need: 1, reward: { gold: 900 } },
  { id: 'ship1', text: 'Şehirlerin arasında bir nakliye gönder', key: 'shipments', need: 1, reward: { wood: 500, stone: 300 } },
]

export const dayKey = (now: number) => new Date(now).toISOString().slice(0, 10)
const prevDay = (day: string) => new Date(Date.parse(`${day}T00:00:00Z`) - 86_400_000).toISOString().slice(0, 10)

export function counters(empire: Empire): Counters {
  const out: Counters = { builds: 0, trained: 0, researched: 0, donated: 0, raids: 0, spies: 0, piracy: 0, shipments: 0 }
  for (const c of empire.cities) {
    out.builds += c.game.stats.builds; out.trained += c.game.stats.trained
    out.researched += c.game.stats.researched; out.donated += c.game.stats.donated
  }
  const e = empire.stats ?? { raids: 0, spies: 0, piracy: 0, shipments: 0 }
  out.raids = e.raids; out.spies = e.spies; out.piracy = e.piracy; out.shipments = e.shipments
  return out
}
function pick(day: string) {
  let h = 0
  for (const ch of day) h = (h * 31 + ch.charCodeAt(0)) >>> 0
  const pool = [...DAILY_TASKS]
  const out: string[] = []
  while (out.length < 3) { h = (h * 1103515245 + 12345) >>> 0; out.push(pool.splice(h % pool.length, 1)[0].id) }
  return out
}
/** Gün değiştiyse yeni görevleri kurar (advanceEmpire çağırır). */
export function ensureDaily(empire: Empire, now: number) {
  const day = dayKey(now)
  if (empire.daily?.day === day) return
  empire.daily = { day, base: counters(empire), tasks: pick(day), claimed: [], streak: empire.daily?.streak ?? 0, loginDay: empire.daily?.loginDay ?? '' }
}
export function taskProgress(empire: Empire, id: string) {
  const t = DAILY_TASKS.find(x => x.id === id)!
  const now = counters(empire)[t.key] - (empire.daily?.base[t.key] ?? 0)
  return Math.max(0, Math.min(t.need, now))
}
function pay(empire: Empire, reward: Partial<Record<Resource, number>>, now: number, text: string) {
  const g = activeCity(empire).game
  for (const [r, n] of Object.entries(reward) as [Resource, number][]) g.resources[r] = Math.min(capacity(g), g.resources[r] + n)
  logEvent(g, text, now)
}
export function claimTask(empire: Empire, id: string, now: number): string | undefined {
  ensureDaily(empire, now)
  const d = empire.daily!
  const t = DAILY_TASKS.find(x => x.id === id)
  if (!t || !d.tasks.includes(id)) return 'Bugünün görevi değil.'
  if (d.claimed.includes(id)) return 'Ödül zaten alındı.'
  if (taskProgress(empire, id) < t.need) return 'Görev henüz bitmedi.'
  d.claimed.push(id)
  pay(empire, t.reward, now, `Günlük görev ödülü: ${t.text}.`)
}
export const loginReward = (streak: number) => ({ gold: 250 * Math.min(7, streak), wood: 150 * Math.min(7, streak) })
export function claimLogin(empire: Empire, now: number): string | undefined {
  ensureDaily(empire, now)
  const d = empire.daily!
  if (d.loginDay === d.day) return 'Bugünün giriş ödülü alındı.'
  d.streak = d.loginDay === prevDay(d.day) ? d.streak + 1 : 1
  d.loginDay = d.day
  pay(empire, loginReward(d.streak), now, `Günlük giriş ödülü (${d.streak}. gün).`)
}
export function parseDaily(raw: unknown): Daily | undefined {
  if (raw === undefined) return undefined
  const d = raw as Daily
  const ok = !!d && typeof d.day === 'string' && typeof d.loginDay === 'string' && Number.isInteger(d.streak) && d.streak >= 0 &&
    Array.isArray(d.tasks) && d.tasks.every(t => DAILY_TASKS.some(x => x.id === t)) && Array.isArray(d.claimed) &&
    d.claimed.every(t => typeof t === 'string') && !!d.base &&
    (Object.keys(counters({ cities: [], stats: undefined } as unknown as Empire)) as (keyof Counters)[]).every(k => Number.isFinite(d.base[k]))
  if (!ok) throw new Error('Günlük görev kaydı okunamadı.')
  return { ...d, base: { ...d.base }, tasks: [...d.tasks], claimed: [...d.claimed] }
}
