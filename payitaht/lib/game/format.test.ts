import { test } from 'node:test'
import assert from 'node:assert/strict'
import { formatRate, formatShort, groupLog } from './engine'

test('formatRate rounds rates for display in Turkish', () => {
  assert.equal(formatRate(825.6628319999999), '826')
  assert.equal(formatRate(1629.108, true), '+1.629')
  assert.equal(formatRate(112.83592320000004), '113')
  assert.equal(formatRate(12.345, true), '+12,3')
  assert.equal(formatRate(-3.04), '-3')
  assert.equal(formatRate(0, true), '0')
  assert.equal(formatRate(-0.01), '0')
})

test('formatShort never exceeds five characters and never rounds up', () => {
  const cases: [number, string][] = [[0, '0'], [9876.9, '9.876'], [10000, '10B'], [33218.7, '33,2B'], [99999, '99,9B'],
    [123456, '123B'], [999999, '999B'], [1234567, '1,2M'], [25_000_000, '25M'], [-23456, '-23,4B'], [-0.3, '0']]
  for (const [n, s] of cases) assert.equal(formatShort(n), s, String(n))
  for (const n of [0, 7, 9999, 10001, 45678, 99999, 100000, 765432, 999999, 1e6, 9.99e6, 98e6, 999e6])
    assert.ok(formatShort(n).length <= 5, `${n} → ${formatShort(n)}`)
})

test('groupLog folds consecutive repeats for display', () => {
  const g = groupLog([{ text: 'a', time: 5 }, { text: 'a', time: 4 }, { text: 'b', time: 3 }, { text: 'a', time: 2 }])
  assert.deepEqual(g.map(x => [x.text, x.count, x.time, x.first]), [['a', 2, 5, 4], ['b', 1, 3, 3], ['a', 1, 2, 2]])
})
