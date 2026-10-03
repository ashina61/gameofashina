/** G4: contact sheet plus actual 390px city and northern terrain. */
const fs = require('node:fs/promises'), path = require('node:path'), http = require('node:http')
const { chromium } = require('playwright')
const { qaOrigin, START_BUTTON } = require('../lib/qa.cjs')
const { reviewWebp } = require('../lib/review-webp.cjs')
async function main() {
 const phase = process.argv[2] || 'after'; if (!['before','after'].includes(phase)) throw new Error('before or after required');
 const out = path.resolve(`${process.env.G4_REVIEW_ROOT || 'visual-review/G4'}/${phase}`); await fs.mkdir(out,{recursive:true})
 const groups = ['terrain','decor'], cells = []
 for (const group of groups) for (const name of (await fs.readdir(`public/images/game/${group}`)).filter(n=>n.endsWith('.webp')&&!n.endsWith('-sm.webp'))) cells.push(`<figure><img src="/images/game/${group}/${name}"><figcaption>${group}/${name}</figcaption></figure>`)
 const html = `<meta charset="utf-8"><style>body{margin:0;padding:16px;background:#e2dac2;color:#2a1a0e;font:11px system-ui}main{display:grid;grid-template-columns:repeat(7,1fr);gap:8px}figure{margin:0;height:142px;background:#b8c195;display:grid;place-items:center}img{max-width:140px;max-height:116px}figcaption{font-size:10px}</style><h1>G4 · 11 zemin / tepe + 31 dekor</h1><main>${cells.join('')}</main>`
 const server=http.createServer(async(req,res)=>{try{if(req.url==='/'){res.setHeader('Content-Type','text/html');res.end(html);return}const p=path.resolve('public','.'+new URL(req.url,'http://localhost').pathname);if(!p.startsWith(path.resolve('public')+path.sep))throw new Error('Path');res.setHeader('Content-Type','image/webp');res.end(await fs.readFile(p))}catch{res.writeHead(404);res.end()}})
 await new Promise(r=>server.listen(0,'127.0.0.1',r)); const browser=await chromium.launch({headless:true,args:['--no-sandbox']})
 try {
  if (phase === 'after') { const sheet=await browser.newPage({viewport:{width:1120,height:980}});await sheet.goto(`http://127.0.0.1:${server.address().port}`);await sheet.evaluate(()=>Promise.all([...document.images].map(i=>i.decode())));await reviewWebp(await sheet.screenshot(),path.join(out,'terrain-decor-sheet.webp'));await sheet.close() }
  if (process.env.G4_SHEET_ONLY === '1') return
  const fixture=JSON.parse(await fs.readFile('tools/fixtures/late-game.json','utf8'))
  const context=await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:1,isMobile:true,hasTouch:true})
  await context.addInitScript(e=>{for(const c of e.cities)c.game.updatedAt=Date.now();localStorage.setItem('payitaht-adalari-v1',JSON.stringify(e));localStorage.setItem('payitaht-rehber','goruldu');localStorage.setItem('payitaht-qa','1')},fixture)
  const page=await context.newPage(), errors=[],missing=[]
  page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400&&/images\/game/.test(r.url()))missing.push(r.url())})
  await page.goto(qaOrigin(),{waitUntil:'domcontentloaded'});await page.getByRole('button',{name:START_BUTTON}).click();await page.waitForFunction(()=>!!window.__payitahtQa);await page.evaluate(()=>window.__payitahtQa.close());await page.waitForTimeout(1500)
  await reviewWebp(await page.screenshot(),path.join(out,'city-grown-390x844.webp'))
  for(let i=0;i<3;i++){await page.mouse.move(195,340);await page.mouse.down();await page.mouse.move(195,690,{steps:25});await page.mouse.up();await page.waitForTimeout(300)}
  await reviewWebp(await page.screenshot(),path.join(out,'hills-390x844.webp'))
  if(errors.length||missing.length)throw new Error(JSON.stringify({errors,missing}));await fs.writeFile(path.join(out,'../terrain-report.json'),JSON.stringify({assets:cells.length,errors,missing},null,2));console.log(`${cells.length} assets; live city and hills; no missing files/errors.`)
 } finally {await browser.close();server.close()}
}
main().catch(e=>{console.error(e);process.exitCode=1})
