import test from 'node:test'
import assert from 'node:assert/strict'
import { spriteAlphaFrame } from './sprite-alpha-frame'

test('visible size ignores large transparent borders and faint shadow fringes', () => {
  const pixels = new Uint8ClampedArray(10 * 8 * 4)
  for (let y = 2; y <= 5; y++) for (let x = 3; x <= 7; x++) pixels[(y * 10 + x) * 4 + 3] = 255
  pixels[3] = 10
  assert.deepEqual(spriteAlphaFrame(pixels, 10, 8), { left: 3, top: 2, width: 5, height: 4 })
})
test('an opaque non-square image retains its full dimensions', () => {
  const pixels = new Uint8ClampedArray(7 * 3 * 4).fill(255)
  assert.deepEqual(spriteAlphaFrame(pixels, 7, 3), { left: 0, top: 0, width: 7, height: 3 })
})
test('fully empty art has a finite full-frame fallback', () => {
  assert.deepEqual(spriteAlphaFrame(new Uint8ClampedArray(7 * 3 * 4), 7, 3), { left: 0, top: 0, width: 7, height: 3 })
})
