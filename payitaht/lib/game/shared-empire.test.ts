import { test } from 'node:test'
import assert from 'node:assert/strict'
import { execute, freePlots, RESEARCH } from './engine'
import { activeCity, advanceEmpire, foundColony, initialEmpire, syncShared, type Empire } from './empire'

/*
 * İMPARATORLUK GENELİ (0.42): araştırma, Gelecek seviyeleri, yönetim biçimi
 * ve Tophane yükseltmeleri bütün şehirlere ortaktır; yeni şehir baştan başlamaz.
 */
const now = Date.UTC(2026, 9, 1, 9)

function twoCities(): Empire {
  const e = initialEmpire(now)
  const g = e.cities[0].game
  g.buildings.saray = 1; g.placement.saray = freePlots(g, 'sehir')[0]
  g.buildings.liman = 1; g.placement.liman = freePlots(g, 'liman')[0]
  g.army.nakliye = 3
  g.resources.gold = 9000; g.resources.wood = 9000; g.resources.stone = 9000
  g.research.push('ticaret')
  g.future.ekonomi = 2
  g.upgrades = { yeniceri: { atk: 2, def: 1 } }
  g.government = { id: 'ayan', changedAt: now - 1000, anarchyUntil: now - 500 }
  const r = foundColony(e, 'zeytin', now)
  assert.equal(r.error, undefined)
  return r.empire
}

test('yeni şehir araştırmayı, Gelecek seviyesini, yönetimi ve yükseltmeleri başkentten alır', () => {
  const e = twoCities()
  const colony = activeCity(e).game
  assert.ok(colony.research.includes('ticaret'))
  assert.equal(colony.future.ekonomi, 2)
  assert.equal(colony.government.id, 'ayan')
  assert.deepEqual(colony.upgrades.yeniceri, { atk: 2, def: 1 })
})

test('bir şehirde biten araştırma ötekinde de bitmiş sayılır', () => {
  const e = twoCities()
  const id = (Object.keys(RESEARCH) as (keyof typeof RESEARCH)[]).find(r => !e.cities[0].game.research.includes(r))!
  e.cities[1].game.research.push(id)
  syncShared(e, now)
  assert.ok(e.cities[0].game.research.includes(id))
})

test('aynı araştırma iki şehirde birden yapılamaz; başka yerde biten iptal edilip iade edilir', () => {
  const e = twoCities()
  const [a, b] = e.cities
  const id = (Object.keys(RESEARCH) as (keyof typeof RESEARCH)[]).find(r => !RESEARCH[r].needs || a.game.research.includes(RESEARCH[r].needs!))!
  for (const c of [a, b]) { c.game.buildings.medrese = 10; c.game.resources.knowledge = 5000 }
  const started = execute(a.game, { type: 'research', id }, now)
  assert.equal(started.error, undefined)
  a.game = started.game
  syncShared(e, now)
  assert.match(execute(b.game, { type: 'research', id }, now).error!, /başka bir şehrinde/)
  // Eski kayıtta iki şehirde aynı araştırma sürüyorsa: biri bitince öteki iade alır.
  b.game.study = { id, kind: 'research', start: now, end: now + 10 * 3600_000 }
  const later = advanceEmpire(e, a.game.study!.end + 1000)
  assert.ok(later.cities[1].game.research.includes(id))
  assert.equal(later.cities[1].game.study, null)
  assert.ok(later.cities[1].game.log.some(l => l.text.includes('ilim iade edildi')))
})

test('yönetim değişikliği ve Tophane yükseltmesi her şehre geçer', () => {
  const e = twoCities()
  e.cities[1].game.government = { id: 'meclis', changedAt: now + 5000, anarchyUntil: now + 10_000 }
  e.cities[1].game.upgrades = { okcu: { atk: 1, def: 0 } }
  syncShared(e, now + 6000)
  assert.equal(e.cities[0].game.government.id, 'meclis')
  assert.deepEqual(e.cities[0].game.upgrades.okcu, { atk: 1, def: 0 })
  assert.deepEqual(e.cities[0].game.upgrades.yeniceri, { atk: 2, def: 1 })
})

test('ilim nakliye edilemez ve Kara Pazar\'da takas edilemez; yoldaki eski ilim yükü geri döner', async () => {
  const { shipResources, parseEmpire, CARGO_IDS } = await import('./empire')
  assert.equal((CARGO_IDS as readonly string[]).includes('knowledge'), false)
  const e = twoCities()
  assert.ok(shipResources(e, e.cities[0].id, 'knowledge' as never, 10, now).error)
  const g = structuredClone(e.cities[0].game)
  g.buildings.kara_pazar = 2
  assert.equal(execute(g, { type: 'exchange', from: 'knowledge', to: 'wood', amount: 100 }, now).error, 'Geçersiz takas.')
  // Eski kayıt: yolda 300 ilim var.
  const raw = JSON.parse(JSON.stringify(e))
  raw.shipments = [{ id: 's1', from: e.cities[0].id, to: e.cities[1].id, resource: 'knowledge', amount: 300, eta: now + 60_000 }]
  const before = e.cities[0].game.resources.knowledge
  const parsed = parseEmpire(JSON.stringify(raw))
  assert.equal(parsed.shipments.length, 0)
  assert.equal(parsed.cities[0].game.resources.knowledge, before + 300)
})
