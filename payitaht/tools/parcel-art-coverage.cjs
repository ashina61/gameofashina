/** A conservative, reproducible art audit for Payitaht's live parcel renderer.
 * An alpha-band width is NOT a surveyed footing; it only prioritizes which
 * architecture needs hand-measured ground contacts and a new sprite.
 * Run from payitaht/: node tools/parcel-art-coverage.cjs
 */
const fs=require('node:fs')
const path=require('node:path')
const sharp=require('sharp')
require('tsx/cjs')
const {PARCEL_PLOTS,PARCEL_REPAINTED_BUILDINGS,cityBuildingImage,cityArtOutline,cityBuildingArtFrame}=require('../lib/game/city-map/parcel-city.ts')

const root=path.resolve(__dirname,'..')
const output=path.join(root,'visual-review/parcel-coverage')
const ids=['divan','kisla',...PARCEL_REPAINTED_BUILDINGS]
const coast=new Set(['liman','tersane','korsan_kalesi'])
const sampleSlots={divan:[0],liman:[25,26,27],tersane:[25,26,27],korsan_kalesi:[28]}
const round=x=>Number(x.toFixed(3))
const samples=id=>sampleSlots[id]??(coast.has(id)?[28]:[1,7,17,23])
async function measure(id,size){
 const file=path.join(root,'public',cityBuildingImage(id,1,undefined,size).split('?')[0])
 const {data,info}=await sharp(file).ensureAlpha().raw().toBuffer({resolveWithObject:true})
 const w=info.width,h=info.height
 let minY=h,maxY=-1,alphaPixels=0
 for(let y=0;y<h;y++)for(let x=0;x<w;x++)if(data[(y*w+x)*info.channels+3]>=8){
  minY=Math.min(minY,y);maxY=Math.max(maxY,y);alphaPixels++
 }
 if(!alphaPixels)throw Error(id+': empty architecture image')
 const bandHeight=Math.max(1,Math.ceil((maxY-minY+1)*.2))
 const bandTop=maxY-bandHeight+1
 let minX=w,maxX=-1,contactCount=0
 for(let y=bandTop;y<=maxY;y++)for(let x=0;x<w;x++)if(data[(y*w+x)*info.channels+3]>=8){
  minX=Math.min(minX,x);maxX=Math.max(maxX,x);contactCount++
 }
 if(!contactCount)throw Error(id+': empty bottom alpha band')
 const outline=cityArtOutline(id,1,size)
 if(!outline||outline.length<3)throw Error(id+': missing alpha outline')
 const slots=samples(id).filter(i=>PARCEL_PLOTS[i]&&PARCEL_PLOTS[i].slot.zone===(coast.has(id)?'liman':'sehir'))
 if(!slots.length)throw Error(id+': no valid sample slot')
 const placements=[]
 for(const index of slots)for(const flip of [false,true]){
  const plot=PARCEL_PLOTS[index]
  const f=cityBuildingArtFrame(id,plot,w,h,outline,flip)
  const lowerBandWorldWidth=(maxX-minX+1)*f.width/w
  const groundXs=f.groundPolygon.map(p=>p.x)
  placements.push({index,flip,lowerAlphaBandToParcelWidth:round(lowerBandWorldWidth/plot.width),
   frameWidth:round(f.width),frameHeight:round(f.height),
   groundPolygonWidthToParcel:round((Math.max(...groundXs)-Math.min(...groundXs))/plot.width)})
 }
 return {id,size,image:[w,h],alphaPixels,lowerAlphaBand:[minX,bandTop,maxX,maxY],
  footContactMeasured:id==='kisla',placements,
  smallestLowerBandRatio:round(Math.min(...placements.map(x=>x.lowerAlphaBandToParcelWidth)))}
}
async function main(){
 fs.mkdirSync(output,{recursive:true})
 const rows=[]
 for(const id of ids){
  const full=await measure(id,'full'),small=await measure(id,'sm')
  rows.push({...full,smallImage:small.image,
   smallLowerBandRatio:small.smallestLowerBandRatio})
 }
 rows.sort((a,b)=>a.smallestLowerBandRatio-b.smallestLowerBandRatio)
 const report={schema:1,kind:'native asset geometry diagnostics — not a gameplay screenshot',
  explanation:'Lower 20% of nontransparent sprite height is an UNVERIFIED contact candidate. Roofs, props and shadows can bias it. Only kisla has manually surveyed ground contact coordinates in 0.120.0. A low ratio prioritizes human art review; it does not prove a defect.',
  currentVersion:'0.120.0',count:rows.length,rows}
 fs.writeFileSync(path.join(output,'audit.json'),JSON.stringify(report,null,2)+'\n')
 const md=['# Payitaht — parcel ground-contact audit','',
  'This is a **triage report**, not a visual approval or a browser render.',
  'All ratios are bottom-alpha-band width divided by the existing painted parcel width.',
  'Only kışla has measured ground contact points. Other numbers are heuristics; do not apply an automatic scale correction.','',
  '| Structure | Minimum band / plot width | Measured contacts? |',
  '|---|---:|---|',...rows.map(r=>`| ${r.id} | ${(r.smallestLowerBandRatio*100).toFixed(1)}% | ${r.footContactMeasured?'Yes':'No'} |`),'',
  'Action: review the lowest-scoring art in the actual Phaser scene, redraw if required, survey contact points from the approved sprite, and only then enable contact-based positioning. Keep roads, saved IDs, and the current map fixed.']
 fs.writeFileSync(path.join(output,'audit.md'),md.join('\n')+'\n')
 console.log('Audited '+rows.length+' building types (full and mobile sprites). Wrote '+output)
}
main().catch(e=>{console.error(e);process.exitCode=1})
