import { test } from 'node:test'
import assert from 'node:assert/strict'
import { freePlots, recruitReason, spyCapacity } from './engine'
import { advanceEmpire, initialEmpire, parseEmpire } from './empire'
import {
  NPC_SETTLEMENTS, availableUnits, dispatchRaid, dispatchSpies, lootPool, npcDefense, npcState,
  raidTravelMs, spyTravelMs, strikeForce,
} from './expeditions'

const now = 10_000_000
function army() {
  const e = initialEmpire(now)
  const g = e.cities[0].game
  g.buildings.elcilik = 2
  g.placement.elcilik = freePlots(g, 'sehir')[0]
  g.buildings.kisla = 3
  g.placement.kisla = freePlots(g, 'sehir')[0]
  g.army.casus = 4
  g.army.yeniceri = 30; g.army.okcu = 10
  return e
}
const koy = 'sahil-koy', kale = 'sahil-kale'

test('every island has three independent settlements', () => {
  assert.equal(NPC_SETTLEMENTS.length, 24)
  assert.deepEqual(NPC_SETTLEMENTS.filter(n => n.islandId === 'sahil').map(n => n.kind), ['koy', 'korsan', 'kale'])
})

test('spies need an embassy and are capped by its level', () => {
  const e = initialEmpire(now)
  const g = e.cities[0].game
  assert.match(recruitReason(g, 'casus', 1)!, /Elçilik/)
  g.buildings.elcilik = 1
  assert.equal(spyCapacity(g), 2)
  g.army.casus = 2
  assert.match(recruitReason(g, 'casus', 1)!, /casus barındırır/)
})

test('a spy mission reports garrison, walls and treasure (or loses the spies) deterministically', () => {
  const e = army()
  const sent = dispatchSpies(e, koy, 4, now)
  assert.equal(sent.error, undefined)
  assert.equal(availableUnits(sent.empire, 'city-1').casus, 0)
  const arrived = advanceEmpire(sent.empire, now + spyTravelMs(1))
  const report = arrived.reports![0]
  assert.equal(report.kind, 'spy')
  // Aynı kayıt aynı sonucu verir.
  assert.deepEqual(advanceEmpire(sent.empire, now + spyTravelMs(1)).reports![0], report)
  if (report.success) assert.ok(report.lines.some(l => l.startsWith('Garnizon')))
  const home = advanceEmpire(arrived, now + 2 * spyTravelMs(1))
  assert.equal(home.missions!.length, 0)
  assert.equal(availableUnits(home, 'city-1').casus, report.success ? 4 : 0)
})

test('a strong army takes the village and brings loot home', () => {
  const e = army()
  const g = e.cities[0].game
  const before = { gold: g.resources.gold, yeniceri: g.army.yeniceri }
  const force = strikeForce(g, { yeniceri: 30, okcu: 10 })
  assert.ok(force > npcDefense(1, false).total)
  const sent = dispatchRaid(e, koy, { yeniceri: 30, okcu: 10 }, now)
  assert.equal(sent.error, undefined)
  assert.match(dispatchRaid(sent.empire, koy, { yeniceri: 1 }, now).error!, /yolda|boşta/)
  const arrived = advanceEmpire(sent.empire, now + raidTravelMs(1))
  const report = arrived.reports![0]
  assert.equal(report.success, true)
  const city = arrived.cities[0].game
  assert.ok(city.army.yeniceri <= before.yeniceri && city.army.yeniceri > 0)
  assert.ok(report.lines.some(l => l.startsWith('Tur 1')))
  assert.equal(npcState(arrived, koy).level, 2)
  const home = advanceEmpire(arrived, now + 2 * raidTravelMs(1))
  assert.ok(home.cities[0].game.resources.gold > before.gold)
  // Hazine yağmadan sonra boşalır ve zamanla dolar.
  assert.equal(lootPool(npcState(home, koy), now + raidTravelMs(1)).gold, 0)
  assert.equal(parseEmpire(JSON.stringify(home)).npcs![koy].level, 2)
})

test('a weak army is repulsed by a fortress and brings nothing back', () => {
  const e = army()
  const sent = dispatchRaid(e, kale, { yeniceri: 5 }, now)
  const arrived = advanceEmpire(sent.empire, now + raidTravelMs(6))
  assert.equal(arrived.reports![0].success, false)
  assert.ok(arrived.cities[0].game.army.yeniceri < 30)
  assert.equal(npcState(arrived, kale).level, 6)
})

test('targets on another island need a harbour and transports', () => {
  const e = army()
  assert.match(dispatchRaid(e, 'zeytin-koy', { yeniceri: 1 }, now).error!, /Ticaret Limanı/)
})

test('spies and an army may head to the same target at once, but not two armies', () => {
  const e = army()
  const spied = dispatchSpies(e, koy, 1, now)
  const raided = dispatchRaid(spied.empire, koy, { yeniceri: 5 }, now)
  assert.equal(raided.error, undefined)
  assert.match(dispatchRaid(raided.empire, koy, { yeniceri: 5 }, now).error!, /ordu zaten yolda|Hamle puanı/)
})

test('action points cap how many missions a city runs at once', () => {
  const e = army()
  const first = dispatchRaid(e, koy, { yeniceri: 5 }, now)
  const second = dispatchRaid(first.empire, 'sahil-korsan', { yeniceri: 5 }, now)
  assert.equal(second.error, undefined)
  assert.match(dispatchRaid(second.empire, kale, { yeniceri: 5 }, now).error!, /Hamle puanı/)
})
