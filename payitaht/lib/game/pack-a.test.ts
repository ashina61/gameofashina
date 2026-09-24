import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  ANARCHY_MS, GOVERNMENT_COOLDOWN_MS, actionPoints, advance, armyUpkeep, contentment, execute, forestCapacity, freePlots,
  initialGame, rates, recruitReason, soldiers, spyCapacity, wineConsumption, zoneOf, type BuildingId, type Game,
} from './engine'
import { battle } from './battle'
import { advanceEmpire, foundColony, initialEmpire, parseEmpire, renameCity } from './empire'
import { availableUnits, dispatchDeploy, safeStock } from './expeditions'
import { DAILY_TASKS, claimLogin, claimTask, dayKey, taskProgress } from './daily'

const now = 1_000_000
const MIN = 60_000
function place(g: Game, id: BuildingId, level: number) {
  if (g.placement[id] === null && id !== 'surlar') g.placement[id] = freePlots(g, zoneOf(id))[0]
  g.buildings[id] = level
}

test('government forms change the city after a short anarchy', () => {
  let g = advance(initialGame(now), now + MIN)
  g.resources.gold = 5000
  assert.match(execute(g, { type: 'government', id: 'meclis' }, now + MIN).error!, /Devlet Nizamı/)
  g.research.push('devlet')
  const before = contentment(g)
  const r = execute(g, { type: 'government', id: 'meclis' }, now + MIN)
  assert.equal(r.error, undefined)
  g = r.game
  assert.ok(contentment(g) < before, 'anarşi huzuru düşürür')
  g = advance(g, now + MIN + ANARCHY_MS + 1)
  assert.equal(contentment(g), before + 75)
  assert.match(execute(g, { type: 'government', id: 'ayan' }, g.updatedAt).error!, /yakın zamanda/)
  g = advance(g, now + MIN + GOVERNMENT_COOLDOWN_MS + 1)
  g.resources.gold = 5000
  assert.equal(execute(g, { type: 'government', id: 'ayan' }, g.updatedAt).error, undefined)
})

test('island forest takes workers, grows with donations and yields wood', () => {
  let g = advance(initialGame(now), now + MIN)
  g.workers = { kereste: 0, tas: 0, medrese: 0, carsi: 0 }
  const base = rates(g).wood
  g = execute(g, { type: 'foresters', value: 999 }, now + MIN).game
  assert.equal(g.forest.workers, forestCapacity(g))
  assert.ok(rates(g).wood > base)
  g.resources.wood = 5000
  g = execute(g, { type: 'forestDonate', amount: 400 }, now + MIN).game
  assert.equal(g.forest.level, 2)
  assert.equal(g.stats.donated, 400)
})

test('tavern serving level trades wine for contentment', () => {
  let g = initialGame(now)
  place(g, 'kahvehane', 3)
  g.luxury.uzum = 500
  const full = contentment(g)
  const wine = wineConsumption(g)
  g = execute(g, { type: 'tavern', value: 1 }, now).game
  assert.equal(g.tavern, 1)
  assert.ok(contentment(g) < full)
  assert.ok(wineConsumption(g) < wine)
})

test('demolishing lowers a level and frees the plot at zero', () => {
  let g = initialGame(now)
  place(g, 'hamam', 1)
  assert.match(execute(g, { type: 'demolish', id: 'divan' }, now).error!, /yıkılamaz/)
  g = execute(g, { type: 'demolish', id: 'hamam' }, now).game
  assert.equal(g.buildings.hamam, 0)
  assert.equal(g.placement.hamam, null)
})

test('new research has real effects', () => {
  const g = initialGame(now)
  place(g, 'elcilik', 2)
  const ap = actionPoints(g), spies = spyCapacity(g)
  g.research.push('burokrasi', 'casusluk')
  assert.equal(actionPoints(g), ap + 1)
  place(g, 'siginak', 2)
  assert.equal(spyCapacity(g), spies + 4)
  const safe = safeStock(g)
  g.research.push('koruma')
  assert.ok(safeStock(g) > safe)
  g.army.kadirga = 4
  const upkeep = armyUpkeep(g)
  g.research.push('zift')
  assert.ok(armyUpkeep(g) < upkeep)
  g.luxury.kristal = 300
  assert.match(execute(g, { type: 'experiment', batches: 2 }, now).error!, /Deneyler/)
  g.research.push('deney')
  const r = execute(g, { type: 'experiment', batches: 2 }, now)
  assert.equal(r.game.luxury.kristal, 100)
})

test('new units need their research', () => {
  const g = initialGame(now)
  place(g, 'kisla', 6); place(g, 'tersane', 6)
  assert.match(recruitReason(g, 'deli', 1)!, /Şeref/)
  assert.match(recruitReason(g, 'humbaraci', 1)!, /Kuş Uçuşu/)
  assert.match(recruitReason(g, 'karamursel', 1)!, /Hafif Tekneler/)
  assert.match(recruitReason(g, 'ikmal_gemisi', 1)!, /İkmal/)
  assert.match(recruitReason(g, 'humbara_gemisi', 1)!, /Havan/)
})

test('ranged units run out of ammunition after three rounds', () => {
  const archers = battle({ troops: { okcu: 40 }, attackMul: 1, defenseMul: 1 }, { troops: { mizrakci: 60 }, attackMul: 0.1, defenseMul: 1 })
  const lateLoss = archers.rounds.slice(3).reduce((s, r) => s + (r.defenderLoss.mizrakci ?? 0), 0)
  const earlyLoss = archers.rounds.slice(0, 3).reduce((s, r) => s + (r.defenderLoss.mizrakci ?? 0), 0)
  assert.ok(lateLoss < earlyLoss, `${earlyLoss} ${lateLoss}`)
})

test('troops move between own cities and only as many as fit', () => {
  let e = initialEmpire(now)
  const cap = e.cities[0].game
  place(cap, 'saray', 1); place(cap, 'liman', 1); cap.army.nakliye = 4
  cap.resources = { gold: 5000, wood: 5000, stone: 5000, knowledge: 0 }
  e = foundColony(e, 'zeytin', now).empire
  e.activeCityId = 'city-1'
  e.cities[0].game.army.yeniceri = 30
  const sent = dispatchDeploy(e, 'city-2', { yeniceri: 30 }, now + 1000)
  assert.equal(sent.error, undefined)
  const m = sent.empire.missions![0]
  assert.equal(m.units.nakliye, 1)
  const arrived = advanceEmpire(sent.empire, m.arriveAt)
  assert.equal(arrived.cities[1].game.army.yeniceri, 30)
  assert.equal(arrived.cities[0].game.army.yeniceri, 0)
  assert.ok(soldiers(arrived.cities[1].game) <= 200)
  const home = advanceEmpire(arrived, m.returnAt)
  assert.equal(availableUnits(home, 'city-1').nakliye, 4)
  assert.deepEqual(parseEmpire(JSON.stringify(sent.empire)).missions, sent.empire.missions)
})

test('cities can be renamed', () => {
  const e = initialEmpire(now)
  assert.equal(renameCity(e, 'city-1', '  Yeni   Kent ', now).empire.cities[0].name, 'Yeni Kent')
  assert.match(renameCity(e, 'city-1', 'x', now).error!, /2-24/)
})

test('daily tasks and login streak pay out once', () => {
  let e = advanceEmpire(initialEmpire(now), now + 1000)
  const gold = e.cities[0].game.resources.gold
  assert.equal(claimLogin(e, now + 2000), undefined)
  assert.ok(e.cities[0].game.resources.gold > gold)
  assert.match(claimLogin(e, now + 3000)!, /alındı/)
  assert.equal(e.daily!.tasks.length, 3)
  const next = advanceEmpire(e, now + 86_400_000)
  assert.notEqual(next.daily!.day, dayKey(now))
  assert.equal(claimLogin(next, now + 86_400_000), undefined)
  assert.equal(next.daily!.streak, 2)
  // Bir görevi tamamla.
  const id = next.daily!.tasks[0]
  const t = DAILY_TASKS.find(x => x.id === id)!
  assert.match(claimTask(next, id, now + 86_400_000)!, /bitmedi/)
  if (['builds', 'trained', 'researched', 'donated'].includes(t.key)) (next.cities[0].game.stats as Record<string, number>)[t.key] += t.need
  else next.stats = { raids: 0, spies: 0, piracy: 0, shipments: 0, [t.key]: t.need }
  assert.equal(taskProgress(next, id), t.need)
  assert.equal(claimTask(next, id, now + 86_400_000), undefined)
  assert.match(claimTask(next, id, now + 86_400_000)!, /zaten/)
  e = parseEmpire(JSON.stringify(next))
  assert.deepEqual(e.daily, next.daily)
})
