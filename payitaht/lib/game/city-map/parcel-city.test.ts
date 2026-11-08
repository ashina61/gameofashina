import test from 'node:test'
import assert from 'node:assert/strict'
import sharp from 'sharp'
import { BUILDING_IDS } from '../engine'
import { LIVE_SLOTS } from './live-adapter'
import terrainTiles from './terrain-tiles.json'
import { PARCEL_PLOTS, PARCEL_WORLD, COAST_CONTACTS, coastContactTarget, parcelProject, parcelInverse, parcelContainsPoint, parcelArtFrame, cityBuildingArtFrame, buildingRoadClear, barracksRoadClear, cityArtOutline, cityBuildingImage } from './parcel-city'

test('main parcel projection preserves all saved IDs, zones and fixed hall',()=>{
  assert.equal(PARCEL_PLOTS.length,LIVE_SLOTS.length)
  assert.equal(new Set(PARCEL_PLOTS.map(p=>`${p.center.x},${p.center.y}`)).size,LIVE_SLOTS.length)
  for(const p of PARCEL_PLOTS){
    assert.equal(p.slot,LIVE_SLOTS[p.index]);assert.equal(p.slot.fixed,p.index===0)
    assert.ok(p.polygon.every(q=>q.x>=0&&q.y>=0&&q.x<=PARCEL_WORLD.w&&q.y<=PARCEL_WORLD.h))
    const c=parcelInverse(p.center);assert.deepEqual(parcelProject(c.u,c.v),p.center)
    assert.equal(p.width,p.index===0?448:p.index<25?320:256);assert.equal(p.height,p.index>=25&&p.index<=27?400:p.width/2)
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
      const f=cityBuildingArtFrame(id,p,width,height,outline,flip)
      assert.ok(Math.abs(f.width/f.height-width/height)<1e-8)
      assert.ok(f.width>0&&f.height>0)
      assert.ok(f.polygon.every(q=>parcelContainsPoint(p,q,2)),`${id}/${p.index}/${flip}`)
      if((p.index>0&&p.index<25)||id==='divan')assert.ok(buildingRoadClear(f.polygon),`${id}/${p.index}/${flip}: road covered`)
    }
  }
})

test('two-storey barracks keeps its open yard and the entire silhouette inside the clearing',async()=>{
  for(const size of ['full','sm'] as const){
    const {data,info}=await sharp('public'+cityBuildingImage('kisla',1,undefined,size)).ensureAlpha().raw().toBuffer({resolveWithObject:true})
    for(const [x,y] of [[.48,.55],[.40,.54],[.58,.60],[.70,.69],[.43,.53]])assert.ok(data[(Math.round(y*info.height)*info.width+Math.round(x*info.width))*4+3]<8,'courtyard must reveal shared terrain')
    for(const p of PARCEL_PLOTS.slice(0,25))for(const flip of [false,true]){
      const f=cityBuildingArtFrame('kisla',p,info.width,info.height,cityArtOutline('kisla',1,size)!,flip)
      if(p.index>0)assert.ok(barracksRoadClear(f.polygon))
      for(let y=0;y<info.height;y++){
        let left=-1,right=-1
        for(let x=0;x<info.width;x++)if(data[(y*info.width+x)*4+3]>=8){if(left<0)left=x;right=x}
        for(const x of left>=0?[left,right]:[])assert.ok(parcelContainsPoint(p,{x:f.left+(flip?1-x/info.width:x/info.width)*f.width,y:f.top+y/info.height*f.height}))
      }
    }
  }
})

test('embassy keeps a readable footprint on the formerly crossed third clearing',async()=>{
  for(const size of ['full','sm'] as const){
    const m=await sharp('public'+cityBuildingImage('elcilik',1,undefined,size)).metadata()
    for(const flip of [false,true]){
      const p=PARCEL_PLOTS[3],f=cityBuildingArtFrame('elcilik',p,m.width!,m.height!,cityArtOutline('elcilik',1,size)!,flip)
      const xs=f.polygon.map(q=>q.x)
      assert.ok((Math.max(...xs)-Math.min(...xs))/p.width>.59,'phantom road made a miniature embassy')
    }
  }
})

test('every new groundless building has real alpha and fits matching parcels in both sizes and coast orientations',async()=>{
  const { PARCEL_REPAINTED_BUILDINGS }=await import('./parcel-city')
  assert.equal(new Set(PARCEL_REPAINTED_BUILDINGS).size,BUILDING_IDS.filter(id=>!['divan','kisla','surlar'].includes(id)).length)
  const seen=new Set<string>()
  for(const id of [...PARCEL_REPAINTED_BUILDINGS,'korsan_kalesi-iskele'])for(const facing of id==='liman'||id==='tersane'?[undefined,'straight'] as const:[undefined])for(const size of ['full','sm'] as const){
    const file=cityBuildingImage(id,1,facing,size)
    assert.match(file,/\/parcel-v[2567]\//)
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
    const plots=id==='korsan_kalesi-iskele'||id==='liman'||id==='tersane'
      ?PARCEL_PLOTS.slice(25,28)
      :id==='korsan_kalesi'?PARCEL_PLOTS.slice(28):PARCEL_PLOTS.slice(1,25)
    for(const p of plots)for(const flip of [false,true]){
      const f=cityBuildingArtFrame(name,p,info.width,info.height,outline,flip)
      assert.ok(edge.every(q=>parcelContainsPoint(p,{x:f.left+(flip?1-q.x:q.x)*f.width,y:f.top+q.y*f.height})),`${id}/${facing}/${size}/${p.index}/${flip}: alpha outside parcel`)
    }
  }
})

test('the actual floor of a tall building is centred on the clearing',async()=>{
  const plot=PARCEL_PLOTS[3]
  for(const id of ['konut','hamam','kisla','elcilik']){
    const m=await sharp('public'+cityBuildingImage(id,1,undefined,'sm')).metadata()
    const f=cityBuildingArtFrame(id,plot,m.width!,m.height!,cityArtOutline(id,1,'sm')!)
    const groundY=f.groundPolygon.map(q=>q.y),visibleY=f.polygon.map(q=>q.y)
    const groundCentre=(Math.min(...groundY)+Math.max(...groundY))/2
    const visibleCentre=(Math.min(...visibleY)+Math.max(...visibleY))/2
    assert.ok(Math.abs(groundCentre-plot.center.y)<=24,`${id}: floor misses clearing`)
    assert.ok(groundCentre>visibleCentre+8,`${id}: used the roof as a ground anchor`)
    assert.ok(f.groundPolygon.every(q=>parcelContainsPoint(plot,q,2)))
  }
})

test('each dock has its construction centre in the painted sea',async()=>{
  for(const p of PARCEL_PLOTS.slice(25,28)){
    const tile=terrainTiles.find(t=>p.center.x>=t.left&&p.center.x<t.left+t.width
      &&p.center.y>=t.top&&p.center.y<t.top+t.height)!
    const left=Math.round((p.center.x-tile.left)*tile.nativeWidth/tile.width)
    const top=Math.round((p.center.y-tile.top)*tile.nativeHeight/tile.height)
    const {data}=await sharp('public'+tile.file).extract({left,top,width:1,height:1})
      .removeAlpha().raw().toBuffer({resolveWithObject:true})
    assert.ok(data[2]>data[0]+35&&data[2]>data[1]+10,`slot ${p.index} centre is on dry land`)
  }
})

test('waterfront buildings attach at their masonry contact, not the roof or rear gangway',async()=>{
  // Validate the destination independently against the shipped terrain pixels.
  for(const p of PARCEL_PLOTS.slice(25,28))for(const offset of [0,85]){
    const pin=coastContactTarget(p),q={x:pin.x,y:pin.y+offset}
    const tile=terrainTiles.find(t=>q.x>=t.left&&q.x<t.left+t.width&&q.y>=t.top&&q.y<t.top+t.height)!
    const {data}=await sharp('public'+tile.file).extract({
      left:Math.round((q.x-tile.left)*tile.nativeWidth/tile.width),
      top:Math.round((q.y-tile.top)*tile.nativeHeight/tile.height),width:1,height:1,
    }).removeAlpha().raw().toBuffer({resolveWithObject:true})
    assert.ok(offset===0?data[0]>data[2]+30:data[2]>data[0]+35,`slot ${p.index}: ${offset===0?'contact is not on land':'seaward axis misses water'}`)
  }
  for(const [name,pin] of Object.entries(COAST_CONTACTS))for(const size of ['full','sm'] as const){
    const straight=name.endsWith('-duz'),id=straight?name.slice(0,-4):name
    const m=await sharp('public'+cityBuildingImage(id,1,straight?'straight':undefined,size)).metadata()
    for(const p of PARCEL_PLOTS.slice(25,28))for(const flip of [false,true]){
      const f=cityBuildingArtFrame(name,p,m.width!,m.height!,cityArtOutline(name,1,size)!,flip)
      const foot={x:f.left+(flip?1-pin.x:pin.x)*f.width,y:f.top+pin.y*f.height}
      const target=coastContactTarget(p)
      assert.ok(Math.hypot(foot.x-target.x,foot.y-target.y)<.01,`${name}/${p.index}: detached from shore`)
      assert.ok(Math.min(...f.polygon.map(q=>q.y))<target.y-25,`${name}: roof lies over water`)
      assert.ok(Math.max(...f.polygon.map(q=>q.y))>target.y+25,`${name}: pier does not reach water`)
      assert.ok(f.polygon.every(q=>parcelContainsPoint(p,q,2)),`${name}: coast silhouette escapes its boundary`)
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

test('walker and road-clearance paths never cross an empty land clearing',async()=>{
  const {CITY_ROADS}=await import('./parcel-city')
  for(const line of CITY_ROADS)for(let i=1;i<line.length;i++){
    const a=line[i-1],b=line[i],steps=Math.ceil(Math.hypot(b.x-a.x,b.y-a.y)/4)
    for(let j=0;j<=steps;j++){
      const q={x:a.x+(b.x-a.x)*j/steps,y:a.y+(b.y-a.y)*j/steps}
      for(const p of PARCEL_PLOTS.slice(1,25))assert.ok(!parcelContainsPoint(p,q),`false road through parcel ${p.index}`)
    }
  }
})

test('empty clearing hit boundary includes its shoulders and excludes rectangular corners',()=>{
  const p=PARCEL_PLOTS[1]
  assert.ok(parcelContainsPoint(p,{x:p.center.x+130,y:p.center.y+20}))
  assert.ok(parcelContainsPoint(p,{x:1900,y:510}),'north-east site misses the painted sand')
  assert.ok(!parcelContainsPoint(p,{x:1910,y:638}),'north-east site spills onto grass below the clearing')
  assert.ok(!parcelContainsPoint(p,{x:p.center.x+145,y:p.center.y+70}))
  const outline=cityArtOutline('medrese',1,'sm')!
  const f=parcelArtFrame(p,480,300,outline)
  const xs=f.polygon.map(q=>q.x),ys=f.polygon.map(q=>q.y)
  assert.ok(Math.abs((Math.min(...xs)+Math.max(...xs))/2-p.center.x)<1e-8)
  assert.ok(Math.abs((Math.min(...ys)+Math.max(...ys))/2-p.center.y)<1e-8)
})
