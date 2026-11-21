import test from 'node:test'
import assert from 'node:assert/strict'
import { advance, freePlots, initialGame, zoneOf, type BuildingId, type Game } from './engine'
import { advanceEmpire, initialEmpire } from './empire'
import { dispatchRaid } from './expeditions'
import { CITY_ROADS, PARCEL_PLOTS } from './city-map/parcel-city'
import { cityLifeFleet, cityLifePlan, cityLifeRoute, sampleLifePath } from './city-life-plan'

const NOW=Date.UTC(2026,10,21,4)
function place(g:Game,id:BuildingId,level=1){if(g.placement[id]===null)g.placement[id]=freePlots(g,zoneOf(id))[0];g.buildings[id]=level}
function busy(){
 const g=initialGame(NOW)
 place(g,'divan',15);place(g,'konut',10);place(g,'hamam',8);place(g,'medrese',3);place(g,'carsi',3);place(g,'kisla',3);place(g,'liman',2);place(g,'tersane',2)
 g.workers={kereste:20,medrese:40,carsi:40};g.citizens=500
 g.drills=[{id:'mizrakci',kind:'drill',count:5,start:NOW,end:NOW+120000}]
 return g
}

test('city life follows population and actual assignments without writing to the save',()=>{
 const g=busy(),before=JSON.stringify(g),plan=cityLifePlan(g)
 assert.equal(JSON.stringify(g),before)
 for(const role of ['citizen','logger','scholar','trader'])assert.ok(plan.walkers.some(w=>w.role===role),role)
 assert.equal(plan.training?.count,3)
 g.workers={kereste:0,medrese:0,carsi:0}
 const idle=cityLifePlan(g)
 assert.ok(idle.walkers.every(w=>w.role==='citizen'))
 g.citizens=0
 assert.equal(cityLifePlan(g).walkers.length,0)
 const small=cityLifePlan(initialGame(NOW)),large=cityLifePlan(busy())
 assert.ok(large.walkers.filter(w=>w.role==='citizen').length>small.walkers.filter(w=>w.role==='citizen').length)
})

test('every activity route stays on existing painted roads for every saved plot pair',()=>{
 const same=(a:{x:number;y:number},b:{x:number;y:number})=>a.x===b.x&&a.y===b.y
 for(const a of PARCEL_PLOTS)for(const b of PARCEL_PLOTS){
  const path=cityLifeRoute(a.index,b.index)
  assert.ok(path&&path.length>0)
  for(let i=1;i<path.points.length;i++){
   const x=path.points[i-1],y=path.points[i]
   assert.ok(CITY_ROADS.some(road=>road.some((q,j)=>j>0&&((same(q,x)&&same(road[j-1],y))||(same(q,y)&&same(road[j-1],x))))),`off-road shortcut ${a.index}/${b.index}`)
  }
  for(const d of [0,.1,path.length*.3,path.length,path.length+1,path.length*2-.1]){
   const at=sampleLifePath(path,d)
   assert.ok(Number.isFinite(at.x)&&Number.isFinite(at.y))
  }
 }
})

test('road walkers travel at constant distance and turn around continuously',()=>{
 const path=cityLifeRoute(0,4)!
 const a=sampleLifePath(path,2),b=sampleLifePath(path,7)
 assert.ok(Math.abs(Math.hypot(a.x-b.x,a.y-b.y)-5)<1e-7)
 const before=sampleLifePath(path,path.length-.01),after=sampleLifePath(path,path.length+.01)
 assert.ok(Math.hypot(before.x-after.x,before.y-after.y)<1e-7)
 assert.deepEqual(sampleLifePath(path,0),sampleLifePath(path,path.length*2))
 assert.equal(cityLifeRoute(-1,0),null)
})

test('only a running barracks order produces training; queued and naval jobs do not',()=>{
 const g=busy()
 g.drills[0].start=NOW+1000
 assert.equal(cityLifePlan(g).training,null)
 g.updatedAt=NOW+1000
 assert.equal(cityLifePlan(g).training?.count,3)
 const finished=advance(g,NOW+120000)
 assert.equal(finished.army.mizrakci,5)
 assert.equal(cityLifePlan(finished).training,null)
 g.drills=[{id:'kadirga',kind:'drill',count:5,start:NOW,end:NOW+120000}]
 assert.equal(cityLifePlan(g).training,null)
 g.queue=[{id:'konut',kind:'build',start:NOW+2000,end:NOW+4000}]
 assert.ok(!cityLifePlan(g).walkers.some(w=>w.role==='builder'))
 g.updatedAt=NOW+2000
 assert.ok(cityLifePlan(g).walkers.some(w=>w.role==='builder'))
})

test('lite, reduced motion, occupation and blockade have bounded deterministic populations',()=>{
 const g=busy(),fleet={merchants:8,warships:4}
 const full=cityLifePlan(g,{fleet}),lite=cityLifePlan(g,{fleet,lite:true}),reduced=cityLifePlan(g,{fleet,reduced:true})
 assert.ok(lite.walkers.length<=10&&lite.walkers.length<full.walkers.length)
 assert.ok((lite.training?.count??0)<=2);assert.ok(lite.boats.length<=1)
 assert.equal(reduced.moving,false);assert.equal(full.moving,true)
 assert.deepEqual(full,cityLifePlan(g,{fleet}))
 const occupied=cityLifePlan(g,{fleet,occupied:true})
 assert.ok(occupied.walkers.length<=2&&occupied.walkers.every(w=>w.role==='citizen'))
 assert.equal(occupied.training,null);assert.deepEqual(occupied.boats,[])
 assert.deepEqual(cityLifePlan(g,{fleet,blockaded:true}).boats,[])
})

test('harbour presence follows the real free fleet, including ships leaving and returning',()=>{
 const e=initialEmpire(NOW),g=e.cities[0].game
 place(g,'liman',2);place(g,'tersane',2);place(g,'kisla',3)
 assert.deepEqual(cityLifePlan(g,{fleet:cityLifeFleet(e)}).boats,[])
 g.army.yeniceri=60;g.army.okcu=20;g.army.nakliye=2;g.army.kadirga=3
 assert.deepEqual(cityLifeFleet(e),{merchants:2,warships:3})
 assert.equal(cityLifePlan(g,{fleet:cityLifeFleet(e)}).boats.length,2)
 const sent=dispatchRaid(e,'zeytin-koy',{yeniceri:60,okcu:20,kadirga:3},NOW)
 assert.equal(sent.error,undefined)
 assert.deepEqual(cityLifeFleet(sent.empire),{merchants:0,warships:0})
 assert.deepEqual(cityLifePlan(sent.empire.cities[0].game,{fleet:cityLifeFleet(sent.empire)}).boats,[])
 const back=advanceEmpire(sent.empire,sent.empire.missions![0].returnAt)
 assert.equal(cityLifeFleet(back).merchants,2)
 assert.ok(cityLifeFleet(back).warships>0)
 assert.equal(cityLifePlan(back.cities[0].game,{fleet:cityLifeFleet(back)}).boats.length,2)
 g.buildings.liman=0;g.buildings.tersane=0
 assert.deepEqual(cityLifePlan(g,{fleet:cityLifeFleet(e)}).boats,[])
})
