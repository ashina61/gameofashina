const path = require('node:path')
const fs = require('node:fs/promises')

async function checkHeraldry(page, label, out) {
  const key = 'payitaht-adalari-v1'
  const saved = await page.evaluate(key => localStorage.getItem(key), key)
  const openProfile = async () => {
    await page.getByRole('button', { name: /^Hükümdar profili:/ }).click()
    await page.getByRole('button', { name: 'Düzenle', exact: true }).click()
  }
  const choice = (group, name) => page.getByRole('radiogroup', { name: group, exact: true }).getByRole('radio', { name, exact: true })
  try {
    await openProfile()
    for (const [group, count] of [['Sancak biçimi', 10], ['Arma', 12], ['Renk', 12]]) {
      if (await page.getByRole('radiogroup', { name: group, exact: true }).getByRole('radio').count() !== count) throw new Error(`${label}: missing ${group} choices`)
    }
    const paths = await page.locator('.banner-picker .sancak-art').evaluateAll(svgs => svgs.map(svg => svg.querySelector('g > path').getAttribute('d')))
    if (new Set(paths).size !== 10) throw new Error(`${label}: banner silhouettes are duplicated`)
    await choice('Sancak biçimi', 'Yuvarlak uç').click()
    await choice('Arma', 'Bozkurt').click()
    await choice('Renk', '#49336f').click()
    await page.screenshot({ path: path.join(out, `heraldry-profile-${label}.png`), animations: 'disabled' })
    await page.getByRole('button', { name: 'Kaydet', exact: true }).click()
    await page.waitForFunction(key => JSON.parse(localStorage.getItem(key)).profile?.banner === 'yuvarlak', key)
    await page.reload()
    await page.getByRole('button', { name: /Hikâyeye başla|Devam et/ }).click()
    await openProfile()
    for (const [group, name] of [['Sancak biçimi', 'Yuvarlak uç'], ['Arma', 'Bozkurt'], ['Renk', '#49336f']]) {
      if (await choice(group, name).getAttribute('aria-checked') !== 'true') throw new Error(`${label}: choice did not survive reload`)
    }
    // An existing player-led alliance uses the same saved appearance.
    await page.evaluate(key => {
      const e = JSON.parse(localStorage.getItem(key))
      e.world.pact = { name: 'Sancak Birliği', tag: 'SAN', motto: '', founded: Date.now(), members: [], ranks: {}, circulars: [], stance: {} }
      e.world.alliance = null
      localStorage.setItem(key, JSON.stringify(e))
    }, key)
    const seeded = await page.evaluate(key => localStorage.getItem(key), key)
    await page.addInitScript(({key, seeded}) => localStorage.setItem(key, seeded), {key, seeded})
    await page.reload()
    await page.getByRole('button', { name: /Hikâyeye başla|Devam et/ }).click()
    await page.getByRole('button', { name: 'İttifak', exact: true }).click()
    await page.getByRole('button', { name: 'Sancağı düzenle' }).click()
    await choice('Sancak biçimi', 'Üç dil').click()
    await choice('Arma', 'Çınar').click()
    await choice('Renk', '#796529').click()
    await page.screenshot({ path: path.join(out, `heraldry-alliance-${label}.png`), animations: 'disabled' })
    await page.getByRole('button', { name: 'Sancağı kaydet' }).click()
    await page.waitForFunction(key => { const p = JSON.parse(localStorage.getItem(key)).profile; return p.banner === 'ucdil' && p.crest === 'cinar' && p.color === '#796529' }, key)
    await page.locator('.alliance-head').getByRole('img', { name: 'Sancak: Üç dil', exact: true }).waitFor()
    const overflow = await page.locator('.bp').evaluate(el => el.scrollWidth > el.clientWidth + 2)
    if (overflow) throw new Error(`${label}: heraldry editor overflows the phone screen`)
  } finally {
    await page.evaluate(({ key, saved }) => { if (saved) localStorage.setItem(key, saved); else localStorage.removeItem(key) }, { key, saved })
  }
}

module.exports = { checkHeraldry }
if (require.main === module) {
  const { chromium } = require('playwright')
  ;(async () => {
    const out = path.resolve('visual-review'); await fs.mkdir(out, { recursive: true })
    const browser = await chromium.launch({ args: ['--no-sandbox'] })
    try {
      for (const width of [390, 412, 430]) {
        const page = await browser.newPage({ viewport: { width, height: 844 }, hasTouch: true, isMobile: true })
        // Yeni oyunun ilk açılış rehberi QA tıklamalarını örtmesin.
        await page.addInitScript(() => { try { localStorage.setItem('payitaht-rehber', 'goruldu') } catch {} })
        // Route the production export directly, without requiring a listening server.
        await page.route('http://heraldry.test/**', async route => {
          const url = new URL(route.request().url())
          const name = url.pathname.replace(/^\/gameofashina\//, '') || 'index.html'
          try { await route.fulfill({ path: path.join(process.cwd(), 'out', name) }) }
          catch { await route.fulfill({ status: 404, body: 'Not found' }) }
        })
        const errors = []; page.on('pageerror', e => errors.push(e.message))
        await page.goto('http://heraldry.test/gameofashina/')
        await page.getByRole('button', { name: /Hikâyeye başla|Devam et/ }).click()
        await checkHeraldry(page, `${width}`, out)
        if (errors.length) throw new Error(errors.join('\n'))
        console.log(`${width}px: distinct banners, full palette, saved profile and alliance editor passed`)
        await page.close()
      }
    } finally { await browser.close() }
  })().catch(e => { console.error(e); process.exitCode = 1 })
}
