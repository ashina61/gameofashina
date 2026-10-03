import { test } from 'node:test'
import assert from 'node:assert/strict'
import { startClock, tickClock } from './clock'

const H = 3600_000

test('normal play follows the wall clock', () => {
  const { state, rewound } = startClock(1_000, 5_000, 100)
  assert.equal(rewound, false)
  assert.equal(state.game, 5_000)
  const t = tickClock(state, 6_000, 1_100)
  assert.equal(t.now, 6_000)
})

test('clock set back while the game was closed: game resumes from last seen, not earlier', () => {
  const { state, rewound } = startClock(10 * H, 2 * H, 0)
  assert.equal(rewound, true)
  assert.equal(state.game, 10 * H)
  // One real minute later (mono), wall still far behind: game moves one minute.
  const t = tickClock(state, 2 * H + 60_000, 60_000)
  assert.equal(t.now, 10 * H + 60_000)
})

test('clock set back while playing: only real elapsed time counts, never backwards', () => {
  let s = startClock(0, 10 * H, 0).state
  const a = tickClock(s, 10 * H + 1_000, 1_000); s = a.state
  const b = tickClock(s, 5 * H, 2_000)
  assert.equal(b.rewound, true)
  assert.equal(b.now, 10 * H + 2_000)
  // After the jump the game keeps pace with the new wall clock from there.
  const c = tickClock(b.state, 5 * H + 1_000, 3_000)
  assert.equal(c.now, 10 * H + 3_000)
})

test('forward jump (or phone sleep) passes through; the offline cap limits its gain', () => {
  const s = startClock(0, 10 * H, 0).state
  const t = tickClock(s, 14 * H, 5_000)
  assert.equal(t.rewound, false)
  assert.equal(t.now, 14 * H)
})
