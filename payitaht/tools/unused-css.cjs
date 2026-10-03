/*
 * KULLANILMAYAN CSS SINIFLARI (V2 Faz 7.3) — app/globals.css ve app/styles/
 * altındaki her sınıf seçicinin (.ad) koddan anılıp anılmadığını denetler.
 * Kod: components/, app/, lib/, hooks/ altındaki .ts/.tsx dosyaları.
 *
 * Bir sınıf "anılıyor" sayılır, eğer
 *   - adı bir kelime olarak geçiyorsa (className, cn(...), querySelector), ya da
 *   - bir ön eki şablonla kuruluyorsa: `ika-chip-${x}` → ika-chip-dolu da sayılır.
 *
 *   node tools/unused-css.cjs          rapor (her zaman çıkış 0)
 *   node tools/unused-css.cjs --strict kullanılmayan varsa çıkış 1 (CI)
 */
const fs = require('node:fs')
const path = require('node:path')
const ROOT = path.join(__dirname, '..')
const strict = process.argv.includes('--strict')

const cssFiles = ['app/globals.css', ...fs.readdirSync(path.join(ROOT, 'app/styles')).filter(f => f.endsWith('.css')).sort().map(f => `app/styles/${f}`)]
// Tailwind ve shadcn'in kendi sınıfları ile tarayıcı/kitaplık durum sınıfları raporlanmaz.
const IGNORE = /^(dark|sr-only|not-sr-only|group|peer)$/

function walk(dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (e.name === 'node_modules' || e.name.startsWith('.')) continue
    const p = path.join(dir, e.name)
    if (e.isDirectory()) walk(p, out)
    else if (/\.(tsx?|mjs|cjs|js)$/.test(e.name) && !/\.test\./.test(e.name)) out.push(p)
  }
  return out
}
const code = ['components', 'app', 'lib', 'hooks'].flatMap(d => walk(path.join(ROOT, d))).map(f => fs.readFileSync(f, 'utf8')).join('\n')
const words = new Set(code.match(/[A-Za-z0-9_-]+/g))
// Şablonla kurulan ön ekler: `foo-bar-${...}` ya da 'foo-bar-' + x
const prefixes = [...code.matchAll(/([A-Za-z][A-Za-z0-9_-]*-)(?:\$\{|['"]\s*\+)/g)].map(m => m[1])

const found = new Map()
for (const file of cssFiles) {
  const css = fs.readFileSync(path.join(ROOT, file), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')
  // Yalnız seçici kısımları (süslü paranteze kadar) taranır; url(...) ve değerler dışarıda kalır.
  for (const m of css.matchAll(/([^{}]+)\{/g)) {
    const sel = m[1]
    if (/^\s*@/.test(sel) || /:\s*[^,]*;/.test(sel)) continue
    for (const c of sel.matchAll(/\.(-?[A-Za-z_][A-Za-z0-9_-]*)/g)) {
      const name = c[1]
      if (IGNORE.test(name) || /^\d/.test(name)) continue
      if (!found.has(name)) found.set(name, file)
    }
  }
}
const unused = [...found].filter(([name]) => !words.has(name) && !prefixes.some(p => name.startsWith(p)))
console.log(`${found.size} sınıf, kullanılmayan ${unused.length}`)
for (const [name, file] of unused) console.log(`  .${name}  (${file})`)
if (strict && unused.length) process.exitCode = 1
