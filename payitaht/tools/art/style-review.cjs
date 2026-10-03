/** G0: current React art vs. generated approval sheet; never changes game art. */
const fs = require('node:fs')
const path = require('node:path')
const http = require('node:http')
require('tsx/cjs')
const React = require('react')
global.React = React
const { renderToStaticMarkup } = require('react-dom/server')
const { chromium } = require('playwright')
const { reviewWebp } = require('../lib/review-webp.cjs')
const { UnitFigure } = require('../../components/game/unit-art.tsx')
const { AdvisorPortrait } = require('../../components/game/advisor-portraits.tsx')
const { AkceArt, KeresteArt, TasArt } = require('../../components/game/resource-art.tsx')
const { GameButton } = require('../../components/game/game-button.tsx')
const ROOT = path.resolve(__dirname, '../..')
const OUT = path.join(ROOT, 'visual-review/G0')
const h = React.createElement
const render = (component, props) => renderToStaticMarkup(h(component, props))
const cssDir = path.join(ROOT, 'out/_next/static/chunks')
const css = fs.readdirSync(cssDir).filter(f => f.endsWith('.css')).map(f => fs.readFileSync(path.join(cssDir, f), 'utf8')).join('\n')
const img = (src, w, height) => `<img alt="" src="${src}" style="width:${w}px;height:${height}px;object-fit:contain">`
const before = `<main class="review"><div class="building">${img('/public/images/game/buildings/divan-painted-1.webp', 760, 660)}</div><div class="troop">${render(UnitFigure, { id: 'yeniceri', size: 360, bare: true })}</div><div class="advisor">${render(AdvisorPortrait, { id: 'city', size: 320 })}</div><div class="resources">${[AkceArt, KeresteArt, TasArt].map(c => render(c, { width: 180, height: 180 })).join('')}</div><div class="button">${render(GameButton, { size: 'lg', 'aria-label': 'Düğme stili' })}</div><div class="tree">${img('/public/images/game/decor/olive-tree.png', 290, 330)}</div></main>`
const after = '<img alt="" src="/docs/stil-sayfasi.webp" style="width:1536px;height:1024px;display:block">'
const sheet = content => `<!doctype html><html lang="tr"><meta charset="utf-8"><title>G0 stil incelemesi</title><style>${css}\nhtml,body{margin:0;width:1536px;height:1024px;background:#f8f0de;overflow:hidden}.review{width:1536px;height:1024px;position:relative}.review>div{position:absolute;display:flex;align-items:center;justify-content:center}.building{left:20px;top:20px}.troop{left:790px;top:40px;width:310px;height:620px}.advisor{left:1120px;top:70px;width:390px;height:590px}.resources{left:20px;top:720px;gap:70px;height:240px}.button{left:850px;top:760px;width:350px;height:160px}.button .gbtn{width:350px;height:95px}.tree{left:1220px;top:650px}</style>${content}</html>`
async function main() {
  fs.mkdirSync(OUT, { recursive: true })
  const server = http.createServer((req, res) => {
    if (req.url === '/before' || req.url === '/after') { res.setHeader('Content-Type', 'text/html'); res.end(sheet(req.url === '/before' ? before : after)); return }
    const file = path.resolve(ROOT, '.' + req.url)
    if (!file.startsWith(ROOT + path.sep) || !fs.existsSync(file)) { res.writeHead(404); res.end(); return }
    res.setHeader('Content-Type', file.endsWith('.webp') ? 'image/webp' : 'image/png')
    fs.createReadStream(file).pipe(res)
  })
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve))
  let browser
  try {
    browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] })
    const page = await browser.newPage({ viewport: { width: 1536, height: 1024 }, deviceScaleFactor: 1 })
    const errors = []
    page.on('pageerror', e => errors.push(e.message))
    for (const phase of ['before', 'after']) {
      await page.goto(`http://127.0.0.1:${server.address().port}/${phase}`)
      await page.evaluate(() => Promise.all([...document.images].map(im => im.decode())))
      await reviewWebp(await page.screenshot({ type: 'png', animations: 'disabled' }), path.join(OUT, phase, 'style-sheet.webp'))
    }
    if (errors.length) throw new Error(errors.join('\n'))
    console.log('G0 style review: current React samples + generated style sheet captured.')
  } finally { if (browser) await browser.close(); server.close() }
}
main().catch(e => { console.error(e); process.exitCode = 1 })
