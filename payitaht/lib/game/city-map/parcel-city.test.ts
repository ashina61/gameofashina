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
    if(p.slot.zone==='sehir'){
      const c=parcelInverse(p.center);assert.deepEqual(parcelProject(c.u,c.v),p.center)
      for(const q of p.polygon){const {u,v}=parcelInverse(q);for(const road of [0,6,12,18,24,30])assert.ok(Math.abs(u-road)>.65&&Math.abs(v-road)>.65)}
    }
  }
  assert.equal(PARCEL_PLOTS[0].row,2);assert.equal(PARCEL_PLOTS[0].col,2)
  assert.ok(Math.hypot(PARCEL_PLOTS[1].center.x-PARCEL_PLOTS[0].center.x,PARCEL_PLOTS[1].center.y-PARCEL_PLOTS[0].center.y)<450)
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
