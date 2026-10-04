/** Preserve every target canvas; only the generated coffee theme replaces pixels. */
const fs = require('node:fs/promises'), path = require('node:path'), sharp = require('sharp'), assert = require('node:assert/strict')
async function bounds(input) {
  const { data, info } = await sharp(input).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
  let left = info.width, right = 0, top = info.height, bottom = 0, area = 0
  for (let y = 0; y < info.height; y++) for (let x = 0; x < info.width; x++) if (data[(y * info.width + x) * 4 + 3] > 50) {
    left = Math.min(left, x); right = Math.max(right, x); top = Math.min(top, y); bottom = Math.max(bottom, y); area++
  }
  return { left, right, top, bottom, area }
}
async function main() {
  const sources = JSON.parse(await fs.readFile(process.argv[2], 'utf8')), report = []
  for (const s of sources) {
    const file = path.join('public/images/game/buildings', `${s.id}-painted-${s.stage}.webp`)
    const m = await sharp(file).metadata(), original = await bounds(file), sourceMeta = await sharp(s.path).metadata()
    assert.ok(sourceMeta.hasAlpha)
    const buf = await sharp(s.path).resize(m.width, m.height, { fit: 'fill' }).webp({ quality: 82, effort: 6 }).toBuffer(), after = await bounds(buf)
    for (const k of ['left', 'right']) assert.ok(Math.abs(after[k] - original[k]) < m.width * .04, `${file}: ${k} moved`)
    for (const k of ['top', 'bottom']) assert.ok(Math.abs(after[k] - original[k]) < m.height * .04, `${file}: ${k} moved`)
    assert.ok(after.area / original.area > .8 && after.area / original.area < 1.25, `${file}: silhouette scale changed`)
    await fs.writeFile(file, buf)
    let small, quality
    for (quality of [72, 64, 56, 48, 40]) {
      small = await sharp(buf).resize(Math.round(m.width / 2), Math.round(m.height / 2)).webp({ quality, effort: 6 }).toBuffer()
      if (small.length < 90000) break
    }
    assert.ok(small.length < 90000)
    await fs.writeFile(file.replace('.webp', '-sm.webp'), small)
    report.push({ file, width: m.width, height: m.height, original, after, areaRatio: after.area / original.area, phoneBytes: small.length, phoneQuality: quality })
  }
  await fs.writeFile('visual-review/G10/coffee-geometry.json', JSON.stringify(report, null, 2))
  console.log('Six coffee canvases: dimensions, bounds and silhouette scale passed')
}
main().catch(e => { console.error(e); process.exitCode = 1 })
