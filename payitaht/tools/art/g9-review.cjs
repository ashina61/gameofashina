const fs = require('node:fs/promises'), path = require('node:path'), assert = require('node:assert/strict')
const { chromium } = require('playwright'), { qaOrigin, START_BUTTON } = require('../lib/qa.cjs'), { reviewWebp } = require('../lib/review-webp.cjs')
async function main() {
  const phase = process.argv[2] || 'after', out = `visual-review/G9/${phase}`
  await fs.mkdir(out, { recursive: true })
  const fixture = JSON.parse(await fs.readFile('tools/fixtures/late-game.json', 'utf8'))
  for (const city of fixture.cities) Object.assign(city.game.buildings, { mabet: 8, tekke: 8, cami: 8, karagoz: 8 })
  if (phase === 'after') fixture.reports = [false, true].map(naval => ({
    id: `g9-${naval}`, time: Date.now(), kind: 'defense', cityId: fixture.activeCityId,
    npcId: 'test', success: true, kept: true, title: naval ? 'Deniz kontrolü' : 'Kara kontrolü', lines: [],
    battles: [{ title: naval ? 'Deniz' : 'Kara', attacker: 'Akıncı', defender: 'Sahilhisar',
      a: { troops: naval ? { kadirga: 20 } : { yeniceri: 40, okcu: 20 }, attackMul: 1, defenseMul: 1, naval, fieldLevel: 8 },
      d: { troops: naval ? { kadirga: 15 } : { mizrakci: 40, okcu: 10 }, attackMul: 1, defenseMul: 1, naval, fieldLevel: 8 } }]
  }))
  const b = await chromium.launch({ headless: true, args: ['--no-sandbox'] }), errors = [], missing = [], screens = []
  try {
    const c = await b.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, serviceWorkers: 'block' })
    await c.addInitScript(e => { for (const city of e.cities) city.game.updatedAt = Date.now(); localStorage.setItem('payitaht-adalari-v1', JSON.stringify(e)); localStorage.setItem('payitaht-rehber', 'goruldu'); localStorage.setItem('payitaht-qa', '1') }, fixture)
    const p = await c.newPage(); p.on('pageerror', e => errors.push(e.message)); p.on('response', r => { if (r.status() >= 400 && /images\/game/.test(r.url())) missing.push(r.url()) })
    await p.goto(qaOrigin(), { waitUntil: 'domcontentloaded' }); await p.getByRole('button', { name: START_BUTTON }).click(); await p.waitForFunction(() => !!document.documentElement.dataset.cityReady)
    for (const [kind, id] of [['panel', 'research'], ['panel', 'profile'], ['building', 'mabet'], ['building', 'tekke'], ['building', 'cami'], ['building', 'karagoz'], ['building', 'divan'], ['panel', 'diplomacy']]) {
      await p.evaluate(([kind, id]) => { window.__payitahtQa.close(); window.__payitahtQa[kind](id) }, [kind, id])
      await p.waitForTimeout(450)
      if (phase === 'after' && ['research', 'profile', 'mabet', 'tekke', 'cami', 'karagoz', 'divan'].includes(id)) assert.ok(await p.locator('.bp [data-art-atlas]').count() > 0, `${id}: no painted atlas`)
      await reviewWebp(await p.screenshot(), path.join(out, `${id}-390x844.webp`)); screens.push(id)
    }
    if (phase === 'after') {
      await p.evaluate(() => { window.__payitahtQa.close(); window.__payitahtQa.panel('reports') })
      for (const [label, file] of [['Kara', 'battle-land'], ['Deniz', 'battle-sea']]) {
        await p.getByRole('button', { name: `${label}: savaş alanı`, exact: true }).click()
        const field = p.locator('.bf').last()
        assert.ok((await field.getAttribute('style')).includes(`${file}.webp`))
        await field.scrollIntoViewIfNeeded()
        await reviewWebp(await p.screenshot(), path.join(out, `${file}-390x844.webp`))
        await p.getByRole('button', { name: `${label}: savaş alanı`, exact: true }).click()
        screens.push(file)
      }
    }
    assert.deepEqual(errors, []); assert.deepEqual(missing, [])
    await fs.writeFile(`visual-review/G9/scene-${phase}.json`, JSON.stringify({ errors, missing, screens }, null, 2))
    console.log(`G9 ${phase}: ${screens.length} mobile deep pages passed`)
  } finally { await b.close() }
}
main().catch(e => { console.error(e); process.exitCode = 1 })
