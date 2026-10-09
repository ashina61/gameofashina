import assert from 'node:assert/strict'
import test from 'node:test'
import { capacity, execute, initialGame } from './engine'
import { exchangeQuote } from './exchange-preview'

test('exchange preview matches actual debit and floored credit at multiple levels', () => {
  for (const level of [1,2,12,32]) {
    const g = initialGame(Date.now());g.buildings.kara_pazar = level;g.resources.wood = 1000
    const q = exchangeQuote(g, 'wood', 'kristal', 301)
    const result = execute(g, { type: 'exchange', from: 'wood', to: 'kristal', amount: q.amount }, g.updatedAt)
    assert.equal(q.reason, null);assert.equal(result.error, undefined)
    assert.equal(g.resources.wood - result.game.resources.wood, q.amount)
    assert.equal(result.game.luxury.kristal - g.luxury.kristal, q.received)
  }
})
test('exchange preview blocks shortage, party limit and target storage before spending', () => {
  const g = initialGame(Date.now());g.buildings.kara_pazar = 1;g.resources.wood = 1000
  assert.match(exchangeQuote(g,'wood','kristal',401).reason!, /Parti/)
  g.resources.wood = 5;assert.match(exchangeQuote(g,'wood','kristal',100).reason!, /stoğu/)
  g.resources.wood = 1000;g.luxury.kristal = capacity(g)
  assert.match(exchangeQuote(g,'wood','kristal',100).reason!, /ambarda/)
  const result = execute(g, { type:'exchange',from:'wood',to:'kristal',amount:100 }, g.updatedAt)
  assert.ok(result.error);assert.equal(result.game.resources.wood, 1000)
})
test('exchange preview covers unbuilt, invalid and zero-output requests', () => {
  const g = initialGame(Date.now());g.buildings.kara_pazar = 0
  assert.match(exchangeQuote(g,'wood','kristal',100).reason!, /Kara Pazar/)
  g.buildings.kara_pazar = 1
  for(const n of [0,-1,NaN,Infinity])assert.ok(exchangeQuote(g,'wood','kristal',n).reason)
  assert.match(exchangeQuote(g,'wood','wood',100).reason!, /farklı/)
  assert.match(exchangeQuote(g,'wood','kristal',1).reason!, /hiç mal/)
})
