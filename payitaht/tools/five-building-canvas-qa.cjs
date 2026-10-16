/** Native composition proof: only alpha architecture is drawn over the real
 * city painting. This is not a browser screenshot; browser QA is separate. */
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict')
require('tsx/cjs')
const sharp=require('sharp'),{createCanvas,loadImage}=require('@napi-rs/canvas')
const {MASTER_PLOTS,parcelContains}=require('../lib/game/city-map/master-projection.ts')
const {masterCutoutFrame,masterCutoutOutline}=require('../lib/game/city-map/master-cutout.ts')
const {masterBuildingImage}=require('../lib/game/city-map/master-building-art.ts')
const root=path.resolve(__dirname,'..'),out=path.join(root,'docs/mockups/groundless-buildings')
;(async()=>{
 fs.mkdirSync(out,{recursive:true});const canvas=createCanvas(1536,1024),ctx=canvas.getContext('2d')
 ctx.drawImage(await loadImage(path.join(root,'public/images/game/terrain/unified-detail-v3/ne.webp')),0,0)
 const report=[],positions={medrese:12,depo:8,carsi:4,hamam:9,kisla:1}
 for(const [id,index] of Object.entries(positions)){
  const file=path.join(root,'public',masterBuildingImage(id,1,undefined,'full'))
  const image=await loadImage(file),{data,info}=await sharp(file).ensureAlpha().raw().toBuffer({resolveWithObject:true})
  const outline=masterCutoutOutline(id,info.width,info.height),p=MASTER_PLOTS.find(p=>p.index===index)
  let openPixels=0
  for(let y=0;y<info.height;y+=2)for(let x=0;x<info.width;x+=2){
   if(data[(y*info.width+x)*4+3]===0&&parcelContains(outline,{x:(x+.5)/info.width,y:(y+.5)/info.height},.025))openPixels++
  }
  assert(openPixels>info.width*info.height*.001,`${id}: no interior transparency`)
  const before=ctx.getImageData(0,0,1536,1024).data
  const f=masterCutoutFrame(p,info.width,info.height,outline)
  ctx.save();ctx.scale(2/3,2/3);ctx.translate(-768*3,0);ctx.drawImage(image,f.left,f.top,f.width,f.height);ctx.restore()
  const after=ctx.getImageData(0,0,1536,1024).data
  let sampled=0,changed=0
  // Safe fully transparent source neighbourhoods must reveal the exact old map.
  for(let y=0;y<1024;y++)for(let x=0;x<1536;x++){
   const wx=x*1.5+768*3,wy=y*1.5
   if(!parcelContains(p.polygon,{x:wx,y:wy},3))continue
   const sx=Math.floor((wx-f.left)/f.width*info.width),sy=Math.floor((wy-f.top)/f.height*info.height)
   if(sx<5||sy<5||sx>=info.width-5||sy>=info.height-5)continue
   if(!parcelContains(outline,{x:sx/info.width,y:sy/info.height},.025))continue
   let clear=true;for(let yy=sy-4;yy<=sy+4&&clear;yy++)for(let xx=sx-4;xx<=sx+4;xx++)if(data[(yy*info.width+xx)*4+3]){clear=false;break}
   if(!clear)continue
   sampled++;const k=(y*1536+x)*4;if(before[k]!==after[k]||before[k+1]!==after[k+1]||before[k+2]!==after[k+2])changed++
  }
  assert(sampled>10,`${id}: no ground-through samples`);assert.equal(changed,0,`${id}: map changed under transparent ground`)
  report.push({id,interiorAlphaSamples:openPixels,groundThroughSamples:sampled,changedMapPixels:changed})
 }
 await sharp(canvas.toBuffer('image/png')).webp({quality:90}).toFile(path.join(out,'city-native.webp'))
 fs.writeFileSync(path.join(out,'native-qa.json'),JSON.stringify({renderer:'native Canvas; architecture only, original map underneath',cases:report},null,2)+'\n')
 console.log(JSON.stringify(report))
})().catch(e=>{console.error(e);process.exitCode=1})
