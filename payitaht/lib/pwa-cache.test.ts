import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

test('service worker Pages base path altında kaydolur', () => {
  const hook = readFileSync('hooks/use-pwa.ts', 'utf8')
  assert.match(hook, /register\(asset\('\/sw\.js'\)/)
  assert.match(hook, /scope = asset\('\/'\)/)
  assert.doesNotMatch(hook, /register\('\/sw\.js'\)/)
})

test('service worker cache sürümü ve asset yenileme stratejisi güncel', () => {
  const sw = readFileSync('public/sw.js', 'utf8')
  assert.match(sw, /payitaht-shell-v7/)
  assert.match(sw, /self\.registration\.scope/)
  assert.match(sw, /url\.pathname\.startsWith\(gameImages\)/)
  // Yalnızca JavaScript sözdizimini derle; self çağrıları çalıştırılmaz.
  assert.doesNotThrow(() => new Function(sw))
})
