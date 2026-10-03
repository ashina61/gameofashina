/*
 * V2 ÖLÇÜTLERİ (docs/v2-plani.md "V2 ne demek" tablosu) — kodla ölçülebilen
 * satırları ölçer ve hedefi aşanı hata sayar. Deploy işinde koşar; böylece
 * bir kez yeşile dönen ölçüt sessizce geri kırmızıya dönmez.
 *
 * Ölçülmeyenler: inceleme notları (görsel, oyun hissi, tutunma, UI kodu),
 * taşma/dokunma hedefi (layout-qa.cjs), açılış süresi ve QA süresi (Mobile
 * Visual QA işi).
 *
 *   node tools/v2-criteria.cjs
 */
const fs = require('node:fs')
const path = require('node:path')
const ROOT = path.join(__dirname, '..')

function walk(dir, out = []) {
  for (const e of fs.readdirSync(path.join(ROOT, dir), { withFileTypes: true })) {
    if (e.name === 'node_modules' || e.name.startsWith('.')) continue
    const p = path.join(dir, e.name)
    if (e.isDirectory()) walk(p, out)
    else out.push(p)
  }
  return out
}
const read = f => fs.readFileSync(path.join(ROOT, f), 'utf8')
const game = walk('components/game').filter(f => /\.tsx?$/.test(f))
// Uygulama kaynağı: oyunun kendisi (çizim üreten Python araçları ve test verisi hariç).
const source = ['app', 'components', 'hooks', 'lib'].flatMap(d => walk(d)).filter(f => /\.(tsx?|css)$/.test(f) && !f.includes('fixtures'))
const lines = f => read(f).split('\n').length
const largest = source.map(f => [f, lines(f)]).sort((a, b) => b[1] - a[1])[0]
const smBytes = walk('public').filter(f => /-painted-\d+-sm\.webp$/.test(f)).reduce((s, f) => s + fs.statSync(path.join(ROOT, f)).size, 0)

const rows = [
  ['Oyun ekranlarında Lucide çizgi ikon kullanan dosya', game.filter(f => read(f).includes("from 'lucide-react'")).length, 5],
  ['Oyun klasöründe shadcn <Button>', game.filter(f => read(f).includes("from '@/components/ui/button'")).length, 0],
  ['Oyun ekranlarındaki <table>', game.reduce((n, f) => n + (read(f).match(/<table[\s>]/g) || []).length, 0), 4],
  ['Telefonda indirilen bina görselleri (MB)', +(smBytes / 1048576).toFixed(1), 15],
  [`En büyük kaynak dosyası (${largest[0]})`, largest[1], 800],
]
let bad = 0
console.log('| Ölçüt | Bugün | Hedef |\n|---|---|---|')
for (const [name, value, max] of rows) {
  const ok = value <= max
  if (!ok) bad++
  console.log(`| ${name} | ${value} ${ok ? '✓' : '✗'} | ≤ ${max} |`)
}
if (bad) { console.log(`\n${bad} ölçüt hedefin dışında.`); process.exitCode = 1 }
