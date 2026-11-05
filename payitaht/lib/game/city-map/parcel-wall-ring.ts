import type { ParcelPoint } from './parcel-city'

export type WallSpan = {
  start: ParcelPoint
  end: ParcelPoint
  backStart: ParcelPoint
  backEnd: ParcelPoint
}

const worldPoint = ([x,y]: readonly [number,number]):ParcelPoint => ({x:x*2,y:y*2})
const distance = (a:ParcelPoint,b:ParcelPoint) => Math.hypot(b.x-a.x,b.y-a.y)
const midpoint = (a:ParcelPoint,b:ParcelPoint) => ({x:(a.x+b.x)/2,y:(a.y+b.y)/2})

export function wallDistanceToSegment(point:ParcelPoint,a:ParcelPoint,b:ParcelPoint){
  const dx=b.x-a.x,dy=b.y-a.y
  const t=Math.max(0,Math.min(1,((point.x-a.x)*dx+(point.y-a.y)*dy)/(dx*dx+dy*dy||1)))
  const nearest={x:a.x+dx*t,y:a.y+dy*t}
  return {distance:distance(point,nearest),t,nearest}
}

// The boundary is traced on the actual 1586×992 terrain reference. Openings
// are measured separately at roads and the stream; the sea stays unfortified.
const landRuns = [
  [[190,701],[147,676],[131,635],[135,599],[119,549],[131,482],[142,444]],
  [[153,393],[137,354],[175,300],[231,261],[252,227],[299,199],[365,157]],
  [[428,141],[484,113],[534,118],[587,104],[641,108],[699,101],[752,109],[803,96],
   [854,106],[910,103],[958,112],[1016,103],[1071,108],[1115,94]],
  [[1221,112],[1273,149],[1331,172],[1385,208],[1435,261],[1466,300],[1492,354],[1489,419]],
  [[1498,474],[1505,526],[1491,567],[1501,607]],
  [[1505,659],[1483,708],[1456,745]],
] as const

const runs=landRuns.map(line=>line.map(worldPoint))
const last=(i:number)=>runs[i][runs[i].length-1]
const gates=[
  {name:'kuzey',left:last(1),right:runs[2][0],arch:true},
  {name:'dere',left:last(2),right:runs[3][0],arch:false},
  {name:'bati',left:last(0),right:runs[1][0],arch:false},
  {name:'dogu',left:last(3),right:runs[4][0],arch:false},
].map(gate=>({...gate,center:midpoint(gate.left,gate.right)}))

function offsetFromWall(a:ParcelPoint,b:ParcelPoint){
  const length=distance(a,b)
  return {x:(b.y-a.y)*17/length,y:(a.x-b.x)*10/length}
}

function toSpans(line:ParcelPoint[]):WallSpan[]{
  const offsets=line.slice(1).map((point,i)=>offsetFromWall(line[i],point))
  // Shared back vertices keep the wide top of the wall connected at bends.
  const back=line.map((point,i)=>{
    const before=offsets[Math.max(0,i-1)],after=offsets[Math.min(i,offsets.length-1)]
    const offset=midpoint(before,after)
    return {x:point.x+offset.x,y:point.y+offset.y}
  })
  return line.slice(1).map((end,i)=>({start:line[i],end,backStart:back[i],backEnd:back[i+1]}))
}

const spans=runs.flatMap(toSpans)
const towers=([
  [190,701],[131,635],[119,549],[142,444],[153,393],[175,300],[252,227],
  [534,118],[699,101],[854,106],[1016,103],
  [1331,172],[1435,261],[1492,354],[1489,419],[1498,474],
  [1491,567],[1501,607],[1505,659],[1456,745],
] as const).map(worldPoint)

export const CITY_WALL_PLAN={
  gates,spans,towers,
  waterfront:{start:last(runs.length-1),end:runs[0][0]},
}
