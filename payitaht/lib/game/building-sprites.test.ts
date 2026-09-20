import { test } from 'node:test'
import assert from 'node:assert/strict'
import sharp from 'sharp'
import { LAND_SPRITES, fitBuildingSprite, type LandSpriteId } from './building-sprites'
import { SLOTS } from './layout'
import { COURTYARDS, PLOT_FOOTPRINTS } from './plots.generated'
import { plotPolygon, toWorldX, toWorldY } from './city-render'

// Uses the shipped image dimensions, so changing/cropping art cannot silently
// change its footprint or distort the image when placed on a smaller courtyard.
test('every land sprite retains its aspect ratio and fits every movable courtyard', async () => {
  for (const id of Object.keys(LAND_SPRITES) as LandSpriteId[]) {
    const image = await sharp(`public/images/game/buildings-v5/${id}.webp`).metadata()
    assert.ok(image.hasAlpha, `${id}: transparent background required`)
    for (const slot of SLOTS.filter(s => s.zone === 'sehir' && (id !== 'divan' || s.index === 0))) {
      const fit = fitBuildingSprite(id, slot.index, image.width!, image.height!)
      const [w, h] = PLOT_FOOTPRINTS[slot.index]
      assert.ok(fit.groundWidth <= w && fit.groundHeight <= h, `${id} in plot ${slot.index}`)
      assert.ok(Math.abs(fit.width / fit.height - image.width! / image.height!) < 1e-8)
      const polygon = COURTYARDS[slot.index]
      for (let i=0;i<polygon.length;i++) {
        const [ax,ay]=polygon[i], [bx,by]=polygon[(i+1)%polygon.length]
        for (const sx of [-1,1]) for (const sy of [-1,1]) {
          const x=slot.x+sx*fit.groundWidth/2,y=slot.y+sy*fit.groundHeight/2
          assert.ok((bx-ax)*(y-ay)-(by-ay)*(x-ax)>0, `${id}: base escapes plot ${slot.index}`)
        }
      }
      assert.ok(fit.originY + fit.footH / 2 <= 1.001)
    }
  }
})
test('plot selection uses the painted courtyard boundaries and stable municipal anchor', () => {
  assert.deepEqual([SLOTS[0].x,SLOTS[0].y], [50,36])
  assert.equal(COURTYARDS.length,14)
  for (const slot of SLOTS.filter(s => s.zone === 'sehir')) {
    assert.deepEqual(plotPolygon(slot), COURTYARDS[slot.index].map(([x,y]) => ({x:toWorldX(x),y:toWorldY(y)})))
  }
})
