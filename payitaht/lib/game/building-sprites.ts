import { COMPOSITION_SITES } from './plots.generated'

/** Fractions of the alpha-trimmed image, measured at ground level.
 * Roof height is deliberately excluded from the ground footprint.
 */
export const LAND_SPRITES = {
  divan: { originX: .5, originY: .69, footW: .96, footH: .56 },
  konut: { originX: .5, originY: .78, footW: .94, footH: .40 },
  kereste: { originX: .5, originY: .70, footW: .96, footH: .56 },
  tas: { originX: .5, originY: .71, footW: .96, footH: .54 },
  ambar: { originX: .5, originY: .70, footW: .96, footH: .56 },
  medrese: { originX: .5, originY: .59, footW: .96, footH: .78 },
  carsi: { originX: .5, originY: .67, footW: .96, footH: .62 },
  hamam: { originX: .5, originY: .66, footW: .96, footH: .64 },
  saray: { originX: .5, originY: .70, footW: .96, footH: .56 },
  elcilik: { originX: .5, originY: .73, footW: .96, footH: .50 },
  kisla: { originX: .5, originY: .60, footW: .96, footH: .76 },
} as const
export type LandSpriteId = keyof typeof LAND_SPRITES
export const isLandSprite = (id: string): id is LandSpriteId => Object.hasOwn(LAND_SPRITES, id)

/** Roof silhouettes are sized against the whole architectural composition.
 * A roof may project beyond the ground footprint; shrinking it to an inscribed
 * paving rectangle makes every building look like a miniature on a terrace.
 */
export function fitBuildingSprite(id: LandSpriteId, plot: number, imageW: number, imageH: number) {
  const sprite = LAND_SPRITES[id]
  const site = COMPOSITION_SITES[plot]
  const scale = Math.min(site.width / imageW, site.maxHeight / imageH)
  return { ...sprite, scale, width: imageW * scale, height: imageH * scale,
    groundWidth: imageW * scale * sprite.footW, groundHeight: imageH * scale * sprite.footH }
}
