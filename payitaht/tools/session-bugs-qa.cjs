/* Regression checks through the compiled UI, including real backup file imports. */
const fs=require('node:fs/promises'),path=require('node:path'),assert=require('node:assert/strict')
const {execFileSync}=require('node:child_process'),{chromium}=require('playwright')
const {skipGuide,seedSave,enterGame,qaOrigin,SAVE_KEY}=require('./lib/qa.cjs')
async function main(){
 const baseline=process.env.QA_BUG_BASELINE==='1',now=Date.UTC(2026,10,21,12),future=now+86400000,cases=[],errors=[]
 const dir=path.resolve(process.env.QA_SESSION_REPORT_DIR||'docs/qa/session-0134');await fs.mkdir(dir,{recursive:true})
 const fixture=time=>JSON.parse(execFileSync(process.execPath,['--import','tsx','-e',`
 const {initialEmpire}=require('./lib/game/empire.ts'),{OBJECTIVES,freePlotsFor}=require('./lib/game/engine.ts');const e=initialEmpire(${time}),g=e.cities[0].game;
 for(const [id,level] of [['divan',10],['konut',10],['hamam',8],['medrese',3],['kisla',3],['kereste',3],['ambar',10]]){if(g.placement[id]==null)g.placement[id]=freePlotsFor(g,id)[0];g.buildings[id]=level}
 g.resources={gold:8000,wood:8000,knowledge:400};g.claimed=OBJECTIVES.map(o=>o.id);g.citizens=500;g.workers={kereste:20,medrese:10,carsi:0};console.log(JSON.stringify(e))
 `]).toString())
 const normal=fixture(now),later=fixture(future)
 later.cities[0].game.queue=[{id:'kereste',kind:'build',start:future,end:future+5000}]
 later.cities[0].game.drills=[{id:'mizrakci',kind:'drill',count:2,start:future,end:future+5000}]
 const browser=await chromium.launch({executablePath:process.env.QA_CHROME_PATH,args:['--no-sandbox','--enable-unsafe-swiftshader']})
 async function open(seed,width=390){
  const context=await browser.newContext({viewport:{width,height:844},deviceScaleFactor:1,isMobile:true,hasTouch:true,serviceWorkers:'block'})
  await skipGuide(context);await seedSave(context,seed);await context.addInitScript(()=>localStorage.setItem('payitaht-qa','1'))
  const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));page.setDefaultTimeout(8000)
  await page.clock.install({time:now});await page.goto(qaOrigin('SESSION_QA_URL'));await enterGame(page);await page.clock.runFor(900);await page.waitForFunction(()=>document.documentElement.dataset.cityReady&&window.__payitahtQa)
  return {page,context}
 }
 const saved=page=>page.evaluate(key=>JSON.parse(localStorage.getItem(key)),SAVE_KEY)
 async function settings(page){await page.evaluate(()=>window.__payitahtQa.panel('settings'));await page.getByRole('tab',{name:'Kayıt',exact:true}).click()}
 async function restore(page,e){await settings(page);await page.locator('.royal-save-page input[type=file]').setInputFiles({name:'regression.json',mimeType:'application/json',buffer:Buffer.from(typeof e==='string'?e:JSON.stringify(e))});await page.clock.runFor(200)}
 async function check(name,seed,fn,width=390){
  const {page,context}=await open(seed,width)
  try{const detail=await fn(page);cases.push({name,width,passed:true,...detail})}catch(error){cases.push({name,width,passed:false,error:error.message});console.error(name,error.message)}finally{await context.close()}
 }
 try{
  await check('future backup advances from its own timestamp',normal,async page=>{
   await restore(page,later);await page.clock.runFor(11000);const e=await saved(page),stamp=e.cities[0].game.updatedAt
   assert.ok(stamp>=future+8000,`timestamp ${stamp} is frozen at future backup ${future}`);assert.equal(e.cities[0].game.buildings.kereste,4);assert.equal(e.cities[0].game.queue.length,0);assert.equal(e.cities[0].game.army.mizrakci,2);assert.equal(e.cities[0].game.drills.length,0);return{timestamp:stamp,constructionCompleted:true,trainingCompleted:true}
  })
  await check('older backup does not inherit previous session future',later,async page=>{
   await restore(page,normal);await page.clock.runFor(11000);const stamp=(await saved(page)).cities[0].game.updatedAt
   assert.ok(stamp>=now+8000&&stamp<now+20000,`timestamp ${stamp} inherited future session ${future}`);return{timestamp:stamp}
  })
  await check('new game starts at current device time',later,async page=>{
   await settings(page);await page.getByRole('button',{name:'Yeni oyun başlat',exact:true}).click();await page.getByRole('button',{name:'Evet, şehrimi sıfırla',exact:true}).click();await page.clock.runFor(100)
   const e=await saved(page),g=e.cities[0].game;assert.equal(g.buildings.divan,1);assert.ok(g.updatedAt>=now&&g.updatedAt<now+10000,`new game inherited ${g.updatedAt}`);return{timestamp:g.updatedAt}
  })
  await check('title new game also replaces the previous session clock',later,async page=>{
   await settings(page);await page.getByRole('tab',{name:'Bilgi',exact:true}).click();await page.getByRole('button',{name:'Giriş ekranına dön',exact:true}).click();await page.getByRole('button',{name:'Yeni oyun',exact:true}).click()
   await page.getByRole('button',{name:'Evet, eskisini sil ve başla',exact:true}).click();await page.clock.runFor(900);await page.locator('canvas').waitFor()
   const g=(await saved(page)).cities[0].game;assert.equal(g.buildings.divan,1);assert.ok(g.updatedAt>=now&&g.updatedAt<now+10000,`title new game inherited ${g.updatedAt}`);return{timestamp:g.updatedAt}
  })
  await check('invalid import preserves current progress and clock',normal,async page=>{
   const before=await saved(page);await restore(page,'{invalid');await page.clock.runFor(11000);const after=await saved(page)
   assert.deepEqual(after.cities[0].game.buildings,before.cities[0].game.buildings);assert.ok(after.cities[0].game.updatedAt>=now+8000);return{timestamp:after.cities[0].game.updatedAt}
  })
  for(const width of baseline?[390]:[360,390,430]){
   await check('Back returns detail to preview, then city',normal,async page=>{
    await page.evaluate(()=>window.__payitahtQa.buildingPreview('kisla'));await page.locator('.building-inspector-details').click();await page.locator('.bp-of-kisla').waitFor()
    await page.getByRole('button',{name:'Kaynak ayrıntılarını aç',exact:true}).click();await page.goBack();await page.clock.runFor(100)
    assert.equal(await page.getByRole('button',{name:'Kaynak ayrıntılarını aç',exact:true}).count(),1);assert.equal(await page.locator('.bp-of-kisla').isVisible(),true,'resource Back closed the building')
    await page.goBack();await page.clock.runFor(100)
    assert.equal(await page.locator('.bp-of-kisla').count(),0);assert.equal(await page.locator('.building-inspector-details').isVisible(),true,'Back skipped building preview')
    await page.goBack();await page.clock.runFor(100);assert.equal(await page.locator('.building-inspector-details').count(),0);assert.equal(await page.locator('canvas').count(),1);assert.ok(!page.url().startsWith('about:'));return{url:page.url()}
   },width)
   await check('development tab returns upgrade to view after deep scroll',normal,async page=>{
    await page.evaluate(()=>window.__payitahtQa.building('kisla'));await page.locator('.bp-of-kisla').waitFor();await page.clock.runFor(500)
    const depth=await page.locator('.bp-scroll').evaluate(el=>{el.scrollTop=el.scrollHeight;return el.scrollTop});assert.ok(depth>200,'fixture must start deep in the training list')
    await page.getByRole('tab',{name:'Gelişim',exact:true}).click();await page.clock.runFor(100)
    const top=await page.locator('.bp-scroll').evaluate(el=>el.scrollTop);assert.equal(top,0,`Development retained scrollTop=${top}`)
    await page.locator('.bp-scroll').evaluate(el=>{el.scrollTop=el.scrollHeight});await page.getByRole('tab',{name:/Kara ordusu/}).click();await page.clock.runFor(100)
    assert.equal(await page.locator('.bp-scroll').evaluate(el=>el.scrollTop),0);return{fromScrollTop:depth,toScrollTop:top}
   },width)
  }
  assert.deepEqual(errors,[],'uncaught browser errors')
 }finally{await browser.close();await fs.writeFile(path.join(dir,baseline?'before.json':'after.json'),JSON.stringify({baseline,cases,errors},null,2)+'\n')}
 console.log(`${cases.filter(c=>c.passed).length}/${cases.length} session regression scenarios passed`)
 if(!baseline)assert.ok(cases.every(c=>c.passed),'session regressions failed')
}
main().catch(e=>{console.error(e);process.exitCode=1})
