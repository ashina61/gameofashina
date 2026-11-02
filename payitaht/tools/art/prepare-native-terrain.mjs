/** Assemble imagegen detail crops in the unchanged calibrated terrain space.
 * Usage: node tools/art/prepare-native-terrain.mjs GEOMETRY.json GENERATED.json
 * Inputs are artist outputs; this tool only registers, blends and packages them.
 */
import fs from 'node:fs/promises'
import path from 'node:path'
import crypto from 'node:crypto'
import sharp from 'sharp'

const [geometryFile, generatedFile] = process.argv.slice(2)
if (!geometryFile || !generatedFile) throw Error('Expected crop geometry and generated-image paths')
const geometry = JSON.parse(await fs.readFile(geometryFile, 'utf8'))
const generated = JSON.parse(await fs.readFile(generatedFile, 'utf8'))
const scale = 3, width = 1586 * scale, height = 992 * scale, pad = 24 * scale
const channels = 3, pixels = width * height
const accum = new Float32Array(pixels * 3), weight = new Float32Array(pixels)
const sources = []
const clamp = n => Math.max(0, Math.min(1, n))
const hash = bytes => crypto.createHash('sha256').update(bytes).digest('hex')
for (const tile of geometry) {
  const file = generated[tile.id]
  if (!file) throw Error(`Missing detail crop ${tile.id}`)
  const input = await fs.readFile(file), meta = await sharp(input).metadata()
  if (meta.width < 1400 || Math.abs(meta.width / meta.height - tile.width / tile.height) > .02) throw Error(`Invalid native crop ${tile.id}`)
  const w = tile.width * scale, h = tile.height * scale
  const raw = await sharp(input).resize(w, h, { kernel: 'lanczos3', fit: 'fill' }).removeAlpha().raw().toBuffer()
  const x0 = tile.left * scale, y0 = tile.top * scale
  const left = tile.core.left * scale, top = tile.core.top * scale
  const right = left + tile.core.width * scale, bottom = top + tile.core.height * scale
  for (let y = 0; y < h; y++) {
    const gy = y0 + y, wy = (top ? clamp((gy + .5 - top + pad) / (2 * pad)) : 1) * (bottom < height ? clamp((bottom + pad - gy - .5) / (2 * pad)) : 1)
    for (let x = 0; x < w; x++) {
      const gx = x0 + x, wx = (left ? clamp((gx + .5 - left + pad) / (2 * pad)) : 1) * (right < width ? clamp((right + pad - gx - .5) / (2 * pad)) : 1)
      const a = wx * wy, at = gy * width + gx, src = (y * w + x) * channels
      weight[at] += a
      for (let c = 0; c < 3; c++) accum[at * 3 + c] += raw[src + c] * a
    }
  }
  sources.push({ id: tile.id, sha256: hash(input), width: meta.width, height: meta.height, region: tile })
}
const output = Buffer.allocUnsafe(pixels * channels)
for (let i = 0; i < pixels; i++) {
  if (weight[i] < .99) throw Error(`Uncovered terrain pixel ${i}`)
  for (let c = 0; c < 3; c++) output[i * 3 + c] = Math.round(accum[i * 3 + c] / weight[i])
}
const image = () => sharp(output, { raw: { width, height, channels } })
const out = 'public/images/game/terrain/painted-town-v2'
await fs.mkdir(out, { recursive: true })
const tiles = [], assets = []
for (let row = 0; row < 3; row++) for (let col = 0; col < 3; col++) {
  const id = `${row}-${col}`, left = col * 1056, top = row * 660
  const file = `${out}/${id}.webp`, nativeWidth = 1590, nativeHeight = 996
  await image().extract({ left: left * 1.5, top: top * 1.5, width: nativeWidth, height: nativeHeight })
    .webp({ quality: 95, effort: 6, smartSubsample: true }).toFile(file)
  tiles.push({ id, left, top, width: 1060, height: 664, nativeWidth, nativeHeight, file: `/images/game/terrain/painted-town-v2/${id}.webp` })
  const bytes = await fs.readFile(file)
  assets.push({ file, sha256: hash(bytes), bytes: bytes.length })
}
await fs.writeFile('lib/game/city-map/terrain-tiles.json', JSON.stringify(tiles, null, 2) + '\n')
await fs.writeFile('docs/native-terrain-provenance.json', JSON.stringify({ generator: 'built-in imagegen', nativeAtlas: { width, height }, world: { width: 3172, height: 1984 }, sources, assets }, null, 2) + '\n')
await image().resize(3172, 1984).webp({ quality: 94 }).toFile('public/images/game/terrain/painted-town-v1/city-crisp.webp')
await image().png().toFile(path.join(path.dirname(generatedFile), 'native-world.png'))
console.log(`Packaged ${tiles.length} detailed terrain textures, ${assets.reduce((n, a) => n + a.bytes, 0)} bytes; native atlas ${width}x${height}`)
