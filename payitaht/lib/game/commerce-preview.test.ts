import assert from 'node:assert/strict'
import test from 'node:test'
import { capacity, execute, initialGame } from './engine'
import { merchantQuote } from './commerce-preview'

test('merchant quotation matches actual purchase and sale rounding', () => {
  const g = initialGame(Date.now());g.buildings.carsi=3;g.buildings.ticaret_merkezi=7;g.resources.gold=1000;g.luxury.kahve=100
  const q=merchantQuote(g,'kahve',10)
  const bought=execute(g,{type:'trade',id:'kahve',side:'buy',amount:10},g.updatedAt)
  assert.equal(bought.error,undefined);assert.equal(g.resources.gold-bought.game.resources.gold,q.buy)
  const sold=execute(g,{type:'trade',id:'kahve',side:'sell',amount:10},g.updatedAt)
  assert.equal(sold.error,undefined);assert.equal(sold.game.resources.gold-g.resources.gold,q.received)
})
test('sale quotation shows actual credit when gold capacity clips proceeds', () => {
  const g=initialGame(Date.now());g.buildings.carsi=3;g.resources.gold=capacity(g)-3;g.luxury.kahve=100
  const q=merchantQuote(g,'kahve',10);assert.equal(q.received,3);assert.ok(q.sell>q.received)
  const sold=execute(g,{type:'trade',id:'kahve',side:'sell',amount:10},g.updatedAt)
  assert.equal(sold.game.resources.gold-g.resources.gold,3)
})
test('merchant reasons cover missing bazaar, money, stock, party and storage', () => {
  const g=initialGame(Date.now());g.buildings.carsi=0
  assert.equal(merchantQuote(g,'kahve',10).buyReason,'Önce Çarşı kurun.')
  g.buildings.carsi=1;g.resources.gold=0;assert.equal(merchantQuote(g,'kahve',10).buyReason,'Akçe yetersiz.')
  g.resources.gold=1000;g.luxury.kahve=capacity(g);assert.equal(merchantQuote(g,'kahve',10).buyReason,'Ambarda yer yok.')
  g.luxury.kahve=0;assert.equal(merchantQuote(g,'kahve',10).sellReason,'Stok yetersiz.')
  assert.equal(merchantQuote(g,'kahve',100000).buyReason,'Parti sınırını aşıyor.')
})
