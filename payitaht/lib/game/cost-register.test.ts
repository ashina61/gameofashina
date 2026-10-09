import test from 'node:test'
import assert from 'node:assert/strict'
import { initialGame, cost, luxuryCost, unitLuxuryCost, wineConsumption } from './engine'
import { costRegister } from './cost-register'

test('wood and marble previews include their actual research scope', () => {
  const g = initialGame(0)
  g.buildings.medrese = 5; g.buildings.marangoz = 17; g.buildings.mimar = 21
  g.research = ['makara', 'geometri', 'su_terazisi']
  const wood = costRegister(g, 'marangoz'), marble = costRegister(g, 'mimar')
  assert.ok(Math.abs(wood.factor - 0.69) < 1e-9)
  assert.ok(Math.abs(marble.factor - 0.65) < 1e-9)
  assert.equal(wood.after, cost(g, 'medrese').wood)
  assert.equal(marble.after, luxuryCost(g, 'medrese').mermer)
  assert.equal(marble.parts[0].cut, 0.14)
})

test('coffee kitchen multiplies the capped cellar factor and uses configured service', () => {
  const g = initialGame(0); g.buildings.mahzen = 60; g.buildings.kahvehane = 10; g.tavern = 3; g.research = ['mutfak']; g.luxury.kahve = 0
  const p = costRegister(g, 'mahzen')
  assert.equal(p.materialFactor, 0.5); assert.equal(p.factor, 0.45)
  assert.equal(p.after, wineConsumption(g)); assert.equal(p.after, p.before * 0.5)
  assert.equal(p.served, 3)
  g.tavern = 0; assert.equal(costRegister(g, 'mahzen').after, 0)
})

test('artillery research applies after the sulfur cap, including actual rounding', () => {
  const g = initialGame(0); g.buildings.barutane = 60; g.research = ['top_dokum']
  const p = costRegister(g, 'barutane')
  assert.equal(p.factor, 0.5); assert.equal(p.heavyFactor, 0.375)
  assert.equal(p.after, 150); assert.equal(p.before, 300); assert.equal(p.saved, 150)
  assert.equal(p.after, unitLuxuryCost('topcu', 10, g).kukurt)
  assert.equal(unitLuxuryCost('tufekci', 10, g).kukurt, 125)
})

test('crystal preview reports zero where no crystal is requested and isolates building savings', () => {
  const g = initialGame(0); g.buildings.gozlukcu = 12
  assert.equal(costRegister(g, 'gozlukcu').before, 0)
  g.buildings.medrese = 5
  const p = costRegister(g, 'gozlukcu')
  assert.equal(p.factor, 0.88); assert.equal(p.after, luxuryCost(g, 'medrese').kristal)
  assert.ok(p.saved > 0)
  g.buildings.gozlukcu = 0; assert.equal(costRegister(g, 'gozlukcu').saved, 0)
})
