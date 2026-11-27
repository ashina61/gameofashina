/* Real compiled mobile scene: workforce, training, fleet and reduced motion. */
const fs=require('node:fs/promises'),path=require('node:path'),assert=require('node:assert/strict')
const {execFileSync}=require('node:child_process'),{chromium}=require('playwright')
const {skipGuide,seedSave,enterGame,qaOrigin}=require('./lib/qa.cjs')
async function main(){
 const out=path.resolve('visual-review/city-life');await fs.mkdir(out,{recursive:true})
 const now=Date.UTC(2026,10,21,10),seed=JSON.parse(execFileSync(process.execPath,['--import','tsx','-e',`
 const {initialEmpire}=require('./lib/game/empire.ts'),{OBJECTIVES}=require('./lib/game/engine.ts');
 const e=initialEmpire(${now}),g=e.cities[0].game;
 for(const [id,level,plot] of [['divan',15,0],['konut',10,6],['hamam',8,5],['medrese',3,2],['carsi',3,1],['kisla',3,3],['kereste',3,4],['ambar',20,8],['liman',2,25],['tersane',2,26]]){g.buildings[id]=level;g.placement[id]=plot}
 g.resources={gold:45000,wood:45000,knowledge:400};g.luxury={mermer:5000,kristal:5000,kahve:5000,kukurt:5000};g.claimed=OBJECTIVES.map(o=>o.id);g.citizens=500;g.workers={kereste:20,medrese:40,carsi:40};g.army.nakliye=3;g.army.kadirga=2;
 g.drills=[{id:'mizrakci',kind:'drill',count:5,start:${now},end:${now+1200000}}];console.log(JSON.stringify(e))
 `]).toString())
 const browser=await chromium.launch({executablePath:process.env.QA_CHROME_PATH,args:['--no-sandbox','--enable-unsafe-swiftshader']}),errors=[],missing=[],cases=[]
 const read=page=>page.evaluate(()=>JSON.parse(document.documentElement.dataset.cityLifeReview))
 async function open(width,fixture=seed){
  const context=await browser.newContext({viewport:{width,height:844},deviceScaleFactor:1,isMobile:true,hasTouch:true,serviceWorkers:'block'})
  await skipGuide(context);await seedSave(context,fixture);await context.addInitScript(()=>{localStorage.setItem('payitaht-qa','1');localStorage.setItem('payitaht-hafif','kapali')})
  const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400)missing.push(r.url())})
  await page.clock.install({time:now});await page.goto(qaOrigin('CITY_LIFE_QA_URL'));await enterGame(page);await page.clock.runFor(1000)
  await page.waitForFunction(()=>document.documentElement.dataset.cityLifeReview&&window.__payitahtQa);return {context,page}
 }
 const camera=async(page,x,y,zoom=1.15)=>{await page.evaluate(detail=>document.dispatchEvent(new CustomEvent('payitaht-qa-camera',{detail})),{x,y,zoom});await page.clock.runFor(150)}
 try{
  for(const width of [360,390,430]){
   const {context,page}=await open(width);const first=await read(page)
   for(const role of ['citizen','logger','scholar','trader','drill'])assert.ok(first.actors.some(a=>a.role===role),role)
   assert.equal(first.boats.length,2);assert.equal(first.moving,true)
   const ready=await page.evaluate(()=>document.documentElement.dataset.cityReady)
   await page.clock.runFor(2500);const moved=await read(page)
   assert.ok(moved.actors.some(a=>a.distance>first.actors.find(b=>a.id===b.id).distance));assert.equal(await page.evaluate(()=>document.documentElement.dataset.cityReady),ready,'population ticks rebuilt city')
   await camera(page,1306,1030);await page.screenshot({path:path.join(out,`training-${width}.png`)})
   if(width===390){
    await camera(page,1450,950,1.1)
    const frames=path.join(out,'frames');await fs.mkdir(frames,{recursive:true})
    for(let i=0;i<16;i++){await page.clock.runFor(250);await page.screenshot({path:path.join(frames,`${String(i).padStart(2,'0')}.png`)})}
   }
   await camera(page,950,1684);await page.screenshot({path:path.join(out,`fleet-${width}.png`)})
   await camera(page,1630,950,.7);await page.screenshot({path:path.join(out,`city-${width}.png`)})
   await page.emulateMedia({reducedMotion:'reduce'});await page.clock.runFor(400);const stopped=await read(page);assert.equal(stopped.moving,false)
   await page.clock.runFor(1500);assert.deepEqual((await read(page)).actors,stopped.actors)
   await page.emulateMedia({reducedMotion:'no-preference'});await page.clock.runFor(500);assert.equal((await read(page)).moving,true)
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false)
   if(width===390){
    await page.evaluate(()=>window.__payitahtQa.panel('settings'));await page.clock.runFor(200)
    await page.getByRole('radio',{name:'Açık',exact:true}).click();await page.evaluate(()=>window.__payitahtQa.close());await page.clock.runFor(500)
    const lite=await read(page);assert.equal(lite.lite,true);assert.ok(lite.actors.length<=12);assert.equal(lite.boats.length,1)
    await page.evaluate(()=>window.__payitahtQa.panel('settings'));await page.getByRole('switch',{name:'Az hareket',exact:true}).check();await page.evaluate(()=>window.__payitahtQa.close());await page.clock.runFor(400);assert.equal((await read(page)).moving,false)
    cases.push('live lite and motion preferences')
   }
   cases.push({width,actors:first.actors.length,boats:2,movement:true,reducedMotion:true,noRebuild:true});await context.close()
  }
  const unassigned=structuredClone(seed);unassigned.cities[0].game.workers.kereste=0
  const {context,page}=await open(390,unassigned)
  assert.equal((await read(page)).actors.some(a=>a.role==='logger'),false)
  for(const [button,present] of [['Bir artır',true],['Bir azalt',false]]){
   await page.evaluate(()=>window.__payitahtQa.building('kereste'));await page.clock.runFor(150)
   await page.getByRole('button',{name:button,exact:true}).click();await page.getByRole('button',{name:'Onayla',exact:true}).click()
   await page.evaluate(()=>window.__payitahtQa.close());await page.clock.runFor(600)
   assert.equal((await read(page)).actors.some(a=>a.role==='logger'),present)
  }
  cases.push('actual workforce assignment and removal');await context.close()
  const ending=structuredClone(seed);ending.cities[0].game.drills[0].end=now+7000
  const last=await open(390,ending);assert.ok((await read(last.page)).actors.some(a=>a.role==='drill'))
  await last.page.clock.runFor(9000);assert.equal((await read(last.page)).actors.some(a=>a.role==='drill'),false)
  assert.equal(await last.page.locator('canvas').count(),1);cases.push('completed training removes courtyard soldiers');await last.context.close()
  const empty=structuredClone(seed);empty.cities[0].game.army.nakliye=0;empty.cities[0].game.army.kadirga=0
  const none=await open(390,empty);assert.equal((await read(none.page)).boats.length,0);cases.push('no free fleet means no decorative boats');await none.context.close()
  const departed=JSON.parse(execFileSync(process.execPath,['--import','tsx','-e',`
   const {dispatchRaid}=require('./lib/game/expeditions.ts');const e=${JSON.stringify(seed)},g=e.cities[0].game;
   g.army.yeniceri=60;g.army.okcu=20;g.army.nakliye=2;g.army.kadirga=3;
   const sent=dispatchRaid(e,'zeytin-koy',{yeniceri:60,okcu:20,kadirga:3},${now});if(sent.error)throw Error(sent.error);console.log(JSON.stringify(sent.empire));
  `]).toString())
  const voyage=await open(390,departed);assert.equal((await read(voyage.page)).boats.length,0)
  await voyage.page.clock.fastForward(departed.missions[0].returnAt-now+2000);await voyage.page.clock.runFor(1200)
  assert.equal((await read(voyage.page)).boats.length,2);cases.push('mission return restores free fleet in live scene');await voyage.context.close()
  assert.deepEqual(errors,[]);assert.deepEqual(missing,[])
 }finally{await browser.close()}
 await fs.writeFile(path.join(out,'report.json'),JSON.stringify({cases,errors,missing},null,2));console.log(`City life QA passed: ${cases.length} compiled scenarios.`)
}
main().catch(error=>{console.error(error);process.exitCode=1})
