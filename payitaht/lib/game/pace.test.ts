import { test } from 'node:test'
import assert from 'node:assert/strict'
import { dayReached, paceCurve } from './pace'

test('the pace bot keeps growing the city: curves never fall and more logins mean faster growth', () => {
  const active = paceCurve('aktif', 7), thrice = paceCurve('gunde3', 7), once = paceCurve('gunde1', 7)
  for (const c of [active, thrice, once]) for (let i = 1; i < c.length; i++) assert.ok(c[i] >= c[i - 1])
  assert.ok(active[6] >= thrice[6] && thrice[6] >= once[6], `${active[6]} ≥ ${thrice[6]} ≥ ${once[6]}`)
  assert.ok((dayReached(thrice, 10) ?? 99) <= 5, 'three logins a day reach Divanhane 10 within five days')
})
