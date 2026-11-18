/* Real compiled scene: economy sprites, wall tiers, coastal orientations and departure. */
const assert=require('node:assert/strict'),fs=require('node:fs/promises'),path=require('node:path')
const {execFileSync}=require('node:child_process'),{chromium}=require('playwright')
const {skipGuide,seedSave,enterGame,qaOrigin}=require('./lib/qa.cjs')
async function main(){
 const baseline=process.env.QA_ART_BASELINE==='1'
 const out=path.resolve(`visual-review/economy-city/${baseline?'before':'after'}`)
 await fs.mkdir(out,{recursive:true})
 const now=Date.UTC(2026,10,18,12)
 const seed=JSON.parse(execFileSync(process.execPath,['--import','tsx','-e',`
  const {initialEmpire}=require('./lib/game/empire.ts');const {OBJECTIVES}=require('./lib/game/engine.ts');
  const e=initialEmpire(${now}),g=e.cities[0].game;
  for(const id of Object.keys(g.buildings)){g.buildings[id]=0;g.placement[id]=null;}
  const ids=['divan','medrese','konut','ambar','kereste','kahvehane','carsi','elcilik','hamam','depo','marangoz','mimar','ormanci','saray','tophane','tasci','bagci','camci','simyahane','mahzen','gozlukcu','barutane','ticaret_merkezi','harita_arsivi','valilik'];
  ids.forEach((id,i)=>{g.buildings[id]=id==='divan'?20:8;g.placement[id]=i;});
  for(const [id,i] of [['liman',25],['tersane',26],['korsan_kalesi',28]]){g.buildings[id]=8;g.placement[id]=i;}
  g.buildings.surlar=12;g.resources={gold:45000,wood:45000,knowledge:400};g.luxury={mermer:5000,kristal:5000,kahve:5000,kukurt:5000};g.claimed=OBJECTIVES.map(o=>o.id);
  console.log(JSON.stringify(e));
 `],{maxBuffer:4*1024*1024}).toString())
 const browser=await chromium.launch({executablePath:process.env.QA_CHROME_PATH,args:['--no-sandbox','--enable-unsafe-swiftshader']})
 const errors=[],missing=[],cases=[]
 const open=async(width=390,port=25,facing='left',wallLevel=12)=>{
  const e=structuredClone(seed),g=e.cities[0].game
  g.placement.liman=port;g.placement.tersane=port===26?25:26;g.coastFacing.liman=facing;g.coastFacing.tersane=facing;g.buildings.surlar=wallLevel
  const context=await browser.newContext({viewport:{width,height:844},deviceScaleFactor:1,isMobile:true,hasTouch:true,serviceWorkers:'block'})
  await skipGuide(context);await seedSave(context,e)
  await context.addInitScript(()=>localStorage.setItem('payitaht-qa','1'))
  const page=await context.newPage(),loaded=[]
  page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{loaded.push(r.url());if(r.status()>=400)missing.push(r.url())})
  await page.clock.install({time:now});await page.goto(qaOrigin('ECONOMY_CITY_QA_URL'));await enterGame(page)
  await page.clock.runFor(900)
  await page.waitForFunction(()=>document.documentElement.dataset.parcelReview&&window.__payitahtQa)
  const camera=async(x,y,zoom)=>{
   await page.evaluate(detail=>document.dispatchEvent(new CustomEvent('payitaht-qa-camera',{detail})),{x,y,zoom})
   await page.clock.runFor(100)
  }
  return {page,context,camera,loaded}
 }
 try{
  for(const width of baseline?[390]:[360,390,430]){
   const {page,context,camera,loaded}=await open(width)
   await page.screenshot({path:path.join(out,`city-${width}.png`)})
   if(!baseline)for(const id of ['ambar','kereste']){
    assert.ok(loaded.some(url=>url.includes(`/parcel-v8/${id}-sm.webp`)),`${id}: new sprite not loaded`)
    const p=await page.evaluate(id=>JSON.parse(document.documentElement.dataset.parcelReview).find(p=>p.id===id),id)
    for(const q of p.outline)assert.ok(p.boundary.every((a,i)=>{const b=p.boundary[(i+1)%p.boundary.length];return (b.x-a.x)*(q.y-a.y)-(b.y-a.y)*(q.x-a.x)>=-1e-5}),`${id}: visible alpha outside parcel`)
   }
   for(const [id,x,y] of [['ambar',1306,1050],['kereste',1910,1092]]){
    await camera(x,y,1.15)
    await page.screenshot({path:path.join(out,`${id}-${width}.png`)})
    if(!baseline){
     const band=await page.evaluate(()=>({top:document.querySelector('.ika-top').getBoundingClientRect().bottom,bottom:document.querySelector('.ika-nav').getBoundingClientRect().top}))
     await page.mouse.click(width/2,(band.top+band.bottom)/2)
     await page.clock.runFor(150)
     await page.locator(`.building-inspector[data-building="${id}"]`).waitFor()
     await page.evaluate(()=>window.__payitahtQa.close());await page.clock.runFor(150)
    }
   }
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false)
   cases.push({width,city:true,economySprites:!baseline,taps:!baseline})
   await context.close()
  }
  for(const level of baseline?[12]:[1,5,12,20]){
   const {page,context,camera}=await open(390,25,'left',level)
   await camera(1398,260,1.4)
   await page.screenshot({path:path.join(out,`wall-${level}.png`)})
   cases.push({wallLevel:level,rendered:true});await context.close()
  }
  if(!baseline)for(const port of [25,26,27])for(const facing of ['left','right','straight']){
   const {page,context,camera}=await open(390,port,facing)
   const x=port===25?950:port===26?2412:1250
   await camera(x,1750,1.25)
   await page.evaluate(()=>window.dispatchEvent(new CustomEvent('payitaht-city-fx',{detail:'sail'})))
   await page.clock.runFor(180)
   const route=await page.evaluate(()=>JSON.parse(document.documentElement.dataset.parcelDeparture))
   const pier=await page.evaluate(()=>JSON.parse(document.documentElement.dataset.parcelReview).find(p=>p.id==='liman'))
   const tipY=Math.max(...pier.outline.map(q=>q.y)),tip=pier.outline.filter(q=>q.y>=tipY-10)
   assert.ok(Math.abs(route.start.x-tip.reduce((sum,q)=>sum+q.x,0)/tip.length)<.01,'departure did not follow the actual pier tip')
   assert.ok(route.start.y>Math.max(...pier.outline.map(q=>q.y))+12,'ship overlaps the end of the pier')
   await page.screenshot({path:path.join(out,`coast-${port}-${facing}.png`)})
   cases.push({port,facing,departure:route});await context.close()
  }
  assert.deepEqual(errors,[]);assert.deepEqual(missing,[])
 }finally{await browser.close()}
 await fs.writeFile(path.join(out,'report.json'),JSON.stringify({baseline,cases,errors,missing},null,2))
 console.log(`Economy/city QA passed: ${cases.length} compiled scenarios (${baseline?'before':'after'}).`)
}
main().catch(error=>{console.error(error);process.exitCode=1})
