import test from 'node:test'
import assert from 'node:assert/strict'
import { execute } from './engine'
import { advanceEmpire, initialEmpire } from './empire'
import { DEFAULT_NOTICE_PREFS, MAX_NOTICES, RAID_LEAD_MS, planNotices } from './notices'

const now = Date.UTC(2026, 0, 5, 9)

function busyEmpire() {
  const e = advanceEmpire(initialEmpire(now), now)
  const city = e.cities[0]
  city.game = execute(city.game, { type: 'build', id: 'divan' }, now).game
  e.missions = [{ id: 'raid-x', kind: 'raid', cityId: city.id, npcId: 'sahil-koy', units: { mizrakci: 5 }, departAt: now, arriveAt: now + 60_000, returnAt: now + 120_000, resolved: false, loot: { gold: 0, wood: 0 } }]
  e.threats = [{ id: 'th-1', cityId: city.id, npcId: 'r-kemer', level: 3, arriveAt: now + 30 * 60_000, troops: { yeniceri: 10 }, fleet: {} }]
  return e
}

test('the plan covers a finished build, a returning army, a raid warning and a full warehouse', () => {
  const list = planNotices(busyEmpire(), now)
  const kinds = new Set(list.map(n => n.kind))
  for (const k of ['insaat', 'sefer', 'baskin', 'ambar'] as const) assert.ok(kinds.has(k), k)
  assert.equal(list.find(n => n.kind === 'baskin')!.at, now + 30 * 60_000 - RAID_LEAD_MS)
  assert.match(list.find(n => n.kind === 'insaat')!.body, /Divanhane 2\. seviyeye/)
  assert.match(list.find(n => n.kind === 'sefer')!.body, /döndü/)
  for (let i = 1; i < list.length; i++) assert.ok(list[i - 1].at <= list[i].at)
  assert.ok(list.length <= MAX_NOTICES)
})

test('each kind can be switched off on its own and ids stay stable', () => {
  const e = busyEmpire()
  const a = planNotices(e, now), b = planNotices(e, now)
  assert.deepEqual(a.map(n => n.id), b.map(n => n.id))
  for (const n of a) assert.ok(Number.isInteger(n.id) && n.id > 0 && n.id < 2 ** 31)
  const off = planNotices(e, now, { ...DEFAULT_NOTICE_PREFS, baskin: false, ambar: false })
  assert.ok(!off.some(n => n.kind === 'baskin' || n.kind === 'ambar'))
  assert.ok(off.some(n => n.kind === 'insaat'))
})

test('a raid that is already closer than ten minutes is not scheduled (the game warns in-app)', () => {
  const e = busyEmpire()
  e.threats![0].arriveAt = now + 5 * 60_000
  assert.ok(!planNotices(e, now).some(n => n.kind === 'baskin'))
})
