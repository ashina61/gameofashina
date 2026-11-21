/* Compiled phone UI: live stage change, all five civic sprites, expansion navigation. */
const assert = require('node:assert/strict')
const fs = require('node:fs/promises')
const path = require('node:path')
const { execFileSync } = require('node:child_process')
const { chromium } = require('playwright')
const { skipGuide, enterGame, qaOrigin } = require('./lib/qa.cjs')

async function main() {
  const out = path.resolve('visual-review/development')
  await fs.mkdir(out, { recursive: true })
  const now = Date.UTC(2026, 10, 18, 9)
  const fixtures = JSON.parse(execFileSync(process.execPath, ['--import', 'tsx', '-e', `
    const {initialEmpire,advanceEmpire,foundColony,capitalCity}=require('./lib/game/empire.ts');
    const {OBJECTIVES,freePlotsFor}=require('./lib/game/engine.ts');
    const now=${now},base=initialEmpire(now),g=base.cities[0].game;
    g.buildings.ambar=10;g.resources={gold:45000,wood:45000,knowledge:400};g.luxury={mermer:5000,kristal:5000,kahve:5000,kukurt:5000};
    const stages=Object.fromEntries([1,4,5,10,15,20].map(level=>{const e=structuredClone(base);e.cities[0].game.buildings.divan=level;return [level,e]}));
    const ready=structuredClone(base),c=ready.cities[0].game;c.buildings.divan=3;
    c.claimed=OBJECTIVES.slice(0,8).map(o=>o.id);for(const id of ['saray','liman']){c.placement[id]=freePlotsFor(c,id)[0];c.buildings[id]=1;}
    c.army.nakliye=3;
    const founded=foundColony(ready,'zeytin',now);if(founded.error)throw Error(founded.error);
    const workforce=structuredClone(ready),w=workforce.cities[0].game;
    w.placement.medrese=freePlotsFor(w,'medrese')[0];w.buildings.medrese=1;w.workers.medrese=0;
    console.log(JSON.stringify({stages,ready,workforce,colony:founded.empire}));
  `], { maxBuffer: 4 * 1024 * 1024 }).toString())
  const browser = await chromium.launch({ executablePath: process.env.QA_CHROME_PATH, args: ['--no-sandbox', '--enable-unsafe-swiftshader'] })
  const errors = [], missing = [], results = []
  const open = async (seed, width = 390, height = 844) => {
    const context = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: 1, isMobile: true, hasTouch: true, serviceWorkers: 'block' })
    await skipGuide(context)
    await context.addInitScript(seed => { localStorage.setItem('payitaht-adalari-v1', JSON.stringify(seed)); localStorage.setItem('payitaht-qa', '1') }, seed)
    const page = await context.newPage()
    page.on('pageerror', error => errors.push(error.message))
    page.on('response', response => { if (response.status() >= 400) missing.push(response.url()) })
    await page.clock.install({ time: now })
    await page.goto(qaOrigin('DEVELOPMENT_QA_URL'))
    await enterGame(page)
    await page.clock.runFor(800)
    await page.waitForFunction(() => document.documentElement.dataset.cityReady && window.__payitahtQa)
    return { context, page }
  }
  try {
    for (const level of [1, 5, 10, 15, 20]) {
      const { context, page } = await open(fixtures.stages[level])
      await page.screenshot({ path: path.join(out, `city-level-${level}.png`) })
      assert.equal(await page.locator('canvas').count(), 1)
      results.push({ level, city: 'rendered' })
      await context.close()
    }
    // Cross 4 -> 5 without a reload. Reusing the legacy 4/8 cache key here
    // would leave the previous civic sprite visible until restart.
    {
      const { context, page } = await open(fixtures.stages[4])
      const requests = []
      page.on('request', request => requests.push(request.url()))
      await page.evaluate(() => window.__payitahtQa.buildingPreview('divan'))
      await page.clock.runFor(400)
      await page.getByRole('button', { name: /Yükselt · Sv. 5/ }).click()
      await page.clock.fastForward(180000)
      await page.clock.runFor(800)
      await page.waitForFunction(() => JSON.parse(localStorage.getItem('payitaht-adalari-v1')).cities[0].game.buildings.divan === 5)
      assert.ok(requests.some(url => /parcel-growth\/divan-5(?:-sm)?\.webp/.test(url)), 'level five sprite did not load in the live scene')
      await page.screenshot({ path: path.join(out, 'live-upgrade-4-to-5.png') })
      results.push({ liveUpgrade: '4 -> 5' })
      await context.close()
    }
    {
      const { context, page } = await open(fixtures.workforce)
      await page.evaluate(() => window.__payitahtQa.building('medrese'))
      await page.clock.runFor(400)
      await page.getByRole('button', { name: 'Bir artır', exact: true }).click()
      await page.getByLabel('Şehir geliri önizlemesi').waitFor()
      assert.match(await page.getByLabel('Şehir geliri önizlemesi').innerText(), /→.*akçe\/dk/)
      const before = await page.evaluate(() => JSON.parse(localStorage.getItem('payitaht-adalari-v1')).cities[0].game.workers.medrese)
      assert.equal(before, 0, 'preview changed the saved workforce')
      await page.screenshot({ path: path.join(out, 'scholar-income-preview.png') })
      await page.getByRole('button', { name: 'Onayla', exact: true }).click()
      const after = await page.evaluate(() => JSON.parse(localStorage.getItem('payitaht-adalari-v1')).cities[0].game.workers.medrese)
      assert.equal(after, 1)
      results.push({ workforce: 'preview then commit' })
      await context.close()
    }
    for (const [width, textScale] of [[360, 1], [390, 1], [430, 1], [390, 1.3]]) for (const scenario of ['ready', 'colony']) {
      const { context, page } = await open(fixtures[scenario], width, 844)
      await page.getByRole('button', { name: /Gelişim planını aç/ }).click()
      await page.clock.runFor(500)
      await page.getByRole('region', { name: 'İlk koloniye gelişim planı' }).waitFor()
      if (textScale > 1) await page.evaluate(scale => {
        const elements = [...document.querySelectorAll('body *:not(svg):not(svg *)')]
        const sizes = elements.map(element => parseFloat(getComputedStyle(element).fontSize))
        elements.forEach((element, index) => element.style.setProperty('font-size', `${sizes[index] * scale}px`, 'important'))
      }, textScale)
      assert.equal(await page.locator('.expansion-plan li').count(), 9)
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false)
      const action = page.locator('.expansion-current button')
      const rect = await action.boundingBox()
      assert.ok(rect && rect.y > 0 && rect.y + rect.height < 760, 'the next action is below the navigation')
      await page.screenshot({ path: path.join(out, `plan-${scenario}-${width}${textScale > 1 ? '-130' : ''}.png`) })
      if (scenario === 'ready') {
        await page.getByRole('button', { name: 'Ada seç', exact: true }).click()
        await page.clock.runFor(300)
        await page.locator('.bp-mapview').waitFor()
      } else {
        await page.getByRole('button', { name: 'Valiliği aç', exact: true }).click()
        await page.clock.runFor(300)
        await page.locator('.building-inspector[data-building="valilik"]').waitFor()
        const city = await page.evaluate(() => {
          const e = JSON.parse(localStorage.getItem('payitaht-adalari-v1'))
          return e.cities.find(city => city.id === e.activeCityId).islandId
        })
        assert.equal(city, 'zeytin')
      }
      results.push({ width, textScale, scenario, navigation: 'passed' })
      await context.close()
    }
    assert.deepEqual(errors, [])
    assert.deepEqual(missing, [])
  } finally { await browser.close() }
  await fs.writeFile(path.join(out, 'report.json'), JSON.stringify({ results, errors, missing }, null, 2))
  console.log(`Development QA passed: ${results.length} stage/navigation scenarios.`)
}
main().catch(error => { console.error(error); process.exitCode = 1 })
