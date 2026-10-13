import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { MASTER_DEFENSE_PATH, MASTER_TOWER_SIZE, MASTER_PLOTS, MASTER_MAP } from './master-projection'

/** Match the full square wall/tower texture, including transparent extent. */
test('complete rotated defense art stays within map and outside all parcels', () => {
  function check(x: number, y: number, width: number, originY: number, angle: number) {
    const a = angle * Math.PI / 180
    const points = [[-0.5, -originY], [0.5, -originY], [0.5, 1-originY], [-0.5, 1-originY]]
      .map(([px,py]) => [x + width*(px*Math.cos(a)-py*Math.sin(a)), y + width*(px*Math.sin(a)+py*Math.cos(a))])
    const left=Math.min(...points.map(p=>p[0])),right=Math.max(...points.map(p=>p[0]))
    const top=Math.min(...points.map(p=>p[1])),bottom=Math.max(...points.map(p=>p[1]))
    assert.ok(left>=0 && top>=0 && right<=MASTER_MAP.width && bottom<=MASTER_MAP.height)
    for(const p of MASTER_PLOTS)assert.ok(right<=p.x-p.w/2 || left>=p.x+p.w/2 || bottom<=p.y-p.h/2 || top>=p.y+p.h/2, `defense overlaps plot ${p.index}`)
  }
  for(let i=0;i<MASTER_DEFENSE_PATH.length-1;i++){
    const [ax,ay]=MASTER_DEFENSE_PATH[i],[bx,by]=MASTER_DEFENSE_PATH[i+1],length=Math.hypot(bx-ax,by-ay),count=Math.ceil(length/64)
    for(let j=0;j<count;j++) { const t=(j+0.5)/count;check(ax+(bx-ax)*t,ay+(by-ay)*t,length/count*1.18,0.73,17+Math.atan2(by-ay,bx-ax)*180/Math.PI) }
  }
  for(const i of [0,2,5,7])check(...MASTER_DEFENSE_PATH[i] as [number,number],MASTER_TOWER_SIZE,1,0)
})

test('wall texture ratios agree with full-square defense measurement', () => {
  for(const tier of [1,2,3])for(const part of ['segment','tower']){
    const b=readFileSync(`public/images/game/walls/${part}-${tier}.webp`)
    assert.equal(b.toString('ascii',12,16),'VP8X')
    const width=1+b.readUIntLE(24,3),height=1+b.readUIntLE(27,3)
    assert.equal(width,height)
  }
})
