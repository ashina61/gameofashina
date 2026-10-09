import { capacity, exchangeLimit, exchangeRate, goodAmount, type Game, type Good } from './engine'

/** Presentation only; the existing exchange command remains authoritative. */
export function exchangeQuote(game: Game, from: Good, to: Good, input: number) {
  const amount = Math.floor(input), rate = exchangeRate(game), limit = exchangeLimit(game)
  const stock = goodAmount(game, from), room = Math.max(0, capacity(game) - goodAmount(game, to))
  const valid = Number.isSafeInteger(amount) && amount > 0
  const received = valid ? Math.floor(amount / rate) : 0
  const reason = !valid ? 'Pozitif bir miktar gir.' : from === to ? 'İki farklı mal seç.' : game.buildings.kara_pazar < 1 ? 'Takas için Kara Pazar kur.' : amount > limit ? `Parti sınırı ${limit.toLocaleString('tr-TR')} birim.` : stock < amount ? 'Vereceğin malın stoğu yetersiz.' : received > room ? 'Alacağın mal için ambarda yer yok.' : received < 1 ? 'Bu miktar karşılığında hiç mal alamazsın.' : null
  return { amount, received, rate, limit, stock, room, reason, max: Math.min(limit, Math.floor(stock)) }
}
