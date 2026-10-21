/** Reproducible compositing of the actual runtime sprites. Not browser screenshots. */
const fs=require('node:fs'),path=require('node:path'),sharp=require('sharp')
require('tsx/cjs')
const {PARCEL_PLOTS,PARCEL_WORLD,cityArtOutline,cityArtAnchor,cityBuildingImage,parcelArtFrame}=require('../lib/game/city-map/parcel-city.ts')
const art=require('../lib/game/city-map/ottoman-art.json')
const {BUILDINGS}=require('../lib/game/engine.ts')
const root=path.resolve(__dirname,'..'),out=path.join(root,'docs/mockups/ottoman-centering')
function edge(data,info){
 const points=[]
 for(let y=0;y<info.height;y++){
  let left=-1,right=-1
  for(let x=0;x<info.width;x++)if(data[(y*info.width+x)*4+3]>=8){if(left<0)left=x;right=x}
  if(left>=0)points.push({x:left/info.width,y:y/info.height},{x:right/info.width,y:y/info.height})
 }
 return points
}
function before(p,width,height,outline){
 const points=outline.map(q=>({x:q.x*width,y:q.y*height}))
 if(p.polygon.length===8)return parcelArtFrame(p,width,height,outline)
 const m=points.map(q=>q.x+2*q.y),n=points.map(q=>2*q.y-q.x),m0=Math.min(...m),n0=Math.min(...n),inset=p.width*.01
 const scale=(p.width-2*inset)/Math.max(Math.max(...m)-m0,Math.max(...n)-n0)
 const a=p.center.x+2*p.center.y-p.width/2+inset-m0*scale,b=2*p.center.y-p.center.x-p.width/2+inset-n0*scale
 return {left:(a-b)/2,top:(a+b)/4,width:width*scale,height:height*scale}
}
async function main(){
 fs.mkdirSync(out,{recursive:true})
 const terrain=await sharp(path.join(root,'public/images/game/terrain/painted-town-v1/city-crisp.webp')).png().toBuffer()
 async function sprite(id,p,old=false,flip=false){
  const base=id==='divan'?'painted-town-v1':id==='kisla'?'parcel-v1':'parcel-v2'
  const file=old?path.join(root,`public/images/game/buildings/${base}/${id}.webp`):path.join(root,'public',cityBuildingImage(id,1,undefined,'full'))
  const {data,info}=await sharp(file).ensureAlpha().raw().toBuffer({resolveWithObject:true})
  const f=old?before(p,info.width,info.height,edge(data,info)):parcelArtFrame(p,info.width,info.height,cityArtOutline(id,1,'full'),flip,cityArtAnchor(id))
  const pipeline=sharp(file);if(flip)pipeline.flop()
  return {input:await pipeline.resize(Math.round(f.width),Math.round(f.height)).png().toBuffer(),left:Math.round(f.left),top:Math.round(f.top)}
 }
 async function card(id,p,mode){
  const w=520,h=320,cut={left:Math.round(p.center.x-w/2),top:Math.round(p.center.y-h/2),width:w,height:h}
  let b=await sharp(terrain).extract(cut).png().toBuffer()
  if(mode!=='empty'){
   const s=await sprite(id,p,mode==='before',mode==='flipped')
   b=await sharp(b).composite([{...s,left:s.left-cut.left,top:s.top-cut.top}]).png().toBuffer()
  }
  const title=BUILDINGS[id]?.name??id,status={empty:'Boş arsa',before:'Önce',after:'Yeni',flipped:'Aynalanmış'}[mode]
  const label=Buffer.from(`<svg width="520" height="350"><rect width="520" height="350" fill="#eadfc6"/><text x="12" y="342" font-family="sans-serif" font-size="18" fill="#49311e">${title} · ${p.index} · ${status}</text></svg>`)
  return sharp(label).composite([{input:b,left:0,top:0}]).png().toBuffer()
 }
 const core=[['divan',0],['kisla',1],['medrese',2],['hamam',7],['carsi',3],['depo',17]],layers=[]
 for(const [row,[id,index]]of core.entries())for(const [col,mode]of ['empty','before','after'].entries())layers.push({input:await card(id,PARCEL_PLOTS[index],mode),left:col*520,top:row*350})
 await sharp({create:{width:1560,height:core.length*350,channels:4,background:'#eadfc6'}}).composite(layers).webp({quality:92}).toFile(path.join(out,'empty-before-after.webp'))
 const ids=Object.keys(art).filter(id=>!id.endsWith('-duz')),catalogue=[]
 for(const [i,id]of ids.entries()){
  const p=PARCEL_PLOTS[id==='divan'?0:id==='liman'?25:id==='tersane'?26:id==='korsan_kalesi'?28:1]
  catalogue.push({input:await card(id,p,'after'),left:i%4*520,top:Math.floor(i/4)*350})
 }
 await sharp({create:{width:2080,height:Math.ceil(ids.length/4)*350,channels:4,background:'#eadfc6'}}).composite(catalogue).webp({quality:90}).toFile(path.join(out,'catalogue-native.webp'))
 const land=ids.filter(id=>!['divan','liman','tersane','korsan_kalesi'].includes(id))
 for(const batch of [0,1]){
  const placements=[['divan',0],...land.slice(batch*24,batch*24+24).map((id,i)=>[id,i+1]),['liman',25],['tersane',26],['korsan_kalesi',28]].filter(([id])=>art[id])
  const pieces=[];for(const [id,index]of placements)pieces.push(await sprite(id,PARCEL_PLOTS[index]))
  const composed=await sharp(terrain).composite(pieces).png().toBuffer()
  await sharp(composed).resize(PARCEL_WORLD.w/2,PARCEL_WORLD.h/2).webp({quality:92}).toFile(path.join(out,`city-native-${batch+1}.webp`))
 }
 console.log(`Native proofs: ${ids.length} building types, six same-parcel comparisons, two city layouts.`)
}
main().catch(e=>{console.error(e);process.exitCode=1})
