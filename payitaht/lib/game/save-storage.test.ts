import { test } from 'node:test'
import assert from 'node:assert/strict'
import { initialEmpire } from './empire'
import {
  SAVE_BACKUP_KEY, SAVE_CORRUPT_KEY, SAVE_KEY,
  loadStoredEmpire, peekStoredEmpire, saveStoredEmpire,
  type SaveStore,
} from './save-storage'

class MemoryStore implements SaveStore {
  map = new Map<string, string>()
  getItem(key: string) { return this.map.get(key) ?? null }
  setItem(key: string, value: string) { this.map.set(key, value) }
  removeItem(key: string) { this.map.delete(key) }
}

test('first save writes both primary and backup slots', () => {
  const s = new MemoryStore()
  const empire = initialEmpire(1_000)
  saveStoredEmpire(s, empire)
  assert.ok(s.getItem(SAVE_KEY))
  assert.equal(s.getItem(SAVE_KEY), s.getItem(SAVE_BACKUP_KEY))
  assert.deepEqual(loadStoredEmpire(s).empire, empire)
})

test('next valid save keeps previous valid generation as rolling backup', () => {
  const s = new MemoryStore()
  const first = initialEmpire(1_000)
  saveStoredEmpire(s, first)
  const second = structuredClone(first)
  second.cities[0].game.resources.wood += 77
  saveStoredEmpire(s, second)
  assert.deepEqual(JSON.parse(s.getItem(SAVE_KEY)!).cities[0].game.resources.wood, second.cities[0].game.resources.wood)
  assert.deepEqual(JSON.parse(s.getItem(SAVE_BACKUP_KEY)!).cities[0].game.resources.wood, first.cities[0].game.resources.wood)
})

test('corrupt primary is preserved and valid backup is automatically restored', () => {
  const s = new MemoryStore()
  const good = initialEmpire(1_000)
  saveStoredEmpire(s, good)
  s.setItem(SAVE_KEY, '{"version":1,"cities":')
  const result = loadStoredEmpire(s)
  assert.equal(result.recovered, true)
  assert.deepEqual(result.empire, good)
  assert.equal(s.getItem(SAVE_CORRUPT_KEY), '{"version":1,"cities":')
  assert.equal(s.getItem(SAVE_KEY), s.getItem(SAVE_BACKUP_KEY))
})

test('peek may fall back to backup without mutating corrupt primary', () => {
  const s = new MemoryStore()
  const good = initialEmpire(1_000)
  saveStoredEmpire(s, good)
  const broken = '{not-json'
  s.setItem(SAVE_KEY, broken)
  const result = peekStoredEmpire(s)
  assert.equal(result.recovered, true)
  assert.deepEqual(result.empire, good)
  assert.equal(s.getItem(SAVE_KEY), broken)
  assert.equal(s.getItem(SAVE_CORRUPT_KEY), null)
})
