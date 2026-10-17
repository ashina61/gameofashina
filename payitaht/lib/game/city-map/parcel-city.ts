import { LIVE_SLOTS } from './live-adapter'
import { asset, buildingImage, buildingStage, type ArtSize, type CoastFacing } from '@/lib/asset'
import bounds from './parcel-art-bounds.json'

export type ParcelPoint = {x:number;y:number}
export const PARCEL_WORLD = {x:0,y:0,w:4096,h:3200}
export const PARCEL_ORIGIN = {x:2048,y:380}
export function parcelProject(u:number,v:number):ParcelPoint {return {x:2048+(u-v)*64,y:380+(u+v)*32}}
export function parcelInverse(p:ParcelPoint){const x=(p.x-2048)/64,y=(p.y-380)/32;return {u:(x+y)/2,v:(y-x)/2}}
const cells=Array.from({length:25},(_,i)=>({row:Math.floor(i/5),col:i%5}))
const ring=(p:typeof cells[number])=>Math.max(Math.abs(p.col-2),Math.abs(p.row-2))
const angle=(p:typeof cells[number])=>(Math.atan2(p.row-2,p.col-2)+Math.PI*2)%(Math.PI*2)
const ordered=cells.sort((a,b)=>ring(a)-ring(b)||angle(a)-angle(b))
function plot(index:number,center:ParcelPoint,row=-1,col=-1){
 const width=512,height=256
 const polygon=[{x:center.x,y:center.y-height/2},{x:center.x+width/2,y:center.y},{x:center.x,y:center.y+height/2},{x:center.x-width/2,y:center.y}]
 return {index,slot:LIVE_SLOTS[index],center,width,height,polygon,row,col}
}
export const PARCEL_PLOTS=[...ordered.map(({row,col},i)=>plot(i,parcelProject(3+col*6,3+row*6),row,col)),
 plot(25,{x:1390,y:2470}),plot(26,{x:2048,y:2470}),plot(27,{x:2706,y:2470}),plot(28,{x:3450,y:2770})]
export type CityParcel=typeof PARCEL_PLOTS[number]
export const parcelPlot=(index:number|null|undefined)=>index==null?undefined:PARCEL_PLOTS[index]
export function parcelContainsPoint(p:CityParcel,q:ParcelPoint,margin=0){return Math.abs(q.x-p.center.x)+2*Math.abs(q.y-p.center.y)<=p.width/2-margin+1e-6}
export function cityBuildingImage(id:string,level=1,facing?:CoastFacing,size:ArtSize='sm'){
 return id==='kisla'?asset(`/images/game/buildings/parcel-v1/kisla${size==='sm'?'-sm':''}.webp`):buildingImage(id,level,facing,size)
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
