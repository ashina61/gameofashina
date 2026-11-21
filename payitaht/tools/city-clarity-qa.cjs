/* Clutter regression: same compiled scene/camera before and after. */
const fs=require('node:fs/promises'),path=require('node:path'),assert=require('node:assert/strict')
const {execFileSync}=require('node:child_process'),{chromium}=require('playwright')
const {skipGuide,seedSave,enterGame,qaOrigin}=require('./lib/qa.cjs')
async function main(){
 const baseline=process.env.QA_CLARITY_BASELINE==='1',out=path.resolve(`visual-review/city-clarity/${baseline?'before':'after'}`);await fs.mkdir(out,{recursive:true})
 const now=Date.UTC(2026,10,21,10),seed=JSON.parse(execFileSync(process.execPath,['--import','tsx','-e',`
 const {initialEmpire}=require('./lib/game/empire.ts'),{OBJECTIVES}=require('./lib/game/engine.ts');const e=initialEmpire(${now}),g=e.cities[0].game;
 for(const [id,level,plot] of [['divan',15,0],['konut',10,6],['hamam',8,5],['medrese',3,2],['carsi',3,1],['kisla',3,3],['kereste',3,4],['ambar',20,8],['liman',2,25],['tersane',2,26]]){g.buildings[id]=level;g.placement[id]=plot}
 g.resources={gold:45000,wood:45000,knowledge:400};g.luxury={mermer:5000,kristal:5000,kahve:5000,kukurt:5000};g.claimed=OBJECTIVES.map(o=>o.id);g.citizens=500;g.workers={kereste:20,medrese:40,carsi:40};g.army.nakliye=3;g.army.kadirga=2;
 g.queue=[{id:'ambar',kind:'build',start:${now},end:${now+600000}}];g.drills=[{id:'mizrakci',kind:'drill',count:5,start:${now},end:${now+1200000}}];console.log(JSON.stringify(e))
 `]).toString())
 const browser=await chromium.launch({executablePath:process.env.QA_CHROME_PATH,args:['--no-sandbox','--enable-unsafe-swiftshader']}),errors=[],missing=[],cases=[]
 let currentPage
 const measure=page=>page.evaluate(()=>{const top=document.querySelector('.ika-top').getBoundingClientRect(),nav=document.querySelector('.ika-nav').getBoundingClientRect();return {header:top.height,cityBand:nav.top-top.bottom,width:innerWidth,overflow:document.documentElement.scrollWidth>innerWidth}})
 async function open(width,height=844,fresh=false,fixture=seed){
  const context=await browser.newContext({viewport:{width,height},deviceScaleFactor:1,isMobile:true,hasTouch:true,serviceWorkers:'block'})
  await skipGuide(context);if(!fresh)await seedSave(context,fixture);await context.addInitScript(()=>{localStorage.setItem('payitaht-qa','1');localStorage.setItem('payitaht-hafif','kapali')})
  const page=await context.newPage();currentPage=page;page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400)missing.push(r.url())})
  await page.clock.install({time:now});await page.goto(qaOrigin('CITY_CLARITY_QA_URL'));await enterGame(page);await page.clock.runFor(1000)
  await page.waitForFunction(()=>document.documentElement.dataset.cityReady&&window.__payitahtQa)
  await page.evaluate(detail=>document.dispatchEvent(new CustomEvent('payitaht-qa-camera',{detail})),{x:1630,y:950,zoom:.7});await page.clock.runFor(100)
  return {context,page}
 }
 try{
  for(const [width,height] of baseline?[[390,844]]:[[360,740],[390,844],[430,932]]){
   const {context,page}=await open(width,height),closed=await measure(page);await page.screenshot({path:path.join(out,`city-${width}.png`)})
   if(!baseline){
    const camera=await page.evaluate(()=>JSON.parse(document.documentElement.dataset.parcelCamera));
    assert.equal(closed.header,106);assert.equal(closed.overflow,false);assert.equal(await page.locator('.ika-chip:visible').count(),4)
    assert.equal(await page.locator('.city-shortcuts button:visible').count(),0);assert.equal(await page.locator('.city-activity:visible').count(),0)
    await page.getByRole('button',{name:'Kaynak ayrıntılarını aç',exact:true}).click();await page.clock.runFor(200)
    assert.equal(await page.locator('.ika-chip:visible').count(),6);assert.equal((await measure(page)).header,208);for(const [key,value] of Object.entries(await page.evaluate(()=>JSON.parse(document.documentElement.dataset.parcelCamera))))assert.ok(Math.abs(value-camera[key])<1e-6,`resource disclosure changed camera ${key}`)
    await page.screenshot({path:path.join(out,`resources-${width}.png`)})
    await page.keyboard.press('Escape');await page.clock.runFor(150);assert.equal(await page.getByRole('button',{name:'Kaynak ayrıntılarını aç'}).getAttribute('aria-expanded'),'false')
    await page.getByRole('button',{name:'Kaynak ayrıntılarını aç'}).click();await page.clock.runFor(100);await page.goBack();await page.clock.runFor(150);assert.equal(await page.locator('.ika-chip:visible').count(),4)
    await page.getByRole('button',{name:/^Gündem/}).click();assert.equal(await page.locator('.city-shortcuts button:visible').count(),4)
    assert.equal(await page.locator('.city-activity > button:visible').count(),2);await page.screenshot({path:path.join(out,`agenda-${width}.png`)})
    await page.keyboard.press('Escape');await page.clock.runFor(150);assert.equal(await page.locator('.city-agenda-content').count(),0)
    await page.getByRole('button',{name:/^Gündem/}).click();await page.goBack();await page.clock.runFor(150);assert.equal(await page.locator('.city-agenda-content').count(),0);assert.equal(new URL(page.url()).origin,new URL(qaOrigin('CITY_CLARITY_QA_URL')).origin,'back left the game')
    await page.getByRole('button',{name:/^Gündem/}).click();await page.getByRole('button',{name:/^Raporlar:/}).click();await page.clock.runFor(100)
    assert.equal(await page.locator('.city-agenda-content:visible').count(),0)
    await page.evaluate(()=>window.__payitahtQa.close());await page.clock.runFor(200)
    await page.getByRole('button',{name:'Kaynak ayrıntılarını aç'}).click();await page.getByRole('button',{name:/^Nüfus:.*Üretim defterini aç/}).click();await page.clock.runFor(100)
    assert.equal(await page.locator('.resources-expanded').count(),0);assert.equal((await measure(page)).header,106)
    await page.evaluate(()=>window.__payitahtQa.close());await page.clock.runFor(100)
    await page.getByRole('button',{name:/^Gündem/}).click();await page.getByRole('button',{name:'Ada',exact:true}).click();await page.clock.runFor(150);assert.equal(await page.locator('.city-agenda:visible').count(),0)
    await page.getByRole('button',{name:'Şehir',exact:true}).click();await page.clock.runFor(150);assert.equal(await page.locator('.city-agenda-content:visible').count(),0)
    // Large text mirrors the project's layout QA without overriding CSS layout.
    await page.evaluate(()=>{const els=[...document.body.querySelectorAll('*')],sizes=els.map(el=>parseFloat(getComputedStyle(el).fontSize));els.forEach((el,i)=>{if(sizes[i]>0)el.style.setProperty('font-size',sizes[i]*1.3+'px','important')})})
    await page.clock.runFor(300);assert.equal((await measure(page)).overflow,false)
    await page.getByRole('button',{name:'Kaynak ayrıntılarını aç'}).click();await page.clock.runFor(200)
    assert.equal(await page.locator('.ika-chip:visible').count(),6);await page.screenshot({path:path.join(out,`large-text-${width}.png`)})
    await page.keyboard.press('Escape')
   }
   cases.push({width,height,...closed});await context.close()
  }
  if(!baseline){const {page,context}=await open(360,740,true);assert.equal(await page.locator('.guide-arrow:visible').count()>0,true);await page.screenshot({path:path.join(out,'new-player.png')});cases.push('first-player guide remains visible');await context.close()}
  if(!baseline){
   const danger=structuredClone(seed);danger.sieges=[{id:'qa-blockade',kind:'blockade',cityId:danger.activeCityId,rivalId:'r-sarp',level:2,since:now,tick:now,troops:{kadirga:8}}]
   const alert=await open(360,740,false,danger);assert.ok(await alert.page.locator('.threat-banner:visible').count()>0);assert.equal(await alert.page.locator('.city-agenda:visible').count(),0);await alert.page.screenshot({path:path.join(out,'danger.png')});cases.push('danger retains priority');await alert.context.close()
  }
  assert.deepEqual(errors,[]);assert.deepEqual(missing,[])
 }catch(error){if(currentPage){await currentPage.screenshot({path:path.join(out,'failure.png')}).catch(()=>{});console.error(JSON.stringify({errors,missing,url:currentPage.url(),text:await currentPage.locator('body').innerText().catch(()=>''),history:await currentPage.evaluate(()=>({length:history.length,state:history.state})).catch(()=>null)}))}throw error}finally{await browser.close()}
 await fs.writeFile(path.join(out,'report.json'),JSON.stringify({baseline,cases,errors,missing},null,2));console.log(`City clarity QA passed: ${cases.length} scenarios.`)
}
main().catch(error=>{console.error(error);process.exitCode=1})
