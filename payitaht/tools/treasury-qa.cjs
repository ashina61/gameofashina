/* Actual mobile treasury pages, all seven resources, stock states and navigation. */
const fs = require('node:fs/promises')
const path = require('node:path')
const { chromium } = require('playwright')
const { skipGuide, seedSave, enterGame, qaOrigin } = require('./lib/qa.cjs')

async function main() {
  const out = path.resolve('docs/mockups')
  await fs.mkdir(out, { recursive: true })
  const source = await fs.readFile(path.join(__dirname, 'layout-qa.cjs'), 'utf8')
  const scanSource = source.slice(source.indexOf('function scanPage()'), source.indexOf('async function main()'))
    .replace("document.querySelectorAll('.bp, .ika-top, .ika-nav, .quest-chip, .threat-banner, .island-view, .map-top-tools, .city-shortcuts, .city-activity, .title-screen, [role=\"dialog\"]')", "document.querySelectorAll('.bp-treasury')")
  const scan = new Function(`return (${scanSource.trim()})`)()
  const fixture = JSON.parse(await fs.readFile(path.join(__dirname, 'fixtures/late-game.json'), 'utf8'))
  const report = { scans: [], actions: [], errors: [], missingArt: [] }
  const browser = await chromium.launch({ headless: true, executablePath: process.env.QA_CHROMIUM_PATH, args: ['--no-sandbox', '--no-zygote', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] })
  try {
    for (const width of [360, 390, 430]) {
      for (const state of ['normal', 'empty', 'full']) {
        const e = structuredClone(fixture), now = Date.now()
        e.world.wars = []; e.world.start = now
        for (const c of e.cities) {
          const g = c.game; g.updatedAt = now; g.missions = []; g.sieges = []; g.nextThreat = {}; g.buildings.tas = 0; g.resources.stone = 0
          if (state !== 'normal') {
            for (const k of ['gold', 'wood', 'knowledge']) g.resources[k] = state === 'empty' ? 0 : 1e9
            for (const k of ['kahve', 'mermer', 'kristal', 'kukurt']) g.luxury[k] = state === 'empty' ? 0 : 1e9
          }
        }
        const context = await browser.newContext({ viewport: { width, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 1 })
        await skipGuide(context); await seedSave(context, e)
        await context.addInitScript(time => { localStorage.setItem('payitaht-qa', '1'); Date.now = () => time }, now)
        const page = await context.newPage(); page.setDefaultTimeout(60000)
        page.on('pageerror', error => report.errors.push(`${width}/${state}: ${error.message}`))
        page.on('response', r => { if (r.status() >= 400 && r.url().includes('/images/game/')) report.missingArt.push(r.url()) })
        await page.goto(qaOrigin('TREASURY_QA_URL'), { waitUntil: 'domcontentloaded' })
        await enterGame(page); await page.waitForFunction(() => window.__payitahtQa)
        await page.addStyleTag({ content: '*,*::before,*::after{animation:none!important;transition:none!important;scroll-behavior:auto!important}' })
        await page.evaluate(() => window.__payitahtQa.panel('economy'))
        await page.locator('.bp-treasury').waitFor()
        const check = async label => {
          await page.evaluate(() => document.querySelectorAll('[data-qa-zoom]').forEach(el => { el.style.fontSize = el.dataset.qaOriginalFont || ''; delete el.dataset.qaZoom; delete el.dataset.qaOriginalFont }))
          for (const zoom of [1, 1.3]) {
            if (zoom > 1) await page.evaluate(z => {
              const els = [...document.querySelectorAll('.bp-treasury, .bp-treasury *')].filter(el => !(el instanceof SVGElement))
              const sizes = els.map(el => parseFloat(getComputedStyle(el).fontSize))
              els.forEach((el, i) => { el.dataset.qaOriginalFont = el.style.fontSize; el.style.fontSize = `${sizes[i] * z}px`; el.dataset.qaZoom = '1' })
            }, zoom)
            await page.waitForTimeout(100)
            const found = await page.evaluate(scan)
            const broken = await page.locator('.bp-treasury img').evaluateAll(imgs => imgs.filter(i => i.complete && !i.naturalWidth).map(i => i.src))
            if (broken.length) report.missingArt.push(...broken)
            const total = Object.values(found).reduce((n, group) => n + Object.values(group).reduce((s, item) => s + item.adet, 0), 0)
            report.scans.push({ width, state, label, zoom, total, found })
            if (total) console.log(JSON.stringify({ width, state, label, zoom, found }))
          }
          await page.evaluate(() => document.querySelectorAll('[data-qa-zoom]').forEach(el => { el.style.fontSize = el.dataset.qaOriginalFont || ''; delete el.dataset.qaZoom; delete el.dataset.qaOriginalFont }))
          if (width === 390 && state === 'normal' && ['hazine', 'Kereste', 'ambar'].includes(label)) await page.screenshot({ path: path.join(out, `treasury-${label === 'Kereste' ? 'production' : label}-390.webp`), type: 'webp' })
        }
        await check('hazine')
        await page.getByRole('tab', { name: 'Üretim', exact: true }).click()
        for (const name of ['Akçe', 'Kereste', 'İlim', 'Kahve', 'Mermer', 'Kristal', 'Kükürt']) {
          await page.getByRole('group', { name: 'Üretimi incelenecek kaynak' }).getByRole('button', { name, exact: true }).click()
          await page.getByRole('heading', { name: `${name} defteri`, exact: true }).waitFor()
          await check(name)
        }
        await page.getByRole('tab', { name: 'Ambar', exact: true }).click(); await check('ambar')
        if (width === 390 && state === 'normal') {
          await page.getByRole('button', { name: 'İlim üretimini aç', exact: true }).click()
          await page.getByRole('heading', { name: 'İlim defteri', exact: true }).waitFor(); report.actions.push('Ambar → İlim üretimi')
          await page.getByRole('button', { name: 'Âlimleri görevlendir', exact: true }).click()
          await page.locator('.people-page').waitFor(); report.actions.push('Üretim → İşgücü')
          await page.evaluate(() => window.__payitahtQa.panel('economy'))
          await page.getByRole('tab', { name: 'Ambar', exact: true }).click()
          await page.getByRole('button', { name: 'Ambarı geliştir', exact: true }).click()
          await page.locator('.building-inspector').waitFor(); await page.locator('.building-inspector-details').click(); await page.locator('.bp-of-ambar').waitFor(); report.actions.push('Ambar → Ambar binası ve detayları')
          await page.evaluate(() => window.__payitahtQa.panel('economy'))
          await page.getByRole('tab', { name: 'Üretim', exact: true }).click()
          await page.getByRole('button', { name: 'Ada ormanına git', exact: true }).click()
          await page.locator('.bp-island-register').waitFor(); report.actions.push('Kereste üretimi → Ada ormanı')
        }
        await context.close()
        console.log(`checked ${width}/${state}`)
      }
    }
  } finally { await browser.close() }
  report.clean = report.scans.every(s => s.total === 0) && !report.errors.length && !report.missingArt.length
  await fs.writeFile(path.resolve('docs/treasury-qa-report.json'), JSON.stringify(report, null, 2) + '\n')
  console.log(JSON.stringify({ scans: report.scans.length, clean: report.clean, actions: report.actions, errors: report.errors, missingArt: report.missingArt }))
  if (!report.clean) process.exitCode = 1
}
main().catch(error => { console.error(error); process.exitCode = 1 })
