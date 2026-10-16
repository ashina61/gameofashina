import type { MasterPlot } from './master-projection'

type Point = { x: number; y: number }
export const CUTOUT_TRIANGLES = [[0, 1, 2], [0, 2, 3]] as const

/** The source already has a trapezoid silhouette. Mapping its rectangular
 * canvas would apply the perspective twice; shrinking it leaves a border.
 * Find a four-edge envelope containing every visible pixel, then map those
 * same four edges to the parcel. There is no opaque ground underneath. */
export function masterCutoutQuad(p: MasterPlot, outline: Point[], flip = false) {
  const points = outline.map(q => ({ x: flip ? 1 - q.x : q.x, y: q.y }))
  const left = Math.min(...points.map(q => q.x)), right = Math.max(...points.map(q => q.x))
  const top = Math.min(...points.map(q => q.y)), bottom = Math.max(...points.map(q => q.y))
  let topLeft = right, topRight = left
  for (const q of points) {
    const t = (q.y - top) / (bottom - top)
    if (t >= 1 - 1e-10) continue
    topLeft = Math.min(topLeft, (q.x - left * t) / (1 - t))
    topRight = Math.max(topRight, (q.x - right * t) / (1 - t))
  }
  const source = [{x:topLeft,y:top},{x:topRight,y:top},{x:right,y:bottom},{x:left,y:bottom}]
  const uv = source.map(q => ({x:flip ? 1-q.x : q.x,y:q.y}))
  return { source, uv, target: p.polygon }
}

/** Shared affine triangle math for Canvas fallback and geometry QA. */
export function cutoutTriangleMatrix(source: Point[], target: Point[], indices: readonly number[]) {
  const [a,b,c] = indices.map(i => source[i]), [d,e,f] = indices.map(i => target[i])
  const den = (b.x-a.x)*(c.y-a.y)-(c.x-a.x)*(b.y-a.y)
  const ax = ((e.x-d.x)*(c.y-a.y)-(f.x-d.x)*(b.y-a.y))/den
  const bx = ((f.x-d.x)*(b.x-a.x)-(e.x-d.x)*(c.x-a.x))/den
  const ay = ((e.y-d.y)*(c.y-a.y)-(f.y-d.y)*(b.y-a.y))/den
  const by = ((f.y-d.y)*(b.x-a.x)-(e.y-d.y)*(c.x-a.x))/den
  return [ax,ay,bx,by,d.x-ax*a.x-bx*a.y,d.y-ay*a.x-by*a.y] as const
}

export function mapCutoutPoint(source: Point[], target: Point[], q: Point) {
  const [a,b,c,d,e,f,g,h] = quadMatrix(source)
  const ax=a-q.x*g, bx=b-q.x*h, ay=d-q.y*g, by=e-q.y*h
  const den=ax*by-bx*ay, x=q.x-c, y=q.y-f
  return quadPoint(target,(x*by-bx*y)/den,(ax*y-x*ay)/den)
}

function quadMatrix(q: Point[]) {
  const [a,b,c,d]=q, dx1=b.x-c.x, dx2=d.x-c.x, dx3=a.x-b.x+c.x-d.x
  const dy1=b.y-c.y, dy2=d.y-c.y, dy3=a.y-b.y+c.y-d.y
  const den=dx1*dy2-dx2*dy1
  const g=(dx3*dy2-dx2*dy3)/den, h=(dx1*dy3-dx3*dy1)/den
  return [b.x-a.x+g*b.x,d.x-a.x+h*d.x,a.x,b.y-a.y+g*b.y,d.y-a.y+h*d.y,a.y,g,h] as const
}
function quadPoint(q: Point[], u: number, v: number) {
  const [a,b,c,d,e,f,g,h]=quadMatrix(q), den=g*u+h*v+1
  return {x:(a*u+b*v+c)/den,y:(d*u+e*v+f)/den}
}

/** Subdivide the projective mapping so roof lines do not kink at the two
 * large affine triangles used by ordinary parcel paintings. */
export function cutoutQuadMesh(source: Point[], target: Point[], steps=8) {
  const uv: Point[]=[], vertices: Point[]=[], indices: number[]=[]
  for(let y=0;y<=steps;y++)for(let x=0;x<=steps;x++){
    uv.push(quadPoint(source,x/steps,y/steps));vertices.push(quadPoint(target,x/steps,y/steps))
  }
  for(let y=0;y<steps;y++)for(let x=0;x<steps;x++){
    const a=y*(steps+1)+x,b=a+1,d=a+steps+1,c=d+1
    indices.push(a,b,c,a,c,d)
  }
  return {uv,vertices,indices}
}
