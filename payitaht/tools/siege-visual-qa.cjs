const path = require('node:path')

/** Use the real save importer to test same-scene siege start/end (no reload). */
module.exports = async function siegeReview(browser, out, origin, seedRaw, diagnostics) {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true })
  const page = await context.newPage()
  page.on('pageerror', e => diagnostics.pageErrors.push(`siege: ${e.message}`))
  page.on('response', r => {
    if (r.status() >= 400 && r.url().includes('/images/game/')) diagnostics.missingGameAssets.push(`siege: ${r.status()} ${r.url()}`)
  })
  // Daylight reveals the camp/ship detail without disabling the real sky layer.
  const now = new Date().setHours(12, 0, 0, 0)
  await page.clock.setFixedTime(now)
  const seed = JSON.parse(seedRaw)
  seed.sieges = []
  seed.threats = []
  seed.cities[0].game.updatedAt = now
  await context.addInitScript(raw => localStorage.setItem('payitaht-adalari-v1', raw), JSON.stringify(seed))
  await page.goto(origin, { waitUntil: 'domcontentloaded' })
  await page.getByRole('button', { name: /Hikâyeye başla|Devam et/ }).click()
  await page.waitForFunction(() => document.querySelector('canvas')?.width > 0)
  await page.waitForTimeout(3500)
  await page.evaluate(() => { window.siegeQaCanvas = document.querySelector('canvas') })
  const force = (kind, rivalId) => ({ id: `qa-${kind}`, kind, cityId: seed.activeCityId, rivalId, level: 2, since: now, tick: now,
    troops: kind === 'occupy' ? { yeniceri: 30, okcu: 15 } : { kadirga: 8 } })
  const occupation = force('occupy', 'r-kemer')
  const blockade = force('blockade', 'r-sarp')
  const importState = async sieges => {
    await page.getByRole('button', { name: /^Hükümdar profili:/ }).click()
    await page.getByRole('button', { name: /Oyun ayarları/ }).click()
    await page.locator('input[type="file"]').setInputFiles({ name: 'siege-qa.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify({ ...seed, sieges })) })
    await page.getByRole('dialog', { name: /Oyun ayarları/ }).waitFor({ state: 'hidden' })
    await page.waitForTimeout(1600)
    if (!await page.evaluate(() => document.querySelector('canvas') === window.siegeQaCanvas)) throw new Error('Siege transition reset the Phaser canvas')
    const classes = await page.locator('.city-scene').getAttribute('class')
    if (classes.includes('city-occupied') !== sieges.some(s => s.kind === 'occupy') || classes.includes('city-blockaded') !== sieges.some(s => s.kind === 'blockade')) {
      throw new Error(`Siege appearance mismatch: ${classes}`)
    }
    if (!!await page.locator('.siege-atmosphere').count() !== !!sieges.length) throw new Error('Siege overlay was not cleaned up')
  }
  const shot = async name => {
    const file = `siege-${name}-390x844.png`
    await page.screenshot({ path: path.join(out, file), animations: 'disabled' })
    diagnostics.screenshots.push(file)
  }
  await importState([occupation]); await shot('occupation')
  await importState([occupation, blockade]); await shot('both')
  await page.getByRole('button', { name: 'Donanma ve limana git' }).click(); await page.waitForTimeout(600); await shot('both-harbour')
  await importState([blockade]); await shot('blockade')
  await importState([]); await shot('liberated-harbour')
  await page.getByRole('button', { name: 'Belediyeye dön' }).click(); await page.waitForTimeout(600); await shot('liberated')
  diagnostics.siegeTransitions = ['peace→occupation', 'occupation→both', 'both→blockade', 'blockade→peace']
  await context.close()
}
