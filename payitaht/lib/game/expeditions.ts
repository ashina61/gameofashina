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
  garrisonLimit, garrisonUsed, inGarrison,
  LUXURY_IDS, type Army, type Game, type UnitId,
} from './engine'
import {
  ROUND_MS, battleRound, endBattle, fieldSize, joinBattle, retreatBattle, startBattle, troopList,
  type BattleJoin, type BattleResult, type BattleSide, type BattleState, type Troops,
} from './battle'
import { activeCity, advanceEmpire, bump, type CityRecord, type Empire } from './empire'
import { ISLANDS, type IslandId } from './islands'
import {
  RIVALS, allyHelp, onRivalRaided, pacified, rivalAttackMul, rivalById, rivalFleet, rivalGarrison, rivalIntel, rivalLevel,
  rivalLoot, rivalState, rivalWallHp, STYLE_NAMES,
} from './rivals'

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
  id: string; kind: 'raid' | 'spy' | 'piracy' | 'deploy' | 'occupy' | 'blockade'; cityId: string; npcId: string
  /** İşgal ya da ablukada bekleyen birlikler (geri çağrılana kadar dönmez). */
  stationed?: boolean
  units: Partial<Record<UnitId, number>>
  departAt: number; arriveAt: number; returnAt: number
  resolved: boolean; loot: Loot
  /** Varıştan sonra süren savaş (bitince rapor yazılır, dönüş başlar). */
  battle?: LiveBattle
}
export type Report = {
  id: string; time: number; kind: Mission['kind'] | 'defense'; cityId: string; npcId: string
  success: boolean; title: string; lines: string[]
  /** Savaşların girdileri: rapor açılınca deterministik motorla tur tur yeniden kurulur. */
  battles?: StoredBattle[]
}
/**
 * Rapordaki bir savaşın girdisi: başlangıç orduları, tur arasında katılan
 * takviyeler ve geri çekilme. Rapor açılınca deterministik motorla yeniden kurulur.
 */
export type StoredBattle = {
  title: string; attacker: string; defender: string; a: BattleSide; d: BattleSide
  joins?: BattleJoin[]; retreat?: number
}
/**
 * SÜREN SAVAŞ (Ikariam gibi gerçek zamanlı): her ROUND_MS'de bir tur çarpışılır.
 * Turlar arasında takviye katılabilir, saldıran geri çekilebilir. Deniz aşırı
 * seferde önce deniz, sonra kara aşaması gelir.
 */
export type LiveBattle = {
  stage: 'naval' | 'land'
  info: StoredBattle
  state: BattleState
  /** Sıradaki turun zamanı. */
  nextAt: number
  /** Önceki aşamaların rapor satırları ve savaşları. */
  lines: string[]
  done: StoredBattle[]
}
const cloneSide = (x: BattleSide): BattleSide => ({ ...x, troops: { ...x.troops } })
function openBattle(stage: LiveBattle['stage'], title: string, attacker: string, defender: string, a: BattleSide, d: BattleSide,
  at: number, lines: string[] = [], done: StoredBattle[] = []): LiveBattle {
  return { stage, info: { title, attacker, defender, a: cloneSide(a), d: cloneSide(d) }, state: startBattle(a, d), nextAt: at, lines, done }
}
/** Sıradaki tura takviye (eksi sayı: ayrılan birlik); rapor için kaydedilir. */
function joinLive(lb: LiveBattle, side: 'a' | 'd', troops: Troops) {
  const clean = Object.fromEntries((Object.entries(troops) as [UnitId, number][]).filter(([, n]) => n)) as Troops
  if (!Object.keys(clean).length) return
  joinBattle(lb.state, side, clean)
  lb.info.joins = [...(lb.info.joins ?? []), { round: lb.state.round + 1, side, troops: clean }]
}
/** Bu hedefte süren savaş (bir görevin). */
export function liveBattleAt(empire: Empire, npcId: string) { return (empire.missions ?? []).find(m => m.npcId === npcId && m.battle) }
/** Şehrin önünde savaş sürüyor mu (birlikler surlardan ayrılamaz)? */
export function underSiege(empire: Empire, cityId: string) { return (empire.threats ?? []).some(t => t.cityId === cityId && t.battle) }

export function npcById(id: string) { return NPC_SETTLEMENTS.find(n => n.id === id) }

/** Sefer hedefi: bağımsız yerleşim ya da yapay rakip hükümdarın şehri. */
export type Target = {
  id: string; name: string; islandId: IslandId; kindName: string; level: number; rival: boolean
  garrison: Army; wallHp: number; fleet: Troops; loot: Loot; mul: number
  /** Savaş alanını belirleyen seviye (Divanhane karşılığı). */
  field: number
}
export function targetInfo(empire: Empire, id: string, now: number): Target | undefined {
  const npc = npcById(id)
  if (npc) {
    const st = npcState(empire, id)
    return { id, name: npc.name, islandId: npc.islandId, kindName: NPC_KINDS[npc.kind].name, level: st.level, rival: false,
      garrison: garrison(st.level), wallHp: npcWallHp(st.level), fleet: npcFleet(st.level, npc.kind), loot: lootPool(st, now), mul: 1 + st.level * 0.03, field: npcField(st.level, npc.kind) }
  }
  const r = rivalById(id)
  if (!r) return undefined
  const L = rivalLevel(empire, r, now)
  return { id, name: r.city, islandId: r.islandId, kindName: `${STYLE_NAMES[r.style]} hükümdar (yapay rakip)`, level: L, rival: true,
    garrison: rivalGarrison(L, r.style), wallHp: rivalWallHp(L), fleet: rivalFleet(L, r.style), loot: rivalLoot(empire, r, now), mul: rivalAttackMul(L), field: rivalField(L) }
}
export const targetIsland = (id: string) => npcById(id)?.islandId ?? rivalById(id)?.islandId
export const targetName = (id: string) => npcById(id)?.name ?? rivalById(id)?.city ?? id
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
/**
 * Yerleşimin Divanhane karşılığı (savaş alanını belirler): köy küçük, kale
 * büyük meydanda savaşır. Casus raporunda ve hedef panelinde görünür.
 */
export function npcField(level: number, kind: NpcKind = 'koy') {
  return Math.min(24, kind === 'kale' ? 2 * level : kind === 'korsan' ? level + 3 : level + 1)
}
/** Yapay rakip hükümdarın Divanhanesi: dünya yaşıyla büyür. */
export function rivalField(level: number) { return Math.min(24, 2 + level) }

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
export function targetTravelMs(city: CityRecord, npcId: string, kind: 'raid' | 'spy', level: number, units?: Troops) {
  // Ikariam: ordu en yavaş birliği kadar hızlıdır (karada kara, denizde gemi birlikleri).
  const land = units ? slowest(units, 'kara') : 1, sea = units ? slowest(units, 'deniz') : 1
  return Math.round((kind === 'spy' ? spyTravelMs(level, city.game) : raidTravelMs(level, city.game) * land)
    + seaTravelMs(city.islandId, targetIsland(npcId)!, city.game) * sea)
}
/** Birlik hız çarpanı: 1 normal, <1 hızlı (atlı, hafif tekne), >1 yavaş (kuşatma, kalyon). */
export const UNIT_PACE: Partial<Record<UnitId, number>> = {
  sipahi: 0.75, azap: 0.9, karamursel: 0.8, kadirga: 0.9,
  kocbasi: 1.5, mancinik: 1.6, topcu: 1.5, deli: 1.1, kalyon: 1.3, humbara_gemisi: 1.35, mancinik_gemisi: 1.25, ikmal_gemisi: 1.1,
}
/** Seçili birliklerin en yavaşının çarpanı (o koldaki birlik yoksa 1). */
export function slowest(units: Troops, branch: 'kara' | 'deniz') {
  const ids = (Object.entries(units) as [UnitId, number][]).filter(([id, n]) => n > 0 && UNITS[id].branch === branch).map(([id]) => id)
  return ids.length ? Math.max(...ids.map(id => UNIT_PACE[id] ?? 1)) : 1
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

function targetCheck(empire: Empire, npcId: string, kind: Mission['kind'], now: number) {
  const city = activeCity(empire)
  const npc = kind === 'piracy' ? null : targetInfo(empire, npcId, now)
  if (kind !== 'piracy' && !npc) return { error: 'Bilinmeyen hedef.' }
  if (kind === 'piracy' && !piracyTarget(npcId)) return { error: 'Bilinmeyen hedef.' }
  if (npc?.rival && kind !== 'spy') {
    const r = rivalById(npcId)!
    const s = empire.world?.rivals[npcId]
    if (s?.treaties.includes('baris')) return { error: `${r.ruler} ile barış anlaşman var. Önce anlaşmayı boz.` }
    if (empire.world?.alliance === r.faction) return { error: 'İttifak üyesine saldırılmaz.' }
  }
  if ((kind === 'occupy' || kind === 'blockade') && !npc?.rival) return { error: 'İşgal ve abluka yalnızca hükümdar şehirlerine yapılır.' }
  if ((kind === 'occupy' || kind === 'blockade') && (empire.missions ?? []).some(m => m.npcId === npcId && (m.kind === 'occupy' || m.kind === 'blockade') && m.kind === kind)) {
    return { error: kind === 'occupy' ? 'Bu şehir zaten işgal altında (ya da ordun yolda).' : 'Bu liman zaten abluka altında (ya da filon yolda).' }
  }
  if (npc && npc.islandId !== city.islandId && city.game.buildings.liman < 1) {
    return { error: 'Başka adaya sefer için bu şehirde Ticaret Limanı gerekli.' }
  }
  if (actionsInUse(empire, city.id) >= actionPoints(city.game)) {
    return { error: `Hamle puanı yok (${actionPoints(city.game)}). Bir görevin dönmesini bekle ya da Divanhane'yi yükselt.` }
  }
  if (kind !== 'spy' && underSiege(empire, city.id)) return { error: 'Şehrin önünde savaş sürüyor: birlikler surlardan ayrılamaz.' }
  // Savaşı süren bir sefere aynı şehirden TAKVİYE gönderilebilir; yolda olana ikinci ordu gönderilmez.
  if ((empire.missions ?? []).some(m => m.cityId === city.id && m.npcId === npcId && m.kind === kind && !m.resolved && !m.battle)) {
    return { error: kind === 'spy' ? 'Bu hedefe giden casuslar zaten yolda.' : kind === 'piracy' ? 'Bu hedefe giden filo zaten yolda.' : 'Bu hedefe giden bir ordu zaten yolda.' }
  }
  return { city, npc: npc! }
}

export function dispatchSpies(source: Empire, npcId: string, count: number, now: number): { empire: Empire; error?: string } {
  const empire = advanceEmpire(source, now)
  const t = targetCheck(empire, npcId, 'spy', now)
  if ('error' in t) return { empire, error: t.error }
  if (!Number.isInteger(count) || count <= 0) return { empire, error: 'En az bir casus seç.' }
  if (availableUnits(empire, t.city.id).casus < count) return { empire, error: 'Bu kadar boşta casus yok. Elçilikte casus yetiştir.' }
  const level = t.npc.level
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

export function dispatchRaid(source: Empire, npcId: string, units: Partial<Record<UnitId, number>>, now: number, mode: 'raid' | 'occupy' = 'raid'): { empire: Empire; error?: string } {
  const empire = advanceEmpire(source, now)
  const t = targetCheck(empire, npcId, mode, now)
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
  const level = t.npc.level
  const travel = targetTravelMs(t.city, npcId, 'raid', level, clean)
  empire.missions = [...(empire.missions ?? []), {
    id: `${mode}-${t.city.id}-${npcId}-${now}`, kind: mode, cityId: t.city.id, npcId, units: clean,
    departAt: now, arriveAt: now + travel, returnAt: now + 2 * travel,
    resolved: false, loot: { gold: 0, wood: 0, stone: 0 },
  }]
  logEvent(t.city.game, overseas ? `Ordu ${clean.nakliye} gemiyle ${t.npc.name} üzerine denize açıldı.` : `Ordu ${t.npc.name} üzerine sefere çıktı.`, now)
  return { empire }
}

/** Korsan Kalesi seferi: yalnızca savaş gemileri. */
export function dispatchPiracy(source: Empire, targetId: string, units: Partial<Record<UnitId, number>>, now: number): { empire: Empire; error?: string } {
  const empire = advanceEmpire(source, now)
  const t = targetCheck(empire, targetId, 'piracy', now)
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

/** ABLUKA: savaş gemileri hükümdarın limanını kapatır (önce donanmasıyla savaş). */
export function dispatchBlockade(source: Empire, rivalId: string, units: Partial<Record<UnitId, number>>, now: number): { empire: Empire; error?: string } {
  const empire = advanceEmpire(source, now)
  const t = targetCheck(empire, rivalId, 'blockade', now)
  if ('error' in t) return { empire, error: t.error }
  if (t.city.game.buildings.liman < 1) return { empire, error: 'Abluka için Ticaret Limanı gerekli.' }
  const free = availableUnits(empire, t.city.id)
  const clean: Partial<Record<UnitId, number>> = {}
  for (const [id, n] of Object.entries(units) as [UnitId, number][]) {
    if (!WARSHIPS.includes(id) || !Number.isInteger(n) || n < 0) return { empire, error: 'Ablukaya yalnızca savaş gemileri çıkar.' }
    if (n > free[id]) return { empire, error: `Bu kadar boşta ${UNITS[id].name} yok.` }
    if (n > 0) clean[id] = n
  }
  if (!hasTroops(clean)) return { empire, error: 'En az bir savaş gemisi seç.' }
  const travel = 60_000 + seaTravelMs(t.city.islandId, t.npc.islandId, t.city.game)
  empire.missions = [...(empire.missions ?? []), {
    id: `blockade-${t.city.id}-${rivalId}-${now}`, kind: 'blockade', cityId: t.city.id, npcId: rivalId, units: clean,
    departAt: now, arriveAt: now + travel, returnAt: now + 2 * travel, resolved: false, loot: { gold: 0, wood: 0, stone: 0 },
  }]
  logEvent(t.city.game, `Filo ${t.npc.name} limanını kapatmaya gidiyor.`, now)
  return { empire }
}
/** İşgal ya da ablukadaki birlikleri (haraçla birlikte) geri çağır. */
export function recallMission(source: Empire, missionId: string, now: number): { empire: Empire; error?: string } {
  const empire = advanceEmpire(source, now)
  const m = (empire.missions ?? []).find(x => x.id === missionId)
  if (!m || !m.stationed) return { empire, error: 'Geri çağrılacak birlik yok.' }
  m.stationed = false
  m.returnAt = now + (m.arriveAt - m.departAt)
  const city = empire.cities.find(c => c.id === m.cityId)
  if (city) logEvent(city.game, `${targetName(m.npcId)} bırakıldı; birlikler ${m.loot.gold} akçe haraçla dönüyor.`, now)
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

const unitList = (units: Partial<Record<UnitId, number>>) =>
  (Object.entries(units) as [UnitId, number][]).filter(([, n]) => n > 0).map(([id, n]) => `${n} ${UNITS[id].name}`).join(', ') || 'yok'

/** Görevin raporu (savaşları rapor görünümünde tur tur açılır). */
function missionReport(empire: Empire, m: Mission, at: number, success: boolean, title: string, lines: string[], battles: StoredBattle[] = []) {
  const city = empire.cities.find(c => c.id === m.cityId)
  empire.reports = [{ id: `r-${m.id}`, time: at, kind: m.kind, cityId: m.cityId, npcId: m.npcId, success, title, lines, battles: battles.length ? battles : undefined },
    ...(empire.reports ?? [])].slice(0, 30)
  if (city) logEvent(city.game, title, at)
}
/** Görev sonuçlandı: dönüş yolu savaşın bittiği andan başlar. */
function concludeMission(m: Mission, at: number) {
  const travel = m.returnAt - m.arriveAt
  m.resolved = true
  m.battle = undefined
  m.returnAt = Math.max(at, m.arriveAt) + travel
}
const isAssault = (k: Mission['kind']) => k === 'raid' || k === 'occupy'

/**
 * Varış: casusluk hemen çözülür; sefer, abluka ve korsan seferi bir SAVAŞ
 * başlatır (ilk tur varış anında). `empire` yerinde değiştirilir.
 */
export function resolveArrival(empire: Empire, m: Mission) {
  const city = empire.cities.find(c => c.id === m.cityId)
  if (!city) { m.resolved = true; return }
  if (m.kind === 'deploy') { m.resolved = true; return resolveDeploy(empire, city, m) }
  if (m.kind === 'piracy') return openPiracy(city, m)
  const npc = targetInfo(empire, m.npcId, m.arriveAt)
  if (!npc) { m.resolved = true; return }
  const g = city.game
  const report = (success: boolean, title: string, lines: string[]) => {
    missionReport(empire, m, m.arriveAt, success, title, lines)
    concludeMission(m, m.arriveAt)
  }
  if (m.kind === 'spy') {
    const count = m.units.casus ?? 0
    const chance = spyChance(g, count, npc.level)
    const field = fieldSize(npc.field)
    const fieldLine = `Savaş meydanı: ${field.name} (Divanhane ${npc.field} karşılığı · ön cephe ${field.front}, kanat ${field.flank}, menzil ${field.range}, kuşatma ${field.artillery} yuva).`
    if (roll(m.id) < chance) {
      const r = rivalById(m.npcId)
      if (r) {
        report(true, `Casuslar ${npc.name} hakkında bilgi getirdi.`, [...rivalIntel(empire, r, m.arriveAt), fieldLine, `Toplam savunma ${Math.round(UNIT_IDS.reduce((s, id) => s + UNITS[id].defense * npc.garrison[id], 0) + npc.wallHp / 3)}.`, `Başarı şansı %${Math.round(chance * 100)} idi.`])
        return
      }
      const d = npcDefense(npc.level, false)
      const pool = npc.loot
      report(true, `Casuslar ${npc.name} hakkında bilgi getirdi.`, [
        `Seviye ${npc.level} ${npc.kindName}.`,
        `Garnizon: ${unitList(npc.garrison)}.`,
        `Sur: seviye ${npcWall(npc.level)} (${d.wall} savunma). Toplam savunma ${d.total}.`,
        fieldLine,
        `Donanma: ${troopList(npc.fleet)}.`,
        `Hazine: ${pool.gold} akçe, ${pool.wood} kereste, ${pool.stone} taş.`,
        `Başarı şansı %${Math.round(chance * 100)} idi.`,
      ])
    } else {
      g.army.casus = Math.max(0, g.army.casus - count)
      m.units = {}
      if (npc.rival) rivalState(empire, m.npcId).relation = Math.max(-100, rivalState(empire, m.npcId).relation - 10)
      report(false, `${count} casus ${npc.name} muhafızlarına yakalandı.`, [
        `Başarı şansı %${Math.round(chance * 100)} idi. Daha çok casus gönder ya da Elçiliği yükselt.`,
      ])
    }
    return
  }
  // TAKVİYE: aynı şehirden gelen ordu, hedefte süren savaşa sıradaki turda katılır.
  const host = liveBattleAt(empire, m.npcId)
  if (host && host !== m) {
    if (host.cityId !== m.cityId || !isAssault(host.kind) || !isAssault(m.kind)) {
      // Meydan dolu: bu ordu önceki savaş bitene kadar hedefin önünde bekler.
      m.arriveAt += ROUND_MS; m.returnAt += ROUND_MS
      return
    }
    const lb = host.battle!
    for (const [id, n] of Object.entries(m.units) as [UnitId, number][]) host.units[id] = (host.units[id] ?? 0) + n
    joinLive(lb, 'a', only(m.units, lb.stage === 'naval' ? WARSHIPS : RAID_UNITS))
    logEvent(g, `Takviye ${npc.name} önündeki savaşa katıldı: ${troopList(m.units)}.`, m.arriveAt)
    m.units = {}; m.resolved = true; m.returnAt = m.arriveAt
    return
  }
  // DENİZ SAVAŞI: başka adadaki hedefin donanması çıkarmayı engeller (abluka zaten batırdıysa yok).
  const overseas = npc.islandId !== city.islandId
  const blockadedByUs = (empire.missions ?? []).some(x => x.npcId === m.npcId && x.kind === 'blockade' && x.stationed)
  const fleet = blockadedByUs ? {} : npc.fleet
  const ships = only(m.units, WARSHIPS)
  const openNaval = () => {
    m.battle = openBattle('naval', 'Deniz savaşı', 'Filomuz', `${npc.name} donanması`, { troops: ships, ...multipliers(g, ships, 'deniz') },
      { troops: { ...fleet }, attackMul: npc.mul, defenseMul: npc.mul, fieldLevel: npc.field }, m.arriveAt)
  }
  if (m.kind === 'blockade') {
    if (!hasTroops(fleet)) return concludeBlockade(empire, m, city, m.arriveAt, [], [])
    return openNaval()
  }
  if (overseas && hasTroops(fleet)) {
    if (!hasTroops(ships)) {
      report(false, `${npc.name} önünde çıkarma yapılamadı.`, [
        `${npc.name} donanması (${troopList(fleet)}) kıyıyı tutuyor. Eskortsuz nakliye gemileri çıkarma yapamadı.`,
        'Savaş gemileriyle (kadırga, ateş gemisi...) eskort ederek tekrar dene.'])
      return
    }
    return openNaval()
  }
  openLand(m, g, npc, m.arriveAt, [], [])
}

/** Kara savaşını başlat (surlu garnizona karşı). */
function openLand(m: Mission, g: Game, npc: Target, at: number, lines: string[], done: StoredBattle[]) {
  const land = only(m.units, RAID_UNITS)
  m.battle = openBattle('land', 'Kara savaşı', 'Ordumuz', npc.name, { troops: land, ...multipliers(g, land, 'kara') },
    { troops: only(npc.garrison, [...UNIT_IDS]), attackMul: npc.mul, defenseMul: npc.mul, wall: npc.wallHp, fieldLevel: npc.field }, at, lines, done)
}

function concludeBlockade(empire: Empire, m: Mission, city: CityRecord, at: number, lines: string[], done: StoredBattle[]) {
  m.stationed = true
  onRivalRaided(empire, m.npcId, city, at)
  missionReport(empire, m, at, true, `${targetName(m.npcId)} limanı abluka altında!`, [...lines,
    'Liman kapandı: pazarı kapanır, donanması sana çıkamaz. Filo her saat liman haracı toplar; Seferler panelinden geri çağırabilirsin.'], done)
  concludeMission(m, at)
}

/** Süren savaşın bir turu (görevin ordusu saldırandır). */
function stepMission(empire: Empire, m: Mission) {
  const lb = m.battle!
  const city = empire.cities.find(c => c.id === m.cityId)
  if (!city) { concludeMission(m, lb.nextAt); return }
  const at = lb.nextAt
  const r = battleRound(lb.state)
  if (r) for (const [id, n] of Object.entries(r.attackerLoss) as [UnitId, number][]) {
    city.game.army[id] = Math.max(0, city.game.army[id] - n)
    m.units[id] = Math.max(0, (m.units[id] ?? 0) - n)
  }
  if (lb.state.over) finishMission(empire, m, at)
  else lb.nextAt += ROUND_MS
}

/**
 * GERİ ÇEKİL: süren savaştan ordu tur arasında çekilir (Ikariam'daki gibi).
 * Kayıplar kalır; sağ kalanlar ganimetsiz döner.
 */
export function retreatMission(source: Empire, missionId: string, now: number): { empire: Empire; error?: string } {
  const empire = advanceEmpire(source, now)
  const m = (empire.missions ?? []).find(x => x.id === missionId)
  if (!m?.battle) return { empire, error: 'Geri çekilecek bir savaş yok.' }
  m.battle.info.retreat = m.battle.state.round
  retreatBattle(m.battle.state)
  finishMission(empire, m, now)
  return { empire }
}

const roundLines = (rounds: BattleResult['rounds'], us = 'kaybımız', them = 'düşman kaybı') => rounds.map(r =>
  `Tur ${r.round}: ${us} ${troopList(r.attackerLoss)} · ${them} ${troopList(r.defenderLoss)}${r.wall ? ` · sur ${r.wall}` : ''} · moral ${r.moraleA}/${r.moraleD}.`)

/** Savaşın bir aşaması bitti: sonraki aşamayı aç ya da görevi sonuçlandır. */
function finishMission(empire: Empire, m: Mission, at: number) {
  const lb = m.battle!
  const city = empire.cities.find(c => c.id === m.cityId)!
  const g = city.game
  const res = endBattle(lb.state)
  // Hekimlerin kurtardıkları orduya döner.
  for (const [id, n] of Object.entries(res.healed) as [UnitId, number][]) {
    g.army[id] += n
    m.units[id] = (m.units[id] ?? 0) + n
  }
  m.units = Object.fromEntries((Object.entries(m.units) as [UnitId, number][]).filter(([, n]) => n > 0))
  const done = [...lb.done, lb.info]
  const lines = [...lb.lines]
  m.battle = undefined
  if (m.kind === 'piracy') return concludePiracy(empire, m, city, res, at, done)
  const npc = targetInfo(empire, m.npcId, at)!
  const finish = (success: boolean, title: string, more: string[]) => {
    missionReport(empire, m, at, success, title, [...lines, ...more], done)
    concludeMission(m, at)
  }
  if (lb.stage === 'naval') {
    lines.push('Deniz savaşı:', ...roundLines(res.rounds, 'batan gemimiz', 'batan düşman'),
      `Donanma kaybı: ${troopList(res.attackerLost)} · düşman kaybı: ${troopList(res.defenderLost)}.`, res.reason)
    if (m.kind === 'blockade') {
      if (res.winner !== 'attacker') return finish(false, `${npc.name} donanması ablukayı kırdı.`, ['Filo geri çekiliyor.'])
      return concludeBlockade(empire, m, city, at, lines, done)
    }
    if (res.winner !== 'attacker') return finish(false, `${npc.name} donanması filomuzu geri püskürttü.`, ['Ordu karaya çıkamadan döndü.'])
    lines.push('Kıyı temizlendi; ordu karaya çıktı.', 'Kara savaşı:')
    return openLand(m, g, npc, at + ROUND_MS, lines, done)
  }
  lines.push(...roundLines(res.rounds))
  lines.push(`Toplam kayıp: ${troopList(res.attackerLost)}${Object.keys(res.healed).length ? ` (hekimler ${troopList(res.healed)} kurtardı)` : ''}.`,
    `Düşman kaybı: ${troopList(res.defenderLost)}.`, res.reason)
  if (res.winner !== 'attacker') return finish(false, `${npc.name} önünde bozguna uğradık.`, [lb.info.retreat !== undefined ? 'Ordu ganimetsiz döndü.' : 'Garnizon direndi; ordu geri çekildi.'])
  // Kara askeri kişi başı 30 taşır; deniz aşırıda ganimeti nakliye ambarları taşır.
  const carry = Math.max(
    (Object.entries(only(m.units, RAID_UNITS)) as [UnitId, number][]).reduce((sum, [id, n]) => sum + UNITS[id].pop * n * 30, 0),
    (m.units.nakliye ?? 0) * UNITS.nakliye.cargo)
  const raw = npc.loot
  const bonus = 1 + g.buildings.korsan_kalesi * BUILDING_EFFECTS.korsanLoot
  const pool = { gold: Math.floor(raw.gold * bonus), wood: Math.floor(raw.wood * bonus), stone: Math.floor(raw.stone * bonus) }
  const total = pool.gold + pool.wood + pool.stone
  const take = total > 0 ? Math.min(1, carry / total) : 0
  m.loot = { gold: Math.floor(pool.gold * take), wood: Math.floor(pool.wood * take), stone: Math.floor(pool.stone * take) }
  const more = [`Ganimet (taşıma ${carry}): ${m.loot.gold} akçe, ${m.loot.wood} kereste, ${m.loot.stone} taş.`]
  if (npc.rival) {
    onRivalRaided(empire, m.npcId, city, at)
    if (m.kind === 'occupy') {
      more.push('Şehir işgal edildi: ordu orada kalır, her saat haraç toplar ve hükümdar sana saldıramaz. Seferler panelinden geri çağır.')
    } else more.push(`${rivalById(m.npcId)!.ruler} intikam yemini etti.`)
  } else {
    const next = Math.min(MAX_NPC_LEVEL, npc.level + 1)
    empire.npcs = { ...(empire.npcs ?? {}), [m.npcId]: { level: next, raidedAt: at } }
    more.push(`${npc.name} toparlanıp güçlenecek (seviye ${next}).`)
  }
  bump(empire, 'raids')
  finish(true, m.kind === 'occupy' ? `${npc.name} işgal edildi!` : `${npc.name} düştü! Ordu ganimetle dönüyor.`, more)
  if (m.kind === 'occupy') m.stationed = true
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
  if (underSiege(empire, from.id)) return { empire, error: 'Şehrin önünde savaş sürüyor: birlikler surlardan ayrılamaz.' }
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
  for (const branch of ['kara', 'deniz'] as const) {
    const add = (Object.entries(clean) as [UnitId, number][]).filter(([id]) => UNITS[id].branch === branch && inGarrison(id)).reduce((s, [id, n]) => s + UNITS[id].pop * n, 0)
    const room = garrisonLimit(to.game, branch) - garrisonUsed(to.game, branch)
    if (add > room) return { empire, error: `${to.name} garnizonu dolu: ${branch === 'kara' ? 'kara' : 'deniz'} birlikleri için ${Math.max(0, room)} yer var, ${add} gerekli.` }
  }
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
  // Garnizon sınırı: hedefte yer yoksa sığmayanlar geri döner.
  const garrisonRoom = { kara: garrisonLimit(to.game, 'kara') - garrisonUsed(to.game, 'kara'), deniz: garrisonLimit(to.game, 'deniz') - garrisonUsed(to.game, 'deniz') }
  const moved: Troops = {}, back: Troops = {}
  for (const [id, n] of Object.entries(m.units) as [UnitId, number][]) {
    if (id === 'nakliye') { back[id] = n; continue }
    const cap = inGarrison(id) ? Math.max(0, garrisonRoom[UNITS[id].branch]) : Infinity
    const fit = Math.min(n, Math.floor(room / UNITS[id].pop), Math.floor(cap / UNITS[id].pop))
    room -= fit * UNITS[id].pop
    if (inGarrison(id)) garrisonRoom[UNITS[id].branch] -= fit * UNITS[id].pop
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

/** Korsan Kalesi seferinin varışı: eskortla deniz savaşı başlar. */
function openPiracy(city: CityRecord, m: Mission) {
  const target = piracyTarget(m.npcId)
  if (!target) { m.resolved = true; return }
  m.battle = openBattle('naval', 'Deniz baskını', 'Korsan filomuz', target.name, { troops: { ...m.units }, ...multipliers(city.game, m.units, 'deniz') },
    { troops: { ...target.escort }, ...ESCORT_MUL, fieldLevel: target.level * 2 }, m.arriveAt)
}
function concludePiracy(empire: Empire, m: Mission, city: CityRecord, result: BattleResult, at: number, done: StoredBattle[]) {
  const g = city.game
  const target = piracyTarget(m.npcId)!
  m.units = only(m.units, WARSHIPS)
  const lines = [...roundLines(result.rounds, 'batan gemimiz', 'batan eskort'),
    `Kayıp: ${troopList(result.attackerLost)} · eskort kaybı: ${troopList(result.defenderLost)}.`, result.reason]
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
  missionReport(empire, m, at, success, success ? `${target.name} ele geçirildi!` : `${target.name} kaçtı.`, lines, done)
  concludeMission(m, at)
}

/** Dönüş: hayatta kalanlar zaten ordudadır; ganimet ambara iner. */
export function resolveReturn(empire: Empire, m: Mission) {
  const city = empire.cities.find(c => c.id === m.cityId)
  if (!city) return
  const g = city.game
  const cap = capacity(g)
  for (const r of ['gold', 'wood', 'stone'] as const) g.resources[r] = Math.min(cap, g.resources[r] + m.loot[r])
  // Savaşa katılıp birliklerini ana orduya devreden takviyenin dönecek kimsesi yoktur.
  if (!hasTroops(m.units) && m.kind !== 'spy') return
  if (m.kind !== 'spy' || (m.units.casus ?? 0) > 0) logEvent(g, m.kind === 'raid' ? 'Ordu şehre döndü.' : m.kind === 'piracy' ? 'Filo limana döndü.' : m.kind === 'deploy' ? 'Aktarılamayan birlikler döndü.' : 'Casuslar şehre döndü.', m.returnAt)
}

/**
 * advanceEmpire içinden: zamanı gelen olayları (varış, savaş turu, dönüş)
 * zaman sırasıyla işler; böylece takviye doğru tura katılır.
 */
export function advanceMissions(empire: Empire, now: number) {
  const gone = new Set<Mission>()
  const due = (m: Mission) => gone.has(m) ? Infinity : m.battle ? m.battle.nextAt : !m.resolved ? m.arriveAt : m.stationed ? Infinity : m.returnAt
  for (let guard = 0; guard < 20_000; guard++) {
    let next: Mission | undefined, at = Infinity
    for (const m of empire.missions ?? []) { const d = due(m); if (d <= now && d < at) { at = d; next = m } }
    if (!next) break
    if (next.battle) stepMission(empire, next)
    else if (!next.resolved) resolveArrival(empire, next)
    else { resolveReturn(empire, next); gone.add(next) }
  }
  empire.missions = (empire.missions ?? []).filter(m => !gone.has(m))
}

/** Kayıttan gelen görev/rapor/NPC alanlarını doğrular (bozuksa atar). */
export function parseMissionState(obj: Record<string, unknown>, cityIds: Set<string>) {
  const finite = (n: unknown) => typeof n === 'number' && Number.isFinite(n) && n >= 0
  const missions = Array.isArray(obj.missions) ? (obj.missions as Mission[]) : []
  const threats = Array.isArray(obj.threats) ? (obj.threats as Threat[]) : []
  const nextThreat = obj.nextThreat && typeof obj.nextThreat === 'object' ? (obj.nextThreat as Record<string, number>) : {}
  const troopsOk = (t: unknown) => !!t && typeof t === 'object' &&
    (Object.entries(t as object) as [string, number][]).every(([id, n]) => UNIT_IDS.includes(id as UnitId) && Number.isInteger(n) && n >= 0 && n < 1e6)
  // Süren savaş: ordular, sur, moral ve sıradaki tur zamanı.
  const liveOk = (b: unknown) => {
    if (b === undefined) return true
    const lb = b as LiveBattle
    return !!lb && (lb.stage === 'naval' || lb.stage === 'land') && finite(lb.nextAt) && !!lb.state && !!lb.info &&
      troopsOk(lb.state.a?.troops) && troopsOk(lb.state.d?.troops) && finite(lb.state.wall) && Number.isInteger(lb.state.round) &&
      lb.state.round >= 0 && lb.state.round <= 50 && Array.isArray(lb.state.rounds) && Array.isArray(lb.lines) && Array.isArray(lb.done)
  }
  if (threats.length > 8) throw new Error('Baskın kayıtları okunamadı.')
  for (const t of threats) {
    if (!t || typeof t.id !== 'string' || !cityIds.has(t.cityId) || !targetIsland(t.npcId) || !Number.isInteger(t.level) || t.level < 1 ||
        t.level > 100 || !finite(t.arriveAt) || !troopsOk(t.troops) || !troopsOk(t.fleet) || !liveOk(t.battle) ||
        (t.spare !== undefined && !troopsOk(t.spare)) || (t.ownLost !== undefined && !troopsOk(t.ownLost))) throw new Error('Baskın kayıtları okunamadı.')
  }
  for (const [id, at] of Object.entries(nextThreat)) if (!cityIds.has(id) || !finite(at)) throw new Error('Baskın kayıtları okunamadı.')
  const reports = Array.isArray(obj.reports) ? (obj.reports as Report[]) : []
  const npcs = obj.npcs && typeof obj.npcs === 'object' ? (obj.npcs as Record<string, NpcState>) : {}
  if (missions.length > 40 || reports.length > 30) throw new Error('Sefer kayıtları okunamadı.')
  for (const m of missions) {
    if (!m || typeof m.id !== 'string' || !['raid', 'spy', 'piracy', 'deploy', 'occupy', 'blockade'].includes(m.kind) || !cityIds.has(m.cityId) ||
        !(m.kind === 'piracy' ? piracyTarget(m.npcId) : m.kind === 'deploy' ? cityIds.has(m.npcId) : targetIsland(m.npcId)) ||
        (m.stationed !== undefined && typeof m.stationed !== 'boolean') ||
        !finite(m.departAt) || !finite(m.arriveAt) || !finite(m.returnAt) || typeof m.resolved !== 'boolean' ||
        !m.units || typeof m.units !== 'object' ||
        !(Object.entries(m.units) as [string, number][]).every(([id, n]) => UNIT_IDS.includes(id as UnitId) && Number.isInteger(n) && n >= 0) ||
        !m.loot || !finite(m.loot.gold) || !finite(m.loot.wood) || !finite(m.loot.stone) || !liveOk(m.battle)) throw new Error('Sefer kayıtları okunamadı.')
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
export type Threat = {
  id: string; cityId: string; npcId: string; level: number; arriveAt: number; troops: Troops; fleet: Troops
  /** Kapıda süren savaş. */
  battle?: LiveBattle
  /** Savaştaki sur muhafızı ve müttefik askerleri (kayıpları şehrin ordusundan düşmez). */
  spare?: Troops
  /** Şehrin ordusundan düşen kayıplar (hekim kurtarması için). */
  ownLost?: Troops
}
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

/**
 * Baskın kapıya dayandı: önce limandaki savaş gemileri korsan filosunu
 * karşılar, yoksa korsanlar doğrudan sura ve kara birliklerine çarpar.
 * Savaş tur tur sürer; turlar arasında şehirde boşa çıkan birlikler
 * (biten eğitim, dönen sefer) savunmaya katılır.
 */
function openDefense(empire: Empire, t: Threat): boolean {
  const city = empire.cities.find(c => c.id === t.cityId)
  if (!city) return false
  const g = city.game
  const ships = only(availableUnits(empire, city.id), WARSHIPS)
  t.spare = {}; t.ownLost = {}
  if (hasTroops(ships) && hasTroops(t.fleet)) {
    const m = multipliers(g, ships, 'deniz'), shield = 1 + miracle(g, 'kalkan') * 0.1, mul = 1 + t.level * 0.03
    t.battle = openBattle('naval', 'Deniz savaşı', targetName(t.npcId), 'Donanmamız', { troops: { ...t.fleet }, attackMul: mul, defenseMul: mul },
      { troops: ships, attackMul: m.attackMul * shield, defenseMul: m.defenseMul * shield, fieldLevel: g.buildings.divan }, t.arriveAt)
  } else openLandDefense(empire, t, t.arriveAt, [], [])
  return true
}
/** Kara savaşı: sur muhafızları + şehrin kara birlikleri (+ ittifak yardımı), sur önce hasar emer. */
function openLandDefense(empire: Empire, t: Threat, at: number, lines: string[], done: StoredBattle[]) {
  const city = empire.cities.find(c => c.id === t.cityId)!
  const g = city.game
  const land = only(availableUnits(empire, city.id), RAID_UNITS)
  const m = multipliers(g, land, 'kara'), shield = 1 + miracle(g, 'kalkan') * 0.1, mul = 1 + t.level * 0.03
  // İttifak üyeleri yardıma asker gönderir; muhafızlar ve müttefikler (kayıpları onlarındır) önce düşer.
  const help = allyHelp(empire, at)
  if (hasTroops(help)) lines.push(`İttifak yardımı: ${troopList(help)}.`)
  const spare: Troops = { ...help }
  spare.mizrakci = (spare.mizrakci ?? 0) + cityGuards(g)
  const defenders: Troops = { ...land }
  for (const [id, n] of Object.entries(spare) as [UnitId, number][]) defenders[id] = (defenders[id] ?? 0) + n
  t.spare = spare; t.ownLost = {}
  t.battle = openBattle('land', 'Şehir savunması', targetName(t.npcId), 'Şehrimiz', { troops: { ...t.troops }, attackMul: mul, defenseMul: mul },
    { troops: defenders, attackMul: m.attackMul * shield, defenseMul: m.defenseMul * shield, wall: cityWallHp(g), fieldLevel: g.buildings.divan,
      healPerDoctor: m.healPerDoctor, moraleMul: m.moraleMul }, at, lines, done)
}
/** Savunma savaşının bir turu; savaş bittiyse true. */
function stepThreat(empire: Empire, t: Threat): boolean {
  const lb = t.battle!
  const city = empire.cities.find(c => c.id === t.cityId)
  if (!city) return true
  const g = city.game, st = lb.state, at = lb.nextAt
  const spare = t.spare ?? {}, ownLost = t.ownLost ?? {}
  // Takviye: şehirde boşta olup henüz savaşmayan birlikler sıradaki tura katılır.
  const free = availableUnits(empire, city.id)
  const diff: Troops = {}
  for (const id of lb.stage === 'naval' ? WARSHIPS : RAID_UNITS) {
    const d = free[id] - Math.max(0, (st.d.troops[id] ?? 0) - (spare[id] ?? 0))
    if (d) diff[id] = d
  }
  joinLive(lb, 'd', diff)
  const r = battleRound(st)
  if (r) for (const [id, n] of Object.entries(r.defenderLoss) as [UnitId, number][]) {
    const fromSpare = Math.min(n, spare[id] ?? 0)
    spare[id] = (spare[id] ?? 0) - fromSpare
    const own = n - fromSpare
    if (own > 0) { g.army[id] = Math.max(0, g.army[id] - own); ownLost[id] = (ownLost[id] ?? 0) + own }
  }
  t.spare = spare; t.ownLost = ownLost
  if (!st.over) { lb.nextAt += ROUND_MS; return false }
  return finishDefense(empire, t, at)
}
function finishDefense(empire: Empire, t: Threat, at: number): boolean {
  const lb = t.battle!
  const city = empire.cities.find(c => c.id === t.cityId)!
  const g = city.game
  const res = endBattle(lb.state)
  const lost: Troops = { ...(t.ownLost ?? {}) }
  // Hekimlerin kurtardığı şehir askerleri orduya döner.
  for (const [id, n] of Object.entries(res.healedD) as [UnitId, number][]) {
    const back = Math.min(n, lost[id] ?? 0)
    if (back > 0) { g.army[id] += back; lost[id] = (lost[id] ?? 0) - back }
  }
  const done = [...lb.done, lb.info]
  const lines = [...lb.lines]
  t.battle = undefined
  const name = targetName(t.npcId)
  const rival = !!rivalById(t.npcId)
  const report = (success: boolean, title: string) => {
    empire.reports = [{ id: `r-${t.id}`, time: at, kind: 'defense' as const, cityId: city.id, npcId: t.npcId, success, title, lines, battles: done },
      ...(empire.reports ?? [])].slice(0, 30)
    logEvent(g, title, at)
  }
  const bounty = () => {
    const n = Math.round((Object.entries(res.attackerLost) as [UnitId, number][]).reduce((s, [id, k]) => s + UNITS[id].pop * k, 0) * 8)
    g.resources.gold = Math.min(capacity(g), g.resources.gold + n)
    return n
  }
  if (lb.stage === 'naval') {
    lines.push('Deniz savaşı:', ...roundLines(res.rounds, 'batan korsan', 'batan gemimiz'),
      `Donanma kaybı: ${troopList(lost)} · korsan kaybı: ${troopList(res.attackerLost)}.`, res.reason)
    if (res.winner === 'defender') {
      lines.push(`Korsanlar karaya çıkamadan kaçtı. Ödül: ${bounty()} akçe.`)
      report(true, `Donanmamız ${name} korsanlarını denizde durdurdu.`)
      return true
    }
    lines.push('Korsan filosu kıyıya ulaştı.')
    openLandDefense(empire, t, at + ROUND_MS, lines, done)
    return false
  }
  lines.push(...roundLines(res.rounds, 'korsan kaybı', 'kaybımız'),
    `Şehrin kaybı: ${troopList(lost)} (sur muhafızları: ${cityGuards(g)}).`, `Korsan kaybı: ${troopList(res.attackerLost)}.`, res.reason)
  if (res.winner === 'defender') {
    lines.push(`Baskın püskürtüldü. Ödül: ${bounty()} akçe.`)
    report(true, rival ? `${name} ordusu surlarda durduruldu!` : `${name} korsanları surlarda durduruldu!`)
    return true
  }
  // Yağma: sağ kalan korsan kişi başı 30 taşır; korunan kısım dokunulmaz.
  let carry = (Object.entries(res.attackerLeft) as [UnitId, number][]).reduce((s, [id, n]) => s + UNITS[id].pop * n * 30, 0)
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
  report(false, rival ? `${name} ordusu şehri yağmaladı.` : `${name} korsanları şehri yağmaladı.`)
  return true
}

/** advanceEmpire içinden: baskınları zamanlar, savaşlarını tur tur yürütür. */
export function advanceThreats(empire: Empire, now: number) {
  const next = { ...(empire.nextThreat ?? {}) }
  const threats: Threat[] = []
  for (const t of [...(empire.threats ?? [])].sort((a, b) => a.arriveAt - b.arriveAt)) {
    let finished = false, end = t.arriveAt
    for (let guard = 0; guard < 100 && !finished; guard++) {
      const due = t.battle ? t.battle.nextAt : t.arriveAt
      if (now < due) break
      end = due
      if (!t.battle) finished = !openDefense(empire, t)
      else finished = stepThreat(empire, t)
    }
    if (!finished) { threats.push(t); continue }
    // Bir sonraki baskın 3-5 saat sonra; uzun yokluktan sonra en fazla bir baskın.
    next[t.cityId] = Math.max(end, now) + THREAT_INTERVAL_MS + Math.round(roll(t.id) * 2 * 3600_000)
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
