const {execFileSync}=require('node:child_process')
module.exports=function mobileFixture(now){
 const seed=JSON.parse(execFileSync(process.execPath,['--import','tsx','-e',`const {initialEmpire}=require('./lib/game/empire.ts'),{OBJECTIVES,freePlotsFor}=require('./lib/game/engine.ts');const e=initialEmpire(${now}),g=e.cities[0].game;for(const[id,level]of[['divan',10],['konut',10],['ambar',10],['kereste',5],['medrese',5],['carsi',5],['kisla',5],['hamam',5],['liman',3]]){g.buildings[id]=level;if(g.placement[id]===null)g.placement[id]=freePlotsFor(g,id)[0]}g.resources={gold:8000,wood:8000,knowledge:400};g.citizens=500;g.workers={kereste:20,medrese:20,carsi:10};g.army.mizrakci=40;g.army.nakliye=4;g.claimed=OBJECTIVES.map(o=>o.id);console.log(JSON.stringify(e))`]).toString())
 return seed
}
