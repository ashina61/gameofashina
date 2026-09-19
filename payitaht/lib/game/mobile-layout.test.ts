import { test } from 'node:test'
import assert from 'node:assert/strict'
import { SLOTS, TILE_W, TILE_H } from './layout'
import { buildingPlacement, toWorldY } from './city-render'
import { initialGame, parseSave, execute } from './engine'

test('redesigned town preserves all saved plot IDs and keeps harbors on the water', () => {
  assert.equal(SLOTS.length,25)
  assert.equal(SLOTS.filter(p=>p.zone==='sehir').length,23)
  assert.deepEqual(SLOTS.filter(p=>p.zone==='liman').map(p=>p.index),[23,24])
  for(const slot of SLOTS) assert.ok(slot.zone==='liman' ? slot.y >= 76 : slot.y <= 72)
  const game=initialGame(1000)
  assert.deepEqual(parseSave(JSON.stringify(game)).placement,game.placement)
})
test('plot diamonds do not overlap and drawing depths share world coordinates', () => {
  for(const a of SLOTS) for(const b of SLOTS) {
    if(a.index>=b.index) continue
    assert.ok(Math.abs(a.x-b.x)/TILE_W + Math.abs(a.y-b.y)/TILE_H >= 1,`plots ${a.index} and ${b.index} overlap`)
  }
  for(const slot of SLOTS) assert.equal(buildingPlacement('konut',slot).depth,toWorldY(slot.y))
})
test('a city building cannot charge resources when targeting a harbor plot', () => {
  const game=initialGame(1000)
  const result=execute(game,{type:'build',id:'carsi',plot:23},1000)
  assert.ok(result.error)
  assert.deepEqual(result.game.resources,game.resources)
  assert.deepEqual(result.game.queue,[])
})
