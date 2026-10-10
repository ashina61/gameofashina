/* Real mobile diplomatic screens and command/navigation checks. */
const fs = require('node:fs/promises'), path = require('node:path')
const { chromium } = require('playwright')
const { skipGuide, seedSave, enterGame, qaOrigin } = require('./lib/qa.cjs')
async function main() {
 const out = path.resolve('docs/mockups'), report = { scans: [], actions: [], errors: [], missingArt: [] }
 await fs.mkdir(out, { recursive: true })
 const source = await fs.readFile(path.join(__dirname, 'layout-qa.cjs'), 'utf8')
 const rawScan = source.slice(source.indexOf('function scanPage()'), source.indexOf('async function main()'))
 const target = rawScan.replace("document.querySelectorAll('.bp, .ika-top, .ika-nav, .quest-chip, .threat-banner, .island-view, .map-top-tools, .city-shortcuts, .city-activity, .title-screen, [role=\"dialog\"]')", "document.querySelectorAll('.bp-diplomatic')")
 if (target === rawScan) throw new Error('Layout scanner scope changed')
 const scan = new Function(`return (${target.trim()})`)()
 const {execFileSync}=require('node:child_process')
 const now=Date.now()
 const seeds=JSON.parse(execFileSync('node',['--import','tsx','-e',`
 const fs=require('fs'),{parseEmpire}=require('./lib/game/empire.ts'),{foundPact,weekStart}=require('./lib/game/pact.ts');const now=${now};const seeds=[];
 for(const state of ['normal','locked','pact','faction']){
 const e=JSON.parse(fs.readFileSync('tools/fixtures/late-game.json'));e.missions=[];e.sieges=[];e.threats=[];e.nextThreat={};e.shipments=[];e.world.wars=[];e.world.start=now;e.world.alliance=null;delete e.world.pact;
 for(const c of e.cities){c.game.updatedAt=now;c.game.queue=[];c.game.drills=[];c.game.study=null;c.game.resources.gold=1000;c.game.resources.wood=2000;}
 for(const r of Object.values(e.world.rivals))r.relation=50;
 if(state==='locked'){e.cities[0].game.buildings.elcilik=0;e.cities[0].game.placement.elcilik=null;}
 e.world.messages=state==='locked'?[]:[{id:'mail-qa',time:now,from:'Kara Murad Bey',rivalId:'r-kemer',subject:'Adaların limanları ve uzun ticaret yolları hakkında mühürlü mektup',body:'Şehirlerimizin limanlarını birlikte koruyalım. Uzun yollardan gelen kervanlara ve adalar arasında yol alan gemilere güvenli kıyılar sunalım.',read:false}];
 e.world.proposals=state==='locked'?[]:[{id:'gift-qa',rivalId:'r-kemer',time:now,until:now+3600000,kind:'hediye',give:{good:'gold',amount:100},text:'Kıyılarımıza ulaşan yeni kervanların şerefine uzun bir dostluk sözü ve küçük bir armağan gönderiyoruz.'}];
 if(state==='locked')e.world.news=[];
 let v=parseEmpire(JSON.stringify(e));
 if(state==='pact'){v=foundPact(v,'Uzun Adlı Osmanlı Ada Birliği','OSMAN',now).empire;let p=v.world.pact;if(!p)throw Error('Pact seed rejected');p.members=['r-kemer','r-lale'];p.ranks={'r-kemer':'genel','r-lale':'hariciye'};p.motto='Limanlarda yoldaşlık, adalarda beraberlik ve açık ticaret yolları';p.about='Adaların limanlarını koruyan birliğimiz, uzak şehirlerden gelen bütün dost hükümdarları ortak sancağının altında toplar.';p.notice='Üyelerimizin limanlarda savunmayı ve ticaret yollarını birlikte takip etmesi rica olunur.';p.circulars=[{id:'circular-qa',time:now-10800000,from:'sen',subject:'Liman savunması ve uzun kervan yollarının korunması',body:'Bütün üyelerimiz gemilerini ve şehirlerini hazır tutsun; uzun ticaret yollarından gelen dostlara güvenli limanlar sağlayalım.',read:false}];v.stats={raids:0,shipments:2,spies:0,piracy:0};p.goals={week:new Date(weekStart(now)).toISOString().slice(0,10),base:{raids:0,shipments:0,spies:0,members:1},tasks:['ship2','spies2','member1'],claimed:['member1']};}
 if(state==='faction')v.world.alliance='dogu';
 seeds.push({state,empire:parseEmpire(JSON.stringify(v))});
 }console.log(JSON.stringify(seeds));`],{cwd:path.resolve('.'),maxBuffer:4*1024*1024}).toString())
 const browser=await chromium.launch({headless:true,executablePath:process.env.QA_CHROMIUM_PATH,args:['--no-sandbox','--no-zygote','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']})
 try{
 for(const width of [390,360,430])for(const {state,empire:e} of seeds){
  const context=await browser.newContext({viewport:{width,height:844},isMobile:true,hasTouch:true,deviceScaleFactor:1});await skipGuide(context);await seedSave(context,e);await context.addInitScript(time=>{localStorage.setItem('payitaht-qa','1');Date.now=()=>time},now)
  const page=await context.newPage();page.setDefaultTimeout(30000);page.on('pageerror',err=>report.errors.push(`${width}/${state}: ${err.message}`));page.on('response',r=>{if(r.status()>=400&&r.url().includes('/images/game/'))report.missingArt.push(r.url())})
  await page.goto(qaOrigin('DIPLOMATIC_QA_URL'),{waitUntil:'domcontentloaded'});await enterGame(page);await page.waitForFunction(()=>window.__payitahtQa);await page.addStyleTag({content:'*,*::before,*::after{animation:none!important;transition:none!important;scroll-behavior:auto!important}'})
  const open=async panel=>{await page.evaluate(p=>window.__payitahtQa.panel(p),panel);await page.locator('.bp-diplomatic').waitFor()}
  const restore=()=>page.evaluate(()=>document.querySelectorAll('[data-qa-zoom]').forEach(el=>{el.style.fontSize=el.dataset.qaOriginalFont||'';delete el.dataset.qaZoom;delete el.dataset.qaOriginalFont}))
  const check=async label=>{
   await restore();const columns=await page.locator('.bp-diplomatic .court-tabs').evaluateAll(els=>els.map(el=>getComputedStyle(el).gridTemplateColumns.split(' ').length));const expected=state==='pact'&&label.startsWith('flag-')?[6,3]:state==='pact'&&(label.startsWith('pact-')||label==='disband-confirm')?[6]:[2];if(label!=='faction'&&JSON.stringify(columns)!==JSON.stringify(expected))throw new Error(`Unexpected tab columns ${state}/${label}: ${columns}`);for(const zoom of [1,1.3]){if(zoom>1)await page.evaluate(z=>{const els=[...document.querySelectorAll('.bp-diplomatic,.bp-diplomatic *')].filter(el=>!(el instanceof SVGElement));const sizes=els.map(el=>parseFloat(getComputedStyle(el).fontSize));els.forEach((el,i)=>{el.dataset.qaOriginalFont=el.style.fontSize;el.style.fontSize=`${sizes[i]*z}px`;el.dataset.qaZoom='1'})},zoom)
   await page.waitForTimeout(80);const found=await page.evaluate(scan),total=Object.values(found).reduce((n,g)=>n+Object.values(g).reduce((s,x)=>s+x.adet,0),0);report.scans.push({width,state,label,zoom,total,found});if(total)console.log(JSON.stringify({width,state,label,zoom,found}));}await restore();
   if(width===390&&((state==='normal'&&['envoy-mail','envoy-offers','envoy-rank','found'].includes(label))||(state==='pact'&&['pact-Birlik','pact-Üyeler','pact-Görevler','pact-Genelge','pact-Diplomasi','flag-Arma'].includes(label))||(state==='locked'&&label==='found')||(state==='faction'&&label==='faction'))){if(label==='flag-Arma')await page.locator('.sancaktar-emblems').scrollIntoViewIfNeeded();await page.screenshot({path:path.join(out,`diplomatic-${state}-${label}-390.webp`),type:'webp',quality:85});if(label==='flag-Arma')await page.locator('.bp-diplomatic').evaluate(el=>el.scrollTop=0)}
  }
  await open('diplomacy')
  for(const [name,label]of [['Mektuplar','mail'],['Teklifler','offers'],['Hükümdarlar','rulers'],['Pazar','market'],['Haberler','news'],['Sıralama','rank']]){await page.getByRole('tab',{name:new RegExp('^'+name)}).click();await check('envoy-'+label);if(width===390&&state==='normal'&&label==='mail'){await page.waitForFunction(()=>JSON.parse(localStorage.getItem('payitaht-adalari-v1')).world.messages.every(m=>m.read));report.actions.push('Mektuplar okundu olarak kayda işlendi')}
   if(width===390&&state==='normal'&&label==='rank')for(const key of ['Genel','İnşaatçı','Askerî','Saldırı','Savunma','Bilim','Hazine','Ticaret']){await page.getByRole('group',{name:'Sıralama kolu'}).getByRole('button',{name:key,exact:true}).click();await check('rank-'+key)}
   if(width===390&&state==='normal'&&label==='market')for(const key of ['Mal ticareti','Asker ticareti','Anlaşmalar','Tekliflerin']){await page.getByRole('group',{name:'Ticaret Merkezi',exact:true}).getByRole('button',{name:key,exact:true}).click();await check('market-'+key)}
   if(width===390&&state==='normal'&&label==='offers'){await page.getByRole('button',{name:'Teşekkürle al',exact:true}).click();await page.waitForFunction(()=>!JSON.parse(localStorage.getItem('payitaht-adalari-v1')).world.proposals.some(p=>p.id==='gift-qa'));report.actions.push('Yapay rakibin armağan teklifi kabul edildi')}
  }
  await open('alliance')
  if(state==='pact'){
   for(const key of ['Birlik','Üyeler','Genelge','Görevler','Diplomasi']){await page.getByRole('tab',{name:new RegExp('^'+key)}).click();await check('pact-'+key)
    if(key==='Birlik'){
     await page.getByRole('button',{name:'Sancağı düzenle',exact:true}).click();for(const flag of ['Biçim','Arma','Renk']){await page.getByRole('tab',{name:flag,exact:true}).click();await check('flag-'+flag)}if(width===390){await page.getByRole('tab',{name:'Arma',exact:true}).click();const first=page.locator('.sancaktar-emblems [role=radio]').first();const src=await first.locator('img').getAttribute('src'),crest=src.match(/crest-([^/]+)\.webp/)[1];await first.click();await page.getByRole('button',{name:'Sancağı kaydet',exact:true}).click();await page.waitForFunction(c=>JSON.parse(localStorage.getItem('payitaht-adalari-v1')).profile.crest===c,crest);report.actions.push('Sancak arması mevcut profil kaydına işlendi')}else await page.locator('.diplomatic-signature').getByRole('button',{name:'Vazgeç',exact:true}).click()
     await page.getByRole('button',{name:'İttifakı dağıt',exact:true}).click();await check('disband-confirm');await page.getByRole('button',{name:'Vazgeç',exact:true}).click()
    }
    if(width===390&&key==='Üyeler'){const select=page.locator('.member-card-tools select').first();await select.selectOption('dahiliye');await page.waitForFunction(()=>JSON.parse(localStorage.getItem('payitaht-adalari-v1')).world.pact.ranks['r-kemer']==='dahiliye');const count=await page.evaluate(()=>JSON.parse(localStorage.getItem('payitaht-adalari-v1')).world.pact.members.length);await page.getByRole('button',{name:'Davet et',exact:true}).first().click();await page.waitForFunction(n=>JSON.parse(localStorage.getItem('payitaht-adalari-v1')).world.pact.members.length===n+1,count);report.actions.push('Rütbe ve yapay hükümdar daveti kayda işlendi')}
    if(width===390&&key==='Genelge'){await page.getByLabel('Ek not', {exact:true}).fill('Mobil kontrol için limanlara selam.');await page.getByRole('button',{name:'Bütün üyelere gönder',exact:true}).click();await page.waitForFunction(()=>JSON.parse(localStorage.getItem('payitaht-adalari-v1')).world.pact.circulars.some(c=>c.body.includes('Mobil kontrol')));report.actions.push('Yapay ittifak üyelerine genelge kayda işlendi')}
    if(width===390&&key==='Görevler'){await page.locator('.bp-diplomatic').getByRole('button',{name:'Ödülü al',exact:true}).click();await page.waitForFunction(()=>JSON.parse(localStorage.getItem('payitaht-adalari-v1')).world.pact.goals.claimed.includes('ship2'));report.actions.push('Hazır ittifak görevi ödülü kayda işlendi')}
   }
  }else if(state==='faction'){await check('faction')}
  else{
   await check('found');await page.getByRole('tab',{name:'Birliğe katıl',exact:true}).click();await check('join');await page.getByRole('tab',{name:'Birlik kur',exact:true}).click()
   if(width===390&&state==='normal'){await page.getByRole('tab',{name:'Birliğe katıl',exact:true}).click();await page.getByRole('button',{name:'Katıl',exact:true}).first().click();await page.waitForFunction(()=>JSON.parse(localStorage.getItem('payitaht-adalari-v1')).world.alliance==='dogu');await page.getByRole('button',{name:'İttifaktan ayrıl',exact:true}).click();await page.waitForFunction(()=>!JSON.parse(localStorage.getItem('payitaht-adalari-v1')).world.alliance);report.actions.push('Yapay ittifaka katılma ve ayrılma kayda işlendi');await page.getByLabel('İttifak adı',{exact:true}).fill('Mobil Ada Birliği');await page.getByLabel('Kısaltma',{exact:true}).fill('MAB');await page.getByRole('button',{name:'İttifakı kur',exact:true}).click();await page.waitForFunction(()=>JSON.parse(localStorage.getItem('payitaht-adalari-v1')).world.pact?.name==='Mobil Ada Birliği');report.actions.push('Yeni ittifak kuruluşu kayda işlendi')}
   if(width===390&&state==='locked'){await page.getByRole('button',{name:'Elçiliği kur',exact:true}).click();await page.locator('.building-inspector').waitFor();report.actions.push('Elçilik gereksinimi mevcut yapıyı açtı')}
  }
  await context.close();console.log(`checked ${width}/${state}`)
 }
 }finally{await browser.close()}
 report.clean=report.scans.every(s=>s.total===0)&&!report.errors.length&&!report.missingArt.length;await fs.writeFile(path.resolve('docs/diplomatic-qa-report.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({scans:report.scans.length,clean:report.clean,actions:report.actions,errors:report.errors,missingArt:report.missingArt}));if(!report.clean)process.exitCode=1
}
main().catch(err=>{console.error(err);process.exitCode=1})
