import { asset, buildingImage, type ArtSize, type CoastFacing } from '@/lib/asset'

/** First three camera-matched prototypes, held on the unpublished review branch.
 * Level-specific variants are a subsequent art pass; engine levels remain intact.
 * Ground origin is measured on each transparent source, not the old diamond art.
 */
export const MASTER_BUILDING_ART: Record<string, { groundOriginY: number }> = {
  divan: { groundOriginY: 0.865 },
  kisla: { groundOriginY: 0.70 },
  medrese: { groundOriginY: 0.80 },
}
export function masterBuildingImage(id: string, level: number, facing?: CoastFacing, size: ArtSize = 'sm') {
  if (!MASTER_BUILDING_ART[id]) return buildingImage(id, level, facing, size)
  return asset(`/images/game/buildings/master-v2/${id}-prototype${size === 'sm' ? '-sm' : ''}.webp`)
}
