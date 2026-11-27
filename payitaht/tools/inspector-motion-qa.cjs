/* Every animation frame must keep the modeless building inspector on screen. */
const fs=require('node:fs/promises'),path=require('node:path'),assert=require('node:assert/strict')
const {execFileSync}=require('node:child_process'),{chromium}=require('playwright')
const {skipGuide,seedSave,enterGame,qaOrigin}=require('./lib/qa.cjs')
async function main(){
 const baseline=process.env.QA_INSPECTOR_BASELINE==='1',now=Date.UTC(2026,10,22,12),cases=[]
 const out=path.resolve('visual-review/construction-clarity');await fs.mkdir(out,{recursive:true})
 const seed=JSON.parse(execFileSync(process.execPath,['--import','tsx','-e',`const {initialEmpire}=require('./lib/game/empire.ts'),{OBJECTIVES}=require('./lib/game/engine.ts');const e=initialEmpire(${now});e.cities[0].game.claimed=OBJECTIVES.map(o=>o.id);console.log(JSON.stringify(e))`]).toString())
 const browser=await chromium.launch({executablePath:process.env.QA_CHROME_PATH,args:['--no-sandbox','--enable-unsafe-swiftshader']})
 try{for(const width of [360,390,430]){
  const context=await browser.newContext({viewport:{width,height:844},serviceWorkers:'block'});await skipGuide(context);await seedSave(context,seed);await context.addInitScript(()=>localStorage.setItem('payitaht-qa','1'))
  const page=await context.newPage();await page.clock.install({time:now});await page.goto(qaOrigin());await enterGame(page);await page.clock.runFor(900);await page.waitForFunction(()=>document.documentElement.dataset.cityReady&&window.__payitahtQa);await page.evaluate(()=>window.__payitahtQa.buildingPreview('konut'));await page.locator('.building-inspector').waitFor()
  const frames=await page.locator('.building-inspector').evaluate(el=>{el.style.animation='none';void el.offsetWidth;el.style.animation='';const a=el.getAnimations()[0];if(!a)throw Error('Inspector animation not found');a.pause();const frames=[0,90,180].map(ms=>{a.currentTime=ms;const r=el.getBoundingClientRect();return{ms,left:r.left,right:r.right,width:r.width,visible:r.left>=0&&r.right<=innerWidth}});a.finish();return frames})
  await page.emulateMedia({reducedMotion:'reduce'});const reduced=await page.locator('.building-inspector').evaluate(el=>({animations:el.getAnimations().length,left:el.getBoundingClientRect().left,right:el.getBoundingClientRect().right}));if(!baseline){assert.equal(reduced.animations,0);assert.ok(reduced.left>=0&&reduced.right<=width)}
  cases.push({width,frames,reduced});await context.close()
 }}finally{await browser.close();await fs.writeFile(path.join(out,baseline?'motion-before.json':'motion-after.json'),JSON.stringify({baseline,cases},null,2)+'\n')}
 console.log(`Inspector motion: ${cases.flatMap(c=>c.frames).filter(f=>f.visible).length}/9 frames on screen`)
 if(!baseline)assert.ok(cases.every(c=>c.frames.every(f=>f.visible)))
}
main().catch(e=>{console.error(e);process.exitCode=1})
