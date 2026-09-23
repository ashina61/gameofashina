import assert from 'node:assert/strict'
import test from 'node:test'
import { cleanCoastSpriteRgba } from './coast-asset-cleaner'

function px(data: Uint8ClampedArray, width: number, x: number, y: number, rgba: [number, number, number, number]) {
  const i = (y * width + x) * 4
  data[i] = rgba[0]
  data[i + 1] = rgba[1]
  data[i + 2] = rgba[2]
  data[i + 3] = rgba[3]
}

test('cyan coast platform gider, sıcak ana yapı kalır', () => {
  const w = 12, h = 12
  const data = new Uint8ClampedArray(w * h * 4)

  // Ana yapı: sıcak taş, bağlı 4x4 gövde.
  for (let y = 2; y <= 5; y++) for (let x = 4; x <= 7; x++) {
    px(data, w, x, y, [190, 145, 92, 255])
  }
  // İskele: ana yapıya bağlı ahşap uzantı.
  for (let y = 5; y <= 7; y++) px(data, w, 5, y, [120, 80, 45, 255])

  // Eski su plakası: alt bölgede cyan.
  for (let y = 7; y <= 10; y++) for (let x = 1; x <= 10; x++) {
    px(data, w, x, y, [70, 180, 190, 255])
  }

  cleanCoastSpriteRgba(data, w, h)

  assert.equal(data[(3 * w + 5) * 4 + 3], 255, 'ana yapı korunmalı')
  assert.equal(data[(9 * w + 5) * 4 + 3], 0, 'cyan su plakası silinmeli')
})

test('ana artworkten kopuk platform kırıntıları en büyük bileşen filtresinde gider', () => {
  const w = 14, h = 14
  const data = new Uint8ClampedArray(w * h * 4)

  // Büyük bağlı ana component.
  for (let y = 2; y <= 7; y++) for (let x = 4; x <= 9; x++) {
    px(data, w, x, y, [175, 125, 78, 255])
  }

  // Ayrı küçük gri/tan platform kırıntısı.
  for (let x = 1; x <= 3; x++) px(data, w, x, 9, [125, 120, 105, 255])

  cleanCoastSpriteRgba(data, w, h)

  assert.equal(data[(4 * w + 6) * 4 + 3], 255)
  assert.equal(data[(9 * w + 2) * 4 + 3], 0)
})

test('geçersiz boyutta buffer güvenle dokunulmadan döner', () => {
  const data = new Uint8ClampedArray(4)
  const out = cleanCoastSpriteRgba(data, 2, 2)
  assert.equal(out, data)
})
