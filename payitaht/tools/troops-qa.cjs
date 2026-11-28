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
g.resources.gold=3000;g.resources.wood=3000;g.army.nakliye=4;g.army.mizrakci=10;g.claimed=OBJECTIVES.map(o=>o.id);
const result=foundColony(e,'zeytin',${now});if(result.error)throw Error(result.error);
result.empire.activeCityId='city-1';console.log(JSON.stringify(parseEmpire(JSON.stringify(result.empire))));`]).toString())
async function main() {
 await fs.mkdir('visual-review/troops', {recursive:true})
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
   await page.evaluate(()=>window.__payitahtQa.panel('army'))
   await page.getByRole('tab',{name:'Seferler',exact:true}).click()
   const count=page.getByRole('spinbutton',{name:'Mızrakçı sayısı',exact:true})
   await count.fill('3');assert.equal(await count.inputValue(),'3')
   await count.fill('999');assert.equal(await count.inputValue(),'10')
   await count.fill('-1');assert.equal(await count.inputValue(),'0')
   assert.match(await page.locator('#deploy-reason').innerText(),/En az bir birlik/)
   await count.fill('3')
   const send=page.getByRole('button',{name:'Gönder',exact:true})
   assert(await send.isEnabled())
   await count.scrollIntoViewIfNeeded()
   const fits=await count.evaluate(el=>{const r=el.getBoundingClientRect();return r.width>=44&&r.height>=44&&r.left>=0&&r.right<=innerWidth})
   assert(fits)
   await page.screenshot({path:`visual-review/troops/send-${width}.png`})
   await send.click()
   await page.waitForFunction(()=>JSON.parse(localStorage.getItem('payitaht-adalari-v1')).missions.some(m=>m.kind==='deploy'&&m.units.mizrakci===3))
   assert.deepEqual(errors,[])
   report.push({width,passed:true,countControlFits:fits})
  }finally{await browser.close()}
 }
 await fs.writeFile('visual-review/troops/report.json',JSON.stringify(report,null,2))
 console.log(JSON.stringify(report))
}
main().catch(e=>{console.error(e);process.exitCode=1})
