/**
 * SAVAŞ MOTORU — Ikariam savaş alanının DETERMİNİSTİK karşılığı.
 *
 * SAVAŞ ALANI: savunanın Divanhane seviyesine göre büyür (küçük / orta /
 * büyük / devasa). Her sırada belli sayıda YUVA vardır: ön cephe, kanatlar
 * (sol+sağ), uzak menzil, kuşatma. Bir yuvaya tek tür birlik ve en fazla
 * SLOT_SIZE "büyüklük" sığar (piyade 1, atlı 2, kuşatma 5, gemi 2-6).
 * Sığmayan birlikler YEDEKTE bekler, sahadakiler öldükçe yerlerini alır.
 * Ön cephe boşalırsa kanat, sonra menzil birlikleri öne geçer; öne kimse
 * çıkamazsa o taraf dağılır.
 *
 * Her TURDA iki taraf aynı anda vurur:
 *  - Ön cephe yakın dövüşle karşı ön cepheye (sur ayaktaysa önce sura) vurur.
 *  - Kanatlar karşı kanada; kanat yoksa arkadaki nişancılara ve kuşatmaya dalar.
 *  - Nişancılar (sapancı, okçu, tüfekçi...) cephaneleri bitene kadar karşı ön
 *    cepheye ateş eder; sur ayaktayken surun ardındakilere yarım işler.
 *  - Kuşatma (koçbaşı, mancınık, top...) sura 3 kat vurur; sur yoksa askere.
 * ZIRH her vuruştan düşer (vuruşun en az %30'u geçer). Kayıplar tam sayıdır;
 * artan hasar taşınır. MORAL kayıpla düşer, AŞÇILAR her tur toparlar; morali
 * 25'in altına inen ya da öne asker çıkaramayan taraf çekilir. Savaştan sonra
 * HEKİMLER ölülerin bir kısmını kurtarır. Zar yoktur: aynı iki ordu hep aynı
 * sonucu verir; rapor her turun dizilişini ve kaybını yeniden kurabilir.
 */
import { UNITS, UNIT_IDS, type UnitId, type UnitRole } from './engine'

export type Troops = Partial<Record<UnitId, number>>
export type BattleSide = {
  troops: Troops
  /** Saldırı ve savunma (zırh) çarpanları (araştırma, Tophane...). */
  attackMul: number
  defenseMul: number
  /** Sur can puanı (yalnızca savunan). */
  wall?: number
  /** Moral kaybı çarpanı (Şeref Kanunu 0.8). */
  moraleMul?: number
  /** Hekim başına kurtarılan asker (varsayılan 3; Teşrih 6). */
  healPerDoctor?: number
  /** Savaş alanını belirleyen şehir seviyesi (savunanın Divanhanesi). */
  fieldLevel?: number
}

/** Birliğin savaş değerleri (Ikariam: büyüklük, yakın/uzak saldırı, cephane, zırh). */
export type BattleStats = { size: number; melee: number; ranged: number; ammo: number; armor: number; vsWall?: number }
export const BATTLE_STATS: Partial<Record<UnitId, BattleStats>> = {
  // Ön cephe
  mizrakci: { size: 1, melee: 6, ranged: 0, ammo: 0, armor: 4 },
  yeniceri: { size: 1, melee: 12, ranged: 0, ammo: 0, armor: 3 },
  deli: { size: 1, melee: 30, ranged: 0, ammo: 0, armor: 8 },
  // Kanat
  azap: { size: 1, melee: 18, ranged: 0, ammo: 0, armor: 2 },
  sipahi: { size: 2, melee: 28, ranged: 0, ammo: 0, armor: 4 },
  // Uzak menzil
  sapanci: { size: 1, melee: 2, ranged: 8, ammo: 5, armor: 0 },
  okcu: { size: 1, melee: 3, ranged: 16, ammo: 3, armor: 0 },
  tufekci: { size: 1, melee: 4, ranged: 36, ammo: 3, armor: 1 },
  // Kuşatma (vsWall: sura çarpan)
  kocbasi: { size: 5, melee: 0, ranged: 30, ammo: 8, armor: 6, vsWall: 5 },
  mancinik: { size: 5, melee: 0, ranged: 55, ammo: 5, armor: 2, vsWall: 3 },
  topcu: { size: 5, melee: 0, ranged: 65, ammo: 4, armor: 1, vsWall: 3 },
  humbaraci: { size: 1, melee: 2, ranged: 70, ammo: 2, armor: 0, vsWall: 1.5 },
  // Destek (sahada yer tutmaz)
  asci: { size: 1, melee: 0, ranged: 0, ammo: 0, armor: 0 },
  hekim: { size: 1, melee: 0, ranged: 0, ammo: 0, armor: 0 },
  // Deniz
  kadirga: { size: 3, melee: 45, ranged: 0, ammo: 0, armor: 8 },
  kalyon: { size: 6, melee: 120, ranged: 0, ammo: 0, armor: 20 },
  karamursel: { size: 2, melee: 40, ranged: 0, ammo: 0, armor: 4 },
  ates_gemisi: { size: 3, melee: 10, ranged: 70, ammo: 3, armor: 5 },
  mancinik_gemisi: { size: 4, melee: 0, ranged: 90, ammo: 4, armor: 6, vsWall: 3 },
  humbara_gemisi: { size: 5, melee: 0, ranged: 140, ammo: 3, armor: 5, vsWall: 2 },
  ikmal_gemisi: { size: 4, melee: 0, ranged: 0, ammo: 0, armor: 10 },
}
const stats = (id: UnitId): BattleStats => BATTLE_STATS[id] ?? { size: 1, melee: UNITS[id].attack, ranged: 0, ammo: 0, armor: 0 }

export type FieldRow = 'front' | 'flank' | 'range' | 'artillery'
export const FIELD_ROWS: FieldRow[] = ['front', 'flank', 'range', 'artillery']
export type FieldSize = Record<FieldRow, number> & { name: string }
/** Bir yuvaya sığan toplam birlik büyüklüğü. */
export const SLOT_SIZE = 30
/** Savaş alanı: savunanın şehir seviyesine göre (Ikariam'daki gibi büyür). */
export function fieldSize(level = 1): FieldSize {
  if (level >= 17) return { name: 'Devasa meydan', front: 7, flank: 6, range: 7, artillery: 4 }
  if (level >= 10) return { name: 'Büyük meydan', front: 7, flank: 4, range: 7, artillery: 3 }
  if (level >= 5) return { name: 'Orta meydan', front: 5, flank: 2, range: 5, artillery: 2 }
  return { name: 'Küçük meydan', front: 3, flank: 0, range: 3, artillery: 1 }
}

export type Slot = { id: UnitId; n: number }
export type Lineup = Record<FieldRow, Slot[]> & { reserve: number }
export type BattleRound = {
  round: number
  attackerLoss: Troops; defenderLoss: Troops
  /** Sur can puanı (tur sonu). */
  wall: number
  moraleA: number; moraleD: number
  /** Turun başındaki diziliş (rapor görünümü). */
  lineupA: Lineup; lineupD: Lineup
}
export type BattleResult = {
  winner: 'attacker' | 'defender'
  rounds: BattleRound[]
  attackerLeft: Troops; defenderLeft: Troops
  attackerLost: Troops; defenderLost: Troops
  healed: Troops
  wallLeft: number
  field: FieldSize
  /** Neden bitti: dağıldı / moral / tur sınırı. */
  reason: string
}

export const MAX_ROUNDS = 10
/** Morali bunun altına inen taraf çekilir. */
export const RETREAT_MORALE = 25

const ROLE_ROW: Partial<Record<UnitRole, FieldRow>> = { front: 'front', flank: 'flank', range: 'range', artillery: 'artillery' }
const count = (t: Troops, id: UnitId) => t[id] ?? 0
const fighting = (id: UnitId) => !!ROLE_ROW[UNITS[id].role]
function totalHp(t: Troops) { return UNIT_IDS.reduce((s, id) => s + (fighting(id) ? count(t, id) * UNITS[id].hp : 0), 0) }
function alive(t: Troops) { return UNIT_IDS.some(id => count(t, id) > 0 && fighting(id)) }

/** Birlikleri yuvalara dizer; ön cephe boşsa kanat/menzil/kuşatma öne geçer. */
function deploy(t: Troops, size: FieldSize): Lineup {
  const left: Troops = { ...t }
  const line: Lineup = { front: [], flank: [], range: [], artillery: [], reserve: 0 }
  const fill = (row: FieldRow, slots: number, ids: UnitId[]) => {
    for (const id of ids) {
      const per = Math.max(1, Math.floor(SLOT_SIZE / stats(id).size))
      while (line[row].length < slots && count(left, id) > 0) {
        const n = Math.min(per, count(left, id))
        line[row].push({ id, n }); left[id] = count(left, id) - n
      }
    }
  }
  const byRole = (role: UnitRole) => UNIT_IDS.filter(id => UNITS[id].role === role && count(left, id) > 0)
    .sort((a, b) => UNITS[b].hp * stats(b).armor - UNITS[a].hp * stats(a).armor || UNIT_IDS.indexOf(a) - UNIT_IDS.indexOf(b))
  fill('front', size.front, byRole('front'))
  // Ön cephe hiç dolmadıysa kanat, sonra menzil, sonra kuşatma öne çıkar.
  if (!line.front.length) for (const r of ['flank', 'range', 'artillery'] as UnitRole[]) { if (!line.front.length) fill('front', size.front, byRole(r)) }
  fill('flank', size.flank, byRole('flank'))
  fill('range', size.range, byRole('range'))
  fill('artillery', size.artillery, byRole('artillery'))
  line.reserve = UNIT_IDS.reduce((s, id) => s + (fighting(id) ? count(left, id) : 0), 0)
  return line
}

type Hit = { dmg: number; perHit: number }
const hit = (slots: Slot[], val: (id: UnitId) => number, mul: number): Hit => {
  let dmg = 0, n = 0
  for (const s of slots) { const v = val(s.id); if (v > 0) { dmg += v * s.n * mul; n += s.n } }
  return { dmg, perHit: n ? dmg / n : 0 }
}

export function battle(attacker: BattleSide, defender: BattleSide): BattleResult {
  const A: Troops = { ...attacker.troops }, D: Troops = { ...defender.troops }
  const field = fieldSize(defender.fieldLevel ?? 1)
  const startA = totalHp(A), startD = totalHp(D)
  const wallStart = defender.wall ?? 0
  let wall = wallStart
  let moraleA = 100, moraleD = 100
  const ammoA: Partial<Record<UnitId, number>> = {}, ammoD: Partial<Record<UnitId, number>> = {}
  for (const id of UNIT_IDS) { ammoA[id] = stats(id).ammo; ammoD[id] = stats(id).ammo }
  // Aşçı (ve filoda İkmal Gemisi) her tur moral toparlar.
  const rally = (t: Troops) => Math.min(12, count(t, 'asci') * 1.5 + count(t, 'ikmal_gemisi') * 3)
  const carryA: Record<string, number> = {}, carryD: Record<string, number> = {}
  const lostA: Troops = {}, lostD: Troops = {}
  const rounds: BattleRound[] = []
  let reason = 'Tur sınırı doldu; savunan yerini korudu.'
  let loser: 'attacker' | 'defender' | null = null

  /** Hasarı bir sıradaki yığınlara can payına göre dağıtır; zırh her vuruştan düşer. */
  const strike = (t: Troops, row: Slot[], h: Hit, defMul: number, carry: Record<string, number>, lost: Troops, factor = 1) => {
    if (h.dmg <= 0 || !row.length) return
    const hpRow = row.reduce((s, x) => s + x.n * UNITS[x.id].hp, 0)
    for (const s of row) {
      const armor = stats(s.id).armor * defMul
      const pass = h.perHit > 0 ? Math.max(0.3, 1 - armor / h.perHit) : 1
      const got = h.dmg * factor * (s.n * UNITS[s.id].hp / hpRow) * pass + (carry[s.id] ?? 0)
      const dead = Math.min(count(t, s.id), Math.floor(got / UNITS[s.id].hp))
      carry[s.id] = dead >= count(t, s.id) ? 0 : got - dead * UNITS[s.id].hp
      if (dead > 0) { lost[s.id] = count(lost, s.id) + dead }
    }
  }
  /** İlk dolu sıra (öncelik sırasıyla). */
  const firstRow = (l: Lineup, order: FieldRow[]) => order.map(r => l[r]).find(r => r.length) ?? []

  for (let round = 1; round <= MAX_ROUNDS; round++) {
    const lA = deploy(A, field), lD = deploy(D, field)
    if (!lA.front.length) { loser = 'attacker'; reason = 'Saldıranın öne sürecek askeri kalmadı.'; break }
    if (!lD.front.length && wall <= 0) { loser = 'defender'; reason = 'Savunanın safları dağıldı.'; break }
    const la: Troops = {}, ld: Troops = {}
    const shoot = (l: Lineup, ammo: Partial<Record<UnitId, number>>, rows: FieldRow[]) => {
      const slots = rows.flatMap(r => l[r])
      const h = hit(slots, id => (count(ammo, id) > 0 ? stats(id).ranged : 0), 1)
      return { slots, h }
    }
    // --- SALDIRAN vurur ---
    const aMel = hit(lA.front, id => stats(id).melee, attacker.attackMul)
    const aFlank = hit(lA.flank, id => stats(id).melee, attacker.attackMul)
    const aRange = shoot(lA, ammoA, ['range'])
    const aArt = shoot(lA, ammoA, ['artillery'])
    const aRangeH = { dmg: aRange.h.dmg * attacker.attackMul, perHit: aRange.h.perHit * attacker.attackMul }
    const aArtWall = aArt.slots.reduce((s, x) => s + (count(ammoA, x.id) > 0 ? stats(x.id).ranged * (stats(x.id).vsWall ?? 1) * x.n : 0), 0) * attacker.attackMul
    const aArtH = { dmg: aArt.h.dmg * attacker.attackMul, perHit: aArt.h.perHit * attacker.attackMul }
    const wallBefore = wall
    if (wall > 0) {
      // Sur ayakta: ön cephe ve kuşatma sura; nişancılar surun ardına yarım.
      const onWall = aMel.dmg * 0.5 + aArtWall
      wall = Math.max(0, wall - onWall)
      strike(D, firstRow(lD, ['front', 'range', 'artillery', 'flank']), aRangeH, defender.defenseMul * 1.3, carryD, ld, 0.5)
    } else {
      strike(D, firstRow(lD, ['front', 'flank', 'range', 'artillery']), aMel, defender.defenseMul, carryD, ld)
      strike(D, firstRow(lD, ['front', 'flank', 'range', 'artillery']), aRangeH, defender.defenseMul, carryD, ld)
      strike(D, firstRow(lD, ['front', 'flank', 'range', 'artillery']), aArtH, defender.defenseMul, carryD, ld)
    }
    // Kanatlar: karşı kanat, yoksa arkadaki nişancı ve kuşatma (sur kanatları korumaz).
    strike(D, firstRow(lD, ['flank', 'range', 'artillery', 'front']), aFlank, defender.defenseMul, carryD, ld)
    // --- SAVUNAN vurur ---
    const dMel = hit(lD.front, id => stats(id).melee, defender.attackMul)
    const dFlank = hit(lD.flank, id => stats(id).melee, defender.attackMul)
    const dRange = shoot(lD, ammoD, ['range', 'artillery'])
    const dRangeH = { dmg: dRange.h.dmg * defender.attackMul * (wallBefore > 0 ? 1.2 : 1), perHit: dRange.h.perHit * defender.attackMul }
    strike(A, firstRow(lA, ['front', 'flank', 'range', 'artillery']), dMel, attacker.defenseMul, carryA, la)
    strike(A, firstRow(lA, ['front', 'flank', 'range', 'artillery']), dRangeH, attacker.defenseMul, carryA, la)
    strike(A, firstRow(lA, ['flank', 'range', 'artillery', 'front']), dFlank, attacker.defenseMul, carryA, la)
    // Cephane: ateş eden nişancı ve kuşatma birer atım harcar.
    for (const s of [...aRange.slots, ...aArt.slots]) if (count(ammoA, s.id) > 0) ammoA[s.id] = count(ammoA, s.id) - 1
    for (const s of dRange.slots) if (count(ammoD, s.id) > 0) ammoD[s.id] = count(ammoD, s.id) - 1
    // Kayıpları uygula.
    for (const [id, n] of Object.entries(la) as [UnitId, number][]) { A[id] = count(A, id) - n; lostA[id] = count(lostA, id) + n }
    for (const [id, n] of Object.entries(ld) as [UnitId, number][]) { D[id] = count(D, id) - n; lostD[id] = count(lostD, id) + n }
    const lossA = (UNIT_IDS.reduce((s, id) => s + count(la, id) * UNITS[id].hp, 0)) / Math.max(1, startA)
    const lossD = (UNIT_IDS.reduce((s, id) => s + count(ld, id) * UNITS[id].hp, 0)) / Math.max(1, startD)
    moraleA = Math.max(0, Math.min(100, moraleA - lossA * 130 * (attacker.moraleMul ?? 1) + (lossA > 0 ? rally(A) : 0)))
    moraleD = Math.max(0, Math.min(100, moraleD - lossD * 130 * (defender.moraleMul ?? 1) + (lossD > 0 ? rally(D) : 0)
      - (wall <= 0 && wallBefore > 0 ? 10 : 0)))
    rounds.push({ round, attackerLoss: la, defenderLoss: ld, wall: Math.round(wall), moraleA: Math.round(moraleA), moraleD: Math.round(moraleD), lineupA: lA, lineupD: lD })
    if (!alive(A)) { loser = 'attacker'; reason = 'Saldıran ordu yok oldu.'; break }
    if (!alive(D) && wall <= 0) { loser = 'defender'; reason = 'Savunanın askeri kalmadı.'; break }
    if (moraleA < RETREAT_MORALE) { loser = 'attacker'; reason = 'Saldıranın morali çöktü; geri çekildi.'; break }
    if (moraleD < RETREAT_MORALE) { loser = 'defender'; reason = 'Savunanın morali çöktü; kaçtı.'; break }
  }
  // Tur sınırı: sur ayaktaysa ya da savunan tutunduysa savunan kazanır.
  const attackerWins = loser === 'defender'
  const heal = (t: Troops, lost: Troops, per: number): Troops => {
    // Hekim karada, İkmal Gemisi denizde yaralıları kurtarır (ölülerin en fazla %40'ı).
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
  const clean = (t: Troops) => Object.fromEntries((Object.entries(t) as [UnitId, number][]).filter(([, n]) => n > 0)) as Troops
  return {
    winner: attackerWins ? 'attacker' : 'defender', rounds, reason, field,
    attackerLeft: clean(A), defenderLeft: clean(D), attackerLost: clean(lostA), defenderLost: clean(lostD), healed, wallLeft: Math.round(wall),
  }
}

export const troopList = (t: Troops) =>
  (Object.entries(t) as [UnitId, number][]).filter(([, n]) => n > 0).map(([id, n]) => `${n} ${UNITS[id].name}`).join(', ') || 'yok'
