/** Production placement over the unmodified map; native render, not browser QA.
 * Empty / previous / new share precisely the same map pixels and camera. */
const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict')
require('tsx/cjs')
const sharp = require('sharp'), {createCanvas, loadImage} = require('@napi-rs/canvas')
const {MASTER_PLOTS, parcelContains} = require('../lib/game/city-map/master-projection.ts')
const {masterCutoutFrame, masterCutoutOutline} = require('../lib/game/city-map/master-cutout.ts')
const root = path.resolve(__dirname, '..'), out = path.join(root, 'docs/mockups/barracks-camera')
;(async () => {
  fs.mkdirSync(out, {recursive:true})
  const ground = await loadImage(path.join(root, 'public/images/game/terrain/unified-detail-v3/ne.webp'))
  const p = MASTER_PLOTS.find(p => p.index === 1), cases = []
  for (const version of ['empty', 'master-v9', 'master-v10']) {
    const c = createCanvas(1536,1024), ctx = c.getContext('2d')
    ctx.drawImage(ground,0,0)
    const before = ctx.getImageData(0,0,1536,1024).data
    if (version !== 'empty') {
      const file = path.join(root, `public/images/game/buildings/${version}/kisla.webp`)
      const a = await loadImage(file), m = await sharp(file).metadata()
      let outline = masterCutoutOutline('kisla',m.width,m.height)
      if (version === 'master-v9') {
        // Keep the old measured contour beside its old pixels for comparison.
        outline = JSON.parse(fs.readFileSync(path.join(root, 'docs/barracks-v9-outline.json')))[`${m.width}x${m.height}`].map(([x,y])=>({x,y}))
      }
      const f = masterCutoutFrame(p,m.width,m.height,outline)
      ctx.save(); ctx.scale(2/3,2/3); ctx.translate(-2304,0)
      ctx.drawImage(a,f.left,f.top,f.width,f.height); ctx.restore()
      const after = ctx.getImageData(0,0,1536,1024).data
      let outsideChanges = 0
      for (let y=550;y<840;y++) for (let x=100;x<620;x++) {
        if (parcelContains(p.polygon,{x:x*1.5+2304,y:y*1.5})) continue
        const i=(y*1536+x)*4
        if (before[i]!==after[i] || before[i+1]!==after[i+1] || before[i+2]!==after[i+2]) outsideChanges++
      }
      assert.equal(outsideChanges,0,version+': modified road or neighbouring plot')
      cases.push({version,outsideChanges,frame:f})
    }
    await sharp(c.toBuffer('image/png')).extract({left:100,top:550,width:520,height:290}).webp({quality:92}).toFile(path.join(out,`${version}.webp`))
  }
  fs.writeFileSync(path.join(out,'placement.json'),JSON.stringify({plot:1,renderer:'native Canvas, not a browser screenshot',cases},null,2)+'\n')
})().catch(e=>{console.error(e);process.exitCode=1})
