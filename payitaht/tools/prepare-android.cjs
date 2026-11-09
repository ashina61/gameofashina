const fs = require('node:fs')
const path = require('node:path')

/** Prune only an explicitly native export, after validating every replacement. */
function prepareAndroidExport(directory = path.resolve('out')) {
  const root = fs.realpathSync(directory)
  const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8')
  if (!/<meta name="payitaht-platform" content="android"\s*\/?\s*>/.test(html)) {
    throw new Error('Refusing to prune a non-Android export. Build with NEXT_PUBLIC_NATIVE=1.')
  }
  const buildings = path.join(root, 'images/game/buildings')
  const candidates = fs.readdirSync(buildings).filter(name => /-painted-[123]\.webp$/.test(name))
  for (const name of candidates) {
    const phone = path.join(buildings, name.replace('.webp', '-sm.webp'))
    if (!fs.existsSync(phone) || fs.statSync(phone).size === 0) {
      throw new Error(`Missing Android building counterpart: ${path.basename(phone)}`)
    }
  }
  let bytes = 0
  for (const name of candidates) {
    const full = path.join(buildings, name)
    bytes += fs.statSync(full).size
    fs.unlinkSync(full)
  }
  return { removed: candidates.length, bytes }
}

module.exports = { prepareAndroidExport }
if (require.main === module) {
  const result = prepareAndroidExport()
  console.log(`Android export: removed ${result.removed} full-size building images (${(result.bytes / 1024 / 1024).toFixed(2)} MiB). Phone and parcel images retained.`)
}
