import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { tr } from './tr'

/** Sözlükteki her uç metin dolu olmalı; işlevler örnek bir değerle denenir. */
function leaves(node: unknown, path: string[] = []): [string, string][] {
  if (typeof node === 'string') return [[path.join('.'), node]]
  if (typeof node === 'function') return [[path.join('.'), String((node as (x: never) => unknown)(3 as never))]]
  return Object.entries(node as Record<string, unknown>).flatMap(([k, v]) => leaves(v, [...path, k]))
}

test('Türkçe sözlükte boş metin yok', () => {
  for (const [key, text] of leaves(tr)) assert.ok(text.trim().length > 0, `${key} boş`)
})

test('ortak düğme metinleri bileşenlerde yeniden yazılmıyor', () => {
  // Sözlüğe taşınan düğme metinleri oyun bileşenlerinde düz yazı olarak geri gelmesin.
  const dir = join(__dirname, '..', '..', 'components', 'game')
  const words = Object.values(tr.action)
  const bad: string[] = []
  for (const file of readdirSync(dir).filter(f => f.endsWith('.tsx'))) {
    const src = readFileSync(join(dir, file), 'utf8')
    for (const w of words) {
      for (const form of [`aria-label="${w}"`, `>${w}<`, `/>${w}<`, `'${w}'`]) {
        if (src.includes(form)) bad.push(`${file}: ${form}`)
      }
    }
  }
  assert.deepEqual(bad, [])
})
