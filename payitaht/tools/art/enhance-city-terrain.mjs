/**
 * Restore readable road edges, lot outlines, stonework and coastline using the
 * APPROVED city painting. Never substitute a generated mockup for the calibrated
 * world, never add ground beneath transparent building sprites.
 *
 * Input:  1586x992 painted-town-v1/city.webp
 * Output: 3172x1984 city-crisp.webp (exactly PARCEL_WORLD, no runtime stretch).
 *
 * Native-scale Lanczos is followed by restrained local contrast: neighboring
 * pale roads / cream walls should separate without drawing fake high-frequency
 * texture across the empty lots. High quality WebP avoids reintroducing ringing
 * and mosquito noise around masonry contours.
 *
 * Upscaling is NOT repainting: features missing in the master still require
 * a separately approved, fully re-calibrated source illustration.
 */
import sharp from 'sharp'
import { mkdir } from 'node:fs/promises'
import path from 'node:path'

const source = path.resolve('public/images/game/terrain/painted-town-v1/city.webp')
const target = path.resolve('public/images/game/terrain/painted-town-v1/city-crisp.webp')

const WORLD_WIDTH = 3172
const WORLD_HEIGHT = 1984
const metadata = await sharp(source).metadata()
if (metadata.width !== WORLD_WIDTH / 2 || metadata.height !== WORLD_HEIGHT / 2) {
  throw new Error(`Terrain geometry changed (${metadata.width}x${metadata.height}); recalibrate parcel plots first`)
}

await mkdir(path.dirname(target), { recursive: true })
const result = await sharp(source)
  .resize(WORLD_WIDTH, WORLD_HEIGHT, { kernel: sharp.kernel.lanczos3, fit: 'fill' })
  // Gentle tile-limited histogram equalisation opens hazy forest, city stone
  // and harbour midtones locally. A low maxSlope limits noisy grain and halos.
  .clahe({ width: 96, height: 96, maxSlope: 1 })
  .sharpen({ sigma: 1.1, m1: 2.1, m2: 2.3, x1: 2, y2: 10, y3: 20 })
  .linear(1.012, -1)
  .modulate({ saturation: 1.015 })
  .webp({ quality: 96, effort: 6, smartSubsample: true })
  .toFile(target)

if (result.width !== WORLD_WIDTH || result.height !== WORLD_HEIGHT) {
  throw new Error('Generated terrain must exactly match parcel world coordinates')
}
console.log(`City terrain clarity v2: ${metadata.width}x${metadata.height} -> ${result.width}x${result.height}, ${result.size} bytes`)
