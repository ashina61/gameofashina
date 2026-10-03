import { test } from 'node:test'
import assert from 'node:assert/strict'
import { BALANCE_LIMIT, balanceOutliers, balanceTable } from './balance'

test('no combat unit is more than 30% more cost-efficient than the median of its branch and role', () => {
  assert.deepEqual(balanceOutliers().map(r => `${r.name} ×${r.vsMedian.toFixed(2)}`), [])
  assert.equal(BALANCE_LIMIT, 1.3)
})

test('no combat unit is left far behind its role (below ×0.6), so every unit is worth building', () => {
  const weak = balanceTable().filter(r => r.vsMedian < 0.6)
  assert.deepEqual(weak.map(r => `${r.name} ×${r.vsMedian.toFixed(2)}`), [])
})
