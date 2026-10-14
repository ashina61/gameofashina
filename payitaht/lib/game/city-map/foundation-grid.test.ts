import test from 'node:test'
import assert from 'node:assert/strict'
import sharp from 'sharp'
import { FOUNDATION, FOUNDATION_SITES, FOUNDATION_ROADS, FOUNDATION_INITIAL, foundationProject, foundationInverse, foundationRoadAt, type FoundationBuilding } from './foundation-grid'
import { foundationSpriteFrame } from './foundation-sprite'
import { parcelContains } from './master-projection'
import records from './foundation-art.json'

test('foundation uses one reversible 2:1 camera and identical plot dimensions',()=>{
  for(const [u,v,z] of [[0,0,0],[9,15,0],[30,30,0]]){
    const p=foundationProject(u,v,z),q=foundationInverse(p)
    assert.equal(q.u,u);assert.equal(q.v,v)
  }
  assert.equal(FOUNDATION.tileW/FOUNDATION.tileH,2)
  assert.equal(FOUNDATION_SITES.length,25)
  assert.equal(FOUNDATION_SITES[0].fixed,true)
  assert.equal(FOUNDATION_INITIAL.divan,0)
  assert.equal(new Set(FOUNDATION_SITES.map(p=>p.width+'x'+p.height)).size,1)
  for(const p of FOUNDATION_SITES)for(const q of p.polygon)assert.equal(foundationRoadAt(q),false)
  // In grid coordinates the entire site square has a strict road clearance.
  for(const p of FOUNDATION_SITES)for(const road of FOUNDATION_ROADS){
    const axis=road.axis==='u'?p.u:p.v
    assert.ok(Math.abs(axis-road.t)-FOUNDATION.site/2>0.65)
  }
})

test('pilot sprites retain aspect ratio and every alpha row stays inside every site',async()=>{
  const data=records as Record<FoundationBuilding,{width:number;height:number;outline:number[][]}>
  for(const id of ['divan','kisla','medrese'] as FoundationBuilding[]){
    const {data:rgba,info}=await sharp('public/images/game/foundation/v1/'+id+'.webp').ensureAlpha().raw().toBuffer({resolveWithObject:true})
    const art=data[id];assert.equal(info.width,art.width);assert.equal(info.height,art.height)
    const rows:Array<{x:number;y:number}>=[];let transparent=0
    for(let y=0;y<info.height;y++){
      let left=info.width,right=-1
      for(let x=0;x<info.width;x++){if(rgba[(y*info.width+x)*4+3]){left=Math.min(left,x);right=x}else transparent++}
      if(right>=0)for(const x of [left,right+1])for(const edgeY of [y,y+1])rows.push({x:x/info.width,y:edgeY/info.height})
    }
    assert.ok(transparent>info.width*info.height*0.15)
    for(const site of FOUNDATION_SITES){
      const f=foundationSpriteFrame(site,art.width,art.height,art.outline.map(([x,y])=>({x,y})))
      assert.ok(Math.abs(f.width/f.height-art.width/art.height)<1e-8)
      const visibleWidth=Math.max(...f.polygon.map(q=>q.x))-Math.min(...f.polygon.map(q=>q.x))
      const visibleHeight=Math.max(...f.polygon.map(q=>q.y))-Math.min(...f.polygon.map(q=>q.y))
      assert.ok(visibleWidth>site.width*0.5, id+' is unnecessarily small')
      assert.ok(visibleHeight>site.height*0.5, id+' is unnecessarily small')
      for(const q of rows)assert.ok(parcelContains(site.polygon,{x:f.left+q.x*f.width,y:f.top+q.y*f.height}),id+' crosses site '+site.index)
      assert.ok(f.polygon.every(q=>!foundationRoadAt(q)))
    }
  }
})
