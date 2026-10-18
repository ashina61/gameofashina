import { LIVE_SLOTS } from './live-adapter'
import { asset, buildingImage, buildingStage, type ArtSize, type CoastFacing } from '@/lib/asset'
import bounds from './parcel-art-bounds.json'

export type ParcelPoint = {x:number;y:number}
// Source painting is 1586×992. All measurements below use the same 2× world scale.
export const PARCEL_WORLD = {x:0,y:0,w:3172,h:1984}
export const PARCEL_ORIGIN = {x:1622,y:768}
export function parcelProject(u:number,v:number):ParcelPoint {return {x:1622+(u-v)*64,y:768+(u+v)*32}}
export function parcelInverse(p:ParcelPoint){const x=(p.x-1622)/64,y=(p.y-768)/32;return {u:(x+y)/2,v:(y-x)/2}}
const clearings=[[583,175],[811,175],[1027,175],[359,245],[1251,245],[685,287],[955,302],[242,363],[500,352],[1166,373],[1383,390],[465,464],[278,519],[653,525],[955,546],[1160,487],[1380,546],[260,631],[465,600],[575,686],[788,625],[1003,646],[1227,646],[1381,692]]
// Keep engine identity/order; put early unlocks closest to the fixed civic centre.
const ordered=clearings.toSorted((a,b)=>Math.hypot(a[0]-811,(a[1]-384)*1.5)-Math.hypot(b[0]-811,(b[1]-384)*1.5))
function plot(index:number,source:number[]){
 const center={x:source[0]*2,y:source[1]*2},width=index===0?448:256,height=width/2
 const polygon=[{x:center.x,y:center.y-height/2},{x:center.x+width/2,y:center.y},{x:center.x,y:center.y+height/2},{x:center.x-width/2,y:center.y}]
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
export function parcelContainsPoint(p:CityParcel,q:ParcelPoint,margin=0){return Math.abs(q.x-p.center.x)+2*Math.abs(q.y-p.center.y)<=p.width/2-margin+1e-6}
export function cityBuildingImage(id:string,level=1,facing?:CoastFacing,size:ArtSize='sm'){
 return id==='divan'?asset(`/images/game/buildings/painted-town-v1/divan${size==='sm'?'-sm':''}.webp`):id==='kisla'?asset(`/images/game/buildings/parcel-v1/kisla${size==='sm'?'-sm':''}.webp`):buildingImage(id,level,facing,size)
}
export function cityArtOutline(id:string,level:number,size:ArtSize){
 const key=id==='kisla'?'kisla':id.startsWith('__')?id:`${id}-${buildingStage(level)}`
 return (bounds as Record<string,Record<string,number[][]>>)[key]?.[size]?.map(([x,y])=>({x,y}))
}
/** One scale and translation in the fixed camera. No warp, crop or ground. */
export function parcelArtFrame(p:CityParcel,width:number,height:number,outline:ParcelPoint[],flip=false){
 const points=outline.map(q=>({x:(flip?1-q.x:q.x)*width,y:q.y*height}))
 const m=points.map(q=>q.x+2*q.y),n=points.map(q=>2*q.y-q.x)
 const m0=Math.min(...m),n0=Math.min(...n),inset=p.width*.01
 const scale=(p.width-2*inset)/Math.max(Math.max(...m)-m0,Math.max(...n)-n0)
 const a=p.center.x+2*p.center.y-p.width/2+inset-m0*scale
 const b=2*p.center.y-p.center.x-p.width/2+inset-n0*scale
 const left=(a-b)/2,top=(a+b)/4
 return {left,top,x:left+width*scale/2,y:top+height*scale/2,width:width*scale,height:height*scale,
  polygon:points.map(q=>({x:left+q.x*scale,y:top+q.y*scale}))}
}
