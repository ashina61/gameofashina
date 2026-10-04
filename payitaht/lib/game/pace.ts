/**
 * TEMPO SİMÜLASYONU (V2 Faz 5.2) — 30 günlük oyunu üç oyuncu tipiyle oynatır
 * ve Divanhane seviyesinin günlere göre eğrisini çıkarır.
 *
 *   aktif         uyanık saatlerde (08-24) yarım saatte bir girer
 *   günde 3       08:00, 14:00, 21:00
 *   günde 1       20:00
 *
 * Her girişte bot: biten hedeflerin ödülünü alır, kuyruğu öncelik sırasıyla
 * doldurur (Divanhane önce; sonra konut, üretim, ambar...), boştaysa bir
 * araştırma başlatır. Bot "akıllı" değildir; bilerek sade tutulur ki eğri
 * motorun temposunu ölçsün, botun zekâsını değil.
 *
 * Hedef (plan): Divanhane 10 → 2. gün, 15 → 7. gün, 20 → 30. gün (±%20).
 */
import {
  BUILDING_IDS, LUXURY_IDS, OBJECTIVES, QUEUE_LIMIT, RESEARCH_IDS, WORKER_IDS, advance, buildReason, execute, freePlotsFor, initialGame,
  luxuryCost, merchantLimit, objectiveDone, researchReason, takesPlot, workerCapacity, type BuildingId, type Game,
} from './engine'

export type Profile = 'aktif' | 'gunde3' | 'gunde1'
const H = 3600_000, DAY = 24 * H

export function loginTimes(profile: Profile, day: number): number[] {
  const base = day * DAY
  if (profile === 'gunde1') return [base + 20 * H]
  if (profile === 'gunde3') return [base + 8 * H, base + 14 * H, base + 21 * H]
  return Array.from({ length: 32 }, (_, i) => base + 8 * H + i * 0.5 * H)
}

/** Öncelik: önce Divanhane (her şeyin kapısı), sonra ekonomi ve depolama. */
const PRIORITY: BuildingId[] = ['divan', 'konut', 'kereste', 'ambar', 'carsi', 'medrese', 'depo', 'hamam', 'kahvehane', 'saray', 'liman']
const order = (): BuildingId[] => [...PRIORITY, ...BUILDING_IDS.filter(id => !PRIORITY.includes(id))]

export function botTurn(source: Game, now: number): Game {
  let g = advance(source, now)
  for (const o of OBJECTIVES) {
    if (!g.claimed.includes(o.id) && objectiveDone(g, o.id)) {
      const r = execute(g, { type: 'claim', id: o.id }, now)
      if (!r.error) g = r.game
    }
  }
  // Boştaki halk: önce ada madeni (lüks mal), sonra üretim binaları.
  const run = (cmd: Parameters<typeof execute>[1]) => { const r = execute(g, cmd, now); if (!r.error) g = r.game; return !r.error }
  // Dengeli dağıtım: önce hepsi boşaltılır, sonra kereste, ilim ve çarşıya
  // onar onar sırayla verilir; artan halk madene gider.
  for (const w of WORKER_IDS) run({ type: 'workers', id: w, value: 0 })
  run({ type: 'miners', value: 0 })
  for (let k = 0; k < 400; k++) {
    let moved = false
    for (const w of ['kereste', 'medrese', 'carsi'] as const) {
      const before = g.workers[w]
      if (before < workerCapacity(g, w)) { run({ type: 'workers', id: w, value: before + 10 }); moved ||= g.workers[w] > before }
    }
    if (!moved) break
  }
  run({ type: 'miners', value: 1e6 })
  // Sıradaki öncelikli yapı için eksik lüks malı tüccardan al.
  for (const id of order().slice(0, 6)) {
    const lux = luxuryCost(g, id)
    for (const r of LUXURY_IDS) {
      const short = Math.ceil((lux[r] ?? 0) - g.luxury[r])
      if (short > 0) run({ type: 'trade', id: r, side: 'buy', amount: Math.min(short, merchantLimit(g)) })
    }
  }
  for (let guard = 0; guard < 20 && g.queue.length < QUEUE_LIMIT; guard++) {
    let placed = false
    for (const id of order()) {
      if (buildReason(g, id)) continue
      const plot = g.buildings[id] === 0 && takesPlot(id) ? freePlotsFor(g, id)[0] : undefined
      if (g.buildings[id] === 0 && takesPlot(id) && plot === undefined) continue
      const r = execute(g, { type: 'build', id, plot }, now)
      if (!r.error) { g = r.game; placed = true; break }
    }
    if (!placed) break
  }
  if (!g.study) {
    for (const id of RESEARCH_IDS) {
      if (researchReason(g, id)) continue
      const r = execute(g, { type: 'research', id }, now)
      if (!r.error) { g = r.game; break }
    }
  }
  return g
}

/** Gün sonu Divanhane seviyeleri (indeks 0 = 1. gün). */
export function paceCurve(profile: Profile, days = 30): number[] {
  let g = initialGame(0)
  const out: number[] = []
  for (let d = 0; d < days; d++) {
    for (const t of loginTimes(profile, d)) g = botTurn(g, t)
    g = advance(g, (d + 1) * DAY)
    out.push(g.buildings.divan)
  }
  return out
}

export const PACE_TARGETS: { level: number; day: number }[] = [{ level: 10, day: 2 }, { level: 15, day: 7 }, { level: 20, day: 30 }]

/** Bir seviyeye ilk ulaşılan gün (1'den sayılır; ulaşılmadıysa null). */
export const dayReached = (curve: number[], level: number) => { const i = curve.findIndex(l => l >= level); return i < 0 ? null : i + 1 }
