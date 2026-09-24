/**
 * SEFER VE CASUSLUK — adadaki bağımsız yerleşimler (NPC) üzerine.
 *
 * Her adada üç bağımsız yerleşim vardır: Barbar Köyü, Korsan İni, Asi
 * Kalesi. Bunlar GERÇEK OYUNCU DEĞİLDİR ve öyle gösterilmez. Oyuncu:
 *   - Elçilik'te yetişen casusları gönderip garnizonu, suru ve hazineyi öğrenir,
 *   - kara birlikleriyle sefere çıkıp yağmalar.
 *
 * Savaş DETERMİNİSTİKTİR: aynı ordu aynı hedefe karşı hep aynı sonucu verir,
 * rapor her sayının nereden geldiğini yazar. Casusluğun başarısı bir olasılıktır
 * ama zar da deterministik (görev kimliğinden türetilir): kayıt yeniden
 * yüklenince sonuç değişmez.
 *
 * Birlikler seferdeyken şehrin ordusunda SAYILMAYA devam eder (halktan
 * düşmüş vatandaşlardır); yalnızca yeni bir sefere tekrar gönderilemezler.
 * Kayıplar çarpışma anında ordudan silinir, ganimet dönüşte ambara iner.
 */
import {
  UNITS, UNIT_IDS, capacity, power, BUILDING_EFFECTS, logEvent, actionPoints, travelFactor, miracle, spyBonus, idleWorkers,
  LUXURY_IDS, type Army, type Game, type UnitId,
} from './engine'
import { battle, troopList, type Troops } from './battle'
import { activeCity, advanceEmpire, bump, type CityRecord, type Empire } from './empire'
import { ISLANDS, type IslandId } from './islands'

export type NpcKind = 'koy' | 'korsan' | 'kale'
export const NPC_KINDS: Record<NpcKind, { name: string; baseLevel: number; description: string }> = {
  koy: { name: 'Barbar Köyü', baseLevel: 1, description: 'Çitle çevrili kulübeler. Az asker, az ganimet.' },
  korsan: { name: 'Korsan İni', baseLevel: 3, description: 'Kıyıda ahşap bir kale. Okçuları ve sandıkları bol.' },
  kale: { name: 'Asi Kalesi', baseLevel: 6, description: 'Taş surlu bir kale. Topçusuz almak zordur.' },
}
export type NpcSettlement = { id: string; islandId: IslandId; kind: NpcKind; name: string }
const NPC_NAMES: Record<NpcKind, string[]> = {
  koy: ['Karaçalı', 'Yabanköy', 'Taşlıbayır', 'Kızılçam', 'Dikenli', 'Sarıkaya', 'Ayıdere', 'Kurtini'],
  korsan: ['Kara Koy', 'Martı Yuvası', 'Kanlı Liman', 'Sis Koyu', 'Yarık Kaya', 'Batık Gemi', 'Poyraz İni', 'Kum Koyu'],
  kale: ['Dağ Hisarı', 'Kartal Kalesi', 'Asi Burç', 'Demir Kapı', 'Kuzgun Hisar', 'Sarp Kale', 'Kule Başı', 'Yıldırım Burcu'],
}
export const NPC_SETTLEMENTS: NpcSettlement[] = ISLANDS.flatMap((island, i) =>
  (['koy', 'korsan', 'kale'] as NpcKind[]).map(kind => ({
    id: `${island.id}-${kind}`, islandId: island.id, kind, name: NPC_NAMES[kind][i % NPC_NAMES[kind].length],
  })))
export const MAX_NPC_LEVEL = 12
/** Sefere çıkabilen kara birlikleri (casus hariç). */
export const RAID_UNITS: UnitId[] = UNIT_IDS.filter(id => UNITS[id].branch === 'kara' && UNITS[id].role !== 'spy')
/** Savaş gemileri (nakliye hariç). */
export const WARSHIPS: UnitId[] = UNIT_IDS.filter(id => UNITS[id].branch === 'deniz' && UNITS[id].role !== 'transport')
/** Bir nakliye gemisinin taşıdığı asker (nüfus birimi). */
export const TROOPS_PER_SHIP = 40

/**
 * Yerleşimin donanması. Korsan İni'nin kadırgaları vardır, Asi Kalesi'nin
 * birkaç devriyesi; Barbar Köyü'nün gemisi yoktur. Deniz aşırı bir sefer
 * önce bu donanmayı yenmek zorundadır, yoksa ordu kıyıya çıkamaz.
 */
export function npcFleet(level: number, kind: NpcKind): Troops {
  if (kind === 'korsan') return { kadirga: level, ates_gemisi: Math.floor(level / 3), kalyon: Math.floor(level / 6) }
  if (kind === 'kale') return { kadirga: Math.floor(level / 2) }
  return {}
}
const hasTroops = (t: Troops) => Object.values(t).some(n => (n ?? 0) > 0)

/**
 * KORSAN KALESİ SEFERLERİ — savaş gemileriyle ticaret gemilerine baskın.
 * Hedefler sabittir (NPC); eskortu yenen filo akçeyi ve korsan şöhretini alır.
 */
export type PiracyTarget = { id: string; name: string; level: number; minutes: number; escort: Troops; gold: number; points: number; description: string }
export const PIRACY_TARGETS: PiracyTarget[] = [
  { id: 'kayik', name: 'Tüccar kayığı', level: 1, minutes: 4, escort: { kadirga: 1 }, gold: 450, points: 2, description: 'Tek kadırgalı küçük bir ticaret kayığı.' },
  { id: 'kervan', name: 'Kervan gemisi', level: 3, minutes: 8, escort: { kadirga: 3, ates_gemisi: 1 }, gold: 1600, points: 6, description: 'Baharat taşıyan, eskortlu bir kervan gemisi.' },
  { id: 'hazine', name: 'Hazine kalyonu', level: 6, minutes: 15, escort: { kadirga: 4, ates_gemisi: 1, kalyon: 1 }, gold: 5200, points: 18, description: 'Ağır eskortlu, altın yüklü bir kalyon.' },
]
export const piracyTarget = (id: string) => PIRACY_TARGETS.find(t => t.id === id)
/** Eskort gemileri savaş gemisi kadar sağlam değildir. */
const ESCORT_MUL = { attackMul: 0.8, defenseMul: 0.5 }

export type NpcState = { level: number; raidedAt: number }
export type Loot = { gold: number; wood: number; stone: number }
export type Mission = {
  /** raid: yerleşime sefer · spy: casusluk · piracy: Korsan Kalesi seferi (npcId = hedef). */
  id: string; kind: 'raid' | 'spy' | 'piracy' | 'deploy'; cityId: string; npcId: string
  units: Partial<Record<UnitId, number>>
  departAt: number; arriveAt: number; returnAt: number
  resolved: boolean; loot: Loot
}
export type Report = {
  id: string; time: number; kind: 'raid' | 'spy' | 'piracy' | 'defense' | 'deploy'; cityId: string; npcId: string
  success: boolean; title: string; lines: string[]
}

export function npcById(id: string) { return NPC_SETTLEMENTS.find(n => n.id === id) }
export function npcState(empire: Empire, id: string): NpcState {
  const npc = npcById(id)!
  return empire.npcs?.[id] ?? { level: NPC_KINDS[npc.kind].baseLevel, raidedAt: 0 }
}

/** Yerleşimin garnizonu ve suru (seviyeden türer). */
export function garrison(level: number): Army {
  const army = Object.fromEntries(UNIT_IDS.map(id => [id, 0])) as Army
  // Karışık garnizon: ön cephe, nişancı, kanat, seviye yükseldikçe kuşatma ve hekim.
  army.mizrakci = 3 * level
  army.yeniceri = level
  army.sapanci = 2 * level
  army.okcu = level
  army.azap = Math.floor(level / 2)
  army.sipahi = Math.floor(level / 3) * 2
  army.topcu = Math.max(0, level - 5)
  army.hekim = Math.floor(level / 4)
  return army
}
export function npcWall(level: number) { return Math.max(0, level - 2) }
const WALL_PER_LEVEL = 120
/** Surun can puanı (savaş motoru). */
export function npcWallHp(level: number) { return npcWall(level) * 400 }

/** Yağmalanabilir hazine: son yağmadan beri 45 dakikada dolar. */
export const LOOT_REFILL_MS = 45 * 60_000
export function lootPool(state: NpcState, now: number): Loot {
  const fill = Math.min(1, Math.max(0, (now - state.raidedAt) / LOOT_REFILL_MS))
  const max = 500 * state.level
  return { gold: Math.floor(max * fill), wood: Math.floor(max * 0.9 * fill), stone: Math.floor(max * 0.6 * fill) }
}

/** Seferdeki (ve dönüş yolundaki) birlikler: tekrar gönderilemez. */
export function committedUnits(empire: Empire, cityId: string): Partial<Record<UnitId, number>> {
  const out: Partial<Record<UnitId, number>> = {}
  for (const m of empire.missions ?? []) {
    if (m.cityId !== cityId) continue
    for (const [id, n] of Object.entries(m.units) as [UnitId, number][]) out[id] = (out[id] ?? 0) + n
  }
  return out
}
export function availableUnits(empire: Empire, cityId: string): Army {
  const city = empire.cities.find(c => c.id === cityId)!
  const busy = committedUnits(empire, cityId)
  return Object.fromEntries(UNIT_IDS.map(id => [id, Math.max(0, city.game.army[id] - (busy[id] ?? 0))])) as Army
}

/** Seçili birliklerin saldırı gücü (araştırma ve Tophane bonuslarıyla). */
export function strikeForce(g: Game, units: Partial<Record<UnitId, number>>) {
  const army = Object.fromEntries(UNIT_IDS.map(id => [id, units[id] ?? 0])) as Army
  return power({ ...g, army }, 'kara').attack
}
/** Yerleşimin savunması: garnizon + sur (topçu suru yarıya indirir). */
export function npcDefense(level: number, withCannons: boolean) {
  const g = garrison(level)
  const troops = UNIT_IDS.reduce((sum, id) => sum + UNITS[id].defense * g[id], 0)
  const wall = npcWall(level) * WALL_PER_LEVEL * (withCannons ? 0.5 : 1)
  return { troops, wall: Math.round(wall), total: Math.round(troops + wall) }
}
/** Harita Arşivi, Denizcilik Geleceği ve Poyraz mucizesi yolu kısaltır. */
function mapBonus(g?: Game) { return g ? travelFactor(g) : 1 }
export function raidTravelMs(level: number, g?: Game) { return Math.round((90 + 30 * level) * 1000 * mapBonus(g)) }
export function spyTravelMs(level: number, g?: Game) { return Math.round((60 + 15 * level) * 1000 * mapBonus(g)) }
/** İki ada arası deniz yolu (başka adadaki hedefe eklenir). */
export function seaTravelMs(from: IslandId, to: IslandId, g?: Game) {
  if (from === to) return 0
  const a = ISLANDS.find(i => i.id === from)!, b = ISLANDS.find(i => i.id === to)!
  return Math.round((60 + 25 * Math.hypot(a.x - b.x, a.y - b.y)) * 1000 * mapBonus(g) * (g?.research.includes('haritacilik') ? 0.85 : 1))
}
/** Şehirden hedefe tek yön yol süresi. */
export function targetTravelMs(city: CityRecord, npcId: string, kind: 'raid' | 'spy', level: number) {
  const npc = npcById(npcId)!
  return (kind === 'spy' ? spyTravelMs(level, city.game) : raidTravelMs(level, city.game)) + seaTravelMs(city.islandId, npc.islandId, city.game)
}
/** Kara birliklerini taşımak için gereken nakliye gemisi. */
export function transportsNeeded(units: Partial<Record<UnitId, number>>) {
  const pop = (Object.entries(units) as [UnitId, number][])
    .filter(([id]) => UNITS[id].branch === 'kara').reduce((s, [id, n]) => s + UNITS[id].pop * n, 0)
  return Math.ceil(pop / TROOPS_PER_SHIP)
}

/** Bu şehirde kullanılan hamle puanı: yoldaki görevler + seferdeki nakliye. */
export function actionsInUse(empire: Empire, cityId: string) {
  return (empire.missions ?? []).filter(m => m.cityId === cityId).length +
    empire.shipments.filter(s => s.from === cityId).length
}

/** Deterministik zar: görev kimliğinden [0,1). */
function roll(seed: string) {
  let h = 2166136261
  for (let i = 0; i < seed.length; i++) h = Math.imul(h ^ seed.charCodeAt(i), 16777619)
  h ^= h >>> 13; h = Math.imul(h, 0x5bd1e995); h ^= h >>> 15
  return (h >>> 0) / 4294967296
}
export function spyChance(g: Game, count: number, level: number) {
  return Math.min(0.95, Math.max(0.05, 0.3 + 0.12 * count + spyBonus(g) - 0.06 * level))
}

function targetCheck(empire: Empire, npcId: string, kind: Mission['kind']) {
  const city = activeCity(empire)
  const npc = kind === 'piracy' ? null : npcById(npcId)
  if (kind !== 'piracy' && !npc) return { error: 'Bilinmeyen hedef.' }
  if (kind === 'piracy' && !piracyTarget(npcId)) return { error: 'Bilinmeyen hedef.' }
  if (npc && npc.islandId !== city.islandId && city.game.buildings.liman < 1) {
    return { error: 'Başka adaya sefer için bu şehirde Ticaret Limanı gerekli.' }
  }
  if (actionsInUse(empire, city.id) >= actionPoints(city.game)) {
    return { error: `Hamle puanı yok (${actionPoints(city.game)}). Bir görevin dönmesini bekle ya da Divanhane'yi yükselt.` }
  }
  if ((empire.missions ?? []).some(m => m.cityId === city.id && m.npcId === npcId && m.kind === kind && !m.resolved)) {
    return { error: kind === 'spy' ? 'Bu hedefe giden casuslar zaten yolda.' : kind === 'piracy' ? 'Bu hedefe giden filo zaten yolda.' : 'Bu hedefe giden bir ordu zaten yolda.' }
  }
  return { city, npc: npc! }
}

export function dispatchSpies(source: Empire, npcId: string, count: number, now: number): { empire: Empire; error?: string } {
  const empire = advanceEmpire(source, now)
  const t = targetCheck(empire, npcId, 'spy')
  if ('error' in t) return { empire, error: t.error }
  if (!Number.isInteger(count) || count <= 0) return { empire, error: 'En az bir casus seç.' }
  if (availableUnits(empire, t.city.id).casus < count) return { empire, error: 'Bu kadar boşta casus yok. Elçilikte casus yetiştir.' }
  const level = npcState(empire, npcId).level
  const id = `spy-${t.city.id}-${npcId}-${now}`
  const travel = targetTravelMs(t.city, npcId, 'spy', level)
  empire.missions = [...(empire.missions ?? []), {
    id, kind: 'spy', cityId: t.city.id, npcId, units: { casus: count },
    departAt: now, arriveAt: now + travel, returnAt: now + 2 * travel,
    resolved: false, loot: { gold: 0, wood: 0, stone: 0 },
  }]
  logEvent(t.city.game, `${count} casus ${t.npc.name} yönüne yola çıktı.`, now)
  bump(empire, 'spies')
  return { empire }
}

export function dispatchRaid(source: Empire, npcId: string, units: Partial<Record<UnitId, number>>, now: number): { empire: Empire; error?: string } {
  const empire = advanceEmpire(source, now)
  const t = targetCheck(empire, npcId, 'raid')
  if ('error' in t) return { empire, error: t.error }
  const free = availableUnits(empire, t.city.id)
  const clean: Partial<Record<UnitId, number>> = {}
  const overseas = t.npc.islandId !== t.city.islandId
  for (const [id, n] of Object.entries(units) as [UnitId, number][]) {
    if (!(RAID_UNITS.includes(id) || WARSHIPS.includes(id)) || !Number.isInteger(n) || n < 0) return { empire, error: 'Geçersiz birlik seçimi.' }
    if (n > free[id]) return { empire, error: `Bu kadar boşta ${UNITS[id].name} yok.` }
    if (n > 0) clean[id] = n
  }
  if (!RAID_UNITS.some(id => (clean[id] ?? 0) > 0)) return { empire, error: 'Sefere en az bir kara birliği seç (yağmayı askerler yapar).' }
  if (!overseas && WARSHIPS.some(id => clean[id])) return { empire, error: 'Savaş gemileri yalnızca başka adaya giden seferlere katılır.' }
  if (overseas) {
    // Ordu denizi nakliye gemileriyle geçer: her gemi 40 kişilik asker taşır.
    const ships = transportsNeeded(clean)
    if (ships > free.nakliye) return { empire, error: `Bu ordu için ${ships} nakliye gemisi gerekli (boşta ${free.nakliye}).` }
    clean.nakliye = ships
  }
  const level = npcState(empire, npcId).level
  const travel = targetTravelMs(t.city, npcId, 'raid', level)
  empire.missions = [...(empire.missions ?? []), {
    id: `raid-${t.city.id}-${npcId}-${now}`, kind: 'raid', cityId: t.city.id, npcId, units: clean,
    departAt: now, arriveAt: now + travel, returnAt: now + 2 * travel,
    resolved: false, loot: { gold: 0, wood: 0, stone: 0 },
  }]
  logEvent(t.city.game, overseas ? `Ordu ${clean.nakliye} gemiyle ${t.npc.name} üzerine denize açıldı.` : `Ordu ${t.npc.name} üzerine sefere çıktı.`, now)
  return { empire }
}

/** Korsan Kalesi seferi: yalnızca savaş gemileri. */
export function dispatchPiracy(source: Empire, targetId: string, units: Partial<Record<UnitId, number>>, now: number): { empire: Empire; error?: string } {
  const empire = advanceEmpire(source, now)
  const t = targetCheck(empire, targetId, 'piracy')
  if ('error' in t) return { empire, error: t.error }
  const target = piracyTarget(targetId)!
  const g = t.city.game
  if (g.buildings.korsan_kalesi < 1) return { empire, error: 'Korsan seferi için Korsan Kalesi kur.' }
  if (g.buildings.korsan_kalesi < target.level) return { empire, error: `Bu hedef için Korsan Kalesi ${target.level}. seviye gerekli.` }
  const free = availableUnits(empire, t.city.id)
  const clean: Partial<Record<UnitId, number>> = {}
  for (const [id, n] of Object.entries(units) as [UnitId, number][]) {
    if (!WARSHIPS.includes(id) || !Number.isInteger(n) || n < 0) return { empire, error: 'Korsan seferine yalnızca savaş gemileri çıkar.' }
    if (n > free[id]) return { empire, error: `Bu kadar boşta ${UNITS[id].name} yok.` }
    if (n > 0) clean[id] = n
  }
  if (!hasTroops(clean)) return { empire, error: 'En az bir savaş gemisi seç.' }
  const travel = Math.round(target.minutes * 60_000 * travelFactor(g))
  empire.missions = [...(empire.missions ?? []), {
    id: `piracy-${t.city.id}-${targetId}-${now}`, kind: 'piracy', cityId: t.city.id, npcId: targetId, units: clean,
    departAt: now, arriveAt: now + travel, returnAt: now + 2 * travel,
    resolved: false, loot: { gold: 0, wood: 0, stone: 0 },
  }]
  logEvent(g, `Filo ${target.name} peşine düştü.`, now)
  return { empire }
}

/** Seçili birliklerin bonus çarpanları (araştırma, Tophane, mucize). */
function multipliers(g: Game, units: Troops, branch: 'kara' | 'deniz') {
  const picked = (Object.entries(units) as [UnitId, number][]).filter(([id]) => UNITS[id].branch === branch)
  const raw = (key: 'attack' | 'defense') => picked.reduce((sum, [id, n]) => sum + UNITS[id][key] * n, 0)
  const army = Object.fromEntries(UNIT_IDS.map(id => [id, 0])) as Army
  for (const [id, n] of picked) army[id] = n
  const p = power({ ...g, army }, branch)
  return {
    attackMul: raw('attack') > 0 ? p.attack / raw('attack') : 1, defenseMul: raw('defense') > 0 ? p.defense / raw('defense') : 1,
    moraleMul: g.research.includes('seref') ? 0.8 : 1, healPerDoctor: g.research.includes('anatomi') ? 6 : 3,
  }
}
const only = (t: Troops, ids: UnitId[]): Troops =>
  Object.fromEntries((Object.entries(t) as [UnitId, number][]).filter(([id, n]) => ids.includes(id) && n > 0))
const roundLines = (rounds: ReturnType<typeof battle>['rounds'], us = 'kaybımız', them = 'düşman kaybı') => rounds.map(r =>
  `Tur ${r.round}: ${us} ${troopList(r.attackerLoss)} · ${them} ${troopList(r.defenderLoss)}${r.wall ? ` · sur ${r.wall}` : ''} · moral ${r.moraleA}/${r.moraleD}.`)

const unitList = (units: Partial<Record<UnitId, number>>) =>
  (Object.entries(units) as [UnitId, number][]).filter(([, n]) => n > 0).map(([id, n]) => `${n} ${UNITS[id].name}`).join(', ') || 'yok'

/**
 * Varış anında görevi çözer: casusluk raporu ya da çarpışma. `empire`
 * yerinde değiştirilir; advanceEmpire tarafından çağrılır.
 */
export function resolveArrival(empire: Empire, m: Mission) {
  const city = empire.cities.find(c => c.id === m.cityId)
  m.resolved = true
  if (city && m.kind === 'piracy') return resolvePiracy(empire, city, m)
  if (city && m.kind === 'deploy') return resolveDeploy(empire, city, m)
  const npc = npcById(m.npcId)
  if (!city || !npc) return
  const state = npcState(empire, m.npcId)
  const g = city.game
  const report = (success: boolean, title: string, lines: string[]) => {
    empire.reports = [{ id: `r-${m.id}`, time: m.arriveAt, kind: m.kind, cityId: m.cityId, npcId: m.npcId, success, title, lines },
      ...(empire.reports ?? [])].slice(0, 30)
    logEvent(g, title, m.arriveAt)
  }
  if (m.kind === 'spy') {
    const count = m.units.casus ?? 0
    const chance = spyChance(g, count, state.level)
    if (roll(m.id) < chance) {
      const d = npcDefense(state.level, false)
      const pool = lootPool(state, m.arriveAt)
      report(true, `Casuslar ${npc.name} hakkında bilgi getirdi.`, [
        `Seviye ${state.level} ${NPC_KINDS[npc.kind].name}.`,
        `Garnizon: ${unitList(garrison(state.level))}.`,
        `Sur: seviye ${npcWall(state.level)} (${d.wall} savunma). Toplam savunma ${d.total}.`,
        `Donanma: ${troopList(npcFleet(state.level, npc.kind))}.`,
        `Hazine: ${pool.gold} akçe, ${pool.wood} kereste, ${pool.stone} taş.`,
        `Başarı şansı %${Math.round(chance * 100)} idi.`,
      ])
    } else {
      g.army.casus = Math.max(0, g.army.casus - count)
      m.units = {}
      report(false, `${count} casus ${npc.name} muhafızlarına yakalandı.`, [
        `Başarı şansı %${Math.round(chance * 100)} idi. Daha çok casus gönder ya da Elçiliği yükselt.`,
      ])
    }
    return
  }
  const npcMul = 1 + state.level * 0.03
  const lines: string[] = []
  // DENİZ SAVAŞI: başka adadaki hedefin donanması çıkarmayı engeller.
  const overseas = npc.islandId !== city.islandId
  const fleet = npcFleet(state.level, npc.kind)
  if (overseas && hasTroops(fleet)) {
    const ships = only(m.units, WARSHIPS)
    if (!hasTroops(ships)) {
      lines.push(`${npc.name} donanması (${troopList(fleet)}) kıyıyı tutuyor. Eskortsuz nakliye gemileri çıkarma yapamadı.`)
      report(false, `${npc.name} önünde çıkarma yapılamadı.`, [...lines, 'Savaş gemileriyle (kadırga, ateş gemisi...) eskort ederek tekrar dene.'])
      return
    }
    const naval = battle({ troops: ships, ...multipliers(g, ships, 'deniz') }, { troops: fleet, attackMul: npcMul, defenseMul: npcMul })
    for (const [id, n] of Object.entries(naval.attackerLost) as [UnitId, number][]) {
      g.army[id] = Math.max(0, g.army[id] - n)
      m.units[id] = Math.max(0, (m.units[id] ?? 0) - n)
    }
    lines.push('Deniz savaşı:', ...roundLines(naval.rounds, 'batan gemimiz', 'batan düşman'),
      `Donanma kaybı: ${troopList(naval.attackerLost)} · düşman kaybı: ${troopList(naval.defenderLost)}.`)
    if (naval.winner !== 'attacker') {
      report(false, `${npc.name} donanması filomuzu geri püskürttü.`, [...lines, 'Ordu karaya çıkamadan döndü.'])
      return
    }
    lines.push('Kıyı temizlendi; ordu karaya çıktı.', 'Kara savaşı:')
  }
  // SEFER: turlu savaş motoru (battle.ts).
  const land = only(m.units, RAID_UNITS)
  const result = battle(
    { troops: land, ...multipliers(g, land, 'kara') },
    { troops: garrison(state.level), attackMul: npcMul, defenseMul: npcMul, wall: npcWallHp(state.level) },
  )
  for (const [id, n] of Object.entries(result.attackerLost) as [UnitId, number][]) g.army[id] = Math.max(0, g.army[id] - n)
  // Kara birlikleri savaştan kalanlar kadar; gemiler olduğu gibi döner.
  const survivors: Troops = {}
  for (const [id, n] of Object.entries(m.units) as [UnitId, number][]) {
    const left = RAID_UNITS.includes(id) ? (result.attackerLeft[id] ?? 0) : n
    if (left > 0) survivors[id] = left
  }
  m.units = survivors
  lines.push(...roundLines(result.rounds))
  lines.push(`Toplam kayıp: ${troopList(result.attackerLost)}${Object.keys(result.healed).length ? ` (hekimler ${troopList(result.healed)} kurtardı)` : ''}.`,
    `Düşman kaybı: ${troopList(result.defenderLost)}.`)
  if (result.winner === 'attacker') {
    // Kara askeri kişi başı 30 taşır; deniz aşırıda ganimeti nakliye ambarları taşır.
    const carry = Math.max(
      (Object.entries(only(m.units, RAID_UNITS)) as [UnitId, number][]).reduce((sum, [id, n]) => sum + UNITS[id].pop * n * 30, 0),
      (m.units.nakliye ?? 0) * UNITS.nakliye.cargo)
    const raw = lootPool(state, m.arriveAt)
    const bonus = 1 + g.buildings.korsan_kalesi * BUILDING_EFFECTS.korsanLoot
    const pool = { gold: Math.floor(raw.gold * bonus), wood: Math.floor(raw.wood * bonus), stone: Math.floor(raw.stone * bonus) }
    const total = pool.gold + pool.wood + pool.stone
    const take = total > 0 ? Math.min(1, carry / total) : 0
    m.loot = { gold: Math.floor(pool.gold * take), wood: Math.floor(pool.wood * take), stone: Math.floor(pool.stone * take) }
    empire.npcs = { ...(empire.npcs ?? {}), [m.npcId]: { level: Math.min(MAX_NPC_LEVEL, state.level + 1), raidedAt: m.arriveAt } }
    lines.push(`Ganimet (taşıma ${carry}): ${m.loot.gold} akçe, ${m.loot.wood} kereste, ${m.loot.stone} taş.`,
      `${npc.name} toparlanıp güçlenecek (seviye ${Math.min(MAX_NPC_LEVEL, state.level + 1)}).`)
    bump(empire, 'raids')
    report(true, `${npc.name} düştü! Ordu ganimetle dönüyor.`, lines)
  } else {
    lines.push('Garnizon direndi; ordu geri çekildi.')
    report(false, `${npc.name} önünde bozguna uğradık.`, lines)
  }
}

/**
 * BİRLİK AKTARMA: kendi şehirlerin arasında asker ve gemi taşı. Kara birlikleri
 * nakliyeyle geçer. Varışta hedefte yeterli boş halk yoksa sığmayanlar geri döner.
 */
export function dispatchDeploy(source: Empire, toCityId: string, units: Partial<Record<UnitId, number>>, now: number): { empire: Empire; error?: string } {
  const empire = advanceEmpire(source, now)
  const from = activeCity(empire)
  const to = empire.cities.find(c => c.id === toCityId)
  if (!to || to.id === from.id) return { empire, error: 'Geçerli bir hedef şehir seç.' }
  if (actionsInUse(empire, from.id) >= actionPoints(from.game)) return { empire, error: `Hamle puanı yok (${actionPoints(from.game)}).` }
  const free = availableUnits(empire, from.id)
  const clean: Partial<Record<UnitId, number>> = {}
  for (const [id, n] of Object.entries(units) as [UnitId, number][]) {
    if (!UNIT_IDS.includes(id) || id === 'nakliye' || !Number.isInteger(n) || n < 0) return { empire, error: 'Geçersiz birlik seçimi.' }
    if (n > free[id]) return { empire, error: `Bu kadar boşta ${UNITS[id].name} yok.` }
    if (n > 0) clean[id] = n
  }
  if (!hasTroops(clean)) return { empire, error: 'En az bir birlik seç.' }
  const overseas = from.islandId !== to.islandId
  if (overseas) {
    if (from.game.buildings.liman < 1) return { empire, error: 'Başka adaya aktarma için Ticaret Limanı gerekli.' }
    const ships = transportsNeeded(clean)
    if (ships > free.nakliye) return { empire, error: `${ships} nakliye gemisi gerekli (boşta ${free.nakliye}).` }
    if (ships) clean.nakliye = ships
  }
  const need = (Object.entries(clean) as [UnitId, number][]).filter(([id]) => id !== 'nakliye').reduce((s, [id, n]) => s + UNITS[id].pop * n, 0)
  if (idleWorkers(to.game) < need) return { empire, error: `${to.name} bu birlikleri barındıramaz: ${need} boş vatandaş yeri gerekli (şu an ${idleWorkers(to.game)}).` }
  const travel = 60_000 + seaTravelMs(from.islandId, to.islandId, from.game)
  empire.missions = [...(empire.missions ?? []), {
    id: `deploy-${from.id}-${to.id}-${now}`, kind: 'deploy', cityId: from.id, npcId: to.id, units: clean,
    departAt: now, arriveAt: now + travel, returnAt: now + 2 * travel, resolved: false, loot: { gold: 0, wood: 0, stone: 0 },
  }]
  logEvent(from.game, `Birlikler ${to.name} şehrine yola çıktı.`, now)
  return { empire }
}
function resolveDeploy(empire: Empire, from: CityRecord, m: Mission) {
  const to = empire.cities.find(c => c.id === m.npcId)
  if (!to) return
  let room = idleWorkers(to.game)
  const moved: Troops = {}, back: Troops = {}
  for (const [id, n] of Object.entries(m.units) as [UnitId, number][]) {
    if (id === 'nakliye') { back[id] = n; continue }
    const fit = Math.min(n, Math.floor(room / UNITS[id].pop))
    room -= fit * UNITS[id].pop
    if (fit > 0) moved[id] = fit
    if (n - fit > 0) back[id] = n - fit
  }
  for (const [id, n] of Object.entries(moved) as [UnitId, number][]) {
    from.game.army[id] = Math.max(0, from.game.army[id] - n)
    to.game.army[id] += n
  }
  m.units = back
  logEvent(to.game, `${troopList(moved)} ${from.name} şehrinden geldi.`, m.arriveAt)
  logEvent(from.game, hasTroops(only(back, UNIT_IDS.filter(id => id !== 'nakliye')))
    ? `${to.name} yer bulamadı: ${troopList(back)} geri dönüyor.` : `Birlikler ${to.name} şehrine ulaştı.`, m.arriveAt)
}

/** Korsan Kalesi seferinin varışı: eskortla deniz savaşı. */
function resolvePiracy(empire: Empire, city: CityRecord, m: Mission) {
  const g = city.game
  const target = piracyTarget(m.npcId)
  if (!target) return
  const result = battle({ troops: { ...m.units }, ...multipliers(g, m.units, 'deniz') }, { troops: { ...target.escort }, ...ESCORT_MUL })
  for (const [id, n] of Object.entries(result.attackerLost) as [UnitId, number][]) g.army[id] = Math.max(0, g.army[id] - n)
  m.units = only(result.attackerLeft, WARSHIPS)
  const lines = [...roundLines(result.rounds, 'batan gemimiz', 'batan eskort'),
    `Kayıp: ${troopList(result.attackerLost)} · eskort kaybı: ${troopList(result.defenderLost)}.`]
  let success = false
  if (result.winner === 'attacker') {
    success = true
    const gold = Math.round(target.gold * (1 + g.buildings.korsan_kalesi * BUILDING_EFFECTS.korsanLoot + (g.research.includes('korsanlik') ? 0.2 : 0)))
    m.loot = { gold, wood: 0, stone: 0 }
    g.piracy = (g.piracy ?? 0) + target.points
    bump(empire, 'piracy')
    lines.push(`Ganimet: ${gold} akçe (Korsan Kalesi +%${Math.round(g.buildings.korsan_kalesi * BUILDING_EFFECTS.korsanLoot * 100)}).`,
      `Korsan şöhreti +${target.points} (toplam ${g.piracy}).`)
  } else lines.push('Eskort direndi; filo ganimetsiz dönüyor.')
  const title = success ? `${target.name} ele geçirildi!` : `${target.name} kaçtı.`
  empire.reports = [{ id: `r-${m.id}`, time: m.arriveAt, kind: 'piracy' as const, cityId: m.cityId, npcId: m.npcId, success, title, lines },
    ...(empire.reports ?? [])].slice(0, 30)
  logEvent(g, title, m.arriveAt)
}

/** Dönüş: hayatta kalanlar zaten ordudadır; ganimet ambara iner. */
export function resolveReturn(empire: Empire, m: Mission) {
  const city = empire.cities.find(c => c.id === m.cityId)
  if (!city) return
  const g = city.game
  const cap = capacity(g)
  for (const r of ['gold', 'wood', 'stone'] as const) g.resources[r] = Math.min(cap, g.resources[r] + m.loot[r])
  if (m.kind === 'deploy' && !hasTroops(m.units)) return
  if (m.kind !== 'spy' || (m.units.casus ?? 0) > 0) logEvent(g, m.kind === 'raid' ? 'Ordu şehre döndü.' : m.kind === 'piracy' ? 'Filo limana döndü.' : m.kind === 'deploy' ? 'Aktarılamayan birlikler döndü.' : 'Casuslar şehre döndü.', m.returnAt)
}

/** advanceEmpire içinden: zamanı gelen görevleri ilerletir. */
export function advanceMissions(empire: Empire, now: number) {
  const pending: Mission[] = []
  for (const m of [...(empire.missions ?? [])].sort((a, b) => a.arriveAt - b.arriveAt)) {
    if (!m.resolved && now >= m.arriveAt) resolveArrival(empire, m)
    if (m.resolved && now >= m.returnAt) { resolveReturn(empire, m); continue }
    pending.push(m)
  }
  empire.missions = pending
}

/** Kayıttan gelen görev/rapor/NPC alanlarını doğrular (bozuksa atar). */
export function parseMissionState(obj: Record<string, unknown>, cityIds: Set<string>) {
  const finite = (n: unknown) => typeof n === 'number' && Number.isFinite(n) && n >= 0
  const missions = Array.isArray(obj.missions) ? (obj.missions as Mission[]) : []
  const threats = Array.isArray(obj.threats) ? (obj.threats as Threat[]) : []
  const nextThreat = obj.nextThreat && typeof obj.nextThreat === 'object' ? (obj.nextThreat as Record<string, number>) : {}
  const troopsOk = (t: unknown) => !!t && typeof t === 'object' &&
    (Object.entries(t as object) as [string, number][]).every(([id, n]) => UNIT_IDS.includes(id as UnitId) && Number.isInteger(n) && n >= 0 && n < 1e6)
  if (threats.length > 8) throw new Error('Baskın kayıtları okunamadı.')
  for (const t of threats) {
    if (!t || typeof t.id !== 'string' || !cityIds.has(t.cityId) || !npcById(t.npcId) || !Number.isInteger(t.level) || t.level < 1 ||
        t.level > 100 || !finite(t.arriveAt) || !troopsOk(t.troops) || !troopsOk(t.fleet)) throw new Error('Baskın kayıtları okunamadı.')
  }
  for (const [id, at] of Object.entries(nextThreat)) if (!cityIds.has(id) || !finite(at)) throw new Error('Baskın kayıtları okunamadı.')
  const reports = Array.isArray(obj.reports) ? (obj.reports as Report[]) : []
  const npcs = obj.npcs && typeof obj.npcs === 'object' ? (obj.npcs as Record<string, NpcState>) : {}
  if (missions.length > 40 || reports.length > 30) throw new Error('Sefer kayıtları okunamadı.')
  for (const m of missions) {
    if (!m || typeof m.id !== 'string' || !['raid', 'spy', 'piracy', 'deploy'].includes(m.kind) || !cityIds.has(m.cityId) ||
        !(m.kind === 'piracy' ? piracyTarget(m.npcId) : m.kind === 'deploy' ? cityIds.has(m.npcId) : npcById(m.npcId)) ||
        !finite(m.departAt) || !finite(m.arriveAt) || !finite(m.returnAt) || typeof m.resolved !== 'boolean' ||
        !m.units || typeof m.units !== 'object' ||
        !(Object.entries(m.units) as [string, number][]).every(([id, n]) => UNIT_IDS.includes(id as UnitId) && Number.isInteger(n) && n >= 0) ||
        !m.loot || !finite(m.loot.gold) || !finite(m.loot.wood) || !finite(m.loot.stone)) throw new Error('Sefer kayıtları okunamadı.')
  }
  for (const r of reports) {
    if (!r || typeof r.id !== 'string' || typeof r.title !== 'string' || !Array.isArray(r.lines) || !finite(r.time)) throw new Error('Rapor kayıtları okunamadı.')
  }
  for (const [id, s] of Object.entries(npcs)) {
    if (!npcById(id) || !s || !Number.isInteger(s.level) || s.level < 1 || s.level > MAX_NPC_LEVEL || !finite(s.raidedAt)) throw new Error('Ada kayıtları okunamadı.')
  }
  return {
    missions: missions.map(m => ({ ...m })), reports: reports.map(r => ({ ...r })), npcs: { ...npcs },
    threats: threats.map(t => ({ ...t })), nextThreat: { ...nextThreat },
  }
}

/* ------------------------------------------------------------ KORSAN BASKINLARI */

/**
 * ŞEHRE GELEN SALDIRILAR. Divanhane'si 5. seviyeye ulaşan şehir acemi
 * korumasından çıkar ve adasındaki Korsan İni birkaç saatte bir baskın düzenler.
 * Baskın 15 dakika önceden görünür: oyuncu asker yetiştirebilir, sur
 * yükseltebilir, seferdeki ordusunu bekleyebilir ya da Kalkan mucizesini çağırabilir.
 * Önce limandaki savaş gemileri korsan filosunu karşılar; yenerlerse baskın
 * denizde biter. Yoksa korsanlar surlara ve şehrin kara birliklerine çarpar.
 * Kazanırlarsa ambarın korunan kısmının üstündekini yağmalarlar.
 */
export type Threat = { id: string; cityId: string; npcId: string; level: number; arriveAt: number; troops: Troops; fleet: Troops }
export const PROTECTION_DIVAN = 5
export const THREAT_WARNING_MS = 15 * 60_000
const FIRST_THREAT_MS = 2 * 3600_000
const THREAT_INTERVAL_MS = 3 * 3600_000

export function pirateBand(level: number): { troops: Troops; fleet: Troops } {
  return {
    troops: { azap: 2 * level, sapanci: 2 * level, okcu: level, yeniceri: level, topcu: Math.floor(level / 4) },
    fleet: { kadirga: Math.floor(level / 3) },
  }
}
/** Ambarın yağmadan korunan kısmı (kapasitenin %20'si, Koruma Usulü ile %35; her malda). */
export function safeStock(g: Game) { return Math.round(capacity(g) * (g.research.includes('koruma') ? 0.35 : 0.2)) }
/** Şehrin surundaki muhafızlar (orduya sayılmaz, sur seviyesi başına 4 mızrakçı). */
export function cityGuards(g: Game) { return g.buildings.surlar * 4 }
export function cityWallHp(g: Game) {
  return Math.round(g.buildings.surlar * 400 * (g.research.includes('istihkam') ? 1.3 : 1) * (1 + miracle(g, 'kalkan') * 0.1))
}

function scheduleThreat(empire: Empire, city: CityRecord, at: number) {
  const korsan = NPC_SETTLEMENTS.find(n => n.islandId === city.islandId && n.kind === 'korsan')!
  const level = Math.max(npcState(empire, korsan.id).level, Math.floor(city.game.buildings.divan / 2))
  const band = pirateBand(level)
  empire.threats = [...(empire.threats ?? []), {
    id: `threat-${city.id}-${at}`, cityId: city.id, npcId: korsan.id, level, arriveAt: at, ...band,
  }]
  logEvent(city.game, `Gözcüler ${korsan.name} korsanlarını gördü! Baskın yaklaşıyor.`, at - THREAT_WARNING_MS)
}

function resolveThreat(empire: Empire, t: Threat) {
  const city = empire.cities.find(c => c.id === t.cityId)
  if (!city) return
  const g = city.game
  const npc = npcById(t.npcId)!
  const free = availableUnits(empire, city.id)
  const pirateMul = 1 + t.level * 0.03
  const shield = 1 + miracle(g, 'kalkan') * 0.1
  const lines: string[] = []
  const report = (success: boolean, title: string) => {
    empire.reports = [{ id: `r-${t.id}`, time: t.arriveAt, kind: 'defense' as const, cityId: city.id, npcId: t.npcId, success, title, lines },
      ...(empire.reports ?? [])].slice(0, 30)
    logEvent(g, title, t.arriveAt)
  }
  // 1) Limandaki savaş gemileri korsan filosunu karşılar.
  const ships = only(free, WARSHIPS)
  if (hasTroops(ships) && hasTroops(t.fleet)) {
    const m = multipliers(g, ships, 'deniz')
    const naval = battle({ troops: { ...t.fleet }, attackMul: pirateMul, defenseMul: pirateMul },
      { troops: ships, attackMul: m.attackMul * shield, defenseMul: m.defenseMul * shield })
    for (const [id, n] of Object.entries(naval.defenderLost) as [UnitId, number][]) g.army[id] = Math.max(0, g.army[id] - n)
    lines.push('Deniz savaşı:', ...roundLines(naval.rounds, 'batan korsan', 'batan gemimiz'),
      `Donanma kaybı: ${troopList(naval.defenderLost)} · korsan kaybı: ${troopList(naval.attackerLost)}.`)
    if (naval.winner === 'defender') {
      const bounty = Math.round((Object.entries(naval.attackerLost) as [UnitId, number][]).reduce((s, [id, n]) => s + UNITS[id].pop * n, 0) * 8)
      g.resources.gold = Math.min(capacity(g), g.resources.gold + bounty)
      lines.push(`Korsanlar karaya çıkamadan kaçtı. Ödül: ${bounty} akçe.`)
      return report(true, `Donanmamız ${npc.name} korsanlarını denizde durdurdu.`)
    }
    lines.push('Korsan filosu kıyıya ulaştı.')
  }
  // 2) Kara savaşı: muhafızlar + şehrin kara birlikleri, sur önce hasar emer.
  const guards = cityGuards(g)
  const land = only(free, RAID_UNITS)
  const m = multipliers(g, land, 'kara')
  const defenders: Troops = { ...land, mizrakci: (land.mizrakci ?? 0) + guards }
  const result = battle({ troops: { ...t.troops }, attackMul: pirateMul, defenseMul: pirateMul },
    { troops: defenders, attackMul: m.attackMul * shield, defenseMul: m.defenseMul * shield, wall: cityWallHp(g) })
  const lost = { ...result.defenderLost }
  // Muhafızlar önce düşer; ordu kaybı onların ötesindekidir.
  lost.mizrakci = Math.max(0, (lost.mizrakci ?? 0) - guards)
  for (const [id, n] of Object.entries(lost) as [UnitId, number][]) g.army[id] = Math.max(0, g.army[id] - n)
  lines.push(...roundLines(result.rounds, 'korsan kaybı', 'kaybımız'),
    `Şehrin kaybı: ${troopList(lost)} (sur muhafızları: ${guards}).`, `Korsan kaybı: ${troopList(result.attackerLost)}.`)
  if (result.winner === 'defender') {
    const bounty = Math.round((Object.entries(result.attackerLost) as [UnitId, number][]).reduce((s, [id, n]) => s + UNITS[id].pop * n, 0) * 8)
    g.resources.gold = Math.min(capacity(g), g.resources.gold + bounty)
    lines.push(`Baskın püskürtüldü. Ödül: ${bounty} akçe.`)
    return report(true, `${npc.name} korsanları surlarda durduruldu!`)
  }
  // Yağma: sağ kalan korsan kişi başı 30 taşır; korunan kısım dokunulmaz.
  let carry = (Object.entries(result.attackerLeft) as [UnitId, number][]).reduce((s, [id, n]) => s + UNITS[id].pop * n * 30, 0)
  const safe = safeStock(g)
  const taken: string[] = []
  for (const r of ['gold', 'wood', 'stone'] as const) {
    const n = Math.min(carry, Math.max(0, Math.floor(g.resources[r] - safe)) >> 1)
    if (n > 0) { g.resources[r] -= n; carry -= n; taken.push(`${n} ${r === 'gold' ? 'akçe' : r === 'wood' ? 'kereste' : 'taş'}`) }
  }
  for (const r of LUXURY_IDS) {
    const n = Math.min(carry, Math.max(0, Math.floor(g.luxury[r] - safe)) >> 1)
    if (n > 0) { g.luxury[r] -= n; carry -= n; taken.push(`${n} ${r}`) }
  }
  lines.push(taken.length ? `Yağmalanan: ${taken.join(', ')}.` : 'Ambarda korunan miktarın üstünde mal yoktu.',
    `Ambar her malın ${safe} birimini korur. Surları yükselt, asker yetiştir ya da Kalkan mucizesini çağır.`)
  report(false, `${npc.name} korsanları şehri yağmaladı.`)
}

/** advanceEmpire içinden: baskınları zamanlar ve çözer. */
export function advanceThreats(empire: Empire, now: number) {
  const next = { ...(empire.nextThreat ?? {}) }
  const threats: Threat[] = []
  for (const t of [...(empire.threats ?? [])].sort((a, b) => a.arriveAt - b.arriveAt)) {
    if (now < t.arriveAt) { threats.push(t); continue }
    resolveThreat(empire, t)
    // Bir sonraki baskın 3-5 saat sonra; uzun yokluktan sonra en fazla bir baskın.
    next[t.cityId] = Math.max(t.arriveAt, now) + THREAT_INTERVAL_MS + Math.round(roll(t.id) * 2 * 3600_000)
  }
  empire.threats = threats
  for (const city of empire.cities) {
    if (city.game.buildings.divan < PROTECTION_DIVAN) { delete next[city.id]; continue }
    if (next[city.id] === undefined) next[city.id] = now + FIRST_THREAT_MS
    if (empire.threats.some(t => t.cityId === city.id)) continue
    if (now >= next[city.id] - THREAT_WARNING_MS) scheduleThreat(empire, city, Math.max(next[city.id], now + THREAT_WARNING_MS))
  }
  empire.nextThreat = next
}
