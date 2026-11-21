/* Real building management: action visibility, disclosure and unchanged commands. */
const fs=require('node:fs/promises'),path=require('node:path'),assert=require('node:assert/strict')
const {execFileSync}=require('node:child_process'),{chromium}=require('playwright')
const {skipGuide,seedSave,enterGame,qaOrigin}=require('./lib/qa.cjs')
async function main(){
 const baseline=process.env.QA_MANAGEMENT_BASELINE==='1',out=path.resolve(`visual-review/management-clarity/${baseline?'before':'after'}`);await fs.mkdir(out,{recursive:true})
 const now=Date.UTC(2026,10,21,12),seed=JSON.parse(execFileSync(process.execPath,['--import','tsx','-e',`
 const {initialEmpire}=require('./lib/game/empire.ts'),{OBJECTIVES,freePlotsFor}=require('./lib/game/engine.ts');const e=initialEmpire(${now}),g=e.cities[0].game;
 for(const [id,level] of [['divan',10],['konut',10],['hamam',8],['medrese',3],['kisla',3],['kereste',3],['ormanci',3],['tasci',3],['bagci',3],['ambar',10]]){if(g.placement[id]==null)g.placement[id]=freePlotsFor(g,id)[0];g.buildings[id]=level}
 g.resources={gold:8000,wood:8000,knowledge:400};g.luxury={mermer:3000,kristal:1000,kahve:1000,kukurt:1000};g.claimed=OBJECTIVES.map(o=>o.id);g.citizens=500;g.workers={kereste:20,medrese:10,carsi:0};
 g.drills=[{id:'mizrakci',kind:'drill',count:2,start:${now},end:${now+600000}},{id:'okcu',kind:'drill',count:1,start:${now+600000},end:${now+1200000}}];console.log(JSON.stringify(e))
 `]).toString())
 const queueLimit=Number(execFileSync(process.execPath,['--import','tsx','-e',"console.log(require('./lib/game/engine.ts').DRILL_QUEUE_LIMIT)"]).toString())
 const browser=await chromium.launch({executablePath:process.env.QA_CHROME_PATH,args:['--no-sandbox','--enable-unsafe-swiftshader']}),errors=[],missing=[],cases=[];let current
 const saved=page=>page.evaluate(()=>JSON.parse(localStorage.getItem('payitaht-adalari-v1')).cities[0].game)
 async function open(width,fixture=seed){
  const context=await browser.newContext({viewport:{width,height:844},deviceScaleFactor:1,isMobile:true,hasTouch:true,serviceWorkers:'block'})
  await skipGuide(context);await seedSave(context,fixture);await context.addInitScript(()=>localStorage.setItem('payitaht-qa','1'))
  const page=await context.newPage();current=page;page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400)missing.push(r.url())})
  await page.clock.install({time:now});await page.goto(qaOrigin('MANAGEMENT_QA_URL'));await enterGame(page);await page.clock.runFor(900);await page.waitForFunction(()=>document.documentElement.dataset.cityReady&&window.__payitahtQa);return{context,page}
 }
 async function building(page,id){await page.evaluate(id=>window.__payitahtQa.building(id),id);await page.clock.runFor(100);if(await page.locator('.building-inspector-details').isVisible())await page.locator('.building-inspector-details').click();await page.locator(`.bp-of-${id}`).waitFor();await page.clock.runFor(500)}
 const measure=(page,selector)=>page.evaluate(selector=>{const bp=document.querySelector('.bp');for(const animation of bp.getAnimations({subtree:true})){if(Number.isFinite(animation.effect?.getComputedTiming().iterations)){try{animation.finish()}catch{/* The effect may not have a resolved end time yet. */}}}const scroll=bp.querySelector('.bp-scroll'),action=document.querySelector(selector),r=action?.getBoundingClientRect(),b=scroll.getBoundingClientRect();return{pageHeight:b.height,scrollHeight:scroll.scrollHeight,primaryY:r?.top,primaryBottom:r?.bottom,visible:!!r&&r.top>=b.top&&r.bottom<=b.bottom,overflow:document.documentElement.scrollWidth>innerWidth}},selector)
 try{
  for(const width of baseline?[390]:[360,390,430]){
   const {context,page}=await open(width)
   for(const [id,selector] of [['kisla','[data-guide="recruit-yeniceri"]'],['medrese','input[aria-label="Âlim sayısı"]'],['kereste','input[aria-label="Oduncu sayısı"]'],['research','[data-guide="research"]']]){
    if(id==='research'){await page.evaluate(()=>window.__payitahtQa.panel('research'));await page.clock.runFor(500)}else await building(page,id)
    const metrics=await measure(page,selector);await page.screenshot({path:path.join(out,`${id}-${width}.png`)});cases.push({id,width,...metrics})
    if(!baseline){
     assert.equal(metrics.overflow,false);assert.equal(metrics.visible,true,`${id}: primary action below fold`)
     if(id==='kisla'){
      const before=(await saved(page)).drills
      const queue=page.locator('.training-queue-disclosure');assert.equal(await queue.getAttribute('open'),null)
      await queue.locator('summary').first().click();assert.equal(await queue.locator('.drill-job').count(),2)
      assert.match(await queue.innerText(),/Mızrakçı/);await queue.locator('summary').first().click();assert.deepEqual((await saved(page)).drills,before)
      const action=await page.locator(selector).boundingBox(),info=await page.locator('.barracks-unit-information > summary').boundingBox();assert.ok(info.y>action.y,'battle details precede training')
      await page.locator('#barracks-count-yeniceri').fill('2');await page.locator(selector).click();await page.clock.runFor(100)
      const g=await saved(page);assert.equal(g.drills.length,3);assert.equal(g.drills.at(-1).id,'yeniceri');assert.equal(g.drills.at(-1).count,2)
      for(let n=g.drills.length;n<queueLimit;n++){await page.locator(selector).click();await page.clock.runFor(100)}
      assert.equal((await saved(page)).drills.length,queueLimit);assert.equal(await page.locator(selector).isDisabled(),true);assert.equal(g.army.yeniceri,0);cases.push({width,command:'training adds a real queued order and keeps limit'})
     }
     if(id==='medrese'||id==='kereste'){
      const key=id==='medrese'?'medrese':'kereste',before=(await saved(page)).workers[key],slider=page.locator('.workforce')
      await slider.getByRole('button',{name:'Bir artır',exact:true}).click();assert.equal((await saved(page)).workers[key],before)
      await slider.getByRole('button',{name:'Geri al',exact:true}).click();assert.equal((await saved(page)).workers[key],before)
      await slider.getByRole('button',{name:'Bir artır',exact:true}).click();await slider.getByRole('button',{name:'Onayla',exact:true}).click();await page.clock.runFor(100);assert.equal((await saved(page)).workers[key],before+1)
      if(id==='kereste'){
       const account=page.locator('.production-account');assert.equal(await account.getAttribute('open'),null);await account.locator('summary').click();assert.ok(await account.locator('.production-facts > div').count()>=5)
      }
      await page.getByRole('tab',{name:'Gelişim',exact:true}).click();await page.clock.runFor(100)
      const first=await page.locator('.bp-tabpanel:not([hidden])').evaluate(el=>{const dock=el.querySelector('.bp-dock'),banner=el.querySelector('.academy-banner');return !!dock&&!!banner&&!!(dock.compareDocumentPosition(banner)&Node.DOCUMENT_POSITION_FOLLOWING)})
      assert.equal(first,true,'Development starts with upgrade, before context painting');cases.push({width,command:`${key} draft, reset, commit and Development order`})
     }
     if(id==='research'){
      const before=await saved(page),effect=await page.locator('.rs-effect').boundingBox(),action=await page.locator(selector).boundingBox();assert.ok(effect.y<action.y)
      const account=page.locator('.research-account');assert.equal(await account.getAttribute('open'),null);await account.locator('summary').click();assert.equal(await account.locator('.rs-stats > span').count(),4);assert.equal((await saved(page)).study,null)
      await page.locator(selector).click();await page.clock.runFor(100);const g=await saved(page);assert.ok(g.study);assert.ok(g.resources.knowledge<before.resources.knowledge);assert.equal(await page.locator(selector).isDisabled(),true)
      const locked=page.locator('.rs-scroll:not([inert]) .rs-list li.is-locked button').last();await locked.click();await page.clock.runFor(500);assert.equal(await page.locator(selector).isDisabled(),true)
      assert.equal(await page.locator('.rs-detail .fine-print').isVisible(),true);const title=await page.locator('.rs-detail h3').boundingBox(),viewport=await page.locator('.bp-scroll').boundingBox();assert.ok(title.y>=viewport.y&&title.y<viewport.y+viewport.height,'selected research is not brought into view');cases.push({width,command:'research consumes knowledge, starts study and preserves locks'})
     }
    }
    await page.evaluate(()=>window.__payitahtQa.close());await page.clock.runFor(150)
   }
   await context.close()
  }
  if(!baseline){
   for(const id of ['kisla','research','kereste']){
    const {context,page}=await open(390);if(id==='research'){await page.evaluate(()=>window.__payitahtQa.panel('research'));await page.clock.runFor(500)}else await building(page,id)
    await page.evaluate(()=>{const els=[...document.body.querySelectorAll('*')],sizes=els.map(el=>parseFloat(getComputedStyle(el).fontSize));els.forEach((el,i)=>el.style.setProperty('font-size',sizes[i]*1.3+'px','important'))})
    await page.clock.runFor(300);const action=page.locator(id==='kisla'?'[data-guide="recruit-yeniceri"]':id==='research'?'[data-guide="research"]':'input[aria-label="Oduncu sayısı"]')
    await action.scrollIntoViewIfNeeded();const r=await action.boundingBox();assert.ok(r.width>=44&&r.height>=44);assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false)
    await page.screenshot({path:path.join(out,`${id}-130.png`)});cases.push({largeText:id,reachable:true});await context.close()
   }
   const full=structuredClone(seed);full.cities[0].game.resources.wood=99999999
   const store=await open(390,full);await building(store.page,'kereste');assert.match(await store.page.locator('.production-alert').innerText(),/Stok dolu/);cases.push('full warehouse warning remains outside accounting');await store.context.close()
   const wrong=await open(390);await building(wrong.page,'bagci');assert.match(await wrong.page.locator('.production-alert').innerText(),/burada bu malın üretimi yoktur/);assert.equal(await wrong.page.locator('.production-account').getAttribute('open'),null);cases.push('wrong island warning remains outside accounting');await wrong.context.close()
  }
  assert.deepEqual(errors,[]);assert.deepEqual(missing,[])
 }catch(error){if(current)await current.screenshot({path:path.join(out,'failure.png')}).catch(()=>{});console.error({errors,missing});throw error}finally{await browser.close()}
 await fs.writeFile(path.join(out,'report.json'),JSON.stringify({baseline,cases,errors,missing},null,2));console.log(`Management clarity passed: ${cases.length} scenarios.`)
}
main().catch(error=>{console.error(error);process.exitCode=1})
