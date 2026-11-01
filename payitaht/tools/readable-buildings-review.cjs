/** Native composition of the actual runtime assets; not a browser screenshot. */
const fs=require('node:fs'),path=require('node:path'),sharp=require('sharp')
require('tsx/cjs')
const {PARCEL_PLOTS,PARCEL_REPAINTED_BUILDINGS,cityBuildingImage,cityArtOutline,cityBuildingArtFrame}=require('../lib/game/city-map/parcel-city.ts')
const {BUILDINGS}=require('../lib/game/engine.ts')
const root=path.resolve(__dirname,'..'),out=path.join(root,'docs/mockups/readable-buildings')
const coast=new Set(['liman','tersane','korsan_kalesi'])
async function main(){
 fs.mkdirSync(out,{recursive:true})
 const terrain=await sharp(path.join(root,'public/images/game/terrain/painted-town-v1/city-crisp.webp')).png().toBuffer()
 const ids=['divan','kisla',...PARCEL_REPAINTED_BUILDINGS],cards=[],audit=[]
 async function sprite(id,index,flip=false){
  const p=PARCEL_PLOTS[index],file=path.join(root,'public',cityBuildingImage(id,1,undefined,'full'))
  const m=await sharp(file).metadata(),f=cityBuildingArtFrame(id,p,m.width,m.height,cityArtOutline(id,1,'full'),flip)
  return {input:await sharp(file).flop(flip).resize(Math.max(1,Math.round(f.width)),Math.max(1,Math.round(f.height))).png().toBuffer(),left:Math.round(f.left),top:Math.round(f.top),frame:f}
 }
 for(const id of ids){
  const index=id==='divan'?0:id==='liman'?25:id==='tersane'?26:id==='korsan_kalesi'?28:1,p=PARCEL_PLOTS[index],s=await sprite(id,index)
  const cut={left:Math.round(p.center.x-240),top:Math.round(p.center.y-220),width:480,height:360}
  const world=await sharp(terrain).composite([{input:s.input,left:s.left,top:s.top}]).png().toBuffer()
  const tile=await sharp(world).extract(cut).resize(360,270).png().toBuffer()
  const label=Buffer.from(`<svg width="360" height="302"><rect width="360" height="302" fill="#e8d8b8"/><text x="12" y="292" font-family="sans-serif" font-size="17" fill="#49311e">${BUILDINGS[id].name}</text></svg>`)
  cards.push({input:await sharp(label).composite([{input:tile,left:0,top:0}]).png().toBuffer(),left:(cards.length%6)*360,top:Math.floor(cards.length/6)*302})
  for(const p of PARCEL_PLOTS.filter(p=>id==='divan'?p.index===0:coast.has(id)?p.slot.zone==='liman':p.index>0&&p.slot.zone==='sehir')){
   const m=await sharp(path.join(root,'public',cityBuildingImage(id,1,undefined,'full'))).metadata()
   for(const flip of [false,true]){const f=cityBuildingArtFrame(id,p,m.width,m.height,cityArtOutline(id,1,'full'),flip);audit.push({id,index:p.index,flip,widthRatio:(Math.max(...f.groundPolygon.map(q=>q.x))-Math.min(...f.groundPolygon.map(q=>q.x)))/p.width})}
  }
 }
 await sharp({create:{width:2160,height:Math.ceil(ids.length/6)*302,channels:4,background:'#e8d8b8'}}).composite(cards).webp({quality:90}).toFile(path.join(out,'catalogue.webp'))
 const land=ids.filter(id=>id!=='divan'&&!coast.has(id))
 for(let batch=0;batch<2;batch++){
  const placements=[['divan',0],...land.slice(batch*24,batch*24+24).map((id,i)=>[id,i+1]),['liman',25],['tersane',26],['korsan_kalesi',28]].sort((a,b)=>PARCEL_PLOTS[a[1]].center.y-PARCEL_PLOTS[b[1]].center.y)
  const layers=[];for(const [id,index]of placements){const s=await sprite(id,index);layers.push({input:s.input,left:s.left,top:s.top})}
  const world=await sharp(terrain).composite(layers).png().toBuffer()
  await sharp(world).resize(1586,992).webp({quality:90}).toFile(path.join(out,`city-${batch+1}.webp`))
 }
 fs.writeFileSync(path.join(out,'coverage.json'),JSON.stringify(audit,null,2)+'\n')
 console.log('Runtime catalogue, two city compositions and '+audit.length+' parcel/direction measurements saved')
}
main().catch(e=>{console.error(e);process.exitCode=1})
