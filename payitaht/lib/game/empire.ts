import {
  advance, capacity, cargoCapacity, initialGame, parseSave, tradeCapacity,
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
export const ISLANDS = [
  { id: 'sahil', name: 'Sahil Adası', x: 4, y: 5, specialty: 'Mermer', luxury: 'mermer' },
  { id: 'zeytin', name: 'Zeytin Adası', x: 8, y: 3, specialty: 'Üzüm', luxury: 'uzum' },
  { id: 'akcam', name: 'Akçam Adası', x: 2, y: 2, specialty: 'Kristal', luxury: 'kristal' },
  { id: 'kizil', name: 'Kızılburun', x: 10, y: 7, specialty: 'Kükürt', luxury: 'kukurt' },
  { id: 'akdeniz', name: 'Akdeniz Adası', x: 6, y: 9, specialty: 'Mermer', luxury: 'mermer' },
  { id: 'yalcin', name: 'Yalçın Ada', x: 12, y: 2, specialty: 'Kristal', luxury: 'kristal' },
  { id: 'baglik', name: 'Bağlık Ada', x: 1, y: 8, specialty: 'Üzüm', luxury: 'uzum' },
  { id: 'atessiz', name: 'Ateşli Ada', x: 11, y: 11, specialty: 'Kükürt', luxury: 'kukurt' },
] as const
export type IslandId = typeof ISLANDS[number]['id']
export const COLONY_COST = { gold: 900, wood: 1200, stone: 450 } as const
const COLONY_SHIPS = 3
const MAX_CITIES = 8
const CITY_NAMES = ['Yeni Sahil', 'Akçaşehir', 'Yeni Liman', 'Yelkenhisar', 'Kervansaray', 'Yeni Hisar', 'Mavikent']

export type CityRecord = { id: string; islandId: IslandId; name: string; game: Game }
export type Shipment = {
  id: string; from: string; to: string; resource: Cargo
  amount: number; eta: number
}
export type Empire = {
  version: 1; activeCityId: string; cities: CityRecord[]
  shipments: Shipment[]; nextId: number
}

export function initialEmpire(now: number): Empire {
  return {
    version: 1, activeCityId: 'city-1',
    cities: [{ id: 'city-1', islandId: 'sahil', name: 'Sahilhisar', game: initialGame(now) }],
    shipments: [], nextId: 2,
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
    game.mine.specialty = ISLANDS.find(island => island.id === city.islandId)!.luxury
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
  return { version: 1, activeCityId: obj.activeCityId, cities, shipments, nextId: obj.nextId }
}

export function advanceEmpire(source: Empire, now: number): Empire {
  const empire = structuredClone(source)
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
  return empire
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
  if (capital.buildings.saray < empire.cities.length) {
    return { empire, error: `Yeni bir şehir için Saray en az ${empire.cities.length}. seviye olmalı.` }
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
  const limit = Math.min(cargoCapacity(from.game), tradeCapacity(from.game))
  if (limit <= 0) return { empire, error: 'Bu şehirde nakliye gemisi gerekli.' }
  if (amount > limit) return { empire, error: `Tek seferde en fazla ${limit} kaynak taşınabilir.` }
  if (amount > stock(from.game, resource)) return { empire, error: 'Bu kadar kaynak bulunmuyor.' }
  const a = islandOf(from), b = islandOf(destination)
  const minutes = 1 + Math.ceil(Math.hypot(a.x - b.x, a.y - b.y) / 4)
  addStock(from.game, resource, -amount)
  empire.shipments.push({
    id: `shipment-${from.id}-${now}`, from: from.id, to, resource, amount,
    eta: now + Math.round(minutes * 60_000 * (from.game.research.includes('haritacilik') ? .85 : 1)),
  })
  return { empire }
}
