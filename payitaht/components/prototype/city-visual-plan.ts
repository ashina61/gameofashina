import { LIVE_SLOTS, LIVE_HALL_INDEX, type LiveSlot } from '@/lib/game/city-map/live-adapter'

export type CityPhaseId = 'settlement' | 'town' | 'city' | 'grandCity' | 'capital'
export type DistrictId = 'merkez' | 'kuzey' | 'dogu' | 'guney' | 'bati' | 'liman' | 'islet'
export type LifePreset = 'quiet' | 'residential' | 'market' | 'scholar' | 'military' | 'warehouse' | 'harbour'

export type CityPhase = {
  id: CityPhaseId
  minHallLevel: number
  maxHallLevel: number
  roadTier: 1 | 2 | 3 | 4 | 5
  fillerDensity: number
  citizenDensity: number
  harbourActivity: number
  greenery: number
}

export type VisualAnchor = {
  engineIndex: number
  slotId: string
  district: DistrictId
  /** Render anchor. Engine/save koordinatı değildir. */
  world: { x: number; y: number }
  /** Ortak avlu/temas gölgesi için kaba yarıçap. */
  yardRadius: number
  preferredFacing: 'sw' | 'se' | 's' | 'water'
  roadSocket: 'inner' | 'ring' | 'outer' | 'quay' | 'islet'
  lifePreset: LifePreset
  occlusionBand: number
  fixed: boolean
}

export const CITY_PHASES: readonly CityPhase[] = [
  { id: 'settlement', minHallLevel: 1, maxHallLevel: 4, roadTier: 1, fillerDensity: .18, citizenDensity: .22, harbourActivity: .18, greenery: 1.00 },
  { id: 'town',       minHallLevel: 5, maxHallLevel: 9, roadTier: 2, fillerDensity: .34, citizenDensity: .38, harbourActivity: .35, greenery: .92 },
  { id: 'city',       minHallLevel: 10, maxHallLevel: 14, roadTier: 3, fillerDensity: .52, citizenDensity: .56, harbourActivity: .55, greenery: .84 },
  { id: 'grandCity',  minHallLevel: 15, maxHallLevel: 19, roadTier: 4, fillerDensity: .72, citizenDensity: .72, harbourActivity: .75, greenery: .78 },
  { id: 'capital',    minHallLevel: 20, maxHallLevel: 999, roadTier: 5, fillerDensity: .92, citizenDensity: .90, harbourActivity: .95, greenery: .72 },
] as const

export function phaseForHallLevel(level: number): CityPhase {
  const safe = Number.isFinite(level) ? Math.max(1, Math.floor(level)) : 1
  return CITY_PHASES.find(p => safe >= p.minHallLevel && safe <= p.maxHallLevel) ?? CITY_PHASES[0]
}

const hall = LIVE_SLOTS.find(s => s.index === LIVE_HALL_INDEX)!
const citySlots = LIVE_SLOTS.filter(s => s.zone === 'sehir')
const xs = citySlots.map(s => s.screen.x)
const ys = citySlots.map(s => s.screen.y)
const spanX = Math.max(1, Math.max(...xs) - Math.min(...xs))
const spanY = Math.max(1, Math.max(...ys) - Math.min(...ys))

/**
 * Canlı slot koordinatını görsel kompozisyon uzayına taşır.
 * Bu dönüşüm yalnız prototip render içindir; engine index ve save dokunulmaz kalır.
 */
function projectSlot(slot: LiveSlot) {
  const dx = (slot.screen.x - hall.screen.x) / spanX
  const dy = (slot.screen.y - hall.screen.y) / spanY

  // Şehir tabanı daha geniş, daha az dar/uzun görünsün diye X açılır; Y sıkıştırılır.
  return {
    x: dx * 3300,
    y: dy * 2050 - 80,
  }
}

function districtFor(slot: LiveSlot): DistrictId {
  if (slot.slotId.startsWith('islet_')) return 'islet'
  if (slot.zone === 'liman') return 'liman'
  if (slot.index === LIVE_HALL_INDEX) return 'merkez'

  const p = projectSlot(slot)
  if (Math.abs(p.x) < 760 && Math.abs(p.y) < 560) return 'merkez'
  if (Math.abs(p.x) > Math.abs(p.y) * 1.15) return p.x < 0 ? 'bati' : 'dogu'
  return p.y < 0 ? 'kuzey' : 'guney'
}

function roadSocketFor(slot: LiveSlot, district: DistrictId): VisualAnchor['roadSocket'] {
  if (district === 'islet') return 'islet'
  if (district === 'liman') return 'quay'
  if (slot.index === LIVE_HALL_INDEX || district === 'merkez') return 'inner'
  const p = projectSlot(slot)
  return Math.hypot(p.x / 3300, p.y / 2050) > .58 ? 'outer' : 'ring'
}

function lifePresetFor(slot: LiveSlot, district: DistrictId): LifePreset {
  if (district === 'liman' || district === 'islet') return 'harbour'
  if (slot.index === LIVE_HALL_INDEX) return 'market'
  if (district === 'merkez') return 'residential'
  return 'quiet'
}

export const VISUAL_ANCHORS: readonly VisualAnchor[] = LIVE_SLOTS.map(slot => {
  const district = districtFor(slot)
  const world = projectSlot(slot)
  const preferredFacing: VisualAnchor['preferredFacing'] = district === 'liman' || district === 'islet'
    ? 'water'
    : world.x < -180 ? 'se' : world.x > 180 ? 'sw' : 's'

  return {
    engineIndex: slot.index,
    slotId: slot.slotId,
    district,
    world,
    yardRadius: slot.index === LIVE_HALL_INDEX ? 260 : district === 'liman' ? 220 : 175,
    preferredFacing,
    roadSocket: roadSocketFor(slot, district),
    lifePreset: lifePresetFor(slot, district),
    occlusionBand: Math.round(world.y),
    fixed: slot.fixed,
  }
})

export const HALL_VISUAL_ANCHOR = VISUAL_ANCHORS.find(a => a.engineIndex === LIVE_HALL_INDEX)!
export const LAND_VISUAL_ANCHORS = VISUAL_ANCHORS.filter(a => a.district !== 'liman' && a.district !== 'islet')
export const COAST_VISUAL_ANCHORS = VISUAL_ANCHORS.filter(a => a.district === 'liman')
export const ISLET_VISUAL_ANCHOR = VISUAL_ANCHORS.find(a => a.district === 'islet')
