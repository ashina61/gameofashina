import * as Phaser from 'phaser'
import { CityScene } from './phaser-city'
import { FlagField, SmokeField } from './city-life'
import { SkyLayer } from './city-sky'
import { asset, buildingArtKey, type ArtSize } from '@/lib/asset'
import { BUILDINGS, BUILDING_IDS, activeJob, plotOpen, type BuildingId, type Game } from '@/lib/game/engine'
import { visualSignature } from '@/lib/game/city-render'
import { PEACEFUL_CITY, siegeAppearanceKey, type SiegeAppearance } from '@/lib/game/siege-appearance'
import { PARCEL_PLOTS, PARCEL_WORLD, parcelPlot, parcelProject, parcelArtFrame, cityArtOutline, cityBuildingImage, type CityParcel } from '@/lib/game/city-map/parcel-city'
import { cityArtSize, isTap } from './city/shared'

/** Main game renderer. Engine plot IDs and saved placements never change. */
export class ParcelCityScene extends CityScene {
  people:Array<{image:Phaser.GameObjects.Image;a:{x:number;y:number};b:{x:number;y:number};t:number}>=[]
  ships:Phaser.GameObjects.Image[]=[]
  preload(){
    this.load.image('parcel-terrain',asset('/images/game/terrain/parcel-v1/city.webp'))
    this.load.image('parcel-citizen',asset('/images/game/ui/people/citizen-figure.webp'))
    for(const key of ['ship-a','ship-b','fishing'])this.load.image(`parcel-${key}`,asset(`/images/game/ships/${key}.webp`))
    this.load.image('b_site',asset('/images/game/buildings/site.webp'))
    this.load.image('b_scaffold',asset('/images/game/buildings/scaffold.webp'))
    for(const id of BUILDING_IDS){
      const level=this.state.buildings[id]
      if(level<=0||id==='surlar')continue
      const facing=id==='liman'||id==='tersane'?this.state.coastFacing[id]:undefined
      this.load.image(buildingArtKey(id,level,facing),cityBuildingImage(id,level,facing,cityArtSize()))
    }
  }
  ensureBuildingTexture(id:BuildingId,level:number){
    if(level<=0||id==='surlar')return
    const facing=id==='liman'||id==='tersane'?this.state.coastFacing[id]:undefined,key=buildingArtKey(id,level,facing)
    if(this.textures.exists(key)||this.loadingBuildingTextures.has(key))return
    this.loadingBuildingTextures.add(key)
    this.load.image(key,cityBuildingImage(id,level,facing,cityArtSize()))
    this.load.once(`filecomplete-image-${key}`,()=>this.loadingBuildingTextures.delete(key))
    this.load.once(Phaser.Loader.Events.COMPLETE,()=>{if(this.built){this.signature='';this.redraw()}})
    if(!this.load.isLoading())this.load.start()
  }
  create(){
    this.cameras.main.setBackgroundColor('#969b60')
    this.add.image(0,0,'parcel-terrain').setOrigin(0).setDepth(-1000)
    this.flagField=new FlagField(this);this.flagField.setLook(this.sceneBanner())
    this.smoke=new SmokeField(this);this.sky=new SkyLayer(this,PARCEL_WORLD)
    this.built=true;this.maxZoom=1.6;this.setupCamera();this.installCamera();this.addParcelLife();this.redraw()
    const cleanup=()=>{
      this.built=false
      const target=Phaser.GameObjects.Graphics.TargetCamera
      if(target.scene===this){target.destroy();Object.assign(Phaser.GameObjects.Graphics,{TargetCamera:new Phaser.Cameras.Scene2D.BaseCamera(0,0,0,0)})}
      delete document.documentElement.dataset.cityReady;delete document.documentElement.dataset.cityLayer
    }
    this.events.once('shutdown',cleanup);this.events.once('destroy',cleanup)
    this.events$.onReady?.()
  }
  worldRect(){return PARCEL_WORLD}
  townRect(){return {x:230,y:380,w:3636,h:1960}}
  townZoom(){return this.scale.width/1100}
  setCityView(){
    this.cameras.main.setZoom(Phaser.Math.Clamp(this.cityZoom,this.minZoom,this.maxZoom))
    this.centerInBand(PARCEL_PLOTS[0].center.x+100,PARCEL_PLOTS[0].center.y+140);this.velocity={x:0,y:0}
  }
  setOverview(){this.cameras.main.setZoom(this.minZoom);this.centerInBand(2048,1600);this.velocity={x:0,y:0}}
  focusHarbour(){
    const plots=[parcelPlot(this.state.placement.liman),parcelPlot(this.state.placement.tersane)].filter((p):p is CityParcel=>!!p)
    const xs=(plots.length?plots:PARCEL_PLOTS.slice(25,28)).map(p=>p.center.x)
    this.cameras.main.setZoom(Math.max(this.minZoom,Math.min(this.maxZoom,this.scale.width/(Math.max(...xs)-Math.min(...xs)+660))))
    this.centerInBand((Math.min(...xs)+Math.max(...xs))/2,2460);this.velocity={x:0,y:0}
  }
  sync(game:Game,showLabels:boolean,placing:boolean,moving:BuildingId|null=null,movePlot:number|null=null,siege:SiegeAppearance=PEACEFUL_CITY){
    this.state=game;this.showLabels=showLabels;this.placing=placing;this.moving=moving;this.movePlot=movePlot;this.siege=siege
    if(!this.built)return
    const next=`${visualSignature(game)}|${showLabels}|${placing}|${moving}|${movePlot}|${siegeAppearanceKey(siege)}`
    if(next!==this.signature)this.redraw()
  }
  updateMoveTarget(pointer:Phaser.Input.Pointer){
    const eligible=this.eligibleMovePlots(),point=this.cameras.main.getWorldPoint(pointer.x,pointer.y)
    const p=PARCEL_PLOTS.filter(p=>eligible.has(p.index)).sort((a,b)=>Math.hypot(a.center.x-point.x,a.center.y-point.y)-Math.hypot(b.center.x-point.x,b.center.y-point.y))[0]
    if(p&&p.index!==this.movePlot){this.movePlot=p.index;this.redraw();this.events$.onMovePlot(p.index)}
  }
  redraw(){
    this.signature=`${visualSignature(this.state)}|${this.showLabels}|${this.placing}|${this.moving}|${this.movePlot}|${siegeAppearanceKey(this.siege)}`
    for(const piece of this.pieces)piece.destroy()
    this.pieces=[];this.labelOf.clear();this.flagField?.removeGroup('pieces');this.smoke?.removeGroup('pieces');this.sky?.removeGroup('pieces')
    this.flagField?.setLook(this.sceneBanner());this.flagField?.setLevel(this.state.buildings.divan)
    const occupied=new Map<number,BuildingId>()
    for(const id of BUILDING_IDS){const at=id===this.moving&&this.movePlot!==null?this.movePlot:this.state.placement[id];if(at!=null&&id!=='surlar')occupied.set(at,id)}
    const running=activeJob(this.state)?.id,eligible=this.eligibleMovePlots()
    for(const p of PARCEL_PLOTS){
      const id=occupied.get(p.index)
      if(id)this.drawParcelBuilding(id,p,running===id)
      else if(plotOpen(this.state,p.index))this.drawParcelEmpty(p)
      if(this.moving&&eligible.has(p.index))this.parcelFrame(p,p.index===this.movePlot?0x85c46f:0xe8ce93)
    }
    this.drawParcelWalls();this.drawParcelSiege()
    for(const ship of this.ships)ship.setVisible(!this.siege.blockade)
    this.markReady()
  }
  parcelFrame(p:CityParcel,color:number){
    const g=this.add.graphics().setDepth(1e5)
    g.fillStyle(color,.12).fillPoints(p.polygon,true);g.lineStyle(3,color,.85).strokePoints(p.polygon,true);this.pieces.push(g)
  }
  parcelHit(p:CityParcel){
    const polygon=new Phaser.Geom.Polygon(p.polygon.map(q=>({x:q.x-p.center.x+p.width/2,y:q.y-p.center.y+p.height/2})))
    return this.add.rectangle(p.center.x,p.center.y,p.width,p.height,0xffffff,0).setInteractive({hitArea:polygon,hitAreaCallback:Phaser.Geom.Polygon.Contains,useHandCursor:true})
  }
  drawParcelEmpty(p:CityParcel){
    const g=this.add.graphics().setDepth(p.center.y)
    g.lineStyle(3,0x766043).lineBetween(p.center.x,p.center.y,p.center.x,p.center.y-58)
    g.fillStyle(p.slot.zone==='liman'?0x387b9c:0xa03431).fillTriangle(p.center.x+2,p.center.y-58,p.center.x+35,p.center.y-49,p.center.x+2,p.center.y-38)
    this.pieces.push(g)
    if(this.placing)this.parcelFrame(p,0xe8ce93)
    const hit=this.parcelHit(p).setDepth(p.center.y+2)
    hit.on('pointerup',(pointer:Phaser.Input.Pointer)=>{if(isTap(pointer)&&!this.moving&&!this.pinchStart)this.events$.onPlot(p.index)})
    this.pieces.push(hit)
  }
  drawParcelBuilding(id:BuildingId,p:CityParcel,active:boolean){
    const level=this.state.buildings[id],facing=id==='liman'||id==='tersane'?this.state.coastFacing[id]:undefined
    const key=level>0?buildingArtKey(id,level,facing):'b_site'
    if(!this.textures.exists(key)){if(level>0)this.ensureBuildingTexture(id,level);return}
    const source=this.textures.get(key).getSourceImage() as HTMLImageElement,size:ArtSize=level>0?cityArtSize():'full'
    const name=level>0?(facing==='straight'?id+'-duz':id):'__site',flip=facing?facing==='right':this.state.flips.includes(id)
    const outline=cityArtOutline(name,level,size)||[{x:0,y:0},{x:1,y:0},{x:1,y:1},{x:0,y:1}]
    const f=parcelArtFrame(p,source.width,source.height,outline,flip)
    const image=this.add.image(f.x,f.y,key).setDisplaySize(f.width,f.height).setFlipX(flip).setDepth(p.center.y+1)
    image.setData('parcelIndex',p.index).setData('parcelBuilding',id).setData('parcelOutline',f.polygon)
    this.pieces.push(image)
    const hit=this.parcelHit(p).setDepth(p.center.y+2)
    hit.on('pointerup',(pointer:Phaser.Input.Pointer)=>{
      if(!isTap(pointer)||this.moving||this.pinchStart)return
      image.setTint(0xffedce);this.time.delayedCall(110,()=>{if(image.active)image.clearTint()});this.events$.onBuilding(id)
    })
    this.pieces.push(hit)
    if(this.showLabels||active){const label=this.makePaintedLabel(p.center.x,p.center.y+p.height/2+12,level,BUILDINGS[id].name,1e6+p.center.y);this.labelOf.set(id,label);this.pieces.push(label)}
    if(p.slot.zone==='sehir')this.sky?.addLight(p.center.x,p.center.y,'pieces',.55)
    const job=activeJob(this.state)
    if(active&&job){
      const sc=this.textures.get('b_scaffold').getSourceImage() as HTMLImageElement
      const sf=parcelArtFrame(p,sc.width,sc.height,cityArtOutline('__scaffold',1,'full')!)
      this.pieces.push(this.add.image(sf.x,sf.y,'b_scaffold').setDisplaySize(sf.width,sf.height).setDepth(p.center.y+5),this.makeTimer(p.center.x,p.center.y+p.height/2+65,job.start,job.end,1e6+p.center.y+1))
    }
  }
  drawParcelWalls(){
    const level=this.state.buildings.surlar,corners=[[-.8,-.8],[30.8,-.8],[30.8,30.8],[-.8,30.8]]
    if(level>0){
      const h=level>=8?46:level>=4?38:30
      for(let side=0;side<4;side++){
        const a=corners[side],b=corners[(side+1)%4],g=this.add.graphics().setDepth(side===0||side===3?20:2360)
        for(let i=0;i<32;i++){
          if((side===1||side===2)&&i>=17&&i<=19)continue // front gates align with street exits
          const p=parcelProject(a[0]+(b[0]-a[0])*i/32,a[1]+(b[1]-a[1])*i/32),q=parcelProject(a[0]+(b[0]-a[0])*(i+1)/32,a[1]+(b[1]-a[1])*(i+1)/32)
          g.fillStyle(side%2?0xbba27b:0xd4bd94).fillPoints([{x:p.x,y:p.y},{x:q.x,y:q.y},{x:q.x,y:q.y-h},{x:p.x,y:p.y-h}],true)
          g.lineStyle(4,0xead6ad).lineBetween(p.x,p.y-h,q.x,q.y-h)
          g.lineStyle(1,0x937b58,.6).lineBetween(p.x,p.y-h/2,q.x,q.y-h/2)
          if(i%3===0)g.fillStyle(0xe3cca1).fillRect(p.x-5,p.y-h-9,10,10)
        }
        this.pieces.push(g)
      }
    }
    // A wall can always be inspected, even before construction.
    const n=parcelProject(0,0),hit=this.add.rectangle(n.x,n.y-20,300,80,0xffffff,0).setInteractive({useHandCursor:true}).setDepth(60)
    hit.on('pointerup',(pointer:Phaser.Input.Pointer)=>{if(isTap(pointer)&&!this.moving)this.events$.onBuilding('surlar')});this.pieces.push(hit)
  }
  drawParcelSiege(){
    if(this.siege.occupation){
      const p=PARCEL_PLOTS[0];this.smoke?.addSource(p.center.x+180,p.center.y,'pieces',.8,0x504736)
      this.flagField?.add({x:p.center.x+180,y:p.center.y-95,w:55,h:40,depth:p.center.y+8,dir:1},'pieces')
    }
    if(this.siege.blockade||this.raidWanted)for(const x of [1300,2048,2800]){
      const ship=this.add.image(x,2720,'parcel-ship-b').setDepth(2720).setTint(0xcc9990);ship.setScale(210/ship.width);this.pieces.push(ship)
    }
  }
  addParcelLife(){
    for(const [i,x] of [1300,2050,2780].entries()){
      const ship=this.add.image(x,2680+i*45,i===2?'parcel-fishing':'parcel-ship-a').setDepth(2700);ship.setScale((i===2?140:210)/ship.width)
      this.tweens.add({targets:ship,y:ship.y+8,angle:1.2,duration:2600+i*300,yoyo:true,repeat:-1});this.ships.push(ship)
    }
    for(let i=0;i<8;i++){
      const t=i%2?12:18,a=parcelProject(i<4?0:t,i<4?t:0),b=parcelProject(i<4?30:t,i<4?t:30)
      const image=this.add.image(0,0,'parcel-citizen').setOrigin(.5,1).setDisplaySize(13,33)
      this.people.push({image,a,b,t:i/8})
    }
  }
  setRaidAlert(on:boolean){if(this.raidWanted===on)return;this.raidWanted=on;if(this.built)this.redraw()}
  fxSail(){if(!this.built)return;const ship=this.add.image(2048,2600,'parcel-ship-a').setDepth(2800);ship.setScale(210/ship.width);this.tweens.add({targets:ship,y:3170,alpha:0,duration:3200,onComplete:()=>ship.destroy()})}
  fxMarch(){if(!this.built)return;const a=parcelProject(15,18),b=parcelProject(30,18);for(let i=0;i<5;i++){const figure=this.add.image(a.x-i*12,a.y-i*6,'parcel-citizen').setOrigin(.5,1).setDisplaySize(14,35).setDepth(a.y);this.tweens.add({targets:figure,x:b.x,y:b.y,duration:4200+i*100,onComplete:()=>figure.destroy()})}}
  update(time:number,delta:number){
    super.update(time,delta)
    for(const p of this.people){p.t=(p.t+Math.min(delta,100)/1000*.012)%2;const t=p.t<=1?p.t:2-p.t;p.image.setPosition(p.a.x+(p.b.x-p.a.x)*t,p.a.y+(p.b.y-p.a.y)*t).setDepth(p.image.y).setFlipX(p.t>1)}
  }
  markReady(){
    if(!this.built||this.load.isLoading()||this.loadingBuildingTextures.size)return
    this.game.events.once(Phaser.Core.Events.POST_RENDER,()=>{
      if(!this.built)return
      document.documentElement.dataset.cityReady=String(++this.readyCount)
      document.documentElement.dataset.cityLayer='parcel-v1'
      if(localStorage.getItem('payitaht-qa')==='1')document.documentElement.dataset.parcelReview=JSON.stringify(this.pieces.filter(p=>p.getData('parcelBuilding')).map(p=>({id:p.getData('parcelBuilding'),index:p.getData('parcelIndex'),outline:p.getData('parcelOutline')})))
    })
  }
}
