import { test } from 'node:test'
import assert from 'node:assert/strict'
import { SEASON_CYCLE, SEASON_EPOCH, WEEK_MS, lootMul, seasonAt, seasonChanges, seasonContentment, seasonWeek, threatIntervalMul, tradeMul, woodMul } from './events'

test('the calendar rotates weekly over a six-week cycle and is quiet before it starts', () => {
  assert.equal(seasonAt(SEASON_EPOCH - 1), null)
  for (let w = 0; w < 12; w++) assert.equal(seasonAt(SEASON_EPOCH + w * WEEK_MS + 3600_000), SEASON_CYCLE[w % 6])
  const wk = seasonWeek(SEASON_EPOCH + 2 * WEEK_MS + 5)
  assert.equal(wk.start, SEASON_EPOCH + 2 * WEEK_MS)
  assert.equal(wk.end - wk.start, WEEK_MS)
})

test('each event has its effect only in its own week', () => {
  const at = (id: string) => SEASON_EPOCH + SEASON_CYCLE.indexOf(id as never) * WEEK_MS + 1000
  assert.equal(tradeMul(at('kervan')), 1.5); assert.equal(tradeMul(at('hasat')), 1)
  assert.equal(lootMul(at('korsan')), 1.5); assert.equal(threatIntervalMul(at('korsan')), 0.6)
  assert.equal(woodMul(at('hasat')), 1.25)
  assert.equal(seasonContentment(at('ramazan')), 100); assert.equal(seasonContentment(at('kervan')), 0)
})

test('changes between two moments announce starts and ends; long absences keep only recent ones', () => {
  const c = seasonChanges(SEASON_EPOCH + 1000, SEASON_EPOCH + WEEK_MS + 1000)
  assert.deepEqual(c.map(x => `${x.kind}:${x.id}`), ['end:kervan'])
  const c2 = seasonChanges(SEASON_EPOCH + WEEK_MS + 1000, SEASON_EPOCH + 2 * WEEK_MS + 1000)
  assert.deepEqual(c2.map(x => `${x.kind}:${x.id}`), ['start:korsan'])
  const long = seasonChanges(SEASON_EPOCH, SEASON_EPOCH + 20 * WEEK_MS)
  assert.ok(long.length <= 4)
})

test('crossing a week boundary writes the event into the city log and world news', async () => {
  const { advanceEmpire, initialEmpire } = await import('./empire')
  const t0 = SEASON_EPOCH + 2 * WEEK_MS - 3600_000 // quiet week -> next is korsan
  const e0 = advanceEmpire(initialEmpire(t0), t0)
  const e1 = advanceEmpire(e0, t0 + 2 * 3600_000)
  assert.ok(e1.cities[0].game.log.some(l => l.text.startsWith('Korsan sezonu')), 'log has the season start')
  assert.ok((e1.world?.news ?? []).some(n => n.text.startsWith('Korsan sezonu')), 'world news has the season start')
})
