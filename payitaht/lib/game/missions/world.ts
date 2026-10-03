import { lootMul } from '../events'
import { UNITS, UNIT_IDS, power, travelFactor, cargoCapacity, type Army, type Game, type UnitId } from '../engine'
import { joinBattle, startBattle, type BattleJoin, type BattleSide, type BattleState, type Troops } from '../battle'
import { advanceEmpire, type CityRecord, type Empire } from '../empire'
import { ISLANDS, type IslandId } from '../islands'
import { rivalAttackMul, rivalById, rivalFleet, rivalGarrison, rivalLevel, rivalLoot, rivalWallHp, STYLE_NAMES } from '../rivals'

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
export const hasTroops = (t: Troops) => Object.values(t).some(n => (n ?? 0) > 0)

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
export const ESCORT_MUL = { attackMul: 0.8, defenseMul: 0.5 }

export type NpcState = { level: number; raidedAt: number }
export type Loot = { gold: number; wood: number; stone: number }
export type Mission = {
  /** raid: yerleşime sefer · spy: casusluk · piracy: Korsan Kalesi seferi (npcId = hedef). */
  id: string; kind: 'raid' | 'spy' | 'piracy' | 'deploy' | 'occupy' | 'blockade' | 'support'; cityId: string; npcId: string
  /** İşgal ya da ablukada bekleyen birlikler (geri çağrılana kadar dönmez). */
  stationed?: boolean
  units: Partial<Record<UnitId, number>>
  departAt: number; arriveAt: number; returnAt: number
  resolved: boolean; loot: Loot
  /** Varıştan sonra süren savaş (bitince rapor yazılır, dönüş başlar). */
  battle?: LiveBattle
  /** Hedefte konuşlu casusların yürüttüğü görev. */
  spyTask?: { type: SpyType; at: number }
  /** Müttefik şehirdeki destek birliğinin sıradaki nöbet kontrolü. */
  supportAt?: number
}

/**
 * CASUS GÖREVLERİ (Ikariam'daki gibi): casuslar hedefe SIZAR ve orada kalır;
 * oyuncu her seferinde bir görev verir. Her görevin süresi ve zorluğu vardır;
 * başarısız görevde bir casus yakalanır. Casuslar geri çağrılana kadar kalır.
 */
export type SpyType = 'hazine' | 'garnizon' | 'sur' | 'donanma' | 'hareket' | 'arastirma'
export const SPY_TYPES: Record<SpyType, { name: string; description: string; minutes: number; bonus: number }> = {
  hazine: { name: 'Hazineyi gözetle', description: 'Ambardaki yağmalanabilir akçe, kereste ve taş.', minutes: 1, bonus: 0.15 },
  garnizon: { name: 'Garnizonu say', description: 'Şehirdeki birlikler ve savaş meydanı.', minutes: 2, bonus: 0 },
  sur: { name: 'Surları incele', description: 'Sur seviyesi, sur canı ve toplam savunma.', minutes: 1.5, bonus: 0.05 },
  donanma: { name: 'Limanı gözetle', description: 'Limandaki savaş gemileri.', minutes: 2, bonus: 0 },
  hareket: { name: 'Asker hareketleri', description: 'Sana doğru yola çıkan ordular ve niyetleri.', minutes: 3, bonus: -0.1 },
  arastirma: { name: 'Araştırmaları incele', description: 'Hükümdarın bildiği araştırmalar (yalnız hükümdar şehirleri).', minutes: 2.5, bonus: -0.05 },
}
export const SPY_TYPE_IDS = Object.keys(SPY_TYPES) as SpyType[]
export const MAX_REPORTS = 30
/** Kayıt denetiminin üst sınırları: oyunun gerçekten üretebileceğinin rahatça üstünde. */
export const MAX_THREATS = 64
export const MAX_MISSIONS = 200
/** Rapor listesini sınırda tutar: arşivlenenler kalır, en eski arşivlenmemişler düşer. */
export function trimReports(list: Report[]): Report[] {
  let loose = MAX_REPORTS - list.filter(r => r.kept).length
  return list.filter(r => r.kept || loose-- > 0)
}
/** Raporu sil. */
export function deleteReport(source: Empire, id: string, now: number): { empire: Empire; error?: string } {
  const empire = advanceEmpire(source, now)
  if (!(empire.reports ?? []).some(r => r.id === id)) return { empire, error: 'Rapor bulunamadı.' }
  empire.reports = (empire.reports ?? []).filter(r => r.id !== id)
  return { empire }
}
/** Arşivlenmemiş bütün raporları sil (bu şehrin). */
export function clearReports(source: Empire, cityId: string, now: number): { empire: Empire; error?: string } {
  const empire = advanceEmpire(source, now)
  empire.reports = (empire.reports ?? []).filter(r => r.kept || r.cityId !== cityId)
  return { empire }
}
/** Raporu arşivle ya da arşivden çıkar (en fazla 10 arşiv). */
export function keepReport(source: Empire, id: string, now: number): { empire: Empire; error?: string } {
  const empire = advanceEmpire(source, now)
  const r = (empire.reports ?? []).find(x => x.id === id)
  if (!r) return { empire, error: 'Rapor bulunamadı.' }
  if (!r.kept && (empire.reports ?? []).filter(x => x.kept).length >= 10) return { empire, error: 'Arşiv dolu (10 rapor). Önce birini arşivden çıkar.' }
  r.kept = !r.kept
  if (!r.kept) delete r.kept
  return { empire }
}
export type Report = {
  id: string; time: number; kind: Mission['kind'] | 'defense'; cityId: string; npcId: string
  success: boolean; title: string; lines: string[]
  /** Arşivlenmiş rapor: yeni raporlar gelince silinmez. */
  kept?: boolean
  /** Savaşların girdileri: rapor açılınca deterministik motorla tur tur yeniden kurulur. */
  battles?: StoredBattle[]
  /** Casus görevinin türü (istihbarat raporu). */
  intel?: SpyType
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
export const cloneSide = (x: BattleSide): BattleSide => ({ ...x, troops: { ...x.troops } })
export function openBattle(stage: LiveBattle['stage'], title: string, attacker: string, defender: string, a: BattleSide, d: BattleSide,
  at: number, lines: string[] = [], done: StoredBattle[] = []): LiveBattle {
  return { stage, info: { title, attacker, defender, a: cloneSide(a), d: cloneSide(d) }, state: startBattle(a, d), nextAt: at, lines, done }
}
/** Sıradaki tura takviye (eksi sayı: ayrılan birlik); rapor için kaydedilir. */
export function joinLive(lb: LiveBattle, side: 'a' | 'd', troops: Troops) {
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
  const max = 500 * state.level * lootMul(now)
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
  const out = Object.fromEntries(UNIT_IDS.map(id => [id, Math.max(0, city.game.army[id] - (busy[id] ?? 0))])) as Army
  // Ikariam gibi ticaret filosu imparatorluğun ortak havuzudur: her şehir limandaki boş gemileri kullanır.
  out.nakliye = idleMerchants(empire)
  return out
}

/* ------------------------------------------------------- TİCARET FİLOSU */

/** Bir nakliye gemisinin taşıdığı mal (Pusula ve Yükleme araştırmalarıyla). */
export function shipCargo(g: Game) { return cargoCapacity({ ...g, army: { ...g.army, nakliye: 1 } }) }
/** Nakliyenin bağladığı gemi sayısı (eski kayıtlarda yükten hesaplanır). */
export function shipmentShips(empire: Empire, s: Empire['shipments'][number]) {
  if (s.ships) return s.ships
  const from = empire.cities.find(c => c.id === s.from)
  return from ? Math.ceil(s.amount / Math.max(1, shipCargo(from.game))) : 0
}
/** İmparatorluğun bütün ticaret gemileri. */
export function totalMerchants(empire: Empire) { return empire.cities.reduce((n, c) => n + c.game.army.nakliye, 0) }
/** Limanda boş bekleyen gemiler: seferdekiler ve yük taşıyanlar düşülür. */
export function idleMerchants(empire: Empire) {
  const sailing = (empire.missions ?? []).reduce((n, m) => n + (m.units.nakliye ?? 0), 0)
  const loaded = empire.shipments.reduce((n, s) => n + shipmentShips(empire, s), 0)
  return Math.max(0, totalMerchants(empire) - sailing - loaded)
}
/** Sıradaki geminin fiyatı: her gemiyle artar (Ikariam'daki gibi). */
export function merchantShipPrice(total: number) { return Math.round(480 * Math.pow(1.15, total) / 10) * 10 }

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
  hezarfen: 0.8, lagari: 1.2, zenberek_gemisi: 1.05, dalgic_gemisi: 1.15, buharli_koc: 0.95, balon_gemisi: 1.3,
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
  return (empire.missions ?? []).filter(m => m.cityId === cityId && !(m.stationed && (m.kind === 'spy' || m.kind === 'support'))).length +
    empire.shipments.filter(s => s.from === cityId).length
}
