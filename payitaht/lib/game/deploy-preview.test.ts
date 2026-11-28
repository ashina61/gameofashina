import test from 'node:test'
import assert from 'node:assert/strict'
import { initialEmpire, foundColony } from './empire'
import { deployPreview, dispatchDeploy } from './expeditions'
import { freePlots } from './engine'
const now = 1_000_000
function prepared() {
  const e = initialEmpire(now), g = e.cities[0].game
  g.buildings.saray = 2; g.placement.saray = freePlots(g, 'sehir')[0]
  g.buildings.liman = 1; g.placement.liman = freePlots(g, 'liman')[0]
  g.army.nakliye = 4; g.resources.gold = 3000; g.resources.wood = 3000
  const world = foundColony(e, 'zeytin', now).empire
  world.activeCityId = 'city-1'
  world.cities[0].game.army.mizrakci = 10
  return world
}
test('deploy preview validates exact counts without changing the source', () => {
  const e = prepared(), before = JSON.stringify(e)
  for (const pick of [{}, { mizrakci: 11 }, { mizrakci: -1 }, { mizrakci: 1.5 }]) {
    const preview = deployPreview(e, 'city-2', pick)
    assert.ok(preview.error)
    assert.equal(dispatchDeploy(e, 'city-2', pick, now).error, preview.error)
  }
  const preview = deployPreview(e, 'city-2', { mizrakci: 3 })
  assert.equal(preview.error, undefined)
  const sent = dispatchDeploy(e, 'city-2', { mizrakci: 3 }, now)
  assert.equal(sent.error, undefined)
  assert.deepEqual(sent.empire.missions?.at(-1)?.units, preview.clean)
  assert.equal(JSON.stringify(e), before)
})
test('deploy preview explains unavailable transports before dispatch', () => {
  const e = prepared(); e.cities[0].game.army.nakliye = 0
  const preview = deployPreview(e, 'city-2', { mizrakci: 3 })
  assert.match(preview.error!, /nakliye gemisi/)
  assert.equal(dispatchDeploy(e, 'city-2', { mizrakci: 3 }, now).error, preview.error)
})
