/* Runs the production Canvas ground mapper with native Canvas. The scene
 * composition below is a renderer preview, not a browser screenshot. */
const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm'), assert = require('node:assert/strict')
require('tsx/cjs')
const ts = require('typescript'), sharp = require('sharp')
const { createCanvas, loadImage } = require('@napi-rs/canvas')
const { MASTER_PLOTS, parcelContains } = require('../lib/game/city-map/master-projection.ts')
const { masterCutoutFrame, masterCutoutOutline } = require('../lib/game/city-map/master-cutout.ts')
const root = path.resolve(__dirname, '..'), out = path.join(root, 'docs/mockups/five-buildings')
const source = fs.readFileSync(path.join(root, 'components/game/phaser-master-city.ts'), 'utf8')
const method = source.slice(source.indexOf('  canvasParcel('), source.indexOf('  drawMasterDefense('))
const code = ts.transpileModule('function '+method.trim(), {compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText
const mapper = vm.runInNewContext(code+'\ncanvasParcel', {Math, MASTER_PARCEL_GROUND:{key:'earth'}, Phaser:{Scenes:{Events:{SHUTDOWN:'shutdown'}}}})
;(async () => {
  fs.mkdirSync(out, {recursive:true})
  const earth = await loadImage(path.join(root, 'public/images/game/terrain/parcel-earth-v1.webp'))
  const preview = createCanvas(1536,1024), ctx = preview.getContext('2d')
  ctx.drawImage(await loadImage(path.join(root,'public/images/game/terrain/unified-detail-v3/ne.webp')),0,0)
  const reports = []
  const placements = {medrese:12, depo:8, carsi:4, hamam:9, kisla:1}
  for (const p of MASTER_PLOTS.filter(p=>p.slot.zone==='sehir')) {
    const textures = new Map([['earth',{getSourceImage:()=>earth}]])
    const scene = {textures:{exists:key=>textures.has(key),get:key=>textures.get(key),remove(){},createCanvas(key,w,h){
      const canvas=createCanvas(w,h),t={canvas,context:canvas.getContext('2d'),refresh(){}};textures.set(key,t);return t
    }},events:{once(){}},add:{image(x,y,key){return {key,setDisplaySize(){return this},setData(){return this}}}}}
    const item=mapper.call(scene,p,'earth',false),canvas=textures.get(item.key).canvas
    const data=canvas.getContext('2d').getImageData(0,0,canvas.width,canvas.height).data
    let holes=0,outside=0
    for(let y=0;y<canvas.height;y++)for(let x=0;x<canvas.width;x++){
      const q={x:p.center.x-p.width/2+(x+0.5)/2,y:p.center.y-p.height/2+(y+0.5)/2},a=data[(y*canvas.width+x)*4+3]
      if(parcelContains(p.polygon,q,1)&&a<250)holes++
      if(!parcelContains(p.polygon,q,-1)&&a)outside++
    }
    assert.equal(holes,0,`plot ${p.index}: transparent interior`)
    assert.equal(outside,0,`plot ${p.index}: ground outside raster margin`)
    reports.push({plot:p.index,holes,outside})
    const id=Object.keys(placements).find(id=>placements[id]===p.index)
    if(!id)continue
    ctx.save();ctx.scale(2/3,2/3);ctx.translate(-768*3,0)
    ctx.drawImage(canvas,p.center.x-p.width/2,p.center.y-p.height/2,p.width,p.height)
    const building=await loadImage(path.join(root,`public/images/game/buildings/master-v8/${id}.webp`))
    const f=masterCutoutFrame(p,building.width,building.height,masterCutoutOutline(id,building.width,building.height))
    ctx.drawImage(building,f.left,f.top,f.width,f.height);ctx.restore()
  }
  await sharp(preview.toBuffer('image/png')).webp({quality:90}).toFile(path.join(out,'city-native.webp'))
  fs.writeFileSync(path.join(out,'native-qa.json'),JSON.stringify({renderer:'native Canvas / production ground mapper; not browser',edgeTolerancePixels:1,cases:reports},null,2)+'\n')
  console.log(`${reports.length} land plots: no interior holes; no pixels beyond 1px edge margin`)
})().catch(e=>{console.error(e);process.exitCode=1})
