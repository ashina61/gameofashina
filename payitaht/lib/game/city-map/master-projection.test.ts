import test from 'node:test'
import assert from 'node:assert/strict'
import { MASTER_MAP, MASTER_WORLD, masterCameraBounds, MASTER_TERRAIN_TILES, MASTER_PLOTS, masterPlot, masterArtFrame } from './master-projection'
import { LIVE_SLOTS } from './live-adapter'

test('north camera limit exposes no painted-map margin below the HUD at any zoom', () => {
  for (const coveredTop of [0, 87, 104, 210]) for (const zoom of [0.078, 0.15, 0.5, 1.5]) {
    const b = masterCameraBounds(coveredTop, zoom)
    assert.ok(b.y + coveredTop / zoom >= 0)
    assert.ok(b.y + coveredTop / zoom <= 1.00001)
    assert.equal(b.y + b.h, MASTER_WORLD.h)
  }
})

test('detail terrain covers the existing map once without gaps or overlapping tiles', () => {
  let area = 0
  for (const a of MASTER_TERRAIN_TILES) {
    assert.ok(a.x >= 0 && a.y >= 0 && a.x + a.width <= MASTER_MAP.width && a.y + a.height <= MASTER_MAP.height)
    area += a.width * a.height
    for (const b of MASTER_TERRAIN_TILES) if (a !== b) {
      assert.ok(a.x + a.width <= b.x || b.x + b.width <= a.x || a.y + a.height <= b.y || b.y + b.height <= a.y)
    }
  }
  assert.equal(area, MASTER_MAP.width * MASTER_MAP.height)
  assert.ok(MASTER_MAP.path.endsWith('.webp'))
  assert.equal(MASTER_WORLD.h, MASTER_MAP.height * MASTER_MAP.scale)
})

test('master painting preserves every saved plot index, zone and fixed hall', () => {
  assert.equal(MASTER_PLOTS.length, LIVE_SLOTS.length)
  assert.equal(MASTER_PLOTS.filter(p => p.slot.zone === 'sehir').length, 25)
  assert.equal(MASTER_PLOTS[0].slot.fixed, true)
  for (const s of LIVE_SLOTS) assert.equal(masterPlot(s.index)?.slot.slotId, s.slotId)
  assert.equal(masterPlot(null), undefined)
})

test('measured clearings and maximum sprite widths stay inside the master image', () => {
  for (const p of MASTER_PLOTS) {
    assert.ok(p.x - p.w / 2 > 0 && p.x + p.w / 2 < MASTER_MAP.width)
    assert.ok(p.y - p.h / 2 > 0 && p.y + p.h / 2 < MASTER_MAP.height)
    assert.ok(masterArtFrame(p, 1536, 768, true).width === p.width)
  }
  for (let i = 0; i < MASTER_PLOTS.length; i++) for (let j = i + 1; j < MASTER_PLOTS.length; j++) {
    const a = MASTER_PLOTS[i], b = MASTER_PLOTS[j]
    assert.ok(Math.abs(a.x - b.x) >= (a.w + b.w) / 2 || Math.abs(a.y - b.y) >= (a.h + b.h) / 2,
      `overlapping click areas: ${a.index}, ${b.index}`)
  }
})

test('complete art, including tall legacy sprites and approved modules, stays inside every parcel', () => {
  for (const p of MASTER_PLOTS) for (const [w, h] of [[1774, 887], [1536, 1024], [600, 1800]]) {
    for (const module of [false, true]) for (const growth of [0.9, 0.93, 0.97, 1]) {
      const art = masterArtFrame(p, w, h, module, growth)
      assert.ok(art.left >= p.center.x - p.width / 2)
      assert.ok(art.right <= p.center.x + p.width / 2)
      assert.ok(art.top >= p.center.y - p.height / 2)
      assert.ok(art.bottom <= p.center.y + p.height / 2)
      if (module) {
        assert.ok(art.width >= p.width * 0.96 && art.height >= p.height * 0.96)
      } else assert.ok(Math.abs(art.width / art.height - w / h) < 0.00001)
    }
  }
})

test('all land modules leave the painted horizontal street corridors open', () => {
  const streets = [193, 296, 408, 518, 639, 767]
  for (const p of MASTER_PLOTS.filter(p => p.slot.zone === 'sehir')) {
    const art = masterArtFrame(p, 1774, 887, true)
    for (const y of streets) {
      const top = (y - 6) * MASTER_MAP.scale, bottom = (y + 6) * MASTER_MAP.scale
      assert.ok(art.bottom <= top || art.top >= bottom, `plot ${p.index} crosses street ${y}`)
    }
  }
})
