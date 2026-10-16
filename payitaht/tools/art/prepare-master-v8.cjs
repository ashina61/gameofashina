/** Package generated transparent sprites and measure their FINAL WebP alpha.
 * Usage: node tools/art/prepare-master-v8.cjs /absolute/path/manifest.json [master-vN]
 * Manifest: [{id, path}], one entry for each approved building. */
const fs = require('node:fs'), path = require('node:path'), sharp = require('sharp')
const root = path.resolve(__dirname, '../..')
const ids = new Set(['kisla', 'medrese', 'depo', 'carsi', 'hamam'])
function hull(points) {
  points.sort((a, b) => a[0] - b[0] || a[1] - b[1])
  const cross = (a, b, c) => (b[0]-a[0])*(c[1]-a[1]) - (b[1]-a[1])*(c[0]-a[0])
  const half = list => {
    const out = []
    for (const p of list) { while(out.length > 1 && cross(out.at(-2), out.at(-1), p) <= 0) out.pop(); out.push(p) }
    return out.slice(0, -1)
  }
  return [...half(points), ...half([...points].reverse())]
}
;(async () => {
  const input = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'))
  const recordsPath = path.join(root, 'lib/game/city-map/master-cutout-bounds.json')
  const records = JSON.parse(fs.readFileSync(recordsPath, 'utf8'))
  const version = process.argv[3] || 'master-v8'
  if (!/^master-v\d+$/.test(version)) throw Error('Invalid asset version')
  const dir = path.join(root, 'public/images/game/buildings', version)
  fs.mkdirSync(dir, { recursive: true })
  for (const {id, path: source} of input) {
    if (!ids.has(id)) throw Error('Unexpected building: ' + id)
    records[id] = {}
    // Generated alpha sometimes contains almost invisible isolated dust far
    // outside the silhouette. Remove only opacity < 8/255 before trimming;
    // otherwise those stray pixels incorrectly shrink the entire building.
    const decoded = await sharp(source).ensureAlpha().raw().toBuffer({resolveWithObject:true})
    for (let i=3;i<decoded.data.length;i+=4) if(decoded.data[i]<8) decoded.data[i]=0
    const cleaned = await sharp(decoded.data,{raw:{width:decoded.info.width,height:decoded.info.height,channels:4}})
      .trim({threshold:0}).png().toBuffer()
    for (const [suffix, width] of [['', 1024], ['-sm', 512]]) {
      const target = path.join(dir, `${id}${suffix}.webp`)
      let buffer
      for (const quality of [84, 72, 60, 48, 36]) {
        buffer = await sharp(cleaned).resize({width}).webp({quality, alphaQuality:100, effort:4}).toBuffer()
        if (buffer.length <= 200000) break
      }
      if (buffer.length > 200000) throw Error(id + ': sprite exceeds 200KB')
      fs.writeFileSync(target, buffer)
      const {data, info} = await sharp(buffer).ensureAlpha().raw().toBuffer({resolveWithObject:true})
      const points = []
      let transparent = 0
      for (let y = 0; y < info.height; y++) {
        let left = info.width, right = -1
        for (let x = 0; x < info.width; x++) {
          if (data[(y*info.width+x)*4+3]) { left=Math.min(left,x);right=x } else transparent++
        }
        if (right >= 0) for (const x of [left, right+1]) for (const yy of [y,y+1]) points.push([x/info.width, yy/info.height])
      }
      if (transparent < info.width * info.height * 0.1 || !points.length) throw Error(id+': missing true alpha')
      records[id][`${info.width}x${info.height}`] = hull(points)
      console.log(`${id}${suffix}: ${info.width}x${info.height}, ${buffer.length} bytes`)
    }
  }
  fs.writeFileSync(recordsPath, JSON.stringify(records, null, 2)+'\n')
})().catch(e => { console.error(e);process.exitCode=1 })
