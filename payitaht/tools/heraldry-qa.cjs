const path = require('node:path')

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
  await page.getByRole('heading', { name: 'Unvan yolu', exact: true }).waitFor()
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
