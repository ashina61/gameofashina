import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import test from 'node:test'
import sharp from 'sharp'
import { PARCEL_WORLD } from './parcel-city'
import terrainTiles from './terrain-tiles.json'

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
  assert.ok((outputMeta.size ?? 0) < 8_000_000, 'high fidelity must remain practical on mobile')

  const [normal, treated] = await Promise.all([
    sharp(source).resize(PARCEL_WORLD.w, PARCEL_WORLD.h, { kernel: sharp.kernel.lanczos3 }).raw().toBuffer({ resolveWithObject: true }),
    sharp(output).raw().toBuffer({ resolveWithObject: true }),
  ])
  // The sharpening pass should not recolour the calibrated landscape or
  // erase roads/clearings: limit mean per-channel drift on a broad sample.
  let drift = 0, sampled = 0
  for (let y = 29; y < normal.info.height - 29; y += 61) for (let x = 29; x < normal.info.width - 29; x += 53) {
    const a = (y * normal.info.width + x) * normal.info.channels
    const b = (y * treated.info.width + x) * treated.info.channels
    for (let channel = 0; channel < 3; channel++) {
      drift += Math.abs(normal.data[a + channel] - treated.data[b + channel]); sampled++
    }
  }
  assert.ok(drift / sampled < 45, `City colours shifted too far: mean drift ${drift / sampled}`)
  const originalEnergy = edgeEnergy(normal.data, normal.info.width, normal.info.height, normal.info.channels)
  const enhancedEnergy = edgeEnergy(treated.data, treated.info.width, treated.info.height, treated.info.channels)
  assert.ok(enhancedEnergy > originalEnergy * 1.01,
    `Painted outline clarity regressed: untreated=${originalEnergy}, enhanced=${enhancedEnergy}`)

  // Separate compressed crops can produce visible seams or shift a whole
  // half-map. Every tile, including its shared two-pixel gutter, must decode
  // to exactly the same world pixels used by the calibrated master.
  let tileBytes = 0
  for (const { id, left, top, width, height } of terrainTiles) {
    const file = `public/images/game/terrain/painted-town-v1/city-${id}.webp`
    const meta = await sharp(file).metadata()
    assert.equal(meta.width, width)
    assert.equal(meta.height, height)
    assert.ok(width <= 2048 && height <= 2048, 'terrain texture exceeds mobile GPU budget')
    const [expected, actual] = await Promise.all([
      sharp(output).extract({ left, top, width, height }).raw().toBuffer(),
      sharp(file).raw().toBuffer(),
    ])
    assert.ok(actual.equals(expected), `${id} tile changed calibrated terrain pixels`)
    tileBytes += meta.size ?? 0
  }
  assert.ok(tileBytes < 12_000_000, 'terrain tiles exceed mobile transfer budget')
})
