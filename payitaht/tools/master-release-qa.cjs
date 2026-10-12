/* Build with STATIC_EXPORT=1, NEXT_BASE_PATH=/gameofashina and NEXT_PUBLIC_ASSET_BASE=/gameofashina.
 * Run with Node + Playwright; QA_CHROME_PATH optionally supplies Chromium.
 * Real Phaser bounds, construction and pointer interaction are checked. */
const fs=require('fs'),http=require('http'),path=require('path'),cp=require('child_process');
const {chromium}=require('playwright');
const root=path.resolve(__dirname,'..');
const {skipGuide,START_BUTTON,seedSave}=require(root+'/tools/lib/qa.cjs');
const mime={'.html':'text/html','.js':'application/javascript','.css':'text/css','.webp':'image/webp','.json':'application/json','.png':'image/png','.woff2':'font/woff2'};
const server=http.createServer((req,res)=>{let u=new URL(req.url,'http://localhost').pathname.replace(/^\/gameofashina(?=\/|$)/,''),p=path.join(root,'out',u==='/'?'index.html':u);if(!fs.existsSync(p)&&fs.existsSync(p+'.html'))p+='.html';try{res.setHeader('Content-Type',mime[path.extname(p)]||'application/octet-stream');res.end(fs.readFileSync(p))}catch{res.statusCode=404;res.end('missing')}});
const report={errors:[],missing:[],cases:[],actions:[]};let browser;
(async()=>{
await new Promise(r=>server.listen(4189,'127.0.0.1',r));
browser=await chromium.launch({executablePath:process.env.QA_CHROME_PATH,headless:true,args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const out=root+'/docs/mockups/master-release';fs.mkdirSync(out,{recursive:true});
const context=async(width,height,seed)=>{const c=await browser.newContext({viewport:{width,height},deviceScaleFactor:2,isMobile:true,hasTouch:true,serviceWorkers:'block'});await skipGuide(c);await c.addInitScript(()=>localStorage.setItem('payitaht-qa','1'));if(seed)await seedSave(c,seed);return c;};
const enter=async(c)=>{const p=await c.newPage();p.on('pageerror',e=>report.errors.push(e.message));p.on('response',r=>{if(r.status()>=400)report.missing.push(r.status()+' '+r.url())});await p.goto('http://127.0.0.1:4189/gameofashina/');await p.getByRole('button',{name:START_BUTTON}).click();await p.waitForFunction(()=>document.documentElement.dataset.masterContainment,{timeout:60000});return p;};
const inspect=async(p,name)=>{const data=await p.evaluate(()=>JSON.parse(document.documentElement.dataset.masterContainment));if(data.violations.length)throw Error(name+' overflow '+JSON.stringify(data.violations));report.cases.push({name,measured:data.measured.length,violations:0,art:data.measured.filter(x=>x.role==='art')});};
let c=await context(390,844);let p=await enter(c);await inspect(p,'new game');await p.screenshot({path:out+'/initial-390.png'});
const empire=await p.evaluate(()=>JSON.parse(localStorage.getItem('payitaht-adalari-v1')));await c.close();
const seed=(level,placement,queue=false)=>{const e=structuredClone(empire),g=e.cities.find(c=>c.id===e.activeCityId).game;for(const id of Object.keys(g.buildings)){g.buildings[id]=0;g.placement[id]=null}g.buildings.divan=20;g.placement.divan=0;for(const [id,at] of Object.entries(placement)){g.buildings[id]=level;g.placement[id]=at;}g.queue=queue?[{id:'kisla',kind:'build',start:Date.now()-10000,end:Date.now()+3600000}]:[];g.updatedAt=Date.now();return e;};
const placements=[{kisla:1,medrese:3,ambar:2,carsi:20,hamam:19},{kisla:5,medrese:8,ambar:9,carsi:24,hamam:23},{kisla:18,medrese:17,ambar:15,carsi:22,hamam:21}];
for(const [i,width] of [360,390,430].entries()){
 c=await context(width,844,seed([1,8,20][i],placements[i],i===1));p=await enter(c);await inspect(p,'all six / '+width);
 for(let n=0;n<6;n++)await p.mouse.wheel(0,-120);await p.mouse.move(width/2,420);await p.mouse.down();await p.mouse.move(width/2,560,{steps:10});await p.mouse.move(width/2,560);await p.mouse.up();await p.waitForTimeout(300);
 await p.screenshot({path:out+'/six-'+width+'.png'});
 await p.getByRole('button',{name:'Harita araçları'}).click();await p.getByRole('button',{name:'Belediyeye dön'}).click();
 // Bina tıklaması: kamera tam görünümündeki belediye tuvalden seçilir.
 await p.waitForTimeout(250);const point=await p.evaluate(()=>{const cam=JSON.parse(document.documentElement.dataset.masterCamera),v=JSON.parse(document.documentElement.dataset.masterContainment).measured.find(x=>x.id==='divan'),cv=document.querySelector('canvas'),r=cv.getBoundingClientRect();return {x:r.left+(v.x-cam.viewX)*cam.zoom*r.width/cv.width,y:r.top+(v.y-cam.viewY)*cam.zoom*r.height/cv.height};});await p.mouse.click(point.x,point.y);await p.waitForTimeout(150);
 await p.locator('.building-inspector').waitFor({timeout:3000});report.actions.push(width+': wheel zoom, pan, city controls and municipal building tap');
 await p.evaluate(()=>window.__payitahtQa.close());await c.close();
}
const construction=seed(8,placements[0]);const g=construction.cities.find(c=>c.id===construction.activeCityId).game;g.buildings.kisla=0;g.queue=[{id:'kisla',kind:'build',start:Date.now()-1000,end:Date.now()+3600000}];c=await context(390,844,construction);p=await enter(c);await inspect(p,'new construction scaffold');await c.close();
if(report.errors.length||report.missing.length)throw Error('Runtime/assets '+JSON.stringify(report));
fs.writeFileSync(out+'/qa.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report));await browser.close();browser=null;
if(process.env.RUN_LAYOUT==='1')await new Promise(resolve=>cp.execFile(process.execPath,[root+'/tools/layout-qa.cjs'],{cwd:root,env:{...process.env,QA_URL:'http://127.0.0.1:4189/gameofashina/'},maxBuffer:5000000},(err,stdout,stderr)=>{fs.writeFileSync(out+'/layout.log',stdout+'\n'+stderr);console.log(stdout.match(/TOPLAM[^\n]*/)?.[0]||'layout output recorded');console.log('layout exit',err?.code||0);resolve()}));
server.close();
})().catch(async e=>{console.error(e);if(browser)await browser.close();server.close();process.exitCode=1});
