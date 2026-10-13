import test from 'node:test'
import assert from 'node:assert/strict'
import { MASTER_DEFENSE_PATH, MASTER_PLOTS, MASTER_MAP, MASTER_WORLD, masterWallSpans } from './master-projection'

test('ridge walls remain upright, have joined baselines and never occupy a parcel', () => {
  for (const level of [1,4,8,26]) {
    const spans = masterWallSpans(level)
    for (const [i,p] of spans.entries()) {
      assert.equal(p.polygon[0].x,p.polygon[3].x)
      assert.equal(p.polygon[1].x,p.polygon[2].x)
      assert.ok(p.polygon.every(q=>q.x>=0&&q.x<=MASTER_WORLD.w&&q.y>=MASTER_WORLD.y&&q.y<=MASTER_WORLD.y+MASTER_WORLD.h))
      if (i) assert.ok(Math.hypot(spans[i-1].polygon[2].x-p.polygon[3].x,spans[i-1].polygon[2].y-p.polygon[3].y)<0.00001)
      const left=p.center.x-p.width/2,right=p.center.x+p.width/2,top=p.center.y-p.height/2,bottom=p.center.y+p.height/2
      for(const plot of MASTER_PLOTS)assert.ok(right<=plot.center.x-plot.width/2 || left>=plot.center.x+plot.width/2 || bottom<=plot.center.y-plot.height/2 || top>=plot.center.y+plot.height/2)
    }
    assert.equal(spans[0].polygon[3].x,MASTER_DEFENSE_PATH[0][0]*MASTER_MAP.scale)
    assert.equal(spans.at(-1)!.polygon[2].y,MASTER_DEFENSE_PATH.at(-1)![1]*MASTER_MAP.scale)
  }
})
