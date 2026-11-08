import { LIVE_SLOTS } from './live-adapter'
import { asset, buildingImage, buildingStage, type ArtSize, type CoastFacing } from '@/lib/asset'
import bounds from './parcel-art-bounds.json'
import contact from './barracks-contact.json'
import buildingContacts from './building-contacts.json'

export type ParcelPoint = {x:number;y:number}
// Source painting is 1586×992. All measurements below use the same 2× world scale.
export const PARCEL_WORLD = {x:0,y:0,w:3172,h:1984}
export const PARCEL_ORIGIN = {x:1622,y:768}
export function parcelProject(u:number,v:number):ParcelPoint {return {x:1622+(u-v)*64,y:768+(u+v)*32}}
export function parcelInverse(p:ParcelPoint){const x=(p.x-1622)/64,y=(p.y-768)/32;return {u:(x+y)/2,v:(y-x)/2}}
const clearings=[[583,175],[811,175],[1027,175],[359,245],[1251,245],[685,287],[955,302],[242,363],[500,352],[1166,373],[1383,390],[465,464],[278,519],[653,525],[955,546],[1160,487],[1380,546],[260,631],[465,600],[575,686],[788,625],[1003,646],[1227,646],[1381,692]]
// Keep engine identity/order; put early unlocks closest to the fixed civic centre.
const ordered=clearings.toSorted((a,b)=>Math.hypot(a[0]-811,(a[1]-384)*1.5)-Math.hypot(b[0]-811,(b[1]-384)*1.5))
// Small visual corrections measured on the painted clearings, after saved slot ordering.
const clearingOffsets:Record<number,ParcelPoint>={
 1:{x:-6,y:-84},2:{x:6,y:-6},5:{x:-4,y:-6},6:{x:8,y:-4},7:{x:4,y:-10},
 10:{x:-2,y:-6},11:{x:-4,y:-2},12:{x:8,y:-2},13:{x:-6,y:0},
 17:{x:-2,y:6},20:{x:0,y:-6},21:{x:8,y:-2},23:{x:6,y:0},
}
function plot(index:number,source:number[]){
 const land=index>0&&index<25, dock=index>=25&&index<=27, offset=clearingOffsets[index]??{x:0,y:0}
 const center={x:source[0]*2+offset.x,y:source[1]*2+offset.y},width=index===0?448:land?320:256,height=dock?400:width/2
 // The painting has rounded 2:1 clearings, rather than tiny inscribed diamonds.
 // One convex boundary is used for architecture, empty flags, selection and taps.
 // The eastern end of the western beach is diagonal. Its landward edge
 // follows the shoulder of plot 17 instead of forcing a tiny square dock.
 const polygon=index===27?[
  {x:center.x-128,y:center.y-140},{x:center.x+128,y:center.y-193},
  {x:center.x+128,y:center.y+90},{x:center.x+96,y:center.y+122},
  {x:center.x-96,y:center.y+122},{x:center.x-128,y:center.y+90},
 ]:dock?[
  {x:center.x-102,y:center.y-200},{x:center.x+102,y:center.y-200},
  {x:center.x+128,y:center.y-164},{x:center.x+128,y:center.y+90},
  {x:center.x+96,y:center.y+122},{x:center.x-96,y:center.y+122},
  {x:center.x-128,y:center.y+90},{x:center.x-128,y:center.y-164},
 ]:(land||index===0)?Array.from({length:8},(_,i)=>({x:center.x+Math.sin(i*Math.PI/4)*width/2,y:center.y-Math.cos(i*Math.PI/4)*height/2})):
  [{x:center.x,y:center.y-height/2},{x:center.x+width/2,y:center.y},{x:center.x,y:center.y+height/2},{x:center.x-width/2,y:center.y}]
 return {index,slot:LIVE_SLOTS[index],center,width,height,polygon}
}
// Surveyed on the v2 painting. Slot centres lie in water, with the back
// of each buildable shape extending just far enough to meet dry ground.
const coastShoreY = [1609,1588,1523]
// Front edge of the masonry / start of the seaward pier in the source art.
// Roofs and rear gangways are above this point: aligning minY to the shore
// leaves the entire building floating offshore. Mirroring moves the pin too.
export const COAST_CONTACTS:Record<string,ParcelPoint>={
 liman:{x:.50,y:.46},'liman-duz':{x:.50,y:.57},
 tersane:{x:.50,y:.50},'tersane-duz':{x:.50,y:.52},
 'korsan_kalesi-iskele':{x:.50,y:.60},
}
export const coastContactTarget=(p:CityParcel)=>({x:p.center.x,y:coastShoreY[p.index-25]-18})
export const PARCEL_PLOTS=[[811,384],...ordered,[475,842],[1206,832],[625,804],[1425,898]].map((p,i)=>plot(i,p))
/** Measured road centre lines, including the actual bridges. Ambient walkers follow these. */
export const CITY_ROADS=[
 [[300,85],[405,151],[458,224],[570,298],[688,336],[700,370],[700,427],[810,466],[927,431],[1038,503],[1107,532],[1240,592],[1280,600],[1330,620]],
 [[405,720],[451,675],[500,650],[550,627],[587,610],[631,587],[678,585],[724,570],[770,530],[810,466],[700,427],[700,370],[740,320],[855,312],[903,345],[1037,338],[1094,316],[1116,223],[1160,175]],
 [[1200,753],[1124,667],[1084,591],[1107,532],[1038,490],[1041,450],[1062,414],[1091,410],[1193,435],[1305,440],[1411,450]],
 [[155,415],[220,425],[266,444],[311,467],[351,490],[397,510],[438,521],[477,523],[524,512],[571,501],[622,477],[659,455],[700,427]],
].map(line=>line.map(([x,y])=>({x:x*2,y:y*2})))
export type CityParcel=typeof PARCEL_PLOTS[number]
export const parcelPlot=(index:number|null|undefined)=>index==null?undefined:PARCEL_PLOTS[index]
export function parcelContainsPoint(p:CityParcel,q:ParcelPoint,margin=0){
 return p.polygon.every((a,i)=>{
  const b=p.polygon[(i+1)%p.polygon.length],dx=b.x-a.x,dy=b.y-a.y
  return dx*(q.y-a.y)-dy*(q.x-a.x)>=margin*Math.hypot(dx,dy)-1e-6
 })
}
/** Reviewed groundless architecture; no terrain patch is drawn beneath it. */
export const PARCEL_REPAINTED_BUILDINGS = ['saray','elcilik','konut','hamam','carsi','ambar','kereste','medrese','liman','tersane','kahvehane','cami','muze','marangoz','mimar','ormanci','tasci','tophane','bagci','simyahane','camci','mahzen','gozlukcu','barutane','depo','ticaret_merkezi','harita_arsivi','valilik','korsan_kalesi','kara_pazar','siginak','tekke','mabet','karagoz'] as const
const repainted=new Set<string>(PARCEL_REPAINTED_BUILDINGS)
const cityGroundedArt = new Set(['ormanci','mimar','gozlukcu','hamam','konut'])
const waterfrontArt = new Set(['liman','liman-duz','tersane','tersane-duz','korsan_kalesi-iskele','kereste','barutane','harita_arsivi'])
export function parcelBuildingName(id:string,index:number|null|undefined){
 return id==='korsan_kalesi'&&index!=null&&index>=25&&index<=27?'korsan_kalesi-iskele':id
}
export function cityBuildingImage(id:string,level=1,facing?:CoastFacing,size:ArtSize='sm'){
 const name=(id==='liman'||id==='tersane')&&facing==='straight'?id+'-duz':id
 if(cityGroundedArt.has(name))return asset(`/images/game/buildings/parcel-v7/${name}${size==='sm'?'-sm':''}.webp`)
 if(waterfrontArt.has(name))return asset(`/images/game/buildings/parcel-v6/${name}${size==='sm'?'-sm':''}.webp`)
 if(['divan','medrese','carsi','depo','bagci','elcilik'].includes(id))return asset(`/images/game/buildings/parcel-v5/${id}${size==='sm'?'-sm':''}.webp`)
 if(id==='divan')return asset(`/images/game/buildings/painted-town-v1/divan${size==='sm'?'-sm':''}.webp`)
 if(id==='kisla')return asset(`/images/game/buildings/parcel-v4/kisla${size==='sm'?'-sm':''}.webp`)
 if(repainted.has(id))return asset(`/images/game/buildings/parcel-v2/${name}${size==='sm'?'-sm':''}.webp`)
 return buildingImage(id,level,facing,size)
}
export function cityArtOutline(id:string,level:number,size:ArtSize){
 const key=id==='kisla'?'kisla':id.startsWith('__')?id:`${id}-${buildingStage(level)}`
 return (bounds as Record<string,Record<string,number[][]>>)[key]?.[size]?.map(([x,y])=>({x,y}))
}
/** One scale and translation in the fixed camera. No warp, crop or ground. */
export function parcelArtFrame(p:CityParcel,width:number,height:number,outline:ParcelPoint[],flip=false){
 const points=outline.map(q=>({x:(flip?1-q.x:q.x)*width,y:q.y*height}))
 // Centre the visible alpha, not its transparent canvas. Edge support gives the
 // largest uniform scale at that centre, keeping roofs and shadows inside.
 const cx=(Math.min(...points.map(q=>q.x))+Math.max(...points.map(q=>q.x)))/2
 const cy=(Math.min(...points.map(q=>q.y))+Math.max(...points.map(q=>q.y)))/2
 const inset=3.2
 const scale=Math.min(...p.polygon.map((a,i)=>{
  const b=p.polygon[(i+1)%p.polygon.length],nx=b.y-a.y,ny=a.x-b.x
  const support=Math.max(...points.map(q=>nx*(q.x-cx)+ny*(q.y-cy)))
  return (nx*(a.x-p.center.x)+ny*(a.y-p.center.y)-inset*Math.hypot(nx,ny))/support
 }))
 const left=p.center.x-cx*scale,top=p.center.y-cy*scale
 return {left,top,x:left+width*scale/2,y:top+height*scale/2,width:width*scale,height:height*scale,
  polygon:points.map(q=>({x:left+q.x*scale,y:top+q.y*scale}))}
}

// Sample the painted roads independently of the buildable boundaries.
const roadSamples=CITY_ROADS.flatMap(line=>line.slice(1).flatMap((b,i)=>{
 const a=line[i],steps=Math.ceil(Math.hypot(b.x-a.x,b.y-a.y)/8)
 return Array.from({length:steps+1},(_,j)=>({x:a.x+(b.x-a.x)*j/steps,y:a.y+(b.y-a.y)*j/steps}))
}))
function segmentDistance(q:ParcelPoint,a:ParcelPoint,b:ParcelPoint){
 const dx=b.x-a.x,dy=b.y-a.y,t=Math.max(0,Math.min(1,((q.x-a.x)*dx+(q.y-a.y)*dy)/(dx*dx+dy*dy||1)))
 return Math.hypot(q.x-a.x-t*dx,q.y-a.y-t*dy)
}
export function buildingRoadClear(polygon:ParcelPoint[],clearance=contact.roadClearance){
 if(!polygon.every(q=>q.x>=4&&q.y>=4&&q.x<=PARCEL_WORLD.w-4&&q.y<=PARCEL_WORLD.h-4))return false
 const xs=polygon.map(q=>q.x),ys=polygon.map(q=>q.y),r=clearance
 const minX=Math.min(...xs)-r,maxX=Math.max(...xs)+r,minY=Math.min(...ys)-r,maxY=Math.max(...ys)+r
 return roadSamples.every(q=>{
  if(q.x<minX||q.x>maxX||q.y<minY||q.y>maxY)return true
  const crosses=polygon.map((a,i)=>{const b=polygon[(i+1)%polygon.length];return (b.x-a.x)*(q.y-a.y)-(b.y-a.y)*(q.x-a.x)})
  if(crosses.every(x=>x>=0)||crosses.every(x=>x<=0))return false
  return polygon.every((a,i)=>segmentDistance(q,a,polygon[(i+1)%polygon.length])>=r)
 })
}
export const barracksRoadClear=buildingRoadClear
// Visible size limits keep houses and workshops subordinate to the civic hall.
const workshopWidth: Record<string, number> = {
 kereste: 218, barutane: 218, harita_arsivi: 228, camci: 220, simyahane: 214,
 gozlukcu: 212, marangoz: 230, ambar: 232, konut: 252, hamam: 252, mabet: 238,
}
// Contact points are in normalized source-image coordinates. The floor of
// a building is below the centre of its whole cutout, especially with towers.
const groundSurveys: Record<string, number[][]> = buildingContacts
const artFrames = new Map<string, ReturnType<typeof parcelArtFrame> & {groundPolygon:ParcelPoint[]}>()

export function cityBuildingArtFrame(id:string,p:CityParcel,width:number,height:number,outline:ParcelPoint[],flip=false){
 const key = JSON.stringify([id,p.index,width,height,flip,outline])
 const cached = artFrames.get(key)
 if(cached)return cached

 const projectSource = (q:ParcelPoint)=>({x:(flip?1-q.x:q.x)*width,y:q.y*height})
 const points = outline.map(projectSource)
 const xs = points.map(q=>q.x), ys = points.map(q=>q.y)
 const minX=Math.min(...xs), maxX=Math.max(...xs), minY=Math.min(...ys), maxY=Math.max(...ys)
 const visibleWidth=maxX-minX, visibleHeight=maxY-minY
 const dock=p.index>=25&&p.index<=27
 const isLand=p.index<25
 const shoreContact=dock?COAST_CONTACTS[id]:undefined
 const measured=(isLand||shoreContact)?groundSurveys[id]:undefined
 const ground=measured?.map(([x,y])=>projectSource({x,y}))??points
 const groundX=ground.map(q=>q.x), groundY=ground.map(q=>q.y)
 const shorePin=shoreContact?projectSource(shoreContact):undefined
 const anchorX=shorePin?.x??(Math.min(...groundX)+Math.max(...groundX))/2
 const anchorY=shorePin?.y??(Math.min(...groundY)+Math.max(...groundY))/2
 const targetY=shorePin?coastContactTarget(p).y:p.center.y

 const widthLimit=p.index===0?380:dock?222:p.index===28?202:workshopWidth[id]??272
 const heightLimit=p.index===0?204:dock?220:p.index===28?106:152
 const limit=Math.min(widthLimit/visibleWidth,heightLimit/visibleHeight)
 const edges=p.polygon.map((a,i)=>{
  const b=p.polygon[(i+1)%p.polygon.length],nx=b.y-a.y,ny=a.x-b.x
  const support=Math.max(...[...points,...ground].map(q=>nx*(q.x-anchorX)+ny*(q.y-anchorY)))
  return {a,nx,ny,support,margin:3.2*Math.hypot(nx,ny)}
 })
 const frame=(scale:number,x:number,y:number)=>{
  const left=x-anchorX*scale,top=y-anchorY*scale
  const w=width*scale,h=height*scale
  const project=(q:ParcelPoint)=>({x:left+q.x*scale,y:top+q.y*scale})
  return {left,top,x:left+w/2,y:top+h/2,width:w,height:h,polygon:points.map(project),groundPolygon:ground.map(project)}
 }

 let best=frame(0,p.center.x,targetY),bestScore=0
 // Prefer the surveyed centre of the bare ground. A small change in the
 // anchor can make an asymmetric roof fit without shrinking the whole house.
 const shifts=isLand?[-8,0,8,16,24].flatMap(dy=>[-16,-8,0,8,16].map(dx=>[dx,dy])):[[0,0]]
 for(const [dx,dy] of shifts){
  const x=p.center.x+dx,y=targetY+dy
  let scale=limit
  for(const {a,nx,ny,support,margin} of edges){
   const room=nx*(a.x-x)+ny*(a.y-y)-margin
   if(room<0){scale=0;break}
   if(support>0)scale=Math.min(scale,room/support)
  }
  let candidate=frame(scale,x,y)
  if(isLand&&!buildingRoadClear(candidate.polygon)){
   let lo=0,hi=scale
   for(let i=0;i<12;i++){
    const mid=(lo+hi)/2
    if(buildingRoadClear(frame(mid,x,y).polygon))lo=mid
    else hi=mid
   }
   scale=lo;candidate=frame(scale,x,y)
  }
  // Keep the floor within 24px of its surveyed centre, but do not sacrifice
  // a substantial part of the architecture just to save an 8px translation.
  const score=scale/(1+Math.hypot(dx,dy)/1000)
  if(score>bestScore){best=candidate;bestScore=score}
 }
 artFrames.set(key,best)
 return best
}
