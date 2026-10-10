/* Real mobile vizier screens and command/navigation checks. */
const fs = require('node:fs/promises'), path = require('node:path')
const { chromium } = require('playwright')
const { skipGuide, seedSave, enterGame, qaOrigin } = require('./lib/qa.cjs')
async function main() {
 const out = path.resolve('docs/mockups'), report = { scans: [], actions: [], errors: [], missingArt: [] }
 await fs.mkdir(out, { recursive: true })
 const source = await fs.readFile(path.join(__dirname, 'layout-qa.cjs'), 'utf8')
 const rawScan = source.slice(source.indexOf('function scanPage()'), source.indexOf('async function main()'))
 const target = rawScan.replace("document.querySelectorAll('.bp, .ika-top, .ika-nav, .quest-chip, .threat-banner, .island-view, .map-top-tools, .city-shortcuts, .city-activity, .title-screen, [role=\"dialog\"]')", "document.querySelectorAll('.bp-vizier')")
 if (target === rawScan) throw new Error('Layout scanner scope changed')
 const scan = new Function(`return (${target.trim()})`)()
 const fixture = JSON.parse(await fs.readFile(path.join(__dirname, 'fixtures/late-game.json'), 'utf8'))
 const browser = await chromium.launch({ headless: true, executablePath: process.env.QA_CHROMIUM_PATH, args: ['--no-sandbox','--no-zygote','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'] })
 try {
 for (const width of [360,390,430]) for (const state of ['idle','full','unrest','workers','ready','empty']) {
  const e = structuredClone(fixture), now = Date.now(); e.missions=[];e.sieges=[];e.threats=[];e.nextThreat={};e.shipments=[];e.world.wars=[];e.world.start=now;e.nextId=3
  const g=e.cities[0].game;g.updatedAt=now;g.resources.stone=0;g.buildings.tas=0;g.workers.tas=0;g.drills=[];g.study=null;g.queue=state==='idle'||state==='empty'?[]:[{id:'kereste',kind:'build',start:now-60000,end:now+3600000}]
  for(const k of Object.keys(g.resources))g.resources[k]=100;g.resources.stone=0
  if(state==='full')g.resources.wood=10000000
  if(state==='unrest')g.buildings.konut=20
  if(state==='ready'){g.buildings.kereste=4;g.workers.kereste=80}
  g.log=state==='empty'?[]:[{time:now,text:'Kereste Ocağı yükseltmesi tamamlandı.'},{time:now-1000,text:'Kereste Ocağı yükseltmesi tamamlandı.'},{time:now-3600000,text:'Yeni araştırma tamamlandı; şehrin bütün mahallelerine haber gönderildi ve ustalar yeni üretim planlarını kayda geçirdi.'},{time:now-86400000,text:'Ordu şehre döndü.'}]
  const c=structuredClone(e.cities[0]);c.id='city-2';c.islandId='zeytin';c.name='Uzun Adlı Yeni Osmanlı Liman Yerleşimi';c.game.buildings.saray=0;c.game.buildings.valilik=1;c.game.placement.valilik=20;c.game.queue=[];e.cities.push(c)
  const context=await browser.newContext({viewport:{width,height:844},isMobile:true,hasTouch:true,deviceScaleFactor:1})
  await skipGuide(context);await seedSave(context,e);await context.addInitScript(time=>{localStorage.setItem('payitaht-qa','1');Date.now=()=>time},now)
  const page=await context.newPage();page.setDefaultTimeout(30000)
  page.on('pageerror',error=>report.errors.push(`${width}/${state}: ${error.message}`));page.on('response',r=>{if(r.status()>=400&&r.url().includes('/images/game/'))report.missingArt.push(r.url())})
  await page.goto(qaOrigin('VIZIER_QA_URL'),{waitUntil:'domcontentloaded'});await enterGame(page);await page.waitForFunction(()=>window.__payitahtQa)
  await page.addStyleTag({content:'*,*::before,*::after{animation:none!important;transition:none!important;scroll-behavior:auto!important}'})
  const open=async()=>{await page.evaluate(()=>window.__payitahtQa.panel('advisor-city'));await page.locator('.bp-vizier').waitFor()}
  const restore=()=>page.evaluate(()=>document.querySelectorAll('[data-qa-zoom]').forEach(el=>{el.style.fontSize=el.dataset.qaOriginalFont||'';delete el.dataset.qaZoom;delete el.dataset.qaOriginalFont}))
  const check=async label=>{
   await restore()
   for(const zoom of [1,1.3]){
    if(zoom>1)await page.evaluate(z=>{const els=[...document.querySelectorAll('.bp-vizier,.bp-vizier *')].filter(el=>!(el instanceof SVGElement));const sizes=els.map(el=>parseFloat(getComputedStyle(el).fontSize));els.forEach((el,i)=>{el.dataset.qaOriginalFont=el.style.fontSize;el.style.fontSize=`${sizes[i]*z}px`;el.dataset.qaZoom='1'})},zoom)
    await page.waitForTimeout(80);const found=await page.evaluate(scan);const total=Object.values(found).reduce((n,g)=>n+Object.values(g).reduce((s,x)=>s+x.adet,0),0);report.scans.push({width,state,label,zoom,total,found});if(total)console.log(JSON.stringify({width,state,label,zoom,found}))
   }
   await restore();if(width===390&&(state==='workers'||state==='empty'))await page.screenshot({path:path.join(out,`vizier-${state}-${label}-390.webp`),type:'webp',quality:85})
  }
  await open();await check('agenda')
  const expected={idle:'Ustalar emrinizi bekliyor',full:'Ambarlar doluyor',unrest:'Halkın huzura ihtiyacı var',workers:/kişi iş bekliyor/,ready:'Şehir yolunda efendim',empty:'Ustalar emrinizi bekliyor'}[state]
  await page.getByRole('heading',{name:expected,exact:typeof expected==='string'}).waitFor()
  if(width===390){
   await page.locator('.vizier-advice').locator('..').getByRole('button').click()
   if(state==='idle'||state==='empty')await page.locator('.bp-construction').waitFor()
   else {await page.locator('.building-inspector').waitFor();await page.locator('.building-inspector-details').click();await page.locator(`.bp-of-${state==='full'?'ambar':state==='unrest'?'hamam':'divan'}`).waitFor()}
   report.actions.push(`${state}: öncelikli emir doğru sayfayı açtı`);await open()
  }
  await page.getByRole('tab',{name:'Şehirler',exact:true}).click();await check('cities')
  if(width===390&&state==='workers'){
   await page.getByRole('button',{name:new RegExp(c.name)}).click();await page.waitForFunction(()=>JSON.parse(localStorage.getItem('payitaht-adalari-v1')).activeCityId==='city-2');report.actions.push('Şehir sicilinden koloniye geçiş kayda işlendi');await open();await page.getByRole('tab',{name:'Şehirler',exact:true}).click();await page.getByRole('button',{name:/Sahilhisar.*şehre git/}).click();await open()
   await page.getByRole('button',{name:'İmparatorluk özeti',exact:true}).click();await page.locator('.bp-atlas').waitFor();report.actions.push('İmparatorluk özeti açıldı');await open()
  }
  await page.getByRole('tab',{name:'Haberler',exact:true}).click();if(state==='empty')await page.getByText('Şehir defteri henüz boş.',{exact:false}).waitFor();await check('news')
  if(width===390&&state==='workers'){await page.getByRole('button',{name:'Şehir günlüğünü aç',exact:true}).click();await page.getByRole('heading',{name:'Şehir günlüğü',exact:true}).waitFor();report.actions.push('Şehir günlüğü açıldı')}
  await context.close();console.log(`checked ${width}/${state}`)
 }
 }finally{await browser.close()}
 report.clean=report.scans.every(s=>s.total===0)&&!report.errors.length&&!report.missingArt.length
 await fs.writeFile(path.resolve('docs/vizier-qa-report.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({scans:report.scans.length,clean:report.clean,actions:report.actions,errors:report.errors,missingArt:report.missingArt}));if(!report.clean)process.exitCode=1
}
main().catch(error=>{console.error(error);process.exitCode=1})
