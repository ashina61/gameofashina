/* Real mobile chronicle: filters, Turkish search, paging and unchanged saves. */
const fs = require('node:fs/promises'), path = require('node:path')
const { execFileSync } = require('node:child_process')
const { chromium } = require('playwright')
const { skipGuide, seedSave, enterGame, qaOrigin } = require('./lib/qa.cjs')
async function main() {
 const report = { scans: [], actions: [], errors: [], missingArt: [] }, out = path.resolve('docs/mockups'), now = Date.now()
 await fs.mkdir(out, { recursive: true })
 const source = await fs.readFile(path.join(__dirname,'layout-qa.cjs'),'utf8')
 const raw = source.slice(source.indexOf('function scanPage()'),source.indexOf('async function main()'))
 const scoped = raw.replace("document.querySelectorAll('.bp, .ika-top, .ika-nav, .quest-chip, .threat-banner, .island-view, .map-top-tools, .city-shortcuts, .city-activity, .title-screen, [role=\"dialog\"]')","document.querySelectorAll('.bp-journal')")
 if (raw === scoped) throw new Error('Scanner scope changed')
 const scan = new Function(`return (${scoped.trim()})`)()
 const seeds = JSON.parse(execFileSync('node',['--import','tsx','-e',`
 const fs=require('fs'),{parseEmpire}=require('./lib/game/empire.ts'),{groupLog}=require('./lib/game/engine.ts'),{logKind}=require('./lib/game/log-view.ts');const now=${now};
 const e=parseEmpire(fs.readFileSync('tools/fixtures/late-game.json','utf8'));e.missions=[];e.sieges=[];e.threats=[];e.nextThreat={};e.shipments=[];e.world.wars=[];e.world.start=now;
 for(const c of e.cities){c.game.updatedAt=now;c.game.queue=[];c.game.drills=[];c.game.study=null;}
 e.cities[0].name='Uzun Adlı Osmanlı Liman Yerleşimi';
 const text=['Kereste Ocağı yeni seviyeye yükseltildi; ustalar inşa çalışmalarını tamamladı.','İlim araştırması tamamlandı; âlimler şehrin bütün mahallelerine yeni üretim usullerini anlatan uzun bir haber gönderdi.','Ticaret gemisi yükünü limana teslim etti.','Ordu seferden döndü; zafer haberi şehre ulaştı.','Görev ödülü alındı.','Cami mucizesi halkı sevindirdi.','Şehrin divan defterine yeni bir hatıra yazıldı.'];
 const log=[...Array.from({length:4},(_,i)=>({time:now-60000-i*1000,text:text[0]})),...Array.from({length:52},(_,i)=>({time:now-(i+1)*3600000,text:text[i%7]+' Kayıt '+(i+1)}))];
 const seeds=[];for(const state of ['filled','empty']){const v=structuredClone(e);v.cities[0].game.log=state==='empty'?[]:log;const valid=parseEmpire(JSON.stringify(v)),entries=groupLog(valid.cities[0].game.log);seeds.push({state,empire:valid,entries,counts:Object.fromEntries(['build','research','trade','war','reward','faith','other'].map(k=>[k,entries.filter(e=>logKind(e.text)===k).length]))});}console.log(JSON.stringify(seeds));
 `],{cwd:path.resolve('.'),maxBuffer:4*1024*1024}).toString())
 const browser=await chromium.launch({headless:true,executablePath:process.env.QA_CHROMIUM_PATH,args:['--no-sandbox','--no-zygote','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']})
 try {
 for (const width of [390,360,430]) for (const seed of seeds) {
  const {state,empire,entries,counts}=seed
  const context=await browser.newContext({viewport:{width,height:844},isMobile:true,hasTouch:true,deviceScaleFactor:1,timezoneId:'Europe/Istanbul'})
  await skipGuide(context);await seedSave(context,empire);await context.addInitScript(time=>{localStorage.setItem('payitaht-qa','1');Date.now=()=>time},now)
  const page=await context.newPage();page.setDefaultTimeout(30000)
  page.on('pageerror',e=>report.errors.push(`${width}/${state}: ${e.message}`));page.on('response',r=>{if(r.status()>=400&&r.url().includes('/images/game/'))report.missingArt.push(r.url())})
  await page.goto(qaOrigin('JOURNAL_QA_URL'),{waitUntil:'domcontentloaded'});await enterGame(page);await page.waitForFunction(()=>window.__payitahtQa)
  await page.addStyleTag({content:'*,*::before,*::after{animation:none!important;transition:none!important;scroll-behavior:auto!important}'})
  await page.evaluate(()=>window.__payitahtQa.panel('journal'));await page.locator('.bp-journal').waitFor()
  const saved=await page.evaluate(()=>JSON.stringify(JSON.parse(localStorage.getItem('payitaht-adalari-v1')).cities[0].game.log))
  const restore=()=>page.evaluate(()=>document.querySelectorAll('[data-qa-zoom]').forEach(el=>{el.style.fontSize=el.dataset.qaOriginalFont||'';delete el.dataset.qaZoom;delete el.dataset.qaOriginalFont}))
  const check=async label=>{
   await restore()
   const columns=await page.locator('.annals-kind-strip').evaluate(el=>getComputedStyle(el).gridTemplateColumns.split(' ').length);if(columns!==4)throw new Error('Journal filters must have four columns')
   for(const zoom of [1,1.3]){if(zoom>1)await page.evaluate(z=>{const els=[...document.querySelectorAll('.bp-journal,.bp-journal *')].filter(el=>!(el instanceof SVGElement));const sizes=els.map(el=>parseFloat(getComputedStyle(el).fontSize));els.forEach((el,i)=>{el.dataset.qaOriginalFont=el.style.fontSize;el.style.fontSize=`${sizes[i]*z}px`;el.dataset.qaZoom='1'})},zoom)
    await page.waitForTimeout(80);const found=await page.evaluate(scan),total=Object.values(found).reduce((n,g)=>n+Object.values(g).reduce((s,x)=>s+x.adet,0),0);report.scans.push({width,state,label,zoom,total,found});if(total)console.log(JSON.stringify({width,state,label,zoom,found}))
   }await restore()
   if(width===390&&['initial','search','missing','page-60'].includes(label)){if(label==='page-60')await page.locator('.annals-entry').last().scrollIntoViewIfNeeded();else await page.locator('.bp-scroll').evaluate(el=>el.scrollTop=0);await page.screenshot({path:path.join(out,`journal-${state}-${label}-390.webp`),type:'webp',quality:85})}
  }
  const size=async expected=>{const n=await page.locator('.annals-entry').count();if(n!==expected)throw new Error(`${state}: expected ${expected} entries, got ${n}`)}
  await size(Math.min(entries.length,20));await check('initial')
  for(const [label,key]of [['Tümü','all'],['İnşa','build'],['İlim','research'],['Ticaret','trade'],['Sefer','war'],['Ödül','reward'],['İnanç','faith'],['Diğer','other']]){await page.getByRole('group',{name:'Günlük olay türü'}).getByRole('button',{name:new RegExp('^'+label+' ·')}).click();await size(Math.min(key==='all'?entries.length:counts[key],20));await check('filter-'+key)}
  await page.getByRole('button',{name:/^Tümü ·/}).click();const input=page.getByRole('searchbox',{name:'Günlükte ara'})
  if(state==='filled'){
   await page.getByText('Bu olay 4 kez tekrarlandı',{exact:true}).waitFor();report.actions.push(`${width}: tekrar ve gün grupları korundu`)
   await input.fill('İLİM');await size(counts.research);await check('search');await page.getByRole('button',{name:'Aramayı temizle',exact:true}).click();await size(20);await check('clear')
   await input.fill('bulunmayan-sözcük');await size(0);await page.getByRole('heading',{name:'Bu sayfada kayıt bulunamadı'}).waitFor();await check('missing');await page.getByRole('button',{name:'Bütün kayıtları göster',exact:true}).click();await size(20);await check('reset')
   await page.getByRole('button',{name:'Eski kayıtları göster'}).click();await size(40);await page.getByText('Dün',{exact:true}).waitFor();await check('page-40');await page.getByRole('button',{name:'Eski kayıtları göster'}).click();await size(entries.length);if(await page.getByRole('button',{name:'Eski kayıtları göster'}).count())throw new Error('Paging must stop at last saved event');await check('page-60')
   report.actions.push(`${width}: Türkçe arama, temizleme, sonuçsuz arama, sıfırlama ve eski kayıtlar doğrulandı`)
  }else{
   await page.getByRole('heading',{name:'İlk satır seni bekliyor'}).waitFor();await input.fill('bulunmayan-sözcük');await check('missing');await page.getByRole('button',{name:'Aramayı temizle'}).click();await check('clear')
  }
  const after=await page.evaluate(()=>JSON.stringify(JSON.parse(localStorage.getItem('payitaht-adalari-v1')).cities[0].game.log));if(saved!==after)throw new Error('Reading the journal mutated saved events');report.actions.push(`${width}/${state}: kayıt değişmedi`)
  await context.close();console.log(`checked ${width}/${state}`)
 }
 }finally{await browser.close()}
 report.clean=report.scans.every(s=>s.total===0)&&!report.errors.length&&!report.missingArt.length;await fs.writeFile(path.resolve('docs/journal-qa-report.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({scans:report.scans.length,clean:report.clean,actions:report.actions,errors:report.errors,missingArt:report.missingArt}));if(!report.clean)process.exitCode=1
}
main().catch(e=>{console.error(e);process.exitCode=1})
