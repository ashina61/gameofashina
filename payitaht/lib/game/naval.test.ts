import { test } from 'node:test'
import assert from 'node:assert/strict'
import { freePlots, zoneOf, type BuildingId, type Game } from './engine'
import { advanceEmpire, initialEmpire, parseEmpire, type Empire } from './empire'
import {
  PROTECTION_DIVAN, THREAT_WARNING_MS, availableUnits, dispatchPiracy, dispatchRaid, safeStock, targetTravelMs,
  transportsNeeded,
} from './expeditions'

const now = 10_000_000
const HOUR = 3600_000
function place(g: Game, id: BuildingId, level: number) {
  if (g.placement[id] === null) g.placement[id] = freePlots(g, zoneOf(id))[0]
  g.buildings[id] = level
}

function navy(): Empire {
  const e = initialEmpire(now)
  const g = e.cities[0].game
  place(g, 'liman', 2); place(g, 'tersane', 2); place(g, 'kisla', 3)
  g.army.yeniceri = 60; g.army.okcu = 20; g.army.nakliye = 1
  return e
}

test('overseas raids load troops onto transports and sail longer', () => {
  const e = navy()
  assert.equal(transportsNeeded({ yeniceri: 60, okcu: 20 }), 2)
  assert.match(dispatchRaid(e, 'zeytin-koy', { yeniceri: 60, okcu: 20 }, now).error!, /2 nakliye/)
  e.cities[0].game.army.nakliye = 2
  const sent = dispatchRaid(e, 'zeytin-koy', { yeniceri: 60, okcu: 20 }, now)
  assert.equal(sent.error, undefined)
  const m = sent.empire.missions![0]
  assert.equal(m.units.nakliye, 2)
  assert.equal(availableUnits(sent.empire, 'city-1').nakliye, 0)
  assert.ok(targetTravelMs(sent.empire.cities[0], 'zeytin-koy', 'raid', 1) > targetTravelMs(sent.empire.cities[0], 'sahil-koy', 'raid', 1))
  // Köyün donanması yok: ordu çıkar, kazanır, ganimeti gemiler taşır.
  const back = advanceEmpire(sent.empire, m.returnAt)
  const report = back.reports![0]
  assert.equal(report.success, true, report.lines.join('\n'))
  assert.equal(back.cities[0].game.army.nakliye, 2)
})

test('a pirate fleet blocks an unescorted landing; warships clear the coast', () => {
  const e = navy()
  e.cities[0].game.army.nakliye = 2
  const alone = dispatchRaid(e, 'zeytin-korsan', { yeniceri: 60, okcu: 20 }, now)
  assert.equal(alone.error, undefined)
  const blocked = advanceEmpire(alone.empire, alone.empire.missions![0].arriveAt)
  assert.equal(blocked.reports![0].success, false)
  assert.match(blocked.reports![0].title, /çıkarma/)
  assert.equal(blocked.cities[0].game.army.yeniceri, 60, 'no landing, no land losses')

  e.cities[0].game.army.kadirga = 10; e.cities[0].game.army.ates_gemisi = 3
  const escorted = dispatchRaid(e, 'zeytin-korsan', { yeniceri: 60, okcu: 20, kadirga: 10, ates_gemisi: 3 }, now)
  assert.equal(escorted.error, undefined)
  const fought = advanceEmpire(escorted.empire, escorted.empire.missions![0].arriveAt)
  assert.ok(fought.reports![0].lines.includes('Deniz savaşı:'))
  assert.ok(fought.reports![0].lines.some(l => l.includes('karaya çıktı')), fought.reports![0].lines.join('\n'))
  // Aynı adadaki hedefe savaş gemisi götürülmez.
  assert.match(dispatchRaid(e, 'sahil-koy', { yeniceri: 5, kadirga: 1 }, now).error!, /başka adaya/)
})

test('pirate fortress missions capture merchant ships for gold and fame', () => {
  const e = navy()
  const g = e.cities[0].game
  g.army.yeniceri = 0; g.army.okcu = 0
  g.army.kadirga = 3
  assert.match(dispatchPiracy(e, 'kayik', { kadirga: 3 }, now).error!, /Korsan Kalesi/)
  place(g, 'korsan_kalesi', 1)
  assert.match(dispatchPiracy(e, 'kervan', { kadirga: 3 }, now).error!, /3\. seviye/)
  assert.match(dispatchPiracy(e, 'kayik', { yeniceri: 3 }, now).error!, /savaş gemileri/)
  const sent = dispatchPiracy(e, 'kayik', { kadirga: 3 }, now)
  assert.equal(sent.error, undefined)
  const gold = sent.empire.cities[0].game.resources.gold
  const back = advanceEmpire(sent.empire, sent.empire.missions![0].returnAt)
  assert.equal(back.reports![0].kind, 'piracy')
  assert.equal(back.reports![0].success, true)
  assert.equal(back.cities[0].game.piracy, 2)
  assert.ok(back.cities[0].game.resources.gold > gold)
  // Kayıt dönüşü.
  assert.deepEqual(parseEmpire(JSON.stringify(sent.empire)).missions, sent.empire.missions)
})

test('pirates raid cities past beginner protection, with a warning first', () => {
  const e = initialEmpire(now)
  const g = e.cities[0].game
  let quiet = advanceEmpire(e, now + 5 * HOUR)
  assert.equal(quiet.threats!.length, 0, 'beginner protection')
  g.buildings.divan = PROTECTION_DIVAN
  g.buildings.surlar = 0
  g.resources = { gold: 3000, wood: 3000, stone: 3000, knowledge: 0 }
  quiet = advanceEmpire(e, now + 1000)
  assert.equal(quiet.threats!.length, 0)
  const warned = advanceEmpire(quiet, now + 2 * HOUR - THREAT_WARNING_MS + 1000)
  assert.equal(warned.threats!.length, 1)
  const t = warned.threats![0]
  assert.equal(t.arriveAt, now + 1000 + 2 * HOUR)
  // Sursuz, askersiz şehir yağmalanır ama korunan miktar kalır.
  const hit = advanceEmpire(warned, t.arriveAt)
  const report = hit.reports![0]
  assert.equal(report.kind, 'defense')
  assert.equal(report.success, false, report.lines.join('\n'))
  const after = hit.cities[0].game
  assert.ok(report.lines.some(l => l.startsWith('Yağmalanan')), report.lines.join('\n'))
  assert.ok(after.resources.gold < advanceEmpire(warned, t.arriveAt - 1).cities[0].game.resources.gold)
  assert.ok(after.resources.gold >= safeStock(after))
  assert.equal(hit.threats!.length, 0)
  assert.ok(hit.nextThreat!['city-1'] >= t.arriveAt + 3 * HOUR)
  assert.deepEqual(parseEmpire(JSON.stringify(warned)).threats, warned.threats)
})

test('walls and soldiers repel the raid and earn a bounty', () => {
  const e = initialEmpire(now)
  const g = e.cities[0].game
  g.buildings.divan = PROTECTION_DIVAN; g.buildings.surlar = 3; place(g, 'kisla', 3)
  g.army.yeniceri = 40; g.army.okcu = 15; g.army.mizrakci = 20
  const warned = advanceEmpire(advanceEmpire(e, now), now + 2 * HOUR)
  const hit = advanceEmpire(warned, warned.threats![0].arriveAt)
  const report = hit.reports![0]
  assert.equal(report.success, true, report.lines.join('\n'))
  assert.ok(report.lines.some(l => l.includes('Ödül')))
})
