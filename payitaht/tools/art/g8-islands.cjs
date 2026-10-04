/** Resize generated island cutouts without trimming: placement anchors stay fixed. */
const fs = require('node:fs/promises'), path = require('node:path'), sharp = require('sharp')
async function encode(source, width, height, maxBytes) {
  for (const quality of [76, 70, 64, 58, 52, 46, 40, 34, 28]) {
    const buf = await sharp(source).resize(width, height, { fit: 'fill' }).webp({ quality, alphaQuality: 20, effort: 6 }).toBuffer()
    if (buf.length <= maxBytes) return { buf, quality }
  }
  throw new Error('Image exceeds budget: ' + source)
}
async function main() {
  const sources = JSON.parse(await fs.readFile(process.argv[2], 'utf8')), report = []
  for (const s of sources) {
    if (!/^[a-z]+$/.test(s.id)) throw new Error('Invalid island ID')
    for (const [prefix, w, h, limit] of [['', 600, 800, 100000], ['map-', 160, 213, 9000]]) {
      const { buf, quality } = await encode(s.path, w, h, limit)
      const file = path.join('public/images/game/islands', prefix + s.id + '.webp')
      await fs.writeFile(file, buf)
      report.push({ id: prefix + s.id, width: w, height: h, bytes: buf.length, quality })
    }
  }
  await fs.writeFile('visual-review/G8/encoding.json', JSON.stringify(report, null, 2))
  console.log('16 island scenes and 16 matching thumbnails encoded')
}
main().catch(e => { console.error(e); process.exitCode = 1 })
