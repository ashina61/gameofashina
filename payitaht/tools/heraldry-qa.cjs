const path = require('node:path')
const fs = require('node:fs/promises')
const { START_BUTTON, skipGuide } = require('./lib/qa.cjs')

async function checkHeraldry(page, label, out) {
  const key = 'payitaht-adalari-v1'
  const saved = await page.evaluate(key => localStorage.getItem(key), key)
  const openProfile = async () => {
    await page.getByRole('button', { name: /^Hükümdar profili:/ }).click()
    await page.getByText('Sancak Düzenle', { exact: true }).waitFor()
  }
  const choice = (group, name) => page.getByRole('radiogroup', { name: group, exact: true }).getByRole('radio', { name, exact: true })
  const profileTab = async group => {
    const name = group === 'Sancak biçimi' ? 'Biçim' : group === 'Arma' ? 'Arma' : 'Renk'
    await page.locator('.profile-v2-banner-editor').getByRole('button', { name, exact: true }).click()
  }
  const profileChoice = async (group, name) => {
    await profileTab(group)
    const radios = page.getByRole('radiogroup', { name: group, exact: true }).getByRole('radio')
    const exact = page.getByRole('radiogroup', { name: group, exact: true }).getByRole('radio', { name, exact: true })
    if (await exact.count()) return exact.first()
    return radios.filter({ hasText: name }).first()
  }
  try {
    await openProfile()
    for (const [group, count] of [['Sancak biçimi', 10], ['Arma', 12], ['Renk', 12]]) {
      await profileTab(group)
      if (await page.getByRole('radiogroup', { name: group, exact: true }).getByRole('radio').count() !== count) throw new Error(`${label}: missing ${group} choices`)
    }
    await profileTab('Sancak biçimi')
    const paths = await page.locator('.profile-v2-banner-editor .court-banner-options .sancak-art').evaluateAll(svgs => svgs.map(svg => svg.querySelector('g > path').getAttribute('d')))
    if (new Set(paths).size !== 10) throw new Error(`${label}: banner silhouettes are duplicated`)
    await (await profileChoice('Sancak biçimi', 'Yuvarlak uç')).click()
    await (await profileChoice('Arma', 'Bozkurt')).click()
    await (await profileChoice('Renk', 'Mor')).click()
    await page.screenshot({ path: path.join(out, `heraldry-profile-${label}.png`), animations: 'disabled' })
    await page.getByRole('button', { name: 'Profili ve sancağı kaydet', exact: true }).click()
    await page.waitForFunction(key => JSON.parse(localStorage.getItem(key)).profile?.banner === 'yuvarlak', key)
    await page.reload()
    await page.getByRole('button', { name: START_BUTTON }).click()
    await openProfile()
    for (const [group, name] of [['Sancak biçimi', 'Yuvarlak uç'], ['Arma', 'Bozkurt'], ['Renk', 'Mor']]) {
      const radio = await profileChoice(group, name)
      if (await radio.getAttribute('aria-checked') !== 'true') throw new Error(`${label}: choice did not survive reload`)
    }
    // An existing player-led alliance uses the same saved appearance.
    // Tohum yeni belgede, oyun kaydı okumadan önce uygulanır: eski sayfanın
    // otomatik kaydı araya girip ittifakı silse de yeniden yüklemede geri gelir.
    await page.addInitScript(({ key, founded }) => {
      try {
        const e = JSON.parse(localStorage.getItem(key))
        if (!e?.world || e.world.pact) return
        e.world.pact = { name: 'Sancak Birliği', tag: 'SAN', motto: '', founded, members: [], ranks: {}, circulars: [], stance: {} }
        e.world.alliance = null
        localStorage.setItem(key, JSON.stringify(e))
      } catch { /* kayıt yoksa dokunma */ }
    }, { key, founded: Date.now() })
    await page.reload()
    await page.getByRole('button', { name: START_BUTTON }).click()
    await page.getByRole('button', { name: 'İttifak', exact: true }).click()
    // Düğme gelmezse CI günlüğüne sayfanın durumunu yaz (kayıt, açık panel, ekrandaki yazı).
    await page.getByRole('button', { name: 'Sancağı düzenle' }).click().catch(async e => {
      const state = await page.evaluate(key => {
        const raw = localStorage.getItem(key); let pact = 'yok'
        try { pact = JSON.parse(raw).world?.pact?.name ?? 'yok' } catch { pact = 'okunamadı' }
        return { url: location.href, pact, dialogs: [...document.querySelectorAll('[role="dialog"]')].map(d => d.getAttribute('aria-label')), body: document.body.innerText.slice(0, 500) }
      }, key).catch(err => ({ evaluate: String(err) }))
      console.error(`${label}: alliance editor missing`, JSON.stringify(state))
      throw e
    })
    await choice('Sancak biçimi', 'Üç dil').click()
    await choice('Arma', 'Çınar').click()
    await choice('Renk', 'Zeytin').click()
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
        await skipGuide(page)
        // Route the production export directly, without requiring a listening server.
        await page.route('http://heraldry.test/**', async route => {
          const url = new URL(route.request().url())
          const name = url.pathname.replace(/^\/gameofashina\//, '') || 'index.html'
          try { await route.fulfill({ path: path.join(process.cwd(), 'out', name) }) }
          catch { await route.fulfill({ status: 404, body: 'Not found' }) }
        })
        const errors = []; page.on('pageerror', e => errors.push(e.message))
        await page.goto('http://heraldry.test/gameofashina/')
        await page.getByRole('button', { name: START_BUTTON }).click()
        await checkHeraldry(page, `${width}`, out)
        if (errors.length) throw new Error(errors.join('\n'))
        console.log(`${width}px: distinct banners, full palette, saved profile and alliance editor passed`)
        await page.close()
      }
    } finally { await browser.close() }
  })().catch(e => { console.error(e); process.exitCode = 1 })
}
