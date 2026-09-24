/**
 * SAVAŞ MOTORU — Ikariam'daki savaş alanının sadeleştirilmiş, DETERMİNİSTİK karşılığı.
 *
 * Birlikler rollerine göre dizilir: ön cephe (front), kanat (flank), uzak
 * menzil (range), kuşatma (artillery), destek (support). Savaş en fazla
 * MAX_ROUNDS tur sürer; her turda:
 *   1. Her taraf bütün birliklerinin saldırısını toplar (bonuslarla).
 *   2. Savunanın SURU önce hasar emer: kuşatma birlikleri sura 3 kat, diğerleri
 *      yarım etkiyle vurur. Sur yıkılınca hasar askerlere geçer.
 *   3. Hasar hedef tarafın rollerine öncelik ağırlıklarıyla dağılır (ön cephe
 *      en çok yer); rol içinde can puanına göre paylaşılır. Artan hasar bir
 *      sonraki tura taşınır — yuvarlama asker kaybettirmez/kazandırmaz.
 *   4. Moral kayıpla düşer; aşçılar moralin bir kısmını korur. Morali 30'un
 *      altına inen taraf geri çekilir.
 * Savaştan sonra hekimler ölülerin bir kısmını kurtarır.
 *
 * Hiçbir zar yoktur: aynı iki ordu hep aynı sonucu verir; rapor her turu yazar.
 */
import { UNITS, UNIT_IDS, type UnitId, type UnitRole } from './engine'

export type Troops = Partial<Record<UnitId, number>>
export type BattleSide = {
  troops: Troops
  /** Saldırı ve savunma çarpanları (araştırma, Tophane...). */
  attackMul: number
  defenseMul: number
  /** Sur can puanı (yalnızca savunan). */
  wall?: number
  /** Moral kaybı çarpanı (Şeref Kanunu 0.8). */
  moraleMul?: number
  /** Hekim başına kurtarılan asker (varsayılan 3; Teşrih 6). */
  healPerDoctor?: number
}
export type BattleRound = { round: number; attackerLoss: Troops; defenderLoss: Troops; wall: number; moraleA: number; moraleD: number }
export type BattleResult = {
  winner: 'attacker' | 'defender'
  rounds: BattleRound[]
  attackerLeft: Troops; defenderLeft: Troops
  attackerLost: Troops; defenderLost: Troops
  healed: Troops
  wallLeft: number
}

export const MAX_ROUNDS = 6
const PRIORITY: Record<UnitRole, number> = { front: 0.55, flank: 0.2, range: 0.14, artillery: 0.08, support: 0.03, spy: 0, transport: 0 }
const COMBAT_ROLES: UnitRole[] = ['front', 'flank', 'range', 'artillery', 'support']

const count = (t: Troops, id: UnitId) => t[id] ?? 0
function totalHp(t: Troops) { return UNIT_IDS.reduce((s, id) => s + count(t, id) * UNITS[id].hp, 0) }
function alive(t: Troops) { return UNIT_IDS.some(id => count(t, id) > 0 && COMBAT_ROLES.includes(UNITS[id].role) && UNITS[id].role !== 'support') }

/** Uzak menzil birliklerinin cephanesi: ilk 3 tur tam, sonra yarım güç. */
export const AMMO_ROUNDS = 3
/** Bir tarafın bu turdaki hasarı: kuşatma ve diğerleri ayrı. */
function damage(t: Troops, mul: number, round = 1) {
  let siege = 0, other = 0
  for (const id of UNIT_IDS) {
    const n = count(t, id)
    if (!n) continue
    const ammo = UNITS[id].role === 'range' && round > AMMO_ROUNDS ? 0.5 : 1
    const dmg = UNITS[id].attack * n * mul * ammo
    if (UNITS[id].role === 'artillery') siege += dmg
    else other += dmg
  }
  return { siege, other }
}

/** Hasarı rollere ve birliklere dağıtıp ölüleri döndürür (taşan hasar carry'de kalır). */
function apply(t: Troops, dmg: number, defenseMul: number, carry: Record<string, number>): Troops {
  const lost: Troops = {}
  const roles = COMBAT_ROLES.filter(r => UNIT_IDS.some(id => UNITS[id].role === r && count(t, id) > 0))
  const weight = roles.reduce((s, r) => s + PRIORITY[r], 0)
  if (!weight || dmg <= 0) return lost
  for (const role of roles) {
    const share = dmg * PRIORITY[role] / weight
    const ids = UNIT_IDS.filter(id => UNITS[id].role === role && count(t, id) > 0)
    const hpSum = ids.reduce((s, id) => s + count(t, id) * UNITS[id].hp, 0)
    for (const id of ids) {
      // Savunma (zırh) gelen hasarı azaltır: her savunma puanı %1.5, en fazla %60.
      const armor = Math.min(0.6, UNITS[id].defense * 0.015 * defenseMul)
      const got = share * (count(t, id) * UNITS[id].hp / hpSum) * (1 - armor) + (carry[id] ?? 0)
      const dead = Math.min(count(t, id), Math.floor(got / UNITS[id].hp))
      carry[id] = dead >= count(t, id) ? 0 : got - dead * UNITS[id].hp
      if (dead > 0) { lost[id] = dead; t[id] = count(t, id) - dead }
    }
  }
  return lost
}

const add = (a: Troops, b: Troops) => { for (const [id, n] of Object.entries(b) as [UnitId, number][]) a[id] = (a[id] ?? 0) + n }

export function battle(attacker: BattleSide, defender: BattleSide): BattleResult {
  const A: Troops = { ...attacker.troops }, D: Troops = { ...defender.troops }
  const startA = totalHp(A), startD = totalHp(D)
  let wall = defender.wall ?? 0
  let moraleA = 100, moraleD = 100
  // Aşçı (ve filoda İkmal Gemisi) moral kaybını azaltır.
  const cooks = (t: Troops) => Math.min(0.6, count(t, 'asci') * 0.04 + count(t, 'ikmal_gemisi') * 0.08)
  const carryA: Record<string, number> = {}, carryD: Record<string, number> = {}
  const lostA: Troops = {}, lostD: Troops = {}
  const rounds: BattleRound[] = []
  for (let round = 1; round <= MAX_ROUNDS; round++) {
    if (!alive(A) || !alive(D)) break
    const hitA = damage(A, attacker.attackMul, round)
    const hitD = damage(D, defender.attackMul, round)
    // Sur önce: kuşatma 3x, diğerleri yarım etki.
    let toUnits = hitA.siege + hitA.other
    if (wall > 0) {
      const wallDamage = hitA.siege * 3 + hitA.other * 0.5
      if (wallDamage >= wall) {
        toUnits = (wallDamage - wall) / (hitA.siege * 3 + hitA.other * 0.5 || 1) * toUnits
        wall = 0
      } else {
        wall -= wallDamage
        toUnits = hitA.siege * 0.2 // sur ayaktayken yalnızca kuşatmanın bir kısmı içeri düşer
      }
    }
    const la = apply(A, hitD.siege + hitD.other, attacker.defenseMul, carryA)
    const ld = apply(D, toUnits, defender.defenseMul, carryD)
    add(lostA, la); add(lostD, ld)
    const hpA = totalHp(A), hpD = totalHp(D)
    moraleA = Math.max(0, 100 - (1 - hpA / Math.max(1, startA)) * 140 * (1 - cooks(A)) * (attacker.moraleMul ?? 1))
    moraleD = Math.max(0, 100 - (1 - hpD / Math.max(1, startD)) * 140 * (1 - cooks(D)) * (defender.moraleMul ?? 1) - (wall <= 0 && (defender.wall ?? 0) > 0 ? 10 : 0))
    rounds.push({ round, attackerLoss: la, defenderLoss: ld, wall: Math.round(wall), moraleA: Math.round(moraleA), moraleD: Math.round(moraleD) })
    if (moraleA < 30 || moraleD < 30) break
  }
  // Kazanan: savunanın savaşçısı kalmadıysa ya da morali çöktüyse saldıran; yoksa savunan.
  const attackerWins = alive(A) && moraleA >= 30 && (!alive(D) || moraleD < 30)
  // Hekimler her iki tarafta ölülerin bir kısmını kurtarır (hekim başına 3 asker, en fazla %40).
  const heal = (t: Troops, lost: Troops, per: number): Troops => {
    // Hekim karada, İkmal Gemisi denizde yaralıları kurtarır.
    const cap = count(t, 'hekim') * per + count(t, 'ikmal_gemisi') * 4
    const out: Troops = {}
    let left = cap
    for (const id of UNIT_IDS) {
      if (left <= 0) break
      const n = Math.min(left, Math.floor(count(lost, id) * 0.4))
      if (n > 0) { out[id] = n; left -= n; lost[id] = count(lost, id) - n; t[id] = count(t, id) + n }
    }
    return out
  }
  const healed = heal(A, lostA, attacker.healPerDoctor ?? 3)
  heal(D, lostD, defender.healPerDoctor ?? 3)
  return {
    winner: attackerWins ? 'attacker' : 'defender',
    rounds, attackerLeft: A, defenderLeft: D, attackerLost: lostA, defenderLost: lostD, healed, wallLeft: Math.round(wall),
  }
}

export const troopList = (t: Troops) =>
  (Object.entries(t) as [UnitId, number][]).filter(([, n]) => n > 0).map(([id, n]) => `${n} ${UNITS[id].name}`).join(', ') || 'yok'
