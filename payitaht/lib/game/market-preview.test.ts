import test from 'node:test'
import assert from 'node:assert/strict'
import { activeCity, initialEmpire } from './empire'
import { acceptOffer, compareOfferPrices, marketOffers, offerReason, type MarketOffer } from './rivals'
const now = Date.UTC(2026, 10, 27, 18)

test('market orders player purchases cheapest first and sales highest first', () => {
  const make = (side: MarketOffer['side']) => [4, 2, 6].map(price => ({ id: String(price), rivalId: 'r-sakiz', side, good: 'wood' as const, amount: 100, price }))
  assert.deepEqual(make('sell').sort(compareOfferPrices).map(o => o.price), [2, 4, 6])
  assert.deepEqual(make('buy').sort(compareOfferPrices).map(o => o.price), [6, 4, 2])
})
test('purchase preview agrees with command and never spends resources', () => {
  const empire = initialEmpire(now), game = activeCity(empire).game
  const offer = marketOffers(empire, now).find(o => o.side === 'sell')!
  game.resources.gold = 0
  const before = JSON.stringify(empire), reason = offerReason(empire, offer)
  assert.match(reason!, /akçe gerekli/)
  assert.equal(acceptOffer(empire, offer.id, now).error, reason)
  assert.equal(JSON.stringify(empire), before)
  game.resources.gold = Math.round(offer.amount * offer.price)
  assert.equal(offerReason(empire, offer), undefined)
  const result = acceptOffer(empire, offer.id, now)
  assert.equal(result.error, undefined)
  assert.equal(activeCity(result.empire).game.resources.gold, 0)
  assert.ok(result.empire.world?.deliveries.some(d => d.id === `d-${offer.id}`))
})
test('sale preview explains port, fleet and stock failures in command order', () => {
  const e = initialEmpire(now), g = activeCity(e).game
  const o: MarketOffer = { id: 'preview', rivalId: 'r-sakiz', side: 'buy', good: 'wood', amount: 100, price: 2 }
  g.buildings.liman = 0
  assert.match(offerReason(e, o)!, /Limanı gerekli/)
  g.buildings.liman = 1; g.army.nakliye = 0
  assert.match(offerReason(e, o)!, /boş ticaret gemileri/)
  g.army.nakliye = 10; g.resources.wood = 99
  assert.equal(offerReason(e, o), 'Bu kadar malın yok.')
  g.resources.wood = 100
  assert.equal(offerReason(e, o), undefined)
})
