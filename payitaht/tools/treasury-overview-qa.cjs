/* The default treasury summaries must fit without hiding or scaling content. */
const fs=require('node:fs/promises'),path=require('node:path'),assert=require('node:assert/strict')
const {execFileSync}=require('node:child_process'),{chromium}=require('playwright')
const {skipGuide,seedSave,enterGame,qaOrigin,SAVE_KEY}=require('./lib/qa.cjs')
async function main(){
 const baseline=process.env.QA_TREASURY_BASELINE==='1',measureOnly=process.env.QA_TREASURY_MEASURE_ONLY==='1',now=Date.UTC(2026,10,22,8),cases=[],errors=[],missing=[]
 const out=path.resolve(`visual-review/treasury-overview/${baseline?'before':measureOnly?'measure':'after'}`);await fs.mkdir(out,{recursive:true})
 const seed=JSON.parse(execFileSync(process.execPath,['--import','tsx','-e',`const {initialEmpire}=require('./lib/game/empire.ts'),{OBJECTIVES,freePlotsFor}=require('./lib/game/engine.ts');const e=initialEmpire(${now}),g=e.cities[0].game;e.cities[0].name='Trabzon';for(const[id,level]of[['divan',26],['konut',26],['ambar',26],['depo',10],['medrese',20],['carsi',20],['hamam',20],['kahvehane',10]]){g.buildings[id]=level;if(g.placement[id]===null)g.placement[id]=freePlotsFor(g,id)[0]}g.resources={gold:181834,wood:191000,knowledge:196000};g.luxury={mermer:196000,kristal:4000,kahve:8000,kukurt:3000};g.citizens=1030;g.workers={kereste:20,medrese:80,carsi:60};g.army.mizrakci=80;g.claimed=OBJECTIVES.map(o=>o.id);console.log(JSON.stringify(e))`]).toString())
 const browser=await chromium.launch({executablePath:process.env.QA_CHROME_PATH,args:['--no-sandbox','--enable-unsafe-swiftshader']})
 async function open(width,height=740,fixture=seed){
  const context=await browser.newContext({viewport:{width,height},isMobile:true,hasTouch:true,deviceScaleFactor:1,serviceWorkers:'block'});await skipGuide(context);await seedSave(context,fixture);await context.addInitScript(time=>{localStorage.setItem('payitaht-qa','1');Date.now=()=>time},now)
  const page=await context.newPage();page.setDefaultTimeout(10000);page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400)missing.push(r.url())});await page.goto(qaOrigin());await enterGame(page);await page.waitForFunction(()=>document.documentElement.dataset.cityReady&&window.__payitahtQa);await page.evaluate(()=>window.__payitahtQa.panel('economy'));await page.locator('.bp-treasury').waitFor();await page.addStyleTag({content:'*,*::before,*::after{animation:none!important;transition:none!important;scroll-behavior:auto!important}'});return{page,context}
 }
 const measure=page=>page.locator('.bp-scroll').evaluate(el=>({scroll:Math.max(0,el.scrollHeight-el.clientHeight),height:el.clientHeight,horizontal:document.documentElement.scrollWidth>innerWidth}))
 const saved=page=>page.evaluate(k=>JSON.parse(localStorage.getItem(k)),SAVE_KEY)
 try{
  for(const width of (baseline||measureOnly)?[390]:[360,390,430]){
   const{page,context}=await open(width);const before=await saved(page)
   for(const[tab,file]of[['Hazine','ledger'],['Üretim','production'],['Ambar','stores']]){
    await page.getByRole('tab',{name:tab,exact:true}).click();const metrics=await measure(page);cases.push({name:'default overview',tab,width,...metrics});await page.screenshot({path:path.join(out,`${file}-${width}.png`)})
    if(!baseline&&!measureOnly){assert.equal(metrics.horizontal,false);assert.ok(metrics.scroll<=2,`${tab}/${width}: needs ${metrics.scroll}px scrolling`)}
   }
   if(!baseline&&!measureOnly){
    const expected=JSON.parse(execFileSync(process.execPath,['--import','tsx','-e',`const {rates,armyUpkeep,scientistUpkeepPerMinute,formatNumber,formatRate}=require('./lib/game/engine.ts'),g=JSON.parse(process.argv[1]);console.log(JSON.stringify({gold:formatNumber(g.resources.gold),net:formatRate(rates(g).gold,true),army:'−'+formatRate(armyUpkeep(g)),scholars:'−'+formatRate(scientistUpkeepPerMinute(g))}))`,JSON.stringify(before.cities[0].game)]).toString())
    await page.getByRole('tab',{name:'Hazine',exact:true}).click();assert.equal(await page.locator('.treasury-balance strong').innerText(),expected.gold);assert.equal(await page.locator('.treasury-balance-rate b').innerText(),expected.net);const fees=await page.locator('.treasury-account strong').allTextContents();assert.equal(fees[0],expected.army+' / dk');assert.equal(fees[1],expected.scholars+' / dk');await page.getByRole('tab',{name:'Ambar',exact:true}).click()
    assert.equal(await page.locator('.treasury-store-ledger > button').count(),7);await page.getByRole('button',{name:/İlim üretimini aç/}).click();assert.equal(await page.getByRole('combobox',{name:'Kaynak',exact:true}).inputValue(),'knowledge')
    for(const good of ['gold','wood','knowledge','kahve','mermer','kristal','kukurt']){await page.getByRole('combobox',{name:'Kaynak',exact:true}).selectOption(good);const m=await measure(page);assert.ok(m.scroll<=2,`${good}/${width}: needs ${m.scroll}px scrolling`);assert.equal(await page.locator('.treasury-production-details').getAttribute('open'),null)}
    const after=await saved(page);assert.deepEqual(after,before,'viewing sources must not alter the save');cases.push({name:'seven resources and warehouse links remain read only',width})
    await page.getByRole('tab',{name:'Hazine',exact:true}).click();await page.locator('.treasury-ledger-details > summary').click();assert.equal(await page.getByRole('button',{name:'Konakları geliştir',exact:true}).count(),1);await page.getByRole('button',{name:'Konakları geliştir',exact:true}).click();await page.locator('.building-inspector[data-building="konut"]').waitFor();cases.push({name:'support detail still opens the real building',width})
   }
   await context.close()
  }
  if(!baseline&&!measureOnly){
   for(const state of ['empty','full']){
    const fixture=structuredClone(seed),g=fixture.cities[0].game,limit=Number(execFileSync(process.execPath,['--import','tsx','-e',`console.log(require('./lib/game/engine.ts').capacity(JSON.parse(process.argv[1])))`,JSON.stringify(g)]).toString());for(const k of Object.keys(g.resources))g.resources[k]=state==='full'?limit:0;for(const k of Object.keys(g.luxury))g.luxury[k]=state==='full'?limit:0
    const{page,context}=await open(360,740,fixture)
    for(const tab of ['Hazine','Üretim','Ambar']){await page.getByRole('tab',{name:tab,exact:true}).click();const m=await measure(page);assert.ok(m.scroll<=2,`${state}/${tab}: ${m.scroll}px scrolling`);assert.equal(m.horizontal,false)}
    if(state==='full'){await page.getByRole('tab',{name:'Hazine',exact:true}).click();assert.match(await page.locator('.treasury-alerts').innerText(),/dolu/);assert.equal(await page.locator('.treasury-balance .is-full').innerText(),'Stok · dolu')}
    cases.push({name:'empty and full summaries remain visible',state});await context.close()
   }
   const oversized=structuredClone(seed);oversized.cities[0].game.resources.gold=1e9;const huge=await open(360,740,oversized);assert.equal((await measure(huge.page)).horizontal,false);assert.equal(await huge.page.locator('.treasury-balance strong').textContent(),'1.000.000.000');cases.push({name:'oversized imported balance reflows without truncation'});await huge.context.close()
   const large=await open(360);await large.page.evaluate(()=>{const sizes=[...document.querySelectorAll('.bp-treasury,.bp-treasury *')].map(el=>[el,parseFloat(getComputedStyle(el).fontSize)]);for(const[el,n]of sizes)if(n)el.style.fontSize=`${n*1.3}px`});assert.equal((await measure(large.page)).horizontal,false);await large.page.screenshot({path:path.join(out,'ledger-large-360.png')});cases.push({name:'large text remains readable without horizontal overflow'});await large.context.close()
  }
  assert.deepEqual(errors,[]);assert.deepEqual(missing,[])
 }finally{await browser.close();await fs.writeFile(path.join(out,'report.json'),JSON.stringify({baseline,cases,errors,missing},null,2)+'\n')}
 console.log(`Treasury overview passed: ${cases.length} scenarios.`)
}
main().catch(e=>{console.error(e);process.exitCode=1})
