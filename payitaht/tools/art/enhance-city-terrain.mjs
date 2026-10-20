/**
 * Rebuild the existing painted city at the SAME resolution as Phaser's world.
 *
 * Before 0.118, the 1586x992 master was resized to 2304px and Phaser then
 * stretched it to 3172px. That second magnification softened every painted
 * road, shoreline, parcel boundary and wall edge.
 *
 * This is honest local-contrast / edge restoration, not AI detail generation.
 * Do not crop, rotate, warp, change geometry, or alter the transparent buildings.
 */
import sharp from 'sharp'
import { mkdir } from 'node:fs/promises'
import path from 'node:path'

const source = path.resolve('public/images/game/terrain/painted-town-v1/city.webp')
const target = path.resolve('public/images/game/terrain/painted-town-v1/city-crisp.webp')

// Keep exactly aligned with PARCEL_WORLD in lib/game/city-map/parcel-city.ts.
const WORLD_WIDTH = 3172
const WORLD_HEIGHT = 1984
const input = sharp(source)
const metadata = await input.metadata()
if (metadata.width !== WORLD_WIDTH / 2 || metadata.height !== WORLD_HEIGHT / 2) {
  throw new Error(`Painted terrain geometry changed (${metadata.width}x${metadata.height}); review parcel calibration before rebuilding`)
}

await mkdir(path.dirname(target), { recursive: true })
const result = await input
  // Only one native-resolution upscale, so Phaser does not stretch again at 100%.
  .resize(WORLD_WIDTH, WORLD_HEIGHT, { kernel: sharp.kernel.lanczos3, fit: 'fill' })
  // Sharpen painted contours, not an artificial overlaid grass/road grid.
  .sharpen({ sigma: 1.25, m1: 2.25, m2: 2.5, x1: 2, y2: 10, y3: 20 })
  .linear(1.025, -2)
  .modulate({ saturation: 1.02 })
  .webp({ quality: 91, effort: 5, smartSubsample: true })
  .toFile(target)

console.log(`City terrain native detail: ${metadata.width}x${metadata.height} -> ${result.width}x${result.height}, ${result.size} bytes`)
