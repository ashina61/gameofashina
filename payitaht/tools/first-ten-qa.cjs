/*
 * İLK 10 DAKİKA, TARAYICIDA (V2 "bitti" listesi): gerçek arayüzde yeni bir oyun
 * açılır ve oyuncu yalnızca rehberin parlattığı (.guide-glow) düğmeye basar.
 * Parlayan bir şey yoksa kaynak bekleniyordur: saat 5 sn ileri alınır.
 * İlk sekiz hedef 10 oyun dakikası içinde ödüllenmiş olmalı.
 *
 * Saat Playwright ile sahtedir (page.clock): bekleme gerçek zaman almaz.
 *
 *   node tools/first-ten-qa.cjs           (4173'te sunulan dışa aktarım)
 *   FIRST_TEN_QA_URL=http://... node tools/first-ten-qa.cjs
 */
const assert = require('node:assert/strict')
const fs = require('node:fs/promises')
const path = require('node:path')
const { chromium } = require('playwright')
const { SAVE_KEY, START_BUTTON, autoCompleteTitleSetup, qaOrigin } = require('./lib/qa.cjs')

const ORIGIN = qaOrigin('FIRST_TEN_QA_URL')
const START = new Date('2026-10-05T09:00:00Z').getTime()
const LIMIT_MS = 10 * 60_000
const GUIDED = ['first-upgrade', 'first-academy', 'first-worker', 'first-research', 'barracks', 'walls', 'troops', 'first-raid']
const OUT = path.join(__dirname, '..', 'visual-review')

async function main() {
  await fs.mkdir(OUT, { recursive: true })
  const browser = await chromium.launch({ headless: true, executablePath: process.env.QA_CHROME_PATH, args: ['--no-sandbox', '--enable-unsafe-swiftshader'] })
  const page = await (await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1, isMobile: true, hasTouch: true })).newPage()
  const errors = []
  page.on('pageerror', e => errors.push(e.message))
  await autoCompleteTitleSetup(page)
  await page.clock.install({ time: START })
  const log = []
  try {
    await page.goto(ORIGIN, { waitUntil: 'domcontentloaded', timeout: 60_000 })
    await page.clock.runFor(1500)
    await page.getByRole('button', { name: START_BUTTON }).click()
    await page.clock.runFor(1500)
    const savedGame = () => page.evaluate(key => {
      try { return JSON.parse(localStorage.getItem(key)).cities[0].game } catch { return null }
    }, SAVE_KEY)
    await page.getByRole('button', { name: 'Divanhaneyi aç', exact: true }).waitFor()
    await page.waitForFunction(() => !!document.documentElement.dataset.cityReady)
    await page.screenshot({ path: path.join(OUT, 'first-session-city-390x844.png') })
    const chosenPlots = {}
    let checkedCancel = false
    const now = () => page.evaluate(() => Date.now())
    const reached = {}
    for (let i = 0; i < 600; i++) {
      const t = await now() - START
      const game = await savedGame()
      const done = game?.claimed ?? []
      const placed = Object.entries(chosenPlots).filter(([id]) => game?.buildings[id])
      for (const [id, plot] of placed) assert.equal(game.placement[id], plot)
      for (const id of done) if (GUIDED.includes(id) && reached[id] === undefined) { reached[id] = t; log.push(`${(t / 60_000).toFixed(1)} dk: ${id}`) }
      if (GUIDED.every(id => done.includes(id)) || t > LIMIT_MS + 60_000) break
      const placement = page.locator('.construction-placement, .quest-chip.is-placing')
      if (await placement.isVisible()) {
        if (!checkedCancel) {
          await placement.getByRole('button', { name: 'Vazgeç', exact: true }).click()
          assert.equal(await placement.isVisible(), false)
          checkedCancel = true
          await page.clock.runFor(700)
          continue
        }
        const parcel = page.getByRole('navigation', { name: 'Uygun arsalar' }).getByRole('button').nth(1)
        const plot = Number((await parcel.textContent()).match(/\d+/)[0])
        const id = done.includes('first-academy') ? 'kisla' : 'medrese'
        chosenPlots[id] = plot
        if (id === 'medrese') await page.screenshot({ path: path.join(OUT, 'first-session-parcel-390x844.png') })
        // The city provides the same parcel selection to keyboard and touch.
        await parcel.press('Enter')
        await page.locator('.building-inspector').getByText('Arsa ' + plot, { exact: false }).waitFor()
        await page.clock.runFor(700)
        continue
      }
      const glow = page.locator('.guide-glow').first()
      if (await glow.isVisible().catch(() => false)) {
        const label = (await glow.getAttribute('aria-label')) || (await glow.innerText().catch(() => '')).trim().slice(0, 30)
        if (process.env.FIRST_TEN_VERBOSE) log.push(`  bas: ${label} [${await glow.evaluate(el => el.className)}]`)
        await glow.click({ timeout: 3000 }).catch(e => log.push(`tıklanamadı: ${label} (${e.message.split('\n')[0]})`))
        await page.clock.runFor(700)
        continue
      }
      // Advance game time without rendering every waiting frame.
      await page.clock.fastForward(5000)
      await page.clock.runFor(300)
    }
    await page.screenshot({ path: path.join(OUT, 'first-ten-390x844.png') })
    const missingPlots = ['medrese', 'kisla'].filter(id => chosenPlots[id] === undefined)
    const missing = GUIDED.filter(id => reached[id] === undefined || reached[id] > LIMIT_MS)
    console.log(log.join('\n'))
    if (errors.length) console.log(`Sayfa hatası: ${errors.slice(0, 3).join(' | ')}`)
    if (missing.length || missingPlots.length || errors.length) {
      const game = await savedGame()
      const glow = await page.locator('.guide-glow').first().textContent({ timeout: 1000 }).catch(() => null)
      const panel = await page.locator('.bp').first().getAttribute('aria-label', { timeout: 1000 }).catch(() => null)
      console.log('Rehber durumu:', { claimed: game?.claimed, study: game?.study, drills: game?.drills, panel, glow, missingPlots })
      console.log(`İLK 10 DAKİKA BAŞARISIZ: ${missing.join(', ') || 'sayfa hatası'}`)
      process.exitCode = 1
    } else {
      console.log(`İlk sekiz hedef ${(Math.max(...Object.values(reached)) / 60_000).toFixed(1)} oyun dakikasında tamam.`)
    }
  } finally {
    await browser.close()
  }
}
main().catch(e => { console.error(e); process.exitCode = 1 })
