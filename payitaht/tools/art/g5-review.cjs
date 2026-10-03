/** G5 shortcut navigation and real activity cards, at phone size. */
const fs=require('node:fs/promises'),path=require('node:path'),assert=require('node:assert/strict')
const {chromium}=require('playwright'),{qaOrigin,START_BUTTON}=require('../lib/qa.cjs'),{reviewWebp}=require('../lib/review-webp.cjs')
async function main(){
 const phase=process.argv[2]||'after',out=path.resolve(`visual-review/G5/${phase}`);await fs.mkdir(out,{recursive:true})
 const e=JSON.parse(await fs.readFile('tools/fixtures/late-game.json','utf8'))
 const browser=await chromium.launch({headless:true,args:['--no-sandbox']})
 try{
 const ctx=await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:1,isMobile:true,hasTouch:true,serviceWorkers:'block'})
 await ctx.addInitScript(e=>{const now=Date.now();for(const c of e.cities)c.game.updatedAt=now;const g=e.cities[0].game;g.queue=[{id:'konut',kind:'build',start:now-60000,end:now+300000},{id:'ambar',kind:'build',start:now+300000,end:now+420000}];g.drills=[{id:'yeniceri',kind:'drill',count:3,start:now-60000,end:now+600000}];e.missions=[{id:'qa-mission',kind:'raid',cityId:e.activeCityId,npcId:'sahil-koy',units:{yeniceri:3},departAt:now-60000,arriveAt:now+600000,returnAt:now+1260000,resolved:false,loot:{gold:0,wood:0}}];e.threats=[];e.sieges=[];localStorage.setItem('payitaht-adalari-v1',JSON.stringify(e));localStorage.setItem('payitaht-rehber','goruldu');localStorage.setItem('payitaht-qa','1')},e)
 const page=await ctx.newPage(),errors=[],missing=[];page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400&&/images\/game/.test(r.url()))missing.push(r.url())})
 await page.goto(qaOrigin());await page.getByRole('button',{name:START_BUTTON}).click();await page.waitForFunction(()=>!!document.documentElement.dataset.cityReady);await page.evaluate(()=>window.__payitahtQa.close());await page.waitForTimeout(500)
 await reviewWebp(await page.screenshot(),path.join(out,'activity-390x844.webp'))
 if(phase==='after'){
 assert.equal(await page.locator('.city-shortcuts button').count(),4)
 assert.ok(await page.locator('.city-activity button').count()>=4)
 const threat=await page.locator('.threat-banner').boundingBox();if(threat){const first=await page.locator('.city-activity button').first().boundingBox();assert.ok(first.y>=threat.y+threat.height+4,'Threat banner covers first activity card')}
 for(const label of ['Çarşı ve tüccar','Üretim defterini aç']){await page.getByRole('button',{name:new RegExp(label)}).first().click();await page.waitForTimeout(200);assert.ok(await page.locator('.bp').count());await page.evaluate(()=>window.__payitahtQa.close())}
 for(const prefix of ['Günlük görevler ve ödül','Haftalık olay:','Elçi mektubu:','Raporlar:']){await page.getByRole('button',{name:new RegExp('^'+prefix)}).click();await page.waitForTimeout(200);assert.ok(await page.locator('.bp').count());await page.evaluate(()=>window.__payitahtQa.close())}
 const box=await page.locator('.map-top-tools').boundingBox();assert.ok(box.x<30&&box.y>600)
 const chips=await page.locator('.ika-chip').evaluateAll(chips=>chips.map(c=>({kind:c.dataset.k,icon:c.querySelector('img')?.getBoundingClientRect().width,buttons:[...c.querySelectorAll('button')].map(b=>({width:b.offsetWidth,height:b.offsetHeight}))})))
 assert.ok(chips.every(c=>c.icon>=24&&c.buttons.every(b=>b.width>=44&&b.height>=44)))
 await fs.writeFile(path.join(out,'../hud-report.json'),JSON.stringify({chips,shortcuts:4,activityCards:await page.locator('.city-activity button').count(),errors,missing},null,2))
 }
 if(errors.length||missing.length)throw Error(JSON.stringify({errors,missing}));console.log('HUD navigation, targets, card images and shortcuts passed')
 }finally{await browser.close()}
}
main().catch(e=>{console.error(e);process.exitCode=1})
