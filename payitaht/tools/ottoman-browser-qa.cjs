/** Actual main-game screenshots and runtime parcel measurements. */
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict'),{spawn}=require('node:child_process')
const {chromium}=require('playwright'),{skipGuide,seedSave,enterGame}=require('./lib/qa.cjs')
const art=require('../lib/game/city-map/ottoman-art.json'),root=path.resolve(__dirname,'..'),out=path.join(root,'docs/mockups/ottoman-centering/browser')
const qaAddress=process.env.QA_URL||'http://127.0.0.1:4317',report={cases:[],errors:[],missing:[],ids:[]}
let browser,server,serverLog=''
async function main(){
 fs.mkdirSync(out,{recursive:true})
 if(process.env.QA_STATIC==='1'){
  const mime={'.html':'text/html','.js':'application/javascript','.css':'text/css','.json':'application/json','.txt':'text/plain','.webp':'image/webp','.png':'image/png','.woff2':'font/woff2'}
  server=http.createServer((req,res)=>{
   const pathname=new URL(req.url,qaAddress).pathname
   let file=path.join(root,'out',pathname==='/'?'index.html':pathname)
   if(!fs.existsSync(file)&&fs.existsSync(file+'.html'))file+='.html'
   try{res.setHeader('Content-Type',mime[path.extname(file)]||'application/octet-stream');res.end(fs.readFileSync(file))}catch{res.statusCode=404;res.end('missing')}
  })
  await new Promise(r=>server.listen(4317,'127.0.0.1',r))
 }else if(!process.env.QA_URL){
  server=spawn(process.execPath,['node_modules/next/dist/bin/next','dev','--webpack','--hostname','127.0.0.1','--port','4317'],{cwd:root,stdio:['ignore','pipe','pipe']})
  for(const stream of [server.stdout,server.stderr])stream.on('data',b=>{serverLog=(serverLog+b).slice(-8000)})
 }
 const until=Date.now()+90000
 while(true){
  if(server?.exitCode!=null)throw Error('QA server stopped: '+serverLog)
  try{if((await fetch(qaAddress)).ok)break}catch{ /* Wait until the local QA server accepts connections. */ }
  if(Date.now()>until)throw Error('QA server unavailable: '+serverLog)
  await new Promise(r=>setTimeout(r,250))
 }
 browser=await chromium.launch({executablePath:process.env.QA_CHROME_PATH,headless:true,args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']})
 async function context(width,seed){
  const c=await browser.newContext({viewport:{width,height:844},deviceScaleFactor:2,isMobile:width<600,hasTouch:true,serviceWorkers:'block'})
  await skipGuide(c);if(seed)await seedSave(c,seed)
  await c.addInitScript(()=>{localStorage.setItem('payitaht-qa','1');Date.prototype.getHours=()=>14;Date.prototype.getMinutes=()=>0})
  return c
 }
 async function page(c){
  const p=await c.newPage();p.on('pageerror',e=>report.errors.push(e.stack||e.message));p.on('response',r=>{if(r.status()>=400)report.missing.push(r.status()+' '+r.url())})
  try{
   await p.goto(qaAddress);await enterGame(p);await p.waitForFunction(()=>document.documentElement.dataset.parcelReview,{timeout:60000});return p
  }catch(e){
   await p.screenshot({path:path.join(out,'failed.png')})
   fs.writeFileSync(path.join(out,'failure.json'),JSON.stringify({errors:report.errors,missing:report.missing,text:await p.locator('body').innerText()},null,2));throw e
  }
 }
 const c=await context(390),p=await page(c),empire=await p.evaluate(()=>JSON.parse(localStorage.getItem('payitaht-adalari-v1')))
 await p.screenshot({path:path.join(out,'new-game-390.webp')});await c.close()
 const ids=Object.keys(art).filter(id=>!id.endsWith('-duz')),land=ids.filter(id=>!['divan','liman','tersane','korsan_kalesi'].includes(id))
 function seed(batch,view){
  const e=structuredClone(empire),g=e.cities.find(c=>c.id===e.activeCityId).game
  for(const id of Object.keys(g.buildings)){g.buildings[id]=0;g.placement[id]=null}
  g.queue=[];g.drills=[];for(const id of Object.keys(g.army))g.army[id]=0
  g.buildings.divan=20;g.placement.divan=0
  land.slice(batch*24,batch*24+24).forEach((id,i)=>{g.buildings[id]=8;g.placement[id]=i+1})
  for(const[id,at]of [['liman',25],['tersane',26],['korsan_kalesi',28]]){g.buildings[id]=8;g.placement[id]=at}
  g.flips=land.filter((_,i)=>(i+view)%2===1)
  g.coastFacing.liman=['left','right','straight'][view%3];g.coastFacing.tersane=['straight','left','right'][view%3]
  g.updatedAt=Date.now();return e
 }
 for(const[view,width]of [360,390,430,1536].entries())for(const batch of [0,1]){
  const c=await context(width,seed(batch,view)),p=await page(c),measured=await p.evaluate(()=>JSON.parse(document.documentElement.dataset.parcelReview))
  const expected=['divan',...land.slice(batch*24,batch*24+24),'liman','tersane','korsan_kalesi']
  for(const id of expected)assert.ok(measured.some(a=>a.id===id),`${width}/${batch}: missing ${id}`)
  let maxError=0
  for(const a of measured){
   maxError=Math.max(maxError,Math.hypot(a.groundCenter.x-a.center.x,a.groundCenter.y-a.center.y))
   assert.ok(a.outline.every(q=>a.boundary.every((b,i)=>{const n=a.boundary[(i+1)%a.boundary.length];return(n.x-b.x)*(q.y-b.y)-(n.y-b.y)*(q.x-b.x)>=-1e-6})),`${a.id}: crosses parcel`)
   report.ids.push(a.id)
  }
  assert.ok(maxError<1e-6)
  await p.screenshot({path:path.join(out,`${width}-batch-${batch+1}.webp`)})
  report.cases.push({width,batch,buildings:measured.length,maxGroundCenterError:maxError,outside:0});console.log(`${width}px / batch ${batch+1}: ${measured.length} buildings, zero outside, centre error ${maxError}`)
  await c.close()
 }
 report.ids=[...new Set(report.ids)].sort();assert.equal(report.ids.length,36)
 assert.equal(report.errors.length,0,JSON.stringify(report.errors));assert.equal(report.missing.length,0,JSON.stringify(report.missing))
 fs.writeFileSync(path.join(out,'qa.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report))
 if(process.env.QA_LAYOUT==='1'){
  const code=await new Promise(resolve=>{const child=spawn(process.execPath,['tools/layout-qa.cjs'],{cwd:root,env:{...process.env,LAYOUT_QA_URL:qaAddress},stdio:'inherit'});child.on('exit',resolve)})
  assert.equal(code,0,'layout QA failed')
 }
}
main().catch(e=>{console.error(e);process.exitCode=1}).finally(async()=>{if(browser)await browser.close();if(server){if(typeof server.close==='function')server.close();else server.kill('SIGTERM')}})
