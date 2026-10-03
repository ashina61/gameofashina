#!/usr/bin/env node
/**
 * KULLANILMAYAN GÖRSELLER (V2 Faz 6.5) — public/ altındaki her görselin
 * koddan anılıp anılmadığını raporlar. APK'ye boşuna giren dosyaları bulur.
 *
 * Bir dosya "anılıyor" sayılır:
 *   1. adı (uzantısız) kodda geçiyorsa (ör. 'cypress-b', 'tower-round');
 *   2. ya da kod onu şablonla kuruyorsa: `npc-${...}` (ön ek + şablon),
 *      `${id}-painted-${...}` (boyalı bina) ya da `islands/${...}` (klasör +
 *      şablon) ve değişken kısım kodda tırnaklı bir ad olarak geçiyorsa.
 *
 * Varsayılan olarak yalnız uyarır (CI'da ::warning::). --strict ile
 * kullanılmayan dosya varsa 1 döner.
 */
const fs = require('node:fs')
const path = require('node:path')

const ROOT = path.resolve(__dirname, '..')
const ASSET_DIR = path.join(ROOT, 'public')
const CODE_DIRS = ['app', 'components', 'lib', 'hooks'].map(d => path.join(ROOT, d))
const CODE_FILES = [path.join(ROOT, 'public', 'sw.js'), path.join(ROOT, 'next.config.mjs'), path.join(ROOT, 'capacitor.config.ts')]
const ASSET_EXT = /\.(webp|png|jpe?g|svg|gif|mp3|ogg|wav)$/i
// Tarayıcı ve mağaza simgeleri dosya adıyla değil sözleşmeyle aranır.
const ALWAYS = new Set(['apple-icon.png', 'icon.svg', 'icon-192.png', 'icon-512.png', 'icon-dark-32x32.png', 'icon-light-32x32.png'])

const walk = (dir, out = []) => {
  if (!fs.existsSync(dir)) return out
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name)
    if (e.isDirectory()) walk(p, out)
    else out.push(p)
  }
  return out
}

function codeText() {
  const files = [...CODE_DIRS.flatMap(d => walk(d)), ...CODE_FILES]
    .filter(f => fs.existsSync(f) && /\.(tsx?|jsx?|mjs|cjs|css|json)$/.test(f) && !/\.test\.ts$/.test(f))
  return files.map(f => fs.readFileSync(f, 'utf8')).join('\n')
}

/** Kodda tırnak içinde geçen kimlikler ('ambar', "zeytin", `kizil`). */
function quotedNames(code) {
  const out = new Set()
  for (const m of code.matchAll(/['"`]([a-z0-9_-]{2,40})['"`]/g)) out.add(m[1])
  for (const m of code.matchAll(/\b([a-z0-9_]{2,40})\s*:/g)) out.add(m[1])
  return out
}

function isUsed(rel, code, names) {
  const base = path.basename(rel)
  if (ALWAYS.has(base)) return true
  const stem = base.replace(ASSET_EXT, '')
  if (code.includes(stem)) return true
  const dir = path.dirname(rel).split(path.sep).pop()
  // Boyalı bina: `${id}-painted-${stage}` (+ telefon boyu -sm).
  const painted = stem.match(/^(.+?)-painted-\d(?:-sm)?$/)
  if (painted && code.includes('-painted-${')) return names.has(painted[1].replace(/-duz$/, ''))
  // Ön ek + şablon: `npc-${kind}`, `mine-${lux}`, `map-${id}`, `surlar-${n}`.
  for (let i = stem.indexOf('-'); i > 0; i = stem.indexOf('-', i + 1)) {
    const prefix = stem.slice(0, i + 1), rest = stem.slice(i + 1)
    if (code.includes(prefix + '${') && (names.has(rest) || /^\d+$/.test(rest))) return true
  }
  // Klasör + şablon: `islands/${id}.webp`.
  if (code.includes(`${dir}/\${`) && names.has(stem)) return true
  return false
}

function main() {
  const code = codeText()
  const names = quotedNames(code)
  const files = walk(ASSET_DIR).filter(f => ASSET_EXT.test(f))
  const unused = files.map(f => path.relative(ASSET_DIR, f)).filter(rel => !isUsed(rel, code, names))
  const bytes = unused.reduce((s, rel) => s + fs.statSync(path.join(ASSET_DIR, rel)).size, 0)
  const total = files.reduce((s, f) => s + fs.statSync(f).size, 0)
  console.log(`${files.length} görsel · ${(total / 1e6).toFixed(1)} MB · kullanılmayan ${unused.length} (${(bytes / 1e6).toFixed(2)} MB)`)
  for (const rel of unused) {
    const msg = `public/${rel} koddan anılmıyor (${Math.round(fs.statSync(path.join(ASSET_DIR, rel)).size / 1024)} KB)`
    console.log(process.env.GITHUB_ACTIONS ? `::warning file=payitaht/public/${rel}::${msg}` : `  ${msg}`)
  }
  if (process.argv.includes('--strict') && unused.length) process.exitCode = 1
}

if (require.main === module) main()
module.exports = { isUsed, quotedNames }
