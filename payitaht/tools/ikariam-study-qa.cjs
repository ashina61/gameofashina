/** Native Canvas proof, not a browser screenshot or an aesthetic approval. */
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict')
const {pathToFileURL}=require('node:url')
const {createCanvas,loadImage}=require('@napi-rs/canvas')
const sharp=require('sharp')
const root=path.resolve(__dirname,'..'),out=path.join(root,'docs/mockups/painted-parcel')
;(async()=>{
 const {scene}=await import(pathToFileURL(path.join(root,'public/prototypes/ikariam-study-v1/renderer.mjs')))
 const {ART_FRAME,ART_SIZE}=await import(pathToFileURL(path.join(root,'public/prototypes/ikariam-study-v1/art.mjs')))
 const file=path.join(root,'public/images/game/buildings/parcel-v1/kisla.webp'),artwork=await loadImage(file)
 const {data:pixels,info}=await sharp(file).ensureAlpha().raw().toBuffer({resolveWithObject:true})
 fs.mkdirSync(out,{recursive:true})
 assert.equal(info.width,ART_SIZE.width);assert.equal(info.height,ART_SIZE.height)
 assert.ok(Math.abs(ART_FRAME.width/info.width-ART_FRAME.height/info.height)<1e-9,'Sprite aspect ratio was changed')
 let visiblePixels=0,transparentPixels=0
 for(let y=0;y<info.height;y++)for(let x=0;x<info.width;x++){
  if(!pixels[(y*info.width+x)*4+3]){transparentPixels++;continue}
  visiblePixels++
  const px=ART_FRAME.left+x/info.width*ART_FRAME.width,py=ART_FRAME.top+y/info.height*ART_FRAME.height
  const u=(px/28+py/14)/2,v=(py/14-px/28)/2
  assert.ok(u>=0&&v>=0&&u<=12&&v<=12,'Visible artwork crossed the complete plot')
 }
 assert.ok(transparentPixels>info.width*info.height*.4,'Ground transparency lost')
 const probes=[[.48,.55],[.47,.59],[.60,.52],[.40,.62],[.58,.60]]
 for(const [x,y] of probes)assert.equal(pixels[(Math.round(y*info.height)*info.width+Math.round(x*info.width))*4+3],0,'Courtyard has a baked floor')
 function render(width,height,settings){const c=createCanvas(width,height),layout=scene(c.getContext('2d'),{width,height,artwork,...settings});return {c,layout,data:c.getContext('2d').getImageData(0,0,width,height).data}}
 const qa=[]
 for(const width of [360,390,430,1100])for(const grass of [true,false]){
  const height=width===1100?650:380,a=render(width,height,{grass,building:false}),b=render(width,height,{grass})
  let outsideChanges=0,changed=0
  for(let y=0;y<height;y++)for(let x=0;x<width;x++){
   const i=(y*width+x)*4;if(a.data[i]===b.data[i]&&a.data[i+1]===b.data[i+1]&&a.data[i+2]===b.data[i+2])continue
   changed++
   const px=(x-width/2)/b.layout.ratio,py=(y-height/2)/b.layout.ratio+183
   const wx=(px/28+py/14)/2,wy=(py/14-px/28)/2
   if(wx<-.1||wy<-.1||wx>12.1||wy>12.1)outsideChanges++
  }
  assert.ok(changed>1000);assert.equal(outsideChanges,0,'Architecture or shadow changed surrounding roads')
  let groundSamples=0
  for(const [sx,sy] of probes){
   const px=ART_FRAME.left+sx*ART_FRAME.width,py=ART_FRAME.top+sy*ART_FRAME.height,x=Math.round(width/2+px*b.layout.ratio),y=Math.round(height/2+(py-183)*b.layout.ratio)
   for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){
    const i=((y+dy)*width+x+dx)*4
    assert.deepEqual([...a.data.slice(i,i+4)],[...b.data.slice(i,i+4)],'Courtyard painted over shared land');groundSamples++
   }
  }
  qa.push({width,height,grass,changed,outsideChanges,unchangedGroundSamples:groundSamples})
 }
 for(const [name,settings] of Object.entries({barracks:{},empty:{building:false},earth:{grass:false},guides:{guides:true},wide:{detail:false},mobile:{width:360,height:380}})){
  const width=settings.width||1100,height=settings.height||650,{c}=render(width,height,settings)
  await sharp(c.toBuffer('image/png')).webp({quality:92}).toFile(path.join(out,name+'.webp'))
 }
 fs.writeFileSync(path.join(out,'qa.json'),JSON.stringify({renderer:'Native Canvas; not browser UI',visiblePixels,transparentPixels,artFrame:ART_FRAME,qa},null,2)+'\n')
 console.log(JSON.stringify({visiblePixels,transparentPixels,artFrame:ART_FRAME,qa}))
})().catch(e=>{console.error(e);process.exitCode=1})
