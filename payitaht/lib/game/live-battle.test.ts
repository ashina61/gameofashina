import { test } from 'node:test'
import assert from 'node:assert/strict'
import { freePlots, garrisonLimit, garrisonUsed, recruitReason } from './engine'
import { advanceEmpire, initialEmpire, parseEmpire } from './empire'
import { BATTLE_WINDOW_MS, MAX_ROUNDS, ROUND_MS, replayBattle } from './battle'
import { PROTECTION_DIVAN, dispatchRaid, dispatchSpies, retreatMission } from './expeditions'

const now = 10_000_000
const kale = 'sahil-kale'
function army() {
  const e = initialEmpire(now)
  const g = e.cities[0].game
  g.buildings.kisla = 3
  g.placement.kisla = freePlots(g, 'sehir')[0]
  g.buildings.divan = 4
  g.buildings.elcilik = 1
  g.placement.elcilik = freePlots(g, 'sehir')[0]
  g.army.casus = 1
  g.army.yeniceri = 50; g.army.mizrakci = 40; g.army.okcu = 25
  return e
}

test('a siege is fought one round per minute and reported only when it ends', () => {
  const sent = dispatchRaid(army(), kale, { yeniceri: 50, mizrakci: 40, okcu: 25 }, now)
  assert.equal(sent.error, undefined)
  const at = sent.empire.missions![0].arriveAt
  const first = advanceEmpire(sent.empire, at)
  const m = first.missions![0]
  assert.equal(m.battle?.state.round, 1, 'ilk tur varışta')
  assert.equal(first.reports!.length, 0, 'savaş sürerken rapor yok')
  const second = advanceEmpire(first, at + ROUND_MS)
  assert.equal(second.missions![0].battle?.state.round, 2)
  // Canlı savaş kayda yazılır ve aynen geri okunur.
  assert.deepEqual(parseEmpire(JSON.stringify(second)).missions, second.missions)
  const done = advanceEmpire(second, at + BATTLE_WINDOW_MS)
  const report = done.reports![0]
  assert.equal(report.kind, 'raid')
  const b = report.battles!.at(-1)!
  // Rapor, girdilerinden aynı savaşı yeniden kurar.
  const replay = replayBattle(b.a, b.d, b.joins, b.retreat)
  assert.equal(report.lines.filter(l => l.startsWith('Tur ')).length, replay.rounds.length)
  assert.ok(replay.rounds.length >= 2 && replay.rounds.length <= MAX_ROUNDS)
  // Dönüş savaşın bittiği andan başlar.
  assert.ok(done.missions!.every(x => x.returnAt > at + ROUND_MS))
})

test('a second army from the same city joins a running battle as reinforcement', () => {
  const sent = dispatchRaid(army(), kale, { yeniceri: 30, mizrakci: 30 }, now)
  const at = sent.empire.missions![0].arriveAt
  const fighting = advanceEmpire(sent.empire, at)
  assert.ok(fighting.missions![0].battle)
  const help = dispatchRaid(fighting, kale, { yeniceri: 20, okcu: 25 }, at + 1)
  assert.equal(help.error, undefined, 'savaş süren hedefe takviye gönderilir')
  // Takviye (yakındaki bir ordu gibi) ikinci turdan önce varsın.
  const second = help.empire.missions!.find(x => !x.battle)!
  second.returnAt = second.returnAt - second.arriveAt + at + ROUND_MS / 2
  second.arriveAt = at + ROUND_MS / 2
  const joined = advanceEmpire(help.empire, at + ROUND_MS / 2)
  assert.equal(joined.missions!.filter(x => x.kind === 'raid').length, 1, 'takviye ana orduya katıldı')
  const host = joined.missions![0]
  assert.ok(host.battle!.info.joins?.some(j => j.side === 'a' && j.round === 2 && j.troops.okcu === 25))
  assert.equal(host.units.okcu, 25)
  assert.equal(host.battle!.state.a.troops.okcu, 25)
})

test('an army can retreat between rounds and comes home without loot', () => {
  const sent = dispatchRaid(army(), kale, { yeniceri: 50, mizrakci: 40, okcu: 25 }, now)
  const at = sent.empire.missions![0].arriveAt
  const fighting = advanceEmpire(sent.empire, at + ROUND_MS)
  assert.ok(fighting.missions![0].battle, 'savaş sürüyor')
  const r = retreatMission(fighting, fighting.missions![0].id, at + ROUND_MS + 5000)
  assert.equal(r.error, undefined)
  const m = r.empire.missions![0]
  assert.equal(m.battle, undefined)
  assert.equal(m.loot.gold, 0)
  const report = r.empire.reports![0]
  assert.equal(report.success, false)
  assert.equal(report.battles!.at(-1)!.retreat, 2)
  assert.ok(report.lines.some(l => l.includes('geri çekildi')))
  assert.match(retreatMission(r.empire, m.id, at + ROUND_MS + 6000).error!, /savaş yok/)
})

test('soldiers who finish training during a siege join the defence', () => {
  const e = initialEmpire(now)
  const g = e.cities[0].game
  g.buildings.divan = PROTECTION_DIVAN; g.buildings.surlar = 2
  g.buildings.kisla = 3
  g.placement.kisla = freePlots(g, 'sehir')[0]
  g.army.mizrakci = 30; g.army.okcu = 10
  const warned = advanceEmpire(advanceEmpire(e, now), now + 2 * 3600_000)
  const t = warned.threats![0]
  // Korsanlar güçlü gelsin ki savaş birkaç tur sürsün.
  t.troops = { yeniceri: 60, okcu: 30, azap: 20 }
  const siege = advanceEmpire(warned, t.arriveAt)
  assert.ok(siege.threats![0].battle, 'kapıda savaş')
  assert.match(dispatchRaid(siege, 'sahil-koy', { mizrakci: 1 }, t.arriveAt + 1).error!, /surlardan ayrılamaz/)
  assert.ok(!dispatchSpies(siege, 'sahil-koy', 1, t.arriveAt + 1).error?.includes('surlardan'))
  siege.cities[0].game.army.yeniceri += 25
  const later = advanceEmpire(siege, t.arriveAt + ROUND_MS)
  const lb = later.threats![0]?.battle
  const joins = lb?.info.joins ?? later.reports![0].battles!.at(-1)!.joins
  assert.ok(joins?.some(j => j.side === 'd' && j.troops.yeniceri === 25), JSON.stringify(joins))
})

test('the garrison limit caps land troops by Divanhane and walls, ships by the shipyard', () => {
  const e = initialEmpire(now)
  const g = e.cities[0].game
  g.buildings.kisla = 1
  g.placement.kisla = freePlots(g, 'sehir')[0]
  assert.equal(garrisonLimit(g, 'kara'), 150)
  assert.equal(garrisonLimit(g, 'deniz'), 0)
  g.army.yeniceri = 148
  assert.equal(garrisonUsed(g, 'kara'), 148)
  assert.match(recruitReason(g, 'mizrakci', 3)!, /Garnizon sınırı dolu \(148\/150\)/)
  g.buildings.surlar = 1
  assert.equal(garrisonLimit(g, 'kara'), 200)
  assert.doesNotMatch(recruitReason(g, 'mizrakci', 3) ?? '', /Garnizon/)
  g.buildings.tersane = 2
  assert.equal(garrisonLimit(g, 'deniz'), 160)
})
