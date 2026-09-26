import { test } from 'node:test'
import assert from 'node:assert/strict'
import { battle, fieldSize } from './battle'
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

test('bombers fly over the wall and only air defence can shoot them down', () => {
  const side = (troops: Record<string, number>, extra = {}) => ({ troops, attackMul: 1, defenseMul: 1, fieldLevel: 10, ...extra })
  // Sur ayaktayken bile Lagari roketleri surun ardındaki savunanı vurur.
  const bombed = battle(side({ yeniceri: 30, lagari: 20 }), side({ mizrakci: 60 }, { wall: 5000 }))
  assert.ok((bombed.rounds[0].defenderLoss.mizrakci ?? 0) > 0, 'roket surun üstünden vurdu')
  // Hava savunması olmayan savunan bombardımanı düşüremez.
  assert.equal(bombed.attackerLost.lagari ?? 0, 0)
  const shot = battle(side({ yeniceri: 30, lagari: 20 }), side({ mizrakci: 60, hezarfen: 30 }, { wall: 5000 }))
  assert.ok((shot.attackerLost.lagari ?? 0) > 0, 'Hezarfen roketçileri düşürdü')
  // Havada kimse yoksa Hezarfen kanatlara dalar.
  const strafe = battle(side({ yeniceri: 40, azap: 20 }), side({ mizrakci: 60, hezarfen: 30 }))
  assert.ok(strafe.rounds.some(r => (r.attackerLoss.azap ?? 0) > 0))
})

test('the battlefield has air and air-defence slots and deploys them', () => {
  assert.deepEqual([fieldSize(1).air, fieldSize(1).fighter, fieldSize(12).air], [1, 1, 2])
  const r = battle({ troops: { yeniceri: 10, lagari: 20, hezarfen: 40 }, attackMul: 1, defenseMul: 1 }, { troops: { mizrakci: 10 }, attackMul: 1, defenseMul: 1 })
  const l = r.rounds[0].lineupA
  assert.equal(l.air.length, 1)
  assert.deepEqual(l.fighter, [{ id: 'hezarfen', n: 30 }])
})

test('diving boats are hard to hit', () => {
  const vs = (id: 'dalgic_gemisi' | 'kadirga') => battle({ troops: { kalyon: 4 }, attackMul: 1, defenseMul: 1 }, { troops: { [id]: 6 }, attackMul: 1, defenseMul: 1 })
  const hp = (id: 'dalgic_gemisi' | 'kadirga', n: number) => n * { dalgic_gemisi: 280, kadirga: 420 }[id]
  assert.ok(hp('dalgic_gemisi', vs('dalgic_gemisi').defenderLost.dalgic_gemisi ?? 0) <= hp('kadirga', vs('kadirga').defenderLost.kadirga ?? 0))
})

test('the sea has its own battlefield without flanks', () => {
  assert.equal(fieldSize(12, true).flank, 0)
  assert.equal(fieldSize(12, true).name, 'Açık deniz')
  assert.notEqual(fieldSize(12, true).front, fieldSize(12).front)
})

test('battles run until a side breaks, not to a fixed round count', () => {
  const side = (troops: Record<string, number>, extra = {}) => ({ troops, attackMul: 1, defenseMul: 1, fieldLevel: 10, ...extra })
  const long = battle(side({ mizrakci: 90, asci: 40 }), side({ mizrakci: 90, asci: 40, hekim: 5 }))
  assert.ok(long.rounds.length > 10, `tur: ${long.rounds.length}`)
  assert.doesNotMatch(long.reason, /Tur sınırı/)
})

test('archers out of arrows fight hand to hand', () => {
  const side = (troops: Record<string, number>) => ({ troops, attackMul: 1, defenseMul: 1, fieldLevel: 10 })
  const r = battle(side({ mizrakci: 30, okcu: 60 }), side({ mizrakci: 120 }))
  const late = r.rounds.slice(3)
  assert.ok(late.some(x => Object.values(x.defenderLoss).some(n => (n ?? 0) > 0)), 'cephane bitince de hasar sürer')
})
