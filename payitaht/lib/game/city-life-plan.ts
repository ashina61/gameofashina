import { activeJob, clampWorkers, population, UNITS, UNIT_IDS, type BuildingId, type Game, type UnitId } from './engine'
import { activeCity, type Empire } from './empire'
import { availableUnits } from './expeditions'
import { CITY_ROADS, parcelPlot, type ParcelPoint } from './city-map/parcel-city'

export type CityLifeFleet={merchants:number;warships:number}
export const EMPTY_LIFE_FLEET:CityLifeFleet={merchants:0,warships:0}
/** Use the same free fleet as the dispatch screen, including the shared merchant pool. */
export function cityLifeFleet(empire?:Empire):CityLifeFleet{
 if(!empire)return EMPTY_LIFE_FLEET
 const free=availableUnits(empire,activeCity(empire).id)
 return {merchants:free.nakliye,warships:UNIT_IDS.reduce((sum,id)=>sum+(UNITS[id].branch==='deniz'&&id!=='nakliye'?free[id]:0),0)}
}

export type LifePath={id:string;points:ParcelPoint[];ends:number[];length:number}
export type LifeRole='citizen'|'logger'|'scholar'|'trader'|'builder'
export type LifeWalker={id:string;role:LifeRole;path:LifePath;speed:number;phase:number}
export type LifeBoat={id:string;kind:'merchant'|'warship';building:'liman'|'tersane';plot:number}
export type CityLifePlan={walkers:LifeWalker[];training:{count:number;plot:number}|null;boats:LifeBoat[];moving:boolean}
export type LifeOptions={lite?:boolean;reduced?:boolean;occupied?:boolean;blockaded?:boolean;fleet?:CityLifeFleet}

const nodes:ParcelPoint[]=[],edges=new Map<number,Map<number,number>>()
function node(p:ParcelPoint){
 const existing=nodes.findIndex(n=>n.x===p.x&&n.y===p.y)
 if(existing>=0)return existing
 nodes.push(p);return nodes.length-1
}
for(const road of CITY_ROADS)for(let i=1;i<road.length;i++){
 const a=node(road[i-1]),b=node(road[i]),length=Math.hypot(nodes[a].x-nodes[b].x,nodes[a].y-nodes[b].y)
 for(const [from,to] of [[a,b],[b,a]]){if(!edges.has(from))edges.set(from,new Map());edges.get(from)!.set(to,length)}
}
const routes=new Map<string,LifePath>()
const nearest=(p:ParcelPoint)=>nodes.reduce((best,q,i)=>Math.hypot(q.x-p.x,q.y-p.y)<Math.hypot(nodes[best].x-p.x,nodes[best].y-p.y)?i:best,0)

/** Every segment is an existing painted road; no straight connector crosses a plot. */
export function cityLifeRoute(from:number,to:number):LifePath|null{
 const a=parcelPlot(from),b=parcelPlot(to)
 if(!a||!b)return null
 const start=nearest(a.center);let finish=nearest(b.center)
 if(start===finish)finish=[...edges.get(start)!.keys()][0]
 const key=`${start}:${finish}`,cached=routes.get(key)
 if(cached)return cached
 const distances=new Map<number,number>([[start,0]]),previous=new Map<number,number>(),pending=new Set(nodes.map((_,i)=>i))
 while(pending.size){
  const current=[...pending].reduce((best,i)=>(distances.get(i)??Infinity)<(distances.get(best)??Infinity)?i:best)
  const distance=distances.get(current)??Infinity
  if(!Number.isFinite(distance))return null
  pending.delete(current)
  if(current===finish)break
  for(const [next,length] of edges.get(current)??[]){
   if(distance+length<(distances.get(next)??Infinity)){distances.set(next,distance+length);previous.set(next,current)}
  }
 }
 const indices=[finish]
 while(indices[0]!==start){const before=previous.get(indices[0]);if(before===undefined)return null;indices.unshift(before)}
 const points=indices.map(i=>nodes[i]),ends=[0]
 for(let i=1;i<points.length;i++)ends.push(ends[i-1]+Math.hypot(points[i].x-points[i-1].x,points[i].y-points[i-1].y))
 const path={id:key,points,ends,length:ends.at(-1)!};routes.set(key,path);return path
}

/** World distance, rather than a fraction of each unequal segment, keeps walking speed steady. */
export function sampleLifePath(path:LifePath,distance:number){
 const period=path.length*2,phase=((distance%period)+period)%period,reverse=phase>path.length
 const along=reverse?period-phase:phase
 let i=1;while(i<path.ends.length-1&&path.ends[i]<along)i++
 const a=path.points[i-1],b=path.points[i],t=(along-path.ends[i-1])/(path.ends[i]-path.ends[i-1])
 return {x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t,left:reverse?b.x>a.x:b.x<a.x}
}

/** Presentation only. It never changes jobs, workforce, production, combat or saves. */
export function cityLifePlan(game:Game,options:LifeOptions={}):CityLifePlan{
 const {lite=false,reduced=false,occupied=false,blockaded=false,fleet=EMPTY_LIFE_FLEET}=options
 const walkers:LifeWalker[]=[],boats:LifeBoat[]=[]
 const plot=(id:BuildingId)=>game.buildings[id]>0?game.placement[id]:null
 const hall=plot('divan')
 const destinations=(['konut','kereste','ambar','carsi','medrese'] as const).map(plot).filter((p):p is number=>p!==null)
 const count=population(game)<=0?0:Math.min(occupied?2:lite?6:reduced?4:16,2+Math.floor(population(game)/45))
 const add=(role:LifeRole,n:number,from:number|null,to:number|null,speed=19)=>{
  if(from===null||to===null)return
  const path=cityLifeRoute(from,to);if(!path)return
  for(let i=0;i<n;i++)walkers.push({id:`${role}-${i}`,role,path,speed:speed+i*1.7,phase:(i*.381+(role.length*.137))%1})
 }
 if(hall!==null)for(let i=0;i<count;i++){
  const path=cityLifeRoute(hall,destinations[i%Math.max(1,destinations.length)]??hall)
  if(path)walkers.push({id:`citizen-${i}`,role:'citizen',path,speed:16+i%5*2,phase:(i*.381+.16)%1})
 }
 if(!occupied){
  const workers=clampWorkers(game),cap=lite||reduced?1:2
  add('logger',Math.min(cap,Math.ceil(workers.kereste/20)),plot('kereste'),plot('ambar'))
  add('scholar',Math.min(cap,Math.ceil(workers.medrese/20)),plot('medrese'),hall,17)
  add('trader',Math.min(cap,Math.ceil(workers.carsi/20)),plot('carsi'),plot('liman')??plot('ambar'),18)
  const job=activeJob(game)
  if(job?.kind==='build'&&job.start<=game.updatedAt&&job.end>game.updatedAt){
   const target=game.placement[job.id as BuildingId]
   if(target!==undefined)add('builder',lite||reduced?1:2,plot('ambar'),target)
  }
 }
 const barracks=plot('kisla')
 const trainees=occupied?0:game.drills.filter(job=>job.start<=game.updatedAt&&job.end>game.updatedAt&&UNITS[job.id as UnitId]?.home==='kisla')
  .reduce((sum,job)=>sum+(job.count??0),0)
 const training=barracks!==null&&trainees>0?{plot:barracks,count:Math.min(reduced?1:lite?2:3,trainees)}:null
 if(!blockaded&&!occupied){
  const harbour=plot('liman'),shipyard=plot('tersane')
  if(harbour!==null&&fleet.merchants>0)boats.push({id:'merchant',kind:'merchant',building:'liman',plot:harbour})
  if(shipyard!==null&&fleet.warships>0&&(!lite||!boats.length))boats.push({id:'warship',kind:'warship',building:'tersane',plot:shipyard})
 }
 return {walkers,training,boats,moving:!reduced}
}
