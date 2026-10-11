import test from 'node:test'
import assert from 'node:assert/strict'
import { MASTER_MAP, MASTER_PLOTS, masterPlot, masterSpriteWidth } from './master-projection'
import { LIVE_SLOTS } from './live-adapter'

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
    assert.ok(masterSpriteWidth(p, p.index === 0) < p.width)
  }
  for (let i = 0; i < MASTER_PLOTS.length; i++) for (let j = i + 1; j < MASTER_PLOTS.length; j++) {
    const a = MASTER_PLOTS[i], b = MASTER_PLOTS[j]
    assert.ok(Math.abs(a.x - b.x) >= (a.w + b.w) / 2 || Math.abs(a.y - b.y) >= (a.h + b.h) / 2,
      `overlapping click areas: ${a.index}, ${b.index}`)
  }
})
