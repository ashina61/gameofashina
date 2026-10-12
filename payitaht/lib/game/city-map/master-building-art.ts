import { asset, buildingImage, type ArtSize, type CoastFacing } from '@/lib/asset'

/** Approved complete parcel modules. Level rules remain in the engine. */
export const MASTER_BUILDING_ART = new Set(['divan', 'kisla', 'medrese', 'ambar', 'carsi', 'hamam'])
export function masterBuildingImage(id: string, level: number, facing?: CoastFacing, size: ArtSize = 'sm') {
  if (!MASTER_BUILDING_ART.has(id)) return buildingImage(id, level, facing, size)
  return asset(`/images/game/buildings/master-v3/${id}${size === 'sm' ? '-sm' : ''}.webp`)
}
