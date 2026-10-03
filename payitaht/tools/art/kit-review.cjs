/** G1: real components and CSS at narrow/wide nine-slice dimensions. */
const fs = require('node:fs')
const path = require('node:path')
const http = require('node:http')
require('tsx/cjs')
const React = require('react')
const { renderToStaticMarkup } = require('react-dom/server')
const { chromium } = require('playwright')
const { paintedUiStyle } = require('../../lib/painted-ui.ts')
const { GameButton } = require('../../components/game/game-button.tsx')
const { reviewWebp } = require('../lib/review-webp.cjs')
const ROOT = path.resolve(__dirname, '../..')
const OUT = path.join(ROOT, 'visual-review/G1/after')
const cssDir = path.join(ROOT, 'out/_next/static/chunks')
const css = fs.readdirSync(cssDir).filter(f => f.endsWith('.css')).map(f => fs.readFileSync(path.join(cssDir, f), 'utf8')).join('\n')
const buttons = [96, 180, 300].map(width => ['default', 'outline', 'destructive'].map(variant => renderToStaticMarkup(React.createElement(GameButton, { variant, style: { width }, children: 'İnşa et' }))).join('')).join('')
const content = renderToStaticMarkup(React.createElement('main', { style: paintedUiStyle, dangerouslySetInnerHTML: { __html: `<div class="bp-box"><h2 class="bp-box-title">Sabit köşe · uzatılabilir orta</h2><div class="bp-box-body">${buttons}<span class="sk-meter"><span style="width:65%"></span><b>650 / 1000</b></span></div></div>` } }))
async function main() {
  fs.mkdirSync(OUT, { recursive: true })
  const server = http.createServer((req, res) => {
    if (req.url === '/') { res.setHeader('Content-Type', 'text/html'); res.end(`<!doctype html><html lang="tr"><meta charset="utf-8"><style>${css}\nbody{padding:16px;background:#f3e2b9}.bp-box-body{align-items:flex-start;gap:12px}.bp-box{max-width:1050px}.sk-meter{width:100%}</style>${content}</html>`); return }
    const file = path.resolve(ROOT, 'public', '.' + req.url)
    if (!file.startsWith(path.join(ROOT, 'public') + path.sep) || !fs.existsSync(file)) { res.writeHead(404); res.end(); return }
    res.setHeader('Content-Type', 'image/webp'); fs.createReadStream(file).pipe(res)
  })
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve))
  let browser
  try {
    browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] })
    const page = await browser.newPage()
    const missing = []
    page.on('response', r => { if (r.status() >= 400) missing.push(r.url()) })
    for (const width of [390, 1100]) {
      await page.setViewportSize({ width, height: 850 })
      await page.goto(`http://127.0.0.1:${server.address().port}/`)
      await page.waitForTimeout(300)
      const bad = await page.locator('.gbtn').evaluateAll(buttons => buttons.filter(b => b.getBoundingClientRect().height < 44 || getComputedStyle(b).borderImageSource === 'none').length)
      if (bad || missing.length) throw new Error('Nine-slice kit failed: missing image or touch target')
      await reviewWebp(await page.screenshot({ type: 'png' }), path.join(OUT, `nine-slice-${width}.webp`))
    }
    console.log('G1 nine-slice: 96/180/300px buttons, 390/1100px panels, image loads and 44px targets pass.')
  } finally { if (browser) await browser.close(); server.close() }
}
main().catch(e => { console.error(e); process.exitCode = 1 })
