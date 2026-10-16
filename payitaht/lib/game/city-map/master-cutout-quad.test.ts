import test from 'node:test'
import assert from 'node:assert/strict'
import { cutoutQuadMesh, cutoutTriangleMatrix, mapCutoutPoint } from './master-cutout-quad'

test('projective cutout edges stay straight and inverse lookup preserves alpha coordinates', () => {
  const source=[{x:.1,y:0},{x:.9,y:0},{x:1,y:1},{x:0,y:1}]
  const target=[{x:12,y:8},{x:188,y:11},{x:202,y:104},{x:0,y:101}]
  for(const q of [{x:.3,y:.2},{x:.8,y:.8},{x:.5,y:.5},...source]){
    const p=mapCutoutPoint(source,target,q),back=mapCutoutPoint(target,source,p)
    assert.ok(Math.hypot(back.x-q.x,back.y-q.y)<1e-9)
  }
  source.forEach((a,i)=>{
    const b=source[(i+1)%4],c=target[i],d=target[(i+1)%4]
    for(const t of [.1,.4,.8]){
      const p=mapCutoutPoint(source,target,{x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t})
      assert.ok(Math.abs((d.x-c.x)*(p.y-c.y)-(d.y-c.y)*(p.x-c.x))<1e-7)
    }
  })
})

test('WebGL vertices and Canvas affine triangles share the same mapping, including mirror', () => {
  const target=[{x:15,y:0},{x:185,y:3},{x:200,y:95},{x:0,y:90}]
  for(const flip of [false,true]){
    const source=[{x:.1,y:0},{x:.9,y:0},{x:1,y:1},{x:0,y:1}].map(q=>({...q,x:flip?1-q.x:q.x}))
    const mesh=cutoutQuadMesh(source,target)
    for(let i=0;i<mesh.indices.length;i+=3){
      const ids=mesh.indices.slice(i,i+3),[a,b,c,d,e,f]=cutoutTriangleMatrix(mesh.uv,mesh.vertices,ids)
      for(const j of ids){
        const q=mesh.uv[j],p=mesh.vertices[j]
        assert.ok(Math.hypot(a*q.x+c*q.y+e-p.x,b*q.x+d*q.y+f-p.y)<1e-7)
      }
    }
  }
})
