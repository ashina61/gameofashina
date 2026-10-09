import { capacity, merchantBuyPrice, merchantLimit, merchantSellPrice, type Game, type Luxury } from './engine'

/** Read-only quotation for the existing immediate merchant command. */
export function merchantQuote(game: Game, good: Luxury, amount: number) {
  const buy = Math.ceil(amount * merchantBuyPrice(game)), sell = Math.floor(amount * merchantSellPrice(game))
  const cap = capacity(game), coinRoom = Math.max(0, cap - game.resources.gold)
  const buyReason = game.buildings.carsi < 1 ? 'Önce Çarşı kurun.' : amount > merchantLimit(game) ? 'Parti sınırını aşıyor.' : game.resources.gold < buy ? 'Akçe yetersiz.' : game.luxury[good] + amount > cap ? 'Ambarda yer yok.' : null
  const sellReason = game.buildings.carsi < 1 ? 'Önce Çarşı kurun.' : amount > merchantLimit(game) ? 'Parti sınırını aşıyor.' : game.luxury[good] < amount ? 'Stok yetersiz.' : null
  return { buy, sell, received: Math.min(coinRoom, sell), buyReason, sellReason, room: Math.max(0, cap - game.luxury[good]) }
}
