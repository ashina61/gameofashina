const path = require('node:path')
const fs = require('node:fs/promises')
const { START_BUTTON, skipGuide } = require('./lib/qa.cjs')

async function assertReferenceLayout(page, label, screen) {
  const shell = page.locator('.ref-os-shell')
  await shell.waitFor({ state: 'visible' })
  const metrics = await shell.evaluate(el => {
    const side = el.querySelector('.ref-os-sidebar')
    const top = el.querySelector('.ref-os-topbar')
    const main = el.querySelector('.ref-os-main')
    const scroll = el.querySelector('.ref-os-content-scroll')
    const box = node => node ? node.getBoundingClientRect() : null
    return {
      viewport: { width: window.innerWidth, height: window.innerHeight },
      shell: box(el), side: box(side), top: box(top), main: box(main),
      overflowX: document.documentElement.scrollWidth > window.innerWidth + 2,
      scrollOverflowX: scroll ? scroll.scrollWidth > scroll.clientWidth + 2 : false,
      visibleNav: getComputedStyle(document.querySelector('.ika-nav')).display,
      visibleTop: getComputedStyle(document.querySelector('.ika-top')).display,
    }
  })
  if (metrics.overflowX || metrics.scrollOverflowX) throw new Error(`${label}/${screen}: horizontal overflow ${JSON.stringify(metrics)}`)
  if (metrics.visibleNav !== 'none' || metrics.visibleTop !== 'none') throw new Error(`${label}/${screen}: old HUD is still visible`)
  if (!metrics.side || metrics.side.width < 72 || metrics.side.width > metrics.viewport.width * .26) throw new Error(`${label}/${screen}: sidebar width drift ${JSON.stringify(metrics.side)}`)
  if (!metrics.top || metrics.top.height < 48 || metrics.top.height > 68) throw new Error(`${label}/${screen}: top resource rail height drift`)
  if (!metrics.main || metrics.main.width < metrics.viewport.width * .67) throw new Error(`${label}/${screen}: parchment workspace is too narrow`)

  const tiny = await page.locator('.ref-os-shell button, .ref-os-shell input, .ref-os-shell select').evaluateAll(nodes => nodes.filter(node => {
    const r = node.getBoundingClientRect()
    const s = getComputedStyle(node)
    return s.display !== 'none' && s.visibility !== 'hidden' && r.width > 0 && r.height > 0 && (r.height < 40 || r.width < 28)
  }).map(node => ({ text: node.getAttribute('aria-label') || node.textContent.trim().slice(0, 40), rect: node.getBoundingClientRect().toJSON() })).slice(0, 8))
  if (tiny.length) throw new Error(`${label}/${screen}: undersized interactive controls ${JSON.stringify(tiny)}`)
}

async function checkHeraldry(page, label, out) {
  await page.getByRole('button', { name: /^Hükümdar profili:/ }).click()
  await page.getByRole('heading', { name: 'Profil', exact: true }).waitFor()
  await page.getByRole('heading', { name: 'Rozetler', exact: true }).waitFor()
  await page.getByRole('heading', { name: 'Başarılar', exact: true }).waitFor()
  if (await page.locator('.ref-os-sidebar nav > button').count() !== 10) throw new Error(`${label}: approved sidebar must have 10 entries`)
  if (await page.locator('.ref-os-resources > span').count() !== 5) throw new Error(`${label}: approved resource rail must have 5 counters`)
  if (await page.locator('.ref-profile-reference-stats > span').count() !== 4) throw new Error(`${label}: approved profile must have 4 stat columns`)
  if (await page.locator('.ref-profile-reference-badges > button').count() !== 5) throw new Error(`${label}: approved profile must show 5 badges`)
  if (await page.locator('.ref-achievement-row').count() !== 3) throw new Error(`${label}: approved profile must show 3 featured achievements`)
  await assertReferenceLayout(page, label, 'profile')
  await page.screenshot({ path: path.join(out, `reference-profile-${label}.png`), animations: 'disabled' })

  await page.getByRole('button', { name: 'Ayarlar', exact: true }).click()
  await page.getByRole('heading', { name: 'Ayarlar', exact: true }).waitFor()
  const tabs = page.locator('.ref-settings-tabs [role="tab"]')
  if (await tabs.count() !== 5) throw new Error(`${label}: approved settings must have 5 tabs`)
  for (const text of ['Dil', 'Ses Ayarları', 'Grafik Ayarları', 'Arayüz']) await page.getByRole('heading', { name: text, exact: true }).waitFor()
  if (await page.locator('.ref-slider-row').count() !== 3) throw new Error(`${label}: approved settings must have 3 audio sliders`)
  if (await page.locator('.ref-switch-row').count() !== 5) throw new Error(`${label}: approved settings must have 5 switches`)
  if (await page.locator('.ref-settings-actions > button').count() !== 2) throw new Error(`${label}: approved settings must have 2 bottom actions`)
  await assertReferenceLayout(page, label, 'settings')
  await page.screenshot({ path: path.join(out, `reference-settings-${label}.png`), animations: 'disabled' })
  console.log(`${label}px: approved profile/settings reference composition passed`)
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
        await page.goto('http://127.0.0.1:4173/gameofashina/')
        await page.getByRole('button', { name: START_BUTTON }).click()
        await checkHeraldry(page, `${width}`, out)
        if (errors.length) throw new Error(errors.join('\n'))
        await page.close()
      }
    } finally { await browser.close() }
  })().catch(e => { console.error(e); process.exitCode = 1 })
}
