/** Platform sizing of the three G11 painted source assets. */
const fs = require('node:fs/promises'), path = require('node:path'), sharp = require('sharp')
async function main() {
  const sources = JSON.parse(await fs.readFile(process.argv[2], 'utf8')), source = key => sources.find(s => s.key === key).path
  await sharp(source('title-background')).resize(600, 900).webp({ quality: 66, effort: 6 }).toFile('public/images/game/terrain/title-background.webp')
  await sharp(source('title-plaque')).resize(768, 256, { fit: 'contain', background: '#00000000' }).webp({ quality: 76, effort: 6 }).toFile('public/images/game/ui/title-plaque.webp')
  const png = { palette: true, colours: 128, compressionLevel: 9, effort: 10 }
  for (const [file, size] of [['icon-512.png', 512], ['icon-192.png', 192], ['apple-icon.png', 180], ['icon-dark-32x32.png', 32], ['icon-light-32x32.png', 32]]) await sharp(source('app-icon')).resize(size, size).png(png).toFile(`public/${file}`)
  const favicon = (await fs.readFile('public/icon-dark-32x32.png')).toString('base64')
  await fs.writeFile('public/icon.svg', `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><image href="data:image/png;base64,${favicon}" width="32" height="32"/></svg>\n`)
  const root = 'android/app/src/main/res', files = []
  for (const dir of await fs.readdir(root)) for (const file of await fs.readdir(path.join(root, dir)).catch(() => [])) if (/^(ic_launcher(?:_round|_foreground)?|splash)\.png$/.test(file)) {
    const target = path.join(root, dir, file), m = await sharp(target).metadata()
    const size = file === 'splash.png' ? Math.round(Math.min(m.width, m.height) * .28) : file.includes('foreground') ? Math.round(m.width * .66) : m.width
    const icon = await sharp(source('app-icon')).resize(size, size).png(png).toBuffer()
    if (file === 'splash.png' || file.includes('foreground')) await sharp({ create: { width: m.width, height: m.height, channels: 4, background: file === 'splash.png' ? '#102b29' : '#00000000' } }).composite([{ input: icon, gravity: 'centre' }]).png(png).toFile(target + '.tmp')
    else await sharp(icon).png(png).toFile(target + '.tmp')
    await fs.rename(target + '.tmp', target)
    files.push({ target, width: m.width, height: m.height, bytes: (await fs.stat(target)).size })
  }
  await fs.writeFile('visual-review/G11/platform-assets.json', JSON.stringify(files, null, 2))
  await fs.writeFile('android/app/src/main/res/drawable-v24/ic_launcher_foreground.xml', '<?xml version="1.0" encoding="utf-8"?>\n<bitmap xmlns:android="http://schemas.android.com/apk/res/android" android:src="@mipmap/ic_launcher_foreground" android:gravity="center" />\n')
  console.log(`${files.length} Android assets and eight web assets prepared`)
}
main().catch(e => { console.error(e); process.exitCode = 1 })
