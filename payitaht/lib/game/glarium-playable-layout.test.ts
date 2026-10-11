import test from 'node:test'
import assert from 'node:assert/strict'
import { LIVE_SLOTS } from './city-map/live-adapter'
import { PAINTED_PLOTS, PAINTED_CITY_SIZE, PAINTED_CLEARINGS, PAINTED_CLEARING_CAPACITY, groundArea, paintedPlot, type GroundPoint } from './glarium-playable-layout'

test('painting preserves every saved plot identity exactly once', () => {
  assert.deepEqual(PAINTED_PLOTS.map(p => p.index), LIVE_SLOTS.map(p => p.index))
  assert.equal(new Set(PAINTED_PLOTS.map(p => `${p.x},${p.y}`)).size, 29)
  assert.equal(paintedPlot(null), undefined)
  assert.equal(paintedPlot(29), undefined)
})
function separated(a: GroundPoint[], b: GroundPoint[]) {
  return [a, b].some(polygon => polygon.some((p, i) => {
    const q = polygon[(i + 1) % polygon.length]
    const project = (point: GroundPoint) => point.x * (q.y - p.y) - point.y * (q.x - p.x)
    const aa = a.map(project), bb = b.map(project)
    return Math.max(...aa) <= Math.min(...bb) + .0001 || Math.max(...bb) <= Math.min(...aa) + .0001
  }))
}
test('traced ground polygons fit the painting with no overlapping interiors', () => {
  for (const p of PAINTED_PLOTS) {
    assert.ok(p.outline.every(v => v.x >= 0 && v.x <= PAINTED_CITY_SIZE.width && v.y >= 0 && v.y <= PAINTED_CITY_SIZE.height))
    assert.ok(groundArea(p.outline) > 400)
    for (const q of PAINTED_PLOTS.filter(q => q.index > p.index)) {
      assert.ok(separated(p.outline, q.outline), `${p.index} overlaps ${q.index}`)
    }
  }
})
test('each clearing is fully assigned, with no invented middle gap or forced pair in a small clearing', () => {
  PAINTED_CLEARINGS.forEach((corners, i) => {
    const index = 1 + PAINTED_CLEARING_CAPACITY.slice(0, i).reduce<number>((sum, n) => sum + n, 0)
    const left = paintedPlot(index)!, right = PAINTED_CLEARING_CAPACITY[i] === 2 ? paintedPlot(index + 1)! : null
    if (right) {
      assert.deepEqual(left.outline[1], right.outline[0])
      assert.deepEqual(left.outline[2], right.outline[3])
    }
    assert.equal(groundArea(left.outline) + (right ? groundArea(right.outline) : 0), groundArea(corners.map(([x, y]) => ({ x, y }))))
  })
})
