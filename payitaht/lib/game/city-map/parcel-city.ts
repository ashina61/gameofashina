import { LIVE_SLOTS } from './live-adapter'
import { asset, buildingImage, buildingStage, type ArtSize, type CoastFacing } from '@/lib/asset'
import bounds from './parcel-art-bounds.json'
import contact from './barracks-contact.json'

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
const clearingOffsets:Record<number,ParcelPoint>={1:{x:0,y:-4},2:{x:0,y:-4},7:{x:0,y:-6},17:{x:0,y:8},20:{x:0,y:-6},21:{x:12,y:0}}
function plot(index:number,source:number[]){
 const land=index>0&&index<25,offset=clearingOffsets[index]??{x:0,y:0}
 const center={x:source[0]*2+offset.x,y:source[1]*2+offset.y},width=index===0?448:land?320:256,height=width/2
 // The painting has rounded 2:1 clearings, rather than tiny inscribed diamonds.
 // One convex boundary is used for architecture, empty flags, selection and taps.
 const polygon=land?Array.from({length:8},(_,i)=>({x:center.x+Math.sin(i*Math.PI/4)*width/2,y:center.y-Math.cos(i*Math.PI/4)*height/2})):
  [{x:center.x,y:center.y-height/2},{x:center.x+width/2,y:center.y},{x:center.x,y:center.y+height/2},{x:center.x-width/2,y:center.y}]
 return {index,slot:LIVE_SLOTS[index],center,width,height,polygon}
}
export const PARCEL_PLOTS=[[811,384],...ordered,[475,775],[1206,775],[730,745],[1425,898]].map((p,i)=>plot(i,p))
/** Measured road centre lines, including the actual bridges. Ambient walkers follow these. */
export const CITY_ROADS=[
 [[300,85],[405,151],[458,224],[570,298],[688,336],[700,370],[700,427],[810,466],[927,431],[1038,503],[1107,532],[1240,592],[1320,635]],
 [[405,720],[455,675],[557,644],[633,580],[734,508],[700,427],[700,370],[740,320],[855,312],[903,345],[1037,338],[1094,316],[1116,223],[1160,175]],
 [[1200,753],[1168,667],[1119,591],[1107,532],[1067,456],[1091,410],[1193,435],[1305,440],[1411,420]],
 [[155,415],[273,431],[384,474],[517,493],[633,487],[734,450],[700,427]],
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
export function cityBuildingImage(id:string,level=1,facing?:CoastFacing,size:ArtSize='sm'){
 if(id==='divan')return asset(`/images/game/buildings/painted-town-v1/divan${size==='sm'?'-sm':''}.webp`)
 if(id==='kisla')return asset(`/images/game/buildings/parcel-v4/kisla${size==='sm'?'-sm':''}.webp`)
 if(repainted.has(id)){
  const variant=(id==='liman'||id==='tersane')&&facing==='straight'?id+'-duz':id
  return asset(`/images/game/buildings/parcel-v2/${variant}${size==='sm'?'-sm':''}.webp`)
 }
 return buildingImage(id,level,facing,size)
}
export function cityArtOutline(id:string,level:number,size:ArtSize){
 const key=id==='kisla'?'kisla':id.startsWith('__')?id:`${id}-${buildingStage(level)}`
 return (bounds as Record<string,Record<string,number[][]>>)[key]?.[size]?.map(([x,y])=>({x,y}))
}
/** One scale and translation in the fixed camera. No warp, crop or ground. */
export function parcelArtFrame(p:CityParcel,width:number,height:number,outline:ParcelPoint[],flip=false){
 const points=outline.map(q=>({x:(flip?1-q.x:q.x)*width,y:q.y*height}))
 if(p.polygon.length===8){
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
 const m=points.map(q=>q.x+2*q.y),n=points.map(q=>2*q.y-q.x)
 const m0=Math.min(...m),n0=Math.min(...n),inset=p.width*.01
 const scale=(p.width-2*inset)/Math.max(Math.max(...m)-m0,Math.max(...n)-n0)
 const a=p.center.x+2*p.center.y-p.width/2+inset-m0*scale
 const b=2*p.center.y-p.center.x-p.width/2+inset-n0*scale
 const left=(a-b)/2,top=(a+b)/4
 return {left,top,x:left+width*scale/2,y:top+height*scale/2,width:width*scale,height:height*scale,
  polygon:points.map(q=>({x:left+q.x*scale,y:top+q.y*scale}))}
}

// Approved buildings are placed by manually measured ground contacts, not by
// their full roof silhouette. Extend this registry ONLY after a new groundless
// sprite's contact points have been measured and reviewed; guessing footprints
// here makes buildings overlap roads or leave visible gaps in the painted plot.
const measuredContacts:Record<string,{footprint:number[][];roadClearance:number}>={
 kisla:contact,
}
// The accepted two-storey barracks is the first calibrated architecture.
// Its roof may rise behind the clearing, but no opaque silhouette may cover
// the actual roads. Legacy sprites keep their old conservative alpha fit.
const roadSamples=CITY_ROADS.flatMap(line=>line.slice(1).flatMap((b,i)=>{
 const a=line[i],steps=Math.ceil(Math.hypot(b.x-a.x,b.y-a.y)/8)
 return Array.from({length:steps+1},(_,j)=>({x:a.x+(b.x-a.x)*j/steps,y:a.y+(b.y-a.y)*j/steps}))
}))
function segmentDistance(q:ParcelPoint,a:ParcelPoint,b:ParcelPoint){
 const dx=b.x-a.x,dy=b.y-a.y,t=Math.max(0,Math.min(1,((q.x-a.x)*dx+(q.y-a.y)*dy)/(dx*dx+dy*dy||1)))
 return Math.hypot(q.x-a.x-t*dx,q.y-a.y-t*dy)
}
export function buildingRoadClear(polygon:ParcelPoint[],clearance:number){
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
export const barracksRoadClear=(polygon:ParcelPoint[])=>buildingRoadClear(polygon,contact.roadClearance)
export function cityBuildingArtFrame(id:string,p:CityParcel,width:number,height:number,outline:ParcelPoint[],flip=false):ReturnType<typeof parcelArtFrame>&{groundPolygon:ParcelPoint[];contactMeasured:boolean}{
 const spec=measuredContacts[id]
 if(!spec||p.index===0){const f=parcelArtFrame(p,width,height,outline,flip);return {...f,groundPolygon:f.polygon,contactMeasured:false}}
 const footprint=spec.footprint.map(([x,y])=>({x,y})),base=parcelArtFrame(p,width,height,footprint,flip)
 const frame=(factor:number)=>{
  const left=p.center.x+(base.left-p.center.x)*factor,top=p.center.y+(base.top-p.center.y)*factor
  const w=base.width*factor,h=base.height*factor
  const project=(q:ParcelPoint)=>({x:left+(flip?1-q.x:q.x)*w,y:top+q.y*h})
  return {left,top,x:left+w/2,y:top+h/2,width:w,height:h,polygon:outline.map(project),groundPolygon:footprint.map(project),contactMeasured:true}
 }
 if(buildingRoadClear(frame(1).polygon,spec.roadClearance))return frame(1)
 let lo=0,hi=1
 for(let i=0;i<16;i++){const mid=(lo+hi)/2;if(buildingRoadClear(frame(mid).polygon,spec.roadClearance))lo=mid;else hi=mid}
 return frame(lo)
}
