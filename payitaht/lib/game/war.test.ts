import { test } from 'node:test'
import assert from 'node:assert/strict'
import { freePlots, zoneOf, type BuildingId, type Game } from './engine'
import { BATTLE_WINDOW_MS } from './battle'
import { advanceEmpire, initialEmpire, parseEmpire, shipResources, type Empire } from './empire'
import { dispatchRaid, liberateCity, rivalResearch, siegeAt, SIEGE_MAX_MS } from './expeditions'
import { RIVALS, declareWar, expelSpies, proposeTreaty, rivalState } from './rivals'

const now = 20_000_000
const HOUR = 3600_000
const rival = (id: string) => RIVALS.find(r => r.id === id)!
function place(g: Game, id: BuildingId, level: number) {
  if (g.placement[id] === null && id !== 'surlar') g.placement[id] = freePlots(g, zoneOf(id))[0]
  g.buildings[id] = level
}
function town(): Empire {
  const e = advanceEmpire(initialEmpire(now), now)
  const g = e.cities[0].game
  place(g, 'divan', 5); place(g, 'konut', 6); place(g, 'kisla', 3); place(g, 'liman', 1)
  g.citizens = undefined
  g.resources = { gold: 5000, wood: 5000, stone: 5000, knowledge: 0 }
  return e
}

test('savaşçı hükümdar şehri işgal eder: haraç alır, sefer kapanır, kurtarınca kalkar', () => {
  let e = town()
  declareWar(e, rival('r-kemer'), e.cities[0], now, 'occupy')
  const t = e.threats!.find(x => x.intent === 'occupy')!
  assert.ok(t)
  assert.ok(e.world!.messages.some(m => m.subject === 'Savaş ilanı'))
  e = advanceEmpire(e, t.arriveAt + BATTLE_WINDOW_MS)
  const siege = siegeAt(e, 'city-1', 'occupy')
  assert.ok(siege, 'işgal başladı')
  assert.deepEqual(parseEmpire(JSON.stringify(e)).sieges, e.sieges)
  const gold = e.cities[0].game.resources.gold
  const later = advanceEmpire(e, siege!.since + 2 * HOUR + 1)
  assert.ok(later.cities[0].game.resources.gold < gold + 2 * 400, 'haraç alındı')
  assert.match(dispatchRaid(later, 'sahil-koy', { mizrakci: 1 }, later.cities[0].game.updatedAt).error ?? '', /işgal/)
  // Güçlü bir ordu şehri kurtarır.
  const g = later.cities[0].game
  place(g, 'konut', 20); g.citizens = undefined
  g.army.yeniceri = 150; g.army.okcu = 60; g.army.topcu = 10
  const freed = liberateCity(later, 'city-1', 'occupy', g.updatedAt)
  assert.equal(freed.error, undefined, freed.empire.reports?.[0]?.lines.join('\n'))
  assert.equal(siegeAt(freed.empire, 'city-1'), undefined)
  assert.ok(freed.empire.reports![0].battles?.length)
})

test('denizci hükümdar savaş gemisi olmayan limanı savaşmadan abluka eder; kuşatma 12 saatte biter', () => {
  let e = town()
  e.cities[0].game.army.nakliye = 3
  declareWar(e, rival('r-mavi'), e.cities[0], now, 'blockade')
  const t = e.threats!.find(x => x.intent === 'blockade')!
  e = advanceEmpire(e, t.arriveAt + 1000)
  const s = siegeAt(e, 'city-1', 'blockade')
  assert.ok(s)
  assert.match(e.reports![0].title, /abluka/)
  assert.ok(RIVALS.length)
  const ended = advanceEmpire(e, s!.since + SIEGE_MAX_MS + 1000)
  assert.equal(siegeAt(ended, 'city-1'), undefined)
})

test('barış anlaşması kuşatmayı kaldırır', () => {
  let e = town()
  declareWar(e, rival('r-kemer'), e.cities[0], now, 'occupy')
  e = advanceEmpire(e, e.threats![0].arriveAt + BATTLE_WINDOW_MS)
  assert.ok(siegeAt(e, 'city-1'))
  place(e.cities[0].game, 'elcilik', 1)
  rivalState(e, 'r-kemer').relation = 80
  e.cities[0].game.resources.gold = 5000
  const peace = proposeTreaty(e, 'r-kemer', 'baris', e.cities[0].game.updatedAt)
  assert.equal(peace.error, undefined)
  assert.equal(siegeAt(peace.empire, 'city-1'), undefined)
})

test('düşman hükümdar kendiliğinden savaş ilan eder', () => {
  let e = town()
  for (const r of RIVALS) rivalState(e, r.id).relation = -60
  e = advanceEmpire(e, now + 48 * HOUR)
  assert.ok((e.threats ?? []).some(t => t.id.startsWith('war-')) || (e.reports ?? []).some(r => r.npcId.startsWith('r-')) || (e.sieges ?? []).length,
    'iki günde en az bir savaş ilanı')
})

test('yakalanmayan casus şehirde kalır; Gizli Sığınak kovar', () => {
  let e = town()
  place(e.cities[0].game, 'siginak', 10)
  e.world!.spies = [{ id: 'fs-x', rivalId: 'r-kemer', cityId: 'city-1', since: now }]
  assert.deepEqual(parseEmpire(JSON.stringify(e)).world!.spies, e.world!.spies)
  let t = now
  for (let i = 0; i < 12 && e.world!.spies!.length; i++) { t += 31 * 60_000; e = expelSpies(e, 'city-1', t).empire }
  assert.equal(e.world!.spies!.length, 0)
  const bare = town()
  bare.world!.spies = [{ id: 'fs-y', rivalId: 'r-kemer', cityId: 'city-1', since: now }]
  assert.match(expelSpies(bare, 'city-1', now + 1000).error!, /Gizli Sığınak/)
})

test('abluka altındaki limandan nakliye çıkmaz; araştırma casusluğu her dalı verir', () => {
  const e = town()
  e.sieges = [{ id: 's1', rivalId: 'r-mavi', cityId: 'city-1', kind: 'blockade', level: 3, since: now, tick: now, troops: { kadirga: 2 } }]
  assert.match(shipResources(e, 'city-1', 'wood', 10, now).error ?? '', /abluka|hedef/)
  assert.equal(rivalResearch(rival('r-mavi'), 6).length, 5)
})

test('arşivlenen rapor kalır, diğerleri silinir', async () => {
  const { clearReports, deleteReport, keepReport, trimReports, MAX_REPORTS } = await import('./expeditions')
  let e = town()
  const mk = (i: number) => ({ id: `r${i}`, time: now + i, kind: 'defense' as const, cityId: 'city-1', npcId: 'r-kemer', success: true, title: `R${i}`, lines: [] })
  e.reports = Array.from({ length: 5 }, (_, i) => mk(i))
  e = keepReport(e, 'r2', now).empire
  assert.equal(e.reports!.find(r => r.id === 'r2')!.kept, true)
  const many = trimReports([...Array.from({ length: 40 }, (_, i) => mk(100 + i)), ...e.reports!])
  assert.equal(many.length, MAX_REPORTS)
  assert.ok(many.some(r => r.id === 'r2'), 'arşivdeki rapor düşmez')
  e = deleteReport(e, 'r0', now).empire
  assert.equal(e.reports!.length, 4)
  e = clearReports(e, 'city-1', now).empire
  assert.deepEqual(e.reports!.map(r => r.id), ['r2'])
  assert.deepEqual(parseEmpire(JSON.stringify(e)).reports, e.reports)
})

test('paralı asker: hükümdarlar birlik satar; halk, garnizon ve akçe ister', async () => {
  const { mercenaryOffers, buyMercenaries } = await import('./rivals')
  const e = town()
  const g = e.cities[0].game
  g.resources.gold = 200_000
  const offers = mercenaryOffers(e, now)
  assert.ok(offers.length > 0)
  const land = offers.find(o => ['yeniceri', 'sipahi', 'okcu', 'azap', 'topcu', 'mizrakci', 'sapanci', 'hekim'].includes(o.unit))!
  const before = g.army[land.unit]
  const bought = buyMercenaries(e, land.id, now)
  assert.equal(bought.error, undefined, bought.error)
  assert.equal(bought.empire.cities[0].game.army[land.unit], before + land.count)
  assert.match(buyMercenaries(bought.empire, land.id, now).error!, /geçerli değil/)
  assert.doesNotThrow(() => parseEmpire(JSON.stringify(bought.empire)))
})
