/**
 * Liman / tersane sprite'larına gömülü eski kare su platformunu runtime'da
 * temizler. Kaynak asset dosyası DEĞİŞMEZ; temizlenmiş RGBA yalnızca Phaser
 * CanvasTexture'a yazılır.
 *
 * Aşamalar:
 * 1) Alt bölgede cyan/foam/diamond-border piksellerini alpha=0 yap.
 * 2) Kalan alpha piksellerinin en büyük bağlı bileşenini koru.
 *
 * İkinci adım, uzun platform çerçevesi / kopuk su parçalarını atarken bina,
 * iskele ve tekne gibi birbirine temas eden ana artwork'ü birlikte tutar.
 */
export function cleanCoastSpriteRgba(
  data: Uint8ClampedArray,
  width: number,
  height: number,
): Uint8ClampedArray {
  if (width <= 0 || height <= 0 || data.length !== width * height * 4) return data

  const pixelCount = width * height

  // Renk + geometri ile yapay su plakasını sök.
  for (let y = 0; y < height; y++) {
    const yr = y / height
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4
      const a = data[i + 3]
      if (a <= 8) continue

      const r = data[i]
      const g = data[i + 1]
      const b = data[i + 2]
      const max = Math.max(r, g, b)
      const min = Math.min(r, g, b)
      const sat = max > 0 ? (max - min) / max : 0
      const xr = x / width

      const cyan =
        yr > 0.30 &&
        g > 90 &&
        b > 85 &&
        g >= r &&
        b >= r * 0.92

      const foam =
        yr > 0.42 &&
        max > 165 &&
        sat < 0.18 &&
        g >= r * 0.96 &&
        b >= r * 0.93

      // Eski isometric su karesinin alt köşesi/çerçevesi.
      const bottom = yr > 0.77
      const outer =
        yr > 0.58 &&
        Math.abs(xr - 0.5) > (0.78 - yr) * 1.25 + 0.12
      const border =
        outer &&
        max > 70 &&
        sat < 0.35

      if (cyan || foam || bottom || border) data[i + 3] = 0
    }
  }

  // En büyük 4-komşulu alpha bileşenini bul.
  const labels = new Int32Array(pixelCount)
  const queue = new Int32Array(pixelCount)
  let nextLabel = 0
  let largestLabel = 0
  let largestSize = 0

  for (let start = 0; start < pixelCount; start++) {
    const alpha = data[start * 4 + 3]
    if (alpha <= 10 || labels[start] !== 0) continue

    const label = ++nextLabel
    let head = 0
    let tail = 0
    let size = 0
    queue[tail++] = start
    labels[start] = label

    while (head < tail) {
      const p = queue[head++]
      size++
      const x = p % width
      const y = Math.floor(p / width)

      if (x > 0) {
        const n = p - 1
        if (labels[n] === 0 && data[n * 4 + 3] > 10) {
          labels[n] = label
          queue[tail++] = n
        }
      }
      if (x + 1 < width) {
        const n = p + 1
        if (labels[n] === 0 && data[n * 4 + 3] > 10) {
          labels[n] = label
          queue[tail++] = n
        }
      }
      if (y > 0) {
        const n = p - width
        if (labels[n] === 0 && data[n * 4 + 3] > 10) {
          labels[n] = label
          queue[tail++] = n
        }
      }
      if (y + 1 < height) {
        const n = p + width
        if (labels[n] === 0 && data[n * 4 + 3] > 10) {
          labels[n] = label
          queue[tail++] = n
        }
      }
    }

    if (size > largestSize) {
      largestSize = size
      largestLabel = label
    }
  }

  if (largestLabel === 0) return data

  for (let p = 0; p < pixelCount; p++) {
    if (labels[p] !== largestLabel) data[p * 4 + 3] = 0
  }
  return data
}
