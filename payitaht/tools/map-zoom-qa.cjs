const path = require('node:path')
const fs = require('node:fs/promises')
const { START_BUTTON, qaOrigin, skipGuide } = require('./lib/qa.cjs')

async function checkMapZoom(page, selector, label, out) {
  const frame = page.locator(selector)
  const viewport = frame.locator('.map-viewport')
  await viewport.waitFor()
  // Sayfa kayarak açılır; sabit arayüz, giriş animasyonu bitince ölçülür.
  await page.waitForFunction(() => document.getAnimations().every(a => a.playState !== 'running' || a.effect?.getComputedTiming().iterations === Infinity))
  const fixed = await page.locator('.ika-top, .ika-nav, .island-toolbar, .bp-bar').evaluateAll(els => els.map(el => {
    const b = el.getBoundingClientRect(); return [b.x, b.y, b.width, b.height]
  }))
  const scale = () => viewport.evaluate(el => Number(el.dataset.mapScale))
  await page.waitForFunction(s => document.querySelector(s)?.dataset.mapScale, `${selector} .map-viewport`)
  const box = await viewport.boundingBox()
  const x = box.x + box.width / 2, y = box.y + Math.min(box.height / 2, 130)
  const session = await page.context().newCDPSession(page)
  const touches = gap => [{ x: x - gap / 2, y, id: 1 }, { x: x + gap / 2, y, id: 2 }]
  await session.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: touches(60) })
  for (let gap = 70; gap <= 120; gap += 10) {
    await session.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: touches(gap) })
    await page.waitForTimeout(30)
  }
  await session.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
  if (await scale() < 1.8) throw new Error(`${label}: map pinch did not zoom its artwork`)
  const unchanged = await page.locator('.ika-top, .ika-nav, .island-toolbar, .bp-bar').evaluateAll((els, before) => els.every((el, i) => {
    const b = el.getBoundingClientRect(); return [b.x, b.y, b.width, b.height].every((n, j) => Math.abs(n - before[i][j]) < 1)
  }), fixed)
  if (!unchanged || await page.evaluate(() => Math.abs(visualViewport.scale - 1) > .01)) throw new Error(`${label}: pinch zoom changed the page or fixed UI`)
  await page.screenshot({ path: path.join(out, `map-zoom-${label}.png`), animations: 'disabled' })
  const beforePan = await viewport.evaluate(el => [el.scrollLeft, el.scrollTop])
  await session.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y, id: 1 }] })
  await session.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: x - 50, y: y - 45, id: 1 }] })
  await session.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
  const afterPan = await viewport.evaluate(el => [el.scrollLeft, el.scrollTop])
  if (Math.hypot(afterPan[0] - beforePan[0], afterPan[1] - beforePan[1]) < 10) throw new Error(`${label}: map drag did not pan`)
  await frame.getByRole('button', { name: 'Harita yakınlaştırmasını sıfırla' }).click()
  if (Math.abs(await scale() - 1) > .01) throw new Error(`${label}: reset failed`)
  await frame.getByRole('button', { name: 'Haritayı uzaklaştır' }).click()
  if (await scale() >= 1) throw new Error(`${label}: zoom out failed`)
  await frame.getByRole('button', { name: 'Harita yakınlaştırmasını sıfırla' }).click()
  await session.detach()
}

module.exports = { checkMapZoom }

if (require.main === module) {
  const { chromium } = require('playwright')
  ;(async () => {
    const out = path.resolve('visual-review')
    await fs.mkdir(out, { recursive: true })
    const browser = await chromium.launch({ args: ['--no-sandbox'] })
    try {
      for (const width of [390, 412, 430]) {
        const page = await browser.newPage({ viewport: { width, height: 844 }, isMobile: true, hasTouch: true })
        // Yeni oyunun ilk açılış rehberi QA tıklamalarını örtmesin.
        await skipGuide(page)
        await page.goto(qaOrigin('VISUAL_QA_URL', 4175))
        await page.getByRole('button', { name: START_BUTTON }).click()
        await page.getByRole('button', { name: 'Harita', exact: true }).click()
        await checkMapZoom(page, '.world-map-scroll', `world-${width}`, out)
        await page.getByRole('button', { name: 'Geri', exact: true }).first().click()
        await page.getByRole('button', { name: 'Ada', exact: true }).click()
        await checkMapZoom(page, '.island-map-viewport', `island-${width}`, out)
        await page.getByRole('button', { name: /^Ada ormanı, seviye/ }).click()
        await page.getByRole('dialog', { name: /Ada ormanı/ }).waitFor()
        console.log(`${width}px: pinch, fixed HUD, pan, zoom controls and forest tap passed`)
        await page.close()
      }
    } finally { await browser.close() }
  })().catch(error => { console.error(error); process.exitCode = 1 })
}
