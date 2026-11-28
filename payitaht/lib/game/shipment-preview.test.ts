import test from 'node:test'
import assert from 'node:assert/strict'
import { initialEmpire, foundColony, shipmentReason, shipmentDuration, shipResources } from './empire'
import { freePlots } from './engine'
const now = 1_000_000
function prepared() {
  const e = initialEmpire(now), g = e.cities[0].game
  g.buildings.saray = 2; g.placement.saray = freePlots(g, 'sehir')[0]
  g.buildings.liman = 1; g.placement.liman = freePlots(g, 'liman')[0]
  g.army.nakliye = 4; g.resources.gold = 3000; g.resources.wood = 3000
  const world = foundColony(e, 'zeytin', now).empire
  world.activeCityId = 'city-1'
  return world
}
test('shipment preview rejects stale destinations and invalid loads without mutation', () => {
  const e = prepared(), before = JSON.stringify(e)
  for (const [to, amount] of [['city-1', 100], ['missing', 100], ['city-2', NaN], ['city-2', -1], ['city-2', 5000]] as const) {
    const reason = shipmentReason(e, to, 'wood', amount)
    assert.ok(reason); assert.equal(shipResources(e, to, 'wood', amount, now).error, reason)
  }
  assert.equal(JSON.stringify(e), before)
})
test('shipment preview exposes destination blockade before sending', () => {
  const e = prepared()
  e.sieges = [{ id: 'siege', rivalId: 'r-sakiz', cityId: 'city-2', kind: 'blockade', level: 1, since: now, tick: now, troops: {} }]
  const reason = shipmentReason(e, 'city-2', 'wood', 100)
  assert.match(reason!, /abluka/)
  assert.equal(shipResources(e, 'city-2', 'wood', 100, now).error, reason)
  assert.equal(e.shipments.length, 0)
})
test('shipment duration preview equals actual arrival and ships cannot be reused', () => {
  const e = prepared(), duration = shipmentDuration(e, 'city-2', 100)
  assert.equal(shipmentReason(e, 'city-2', 'wood', 100), undefined)
  const sent = shipResources(e, 'city-2', 'wood', 100, now)
  assert.equal(sent.error, undefined)
  assert.equal(sent.empire.shipments[0].eta, now + duration)
  assert.match(shipmentReason(sent.empire, 'city-2', 'wood', 100)!, /seferde/)
})
