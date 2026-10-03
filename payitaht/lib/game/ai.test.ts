import { test } from 'node:test'
import assert from 'node:assert/strict'
import { advanceEmpire, initialEmpire, parseEmpire, type Empire } from './empire'
import { acceptProposal, busyAtWar, declineProposal, setPace, type Proposal } from './ai'
import { BONDS, RIVALS, declareWar, onRivalRaided, pacified, recall, rivalLevel, rivalState, world } from './rivals'

const now = 20_000_000
const HOUR = 3600_000

function live(pace: 'normal' | 'hareketli', hours: number): Empire {
  let e = setPace(advanceEmpire(initialEmpire(now), now), pace, now).empire
  for (let h = 1; h <= hours; h++) e = advanceEmpire(e, now + h * HOUR)
  return e
}
function withProposal(p: Omit<Proposal, 'time' | 'until'>): Empire {
  const e = advanceEmpire(initialEmpire(now), now)
  const g = e.cities[0].game
  g.resources = { gold: 5000, wood: 3000, knowledge: 0 }
  g.buildings.liman = 1; g.buildings.elcilik = 1; g.army.nakliye = 3
  world(e).proposals = [{ ...p, time: now, until: now + 8 * HOUR }]
  return e
}

test('on the lively pace rivals start wars, send proposals and write news', () => {
  const e = live('hareketli', 72)
  const w = e.world!
  assert.ok((w.news ?? []).length >= 5, 'dünya haberleri yazılır')
  assert.ok((w.news ?? []).some(n => n.kind === 'savas'), 'rakipler birbirine savaş açar')
  assert.ok((w.news ?? []).some(n => n.kind === 'baris' || n.kind === 'catisma'), 'savaşlar çarpışır ya da biter')
  assert.ok(Object.keys(w.power ?? {}).length > 0 || (w.wars ?? []).length > 0, 'savaş güç dengesini değiştirir')
  assert.ok((w.proposals ?? []).length > 0 || (w.news ?? []).length > 0)
  // Kayıt aynen geri okunur.
  assert.deepEqual(parseEmpire(JSON.stringify(e)), e)
})

test('the world is deterministic: the same save produces the same history', () => {
  const a = live('hareketli', 30), b = live('hareketli', 30)
  assert.deepEqual(a.world, b.world)
})

test('wars change rival strength, which shows up in their level', () => {
  const e = live('normal', 1)
  const r = RIVALS[0]
  const before = rivalLevel(e, r, now + HOUR)
  world(e).power = { [r.id]: 3 }
  assert.equal(rivalLevel(e, r, now + HOUR), before + 3)
})

test('buying from a rival costs gold now and the goods arrive by ship', () => {
  const e = withProposal({ id: 'p-r-lale-1', rivalId: 'r-lale', kind: 'satis', give: { good: 'kahve', amount: 200 }, want: { good: 'gold', amount: 700 }, text: 'x' })
  const done = acceptProposal(e, 'p-r-lale-1', now)
  assert.equal(done.error, undefined)
  assert.equal(done.empire.cities[0].game.resources.gold, 5000 - 700)
  assert.equal(done.empire.world!.proposals, undefined)
  const d = done.empire.world!.deliveries.find(x => x.id === 'd-p-r-lale-1')!
  assert.equal(d.good, 'kahve')
  const later = advanceEmpire(done.empire, d.eta + 1)
  assert.ok(later.cities[0].game.luxury.kahve >= 200)
})

test('selling goods to a rival needs a port and cargo space', () => {
  const e = withProposal({ id: 'p-r-bag-1', rivalId: 'r-bag', kind: 'alis', want: { good: 'wood', amount: 500 }, give: { good: 'gold', amount: 1400 }, text: 'x' })
  e.cities[0].game.army.nakliye = 0
  assert.match(acceptProposal(e, 'p-r-bag-1', now).error ?? '', /ticaret gemilerin/)
  e.cities[0].game.army.nakliye = 3
  const ok = acceptProposal(e, 'p-r-bag-1', now)
  assert.equal(ok.error, undefined)
  assert.equal(ok.empire.cities[0].game.resources.wood, 3000 - 500)
})

test('paying tribute buys a day of peace; refusing it angers the ruler', () => {
  const base = withProposal({ id: 'p-r-kemer-1', rivalId: 'r-kemer', kind: 'harac', want: { good: 'gold', amount: 600 }, text: 'x' })
  const paid = acceptProposal(base, 'p-r-kemer-1', now)
  assert.equal(paid.error, undefined)
  assert.ok(pacified(paid.empire, 'r-kemer'))
  const refused = declineProposal(base, 'p-r-kemer-1', now)
  assert.equal(rivalState(refused.empire, 'r-kemer').relation, -8)
  assert.equal(pacified(refused.empire, 'r-kemer'), false)
})

test('a proposed treaty is signed for free with an embassy', () => {
  const e = withProposal({ id: 'p-r-ilim-1', rivalId: 'r-ilim', kind: 'anlasma', treaty: 'ticaret', text: 'x' })
  const ok = acceptProposal(e, 'p-r-ilim-1', now)
  assert.equal(ok.error, undefined)
  assert.deepEqual(rivalState(ok.empire, 'r-ilim').treaties, ['ticaret'])
  assert.equal(ok.empire.cities[0].game.resources.gold, 5000)
})

test('rivals at war with each other do not declare war on the player', () => {
  const e = live('normal', 1)
  world(e).wars = [{ id: 'w-x', a: 'r-kemer', b: 'r-lale', since: now, until: now + 20 * HOUR, score: 0 }]
  assert.ok(busyAtWar(e, 'r-kemer'))
  assert.equal(busyAtWar(e, 'r-ilim'), false)
})

test('expired proposals disappear and the pace setting is validated', () => {
  const e = withProposal({ id: 'p-r-lale-2', rivalId: 'r-lale', kind: 'hediye', give: { good: 'wood', amount: 100 }, text: 'x' })
  const later = advanceEmpire(e, now + 9 * HOUR)
  assert.equal((later.world!.proposals ?? []).some(p => p.id === 'p-r-lale-2'), false)
  assert.ok(setPace(e, 'bogus' as never, now).error)
})

test('a save with many incoming armies stays readable (old limit was 8)', () => {
  const e = advanceEmpire(initialEmpire(now), now)
  for (const r of RIVALS.slice(0, 12)) declareWar(e, r, e.cities[0], now, 'raid')
  assert.equal(e.threats!.length, 12)
  assert.deepEqual(parseEmpire(JSON.stringify(e)), e)
})

test('a seven-day normal world tells at least three continuing stories', () => {
  let e = advanceEmpire(initialEmpire(now), now)
  const seen = new Map<string, number>()
  for (let h = 1; h <= 7 * 24; h++) {
    e = advanceEmpire(e, now + h * HOUR)
    for (const n of e.world?.news ?? []) if (n.story && n.story.step >= 2) seen.set(n.id, n.story.step)
  }
  assert.ok(seen.size >= 3, `süren hikâye haberi: ${seen.size}`)
  assert.ok((e.world?.stories ?? []).length <= 2)
  assert.deepEqual(parseEmpire(JSON.stringify(e)), e)
})

test('rivals have a friend and an enemy and never pick a friend as a war target', () => {
  for (const r of RIVALS) {
    const b = BONDS[r.id]
    assert.ok(b && b.friend !== r.id && b.enemy !== r.id && b.friend !== b.enemy, r.id)
    assert.ok(RIVALS.some(x => x.id === b.friend) && RIVALS.some(x => x.id === b.enemy), r.id)
  }
  const e = live('hareketli', 96)
  for (const n of e.world!.news ?? []) if (n.kind === 'savas' && n.rivals.length === 2) assert.notEqual(BONDS[n.rivals[0]].friend, n.rivals[1], n.text)
})

test('letters remember a raid and a helping hand', () => {
  const e = advanceEmpire(initialEmpire(now), now)
  const [r] = RIVALS
  const city = e.cities[0]
  onRivalRaided(e, r.id, city, now)
  assert.match(recall(e, r.id, 'kin', now + HOUR), /yağmaladınız/)
  assert.equal(recall(e, r.id, 'minnet', now + HOUR), '')
  // Raided rival's friend holds a grudge; its enemy is grateful.
  const friendOfR = RIVALS.find(x => BONDS[x.id].friend === r.id)!
  const enemyOfR = RIVALS.find(x => BONDS[x.id].enemy === r.id)!
  assert.match(recall(e, friendOfR.id, 'kin', now + HOUR), /Dostumuz/)
  assert.match(recall(e, enemyOfR.id, 'minnet', now + HOUR), /minnetle/)
  onRivalRaided(e, r.id, city, now + 2 * HOUR)
  assert.match(recall(e, r.id, 'kin', now + 3 * HOUR), /2 kez/)
  // Memories fade after two weeks.
  assert.equal(recall(e, r.id, 'kin', now + 15 * 24 * HOUR), '')
  assert.deepEqual(parseEmpire(JSON.stringify(e)), e)
})

test('accepting a call for help is remembered with gratitude', () => {
  const r = RIVALS[1]
  const e = withProposal({ id: 'p-help', rivalId: r.id, kind: 'yardim', text: 'Yardım', want: { good: 'gold', amount: 100 } })
  const done = acceptProposal(e, 'p-help', now).empire
  assert.match(recall(done, r.id, 'minnet', now + HOUR), /yardım eli/)
})
