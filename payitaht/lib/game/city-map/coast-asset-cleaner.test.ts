import assert from 'node:assert/strict'
import test from 'node:test'
import { cleanCoastSpriteRgba } from './coast-asset-cleaner'

function px(data: Uint8ClampedArray, w: number, x: number, y: number, rgba: [number, number, number, number]) {
  const i = (y * w + x) * 4
  data.set(rgba, i)
}
function alpha(data: Uint8ClampedArray, w: number, x: number, y: number) {
  return data[(y * w + x) * 4 + 3]
}

test('geniş cyan deniz plakası temizlenir, sıcak bina ve ahşap iskele kalır', () => {
  const w = 20, h = 20
  const data = new Uint8ClampedArray(w * h * 4)
  for (let y = 2; y <= 7; y++) for (let x = 7; x <= 12; x++) {
    px(data, w, x, y, [190, 145, 92, 255])
  }
  for (let y = 7; y <= 18; y++) px(data, w, 9, y, [120, 80, 45, 255])
  for (let y = 11; y <= 19; y++) for (let x = 1; x < 19; x++) {
    if (x !== 9) px(data, w, x, y, [70, 180, 190, 255])
  }
  cleanCoastSpriteRgba(data, w, h)
  assert.equal(alpha(data, w, 8, 3), 255, 'bina korunmalı')
  assert.equal(alpha(data, w, 9, 18), 255, 'alt bölümde ahşap iskele kesilmemeli')
  assert.equal(alpha(data, w, 3, 17), 0, 'geniş su alanı şeffaf olmalı')
})

test('ayrı tekne gövdesi ve beyaz yelken suyla birlikte silinmez', () => {
  const w = 20, h = 20
  const data = new Uint8ClampedArray(w * h * 4)
  for (let y = 12; y <= 19; y++) for (let x = 1; x < 19; x++) {
    px(data, w, x, y, [65, 165, 185, 255])
  }
  // Ayrı duran gemi: bordo gövde, beyaz yelken, üstünde küçük mavi süs.
  for (let x = 6; x <= 12; x++) px(data, w, x, 18, [117, 70, 44, 255])
  px(data, w, 9, 15, [235, 229, 212, 255])
  px(data, w, 9, 17, [235, 229, 212, 255])
  px(data, w, 9, 16, [82, 150, 165, 255])
  cleanCoastSpriteRgba(data, w, h)
  assert.equal(alpha(data, w, 8, 18), 255, 'tekne gövdesi')
  assert.equal(alpha(data, w, 9, 15), 255, 'yelken')
  assert.equal(alpha(data, w, 9, 16), 255, 'tekil mavi süs büyük deniz lekesi değil')
  assert.equal(alpha(data, w, 2, 18), 0, 'geniş deniz lekesi')
})

test('alt taraftaki ayrı taş/kum artwork ve küçük mavi detay korunur', () => {
  const w = 18, h = 18
  const data = new Uint8ClampedArray(w * h * 4)
  for (let x = 2; x <= 6; x++) px(data, w, x, 16, [125, 120, 105, 255])
  px(data, w, 9, 10, [58, 150, 170, 255])
  cleanCoastSpriteRgba(data, w, h)
  assert.equal(alpha(data, w, 3, 16), 255, 'taşlı ayrı parça otomatik silinmez')
  assert.equal(alpha(data, w, 9, 10), 255, 'tekil mavi detay silinmez')
})

test('geçersiz buffer dokunulmadan döner', () => {
  const data = new Uint8ClampedArray(4)
  assert.equal(cleanCoastSpriteRgba(data, 2, 2), data)
})
