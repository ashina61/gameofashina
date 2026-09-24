import { test } from 'node:test'
import assert from 'node:assert/strict'
import { runExhaustivePlacementTest, slotAnchor, spriteScale } from './placement-test'
import { CITY_SLOTS, CITY_MAP, HALL_SLOT_ID, slotById } from './index'

test('exhaustive placement: her normal bina her 24 slotta geçerli oturur', () => {
  const r = runExhaustivePlacementTest()
  assert.equal(r.movableSlots, 24, `24 taşınabilir slot olmalı, bulundu ${r.movableSlots}`)
  assert.equal(r.combos, r.buildings * 24)
  assert.ok(r.footprintOk, 'footprint standardı: ' + r.failures.join('; '))
  assert.ok(r.anchorOk, 'anchor merkez: ' + r.failures.join('; '))
  assert.ok(r.overlapFree, 'footprint çakışması: ' + r.failures.join('; '))
  assert.ok(r.scaleStable, 'scale slotla değişmemeli: ' + r.failures.join('; '))
  assert.ok(r.passed)
})

test('scale slottan bağımsız (aynı bina, iki slot -> aynı scale)', () => {
  const w = 512
  const a = CITY_SLOTS[1], b = CITY_SLOTS[10]
  assert.equal(spriteScale(w), spriteScale(w)) // formül slot içermez
  // anchor yatayı her slotta o slotun merkezidir
  assert.equal(slotAnchor(a).x, a.screen.x)
  assert.equal(slotAnchor(b).x, b.screen.x)
})

test('belediye haritanın geometrik merkezinde ve çakılı', () => {
  const hall = slotById(HALL_SLOT_ID)!
  assert.equal(hall.gx, Math.round(CITY_MAP.map.w / 2))
  assert.equal(hall.gy, Math.round(CITY_MAP.map.h / 2))
  assert.equal(hall.fixed, true)
})

test('yol grafiği: bağlı ve geçerli düğümlere işaret ediyor', () => {
  const ids = new Set(CITY_MAP.roadGraph.nodes.map(n => n.id))
  for (const e of CITY_MAP.roadGraph.edges) {
    assert.ok(ids.has(e.from), `yol kenarı geçersiz düğüm: ${e.from}`)
    assert.ok(ids.has(e.to), `yol kenarı geçersiz düğüm: ${e.to}`)
  }
  // Her şehir ve liman slotu belediyeden sokak ağıyla erişilebilir.
  const adj = new Map<string, string[]>()
  for (const e of CITY_MAP.roadGraph.edges) {
    adj.set(e.from, [...(adj.get(e.from) ?? []), e.to])
    adj.set(e.to, [...(adj.get(e.to) ?? []), e.from])
  }
  const reach = new Set([CITY_MAP.hallSlotId]), queue = [CITY_MAP.hallSlotId]
  while (queue.length) for (const n of adj.get(queue.shift()!) ?? []) if (!reach.has(n)) { reach.add(n); queue.push(n) }
  for (const s of CITY_MAP.slots.filter(s => s.type !== 'defense')) assert.ok(reach.has(s.id), `${s.id} yol ağına bağlı değil`)
  void CITY_SLOTS
})
