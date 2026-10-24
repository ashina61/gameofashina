/** Approved terrain and two-storey barracks in the real Pages/Phaser scene. */
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict')
require('tsx/cjs')
const sharp=require('sharp'),{chromium}=require('playwright')
const {initialEmpire}=require('../lib/game/empire.ts')
const {PARCEL_PLOTS,PARCEL_WORLD,cityBuildingImage,cityArtOutline,cityBuildingArtFrame,barracksRoadClear}=require('../lib/game/city-map/parcel-city.ts')
const {skipGuide,seedSave,START_BUTTON}=require('./lib/qa.cjs')
const root=path.resolve(__dirname,'..'),out=path.join(root,'docs/mockups/cohesive-city')
const report={errors:[],missing:[],cases:process.env.QA_RESUME==='1'?JSON.parse(fs.readFileSync(path.join(out,'qa.json'))).cases:[]}
let browser,server
async function native(){
 fs.mkdirSync(out,{recursive:true})
 const p=PARCEL_PLOTS[1],file=path.join(root,'public',cityBuildingImage('kisla',1,undefined,'full'))
 const m=await sharp(file).metadata(),f=cityBuildingArtFrame('kisla',p,m.width,m.height,cityArtOutline('kisla',1,'full'))
 const cut={left:p.center.x-240,top:p.center.y-160,width:480,height:320}
 const terrain=await sharp(path.join(root,'public/images/game/terrain/painted-town-v1/city-crisp.webp')).resize(PARCEL_WORLD.w,PARCEL_WORLD.h).extract(cut).png().toBuffer()
 const sprite=await sharp(file).resize(Math.round(f.width),Math.round(f.height)).png().toBuffer()
 const composite=await sharp(terrain).composite([{input:sprite,left:Math.round(f.left-cut.left),top:Math.round(f.top-cut.top)}]).png().toBuffer()
 await sharp(composite).resize(960,640).webp({quality:88}).toFile(path.join(out,'native-plot.webp'))
 report.native={parcel:1,artWidth:f.width,artHeight:f.height,parcelWidth:p.width,parcelHeight:p.height,method:'Measured ground contacts centred in the fixed parcel; full two-storey silhouette guarded against road occlusion.'}
}
async function main(){
 await native()
 if(process.env.QA_NATIVE_ONLY==='1'){console.log(JSON.stringify(report.native));return}
 assert(fs.existsSync(path.join(root,'out/index.html')),'Build the static export before browser QA')
 const mime={'.html':'text/html','.js':'application/javascript','.css':'text/css','.webp':'image/webp','.json':'application/json','.woff2':'font/woff2','.svg':'image/svg+xml'}
 server=http.createServer((req,res)=>{let u=new URL(req.url,'http://localhost').pathname.replace(/^\/gameofashina(?=\/|$)/,''),p=path.join(root,'out',u==='/'?'index.html':u);if(!fs.existsSync(p)&&fs.existsSync(p+'.html'))p+='.html';try{res.setHeader('Content-Type',mime[path.extname(p)]||'application/octet-stream');res.end(fs.readFileSync(p))}catch{res.statusCode=404;res.end('missing')}})
 await new Promise(r=>server.listen(4317,'127.0.0.1',r))
 browser=await chromium.launch({executablePath:process.env.QA_CHROME_PATH,headless:true,args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']})
 const widths=process.env.QA_WIDTHS?process.env.QA_WIDTHS.split(',').map(Number):[360,390,430,1536]
 for(const width of widths){
  const i=[360,390,430,1536].indexOf(width)
  const height=width===1536?960:844,seed=initialEmpire(Date.now()),g=seed.cities[0].game
  for(const id of Object.keys(g.buildings)){g.buildings[id]=0;g.placement[id]=null}
  g.buildings.divan=20;g.placement.divan=0;g.buildings.kisla=[1,8,20,1][i];g.placement.kisla=1;g.flips=i===1?['kisla']:[]
  const context=await browser.newContext({viewport:{width,height},deviceScaleFactor:width===1536?1:2,isMobile:width<500,hasTouch:width<500,serviceWorkers:'block'})
  await skipGuide(context);await seedSave(context,seed);await context.addInitScript(()=>localStorage.setItem('payitaht-qa','1'))
  const page=await context.newPage(),loaded=[]
  page.on('pageerror',e=>report.errors.push(e.message));page.on('response',r=>{if(r.status()>=400)report.missing.push(r.status()+' '+r.url());if(r.url().includes('/parcel-v4/kisla'))loaded.push(r.url())})
  await page.goto(process.env.QA_LIVE_URL||'http://127.0.0.1:4317/gameofashina/');await page.getByRole('button',{name:START_BUTTON}).click()
  await page.waitForFunction(()=>document.documentElement.dataset.parcelReview&&JSON.parse(document.documentElement.dataset.parcelReview).some(x=>x.id==='kisla'),{},{timeout:60000})
  await page.waitForTimeout(500)
  const measurement=await page.evaluate(()=>JSON.parse(document.documentElement.dataset.parcelReview).find(x=>x.id==='kisla'))
  const outside=measurement.ground.filter(q=>!measurement.boundary.every((a,i)=>{const b=measurement.boundary[(i+1)%measurement.boundary.length];return (b.x-a.x)*(q.y-a.y)-(b.y-a.y)*(q.x-a.x)>=-1e-5})).length
  assert.equal(outside,0);assert(barracksRoadClear(measurement.outline),'full barracks silhouette covers a road');assert(loaded.length,'new barracks not loaded')
  const camera=await page.evaluate(()=>{const c=document.querySelector('canvas'),r=c.getBoundingClientRect(),top=document.querySelector('.ika-top').getBoundingClientRect().bottom,bottom=document.querySelector('.ika-nav').getBoundingClientRect().top,dpr=c.width/r.width,h=(bottom-top)*dpr,w=c.width;return {dpr,top,bottom,z:Math.max(w/3172,h/1984,w/1800,h/1536*1.03)}})
  const x=width/2+288*camera.z/camera.dpr,y=(camera.top+camera.bottom)/2-168*camera.z/camera.dpr
  if(width<500){
   await page.mouse.click(x,y);await page.locator('.building-inspector').waitFor({timeout:5000});assert.match(await page.locator('#building-inspector-title').innerText(),/Kışla/)
   await page.getByRole('button',{name:'Binayı kapat',exact:true}).click()
  }
  await sharp(await page.screenshot()).resize({width:Math.min(width,1200),withoutEnlargement:true}).webp({quality:86}).toFile(path.join(out,`game-${width}.webp`))
  if(width===390){
   await page.mouse.move(width/2,(camera.top+camera.bottom)/2)
   for(let n=0;n<9;n++){await page.mouse.wheel(0,-120);await page.waitForTimeout(50)}
   const z=Math.min(2.2,camera.z*1.1**9)/camera.dpr
   await page.mouse.move(330,380);await page.mouse.down();await page.mouse.move(330-288*z,380+168*z,{steps:20});await page.mouse.up()
   await page.mouse.move(30,camera.top+20);await page.mouse.down();await page.mouse.up();await page.waitForTimeout(200)
   await sharp(await page.screenshot()).resize({width:390,withoutEnlargement:true}).webp({quality:88}).toFile(path.join(out,'game-390-close.webp'))
  }
  report.cases.push({width,height,level:g.buildings.kisla,flipped:i===1,groundOutside:outside,roadClear:true,loaded:loaded.map(u=>new URL(u).pathname),tapOpenedBarracks:width<500?true:null})
  fs.writeFileSync(path.join(out,'qa.json'),JSON.stringify(report,null,2)+'\n');console.log('Verified width '+width)
  await context.close()
 }
 assert.equal(report.errors.length,0);assert.equal(report.missing.length,0)
 await browser.close();browser=null
 if(process.env.QA_LAYOUT==='1')await new Promise(resolve=>require('node:child_process').execFile(process.execPath,[path.join(root,'tools/layout-qa.cjs')],{cwd:root,env:{...process.env,QA_URL:'http://127.0.0.1:4317/'},maxBuffer:5000000},(error,stdout,stderr)=>{fs.writeFileSync(path.join(out,'layout.log'),stdout+'\n'+stderr);report.layoutExit=error?.code||0;resolve()}))
 fs.writeFileSync(path.join(out,'qa.json'),JSON.stringify(report,null,2)+'\n')
 console.log(JSON.stringify(report));server.close()
}
main().catch(async error=>{fs.mkdirSync(out,{recursive:true});fs.writeFileSync(path.join(out,'qa.json'),JSON.stringify({...report,failure:String(error)},null,2)+'\n');console.error(error);if(browser)await browser.close();server?.close();process.exitCode=1})
