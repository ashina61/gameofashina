import outlines from './master-cutout-bounds.json'
import { parcelContains, type MasterPlot } from './master-projection'

type Point = { x: number; y: number }
export function masterCutoutOutline(id: string, width: number, height: number): Point[] | undefined {
  const records = outlines as Record<string, Record<string, number[][]>>
  return records[id]?.[`${width}x${height}`]?.map(([x, y]) => ({ x, y }))
}

/** Fit visible pixels, not the transparent canvas. Keep the front entrance at
 * the inner kerb and preserve one uniform scale for all architectural axes. */
export function masterCutoutFrame(p: MasterPlot, sourceW: number, sourceH: number, outline: Point[], flip = false) {
  const points = outline.map(q => ({ x: (flip ? 1 - q.x : q.x) * sourceW, y: q.y * sourceH }))
  const left = Math.min(...points.map(q => q.x)), right = Math.max(...points.map(q => q.x))
  const top = Math.min(...points.map(q => q.y)), bottom = Math.max(...points.map(q => q.y))
  const sourceCenter = (left + right) / 2
  const floor = Math.max(...p.polygon.map(q => q.y)) - 1.5
  const targetX = p.center.x
  const project = (scale: number) => points.map(q => ({ x: targetX + (q.x - sourceCenter) * scale, y: floor + (q.y - bottom) * scale }))
  let low = 0, high = Math.min(p.width / (right - left), p.height / (bottom - top))
  for (let i = 0; i < 32; i++) {
    const scale = (low + high) / 2
    if (project(scale).every(q => parcelContains(p.polygon, q, 1.5))) low = scale
    else high = scale
  }
  const width = sourceW * low, height = sourceH * low
  const x = targetX + (sourceW / 2 - sourceCenter) * low
  const y = floor + (sourceH / 2 - bottom) * low
  return { x, y, width, height, left: x - width / 2, right: x + width / 2,
    top: y - height / 2, bottom: y + height / 2, polygon: project(low) }
}
