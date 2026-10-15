/** Actual exported main game: three phone widths, flipped art, ground coverage,
 * pointer selection and a new building completing after initial texture load. */
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict')
require('tsx/cjs')
const {chromium}=require('playwright'),sharp=require('sharp')
const {initialEmpire}=require('../lib/game/empire.ts')
const {skipGuide,START_BUTTON,seedSave}=require('./lib/qa.cjs')
const root=path.resolve(__dirname,'..'),out=path.join(root,'docs/mockups/five-buildings/browser')
const ids=['kisla','medrese','depo','carsi','hamam'],positions={kisla:1,medrese:12,depo:8,carsi:4,hamam:9}
const mime={'.html':'text/html','.js':'application/javascript','.css':'text/css','.webp':'image/webp','.json':'application/json','.woff2':'font/woff2'}
const server=http.createServer((req,res)=>{let u=new URL(req.url,'http://localhost').pathname.replace(/^\/gameofashina(?=\/|$)/,''),p=path.join(root,'out',u==='/'?'index.html':u);if(!fs.existsSync(p)&&fs.existsSync(p+'.html'))p+='.html';try{res.setHeader('Content-Type',mime[path.extname(p)]||'application/octet-stream');res.end(fs.readFileSync(p))}catch{res.statusCode=404;res.end('missing')}})
const report={errors:[],missing:[],cases:[]};let browser
async function check(p,name){
 const d=await p.evaluate(()=>JSON.parse(document.documentElement.dataset.masterContainment))
 assert.equal(d.violations.length,0,name+': outside parcel')
 for(const id of ids){assert(d.measured.some(x=>x.id===id&&x.role==='art'&&x.complete),name+': missing '+id);assert(d.measured.some(x=>x.id===id&&x.role==='courtyard'&&x.fullyCovers),name+': ground '+id)}
 report.cases.push({name,violations:0,buildings:ids,fullCourtyards:5})
}
async function frame(p,width){
 for(let n=0;n<8;n++){const z=await p.evaluate(()=>JSON.parse(document.documentElement.dataset.masterCamera).zoom);if(z>=0.32)break;await p.mouse.move(width/2,440);await p.mouse.wheel(0,-120);await p.waitForTimeout(70)}
 for(let n=0;n<20;n++){
  const delta=await p.evaluate(({width,ids})=>{const cam=JSON.parse(document.documentElement.dataset.masterCamera),a=JSON.parse(document.documentElement.dataset.masterContainment).measured.filter(x=>x.role==='art'&&ids.includes(x.id)),cv=document.querySelector('canvas'),r=cv.getBoundingClientRect(),x=a.reduce((v,b)=>v+b.x,0)/a.length,y=a.reduce((v,b)=>v+b.y,0)/a.length;return{x:width/2-(r.left+(x-cam.viewX)*cam.zoom*r.width/cv.width),y:430-(r.top+(y-cam.viewY)*cam.zoom*r.height/cv.height)}},{width,ids})
  if(Math.abs(delta.x)<5&&Math.abs(delta.y)<5)break
  await p.mouse.move(width/2,430);await p.mouse.down();await p.mouse.move(width/2+Math.max(-90,Math.min(90,delta.x)),430+Math.max(-90,Math.min(90,delta.y)),{steps:8});await p.mouse.up();
  // A fresh press on the northern forest stops the normal pan inertia before
  // measuring the next camera position, just as a player stops a moving map.
  await p.mouse.click(width/2,115);await p.keyboard.press('Escape');await p.waitForTimeout(100)
 }
}
;(async()=>{
 fs.mkdirSync(out,{recursive:true});await new Promise(r=>server.listen(4189,'127.0.0.1',r))
 browser=await chromium.launch({executablePath:process.env.QA_CHROME_PATH,headless:true,args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']})
 for(const [i,width] of (process.env.CONSTRUCTION_ONLY ? [] : [360,390,430]).entries()){
  const seed=initialEmpire(Date.now()),g=seed.cities[0].game;for(const id of Object.keys(g.buildings)){g.buildings[id]=0;g.placement[id]=null}g.buildings.divan=20;g.placement.divan=0
  for(const [id,plot] of Object.entries(positions)){g.buildings[id]=[1,8,20][i];g.placement[id]=plot}
  g.flips=i===1?ids:[]
  const c=await browser.newContext({viewport:{width,height:844},deviceScaleFactor:2,isMobile:true,hasTouch:true,serviceWorkers:'block'})
  await skipGuide(c);await seedSave(c,seed);await c.addInitScript(()=>localStorage.setItem('payitaht-qa','1'))
  const p=await c.newPage();p.on('pageerror',e=>report.errors.push(e.message));p.on('response',r=>{if(r.status()>=400)report.missing.push(r.status()+' '+r.url())})
  await p.goto('http://127.0.0.1:4189/gameofashina/');await p.getByRole('button',{name:START_BUTTON}).click();await p.waitForFunction(()=>document.documentElement.dataset.masterContainment,{timeout:60000})
  await check(p,'phone '+width+(i===1?' / flipped':''));await frame(p,width)
  await sharp(await p.screenshot()).webp({quality:90}).toFile(path.join(out,`main-${width}.webp`))
  const point=await p.evaluate(()=>{const cam=JSON.parse(document.documentElement.dataset.masterCamera),b=JSON.parse(document.documentElement.dataset.masterContainment).measured.find(x=>x.id==='kisla'&&x.role==='art'),cv=document.querySelector('canvas'),r=cv.getBoundingClientRect(),poly=b.kerbPolygon,x=poly.reduce((s,q)=>s+q.x,0)/poly.length,y=poly.reduce((s,q)=>s+q.y,0)/poly.length;return{x:r.left+(x-cam.viewX)*cam.zoom*r.width/cv.width,y:r.top+(y-cam.viewY)*cam.zoom*r.height/cv.height}})
  assert(point.x>0&&point.x<width&&point.y>100&&point.y<750,'barracks tap target outside playable viewport: '+JSON.stringify(point))
  await p.mouse.click(point.x,point.y);await p.locator('.building-inspector').waitFor({timeout:5000});assert.match(await p.locator('#building-inspector-title').innerText(),/Kışla/)
  await p.getByRole('button',{name:'Binayı kapat',exact:true}).click();report.cases.at(-1).barracksTap=true
  await c.close()
 }
 // Level zero is not preloaded: completing this queue must load master-v8.
 const seed=initialEmpire(Date.now()),g=seed.cities[0].game;for(const id of Object.keys(g.buildings)){g.buildings[id]=0;g.placement[id]=null}g.buildings.divan=20;g.placement.divan=0;g.placement.kisla=1;g.queue=[{id:'kisla',kind:'build',start:Date.now()-1000,end:Date.now()+6000}]
 const c=await browser.newContext({viewport:{width:390,height:844},serviceWorkers:'block'});await skipGuide(c);await seedSave(c,seed);await c.addInitScript(()=>localStorage.setItem('payitaht-qa','1'));const p=await c.newPage();const loaded=[];p.on('request',r=>{if(r.url().includes('master-v8/kisla'))loaded.push(r.url())});await p.goto('http://127.0.0.1:4189/gameofashina/');await p.getByRole('button',{name:START_BUTTON}).click();await p.waitForFunction(()=>{const d=document.documentElement.dataset.masterContainment;return d&&JSON.parse(d).measured.some(x=>x.id==='kisla'&&x.role==='art'&&x.complete)},{},{timeout:15000}).catch(async e=>{console.error(await p.evaluate(()=>({save:localStorage.getItem("payitaht-adalari-v1"),containment:document.documentElement.dataset.masterContainment,text:document.body.innerText.slice(-2500)})));throw e});assert(loaded.length>0,'newly completed building did not load master-v8');report.cases.push({name:'construction completion',newTextureLoaded:true});await c.close()
 assert.equal(report.errors.length,0);assert.equal(report.missing.length,0)
 fs.writeFileSync(path.join(out,'qa.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));await browser.close();browser=null;
 if(process.env.RUN_LAYOUT==='1')await new Promise(resolve=>require('node:child_process').execFile(process.execPath,[path.join(root,'tools/layout-qa.cjs')],{cwd:root,env:{...process.env,QA_URL:'http://127.0.0.1:4189/gameofashina/'},maxBuffer:5000000},(err,stdout,stderr)=>{fs.writeFileSync(path.join(out,'layout.log'),stdout+'\n'+stderr);console.log(stdout.match(/TOPLAM[^\n]*/)?.[0]||'layout output recorded');console.log('layout exit',err?.code||0);resolve()}))
 server.close()
})().catch(async e=>{console.error(e);if(browser)await browser.close();server.close();process.exitCode=1})
