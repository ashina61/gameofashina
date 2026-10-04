const fs = require('node:fs/promises'), path = require('node:path'), assert = require('node:assert/strict')
const { chromium } = require('playwright'), { qaOrigin, START_BUTTON } = require('../lib/qa.cjs'), { reviewWebp } = require('../lib/review-webp.cjs')
async function main() {
  const phase = process.argv[2] || 'after', out = `visual-review/G10/${phase}`
  await fs.mkdir(out, { recursive: true })
  const fixture = JSON.parse(await fs.readFile('tools/fixtures/late-game.json', 'utf8'))
  for (const city of fixture.cities) Object.assign(city.game.buildings, { mabet: 8, tekke: 8, cami: 8, karagoz: 8 })
  const b = await chromium.launch({ headless: true, args: ['--no-sandbox'] }), errors = [], missing = [], screens = []
  try {
    for (const level of [1, 6, 12]) for (const id of ['bagci', 'mahzen']) {
      const seed = structuredClone(fixture)
      seed.cities[0].game.buildings[id] = level
      seed.cities[0].game.placement[id] = 19
      const c = await b.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, serviceWorkers: 'block' })
      await c.addInitScript(e => { for (const city of e.cities) city.game.updatedAt = Date.now(); localStorage.setItem('payitaht-adalari-v1', JSON.stringify(e)); localStorage.setItem('payitaht-rehber', 'goruldu'); localStorage.setItem('payitaht-qa', '1') }, seed)
      const p = await c.newPage(); p.on('pageerror', e => errors.push(e.message)); p.on('response', r => { if (r.status() >= 400 && /images\/game/.test(r.url())) missing.push(r.url()) })
      await p.goto(qaOrigin(), { waitUntil: 'domcontentloaded' }); await p.getByRole('button', { name: START_BUTTON }).click()
      await p.waitForFunction(() => !!document.documentElement.dataset.cityReady)
      await p.evaluate(id => window.__payitahtQa.building(id), id)
      await p.locator('.bp img').evaluateAll(async imgs => { await Promise.all(imgs.map(img => img.decode())) })
      await p.waitForTimeout(120)
      assert.equal(await p.locator('.bp-hero-art').evaluate(img => img.naturalWidth), 887)
      assert.ok((await p.locator('.bp-hero-art').evaluateAll(imgs => imgs.map(i => i.src))).some(src => src.includes(`${id}-painted-${level >= 8 ? 3 : level >= 4 ? 2 : 1}-`)))
      assert.ok(await p.getByLabel(`Seviye ${level}, en fazla 32`, { exact: true }).count())
      await reviewWebp(await p.screenshot(), path.join(out, `${id}-${level}-390x844.webp`)); screens.push(`${id}-${level}`)
      await c.close()
    }
    assert.deepEqual(errors, []); assert.deepEqual(missing, [])
    await fs.writeFile(`visual-review/G10/scene-${phase}.json`, JSON.stringify({ errors, missing, screens }, null, 2))
    console.log(`G10 ${phase}: ${screens.length} mobile deep pages passed`)
  } finally { await b.close() }
}
main().catch(e => { console.error(e); process.exitCode = 1 })
