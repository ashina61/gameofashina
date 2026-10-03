import { LUXURY_IDS, UNITS, capacity, garrisonLimit, garrisonUsed, idleWorkers, logEvent, travelFactor, type Game, type Good, type UnitId } from '../engine'
import { troopList } from '../battle'
import { idleMerchants, shipCargo } from '../expeditions'
import { activeCity, advanceEmpire, type Empire } from '../empire'
import { ISLANDS, type IslandId } from '../islands'
import { parsePact } from '../pact'
import { aiHour, parseAi, PACES } from '../ai'
import { FACTIONS, HOUR, MAX_DELIVERIES, MAX_FOREIGN_SPIES, MEMO_KINDS, type Offer, RIVALS, type Rival, type RivalStyle, STYLE_NAMES, TREATIES, type World, mail, peek, relate, rivalById, rivalFleet, rivalGarrison, rivalLevel, rivalLoot, rivalWallHp, roll, world } from './core'
import { considerWar, culturalTreaties, stationTribute } from './diplomacy'

export const FAIR_PRICE: Record<Good, number> = { gold: 1, wood: 2, stone: 3, knowledge: 0, uzum: 5, mermer: 5, kristal: 6, kukurt: 6 }
export const MARKET_GOODS: Good[] = ['wood', 'stone', ...LUXURY_IDS]
export type MarketOffer = { id: string; rivalId: string; side: 'sell' | 'buy'; good: Good; amount: number; price: number }
function blockaded(empire: Empire, rivalId: string) { return (empire.missions ?? []).some(m => m.npcId === rivalId && m.kind === 'blockade' && m.stationed) }
/** Bu saatin pazar teklifleri (rakipler satar ya da alır). */
export function marketOffers(empire: Empire, now: number): MarketOffer[] {
  const slot = Math.floor(now / HOUR)
  const out: MarketOffer[] = []
  for (const r of RIVALS) {
    if (blockaded(empire, r.id)) continue
    const s = peek(empire, r.id)
    const trade = s.treaties.includes('ticaret')
    const n = (r.style === 'tuccar' ? 2 : 1) + (trade ? 1 : 0)
    for (let i = 0; i < n; i++) {
      const key = `${r.id}-${slot}-${i}`
      const good = MARKET_GOODS[Math.floor(roll(`${key}-g`) * MARKET_GOODS.length)]
      const side = roll(`${key}-s`) < 0.55 ? 'sell' : 'buy'
      const L = rivalLevel(empire, r, now)
      const amount = Math.round((100 + roll(`${key}-a`) * 300) * (1 + L / 10) / 10) * 10
      const spread = side === 'sell' ? 1.1 + roll(`${key}-p`) * 0.5 : 0.6 + roll(`${key}-p`) * 0.35
      const price = Math.max(1, Math.round(FAIR_PRICE[good] * spread * (trade ? (side === 'sell' ? 0.9 : 1.1) : 1) * 10) / 10)
      out.push({ id: key, rivalId: r.id, side, good, amount, price })
    }
  }
  return out.filter(o => !(empire.world?.traded ?? []).includes(o.id))
}
export const addGood = (g: Game, good: Good, n: number) => {
  if ((LUXURY_IDS as readonly string[]).includes(good)) g.luxury[good as keyof Game['luxury']] += n
  else g.resources[good as keyof Game['resources']] += n
}
export const stockOf = (g: Game, good: Good) => (LUXURY_IDS as readonly string[]).includes(good) ? g.luxury[good as keyof Game['luxury']] : g.resources[good as keyof Game['resources']]
/* ------------------------------------------------------- ASKER TİCARETİ */

/** Paralı asker teklifi: savaşçı ve denizci hükümdarlar saat başı birlik satar. */
export type MercOffer = { id: string; rivalId: string; unit: UnitId; count: number; price: number }
const MERC_POOL: Record<RivalStyle, UnitId[]> = {
  savasci: ['yeniceri', 'sipahi', 'okcu', 'azap', 'topcu'], denizci: ['kadirga', 'kalyon', 'ates_gemisi'],
  tuccar: ['mizrakci', 'sapanci'], alim: ['hekim', 'okcu'],
}
export function mercenaryOffers(empire: Empire, now: number): MercOffer[] {
  const slot = Math.floor(now / HOUR)
  const out: MercOffer[] = []
  for (const r of RIVALS) {
    if (blockaded(empire, r.id) || peek(empire, r.id).relation < -20) continue
    const n = r.style === 'savasci' || r.style === 'denizci' ? 1 : roll(`merc-${r.id}-${slot}`) < 0.35 ? 1 : 0
    for (let i = 0; i < n; i++) {
      const key = `m-${r.id}-${slot}-${i}`
      const pool = MERC_POOL[r.style]
      const unit = pool[Math.floor(roll(`${key}-u`) * pool.length)]
      const L = rivalLevel(empire, r, now)
      const naval = UNITS[unit].branch === 'deniz'
      const count = Math.max(1, Math.round((naval ? 1 + L / 3 : 4 + L * 1.5) * (0.6 + roll(`${key}-c`) * 0.8)))
      const c = UNITS[unit].cost
      const price = Math.round((c.gold + c.wood * 2 + c.stone * 3) * (1.5 + roll(`${key}-p`) * 0.5) * (peek(empire, r.id).treaties.includes('ticaret') ? 0.9 : 1))
      out.push({ id: key, rivalId: r.id, unit, count, price })
    }
  }
  return out.filter(o => !(empire.world?.traded ?? []).includes(o.id))
}
/** Paralı askerleri satın al: halktan yer, garnizonda yer ve akçe ister; birlikler hemen katılır. */
export function buyMercenaries(source: Empire, offerId: string, now: number): { empire: Empire; error?: string } {
  const empire = advanceEmpire(source, now)
  const o = mercenaryOffers(empire, now).find(x => x.id === offerId)
  if (!o) return { empire, error: 'Bu teklif artık geçerli değil.' }
  const city = activeCity(empire), g = city.game, u = UNITS[o.unit], r = rivalById(o.rivalId)!
  const total = o.price * o.count, pop = u.pop * o.count
  if (u.branch === 'deniz' && g.buildings.tersane < 1) return { empire, error: 'Gemileri demirlemek için Tersane gerekli.' }
  if (garrisonUsed(g, u.branch) + pop > garrisonLimit(g, u.branch)) return { empire, error: `Garnizonda yer yok (${garrisonUsed(g, u.branch)}/${garrisonLimit(g, u.branch)}).` }
  if (idleWorkers(g) < pop) return { empire, error: `${pop} boşta vatandaş gerekli (paralı askerler şehirde barınır).` }
  if (g.resources.gold < total) return { empire, error: `${total} akçe gerekli.` }
  g.resources.gold -= total
  g.army[o.unit] += o.count
  const w = world(empire)
  w.traded = [...w.traded.filter(id => Number(id.split('-').at(-2)) >= Math.floor(now / HOUR) - 1), o.id]
  relate(empire, r.id, 1)
  logEvent(g, `${r.city} (${r.ruler}) ${o.count} ${u.name} gönderdi; ${total} akçe ödendi.`, now)
  return { empire }
}

export function seaMinutes(a: IslandId, b: IslandId) {
  const A = ISLANDS.find(i => i.id === a)!, B = ISLANDS.find(i => i.id === b)!
  return 2 + Math.hypot(A.x - B.x, A.y - B.y) / 3
}
export function acceptOffer(source: Empire, offerId: string, now: number): { empire: Empire; error?: string } {
  const empire = advanceEmpire(source, now)
  const offer = marketOffers(empire, now).find(o => o.id === offerId)
  if (!offer) return { empire, error: 'Bu teklif artık geçerli değil.' }
  const r = rivalById(offer.rivalId)!
  const city = activeCity(empire)
  const g = city.game
  const total = Math.round(offer.amount * offer.price)
  const eta = now + Math.round(seaMinutes(r.islandId, city.islandId) * 60_000 * travelFactor(g))
  const w = world(empire)
  if (w.deliveries.length >= MAX_DELIVERIES) return { empire, error: 'Limanlarda bekleyen yük çok; önce ambarlarda yer aç.' }
  if (offer.side === 'sell') {
    if (g.resources.gold < total) return { empire, error: `${total} akçe gerekli.` }
    g.resources.gold -= total
    w.deliveries = [...w.deliveries, { id: `d-${offer.id}`, cityId: city.id, good: offer.good, amount: offer.amount, eta, from: r.city }]
    logEvent(g, `${r.city} pazarından ${offer.amount} ${offer.good} alındı; gemileri yolda.`, now)
  } else {
    if (g.buildings.liman < 1) return { empire, error: 'Satış için Ticaret Limanı gerekli.' }
    const fleetCap = idleMerchants(empire) * shipCargo(g)
    if (fleetCap < offer.amount) return { empire, error: `Limandaki boş ticaret gemileri ${fleetCap} mal taşır; bu satış ${offer.amount} ister.` }
    if (stockOf(g, offer.good) < offer.amount) return { empire, error: 'Bu kadar malın yok.' }
    addGood(g, offer.good, -offer.amount)
    w.deliveries = [...w.deliveries, { id: `d-${offer.id}`, cityId: city.id, good: 'gold', amount: total, eta, from: r.city }]
    logEvent(g, `${offer.amount} ${offer.good} ${r.city} pazarına satıldı; bedeli dönüşte gelir.`, now)
  }
  w.traded = [...w.traded.filter(id => Number(id.split('-').at(-2)) >= Math.floor(now / HOUR) - 1), offer.id]
  relate(empire, r.id, 1)
  return { empire }
}
/** Oyuncunun Ticaret Merkezi'ndeki satış teklifleri; yapay tüccarlar fiyata göre alır. */
export function offerSlots(g: Game) { return g.buildings.ticaret_merkezi }
export function postOffer(source: Empire, good: Good, amount: number, price: number, now: number): { empire: Empire; error?: string } {
  const empire = advanceEmpire(source, now)
  const city = activeCity(empire)
  const g = city.game
  const n = Math.floor(amount), p = Math.round(price * 10) / 10
  if (!MARKET_GOODS.includes(good) || !Number.isSafeInteger(n) || n <= 0 || !(p > 0) || p > 100) return { empire, error: 'Geçersiz teklif.' }
  if (offerSlots(g) < 1) return { empire, error: 'Teklif vermek için Ticaret Merkezi kur.' }
  const w = world(empire)
  if (w.offers.filter(o => o.cityId === city.id).length >= offerSlots(g)) return { empire, error: `Ticaret Merkezi ${offerSlots(g)} teklif taşır.` }
  if (stockOf(g, good) < n) return { empire, error: 'Bu kadar malın yok.' }
  addGood(g, good, -n)
  w.offers = [...w.offers, { id: `o-${city.id}-${now}`, cityId: city.id, good, amount: n, left: n, price: p, since: now, tick: now }]
  return { empire }
}
export function cancelOffer(source: Empire, offerId: string, now: number): { empire: Empire; error?: string } {
  const empire = advanceEmpire(source, now)
  const w = world(empire)
  const o = w.offers.find(x => x.id === offerId)
  const city = o && empire.cities.find(c => c.id === o.cityId)
  if (!o || !city) return { empire, error: 'Teklif bulunamadı.' }
  addGood(city.game, o.good, Math.min(o.left, Math.max(0, capacity(city.game) - stockOf(city.game, o.good))))
  w.offers = w.offers.filter(x => x.id !== offerId)
  return { empire }
}
/** Dakikada satılan miktar: adil fiyatın %60 üstünde hiç satılmaz. */
export function fillRate(empire: Empire, o: Offer) {
  const fair = FAIR_PRICE[o.good]
  const trade = Object.values(empire.world?.rivals ?? {}).filter(s => s.treaties.includes('ticaret')).length
  return Math.max(0, (fair * 1.6 - o.price) / (fair * 1.6)) * 12 * (1 + 0.2 * trade)
}

/* ------------------------------------------------------------ DÜNYA SAATİ */

const MAIL_LINES = [
  ['Kervan haberi', 'Doğu yolunda kervanlar yeniden işliyor. Pazarımıza uğrayın.'],
  ['Korsan uyarısı', 'Korsanlar son günlerde kıyılarımızı yokluyor. Surlarınızı sağlam tutun.'],
  ['Hasat', 'Bu yıl bağlar bereketli. Üzüm fazlamızı satmaya hazırız.'],
  ['Elçi daveti', 'Sarayımızın kapısı dostlara açık. Bir anlaşma konuşalım mı?'],
  ['Sınır gerginliği', 'Adalar arasında huzursuzluk var. Tarafını iyi seç.'],
]
/** advanceEmpire içinden: teslimatlar, pazar satışları, haraç ve saatlik olaylar. */
export function advanceWorld(empire: Empire, now: number) {
  const w = world(empire)
  // Teslimatlar
  w.deliveries = w.deliveries.flatMap(d => {
    if (now < d.eta) return [d]
    const city = empire.cities.find(c => c.id === d.cityId)
    if (!city) return []
    const room = Math.max(0, Math.floor(capacity(city.game) - stockOf(city.game, d.good)))
    const put = Math.min(room, d.amount)
    addGood(city.game, d.good, put)
    return d.amount - put > 0 ? [{ ...d, amount: d.amount - put }] : []
  })
  // Oyuncunun teklifleri
  for (const o of w.offers) {
    const city = empire.cities.find(c => c.id === o.cityId)
    if (!city || now <= o.tick) continue
    const sold = Math.min(o.left, Math.floor(fillRate(empire, o) * (now - o.since) / 60_000) - (o.amount - o.left))
    o.tick = now
    if (sold <= 0) continue
    o.left -= sold
    city.game.resources.gold = Math.min(capacity(city.game), city.game.resources.gold + Math.round(sold * o.price))
  }
  const done = w.offers.filter(o => o.left <= 0)
  for (const o of done) {
    const city = empire.cities.find(c => c.id === o.cityId)
    if (city) logEvent(city.game, `Ticaret Merkezi: ${o.amount} ${o.good} satıldı.`, now)
  }
  w.offers = w.offers.filter(o => o.left > 0)
  // Kültür anlaşmaları şehirlerin müzelerine dağılır.
  const culture = culturalTreaties(empire)
  for (const c of empire.cities) c.game.culture = Math.min(c.game.buildings.muze, culture)
  // Saatlik olaylar (en fazla 12 saat geriye).
  const slot = Math.floor(now / HOUR)
  for (let s = Math.max(w.slot + 1, slot - 11); s <= slot; s++) {
    const at = s * HOUR
    for (const m of empire.missions ?? []) {
      if (!m.stationed || (m.kind !== 'occupy' && m.kind !== 'blockade') || at <= m.arriveAt) continue
      m.loot = { ...m.loot, gold: m.loot.gold + stationTribute(empire, m.npcId, m.kind, at) }
    }
    if (s % PACES[w.pace ?? 'normal'].warEvery === 3 % PACES[w.pace ?? 'normal'].warEvery) considerWar(empire, at, s)
    aiHour(empire, at, s)
    if (s % 6 === 0) {
      const r = RIVALS[Math.floor(roll(`mail-${s}`) * RIVALS.length)]
      const [subject, body] = MAIL_LINES[Math.floor(roll(`line-${s}`) * MAIL_LINES.length)]
      mail(empire, at, r.ruler, subject, body, r.id)
    }
    if (s % 4 === 0) {
      // Düşman hükümdarların casusları: Gizli Sığınak yakalar.
      const hostile = RIVALS.filter(r => peek(empire, r.id).relation <= -20)
      if (hostile.length) {
        const r = hostile[Math.floor(roll(`spy-${s}`) * hostile.length)]
        const city = empire.cities[Math.floor(roll(`spyc-${s}`) * empire.cities.length)]
        const caught = roll(`spyk-${s}`) < Math.min(0.9, city.game.buildings.siginak * 0.06)
        if (caught) {
          relate(empire, r.id, -3)
          mail(empire, at, 'Gizli Sığınak', 'Casus yakalandı', `${r.ruler} hesabına çalışan bir casus ${city.name} ambarını gözetlerken yakalandı.`)
        } else {
          // Yakalanmayan casus şehirde kalır: saldırıyı kolaylaştırır; Gizli Sığınak onu bulup kovabilir.
          const spies = w.spies ?? []
          if (spies.filter(x => x.cityId === city.id).length < MAX_FOREIGN_SPIES && !spies.some(x => x.cityId === city.id && x.rivalId === r.id)) {
            w.spies = [...spies, { id: `fs-${r.id}-${city.id}-${s}`, rivalId: r.id, cityId: city.id, since: at }]
          }
        }
      }
    }
  }
  w.slot = Math.max(w.slot, slot)
}

export function parseWorld(raw: unknown, cityIds: Set<string>): World | undefined {
  if (raw === undefined) return undefined
  const w = raw as World
  const fin = (n: unknown) => typeof n === 'number' && Number.isFinite(n) && n >= 0
  const bad = () => { throw new Error('Dünya kaydı okunamadı.') }
  if (!w || !fin(w.start) || !Number.isInteger(w.slot) || !(w.alliance === null || w.alliance in FACTIONS) || !fin(w.allianceAt) ||
      !w.rivals || typeof w.rivals !== 'object' || !Array.isArray(w.messages) || w.messages.length > 40 ||
      !Array.isArray(w.offers) || w.offers.length > 200 || !Array.isArray(w.deliveries) || w.deliveries.length > 200 ||
      !Array.isArray(w.traded) || w.traded.length > 200) bad()
  for (const [id, s] of Object.entries(w.rivals)) {
    if (!rivalById(id) || !s || !Number.isFinite(s.relation) || Math.abs(s.relation) > 100 || !fin(s.lootedAt) || !fin(s.giftAt) ||
        typeof s.greetDay !== 'string' || !Array.isArray(s.treaties) || !s.treaties.every(t => t in TREATIES) ||
        (s.memo !== undefined && (!Array.isArray(s.memo) || s.memo.length > 6 || !s.memo.every(m => m && MEMO_KINDS.includes(m.kind) && fin(m.at) && (m.of === undefined || !!rivalById(m.of)))))) bad()
  }
  for (const m of w.messages) if (!m || typeof m.id !== 'string' || !fin(m.time) || typeof m.subject !== 'string' || typeof m.body !== 'string' || typeof m.read !== 'boolean') bad()
  for (const o of w.offers) {
    if (!o || typeof o.id !== 'string' || !cityIds.has(o.cityId) || !MARKET_GOODS.includes(o.good) || !Number.isInteger(o.amount) ||
        !Number.isInteger(o.left) || o.left < 0 || o.left > o.amount || !fin(o.price) || !fin(o.since) || !fin(o.tick)) bad()
  }
  for (const d of w.deliveries) {
    if (!d || typeof d.id !== 'string' || !cityIds.has(d.cityId) || !(d.good in FAIR_PRICE) || !Number.isInteger(d.amount) || d.amount < 0 || !fin(d.eta)) bad()
  }
  if (w.spies !== undefined && (!Array.isArray(w.spies) || w.spies.length > 60)) bad()
  for (const x of w.spies ?? []) if (!x || typeof x.id !== 'string' || !rivalById(x.rivalId) || !cityIds.has(x.cityId) || !fin(x.since)) bad()
  if (w.expelAt !== undefined && (typeof w.expelAt !== 'object' || !Object.entries(w.expelAt).every(([id, t]) => cityIds.has(id) && fin(t)))) bad()
  parseAi(w, bad)
  if (w.pact !== undefined) parsePact(w.pact, bad)
  return structuredClone(w)
}

/** İstihbarat satırları (casus raporu). */
export function rivalIntel(empire: Empire, r: Rival, now: number) {
  const L = rivalLevel(empire, r, now)
  const loot = rivalLoot(empire, r, now)
  return [
    `${r.ruler} · ${STYLE_NAMES[r.style]} · ${FACTIONS[r.faction].name} · şehir seviyesi ${L}.`,
    `Garnizon: ${troopList(rivalGarrison(L, r.style))}.`,
    `Sur canı ${rivalWallHp(L)}. Donanma: ${troopList(rivalFleet(L, r.style))}.`,
    `Ambar (korunan hariç): ${loot.gold} akçe, ${loot.wood} kereste, ${loot.stone} taş.`,
    `İlişki: ${peek(empire, r.id).relation}.`,
  ]
}
export const rivalAttackMul = (level: number) => 1 + level * 0.03

/** Mesajları okundu işaretle. */
export function readMessages(source: Empire, now: number): { empire: Empire; error?: string } {
  const empire = advanceEmpire(source, now)
  const w = world(empire)
  w.messages = w.messages.map(m => ({ ...m, read: true }))
  return { empire }
}
