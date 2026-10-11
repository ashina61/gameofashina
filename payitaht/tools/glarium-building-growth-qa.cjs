const path=require('node:path');
const fs=require('node:fs/promises');
const {chromium}=require('playwright');
const {skipGuide,enterGame,SAVE_KEY}=require('./lib/qa.cjs');
const gameOrigin=process.env.QA_URL||'http://127.0.0.1:3000/';
const out=path.resolve(__dirname,'../docs/glarium-barracks');
(async()=>{
 await fs.mkdir(out,{recursive:true});
 const browser=await chromium.launch({...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE ? {executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE} : {}),headless:true,args:['--no-sandbox']});
 const context=await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:2,isMobile:true,hasTouch:true});await skipGuide(context);await context.addInitScript(()=>localStorage.setItem('payitaht-qa','1'));
 const page=await context.newPage();const result={errors:[],missing:[],stages:[]};const assets=[];
 page.on('pageerror',e=>result.errors.push(e.message));page.on('response',r=>{if(r.status()>=400&&r.url().includes('/images/'))result.missing.push(r.url());if(/glarium\/kisla-\d+/.test(r.url()))assets.push(r.url())});
 await page.goto(gameOrigin);await enterGame(page);await page.waitForFunction(()=>document.documentElement.dataset.cityReady);
 const base=await page.evaluate(key=>JSON.parse(localStorage.getItem(key)),SAVE_KEY);
 for(const lv of [1,5,10,15,20]){
  const seed=structuredClone(base);const g=seed.cities.find(c=>c.id===seed.activeCityId).game;g.buildings.divan=20;g.buildings.kisla=lv;
  for(const id of Object.keys(g.placement))if(g.placement[id]===1)g.placement[id]=null;
  g.placement.kisla=1;
  await page.addInitScript(([key,raw])=>localStorage.setItem(key,raw),[SAVE_KEY,JSON.stringify(seed)]);
  assets.length=0;await page.reload();await enterGame(page);await page.waitForFunction(()=>document.documentElement.dataset.cityReady);await page.waitForTimeout(200);
  const city=await page.evaluate(()=>JSON.parse(document.documentElement.dataset.paintedCity));if(city.stage!==20)throw Error('city hall art unexpectedly changed');
  const urls=[...new Set(assets)];if(!urls.some(url=>url.includes(`kisla-${String(lv).padStart(2,'0')}-sm.webp`)))throw Error('wrong own building stage '+lv+' '+urls.join());
  await page.screenshot({path:path.join(out,`kisla-${String(lv).padStart(2,'0')}-390.png`)});
  const point=await page.evaluate(()=>{const c=JSON.parse(document.documentElement.dataset.paintedCamera),box=document.querySelector('canvas').getBoundingClientRect();return {x:box.x+((768-c.centerX)*c.zoom+c.width/2)*box.width/c.width,y:box.y+((370-c.centerY)*c.zoom+c.height/2)*box.height/c.height}});
  await page.mouse.click(point.x,point.y);await page.locator('.building-inspector').waitFor();const title=await page.locator('#building-inspector-title').innerText();if(title!=='Kışla')throw Error('wrong hit '+title);
  const previewImage=await page.locator('.building-inspector-summary img').getAttribute('src');if(!previewImage.includes(`kisla-${String(lv).padStart(2,'0')}-sm.webp`))throw Error('inspector differs from city');
  result.stages.push({barracks:lv,cityHall:city.stage,urls,previewImage,tap:true});await page.getByRole('button',{name:'Binayı kapat'}).click();
  if(lv===20){await page.mouse.move(point.x,point.y);await page.mouse.wheel(0,-650);await page.waitForTimeout(200);await page.screenshot({path:path.join(out,'kisla-20-close-390.png')});}
 }
 await browser.close();await fs.writeFile(path.join(out,'validation.json'),JSON.stringify(result,null,2));console.log(JSON.stringify(result));if(result.errors.length||result.missing.length)throw Error('browser errors');
})().catch(e=>{console.error(e);process.exit(1)});
