import test from 'node:test'
import assert from 'node:assert/strict'
import { initialGame, OBJECTIVES, GUIDED_STEPS } from './engine'
import { firstSessionStep } from './first-session'

test('unfinished tutorial remains available after upgrading the town hall', () => {
  const game = initialGame(1)
  game.buildings.divan = 5
  assert.equal(firstSessionStep(game)?.objective.id, OBJECTIVES[0].id)
  game.claimed = OBJECTIVES.slice(0, 2).map(o => o.id)
  assert.equal(firstSessionStep(game)?.objective.id, OBJECTIVES[2].id)
})
test('completed guided objectives end the tutorial at any town hall level', () => {
  const game = initialGame(1)
  game.claimed = OBJECTIVES.slice(0, GUIDED_STEPS).map(o => o.id)
  assert.equal(firstSessionStep(game), null)
})
