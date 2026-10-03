/** Real 390px render sizes, cold boots, small asset selection and lite density. */
const fs=require('node:fs/promises'),path=require('node:path')
const {chromium}=require('playwright')
const {qaOrigin,START_BUTTON}=require('../lib/qa.cjs')
const {reviewWebp}=require('../lib/review-webp.cjs')
async function main(){
 const out=path.resolve('visual-review/G4/revision/after');await fs.mkdir(out,{recursive:true})
 const browser=await chromium.launch({headless:true,args:['--no-sandbox']}),report={normal:[],lite:[],errors:[],missing:[]}
 try{for(const mode of ['normal','lite'])for(let sample=0;sample<3;sample++){
 const ctx=await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:1,isMobile:true,hasTouch:true,serviceWorkers:'block'})
 await ctx.addInitScript(mode=>{localStorage.setItem('payitaht-hafif',mode==='lite'?'acik':'kapali');localStorage.setItem('payitaht-rehber','goruldu');localStorage.setItem('payitaht-qa','1')},mode)
 const page=await ctx.newPage(),loads=[]
 page.on('pageerror',e=>report.errors.push(e.message));page.on('response',r=>{if(r.status()>=400&&/images\/game/.test(r.url()))report.missing.push(r.url());if(/\/decor\//.test(r.url()))loads.push(r.url())})
 await page.goto(qaOrigin(),{waitUntil:'domcontentloaded'});const start=Date.now();await page.getByRole('button',{name:START_BUTTON}).click();await page.waitForFunction(()=>Number(document.documentElement.dataset.cityReady)>0,null,{timeout:60000});await page.waitForTimeout(400)
 const bootMs=Date.now()-start,decor=await page.evaluate(()=>JSON.parse(document.documentElement.dataset.decorReview))
 const uniqueLoads=[...new Set(loads)]
 await page.evaluate(urls=>Promise.all(urls.map(url=>new Promise((resolve,reject)=>{const im=new Image();im.onload=resolve;im.onerror=()=>reject(new Error('Cannot decode '+url));im.src=url}))),uniqueLoads)
 if(uniqueLoads.length!==31||uniqueLoads.some(s=>!/-sm\.webp/.test(s)))throw new Error('Phone did not load all 31 small decor assets')
 if(!decor.trees.length||decor.trees.some(t=>t.height<44.9))throw new Error('Tree under 45 CSS pixels: '+JSON.stringify(decor))
 report[mode].push({bootMs,...decor,smallAssets:uniqueLoads.length})
 if(sample===0)await reviewWebp(await page.screenshot(),path.join(out,`city-${mode}-390x844.webp`));await ctx.close()
 }
 const normal=report.normal[0],lite=report.lite[0];if(normal.total!==lite.total||Math.abs(lite.visible-normal.visible/2)>5)throw new Error('Lite density not halved: '+JSON.stringify({normal:normal.visible,lite:lite.visible}))
 if(report.errors.length||report.missing.length)throw new Error(JSON.stringify(report));await fs.writeFile(path.join(out,'../performance.json'),JSON.stringify(report,null,2));console.log(JSON.stringify({normal:report.normal.map(r=>r.bootMs),lite:report.lite.map(r=>r.bootMs),decor:[normal.visible,lite.visible],treeMin:Math.min(...normal.trees.map(t=>t.height))}))
 }finally{await browser.close()}}
main().catch(e=>{console.error(e);process.exitCode=1})
