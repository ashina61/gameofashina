import * as Phaser from 'phaser'
import { asset } from '@/lib/asset'
import { FOUNDATION, FOUNDATION_SITES, FOUNDATION_ROADS, FOUNDATION_INITIAL, FOUNDATION_NAMES,
  foundationProject, foundationRect, foundationRoadAt, type FoundationBuilding, type FoundationSite } from '@/lib/game/city-map/foundation-grid'
import { foundationSpriteFrame } from '@/lib/game/city-map/foundation-sprite'
import artData from '@/lib/game/city-map/foundation-art.json'

type Art={width:number;height:number;outline:number[][]}
const ART=artData as Record<FoundationBuilding,Art>
const IDS: FoundationBuilding[]=['divan','kisla','medrese']

/** Isolated renderer pilot: no main-game saves or economy state are written. */
export class FoundationScene extends Phaser.Scene {
  placements={...FOUNDATION_INITIAL}
  selected: FoundationBuilding | null=null
  moving: FoundationBuilding | null=null
  guides=false
  pieces: Phaser.GameObjects.GameObject[]=[]
  onSelect: (id: FoundationBuilding|null)=>void=()=>{}
  onStatus: (value:string)=>void=()=>{}
  onReady: ()=>void=()=>{}
  rendered: Array<{id:string;index:number;polygon:Array<{x:number;y:number}>;width:number;height:number;sourceWidth:number;sourceHeight:number}>=[]
  drag: {x:number;y:number;scrollX:number;scrollY:number;moved:boolean}|null=null
  pinch: {distance:number;zoom:number}|null=null
  constructor(){super('foundation')}
  preload(){
    for(const id of IDS)this.load.image('foundation-'+id,asset('/images/game/foundation/v1/'+id+'.webp'))
    for(const id of ['grass','dirt','cobble','water-shallow'])this.load.image('foundation-'+id,asset('/images/game/terrain/'+id+'.webp'))
    for(const id of ['olive-tree','cypress','bush'])this.load.image('foundation-'+id,asset('/images/game/decor/'+id+'-sm.webp'))
  }
  create(){
    const cam=this.cameras.main;cam.setBackgroundColor('#206c77');cam.setBounds(0,0,FOUNDATION.width,FOUNDATION.height)
    this.add.tileSprite(0,0,FOUNDATION.width,FOUNDATION.height,'foundation-water-shallow').setOrigin(0).setTileScale(0.65).setDepth(-1000)
    this.add.tileSprite(0,0,FOUNDATION.width,2460,'foundation-grass').setOrigin(0).setTileScale(0.8).setTint(0xe4d8b8).setDepth(-950)
    const road=this.add.graphics().setDepth(-800)
    for(const r of FOUNDATION_ROADS){road.fillStyle(0x8c795c).fillPoints(r.polygon,true);road.lineStyle(3,0x78634b).strokePoints(r.polygon,true)}
    for(const r of FOUNDATION_ROADS){
      const a=r.axis==='u'?foundationProject(r.t,0):foundationProject(0,r.t)
      const b=r.axis==='u'?foundationProject(r.t,30):foundationProject(30,r.t)
      road.lineStyle(43,0xcbbb9b).lineBetween(a.x,a.y,b.x,b.y)
      road.lineStyle(1,0xdaceb4).lineBetween(a.x,a.y,b.x,b.y)
      for(let i=0.25;i<30;i+=0.5){
        const edge=r.axis==='u'?foundationRect(r.t-0.45,i,r.t+0.45,i+0.012):foundationRect(i,r.t-0.45,i+0.012,r.t+0.45)
        road.fillStyle(0x928269,0.28).fillPoints(edge,true)
      }
    }
    // Peripheral trees use the same plane; no road/site has scenery baked in.
    for(let i=0;i<60;i++){
      const x=100+(i*271)%3900,y=140+(i*83)%350
      if(FOUNDATION_SITES.some(p=>Math.abs(p.center.x-x)<310&&Math.abs(p.center.y-y)<190)||foundationRoadAt({x,y}))continue
      this.add.image(x,y,'foundation-'+(i%3?'olive-tree':'cypress')).setOrigin(0.5,1).setDisplaySize(i%3?114:66,i%3?100:148).setDepth(y)
    }
    this.makePad();this.redraw();this.focusPilot()
    this.input.addPointer(1)
    this.input.on('pointerdown',(p:Phaser.Input.Pointer)=>{this.drag={x:p.x,y:p.y,scrollX:cam.scrollX,scrollY:cam.scrollY,moved:false}})
    this.input.on('pointermove',(p:Phaser.Input.Pointer)=>{
      const a=this.input.pointer1,b=this.input.pointer2
      if(a.isDown&&b.isDown){
        const distance=Phaser.Math.Distance.Between(a.x,a.y,b.x,b.y)
        if(!this.pinch)this.pinch={distance,zoom:cam.zoom}
        cam.setZoom(Phaser.Math.Clamp(this.pinch.zoom*distance/Math.max(1,this.pinch.distance),this.minZoom(),1.7));if(this.drag)this.drag.moved=true
      }else if(p.isDown&&this.drag){
        const dx=p.x-this.drag.x,dy=p.y-this.drag.y
        if(Math.hypot(dx,dy)>8)this.drag.moved=true
        cam.setScroll(this.drag.scrollX-dx/cam.zoom,this.drag.scrollY-dy/cam.zoom)
      }
    })
    this.input.on('pointerup',(p:Phaser.Input.Pointer)=>{
      if(this.drag&&!this.drag.moved&&!this.pinch){
        const q=cam.getWorldPoint(p.x,p.y),site=FOUNDATION_SITES.find(s=>Phaser.Geom.Polygon.Contains(new Phaser.Geom.Polygon(s.polygon),q.x,q.y))
        if(site)this.tapSite(site)
      }
      this.drag=null;this.pinch=null
    })
    this.input.on('wheel',(_p:Phaser.Input.Pointer,_o:unknown,_x:number,y:number)=>this.zoomBy(y<0?1.12:1/1.12))
    const record=()=>{document.documentElement.dataset.foundationCamera=JSON.stringify({x:cam.worldView.x,y:cam.worldView.y,zoom:cam.zoom});document.documentElement.dataset.foundationGeometry=JSON.stringify({sites:FOUNDATION_SITES,roads:FOUNDATION_ROADS,buildings:this.rendered,placements:this.placements})}
    this.game.events.on(Phaser.Core.Events.POST_RENDER,record)
    this.events.once(Phaser.Scenes.Events.SHUTDOWN,()=>{this.game.events.off(Phaser.Core.Events.POST_RENDER,record);delete document.documentElement.dataset.foundationGeometry;delete document.documentElement.dataset.foundationCamera})
    this.onStatus('Şehri sürükle; bir yapıya dokun.')
    this.onReady()
  }
  makePad(){
    if(this.textures.exists('foundation-pad'))return
    const t=this.textures.createCanvas('foundation-pad',1024,512)!,ctx=t.context
    ctx.beginPath();ctx.moveTo(512,0);ctx.lineTo(1024,256);ctx.lineTo(512,512);ctx.lineTo(0,256);ctx.closePath();ctx.clip()
    const dirt=this.textures.get('foundation-dirt').getSourceImage() as HTMLImageElement
    const pattern=ctx.createPattern(dirt,'repeat');if(pattern){ctx.fillStyle=pattern;ctx.fillRect(0,0,1024,512)}
    ctx.fillStyle='rgba(213,195,151,0.35)';ctx.fillRect(0,0,1024,512)
    t.refresh()
  }
  redraw(){
    for(const p of this.pieces)p.destroy();this.pieces=[];this.rendered=[]
    const add=(p:Phaser.GameObjects.GameObject)=>{this.pieces.push(p);return p}
    for(const site of FOUNDATION_SITES){
      const p=this.add.image(site.center.x,site.center.y,'foundation-pad').setDisplaySize(site.width,site.height).setDepth(-600);add(p)
      const border=this.add.graphics().setDepth(-599);border.lineStyle(2,0x9c8866,0.55).strokePoints(site.polygon,true);add(border)
      const id=IDS.find(b=>this.placements[b]===site.index)
      if(!id){
        const q=foundationProject(site.u-1.2,site.v+1.1)
        add(this.add.image(q.x,q.y,'foundation-bush').setOrigin(0.5,1).setDisplaySize(52,34).setDepth(q.y))
      }else{
        const meta=ART[id],outline=meta.outline.map(([x,y])=>({x,y}))
        const frame=foundationSpriteFrame(site,meta.width,meta.height,outline)
        // Contact shadow is a shared world layer, not part of the sprite ground.
        const shadow=this.add.graphics().setDepth(site.center.y-1)
        shadow.fillStyle(0x423625,0.12).fillPoints(foundationRect(site.u-1.1,site.v-1.1,site.u+1.2,site.v+1.2),true);add(shadow)
        add(this.add.image(frame.x,frame.y,'foundation-'+id).setDisplaySize(frame.width,frame.height).setDepth(site.center.y+1))
        this.rendered.push({id,index:site.index,polygon:frame.polygon,width:frame.width,height:frame.height,sourceWidth:meta.width,sourceHeight:meta.height})
      }
      if(this.guides||id===this.selected){
        const g=this.add.graphics().setDepth(site.center.y+2);g.lineStyle(id===this.selected?5:2,id===this.selected?0xe6bd57:0x518770,0.85).strokePoints(site.polygon,true);add(g)
      }
    }
  }
  tapSite(site:FoundationSite){
    const occupant=IDS.find(id=>this.placements[id]===site.index)
    if(this.moving){
      if(site.fixed||occupant){this.onStatus('Bu arsa dolu; boş bir arsa seç.');return}
      this.placements[this.moving]=site.index;this.selected=this.moving;this.moving=null;this.redraw();this.onSelect(this.selected);this.onStatus('Yapı yeni arsaya yerleşti.');return
    }
    this.selected=occupant??null;this.redraw();this.onSelect(this.selected)
    this.onStatus(occupant?FOUNDATION_NAMES[occupant]:'Boş arsa')
  }
  select(id:FoundationBuilding){this.selected=id;this.moving=null;this.redraw();this.onSelect(id);this.focusBuilding(id)}
  moveSelected(){if(!this.selected||this.selected==='divan')return;this.moving=this.selected;this.onStatus('Boş bir arsaya dokun.');this.overview()}
  toggleGuides(){this.guides=!this.guides;this.redraw()}
  minZoom(){return Math.min(this.scale.width/FOUNDATION.width,this.scale.height/FOUNDATION.height)*0.95}
  zoomBy(f:number){const c=this.cameras.main;const x=c.midPoint.x,y=c.midPoint.y;c.setZoom(Phaser.Math.Clamp(c.zoom*f,this.minZoom(),1.7));c.centerOn(x,y)}
  fit(x:number,y:number,width:number,height:number){const c=this.cameras.main;c.setZoom(Math.max(this.minZoom(),Math.min(this.scale.width/width,this.scale.height/height)));c.centerOn(x,y)}
  focusPilot(){this.fit(2048,1390,1480,1130)}
  focusBuilding(id:FoundationBuilding){const p=FOUNDATION_SITES[this.placements[id]];this.fit(p.center.x,p.center.y,760,620)}
  overview(){this.fit(2048,1480,4300,3100)}
  reset(){this.placements={...FOUNDATION_INITIAL};this.selected=null;this.moving=null;this.redraw();this.onSelect(null);this.focusPilot();this.onStatus('İlk yerleşim.')}
}
