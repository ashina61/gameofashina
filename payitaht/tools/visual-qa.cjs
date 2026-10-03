/* Payitaht mobile visual QA: capture the actual rendered Phaser map, not a mockup. */
const fs = require('node:fs/promises')
const path = require('node:path')
const { chromium } = require('playwright')
const { checkMapZoom } = require('./map-zoom-qa.cjs')
const { START_BUTTON, qaOrigin, skipGuide } = require('./lib/qa.cjs')

async function main() {
  const out = path.resolve('visual-review')
  await fs.mkdir(out, { recursive: true })
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] })
  const diagnostics = { pageErrors: [], missingGameAssets: [], screenshots: [], viewports: [], buildingStageLoads: {}, coastSeed: {} }
  const origin = qaOrigin('VISUAL_QA_URL')
  let siegeSeedRaw
  // Sahne hazır sinyali (phaser-city markReady): sabit süre beklemek yerine.
  const waitCityReady = async (page, after = 0) => {
    await page.waitForFunction(n => Number(document.documentElement.dataset.cityReady || 0) > n, after, { timeout: 90_000 })
    await page.waitForTimeout(400) // bayrak/duman ilk kareleri
  }
  diagnostics.metrics = {}

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
    // Yeni oyunun ilk açılış rehberi QA tıklamalarını örtmesin.
    await skipGuide(context)
    const page = await context.newPage()
    const buildingStageLoads = new Set()
    page.on('pageerror', error => diagnostics.pageErrors.push(`${label}: ${error.message}`))
    page.on('response', response => {
      const url = response.url()
      if (response.status() >= 400 && url.includes('/images/game/')) {
        diagnostics.missingGameAssets.push(`${label}: ${response.status()} ${url}`)
      }
      // Telefon boyu kopya (-sm, V2 Faz 6.1) aynı aşama sayılır.
      if (/\/images\/game\/buildings\/[a-z0-9_-]+-[123](?:-sm)?\.webp(?:\?|$)/.test(url)) {
        buildingStageLoads.add(url.split('?')[0].replace(/-sm\.webp$/, '.webp'))
      }
    })

    await page.goto(origin, { waitUntil: 'domcontentloaded', timeout: 60_000 })

    const title = path.join(out, `title-${label}.png`)
    await page.getByRole('button', { name: START_BUTTON }).waitFor({ timeout: 45_000 })
    await page.screenshot({ path: title, animations: 'disabled' })
    diagnostics.screenshots.push(path.basename(title))

    const bootStart = Date.now()
    await page.getByRole('button', { name: START_BUTTON }).click()
    await page.waitForFunction(() => {
      const canvas = document.querySelector('canvas')
      return canvas && canvas.width > 0 && canvas.height > 0 && canvas.clientWidth > 0
    }, null, { timeout: 45_000 })
    // React, doku yükleme ve Phaser'ın ilk tam çizimi bitene kadar.
    await waitCityReady(page)
    // Faz 0.6: açılış süresi (Devam et → şehrin ilk tam karesi) ve JS belleği.
    // CI yazılımla çizer; sayılar cihazdan yavaştır, eğilim için tutulur.
    diagnostics.metrics[label] = {
      bootMs: Date.now() - bootStart,
      heapMB: await page.evaluate(() => Math.round((performance.memory?.usedJSHeapSize ?? 0) / 1048576)),
    }

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
    const coastSeedRaw = await page.evaluate(seedWidth => {
      const key = 'payitaht-adalari-v1'
      const empire = JSON.parse(localStorage.getItem(key) || 'null')
      const city = empire?.cities?.find(c => c.id === empire.activeCityId) ?? empire?.cities?.[0]
      const game = city?.game
      if (!game?.buildings || !game?.placement) throw new Error('Visual QA active-city save shape unavailable')
      const coastLevel = seedWidth === 430 ? 8 : seedWidth === 412 ? 5 : 2
      const coastFacing = seedWidth === 430 ? 'right' : seedWidth === 412 ? 'left' : 'straight'
      game.buildings.liman = coastLevel
      game.buildings.tersane = coastLevel
      game.placement.liman = 25
      game.placement.tersane = 26
      game.coastFacing.liman = coastFacing
      game.coastFacing.tersane = coastFacing
      // Boyalı yapının en geniş aşamasını gerçek şehir kadrajında kontrol et.
      game.buildings.cami = 8
      game.placement.cami = 10
      game.buildings.saray = 8
      game.placement.saray = 11
      game.buildings.konut = 8
      game.buildings.carsi = 8
      game.placement.carsi = 12
      game.buildings.kisla = 8
      game.placement.kisla = 7
      game.buildings.medrese = 8
      game.placement.medrese = 9
      game.buildings.kereste = 8
      game.buildings.tas = 8
      game.buildings.ambar = 8
      game.buildings.elcilik = 8
      game.placement.elcilik = 13
      game.buildings.hamam = 8
      game.placement.hamam = 14
      game.buildings.kahvehane = 8
      game.placement.kahvehane = 15
      game.buildings.muze = 8
      game.placement.muze = 16
      game.buildings.marangoz = 8
      game.placement.marangoz = 17
      game.buildings.mimar = 8
      game.placement.mimar = 18
      game.buildings.ormanci = 8
      game.placement.ormanci = 19
      game.buildings.tasci = 8
      game.placement.tasci = 20
      game.buildings.bagci = 8
      game.placement.bagci = 21
      game.buildings.tophane = 8
      game.placement.tophane = 22
      game.buildings.simyahane = 8
      game.placement.simyahane = 23
      game.buildings.camci = 8
      game.placement.camci = 24
      // Tüm kara yuvaları dolu. İkinci viewport tüccarları, üçüncüsü son
      // altı kara yapısını gösterir; ilk viewport zanaat regresyonunu korur.
      const crafts = seedWidth === 390
      const merchants = seedWidth === 412
      const finalBuildings = seedWidth === 430
      game.buildings.mahzen = crafts ? 8 : 0
      game.placement.mahzen = crafts ? 3 : null
      game.buildings.gozlukcu = crafts ? 8 : 0
      game.placement.gozlukcu = crafts ? 5 : null
      game.buildings.barutane = crafts ? 8 : 0
      game.placement.barutane = crafts ? 1 : null
      game.buildings.depo = merchants ? 8 : 0
      game.placement.depo = merchants ? 3 : null
      game.buildings.ticaret_merkezi = merchants ? 8 : 0
      game.placement.ticaret_merkezi = merchants ? 5 : null
      game.buildings.harita_arsivi = merchants ? 8 : 0
      game.placement.harita_arsivi = merchants ? 1 : null
      if (finalBuildings) {
        for (const id of ['elcilik', 'hamam', 'kahvehane']) {
          game.buildings[id] = 0
          game.placement[id] = null
        }
        for (const [id, slot] of [['valilik', 1], ['kara_pazar', 3], ['siginak', 5], ['tekke', 13], ['mabet', 14], ['karagoz', 15], ['korsan_kalesi', 27]]) {
          game.buildings[id] = 8
          game.placement[id] = slot
        }
      }
      return JSON.stringify(empire)
    }, width)
    if (width === 390) siegeSeedRaw = coastSeedRaw
    // reload sırasında useGame pagehide handler eski in-memory kaydı flush eder.
    // Bu yüzden seed'i eski document'ta localStorage'a yazmak yetmez. Init script
    // yeni document'ta uygulama kodundan ÖNCE çalışır ve test state'ini son kez yazar.
    await page.addInitScript(raw => {
      localStorage.setItem('payitaht-adalari-v1', raw)
    }, coastSeedRaw)
    await page.reload({ waitUntil: 'domcontentloaded' })
    await page.getByRole('button', { name: START_BUTTON }).waitFor({ timeout: 45_000 })
    await page.getByRole('button', { name: START_BUTTON }).click()
    await page.waitForFunction(() => {
      const canvas = document.querySelector('canvas')
      return canvas && canvas.width > 0 && canvas.clientWidth > 0
    }, null, { timeout: 45_000 })
    await waitCityReady(page)
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
        limanFacing: game?.coastFacing?.liman ?? null,
        tersaneFacing: game?.coastFacing?.tersane ?? null,
      }
    })
    diagnostics.coastSeed = diagnostics.coastSeed || {}
    diagnostics.coastSeed[label] = seeded
    const coastLevel = width === 430 ? 8 : width === 412 ? 5 : 2
    const coastFacing = width === 430 ? 'right' : width === 412 ? 'left' : 'straight'
    if (seeded.liman !== coastLevel || seeded.tersane !== coastLevel || seeded.pLiman !== 25 || seeded.pTersane !== 26 || seeded.limanFacing !== coastFacing || seeded.tersaneFacing !== coastFacing) {
      throw new Error(`${label}: coast QA seed did not survive reload: ${JSON.stringify(seeded)}`)
    }

    // Coast regression guard: seeded buildings must actually request their staged
    // art after reload. This catches stale asset revisions / wrong generator output
    // even if the save shape itself is valid.
    const loadedNames = [...buildingStageLoads].map(url => url.split('/').pop())
    const coastVariant = coastFacing === 'straight' ? '-duz' : ''
    const coastStage = width === 430 ? 3 : width === 412 ? 2 : 1
    for (const expected of [`liman${coastVariant}-painted-${coastStage}.webp`, `tersane${coastVariant}-painted-${coastStage}.webp`]) {
      if (!loadedNames.includes(expected)) {
        throw new Error(`${label}: expected coast texture was not loaded: ${expected}; loaded=${loadedNames.join(',')}`)
      }
    }
    if (width === 390) {
      for (const expected of ['cami-painted-3.webp', 'saray-painted-3.webp', 'konut-painted-3.webp', 'kisla-painted-3.webp', 'medrese-painted-3.webp', 'carsi-painted-3.webp', 'kereste-painted-3.webp', 'ambar-painted-3.webp', 'elcilik-painted-3.webp', 'hamam-painted-3.webp', 'kahvehane-painted-3.webp', 'muze-painted-3.webp', 'marangoz-painted-3.webp', 'mimar-painted-3.webp', 'ormanci-painted-3.webp', 'tasci-painted-3.webp', 'bagci-painted-3.webp', 'tophane-painted-3.webp', 'simyahane-painted-3.webp', 'camci-painted-3.webp', 'mahzen-painted-3.webp', 'gozlukcu-painted-3.webp', 'barutane-painted-3.webp']) {
        if (!loadedNames.includes(expected)) throw new Error(`${label}: painted stage 3 did not load: ${expected}`)
      }
      const specialists = path.join(out, `city-crafts-upgrade-${label}.png`)
      await page.screenshot({ path: specialists, animations: 'disabled' })
      diagnostics.screenshots.push(path.basename(specialists))
    } else if (width === 412) {
      for (const expected of ['depo-painted-3.webp', 'ticaret_merkezi-painted-3.webp', 'harita_arsivi-painted-3.webp']) {
        if (!loadedNames.includes(expected)) throw new Error(`${label}: merchant stage 3 did not load: ${expected}`)
      }
      const merchants = path.join(out, `city-merchants-upgrade-${label}.png`)
      await page.screenshot({ path: merchants, animations: 'disabled' })
      diagnostics.screenshots.push(path.basename(merchants))
    } else {
      for (const expected of ['valilik-painted-3.webp', 'kara_pazar-painted-3.webp', 'siginak-painted-3.webp', 'tekke-painted-3.webp', 'mabet-painted-3.webp', 'karagoz-painted-3.webp', 'korsan_kalesi-painted-3.webp']) {
        if (!loadedNames.includes(expected)) throw new Error(`${label}: final painted stage 3 did not load: ${expected}`)
      }
      const finalBuildings = path.join(out, `city-final-buildings-${label}.png`)
      await page.screenshot({ path: finalBuildings, animations: 'disabled' })
      diagnostics.screenshots.push(path.basename(finalBuildings))
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
    if (typeof empire?.version !== 'number' || empire.version < 1 || !Array.isArray(empire.cities) || empire.cities.length < 1) {
      throw new Error(`${label}: Empire save was not initialized or migrated.`)
    }
    await checkMapZoom(page, '.world-map-scroll', `world-${label}`, out)
    const atlas = path.join(out, `island-atlas-${label}.png`)
    await page.screenshot({ path: atlas, animations: 'disabled' })
    diagnostics.screenshots.push(path.basename(atlas))

    // The island's forest must have actual loaded art, not just its label.
    await page.getByRole('button', { name: 'Geri' }).first().click()
    await page.getByRole('button', { name: 'Ada', exact: true }).click()
    const forest = page.getByRole('button', { name: /^Ada ormanı, seviye/ })
    const forestArt = forest.locator('img')
    await forestArt.waitFor()
    await page.waitForFunction(() => {
      const img = document.querySelector('.island-forest > img')
      return img?.complete && img.naturalWidth > 0
    }, null, { timeout: 10_000 })
    const forestBox = await forestArt.boundingBox()
    if (!forestBox || forestBox.width < 50 || forestBox.height < 35) throw new Error(`${label}: forest art is hidden or too small`)
    await checkMapZoom(page, '.island-map-viewport', `island-${label}`, out)
    const islandForest = path.join(out, `island-forest-${label}.png`)
    await page.screenshot({ path: islandForest, animations: 'disabled' })
    diagnostics.screenshots.push(path.basename(islandForest))
    await forest.click()
    await page.getByRole('dialog', { name: /Ada ormanı/ }).waitFor()
    await page.getByRole('heading', { name: /Ada ormanı · Sv\./ }).waitFor()
    await page.getByRole('button', { name: 'Geri' }).first().click()
    await page.getByRole('button', { name: 'Şehre dön', exact: true }).click()

    // Content UI QA: the main city/harbour screenshots cannot catch card/tab/form
    // regressions inside the full-screen panels. Exercise representative screens on
    // the compact viewport and fail on horizontal overflow.
    if (width === 390) {
      const assertPanelFits = async name => {
        const overflow = await page.evaluate(() => ({
          inner: window.innerWidth,
          doc: document.documentElement.scrollWidth,
          panel: document.querySelector('.bp')?.scrollWidth ?? 0,
          // Taşan öğeler (metin düğümleri dahil): hatada neyin taştığı yazsın.
          culprits: (() => {
            const root = document.querySelector('.bp'), out = [], range = document.createRange()
            if (!root) return out
            const walker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT)
            for (let n = walker.nextNode(); n && out.length < 6; n = walker.nextNode()) {
              let r
              if (n.nodeType === 3) { if (!n.textContent.trim()) continue; range.selectNodeContents(n); r = range.getBoundingClientRect() } else r = n.getBoundingClientRect()
              if (r.right > window.innerWidth + 2 || r.left < -2) {
                const el = n.nodeType === 3 ? n.parentElement : n
                out.push(`${n.nodeType === 3 ? 'text in ' : ''}${el.tagName.toLowerCase()}.${String(el.className).split(' ').slice(0, 2).join('.')} [${Math.round(r.left)}..${Math.round(r.right)}]`)
              }
            }
            return out
          })(),
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

      await page.getByRole('button', { name: /^Araştırma danışmanı/ }).click()
      await page.getByRole('dialog', { name: /Âlim · Araştırma/ }).waitFor({ timeout: 10_000 })
      await snapPanel('research')
      await back()

      await page.getByRole('button', { name: /^Şehir danışmanı/ }).click()
      await page.getByRole('button', { name: /Bütün yapılar/ }).click()
      await page.getByRole('dialog', { name: /Şehrini büyüt/ }).waitFor({ timeout: 10_000 })
      await snapPanel('buildings')
      await page.getByRole('searchbox', { name: 'Yapı ara' }).fill('Medrese')
      await page.locator('.building-list-item').filter({ hasText: 'Medrese' }).click()
      await page.getByRole('dialog', { name: 'Medrese sayfası' }).waitFor({ timeout: 10_000 })
      for (const [stage, button] of [[3, null], [1, 'Sv. 1–3 görünümü'], [2, 'Sv. 4–7 görünümü']]) {
        if (button) await page.getByRole('button', { name: button }).click()
        const art = page.getByRole('img', { name: 'Medrese görünümü' })
        await art.evaluate(img => new Promise((resolve, reject) => {
          if (img.complete && img.naturalWidth > 0) return resolve()
          img.addEventListener('load', resolve, { once: true })
          img.addEventListener('error', reject, { once: true })
        }))
        const src = await art.getAttribute('src')
        // Arayüz telefon boyu kopyayı kullanır (V2 Faz 6.1).
        if (!src?.includes(`medrese-painted-${stage}-sm.webp?art=20260930-observatory-v1`)) {
          throw new Error(`Medrese stage ${stage} loaded unexpected art: ${src}`)
        }
        await snapPanel(`medrese-stage-${stage}`)
      }
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

      // Kullanıcıdaki 345px koloni ekranı: üç şehir eylemi kartı/sayfayı
      // yana itmemeli. Save parse yolundan ikinci şehri açıp gerçek paneli ölç.
      const colonyRaw = await page.evaluate(() => {
        const empire = JSON.parse(localStorage.getItem('payitaht-adalari-v1'))
        const colony = structuredClone(empire.cities[0])
        colony.id = 'city-2'
        colony.name = 'Yeni Sahil'
        colony.islandId = 'baglik'
        colony.game.buildings.saray = 0
        colony.game.placement.saray = null
        colony.game.buildings.valilik = 1
        colony.game.placement.valilik = 11
        empire.cities.push(colony)
        empire.activeCityId = colony.id
        empire.nextId = 3
        return JSON.stringify(empire)
      })
      await page.addInitScript(raw => localStorage.setItem('payitaht-adalari-v1', raw), colonyRaw)
      await page.setViewportSize({ width: 345, height: 768 })
      await page.reload({ waitUntil: 'domcontentloaded' })
      await page.getByRole('button', { name: START_BUTTON }).click()
      await page.getByRole('button', { name: /Şehir: Yeni Sahil.*Şehirlerini aç/ }).click()
      await page.getByRole('dialog', { name: /Şehirlerin/ }).waitFor()
      const boxes = await page.evaluate(() => {
        const card = document.querySelector('.cities-panel .city-card')
        const buttons = [...(card?.querySelectorAll('.batch-row button') || [])]
        const viewport = window.innerWidth
        return { viewport, scroll: document.documentElement.scrollWidth,
          card: card?.getBoundingClientRect().toJSON(),
          buttons: buttons.map(button => button.getBoundingClientRect().toJSON()) }
      })
      if (!boxes.card || boxes.buttons.length !== 3 || boxes.scroll > boxes.viewport + 2 ||
          boxes.card.left < -2 || boxes.card.right > boxes.viewport + 2 ||
          boxes.buttons.some(b => b.left < -2 || b.right > boxes.viewport + 2)) {
        throw new Error(`345px colony page overflow: ${JSON.stringify(boxes)}`)
      }
      diagnostics.colonyLayout = boxes
      const colonyShot = path.join(out, 'ui-colony-345x768.png')
      await page.screenshot({ path: colonyShot, animations: 'disabled' })
      diagnostics.screenshots.push(path.basename(colonyShot))
    }

    await context.close()
  }

  try {
    // Compact and tall/common modern Android widths: catch HUD collisions that
    // a single 390×844 reference viewport can miss.
    // CI bu üç genişliği paralel işlerde koşturur: VISUAL_QA_VIEWPORTS=390x844
    // (kuşatma turu ve içerik sayfaları 390 işindedir). Boşsa hepsi sırayla.
    const all = [{ width: 390, height: 844 }, { width: 412, height: 915 }, { width: 430, height: 932 }]
    const wanted = (process.env.VISUAL_QA_VIEWPORTS || '').split(',').map(v => v.trim()).filter(Boolean)
    const viewports = wanted.length ? all.filter(v => wanted.includes(`${v.width}x${v.height}`)) : all
    if (!viewports.length) throw new Error(`VISUAL_QA_VIEWPORTS matched nothing: ${process.env.VISUAL_QA_VIEWPORTS}`)
    for (const viewport of viewports) {
      const started = Date.now()
      await runViewport(viewport)
      console.log(`${viewport.width}x${viewport.height}: ${Math.round((Date.now() - started) / 1000)} sn`)
    }
    const compact = viewports.some(v => v.width === 390)
    if (compact) {
      await require('./siege-visual-qa.cjs')(browser, out, origin, siegeSeedRaw, diagnostics)
      const requiredPanelShots = ['ui-research-390x844.png', 'ui-buildings-390x844.png', 'ui-medrese-stage-1-390x844.png', 'ui-medrese-stage-2-390x844.png', 'ui-medrese-stage-3-390x844.png', 'ui-army-390x844.png', 'ui-settings-390x844.png', 'ui-colony-345x768.png']
      for (const shot of requiredPanelShots) {
        if (!diagnostics.screenshots.includes(shot)) throw new Error(`Missing content UI QA screenshot: ${shot}`)
      }
    }
    // Bütçe: CI yazılımla çizdiği için cihazdan cömert (varsayılan 25 sn, 400 MB).
    const bootBudget = Number(process.env.VISUAL_QA_BOOT_BUDGET_MS || 25_000), heapBudget = Number(process.env.VISUAL_QA_HEAP_BUDGET_MB || 400)
    for (const [label, m] of Object.entries(diagnostics.metrics)) {
      console.log(`${label}: açılış ${m.bootMs} ms, bellek ${m.heapMB} MB`)
      if (m.bootMs > bootBudget) console.log(`::warning title=Açılış süresi::${label} açılış ${m.bootMs} ms (bütçe ${bootBudget} ms)`)
      if (m.heapMB > heapBudget) console.log(`::warning title=Bellek::${label} JS belleği ${m.heapMB} MB (bütçe ${heapBudget} MB)`)
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
