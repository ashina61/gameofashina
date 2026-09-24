import { test } from 'node:test'
import assert from 'node:assert/strict'
import { BUILDING_EFFECTS, buildReason, contentment, cost, initialGame, parseSave, power, rates } from './engine'

const now = 1_000_000

test('kahvehane, cami and müze raise contentment per level', () => {
  const g = initialGame(now)
  const base = contentment(g)
  g.buildings.kahvehane = 2; g.buildings.cami = 1; g.buildings.muze = 3
  assert.equal(contentment(g), base + 2 * BUILDING_EFFECTS.kahvehaneContentment +
    BUILDING_EFFECTS.camiContentment + 3 * BUILDING_EFFECTS.muzeContentment)
})

test('kahvehane serves coffee from the treasury', () => {
  const g = initialGame(now)
  const before = rates(g).gold
  g.buildings.kahvehane = 3
  assert.equal(rates(g).gold, before - 3 * BUILDING_EFFECTS.kahvehaneUpkeep)
})

test('marangoz and mimar cut wood and stone costs by 1% per level', () => {
  const g = initialGame(now)
  const before = cost(g, 'hamam')
  g.buildings.marangoz = 10; g.buildings.mimar = 5
  const after = cost(g, 'hamam')
  assert.equal(after.gold, before.gold)
  assert.equal(after.wood, Math.round(before.gold * 1.2 * 0.9))
  assert.equal(after.stone, Math.round(before.gold * 0.75 * 0.95))
})

test('ormancı and taşçı boost production by 2% per level', () => {
  const g = initialGame(now)
  const before = rates(g)
  g.buildings.ormanci = 5; g.buildings.tasci = 10
  const after = rates(g)
  assert.ok(Math.abs(after.wood - before.wood * 1.10) < 1e-9)
  assert.ok(Math.abs(after.stone - before.stone * 1.20) < 1e-9)
})

test('tophane strengthens every unit', () => {
  const g = initialGame(now)
  g.army.yeniceri = 100
  const before = power(g, 'kara')
  g.buildings.tophane = 5
  const after = power(g, 'kara')
  assert.equal(after.attack, Math.round(before.attack * 1.1))
  assert.equal(after.defense, Math.round(before.defense * 1.1))
})

test('new buildings have prerequisites and old saves load with them unbuilt', () => {
  const g = initialGame(now)
  assert.match(buildReason(g, 'tophane')!, /Kışla/)
  assert.match(buildReason(g, 'muze')!, /Medrese/)
  const raw = JSON.parse(JSON.stringify(g))
  for (const id of ['kahvehane', 'cami', 'muze', 'marangoz', 'mimar', 'ormanci', 'tasci', 'tophane']) {
    delete raw.buildings[id]; delete raw.placement[id]
  }
  const loaded = parseSave(JSON.stringify(raw))
  assert.equal(loaded.buildings.cami, 0)
  assert.equal(loaded.placement.tophane, null)
})
