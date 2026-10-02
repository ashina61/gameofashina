/*
 * GÖRSEL FARK (V2 Faz 0.5) — iki klasördeki aynı adlı ekran görüntülerini
 * piksel piksel karşılaştırır. %2'den fazla değişen görüntü için GitHub
 * uyarısı yazar ve visual-review/diff-*.png üretir (değişen yerler kırmızı).
 * Hata vermez: bilinçli tasarım değişikliği de "değişti" görünür.
 *
 *   node tools/visual-diff.cjs <önceki-klasör> <yeni-klasör>
 *
 * Canlı şehir sahnesi (yürüyen halk, dalgalı bayrak, gerçek saate bağlı gök)
 * her koşuda biraz değişir; bu yüzden yalnız sayfa (ui-*), başlık ve kuşatma
 * görüntüleri karşılaştırılır.
 */
const fs = require('node:fs/promises')
const path = require('node:path')
const { chromium } = require('playwright')

const LIMIT = 0.02
const COMPARE = /^(ui-|title-|siege-|heraldry-)/

async function main() {
  const [prevDir, nextDir] = process.argv.slice(2)
  if (!prevDir || !nextDir) throw new Error('kullanım: visual-diff.cjs <önceki> <yeni>')
  const prev = await fs.readdir(prevDir).catch(() => [])
  if (!prev.length) { console.log('Önceki görüntü yok; karşılaştırma atlandı.'); return }
  const names = (await fs.readdir(nextDir)).filter(n => n.endsWith('.png') && COMPARE.test(n) && prev.includes(n))
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] })
  const page = await browser.newPage()
  const rows = []
  try {
    for (const name of names) {
      const [a, b] = await Promise.all([fs.readFile(path.join(prevDir, name)), fs.readFile(path.join(nextDir, name))])
      const result = await page.evaluate(async ([a64, b64]) => {
        const load = src => new Promise((ok, bad) => { const i = new Image(); i.onload = () => ok(i); i.onerror = bad; i.src = 'data:image/png;base64,' + src })
        const [ia, ib] = await Promise.all([load(a64), load(b64)])
        if (ia.width !== ib.width || ia.height !== ib.height) return { ratio: 1, size: `${ia.width}×${ia.height} → ${ib.width}×${ib.height}` }
        const c = document.createElement('canvas'); c.width = ib.width; c.height = ib.height
        const g = c.getContext('2d', { willReadFrequently: true })
        g.drawImage(ia, 0, 0); const da = g.getImageData(0, 0, c.width, c.height).data
        g.drawImage(ib, 0, 0); const img = g.getImageData(0, 0, c.width, c.height); const db = img.data
        let changed = 0
        for (let i = 0; i < db.length; i += 4) {
          // Küçük renk oynamaları (yazı yumuşatma, sıkıştırma) sayılmaz.
          const d = Math.abs(da[i] - db[i]) + Math.abs(da[i + 1] - db[i + 1]) + Math.abs(da[i + 2] - db[i + 2])
          if (d > 48) { changed++; db[i] = 230; db[i + 1] = 30; db[i + 2] = 30; db[i + 3] = 255 } else db[i + 3] = 70
        }
        g.putImageData(img, 0, 0)
        return { ratio: changed / (c.width * c.height), png: c.toDataURL('image/png').split(',')[1] }
      }, [a.toString('base64'), b.toString('base64')])
      if (result.png && result.ratio > LIMIT) await fs.writeFile(path.join(nextDir, `diff-${name}`), Buffer.from(result.png, 'base64'))
      rows.push({ name, ratio: result.ratio, size: result.size })
    }
  } finally {
    await browser.close()
  }
  const lines = ['### Görsel fark (önceki yeşil koşuya göre)', '', '| Görüntü | Değişen piksel |', '|---|---|']
  for (const r of rows.sort((x, y) => y.ratio - x.ratio)) {
    const pct = (r.ratio * 100).toFixed(1).replace('.', ',')
    lines.push(`| ${r.name} | ${r.size ?? `%${pct}`}${r.ratio > LIMIT ? ' ⚠' : ''} |`)
    if (r.ratio > LIMIT) console.log(`::warning title=Görsel fark::${r.name} %${pct} değişti (diff-${r.name})`)
  }
  if (!rows.length) lines.push('| — | karşılaştırılacak ortak görüntü yok |')
  console.log(lines.join('\n'))
  if (process.env.GITHUB_STEP_SUMMARY) await fs.appendFile(process.env.GITHUB_STEP_SUMMARY, lines.join('\n') + '\n')
}

main().catch(e => { console.error(e); process.exitCode = 1 })
