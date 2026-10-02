import { test } from 'node:test'
import assert from 'node:assert/strict'
import { ERROR_MAX, errorReport, parseErrors, pushError } from './error-log'

test('pushError keeps the newest first, folds repeats and caps the list', () => {
  let list = pushError([], 'a', 'at x', 1)
  list = pushError(list, 'a', 'at x', 2)
  assert.deepEqual(list, [{ time: 2, message: 'a', stack: 'at x', count: 2 }])
  for (let i = 0; i < ERROR_MAX + 5; i++) list = pushError(list, `e${i}`, undefined, 10 + i)
  assert.equal(list.length, ERROR_MAX)
  assert.equal(list[0].message, `e${ERROR_MAX + 4}`)
  assert.equal(pushError([], 'x'.repeat(1000), 'y'.repeat(5000), 1)[0].message.length, 300)
})

test('parseErrors survives broken storage', () => {
  assert.deepEqual(parseErrors(null), [])
  assert.deepEqual(parseErrors('{bozuk'), [])
  assert.deepEqual(parseErrors('{"a":1}'), [])
  assert.deepEqual(parseErrors('[{"time":1,"message":"m","count":1},{"time":"x"}]'), [{ time: 1, message: 'm', count: 1 }])
})

test('errorReport is plain text with version and entries', () => {
  const r = errorReport(pushError([], 'Patladı', 'at a.ts:1', Date.UTC(2026, 9, 2)), { version: '0.30.0', device: 'test', now: Date.UTC(2026, 9, 2) })
  assert.match(r, /Payitaht Adaları 0\.30\.0/)
  assert.match(r, /Patladı/)
  assert.match(r, /at a\.ts:1/)
  assert.match(errorReport([], { version: '1', device: 'd', now: 0 }), /Kayıtlı hata yok/)
})
