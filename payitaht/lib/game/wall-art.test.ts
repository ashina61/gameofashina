import { test } from 'node:test'
import assert from 'node:assert/strict'
import { wallMerlons } from './wall-art'

test('wall battlements keep global spacing across arbitrary piece and gate cuts', () => {
  for (const arc of [0, 13, 43.9, 207]) for (const length of [1, 19, 64, 173]) {
    const spans = wallMerlons(arc, length)
    for (const [lo, hi] of spans) {
      assert.ok(lo >= 0 && hi <= length && hi > lo)
      assert.ok(hi - lo <= 20 + 1e-8)
      assert.ok((arc + (lo + hi) / 2) % 44 < 20)
    }
    const split = length * 0.37
    const parts = [...wallMerlons(arc, split), ...wallMerlons(arc + split, length - split).map(([a, b]) => [a + split, b + split])]
    for (let x = 0.125; x < length; x += 0.25) {
      assert.equal(parts.some(([a, b]) => a <= x && x < b), spans.some(([a, b]) => a <= x && x < b))
    }
  }
})
