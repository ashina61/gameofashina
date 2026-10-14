/** Single camera contract for terrain, roads, sites and architecture. */
export const FOUNDATION = { tileW: 128, tileH: 64, site: 4, stride: 6, count: 5,
  maxHeight: 64, footprint: 3, originX: 2048, originY: 480, width: 4096, height: 3000 }
export type FoundationPoint = { x: number; y: number }
export type FoundationBuilding = 'divan' | 'kisla' | 'medrese'
export const FOUNDATION_NAMES: Record<FoundationBuilding,string> = { divan: 'Belediye', kisla: 'Kışla', medrese: 'Medrese' }
export function foundationProject(u: number, v: number, z = 0): FoundationPoint {
  return { x: FOUNDATION.originX + (u-v)*FOUNDATION.tileW/2, y: FOUNDATION.originY + (u+v)*FOUNDATION.tileH/2-z }
}
export function foundationInverse(p: FoundationPoint) {
  const a=(p.x-FOUNDATION.originX)/(FOUNDATION.tileW/2), b=(p.y-FOUNDATION.originY)/(FOUNDATION.tileH/2)
  return {u:(a+b)/2,v:(b-a)/2}
}
export function foundationRect(u0: number,v0: number,u1: number,v1: number) {
  return [[u0,v0],[u1,v0],[u1,v1],[u0,v1]].map(([u,v])=>foundationProject(u,v))
}
const cells=Array.from({length:25},(_,i)=>({row:Math.floor(i/5),col:i%5}))
const ordered=[cells[12],...cells.filter((_,i)=>i!==12)]
export const FOUNDATION_SITES=ordered.map(({row,col},index)=>{
  const u=3+col*6,v=3+row*6, center=foundationProject(u,v)
  return { index,row,col,u,v,center,polygon:foundationRect(u-2,v-2,u+2,v+2),width:512,height:256,fixed:index===0 }
})
export type FoundationSite=typeof FOUNDATION_SITES[number]
export const FOUNDATION_ROADS=Array.from({length:6},(_,i)=>i*6).flatMap(t=>[
  {axis:'u' as const,t,polygon:foundationRect(t-0.65,0,t+0.65,30)},
  {axis:'v' as const,t,polygon:foundationRect(0,t-0.65,30,t+0.65)},
])
export const FOUNDATION_INITIAL: Record<FoundationBuilding,number> = {
  divan:0, kisla:FOUNDATION_SITES.find(p=>p.row===2&&p.col===1)!.index,
  medrese:FOUNDATION_SITES.find(p=>p.row===1&&p.col===2)!.index,
}
export function foundationRoadAt(point: FoundationPoint) {
  const {u,v}=foundationInverse(point)
  return FOUNDATION_ROADS.some(r=>r.axis==='u'?v>=0&&v<=30&&Math.abs(u-r.t)<=0.65:u>=0&&u<=30&&Math.abs(v-r.t)<=0.65)
}
