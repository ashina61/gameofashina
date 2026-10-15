/* Native Canvas check of the production canvasParcel method and real assets.
 * Not a browser/WebGL or device test. Run with runtime dependencies on NODE_PATH. */
const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm'), assert = require('node:assert/strict')
require('tsx/cjs')
const ts = require('typescript')
const { createCanvas, loadImage } = require('@napi-rs/canvas')
const { MASTER_PLOTS, masterBuildingPlot, parcelContains } = require('../lib/game/city-map/master-projection.ts')
const { masterCutoutFrame, masterCutoutOutline } = require('../lib/game/city-map/master-cutout.ts')
const root = path.resolve(__dirname, '..')
const output = process.env.COURTYARD_QA_OUT || path.join(root, 'docs/mockups/shared-courtyard')
const source = fs.readFileSync(path.join(root, 'components/game/phaser-master-city.ts'), 'utf8')
const method = source.slice(source.indexOf('  canvasParcel('), source.indexOf('  drawMasterDefense('))
const code = ts.transpileModule('function ' + method.trim(), { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText
const native = vm.runInNewContext(code + '\ncanvasParcel', { Math, MASTER_COURTYARD: { key: 'ground' }, Phaser: { Scenes: { Events: { SHUTDOWN: 'shutdown' } } } })

;(async () => {
  fs.mkdirSync(output, { recursive: true })
  const ground = await loadImage(path.join(root, 'public/images/game/terrain/parcel-courtyard-v1.webp'))
  const building = await loadImage(path.join(root, 'public/images/game/buildings/master-v7/kisla.webp'))
  const report = []
  for (const original of MASTER_PLOTS.filter(p => p.slot.zone === 'sehir')) {
    const p = original, textures = new Map([['ground', { getSourceImage: () => ground }]])
    const scene = {
      textures: { exists: key => textures.has(key), get: key => textures.get(key), remove() {}, createCanvas(key, w, h) {
        const canvas = createCanvas(w, h), item = { context: canvas.getContext('2d'), canvas, refresh() {} }
        textures.set(key, item); return item
      } },
      events: { once() {} }, add: { image(x, y, key) { return { x, y, key, setDisplaySize() { return this }, setData() { return this } } } },
    }
    const result = native.call(scene, p, 'ground', false)
    const canvas = textures.get(result.key).canvas, ctx = canvas.getContext('2d')
    const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data
    let uncovered = 0, outside = 0
    for (let y = 0; y < canvas.height; y++) for (let x = 0; x < canvas.width; x++) {
      const q = { x: p.center.x - p.width / 2 + (x + 0.5) / 2, y: p.center.y - p.height / 2 + (y + 0.5) / 2 }
      const alpha = data[(y * canvas.width + x) * 4 + 3]
      if (parcelContains(p.polygon, q, 1) && alpha < 250) uncovered++
      if (!parcelContains(p.polygon, q, -1) && alpha > 0) outside++
    }
    assert.equal(uncovered, 0, `plot ${p.index}: uncovered courtyard pixels`)
    assert.equal(outside, 0, `plot ${p.index}: ground outside parcel`)
    report.push({ plot: p.index, uncoveredPixels: uncovered, outsidePixels: outside })
    if (p.index === 1) {
      const preview = createCanvas(1000, 520), c = preview.getContext('2d')
      const tile = await loadImage(path.join(root, 'public/images/game/terrain/unified-detail-v3/ne.webp'))
      // Master image crop x=800,y=280,w=285,h=145, upscaled for inspection.
      c.drawImage(tile, 64, 560, 570, 290, 0, 0, 1000, 520)
      const sx = 1000 / (285 * 3), sy = 520 / (145 * 3)
      c.save(); c.scale(sx, sy); c.translate(-800 * 3, -280 * 3)
      c.drawImage(canvas, p.center.x - p.width / 2, p.center.y - p.height / 2, p.width, p.height)
      const f = masterCutoutFrame(masterBuildingPlot(p), building.width, building.height, masterCutoutOutline('kisla', building.width, building.height))
      c.drawImage(building, f.left, f.top, f.width, f.height); c.restore()
      await require('sharp')(preview.toBuffer('image/png')).webp({ quality: 90 }).toFile(path.join(output, 'barracks-courtyard.webp'))
    }
  }
  fs.writeFileSync(path.join(output, 'native-qa.json'), JSON.stringify({ renderer: 'production Canvas fallback in native Canvas; not browser', cases: report }, null, 2))
  console.log(`${report.length} land parcels: no uncovered interior pixels; no pixels beyond the 1px antialiasing margin`)
})().catch(e => { console.error(e); process.exitCode = 1 })
