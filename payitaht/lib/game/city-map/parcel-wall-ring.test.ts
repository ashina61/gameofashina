import assert from 'node:assert/strict'
import test from 'node:test'
import { CITY_ROADS, PARCEL_PLOTS, PARCEL_WORLD } from './parcel-city'
import { CITY_WALL_PLAN, wallDistanceToSegment } from './parcel-wall-ring'

const d = (a: {x:number;y:number}, b: {x:number;y:number}) => Math.hypot(a.x-b.x,a.y-b.y)

test('stone rampart encloses 25 city plots and three coast sites without hitting any parcel', () => {
  const { ring, spans, towers } = CITY_WALL_PLAN
  assert.ok(ring.length >= 8 && spans.length > ring.length)
  for (const point of ring) {
    assert.ok(point.x >= 0 && point.x <= PARCEL_WORLD.w && point.y >= 0 && point.y <= PARCEL_WORLD.h)
  }
  const city = PARCEL_PLOTS.slice(0, 28)
  for (const plot of city) for (const vertex of plot.polygon) {
    assert.ok(ring.every((a, i) => {
      const b = ring[(i + 1) % ring.length]
      return (b.x-a.x)*(vertex.y-a.y)-(b.y-a.y)*(vertex.x-a.x) > 0
    }), `plot ${plot.index} outside wall`)
    const clearance = Math.min(...ring.map((a, i) => wallDistanceToSegment(vertex, a, ring[(i+1)%ring.length]).distance))
    assert.ok(clearance >= 48, `plot ${plot.index} only ${clearance.toFixed(1)} px from wall`)
  }
  // Front-facing turrets are taller than the wall; harbour plots need
  // additional screen-space clearance to keep their roofs visible.
  for (const plot of PARCEL_PLOTS.slice(25, 28)) for (const vertex of plot.polygon) {
    const clearance = Math.min(...ring.map((a, i) => wallDistanceToSegment(vertex, a, ring[(i+1)%ring.length]).distance))
    assert.ok(clearance >= 115, `harbour plot ${plot.index} too close to high wall tower`)
  }
  assert.ok(towers.length > 10, 'long wall fronts need interval towers')
  for (const span of spans) {
    assert.ok(d(span.start, span.end) >= 1, 'wall is never a zero-length sprite')
    for (const plot of city) for (const vertex of plot.polygon) {
      assert.ok(wallDistanceToSegment(vertex, span.start, span.end).distance >= 48)
    }
  }
})

test('road gates are real gaps rather than painted doors blocking a wall segment', () => {
  const { ring, spans, gates, perimeter } = CITY_WALL_PLAN
  assert.equal(gates.length, 5)
  assert.equal(new Set(gates.map(g => g.name)).size, gates.length)
  for (const gate of gates) {
    assert.ok(d(gate.left, gate.right) >= 100, `${gate.name} gate too narrow`)
    assert.ok(d(gate.center, gate.left) > 35 && d(gate.center, gate.right) > 35)
    // No solid wall span can cover the centre of an open gateway.
    assert.ok(spans.every(s => wallDistanceToSegment(gate.center, s.start, s.end).distance > 35), `${gate.name} is blocked`)
  }
  const north = gates.find(g => g.name === 'kuzey')!
  assert.ok(d(north.center, CITY_ROADS[0][1]) < 45, 'northern entrance misses the painted road')
  const drawn = spans.reduce((total, span) => total + d(span.start, span.end), 0)
  assert.ok(Math.abs(perimeter - drawn - 108 * gates.length) < 1, 'wall has missing spans outside the five gateways')
  assert.ok(ring.length > 0)
  for (const gate of gates.filter(g => g.name.startsWith('liman'))) {
    const plot = gate.name === 'liman-bati' ? PARCEL_PLOTS[25] : PARCEL_PLOTS[26]
    assert.ok(d(gate.center, plot.center) < 165, `sea gate ${gate.name} misses its harbour`)
  }
})
