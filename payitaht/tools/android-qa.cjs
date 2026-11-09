/* Regression checks against the compiled native export, including failed paper assets. */
const assert = require('node:assert/strict')
const fs = require('node:fs/promises')
const path = require('node:path')
const { chromium } = require('playwright')
const { skipGuide, enterGame, qaOrigin } = require('./lib/qa.cjs')

async function main() {
  const out = path.resolve('visual-review/android')
  await fs.mkdir(out, { recursive: true })
  const fixture = JSON.parse(await fs.readFile(path.join(__dirname, 'fixtures/late-game.json'), 'utf8'))
  const browser = await chromium.launch({ executablePath: process.env.QA_CHROME_PATH, args: ['--no-sandbox', '--enable-unsafe-swiftshader'] })
  const results = []
  try {
    for (const [width, height, scale] of [[360, 740, 1], [390, 844, 1], [430, 932, 1], [390, 844, 1.3]]) {
      const label = `${width}-${Math.round(scale * 100)}`
      const context = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: 1, isMobile: true, hasTouch: true })
      await skipGuide(context)
      await context.addInitScript(raw => {
        if (localStorage.getItem('payitaht-android-fixture')) return
        const empire = JSON.parse(raw)
        for (const city of empire.cities) {
          city.game.updatedAt = Date.now()
          city.game.forest.workers = 0
          city.game.mine.miners = 0
        }
        localStorage.setItem('payitaht-adalari-v1', JSON.stringify(empire))
        localStorage.setItem('payitaht-qa', '1')
        localStorage.setItem('payitaht-android-fixture', '1')
      }, JSON.stringify(fixture))
      if (width === 360) await context.route(/\/paper(?:\.|-)[^/]*\.webp(?:\?.*)?$/, route => route.abort())
      const page = await context.newPage()
      page.setDefaultTimeout(20_000)
      const errors = [], missing = []
      page.on('pageerror', error => errors.push(error.message))
      page.on('response', response => { if (response.status() === 404) missing.push(response.url()) })
      const settle = async () => {
        await page.waitForTimeout(150)
        await page.evaluate(() => {
          for (const animation of document.getAnimations()) {
            const target = animation.effect?.target
            if (target instanceof Element && target.matches('.bp, .building-inspector') && animation.playState === 'running' && animation.effect.getComputedTiming().iterations !== Infinity) animation.finish()
          }
        })
        if (scale !== 1) {
          await page.evaluate(zoom => {
            const elements = [...document.querySelectorAll('body *')].filter(el => !el.dataset.androidQaText && !(el instanceof SVGElement))
            const sizes = elements.map(el => parseFloat(getComputedStyle(el).fontSize))
            elements.forEach((el, index) => { el.style.fontSize = `${sizes[index] * zoom}px`; el.dataset.androidQaText = '1' })
          }, scale)
        }
        await page.waitForTimeout(150)
      }
      const readWorkers = () => page.evaluate(() => {
        const empire = JSON.parse(localStorage.getItem('payitaht-adalari-v1'))
        const game = empire.cities.find(city => city.id === empire.activeCityId).game
        return [game.forest.workers, game.mine.miners]
      })
      await page.goto(qaOrigin('ANDROID_QA_URL'), { waitUntil: 'domcontentloaded' })
      await enterGame(page)
      await page.waitForFunction(() => !!window.__payitahtQa)
      await settle()
      const hud = await page.evaluate(() => ({
        quantities: [...document.querySelectorAll('.ika-chip-num > b')].map(el => parseFloat(getComputedStyle(el).fontSize)),
        rates: [...document.querySelectorAll('.ika-chip-num > small')].map(el => parseFloat(getComputedStyle(el).fontSize)),
        targets: [...document.querySelectorAll('.ika-advisor, .ika-stock-open')].map(el => { const r = el.getBoundingClientRect(); return [r.width, r.height] }),
      }))
      assert.ok(hud.quantities.length > 0 && hud.quantities.every(px => px >= 14), `${label}: resource text`)
      assert.ok(hud.rates.length > 0 && hud.rates.every(px => px >= 11), `${label}: rate text`)
      assert.ok(hud.targets.length >= 10 && hud.targets.every(([w, h]) => w >= 44 && h >= 44), `${label}: touch targets`)
      await page.screenshot({ path: path.join(out, `city-${label}.png`) })
      for (const panel of ['forest', 'island']) {
        await page.evaluate(value => window.__payitahtQa.panel(value), panel)
        await settle()
        const layout = await page.evaluate(() => {
          const box = document.querySelector('.bp').getBoundingClientRect()
          return {
            top: box.top, bottom: box.bottom,
            hudBottom: document.querySelector('.ika-top').getBoundingClientRect().bottom,
            navTop: document.querySelector('.ika-nav').getBoundingClientRect().top,
            overflow: document.documentElement.scrollWidth > innerWidth + 1,
            islandVisibility: getComputedStyle(document.querySelector('.island-view')).visibility,
            paper: getComputedStyle(document.querySelector('.bp-scroll')).backgroundColor,
          }
        })
        assert.ok(layout.top >= layout.hudBottom - 1 && layout.bottom <= layout.navTop + 2, `${label} ${panel}: page bounds ${JSON.stringify(layout)}`)
        assert.equal(layout.overflow, false, `${label} ${panel}: horizontal overflow`)
        assert.equal(layout.islandVisibility, 'hidden', `${label} ${panel}: covered map must be hidden`)
        assert.ok(!['transparent', 'rgba(0, 0, 0, 0)'].includes(layout.paper), `${label}: opaque fallback`)
        await page.getByRole('button', { name: 'Bir artır', exact: true }).click()
        await settle()
        await page.getByRole('button', { name: 'Onayla', exact: true }).click()
        await page.waitForFunction(index => {
          const empire = JSON.parse(localStorage.getItem('payitaht-adalari-v1'))
          const game = empire.cities.find(city => city.id === empire.activeCityId).game
          return (index === 0 ? game.forest.workers : game.mine.miners) === 1
        }, panel === 'forest' ? 0 : 1)
        await settle()
        await page.screenshot({ path: path.join(out, `${panel}-${label}.png`) })
        await page.getByRole('tab', { name: 'Gelişim', exact: true }).click()
        await settle()
        if (panel === 'forest') {
          await page.goBack()
          await page.waitForFunction(() => !document.querySelector('.bp'))
          assert.equal(await page.locator('.island-view').isVisible(), true, `${label}: back to island`)
          await settle()
          await page.goBack()
          await page.waitForFunction(() => !document.querySelector('.island-view'))
          assert.equal(await page.locator('.ika-res').isVisible(), true, `${label}: back to city`)
        } else {
          await page.getByRole('button', { name: 'Kapat', exact: true }).click()
          assert.equal(await page.locator('.island-view').isVisible(), true)
        }
      }
      await page.reload({ waitUntil: 'domcontentloaded' })
      await enterGame(page)
      await page.waitForFunction(() => !!window.__payitahtQa)
      assert.deepEqual(await readWorkers(), [1, 1], `${label}: worker assignments survive reload`)
      await page.evaluate(() => window.__payitahtQa.panel('settings'))
      await page.getByRole('tab', { name: 'Bilgi', exact: true }).click()
      const privacy = page.getByRole('link', { name: 'Gizlilik politikası ve verilerinin silinmesi', exact: true })
      assert.equal(await privacy.getAttribute('target'), '_self', `${label}: Android policy stays inside WebView`)
      await privacy.click()
      await page.waitForURL('**/privacy.html')
      await page.getByRole('heading', { name: 'Payitaht Adaları Gizlilik Politikası', exact: true }).waitFor()
      assert.deepEqual(errors, [], `${label}: browser errors`)
      assert.deepEqual(missing, [], `${label}: missing native assets`)
      results.push({ width, height, textScale: scale, paperFailure: width === 360, hud, savedWorkers: await readWorkers(), errors, missing })
      console.log(`Android QA passed: ${width}×${height}, text ${Math.round(scale * 100)}%`)
      await context.close()
    }
  } finally { await browser.close() }
  await fs.writeFile(path.join(out, 'report.json'), JSON.stringify(results, null, 2))
  console.log(`Android QA: ${results.length} phone/text configurations passed.`)
}
main().catch(error => { console.error(error); process.exitCode = 1 })
