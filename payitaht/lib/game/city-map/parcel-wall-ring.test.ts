import assert from 'node:assert/strict'
import test from 'node:test'
import { CITY_ROADS, PARCEL_PLOTS, PARCEL_WORLD, parcelContainsPoint } from './parcel-city'
import { CITY_WALL_PLAN, wallDistanceToSegment } from './parcel-wall-ring'

const distance=(a:{x:number;y:number},b:{x:number;y:number})=>Math.hypot(a.x-b.x,a.y-b.y)

test('surveyed wall and its thickness clear all land plots and the waterfront',()=>{
  const {spans,towers,waterfront}=CITY_WALL_PLAN
  assert.ok(distance(waterfront.start,waterfront.end)>1500)
  for(const [i,s] of spans.entries()){
    const length=distance(s.start,s.end)
    const count=Math.ceil(length/8)
    for(let j=0;j<=count;j++){
      const t=j/count
      for(const [a,b] of [[s.start,s.end],[s.backStart,s.backEnd]]){
        const q={x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t}
        assert.ok(q.x>=0&&q.x<=PARCEL_WORLD.w&&q.y>=0&&q.y<=1500)
        for(const plot of PARCEL_PLOTS)assert.ok(!parcelContainsPoint(plot,q,-24),`wall section ${i} covers plot ${plot.index}`)
      }
    }
    const next=spans[i+1]
    if(next&&distance(s.end,next.start)<.01)assert.deepEqual(s.backEnd,next.backStart)
  }
  for(const point of towers)for(const plot of PARCEL_PLOTS)assert.ok(!parcelContainsPoint(plot,point,-25))
})

test('curtain walls leave the painted roads and northern stream open',()=>{
  const {spans,gates}=CITY_WALL_PLAN
  for(const line of CITY_ROADS)for(let i=1;i<line.length;i++){
    const a=line[i-1],b=line[i],steps=Math.ceil(distance(a,b)/8)
    for(let j=0;j<=steps;j++){
      const q={x:a.x+(b.x-a.x)*j/steps,y:a.y+(b.y-a.y)*j/steps}
      assert.ok(spans.every(s=>wallDistanceToSegment(q,s.start,s.end).distance>=28),'wall crosses a road')
    }
  }
  for(const gate of gates){
    assert.ok(distance(gate.left,gate.right)>=100,`narrow opening at ${gate.name}`)
    assert.ok(spans.every(s=>wallDistanceToSegment(gate.center,s.start,s.end).distance>=38))
  }
  assert.ok(distance(gates[0].center,CITY_ROADS[0][1])<45,'north arch misses the road')
  assert.ok(spans.every(s=>wallDistanceToSegment({x:2288,y:278},s.start,s.end).distance>=24),'wall spans the stream')
})
