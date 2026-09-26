import { parseProfile, type Profile } from './profile'
import {
  advance, actionPoints, capacity, logEvent, cargoCapacity, initialGame, parseSave, tradeCapacity, travelFactor, loadingSpeed,
  LUXURY_IDS, LUXURY_NAMES, RESOURCE_IDS, RESOURCE_NAMES, type Game, type Luxury, type Resource,
} from './engine'

/** Nakliyeyle taşınabilen her mal: ana kaynaklar + lüks kaynaklar. */
export type Cargo = Resource | Luxury
export const CARGO_IDS: readonly Cargo[] = [...RESOURCE_IDS, ...LUXURY_IDS]
export const CARGO_NAMES: Record<Cargo, string> = { ...RESOURCE_NAMES, ...LUXURY_NAMES }
const isLuxury = (c: Cargo): c is Luxury => (LUXURY_IDS as readonly string[]).includes(c)
function stock(g: Game, c: Cargo) { return isLuxury(c) ? g.luxury[c] : g.resources[c] }
function addStock(g: Game, c: Cargo, n: number) { if (isLuxury(c)) g.luxury[c] += n; else g.resources[c] += n }

/**
 * First playable multi-city foundation. Each city owns a complete, independent
 * Game state; the existing city engine remains the single source of truth for
 * production, buildings, troops, research and plot positions.
 */
export { ISLANDS, type IslandId } from './islands'
import { ISLANDS, type IslandId } from './islands'
import { ensureDaily, parseDaily, type Daily } from './daily'
import { advanceWorld, parseWorld, type World } from './rivals'
import { advanceMissions, advanceThreats, committedUnits, parseMissionState, type Mission, type NpcState, type Report, type Threat } from './expeditions'
export const COLONY_COST = { gold: 900, wood: 1200, stone: 450 } as const
const COLONY_SHIPS = 3
export const MAX_CITIES = 12
const CITY_NAMES = ['Yeni Sahil', 'Akçaşehir', 'Yeni Liman', 'Yelkenhisar', 'Kervansaray', 'Yeni Hisar', 'Mavikent']

export type CityRecord = { id: string; islandId: IslandId; name: string; game: Game }
export type Shipment = {
  id: string; from: string; to: string; resource: Cargo
  amount: number; eta: number
}
export type Empire = {
  version: 1; activeCityId: string; cities: CityRecord[]
  shipments: Shipment[]; nextId: number
  /** Adadaki yerleşimlere giden casus/sefer görevleri. */
  missions?: Mission[]
  /** Savaş ve casusluk raporları (en yeni başta, en fazla 30). */
  reports?: Report[]
  /** Bağımsız yerleşimlerin seviyesi ve son yağma zamanı. */
  npcs?: Record<string, NpcState>
  /** Şehirlere yaklaşan korsan baskınları. */
  threats?: Threat[]
  /** Her şehrin bir sonraki baskın zamanı (acemi koruması bitince). */
  nextThreat?: Record<string, number>
  /** İmparatorluk sayaçları (günlük görevler). */
  stats?: { raids: number; spies: number; piracy: number; shipments: number }
  /** Günlük görevler ve giriş serisi. */
  daily?: Daily
  /** Yapay rakip hükümdarlar, ittifak, mesajlar, pazar. */
  world?: World
  /** Hükümdar profili: ad, arma, düstur. */
  profile?: Profile
}

export function initialEmpire(now: number): Empire {
  return {
    version: 1, activeCityId: 'city-1',
    cities: [{ id: 'city-1', islandId: 'sahil', name: 'Sahilhisar', game: initialGame(now) }],
    shipments: [], nextId: 2, missions: [], reports: [], npcs: {}, threats: [], nextThreat: {},
  }
}
export function activeCity(empire: Empire): CityRecord {
  return empire.cities.find(city => city.id === empire.activeCityId) ?? empire.cities[0]
}
export function islandOf(city: CityRecord) {
  return ISLANDS.find(island => island.id === city.islandId)!
}
const finite = (n: unknown) => typeof n === 'number' && Number.isFinite(n) && n >= 0

/** Legacy single-city saves become an empire without modifying the saved city. */
export function parseEmpire(raw: string): Empire {
  const parsed: unknown = JSON.parse(raw)
  if (!parsed || typeof parsed !== 'object') throw new Error('Kayıt okunamadı.')
  if (!('version' in parsed) || parsed.version !== 1 || !('cities' in parsed)) {
    const legacy = parseSave(raw)
    return { ...initialEmpire(legacy.updatedAt), cities: [
      { id: 'city-1', islandId: 'sahil', name: 'Sahilhisar', game: legacy },
    ] }
  }
  const obj = parsed as Empire
  if (!Array.isArray(obj.cities) || obj.cities.length < 1 || obj.cities.length > MAX_CITIES ||
      !Number.isSafeInteger(obj.nextId) || obj.nextId < 2 ||
      !Array.isArray(obj.shipments) || obj.shipments.length > MAX_CITIES ||
      typeof obj.activeCityId !== 'string') throw new Error('Şehir kayıtları okunamadı.')
  const ids = new Set<string>(), islandIds = new Set<string>()
  const cities: CityRecord[] = obj.cities.map(city => {
    if (!city || typeof city.id !== 'string' || !/^city-[1-9]\d*$/.test(city.id) ||
        ids.has(city.id) || islandIds.has(city.islandId) ||
        !ISLANDS.some(island => island.id === city.islandId) ||
        typeof city.name !== 'string' || city.name.length < 1 || city.name.length > 40 ||
        !city.game || typeof city.game !== 'object') throw new Error('Şehir kayıtları okunamadı.')
    ids.add(city.id); islandIds.add(city.islandId)
    // Run the existing save migration and validations for EVERY city.
    const game = parseSave(JSON.stringify(city.game))
    // Madenin kaynağı adadan gelir (eski kayıtlarda alan yoktu).
    const island = ISLANDS.find(island => island.id === city.islandId)!
    game.mine.specialty = island.luxury
    game.temple.wonder = island.wonder
    return { ...city, game }
  })
  if (!ids.has(obj.activeCityId) || !cities.some(city => city.id === 'city-1' && city.islandId === 'sahil')) {
    throw new Error('Başkent kaydı okunamadı.')
  }
  const shipments: Shipment[] = obj.shipments.map(s => {
    if (!s || typeof s.id !== 'string' || s.id.length > 80 || !ids.has(s.from) || !ids.has(s.to) ||
        s.from === s.to || !CARGO_IDS.includes(s.resource) ||
        !Number.isInteger(s.amount) || s.amount <= 0 || s.amount > 100_000 ||
        !finite(s.eta)) throw new Error('Nakliye kaydı okunamadı.')
    return { ...s }
  })
  if (new Set(shipments.map(s => s.from)).size !== shipments.length ||
      new Set(shipments.map(s => s.id)).size !== shipments.length) throw new Error('Nakliye kaydı okunamadı.')
  const extra = parseMissionState(obj as unknown as Record<string, unknown>, ids)
  const st = obj.stats
  if (st !== undefined && !(['raids', 'spies', 'piracy', 'shipments'] as const).every(k => finite(st?.[k]))) throw new Error('Sayaç kaydı okunamadı.')
  const daily = parseDaily(obj.daily)
  const worldState = parseWorld(obj.world, ids)
  const profile = parseProfile(obj.profile)
  return {
    version: 1, activeCityId: obj.activeCityId, cities, shipments, nextId: obj.nextId, ...extra,
    ...(st ? { stats: { ...st } } : {}), ...(daily ? { daily } : {}), ...(worldState ? { world: worldState } : {}),
    ...(profile ? { profile } : {}),
  }
}

/** İmparatorluk sayacını artırır. */
export function bump(empire: Empire, key: 'raids' | 'spies' | 'piracy' | 'shipments') {
  empire.stats = { raids: 0, spies: 0, piracy: 0, shipments: 0, ...empire.stats }
  empire.stats[key] += 1
}

/** Şehrin adını değiştirir. */
export function renameCity(source: Empire, cityId: string, name: string, now: number): { empire: Empire; error?: string } {
  const empire = advanceEmpire(source, now)
  const city = empire.cities.find(c => c.id === cityId)
  const clean = name.replace(/\s+/g, ' ').trim()
  if (!city) return { empire, error: 'Şehir bulunamadı.' }
  if (clean.length < 2 || clean.length > 24) return { empire, error: 'Şehir adı 2-24 harf olmalı.' }
  if (empire.cities.some(c => c.id !== cityId && c.name.toLocaleLowerCase('tr') === clean.toLocaleLowerCase('tr'))) return { empire, error: 'Bu adda bir şehrin zaten var.' }
  logEvent(city.game, `${city.name} artık ${clean} adıyla anılıyor.`, now)
  city.name = clean
  return { empire }
}

export function advanceEmpire(source: Empire, now: number): Empire {
  const empire = structuredClone(source)
  // Yolsuzluk ve Saray/Valilik kuralı için her şehir imparatorluktaki yerini bilir.
  for (const city of empire.cities) {
    city.game.empire = { cities: empire.cities.length, capital: city.id === 'city-1' }
    // Cami'nin mucizesi şehrin adasındaki harikadan gelir.
    city.game.temple.wonder = islandOf(city).wonder
  }
  for (const city of empire.cities) city.game = advance(city.game, now)
  const pending: Shipment[] = []
  for (const shipment of empire.shipments) {
    if (now < shipment.eta) { pending.push(shipment); continue }
    const destination = empire.cities.find(city => city.id === shipment.to)!
    const free = Math.max(0, Math.floor(capacity(destination.game) - stock(destination.game, shipment.resource)))
    const delivered = Math.min(shipment.amount, free)
    addStock(destination.game, shipment.resource, delivered)
    const remainder = shipment.amount - delivered
    if (remainder > 0) pending.push({ ...shipment, amount: remainder })
    // Cargo waits at the receiving harbour if its warehouse is full. Nothing
    // is silently destroyed and ships remain reserved until fully unloaded.
  }
  empire.shipments = pending
  advanceMissions(empire, now)
  advanceThreats(empire, now)
  ensureDaily(empire, now)
  advanceWorld(empire, now)
  return empire
}

/** Yeni koloni için gereken Saray seviyesi (Genişleme araştırması bir seviye düşürür). */
export function colonyPalaceLevel(empire: Empire) {
  return Math.max(1, empire.cities.length - (empire.cities[0].game.research.includes('genisleme') ? 1 : 0))
}

export function foundColony(source: Empire, islandId: IslandId, now: number):
  { empire: Empire; error?: string } {
  const empire = advanceEmpire(source, now)
  const island = ISLANDS.find(i => i.id === islandId)
  if (!island) return { empire, error: 'Bilinmeyen ada.' }
  if (empire.cities.some(city => city.islandId === islandId)) {
    return { empire, error: 'Bu adada zaten bir şehrin var.' }
  }
  if (empire.cities.length >= MAX_CITIES) return { empire, error: 'Şehir sınırına ulaştın.' }
  const capital = empire.cities[0].game
  const palaceNeed = colonyPalaceLevel(empire)
  if (capital.buildings.saray < palaceNeed) {
    return { empire, error: `Yeni bir şehir için Saray en az ${palaceNeed}. seviye olmalı.` }
  }
  if (capital.buildings.liman < 1 || capital.army.nakliye < COLONY_SHIPS) {
    return { empire, error: 'Başkentte Ticaret Limanı ve en az 3 nakliye gemisi gerekli.' }
  }
  if (empire.shipments.some(s => s.from === empire.cities[0].id)) {
    return { empire, error: 'Başkent gemileri nakliyede; dönüşlerini bekle.' }
  }
  for (const [resource, amount] of Object.entries(COLONY_COST) as [keyof typeof COLONY_COST, number][]) {
    if (capital.resources[resource] < amount) {
      const resourceName = { gold: 'akçe', wood: 'kereste', stone: 'taş' }[resource]
      return { empire, error: `Koloni için ${amount} ${resourceName} gerekli.` }
    }
  }
  for (const [resource, amount] of Object.entries(COLONY_COST) as [keyof typeof COLONY_COST, number][]) {
    capital.resources[resource] -= amount
  }
  const city = initialGame(now)
  // A colony is a fully playable, independent city. It starts with a compact
  // settlement and provisions, not with copies of the capital's resources.
  city.resources = { gold: 250, wood: 250, stone: 160, knowledge: 0 }
  city.research = [] // New city's research and workforce are genuinely local.
  city.army.nakliye = 0
  city.mine = { specialty: island.luxury, level: 1, wood: 0, miners: 0 }
  city.temple = { ...city.temple, wonder: island.wonder }
  city.log = [{ text: `${island.name} üzerinde yeni bir yerleşim kuruldu.`, time: now }]
  const id = `city-${empire.nextId++}`
  const name = CITY_NAMES[empire.cities.length - 1] ?? `Yeni Şehir ${empire.cities.length + 1}`
  empire.cities.push({ id, islandId, name, game: city })
  empire.activeCityId = id
  return { empire }
}

export function shipResources(source: Empire, to: string, resource: Cargo, amount: number, now: number):
  { empire: Empire; error?: string } {
  const empire = advanceEmpire(source, now)
  const from = activeCity(empire)
  const destination = empire.cities.find(city => city.id === to)
  if (!destination || from.id === to) return { empire, error: 'Geçerli bir hedef şehir seç.' }
  if (!CARGO_IDS.includes(resource) ||
      !Number.isSafeInteger(amount) || amount <= 0) return { empire, error: 'Geçersiz kaynak miktarı.' }
  if (from.game.buildings.liman < 1) return { empire, error: 'Önce bu şehirde Ticaret Limanı kur.' }
  if (empire.shipments.some(s => s.from === from.id)) return { empire, error: 'Bu şehrin nakliye gemileri seferde.' }
  if ((empire.missions ?? []).filter(m => m.cityId === from.id).length + 1 > actionPoints(from.game)) {
    return { empire, error: `Hamle puanı yok (${actionPoints(from.game)}). Bir görevin dönmesini bekle.` }
  }
  // Seferdeki (asker taşıyan) nakliye gemileri mal taşıyamaz.
  const ships = Math.max(0, from.game.army.nakliye - (committedUnits(empire, from.id).nakliye ?? 0))
  const limit = Math.min(cargoCapacity({ ...from.game, army: { ...from.game.army, nakliye: ships } }), tradeCapacity(from.game))
  if (limit <= 0) return { empire, error: 'Bu şehirde nakliye gemisi gerekli.' }
  if (amount > limit) return { empire, error: `Tek seferde en fazla ${limit} kaynak taşınabilir.` }
  if (amount > stock(from.game, resource)) return { empire, error: 'Bu kadar kaynak bulunmuyor.' }
  const a = islandOf(from), b = islandOf(destination)
  // Yol + limanda yükleme süresi (Ticaret Limanı seviyesiyle hızlanır).
  const minutes = 1 + Math.ceil(Math.hypot(a.x - b.x, a.y - b.y) / 4) + amount / loadingSpeed(from.game)
  addStock(from.game, resource, -amount)
  bump(empire, 'shipments')
  empire.shipments.push({
    id: `shipment-${from.id}-${now}`, from: from.id, to, resource, amount,
    eta: now + Math.round(minutes * 60_000 * (from.game.research.includes('haritacilik') ? .85 : 1) * travelFactor(from.game)),
  })
  return { empire }
}
