import { test } from 'node:test'
import assert from 'node:assert/strict'
import { advanceEmpire, initialEmpire, parseEmpire } from './empire'
import { achievements, profileOf, profileRanks, rulerTitle, setProfile } from './profile'
import { rankings } from './rivals'
import { CHANGELOG, VERSION } from './changelog'

const now = 10_000_000

test('the ruler can name themselves, pick a crest and a motto; bad input is refused', () => {
  const e = advanceEmpire(initialEmpire(now), now)
  assert.equal(profileOf(e).ruler, 'Ertuğrul')
  assert.match(setProfile(e, { ruler: 'X' }, now).error!, /2-24/)
  assert.match(setProfile(e, { crest: 'ejder' as never }, now).error!, /arma/)
  assert.match(setProfile(e, { color: '#000000' }, now).error!, /renk/)
  const ok = setProfile(e, { ruler: '  Kanuni   Süleyman ', crest: 'lale', motto: 'Adalet mülkün temelidir' }, now)
  assert.equal(ok.error, undefined)
  assert.equal(profileOf(ok.empire).ruler, 'Kanuni Süleyman')
  assert.deepEqual(parseEmpire(JSON.stringify(ok.empire)).profile, ok.empire.profile)
  // Sıralamada adınla görünürsün.
  assert.ok(rankings(ok.empire, now).some(s => s.you && s.ruler === 'Kanuni Süleyman'))
})

test('titles rise with score and ranks cover the whole table', () => {
  assert.equal(rulerTitle(0).name, 'Bey')
  assert.equal(rulerTitle(20_000).name, 'Beylerbeyi')
  assert.equal(rulerTitle(1e9).name, 'Sultan')
  assert.equal(rulerTitle(1e9).next, undefined)
  const e = advanceEmpire(initialEmpire(now), now)
  const r = profileRanks(e, now)
  assert.ok(r.total >= 1 && r.total <= r.of)
})

test('achievements are computed from the save', () => {
  const e = advanceEmpire(initialEmpire(now), now)
  const list = achievements(e)
  assert.ok(list.length >= 12)
  assert.equal(new Set(list.map(a => a.id)).size, list.length)
  e.cities[0].game.buildings.divan = 5
  assert.ok(achievements(e).find(a => a.id === 'kurucu')!.value >= 5)
})

test('the changelog runs from 0.1.0 to the current version, newest first', () => {
  assert.equal(VERSION, CHANGELOG[0].version)
  assert.equal(CHANGELOG.at(-1)!.version, '0.1.0')
  const n = (v: string) => v.split('.').map(Number).reduce((a, b) => a * 1000 + b, 0)
  for (let i = 1; i < CHANGELOG.length; i++) assert.ok(n(CHANGELOG[i - 1].version) > n(CHANGELOG[i].version))
})
