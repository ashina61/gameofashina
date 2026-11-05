import * as Phaser from 'phaser'
import { CityScene } from './phaser-city'
import { FlagField, SmokeField } from './city-life'
import { SkyLayer } from './city-sky'
import { asset, buildingArtKey, type ArtSize } from '@/lib/asset'
import { BUILDINGS, BUILDING_IDS, activeJob, plotOpen, type BuildingId, type Game } from '@/lib/game/engine'
import { visualSignature } from '@/lib/game/city-render'
import { PEACEFUL_CITY, siegeAppearanceKey, type SiegeAppearance } from '@/lib/game/siege-appearance'
import { PARCEL_PLOTS, PARCEL_WORLD, parcelPlot, CITY_ROADS, parcelContainsPoint, buildingRoadClear, parcelArtFrame, cityBuildingArtFrame, cityArtOutline, cityBuildingImage, parcelBuildingName, type CityParcel, type ParcelPoint } from '@/lib/game/city-map/parcel-city'
import { cityArtSize, isTap } from './city/shared'
import { parcelCameraViewport, parcelCityZoom } from '@/lib/game/city-map/parcel-camera'
import { CITY_WALL_PLAN, type WallSpan } from '@/lib/game/city-map/parcel-wall-ring'
import terrainTiles from '@/lib/game/city-map/terrain-tiles.json'

/** Main game renderer. Engine plot IDs and saved placements never change. */
export class ParcelCityScene extends CityScene {
  people:Array<{image:Phaser.GameObjects.Image;points:Array<{x:number;y:number}>;t:number}>=[]
  ships:Phaser.GameObjects.Image[]=[]
  wallTextureKeys:string[]=[]
  preload(){
    for(const tile of terrainTiles)this.load.image(`parcel-terrain-${tile.id}`,asset(tile.file))
    this.load.image('parcel-wall-masonry',asset('/images/game/walls/hillside-stone.webp'))
    this.load.image('parcel-wall-gate',asset('/images/game/walls/hillside-gate.webp'))
    this.load.image('parcel-wall-tower',asset('/images/game/walls/hillside-bastion.webp'))
    this.load.image('parcel-citizen',asset('/images/game/ui/people/citizen-figure.webp'))
    for(const key of ['ship-a','ship-b','fishing'])this.load.image(`parcel-${key}`,asset(`/images/game/ships/${key}.webp`))
    this.load.image('b_site',asset('/images/game/buildings/site.webp'))
    this.load.image('b_scaffold',asset('/images/game/buildings/scaffold.webp'))
    for(const id of BUILDING_IDS){
      const level=this.state.buildings[id]
      if(level<=0||id==='surlar')continue
      const facing=id==='liman'||id==='tersane'?this.state.coastFacing[id]:undefined
      const name=parcelBuildingName(id,this.state.placement[id])
      this.load.image(buildingArtKey(name,level,facing),cityBuildingImage(name,level,facing,cityArtSize()))
    }
  }
  ensureBuildingTexture(id:BuildingId,level:number){
    if(level<=0||id==='surlar')return
    const name=parcelBuildingName(id,this.state.placement[id])
    const facing=id==='liman'||id==='tersane'?this.state.coastFacing[id]:undefined,key=buildingArtKey(name,level,facing)
    if(this.textures.exists(key)||this.loadingBuildingTextures.has(key))return
    this.loadingBuildingTextures.add(key)
    this.load.image(key,cityBuildingImage(name,level,facing,cityArtSize()))
    this.load.once(`filecomplete-image-${key}`,()=>this.loadingBuildingTextures.delete(key))
    this.load.once(Phaser.Loader.Events.COMPLETE,()=>{if(this.built){this.signature='';this.redraw()}})
    if(!this.load.isLoading())this.load.start()
  }
  create(){
    this.cameras.main.setBackgroundColor('#969b60')
    for(const tile of terrainTiles)this.add.image(tile.left,tile.top,`parcel-terrain-${tile.id}`).setOrigin(0).setDisplaySize(tile.width,tile.height).setDepth(-1000)
    this.flagField=new FlagField(this);this.flagField.setLook(this.sceneBanner())
    this.smoke=new SmokeField(this);this.sky=new SkyLayer(this,PARCEL_WORLD)
    this.makeContactTexture()
    this.built=true;this.maxZoom=2.2;this.setupCamera();this.installCamera();this.addParcelLife();this.redraw()
    // Fixture-only control makes maximum-zoom regressions reviewable in the
    // real scene without exposing extra controls to players.
    if(localStorage.getItem('payitaht-qa')==='1'){
      const reviewCamera=(event:Event)=>{
        const {x,y,zoom}=(event as CustomEvent<{x:number;y:number;zoom:number}>).detail
        if(![x,y,zoom].every(Number.isFinite))return
        this.cameras.main.setZoom(Phaser.Math.Clamp(zoom,this.minZoom,this.maxZoom))
        this.centerInBand(x,y);this.velocity={x:0,y:0};this.markReady()
      }
      document.addEventListener('payitaht-qa-camera',reviewCamera)
      this.events.once('shutdown',()=>document.removeEventListener('payitaht-qa-camera',reviewCamera))
    }
    const cleanup=()=>{
      this.built=false
      this.clearWallTextures()
      const target=Phaser.GameObjects.Graphics.TargetCamera
      if(target.scene===this){target.destroy();Object.assign(Phaser.GameObjects.Graphics,{TargetCamera:new Phaser.Cameras.Scene2D.BaseCamera(0,0,0,0)})}
      delete document.documentElement.dataset.cityReady;delete document.documentElement.dataset.cityLayer
    }
    this.events.once('shutdown',cleanup);this.events.once('destroy',cleanup)
    this.events$.onReady?.()
  }
  worldRect(){return PARCEL_WORLD}
  townRect(){return {x:300,y:250,w:2600,h:1350}}
  townZoom(){
    const cam=this.cameras.main
    return parcelCityZoom(cam.width,cam.height,PARCEL_WORLD,PARCEL_PLOTS[0].center.y)
  }
  coverZoom(){
    const cam=this.cameras.main
    return Math.max(cam.width/PARCEL_WORLD.w,cam.height/PARCEL_WORLD.h)
  }
  cityViewport(){
    const canvas=this.game.canvas.getBoundingClientRect(),top=document.querySelector('.ika-top')?.getBoundingClientRect(),nav=document.querySelector('.ika-nav')?.getBoundingClientRect()
    const scale=this.scale.height/Math.max(1,canvas.height)
    return parcelCameraViewport(this.scale.width,this.scale.height,
      top?(top.bottom-canvas.top)*scale:undefined,nav?(nav.top-canvas.top)*scale:undefined)
  }
  setupCamera(){
    const cam=this.cameras.main
    const layout=()=>{
      const v=this.cityViewport()
      cam.setViewport(v.x,v.y,v.width,v.height)
      cam.setBounds(0,0,PARCEL_WORLD.w,PARCEL_WORLD.h)
      this.minZoom=this.coverZoom();this.cityZoom=this.townZoom()
      this.setCityView()
    }
    layout()
    // Measure after React/HUD fonts settle as well as after orientation changes.
    this.time.delayedCall(0,layout)
    const observer=new ResizeObserver(()=>{if(this.built)layout()})
    for(const node of document.querySelectorAll('.ika-top,.ika-nav'))observer.observe(node)
    this.scale.on('resize',layout)
    this.events.once('shutdown',()=>{observer.disconnect();this.scale.off('resize',layout)})
  }
  centerInBand(x:number,y:number){this.cameras.main.centerOn(x,y)}
  setCityView(){
    this.cameras.main.setZoom(Phaser.Math.Clamp(this.cityZoom,this.minZoom,this.maxZoom))
    const p=PARCEL_PLOTS[0]
    this.centerInBand(p.center.x,p.center.y);this.velocity={x:0,y:0}
  }
  setOverview(){this.cameras.main.setZoom(this.minZoom);this.centerInBand(PARCEL_WORLD.w/2,PARCEL_WORLD.h/2);this.velocity={x:0,y:0}}
  focusHarbour(){
    const plots=[parcelPlot(this.state.placement.liman),parcelPlot(this.state.placement.tersane)].filter((p):p is CityParcel=>!!p)
    const xs=(plots.length?plots:PARCEL_PLOTS.slice(25,28)).map(p=>p.center.x)
    this.cameras.main.setZoom(Math.max(this.minZoom,Math.min(this.maxZoom,this.scale.width/(Math.max(...xs)-Math.min(...xs)+660))))
    this.centerInBand((Math.min(...xs)+Math.max(...xs))/2,1570);this.velocity={x:0,y:0}
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
    this.clearWallTextures()
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
    g.fillStyle(p.index===28?0x302f28:p.slot.zone==='liman'?0x387b9c:0xa03431).fillTriangle(p.center.x+2,p.center.y-58,p.center.x+35,p.center.y-49,p.center.x+2,p.center.y-38)
    this.pieces.push(g)
    if(this.placing)this.parcelFrame(p,0xe8ce93)
    const hit=this.parcelHit(p).setDepth(p.center.y+2)
    hit.on('pointerup',(pointer:Phaser.Input.Pointer)=>{if(isTap(pointer)&&!this.moving&&!this.pinchStart)this.events$.onPlot(p.index)})
    this.pieces.push(hit)
  }
  drawParcelBuilding(id:BuildingId,p:CityParcel,active:boolean){
    const level=this.state.buildings[id],facing=id==='liman'||id==='tersane'?this.state.coastFacing[id]:undefined
    const variant=parcelBuildingName(id,p.index)
    const key=level>0?buildingArtKey(variant,level,facing):'b_site'
    if(!this.textures.exists(key)){if(level>0)this.ensureBuildingTexture(id,level);return}
    const source=this.textures.get(key).getSourceImage() as HTMLImageElement,size:ArtSize=level>0?cityArtSize():'full'
    const name=level>0?(facing==='straight'?variant+'-duz':variant):'__site',flip=facing?facing==='right':this.state.flips.includes(id)
    const outline=cityArtOutline(name,level,size)||[{x:0,y:0},{x:1,y:0},{x:1,y:1},{x:0,y:1}]
    const f=cityBuildingArtFrame(name,p,source.width,source.height,outline,flip)
    if(f.width<=0||f.height<=0)return
    if(p.index<25)this.drawContactShade(p,f.groundPolygon)
    const image=this.add.image(f.x,f.y,key).setDisplaySize(f.width,f.height).setFlipX(flip).setDepth(p.center.y+1)
    image.setData('parcelIndex',p.index).setData('parcelBuilding',id).setData('parcelOutline',f.polygon).setData('parcelGround',f.groundPolygon)
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
  makeContactTexture(){
    const texture=this.textures.createCanvas('parcel-contact-shade',96,96)
    if(!texture)return
    const ctx=texture.context
    const shade=ctx.createRadialGradient(48,48,17,48,48,48)
    shade.addColorStop(0,'rgba(53,41,19,0.46)')
    shade.addColorStop(.58,'rgba(53,41,19,0.24)')
    shade.addColorStop(1,'rgba(53,41,19,0)')
    ctx.fillStyle=shade
    ctx.fillRect(0,0,96,96)
    texture.refresh()
  }
  drawContactShade(p:CityParcel,ground:ParcelPoint[]){
    const xs=ground.map(q=>q.x),ys=ground.map(q=>q.y)
    const x=(Math.min(...xs)+Math.max(...xs))/2+3
    const y=(Math.min(...ys)+Math.max(...ys))/2+3
    const w=Math.max(...xs)-Math.min(...xs)+24,h=Math.max(...ys)-Math.min(...ys)+16
    for(const factor of [1,.87,.72]){
      const points=Array.from({length:12},(_,i)=>{
        const angle=i*Math.PI/6
        return {x:x+Math.cos(angle)*w*factor/2,y:y+Math.sin(angle)*h*factor/2}
      })
      if(!points.every(q=>parcelContainsPoint(p,q,2))||!buildingRoadClear(points,18))continue
      this.pieces.push(this.add.image(x,y,'parcel-contact-shade').setDisplaySize(w*factor,h*factor).setDepth(p.center.y-.1))
      return
    }
  }
  wallTap(image:Phaser.GameObjects.Image){
    image.setInteractive({pixelPerfect:true,alphaTolerance:88,useHandCursor:true})
    image.on('pointerup',(pointer:Phaser.Input.Pointer)=>{
      if(isTap(pointer)&&!this.moving&&!this.pinchStart)this.events$.onBuilding('surlar')
    })
    this.pieces.push(image)
  }
  drawParcelWallSpan(span:WallSpan,height:number){
    const {start,end,backStart,backEnd}=span
    // The visible stone face is the side closest to the camera. Consecutive
    // sections use the same back vertices, including where the wall turns.
    const innerFace=start.y+end.y>=backStart.y+backEnd.y
    const [a,b,c,d]=innerFace?[start,end,backEnd,backStart]:[backStart,backEnd,end,start]
    const dx=b.x-a.x,dy=b.y-a.y,length=Math.hypot(dx,dy)
    const corners=[a,b,c,d]
    const left=Math.floor(Math.min(...corners.map(q=>q.x)))-3
    const top=Math.floor(Math.min(...corners.map(q=>q.y))-height-16)
    const width=Math.ceil(Math.max(...corners.map(q=>q.x)))-left+17
    const canvasHeight=Math.ceil(Math.max(...corners.map(q=>q.y)))-top+13
    const key=`parcel-wall-face-${this.sys.settings.key}-${this.wallTextureKeys.length}`
    const texture=this.textures.createCanvas(key,width*2,canvasHeight*2)
    if(!texture)return
    this.wallTextureKeys.push(key)
    const ctx=texture.context
    const stone=this.textures.get('parcel-wall-masonry').getSourceImage() as HTMLImageElement
    ctx.scale(2,2);ctx.translate(-left,-top)

    const shape=(points:ParcelPoint[],fill?:string|CanvasGradient)=>{
      ctx.beginPath();ctx.moveTo(points[0].x,points[0].y)
      for(const point of points.slice(1))ctx.lineTo(point.x,point.y)
      ctx.closePath()
      if(fill){ctx.fillStyle=fill;ctx.fill()}
    }
    const base=(a.y+b.y)/2
    ctx.save()
    ctx.translate(a.x,a.y)
    ctx.transform(dx/length,dy/length,0,1,0,0)
    const shadow=ctx.createLinearGradient(0,0,0,11)
    shadow.addColorStop(0,'rgba(49,38,19,0.30)')
    shadow.addColorStop(1,'rgba(49,38,19,0)')
    ctx.fillStyle=shadow
    ctx.fillRect(0,0,length,11)
    const repeat=height*3.6
    for(let x=0;x<length;x+=repeat){
      const take=Math.min(repeat,length-x)
      ctx.drawImage(stone,0,0,stone.width*take/repeat,stone.height,x,-height,take,height)
    }
    const shade=ctx.createLinearGradient(0,-height,0,0)
    shade.addColorStop(0,innerFace?'rgba(60,44,22,.10)':'rgba(123,91,38,.02)')
    shade.addColorStop(.68,'rgba(68,51,20,.04)')
    shade.addColorStop(1,'rgba(52,45,17,.42)')
    ctx.fillStyle=shade;ctx.fillRect(0,-height,length,height)
    ctx.restore()

    const lift=(point:ParcelPoint,amount=height)=>({x:point.x,y:point.y-amount})
    const cap=[a,b,c,d].map(q=>lift(q))
    shape(cap,'#af9870')
    // Lay stone texture onto the horizontal patrol walk, clipped at the bend.
    ctx.save();shape(cap);ctx.clip()
    ctx.translate(a.x,a.y-height)
    ctx.transform(dx/length,dy/length,(d.x-a.x+c.x-b.x)/2,(d.y-a.y+c.y-b.y)/2,0,0)
    ctx.globalAlpha=.62
    ctx.drawImage(stone,0,stone.height*.4,stone.width,stone.height*.22,0,-.5,length,2)
    ctx.restore()

    // Short merlons are small solid blocks with a lit top and a shaded flank.
    const at=(u:number,v:number,z:number)=>({
      x:a.x+dx*u+((d.x-a.x)*(1-u)+(c.x-b.x)*u)*v,
      y:a.y+dy*u+((d.y-a.y)*(1-u)+(c.y-b.y)*u)*v-height-z,
    })
    const toothHeight=height*.21
    for(let x=11;x+13<length-5;x+=27){
      const u=x/length,v=(x+12)/length
      const nearA=at(u,0,0),nearB=at(v,0,0),farB=at(v,.52,0)
      const topA=lift(nearA,toothHeight),topB=lift(nearB,toothHeight),topFar=lift(farB,toothHeight)
      shape([nearA,nearB,topB,topA],innerFace?'#a18c65':'#b39d75')
      shape([nearB,farB,topFar,topB],'#796649')
      shape([topA,topB,topFar,at(u,.52,toothHeight)],'#ccba92')
    }
    texture.refresh()
    this.wallTap(this.add.image(left,top,key).setOrigin(0).setDisplaySize(width,canvasHeight).setDepth(base+1))
  }
  drawParcelWallTower(x:number,y:number,height:number){
    const source=this.textures.get('parcel-wall-tower').getSourceImage() as HTMLImageElement
    const h=height*1.26
    this.pieces.push(this.add.image(x+5,y+4,'parcel-contact-shade').setDisplaySize(h*1.42,h*.58).setDepth(y-1))
    this.wallTap(this.add.image(x,y+10,'parcel-wall-tower').setOrigin(.5,.96)
      .setDisplaySize(h*source.width/source.height,h).setDepth(y+5))
  }
  clearWallTextures(){
    for(const key of this.wallTextureKeys)this.textures.remove(key)
    this.wallTextureKeys=[]
  }
  drawParcelWalls(){
    const level=this.state.buildings.surlar
    const {spans,gates,towers}=CITY_WALL_PLAN,north=gates[0]
    const tier=level>=12?3:level>=5?2:1
    const height=28+tier*6+Math.min(level,20)*.32
    if(level>0){
      for(const span of spans)this.drawParcelWallSpan(span,height)
      for(const point of towers)this.drawParcelWallTower(point.x,point.y,height)
      for(const gate of gates){
        if(!gate.arch)continue
        const source=this.textures.get('parcel-wall-gate').getSourceImage() as HTMLImageElement
        const w=Math.abs(gate.right.x-gate.left.x)+47
        const h=w*source.height/source.width
        // The diagonal is painted into the cutout. Keep both the wall footing
        // and the open archway in their original perspective.
        this.wallTap(this.add.image(gate.center.x,gate.center.y+3,'parcel-wall-gate').setOrigin(.5,.78)
          .setDisplaySize(w,h).setDepth(gate.center.y+7))
      }
      if(this.showLabels)this.pieces.push(this.makePaintedLabel(north.center.x,north.center.y-height-48,level,BUILDINGS.surlar.name,1e6))
    }else{
      // Before construction, only the northern foundation is marked; no ghost wall.
      const site=this.add.graphics().setDepth(north.center.y)
      site.fillStyle(0x765538,.72).fillEllipse(north.center.x,north.center.y+3,95,20)
      site.fillStyle(0xc1ad84,1).fillRect(north.center.x-26,north.center.y-18,23,19)
      site.fillStyle(0xe0cfac,1).fillRect(north.center.x+8,north.center.y-23,27,24)
      this.pieces.push(site)
    }
    if(level===0){
      const gate=north
      const hit=this.add.rectangle(gate.center.x,gate.center.y-height*.55,132,height+80,0xffffff,0)
        .setInteractive({useHandCursor:true}).setDepth(gate.center.y+8)
      hit.on('pointerup',(pointer:Phaser.Input.Pointer)=>{
        if(isTap(pointer)&&!this.moving)this.events$.onBuilding('surlar')
      })
      this.pieces.push(hit)
    }
    const job=activeJob(this.state)
    if(job?.id==='surlar')this.pieces.push(this.makeTimer(north.center.x,north.center.y+55,job.start,job.end,1e6+north.center.y))
  }
  drawParcelSiege(){
    if(this.siege.occupation){
      const p=PARCEL_PLOTS[0];this.smoke?.addSource(p.center.x+180,p.center.y,'pieces',.8,0x504736)
      this.flagField?.add({x:p.center.x+180,y:p.center.y-95,w:55,h:40,depth:p.center.y+8,dir:1},'pieces')
    }
    if(this.siege.blockade||this.raidWanted)for(const x of [1460,1780,2100]){
      const ship=this.add.image(x,1780,'parcel-ship-b').setDepth(1780).setTint(0xcc9990);ship.setScale(160/ship.width);this.pieces.push(ship)
    }
  }
  addParcelLife(){
    for(const [i,x] of [1460,1780,2100].entries()){
      const ship=this.add.image(x,1770+i*20,i===2?'parcel-fishing':'parcel-ship-a').setDepth(1800);ship.setScale((i===2?90:140)/ship.width)
      this.tweens.add({targets:ship,y:ship.y+5,angle:1.2,duration:2600+i*300,yoyo:true,repeat:-1});this.ships.push(ship)
    }
    for(let i=0;i<8;i++){
      const image=this.add.image(0,0,'parcel-citizen').setOrigin(.5,1).setDisplaySize(9,23)
      this.people.push({image,points:CITY_ROADS[i%CITY_ROADS.length],t:i/8})
    }
  }
  setRaidAlert(on:boolean){if(this.raidWanted===on)return;this.raidWanted=on;if(this.built)this.redraw()}
  fxSail(){if(!this.built)return;const ship=this.add.image(1000,1660,'parcel-ship-a').setDepth(1800);ship.setScale(140/ship.width);this.tweens.add({targets:ship,y:1970,alpha:0,duration:3200,onComplete:()=>ship.destroy()})}
  fxMarch(){if(!this.built)return;const road=CITY_ROADS[1];for(let i=0;i<5;i++){
    const figure=this.add.image(road[5].x-i*6,road[5].y,'parcel-citizen').setOrigin(.5,1).setDisplaySize(10,25).setDepth(road[5].y)
    this.tweens.chain({targets:figure,tweens:road.slice(0,5).reverse().map(p=>({x:p.x,y:p.y,duration:700+i*20})),onComplete:()=>figure.destroy()})
  }}
  update(time:number,delta:number){
    super.update(time,delta)
    for(const p of this.people){
      p.t=(p.t+Math.min(delta,100)/1000*.012)%2
      const t=(p.t<=1?p.t:2-p.t)*(p.points.length-1),i=Math.min(p.points.length-2,Math.floor(t)),a=p.points[i],b=p.points[i+1]
      p.image.setPosition(a.x+(b.x-a.x)*(t-i),a.y+(b.y-a.y)*(t-i)).setDepth(p.image.y).setFlipX(p.t>1)
    }
  }
  markReady(){
    if(!this.built||this.load.isLoading()||this.loadingBuildingTextures.size)return
    this.game.events.once(Phaser.Core.Events.POST_RENDER,()=>{
      if(!this.built)return
      document.documentElement.dataset.cityReady=String(++this.readyCount)
      document.documentElement.dataset.cityLayer='painted-town-v2'
      if(localStorage.getItem('payitaht-qa')==='1')document.documentElement.dataset.parcelReview=JSON.stringify(this.pieces.filter(p=>p.getData('parcelBuilding')).map(p=>({id:p.getData('parcelBuilding'),index:p.getData('parcelIndex'),outline:p.getData('parcelOutline'),ground:p.getData('parcelGround'),boundary:PARCEL_PLOTS[p.getData('parcelIndex')].polygon})))
    })
  }
}
