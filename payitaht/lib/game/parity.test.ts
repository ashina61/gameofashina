import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  armyUpkeep, buildReason, capacity, corruption, initialGame, luxuryProduction, merchantBuyPrice, rates,
  recruitReason, unitLuxuryCost, wineConsumption, UNITS, UNIT_IDS,
} from './engine'
import { advanceEmpire, initialEmpire } from './empire'

const now = 1_000_000

test('every unit has a battlefield role, hit points and upkeep', () => {
  for (const id of UNIT_IDS) {
    assert.ok(UNITS[id].role, id)
    assert.ok(UNITS[id].hp > 0, id)
    assert.ok(UNITS[id].upkeep >= 0, id)
  }
})

test('units cost upkeep every minute', () => {
  const g = initialGame(now)
  const before = rates(g).gold
  g.army.yeniceri = 10; g.army.topcu = 2
  assert.equal(armyUpkeep(g), 10 + 10)
  assert.equal(rates(g).gold, before - 20)
})

test('new buildings and units are locked behind research like Ikariam', () => {
  const g = initialGame(now)
  g.buildings.divan = 10; g.buildings.kisla = 5
  g.resources = { gold: 1e6, wood: 1e6, stone: 1e6, knowledge: 0 }
  assert.match(buildReason(g, 'bagci')!, /Bağcılık/)
  g.research.push('bagcilik')
  assert.equal(buildReason(g, 'bagci'), null)
  assert.match(recruitReason(g, 'kocbasi', 1)!, /Mühendislik/)
})

test('palace only in the capital, governor residence only in colonies', () => {
  const g = initialGame(now)
  g.buildings.divan = 10
  g.resources = { gold: 1e6, wood: 1e6, stone: 1e6, knowledge: 0 }
  assert.match(buildReason(g, 'valilik')!, /kolonilerde/)
  g.empire = { cities: 2, capital: false }
  assert.match(buildReason(g, 'saray')!, /başkentte/)
})

test('colonies suffer corruption until the governor residence catches up', () => {
  const g = initialGame(now)
  g.empire = { cities: 3, capital: false }
  const corrupt = corruption(g)
  assert.ok(corrupt > 0)
  const wood = rates(g).wood
  g.buildings.valilik = 2
  assert.equal(corruption(g), 0)
  assert.ok(rates(g).wood > wood)
  // Başkentte yolsuzluk yok; imparatorluk bunu her ilerlemede yazar.
  const e = advanceEmpire(initialEmpire(now), now + 1000)
  assert.deepEqual(e.cities[0].game.empire, { cities: 1, capital: true })
})

test('production boosters, cost reducers, dump and trading post', () => {
  const g = initialGame(now)
  g.mine.miners = 12
  g.mine.specialty = 'uzum'
  const wine = luxuryProduction(g).uzum
  g.buildings.bagci = 5
  assert.ok(Math.abs(luxuryProduction(g).uzum - wine * 1.1) < 1e-9)
  g.buildings.kahvehane = 4
  const drink = wineConsumption(g)
  g.buildings.mahzen = 10
  assert.ok(Math.abs(wineConsumption(g) - drink * 0.9) < 1e-9)
  assert.equal(unitLuxuryCost('topcu', 10, g).kukurt, 400)
  g.buildings.barutane = 10
  assert.equal(unitLuxuryCost('topcu', 10, g).kukurt, 360)
  const cap = capacity(g)
  g.buildings.depo = 2
  assert.equal(capacity(g), cap + 5000)
  assert.equal(merchantBuyPrice(g), 6)
  g.buildings.ticaret_merkezi = 4
  assert.equal(merchantBuyPrice(g), 5)
})
