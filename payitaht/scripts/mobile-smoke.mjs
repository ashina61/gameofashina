import { chromium } from 'playwright'
import { createServer } from 'node:http'
import { readFile, mkdir } from 'node:fs/promises'
import { resolve, extname } from 'node:path'
import assert from 'node:assert/strict'

const root = resolve('out')
const mime = { '.html':'text/html', '.js':'text/javascript', '.css':'text/css', '.png':'image/png', '.webp':'image/webp', '.svg':'image/svg+xml', '.woff2':'font/woff2', '.webmanifest':'application/manifest+json' }
const server = createServer(async (req,res) => {
  try {
    const pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname)
    const file = resolve(root, `.${pathname === '/' ? '/index.html' : pathname}`)
    if (!file.startsWith(root + '/')) { res.writeHead(403).end(); return }
    res.setHeader('Content-Type',mime[extname(file)] ?? 'application/octet-stream')
    res.end(await readFile(file))
  } catch { res.writeHead(404).end() }
})
await new Promise(r=>server.listen(0,'127.0.0.1',r))
const base = `http://127.0.0.1:${server.address().port}`
const browser = await chromium.launch({ headless:true,
  executablePath: process.env.PAYITAHT_BROWSER || undefined,
  args: ['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader'],
})
const errors=[]
await mkdir('review',{recursive:true})
try {
  for (const [width,height] of [[320,568],[390,844],[430,932],[768,1024]]) {
    const context=await browser.newContext({viewport:{width,height},deviceScaleFactor:2,isMobile:true,hasTouch:true})
    const page=await context.newPage()
    page.on('pageerror',e=>errors.push(`${width}: ${e.message}`))
    await page.goto(base)
    await page.locator('canvas').waitFor()
    await page.waitForFunction(()=>document.querySelector('canvas')?.width > 0)
    await page.waitForTimeout(1600)
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth <= innerWidth),true,'horizontal overflow')
    for (const label of ['Şehir','Halk','İnşa','İlim','Divan']) {
      const box=await page.getByRole('navigation',{name:'Oyun menüsü'}).getByRole('button',{name:label,exact:true}).boundingBox()
      assert.ok(box.width >= 44 && box.height >= 44, `${label}: touch target`)
    }
    await page.screenshot({path:`review/city-${width}.png`})
    await page.getByRole('button',{name:'Halk',exact:true}).click()
    await page.getByRole('heading',{name:'Şehrin halkı',exact:true}).waitFor()
    await page.getByRole('button',{name:'Kapat',exact:true}).click()
    await page.getByRole('button',{name:'Divan',exact:true}).click()
    await page.getByRole('heading',{name:'Şehir divanı',exact:true}).waitFor()
    await page.waitForTimeout(350)
    if (width === 390) await page.screenshot({path:'review/council-390.png'})
    await page.getByRole('button',{name:'Ordu ve donanma Birlikler, talim ve savunma'}).click()
    await page.getByRole('heading',{name:'Ordu ve donanma',exact:true}).waitFor()
    await page.getByRole('button',{name:'Kapat',exact:true}).click()
    if (width === 390) {
      // Center building tap must open Divanhane, never the empty plot behind it.
      const canvas=await page.locator('canvas').boundingBox()
      await page.touchscreen.tap(width/2,canvas.y+canvas.height/2-30)
      await page.getByRole('heading',{name:'Divanhane',exact:true}).waitFor()
      await page.waitForTimeout(300)
      await page.screenshot({path:'review/building-390.png'})
      const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('payitaht-adalari-v1')))
      await page.getByRole('button',{name:'Binayı yükselt',exact:true}).click()
      await page.getByText('İnşaat devam ediyor',{exact:true}).waitFor()
      await page.getByRole('button',{name:'Kapat',exact:true}).click()
      await page.reload(); await page.locator('canvas').waitFor()
      const reloaded=await page.evaluate(()=>JSON.parse(localStorage.getItem('payitaht-adalari-v1')))
      assert.equal(reloaded.queue[0]?.id,'divan','construction must survive reload')
      assert.ok(reloaded.resources.gold < saved.resources.gold,'construction must debit resources')
      // Offline shell must include the lazily loaded renderer and new terrain.
      await page.waitForFunction(async()=>!!(await navigator.serviceWorker.getRegistration())?.active)
      await page.waitForTimeout(1800)
      await context.setOffline(true); await page.reload(); await page.locator('canvas').waitFor()
      await page.waitForTimeout(600)
      assert.equal(await page.getByRole('button',{name:'Şehir',exact:true}).isVisible(),true)
    }
    await context.close()
    console.log(`PASS ${width}x${height}: layout, touch targets, panels${width===390?', building tap, upgrade, persistence, offline':''}`)
  }
  assert.deepEqual(errors,[],'browser errors')
} finally { await browser.close(); await new Promise(r=>server.close(r)) }
