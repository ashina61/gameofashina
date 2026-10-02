/*
 * ARAYÜZ İKON VERİSİ (V2 Faz 1.3) — oyun bileşenlerinin kullandığı ikonların
 * çizgi geometrisini Lucide paketinden okuyup depoya yazar:
 *
 *   node tools/art/ui-icons.mjs
 *
 * Çıktı: components/game/ui-icon-data.ts. Boyalı görünüş (mürekkep kontur,
 * renkli gövde, parlama) ui-art.tsx'te verilir; çalışma anında Lucide
 * kullanılmaz. Hangi ikonların gerektiği, components/game altındaki
 * `from './ui-art'` (ve kalan `from 'lucide-react'`) importlarından bulunur.
 * Lucide geometrisi ISC lisanslıdır (Copyright (c) Lucide Contributors).
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..')
const LUCIDE = path.join(ROOT, 'node_modules', 'lucide-react', 'dist', 'esm')
const GAME = path.join(ROOT, 'components', 'game')
const OUT = path.join(GAME, 'ui-icon-data.ts')
// İleride gerekecekler de (henüz import edilmeyenler) burada tutulabilir.
const EXTRA = []

const index = fs.readFileSync(path.join(LUCIDE, 'lucide-react.mjs'), 'utf8')
const fileOf = new Map()
for (const m of index.matchAll(/export \{([^}]*)\} from '\.\/icons\/([a-z0-9-]+)\.mjs'/g)) {
  for (const part of m[1].split(',')) {
    const alias = part.trim().replace(/^default as /, '')
    if (alias) fileOf.set(alias, m[2])
  }
}

const wanted = new Set(EXTRA)
for (const f of fs.readdirSync(GAME).filter(f => /\.tsx?$/.test(f) && f !== 'ui-art.tsx' && f !== 'ui-icon-data.ts')) {
  const src = fs.readFileSync(path.join(GAME, f), 'utf8')
  for (const m of src.matchAll(/import\s*\{([^}]*)\}\s*from\s*'(?:lucide-react|\.\/ui-art)'/g)) {
    for (const n of m[1].split(',').map(s => s.trim().split(/\s+as\s+/)[0]).filter(Boolean)) {
      if (n !== 'type' && /^[A-Z]/.test(n)) wanted.add(n)
    }
  }
}

const data = {}
for (const name of [...wanted].sort()) {
  const file = fileOf.get(name)
  if (!file) throw new Error(`Lucide'de yok: ${name}`)
  const src = fs.readFileSync(path.join(LUCIDE, 'icons', `${file}.mjs`), 'utf8')
  const arr = src.match(/const __iconNode = (\[[\s\S]*?\]);\n/)
  if (!arr) throw new Error(`geometri okunamadı: ${name}`)
  const node = Function(`return ${arr[1]}`)()
  data[name] = node.map(([tag, attrs]) => { const { key, ...rest } = attrs; return [tag, rest] })
}

const body = Object.entries(data).map(([name, node]) => `  ${name}: ${JSON.stringify(node)},`).join('\n')
fs.writeFileSync(OUT, `/* Üretildi: node tools/art/ui-icons.mjs — elle değiştirme.
 * Lucide ikon geometrisi (ISC lisansı, Copyright (c) Lucide Contributors). */
export type IconNode = [string, Record<string, string>][]

export const ICON_DATA = {
${body}
} satisfies Record<string, IconNode>

export type IconName = keyof typeof ICON_DATA
`)
console.log(`yazıldı ${path.relative(ROOT, OUT)}: ${Object.keys(data).length} ikon`)
