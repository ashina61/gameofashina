const fs = require('node:fs/promises'), assert = require('node:assert/strict'), sharp = require('sharp')
const { chromium } = require('playwright'), { START_BUTTON, qaOrigin } = require('../lib/qa.cjs'), { reviewWebp } = require('../lib/review-webp.cjs')
async function main() {
  const layout = JSON.parse(await fs.readFile('lib/game/island-layout.json', 'utf8'))
  const entries = JSON.parse(await fs.readFile('visual-review/G8/encoding.json', 'utf8'))
  const ids = entries.filter(e => !e.id.startsWith('map-')).map(e => e.id), layers = [], anchors = []
  assert.equal(ids.length, 16)
  for (const [index, id] of ids.entries()) {
    const file = 'public/images/game/islands/' + id + '.webp', meta = await sharp(file).metadata()
    assert.equal(meta.width, 600); assert.equal(meta.height, 800); assert.ok(meta.hasAlpha)
    const { data, info } = await sharp(file).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
    for (const [name, [x, y]] of Object.entries(layout.spots)) {
      const alpha = data[(Math.round(y * (info.height - 1)) * info.width + Math.round(x * (info.width - 1))) * 4 + 3]
      assert.ok(alpha > 100, `${id}: ${name} is outside island terrain`)
      anchors.push({ id, name, alpha })
    }
    layers.push({ input: await sharp(file).resize(150, 200).png().toBuffer(), left: index % 4 * 180 + 15, top: Math.floor(index / 4) * 225 })
    layers.push({ input: Buffer.from(`<svg width="180" height="25"><text x="90" y="18" text-anchor="middle" font-size="14" fill="#fff3da">${id}</text></svg>`), left: index % 4 * 180, top: Math.floor(index / 4) * 225 + 200 })
  }
  await reviewWebp(await sharp({ create: { width: 720, height: 900, channels: 4, background: '#245c6b' } }).composite(layers).png().toBuffer(), 'visual-review/G8/after/islands-contact.webp')
  const b = await chromium.launch({ headless: true, args: ['--no-sandbox'] }), errors = [], missing = [], screens = []
  try {
    const c = await b.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, serviceWorkers: 'block' })
    const fixture = JSON.parse(await fs.readFile('tools/fixtures/late-game.json', 'utf8'))
    await c.addInitScript(e => { for (const city of e.cities) city.game.updatedAt = Date.now(); localStorage.setItem('payitaht-adalari-v1', JSON.stringify(e)); localStorage.setItem('payitaht-rehber', 'goruldu'); localStorage.setItem('payitaht-qa', '1') }, fixture)
    const p = await c.newPage()
    p.on('pageerror', e => errors.push(e.message)); p.on('response', r => { if (r.status() >= 400 && /images\/game/.test(r.url())) missing.push(r.url()) })
    await p.goto(qaOrigin(), { waitUntil: 'domcontentloaded' }); await p.getByRole('button', { name: START_BUTTON }).click()
    await p.waitForFunction(() => !!document.documentElement.dataset.cityReady)
    await p.evaluate(() => { window.__payitahtQa.close(); window.__payitahtQa.island() })
    for (const id of ids) {
      await p.getByLabel('Ada seç', { exact: true }).selectOption(id)
      await p.locator('.island-bg').evaluate(img => img.decode())
      assert.equal(await p.locator('.island-bg').evaluate(img => img.naturalWidth), 600)
      await p.waitForTimeout(150)
      await reviewWebp(await p.screenshot(), `visual-review/G8/after/island-${id}-390x844.webp`); screens.push(id)
    }
    await p.getByRole('button', { name: 'Şehre dön', exact: true }).click()
    await p.getByRole('button', { name: 'Harita', exact: true }).click()
    assert.equal(await p.locator('.wm-island').count(), 16)
    await p.locator('.wm-island').first().press('Enter')
    await p.waitForTimeout(350)
    await reviewWebp(await p.screenshot(), 'visual-review/G8/after/world-390x844.webp')
    assert.deepEqual(errors, []); assert.deepEqual(missing, [])
    await fs.writeFile('visual-review/G8/scene-report.json', JSON.stringify({ errors, missing, screens, worldIslands: 16, anchors }, null, 2))
    console.log('16 islands, 128 terrain anchors, world keyboard selection and assets passed')
  } finally { await b.close() }
}
main().catch(e => { console.error(e); process.exitCode = 1 })
