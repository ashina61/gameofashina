import test from 'node:test'
import assert from 'node:assert/strict'
import { LIVE_SLOTS } from './city-map/live-adapter'
import { PAINTED_PLOTS, PAINTED_CITY_SIZE, paintedPlot } from './glarium-playable-layout'

test('painting preserves every saved plot identity exactly once', () => {
  assert.deepEqual(PAINTED_PLOTS.map(p => p.index), LIVE_SLOTS.map(p => p.index))
  assert.equal(new Set(PAINTED_PLOTS.map(p => `${p.x},${p.y}`)).size, 29)
  assert.equal(paintedPlot(null), undefined)
  assert.equal(paintedPlot(29), undefined)
})
test('land, coast and pirate hit areas fit the painting without overlapping', () => {
  for (const p of PAINTED_PLOTS) {
    assert.ok(p.x - p.width / 2 >= 0 && p.x + p.width / 2 <= PAINTED_CITY_SIZE.width)
    assert.ok(p.y - p.height / 2 >= 0 && p.y + p.height / 2 <= PAINTED_CITY_SIZE.height)
    for (const q of PAINTED_PLOTS.filter(q => q.index > p.index)) {
      assert.ok(Math.abs(p.x - q.x) >= (p.width + q.width) / 2 || Math.abs(p.y - q.y) >= (p.height + q.height) / 2, `${p.index} overlaps ${q.index}`)
    }
  }
})
