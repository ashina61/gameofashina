import { test } from 'node:test'
import assert from 'node:assert/strict'
import { initialEmpire } from './empire'
import { citySiegeAppearance, PEACEFUL_CITY } from './siege-appearance'

test('siege appearance follows the active colony without leaking into peaceful cities', () => {
  const e = initialEmpire(1000)
  e.cities.push({ ...structuredClone(e.cities[0]), id: 'city-2', name: 'Koloni', islandId: 'zeytin' })
  e.sieges = [{ id: 'o', rivalId: 'r-kemer', cityId: 'city-2', kind: 'occupy', level: 2, since: 1000, tick: 1000, troops: { yeniceri: 20 } }]
  assert.deepEqual(citySiegeAppearance(e), PEACEFUL_CITY)
  e.activeCityId = 'city-2'
  assert.equal(citySiegeAppearance(e).occupation?.name, 'Kemerkale')
  assert.equal(citySiegeAppearance(e).blockade, null)
  e.activeCityId = 'city-1'
  assert.deepEqual(citySiegeAppearance(e), PEACEFUL_CITY)
})

test('land and sea occupiers coexist independently and disappear individually on liberation', () => {
  const e = initialEmpire(1000)
  e.sieges = [
    { id: 'o', rivalId: 'r-kemer', cityId: 'city-1', kind: 'occupy', level: 2, since: 1000, tick: 1000, troops: { yeniceri: 20 } },
    { id: 'b', rivalId: 'r-sarp', cityId: 'city-1', kind: 'blockade', level: 2, since: 1000, tick: 1000, troops: { kadirga: 5 } },
  ]
  const held = citySiegeAppearance(e)
  assert.equal(held.occupation?.id, 'r-kemer')
  assert.equal(held.blockade?.id, 'r-sarp')
  assert.notEqual(held.occupation?.color, held.blockade?.color)
  e.sieges = e.sieges.filter(s => s.kind !== 'occupy')
  assert.equal(citySiegeAppearance(e).occupation, null)
  assert.equal(citySiegeAppearance(e).blockade?.id, 'r-sarp')
  e.sieges = []
  assert.deepEqual(citySiegeAppearance(e), PEACEFUL_CITY)
})
