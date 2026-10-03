/** G2: inspect general icon use and painted menu targets in the running game. */
const fs = require('node:fs/promises')
const path = require('node:path')
const { chromium } = require('playwright')
const { qaOrigin, START_BUTTON } = require('../lib/qa.cjs')
const { reviewWebp } = require('../lib/review-webp.cjs')
async function main() {
  const out = path.resolve('visual-review/G2/revision/after')
  await fs.mkdir(out, { recursive: true })
  const fixture = JSON.parse(await fs.readFile('tools/fixtures/late-game.json', 'utf8'))
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] })
  const errors = [], missing = [], report = {}
  try {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1, isMobile: true, hasTouch: true })
    await context.addInitScript(e => {
      for (const c of e.cities) c.game.updatedAt = Date.now()
      localStorage.setItem('payitaht-adalari-v1', JSON.stringify(e))
      localStorage.setItem('payitaht-rehber', 'goruldu')
      localStorage.setItem('payitaht-qa', '1')
    }, fixture)
    const page = await context.newPage()
    page.on('pageerror', e => errors.push(e.message))
    page.on('response', r => { if (r.status() >= 400 && /images\/game/.test(r.url())) missing.push(r.url()) })
    await page.goto(qaOrigin(), { waitUntil: 'domcontentloaded' })
    await page.getByRole('button', { name: START_BUTTON }).click()
    await page.waitForFunction(() => !!window.__payitahtQa)
    const shots = [['city-tools', null], ['alliance', ['panel', 'alliance']], ['harbour-page', ['building', 'liman']], ['divan-page', ['building', 'divan']]]
    for (const [name, action] of shots) {
      await page.evaluate(a => a ? window.__payitahtQa[a[0]](a[1]) : window.__payitahtQa.close(), action)
      await page.waitForTimeout(700)
      await page.evaluate(() => Promise.all([...document.images].filter(im => im.offsetWidth).map(im => im.decode())))
      if (!action) {
        report.menuDimensions = await page.locator('.ika-nav .painted-ui-icon,.map-top-tools .painted-ui-icon').evaluateAll(els => els.map(e => ({ src: e.getAttribute('src'), width: e.getBoundingClientRect().width, height: e.getBoundingClientRect().height })))
        if (report.menuDimensions.length < 8 || report.menuDimensions.some(e => e.width < 34 || e.height < 34)) throw new Error('Painted menu icon is smaller than 34px')
      } else {
        report[name] = await page.locator('.bp').evaluate(el => ({ paintedMenuIcons: el.querySelectorAll('.painted-ui-icon').length, vectorIcons: el.querySelectorAll('svg.pi').length, resourceIcons: el.querySelectorAll('.painted-resource-icon').length }))
        if (report[name].paintedMenuIcons) throw new Error(`${name}: generic inline icon unexpectedly replaced`)
      }
      await reviewWebp(await page.screenshot({ type: 'png', animations: 'disabled' }), path.join(out, `${name}-390x844.webp`))
    }
    if (errors.length || missing.length) throw new Error(JSON.stringify({ errors, missing }))
    await fs.writeFile(path.join(out, '../usage-report.json'), JSON.stringify({ ...report, errors, missing }, null, 2))
    console.log('Menu/column icons ≥34px; alliance, harbour, Divan retain SVG inline glyphs; no missing assets/errors.')
  } finally { await browser.close() }
}
main().catch(e => { console.error(e); process.exitCode = 1 })
