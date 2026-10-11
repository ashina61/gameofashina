const path=require('node:path');
const root=path.resolve(__dirname,'..');
const gameOrigin=process.env.QA_URL||'http://127.0.0.1:3000/';
const {chromium}=require('playwright');
const {skipGuide,enterGame,SAVE_KEY}=require('./lib/qa.cjs');
const fs=require('node:fs/promises');
const out=path.join(root,'docs/glarium-integration');
(async()=>{
 await fs.mkdir(out,{recursive:true});
 const browser=await chromium.launch({...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE ? {executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE} : {}),headless:true,args:['--no-sandbox']});
 const result={errors:[],missing:[],stages:[],interactions:[]};
 let base;
 for(const width of [390,430]){
  const ctx=await browser.newContext({viewport:{width,height:844},deviceScaleFactor:2,isMobile:true,hasTouch:true});await skipGuide(ctx);
  await ctx.addInitScript(()=>localStorage.setItem('payitaht-qa','1'));
  const page=await ctx.newPage();page.on('pageerror',e=>result.errors.push(e.message));page.on('response',r=>{if(r.status()>=400&&r.url().includes('/images/'))result.missing.push(r.url())});
  await page.goto(gameOrigin);await enterGame(page);await page.waitForFunction(()=>document.documentElement.dataset.cityReady);
  base=await page.evaluate(key=>JSON.parse(localStorage.getItem(key)),SAVE_KEY);
  if(width===390)await page.screenshot({path:out+'/new-game-390.png'});
  for(const lv of [1,5,10,15,20]){
   const seed=structuredClone(base);const g=seed.cities.find(c=>c.id===seed.activeCityId).game;
   g.buildings.divan=lv;g.buildings.kisla=8;g.placement.kisla=7;g.buildings.medrese=8;g.placement.medrese=9;g.buildings.liman=2;g.placement.liman=25;g.buildings.tersane=2;g.placement.tersane=26;g.buildings.korsan_kalesi=2;g.placement.korsan_kalesi=28;
   await page.addInitScript(([key,raw])=>localStorage.setItem(key,raw),[SAVE_KEY,JSON.stringify(seed)]);
   await page.reload();await enterGame(page);await page.waitForFunction(()=>document.documentElement.dataset.cityReady);await page.waitForTimeout(200);
   const data=await page.evaluate(()=>JSON.parse(document.documentElement.dataset.paintedCity));if(data.stage!==lv)throw Error('stage mismatch');
   const noOverflow=await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth);if(!noOverflow)throw Error('overflow');
   result.stages.push({width,lv,occupied:data.occupied});
   if(width===390)await page.screenshot({path:out+`/hall-${String(lv).padStart(2,'0')}-390.png`});
   // Actual municipality hit region projected by Phaser camera matrix.
   if(lv===20&&width===390){
    const point=await page.evaluate(()=>{const c=JSON.parse(document.documentElement.dataset.paintedCamera);const box=document.querySelector('canvas').getBoundingClientRect();return {x:box.x+((730-c.centerX)*c.zoom+c.width/2)*box.width/c.width,y:box.y+((220-c.centerY)*c.zoom+c.height/2)*box.height/c.height}});
    await page.mouse.click(point.x,point.y);await page.waitForTimeout(200);
    const opened=await page.locator('.building-inspector').count();await page.getByRole('button',{name:'Yapıyı yönet'}).click();
    const body=await page.locator('body').innerText();if(!body.includes('Gelişim'))throw Error('municipality tap failed: '+JSON.stringify(point));
    result.interactions.push({municipality:true,point,opened});await page.screenshot({path:out+'/municipality-detail-390.png'});
    await page.getByRole('button',{name:'Şehir',exact:true}).click();
    const occupied=new Set(data.occupied.map(p=>p[0]));const candidates=[[1,768,388],[2,832,406],[3,528,396],[4,592,414],[5,958,280],[6,1022,298]];const target=candidates.find(p=>!occupied.has(p[0]));if(!target)throw Error('no test plot');
    const project=async(x,y)=>page.evaluate(([x,y])=>{const c=JSON.parse(document.documentElement.dataset.paintedCamera);const box=document.querySelector('canvas').getBoundingClientRect();return {x:box.x+((x-c.centerX)*c.zoom+c.width/2)*box.width/c.width,y:box.y+((y-c.centerY)*c.zoom+c.height/2)*box.height/c.height}},[x,y]);
    const tp=await project(target[1],target[2]);await page.mouse.click(tp.x,tp.y);await page.getByText('Boş arsa',{exact:true}).waitFor();result.interactions.push({emptyPlot:target[0],opened:true});
    await page.getByRole('button',{name:'Şehir',exact:true}).click();
    const barracks=page.locator('.city-list button').filter({hasText:'Kışla'});await barracks.focus();await barracks.press('Enter');await page.getByRole('button',{name:'Yapıyı yönet'}).click();await page.getByRole('tab',{name:'Gelişim',exact:true}).click();await page.getByText('Yapı işlemleri',{exact:true}).click();await page.getByRole('button',{name:'Başka arsaya taşı'}).click();
    await page.waitForFunction(()=>JSON.parse(document.documentElement.dataset.paintedCity).moving==='kisla');await page.mouse.click(tp.x,tp.y);await page.waitForFunction(at=>JSON.parse(document.documentElement.dataset.paintedCity).movePlot===at,target[0]);await page.screenshot({path:out+'/move-preview-390.png'});result.interactions.push({movePreview:target[0]});await page.getByRole('button',{name:'Onayla',exact:true}).click();await page.waitForFunction(at=>{const d=JSON.parse(document.documentElement.dataset.paintedCity);return !d.moving&&d.occupied.some(p=>p[0]===at&&p[1]==='kisla')},target[0]);result.interactions.push({moveConfirmed:target[0]});

   }
  }
  await ctx.close();
 }
 await browser.close();await fs.writeFile(out+'/validation.json',JSON.stringify(result,null,2));console.log(JSON.stringify(result));if(result.errors.length||result.missing.length)throw Error('browser errors');
})().catch(e=>{console.error(e);process.exit(1)});
