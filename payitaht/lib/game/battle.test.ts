import { test } from 'node:test'
import assert from 'node:assert/strict'
import { battle } from './battle'
import { garrison, npcWallHp } from './expeditions'

const side = (troops: Record<string, number>) => ({ troops, attackMul: 1, defenseMul: 1 })

test('battles are deterministic and report every round', () => {
  const a = battle(side({ yeniceri: 40, okcu: 20 }), { ...side(garrison(3)), wall: npcWallHp(3) })
  const b = battle(side({ yeniceri: 40, okcu: 20 }), { ...side(garrison(3)), wall: npcWallHp(3) })
  assert.deepEqual(a, b)
  assert.ok(a.rounds.length >= 1 && a.rounds.length <= 6)
})

test('siege weapons break walls far faster than infantry', () => {
  const inf = battle(side({ yeniceri: 20 }), { ...side({ mizrakci: 1 }), wall: 2000 })
  const siege = battle(side({ yeniceri: 20, kocbasi: 6 }), { ...side({ mizrakci: 1 }), wall: 2000 })
  assert.ok(siege.rounds[0].wall < inf.rounds[0].wall)
})

test('a far stronger army wins; a tiny army is routed', () => {
  assert.equal(battle(side({ yeniceri: 80, okcu: 40, sipahi: 10 }), side(garrison(2))).winner, 'attacker')
  assert.equal(battle(side({ mizrakci: 3 }), { ...side(garrison(6)), wall: npcWallHp(6) }).winner, 'defender')
})

test('doctors bring back part of the fallen; cooks hold morale', () => {
  const plain = battle(side({ yeniceri: 60 }), side(garrison(5)))
  const medics = battle(side({ yeniceri: 60, hekim: 10 }), side(garrison(5)))
  const lostPlain = plain.attackerLost.yeniceri ?? 0
  const lostMedic = medics.attackerLost.yeniceri ?? 0
  assert.ok(lostMedic <= lostPlain)
  assert.ok(Object.keys(medics.healed).length > 0 || lostPlain === 0)
  const fed = battle(side({ yeniceri: 60, asci: 10 }), side(garrison(5)))
  assert.ok(fed.rounds.at(-1)!.moraleA >= plain.rounds.at(-1)!.moraleA)
})

test('the battlefield grows with the defender town level', async () => {
  const { fieldSize } = await import('./battle')
  assert.equal(fieldSize(1).front, 3)
  assert.equal(fieldSize(1).flank, 0)
  assert.ok(fieldSize(6).flank > 0)
  assert.ok(fieldSize(12).front > fieldSize(6).front)
})

test('units beyond the slots wait in reserve and step in as the line thins', () => {
  // Küçük meydan: 3 ön cephe yuvası × 30 = 90 yeniçeri sahada, gerisi yedekte.
  const r = battle(side({ yeniceri: 200 }), { ...side({ mizrakci: 150 }), fieldLevel: 1 })
  const first = r.rounds[0].lineupA
  assert.equal(first.front.reduce((s, x) => s + x.n, 0), 90)
  assert.equal(first.reserve, 110)
})

test('flank cavalry dives past the enemy front into its archers', () => {
  const noFlank = battle(side({ yeniceri: 30 }), { ...side({ mizrakci: 60, okcu: 40 }), fieldLevel: 6 })
  const withFlank = battle(side({ yeniceri: 30, sipahi: 20 }), { ...side({ mizrakci: 60, okcu: 40 }), fieldLevel: 6 })
  const archersLost = (b: ReturnType<typeof battle>) => b.rounds[0].defenderLoss.okcu ?? 0
  assert.equal(archersLost(noFlank), 0)
  assert.ok(archersLost(withFlank) > 0)
})

test('an empty front line is filled from the flank and ranged units', () => {
  const r = battle(side({ okcu: 30 }), { ...side({ mizrakci: 10 }), fieldLevel: 1 })
  assert.ok(r.rounds[0].lineupA.front.some(s => s.id === 'okcu'))
})

test('while the wall stands, attacking infantry cannot reach the defenders', () => {
  const r = battle(side({ yeniceri: 30 }), { ...side({ mizrakci: 30 }), wall: 5000, fieldLevel: 6 })
  assert.equal(r.rounds[0].defenderLoss.mizrakci ?? 0, 0)
  assert.equal(r.winner, 'defender')
})
