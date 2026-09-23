import assert from 'node:assert/strict'
import test from 'node:test'
import { HALL_SLOT_ID, ROAD_GRAPH } from './index'
import { roadEdgeKeysForTargets } from './terrain-builder'

const edgeKey = (a: string, b: string) => a < b ? `${a}|${b}` : `${b}|${a}`
const allKeys = new Set(ROAD_GRAPH.edges.map(e => edgeKey(e.from, e.to)))

test('hedef yoksa görsel yol ağı da yoktur', () => {
  assert.equal(roadEdgeKeysForTargets([]).size, 0)
  assert.equal(roadEdgeKeysForTargets([HALL_SLOT_ID]).size, 0)
})

test('tek kurulu slot için yalnızca graph içindeki bağlantı yolu üretilir', () => {
  const target = 'city_01'
  const keys = roadEdgeKeysForTargets([target])
  assert.ok(keys.size > 0)
  for (const key of keys) assert.ok(allKeys.has(key), `graph dışı edge: ${key}`)
  assert.ok([...keys].some(key => key.split('|').includes(target)))
})

test('ikinci hedef eklemek mevcut yol ağacını bozmaz', () => {
  const one = roadEdgeKeysForTargets(['city_01'])
  const two = roadEdgeKeysForTargets(['city_01', 'city_14'])
  for (const key of one) assert.ok(two.has(key))
  assert.ok(two.size >= one.size)
})
