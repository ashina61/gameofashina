import { test } from 'node:test'
import assert from 'node:assert/strict'
import { advance, execute, freePlots, initialGame, parseSave, power, rates, type Game } from './engine'
import { POWER_REST_MS, blessing, godBuff } from './gods'
import { advanceEmpire, initialEmpire } from './empire'
import { BATTLE_WINDOW_MS } from './battle'

const now = 1_000_000
function withTemple(level = 5): Game {
  const g = initialGame(now)
  g.buildings.mabet = level
  g.placement.mabet = freePlots(g, 'sehir')[0]
  g.resources = { gold: 40_000, wood: 40_000, stone: 40_000, knowledge: 0 }
  return g
}

test('the temple gathers favour, offerings add more, and the patron god blesses the city', () => {
  const bare = initialGame(now)
  assert.match(execute(bare, { type: 'god', god: 'tengri' }, now).error!, /Mabedi/)
  let g = advance(withTemple(), now + 60 * 60_000)
  assert.ok(g.gods.lutuf > 80, `lütuf ${g.gods.lutuf}`)
  const before = g.gods.lutuf
  g = execute(g, { type: 'offering', good: 'gold', amount: 4000 }, g.updatedAt).game
  assert.ok(Math.abs(g.gods.lutuf - before - 100) < 1e-6, 'sunu: 40 akçe = 1 lütuf')
  const gold = rates(g).gold
  g = execute(g, { type: 'god', god: 'tengri' }, g.updatedAt).game
  assert.equal(blessing(g, 'tengri'), 5)
  assert.ok(rates(g).gold > gold, 'Tengri bütün üretimi artırır')
  // Hami değiştirmek 6 saat bekletir.
  assert.match(execute(g, { type: 'god', god: 'umay' }, g.updatedAt + 1000).error!, /küsebilir/)
  assert.deepEqual(parseSave(JSON.stringify(g)).gods, g.gods)
})

test('invoking a power spends favour and rests the god; timed powers buff the army', () => {
  let g = withTemple(8)
  g.gods.lutuf = 2000
  g = execute(g, { type: 'god', god: 'kizagan' }, now).game
  const atk = power({ ...g, army: { ...g.army, yeniceri: 20 } }, 'kara').attack
  const r = execute(g, { type: 'invoke' }, now)
  assert.equal(r.error, undefined)
  assert.equal(r.game.gods.lutuf, 1500)
  assert.ok(godBuff(r.game, 'kizagan', now + 1000))
  assert.ok(power({ ...r.game, army: { ...r.game.army, yeniceri: 20 } }, 'kara').attack > atk)
  assert.match(execute(r.game, { type: 'invoke' }, now + 1000).error!, /dinleniyor/)
  assert.equal(execute(r.game, { type: 'invoke' }, now + POWER_REST_MS + 1).error, undefined)
})

test('Kayra halves the running construction; Tengri pours an hour of production', () => {
  let g = withTemple(6)
  g.gods.lutuf = 3000
  g = execute(g, { type: 'build', id: 'konut' }, now).game
  const end = g.queue[0].end
  g = execute(g, { type: 'god', god: 'kayra' }, now).game
  g = execute(g, { type: 'invoke' }, now).game
  assert.ok(g.queue[0].end < end)
  let t = withTemple(6)
  t.gods.lutuf = 3000; t.resources.wood = 0
  t = execute(t, { type: 'god', god: 'tengri' }, now).game
  t = execute(t, { type: 'invoke' }, now).game
  assert.ok(t.resources.wood > 0)
})

test("Erlik's dread thins out a raid before it reaches the gates", () => {
  const e = initialEmpire(now)
  const g = e.cities[0].game
  g.buildings.divan = 5; g.buildings.mabet = 5; g.placement.mabet = freePlots(g, 'sehir')[0]
  g.gods.lutuf = 2000; g.gods.patron = 'erlik'
  const warned = advanceEmpire(advanceEmpire(e, now), now + 2 * 3600_000)
  const t = warned.threats![0]
  const before = Object.values(t.troops).reduce((s, n) => s + (n ?? 0), 0)
  warned.cities[0].game = execute(warned.cities[0].game, { type: 'invoke' }, t.arriveAt - 5 * 60_000).game
  const hit = advanceEmpire(warned, t.arriveAt + BATTLE_WINDOW_MS)
  const report = hit.reports!.find(r => r.kind === 'defense')!
  assert.ok(report.lines.some(l => l.includes('Erlik')), report.lines.join('\n'))
  const attackers = report.battles!.at(-1)!.a.troops
  assert.ok(Object.values(attackers).reduce((s, n) => s + (n ?? 0), 0) < before)
})
