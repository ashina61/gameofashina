import measured from './master-projection.json'
import { LIVE_SLOTS } from './live-adapter'

/** Image pixels, independent of the engine's stable plot indices and tile geometry. */
export const MASTER_MAP = { width: 1536, height: 1024, scale: 3, key: 'city-master-20261011' }
export const MASTER_WORLD = { x: 0, y: 0, w: MASTER_MAP.width * MASTER_MAP.scale, h: 12000 }
/** Only the portion covered by the top HUD may extend north of the actual painting. */
export function masterCameraBounds(coveredTop: number, zoom: number) {
  // Phaser rounds worldView coordinates down; one world pixel keeps that
  // rounding from exposing a fraction of the unpainted northern margin.
  const coveredNorth = Math.max(0, coveredTop / zoom - 1)
  return { x: MASTER_WORLD.x, y: -coveredNorth, w: MASTER_WORLD.w, h: MASTER_WORLD.h + coveredNorth }
}
/** Four 2x-detail textures retain the existing painting's world coordinates. */
export const MASTER_TERRAIN_TILES = [
  { id: 'nw', x: 0, y: 0 }, { id: 'ne', x: 768, y: 0 },
  { id: 'sw', x: 0, y: 512 }, { id: 'se', x: 768, y: 512 },
].map(tile => ({ ...tile, key: `master-detail-${tile.id}`, width: 768, height: 512,
  path: `/images/game/terrain/master-detail-v1/${tile.id}.webp` }))
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
/** Fit the COMPLETE artwork, not just its ground-contact point. No crop or mask.
 * Approved modules follow the measured parcel's two-axis ground projection.
 * Legacy art keeps its aspect ratio while fitting entirely inside that parcel.
 */
export function masterArtFrame(p: MasterPlot, sourceW: number, sourceH: number, module: boolean, growth = 1) {
  const fill = module ? 0.96 + Math.max(0, Math.min(0.1, growth - 0.9)) * 0.2 : 0.94
  const availableW = p.width * fill, availableH = p.height * fill
  const scale = Math.min(availableW / Math.max(1, sourceW), availableH / Math.max(1, sourceH))
  const width = module ? availableW : sourceW * scale
  const height = module ? availableH : sourceH * scale
  return { x: p.center.x, y: p.center.y, width, height,
    left: p.center.x - width / 2, right: p.center.x + width / 2,
    top: p.center.y - height / 2, bottom: p.center.y + height / 2 }
}
