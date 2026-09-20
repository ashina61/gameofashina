import { COURTYARDS, MEASURED, PLOT_FOOTPRINTS } from './plots.generated'

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

/** Uniform scale in map-percent units, including a small paving margin.
 * A tall building can extend upward; its physical base must fit both axes.
 */
export function fitBuildingSprite(id: LandSpriteId, plot: number, imageW: number, imageH: number) {
  const sprite = LAND_SPRITES[id]
  const [plotW, plotH] = PLOT_FOOTPRINTS[plot]
  let scale = Math.min(plotW / (imageW * sprite.footW), plotH / (imageH * sprite.footH)) * .92
  // A rotated or tapered lot can be tighter than its width/depth envelope.
  // Clip the proposed ground rectangle against every courtyard half-plane.
  const center = MEASURED[plot]
  const polygon = COURTYARDS[plot]
  for (let i = 0; i < polygon.length; i++) {
    const [ax, ay] = polygon[i], [bx, by] = polygon[(i + 1) % polygon.length]
    const ex = bx - ax, ey = by - ay
    const clearance = ex * (center.y - ay) - ey * (center.x - ax)
    for (const sx of [-1, 1]) for (const sy of [-1, 1]) {
      const vx = sx * imageW * sprite.footW / 2, vy = sy * imageH * sprite.footH / 2
      const projection = ex * vy - ey * vx
      if (projection < 0) scale = Math.min(scale, clearance / -projection * .96)
    }
  }
  return { ...sprite, scale, width: imageW * scale, height: imageH * scale,
    groundWidth: imageW * scale * sprite.footW, groundHeight: imageH * scale * sprite.footH }
}
