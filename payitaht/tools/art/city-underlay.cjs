/**
 * ŞEHİR TABAN ALT-RESİMLERİ (görsel brif 2, H3).
 *
 * Oyunun kendi zeminini (/map-debug sahnesi) binasız ve debug çizimsiz olarak,
 * city-base-region.json bölgesinde birebir kadraja alır; her gelişme aşaması
 * için yarım çözünürlükte (ölçek/2) bir resim yazar. Boyalı taban resmi bu alt-resimlerin ÜSTÜNE (resimden
 * resme düzenleme) boyanır; arsalar, yollar, meydan, kıyı ve ada yerinde kalır.
 *
 *   STATIC_EXPORT=1 ... next build   (out/ gerekli)
 *   node tools/art/city-underlay.cjs [çıktı-klasörü]
 */
const path = require('node:path')
const fs = require('node:fs/promises')
const sharp = require('sharp')
const { chromium } = require('playwright')

const ROOT = path.resolve(__dirname, '..', '..')
const REGION = require('./city-base-region.json')
const OUT = path.resolve(process.argv[2] || path.join(ROOT, 'docs/mockups/taban'))
/** Aşama → temsil ettiği Divanhane seviyesi (lib/game/city-map/road-style yol kademeleriyle aynı eşikler). */
const STAGES = [[1, 1], [2, 3], [3, 5], [4, 7], [5, 10]]

;(async () => {
  const W = Math.round((REGION.x1 - REGION.x0) * REGION.scale), H = Math.round((REGION.y1 - REGION.y0) * REGION.scale)
  await fs.mkdir(OUT, { recursive: true })
  const browser = await chromium.launch({ args: ['--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] })
  try {
    // Yarım çözünürlük: resimden resme düzenleme girdisi için yeter, dört kat hızlı.
    const page = await browser.newPage({ viewport: { width: W / 2, height: H / 2 }, deviceScaleFactor: 1 })
    await page.route('http://underlay.test/**', async route => {
      const name = new URL(route.request().url()).pathname.replace(/^\/gameofashina\//, '') || 'index.html'
      try { await route.fulfill({ path: path.join(ROOT, 'out', name) }) } catch { await route.fulfill({ status: 404, body: 'Not found' }) }
    })
    const errors = []; page.on('pageerror', e => errors.push(e.message))
    await page.goto('http://underlay.test/gameofashina/map-debug.html')
    await page.waitForFunction(() => !!window.__slotDebug?.sys?.isActive?.(), null, { timeout: 60000 })
    await page.waitForTimeout(1500)
    const rect = { x: REGION.x0, y: REGION.y0, w: REGION.x1 - REGION.x0, h: REGION.y1 - REGION.y0 }
    for (const [stage, level] of STAGES) {
      await page.evaluate(([level, rect]) => window.__slotDebug.underlay(level, rect), [level, rect])
      await page.waitForTimeout(700)
      // Yalnız tuval: Phaser'ın kendi anlık görüntüsü (arayüz şeritleri girmez).
      const url = await page.evaluate(() => new Promise(done => window.__slotDebug.game.renderer.snapshot(img => done(img.src))), null)
      const png = Buffer.from(url.split(',')[1], 'base64')
      const file = path.join(OUT, `alt-resim-${stage}.webp`)
      await sharp(png).webp({ quality: 80 }).toFile(file)
      console.log(`${path.relative(ROOT, file)} · aşama ${stage} (Divanhane ${level}) · ${W / 2}x${H / 2}`)
    }
    if (errors.length) throw new Error(errors.join('\n'))
  } finally { await browser.close() }
})().catch(e => { console.error(e); process.exitCode = 1 })
