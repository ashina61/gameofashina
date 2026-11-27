/* Compiled construction catalogue and explicit plot-selection flow. */
const fs=require('node:fs/promises'),path=require('node:path'),assert=require('node:assert/strict')
const {execFileSync}=require('node:child_process'),{chromium}=require('playwright')
const {skipGuide,seedSave,enterGame,qaOrigin,SAVE_KEY}=require('./lib/qa.cjs')
async function main(){
 const baseline=process.env.QA_CONSTRUCTION_BASELINE==='1',now=Date.UTC(2026,10,22,12),cases=[],errors=[],missing=[]
 const out=path.resolve(`visual-review/construction-clarity/${baseline?'before':'after'}`);await fs.mkdir(out,{recursive:true})
 const fixture=JSON.parse(execFileSync(process.execPath,['--import','tsx','-e',`const {initialEmpire}=require('./lib/game/empire.ts'),{OBJECTIVES}=require('./lib/game/engine.ts');const e=initialEmpire(${now});e.cities[0].game.claimed=OBJECTIVES.map(o=>o.id);console.log(JSON.stringify(e))`]).toString())
 const browser=await chromium.launch({executablePath:process.env.QA_CHROME_PATH,args:['--no-sandbox','--enable-unsafe-swiftshader']})
 const saved=page=>page.evaluate(key=>JSON.parse(localStorage.getItem(key)).cities[0].game,SAVE_KEY)
 async function open(width,seed=fixture,large=false){
  const context=await browser.newContext({viewport:{width,height:844},deviceScaleFactor:1,isMobile:true,hasTouch:true,serviceWorkers:'block'})
  await skipGuide(context);await seedSave(context,seed);await context.addInitScript(()=>localStorage.setItem('payitaht-qa','1'))
  const page=await context.newPage();page.setDefaultTimeout(10000);page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400)missing.push(r.url())})
  await page.clock.install({time:now});await page.goto(qaOrigin('CONSTRUCTION_QA_URL'));await enterGame(page);await page.clock.runFor(900);await page.waitForFunction(()=>document.documentElement.dataset.cityReady&&window.__payitahtQa)
  if(large)await page.evaluate(()=>{for(const el of document.querySelectorAll('*')){const n=parseFloat(getComputedStyle(el).fontSize);if(n)el.style.fontSize=`${n*1.3}px`}})
  return{page,context}
 }
 async function catalogue(page){await page.evaluate(()=>window.__payitahtQa.panel('build'));await page.locator('.construction-register').waitFor();await page.clock.runFor(500);await page.evaluate(()=>{for(const a of document.querySelector('.bp').getAnimations({subtree:true})){if(Number.isFinite(a.effect?.getComputedTiming().iterations)){try{a.finish()}catch{/* unresolved effect */}}}})}
 const entry=(page,id)=>page.locator(`.construction-entry[data-building="${id}"]`)
 try{
  for(const width of baseline?[390]:[360,390,430]){
   const{page,context}=await open(width);await catalogue(page)
   const first=await page.locator('.construction-entry').first().boundingBox(),scroll=await page.locator('.bp-scroll').boundingBox();const metrics={width,firstY:first.y,viewportBottom:scroll.y+scroll.height,firstVisible:first.y+first.height<=scroll.y+scroll.height}
   await page.screenshot({path:path.join(out,`catalogue-${width}.png`)});cases.push({name:'catalogue first choice',...metrics})
   if(!baseline){
    assert.equal(metrics.firstVisible,true,'first building choice below fold');assert.equal(await page.locator('.construction-filters button[aria-pressed=true]').innerText(),'Yeni')
    const before=await saved(page);await entry(page,'hamam').locator('summary').click();assert.equal(await entry(page,'hamam').getAttribute('open'),'');assert.deepEqual((await saved(page)).queue,before.queue)
    const action=await entry(page,'hamam').getByRole('button',{name:'Şehirde arsa seç',exact:true}).boundingBox(),viewport=await page.locator('.bp-scroll').boundingBox();assert.ok(action.y>=viewport.y&&action.y+action.height<=viewport.y+viewport.height,'expanded construction action is below fold')
    await page.screenshot({path:path.join(out,`choice-${width}.png`)})
    await entry(page,'carsi').locator('summary').click();assert.equal(await entry(page,'hamam').getAttribute('open'),null);await entry(page,'hamam').locator('summary').click();assert.equal(await entry(page,'carsi').getAttribute('open'),null)
    await entry(page,'hamam').getByRole('button',{name:'Şehirde arsa seç',exact:true}).click();await page.locator('.construction-placement').waitFor();await page.getByRole('button',{name:'Vazgeç',exact:true}).click();assert.equal(await page.locator('.construction-placement').count(),0);assert.deepEqual((await saved(page)).queue,before.queue)
    await catalogue(page);await entry(page,'hamam').locator('summary').click();await entry(page,'hamam').getByRole('button',{name:'Şehirde arsa seç',exact:true}).click();await page.locator('.construction-placement').waitFor();assert.deepEqual((await saved(page)).placement,before.placement);assert.deepEqual((await saved(page)).queue,before.queue)
    const plot=Number((await page.locator('nav[aria-label="Uygun arsalar"] button').last().innerText()).replace('Arsa ',''));await page.locator('nav[aria-label="Uygun arsalar"] button').last().evaluate(el=>el.click());await page.locator('.building-inspector').waitFor()
    assert.match(await page.locator('.building-inspector-header').textContent(),new RegExp(`Arsa ${plot}`));assert.deepEqual((await saved(page)).queue,before.queue)
    const bounds=await page.locator('.building-inspector').evaluate(el=>{for(const a of el.getAnimations({subtree:true}))if(Number.isFinite(a.effect?.getComputedTiming().iterations)){try{a.finish()}catch{/* unresolved effect */}}const r=el.getBoundingClientRect();return{left:r.left,right:r.right}});assert.ok(bounds.left>=0&&bounds.right<=width)
    const effects=page.locator('.building-inspector-effects');assert.equal(await effects.getAttribute('open'),null);await effects.locator('summary').click();assert.equal(await effects.locator('.building-effects').count(),1);await effects.locator('summary').click();assert.deepEqual((await saved(page)).queue,before.queue)
    await page.screenshot({path:path.join(out,`placement-${width}.png`)})
    await page.locator('.building-inspector .bp-upgrade-button').click();await page.clock.runFor(100);const built=await saved(page);assert.equal(built.placement.hamam,plot);assert.equal(built.queue.length,1);assert.equal(built.queue[0].id,'hamam');assert.ok(built.resources.wood<before.resources.wood);cases.push({name:'chosen plot and cost committed only on confirmation',width,plot})
    await catalogue(page);await page.getByRole('button',{name:'Kurulu',exact:true}).click();assert.equal(await entry(page,'hamam').count(),1);await entry(page,'hamam').locator('summary').click();assert.equal(await entry(page,'hamam').getByRole('button',{name:'Binaya git',exact:true}).count(),1)
    await page.getByRole('button',{name:'Tümü',exact:true}).click();await page.getByRole('searchbox',{name:'Yapı ara',exact:true}).fill('MEDRESE');assert.equal(await entry(page,'medrese').isVisible(),true);await entry(page,'medrese').locator('summary').click();assert.match(await entry(page,'medrese').innerText(),/gerekli|Yetersiz/);cases.push({name:'queued building is findable and Turkish search reaches locked detail',width})
   }
   await context.close()
  }
  if(!baseline){
   const rich=structuredClone(fixture);rich.cities[0].game.buildings.divan=10;rich.cities[0].game.resources={gold:8000,wood:8000,knowledge:800};rich.cities[0].game.luxury={mermer:8000,kristal:8000,kahve:8000,kukurt:8000}
   const coast=await open(390,rich);await coast.page.evaluate(()=>window.__payitahtQa.plot(26));await coast.page.locator('.construction-register').waitFor();await entry(coast.page,'liman').locator('summary').click();assert.equal(await entry(coast.page,'hamam').count(),0);const before=await saved(coast.page);await entry(coast.page,'liman').getByRole('button',{name:'Ticaret Limanı inşa et',exact:true}).click();await coast.page.clock.runFor(100);const after=await saved(coast.page);assert.equal(after.placement.liman,26);assert.equal(after.queue[0].id,'liman');assert.ok(after.resources.wood<before.resources.wood);cases.push({name:'sea plot only lists compatible buildings and commits selected shore'});await coast.context.close()
   const islet=await open(390,rich);await islet.page.evaluate(()=>window.__payitahtQa.plot(28));await islet.page.locator('.construction-blocked > summary').click();assert.deepEqual(await islet.page.locator('.construction-entry').evaluateAll(els=>els.map(el=>el.dataset.building)),['korsan_kalesi']);cases.push({name:'pirate islet excludes land and ordinary harbour buildings'});await islet.context.close()
   const exhausted=structuredClone(rich);for(const[id,plot]of[['liman',25],['tersane',26],['korsan_kalesi',27]]){exhausted.cities[0].game.buildings[id]=1;exhausted.cities[0].game.placement[id]=plot}
   const empty=await open(390,exhausted);await empty.page.evaluate(()=>window.__payitahtQa.plot(28));await empty.page.locator('.construction-register').waitFor();assert.equal(await empty.page.locator('.construction-entry').count(),0);assert.match(await empty.page.locator('.construction-empty').innerText(),/Kurulu yapılarını geliştirebilirsin/);cases.push({name:'exhausted islet explains the next step without nonexistent filters'});await empty.context.close()
   const full=structuredClone(fixture);full.cities[0].game.queue=['divan','konut','kereste'].map((id,i)=>({id,kind:'build',start:now+i*600000,end:now+(i+1)*600000}))
   const queue=await open(390,full);await queue.page.evaluate(()=>window.__payitahtQa.plot(7));await queue.page.locator('.construction-register').waitFor();assert.match(await queue.page.locator('.construction-overview').innerText(),/İnşaat sırası dolu/);await queue.page.locator('.construction-blocked > summary').click();await entry(queue.page,'hamam').locator('summary').click();assert.equal(await entry(queue.page,'hamam').getByRole('button',{name:'Hamam inşa et',exact:true}).isDisabled(),true);assert.equal((await saved(queue.page)).queue.length,3);cases.push({name:'full queue exposes reason without accepting another order'});await queue.context.close()
   const large=await open(360);await catalogue(large.page);await large.page.evaluate(()=>{const sizes=[...document.querySelectorAll('*')].map(el=>[el,parseFloat(getComputedStyle(el).fontSize)]);for(const[el,n]of sizes)if(n)el.style.fontSize=`${n*1.3}px`});assert.equal(await large.page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);await entry(large.page,'hamam').locator('summary').click();const b=await entry(large.page,'hamam').getByRole('button',{name:'Şehirde arsa seç',exact:true}).boundingBox();assert.ok(b.width>=44&&b.height>=44);await large.page.screenshot({path:path.join(out,'catalogue-large-360.png')});cases.push({name:'large text preserves action size and avoids horizontal overflow'});await large.context.close()
  }
  assert.deepEqual(errors,[]);assert.deepEqual(missing,[])
 }finally{await browser.close();await fs.writeFile(path.join(out,'report.json'),JSON.stringify({baseline,cases,errors,missing},null,2)+'\n')}
 console.log(`Construction clarity passed: ${cases.length} scenarios.`)
}
main().catch(e=>{console.error(e);process.exitCode=1})
