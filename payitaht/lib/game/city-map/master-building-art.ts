import { BUILDING_IDS } from '@/lib/game/engine'
import { asset, buildingImage, type ArtSize, type CoastFacing } from '@/lib/asset'

/** Approved complete parcel modules. Level rules remain in the engine. */
export const MASTER_BUILDING_ART = new Set<string>(BUILDING_IDS.filter(id => id !== 'surlar'))
export function masterBuildingImage(id: string, level: number, facing?: CoastFacing, size: ArtSize = 'sm') {
  if (!MASTER_BUILDING_ART.has(id)) return buildingImage(id, level, facing, size)
  return asset(`/images/game/buildings/master-v4/${id}${size === 'sm' ? '-sm' : ''}.webp`)
}
