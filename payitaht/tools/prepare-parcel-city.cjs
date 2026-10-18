/** Regenerate alpha hulls from actual runtime assets; never repaint the approved terrain. */
const fs=require('node:fs'),path=require('node:path')
const sharp=require('sharp')
require('tsx/cjs')
const {BUILDING_IDS}=require('../lib/game/engine.ts')
const {cityBuildingImage}=require('../lib/game/city-map/parcel-city.ts')
const root=path.resolve(__dirname,'..')
function hull(points){
 points.sort((a,b)=>a[0]-b[0]||a[1]-b[1]);const cross=(o,a,b)=>(a[0]-o[0])*(b[1]-o[1])-(a[1]-o[1])*(b[0]-o[0]),lo=[],hi=[]
 for(const p of points){while(lo.length>1&&cross(lo.at(-2),lo.at(-1),p)<=0)lo.pop();lo.push(p)}
 for(const p of points.toReversed()){while(hi.length>1&&cross(hi.at(-2),hi.at(-1),p)<=0)hi.pop();hi.push(p)}
 return lo.slice(0,-1).concat(hi.slice(0,-1))
}
;(async()=>{
 const records={}
 const jobs=BUILDING_IDS.filter(id=>id!=='surlar').flatMap(id=>(id==='kisla'?[1]:[1,4,8]).flatMap(level=>['full','sm'].flatMap(size=>{
  const base={key:id==='kisla'?'kisla':`${id}-${level>=8?3:level>=4?2:1}`,size,file:cityBuildingImage(id,level,undefined,size).split('?')[0]}
  return id==='liman'||id==='tersane'?[base,{...base,key:base.key.replace(id,id+'-duz'),file:cityBuildingImage(id,level,'straight',size).split('?')[0]}]:[base]
 })))
 jobs.push({key:'__site',size:'full',file:'/images/game/buildings/site.webp'},{key:'__scaffold',size:'full',file:'/images/game/buildings/scaffold.webp'})
 for(const {key,size,file} of jobs){
  const {data,info}=await sharp(path.join(root,'public',file)).ensureAlpha().raw().toBuffer({resolveWithObject:true}),points=[]
  for(let y=0;y<info.height;y++){
   let left=-1,right=-1;for(let x=0;x<info.width;x++)if(data[(y*info.width+x)*4+3]>=8){if(left<0)left=x;right=x}
   if(left>=0)points.push([left/info.width,y/info.height],[right/info.width,y/info.height])
  }
  ;(records[key]??={})[size]=hull(points).map(p=>p.map(v=>+v.toFixed(7)))
 }
 fs.writeFileSync(path.join(root,'lib/game/city-map/parcel-art-bounds.json'),JSON.stringify(records)+'\n')
 console.log('Updated actual alpha hulls')
})().catch(e=>{console.error(e);process.exitCode=1})
