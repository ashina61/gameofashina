export type AlphaFrame = { left: number; top: number; width: number; height: number }
/** Ignore clear padding and faint baked shadow fringes when sizing world art.
 * Returns pixel coordinates; never changes the original image or UI artwork.
 */
export function spriteAlphaFrame(data: ArrayLike<number>, width: number, height: number, threshold = 24): AlphaFrame {
  let left = width, right = -1, top = height, bottom = -1
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
    if (data[(y * width + x) * 4 + 3] <= threshold) continue
    left = Math.min(left, x); right = Math.max(right, x)
    top = Math.min(top, y); bottom = Math.max(bottom, y)
  }
  return right < left ? { left: 0, top: 0, width, height } : { left, top, width: right - left + 1, height: bottom - top + 1 }
}
