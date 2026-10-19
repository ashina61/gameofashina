/** Native asset/geometry comparison, not a browser or gameplay screenshot. */
const fs=require('node:fs'),path=require('node:path'),sharp=require('sharp')
require('tsx/cjs')
const {PARCEL_PLOTS,PARCEL_WORLD,PARCEL_REPAINTED_BUILDINGS,cityBuildingImage,cityArtOutline,parcelArtFrame}=require('../lib/game/city-map/parcel-city.ts')
const root=path.resolve(__dirname,'..'),dest=path.join(root,'docs/mockups/parcel-fit')
// Reproduce SW139's small diamond fit for an honest same-position comparison.
function before(p,width,height,outline){
 const points=outline.map(q=>({x:q.x*width,y:q.y*height})),m=points.map(q=>q.x+2*q.y),n=points.map(q=>2*q.y-q.x)
 const m0=Math.min(...m),n0=Math.min(...n),scale=250.88/Math.max(Math.max(...m)-m0,Math.max(...n)-n0)
 const a=p.center.x+2*p.center.y-128+2.56-m0*scale,b=2*p.center.y-p.center.x-128+2.56-n0*scale
 return {left:(a-b)/2,top:(a+b)/4,width:width*scale,height:height*scale}
}
async function main(){
 fs.mkdirSync(dest,{recursive:true})
 const terrain=await sharp(path.join(root,'public/images/game/terrain/painted-town-v1/city.webp')).resize(PARCEL_WORLD.w,PARCEL_WORLD.h).png().toBuffer()
 const ids=['kisla',...PARCEL_REPAINTED_BUILDINGS.filter(id=>!['liman','tersane','korsan_kalesi'].includes(id))]
 async function sprite(id,p,old=false){
  const file=path.join(root,'public',cityBuildingImage(id,1,undefined,'full')),m=await sharp(file).metadata(),outline=cityArtOutline(id,1,'full')
  const f=old?before(p,m.width,m.height,outline):parcelArtFrame(p,m.width,m.height,outline)
  return {input:await sharp(file).resize(Math.round(f.width),Math.round(f.height)).png().toBuffer(),left:Math.round(f.left),top:Math.round(f.top)}
 }
 async function card(id,index,mode){
  const p=PARCEL_PLOTS[index],cut={left:Math.round(p.center.x-210),top:Math.round(p.center.y-140),width:420,height:280}
  let canvas=await sharp(terrain).extract(cut).png().toBuffer()
  if(mode!=='empty'){const s=await sprite(id,p,mode==='before');canvas=await sharp(canvas).composite([{...s,left:s.left-cut.left,top:s.top-cut.top}]).png().toBuffer()}
  const tile=await sharp(canvas).resize(300,200).png().toBuffer()
  const label=`${index} · ${id} · ${mode==='empty'?'Boş arsa':mode==='before'?'Önce':'Yeni ölçü'}`
  const bg=Buffer.from(`<svg width="300" height="226"><rect width="300" height="226" fill="#e5d4b2"/><text x="8" y="218" font-family="sans-serif" font-size="14" fill="#49311e">${label}</text></svg>`)
  return sharp(bg).composite([{input:tile,left:0,top:0}]).png().toBuffer()
 }
 const comparison=[]
 for(const [row,[id,index]] of [['kisla',1],['medrese',2],['carsi',3],['hamam',7],['depo',17],['cami',21]].entries()){
  for(const [col,mode] of ['empty','before','after'].entries())comparison.push({input:await card(id,index,mode),left:col*300,top:row*226})
 }
 await sharp({create:{width:900,height:1356,channels:4,background:'#e5d4b2'}}).composite(comparison).webp({quality:90}).toFile(path.join(dest,'empty-before-after.webp'))
 const all=[]
 for(let i=1;i<=24;i++)all.push({input:await card(ids[i-1],i,'after'),left:(i-1)%4*300,top:Math.floor((i-1)/4)*226})
 await sharp({create:{width:1200,height:1356,channels:4,background:'#e5d4b2'}}).composite(all).webp({quality:90}).toFile(path.join(dest,'all-land-parcels.webp'))
 const placements=[['divan',0],...ids.slice(0,24).map((id,i)=>[id,i+1]),['liman',25],['tersane',26],['korsan_kalesi',28]],layers=[]
 for(const [id,index] of placements)layers.push(await sprite(id,PARCEL_PLOTS[index]))
 await sharp(await sharp(terrain).composite(layers).png().toBuffer()).resize(1586,992).webp({quality:90}).toFile(path.join(dest,'city-native.webp'))
 console.log('Empty/before/after, all 24 land parcels and whole-city native proofs saved.')
}
main().catch(e=>{console.error(e);process.exitCode=1})
