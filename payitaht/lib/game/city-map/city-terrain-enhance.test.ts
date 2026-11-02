import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import test from 'node:test'
import sharp from 'sharp'
import { PARCEL_WORLD } from './parcel-city'
import tiles from './terrain-tiles.json'

function edgeEnergy(data: Buffer, width: number, height: number, channels: number) {
  let energy = 0
  const light = (at: number) => data[at] * .2126 + data[at + 1] * .7152 + data[at + 2] * .0722
  for (let y = 19; y < height - 19; y += 11) for (let x = 19; x < width - 19; x += 11) {
    const at = (y * width + x) * channels
    energy += Math.abs(light(at) - light(at + channels)) + Math.abs(light(at) - light(at + width * channels))
  }
  return energy
}

test('the real terrain has native fine detail at close zoom, not a magnified low-resolution master', async () => {
  const built = spawnSync(process.execPath, ['tools/art/verify-native-terrain.mjs'], { encoding: 'utf8', timeout: 120_000 })
  assert.equal(built.status, 0, built.stderr || built.stdout)
  assert.equal(tiles.length, 9)
  assert.equal(Math.max(...tiles.map(t => t.left + t.width)), PARCEL_WORLD.w)
  assert.equal(Math.max(...tiles.map(t => t.top + t.height)), PARCEL_WORLD.h)
  const old = await sharp('public/images/game/terrain/painted-town-v1/city.webp').resize(4758, 2976).png().toBuffer()
  let bytes = 0
  for (const tile of tiles) {
    const file = `public${tile.file}`, meta = await sharp(file).metadata()
    assert.equal(meta.width, tile.nativeWidth)
    assert.equal(meta.height, tile.nativeHeight)
    assert.equal(meta.width / tile.width, 1.5)
    assert.equal(meta.height / tile.height, 1.5)
    assert.ok(meta.width <= 2048 && meta.height <= 2048)
    bytes += meta.size ?? 0
    if (tile.top >= 1000) continue // Water has deliberately smooth areas.
    const [before, after] = await Promise.all([
      sharp(old).extract({ left: tile.left * 1.5, top: tile.top * 1.5, width: meta.width, height: meta.height }).raw().toBuffer({ resolveWithObject: true }),
      sharp(file).raw().toBuffer({ resolveWithObject: true }),
    ])
    const baseline = edgeEnergy(before.data, before.info.width, before.info.height, before.info.channels)
    const detailed = edgeEnergy(after.data, after.info.width, after.info.height, after.info.channels)
    assert.ok(detailed > baseline * 1.6, `${tile.id} regressed to enlarged soft art: ${detailed / baseline}`)
  }
  assert.ok(bytes < 12_000_000, 'terrain exceeds mobile transfer budget')
})

test('neighbouring detailed terrain textures agree in their shared world-space gutters', async () => {
  for (let row = 0; row < 3; row++) for (let col = 0; col < 3; col++) {
    const tile = tiles[row * 3 + col]
    for (const vertical of [false, true]) {
      if (vertical ? row === 2 : col === 2) continue
      const other = tiles[(row + (vertical ? 1 : 0)) * 3 + col + (vertical ? 0 : 1)]
      const a = vertical ? { left: 0, top: 990, width: 1590, height: 6 } : { left: 1584, top: 0, width: 6, height: 996 }
      const b = { ...a, left: 0, top: 0 }
      const [first, second] = await Promise.all([
        sharp(`public${tile.file}`).extract(a).raw().toBuffer(),
        sharp(`public${other.file}`).extract(b).raw().toBuffer(),
      ])
      let drift = 0
      for (let i = 0; i < first.length; i++) drift += Math.abs(first[i] - second[i])
      assert.ok(drift / first.length < 5, `Visible texture seam ${tile.id}/${other.id}: ${drift / first.length}`)
    }
  }
})
