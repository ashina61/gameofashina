import { test } from 'node:test'
import assert from 'node:assert/strict'
import { advanceEmpire, initialEmpire } from './empire'
import { execute } from './engine'
import { awayLength, awaySummary } from './away'

const now = 30_000_000

test('a short break gives no summary; a long one lists finished work and gains', () => {
  const start = advanceEmpire(initialEmpire(now), now)
  const c = start.cities[0]
  const res = execute(c.game, { type: 'build', id: 'divan' }, now)
  assert.equal(res.error, undefined)
  c.game = res.game
  assert.equal(awaySummary(start, advanceEmpire(start, now + 5 * 60_000)), null)
  const later = advanceEmpire(start, now + 3 * 3600_000)
  const s = awaySummary(start, later)!
  assert.ok(s)
  assert.equal(s.minutes, 180)
  assert.ok(s.built.some(b => b.startsWith('Divanhane 2')), s.built.join())
  assert.ok(s.gained.gold > 0)
  assert.equal(awayLength(s.minutes), '3 saat')
  assert.equal(awayLength(26 * 60 + 5), '1 gün 2 saat')
})
