import measured from './master-projection.json'
import { LIVE_SLOTS } from './live-adapter'

/** Image pixels measured against unified-detail-v3 (0.107.1), not the older
 * city-unified-v3 thumbnail. Engine plot indices and tile geometry are unchanged. */
export const MASTER_MAP = { width: 1536, height: 1024, scale: 3, key: 'city-unified-v3', path: '/images/game/terrain/city-unified-v3.webp' }
export const MASTER_SEA_EXTENSION = 180
export const MASTER_WORLD = { x: 0, y: 0, w: MASTER_MAP.width * MASTER_MAP.scale, h: (MASTER_MAP.height + MASTER_SEA_EXTENSION) * MASTER_MAP.scale }
/** Only the portion covered by the top HUD may extend north of the actual painting. */
export function masterCameraBounds(coveredTop: number, zoom: number) {
  // Phaser rounds worldView coordinates down; one world pixel keeps that
  // rounding from exposing a fraction of the unpainted northern margin.
  const coveredNorth = Math.max(0, coveredTop / zoom - 1)
  return { x: MASTER_WORLD.x, y: -coveredNorth, w: MASTER_WORLD.w, h: MASTER_WORLD.h + coveredNorth }
}
/** Single approved painting; roads and parcels share one camera and light. */
export const MASTER_TERRAIN_TILES: Array<{ id: string; x: number; y: number; key: string; width: number; height: number; path: string }> = [['nw',0,0],['ne',768,0],['sw',0,512],['se',768,512]].map(([id,x,y]) => ({id: String(id), x: Number(x), y: Number(y), key: `unified-detail-v3-${id}`, width: 768, height: 512, path: `/images/game/terrain/unified-detail-v3/${id}.webp`}))
export const MASTER_DEFENSE_PATH = [[244,147],[392,70],[544,65],[725,65],[899,65],[1074,65],[1225,65],[1283,165]]
export const MASTER_TOWER_SIZE = 60
export const MASTER_PLOTS = measured.map(p => ({
  ...p,
  slot: LIVE_SLOTS[p.index],
  polygon: p.corners.map(([x,y]) => ({ x: x * MASTER_MAP.scale, y: y * MASTER_MAP.scale })),
  center: { x: p.x * MASTER_MAP.scale, y: p.y * MASTER_MAP.scale },
  width: p.w * MASTER_MAP.scale,
  height: p.h * MASTER_MAP.scale,
}))
export type MasterPlot = typeof MASTER_PLOTS[number]
type Point = { x: number; y: number }
/** Distance from an edge, rather than an axis-aligned bounding box. */
export function parcelContains(polygon: Point[], q: Point, clearance = 0) {
  return polygon.every((a, i) => {
    const b = polygon[(i + 1) % polygon.length], dx = b.x - a.x, dy = b.y - a.y
    return (dx * (q.y - a.y) - dy * (q.x - a.x)) / Math.hypot(dx, dy) >= clearance - 0.01
  })
}
/** Preserve the painted kerb: map the complete artwork into its inner edge.
 * No masks/crops. The 6 image-pixel kerb is outside the buildable surface. */
export function masterBuildingPlot(p: MasterPlot): MasterPlot {
  const inset = 6 * MASTER_MAP.scale
  const lines = p.polygon.map((a, i) => {
    const b = p.polygon[(i + 1) % p.polygon.length], dx = b.x - a.x, dy = b.y - a.y, length = Math.hypot(dx, dy)
    return { x: a.x - dy / length * inset, y: a.y + dx / length * inset, dx, dy }
  })
  const polygon = lines.map((b, i) => {
    const a = lines[(i + lines.length - 1) % lines.length], den = a.dx * b.dy - a.dy * b.dx
    const t = ((b.x - a.x) * b.dy - (b.y - a.y) * b.dx) / den
    return { x: a.x + t * a.dx, y: a.y + t * a.dy }
  })
  const left = Math.min(...polygon.map(q => q.x)), right = Math.max(...polygon.map(q => q.x))
  const top = Math.min(...polygon.map(q => q.y)), bottom = Math.max(...polygon.map(q => q.y))
  return { ...p, polygon, center: { x: (left + right) / 2, y: (top + bottom) / 2 }, width: right - left, height: bottom - top }
}
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
  let width = module ? availableW : sourceW * scale
  let height = module ? availableH : sourceH * scale
  if (!module) {
    // A rectangular scaffold/site must fit the trapezoid's narrow top,
    // not merely its wider bounding box. Fit all four corners together.
    let low = 0, high = 1
    for (let i = 0; i < 24; i++) {
      const k = (low + high) / 2
      const fits = [-1, 1].every(x => [-1, 1].every(y => parcelContains(p.polygon,
        { x: p.center.x + x * width * k / 2, y: p.center.y + y * height * k / 2 })))
      if (fits) low = k; else high = k
    }
    width *= low; height *= low
  }
  return { x: p.center.x, y: p.center.y, width, height,
    left: p.center.x - width / 2, right: p.center.x + width / 2,
    top: p.center.y - height / 2, bottom: p.center.y + height / 2 }
}
