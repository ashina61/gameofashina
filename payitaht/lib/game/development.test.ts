import test from 'node:test'
import assert from 'node:assert/strict'
import sharp from 'sharp'
import { advanceEmpire, capitalCity, foundColony, initialEmpire, parseEmpire, shipResources, type Empire } from './empire'
import { DAILY_TASKS, claimTask, dailyTaskAvailable, ensureDaily } from './daily'
import { expansionPlan } from './expansion-plan'
import { RESEARCH_IDS, execute, freePlotsFor, type BuildingId } from './engine'
import { PARCEL_PLOTS, buildingRoadClear, cityArtOutline, cityBuildingArtFrame, cityBuildingImage, cityBuildingTextureKey, divanStage, parcelContainsPoint } from './city-map/parcel-city'

const NOW = Date.UTC(2026, 10, 18, 9)
const nextStep = (empire: Empire) => expansionPlan(empire).find(step => !step.done)

function place(empire: Empire, id: BuildingId, level = 1) {
  const game = capitalCity(empire).game
  if (id !== 'surlar' && game.placement[id] === null) game.placement[id] = freePlotsFor(game, id)[0]
  game.buildings[id] = level
}

test('new cities get usable daily tasks and keep the same tasks while unlocking buildings', () => {
  for (let day = 0; day < 30; day++) {
    const empire = initialEmpire(NOW + day * 86_400_000)
    ensureDaily(empire, capitalCity(empire).game.updatedAt)
    assert.equal(empire.daily!.tasks.length, 3)
    assert.equal(new Set(empire.daily!.tasks).size, 3)
    for (const id of empire.daily!.tasks) assert.ok(dailyTaskAvailable(empire, DAILY_TASKS.find(task => task.id === id)!))
    assert.ok(!empire.daily!.tasks.includes('ship1'))
    const chosen = [...empire.daily!.tasks]
    place(empire, 'medrese')
    place(empire, 'kisla')
    ensureDaily(empire, capitalCity(empire).game.updatedAt)
    assert.deepEqual(empire.daily!.tasks, chosen)
  }
})

test('old daily saves replace inaccessible unclaimed tasks while preserving claims and progress', () => {
  const empire = initialEmpire(NOW)
  ensureDaily(empire, NOW)
  empire.daily!.tasks = ['ship1', 'spy1', 'build2']
  empire.daily!.claimed = ['build2']
  const baseline = { ...empire.daily!.base }
  ensureDaily(empire, NOW)
  assert.equal(empire.daily!.tasks.length, 3)
  assert.ok(!empire.daily!.tasks.includes('ship1') && !empire.daily!.tasks.includes('spy1'))
  assert.deepEqual(empire.daily!.claimed, ['build2'])
  assert.deepEqual(empire.daily!.base, baseline)
  assert.match(claimTask(empire, 'build2', NOW) ?? '', /zaten/)
  const restored = parseEmpire(JSON.stringify(empire))
  assert.deepEqual(restored.daily, empire.daily)
})

test('a completed final-research daily stays claimable after the research pool is exhausted', () => {
  const empire = initialEmpire(NOW)
  ensureDaily(empire, NOW)
  place(empire, 'medrese', 32)
  empire.daily!.tasks = ['research1', 'build2', 'donate500']
  capitalCity(empire).game.research = [...RESEARCH_IDS]
  capitalCity(empire).game.stats.researched = empire.daily!.base.researched + 1
  ensureDaily(empire, NOW)
  assert.ok(empire.daily!.tasks.includes('research1'))
  assert.equal(claimTask(empire, 'research1', NOW), undefined)
})

test('the expansion plan follows the real colony and shipment entry points across active cities', () => {
  let empire = advanceEmpire(initialEmpire(NOW), NOW)
  assert.deepEqual(expansionPlan(empire), [])
  capitalCity(empire).game.claimed.push('first-raid')
  assert.equal(nextStep(empire)?.id, 'divan')
  place(empire, 'divan', 3)
  place(empire, 'liman')
  place(empire, 'saray')
  assert.equal(nextStep(empire)?.id, 'fleet')
  capitalCity(empire).game.army.nakliye = 3
  capitalCity(empire).game.resources = { gold: 4000, wood: 4000, knowledge: 40 }
  assert.equal(nextStep(empire)?.id, 'colony')
  const founded = foundColony(empire, 'zeytin', NOW)
  assert.equal(founded.error, undefined)
  empire = founded.empire
  const colony = empire.cities.find(city => city.id === empire.activeCityId)!
  assert.equal(nextStep(empire)?.id, 'governor')
  assert.equal(nextStep(empire)?.target.cityId, colony.id)
  // Use the engine for the first colony building and its population assignment.
  colony.game.resources.gold = 1000
  colony.game.resources.wood = 1000
  const built = execute(colony.game, { type: 'build', id: 'valilik' }, NOW)
  assert.equal(built.error, undefined)
  colony.game = built.game
  empire = advanceEmpire(empire, built.game.queue[0].end)
  assert.equal(nextStep(empire)?.id, 'miners')
  const current = empire.cities.find(city => city.id === colony.id)!
  current.game = execute(current.game, { type: 'miners', value: 5 }, current.game.updatedAt).game
  assert.equal(current.game.mine.miners, 5)
  assert.equal(nextStep(empire)?.id, 'cargo')
  empire.activeCityId = capitalCity(empire).id
  const sent = shipResources(empire, colony.id, 'wood', 100, current.game.updatedAt)
  assert.equal(sent.error, undefined)
  assert.equal(nextStep(sent.empire), undefined)
  assert.equal(nextStep(parseEmpire(JSON.stringify(sent.empire))), undefined)
})

test('five Divanhane stages have distinct cache keys and all alpha stays in the civic parcel', async () => {
  const levels = [1, 5, 10, 15, 20]
  assert.deepEqual([0, 4, 5, 9, 10, 14, 15, 19, 20, 32].map(divanStage), [1, 1, 5, 5, 10, 10, 15, 15, 20, 20])
  assert.equal(new Set(levels.map(level => cityBuildingTextureKey('divan', level))).size, 5)
  assert.equal(new Set(levels.map(level => cityBuildingImage('divan', level))).size, 5)
  const parcel = PARCEL_PLOTS[0]
  for (const level of levels) for (const size of ['full', 'sm'] as const) {
    const { data, info } = await sharp('public' + cityBuildingImage('divan', level, undefined, size)).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
    const outline = cityArtOutline('divan', level, size)!
    const frame = cityBuildingArtFrame('divan', parcel, info.width, info.height, outline)
    assert.ok(frame.width > 0 && frame.height > 0)
    assert.ok(buildingRoadClear(frame.polygon), `${level}/${size} covers a road`)
    let clear = 0
    for (let y = 0; y < info.height; y++) for (let x = 0; x < info.width; x++) {
      const alpha = data[(y * info.width + x) * 4 + 3]
      if (alpha === 0) clear++
      if (alpha >= 8) assert.ok(parcelContainsPoint(parcel, { x: frame.left + x / info.width * frame.width, y: frame.top + y / info.height * frame.height }), `${level}/${size} escapes the parcel`)
    }
    assert.ok(clear / (info.width * info.height) > .25)
    assert.ok(data[(Math.floor(info.height * .56) * info.width + Math.floor(info.width * .5)) * 4 + 3] < 8, `${level}/${size} has an opaque courtyard`)
  }
})
