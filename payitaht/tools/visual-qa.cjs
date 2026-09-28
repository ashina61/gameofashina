/* Payitaht mobile visual QA: capture the actual rendered Phaser map, not a mockup. */
const fs = require('node:fs/promises')
const path = require('node:path')
const { chromium } = require('playwright')

async function main() {
  const out = path.resolve('visual-review')
  await fs.mkdir(out, { recursive: true })
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] })
  const diagnostics = { pageErrors: [], missingGameAssets: [], screenshots: [], viewports: [], buildingStageLoads: {}, coastSeed: {} }
  const origin = process.env.VISUAL_QA_URL || 'http://127.0.0.1:4173/gameofashina/'

  const runViewport = async ({ width, height }) => {
    const label = `${width}x${height}`
    diagnostics.viewports.push(label)
    const context = await browser.newContext({
      viewport: { width, height },
      deviceScaleFactor: 2,
      isMobile: true,
      hasTouch: true,
      colorScheme: 'light',
    })
    const page = await context.newPage()
    const buildingStageLoads = new Set()
    page.on('pageerror', error => diagnostics.pageErrors.push(`${label}: ${error.message}`))
    page.on('response', response => {
      const url = response.url()
      if (response.status() >= 400 && url.includes('/images/game/')) {
        diagnostics.missingGameAssets.push(`${label}: ${response.status()} ${url}`)
      }
      if (/\/images\/game\/buildings\/[a-z0-9_-]+-[123]\.webp(?:\?|$)/.test(url)) {
        buildingStageLoads.add(url.split('?')[0])
      }
    })

    await page.goto(origin, { waitUntil: 'domcontentloaded', timeout: 60_000 })

    const title = path.join(out, `title-${label}.png`)
    await page.getByRole('button', { name: /Hikâyeye başla|Devam et/ }).waitFor({ timeout: 45_000 })
    await page.screenshot({ path: title, animations: 'disabled' })
    diagnostics.screenshots.push(path.basename(title))

    await page.getByRole('button', { name: /Hikâyeye başla|Devam et/ }).click()
    await page.waitForFunction(() => {
      const canvas = document.querySelector('canvas')
      return canvas && canvas.width > 0 && canvas.height > 0 && canvas.clientWidth > 0
    }, null, { timeout: 45_000 })

    // Give React, texture loading and Phaser's first render time to settle.
    await page.waitForTimeout(6500)

    const center = path.join(out, `city-center-${label}.png`)
    await page.screenshot({ path: center, animations: 'disabled' })
    diagnostics.screenshots.push(path.basename(center))
    diagnostics.buildingStageLoads[label] = [...buildingStageLoads].map(url => url.split('/').pop()).sort()
    if (buildingStageLoads.size > 32) {
      throw new Error(`${label}: city boot loaded ${buildingStageLoads.size} staged building textures; lazy-loading regressed.`)
    }

    // Kıyı QA'sı gerçek binayı görsün: boş başlangıç limanına odaklanmak
    // mavi-panel/anchor gibi coast regression'larını yakalamıyordu. Test save'inde
    // Liman + Tersane'yi kullanıcı ekranındaki gibi seviye 2 ve iki coast slotuna
    // yerleştir; sonra sayfayı gerçek save parse/migration yolu üzerinden yeniden aç.
    const coastSeedRaw = await page.evaluate(() => {
      const key = 'payitaht-adalari-v1'
      const empire = JSON.parse(localStorage.getItem(key) || 'null')
      const city = empire?.cities?.find(c => c.id === empire.activeCityId) ?? empire?.cities?.[0]
      const game = city?.game
      if (!game?.buildings || !game?.placement) throw new Error('Visual QA active-city save shape unavailable')
      game.buildings.liman = 2
      game.buildings.tersane = 2
      game.placement.liman = 25
      game.placement.tersane = 26
      return JSON.stringify(empire)
    })
    // reload sırasında useGame pagehide handler eski in-memory kaydı flush eder.
    // Bu yüzden seed'i eski document'ta localStorage'a yazmak yetmez. Init script
    // yeni document'ta uygulama kodundan ÖNCE çalışır ve test state'ini son kez yazar.
    await page.addInitScript(raw => {
      localStorage.setItem('payitaht-adalari-v1', raw)
    }, coastSeedRaw)
    await page.reload({ waitUntil: 'domcontentloaded' })
    await page.getByRole('button', { name: /Hikâyeye başla|Devam et/ }).waitFor({ timeout: 45_000 })
    await page.getByRole('button', { name: /Hikâyeye başla|Devam et/ }).click()
    await page.waitForFunction(() => {
      const canvas = document.querySelector('canvas')
      return canvas && canvas.width > 0 && canvas.clientWidth > 0
    }, null, { timeout: 45_000 })
    await page.waitForTimeout(5000)
    const seeded = await page.evaluate(() => {
      const empire = JSON.parse(localStorage.getItem('payitaht-adalari-v1') || 'null')
      const city = empire?.cities?.find(c => c.id === empire.activeCityId) ?? empire?.cities?.[0]
      const game = city?.game
      return {
        cityId: city?.id ?? null,
        activeCityId: empire?.activeCityId ?? null,
        liman: game?.buildings?.liman ?? null,
        tersane: game?.buildings?.tersane ?? null,
        pLiman: game?.placement?.liman ?? null,
        pTersane: game?.placement?.tersane ?? null,
      }
    })
    diagnostics.coastSeed = diagnostics.coastSeed || {}
    diagnostics.coastSeed[label] = seeded
    if (seeded.liman !== 2 || seeded.tersane !== 2 || seeded.pLiman !== 25 || seeded.pTersane !== 26) {
      throw new Error(`${label}: coast QA seed did not survive reload: ${JSON.stringify(seeded)}`)
    }

    // Coast regression guard: seeded buildings must actually request their staged
    // art after reload. This catches stale asset revisions / wrong generator output
    // even if the save shape itself is valid.
    const loadedNames = [...buildingStageLoads].map(url => url.split('/').pop())
    for (const expected of ['liman-duz-1.webp', 'tersane-duz-1.webp']) {
      if (!loadedNames.includes(expected)) {
        throw new Error(`${label}: expected coast texture was not loaded: ${expected}; loaded=${loadedNames.join(',')}`)
      }
    }

    const harbour = page.getByRole('button', { name: 'Donanma ve limana git' })
    await harbour.click({ timeout: 10_000 })
    await page.waitForTimeout(1800)
    const coast = path.join(out, `harbour-${label}.png`)
    await page.screenshot({ path: coast, animations: 'disabled' })
    diagnostics.screenshots.push(path.basename(coast))

    // Regression for the actual multi-city UI: opening the atlas must not
    // throw and the legacy save must have been wrapped as a valid empire.
    await page.getByRole('button', { name: 'Harita', exact: true }).click()
    await page.getByText('Dünya haritası', { exact: true }).first().waitFor({ timeout: 10_000 })
    const empire = await page.evaluate(() =>
      JSON.parse(localStorage.getItem('payitaht-adalari-v1') || 'null'))
    if (empire?.version !== 1 || !Array.isArray(empire.cities) || empire.cities.length < 1) {
      throw new Error(`${label}: Empire save was not initialized or migrated.`)
    }
    const atlas = path.join(out, `island-atlas-${label}.png`)
    await page.screenshot({ path: atlas, animations: 'disabled' })
    diagnostics.screenshots.push(path.basename(atlas))

    // Content UI QA: the main city/harbour screenshots cannot catch card/tab/form
    // regressions inside the full-screen panels. Exercise representative screens on
    // the compact viewport and fail on horizontal overflow.
    if (width === 390) {
      const assertPanelFits = async name => {
        const overflow = await page.evaluate(() => ({
          inner: window.innerWidth,
          doc: document.documentElement.scrollWidth,
          panel: document.querySelector('.bp')?.scrollWidth ?? 0,
        }))
        if (overflow.doc > overflow.inner + 2 || overflow.panel > overflow.inner + 2) {
          throw new Error(`${label}: ${name} panel horizontally overflows: ${JSON.stringify(overflow)}`)
        }
      }
      const snapPanel = async name => {
        await page.waitForTimeout(250)
        await assertPanelFits(name)
        const file = path.join(out, `ui-${name}-${label}.png`)
        await page.screenshot({ path: file, animations: 'disabled' })
        diagnostics.screenshots.push(path.basename(file))
      }
      const back = async () => {
        await page.getByRole('button', { name: 'Geri' }).first().click()
        await page.waitForTimeout(180)
      }

      await back() // Dünya haritası -> şehir

      await page.getByRole('button', { name: /^Araştırma danışmanı/ }).click()
      await page.getByRole('dialog', { name: /Âlim · Araştırma/ }).waitFor({ timeout: 10_000 })
      await snapPanel('research')
      await back()

      await page.getByRole('button', { name: /^Şehir danışmanı/ }).click()
      await page.getByRole('button', { name: /Bütün yapılar/ }).click()
      await page.getByRole('dialog', { name: /Şehrini büyüt/ }).waitFor({ timeout: 10_000 })
      await snapPanel('buildings')
      await back()

      await page.getByRole('button', { name: /^Ordu danışmanı/ }).click()
      await page.getByRole('button', { name: /Orduya git/ }).click()
      await page.getByRole('dialog', { name: /Ordu ve donanma/ }).waitFor({ timeout: 10_000 })
      await snapPanel('army')
      await back()

      await page.getByRole('button', { name: /^Hükümdar profili:/ }).click()
      await page.getByRole('button', { name: /Oyun ayarları/ }).click()
      await page.getByRole('dialog', { name: /Oyun ayarları/ }).waitFor({ timeout: 10_000 })
      await snapPanel('settings')
      await back()
    }

    await context.close()
  }

  try {
    // Compact and tall/common modern Android widths: catch HUD collisions that
    // a single 390×844 reference viewport can miss.
    for (const viewport of [
      { width: 390, height: 844 },
      { width: 412, height: 915 },
    ]) {
      await runViewport(viewport)
    }

    const requiredPanelShots = ['ui-research-390x844.png', 'ui-buildings-390x844.png', 'ui-army-390x844.png', 'ui-settings-390x844.png']
    for (const shot of requiredPanelShots) {
      if (!diagnostics.screenshots.includes(shot)) throw new Error(`Missing content UI QA screenshot: ${shot}`)
    }
    await fs.writeFile(path.join(out, 'diagnostics.json'), JSON.stringify(diagnostics, null, 2))
    if (diagnostics.pageErrors.length || diagnostics.missingGameAssets.length) {
      throw new Error('Mobile city rendered with JavaScript errors or missing game assets; check visual-review/diagnostics.json')
    }
  } finally {
    await browser.close()
  }
}

main().catch(error => {
  console.error(error)
  process.exitCode = 1
})
