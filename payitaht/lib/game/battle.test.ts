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
