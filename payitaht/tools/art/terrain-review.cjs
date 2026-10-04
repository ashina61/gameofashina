/** G4: contact sheet plus actual 390px city and northern terrain. */
const fs = require('node:fs/promises'), path = require('node:path'), http = require('node:http')
const { chromium } = require('playwright')
const { qaOrigin, START_BUTTON } = require('../lib/qa.cjs')
const { reviewWebp } = require('../lib/review-webp.cjs')
async function main() {
 const phase = process.argv[2] || 'after'; if (!['before','after'].includes(phase)) throw new Error('before or after required');
 const out = path.resolve(`${process.env.TERRAIN_REVIEW_ROOT || process.env.G4_REVIEW_ROOT || 'visual-review/G4'}/${phase}`); await fs.mkdir(out,{recursive:true})
 const groups = ['terrain','decor'], cells = []
 for (const group of groups) for (const name of (await fs.readdir(`public/images/game/${group}`)).filter(n=>n.endsWith('.webp')&&!n.endsWith('-sm.webp'))) cells.push(`<figure><img src="/images/game/${group}/${name}"><figcaption>${group}/${name}</figcaption></figure>`)
 const html = `<meta charset="utf-8"><style>body{margin:0;padding:16px;background:#e2dac2;color:#2a1a0e;font:11px system-ui}main{display:grid;grid-template-columns:repeat(7,1fr);gap:8px}figure{margin:0;height:142px;background:#b8c195;display:grid;place-items:center}img{max-width:140px;max-height:116px}figcaption{font-size:10px}</style><h1>G4 · 11 zemin / tepe + 31 dekor</h1><main>${cells.join('')}</main>`
 const server=http.createServer(async(req,res)=>{try{if(req.url==='/'){res.setHeader('Content-Type','text/html');res.end(html);return}const p=path.resolve('public','.'+new URL(req.url,'http://localhost').pathname);if(!p.startsWith(path.resolve('public')+path.sep))throw new Error('Path');res.setHeader('Content-Type','image/webp');res.end(await fs.readFile(p))}catch{res.writeHead(404);res.end()}})
 await new Promise(r=>server.listen(0,'127.0.0.1',r)); const browser=await chromium.launch({headless:true,args:['--no-sandbox']})
 try {
  if (phase === 'after') { const sheet=await browser.newPage({viewport:{width:1120,height:980}});await sheet.goto(`http://127.0.0.1:${server.address().port}`);await sheet.evaluate(()=>Promise.all([...document.images].map(i=>i.decode())));await reviewWebp(await sheet.screenshot(),path.join(out,'terrain-decor-sheet.webp'));await sheet.close() }
  if (process.env.G4_SHEET_ONLY === '1') return
  const report={assets:cells.length,errors:[],missing:[],scenes:[]}
  const fixture=JSON.parse(await fs.readFile('tools/fixtures/late-game.json','utf8'))
  for(const scenario of ['initial','grown','grown-lite']) {
    const context=await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:1,isMobile:true,hasTouch:true,serviceWorkers:'block'})
    await context.addInitScript(({e,lite})=>{if(e){for(const c of e.cities)c.game.updatedAt=Date.now();localStorage.setItem('payitaht-adalari-v1',JSON.stringify(e))}localStorage.setItem('payitaht-rehber','goruldu');localStorage.setItem('payitaht-qa','1');localStorage.setItem('payitaht-hafif',lite?'acik':'kapali')},{e:scenario==='initial'?null:fixture,lite:scenario==='grown-lite'})
    const page=await context.newPage()
    page.on('pageerror',e=>report.errors.push(e.message));page.on('response',r=>{if(r.status()>=400&&/images\/game/.test(r.url()))report.missing.push(r.url())})
    await page.goto(qaOrigin(),{waitUntil:'domcontentloaded'});await page.getByRole('button',{name:START_BUTTON}).click();await page.waitForFunction(()=>!!document.documentElement.dataset.cityReady);await page.evaluate(()=>window.__payitahtQa.close());await page.waitForTimeout(700)
    const clearance=await page.evaluate(()=>JSON.parse(document.documentElement.dataset.decorClearance||'null'))
    if(phase==='after'&&(!clearance?.checked||clearance.violations.length))throw new Error('Decor on road/plaza/quay: '+JSON.stringify({scenario,clearance}))
    if(phase==='after'&&clearance?.roadside.some(p=>p.allowed===false))throw new Error('Roadside prop on empty street')
    const pairs={};for(const prop of clearance?.roadside||[]){(pairs[prop.pair]??=[]).push(prop)}
    if(Object.values(pairs).some(p=>p.length!==2))throw new Error('Asymmetric roadside pair')
    report.scenes.push({scenario,...clearance})
    await reviewWebp(await page.screenshot(),path.join(out,scenario==='initial'?'city-center-390x844.webp':scenario==='grown'?'city-grown-390x844.webp':'city-grown-lite-390x844.webp'))
    if(scenario==='grown') {
      const tools=page.getByRole('button',{name:'Harita araçları',exact:true});if(await tools.count())await tools.click();
      await page.getByRole('button',{name:'Donanma ve limana git',exact:true}).click();await page.waitForTimeout(700)
      await reviewWebp(await page.screenshot(),path.join(out,'harbour-390x844.webp'))
    }
    await context.close()
  }
  const grown=report.scenes.find(s=>s.scenario==='grown'),lite=report.scenes.find(s=>s.scenario==='grown-lite');if(phase==='after'&&Math.abs(lite.checked-grown.checked/2)>5)throw new Error('Lite decor density is not halved: '+JSON.stringify({normal:grown.checked,lite:lite.checked}))
  if(report.errors.length||report.missing.length)throw new Error(JSON.stringify(report));await fs.writeFile(path.join(out,'../terrain-report.json'),JSON.stringify(report,null,2));console.log(JSON.stringify({assets:report.assets,errors:report.errors,missing:report.missing,scenes:report.scenes.map(s=>({scenario:s.scenario,checked:s.checked,violations:s.violations.length,roadside:s.roadside.length}))}))

 } finally {await browser.close();server.close()}
}
main().catch(e=>{console.error(e);process.exitCode=1})
