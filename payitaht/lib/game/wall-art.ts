/** Global spacing survives piece splits: a seam never adds an extra battlement. */
export function wallMerlons(arc: number, length: number, step = 44, width = 20): Array<[number, number]> {
  const spans: Array<[number, number]> = []
  for (let start = Math.floor(arc / step) * step; start < arc + length; start += step) {
    const lo = Math.max(arc, start), hi = Math.min(arc + length, start + width)
    if (hi > lo) spans.push([lo - arc, hi - arc])
  }
  return spans
}
