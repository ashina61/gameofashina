import { test } from 'node:test'
import assert from 'node:assert/strict'
import { glariumGrowthForLevel } from './glarium-city-growth'

test('visual city growth switches at the requested hall boundaries, retaining the previous stage in between', () => {
  for (const [level, expected] of [[1, 1], [4, 1], [5, 5], [9, 5], [10, 10], [14, 10], [15, 15], [19, 15], [20, 20], [40, 20], [1000, 20]]) {
    assert.equal(glariumGrowthForLevel(level).level, expected)
  }
})

test('invalid preview levels use the settlement stage', () => {
  for (const level of [-1, 0, NaN, Infinity]) assert.equal(glariumGrowthForLevel(level).level, 1)
  assert.equal(glariumGrowthForLevel(9.9).level, 5)
})
