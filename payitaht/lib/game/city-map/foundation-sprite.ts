import type { FoundationPoint, FoundationSite } from './foundation-grid'

const det=(a:number[],b:number[],c:number[])=>a[0]*(b[1]*c[2]-b[2]*c[1])-a[1]*(b[0]*c[2]-b[2]*c[0])+a[2]*(b[0]*c[1]-b[1]*c[0])
/** Maximise ONE scale inside the diamond. Translation is solved alongside
 * scale; a wide entrance cannot be forced into the diamond's single tip. */
export function foundationSpriteFrame(site:FoundationSite,width:number,height:number,outline:FoundationPoint[]){
  const points=outline.map(q=>({x:(q.x-0.5)*width,y:(q.y-0.5)*height}))
  const constraints=site.polygon.map((a,i)=>{
    const b=site.polygon[(i+1)%site.polygon.length],dx=b.x-a.x,dy=b.y-a.y,l=Math.hypot(dx,dy),nx=-dy/l,ny=dx/l
    return {row:[nx,ny,Math.min(...points.map(q=>nx*q.x+ny*q.y))],value:nx*a.x+ny*a.y+2}
  })
  let best:{x:number;y:number;scale:number}|null=null
  for(let i=0;i<constraints.length;i++)for(let j=i+1;j<constraints.length;j++)for(let k=j+1;k<constraints.length;k++){
    const r=[constraints[i],constraints[j],constraints[k]],m=r.map(q=>q.row),v=r.map(q=>q.value),d=det(m[0],m[1],m[2])
    if(Math.abs(d)<1e-9)continue
    const x=det([v[0],m[0][1],m[0][2]],[v[1],m[1][1],m[1][2]],[v[2],m[2][1],m[2][2]])/d
    const y=det([m[0][0],v[0],m[0][2]],[m[1][0],v[1],m[1][2]],[m[2][0],v[2],m[2][2]])/d
    const scale=det([m[0][0],m[0][1],v[0]],[m[1][0],m[1][1],v[1]],[m[2][0],m[2][1],v[2]])/d
    if(scale<=0||constraints.some(q=>q.row[0]*x+q.row[1]*y+q.row[2]*scale<q.value-1e-7))continue
    if(!best||scale>best.scale)best={x,y,scale}
  }
  if(!best)throw new Error('No valid architecture placement')
  return {x:best.x,y:best.y,width:width*best.scale,height:height*best.scale,
    left:best.x-width*best.scale/2,top:best.y-height*best.scale/2,
    polygon:points.map(q=>({x:best.x+q.x*best.scale,y:best.y+q.y*best.scale}))}
}
