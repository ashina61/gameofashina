import measured from './master-projection.json'
import { LIVE_SLOTS } from './live-adapter'

/** Image pixels, independent of the engine's stable plot indices and tile geometry. */
export const MASTER_MAP = { width: 1536, height: 1024, scale: 3, key: 'city-master-20261011' }
export const MASTER_PLOTS = measured.map(p => ({
  ...p,
  slot: LIVE_SLOTS[p.index],
  center: { x: p.x * MASTER_MAP.scale, y: p.y * MASTER_MAP.scale },
  width: p.w * MASTER_MAP.scale,
  height: p.h * MASTER_MAP.scale,
}))
export type MasterPlot = typeof MASTER_PLOTS[number]
export function masterPlot(index: number | null | undefined) {
  return index == null ? undefined : MASTER_PLOTS.find(p => p.index === index)
}
/** Ground contact stays inside the photographed clearing, including the largest stage. */
export function masterSpriteWidth(p: MasterPlot, hall = false) {
  return Math.min(p.width * (hall ? 0.94 : 0.88), p.height * (hall ? 1.10 : 1.85))
}
