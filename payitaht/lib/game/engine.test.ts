import { test } from 'node:test'
import assert from 'node:assert/strict'
import { advance, assignedWorkers, capacity, cost, execute, freePlots, idleWorkers, initialGame, parseSave, population, PLOTS, rates, researchReason, duration, workerCapacity, WORKERS_PER_LEVEL } from './engine'

const now = 1_000_000

test('production uses elapsed time and never exceeds storage capacity', () => {
  const g = initialGame(now)
  const result = advance(g, now + 60_000)
  assert.equal(result.resources.wood, g.resources.wood + 120)
  assert.equal(advance(g, now + 24 * 3600_000).resources.wood, capacity(g))
  assert.deepEqual(advance(g, now - 100), g)
})
test('insufficient resources and prerequisites prevent construction', () => {
  const g = initialGame(now)
  assert.match(execute(g, { type: 'build', id: 'medrese' }, now).error!, /Divanhane/)
  g.resources = { gold: 0, wood: 0, stone: 0, knowledge: 0 }
  const result = execute(g, { type: 'build', id: 'divan' }, now)
  assert.match(result.error!, /kaynak/)
  assert.equal(result.game.construction, null)
})
test('double action charges only once and completion applies once', () => {
  const g = initialGame(now), price = cost(g, 'divan')
  const first = execute(g, { type: 'build', id: 'divan' }, now).game
  const second = execute(first, { type: 'build', id: 'divan' }, now)
  assert.ok(second.error)
  assert.equal(second.game.resources.gold, g.resources.gold - price.gold)
  const end = first.construction!.end
  const completed = advance(second.game, end)
  assert.equal(completed.buildings.divan, 2)
  assert.equal(completed.construction, null)
  assert.equal(advance(completed, end + 1000).buildings.divan, 2)
})
test('offline upgrade uses old production before completion and new rate after', () => {
  const g = initialGame(now)
  const started = execute(g, { type: 'build', id: 'kereste' }, now).game
  const result = advance(started, now + 60_000)
  assert.equal(result.resources.wood, started.resources.wood + 60 + 120)
})
test('research requires academy and applies production bonus once', () => {
  const g = initialGame(now)
  assert.match(researchReason(g, 'tools')!, /Medrese/)
  g.buildings.medrese = 1
  const started = execute(g, { type: 'research', id: 'tools' }, now).game
  const completed = advance(started, now + 60_000)
  assert.equal(completed.resources.wood, g.resources.wood + 60 + 72)
  assert.equal(rates(completed).wood, 144)
  assert.deepEqual(completed.research, ['tools'])
  assert.ok(execute(completed, { type: 'research', id: 'tools' }, now + 60_000).error)
})
test('independent queues process events chronologically', () => {
  const g = initialGame(now)
  g.buildings.medrese = 1
  const build = execute(g, { type: 'build', id: 'kereste' }, now).game
  const research = execute(build, { type: 'research', id: 'tools' }, now + 5000).game
  const completed = advance(research, now + 60_000)
  assert.equal(completed.buildings.kereste, 2)
  assert.ok(completed.research.includes('tools'))
  assert.equal(completed.construction, null)
  assert.equal(completed.study, null)
})
test('storage and architecture research change real mechanics', () => {
  const g = initialGame(now), cap = capacity(g), original = duration(g, 'divan')
  g.research = ['storage', 'architecture']
  assert.equal(capacity(g), cap * 1.25)
  assert.equal(duration(g, 'divan'), Math.round(original * .75))
})
test('objective rewards cannot be claimed early or twice', () => {
  const g = initialGame(now)
  assert.ok(execute(g, { type: 'claim', id: 'first-upgrade' }, now).error)
  g.buildings.divan = 2
  const claimed = execute(g, { type: 'claim', id: 'first-upgrade' }, now).game
  assert.equal(claimed.resources.gold, g.resources.gold + 150)
  const second = execute(claimed, { type: 'claim', id: 'first-upgrade' }, now)
  assert.ok(second.error)
  assert.equal(second.game.resources.gold, claimed.resources.gold)
})
test('offline production stops at 8 hours even for non-full resources', () => {
  const g = initialGame(now)
  g.buildings.medrese = 1
  /*
   * Medrese KADROLANIR.
   *
   * v2'de uretim isci sayisina baglidir; iscisiz bir yapi uretmez. Testin
   * konusu 8 saatlik cevrimdisi siniri oldugu icin yapi tam kapasiteyle
   * calistirilir - boylece beklenen sayi eski dengeyle ayni kalir.
   */
  g.workers.medrese = WORKERS_PER_LEVEL
  g.resources.knowledge = 0
  assert.equal(advance(g, now + 24 * 3600_000).resources.knowledge, 8 * 60 * 8)
})
test('save validation rejects malformed saves without silently losing data', () => {
  const g = initialGame(now)
  assert.deepEqual(parseSave(JSON.stringify(g)), g)
  assert.throws(() => parseSave('{'))
  assert.throws(() => parseSave(JSON.stringify({ ...g, version: 99 })))
  assert.throws(() => parseSave(JSON.stringify({ ...g, construction: { kind: 'build', id: 'invalid', start: now, end: now + 1 } })))
  assert.throws(() => parseSave(JSON.stringify({ ...g, resources: { ...g.resources, gold: -1 } })))
})

/* ---------------------------------------------------------------------------
 * v2: ISCI DAGITIMI VE ARSALAR
 * ------------------------------------------------------------------------ */

test('uretim isci sayisiyla orantilidir', () => {
  const full = initialGame(now)
  const half = { ...full, workers: { ...full.workers, kereste: WORKERS_PER_LEVEL / 2 } }
  assert.equal(rates(full).wood, 120)
  assert.equal(rates(half).wood, 60)
  // Akce halkin vergisidir; isci istemez.
  assert.equal(rates(half).gold, rates(full).gold)
})

test('isci atamasi kapasite ve nufusla sinirlidir', () => {
  const g = initialGame(now)
  // Kapasite: seviye 1 x 20 isci.
  const over = execute(g, { type: 'workers', id: 'kereste', value: 999 }, now).game
  assert.equal(over.workers.kereste, WORKERS_PER_LEVEL)
  // Nufus 120; tas ocagi da kapasitesine kadar alabilir.
  const both = execute(over, { type: 'workers', id: 'tas', value: 999 }, now).game
  assert.equal(both.workers.tas, WORKERS_PER_LEVEL)
  assert.equal(idleWorkers(both), population(both) - 2 * WORKERS_PER_LEVEL)
})

test('nufus dolunca yeni atama bostaki halkla sinirlanir', () => {
  const g = initialGame(now)
  // Nufusu yapay olarak dusur: konutu sifirlamak yerine dogrudan kalabalik kur.
  const crowded: typeof g = { ...g, buildings: { ...g.buildings, kereste: 5, tas: 5 } }
  const all = execute(crowded, { type: 'workers', id: 'kereste', value: 999 }, now).game
  assert.equal(all.workers.kereste, 5 * WORKERS_PER_LEVEL)
  const rest = execute(all, { type: 'workers', id: 'tas', value: 999 }, now).game
  // Nufus 120, keresteye 100 gitti; tasa yalnizca 20 kalir.
  assert.equal(rest.workers.tas, population(rest) - all.workers.kereste)
  assert.equal(idleWorkers(rest), 0)
})

test('yukseltme biten uretim yapisina bosta halk KENDILIGINDEN gider', () => {
  let g = initialGame(now)
  g = execute(g, { type: 'build', id: 'kereste' }, now).game
  const before = g.workers.kereste
  const after = advance(g, g.construction!.end + 1)
  assert.equal(after.buildings.kereste, 2)
  assert.equal(after.workers.kereste, before + WORKERS_PER_LEVEL)
})

test('yeni yapi BOS bir arsaya oturur, ayni arsaya iki yapi girmez', () => {
  const g = initialGame(now)
  assert.equal(g.placement.medrese, null)
  const free = freePlots(g)
  assert.equal(free.length, PLOTS.length - 5)

  const rich = { ...g, buildings: { ...g.buildings, divan: 2 }, resources: { gold: 9e4, wood: 9e4, stone: 9e4, knowledge: 9e4 } }
  const built = execute(rich, { type: 'build', id: 'medrese', plot: free[1] }, now)
  assert.equal(built.error, undefined)
  assert.equal(built.game.placement.medrese, free[1])
  // Dolu bir arsa reddedilir.
  const clash = execute(rich, { type: 'build', id: 'medrese', plot: rich.placement.divan! }, now)
  assert.equal(clash.game.placement.medrese, null)
  assert.match(clash.error ?? '', /arsa/i)
})

test('adadaki yedinci arsa gercekten oynanabilir', () => {
  // Olcum adada yedi arsa buldu; motor eskiden altisini taniyordu.
  assert.equal(PLOTS.length, 7)
  const g = initialGame(now)
  assert.equal(freePlots(g).length, 2)
})

test('v1 kaydi v2ye tasinir: yerlesim ve isciler turetilir', () => {
  const legacy = {
    version: 1, updatedAt: now,
    resources: { gold: 100, wood: 100, stone: 100, knowledge: 10 },
    buildings: { divan: 2, konut: 1, kereste: 3, tas: 1, ambar: 1, medrese: 0 },
    research: [], construction: null, study: null, claimed: [],
    log: [{ text: 'eski sehir', time: now }],
  }
  const g = parseSave(JSON.stringify(legacy))
  assert.equal(g.version, 2)
  assert.equal(g.placement.divan, 0)
  // Kurulmamis yapi arsa tutmaz.
  assert.equal(g.placement.medrese, null)
  // Isciler kapasiteye kadar doldurulur; boylece uretim eski degeriyle ayni kalir.
  assert.equal(g.workers.kereste, Math.min(3 * WORKERS_PER_LEVEL, population(g)))
  assert.equal(rates(g).stone, 90)
})

test('bozuk yerlesim reddedilir: iki yapi ayni arsada olamaz', () => {
  const g = initialGame(now)
  const broken = { ...g, placement: { ...g.placement, konut: g.placement.divan } }
  assert.throws(() => parseSave(JSON.stringify(broken)))
})

test('kayittaki asiri isci sayisi budanir', () => {
  const g = initialGame(now)
  const greedy = { ...g, workers: { kereste: 9999, tas: 9999, medrese: 0 } }
  const parsed = parseSave(JSON.stringify(greedy))
  assert.ok(assignedWorkers(parsed) <= population(parsed))
  assert.ok(parsed.workers.kereste <= workerCapacity(parsed, 'kereste'))
})
