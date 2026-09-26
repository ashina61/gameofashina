import { test } from 'node:test'
import assert from 'node:assert/strict'
import { freePlots, recruitReason } from './engine'
import { activeCity, buyMerchantShip, foundColony, initialEmpire, parseEmpire, shipResources } from './empire'
import { idleMerchants, merchantShipPrice, totalMerchants } from './expeditions'

const now = 1_000_000
function harbour() {
  const e = initialEmpire(now)
  const g = e.cities[0].game
  g.buildings.liman = 1
  g.placement.liman = freePlots(g, 'liman')[0]
  g.resources = { gold: 20_000, wood: 5000, stone: 5000, knowledge: 0 }
  return e
}

test('ticaret gemisi satın alınır, fiyatı her gemiyle artar, eğitilemez', () => {
  let e = harbour()
  assert.match(recruitReason(e.cities[0].game, 'nakliye', 1)!, /Ticaret Limanı/)
  const first = merchantShipPrice(0), second = merchantShipPrice(1)
  assert.ok(second > first)
  e = buyMerchantShip(e, now).empire
  assert.equal(totalMerchants(e), 1)
  assert.equal(e.cities[0].game.resources.gold, 20_000 - first)
  e = buyMerchantShip(e, now).empire
  assert.equal(e.cities[0].game.resources.gold, 20_000 - first - second)
  const bare = initialEmpire(now)
  assert.match(buyMerchantShip(bare, now).error!, /Ticaret Limanı/)
})

test('filo ortaktır: koloni başkentin gemileriyle nakliye yapar, yükteki gemiler boşta sayılmaz', () => {
  let e = harbour()
  const cap = e.cities[0].game
  cap.buildings.saray = 1
  cap.placement.saray = freePlots(cap, 'sehir')[0]
  cap.army.nakliye = 5
  e = foundColony(e, 'zeytin', now).empire
  const colony = activeCity(e)
  assert.equal(colony.game.army.nakliye, 0)
  assert.equal(idleMerchants(e), 5)
  colony.game.buildings.liman = 1
  colony.game.placement.liman = freePlots(colony.game, 'liman')[0]
  colony.game.resources.wood = 2000
  const sent = shipResources(e, 'city-1', 'wood', 600, now)
  assert.equal(sent.error, undefined)
  const ships = sent.empire.shipments[0].ships!
  assert.ok(ships >= 1)
  assert.equal(idleMerchants(sent.empire), 5 - ships)
  assert.deepEqual(parseEmpire(JSON.stringify(sent.empire)).shipments, sent.empire.shipments)
})

test('başkent taşınır; koloni terk edilir ve gemileri filoda kalır', async () => {
  const { moveCapital, abandonCity, capitalCity } = await import('./empire')
  let e = harbour()
  const cap = e.cities[0].game
  cap.buildings.saray = 1
  cap.placement.saray = freePlots(cap, 'sehir')[0]
  cap.army.nakliye = 4
  e = foundColony(e, 'zeytin', now).empire
  const colony = activeCity(e)
  colony.game.army.nakliye = 2
  assert.match(moveCapital(e, colony.id, now).error!, /Divanhane/)
  colony.game.buildings.divan = 3
  const moved = moveCapital(e, colony.id, now)
  assert.equal(moved.error, undefined)
  assert.equal(capitalCity(moved.empire).id, colony.id)
  assert.equal(moved.empire.cities.find(c => c.id === 'city-1')!.game.buildings.saray, 0)
  assert.equal(capitalCity(moved.empire).game.buildings.saray, 1)
  assert.match(moveCapital(moved.empire, 'city-1', now + 1000).error!, /bir günde/)
  const round = parseEmpire(JSON.stringify(moved.empire))
  assert.equal(round.capitalId, colony.id)
  // Eski başkent artık koloni: terk edilebilir; gemileri yeni başkente geçer.
  assert.match(abandonCity(moved.empire, colony.id, now).error!, /Başkent/)
  const left = abandonCity(moved.empire, 'city-1', now)
  assert.equal(left.error, undefined)
  assert.equal(left.empire.cities.length, 1)
  assert.equal(totalMerchants(left.empire), 6)
  assert.doesNotThrow(() => parseEmpire(JSON.stringify(left.empire)))
})
