/** Normalize ImageGen G4 outputs; source PNGs stay outside the repository. */
const fs = require('node:fs')
const path = require('node:path')
const sharp = require('sharp')
async function main() {
  const generated = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'))
  for (const s of generated) {
    let image = sharp(s.path)
    if (s.id === 'hills') image = image.resize({ width: 1024 })
    else if (s.group === 'terrain') image = image.resize(512, 512)
    else image = image.trim({ threshold: 16 }).resize({ width: 512, height: 512, fit: 'inside' })
    const source = await image.png().toBuffer(), limit = s.group === 'terrain' ? 150000 : 60000
    let buffer
    for (const quality of [82, 76, 70, 64, 58, 50, 42]) {
      buffer = await sharp(source).webp({ quality, alphaQuality: 70, effort: 6 }).toBuffer()
      if (buffer.length <= limit) break
    }
    if (buffer.length > limit) throw new Error(`${s.id} exceeds ${limit} bytes`)
    const dest = path.join('public/images/game', s.group, `${s.id}.webp`)
    fs.writeFileSync(dest, buffer)
    console.log(`${s.group}/${s.id}: ${buffer.length} bytes`)
  }
}
main().catch(e => { console.error(e); process.exitCode = 1 })
