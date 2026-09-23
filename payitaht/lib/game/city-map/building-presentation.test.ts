import assert from 'node:assert/strict'
import test from 'node:test'
import { BUILDING_RENDER_SCALE } from './building-assets'

test('Ikariam-benzeri şehir sunumunda bina global render ölçeği kontrollü kalır', () => {
  assert.ok(BUILDING_RENDER_SCALE <= 0.82)
  assert.ok(BUILDING_RENDER_SCALE >= 0.72)
})
