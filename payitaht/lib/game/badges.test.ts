import { test } from 'node:test'
import assert from 'node:assert/strict'
import { badgeBudget } from './badges'

test('badgeBudget shows at most two numbered badges by priority, rest as dots', () => {
  const b = badgeBudget({ city: 12, research: 1, diplo: 5, army: 3, alliance: 2 })
  assert.equal(b.army, 'count')
  assert.equal(b.diplo, 'count')
  assert.equal(b.alliance, 'dot')
  assert.equal(b.city, 'dot')
  assert.equal(b.research, 'dot')
  assert.equal(b.objectives, null)
  assert.equal(Object.values(b).filter(m => m === 'count').length, 2)
})

test('badgeBudget leaves quiet keys empty', () => {
  const b = badgeBudget({ research: 1 })
  assert.equal(b.research, 'count')
  assert.equal(b.army, null)
})
