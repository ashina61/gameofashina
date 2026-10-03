import test from 'node:test'
import assert from 'node:assert/strict'
import { IDLE_FPS, LITE_FPS, setFrameCap, wantedFps } from './frame-cap'

function fakeLoop(running = true) {
  const calls: string[] = []
  const loop = { fpsLimit: 0, hasFpsLimit: false, running, _limitRate: 0,
    sleep() { calls.push('sleep'); this.running = false }, wake() { calls.push('wake'); this.running = true } }
  return { loop, calls }
}

test('an idle city is capped, a touched one is not (lite mode keeps a ceiling)', () => {
  assert.equal(wantedFps(true, false), IDLE_FPS)
  assert.equal(wantedFps(false, false), 0)
  assert.equal(wantedFps(false, true), LITE_FPS)
  assert.equal(wantedFps(true, true), IDLE_FPS)
})

test('changing the cap restarts a running loop and leaves a sleeping one asleep', () => {
  const a = fakeLoop(true)
  setFrameCap(a.loop, 20)
  assert.deepEqual([a.loop.fpsLimit, a.loop.hasFpsLimit, a.loop._limitRate], [20, true, 50])
  assert.deepEqual(a.calls, ['sleep', 'wake'])
  setFrameCap(a.loop, 20)
  assert.deepEqual(a.calls, ['sleep', 'wake'], 'same cap does nothing')
  setFrameCap(a.loop, 0)
  assert.deepEqual([a.loop.hasFpsLimit, a.loop._limitRate], [false, 0])
  const b = fakeLoop(false)
  setFrameCap(b.loop, 20)
  assert.deepEqual(b.calls, [])
  assert.equal(b.loop.fpsLimit, 20)
})
