/* Real rendered decisions, disclosure navigation and commands at phone widths. */
const assert = require('node:assert/strict')
const fs = require('node:fs/promises')
const path = require('node:path')
const { execFileSync } = require('node:child_process')
const { chromium } = require('playwright')
const { skipGuide, seedSave, enterGame, qaOrigin } = require('./lib/qa.cjs')
const now = Date.UTC(2026, 10, 26, 8)
const seed = JSON.parse(execFileSync(process.execPath, ['--import', 'tsx', '-e', `
const {initialEmpire}=require('./lib/game/empire.ts');
const {OBJECTIVES,freePlotsFor}=require('./lib/game/engine.ts');
const e=initialEmpire(${now}),g=e.cities[0].game;
for(const [id,level] of [['divan',10],['konut',10],['ambar',10],['medrese',5],['kisla',5],['tersane',3],['elcilik',3]]){
 g.buildings[id]=level;if(g.placement[id]===null)g.placement[id]=freePlotsFor(g,id)[0];
}
g.resources={gold:8000,wood:8000,knowledge:400};g.luxury={mermer:2000,kristal:1000,kahve:1000,kukurt:1000};g.citizens=500;
g.claimed=OBJECTIVES.map(o=>o.id);console.log(JSON.stringify(e));`]).toString())
async function inView(locator) {
 return locator.evaluate(el => {const a=el.getBoundingClientRect(),b=el.closest('.bp-scroll').getBoundingClientRect();return a.top>=b.top&&a.bottom<=b.bottom&&a.height>=44})
}
async function main() {
 const out=path.resolve('visual-review/decision-clarity');await fs.mkdir(out,{recursive:true})
 const results=[]
 for(const width of [360,390,430]) {
  const browser=await chromium.launch({executablePath:process.env.QA_CHROME_PATH,args:['--no-sandbox','--enable-unsafe-swiftshader']})
  const errors=[]
  try {
   const context=await browser.newContext({viewport:{width,height:740},isMobile:true,hasTouch:true,deviceScaleFactor:1,serviceWorkers:'block'})
   await skipGuide(context);await seedSave(context,seed)
   await context.addInitScript(t=>{Date.now=()=>t;localStorage.setItem('payitaht-qa','1')},now)
   const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400)errors.push(`${r.status()} ${r.url()}`)})
   await page.goto(qaOrigin());await enterGame(page);await page.waitForFunction(()=>window.__payitahtQa&&document.documentElement.dataset.cityReady)
   await page.evaluate(()=>document.fonts.ready)
   await page.addStyleTag({content:'*,*::before,*::after{animation:none!important;transition:none!important;scroll-behavior:auto!important}'})
   await page.evaluate(()=>window.__payitahtQa.panel('research'))
   const research=page.locator('[data-guide="research"]');await research.waitFor()
   assert(await inView(research),`${width}: research action below viewport`)
   await page.screenshot({path:path.join(out,`research-${width}.png`)})
   const archive=page.locator('.rs-scroll:not([inert]) .mobile-details')
   await archive.locator('summary').click();await archive.locator('button').last().click()
   assert(await page.locator('.rs-detail').evaluate(el=>document.activeElement===el),'Research selection loses focus')
   await page.getByRole('tab',{name:/^Bilim/}).click()
   await page.waitForFunction(()=>document.querySelector('.bp-scroll').scrollTop===0)
   await page.evaluate(()=>window.__payitahtQa.panel('army'))
   const recruit=page.locator('.barracks-entry.is-selected [data-guide^="recruit-"]:visible');await recruit.waitFor()
   assert(await inView(recruit),`${width}: recruitment action below viewport`)
   await page.screenshot({path:path.join(out,`army-${width}.png`)})
   const locked=page.locator('.barracks-roster > .mobile-details:visible')
   await locked.locator('summary').click();await locked.locator('button').first().click()
   assert(await page.locator('.barracks-entry.is-selected > div:visible').evaluate(el=>document.activeElement===el),'Locked unit selection loses focus')
   await page.locator('.barracks-entry:not(.is-locked) > button').first().click()
   await recruit.click()
   await page.locator('.training-queue-disclosure').waitFor()
   await page.locator('[data-sonner-toast]').waitFor({state:'hidden'})
   await page.getByRole('tab',{name:'Donanma',exact:true}).click()
   await page.locator('.barracks-roster:visible').waitFor()
   await page.screenshot({path:path.join(out,`navy-${width}.png`)})
   await page.evaluate(()=>window.__payitahtQa.panel('diplomacy'))
   await page.locator('.rival-row').first().waitFor()
   assert(await page.locator('.rival-row').first().evaluate(el=>{const name=el.querySelector('.envoy-rival-name').getBoundingClientRect(),score=el.querySelector('.report-win,.report-loss').getBoundingClientRect();return name.width>=120&&score.left>=name.right}), 'Ruler name and relationship must occupy separate readable columns')
   await page.screenshot({path:path.join(out,`envoy-${width}.png`)})
   await page.locator('.rival-row').first().click()
   await page.waitForFunction(()=>!document.querySelector('.rival-row'))
   assert.deepEqual(errors,[])
   results.push({width,passed:true});console.log(`${width}: decisions, focus, recruitment, navy and rival navigation passed`)
  }finally{await browser.close();await fs.writeFile(path.join(out,'report.json'),JSON.stringify(results,null,2))}
 }
}
main().catch(e=>{console.error(e);process.exitCode=1})
