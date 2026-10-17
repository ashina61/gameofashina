/** Geometry prototype. Roads, plots and architecture use this ONE camera.
 * World units remain 3D until projection; no image fitting, warp or ground plate. */
import {ART_FRAME} from './art.mjs'
export const CAMERA = Object.freeze({ x: [28, 14], y: [-28, 14], z: [0, -28] })
export const LOT = 12
export const project = ([x, y, z = 0]) => [(x-y)*28, (x+y)*14-z*28]
// Enlarge the complete 3D model uniformly; keep the plot and camera unchanged.
export const BARRACKS_SCALE = 1.13
export const barracksPoint = ([x,y,z=0]) => [6+(x-5.794)*BARRACKS_SCALE,6+(y-5.794)*BARRACKS_SCALE,z*BARRACKS_SCALE]
const palette={stone:['#e5d1a3','#dbc397','#d5bc8d','#cfb689','#e0c99d'],roof:['#aa4c31','#b95636','#c1643e','#b75032','#bd5a39']}
const hash=(x,y)=>{const a=Math.sin(x*127.1+y*311.7)*43758.5453;return a-Math.floor(a)}
const tone=(c,f)=>'#'+c.slice(1).match(/../g).map(h=>Math.max(0,Math.min(255,Math.round(parseInt(h,16)*f))).toString(16).padStart(2,'0')).join('')
export function barracks(){
 const faces=[]
 let layer=0
 function face(points,color,kind='architecture',stroke=null){faces.push({points,color,kind,stroke,layer,order:faces.length,depth:points.reduce((s,p)=>s+p[0]+p[1]+(p[2]||0),0)/points.length})}
 function box(x,y,w,d,h,color='#ddc699',z=0,stone=false){
  const A=[x,y,z+h],B=[x+w,y,z+h],C=[x+w,y+d,z+h],D=[x,y+d,z+h]
  face([[x+w,y,z],[x+w,y+d,z],C,B],tone(color,.75));face([[x,y+d,z],[x+w,y+d,z],C,D],tone(color,.94));face([A,B,C,D],tone(color,1.07))
  if(stone){
   for(let row=0;row<h/.28;row++){
    const z0=z+row*.28,z1=Math.min(z+h,z0+.265)
    for(let t=0;t<w;t+=.65){const a=x+t,b=Math.min(x+w,a+.63);face([[a,y+d+.003,z0],[b,y+d+.003,z0],[b,y+d+.003,z1],[a,y+d+.003,z1]],palette.stone[Math.floor(hash(a,row)*5)])}
    for(let t=0;t<d;t+=.65){const a=y+t,b=Math.min(y+d,a+.63);face([[x+w+.003,a,z0],[x+w+.003,b,z0],[x+w+.003,b,z1],[x+w+.003,a,z1]],tone(palette.stone[Math.floor(hash(a+8,row)*5)],.77))}
   }
  }
 }
 function beam(a,b,r=.045,color='#5a3d24'){
  const dx=b[0]-a[0],dy=b[1]-a[1],len=Math.hypot(dx,dy)||1,ox=-dy/len*r,oy=dx/len*r
  face([[a[0]-ox,a[1]-oy,a[2]],[a[0]+ox,a[1]+oy,a[2]],[b[0]+ox,b[1]+oy,b[2]],[b[0]-ox,b[1]-oy,b[2]]],color,'prop',tone(color,.7))
 }
 function roof(x,y,w,d,z,rise,alongX=true){
  const local=(u,v,h)=>alongX?[x+u*w,y+v*d,h]:[x+v*w,y+u*d,h]
  const n=alongX?Math.ceil(w/.24):Math.ceil(d/.24)
  for(const side of [0,1])for(let row=0;row<5;row++)for(let col=0;col<n;col++){
   const u=col/n,u1=(col+1)/n,v0=side? .5+row/10:.5-row/10,v1=side?.5+(row+1)/10:.5-(row+1)/10
   const h0=z+rise*(1-row/5),h1=z+rise*(1-(row+1)/5)
   face([local(u,v0,h0),local(u1,v0,h0),local(u1,v1,h1),local(u,v1,h1)],tone(palette.roof[Math.floor(hash(col,row+side*5)*5)],side?.96:1.1),'roof','#863c292c')
  }
  // Gable ends are part of the same model, rather than a flattened sprite.
  face([local(1,0,z),local(1,1,z),local(1,.5,z+rise)],'#bca477')
  beam(local(0,.5,z+rise+.025),local(1,.5,z+rise+.025),.04,'#d57b4d')
 }
 function door(x,y,w=.55,h=1.05,z=0){
  face([[x,y,z],[x+w,y,z],[x+w,y,z+h*.78],[x+w*.83,y,z+h*.96],[x+w*.5,y,z+h],[x+w*.17,y,z+h*.96],[x,y,z+h*.78]],'#493523')
  for(let a=.12;a<w;a+=.14)beam([x+a,y+.003,z+.04],[x+a,y+.003,z+h*.8],.007,'#7c5833')
  beam([x+.04,y+.005,z+.25],[x+w-.04,y+.005,z+.25],.016,'#b88b47')
 }
 function banner(x,y,z,w=.42,h=.78){
  face([[x,y,z],[x+w,y,z],[x+w,y,z-h+.12],[x+w/2,y,z-h],[x,y,z-h+.12]],'#8d2430')
  beam([x+.04,y+.005,z-.07],[x+w-.04,y+.005,z-.07],.012,'#ddb75e')
  // A spear and shield motif reads as military at small scale.
  beam([x+w/2,y+.01,z-.18],[x+w/2,y+.01,z-h+.19],.018,'#dfbb6a')
  face([[x+w*.5,y+.015,z-.3],[x+w*.72,y+.015,z-.4],[x+w*.5,y+.015,z-.58],[x+w*.28,y+.015,z-.4]],'#e6c677')
 }
 function hall(x,y,w,d,alongX=true){
  box(x,y,w,d,1.35,'#dbc598',0,true)
  box(x-.06,y-.06,w+.12,d+.12,.14,'#ae9469',1.32)
  roof(x-.13,y-.13,w+.26,d+.26,1.46,.73,alongX)
  if(alongX){for(let a=.4;a<w-.3;a+=1.15){door(x+a,y+d+.008,.5,.94);box(x+a-.08,y+d-.025,.66,.09,.07,'#ad9265',.99)}}
  else {for(let a=.5;a<d-.2;a+=1.2)face([[x+w+.01,y+a,.45],[x+w+.01,y+a+.35,.45],[x+w+.01,y+a+.35,1.05],[x+w+.01,y+a,1.05]],'#5d482e')}
 }
 // L-shaped dormitories leave a clear drill yard, rather than another palace.
 hall(3.0,3.0,7.7,2.05)
 layer=1
 hall(3.0,5.05,1.85,4.75,false)
 // Low enclosure meets the shared land. There is deliberately NO courtyard face.
 layer=4
 box(5.0,10.65,1.15,.22,.56,'#dac39b',0,true)
 box(7.55,10.65,3.25,.22,.56,'#dac39b',0,true)
 box(10.65,5.2,.22,4.0,.52,'#dac39b',0,true)
 for(const x of [5.0,5.94,7.55,8.7,10.6]){box(x,10.57,.27,.36,.72,'#e5cea2',0,true);box(x-.025,10.55,.32,.4,.08,'#f0dcb0',.72)}
 // Open gate: no platform or steps; land continues through the opening.
 for(const x of [6.13,7.28]){box(x,10.54,.25,.36,1.14,'#d9c093',0,true);box(x-.045,10.5,.34,.43,.12,'#ebd5a4',1.14)}
 // Watch post and unmistakable military flag.
 layer=6
 box(9.3,9.0,1.35,1.35,1.9,'#d6bd90',0,true)
 box(9.24,8.94,1.47,1.47,.13,'#b59a70',1.82)
 for(let i=0;i<3;i++)for(const [x,y] of [[9.3+i*.48,9],[9.3+i*.48,10.17],[9.3,9+i*.48],[10.17,9+i*.48]])box(x,y,.24,.24,.25,'#e3cd9f',1.95)
 door(9.72,10.358,.45,1.05)
 banner(9.75,10.363,1.68,.44,.55)
 beam([9.94,9.66,2.03],[9.94,9.66,3.02],.025,'#675032')
 face([[9.94,9.66,2.97],[10.82,9.66,2.83],[10.65,9.66,2.53],[9.94,9.66,2.65]],'#9e2930','prop')
 face([[10.15,9.665,2.81],[10.35,9.665,2.77],[10.27,9.665,2.64]],'#ecc772','prop')
 // Drill dummies and weapon racks, grounded at z=0.
 layer=2
 for(const [x,y] of [[6.0,7.0],[7.7,7.0],[6.0,8.7]]){
  box(x-.2,y-.17,.4,.34,.09,'#61452a')
  beam([x,y,.08],[x,y,1.1],.06,'#705132');beam([x-.33,y,.75],[x+.33,y,.75],.07,'#906c3e')
  box(x-.12,y-.1,.25,.2,.26,'#b28a50',.98)
  face([[x-.22,y+.12,.83],[x+.22,y+.12,.83],[x+.19,y+.12,.42],[x,y+.12,.28],[x-.19,y+.12,.42]],'#8e3330','prop','#c79f58')
 }
 for(let i=0;i<5;i++){
  const x=6.0+i*.21,y=5.6;beam([x,y,0],[x,y+.14,1.15],.018,'#6c492a')
  face([[x,y+.14,1.35],[x-.055,y+.14,1.15],[x+.055,y+.14,1.15]],'#9da6a1','prop')
 }
 box(5.8,5.7,1.4,.16,.13,'#70502c',.44)
 for(const x of [5.83,7.02])box(x,5.55,.1,.4,.72,'#795b37')
 box(8.65,5.6,.65,.55,.52,'#956e40');box(8.7,5.65,.55,.45,.07,'#b28c55',.52)
 banner(7.0,5.06,1.27,.48,.86)
 // Explicit painter layers for these non-intersecting building masses.
 // Whole roof surfaces follow their walls, avoiding centroid-sort artifacts.
 return faces.sort((a,b)=>a.layer-b.layer||a.order-b.order).map(f=>({...f,points:f.points.map(barracksPoint)}))
}

function polygon(ctx,points,color,stroke){ctx.beginPath();points.forEach((p,i)=>{const q=project(p);i?ctx.lineTo(...q):ctx.moveTo(...q)});ctx.closePath();ctx.fillStyle=color;ctx.fill();if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=.5;ctx.stroke()}}
export function drawArchitecture(ctx,faces=barracks()){
 for(const f of faces)polygon(ctx,f.points,f.color,f.stroke)
}
export function plotPolygon(x=0,y=0){return [[x,y,0],[x+LOT,y,0],[x+LOT,y+LOT,0],[x,y+LOT,0]]}
function ground(ctx,grass){
 polygon(ctx,[[-30,-30],[45,-30],[45,42],[-30,42]],grass?'#969b60':'#c9b17e')
 // One continuous land texture underneath roads and architecture.
 for(let x=-27;x<40;x+=.31)for(let y=-27;y<38;y+=.4){const h=hash(x,y);if(h<.58)continue;const q=project([x,y]);ctx.fillStyle=grass?(h>.9?'#c0bb7d72':'#626f3930'):(h>.9?'#ead5a479':'#a28c5924');ctx.fillRect(q[0],q[1],1+h*3,.6+h)}
}
export function road(ctx,x,y,w,d){
 polygon(ctx,[[x-.1,y-.1],[x+w+.1,y-.1],[x+w+.1,y+d+.1],[x-.1,y+d+.1]],'#a49d7e')
 polygon(ctx,[[x,y],[x+w,y],[x+w,y+d],[x,y+d]],'#d4cbb0')
 for(let row=0;row<d/.45;row++)for(let col=0;col<w/.75;col++){
  const xx=x+col*.75,yy=y+row*.45,ww=Math.min(.71,x+w-xx),dd=Math.min(.41,y+d-yy)
  if(ww>0&&dd>0)polygon(ctx,[[xx,yy],[xx+ww,yy],[xx+ww,yy+dd],[xx,yy+dd]],['#e7ddc0','#d9cdb0','#dfd3b6','#c7bda3'][Math.floor(hash(col,row)*4)])
 }
}
function emptyFlag(ctx,x,y){
 const q=project([x,y]);ctx.save();ctx.translate(...q)
 ctx.strokeStyle='#655a36';ctx.lineWidth=1.7;ctx.beginPath();ctx.moveTo(0,0);ctx.lineTo(0,-27);ctx.stroke()
 ctx.fillStyle='#9c3a34';ctx.beginPath();ctx.moveTo(1,-27);ctx.lineTo(18,-23);ctx.lineTo(1,-17);ctx.fill();ctx.restore()
}
export function tree(ctx,x,y,s=1){
 const [a,b]=project([x,y]);ctx.save();ctx.translate(a,b);ctx.scale(s,s)
 ctx.fillStyle='#41512b30';ctx.beginPath();ctx.ellipse(9,3,20,7,-.2,0,Math.PI*2);ctx.fill()
 ctx.fillStyle='#756044';ctx.fillRect(-2,-26,4,28)
 for(let i=0;i<12;i++){const px=(hash(i,x)-.5)*29,py=-16-hash(i,y)*24;ctx.fillStyle=['#5f7139','#788445','#8c9450','#687b3c'][i%4];ctx.beginPath();ctx.ellipse(px,py,10,9,0,0,Math.PI*2);ctx.fill()}
 ctx.restore()
}
export function scene(ctx,{width=1100,height=760,building=true,guides=false,grass=true,detail=true,artwork=null}={}){
 const ratio=Math.min(width/(detail?610:1550),height/(detail?440:940))
 const center=detail?[0,183]:[0,260]
 ctx.clearRect(0,0,width,height);ctx.fillStyle=grass?'#969b60':'#c9b17e';ctx.fillRect(0,0,width,height)
 ctx.save();ctx.translate(width/2,height/2);ctx.scale(ratio,ratio);ctx.translate(-center[0],-center[1])
 ground(ctx,grass)
 for(const t of [-1.8,12.25,26.3]){road(ctx,-16,t,46,1.25);road(ctx,t,-16,1.25,46)}
 const plots=[[0,0],[14.05,0],[0,14.05],[-14.05,0],[0,-14.05]]
 // Discreet corner stakes belong to empty land, never to the building texture.
 for(let i=0;i<plots.length;i++){
  const [x,y]=plots[i]
  if(i===0&&building)continue
  if(i===0||!detail){for(const p of plotPolygon(x+.35,y+.35).map((p,j)=>[p[0]-(j===1||j===2?.7:0),p[1]-(j>1?.7:0)])){const q=project(p);ctx.fillStyle='#98825b';ctx.fillRect(q[0]-1,q[1]-4,2,4)}emptyFlag(ctx,x+6,y+6)}
 }
 for(const [x,y,s] of [[-3,3,1.1],[3,-3,1],[14,11,.9],[11,14,1.05],[-3,10,.8],[10,-3,.85],[-6,-5,1.4],[-9,-4,1.3],[17,-3,1.1]])tree(ctx,x,y,s)
 if(building&&artwork){
  // The courtyard is real alpha: the continuous terrain below stays visible.
  ctx.drawImage(artwork,ART_FRAME.left,ART_FRAME.top,ART_FRAME.width,ART_FRAME.height)
 }else if(building){
  // Contact shadows are geometry on the shared land, never a filled plot.
  for(const [x,y,w,d] of [[3,3,7.7,2.05],[3,5.05,1.85,4.75],[9.3,9,1.35,1.35]]){
   polygon(ctx,[[x+.12,y+.18],[x+w+.21,y+.18],[x+w+.21,y+d+.28],[x+.12,y+d+.28]].map(barracksPoint),'#373e2c25')
  }
  drawArchitecture(ctx)
 }
 if(guides){
  ctx.strokeStyle='#fff0aa';ctx.lineWidth=1.4/ratio;ctx.setLineDash([6/ratio,4/ratio]);ctx.beginPath();plotPolygon().forEach((p,i)=>i?ctx.lineTo(...project(p)):ctx.moveTo(...project(p)));ctx.closePath();ctx.stroke();ctx.setLineDash([])
  ctx.lineWidth=.6/ratio;ctx.strokeStyle='#fff4bd40'
  for(let i=1;i<LOT;i++){for(const line of [[[i,0],[i,LOT]],[[0,i],[LOT,i]]]){ctx.beginPath();ctx.moveTo(...project(line[0]));ctx.lineTo(...project(line[1]));ctx.stroke()}}
 }
 ctx.restore()
 return {ratio,camera:CAMERA,plot:plotPolygon(),buildingFaces:building&&!artwork?barracks().length:0,artFrame:artwork?ART_FRAME:null}
}
