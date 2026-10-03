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
const fs = require('node:fs/promises')
const path = require('node:path')
const { chromium } = require('playwright')
const { START_BUTTON, qaOrigin } = require('./lib/qa.cjs')

const ORIGIN = qaOrigin('FIRST_TEN_QA_URL')
const START = new Date('2026-10-05T09:00:00Z').getTime()
const LIMIT_MS = 10 * 60_000
const GUIDED = ['first-upgrade', 'first-academy', 'first-worker', 'first-research', 'barracks', 'walls', 'troops', 'first-raid']
const OUT = path.join(__dirname, '..', 'visual-review')

async function main() {
  await fs.mkdir(OUT, { recursive: true })
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] })
  const page = await (await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1, isMobile: true, hasTouch: true })).newPage()
  const errors = []
  page.on('pageerror', e => errors.push(e.message))
  await page.clock.install({ time: START })
  const log = []
  try {
    await page.goto(ORIGIN, { waitUntil: 'domcontentloaded', timeout: 60_000 })
    await page.clock.runFor(1500)
    await page.getByRole('button', { name: START_BUTTON }).click()
    await page.clock.runFor(1500)
    const claimed = () => page.evaluate(() => {
      try { return JSON.parse(localStorage.getItem('payitaht-adalari-v1')).cities[0].game.claimed } catch { return [] }
    })
    const now = () => page.evaluate(() => Date.now())
    const reached = {}
    for (let i = 0; i < 600; i++) {
      const t = await now() - START
      const done = await claimed()
      for (const id of done) if (GUIDED.includes(id) && reached[id] === undefined) { reached[id] = t; log.push(`${(t / 60_000).toFixed(1)} dk: ${id}`) }
      if (GUIDED.every(id => done.includes(id)) || t > LIMIT_MS + 60_000) break
      // Açılış rehberi (.frg) önce kapatılır: rehber ok onun altında çalışmaz.
      const frg = page.locator('.frg button').last()
      if (await frg.isVisible().catch(() => false)) { await frg.click(); await page.clock.runFor(400); continue }
      const glow = page.locator('.guide-glow').first()
      if (await glow.isVisible().catch(() => false)) {
        const label = (await glow.getAttribute('aria-label')) || (await glow.innerText().catch(() => '')).trim().slice(0, 30)
        if (process.env.FIRST_TEN_VERBOSE) log.push(`  bas: ${label} [${await glow.evaluate(el => el.className)}]`)
        await glow.click({ timeout: 3000 }).catch(e => log.push(`tıklanamadı: ${label} (${e.message.split('\n')[0]})`))
        await page.clock.runFor(700)
        continue
      }
      await page.clock.runFor(5000)
    }
    await page.screenshot({ path: path.join(OUT, 'first-ten-390x844.png') })
    const missing = GUIDED.filter(id => reached[id] === undefined || reached[id] > LIMIT_MS)
    console.log(log.join('\n'))
    if (errors.length) console.log(`Sayfa hatası: ${errors.slice(0, 3).join(' | ')}`)
    if (missing.length || errors.length) {
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
