import assert from 'node:assert/strict'
import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { createRequire } from 'node:module'
import test from 'node:test'

const { prepareAndroidExport } = createRequire(import.meta.url)('../tools/prepare-android.cjs') as {
  prepareAndroidExport(directory: string): { removed: number; bytes: number }
}
function fixture(platform: string) {
  const root = mkdtempSync(path.join(tmpdir(), 'payitaht-android-'))
  const buildings = path.join(root, 'images/game/buildings')
  mkdirSync(path.join(buildings, 'parcel-v7'), { recursive: true })
  writeFileSync(path.join(root, 'index.html'), `<meta name="payitaht-platform" content="${platform}"/>`)
  return { root, buildings }
}
test('Android export keeps phone/parcel sprites and pruning is idempotent', () => {
  const { root, buildings } = fixture('android')
  try {
    for (const name of ['divan-painted-1.webp', 'divan-painted-1-sm.webp', 'site.webp']) writeFileSync(path.join(buildings, name), 'sprite')
    writeFileSync(path.join(buildings, 'parcel-v7/konut-sm.webp'), 'parcel')
    assert.deepEqual(prepareAndroidExport(root), { removed: 1, bytes: 6 })
    assert.equal(existsSync(path.join(buildings, 'divan-painted-1.webp')), false)
    for (const name of ['divan-painted-1-sm.webp', 'site.webp', 'parcel-v7/konut-sm.webp']) assert.ok(existsSync(path.join(buildings, name)))
    assert.deepEqual(prepareAndroidExport(root), { removed: 0, bytes: 0 })
  } finally { rmSync(root, { recursive: true, force: true }) }
})
test('Android export refuses to prune a web build', () => {
  const { root, buildings } = fixture('web')
  try {
    const full = path.join(buildings, 'divan-painted-1.webp')
    writeFileSync(full, 'sprite')
    assert.throws(() => prepareAndroidExport(root), /non-Android/)
    assert.ok(existsSync(full))
  } finally { rmSync(root, { recursive: true, force: true }) }
})
test('Android export validates all phone counterparts before removing anything', () => {
  const { root, buildings } = fixture('android')
  try {
    for (const name of ['ambar-painted-1.webp', 'ambar-painted-1-sm.webp', 'divan-painted-1.webp']) writeFileSync(path.join(buildings, name), 'sprite')
    assert.throws(() => prepareAndroidExport(root), /Missing Android/)
    assert.ok(existsSync(path.join(buildings, 'ambar-painted-1.webp')))
  } finally { rmSync(root, { recursive: true, force: true }) }
})
