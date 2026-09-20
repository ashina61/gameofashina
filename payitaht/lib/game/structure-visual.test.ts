import { test } from 'node:test'
import assert from 'node:assert/strict'
import { initialGame, execute, advance, freePlots, parseSave } from './engine'
import { structureVisual, cityGround } from './structure-visual'

test('port stays empty until requested, shows construction then finished dock after timer', () => {
  const game = initialGame(1000)
  game.buildings.divan = 3
  game.resources = { gold: 10000, wood: 10000, stone: 10000, knowledge: 10000 }
  assert.equal(structureVisual(game, 'liman'), 'empty')
  const start = execute(game, { type: 'build', id: 'liman', plot: freePlots(game, 'liman')[0] }, 1000)
  assert.equal(start.error, undefined)
  assert.equal(structureVisual(start.game, 'liman'), 'construction')
  assert.equal(structureVisual(parseSave(JSON.stringify(start.game)), 'liman'), 'construction')
  const complete = advance(start.game, start.game.queue[0].end)
  assert.equal(structureVisual(complete, 'liman'), 'built')
  assert.equal(structureVisual(complete, 'tersane'), 'empty')
})
test('queued construction does not reveal the finished building; upgrading preserves existing art', () => {
  const game = initialGame(1000)
  game.buildings.divan = 3
  game.resources = { gold: 10000, wood: 10000, stone: 10000, knowledge: 10000 }
  const upgrade = execute(game, { type: 'build', id: 'divan' }, 1000).game
  const queued = execute(upgrade, { type: 'build', id: 'liman' }, 1000).game
  assert.equal(structureVisual(queued, 'divan'), 'built')
  assert.equal(structureVisual(queued, 'liman'), 'queued')
  assert.equal(structureVisual(advance(queued, queued.queue[0].end), 'liman'), 'construction')
})
test('wall fortifications only replace the earth trench after construction completes', () => {
  const game = initialGame(1000)
  game.buildings.kisla = 1
  game.resources = { gold: 10000, wood: 10000, stone: 10000, knowledge: 10000 }
  assert.equal(cityGround(game), 'city-empty')
  const start = execute(game, { type: 'build', id: 'surlar' }, 1000).game
  assert.equal(start.queue[0]?.id, 'surlar')
  assert.equal(cityGround(start), 'city-empty')
  assert.equal(cityGround(advance(start, start.queue[0].end)), 'city-fortified')
})
test('municipality is fixed in both move commands and legacy saves', () => {
  const game = initialGame(1000)
  const result = execute(game, { type: 'move', id: 'divan', plot: freePlots(game, 'sehir')[0] }, 1000)
  assert.match(result.error!, /sabit/)
  assert.deepEqual(result.game.placement, game.placement)
  const old = initialGame(1000)
  old.placement.divan = 2
  old.placement.konut = 0
  const restored = parseSave(JSON.stringify(old))
  assert.equal(restored.placement.divan, 0)
  assert.notEqual(restored.placement.konut, 0)
  assert.deepEqual(restored.resources, old.resources)
})
