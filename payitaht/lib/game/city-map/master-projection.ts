import measured from './master-projection.json'
import { LIVE_SLOTS } from './live-adapter'

/** Image pixels, independent of the engine's stable plot indices and tile geometry. */
export const MASTER_MAP = { width: 1536, height: 1024, scale: 3, key: 'city-master-20261013', path: '/images/game/terrain/city-master-20261013.webp' }
export const MASTER_WORLD = { x: 0, y: 0, w: MASTER_MAP.width * MASTER_MAP.scale, h: MASTER_MAP.height * MASTER_MAP.scale }
/** Only the portion covered by the top HUD may extend north of the actual painting. */
export function masterCameraBounds(coveredTop: number, zoom: number) {
  // Phaser rounds worldView coordinates down; one world pixel keeps that
  // rounding from exposing a fraction of the unpainted northern margin.
  const coveredNorth = Math.max(0, coveredTop / zoom - 1)
  return { x: MASTER_WORLD.x, y: -coveredNorth, w: MASTER_WORLD.w, h: MASTER_WORLD.h + coveredNorth }
}
/** Single approved painting; roads and parcels share one camera and light. */
export const MASTER_TERRAIN_TILES: Array<{ id: string; x: number; y: number; key: string; width: number; height: number; path: string }> = []
export const MASTER_DEFENSE_PATH = [[244,147],[392,70],[544,65],[725,65],[899,65],[1074,65],[1225,65],[1283,165]]
export const MASTER_TOWER_SIZE = 60
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
export function masterArtFrame(p: MasterPlot, sourceW: number, sourceH: number, module: boolean, _growth = 1) {
  const fill = module ? 1 : 0.94
  const availableW = p.width * fill, availableH = p.height * fill
  const scale = Math.min(availableW / Math.max(1, sourceW), availableH / Math.max(1, sourceH))
  const width = module ? availableW : sourceW * scale
  const height = module ? availableH : sourceH * scale
  return { x: p.center.x, y: p.center.y, width, height,
    left: p.center.x - width / 2, right: p.center.x + width / 2,
    top: p.center.y - height / 2, bottom: p.center.y + height / 2 }
}
