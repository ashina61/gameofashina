/* Compiled phone scene: coastal art, pier grounding, taps, live facing and departure. */
const fs=require('node:fs/promises'),path=require('node:path'),assert=require('node:assert/strict')
const {execFileSync}=require('node:child_process'),{chromium}=require('playwright')
const {skipGuide,seedSave,enterGame,qaOrigin}=require('./lib/qa.cjs')
async function main(){
 const baseline=process.env.QA_MARITIME_BASELINE==='1'
 const out=path.resolve(`visual-review/maritime-city/${baseline?'before':'after'}`)
 await fs.mkdir(out,{recursive:true})
 const now=Date.UTC(2026,10,18,12)
 const seed=JSON.parse(execFileSync(process.execPath,['--import','tsx','-e',`
  const {initialEmpire}=require('./lib/game/empire.ts');const {OBJECTIVES}=require('./lib/game/engine.ts');
  const e=initialEmpire(${now}),g=e.cities[0].game;
  g.buildings.divan=20;g.buildings.ambar=20;g.resources={gold:45000,wood:45000,knowledge:400};g.luxury={mermer:5000,kristal:5000,kahve:5000,kukurt:5000};g.claimed=OBJECTIVES.map(o=>o.id);
  g.buildings.liman=8;g.buildings.tersane=8;g.placement.liman=25;g.placement.tersane=26;g.coastFacing.liman='left';g.coastFacing.tersane='left';console.log(JSON.stringify(e));
 `],{maxBuffer:4*1024*1024}).toString())
 const browser=await chromium.launch({executablePath:process.env.QA_CHROME_PATH,args:['--no-sandbox','--enable-unsafe-swiftshader']})
 const errors=[],missing=[],cases=[]
 const configs=baseline?[[390,25,'left'],[390,26,'straight']]:[
  ...[25,26,27].flatMap(port=>['left','right','straight'].map(facing=>[390,port,facing])),
  [360,27,'right'],[430,25,'straight'],
 ]
 try{
  for(const [width,port,facing] of configs){
   const e=structuredClone(seed),g=e.cities[0].game,shipyard=port===25?26:port===26?27:25
   g.placement.liman=port;g.placement.tersane=shipyard;g.coastFacing.liman=facing;g.coastFacing.tersane=facing
   const context=await browser.newContext({viewport:{width,height:844},deviceScaleFactor:1,isMobile:true,hasTouch:true,serviceWorkers:'block'})
   await skipGuide(context);await seedSave(context,e);await context.addInitScript(()=>localStorage.setItem('payitaht-qa','1'))
   const page=await context.newPage(),loaded=[]
   page.on('pageerror',error=>errors.push(error.message));page.on('response',response=>{loaded.push(response.url());if(response.status()>=400)missing.push(response.url())})
   await page.clock.install({time:now});await page.goto(qaOrigin('MARITIME_CITY_QA_URL'));await enterGame(page)
   await page.clock.runFor(900);await page.waitForFunction(()=>document.documentElement.dataset.parcelReview&&window.__payitahtQa)
   const camera=async(index)=>{
    const x=index===25?950:index===26?2412:1250,y=1630,zoom=1.15
    await page.evaluate(detail=>document.dispatchEvent(new CustomEvent('payitaht-qa-camera',{detail})),{x,y,zoom});await page.clock.runFor(100)
    return {x,y,zoom}
   }
   for(const [id,index] of [['liman',port],['tersane',shipyard]]){
    const cam=await camera(index),name=facing==='straight'?id+'-duz':id
    const measurement=await page.evaluate(id=>JSON.parse(document.documentElement.dataset.parcelReview).find(p=>p.id===id),id)
    assert.ok(measurement,`${id} absent`)
    for(const q of measurement.outline)assert.ok(measurement.boundary.every((a,i)=>{const b=measurement.boundary[(i+1)%measurement.boundary.length];return (b.x-a.x)*(q.y-a.y)-(b.y-a.y)*(q.x-a.x)>=-1e-5}),`${id}: silhouette outside boundary`)
    await page.screenshot({path:path.join(out,`${id}-${index}-${facing}-${width}.png`)})
    if(!baseline){
     assert.ok(loaded.some(url=>url.includes(`/parcel-v9/${name}-sm.webp`)),`${name}: old art loaded`)
     const band=await page.evaluate(()=>({top:document.querySelector('.ika-top').getBoundingClientRect().bottom,bottom:document.querySelector('.ika-nav').getBoundingClientRect().top}))
     const shore=index===25?1591:index===26?1570:1505
     await page.mouse.click(width/2,(band.top+band.bottom)/2+(shore-cam.y)*cam.zoom)
     await page.clock.runFor(100);await page.locator(`.building-inspector[data-building="${id}"]`).waitFor()
     await page.evaluate(()=>window.__payitahtQa.close());await page.clock.runFor(100)
    }
   }
   if(!baseline){
    await camera(port)
    await page.evaluate(()=>window.dispatchEvent(new CustomEvent('payitaht-city-fx',{detail:'sail'})));await page.clock.runFor(250)
    const route=await page.evaluate(()=>JSON.parse(document.documentElement.dataset.parcelDeparture))
    assert.ok(Number.isFinite(route.start.x)&&Number.isFinite(route.start.y))
    await page.screenshot({path:path.join(out,`departure-${port}-${facing}-${width}.png`)})
   }
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false)
   cases.push({width,port,shipyard,facing,taps:!baseline});await context.close()
  }
  if(!baseline){
   // Rotate both kinds through left -> straight -> right -> left without reloading.
   const context=await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:1,serviceWorkers:'block'})
   await skipGuide(context);await seedSave(context,seed);await context.addInitScript(()=>localStorage.setItem('payitaht-qa','1'))
   const page=await context.newPage(),loaded=[];page.on('pageerror',error=>errors.push(error.message))
   page.on('response',response=>{loaded.push(response.url());if(response.status()>=400)missing.push(response.url())})
   await page.clock.install({time:now});await page.goto(qaOrigin('MARITIME_CITY_QA_URL'));await enterGame(page);await page.clock.runFor(900)
   await page.waitForFunction(()=>document.documentElement.dataset.parcelReview&&window.__payitahtQa)
   for(const id of ['liman','tersane']){
    await page.evaluate(id=>window.__payitahtQa.building(id),id);await page.clock.runFor(100)
    await page.getByRole('tab',{name:'Gelişim',exact:true}).click();await page.locator('.building-operations summary').click()
    for(const [label,expected] of [['Sol','straight'],['Düz','right'],['Sağ','left']]){
     await page.getByRole('button',{name:`Yön: ${label}`,exact:true}).click();await page.clock.runFor(250)
     const saved=await page.evaluate(id=>JSON.parse(localStorage.getItem('payitaht-adalari-v1')).cities[0].game.coastFacing[id],id)
     assert.equal(saved,expected)
    }
    await page.evaluate(()=>window.__payitahtQa.close());await page.clock.runFor(200)
    assert.ok(loaded.some(url=>url.includes(`/parcel-v9/${id}-duz-sm.webp`)),`${id}: live straight texture missing`)
    cases.push({liveFacing:id,cycle:'left -> straight -> right -> left'})
   }
   await context.close()
  }
  assert.deepEqual(errors,[]);assert.deepEqual(missing,[])
 }finally{await browser.close()}
 await fs.writeFile(path.join(out,'report.json'),JSON.stringify({baseline,cases,errors,missing},null,2))
 console.log(`Maritime city QA passed: ${cases.length} compiled scenarios (${baseline?'before':'after'}).`)
}
main().catch(error=>{console.error(error);process.exitCode=1})
