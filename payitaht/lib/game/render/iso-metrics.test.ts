import { test } from 'node:test'
import assert from 'node:assert/strict'
import { ISO, gridToScreen, screenToGrid, tileDiamond, gridBounds, isoDepth } from './iso-metrics'

test('gridToScreen: merkez hucre orijinde, komsu hucreler elmas yonlerde', () => {
  assert.deepEqual(gridToScreen(0, 0), { x: 0, y: 0 })
  // +x sag-asagi, +y sol-asagi (izometrik)
  assert.deepEqual(gridToScreen(1, 0), { x: ISO.tileWidth / 2, y: ISO.tileHeight / 2 })
  assert.deepEqual(gridToScreen(0, 1), { x: -ISO.tileWidth / 2, y: ISO.tileHeight / 2 })
})

test('screenToGrid, gridToScreen tersidir', () => {
  for (const [gx, gy] of [[0, 0], [3, 7], [13, 13], [5, 2]]) {
    const s = gridToScreen(gx, gy)
    const g = screenToGrid(s.x, s.y)
    assert.ok(Math.abs(g.x - gx) < 1e-9 && Math.abs(g.y - gy) < 1e-9, `${gx},${gy}`)
  }
})

test('tileDiamond: dort kose, 2:1 elmas', () => {
  const d = tileDiamond(0, 0)
  assert.equal(d.length, 4)
  assert.deepEqual(d[0], { x: 0, y: -ISO.tileHeight / 2 }) // ust
  assert.deepEqual(d[1], { x: ISO.tileWidth / 2, y: 0 })   // sag
})

test('gridBounds: 14x14 elmas genis (2:1) ve simetrik', () => {
  const b = gridBounds()
  const w = b.right - b.left
  const h = b.bottom - b.top
  // Elmas 2:1: genislik yaklasik yuksekligin iki kati.
  assert.ok(w > h, 'elmas yataya genis olmali')
  assert.ok(Math.abs(w / h - 2) < 0.25, `oran ~2 olmali, gercek ${w / h}`)
})

test('isoDepth: onedeki hucre arkadan buyuk deger alir', () => {
  assert.ok(isoDepth(5, 5) > isoDepth(2, 2))
  // footprint ve offset toplanir
  assert.equal(isoDepth(3, 4, 0.5, 0.1), 7 + 0.5 + 0.1)
})
