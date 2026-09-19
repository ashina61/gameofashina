import { test } from 'node:test'
import assert from 'node:assert/strict'
import { SLOTS, TILE_W, TILE_H } from './layout'
import { buildingPlacement, toWorldY } from './city-render'
import { initialGame, parseSave, execute, BUILDING_IDS, takesPlot, zoneOf } from './engine'

test('town courtyards match the environment and keep harbors on the water', () => {
  assert.equal(SLOTS.length,18)
  assert.equal(SLOTS.filter(p=>p.zone==='sehir').length,16)
  assert.deepEqual(SLOTS.filter(p=>p.zone==='liman').map(p=>p.index),[16,17])
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
  const result=execute(game,{type:'build',id:'carsi',plot:16},1000)
  assert.ok(result.error)
  assert.deepEqual(result.game.resources,game.resources)
  assert.deepEqual(result.game.queue,[])
})

test('old fully built 25-plot cities migrate without losing buildings, resources or progress', () => {
  const old = initialGame(1000)
  let index = 12
  for (const id of BUILDING_IDS) {
    old.buildings[id] = 1
    old.placement[id] = !takesPlot(id) ? null : id === 'divan' ? 0 : id === 'liman' ? 23 : id === 'tersane' ? 24 : index++
  }
  const restored = parseSave(JSON.stringify(old))
  assert.deepEqual(restored.buildings,old.buildings)
  assert.deepEqual(restored.resources,old.resources)
  assert.deepEqual(restored.research,old.research)
  const placed = Object.values(restored.placement).filter(p=>p!==null)
  assert.equal(new Set(placed).size,placed.length)
  for(const id of BUILDING_IDS) if(takesPlot(id)) {
    assert.equal(SLOTS[restored.placement[id]!].zone,zoneOf(id))
  }
})
