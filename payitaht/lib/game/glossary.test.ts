import test from 'node:test'
import assert from 'node:assert/strict'
import { BUILDING_IDS, MAX_LEVEL, initialGame } from './engine'
import { effectLines } from './building-info'
import { FIELD_ROW_NAMES, ROLE_NAMES, TREASURY_TERMS, explain } from './glossary'

test('every building effect label has an explanation', () => {
  const g = initialGame(Date.UTC(2026, 0, 5))
  const missing = new Set<string>()
  for (const id of BUILDING_IDS) for (let level = 1; level <= MAX_LEVEL[id]; level++)
    for (const line of effectLines(g, id, level)) if (!explain(line.label)) missing.add(`${id}: ${line.label}`)
  assert.deepEqual([...missing], [])
})

test('battlefield rows, unit roles and treasury rows are explained', () => {
  const terms = [...Object.values(FIELD_ROW_NAMES), ...Object.values(ROLE_NAMES), ...TREASURY_TERMS]
  assert.deepEqual(terms.filter(t => !explain(t)), [])
})

test('lookup ignores case and surrounding space', () => {
  assert.equal(explain(' huzur '), explain('Huzur'))
  assert.equal(explain('ÇEVRİMDIŞI ÜRETİM'), explain('Çevrimdışı üretim'))
  assert.equal(explain('Uydurma terim'), undefined)
})
