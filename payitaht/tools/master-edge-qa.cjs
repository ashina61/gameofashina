/* Regression for repeated pirate piers and exposed blurred northern margins. */
const fs=require('node:fs'),http=require('node:http'),path=require('node:path'),assert=require('node:assert/strict')
const {chromium}=require('playwright'),sharp=require('sharp')
const {skipGuide,START_BUTTON,seedSave}=require('./lib/qa.cjs')
const root=path.resolve(__dirname,'..'),out=root+'/docs/mockups/approved-city-108/edges'
const mime={'.html':'text/html','.js':'application/javascript','.css':'text/css','.webp':'image/webp','.json':'application/json','.woff2':'font/woff2'}
const server=http.createServer((req,res)=>{const url=new URL(req.url,'http://localhost').pathname.replace(/^\/gameofashina(?=\/|$)/,'');let p=path.join(root,'out',url==='/'?'index.html':url);if(!fs.existsSync(p)&&fs.existsSync(p+'.html'))p+='.html';try{res.setHeader('Content-Type',mime[path.extname(p)]||'application/octet-stream');res.end(fs.readFileSync(p))}catch{res.statusCode=404;res.end('missing')}})
let browser;const report={errors:[],missing:[],cases:[]}
;(async()=>{
 fs.mkdirSync(out,{recursive:true});await new Promise(r=>server.listen(4189,'127.0.0.1',r))
 browser=await chromium.launch({executablePath:process.env.QA_CHROME_PATH,headless:true,args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']})
 const fixture=JSON.parse(fs.readFileSync(root+'/tools/fixtures/late-game.json','utf8'));for(const c of fixture.cities)c.game.updatedAt=Date.now()
 for(const width of [360,390,430]){
  const c=await browser.newContext({viewport:{width,height:844},deviceScaleFactor:2,isMobile:true,hasTouch:true,serviceWorkers:'block'});await skipGuide(c)
  if(process.env.APPROVED_QA_DAYLIGHT==='1')await c.addInitScript(()=>{Date.prototype.getHours=()=>14;Date.prototype.getMinutes=()=>0;});await seedSave(c,fixture);await c.addInitScript(()=>localStorage.setItem('payitaht-qa','1'))
  const p=await c.newPage();p.on('pageerror',e=>report.errors.push(e.message));p.on('response',r=>{if(r.status()>=400)report.missing.push(r.url())})
  await p.goto('http://127.0.0.1:4189/gameofashina/');await p.getByRole('button',{name:START_BUTTON}).click();await p.waitForFunction(()=>document.documentElement.dataset.masterCamera,{timeout:60000})
  const state=()=>p.evaluate(()=>JSON.parse(document.documentElement.dataset.masterCamera))
  const screenshot=async(name)=>sharp(await p.screenshot()).webp({quality:90}).toFile(out+'/'+name+'-'+width+'.webp')
  const inspect=async(name)=>{const camera=await state();assert.ok(camera.visibleTop>=-0.01,JSON.stringify(camera));assert.equal(camera.seaTexture,'master-open-sea-v2');assert.equal(camera.seaTiled,false);assert.equal(camera.forestExtension,false);assert.equal(camera.forestGroves.length,6);assert.ok(camera.forestGroves.every(p=>p.y>=0&&p.y+p.height<195));assert.equal(camera.worldBottom,3612);report.cases.push({width,name,camera})}
  await p.mouse.move(width/2,500);for(let n=0;n<24;n++){await p.mouse.wheel(0,120);await p.waitForTimeout(25)}await p.waitForTimeout(150)
  await inspect('minimum zoom');await screenshot('overview')
  for(let n=0;n<22;n++){await p.mouse.wheel(0,-120);await p.waitForTimeout(25)}
  for(let n=0;n<14;n++){await p.mouse.move(width/2,420);await p.mouse.down();await p.mouse.move(width/2,620,{steps:10});await p.mouse.up()}
  await p.evaluate(()=>window.__payitahtQa.close());await p.waitForTimeout(200);await inspect('north boundary after repeated pan');await screenshot('north')
  for(let n=0;n<24;n++){await p.mouse.move(width/2,620);await p.mouse.down();await p.mouse.move(width/2,420,{steps:10});await p.mouse.up()}
  await p.evaluate(()=>window.__payitahtQa.close());await p.waitForTimeout(200);await inspect('south sea after repeated pan');if(width===390)await screenshot('sea')
  await c.close()
 }
 assert.equal(report.errors.length,0,JSON.stringify(report.errors));assert.equal(report.missing.length,0,JSON.stringify(report.missing))
 fs.writeFileSync(out+'/qa.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report));await browser.close();server.close()
})().catch(async e=>{console.error(e);if(browser)await browser.close();server.close();process.exitCode=1})
