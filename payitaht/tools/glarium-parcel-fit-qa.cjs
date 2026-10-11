const path=require('node:path');
const fs=require('node:fs/promises');
const sharp=require('sharp');
const {chromium}=require('playwright');
const {skipGuide,enterGame,SAVE_KEY}=require('./lib/qa.cjs');
const out=path.resolve(__dirname,'../docs/glarium-parcel-runtime');
const gameOrigin=process.env.QA_URL||'http://127.0.0.1:3000/';
(async()=>{
 await fs.mkdir(out,{recursive:true});
 const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 const ctx=await browser.newContext({viewport:{width:430,height:932},deviceScaleFactor:2,isMobile:true,hasTouch:true});
 await skipGuide(ctx);await ctx.addInitScript(()=>localStorage.setItem('payitaht-qa','1'));
 const page=await ctx.newPage();const report={errors:[],missing:[],stages:[]};
 page.on('pageerror',e=>report.errors.push(e.message));page.on('response',r=>{if(r.status()>=400&&r.url().includes('/images/'))report.missing.push(r.url())});
 await page.goto(gameOrigin);await enterGame(page);await page.waitForFunction(()=>document.documentElement.dataset.cityReady);
 const base=await page.evaluate(k=>JSON.parse(localStorage.getItem(k)),SAVE_KEY);
 const ids=['kisla','medrese','konut','carsi','ambar','hamam','elcilik','saray','kahvehane','muze','marangoz','mimar','ormanci','tasci','bagci','tophane','simyahane','camci','mahzen','gozlukcu','barutane','depo','ticaret_merkezi','harita_arsivi'];
 for(const stage of [1,5,10,15,20]){
  const seed=structuredClone(base),g=seed.cities.find(c=>c.id===seed.activeCityId).game;
  g.buildings.divan=stage;
  for(const id of Object.keys(g.placement))if(!['divan','surlar'].includes(id)){g.buildings[id]=0;g.placement[id]=null}
  ids.forEach((id,i)=>{g.buildings[id]=stage;g.placement[id]=i+1});
  for(const [id,at] of [['liman',25],['tersane',26],['korsan_kalesi',28]]){g.buildings[id]=stage;g.placement[id]=at}
  await page.addInitScript(([k,s])=>localStorage.setItem(k,s),[SAVE_KEY,JSON.stringify(seed)]);
  await page.reload();await enterGame(page);await page.waitForFunction(()=>document.documentElement.dataset.cityReady);await page.waitForTimeout(100);
  const data=await page.evaluate(()=>JSON.parse(document.documentElement.dataset.paintedCity));
  if(data.stage!==stage||data.occupied.length!==28||!data.frames.length)throw Error('Incomplete scene');
  await sharp(await page.screenshot()).webp({quality:82}).toFile(path.join(out,`full-${String(stage).padStart(2,'0')}-430.webp`));
  report.stages.push({stage,occupied:data.occupied,parcels:data.parcels,frames:data.frames});
  if(stage===20){
   const target=data.parcels.find(p=>p.index===1);
   const point=await page.evaluate(p=>{const c=JSON.parse(document.documentElement.dataset.paintedCamera),b=document.querySelector('canvas').getBoundingClientRect();return {x:b.x+((p.x-c.centerX)*c.zoom+c.width/2)*b.width/c.width,y:b.y+((p.y-c.centerY)*c.zoom+c.height/2)*b.height/c.height}},target);
   await page.mouse.move(point.x,point.y);await page.mouse.wheel(0,-460);await page.waitForTimeout(100);
   await sharp(await page.screenshot()).webp({quality:82}).toFile(path.join(out,'filled-parcels-close-430.webp'));
   await sharp(await page.screenshot({clip:{x:0,y:290,width:430,height:180}})).webp({quality:86}).toFile(path.join(out,'parcels-detail-430.webp'));
   await page.setViewportSize({width:1469,height:1070});await page.waitForTimeout(100);
   if(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth))throw Error('Landscape overflow');
  }
 }
 await fs.writeFile(path.join(out,'validation.json'),JSON.stringify(report,null,2));
 await browser.close();console.log(JSON.stringify({stages:report.stages.map(s=>({stage:s.stage,occupied:s.occupied.length,trimmed:s.frames.length})),errors:report.errors,missing:report.missing}));
 if(report.errors.length||report.missing.length)throw Error('Browser errors');
})().catch(e=>{console.error(e);process.exit(1)});
