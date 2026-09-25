import { test } from 'node:test'
import assert from 'node:assert/strict'
import { freePlots, zoneOf, type BuildingId, type Game } from './engine'
import { BATTLE_WINDOW_MS } from './battle'
import { advanceEmpire, initialEmpire, parseEmpire, type Empire } from './empire'
import { dispatchBlockade, dispatchRaid, dispatchSpies, recallMission, targetInfo } from './expeditions'
import {
  RIVALS, acceptOffer, joinAlliance, marketOffers, postOffer, proposeTreaty, rankings, rivalState, sendGift, writeLetter,
} from './rivals'

const now = 20_000_000
const HOUR = 3600_000
function place(g: Game, id: BuildingId, level: number) {
  if (g.placement[id] === null && id !== 'surlar') g.placement[id] = freePlots(g, zoneOf(id))[0]
  g.buildings[id] = level
}
function strong(): Empire {
  const e = advanceEmpire(initialEmpire(now), now)
  const g = e.cities[0].game
  place(g, 'konut', 8); place(g, 'hamam', 6); place(g, 'kisla', 5); place(g, 'elcilik', 3); place(g, 'liman', 2); place(g, 'tersane', 3)
  g.citizens = undefined
  g.army.yeniceri = 80; g.army.okcu = 30; g.army.topcu = 6; g.army.casus = 4
  g.resources = { gold: 20000, wood: 9000, stone: 9000, knowledge: 0 }
  return e
}
const kemer = 'r-kemer' // Sahil Adası'nda, seviye 2'den başlar

test('ten AI rulers are ranked with the player', () => {
  const e = strong()
  const table = rankings(e, now)
  assert.equal(table.length, RIVALS.length + 1)
  assert.equal(table.filter(s => s.you).length, 1)
  assert.ok(targetInfo(e, kemer, now)!.kindName.includes('yapay rakip'))
})

test('raiding a ruler loots, angers them and brings a revenge raid', () => {
  const e = strong()
  const spied = dispatchSpies(e, kemer, 4, now)
  assert.equal(spied.error, undefined)
  const sent = dispatchRaid(spied.empire, kemer, { yeniceri: 80, okcu: 30, topcu: 6 }, now)
  assert.equal(sent.error, undefined)
  const m = sent.empire.missions!.find(x => x.kind === 'raid')!
  const hit = advanceEmpire(sent.empire, m.arriveAt + BATTLE_WINDOW_MS)
  const report = hit.reports!.find(r => r.kind === 'raid')!
  assert.equal(report.success, true, report.lines.join('\n'))
  assert.ok(rivalState(hit, kemer).relation < 0)
  const revenge = hit.threats!.find(t => t.npcId === kemer)
  assert.ok(revenge, 'intikam baskını planlandı')
  const after = advanceEmpire(hit, revenge!.arriveAt + BATTLE_WINDOW_MS)
  assert.ok(after.reports!.some(r => r.kind === 'defense'))
  assert.ok(parseEmpire(JSON.stringify(after)))
})

test('peace treaty needs good relations and then forbids attacks', () => {
  let e = strong()
  assert.match(proposeTreaty(e, kemer, 'baris', now).error!, /reddetti/)
  for (let i = 0; i < 4; i++) {
    const r = sendGift(e, kemer, 3000, now + i * HOUR + 1)
    assert.equal(r.error, undefined)
    e = r.empire
    e.cities[0].game.resources.gold = 20000
  }
  const t = proposeTreaty(e, kemer, 'baris', now + 5 * HOUR)
  assert.equal(t.error, undefined, `ilişki ${rivalState(e, kemer).relation}`)
  assert.match(dispatchRaid(t.empire, kemer, { yeniceri: 10 }, now + 5 * HOUR).error!, /barış/)
  assert.ok(t.empire.world!.messages.some(m => m.subject.includes('kabul')))
})

test('occupation stations the army and collects tribute until recalled', () => {
  const e = strong()
  const sent = dispatchRaid(e, kemer, { yeniceri: 80, okcu: 30, topcu: 6 }, now, 'occupy')
  assert.equal(sent.error, undefined)
  const m0 = sent.empire.missions![0]
  const held = advanceEmpire(sent.empire, m0.arriveAt + 3 * HOUR)
  const m = held.missions!.find(x => x.kind === 'occupy')!
  assert.equal(m.stationed, true)
  assert.ok(m.loot.gold > 0)
  assert.ok(!held.threats!.some(t => t.npcId === kemer), 'işgal altındaki hükümdar saldıramaz')
  const back = recallMission(held, m.id, m0.arriveAt + 3 * HOUR)
  const home = advanceEmpire(back.empire, back.empire.missions!.find(x => x.id === m.id)!.returnAt)
  assert.ok(!home.missions!.some(x => x.id === m.id))
})

test('a blockade needs warships and closes the ruler market', () => {
  const e = strong()
  const g = e.cities[0].game
  g.army.kadirga = 10; g.army.ates_gemisi = 3
  assert.match(dispatchBlockade(e, kemer, { yeniceri: 5 }, now).error!, /savaş gemileri/)
  const sent = dispatchBlockade(e, kemer, { kadirga: 10, ates_gemisi: 3 }, now)
  assert.equal(sent.error, undefined)
  const done = advanceEmpire(sent.empire, sent.empire.missions![0].arriveAt)
  assert.equal(done.missions![0].stationed, true, done.reports![0].lines.join('\n'))
  assert.ok(!marketOffers(done, done.missions![0].arriveAt).some(o => o.rivalId === kemer))
})

test('market: buy from a ruler, sell through the trading post', () => {
  const e = strong()
  const offer = marketOffers(e, now).find(o => o.side === 'sell')!
  const r = acceptOffer(e, offer.id, now)
  assert.equal(r.error, undefined)
  assert.ok(!marketOffers(r.empire, now).some(o => o.id === offer.id))
  const d = r.empire.world!.deliveries[0]
  const arrived = advanceEmpire(r.empire, d.eta)
  assert.equal(arrived.world!.deliveries.length, 0)
  assert.match(postOffer(e, 'wood', 500, 2, now).error!, /Ticaret Merkezi/)
  place(e.cities[0].game, 'ticaret_merkezi', 1)
  e.cities[0].game.resources.gold = 1000
  const posted = postOffer(e, 'wood', 500, 2, now)
  assert.equal(posted.error, undefined)
  const gold = posted.empire.cities[0].game.resources.gold
  const later = advanceEmpire(posted.empire, now + 30 * 60_000)
  assert.ok(later.cities[0].game.resources.gold > gold)
})

test('alliance, letters and saves', () => {
  let e = strong()
  assert.match(joinAlliance(e, 'dogu', now).error!, /tanımıyor/)
  for (const r of RIVALS.filter(x => x.faction === 'dogu')) rivalState(e, r.id).relation = 20
  const joined = joinAlliance(e, 'dogu', now)
  assert.equal(joined.error, undefined)
  e = joined.empire
  const lale = RIVALS.find(r => r.faction === 'dogu')!
  assert.match(dispatchRaid(e, lale.id, { yeniceri: 5 }, now).error!, /İttifak/)
  const hi = writeLetter(e, kemer, 'selam', now)
  assert.equal(hi.error, undefined)
  assert.match(writeLetter(hi.empire, kemer, 'selam', now).error!, /zaten/)
  assert.deepEqual(parseEmpire(JSON.stringify(hi.empire)).world, hi.empire.world)
})
