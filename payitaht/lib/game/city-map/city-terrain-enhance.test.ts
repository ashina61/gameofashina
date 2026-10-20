import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import test from 'node:test'
import sharp from 'sharp'
import { PARCEL_WORLD } from './parcel-city'

const source = 'public/images/game/terrain/painted-town-v1/city.webp'
const output = 'public/images/game/terrain/painted-town-v1/city-crisp.webp'

// Assess sampled colour-channel edge contrast at exactly equal dimensions.
// This detects accidental 2304px intermediate backgrounds being magnified
// in Phaser, or a no-op script that only changes JPEG/WebP quality.
function edgeEnergy(data: Buffer, width: number, height: number, channels: number) {
  let energy = 0
  const rgb = (at: number) => data[at] + data[at + 1] + data[at + 2]
  for (let y = 13; y < height - 13; y += 17) {
    for (let x = 13; x < width - 13; x += 17) {
      const at = (y * width + x) * channels
      energy += Math.abs(rgb(at) - rgb(at + channels))
      energy += Math.abs(rgb(at) - rgb(at + width * channels))
    }
  }
  return energy
}

test('the city master is sharpened at native Phaser world resolution without changing parcel geometry', async () => {
  const original = await sharp(source).metadata()
  assert.equal(original.width * 2, PARCEL_WORLD.w)
  assert.equal(original.height * 2, PARCEL_WORLD.h)

  const built = spawnSync(process.execPath, ['tools/art/enhance-city-terrain.mjs'], {
    encoding: 'utf8', timeout: 120_000,
  })
  assert.equal(built.status, 0, `City art generator: ${built.stderr || built.stdout}`)

  const outputMeta = await sharp(output).metadata()
  assert.equal(outputMeta.width, PARCEL_WORLD.w)
  assert.equal(outputMeta.height, PARCEL_WORLD.h)
  assert.equal(outputMeta.format, 'webp')

  const [normal, treated] = await Promise.all([
    sharp(source).resize(PARCEL_WORLD.w, PARCEL_WORLD.h, { kernel: sharp.kernel.lanczos3 }).raw().toBuffer({ resolveWithObject: true }),
    sharp(output).raw().toBuffer({ resolveWithObject: true }),
  ])
  const originalEnergy = edgeEnergy(normal.data, normal.info.width, normal.info.height, normal.info.channels)
  const enhancedEnergy = edgeEnergy(treated.data, treated.info.width, treated.info.height, treated.info.channels)
  assert.ok(enhancedEnergy > originalEnergy * 1.01,
    `Painted outline clarity regressed: untreated=${originalEnergy}, enhanced=${enhancedEnergy}`)
})
