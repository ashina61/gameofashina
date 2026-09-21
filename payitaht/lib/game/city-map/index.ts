/**
 * ŞEHİR HARİTASI ADAPTÖRÜ.
 *
 * Tiled haritası (maps/payitaht/payitaht_city.tmj) editörün gerçeğidir; oyun
 * ise bu dosyanın ürettiği SADE JSON'u okur (city-slots.json). Böylece Phaser
 * tarafı Tiled'ın izometrik nesne koordinat tuhaflığını hiç bilmez: her slotun
 * gx/gy kare koordinatı VE hazır hesaplanmış ekran merkezi burada.
 *
 * Bu katman mevcut oyunu (lib/game/layout.ts) DEĞİŞTİRMEZ; yeni, bağımsız ve
 * test edilebilir bir slot modelidir. İleride canlı şehir buna göç edebilir.
 */
import raw from './city-slots.json'

export type SlotType = 'city' | 'coast' | 'defense'

export type CitySlot = {
  id: string
  type: SlotType
  /** Kare (tile) koordinatı — footprint merkezi. */
  gx: number
  gy: number
  /** Footprint (karo). Bütün normal slotlar aynı. */
  fw: number
  fh: number
  /** Çakılı slot (ör. belediye) taşınamaz. */
  fixed: boolean
  /** İzometrik ekran merkezi (piksel). */
  screen: { x: number; y: number }
}

export type ScreenPoint = { x: number; y: number }
export type RoadNode = { id: string; gx: number; gy: number; screen: ScreenPoint }
export type RoadEdge = { from: string; to: string; ctrl: ScreenPoint }
export type CityBounds = {
  minGx: number; maxGx: number; minGy: number; maxGy: number
  minX: number; maxX: number; minY: number; maxY: number
}

export type CityMapData = {
  tile: { w: number; h: number }
  map: { w: number; h: number; orientation: string }
  footprint: { w: number; h: number }
  center: { gx: number; gy: number; screen: ScreenPoint }
  hallSlotId: string
  bounds: CityBounds
  slots: CitySlot[]
  defenseFoundation: { gx: number; gy: number; screen: ScreenPoint }[]
  roadGraph: { nodes: RoadNode[]; edges: RoadEdge[] }
}

export const CITY_MAP = raw as CityMapData
export const TILE = CITY_MAP.tile
export const SLOTS: CitySlot[] = CITY_MAP.slots
export const CITY_SLOTS = SLOTS.filter(s => s.type === 'city')
export const COAST_SLOTS = SLOTS.filter(s => s.type === 'coast')
export const DEFENSE_SLOTS = SLOTS.filter(s => s.type === 'defense')
export const HALL_SLOT_ID = CITY_MAP.hallSlotId
export const CITY_BOUNDS = CITY_MAP.bounds
export const ROAD_GRAPH = CITY_MAP.roadGraph
export const DEFENSE_FOUNDATION = CITY_MAP.defenseFoundation

export function slotById(id: string): CitySlot | undefined {
  return SLOTS.find(s => s.id === id)
}

/**
 * Bir slotun izometrik footprint ELMASININ köşeleri (ekran/dünya pikseli).
 * Debug çiziminde ve dokunma testinde kullanılır. Footprint karesinin dört
 * köşesi (±fw/2, ±fh/2) izometrik dönüşümle elmasa açılır.
 */
export function footprintDiamond(s: CitySlot, tileW = TILE.w, tileH = TILE.h): { x: number; y: number }[] {
  const c = s.screen
  const corners: Array<[number, number]> = [
    [-s.fw / 2, -s.fh / 2], [s.fw / 2, -s.fh / 2], [s.fw / 2, s.fh / 2], [-s.fw / 2, s.fh / 2],
  ]
  return corners.map(([dgx, dgy]) => ({
    x: c.x + (dgx - dgy) * (tileW / 2),
    y: c.y + (dgx + dgy) * (tileH / 2),
  }))
}
