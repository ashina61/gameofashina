/**
 * İLK 10 DAKİKA (V2 Faz 5.1): yeni oyuncu rehberin parlattığı düğmeye
 * basarak ilerler; on dakika dolmadan ilk seferini göndermiş olmalı.
 * Oyuncu "akıllı" değildir: yalnızca sıradaki hedefin istediğini yapar,
 * kaynak yetmezse bekler (her 5 saniyede bir bakar).
 */
import test from 'node:test'
import assert from 'node:assert/strict'
import { GUIDED_STEPS, OBJECTIVES, RESEARCH_IDS, WORKER_IDS, execute, idleWorkers, objectiveDone, researchReason, type Command } from './engine'
import { activeCity, advanceEmpire, initialEmpire, type Empire } from './empire'
import { dispatchRaid, NPC_SETTLEMENTS } from './expeditions'

const START = Date.UTC(2026, 0, 5, 9)
const TICK = 5_000

function play(limitMs: number) {
  let e: Empire = advanceEmpire(initialEmpire(START), START)
  const reached: Record<string, number> = {}
  for (let t = START; t <= START + limitMs; t += TICK) {
    e = advanceEmpire(e, t)
    const city = activeCity(e)
    const run = (cmd: Command) => { const r = execute(city.game, cmd, t); if (!r.error) city.game = r.game; return !r.error }
    for (const o of OBJECTIVES.slice(0, GUIDED_STEPS)) {
      if (!city.game.claimed.includes(o.id) && objectiveDone(city.game, o.id)) { reached[o.id] ??= t - START; run({ type: 'claim', id: o.id }) }
    }
    const next = OBJECTIVES.slice(0, GUIDED_STEPS).find(o => !city.game.claimed.includes(o.id))
    if (!next) break
    const g = city.game
    switch (next.id) {
      case 'first-upgrade': run({ type: 'build', id: 'divan' }); break
      case 'first-academy': run({ type: 'build', id: 'medrese' }); break
      case 'barracks': run({ type: 'build', id: 'kisla' }); break
      case 'walls': run({ type: 'build', id: 'surlar' }); break
      case 'first-worker': {
        // Boşta kimse yoksa rehber önce oduncudan bir kişi çektirir.
        if (idleWorkers(g) < 1) run({ type: 'workers', id: 'kereste', value: g.workers.kereste - 1 })
        run({ type: 'workers', id: 'medrese', value: 1 })
        break
      }
      case 'first-research': {
        const id = RESEARCH_IDS.find(r => !researchReason(g, r))
        if (id) run({ type: 'research', id })
        break
      }
      case 'troops': {
        const need = 5 - g.army.mizrakci - g.drills.reduce((n, d) => n + (d.id === 'mizrakci' ? d.count ?? 0 : 0), 0)
        if (need <= 0) break
        if (idleWorkers(g) < need) for (const w of WORKER_IDS) if (g.workers[w] > 0 && idleWorkers(city.game) < need) run({ type: 'workers', id: w, value: Math.max(0, city.game.workers[w] - need) })
        run({ type: 'recruit', id: 'mizrakci', count: need })
        break
      }
      case 'first-raid': {
        const koy = NPC_SETTLEMENTS.find(n => n.islandId === city.islandId && n.kind === 'koy')!
        const r = dispatchRaid(e, koy.id, { mizrakci: city.game.army.mizrakci }, t)
        if (!r.error) e = r.empire
        break
      }
    }
  }
  return { e, reached }
}

test('the guided first ten minutes end with the first expedition on its way', () => {
  const { reached } = play(10 * 60_000)
  for (const o of OBJECTIVES.slice(0, GUIDED_STEPS)) assert.ok(o.id in reached, `${o.id} on dakikada bitmedi: ${JSON.stringify(reached)}`)
  assert.ok(reached['first-raid'] <= 10 * 60_000)
})

test('the guided path covers the wall foundation, first worker, first research and first expedition', () => {
  const ids = OBJECTIVES.slice(0, GUIDED_STEPS).map(o => o.id)
  for (const id of ['walls', 'first-worker', 'first-research', 'first-raid']) assert.ok(ids.includes(id), id)
  assert.equal(new Set(OBJECTIVES.map(o => o.id)).size, OBJECTIVES.length)
})

