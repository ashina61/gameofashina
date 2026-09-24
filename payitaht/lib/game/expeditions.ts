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
  UNITS, UNIT_IDS, capacity, power, BUILDING_EFFECTS, logEvent, actionPoints,
  type Army, type Game, type UnitId,
} from './engine'
import { battle, troopList } from './battle'
import { activeCity, advanceEmpire, type Empire } from './empire'
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

export type NpcState = { level: number; raidedAt: number }
export type Loot = { gold: number; wood: number; stone: number }
export type Mission = {
  id: string; kind: 'raid' | 'spy'; cityId: string; npcId: string
  units: Partial<Record<UnitId, number>>
  departAt: number; arriveAt: number; returnAt: number
  resolved: boolean; loot: Loot
}
export type Report = {
  id: string; time: number; kind: 'raid' | 'spy'; cityId: string; npcId: string
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
/** Harita Arşivi yolu kısaltır (seviye başına %2, en fazla %50). */
function mapBonus(g?: Game) { return g ? 1 - Math.min(0.5, g.buildings.harita_arsivi * BUILDING_EFFECTS.harita) : 1 }
export function raidTravelMs(level: number, g?: Game) { return Math.round((90 + 30 * level) * 1000 * mapBonus(g)) }
export function spyTravelMs(level: number, g?: Game) { return Math.round((60 + 15 * level) * 1000 * mapBonus(g)) }

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
  return Math.min(0.95, Math.max(0.05, 0.3 + 0.12 * count + g.buildings.elcilik * BUILDING_EFFECTS.elcilikSpySuccess - 0.06 * level))
}

function targetCheck(empire: Empire, npcId: string, kind: Mission['kind']) {
  const city = activeCity(empire)
  const npc = npcById(npcId)
  if (!npc) return { error: 'Bilinmeyen hedef.' }
  if (npc.islandId !== city.islandId) return { error: 'Yalnızca kendi adandaki yerleşimlere sefer düzenlenebilir.' }
  if (actionsInUse(empire, city.id) >= actionPoints(city.game)) {
    return { error: `Hamle puanı yok (${actionPoints(city.game)}). Bir görevin dönmesini bekle ya da Divanhane'yi yükselt.` }
  }
  if ((empire.missions ?? []).some(m => m.cityId === city.id && m.npcId === npcId && m.kind === kind && !m.resolved)) {
    return { error: kind === 'spy' ? 'Bu hedefe giden casuslar zaten yolda.' : 'Bu hedefe giden bir ordu zaten yolda.' }
  }
  return { city, npc }
}

export function dispatchSpies(source: Empire, npcId: string, count: number, now: number): { empire: Empire; error?: string } {
  const empire = advanceEmpire(source, now)
  const t = targetCheck(empire, npcId, 'spy')
  if ('error' in t) return { empire, error: t.error }
  if (!Number.isInteger(count) || count <= 0) return { empire, error: 'En az bir casus seç.' }
  if (availableUnits(empire, t.city.id).casus < count) return { empire, error: 'Bu kadar boşta casus yok. Elçilikte casus yetiştir.' }
  const level = npcState(empire, npcId).level
  const id = `spy-${t.city.id}-${npcId}-${now}`
  empire.missions = [...(empire.missions ?? []), {
    id, kind: 'spy', cityId: t.city.id, npcId, units: { casus: count },
    departAt: now, arriveAt: now + spyTravelMs(level, t.city.game), returnAt: now + 2 * spyTravelMs(level, t.city.game),
    resolved: false, loot: { gold: 0, wood: 0, stone: 0 },
  }]
  logEvent(t.city.game, `${count} casus ${t.npc.name} yönüne yola çıktı.`, now)
  return { empire }
}

export function dispatchRaid(source: Empire, npcId: string, units: Partial<Record<UnitId, number>>, now: number): { empire: Empire; error?: string } {
  const empire = advanceEmpire(source, now)
  const t = targetCheck(empire, npcId, 'raid')
  if ('error' in t) return { empire, error: t.error }
  const free = availableUnits(empire, t.city.id)
  const clean: Partial<Record<UnitId, number>> = {}
  for (const [id, n] of Object.entries(units) as [UnitId, number][]) {
    if (!RAID_UNITS.includes(id) || !Number.isInteger(n) || n < 0) return { empire, error: 'Geçersiz birlik seçimi.' }
    if (n > free[id]) return { empire, error: `Bu kadar boşta ${UNITS[id].name} yok.` }
    if (n > 0) clean[id] = n
  }
  if (Object.keys(clean).length === 0) return { empire, error: 'Sefere en az bir birlik seç.' }
  const level = npcState(empire, npcId).level
  empire.missions = [...(empire.missions ?? []), {
    id: `raid-${t.city.id}-${npcId}-${now}`, kind: 'raid', cityId: t.city.id, npcId, units: clean,
    departAt: now, arriveAt: now + raidTravelMs(level, t.city.game), returnAt: now + 2 * raidTravelMs(level, t.city.game),
    resolved: false, loot: { gold: 0, wood: 0, stone: 0 },
  }]
  logEvent(t.city.game, `Ordu ${t.npc.name} üzerine sefere çıktı.`, now)
  return { empire }
}

const unitList = (units: Partial<Record<UnitId, number>>) =>
  (Object.entries(units) as [UnitId, number][]).filter(([, n]) => n > 0).map(([id, n]) => `${n} ${UNITS[id].name}`).join(', ') || 'yok'

/**
 * Varış anında görevi çözer: casusluk raporu ya da çarpışma. `empire`
 * yerinde değiştirilir; advanceEmpire tarafından çağrılır.
 */
export function resolveArrival(empire: Empire, m: Mission) {
  const city = empire.cities.find(c => c.id === m.cityId)
  const npc = npcById(m.npcId)
  m.resolved = true
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
  // SEFER: turlu savaş motoru (battle.ts).
  const raw = (key: 'attack' | 'defense') => (Object.entries(m.units) as [UnitId, number][]).reduce((sum, [id, n]) => sum + UNITS[id][key] * n, 0)
  const army = Object.fromEntries(UNIT_IDS.map(id => [id, m.units[id] ?? 0])) as Army
  const p = power({ ...g, army }, 'kara')
  const attackMul = raw('attack') > 0 ? p.attack / raw('attack') : 1
  const defenseMul = raw('defense') > 0 ? p.defense / raw('defense') : 1
  const npcMul = 1 + state.level * 0.03
  const result = battle(
    { troops: { ...m.units }, attackMul, defenseMul },
    { troops: garrison(state.level), attackMul: npcMul, defenseMul: npcMul, wall: npcWallHp(state.level) },
  )
  for (const [id, n] of Object.entries(result.attackerLost) as [UnitId, number][]) g.army[id] = Math.max(0, g.army[id] - n)
  m.units = Object.fromEntries((Object.entries(result.attackerLeft) as [UnitId, number][]).filter(([, n]) => n > 0))
  const lines = result.rounds.map(r =>
    `Tur ${r.round}: kaybımız ${troopList(r.attackerLoss)} · düşman kaybı ${troopList(r.defenderLoss)} · sur ${r.wall} · moral ${r.moraleA}/${r.moraleD}.`)
  lines.push(`Toplam kayıp: ${troopList(result.attackerLost)}${Object.keys(result.healed).length ? ` (hekimler ${troopList(result.healed)} kurtardı)` : ''}.`,
    `Düşman kaybı: ${troopList(result.defenderLost)}.`)
  if (result.winner === 'attacker') {
    const carry = (Object.entries(m.units) as [UnitId, number][]).reduce((sum, [id, n]) => sum + UNITS[id].pop * n * 30, 0)
    const pool = lootPool(state, m.arriveAt)
    const total = pool.gold + pool.wood + pool.stone
    const take = total > 0 ? Math.min(1, carry / total) : 0
    m.loot = { gold: Math.floor(pool.gold * take), wood: Math.floor(pool.wood * take), stone: Math.floor(pool.stone * take) }
    empire.npcs = { ...(empire.npcs ?? {}), [m.npcId]: { level: Math.min(MAX_NPC_LEVEL, state.level + 1), raidedAt: m.arriveAt } }
    lines.push(`Ganimet (taşıma ${carry}): ${m.loot.gold} akçe, ${m.loot.wood} kereste, ${m.loot.stone} taş.`,
      `${npc.name} toparlanıp güçlenecek (seviye ${Math.min(MAX_NPC_LEVEL, state.level + 1)}).`)
    report(true, `${npc.name} düştü! Ordu ganimetle dönüyor.`, lines)
  } else {
    lines.push('Garnizon direndi; ordu geri çekildi.')
    report(false, `${npc.name} önünde bozguna uğradık.`, lines)
  }
}

/** Dönüş: hayatta kalanlar zaten ordudadır; ganimet ambara iner. */
export function resolveReturn(empire: Empire, m: Mission) {
  const city = empire.cities.find(c => c.id === m.cityId)
  if (!city) return
  const g = city.game
  const cap = capacity(g)
  for (const r of ['gold', 'wood', 'stone'] as const) g.resources[r] = Math.min(cap, g.resources[r] + m.loot[r])
  if (m.kind === 'raid' || (m.units.casus ?? 0) > 0) logEvent(g, m.kind === 'raid' ? 'Ordu şehre döndü.' : 'Casuslar şehre döndü.', m.returnAt)
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
  const reports = Array.isArray(obj.reports) ? (obj.reports as Report[]) : []
  const npcs = obj.npcs && typeof obj.npcs === 'object' ? (obj.npcs as Record<string, NpcState>) : {}
  if (missions.length > 40 || reports.length > 30) throw new Error('Sefer kayıtları okunamadı.')
  for (const m of missions) {
    if (!m || typeof m.id !== 'string' || !['raid', 'spy'].includes(m.kind) || !cityIds.has(m.cityId) || !npcById(m.npcId) ||
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
  return { missions: missions.map(m => ({ ...m })), reports: reports.map(r => ({ ...r })), npcs: { ...npcs } }
}
