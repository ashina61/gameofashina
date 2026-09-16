import sharp from 'sharp'

const root = new URL('../public/images/game/', import.meta.url)
const ids = ['divan', 'konut', 'kereste', 'tas', 'ambar', 'medrese']

/*
 * SPRITE SAYFASINDAN MACENTA ZEMINI AYIKLAMA
 *
 * Ilk surum tek bir esikle calisiyordu:
 *
 *   if (r > 135 && b > 105 && r > g * 1.5 && b > g * 1.35) alpha = 0
 *
 * Bu IKILI bir karardir: piksel ya tamamen gorunur ya tamamen seffaf olur.
 * Kenar yumusatmasi (anti-aliasing) yuzunden binanin sinirindaki pikseller
 * macenta ile binanin KARISIMIDIR; karisimda r/g orani esigin altina duser,
 * dolayisiyla o pikseller TAM OPAK kalir ve icindeki macenta ekranda pembe
 * bir hale olarak gorunur.
 *
 * Olculdu (uretilmis webp'ler, macenta egilimli piksel sayisi):
 *   konut 1009 kenar + 797 opak | ambar 868 + 902 | medrese 776 + 634
 *   divan 866 + 322 | tas 692 + 457 | kereste 630 + 316
 *
 * Dogru cozum uc adimdir:
 *   1. SUREKLI alfa: pikselin ne kadarinin zemin oldugunu olc, 0/1 deme.
 *   2. BAGLANTI kisiti: yalnizca goruntunun KENARINDAN ulasilabilen macenta
 *      zemindir. Binanin kendi kiremiti de kirmizimsidir; baglanti kisiti
 *      olmadan cati delinirdi.
 *   3. RENK ARINDIRMA: yari seffaf kenar pikselinden zemin katkisini cikar,
 *      yoksa alfa dogru olsa bile renk pembe kalir.
 */

/** Sprite sayfasinin zemin rengi - kosesinden olculdu. */
const KEY = { r: 250, g: 8, b: 242 }
/** Zeminin "macenta-lik" degeri; olcegin ust ucu. */
const KEY_M = (KEY.r + KEY.b) / 2 - KEY.g

/** Bir pikselin macenta-lik degeri: kirmizi ve mavinin yesile ustunlugu. */
const magenta = (r, g, b) => (r + b) / 2 - g

async function cutSprite(index) {
  const { data, info } = await sharp(new URL('buildings.png', root).pathname)
    .extract({ left: (index % 3) * 341 + 4, top: Math.floor(index / 3) * 341 + 4, width: 332, height: 332 })
    .ensureAlpha().raw().toBuffer({ resolveWithObject: true })

  const { width, height } = info
  const m = new Float32Array(width * height)
  for (let i = 0, p = 0; i < data.length; i += 4, p++) {
    m[p] = magenta(data[i], data[i + 1], data[i + 2]) / KEY_M
  }

  /*
   * Tasma dolgusu iki tur TOHUMDAN baslar:
   *
   *   1. Goruntunun KENARI - disarisi her zaman zemindir.
   *   2. GUCLU macenta neresi olursa olsun (m > 0.70). Bu sart olmasaydi
   *      binalarin arasindaki avlu gibi KAPALI zemin adaciklari kenara
   *      baglanamadigi icin temizlenmezdi: konut.webp'te avlunun ortasinda
   *      parlak pembe bir leke kaliyordu. Hicbir gercek yapi malzemesi bu
   *      kadar macenta degildir, dolayisiyla esik guvenlidir.
   *
   * Yayilma esigi comerttir (0.30) cunku kenar pikselleri karisimdir;
   * gercek karar bir sonraki adimdaki surekli alfada verilir.
   */
  const outside = new Uint8Array(width * height)
  const queue = []
  for (let x = 0; x < width; x++) { queue.push(x, x + (height - 1) * width) }
  for (let y = 0; y < height; y++) { queue.push(y * width, width - 1 + y * width) }
  for (const seed of queue) if (!outside[seed] && m[seed] > 0.30) outside[seed] = 1
  for (let p = 0; p < m.length; p++) if (!outside[p] && m[p] > 0.70) outside[p] = 1
  const stack = []
  for (let p = 0; p < outside.length; p++) if (outside[p]) stack.push(p)
  while (stack.length) {
    const p = stack.pop()
    const x = p % width, y = (p - x) / width
    for (const [dx, dy] of [[0, -1], [1, 0], [0, 1], [-1, 0]]) {
      const nx = x + dx, ny = y + dy
      if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue
      const n = nx + ny * width
      if (outside[n] || m[n] <= 0.30) continue
      outside[n] = 1
      stack.push(n)
    }
  }

  for (let i = 0, p = 0; i < data.length; i += 4, p++) {
    if (!outside[p]) { data[i + 3] = 255; continue }
    // Zemine ne kadar yakinsa o kadar seffaf. 1 = saf zemin, 0 = saf bina.
    const alpha = Math.max(0, Math.min(1, 1 - m[p]))
    data[i + 3] = Math.round(alpha * 255)
    if (alpha <= 0 || alpha >= 1) continue
    // Arindirma: gozlenen = alpha*bina + (1-alpha)*zemin -> binayi geri coz.
    data[i] = Math.max(0, Math.min(255, Math.round((data[i] - (1 - alpha) * KEY.r) / alpha)))
    data[i + 1] = Math.max(0, Math.min(255, Math.round((data[i + 1] - (1 - alpha) * KEY.g) / alpha)))
    data[i + 2] = Math.max(0, Math.min(255, Math.round((data[i + 2] - (1 - alpha) * KEY.b) / alpha)))
  }

  return sharp(data, { raw: info })
    .trim()
    .resize(360, 360, { fit: 'contain', background: '#00000000' })
    .webp({ quality: 92, alphaQuality: 100 })
    .toFile(new URL(`${ids[index]}.webp`, root).pathname)
}

for (let index = 0; index < ids.length; index++) await cutSprite(index)
await sharp(new URL('island.png', root).pathname).webp({ quality: 88 }).toFile(new URL('island.webp', root).pathname)
for (const size of [192, 512]) {
  const sprite = await sharp(new URL('divan.webp', root).pathname).resize(Math.round(size * 0.78), Math.round(size * 0.78)).toBuffer()
  await sharp({ create: { width: size, height: size, channels: 4, background: '#123b37' } }).composite([{ input: sprite, gravity: 'centre' }]).png().toFile(new URL(`../../icon-${size}.png`, root).pathname)
}
console.log('Prepared six building sprites, landscape, and PWA icons.')
