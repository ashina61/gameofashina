/* Real mobile people/settlement screens and command/navigation checks. */
const fs = require('node:fs/promises'), path = require('node:path')
const { chromium } = require('playwright')
const { skipGuide, seedSave, enterGame, qaOrigin } = require('./lib/qa.cjs')
async function main() {
 const out = path.resolve('docs/mockups'), report = { scans: [], actions: [], errors: [], missingArt: [] }
 await fs.mkdir(out, { recursive: true })
 const source = await fs.readFile(path.join(__dirname, 'layout-qa.cjs'), 'utf8')
 const rawScan = source.slice(source.indexOf('function scanPage()'), source.indexOf('async function main()'))
 const target = rawScan.replace("document.querySelectorAll('.bp, .ika-top, .ika-nav, .quest-chip, .threat-banner, .island-view, .map-top-tools, .city-shortcuts, .city-activity, .title-screen, [role=\"dialog\"]')", "document.querySelectorAll('.bp-population')")
 if (target === rawScan) throw new Error('Layout scanner scope changed')
 const scan = new Function(`return (${target.trim()})`)()
 const fixture = JSON.parse(await fs.readFile(path.join(__dirname, 'fixtures/late-game.json'), 'utf8'))
 const browser = await chromium.launch({ headless: true, executablePath: process.env.QA_CHROMIUM_PATH, args: ['--no-sandbox','--no-zygote','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'] })
 try {
 for (const width of [360,390,430]) for (const state of ['normal','locked','single','colony','shipment']) {
  const e = structuredClone(fixture), now = Date.now(); e.missions = []; e.sieges = []; e.threats = []; e.nextThreat = {}; e.shipments = []; e.world.wars = []; e.world.start = now
  const c = structuredClone(e.cities[0]); c.id = 'city-2'; c.islandId = 'zeytin'; c.name = 'Uzun Adlı Yeni Osmanlı Liman Yerleşimi'; c.game.buildings.saray = 0; c.game.buildings.valilik = 1; c.game.placement.valilik = 20
  if (state !== 'single') e.cities.push(c)
  if (state === 'colony') e.activeCityId = 'city-2'
  for (const city of e.cities) {
   const g = city.game; g.updatedAt = now; g.resources.stone = 0; g.buildings.tas = 0; g.workers.tas = 0; g.queue = []; g.drills = []; g.study = null; g.army.nakliye = 4
   if (state === 'locked') { for (const id of ['kereste','medrese','carsi','liman']) { g.buildings[id] = 0; g.placement[id] = null } for (const id of ['kereste','medrese','carsi']) g.workers[id] = 0 }
  }
  if (state === 'shipment') e.shipments = [{id:'cargo-qa',from:'city-1',to:'city-2',resource:'wood',amount:100,eta:now+3600000,ships:1}]
  const context = await browser.newContext({ viewport: {width,height:844},isMobile:true,hasTouch:true,deviceScaleFactor:1 })
  await skipGuide(context); await seedSave(context,e); await context.addInitScript(time=>{localStorage.setItem('payitaht-qa','1');Date.now=()=>time},now)
  const page = await context.newPage(); page.setDefaultTimeout(30000)
  page.on('pageerror',error=>report.errors.push(`${width}/${state}: ${error.message}`))
  page.on('response',r=>{if(r.status()>=400&&r.url().includes('/images/game/'))report.missingArt.push(r.url())})
  await page.goto(qaOrigin('POPULATION_QA_URL'),{waitUntil:'domcontentloaded'});await enterGame(page);await page.waitForFunction(()=>window.__payitahtQa); const cityCount=await page.evaluate(()=>JSON.parse(localStorage.getItem('payitaht-adalari-v1')).cities.length);if(cityCount!==e.cities.length)throw new Error(`Fixture city loss ${state}: ${cityCount}`)
  await page.addStyleTag({content:'*,*::before,*::after{animation:none!important;transition:none!important;scroll-behavior:auto!important}'})
  const restore = ()=>page.evaluate(()=>document.querySelectorAll('[data-qa-zoom]').forEach(el=>{el.style.fontSize=el.dataset.qaOriginalFont||'';delete el.dataset.qaZoom;delete el.dataset.qaOriginalFont}))
  const check = async label=>{
   await restore()
   for(const zoom of [1,1.3]){
    if(zoom>1)await page.evaluate(z=>{const els=[...document.querySelectorAll('.bp-population,.bp-population *')].filter(el=>!(el instanceof SVGElement));const sizes=els.map(el=>parseFloat(getComputedStyle(el).fontSize));els.forEach((el,i)=>{el.dataset.qaOriginalFont=el.style.fontSize;el.style.fontSize=`${sizes[i]*z}px`;el.dataset.qaZoom='1'})},zoom)
    await page.waitForTimeout(80);const found=await page.evaluate(scan);const total=Object.values(found).reduce((n,g)=>n+Object.values(g).reduce((s,x)=>s+x.adet,0),0)
    report.scans.push({width,state,label,zoom,total,found});if(total)console.log(JSON.stringify({width,state,label,zoom,found}))
   }
   await restore()
   if(width===390&&state==='normal')await page.screenshot({path:path.join(out,`population-${label}-390.webp`),type:'webp',quality:85})
  }
  await page.evaluate(()=>window.__payitahtQa.panel('people'));await page.locator('.bp-population').waitFor()
  for(const job of ['Oduncular','Âlimler','Esnaf']){await page.getByRole('group',{name:'Meslek seçimi'}).getByRole('button',{name:new RegExp(job)}).click();await check(job==='Oduncular'?'workers':job==='Âlimler'?'scholars':'shopkeepers')}
  if(state==='normal'){
   await page.getByRole('group',{name:'Meslek seçimi'}).getByRole('button',{name:/Oduncular/}).click()
   await page.getByRole('button',{name:'Hepsini çek',exact:true}).click();await check('worker-confirm')
   await page.getByRole('button',{name:'Geri al',exact:true}).click()
   if(width===390){await page.getByRole('button',{name:'Hepsini çek',exact:true}).click();await page.getByRole('button',{name:'Onayla',exact:true}).click();await page.waitForFunction(()=>JSON.parse(localStorage.getItem('payitaht-adalari-v1')).cities[0].game.workers.kereste===0);report.actions.push('Gerçek işçi ataması kayda işlendi')}
  }
  await page.getByRole('tab',{name:'Yaşam',exact:true}).click();await check('life')
  await page.evaluate(()=>window.__payitahtQa.panel('cities'));await check('settlements')
  await page.getByRole('tab',{name:'Nakliye',exact:true}).click();await check('cargo')
  if(width===390&&state==='normal'){
   await page.getByLabel(/^Varış şehri/).selectOption('city-2');await page.getByLabel('Yük miktarı',{exact:true}).fill('1');await page.getByRole('button',{name:'Gemileri gönder',exact:true}).click()
   await page.getByRole('heading',{name:'Gemiler seferde',exact:true}).waitFor();report.actions.push('Gerçek nakliye gönderildi');await check('cargo-sent')
  }
  await page.getByRole('tab',{name:'İdare',exact:true}).click();await check('rule')
  if(state==='colony')for(const [button,label]of [['Başkenti buraya taşı','move-confirm'],['Şehri terk et','abandon-confirm']]){await page.getByRole('button',{name:button,exact:true}).click();await page.getByRole('alertdialog').waitFor();await check(label);await page.getByRole('button',{name:'Vazgeç',exact:true}).click()}
  await context.close();console.log(`checked ${width}/${state}`)
 }
 } finally {await browser.close()}
 report.clean=report.scans.every(s=>s.total===0)&&!report.errors.length&&!report.missingArt.length
 await fs.writeFile(path.resolve('docs/population-qa-report.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({scans:report.scans.length,clean:report.clean,actions:report.actions,errors:report.errors,missingArt:report.missingArt}));if(!report.clean)process.exitCode=1
}
main().catch(error=>{console.error(error);process.exitCode=1})
