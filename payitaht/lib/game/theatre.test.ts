import { test } from 'node:test'
import assert from 'node:assert/strict'
import { advance, contentment, execute, freePlots, initialGame, luxuryProduction, parseSave, rates, type BuildingId, type Game } from './engine'
import { SHOW_MS, showContentment, showCooldownMs, showFavor } from './theatre'

const now = 5_000_000
function place(g: Game, id: BuildingId, level: number) {
  if (g.placement[id] === null) g.placement[id] = freePlots(g, 'sehir')[0]
  g.buildings[id] = level
}

test('Karagöz Perdesi: gösteri 12 saat üretimi artırır, sonra perde dinlenir', () => {
  let g = initialGame(now)
  assert.match(execute(g, { type: 'show', show: 'dram' }, now).error!, /Karagöz/)
  place(g, 'karagoz', 3)
  g.workers.kereste = 10
  const before = rates(g).wood
  g = execute(g, { type: 'show', show: 'dram' }, now).game
  assert.ok(Math.abs(rates(g).wood - before * 1.1) < 1e-6)
  assert.match(execute(g, { type: 'show', show: 'komedi' }, now + 1000).error!, /sürüyor/)
  const over = advance(g, now + SHOW_MS + 1000)
  assert.ok(Math.abs(rates(over).wood - before) < 1e-6)
  assert.match(execute(over, { type: 'show', show: 'komedi' }, now + SHOW_MS + 1000).error!, /dinleniyor/)
  assert.ok(execute(over, { type: 'show', show: 'komedi' }, now + showCooldownMs(3) + 1).game.shows!.active)
  assert.deepEqual(parseSave(JSON.stringify(g)).shows, g.shows)
})

test('kültür gösterisi huzur, tanrısal gösterim lütuf verir; komedi lüksü artırır', () => {
  const g = initialGame(now)
  place(g, 'karagoz', 2)
  const c = contentment(g)
  assert.equal(contentment(execute(g, { type: 'show', show: 'kultur' }, now).game), c + showContentment(2))
  assert.match(execute(g, { type: 'show', show: 'tanrisal' }, now).error!, /Mabedi/)
  place(g, 'mabet', 1)
  assert.equal(execute(g, { type: 'show', show: 'tanrisal' }, now).game.gods.lutuf, g.gods.lutuf + showFavor(2))
  g.mine.miners = 5
  const lux = luxuryProduction(g)[g.mine.specialty]
  assert.ok(Math.abs(luxuryProduction(execute(g, { type: 'show', show: 'komedi' }, now).game)[g.mine.specialty] - lux * 1.1) < 1e-6)
})
