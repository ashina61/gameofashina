import assert from 'node:assert/strict'
import test from 'node:test'
import { districtPropsFor } from './district-decor'

test('mahalle dekoru bina seviyesi arttıkça eksilmez', () => {
  for (const id of ['divan', 'carsi', 'ambar', 'konut', 'liman', 'tersane'] as const) {
    let previous = 0
    for (let level = 1; level <= 8; level++) {
      const count = districtPropsFor(id, level).length
      assert.ok(count >= previous, `${id} seviye ${level} dekoru azaldı`)
      previous = count
    }
  }
})

test('mahalle karakterleri birbirinden ayrıdır', () => {
  assert.ok(districtPropsFor('divan', 7).some(p => p.asset === 'statue'))
  assert.ok(districtPropsFor('carsi', 1).some(p => p.asset === 'market-stall'))
  assert.ok(districtPropsFor('ambar', 1).some(p => p.asset === 'barrel'))
  assert.ok(districtPropsFor('liman', 1).some(p => p.asset === 'barrel-water'))
  assert.ok(districtPropsFor('tersane', 2).some(p => p.asset === 'cart'))
})
