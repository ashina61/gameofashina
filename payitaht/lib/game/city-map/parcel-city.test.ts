import test from 'node:test'
import assert from 'node:assert/strict'
import sharp from 'sharp'
import { BUILDING_IDS } from '../engine'
import { LIVE_SLOTS } from './live-adapter'
import { PARCEL_PLOTS, PARCEL_WORLD, parcelProject, parcelInverse, parcelContainsPoint, parcelArtFrame, cityArtOutline, cityBuildingImage } from './parcel-city'

test('main parcel projection preserves all saved IDs, zones and fixed hall',()=>{
  assert.equal(PARCEL_PLOTS.length,LIVE_SLOTS.length)
  assert.equal(new Set(PARCEL_PLOTS.map(p=>`${p.center.x},${p.center.y}`)).size,LIVE_SLOTS.length)
  for(const p of PARCEL_PLOTS){
    assert.equal(p.slot,LIVE_SLOTS[p.index]);assert.equal(p.slot.fixed,p.index===0)
    assert.ok(p.polygon.every(q=>q.x>=0&&q.y>=0&&q.x<=PARCEL_WORLD.w&&q.y<=PARCEL_WORLD.h))
    const c=parcelInverse(p.center);assert.deepEqual(parcelProject(c.u,c.v),p.center)
    assert.equal(p.width,p.index===0?448:256);assert.equal(p.height,p.width/2)
    for(const q of PARCEL_PLOTS)if(q.index!==p.index)assert.ok(Math.abs(q.center.x-p.center.x)+2*Math.abs(q.center.y-p.center.y)>=(p.width+q.width)/2,`${p.index}/${q.index} overlap`)
  }
  assert.deepEqual(PARCEL_PLOTS[0].center,{x:1622,y:768})
  assert.ok(Math.hypot(PARCEL_PLOTS[1].center.x-PARCEL_PLOTS[0].center.x,PARCEL_PLOTS[1].center.y-PARCEL_PLOTS[0].center.y)<550)
})

test('all existing building stages and both directions fit every matching parcel without image warp',async()=>{
  for(const id of BUILDING_IDS.filter(id=>id!=='surlar'))for(const level of [1,4,8])for(const size of ['full','sm'] as const){
    const file=cityBuildingImage(id,level,undefined,size).split('?')[0]
    const {width,height}=await sharp('public'+file).metadata();assert.ok(width&&height)
    const outline=cityArtOutline(id,level,size);assert.ok(outline&&outline.length>=3,`${id}/${level}/${size}`)
    for(const p of PARCEL_PLOTS.filter(p=>p.slot.zone===(id==='liman'||id==='tersane'||id==='korsan_kalesi'?'liman':'sehir')))for(const flip of [false,true]){
      const f=parcelArtFrame(p,width,height,outline,flip)
      assert.ok(Math.abs(f.width/f.height-width/height)<1e-8)
      assert.ok(f.polygon.every(q=>parcelContainsPoint(p,q)),`${id}/${p.index}/${flip}`)
    }
  }
})

test('actual approved barracks alpha, including open yard, fits all 25 land parcels',async()=>{
  for(const size of ['full','sm'] as const){
    const {data,info}=await sharp('public'+cityBuildingImage('kisla',1,undefined,size)).ensureAlpha().raw().toBuffer({resolveWithObject:true})
    for(const [x,y] of [[.48,.55],[.47,.59],[.60,.52],[.40,.62],[.58,.60]])assert.equal(data[(Math.round(y*info.height)*info.width+Math.round(x*info.width))*4+3],0)
    for(const p of PARCEL_PLOTS.slice(0,25))for(const flip of [false,true]){
      const f=parcelArtFrame(p,info.width,info.height,cityArtOutline('kisla',1,size)!,flip)
      for(let y=0;y<info.height;y++){
        let left=-1,right=-1
        for(let x=0;x<info.width;x++)if(data[(y*info.width+x)*4+3]>=8){if(left<0)left=x;right=x}
        for(const x of left>=0?[left,right]:[])assert.ok(parcelContainsPoint(p,{x:f.left+(flip?1-x/info.width:x/info.width)*f.width,y:f.top+y/info.height*f.height}))
      }
    }
  }
})

test('every new groundless building has real alpha and fits matching parcels in both sizes and coast orientations',async()=>{
  const { PARCEL_REPAINTED_BUILDINGS }=await import('./parcel-city')
  assert.equal(new Set(PARCEL_REPAINTED_BUILDINGS).size,BUILDING_IDS.filter(id=>!['divan','kisla','surlar'].includes(id)).length)
  const seen=new Set<string>()
  for(const id of PARCEL_REPAINTED_BUILDINGS)for(const facing of id==='liman'||id==='tersane'?[undefined,'straight'] as const:[undefined])for(const size of ['full','sm'] as const){
    const file=cityBuildingImage(id,1,facing,size)
    assert.match(file,/\/parcel-v2\//)
    assert.ok(!seen.has(file),`${id}: reused another type's sprite`);seen.add(file)
    const {data,info}=await sharp('public'+file).ensureAlpha().raw().toBuffer({resolveWithObject:true})
    let transparent=0,opaque=0
    const edge:Array<{x:number;y:number}>=[]
    for(let y=0;y<info.height;y++){
      let left=-1,right=-1
      for(let x=0;x<info.width;x++){
        const a=data[(y*info.width+x)*4+3]
        if(a===0)transparent++;if(a>230)opaque++
        if(a>=8){if(left<0)left=x;right=x}
      }
      if(left>=0)edge.push({x:left/info.width,y:y/info.height},{x:right/info.width,y:y/info.height})
    }
    const total=info.width*info.height
    assert.ok(transparent/total>.25,`${id}: no real alpha/open space`)
    assert.ok(opaque/total>.10,`${id}: missing architecture`)
    for(const [x,y] of [[0,0],[info.width-1,0],[0,info.height-1],[info.width-1,info.height-1]])assert.ok(data[(y*info.width+x)*4+3]<8,`${id}: opaque backdrop`)
    const name=facing==='straight'?id+'-duz':id
    const outline=cityArtOutline(name,1,size);assert.ok(outline,`${id}: missing contour`)
    for(const p of PARCEL_PLOTS.filter(p=>p.slot.zone===(id==='liman'||id==='tersane'||id==='korsan_kalesi'?'liman':'sehir')))for(const flip of [false,true]){
      const f=parcelArtFrame(p,info.width,info.height,outline,flip)
      assert.ok(edge.every(q=>parcelContainsPoint(p,{x:f.left+(flip?1-q.x:q.x)*f.width,y:f.top+q.y*f.height})),`${id}/${facing}/${size}/${p.index}/${flip}: alpha outside parcel`)
    }
  }
})
