/** G2: actual icon components at 24px on both requested backgrounds. */
const fs = require('node:fs')
const path = require('node:path')
const http = require('node:http')
require('tsx/cjs')
const React = require('react')
const { renderToStaticMarkup } = require('react-dom/server')
const { chromium } = require('playwright')
const { reviewWebp } = require('../lib/review-webp.cjs')
const resource = require('../../components/game/resource-art.tsx')
const ui = require('../../components/game/ui-art.tsx')
const ROOT = path.resolve(__dirname, '../..')
const phase = process.argv[2] || 'after'
if (!['before', 'after'].includes(phase)) throw new Error('Use before or after')
const items = [['akce', resource.AkceArt], ['kereste', resource.KeresteArt], ['ilim', resource.IlimArt], ['kahve', resource.KahveArt], ['mermer', resource.MermerArt], ['kristal', resource.KristalArt], ['kukurt', resource.KukurtArt], ['nufus', resource.NufusArt], ['sefer', resource.HamleArt], ['huzur', resource.HuzurArt], ['yolsuzluk', resource.YolsuzlukArt], ['city', ui.Castle], ['island', ui.TreePalm], ['map', ui.Compass], ['alliance', ui.Shield], ['objectives', ui.ScrollText], ['flag', ui.Flag], ['harbour', ui.Anchor], ['divan', ui.Landmark], ['offer', ui.Gift]]
const cells = items.map(([name, component]) => `<div class="cell" data-name="${name}"><div class="art">${component ? renderToStaticMarkup(React.createElement(component, { width: 24, height: 24, size: 24, ...(['city','island','map','alliance','objectives','flag','harbour','divan','offer'].includes(name) ? { painted: true } : {}), 'aria-hidden': true })) : '<span>—</span>'}</div><small>${name}</small></div>`).join('')
const cssDir = path.join(ROOT, 'out/_next/static/chunks')
const css = fs.readdirSync(cssDir).filter(f => f.endsWith('.css')).map(f => fs.readFileSync(path.join(cssDir, f), 'utf8')).join('\n')
const sheet = `<!doctype html><html lang="tr"><meta charset="utf-8"><style>${css}\nbody{margin:0;padding:20px;background:#ded1b7;font-family:system-ui}main{display:grid;grid-template-columns:1fr 1fr;gap:16px}.sheet{padding:16px}.dark{background:#2a1a0e;color:#f3e2b9}.parch{background:#f3e2b9;color:#2a1a0e}.grid{display:grid;grid-template-columns:repeat(7,1fr);gap:14px 6px}.cell{text-align:center}.art{display:grid;place-items:center;height:40px}.art img,.art svg{width:24px;height:24px}.cell small{font-size:11px}.painted-ui-icon{background-image:url('/images/game/ui/medal-frame.webp')}h1{font-size:16px;margin:0 0 12px}h2{font-size:14px;margin:0 0 12px}</style><h1>G2 · 24 px · ${phase}</h1><main><section class="sheet dark"><h2>#2a1a0e</h2><div class="grid">${cells}</div></section><section class="sheet parch"><h2>#f3e2b9</h2><div class="grid">${cells}</div></section></main></html>`
async function main() {
  const out = path.join(ROOT, `visual-review/G2/revision/${phase}`)
  fs.mkdirSync(out, { recursive: true })
  const server = http.createServer((req, res) => {
    if (req.url === '/') { res.setHeader('Content-Type', 'text/html'); res.end(sheet); return }
    const file = path.resolve(ROOT, 'public', '.' + new URL(req.url, 'http://localhost').pathname)
    if (!file.startsWith(path.join(ROOT, 'public') + path.sep) || !fs.existsSync(file)) { res.writeHead(404); res.end(); return }
    res.setHeader('Content-Type', 'image/webp'); fs.createReadStream(file).pipe(res)
  })
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve))
  let browser
  try {
    browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] })
    const page = await browser.newPage({ viewport: { width: 1100, height: 380 }, deviceScaleFactor: 1 })
    const missing = []
    page.on('response', r => { if (r.status() >= 400) missing.push(r.url()) })
    await page.goto(`http://127.0.0.1:${server.address().port}/`)
    await page.evaluate(() => Promise.all([...document.images].map(im => im.decode())))
    if (missing.length) throw new Error(missing.join('\n'))
    const dimensions = await page.locator('.art img,.art svg').evaluateAll(els => els.map(e => [e.getBoundingClientRect().width, e.getBoundingClientRect().height]))
    if (dimensions.some(([w, h]) => w !== 24 || h !== 24)) throw new Error('Icon not rendered at 24 px')
    await reviewWebp(await page.screenshot({ type: 'png' }), path.join(out, 'icons-24px.webp'))
    console.log(`G2 ${phase}: ${dimensions.length} icons at 24px, two backgrounds, no missing image.`)
  } finally { if (browser) await browser.close(); server.close() }
}
main().catch(e => { console.error(e); process.exitCode = 1 })
