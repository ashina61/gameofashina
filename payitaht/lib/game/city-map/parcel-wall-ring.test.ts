import assert from 'node:assert/strict'
import test from 'node:test'
import { CITY_ROADS, PARCEL_PLOTS, PARCEL_WORLD } from './parcel-city'
import { CITY_WALL_PLAN, wallDistanceToSegment } from './parcel-wall-ring'

const d = (a: {x:number;y:number}, b: {x:number;y:number}) => Math.hypot(a.x-b.x,a.y-b.y)

test('stone walls surround only 25 land city plots; the harbour and southern quay stay open', () => {
  const { ring, spans, towers, waterfront } = CITY_WALL_PLAN
  assert.ok(ring.length >= 8 && spans.length >= ring.length - waterfront.length)
  assert.ok(waterfront.length >= 2, 'harbour frontage must not be walled')
  assert.ok(waterfront.reduce((total,e)=>total+d(e.start,e.end),0)>1500, 'wide waterfront opening required')
  for (const point of ring)
    assert.ok(point.x >= 0 && point.x <= PARCEL_WORLD.w && point.y >= 0 && point.y <= PARCEL_WORLD.h)
  const city = PARCEL_PLOTS.slice(0,25)
  for (const plot of city) for (const vertex of plot.polygon) {
    assert.ok(ring.every((a,i)=>{
      const b=ring[(i+1)%ring.length]
      return (b.x-a.x)*(vertex.y-a.y)-(b.y-a.y)*(vertex.x-a.x)>0
    }), `plot ${plot.index} outside land rim`)
    const clearance=Math.min(...ring.map((a,i)=>wallDistanceToSegment(vertex,a,ring[(i+1)%ring.length]).distance))
    assert.ok(clearance>=48,`plot ${plot.index} only ${clearance.toFixed(1)} px from rim`)
  }
  for (const coast of PARCEL_PLOTS.slice(25,29)) {
    for(const vertex of coast.polygon) for(const span of spans)
      assert.ok(wallDistanceToSegment(vertex,span.start,span.end).distance>=48,`wall covers coast plot ${coast.index}`)
  }
  assert.ok(towers.length>9,'defense fronts need spaced towers')
  for(const span of spans){
    assert.ok(d(span.start,span.end)>=1)
    for(const plot of city) for(const vertex of plot.polygon)
      assert.ok(wallDistanceToSegment(vertex,span.start,span.end).distance>=48)
    // There can be no span exactly covering any intentionally unwalled coast edge.
    for(const e of waterfront) assert.ok(wallDistanceToSegment({x:(e.start.x+e.end.x)/2,y:(e.start.y+e.end.y)/2},span.start,span.end).distance>48)
  }
})

test('three inland road gates stay open and no false gates are built over the docks',()=>{
  const {ring,spans,gates,perimeter,waterfront}=CITY_WALL_PLAN
  assert.equal(gates.length,3)
  assert.deepEqual(gates.map(g=>g.name),['kuzey','dogu-kuzey','bati'])
  for(const gate of gates){
    assert.ok(d(gate.left,gate.right)>=100,`${gate.name} too narrow`)
    assert.ok(d(gate.center,gate.left)>35&&d(gate.center,gate.right)>35)
    assert.ok(spans.every(s=>wallDistanceToSegment(gate.center,s.start,s.end).distance>35),`${gate.name} blocked`)
  }
  const north=gates.find(g=>g.name==='kuzey')!
  assert.ok(d(north.center,CITY_ROADS[0][1])<45,'north gate misses painted road')
  const drawn=spans.reduce((sum,s)=>sum+d(s.start,s.end),0)
  assert.ok(Math.abs(perimeter-drawn-108*gates.length)<1,'wall coverage must equal hardened edges minus the gate gaps')
  assert.ok(ring.length>0)
  assert.ok(waterfront.every(e=>(e.start.y+e.end.y)/2>PARCEL_PLOTS[0].center.y))
})
