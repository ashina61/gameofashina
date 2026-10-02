import { test } from 'node:test'
import assert from 'node:assert/strict'
import { advanceEmpire, initialEmpire, parseEmpire } from './empire'
import { MILESTONES, claimMilestone, milestoneDone } from './milestones'

const now = 40_000_000

test('milestones unlock from game state, pay once and survive the save', () => {
  const e = advanceEmpire(initialEmpire(now), now)
  const divan10 = MILESTONES.find(m => m.id === 'divan10')!
  assert.equal(milestoneDone(e, divan10), false)
  assert.match(claimMilestone(e, 'divan10', now) ?? '', /tamamlanmadı/)
  e.cities[0].game.buildings.divan = 10
  const gold = e.cities[0].game.resources.gold
  assert.equal(claimMilestone(e, 'divan10', now), undefined)
  assert.ok(e.cities[0].game.resources.gold > gold)
  assert.match(claimMilestone(e, 'divan10', now) ?? '', /zaten/)
  const back = parseEmpire(JSON.stringify(e))
  assert.deepEqual(back.milestones, ['divan10'])
  assert.throws(() => parseEmpire(JSON.stringify({ ...e, milestones: ['divan10', 'divan10'] })))
  assert.throws(() => parseEmpire(JSON.stringify({ ...e, milestones: ['uydurma'] })))
})
