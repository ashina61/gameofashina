import { test } from 'node:test'
import assert from 'node:assert/strict'
import { freePlots, zoneOf } from './engine'
import { advanceEmpire, initialEmpire, parseEmpire, type Empire } from './empire'
import {
  allianceRankings, foundPact, invitePact, kickMember, leavePact, pactCap, readCirculars, sendCircular, setRank, setStance,
} from './pact'
import { allyHelp, isAlly, joinAlliance, pacified, rivalState } from './rivals'

const now = 20_000_000
const HOUR = 3600_000

function base(embassy = 1): Empire {
  const e = advanceEmpire(initialEmpire(now), now)
  const g = e.cities[0].game
  g.placement.elcilik = freePlots(g, zoneOf('elcilik'))[0]
  g.buildings.elcilik = embassy
  return e
}
function friendly(e: Empire, id: string, rel = 30) { rivalState(e, id).relation = rel; return e }

test('founding needs an embassy and a valid name and tag', () => {
  const none = advanceEmpire(initialEmpire(now), now)
  assert.match(foundPact(none, 'Ay Yıldız', 'AY', now).error ?? '', /Elçilik/)
  assert.match(foundPact(base(), 'A', 'AY', now).error ?? '', /3-30/)
  assert.match(foundPact(base(), 'Ay Yıldız', 'X', now).error ?? '', /2-5/)
  const ok = foundPact(base(), 'Ay Yıldız', 'ay', now)
  assert.equal(ok.error, undefined)
  assert.equal(ok.empire.world!.pact!.tag, 'AY')
  assert.match(joinAlliance(ok.empire, 'dogu', now).error ?? '', /Kendi ittifakın/)
})

test('rivals join only with enough goodwill and up to the embassy cap', () => {
  let e = foundPact(base(1), 'Ay Yıldız', 'AY', now).empire
  assert.match(invitePact(e, 'r-lale', now).error ?? '', /geri çevirdi/)
  e = friendly(e, 'r-lale')
  const joined = invitePact(e, 'r-lale', now)
  assert.equal(joined.error, undefined)
  e = joined.empire
  assert.ok(isAlly(e, 'r-lale'))
  assert.ok(pacified(e, 'r-lale'))
  assert.equal(pactCap(e), 4)
  for (const id of ['r-ilim', 'r-bag', 'r-kule']) e = invitePact(friendly(e, id), id, now).empire
  assert.equal(e.world!.pact!.members.length, 4)
  assert.match(invitePact(friendly(e, 'r-mavi'), 'r-mavi', now).error ?? '', /sınırı/)
})

test('ranks are unique, the general doubles the defence help', () => {
  let e = foundPact(base(), 'Ay Yıldız', 'AY', now).empire
  for (const id of ['r-lale', 'r-kemer']) e = invitePact(friendly(e, id), id, now).empire
  const plain = allyHelp(e, now).yeniceri ?? 0
  assert.ok(plain > 0)
  e = setRank(e, 'r-lale', 'genel', now).empire
  e = setRank(e, 'r-kemer', 'genel', now).empire
  assert.equal(e.world!.pact!.ranks['r-lale'], 'uye')
  assert.equal(e.world!.pact!.ranks['r-kemer'], 'genel')
  assert.ok((allyHelp(e, now).yeniceri ?? 0) > plain)
})

test('circulars get replies, have a cooldown and are read', () => {
  let e = foundPact(base(), 'Ay Yıldız', 'AY', now).empire
  e = invitePact(friendly(e, 'r-lale'), 'r-lale', now).empire
  const sent = sendCircular(e, 'savunma', 'Kuzey kıyısı', now)
  assert.equal(sent.error, undefined)
  const c = sent.empire.world!.pact!.circulars[0]
  assert.equal(c.replies?.length, 1)
  assert.ok(c.body.includes('Kuzey kıyısı'))
  assert.match(sendCircular(sent.empire, 'selam', '', now + 60_000).error ?? '', /bekle/)
  const read = readCirculars(sent.empire, now)
  assert.ok(read.empire.world!.pact!.circulars.every(x => x.read))
})

test('stances, rankings, kicking and disbanding; the save round-trips', () => {
  let e = foundPact(base(), 'Ay Yıldız', 'AY', now).empire
  e = invitePact(friendly(e, 'r-lale'), 'r-lale', now).empire
  e = setStance(e, 'bati', 'savas', now).empire
  assert.equal(e.world!.pact!.stance.bati, 'savas')
  assert.equal(allianceRankings(e, now).length, 3)
  assert.ok(allianceRankings(e, now).some(r => r.you && r.id === 'pact'))
  const later = advanceEmpire(e, now + 30 * HOUR)
  assert.deepEqual(parseEmpire(JSON.stringify(later)), later)
  const kicked = kickMember(e, 'r-lale', now)
  assert.equal(isAlly(kicked.empire, 'r-lale'), false)
  const gone = leavePact(e, now)
  assert.equal(gone.empire.world!.pact, undefined)
})
