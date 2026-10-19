/** Native asset/geometry proof. These are not browser or gameplay screenshots. */
const fs=require('node:fs'),path=require('node:path'),sharp=require('sharp')
require('tsx/cjs')
const {PARCEL_PLOTS,PARCEL_WORLD,PARCEL_REPAINTED_BUILDINGS,cityBuildingImage,cityArtOutline,parcelArtFrame}=require('../lib/game/city-map/parcel-city.ts')
const root=path.resolve(__dirname,'..'),dest=path.join(root,'docs/mockups/parcel-v2')
async function main(){
 fs.mkdirSync(dest,{recursive:true})
 const terrain=await sharp(path.join(root,'public/images/game/terrain/painted-town-v1/city.webp')).resize(PARCEL_WORLD.w,PARCEL_WORLD.h).png().toBuffer()
 const ids=['divan','kisla',...PARCEL_REPAINTED_BUILDINGS]
 const proof=[]
 for(const id of ids){
  const p=PARCEL_PLOTS[id==='divan'?0:id==='korsan_kalesi'?28:id==='liman'?25:id==='tersane'?26:1]
  const file=path.join(root,'public',cityBuildingImage(id,1,undefined,'full'))
  const m=await sharp(file).metadata(),f=parcelArtFrame(p,m.width,m.height,cityArtOutline(id,1,'full'))
  const w=Math.round(f.width),h=Math.round(f.height)
  const cropW=Math.max(380,p.width+100),cropH=Math.round(cropW*260/380)
  const cut={left:Math.round(p.center.x-cropW/2),top:Math.round(p.center.y-cropH/2),width:cropW,height:cropH}
  const building=await sharp(file).resize(w,h).png().toBuffer()
  const placed=await sharp(terrain).extract(cut).composite([{input:building,left:Math.round(f.left)-cut.left,top:Math.round(f.top)-cut.top}]).png().toBuffer()
  const tile=await sharp(placed).resize(300,205).png().toBuffer()
  const name=Buffer.from(`<svg width="300" height="235"><rect width="300" height="235" fill="#e5d4b2"/><text x="12" y="224" font-family="sans-serif" font-size="15" fill="#49311e">${id}</text></svg>`)
  proof.push({input:await sharp(name).composite([{input:tile,left:0,top:0}]).png().toBuffer(),left:(proof.length%6)*300,top:Math.floor(proof.length/6)*235})
 }
 await sharp({create:{width:1800,height:Math.ceil(ids.length/6)*235,channels:4,background:'#e5d4b2'}}).composite(proof).webp({quality:90}).toFile(path.join(dest,'all-buildings-native.webp'))
 // Two real world compositions, all engine IDs retained; no extra parcel is created.
 for(let batch=0;batch<2;batch++){
  const land=ids.filter(id=>!['divan','liman','tersane','korsan_kalesi'].includes(id)).slice(batch*23,batch*23+23)
  const placements=[['divan',0],...land.map((id,i)=>[id,i+1]),['liman',25],['tersane',26],['korsan_kalesi',28]]
  const layers=[]
  for(const [id,index] of placements){const p=PARCEL_PLOTS[index],file=path.join(root,'public',cityBuildingImage(id,1,undefined,'full')),m=await sharp(file).metadata(),f=parcelArtFrame(p,m.width,m.height,cityArtOutline(id,1,'full'));layers.push({input:await sharp(file).resize(Math.round(f.width),Math.round(f.height)).png().toBuffer(),left:Math.round(f.left),top:Math.round(f.top)})}
  await sharp(await sharp(terrain).composite(layers).png().toBuffer()).resize(1586,992).webp({quality:90}).toFile(path.join(dest,`city-native-${batch+1}.webp`))
 }
 console.log('Native catalogue and two city compositions saved (not browser screenshots)')
}
main().catch(e=>{console.error(e);process.exitCode=1})
