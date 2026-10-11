import test from 'node:test'
import assert from 'node:assert/strict'
import { existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { buildingArtLevel, BUILDING_ART_LEVELS, fiveStageBuildingArt } from './building-art-growth'
import { buildingArtKey, buildingImage } from '../asset'

test('five building stages change at 5, 10, 15 and 20 with safe fallback', () => {
  for (const [level, stage] of [[0,1],[1,1],[4,1],[5,5],[9,5],[10,10],[14,10],[15,15],[19,15],[20,20],[32,20],[4.9,1],[NaN,1],[Infinity,1]]) assert.equal(buildingArtLevel(level),stage)
})
test('all five registered barracks stages have both sizes and shared detail/city selection', () => {
  for (const stage of BUILDING_ART_LEVELS) {
    const art = fiveStageBuildingArt('kisla',stage)!
    assert.equal(buildingArtKey('kisla',stage),art.key)
    for (const size of ['sm','full'] as const) {
      assert.ok(buildingImage('kisla',stage,undefined,size).includes(art.path))
      assert.ok(existsSync(resolve('public',`${art.path.slice(1)}${size==='sm'?'-sm':''}.webp`)))
    }
    assert.ok(art.originY > .75 && art.originY < .9)
    assert.ok(art.contactWidthRatio > .75 && art.contactWidthRatio <= 1)
  }
  // Existing families remain available until their five originals are finished.
  assert.equal(fiveStageBuildingArt('medrese',20),null)
  assert.equal(buildingArtKey('medrese',20),'medrese-3')
  assert.ok(buildingImage('medrese',20).includes('medrese-painted-3-sm.webp'))
})
