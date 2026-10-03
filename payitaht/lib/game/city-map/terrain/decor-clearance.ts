/** Render-only ground footprints; no map/save geometry is changed. */
import { PLAZA, TILE } from '../index'
import { roadStyleFor } from '../road-style'
import type { Curves } from 'phaser'
import type { RoadKind } from '../road-style'

type Point = { x: number; y: number }
export type DecorLane = { points: Point[]; halfWidth: number; kind: string }
export const HOUSE_ART_WIDTH = 600 * (TILE.w * 2 / 480) * 1.8 * 0.91 * 0.9
export const HOUSE_ART_HEIGHT = HOUSE_ART_WIDTH * (482 / 816)
export function decorGroundRadius(key: string, width: number) {
  return width * (/tree|cypress|pine|poplar/.test(key) ? 0.22 : 0.5)
}
export function decorLanes(curves: { curve: Curves.Curve; kind: RoadKind }[], level = 10): DecorLane[] {
  return curves.map(r => ({ points: r.curve.getSpacedPoints(Math.max(32, Math.ceil(r.curve.getLength() / 12))), halfWidth: TILE.w * roadStyleFor(r.kind, level).shoulderW / 2, kind: r.kind }))
}
export function decorGroundViolation(x: number, y: number, radius: number, lanes: DecorLane[]): string | null {
  // Expand the plaza by the full ground footprint, not merely the anchor.
  if (((x - PLAZA.screen.x) / (PLAZA.rx + radius + 14)) ** 2 + ((y - PLAZA.screen.y) / (PLAZA.ry + radius / 2 + 10)) ** 2 <= 1) return 'plaza'
  for (const lane of lanes) for (let i = 1; i < lane.points.length; i++) {
    const a = lane.points[i - 1], b = lane.points[i], dx = b.x - a.x, dy = b.y - a.y
    const length2 = dx * dx + dy * dy
    const t = length2 ? Math.max(0, Math.min(1, ((x - a.x) * dx + (y - a.y) * dy) / length2)) : 0
    const distance = Math.hypot(x - a.x - dx * t, y - a.y - dy * t)
    const length = Math.sqrt(length2) || 1
    const support = radius * Math.hypot(dy / length, dx / length / 2)
    if (distance < lane.halfWidth + support + 10) return lane.kind === 'quay' ? 'quay' : 'road'
  }
  return null
}
