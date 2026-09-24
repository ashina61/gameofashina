import { test } from 'node:test'
import assert from 'node:assert/strict'
import { BUILDING_IDS, initialGame, housing, rates, unitDuration } from './engine'
import { effectLines } from './building-info'

const now = 1_000_000

test('every building shows at least one effect and each upgrade changes something', () => {
  const g = initialGame(now)
  for (const id of BUILDING_IDS) {
    const a = effectLines(g, id, 2), b = effectLines(g, id, 3)
    assert.ok(a.length > 0, id)
    assert.notDeepEqual(a, b, `${id} yükseltmesi hiçbir şeyi değiştirmiyor`)
  }
})

test('divan, saray, kışla give real per-level bonuses', () => {
  const g = initialGame(now)
  const h = housing(g), gold = rates(g).gold
  g.buildings.divan = 3
  assert.equal(housing(g), h + 40)
  g.buildings.saray = 2
  assert.ok(rates(g).gold > gold)
  g.buildings.kisla = 1
  const slow = unitDuration(g, 'yeniceri', 10)
  g.buildings.kisla = 5
  assert.equal(unitDuration(g, 'yeniceri', 10), Math.round(slow * (1 - 0.12) / 1))
})
