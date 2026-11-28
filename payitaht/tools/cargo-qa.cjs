const assert = require('node:assert/strict')
const fs = require('node:fs/promises')
const { execFileSync } = require('node:child_process')
const { chromium } = require('playwright')
const { skipGuide, seedSave, qaOrigin } = require('./lib/qa.cjs')
const now = Date.UTC(2026, 10, 27, 18)
const seed = JSON.parse(execFileSync(process.execPath, ['--import', 'tsx', '-e', `
const {initialEmpire,parseEmpire,foundColony}=require('./lib/game/empire.ts');
const {freePlotsFor,OBJECTIVES}=require('./lib/game/engine.ts');
const e=initialEmpire(${now}),g=e.cities[0].game;
for(const [id,n] of [['divan',4],['saray',2],['liman',2]]){g.buildings[id]=n;if(g.placement[id]===null)g.placement[id]=freePlotsFor(g,id)[0];}
g.resources.gold=3000;g.resources.wood=3000;g.army.nakliye=4;g.claimed=OBJECTIVES.map(o=>o.id);
const result=foundColony(e,'zeytin',${now});if(result.error)throw Error(result.error);
result.empire.activeCityId='city-1';console.log(JSON.stringify(parseEmpire(JSON.stringify(result.empire))));`]).toString())
async function main() {
 await fs.mkdir('visual-review/cargo', {recursive:true})
 const report=[]
 for(const width of [360,390,430]) {
  const browser=await chromium.launch({executablePath:process.env.QA_CHROME_PATH,args:['--no-sandbox']})
  try {
   const context=await browser.newContext({viewport:{width,height:740},isMobile:true,hasTouch:true,serviceWorkers:'block'})
   await skipGuide(context);await seedSave(context,seed)
   await context.addInitScript(t=>{Date.now=()=>t;localStorage.setItem('payitaht-qa','1')},now)
   const page=await context.newPage(),errors=[]
   page.on('pageerror',e=>errors.push(e.message))
   await page.goto(qaOrigin());await page.getByRole('button',{name:'Devam et',exact:true}).click()
   await page.waitForFunction(()=>window.__payitahtQa)
   await page.evaluate(()=>window.__payitahtQa.panel('cities'))
   await page.getByRole('tab',{name:'Nakliye',exact:true}).click()
   await page.getByLabel('Varış şehri').selectOption('city-2')
   await page.evaluate(()=>document.fonts.ready)
   await page.addStyleTag({content:'*,*::before,*::after{animation:none!important;transition:none!important;scroll-behavior:auto!important}'})
   const send=page.getByRole('button',{name:'Gemileri gönder',exact:true})
   await page.getByLabel('Yük miktarı').fill('999999')
   assert(await send.isDisabled())
   await page.getByLabel('Yük miktarı').fill('100')
   assert(await send.isEnabled())
   assert.match(await page.locator('#cargo-preview').innerText(),/gemi.*dk yolculuk/)
   const fits=await send.evaluate(el=>{const r=el.getBoundingClientRect(),s=el.closest('.bp-scroll').getBoundingClientRect();return r.top>=s.top&&r.bottom<=s.bottom&&r.height>=44})
   await page.screenshot({path:`visual-review/cargo/send-${width}.png`})
   assert(fits,`${width}: send action outside initial viewport`)
   await send.click()
   await page.waitForFunction(()=>JSON.parse(localStorage.getItem('payitaht-adalari-v1')).shipments.length===1)
   await page.getByRole('heading',{name:'Gemiler seferde',exact:true}).waitFor()
   assert.deepEqual(errors,[])
   report.push({width,passed:true,firstActionVisible:fits})
  }finally{await browser.close()}
 }
 await fs.writeFile('visual-review/cargo/report.json',JSON.stringify(report,null,2))
 console.log(JSON.stringify(report))
}
main().catch(e=>{console.error(e);process.exitCode=1})
