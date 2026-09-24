import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  BUILDING_EFFECTS, MERCHANT_BUY, MINERS_PER_LEVEL, advance, buildReason, contentment, execute, idleWorkers,
  initialGame, luxuryCost, luxuryProduction, mineUpgradeCost, parseSave, recruitReason, unitLuxuryCost,
} from './engine'

const now = 1_000_000

test('a new city starts on a marble island with an empty luxury store', () => {
  const g = initialGame(now)
  assert.equal(g.mine.specialty, 'mermer')
  assert.equal(g.mine.level, 1)
  assert.deepEqual(g.luxury, { uzum: 0, mermer: 0, kristal: 0, kukurt: 0 })
})

test('miners extract only the island specialty and come from idle citizens', () => {
  const g = initialGame(now)
  const idle = idleWorkers(g)
  const r = execute(g, { type: 'miners', value: 999 }, now)
  assert.equal(r.game.mine.miners, Math.min(MINERS_PER_LEVEL, idle))
  assert.equal(idleWorkers(r.game), idle - r.game.mine.miners)
  const p = luxuryProduction(r.game)
  assert.ok(p.mermer > 0)
  assert.equal(p.uzum + p.kristal + p.kukurt, 0)
  const later = advance(r.game, now + 10 * 60_000)
  assert.ok(Math.abs(later.luxury.mermer - p.mermer * 10) < 1e-6)
})

test('wood donations level the mine and raise its worker capacity', () => {
  const g = initialGame(now)
  g.resources.wood = 5000
  const r = execute(g, { type: 'donate', amount: mineUpgradeCost(1) + 10 }, now)
  assert.equal(r.error, undefined)
  assert.equal(r.game.mine.level, 2)
  assert.equal(r.game.mine.wood, 10)
  assert.match(execute(g, { type: 'donate', amount: 999_999 }, now).error!, /kereste/)
})

test('kahvehane drinks wine; when the store runs dry the bonus disappears', () => {
  const g = initialGame(now)
  g.buildings.kahvehane = 2
  g.luxury.uzum = 12 // 2 seviye x 3 üzüm/dk = 6/dk -> 2 dakika yeter
  const wet = contentment(g)
  const later = advance(g, now + 5 * 60_000)
  assert.equal(later.luxury.uzum, 0)
  assert.equal(contentment(later), wet - 2 * BUILDING_EFFECTS.kahvehaneWineBonus)
})

test('advanced buildings need marble, science buildings crystal', () => {
  const g = initialGame(now)
  assert.deepEqual(luxuryCost(g, 'hamam'), {})
  g.buildings.hamam = 3
  assert.ok((luxuryCost(g, 'hamam').mermer ?? 0) > 0)
  g.buildings.medrese = 4
  assert.ok((luxuryCost(g, 'medrese').kristal ?? 0) > 0)
  g.buildings.divan = 10
  g.resources = { gold: 1e6, wood: 1e6, stone: 1e6, knowledge: 0 }
  assert.match(buildReason(g, 'hamam')!, /Mermer/)
  g.luxury.mermer = 1e5
  assert.equal(buildReason(g, 'hamam'), null)
  const after = execute(g, { type: 'build', id: 'hamam' }, now).game
  assert.equal(after.luxury.mermer, 1e5 - luxuryCost(g, 'hamam').mermer!)
})

test('heavy units need sulfur', () => {
  const g = initialGame(now)
  g.buildings.kisla = 3
  g.resources = { gold: 1e5, wood: 1e5, stone: 1e5, knowledge: 0 }
  assert.deepEqual(unitLuxuryCost('yeniceri', 5), {})
  assert.match(recruitReason(g, 'topcu', 1)!, /kükürt|vatandaş/)
})

test('the bazaar merchant buys and sells luxury goods for akçe', () => {
  const g = initialGame(now)
  assert.match(execute(g, { type: 'trade', id: 'kristal', side: 'buy', amount: 10 }, now).error!, /Çarşı/)
  g.buildings.carsi = 1
  const bought = execute(g, { type: 'trade', id: 'kristal', side: 'buy', amount: 50 }, now)
  assert.equal(bought.error, undefined)
  assert.equal(bought.game.luxury.kristal, 50)
  assert.equal(bought.game.resources.gold, g.resources.gold - 50 * MERCHANT_BUY)
  const sold = execute(bought.game, { type: 'trade', id: 'kristal', side: 'sell', amount: 20 }, now)
  assert.equal(sold.game.luxury.kristal, 30)
})

test('old saves without luxury load with an empty store and a level 1 marble mine', () => {
  const g = initialGame(now)
  const raw = JSON.parse(JSON.stringify(g))
  delete raw.luxury; delete raw.mine
  const loaded = parseSave(JSON.stringify(raw))
  assert.deepEqual(loaded.luxury, { uzum: 0, mermer: 0, kristal: 0, kukurt: 0 })
  assert.deepEqual(loaded.mine, { specialty: 'mermer', level: 1, wood: 0, miners: 0 })
})
