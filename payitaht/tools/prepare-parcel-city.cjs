/** Code-native terrain uses the approved prototype's exact road/tree primitives. */
const fs=require('node:fs'),path=require('node:path')
const {pathToFileURL}=require('node:url')
const sharp=require('sharp'),{createCanvas,loadImage}=require('@napi-rs/canvas')
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
 const {road,tree}=await import(pathToFileURL(path.join(root,'public/prototypes/ikariam-study-v1/renderer.mjs')))
 const c=createCanvas(4096,3200),ctx=c.getContext('2d'),sea=await loadImage(path.join(root,'public/images/game/terrain/open-sea-v2.webp'))
 ctx.drawImage(sea,0,2080,4096,1120)
 const shore=[[0,0],[4096,0],[4096,2300],[3600,2305],[3000,2320],[2450,2300],[2050,2330],[1650,2300],[1050,2320],[500,2305],[0,2300]]
 const fill=(pts,color)=>{ctx.beginPath();pts.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y));ctx.closePath();ctx.fillStyle=color;ctx.fill()}
 fill(shore.map(([x,y])=>[x,y>2000?y+35:y]),'#c5b385');fill(shore,'#969b60')
 let seed=61;const rnd=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296}
 for(let i=0;i<110000;i++){const x=rnd()*4096,y=rnd()*2290;ctx.fillStyle=i%4?'#61703c20':'#c7c28a65';ctx.fillRect(x,y,1+rnd()*4,1+rnd()*2)}
 ctx.save();ctx.translate(2048,380);ctx.scale(16/21,16/21)
 for(const t of [0,6,12,18,24,30]){road(ctx,-1.95,(t-.65)*3,93.9,3.9);road(ctx,(t-.65)*3,-1.95,3.9,93.9)}
 // Forest clusters stay beyond the entire street grid; no decoration in plots.
 for(let i=0;i<14;i++)for(let j=0;j<4;j++){
  const t=-1+i*2.4+j*.22,s=2.3+rnd()*1.1
  tree(ctx,t*3,(-2-rnd()*1.4)*3,s);tree(ctx,(-2-rnd()*1.4)*3,t*3,s)
 }
 // Small roadside trees sit in the corner gaps between parcels and roads.
 for(const u of [6,12,18,24])for(const v of [6,12,18,24])tree(ctx,(u+.86)*3,(v+.86)*3,1.8)
 ctx.restore()
 const island=[[3190,2770],[3450,2630],[3710,2770],[3450,2910]]
 fill(island.map(([x,y])=>[x,y+15]),'#b9a87a');fill(island,'#969b60')
 fs.mkdirSync(path.join(root,'public/images/game/terrain/parcel-v1'),{recursive:true})
 await sharp(c.toBuffer('image/png')).webp({quality:92}).toFile(path.join(root,'public/images/game/terrain/parcel-v1/city.webp'))
 console.log(JSON.stringify({artRecords:Object.keys(records).length,terrain:'4096x3200',bytes:fs.statSync(path.join(root,'public/images/game/terrain/parcel-v1/city.webp')).size}))
})().catch(e=>{console.error(e);process.exitCode=1})
