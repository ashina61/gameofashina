import * as Phaser from 'phaser'
import { cityLifePlan, EMPTY_LIFE_FLEET, sampleLifePath, type CityLifeFleet, type CityLifePlan, type LifePath, type LifeRole } from '@/lib/game/city-life-plan'
import { harbourSailingRoute, parcelPlot, type ParcelPoint } from '@/lib/game/city-map/parcel-city'
import type { BuildingId, Game } from '@/lib/game/engine'
import { PEACEFUL_CITY, type SiegeAppearance } from '@/lib/game/siege-appearance'
import { liteMode, lowMotion, onLiteChange, onMotionChange } from '@/lib/motion'

export type LifeFrame={left:number;top:number;width:number;height:number;flip:boolean;depth:number;outline:ParcelPoint[]}
type Actor={body:Phaser.GameObjects.Container;figure:Phaser.GameObjects.Image;cargo?:Phaser.GameObjects.Image;id:string;role:LifeRole|'drill';path:LifePath;distance:number;speed:number;depth?:number}
type Boat={image:Phaser.GameObjects.Image;id:string;x:number;y:number}
let ordinal=0

/** Reconciles a small, non-interactive layer without rebuilding terrain, buildings or their taps. */
export class ParcelLifeLayer{
 private actors=new Map<string,Actor>()
 private boats=new Map<string,Boat>()
 private key=''
 private game:Game|null=null
 private siege:SiegeAppearance=PEACEFUL_CITY
 private fleet:CityLifeFleet=EMPTY_LIFE_FLEET
 private moving=true
 private elapsed=0
 private reviewTime=0
 private destroyed=false
 private readonly owner=String(++ordinal)
 private readonly review=localStorage.getItem('payitaht-qa')==='1'
 private readonly media=matchMedia('(prefers-reduced-motion: reduce)')
 private offMotion:()=>void
 private offLite:()=>void
 constructor(private scene:Phaser.Scene,private frame:(id:BuildingId)=>LifeFrame|undefined){
  this.offMotion=onMotionChange(this.refresh)
  this.offLite=onLiteChange(this.refresh)
  this.media.addEventListener('change',this.refresh)
 }
 private refresh=()=>{if(this.game&&!this.destroyed){this.key='';this.sync(this.game,this.siege,this.fleet)}}
 sync(game:Game,siege:SiegeAppearance,fleet:CityLifeFleet){
  if(this.destroyed)return
  this.game=game;this.siege=siege;this.fleet=fleet
  const plan=cityLifePlan(game,{fleet,lite:liteMode(),reduced:lowMotion(),occupied:!!siege.occupation,blockaded:!!siege.blockade})
  const frames=['kisla','liman','tersane'].map(id=>{
   const f=this.frame(id as BuildingId)
   return f?[f.left,f.top,f.width,f.height,f.flip]:null
  })
  const key=JSON.stringify([plan,frames])
  if(key===this.key)return
  this.key=key;this.moving=plan.moving
  this.syncWalkers(plan);this.syncBoats(plan)
  this.update(0);this.publish()
 }
 private figure(role:Actor['role']){
  const texture=role==='drill'?'parcel-soldier':role==='scholar'?'parcel-scholar':role==='logger'?'parcel-logger':role==='trader'?'parcel-trader':'parcel-citizen'
  const source=this.scene.textures.get(texture).getSourceImage() as HTMLImageElement
  const height=role==='drill'?16:22
  return this.scene.add.image(0,0,texture).setOrigin(.5,1).setDisplaySize(height*source.width/source.height,height)
 }
 private syncWalkers(plan:CityLifePlan){
  const specs:Array<{id:string;role:Actor['role'];path:LifePath;speed:number;phase:number;depth?:number}>=[...plan.walkers]
  const f=plan.training?this.frame('kisla'):undefined
  if(f&&plan.training){
   // These surveyed points are in the actual open courtyard of parcel-v4/kisla.
   const points=[[.43,.53],[.48,.55],[.58,.60],[.43,.53]].map(([x,y])=>({x:f.left+(f.flip?1-x:x)*f.width,y:f.top+y*f.height}))
   const ends=[0];for(let i=1;i<points.length;i++)ends.push(ends[i-1]+Phaser.Math.Distance.BetweenPoints(points[i-1],points[i]))
   const path={id:`drill-${plan.training.plot}`,points,ends,length:ends.at(-1)!}
   for(let i=0;i<plan.training.count;i++)specs.push({id:`drill-${i}`,role:'drill',path,speed:7,phase:i*.3,depth:f.depth+.4})
  }
  const wanted=new Set(specs.map(s=>s.id))
  for(const [id,actor] of this.actors)if(!wanted.has(id)){actor.body.destroy(true);this.actors.delete(id)}
  for(const spec of specs){
   let actor=this.actors.get(spec.id)
   if(!actor){
    const figure=this.figure(spec.role),shadow=this.scene.add.ellipse(1,0,spec.role==='drill'?5:7,2,0x302718,.18)
    const body=this.scene.add.container(0,0,[shadow,figure])
    const cargoKey=spec.role==='logger'||spec.role==='builder'?'parcel-wood':spec.role==='trader'?'parcel-coins':null
    const cargo=cargoKey?this.scene.add.image(4,-9,cargoKey).setDisplaySize(9,7):undefined
    if(cargo)body.add(cargo)
    actor={body,figure,cargo,id:spec.id,role:spec.role,path:spec.path,distance:spec.path.length*spec.phase,speed:spec.speed,depth:spec.depth}
    this.actors.set(spec.id,actor)
   }else{
    if(actor.path.id!==spec.path.id)actor.distance=spec.path.length*spec.phase
    actor.path=spec.path;actor.speed=spec.speed;actor.depth=spec.depth
   }
  }
 }
 private syncBoats(plan:CityLifePlan){
  const wanted=new Set<string>()
  for(const spec of plan.boats){
   const f=this.frame(spec.building),p=parcelPlot(spec.plot)
   if(!f||!p)continue
   const width=spec.kind==='merchant'?72:80,texture=spec.kind==='merchant'?'parcel-ship-a':'parcel-ship-b'
   const source=this.scene.textures.get(texture).getSourceImage() as HTMLImageElement
   const route=harbourSailingRoute(p,f.outline,width*source.height/source.width)
   if(!route)continue
   wanted.add(spec.id)
   let boat=this.boats.get(spec.id)
   if(!boat){
    const image=this.scene.add.image(route.start.x,route.start.y,texture).setDisplaySize(width,width*source.height/source.width)
    boat={image,id:spec.id,x:route.start.x,y:route.start.y};this.boats.set(spec.id,boat)
   }
   boat.x=route.start.x;boat.y=route.start.y
   boat.image.setFlipX(spec.plot===26)
  }
  for(const [id,boat] of this.boats)if(!wanted.has(id)){boat.image.destroy();this.boats.delete(id)}
 }
 update(seconds:number){
  if(this.destroyed)return
  const dt=this.moving?Math.min(.1,Math.max(0,seconds)):0
  this.elapsed+=dt
  for(const actor of this.actors.values()){
   actor.distance+=dt*actor.speed
   const at=sampleLifePath(actor.path,actor.distance)
   actor.body.setPosition(at.x,at.y).setDepth(actor.depth??at.y+4)
   actor.figure.setFlipX(at.left);actor.cargo?.setX(at.left?-4:4)
  }
  let i=0
  for(const boat of this.boats.values()){
   const bob=this.moving?Math.sin(this.elapsed*1.6+i++)*1.5:0
   boat.image.setPosition(boat.x,boat.y+bob).setDepth(boat.y)
  }
  if(this.review){this.reviewTime+=seconds;if(this.reviewTime>=.25){this.reviewTime=0;this.publish()}}
 }
 private publish(){
  if(!this.review)return
  document.documentElement.dataset.cityLifeOwner=this.owner
  document.documentElement.dataset.cityLifeReview=JSON.stringify({moving:this.moving,lite:liteMode(),
   actors:[...this.actors.values()].map(a=>({id:a.id,role:a.role,x:a.body.x,y:a.body.y,distance:a.distance})),
   boats:[...this.boats.values()].map(b=>({id:b.id,x:b.image.x,y:b.image.y}))})
 }
 destroy(){
  if(this.destroyed)return
  this.destroyed=true;this.offMotion();this.offLite();this.media.removeEventListener('change',this.refresh)
  for(const actor of this.actors.values())actor.body.destroy(true)
  for(const boat of this.boats.values())boat.image.destroy()
  this.actors.clear();this.boats.clear()
  if(document.documentElement.dataset.cityLifeOwner===this.owner){delete document.documentElement.dataset.cityLifeOwner;delete document.documentElement.dataset.cityLifeReview}
 }
}
