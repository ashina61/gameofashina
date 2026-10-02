// Actual-game visual review after a static export. Requires Playwright.
// Optional: QA_WIDTH, QA_OUTPUT, QA_TAG and CHROMIUM_EXECUTABLE.
const fs = require('node:fs')
const path = require('node:path')
const http = require('node:http')
const assert = require('node:assert/strict')
const { chromium } = require('playwright')

async function main() {
  const root = path.resolve('out')
  const output = path.resolve(process.env.QA_OUTPUT || 'visual-review')
  const tag = process.env.QA_TAG || 'review'
  fs.mkdirSync(output, { recursive: true })
  const mime = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css',
    '.webp': 'image/webp', '.png': 'image/png', '.json': 'application/json', '.svg': 'image/svg+xml' }
  const server = http.createServer((req, res) => {
    const requested = decodeURIComponent(req.url.split('?')[0]).replace(/^\/gameofashina/, '')
    let file = path.join(root, requested || 'index.html')
    if (!file.startsWith(root + path.sep) && file !== root) { res.writeHead(403); return res.end() }
    if (fs.existsSync(file) && fs.statSync(file).isDirectory()) file = path.join(file, 'index.html')
    if (!fs.existsSync(file)) { res.writeHead(404); return res.end() }
    res.setHeader('Content-Type', mime[path.extname(file)] || 'application/octet-stream')
    res.end(fs.readFileSync(file))
  })
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve))
  let browser
  try {
    browser = await chromium.launch({
      ...(process.env.CHROMIUM_EXECUTABLE ? { executablePath: process.env.CHROMIUM_EXECUTABLE } : {}),
      args: ['--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
    })
    const page = await browser.newPage({
      viewport: { width: Number(process.env.QA_WIDTH) || 1280, height: 900 },
      serviceWorkers: 'block',
    })
    // Yeni oyunun ilk açılış rehberi QA tıklamalarını örtmesin.
    await page.addInitScript(() => { try { localStorage.setItem('payitaht-rehber', 'goruldu') } catch {} })
    const errors = []
    page.on('pageerror', error => errors.push(error.message))
    page.on('response', response => {
      if (response.status() >= 400) errors.push(`${response.status()} ${response.url()}`)
    })
    const url = `http://127.0.0.1:${server.address().port}/gameofashina/`
    const capture = name => page.screenshot({ path: path.join(output, `${tag}-${name}.png`) })
    const enter = async () => {
      await page.getByRole('button', { name: /Hikâyeye başla|Devam et/ }).click()
      await page.waitForTimeout(7000)
    }
    await page.goto(url)
    await enter()
    await capture('starter')

    // Isolated browser fixture only. No changes to game code or the user's save.
    const fixture = await page.evaluate(() => {
      const empire = JSON.parse(localStorage.getItem('payitaht-adalari-v1'))
      const game = empire.cities[0].game
      for (const id of ['surlar', 'divan', 'konut', 'ambar']) game.buildings[id] = 8
      game.updatedAt = Date.now()
      return JSON.stringify(empire)
    })
    await page.addInitScript(raw => {
      localStorage.setItem('payitaht-adalari-v1', raw)
      localStorage.setItem('payitaht-adalari-v1-backup', raw)
    }, fixture)
    await page.reload()
    await enter()
    await capture('walls')
    const layout = await page.evaluate(() => ({
      overflow: document.documentElement.scrollWidth > innerWidth,
      chips: [...document.querySelectorAll('.ika-chip')].map(element => {
        const rect = element.getBoundingClientRect()
        return { visible: rect.x >= 0 && rect.right <= innerWidth,
          contentFits: element.scrollWidth <= element.clientWidth }
      }),
    }))
    await page.locator('.ika-res').click()
    await page.waitForTimeout(300)
    await capture('economy')
    assert.equal(layout.overflow, false)
    assert.equal(layout.chips.length, 7)
    assert.ok(layout.chips.every(chip => chip.visible && chip.contentFits))
    await page.goto(url + 'images/game/walls/tower-round.svg')
    await page.locator('svg').screenshot({ path: path.join(output, `${tag}-tower.png`) })
    assert.deepEqual(errors, [])
    fs.writeFileSync(path.join(output, `${tag}-diagnostics.json`), JSON.stringify({ errors, layout }, null, 2))
    console.log({ errors, layout })
  } finally {
    await browser?.close()
    server.close()
  }
}
main().catch(error => { console.error(error); process.exitCode = 1 })
