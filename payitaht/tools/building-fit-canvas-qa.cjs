/* Run with @napi-rs/canvas on NODE_PATH. Executes the actual trial page's drawing code.
 * Regression: ground, sprite, approach and debug line must not change road pixels.
 * Native Canvas verification; does not claim browser UI coverage. */
const fs = require('node:fs')
const path = require('node:path')
const vm = require('node:vm')
const assert = require('node:assert/strict')
const { createCanvas, Image: NativeImage } = require('@napi-rs/canvas')
const root = path.resolve(__dirname, '..')
const output = process.env.BUILDING_FIT_QA_OUT || path.join(root, 'visual-review/building-fit-boundary')
const source = process.env.BUILDING_FIT_SOURCE || path.join(root, 'public/building-fit.html')
const code = fs.readFileSync(source, 'utf8').match(/<script>([\s\S]*?)<\/script>/)[1]
fs.mkdirSync(output, { recursive: true })
const report = []

async function run(width) {
  const height = 600, ratio = 2, native = createCanvas(width * ratio, height * ratio)
  const ctx = native.getContext('2d'), buttons = {}, loadedImages = []
  const canvas = {
    clientWidth: width, clientHeight: height,
    getBoundingClientRect: () => ({ width, height }), getContext: () => ctx,
    get width() { return native.width }, set width(value) { native.width = value },
    get height() { return native.height }, set height(value) { native.height = value },
  }
  class LocalImage extends NativeImage {
    constructor() { super(); loadedImages.push(this) }
    set src(value) { super.src = path.join(root, 'public', value) }
  }
  const environment = {
    Image: LocalImage, devicePixelRatio: ratio, console, Promise, Math, Map,
    window: { addEventListener() {} },
    document: {
      createElement: () => createCanvas(1, 1),
      querySelector: key => key === 'canvas' ? canvas : key === '#status' ? {} : (buttons[key] ??= { setAttribute() {} }),
    },
  }
  vm.createContext(environment)
  vm.runInContext(code, environment)
  for (let i = 0; i < 100 && !environment.window.__buildingFit?.ready; i++) await new Promise(resolve => setTimeout(resolve, 20))
  assert(environment.window.__buildingFit?.ready, 'Images did not load')
  const data = () => environment.window.__buildingFit
  const pixels = () => ctx.getImageData(0, 0, native.width, native.height).data
  for (const zoom of ['near', 'closer', 'overview']) {
    buttons['#home'].onclick()
    if (zoom === 'closer') buttons['#plus'].onclick()
    if (zoom === 'overview') buttons['#all'].onclick()
    buttons['#original'].onclick()
    const baseline = pixels()
    if (zoom === 'near') fs.writeFileSync(path.join(output, `original-${width}.png`), native.toBuffer('image/png'))
    for (const mode of ['soil', 'building', 'outline']) {
      if (mode === 'soil') buttons['#before'].onclick()
      if (mode === 'building') buttons['#after'].onclick()
      if (mode === 'outline') buttons['#outline'].onclick()
      const current = pixels(), fit = data(), p = fit.polygon
      const screen = ([x, y]) => [(x - fit.view.x) * fit.view.scale * ratio + native.width / 2, (y - fit.view.y) * fit.view.scale * ratio + native.height / 2]
      const [left, top] = screen(p[0]), [right, bottom] = screen(p[2])
      let changed = 0, outside = 0
      for (let y = 0; y < native.height; y++) for (let x = 0; x < native.width; x++) {
        const i = (y * native.width + x) * 4
        if (current[i] === baseline[i] && current[i + 1] === baseline[i + 1] && current[i + 2] === baseline[i + 2]) continue
        changed++
        // Include only the raster coverage of this rectangle (fractional edge antialiasing).
        if (x < Math.floor(left) || x >= Math.ceil(right) || y < Math.floor(top) || y >= Math.ceil(bottom)) outside++
      }
      assert(changed > 0, 'No visible test output')
      assert.equal(outside, 0, `${width}/${zoom}/${mode}: ${outside} pixels changed outside the displayed plot`)
      const f = fit.buildingFrame
      assert(f && f.x >= p[0][0] && f.y >= p[0][1] && f.x + f.width <= p[2][0] && f.y + f.height <= p[2][1], 'Complete sprite canvas exceeds the plot')
      assert(Math.abs(f.width / f.height - loadedImages[5].naturalWidth / loadedImages[5].naturalHeight) < 1e-12, 'Sprite aspect ratio changed')
      if (zoom === 'near') fs.writeFileSync(path.join(output, `${mode}-${width}.png`), native.toBuffer('image/png'))
      report.push({ width, zoom, mode, changedPixels: changed, outsidePlotPixels: outside, wholeSpriteInside: true })
    }
    buttons['#outline'].onclick()
  }
}
;(async () => {
  for (const width of [360, 390, 430]) await run(width)
  fs.writeFileSync(path.join(output, 'qa.json'), JSON.stringify(report, null, 2))
  console.log(`${report.length} rendered cases passed; outside plot pixels: 0`)
})().catch(error => { console.error(error); process.exitCode = 1 })
