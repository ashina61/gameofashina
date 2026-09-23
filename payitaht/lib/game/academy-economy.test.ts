import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  BUILDING_GROWTH, BUILDING_IDS, RESEARCH, RESEARCH_IDS, advance, capacity,
  constructionDiscount, cost, duration, execute, initialGame, rates,
  researchReason, scientistCount, scientistUpkeepPerMinute, unitCost,
} from './engine'

const now = 1_000_000
test('research tree has unique well-defined skills, effects and accessible root technologies', () => {
  assert.equal(new Set(RESEARCH_IDS).size, RESEARCH_IDS.length)
  assert.ok(RESEARCH_IDS.length >= 25)
  for (const id of RESEARCH_IDS) {
    const r = RESEARCH[id]
    assert.ok(r.cost > 0 && r.duration > 0 && r.required >= 1)
    if (r.needs) assert.notEqual(r.needs, id)
  }
  const g = initialGame(now)
  g.buildings.medrese = 1
  assert.equal(researchReason(g, 'makara'), null)
  assert.match(researchReason(g, 'geometri') ?? '', /Makara Düzeni/)
  assert.match(researchReason(g, 'mekanik_kalem') ?? '', /Mürekkep/)
})

test('old first-build costs and first two upgrade timers remain compatible', () => {
  const g = initialGame(now)
  for (const id of BUILDING_IDS) {
    const projected = { ...g, buildings: { ...g.buildings, [id]: 0 } }
    const price = cost(projected, id)
    assert.equal(price.gold, BUILDING_GROWTH[id] ** 0 * Math.round(price.gold))
    assert.equal(price.wood, Math.round(price.gold * 1.2))
    assert.equal(price.stone, Math.round(price.gold * .75))
  }
  g.buildings.divan = 1
  assert.equal(duration(g, 'divan'), 30)
  g.buildings.divan = 2
  assert.equal(duration(g, 'divan'), 40)
})

test('different building upgrade curves and construction researches reduce only future material prices', () => {
  const g = initialGame(now)
  g.buildings.divan = 8
  g.buildings.saray = 8
  assert.notEqual(BUILDING_GROWTH.divan, BUILDING_GROWTH.saray)
  assert.ok(duration(g, 'saray') > duration(g, 'divan'))
  const before = cost(g, 'divan')
  g.research = ['makara', 'geometri', 'su_terazisi']
  assert.ok(Math.abs(constructionDiscount(g) - .14) < 1e-10)
  const after = cost(g, 'divan')
  assert.equal(after.gold, before.gold)
  assert.equal(after.wood, Math.round(before.gold * 1.2 * .86))
  assert.equal(after.stone, Math.round(before.gold * .75 * .86))
  assert.ok(after.wood < before.wood && after.stone < before.stone)
})

test('academy scientist staffing generates knowledge and deducts upkeep without negative gold', () => {
  const g = initialGame(now)
  const baseline = rates(g)
  g.buildings.medrese = 1
  g.workers.medrese = 20
  assert.equal(scientistCount(g), 20)
  assert.equal(scientistUpkeepPerMinute(g), 3)
  assert.equal(rates(g).gold, baseline.gold - 3)
  assert.equal(rates(g).knowledge, 8)
  g.research = ['kagit', 'murekkep', 'mekanik_kalem']
  assert.ok(Math.abs(rates(g).knowledge - 9.12) < 1e-10)
})

test('late-game warehouse can hold higher building upgrade costs', () => {
  const g = initialGame(now)
  assert.equal(capacity(g), 4500)
  g.buildings.ambar = 12
  const old = capacity(g)
  g.research = ['storage', 'ambar_teknigi']
  assert.ok(capacity(g) > old * 1.4)
  assert.ok(capacity(g) > 4500)
})

test('researched training bonuses apply to real troop price, speed and combat', () => {
  const g = initialGame(now)
  const base = unitCost('yeniceri', 5, g)
  const t = duration(g, 'kisla')
  g.research = ['askeri_lojistik', 'talim']
  const discounted = unitCost('yeniceri', 5, g)
  assert.equal(discounted.gold, Math.floor(base.gold * .9))
  assert.equal(discounted.wood, Math.floor(base.wood * .9))
  assert.equal(duration(g, 'kisla'), t) // troop drill does not change construction duration
})

test('existing saved building levels and research queue survive new tech catalog', () => {
  const g = initialGame(now)
  g.buildings.divan = 3
  g.buildings.medrese = 1
  g.placement.medrese = 10
  g.resources.knowledge = 200
  const started = execute(g, { type:'research', id:'makara' }, now)
  assert.equal(started.error, undefined)
  const done = advance(started.game, now + RESEARCH.makara.duration * 1000)
  assert.ok(done.research.includes('makara'))
  assert.equal(done.buildings.divan, 3)
})
