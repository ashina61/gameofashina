import assert from 'node:assert/strict'
import test from 'node:test'
import { BUILDING_RENDER_SCALE, FOOTPRINT_DIAMOND_W, GROUND_TARGET_W } from './building-assets'
import { roadStyleFor } from './road-style'

test('sunum küçülürken gerçek 2x2 footprint sabit kalır', () => {
  assert.equal(FOOTPRINT_DIAMOND_W, 256)
  assert.equal(GROUND_TARGET_W, Math.round(FOOTPRINT_DIAMOND_W * 0.82))
  assert.ok(BUILDING_RENDER_SCALE < 1)
  assert.ok(BUILDING_RENDER_SCALE >= 0.80)
})

test('yan sokak ana arterden belirgin biçimde daha sessizdir', () => {
  for (const level of [1, 3, 5, 7]) {
    const main = roadStyleFor('avenue', level)
    const side = roadStyleFor('street', level)
    assert.ok(side.fillW < main.fillW * 0.8)
    assert.ok(side.shoulderW < main.shoulderW * 0.8)
  }
})
