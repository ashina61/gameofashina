import { test } from 'node:test'
import assert from 'node:assert/strict'
import { lowMotion, particles, tokenCount } from './motion'

test('tokenCount grows with the amount but stays between 2 and 6', () => {
  assert.equal(tokenCount(0), 2)
  assert.equal(tokenCount(50), 3)
  assert.equal(tokenCount(900), 5)
  assert.equal(tokenCount(1_000_000), 6)
})

test('without a browser motion is on and particles are kept', () => {
  assert.equal(lowMotion(), false)
  assert.ok(particles(12) >= 6)
})
