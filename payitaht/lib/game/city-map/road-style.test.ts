import assert from 'node:assert/strict'
import test from 'node:test'
import { roadTierForHallLevel, roadStyleFor, ROAD_TIER_NAMES } from './road-style'

test('Divan seviyesine göre yol malzemesi dört kademede değişir', () => {
  for (const [level, tier] of [[0, 1], [1, 1], [2, 1], [3, 2], [4, 2], [5, 3], [6, 3], [7, 4], [20, 4]] as const) {
    assert.equal(roadTierForHallLevel(level), tier)
  }
  assert.equal(ROAD_TIER_NAMES[3], 'Arnavut kaldırımı')
})

test('ana yol yan yoldan geniştir, kıyı her kademede taş kalır', () => {
  for (const level of [1, 3, 5, 7]) {
    const main = roadStyleFor('avenue', level)
    const side = roadStyleFor('street', level)
    const coast = roadStyleFor('quay', level)
    assert.ok(main.fillW > side.fillW)
    assert.ok(coast.stoneDensity > 0)
    assert.ok(main.shoulderW > main.fillW)
    assert.ok(coast.fillW > side.fillW)
  }
})

test('taş örgü yoğunluğu belediye geliştikçe artar', () => {
  const counts = [1, 3, 5, 7].map(level => roadStyleFor('avenue', level).stoneDensity)
  assert.deepEqual(counts, [0, 2, 6, 8])
})
