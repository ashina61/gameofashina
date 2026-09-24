import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  advance, cityDefense, execute, exchangeRate, futureCost, initialGame, maxPopulation, miracle, miracleCost,
  parseSave, population, power, rates, travelFactor, wonderCost, RESEARCH, RESEARCH_IDS,
} from './engine'
import { advanceEmpire, foundColony, initialEmpire } from './empire'

const now = 1_000_000
const MIN = 60_000

test('population grows toward its ceiling over time instead of jumping', () => {
  let g = advance(initialGame(now), now + MIN)
  const start = population(g)
  assert.equal(start, maxPopulation(g))
  g.buildings.konut += 3 // +120 barınma, ama huzur tavanı da yükselmeli
  g.buildings.hamam += 2
  const target = maxPopulation(g)
  assert.ok(target > start)
  g = advance(g, now + 2 * MIN)
  assert.ok(population(g) > start && population(g) < target, `${population(g)} ${target}`)
  g = advance(g, now + 8 * 60 * MIN)
  assert.equal(population(g), target)
})

test('old saves without citizens start at the ceiling', () => {
  const g = initialGame(now)
  delete g.citizens
  const loaded = parseSave(JSON.stringify(g))
  assert.equal(population(loaded), maxPopulation(loaded))
})

test('priests gather faith and call the island wonder miracle', () => {
  let g = initialGame(now)
  g.buildings.cami = 2
  g = execute(g, { type: 'priests', value: 16 }, now).game
  assert.equal(g.temple.priests, 16)
  // Harika yokken mucize olmaz.
  assert.match(execute(g, { type: 'miracle' }, now).error!, /harika/i)
  g.resources.wood = wonderCost(0)
  g = execute(g, { type: 'wonder', amount: wonderCost(0) }, now).game
  assert.equal(g.temple.wonderLevel, 1)
  assert.match(execute(g, { type: 'miracle' }, now).error!, /inanç/)
  const minutes = Math.ceil(miracleCost(1) / (16 * 0.5))
  g = advance(g, now + minutes * MIN)
  assert.ok(g.temple.faith >= miracleCost(1))
  const before = cityDefense(g)
  const r = execute(g, { type: 'miracle' }, now + minutes * MIN)
  assert.equal(r.error, undefined)
  assert.equal(miracle(r.game, 'kalkan'), 1)
  assert.ok(cityDefense(r.game) >= before)
  // Süre dolunca etki biter, dinlenme süresi başlar.
  const later = advance(r.game, r.game.temple.until + MIN)
  assert.equal(miracle(later, 'kalkan'), 0)
  assert.match(execute(later, { type: 'miracle' }, later.updatedAt).error!, /dinleniyor/)
})

test('colonies take their island wonder', () => {
  let e = initialEmpire(now)
  const cap = e.cities[0].game
  cap.buildings.saray = 1; cap.buildings.liman = 1; cap.army.nakliye = 3
  cap.resources = { gold: 5000, wood: 5000, stone: 5000, knowledge: 0 }
  e = foundColony(e, 'kizil', now).empire
  e = advanceEmpire(e, now + MIN)
  assert.equal(e.cities[0].game.temple.wonder, 'kalkan')
  assert.equal(e.cities[1].game.temple.wonder, 'savas')
})

test('Tophane upgrades raise one unit type', () => {
  let g = initialGame(now)
  g.army.yeniceri = 10
  const base = power(g, 'kara').attack
  assert.match(execute(g, { type: 'upgrade', id: 'yeniceri', stat: 'atk' }, now).error!, /Tophane/)
  g.buildings.tophane = 2
  g.resources.gold = 10_000; g.luxury.kristal = 1000
  const r = execute(g, { type: 'upgrade', id: 'yeniceri', stat: 'atk' }, now)
  assert.equal(r.error, undefined)
  assert.equal(r.game.upgrades.yeniceri?.atk, 1)
  assert.ok(power(r.game, 'kara').attack > base)
  // Tophane 2 → en fazla 1. seviye.
  assert.match(execute(r.game, { type: 'upgrade', id: 'yeniceri', stat: 'atk' }, now).error!, /Tophane/)
  assert.match(execute(g, { type: 'upgrade', id: 'casus', stat: 'atk' }, now).error!, /savaşmaz/)
})

test('future research repeats after a branch is complete', () => {
  let g = initialGame(now)
  g.resources.knowledge = 100_000
  assert.match(execute(g, { type: 'future', branch: 'ekonomi' }, now).error!, /araştırmaları/)
  g.research = RESEARCH_IDS.filter(id => RESEARCH[id].branch === 'ekonomi')
  const gold = rates(g).gold
  g = execute(g, { type: 'future', branch: 'ekonomi' }, now).game
  g = execute(g, { type: 'future', branch: 'ekonomi' }, now).game
  assert.equal(g.future.ekonomi, 2)
  assert.ok(rates(g).gold > gold)
  assert.equal(Math.round(100_000 - g.resources.knowledge), futureCost(0) + futureCost(1))
  g.research.push(...RESEARCH_IDS.filter(id => RESEARCH[id].branch === 'denizcilik'))
  const t = travelFactor(g)
  g = execute(g, { type: 'future', branch: 'denizcilik' }, now).game
  assert.ok(travelFactor(g) < t)
})

test('black market exchanges any good at a loss', () => {
  let g = initialGame(now)
  assert.match(execute(g, { type: 'exchange', from: 'wood', to: 'kristal', amount: 300 }, now).error!, /Kara Pazar/)
  g.buildings.kara_pazar = 2
  const rate = exchangeRate(g)
  const r = execute(g, { type: 'exchange', from: 'wood', to: 'kristal', amount: 300 }, now)
  assert.equal(r.error, undefined)
  assert.equal(r.game.luxury.kristal, Math.floor(300 / rate))
  assert.match(execute(g, { type: 'exchange', from: 'wood', to: 'kristal', amount: 5000 }, now).error!, /en fazla/)
  g = r.game
  assert.match(execute(g, { type: 'exchange', from: 'wood', to: 'wood', amount: 10 }, now).error!, /Geçersiz/)
})
