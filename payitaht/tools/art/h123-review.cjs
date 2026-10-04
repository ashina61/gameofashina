const fs = require('node:fs/promises')
const assert = require('node:assert/strict')
const { chromium } = require('playwright')
const { START_BUTTON, qaOrigin } = require('../lib/qa.cjs')
const { reviewWebp } = require('../lib/review-webp.cjs')

async function main() {
  const [phase, stage] = process.argv.slice(2)
  assert.ok(['H1', 'H2'].includes(phase))
  assert.ok(['before', 'after'].includes(stage))
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] })
  const errors = [], missing = []
  try {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, serviceWorkers: 'block' })
    const fixture = JSON.parse(await fs.readFile('tools/fixtures/late-game.json', 'utf8'))
    await context.addInitScript(e => {
      for (const city of e.cities) city.game.updatedAt = Date.now()
      localStorage.setItem('payitaht-adalari-v1', JSON.stringify(e))
      localStorage.setItem('payitaht-rehber', 'goruldu')
      localStorage.setItem('payitaht-qa', '1')
    }, fixture)
    const page = await context.newPage()
    page.on('pageerror', e => errors.push(e.message))
    page.on('response', r => { if (r.status() >= 400 && /images\/game/.test(r.url())) missing.push(r.url()) })
    await page.goto(qaOrigin(), { waitUntil: 'networkidle' })
    let islands
    if (phase === 'H2') {
      await page.getByRole('button', { name: START_BUTTON }).click()
      await page.waitForFunction(() => !!document.documentElement.dataset.cityReady)
      await page.evaluate(() => window.__payitahtQa.close())
      await page.getByRole('button', { name: 'Harita', exact: true }).click()
      await page.waitForSelector('.wm-island')
      islands = await page.locator('.wm-island').count()
      assert.equal(islands, 16)
      await page.waitForTimeout(500)
    }
    await reviewWebp(await page.screenshot(), `visual-review/${phase}/${stage}-390x844.webp`)
    assert.deepEqual(errors, [])
    assert.deepEqual(missing, [])
    await fs.writeFile(`visual-review/${phase}/${stage}-browser.json`, JSON.stringify({ viewport: '390x844', errors, missing, islands }, null, 2))
  } finally { await browser.close() }
}
main().catch(e => { console.error(e); process.exitCode = 1 })
