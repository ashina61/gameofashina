import assert from 'node:assert/strict'
import test from 'node:test'
import { CITY_SLOTS, PLAZA } from './index'
import { FOOTPRINT_DIAMOND_W } from './building-assets'
import { cityFields, cityFountains, cityStream, nearStreamAt, shoreYAt } from './city-extras'

const inYard = (x: number, y: number, k = 1) => CITY_SLOTS.some(s =>
  Math.abs(s.screen.x - x) / (FOOTPRINT_DIAMOND_W * k) + Math.abs(s.screen.y - y) / (FOOTPRINT_DIAMOND_W * k / 2) < 1)

test('dere tepeden denize akar ve hiçbir arsanın avlusundan geçmez', () => {
  const s = cityStream()
  assert.ok(s.pts.length > 50, 'dere yolu bulunamadı')
  const end = s.pts[s.pts.length - 1]
  assert.ok(end.y > shoreYAt(end.x) - 20, 'dere denize ulaşmıyor')
  for (const p of s.pts) assert.ok(!inYard(p.x, p.y), `dere arsadan geçiyor (${p.x}, ${p.y})`)
  for (const p of s.pts) {
    assert.ok(((p.x - PLAZA.screen.x) / PLAZA.rx) ** 2 + ((p.y - PLAZA.screen.y) / PLAZA.ry) ** 2 > 1, 'dere meydandan geçiyor')
  }
})

test('tarlalar arsalara ve dereye binmez', () => {
  const fields = cityFields()
  assert.ok(fields.length >= 6)
  for (const f of fields) {
    assert.ok(!inYard(f.x, f.y, 1.4), `${f.kind} bir arsanın üstünde`)
    assert.ok(!nearStreamAt(f.x, f.y, f.hw * 0.5, f.hh * 0.5), `${f.kind} derenin üstünde`)
  }
})

test('çeşmeler suyun üstüne düşmez', () => {
  for (const c of cityFountains()) assert.ok(!nearStreamAt(c.x, c.y, 30, 20), `çeşme dere üstünde (${c.x}, ${c.y})`)
})
