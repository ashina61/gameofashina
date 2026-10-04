const fs=require('node:fs/promises'),path=require('node:path'),assert=require('node:assert/strict')
const {chromium}=require('playwright'),{qaOrigin}=require('../lib/qa.cjs'),{reviewWebp}=require('../lib/review-webp.cjs')
async function main(){
 const phase=process.argv[2]||'after',out=`visual-review/G11/${phase}`,screens=[],errors=[],missing=[]
 await fs.mkdir(out,{recursive:true})
 const fixture=JSON.parse(await fs.readFile('tools/fixtures/late-game.json','utf8'))
 const b=await chromium.launch({headless:true,args:['--no-sandbox']})
 try{for(const [width,height] of [[360,740],[390,844],[1280,800]]){
  const c=await b.newContext({viewport:{width,height},serviceWorkers:'block'}),p=await c.newPage()
  p.on('pageerror',e=>errors.push(e.message));p.on('response',r=>{if(r.status()>=400&&/images\/game|icon-/.test(r.url()))missing.push(r.url())})
  await p.goto(qaOrigin(),{waitUntil:'domcontentloaded'});await p.getByRole('button',{name:'Hikâyeye başla'}).waitFor()
  if(phase==='after'){
   assert.ok((await p.locator('.title-sea').getAttribute('style')).includes('title-background.webp'))
   assert.ok((await p.locator('.title-head h1').getAttribute('style')).includes('title-plaque.webp'))
   assert.equal(await p.locator('.title-skyline img').count(),4)
  }
  await p.locator('.title-skyline img').evaluateAll(async imgs=>{await Promise.all(imgs.map(i=>i.decode()))})
  await p.evaluate(async()=>{for(const el of document.querySelectorAll('.title-sea, .title-head h1')){
   const src=getComputedStyle(el).backgroundImage.match(/url\(["']?(.*?)["']?\)/)?.[1]
   if(src){const img=new Image();img.src=src;await img.decode()}
  }})
  assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false)
  await reviewWebp(await p.screenshot(),path.join(out,`new-${width}x${height}.webp`));screens.push(`new-${width}`)
  await p.evaluate(e=>localStorage.setItem('payitaht-adalari-v1',JSON.stringify(e)),fixture);await p.reload();await p.getByRole('button',{name:'Devam et',exact:true}).waitFor()
  await reviewWebp(await p.screenshot(),path.join(out,`continue-${width}x${height}.webp`));screens.push(`continue-${width}`)
  await c.close()
 }
 assert.deepEqual(errors,[]);assert.deepEqual(missing,[])
 await fs.writeFile(`visual-review/G11/scene-${phase}.json`,JSON.stringify({screens,errors,missing},null,2));console.log(`G11 ${phase}: ${screens.length} title screens passed`)
 }finally{await b.close()}
}
main().catch(e=>{console.error(e);process.exitCode=1})
