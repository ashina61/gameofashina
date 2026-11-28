const assert = require('node:assert/strict')
const fs = require('node:fs/promises')
const { execFileSync } = require('node:child_process')
const { chromium } = require('playwright')
const { skipGuide, seedSave, qaOrigin } = require('./lib/qa.cjs')
const now = Date.UTC(2026, 10, 27, 18)
const seed = JSON.parse(execFileSync(process.execPath, ['--import', 'tsx', '-e', `
const {initialEmpire,parseEmpire}=require('./lib/game/empire.ts');
const {freePlotsFor,OBJECTIVES}=require('./lib/game/engine.ts');
const e=initialEmpire(${now}),g=e.cities[0].game;
for(const [id,n] of [['divan',10],['ambar',10],['ticaret_merkezi',2],['liman',2]]){g.buildings[id]=n;if(g.placement[id]===null)g.placement[id]=freePlotsFor(g,id)[0];}
g.resources.gold=8000;g.resources.wood=8000;g.army.nakliye=2;
g.luxury={mermer:5000,kristal:5000,kahve:5000,kukurt:5000};g.claimed=OBJECTIVES.map(o=>o.id);
console.log(JSON.stringify(parseEmpire(JSON.stringify(e))));`]).toString())
async function main() {
 await fs.mkdir('visual-review/market', {recursive:true})
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
   await page.evaluate(()=>window.__payitahtQa.building('ticaret_merkezi'))
   await page.locator('.trade-offer').first().waitFor()
   await page.evaluate(()=>document.fonts.ready)
   await page.addStyleTag({content:'*,*::before,*::after{animation:none!important;transition:none!important;scroll-behavior:auto!important}'})
   const row=page.locator('.trade-offer').first()
   const fits=await row.locator('button').evaluate(el=>{const r=el.getBoundingClientRect(),s=el.closest('.bp-scroll').getBoundingClientRect();return r.top>=s.top&&r.bottom<=s.bottom&&r.height>=44})
   await page.screenshot({path:`visual-review/market/buy-${width}.png`})
   assert(fits,`${width}: first offer action outside initial viewport`)
   const prices=async()=>page.locator('.trade-offer .trade-price b').evaluateAll(es=>es.map(e=>Number(e.textContent)))
   const buy=await prices();assert.deepEqual(buy,[...buy].sort((a,b)=>a-b))
   await page.screenshot({path:`visual-review/market/buy-${width}.png`})
   const offerId=await row.getAttribute('data-offer')
   await row.locator('button').click()
   await page.waitForFunction(id=>JSON.parse(localStorage.getItem('payitaht-adalari-v1')).world?.traded.includes(id),offerId)
   const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('payitaht-adalari-v1')))
   assert(saved.world.deliveries.some(d=>d.id===`d-${offerId}`))
   await page.getByRole('radio',{name:'Sat',exact:true}).click()
   const sell=await prices();assert.deepEqual(sell,[...sell].sort((a,b)=>b-a))
   await page.screenshot({path:`visual-review/market/sell-${width}.png`})
   assert.deepEqual(errors,[])
   report.push({width,passed:true,firstActionVisible:fits})
  }finally{await browser.close()}
 }
 await fs.writeFile('visual-review/market/report.json',JSON.stringify(report,null,2))
 console.log(JSON.stringify(report))
}
main().catch(e=>{console.error(e);process.exitCode=1})
