const path = require('node:path')
const fs = require('node:fs/promises')
const { START_BUTTON, skipGuide, qaOrigin } = require('./lib/qa.cjs')

async function assertReferenceLayout(page, label) {
  const metrics = await page.locator('.bp-royal .bp-scroll').evaluate(el => ({
    overflow: el.scrollWidth > el.clientWidth + 2,
    documentOverflow: document.documentElement.scrollWidth > innerWidth + 2,
    nav: getComputedStyle(document.querySelector('.ika-nav')).display,
    hud: getComputedStyle(document.querySelector('.ika-top')).display,
    contentWidth: el.clientWidth, viewport: innerWidth,
    brokenArt: [...el.querySelectorAll('img')].filter(img => img.complete && !img.naturalWidth).map(img => img.src),
  }))
  if (metrics.overflow || metrics.documentOverflow || metrics.nav === 'none' || metrics.hud !== 'none' || metrics.contentWidth < metrics.viewport - 4 || metrics.brokenArt.length) throw new Error(`${label}: approved portrait composition failed ${JSON.stringify(metrics)}`)
}

async function checkHeraldry(page, label, out) {
  await page.getByRole('button', { name: /^Hükümdar profili:/ }).click()
  await page.getByRole('heading', { name: 'Hükümdar', exact: true }).waitFor()
  await page.getByRole('heading', { name: /Unvan yolu/ }).waitFor()
  if (await page.locator('.royal-summary > span').count() !== 3) throw new Error(`${label}: missing real profile summaries`)
  if (await page.locator('.royal-ledger > div').count() !== 4) throw new Error(`${label}: missing illustrated score ledger`)
  if (await page.locator('.royal-honours > button').count() !== 3) throw new Error(`${label}: missing featured medals`)
  await assertReferenceLayout(page, label)
  await page.screenshot({ path: path.join(out, `reference-profile-${label}.png`), animations: 'disabled' })
  await page.getByRole('button', { name: 'Ayarları aç', exact: true }).click()
  await page.getByRole('heading', { name: 'Ayarlar', exact: true }).waitFor()
  if (await page.locator('.royal-preferences [role="switch"]').count() !== 6) throw new Error(`${label}: missing real preference controls`)
  if (await page.locator('.court-tabs [role="tab"]').count() !== 4) throw new Error(`${label}: missing four settings sections`)
  await assertReferenceLayout(page, label)
  await page.screenshot({ path: path.join(out, `reference-settings-${label}.png`), animations: 'disabled' })
}
module.exports = { checkHeraldry }
if (require.main === module) {
  const { chromium } = require('playwright')
  ;(async () => {
    const out = path.resolve('visual-review'); await fs.mkdir(out, { recursive: true })
    const browser = await chromium.launch({ args: ['--no-sandbox'] })
    try {
      for (const [width, height] of [[390, 844], [412, 915], [430, 932]]) {
        const page = await browser.newPage({ viewport: { width, height }, hasTouch: true, isMobile: true })
        await skipGuide(page)
        const errors = []; page.on('pageerror', e => errors.push(e.message))
        await page.goto(qaOrigin('VISUAL_QA_URL'))
        await page.getByRole('button', { name: START_BUTTON }).click()
        await checkHeraldry(page, `${width}`, out)
        if (errors.length) throw new Error(errors.join('\n'))
        await page.close()
      }
    } finally { await browser.close() }
  })().catch(e => { console.error(e); process.exitCode = 1 })
}
