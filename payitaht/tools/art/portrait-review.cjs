/** G3: inspect the actual AdvisorPortrait in 42px circles, plus large speech avatars. */
const fs = require('node:fs'), path = require('node:path'), http = require('node:http')
require('tsx/cjs')
const React = require('react'), { renderToStaticMarkup } = require('react-dom/server')
const { chromium } = require('playwright')
const { reviewWebp } = require('../lib/review-webp.cjs')
const { AdvisorPortrait } = require('../../components/game/advisor-portraits.tsx')
const root = path.resolve(__dirname, '../..'), phase = process.argv[2] || 'after'
if (!['before', 'after'].includes(phase)) throw new Error('before or after required')
const ids = ['city','army','research','diplo']
const cells = size => ids.map(id => `<div>${renderToStaticMarkup(React.createElement(AdvisorPortrait,{id,size}))}<small>${id} · ${size}px</small></div>`).join('')
const cssDir = path.join(root,'out/_next/static/chunks')
const css = fs.readdirSync(cssDir).filter(f=>f.endsWith('.css')).map(f=>fs.readFileSync(path.join(cssDir,f),'utf8')).join('\n')
const html=`<!doctype html><meta charset="utf-8"><style>${css}\nbody{margin:0;padding:20px;background:#ded1b7;color:#2a1a0e;font:14px system-ui}h1{font-size:16px;margin:0 0 16px}section{padding:16px;margin:0 0 16px;display:flex;gap:32px;background:#2a1a0e;color:#f3e2b9}section.parch{background:#f3e2b9;color:#2a1a0e}section div{display:grid;justify-items:center;gap:8px}small{font-size:11px}</style><h1>G3 · ${phase} · 42 px daire / 84 px konuşma portresi</h1><section>${cells(42)}</section><section class="parch">${cells(42)}</section><section>${cells(84)}</section>`
async function main(){
 const out=path.join(root,`visual-review/G3/${phase}`);fs.mkdirSync(out,{recursive:true})
 const server=http.createServer((req,res)=>{if(req.url==='/'){res.setHeader('Content-Type','text/html');res.end(html);return}const p=path.resolve(root,'public','.'+new URL(req.url,'http://localhost').pathname);if(!p.startsWith(path.join(root,'public')+path.sep)||!fs.existsSync(p)){res.writeHead(404);res.end();return}res.setHeader('Content-Type','image/webp');fs.createReadStream(p).pipe(res)})
 await new Promise(r=>server.listen(0,'127.0.0.1',r));let browser
 try{browser=await chromium.launch({headless:true,args:['--no-sandbox']});const page=await browser.newPage({viewport:{width:650,height:500},deviceScaleFactor:1});await page.goto(`http://127.0.0.1:${server.address().port}`);await page.evaluate(()=>Promise.all([...document.images].map(im=>im.decode())));const dims=await page.locator('.advisor-portrait').evaluateAll(els=>els.map(e=>({width:e.getBoundingClientRect().width,height:e.getBoundingClientRect().height,round:getComputedStyle(e).borderRadius})));if(dims.length!==12||dims.slice(0,8).some(d=>d.width!==42||d.height!==42))throw new Error('Portrait 42px check failed');if(phase==='after'&&dims.some(d=>d.round!=='50%'))throw new Error('Portrait is not circular');await reviewWebp(await page.screenshot({type:'png'}),path.join(out,'portraits-42px.webp'));console.log('12 portraits, 8 at exactly 42px; no missing asset.')}finally{if(browser)await browser.close();server.close()}}
main().catch(e=>{console.error(e);process.exitCode=1})
