/* Real Phaser loading races, sleeping-scene disposal and a timed browser soak. */
const fs = require('node:fs/promises')
const path = require('node:path')
const { execFileSync } = require('node:child_process')
const { chromium } = require('playwright')
const { qaOrigin } = require('./lib/qa.cjs')
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms))
const duration = Number(process.env.RENDER_SOAK_MS ?? 30 * 60_000)

function instrument(seed) {
  localStorage.setItem('payitaht-adalari-v1', JSON.stringify(seed))
  localStorage.setItem('payitaht-rehber', 'goruldu')
  localStorage.setItem('payitaht-qa', '1')
  window.__renderProbe = { draws: 0, canvasDisposals: 0, textureDisposals: 0 }
  const get = HTMLCanvasElement.prototype.getContext
  const wrapped = new WeakSet()
  HTMLCanvasElement.prototype.getContext = function (...args) {
    const context = get.apply(this, args)
    if (context && !wrapped.has(context) && /^(webgl2?|experimental-webgl)$/.test(args[0])) {
      wrapped.add(context)
      const canvas = context.canvas, clear = context.clear.bind(context), remove = context.deleteTexture.bind(context)
      context.clear = (...values) => { if (canvas.closest('.city-canvas')) window.__renderProbe.draws++; return clear(...values) }
      context.deleteTexture = (...values) => { if (canvas.closest('.city-canvas')) window.__renderProbe.textureDisposals++; return remove(...values) }
    }
    return context
  }
  const removeChild = Node.prototype.removeChild
  Node.prototype.removeChild = function (child) {
    if (child instanceof HTMLCanvasElement && child.closest('.city-canvas')) window.__renderProbe.canvasDisposals++
    return removeChild.call(this, child)
  }
}

async function main() {
  if (!Number.isFinite(duration) || duration < 0) throw Error('Invalid RENDER_SOAK_MS')
  const now = Date.now()
  const seed = JSON.parse(execFileSync('node', ['--import', 'tsx', '-e', `
    const fs=require('fs'),{parseEmpire}=require('./lib/game/empire.ts'),{ISLANDS}=require('./lib/game/islands.ts');
    const e=parseEmpire(fs.readFileSync('tools/fixtures/late-game.json','utf8'));
    const colony=structuredClone(e.cities[0]);colony.id='city-2';colony.name='Deneme Limanı';colony.islandId=ISLANDS.find(i=>i.id!==e.cities[0].islandId).id;e.cities.push(colony);
    for(const c of e.cities){c.game.updatedAt=${now};c.game.queue=[];c.game.drills=[];c.game.study=null}
    e.missions=[];e.sieges=[];e.threats=[];e.nextThreat=Object.fromEntries(e.cities.map(c=>[c.id,${now}+86400000]));e.shipments=[];e.world.wars=[];e.world.start=${now};
    console.log(JSON.stringify(parseEmpire(JSON.stringify(e))));
  `], { maxBuffer: 4 * 1024 * 1024 }).toString())
  const report = { environment: 'Headless Chromium, 390×844, DPR1, software WebGL; physical-device heat/battery not measured', requestedSoakMs: duration, races: [], samples: [], errors: [], actions: 0 }
  const browser = await chromium.launch({ headless: true, executablePath: process.env.QA_CHROMIUM_PATH, args: ['--no-sandbox', '--no-zygote', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] })
  const makePage = async () => {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1, isMobile: true, hasTouch: true })
    await context.addInitScript(instrument, seed)
    const page = await context.newPage()
    page.on('pageerror', error => report.errors.push(error.message))
    return { context, page }
  }
  const ready = page => page.waitForFunction(() => !!document.documentElement.dataset.cityReady, undefined, { timeout: 60_000 })
  const draws = page => page.evaluate(() => window.__renderProbe.draws)
  const sampleDraws = async page => { const before = await draws(page); await sleep(1500); return (await draws(page)) - before }
  try {
    for (const state of ['covered', 'returned']) {
      const { context, page } = await makePage()
      let release
      const gate = new Promise(resolve => { release = resolve })
      await page.route('**/images/game/buildings/**', async route => { await gate; await route.continue() })
      await page.goto(qaOrigin('RENDER_SOAK_URL'), { waitUntil: 'domcontentloaded' })
      await page.getByRole('button', { name: 'Devam et', exact: true }).click()
      await page.waitForFunction(() => !!window.__payitahtQa)
      await page.evaluate(() => window.__payitahtQa.panel('economy'))
      await page.locator('.bp-treasury').waitFor()
      if (state === 'returned') await page.evaluate(() => window.__payitahtQa.close())
      release()
      await ready(page)
      await sleep(500)
      const count = await sampleDraws(page)
      if (state === 'covered' && count !== 0) throw Error(`Loading race: covered city drew ${count} times`)
      if (state === 'returned' && count <= 0) throw Error('Latest visible city remained asleep')
      report.races.push({ state, sampleMs: 1500, cityDraws: count })
      await context.close()
      console.log(JSON.stringify(report.races.at(-1)))
    }
    const { context, page } = await makePage()
    await page.goto(qaOrigin('RENDER_SOAK_URL'), { waitUntil: 'domcontentloaded' })
    const start = performance.now()
    await page.getByRole('button', { name: 'Devam et', exact: true }).click()
    await ready(page)
    report.cityReadyAfterContinueMs = Math.round(performance.now() - start)
    const cdp = await context.newCDPSession(page)
    await cdp.send('Performance.enable')
    const sample = async label => {
      await cdp.send('HeapProfiler.collectGarbage')
      const metrics = (await cdp.send('Performance.getMetrics')).metrics
      const dom = await cdp.send('Memory.getDOMCounters')
      const probe = await page.evaluate(() => ({ ...window.__renderProbe, canvases: document.querySelectorAll('.city-canvas canvas').length }))
      const result = { label, elapsedMs: Math.round(performance.now() - soakStart), heapBytes: metrics.find(m => m.name === 'JSHeapUsedSize')?.value, ...dom, ...probe }
      report.samples.push(result)
      console.log(JSON.stringify(result))
    }
    let current = seed.cities[0].name
    const changeCity = async () => {
      const next = current === seed.cities[0].name ? 'Deneme Limanı' : seed.cities[0].name
      await page.evaluate(() => window.__payitahtQa.panel('cities'))
      await page.locator('.civic-settlement').first().waitFor()
      const disposed = await page.evaluate(() => window.__renderProbe.canvasDisposals)
      await page.evaluate(() => { delete document.documentElement.dataset.cityReady })
      await page.locator('.civic-settlement').filter({ hasText: next }).click()
      await ready(page)
      await page.waitForFunction(n => window.__renderProbe.canvasDisposals > n, disposed, { timeout: 15_000 })
      current = next
      report.actions++
    }
    const panels = ['economy', 'research', 'reports', 'profile', 'settings', 'map', 'journal']
    const cycle = async () => {
      for (const panel of panels) {
        await page.evaluate(panel => window.__payitahtQa.panel(panel), panel)
        await page.locator('.bp').waitFor()
        await sleep(250)
        report.actions++
      }
      await page.evaluate(() => window.__payitahtQa.island())
      await page.locator('.island-view').waitFor()
      await page.evaluate(() => window.__payitahtQa.close())
      await changeCity()
    }
    await cycle(); await cycle()
    // Changing the global setting after disposal must not call dead scenes.
    await page.evaluate(() => window.__payitahtQa.panel('settings'))
    const lite = page.getByRole('radiogroup', { name: 'Hafif mod', exact: true })
    await lite.getByRole('radio', { name: 'Açık', exact: true }).click()
    await lite.getByRole('radio', { name: 'Kapalı', exact: true }).click()
    await lite.getByRole('radio', { name: 'Otomatik', exact: true }).click()
    await page.evaluate(() => window.__payitahtQa.close())
    report.actions += 3
    const soakStart = performance.now()
    await sample('warm-baseline')
    while (performance.now() - soakStart < duration) {
      const turn = performance.now()
      await cycle()
      await sample(`cycle-${report.samples.length}`)
      await sleep(Math.min(Math.max(0, 60_000 - (performance.now() - turn)), Math.max(0, duration - (performance.now() - soakStart))))
    }
    report.actualSoakMs = Math.round(performance.now() - soakStart)
    await page.evaluate(() => window.__payitahtQa.panel('economy'))
    await sleep(500)
    report.coveredDrawsAtEnd = await sampleDraws(page)
    if (report.coveredDrawsAtEnd !== 0) throw Error('Covered city stopped sleeping during soak')
    await page.evaluate(() => window.__payitahtQa.close())
    report.visibleDrawsAtEnd = await sampleDraws(page)
    if (report.visibleDrawsAtEnd <= 0) throw Error('City did not wake after soak')
    await sample('final')
    const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('payitaht-adalari-v1')))
    if (saved.cities.length !== 2 || saved.profile.ruler !== seed.profile.ruler) throw Error('Saved player identity changed')
    report.clean = report.errors.length === 0
    await context.close()
  } finally { await browser.close() }
  await fs.writeFile(path.resolve('docs/render-soak-report.json'), JSON.stringify(report, null, 2) + '\n')
  console.log(JSON.stringify({ clean: report.clean, actualSoakMs: report.actualSoakMs, actions: report.actions, errors: report.errors }))
  if (!report.clean) process.exitCode = 1
}
main().catch(error => { console.error(error); process.exitCode = 1 })
