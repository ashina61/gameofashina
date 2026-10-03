/*
 * CSS RENK DENETİMİ (V2 Faz 1.1) — app/globals.css ve app/styles/*.css'te
 * (Faz 7.3'te bölünen stiller) aynı 6 haneli renk 5 ya
 * da daha çok kez geçiyorsa hata verir: o renk app/tokens.css'te bir
 * belirteç olmalı (var(--c-…)).
 *
 *   node tools/css-lint.cjs
 */
const fs = require('node:fs')
const path = require('node:path')
const LIMIT = 5
const app = path.join(__dirname, '..', 'app')
const files = ['globals.css', ...fs.readdirSync(path.join(app, 'styles')).filter(f => f.endsWith('.css')).sort().map(f => `styles/${f}`)]
const css = files.map(f => fs.readFileSync(path.join(app, f), 'utf8')).join('\n')
const count = new Map()
for (const m of css.matchAll(/#[0-9a-fA-F]{6}(?![0-9a-fA-F])/g)) { const k = m[0].toLowerCase(); count.set(k, (count.get(k) || 0) + 1) }
const bad = [...count].filter(([, n]) => n >= LIMIT).sort((a, b) => b[1] - a[1])
const vars = (css.match(/var\(--c-[a-z0-9-]+\)/g) || []).length
console.log(`${files.length} stil dosyası: ${count.size} farklı renk, ${vars} belirteç kullanımı`)
if (bad.length) {
  for (const [c, n] of bad) console.log(`  ${c} ×${n} → app/tokens.css'e belirteç olarak taşı`)
  process.exitCode = 1
}
