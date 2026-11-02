/** Validate actual detailed production textures; never upscale the old map.
 * The flat world-size file is retained solely for existing native review tools.
 * The game loads higher-density, tracked v2 tiles directly.
 */
import sharp from 'sharp'
import { readFile } from 'node:fs/promises'
import crypto from 'node:crypto'

const tiles = JSON.parse(await readFile('lib/game/city-map/terrain-tiles.json', 'utf8'))
const provenance = JSON.parse(await readFile('docs/native-terrain-provenance.json', 'utf8'))
const layers = [], xs = [0, 1587, 3171], ys = [0, 993, 1983], widths = [1587, 1584, 1587], heights = [993, 990, 993]
let bytes = 0
for (const [index, tile] of tiles.entries()) {
  const file = `public${tile.file}`, input = await readFile(file), meta = await sharp(input).metadata()
  const expected = provenance.assets.find(a => a.file === file)
  if (meta.width !== tile.nativeWidth || meta.height !== tile.nativeHeight || meta.width <= tile.width) throw Error(`Low-resolution terrain: ${file}`)
  if (crypto.createHash('sha256').update(input).digest('hex') !== expected?.sha256) throw Error(`Unverified terrain: ${file}`)
  bytes += input.length
  const col = index % 3, row = Math.floor(index / 3)
  const cropped = await sharp(input).extract({ left: col ? 3 : 0, top: row ? 3 : 0, width: widths[col], height: heights[row] }).png().toBuffer()
  layers.push({ input: cropped, left: xs[col], top: ys[row] })
}
if (tiles.length !== 9 || bytes > 12_000_000) throw Error('Invalid terrain tile count or transfer budget')
const atlas = await sharp({ create: { width: 4758, height: 2976, channels: 3, background: '#948656' } }).composite(layers).png().toBuffer()
await sharp(atlas).resize(3172, 1984).webp({ quality: 94 }).toFile('public/images/game/terrain/painted-town-v1/city-crisp.webp')
console.log(`Verified nine native detail textures: 4758x2976 in 3172x1984 world, ${bytes} bytes`)
