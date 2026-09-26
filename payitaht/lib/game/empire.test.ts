import { test } from 'node:test'
import assert from 'node:assert/strict'
import { execute, freePlots, initialGame, parseSave } from './engine'
import {
  activeCity, advanceEmpire, COLONY_COST, foundColony, initialEmpire,
  ISLANDS, parseEmpire, shipResources,
} from './empire'

const now = 1_000_000
function preparedEmpire() {
  const e = initialEmpire(now)
  const capital = e.cities[0].game
  capital.buildings.saray = 2
  capital.placement.saray = freePlots(capital, 'sehir')[0]
  capital.buildings.liman = 1
  capital.placement.liman = freePlots(capital, 'liman')[0]
  capital.army.nakliye = 4
  capital.resources = { gold: 3000, wood: 3000, stone: 2500, knowledge: 700 }
  return e
}

test('legacy v3 single-city save migrates without losing buildings, placement, army or resources', () => {
  const legacy = initialGame(now)
  legacy.buildings.divan = 3
  legacy.army.nakliye = 2
  legacy.resources.wood = 211
  const e = parseEmpire(JSON.stringify(legacy))
  assert.equal(e.version, 1)
  assert.equal(e.cities.length, 1)
  assert.deepEqual(e.cities[0].game, parseSave(JSON.stringify(legacy)))
  assert.deepEqual(parseEmpire(JSON.stringify(e)), e)
})

test('new island requires palace, harbour, ships and actual capital resources', () => {
  const e = initialEmpire(now)
  assert.match(foundColony(e, 'zeytin', now).error!, /Saray/)
  e.cities[0].game.buildings.saray = 1
  assert.match(foundColony(e, 'zeytin', now).error!, /Liman/)
  e.cities[0].game.buildings.liman = 1
  e.cities[0].game.army.nakliye = 3
  assert.match(foundColony(e, 'zeytin', now).error!, /kereste/)
  assert.equal(e.cities.length, 1, 'a failed expedition must not change source')
})

test('colonies are independent playable cities; each island holds at most one city', () => {
  const e = preparedEmpire()
  const result = foundColony(e, 'zeytin', now)
  assert.equal(result.error, undefined)
  const world = result.empire
  assert.equal(world.cities.length, 2)
  assert.equal(activeCity(world).islandId, 'zeytin')
  assert.equal(world.cities[0].game.resources.wood, 3000 - COLONY_COST.wood)
  assert.equal(world.cities[1].game.resources.wood, 250)
  assert.notEqual(world.cities[0].game, world.cities[1].game)
  assert.equal(foundColony(world, 'zeytin', now).error, 'Bu adada zaten bir şehrin var.')
  const second = execute(world.cities[1].game, { type:'build', id:'divan' }, now)
  assert.equal(second.error, undefined)
  world.cities[1].game = second.game
  assert.equal(world.cities[0].game.queue.length, 0, 'colony building cannot affect capital queue')
  assert.equal(world.cities[1].game.queue.length, 1)
  assert.equal(ISLANDS.length, 16)
  assert.deepEqual(parseEmpire(JSON.stringify(world)), world)
})

test('one sender cannot use the same ships twice; cargo debits only sender', () => {
  const e = foundColony(preparedEmpire(), 'zeytin', now).empire
  e.activeCityId = 'city-1'
  const before = e.cities[1].game.resources.wood
  const result = shipResources(e, 'city-2', 'wood', 160, now)
  assert.equal(result.error, undefined)
  assert.equal(result.empire.cities[0].game.resources.wood, e.cities[0].game.resources.wood - 160)
  assert.equal(result.empire.cities[1].game.resources.wood, before)
  assert.match(shipResources(result.empire, 'city-2', 'stone', 100, now).error!, /seferde/)
  assert.equal(shipResources(e, 'city-2', 'wood', 5000, now).error !== undefined, true)
  const arrival = result.empire.shipments[0].eta
  const delivered = advanceEmpire(result.empire, arrival)
  assert.equal(delivered.shipments.length, 0)
  // Kolonide Valilik yokken %25 yolsuzluk: 120 kereste/dk yerine 90.
  assert.equal(delivered.cities[1].game.resources.wood,
    Math.min(4500, before + 160 + (arrival - now) / 60000 * 90))
  assert.deepEqual(parseEmpire(JSON.stringify(delivered)), delivered)
})

test('full destination stores cargo in the harbour instead of deleting it', () => {
  const e = foundColony(preparedEmpire(), 'zeytin', now).empire
  e.activeCityId = 'city-1'
  const destination = e.cities[1].game
  destination.resources.stone = 4495
  // Disable production for predictable warehouse occupancy.
  destination.workers.tas = 0
  const started = shipResources(e, 'city-2', 'stone', 100, now).empire
  const arrival = started.shipments[0].eta
  let delivered = advanceEmpire(started, arrival)
  assert.equal(delivered.cities[1].game.resources.stone, 4500)
  assert.equal(delivered.shipments[0].amount, 95)
  delivered.cities[1].game.resources.stone -= 95
  delivered = advanceEmpire(delivered, arrival + 1000)
  assert.equal(delivered.shipments.length, 0)
  assert.equal(delivered.cities[1].game.resources.stone, 4500)
})

test('invalid multi-city payload never replaces the stored city with a guessed one', () => {
  const e = preparedEmpire()
  assert.throws(() => parseEmpire(JSON.stringify({ ...e, activeCityId: 'city-404' })), /Başkent/)
  assert.throws(() => parseEmpire(JSON.stringify({ ...e, cities: [e.cities[0], e.cities[0]] })), /Şehir/)
})

test('a colony mines its own island luxury and can ship it home', () => {
  const e = preparedEmpire()
  const founded = foundColony(e, 'zeytin', now)
  assert.equal(founded.error, undefined)
  const colony = activeCity(founded.empire)
  assert.equal(colony.game.mine.specialty, 'uzum')
  assert.equal(founded.empire.cities[0].game.mine.specialty, 'mermer')
  // Koloniye üzüm koy, liman + gemi ver ve başkente gönder.
  colony.game.luxury.uzum = 300
  colony.game.buildings.liman = 1
  colony.game.placement.liman = freePlots(colony.game, 'liman')[0]
  colony.game.army.nakliye = 2
  const shipped = shipResources(founded.empire, 'city-1', 'uzum', 200, now)
  assert.equal(shipped.error, undefined)
  assert.equal(activeCity(shipped.empire).game.luxury.uzum, 100)
  const arrived = advanceEmpire(shipped.empire, shipped.empire.shipments[0].eta)
  assert.equal(arrived.cities[0].game.luxury.uzum, 200)
  // Kayıt gidiş-dönüşünde maden kaynağı adadan gelir.
  assert.equal(parseEmpire(JSON.stringify(arrived)).cities[1].game.mine.specialty, 'uzum')
})
