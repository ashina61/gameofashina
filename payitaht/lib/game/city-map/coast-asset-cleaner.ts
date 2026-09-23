/**
 * Liman ve tersane sprite'larindaki geniş cyan deniz lekelerini kontrollü temizler.
 * Kaynak görseli bozmaz; bu fonksiyon CanvasTexture RGBA kopyasında çalışır.
 *
 * ÖNEMLİ: Tekne, iskele, yelken ve ayrı duran yapılar da sprite'ın parçasıdır.
 * Önceki uygulama alt %23'ü koşulsuz silip yalnızca en büyük bağlı bileşeni
 * bırakıyordu. Bu, suyla birlikte tekne gövdesini de kesebiliyordu.
 * Burada yalnızca alt taraftaki GENİŞ su renk kümelerini siliyoruz; renk/konum
 * açısından emin olmadığımız pikselleri koruyoruz.
 */
export function cleanCoastSpriteRgba(
  data: Uint8ClampedArray,
  width: number,
  height: number,
): Uint8ClampedArray {
  if (width <= 0 || height <= 0 || data.length !== width * height * 4) return data

  const count = width * height
  const candidate = new Uint8Array(count)
  const visited = new Uint8Array(count)
  const queue = new Int32Array(count)

  // Kiremit, ahşap, açık taş ve beyaz yelken su diye algılanmamalı.
  // Su adayını resmin alt bölümünde, belirgin soğuk mavi/cyan tona sınırla.
  for (let y = Math.floor(height * 0.36); y < height; y++) {
    for (let x = 0; x < width; x++) {
      const p = y * width + x
      const i = p * 4
      if (data[i + 3] <= 10) continue
      const r = data[i], g = data[i + 1], b = data[i + 2]
      const coolWater = g > 82 && b > 88 &&
        g > r * 1.10 && b > r * 1.10 &&
        b >= g * 0.75 && b <= g * 1.55
      if (coolWater) candidate[p] = 1
    }
  }

  // Tek bir mavi pencere/çatı parçasını kesme: yalnızca geniş, bitişik
  // cyan kümeleri sil. Bağımsız tekne/iskele bileşenleri tamamen korunur.
  const minArea = Math.max(8, Math.ceil(count * 0.0025))
  const minWidth = Math.max(3, Math.ceil(width * 0.11))
  for (let start = 0; start < count; start++) {
    if (!candidate[start] || visited[start]) continue
    let head = 0, tail = 0
    let minX = width, maxX = -1
    queue[tail++] = start
    visited[start] = 1
    while (head < tail) {
      const p = queue[head++]
      const x = p % width
      const y = Math.floor(p / width)
      if (x < minX) minX = x
      if (x > maxX) maxX = x
      const neighbours = [
        x > 0 ? p - 1 : -1,
        x + 1 < width ? p + 1 : -1,
        y > 0 ? p - width : -1,
        y + 1 < height ? p + width : -1,
      ]
      for (const n of neighbours) {
        if (n < 0 || visited[n] || !candidate[n]) continue
        visited[n] = 1
        queue[tail++] = n
      }
    }
    if (tail < minArea || maxX - minX + 1 < minWidth) continue
    for (let k = 0; k < tail; k++) data[queue[k] * 4 + 3] = 0
  }
  return data
}
