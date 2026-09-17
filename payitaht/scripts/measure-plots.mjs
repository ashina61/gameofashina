/**
 * ARSALARI RESİMDEN ÖLÇER.
 *
 * Ikariam ve Travian'da sehir tek bir BOYALI MANZARADIR ve arsalar o
 * manzaraya elle serpilmis, duzensiz duran temizlenmis alanlardir - bir
 * izgara degil. Onlari koddan uretmeye calismak, sehri bos bir arsaya
 * cevirdi. Dogru yol tersi: ressam arsalari koysun, KOD ONLARI OLCSUN.
 *
 * Bu betik arkaplandaki acik kum/cakil lekelerini bulur, birbirine bagli
 * olanlari birlestirir ve her birinin merkezini yuzde olarak yazar.
 *
 *   node scripts/measure-plots.mjs public/images/game/island.png
 */
import { readFileSync, writeFileSync } from 'node:fs'
import sharp from 'sharp'

const file = process.argv[2]
if (!file) { console.error('kullanim: node scripts/measure-plots.mjs <resim>'); process.exit(1) }

const image = sharp(file).removeAlpha()
const { width, height } = await image.metadata()
const raw = await image.raw().toBuffer()

/*
 * ARSA RENGI: PARLAK, sicak kum.
 *
 * Esikler ilk adadan olculdu: arsalar rgb(216-243, 182-212, 119-157), yani
 * yoldan (154,136,88) ve cimenden (98,91,49) belirgin sekilde acik. Kiremit
 * catidan ise kirmizi-yesil farkiyla ayrilir: catida bu fark cok daha buyuk.
 */
const isPlot = (r, g, b) =>
  r > 198 && g > 168 && b > 100 && r - g > 16 && r - g < 48 && r - b > 55 && r - b < 125

const mask = new Uint8Array(width * height)
for (let i = 0; i < width * height; i++) {
  const r = raw[i * 3], g = raw[i * 3 + 1], b = raw[i * 3 + 2]
  if (isPlot(r, g, b)) mask[i] = 1
}

// Bagli bilesenler; kucuk lekeler (cakil, isik) elenir.
const seen = new Uint8Array(width * height)
const blobs = []
const queue = new Int32Array(width * height)
for (let start = 0; start < mask.length; start++) {
  if (!mask[start] || seen[start]) continue
  let head = 0, tail = 0
  queue[tail++] = start; seen[start] = 1
  let minX = width, maxX = 0, minY = height, maxY = 0, count = 0, sumX = 0, sumY = 0
  while (head < tail) {
    const p = queue[head++]
    const x = p % width, y = (p / width) | 0
    count++; sumX += x; sumY += y
    if (x < minX) minX = x; if (x > maxX) maxX = x
    if (y < minY) minY = y; if (y > maxY) maxY = y
    const neighbours = [p - 1, p + 1, p - width, p + width]
    for (const n of neighbours) {
      if (n < 0 || n >= mask.length || seen[n] || !mask[n]) continue
      if ((n === p - 1 && x === 0) || (n === p + 1 && x === width - 1)) continue
      seen[n] = 1; queue[tail++] = n
    }
  }
  const w = maxX - minX + 1, h = maxY - minY + 1
  // Bir arsa: yeterince buyuk, asiri uzun degil, kutusunu makul dolduruyor.
  const fill = count / (w * h)
  if (count < width * height * 0.0012) continue
  if (w / h > 4 || h / w > 4) continue
  if (fill < 0.35) continue
  blobs.push({ x: +(sumX / count / width * 100).toFixed(1), y: +(sumY / count / height * 100).toFixed(1), w: +(w / width * 100).toFixed(1), h: +(h / height * 100).toFixed(1), px: count })
}

blobs.sort((a, b) => a.y - b.y || a.x - b.x)
console.log(`${file}  ${width}x${height}`)
console.log(`bulunan arsa: ${blobs.length}`)
for (const [i, b] of blobs.entries()) {
  console.log(`  ${String(i).padStart(2)}  merkez %${b.x} , %${b.y}   olcu %${b.w} x %${b.h}   ${b.px} px`)
}
if (blobs.length) {
  const ws = blobs.map(b => b.w).sort((a, b) => a - b)
  console.log(`arsa genisligi ortanca: %${ws[ws.length >> 1]}`)
}
/*
 * Bolge, arsanin RESIMDEKI YUKSEKLIGINDEN turer: en asagidakiler limanin
 * rihtimindedir. Esik bir tahmin, dogrusu gozle dogrulanir - uretilen dosya
 * elle duzeltilebilir ve bir dahaki olcumde ustune yazilmaz diye uyarilir.
 */
const QUAY_FROM = Number(process.argv[4] ?? 74)
const out = process.argv[3]
if (out) {
  const lines = blobs.map(b => `  { x: ${b.x}, y: ${b.y}, zone: '${b.y >= QUAY_FROM ? 'liman' : 'sehir'}' },`)
  writeFileSync(out, `/**
 * ÖLÇÜLMÜŞ ARSALAR - elle yazilmaz, uretilir.
 *
 *   node scripts/measure-plots.mjs <resim> ${out}
 *
 * Kaynak: ${file} (${width}x${height})
 * Bulunan: ${blobs.length} arsa
 */
import type { Zone } from './layout'

export const MEASURED: { x: number; y: number; zone: Zone }[] = [
${lines.join('\n')}
]
`)
  console.log(`yazildi: ${out}`)
}
