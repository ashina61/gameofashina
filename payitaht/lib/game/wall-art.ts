/** Maps painted wall pixels to a foundation edge without changing wall height. */
export function wallArtTransform(tier: number, spanX: number, spanY: number, height: number) {
  const [lx, ly, rx, ry, faceHeight] = [[40, 312, 376, 183, 106], [33, 323, 376, 201, 144], [39, 318, 376, 209, 137]][tier - 1]
  const flip = spanY > 0
  const x0 = flip ? 384 - rx : lx, x1 = flip ? 384 - lx : rx
  const y0 = flip ? ry : ly, y1 = flip ? ly : ry
  const a = spanX / (x1 - x0), d = height / faceHeight
  const b = (spanY - (y1 - y0) * d) / (x1 - x0)
  return { a, b, d, tx: -a * x0, ty: -b * x0 - d * y0, flip }
}
