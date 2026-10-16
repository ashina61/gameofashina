/** Native Canvas proof, not a browser screenshot or an aesthetic approval. */
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict')
const {pathToFileURL}=require('node:url')
const {createCanvas}=require('@napi-rs/canvas')
const sharp=require('sharp')
const root=path.resolve(__dirname,'..'),out=path.join(root,'docs/mockups/ikariam-study')
;(async()=>{
 const {scene,barracks,project}=await import(pathToFileURL(path.join(root,'public/prototypes/ikariam-study-v1/renderer.mjs')))
 fs.mkdirSync(out,{recursive:true})
 const faces=barracks(),points=faces.flatMap(f=>f.points)
 // Inverse of the camera applied to elevated geometry: z consumes real room.
 for(const [x,y,z=0] of points){assert.ok(x-z>=0&&y-z>=0&&x-z<=12&&y-z<=12,'Architecture crossed the complete projected plot')}
 assert.ok(faces.every(f=>f.points.some(p=>(p[2]||0)>0)),'A ground face was added to the building')
 function render(width,height,settings){const c=createCanvas(width,height),layout=scene(c.getContext('2d'),{width,height,...settings});return {c,layout,data:c.getContext('2d').getImageData(0,0,width,height).data}}
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
  for(const [wx,wy] of [[6.4,7.5],[6.4,8],[6.9,8],[6.9,8.5]]){
   const [px,py]=project([wx,wy]),x=Math.round(width/2+px*b.layout.ratio),y=Math.round(height/2+(py-183)*b.layout.ratio)
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
 fs.writeFileSync(path.join(out,'qa.json'),JSON.stringify({renderer:'Native Canvas; not browser UI',faces:faces.length,vertices:points.length,qa},null,2)+'\n')
 console.log(JSON.stringify({faces:faces.length,vertices:points.length,qa}))
})().catch(e=>{console.error(e);process.exitCode=1})
