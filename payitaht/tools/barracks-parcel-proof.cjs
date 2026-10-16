/** Native render of the production UV mapping; not a browser screenshot. */
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict')
require('tsx/cjs')
const sharp=require('sharp'),{createCanvas,loadImage}=require('@napi-rs/canvas')
const {MASTER_PLOTS,parcelContains}=require('../lib/game/city-map/master-projection.ts')
const {masterCutoutFrame,masterCutoutOutline}=require('../lib/game/city-map/master-cutout.ts')
const {masterCutoutQuad,cutoutQuadMesh,cutoutTriangleMatrix}=require('../lib/game/city-map/master-cutout-quad.ts')
const root=path.resolve(__dirname,'..'),out=path.join(root,'docs/mockups/barracks-parcel')
;(async()=>{
 fs.mkdirSync(out,{recursive:true})
 const ground=await loadImage(path.join(root,'public/images/game/terrain/unified-detail-v3/ne.webp')),p=MASTER_PLOTS.find(p=>p.index===1),cases=[]
 for(const variant of ['empty','before','after']){
  const c=createCanvas(1536,1024),ctx=c.getContext('2d');ctx.drawImage(ground,0,0)
  const before=ctx.getImageData(0,0,1536,1024).data
  if(variant!=='empty'){
   const version=variant==='before'?'master-v10':'master-v11',file=path.join(root,`public/images/game/buildings/${version}/kisla.webp`),a=await loadImage(file),m=await sharp(file).metadata()
   const outline=variant==='before'?JSON.parse(fs.readFileSync(path.join(root,'docs/barracks-v10-outline.json')))[`${m.width}x${m.height}`].map(([x,y])=>({x,y})):masterCutoutOutline('kisla',m.width,m.height)
   ctx.save();ctx.scale(2/3,2/3);ctx.translate(-2304,0)
   if(variant==='before'){
    const f=masterCutoutFrame(p,m.width,m.height,outline);ctx.drawImage(a,f.left,f.top,f.width,f.height)
   }else{
    const quad=masterCutoutQuad(p,outline),mesh=cutoutQuadMesh(quad.uv,p.polygon),uv=mesh.uv.map(q=>({x:q.x*m.width,y:q.y*m.height}))
    // Work in terrain pixels so setTransform does not erase the map camera.
    const target=mesh.vertices.map(q=>({x:q.x*2/3-1536,y:q.y*2/3}))
    ctx.restore();ctx.save()
    for(let i=0;i<mesh.indices.length;i+=3){
     const ids=mesh.indices.slice(i,i+3),[d,e,f]=ids.map(j=>target[j])
     ctx.save();ctx.beginPath();ctx.moveTo(d.x,d.y);ctx.lineTo(e.x,e.y);ctx.lineTo(f.x,f.y);ctx.closePath();ctx.clip()
     ctx.setTransform(...cutoutTriangleMatrix(uv,target,ids));ctx.drawImage(a,0,0);ctx.restore()
    }
   }
   ctx.restore()
   const after=ctx.getImageData(0,0,1536,1024).data;let roadChanges=0
   for(let y=550;y<840;y++)for(let x=100;x<620;x++){
    if(parcelContains(p.polygon,{x:x*1.5+2304,y:y*1.5},-1.5))continue
    const i=(y*1536+x)*4;if(before[i]!==after[i]||before[i+1]!==after[i+1]||before[i+2]!==after[i+2])roadChanges++
   }
   assert.equal(roadChanges,0,variant+': road pixels changed');cases.push({variant,roadChanges})
  }
  await sharp(c.toBuffer('image/png')).extract({left:100,top:550,width:520,height:290}).webp({quality:94}).toFile(path.join(out,variant+'.webp'))
 }
 fs.writeFileSync(path.join(out,'qa.json'),JSON.stringify({renderer:'native Canvas',plot:1,cases},null,2)+'\n')
 console.log(JSON.stringify(cases))
})().catch(e=>{console.error(e);process.exitCode=1})
