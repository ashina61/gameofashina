import { BUILDING_IDS } from '@/lib/game/engine'
import { asset, buildingImage, type ArtSize, type CoastFacing } from '@/lib/asset'

/** Approved complete parcel modules. Level rules remain in the engine. */
export const MASTER_BUILDING_ART = new Set<string>(BUILDING_IDS.filter(id => id !== 'surlar'))
/** Architecture-only cutouts use the existing city ground and uniform scaling. */
export const MASTER_BUILDING_CUTOUTS = new Set<string>(['kisla', 'medrese', 'depo', 'carsi', 'hamam'])
export function masterBuildingImage(id: string, level: number, facing?: CoastFacing, size: ArtSize = 'sm') {
  if (!MASTER_BUILDING_ART.has(id)) return buildingImage(id, level, facing, size)
  if (id === 'kisla') return asset(`/images/game/buildings/master-v10/kisla${size === 'sm' ? '-sm' : ''}.webp`)
  if (MASTER_BUILDING_CUTOUTS.has(id)) return asset(`/images/game/buildings/master-v9/${id}${size === 'sm' ? '-sm' : ''}.webp`)
  return asset(`/images/game/buildings/master-v6/${id}${size === 'sm' ? '-sm' : ''}.webp`)
}
