import assert from 'node:assert/strict'
import test from 'node:test'
import { Capacitor } from '@capacitor/core'

test('native notification loading never assimilates a Capacitor proxy as a promise', { timeout: 2000 }, async t => {
  const previous = process.env.NEXT_PUBLIC_NATIVE
  process.env.NEXT_PUBLIC_NATIVE = '1'
  t.mock.method(Capacitor, 'isNativePlatform', () => true)
  try {
    const { notificationPermission, clearNotices } = await import('./notify')
    assert.equal(await notificationPermission(), 'none')
    await clearNotices()
  } finally {
    if (previous === undefined) delete process.env.NEXT_PUBLIC_NATIVE
    else process.env.NEXT_PUBLIC_NATIVE = previous
  }
})
