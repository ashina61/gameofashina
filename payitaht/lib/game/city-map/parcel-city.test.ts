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
    assert.equal(p.width,p.index===0?448:p.index<25?320:256);assert.equal(p.height,p.width/2)
    for(const q of PARCEL_PLOTS)if(q.index!==p.index){
      // Separating-axis test checks actual polygons, including diamond/oval pairs.
      const separated=[p,q].some(shape=>shape.polygon.some((a,i)=>{
        const b=shape.polygon[(i+1)%shape.polygon.length],nx=b.y-a.y,ny=a.x-b.x
        const pa=p.polygon.map(v=>v.x*nx+v.y*ny),qa=q.polygon.map(v=>v.x*nx+v.y*ny)
        return Math.max(...pa)<=Math.min(...qa)||Math.max(...qa)<=Math.min(...pa)
      }))
      assert.ok(separated,`${p.index}/${q.index} overlap`)
    }
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

// Painted road/bridge centres measured independently from the walker routes.
// A 12-world-pixel clear radius must remain outside both art and tap boundaries.
test('road and bridge approaches stay outside expanded land parcels',()=>{
  const road=[[955,351],[685,340],[736,535],[1153,425],[465,516],[1124,536],[520,649],[1383,439],[1265,708]]
  for(const [x,y] of road)for(const p of PARCEL_PLOTS.slice(1,25)){
    assert.ok(!parcelContainsPoint(p,{x:x*2,y:y*2},-12),`${p.index}: road ${x}/${y}`)
  }
})

test('empty clearing hit boundary includes its shoulders and excludes rectangular corners',()=>{
  const p=PARCEL_PLOTS[1]
  assert.ok(parcelContainsPoint(p,{x:p.center.x+130,y:p.center.y+20}))
  assert.ok(!parcelContainsPoint(p,{x:p.center.x+145,y:p.center.y+70}))
  const outline=cityArtOutline('medrese',1,'sm')!
  const f=parcelArtFrame(p,480,300,outline)
  const xs=f.polygon.map(q=>q.x),ys=f.polygon.map(q=>q.y)
  assert.ok(Math.abs((Math.min(...xs)+Math.max(...xs))/2-p.center.x)<1e-8)
  assert.ok(Math.abs((Math.min(...ys)+Math.max(...ys))/2-p.center.y)<1e-8)
})
