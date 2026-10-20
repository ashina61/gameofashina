/**
 * Build-time visual treatment of the approved, baked city background.
 * Does not move or repaint building lots: all saved alpha boundaries remain
 * aligned with PARCEL_PLOTS. Run before Next dev and production build.
 *
 * Lanczos enlargement + restrained edge sharpening improves the perceived
 * clarity of the existing 1586x992 painting without claiming new source detail.
 */
import sharp from 'sharp'
import { mkdir } from 'node:fs/promises'
import path from 'node:path'

const source = path.resolve('public/images/game/terrain/painted-town-v1/city.webp')
const target = path.resolve('public/images/game/terrain/painted-town-v1/city-crisp.webp')
const input = sharp(source)
const metadata = await input.metadata()
if (!metadata.width || !metadata.height) throw new Error('City terrain has no dimensions')
const width = 2304
const height = Math.round(width * metadata.height / metadata.width)
await mkdir(path.dirname(target), { recursive:true })
await input
  .resize(width, height, { kernel: sharp.kernel.lanczos3, fit:'fill' })
  .sharpen({ sigma:.85, m1:1, m2:2, x1:2, y2:10, y3:20 })
  .linear(1.035, -2)
  .modulate({ saturation:1.025 })
  .webp({ quality:86, effort:5 })
  .toFile(target)
console.log(`City terrain: ${metadata.width}x${metadata.height} -> ${width}x${height}`)
