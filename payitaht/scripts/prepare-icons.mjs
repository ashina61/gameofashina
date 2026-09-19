import sharp from 'sharp'
import { mkdir } from 'node:fs/promises'
const icon = 'public/icon.svg'
for (const size of [192, 512]) await sharp(icon).resize(size).png().toFile(`public/icon-${size}.png`)
await sharp(icon).resize(1024).png().toFile('ios/App/App/Assets.xcassets/AppIcon.appiconset/AppIcon-512@2x.png')
for (const [density, size] of Object.entries({ mdpi:48, hdpi:72, xhdpi:96, xxhdpi:144, xxxhdpi:192 })) {
  const dir = `android/app/src/main/res/mipmap-${density}`
  await mkdir(dir, { recursive: true })
  for (const name of ['ic_launcher','ic_launcher_round']) await sharp(icon).resize(size).png().toFile(`${dir}/${name}.png`)
  await sharp(icon).resize(size * 2).png().toFile(`${dir}/ic_launcher_foreground.png`)
}
// Native launch screens use the same original vector seal as the web shell.
const seal = await sharp(icon).resize(420).png().toBuffer()
const splash = await sharp({create:{width:2732,height:2732,channels:3,background:'#142f2b'}}).composite([{input:seal,gravity:'centre'}]).png().toBuffer()
for(const suffix of ['','-1','-2']) await sharp(splash).toFile(`ios/App/App/Assets.xcassets/Splash.imageset/splash-2732x2732${suffix}.png`)
const { readdir } = await import('node:fs/promises')
for (const file of await readdir('android/app/src/main/res', { recursive:true })) {
  if (!file.endsWith('/splash.png')) continue
  const target = `android/app/src/main/res/${file}`
  const { width, height } = await sharp(target).metadata()
  const mark = await sharp(icon).resize(Math.round(Math.min(width,height)*.24)).png().toBuffer()
  const bytes = await sharp({create:{width,height,channels:3,background:'#142f2b'}}).composite([{input:mark,gravity:'centre'}]).png().toBuffer()
  await (await import('node:fs/promises')).writeFile(target,bytes)
}
