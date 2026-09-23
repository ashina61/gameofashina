import assert from 'node:assert/strict'
import test from 'node:test'
import { normalizeBuildingSpriteRgba } from './building-texture-normalizer'

function alphaAt(data: Uint8ClampedArray, width: number, x: number, y: number) {
  return data[(y * width + x) * 4 + 3]
}

test('bütün bina renkleri ortak sıcak/soft grade alır', () => {
  const data = new Uint8ClampedArray([90, 150, 210, 255])
  normalizeBuildingSpriteRgba('konut', data, 1, 1)

  // Mavi kanal hafifçe geri çekilir, kırmızı kanal artar.
  assert.ok(data[0] > 90)
  assert.ok(data[2] < 210)
  assert.equal(data[3], 255)
})

test('medrese gibi baked platformlu assette alt dış taş kaide yumuşar', () => {
  const w = 10, h = 10
  const data = new Uint8ClampedArray(w * h * 4)

  // Yapı merkezi: sıcak/doygun.
  for (let y = 2; y <= 8; y++) for (let x = 3; x <= 6; x++) {
    const i = (y * w + x) * 4
    data.set([180, 120, 70, 255], i)
  }

  // Alt dış taş plaka: düşük doygunluklu gri-bej.
  for (let x = 0; x < w; x++) {
    const i = (9 * w + x) * 4
    data.set([150, 145, 135, 255], i)
  }

  normalizeBuildingSpriteRgba('medrese', data, w, h)

  assert.equal(alphaAt(data, w, 5, 4), 255, 'ana yapı opak kalmalı')
  assert.ok(alphaAt(data, w, 0, 9) < 80, 'alt dış platform belirgin biçimde yumuşamalı')
})

test('konut gibi platform sorunu olmayan assette alpha değiştirilmez', () => {
  const data = new Uint8ClampedArray([
    160, 145, 130, 255,
    160, 145, 130, 255,
    160, 145, 130, 255,
    160, 145, 130, 255,
  ])
  normalizeBuildingSpriteRgba('konut', data, 2, 2)
  assert.deepEqual([data[3], data[7], data[11], data[15]], [255, 255, 255, 255])
})
