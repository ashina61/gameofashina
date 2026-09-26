/* Read-only UI review; requires Playwright, a static export and Chromium. */
const { chromium } = require('playwright')
const fs = require('node:fs/promises'), path = require('node:path'), http = require('node:http')
const sharp = require('sharp'), assert = require('node:assert/strict')
const root = path.resolve('out'), output = path.resolve('docs/visual-review')
const mime = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.webp': 'image/webp', '.woff2': 'font/woff2' }
async function main() {
  await fs.mkdir(output, {recursive:true})
  const server = http.createServer(async (req,res) => {
    try {
      const pathname = decodeURIComponent(new URL(req.url,'http://localhost').pathname)
      const file = path.resolve(root, pathname.replace(/^\/gameofashina\/?/, '') || 'index.html')
      if (!file.startsWith(root + path.sep)) throw new Error('Invalid path')
      res.setHeader('Content-Type', mime[path.extname(file)] || 'application/octet-stream')
      res.end(await fs.readFile(file))
    } catch {res.statusCode=404;res.end('Not found')}
  })
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve))
  const browser = await chromium.launch({headless:true, ...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE ? {executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE}:{}), args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']})
  let page
  const errors=[], missing=[], screens=[]
  try {
    page=await browser.newPage({viewport:{width:390,height:844},deviceScaleFactor:2,isMobile:true,hasTouch:true,serviceWorkers:'block'})
    page.setDefaultTimeout(12000)
    page.on('pageerror',e=>errors.push(e.message))
    page.on('response',r=>{if(r.status()>=400)missing.push(`${r.status()} ${r.url()}`)})
    await page.goto(`http://127.0.0.1:${server.address().port}/gameofashina/`)
    await page.locator('canvas').waitFor();await page.waitForTimeout(1800)
    const capture=async name=>{
      assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,`${name}: overflow`)
      const png=await page.screenshot({animations:'disabled'})
      await sharp(png).resize({width:390}).webp({quality:85}).toFile(path.join(output,`${name}.webp`))
      screens.push(name);console.log(`Captured ${name}`)
    }
    for(const width of [320,390,430]){
      await page.setViewportSize({width,height:844});await page.waitForTimeout(250)
      const chips=await page.locator('.ika-chip').evaluateAll(nodes=>nodes.map(n=>({left:n.getBoundingClientRect().left,right:n.getBoundingClientRect().right})))
      assert.equal(chips.length,7)
      assert.ok(chips.every(c=>c.left>=0&&c.right<=width),`resources at ${width}`)
      await capture(`city-${width}`)
    }
    await page.setViewportSize({width:390,height:844})
    await page.locator('.activity-summary').click()
    await page.getByRole('button',{name:'Divanhane',exact:true}).click()
    await capture('divanhane')
    await page.getByRole('button',{name:'Geri',exact:true}).click()
    await page.locator('.activity-summary').click()
    await page.getByRole('button',{name:'Kışla',exact:true}).click()
    await capture('kisla')
    await page.getByRole('button',{name:'Geri',exact:true}).click()
    await page.getByRole('button',{name:/Araştırma danışmanı/}).click()
    await capture('research')
    await page.locator('.research-branch-tabs button').last().click()
    await capture('research-filter')
    await page.getByRole('button',{name:'Geri',exact:true}).click()
    await page.getByRole('button',{name:/Hükümdar profili/}).click()
    await capture('profile')
    await page.getByRole('button',{name:'Geri',exact:true}).click()
    await page.getByRole('button',{name:'Harita',exact:true}).click()
    await capture('world')
    await page.getByRole('button',{name:'Geri',exact:true}).click()
    await page.getByRole('button',{name:/Şehir danışmanı/}).click()
    await page.getByRole('button',{name:'Bütün yapılar',exact:true}).click()
    await capture('buildings')
    await page.getByRole('button',{name:/Medrese/}).first().click()
    await capture('medrese')
    await page.getByRole('button',{name:'Geri',exact:true}).click()
    await page.setViewportSize({width:1280,height:900})
    await capture('desktop')
    const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('payitaht-adalari-v1')))
    assert.equal(saved.cities[0].game.queue.length,0,'review must not issue a building command')
    assert.equal(saved.cities[0].game.study,null,'review must not issue research')
    assert.deepEqual(errors,[]);assert.deepEqual(missing,[])
    await fs.writeFile(path.join(output,'qa.json'),JSON.stringify({viewports:[320,390,430,1280],dpr:2,screens,pageErrors:errors,missingAssets:missing,readOnly:true},null,2))
    console.log('PASS: visual review, no commands issued')
  }catch(e){if(page){console.log((await page.locator('body').innerText()).slice(0,2500));await page.screenshot({path:path.join(output,'failure.png')})}throw e}
  finally{await browser.close();await new Promise(resolve=>server.close(resolve))}
}
main().catch(e=>{console.error(e);process.exitCode=1})
