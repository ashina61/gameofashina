const fs = require('node:fs/promises')
const sharp = require('sharp')

/** Approval evidence must stay below 200 KB; PNG exists only in memory. */
async function reviewWebp(input, output) {
  for (const quality of [82, 76, 70, 64, 58, 50, 42]) {
    const buffer = await sharp(input).webp({ quality, effort: 6 }).toBuffer()
    if (buffer.length <= 200000) { await fs.writeFile(output, buffer); return }
  }
  throw new Error(`Review screenshot exceeds 200 KB: ${output}`)
}
module.exports = { reviewWebp }
