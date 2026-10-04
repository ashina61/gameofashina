/** Pack generated atlas textures into deterministic 160 px cells, preserving alpha. */
const fs = require('node:fs/promises'), path = require('node:path'), sharp = require('sharp'), assert = require('node:assert/strict')
const SETTINGS = {
  'research-ekonomi': ['research/ekonomi.webp', 5, 4, 35000],
  'research-bilim': ['research/bilim.webp', 5, 4, 35000],
  'research-askeri': ['research/askeri.webp', 4, 4, 35000],
  'research-denizcilik': ['research/denizcilik.webp', 5, 4, 35000],
  'research-mitoloji-alpha': ['research/mitoloji.webp', 3, 2, 20000],
  'portraits-gods': ['portraits/gods.webp', 4, 2, 30000],
  'portraits-rivals': ['portraits/rivals.webp', 4, 4, 45000],
  'culture-emblems': ['culture/emblems.webp', 4, 5, 35000],
  wonders: ['culture/wonders.webp', 4, 2, 25000],
  medals: ['medals/achievements.webp', 6, 5, 50000],
  'battle-land': ['terrain/battle-land.webp', 1, 1, 35000],
  'battle-sea': ['terrain/battle-sea.webp', 1, 1, 35000],
}
async function main() {
  const sources = JSON.parse(await fs.readFile(process.argv[2], 'utf8')), report = []
  for (const [key, [file, cols, rows, limit]] of Object.entries(SETTINGS)) {
    const source = sources.find(s => s.key === key)
    assert.ok(source, `Missing source: ${key}`)
    const battle = key.startsWith('battle-')
    const input = battle ? await sharp(source.path).resize(768, 432, { fit: 'cover' }).png().toBuffer() : await sharp(source.path).trim({ threshold: 20 }).png().toBuffer()
    const meta = await sharp(input).metadata()
    if (!battle) assert.ok(meta.hasAlpha, `${key}: no alpha`)
    const layers = []
    if (!battle) for (let i = 0; i < cols * rows; i++) {
      const x = Math.round(i % cols * meta.width / cols), y = Math.round(Math.floor(i / cols) * meta.height / rows)
      const width = Math.round((i % cols + 1) * meta.width / cols) - x
      const height = Math.round((Math.floor(i / cols) + 1) * meta.height / rows) - y
      layers.push({ input: await sharp(input).extract({ left: x, top: y, width, height }).resize(148, 148, { fit: 'contain', background: '#00000000' }).extend({ top: 6, bottom: 6, left: 6, right: 6, background: '#00000000' }).png().toBuffer(), left: i % cols * 160, top: Math.floor(i / cols) * 160 })
    }
    const packed = battle ? input : await sharp({ create: { width: cols * 160, height: rows * 160, channels: 4, background: '#00000000' } }).composite(layers).png().toBuffer()
    let buf, quality
    for (quality of [82, 76, 70, 64, 58, 52, 46, 40, 34, 28, 22]) {
      buf = await sharp(packed).resize(battle ? 640 : cols * 96, battle ? 360 : rows * 96).webp({ quality, alphaQuality: 20, effort: 6 }).toBuffer()
      if (buf.length <= limit) break
    }
    assert.ok(buf.length <= limit, `${key}: size ${buf.length}/${limit}`)
    const output = path.join('public/images/game', file)
    await fs.mkdir(path.dirname(output), { recursive: true }); await fs.writeFile(output, buf)
    report.push({ key, file, cols, rows, quality, bytes: buf.length })
  }
  await fs.writeFile('visual-review/G9/encoding.json', JSON.stringify(report, null, 2))
  console.log(report.map(r => `${r.key}: ${r.bytes} bytes q${r.quality}`).join('\n'))
}
main().catch(e => { console.error(e); process.exitCode = 1 })
