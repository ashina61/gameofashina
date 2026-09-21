import { strict as assert } from 'node:assert'
import { test } from 'node:test'
import { CITY_MAP, CITY_SLOTS, COAST_SLOTS, ROAD_GRAPH } from './index'
import { buildTerrainPlan, isInsideFootprint, roadCrossings } from './terrain-plan'

test('terrain prototype preserves locked map and provides corridor for each existing graph edge', () => {
  const before = JSON.stringify(CITY_MAP)
  const plan = buildTerrainPlan()
  assert.equal(JSON.stringify(CITY_MAP), before, 'terrain planning must not mutate the map')
  assert.deepEqual(plan.tileCount, { w: 100, h: 140 })
  assert.deepEqual(plan.failures, [], plan.failures.join('\n'))
  assert.equal(plan.routes.length, ROAD_GRAPH.edges.length)
  assert.deepEqual(roadCrossings(plan), [])
  assert.equal(CITY_SLOTS.length, 25)
  assert.equal(COAST_SLOTS.length, 6)
})

test('every road stops outside both slot footprints and all paths are deterministic', () => {
  const a = buildTerrainPlan(), b = buildTerrainPlan()
  assert.deepEqual(a, b)
  const byId = new Map(CITY_MAP.slots.map(s => [s.id, s]))
  for (const route of a.routes) {
    assert.ok(route.points.length >= 3)
    for (const id of [route.from, route.to]) {
      const s = byId.get(id)!
      for (const p of [route.points[0], route.points[route.points.length - 1]]) {
        const gx = p.x / CITY_MAP.tile.w + p.y / CITY_MAP.tile.h
        const gy = p.y / CITY_MAP.tile.h - p.x / CITY_MAP.tile.w
        // The route endpoint adjacent to this slot may also be outside the
        // other slot; checking both guarantees no endpoint under a building.
        assert.equal(isInsideFootprint(gx, gy, s), false, id + ': endpoint inside foundation')
      }
    }
  }
})
