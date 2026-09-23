/**
 * Farklı üretimlerden gelen bina assetlerini aynı "dünya" paletine yaklaştırır.
 * Kaynak WebP'ye dokunmaz; CanvasTexture üzerinde çalışır.
 */
const SOFT_GROUND_IDS = new Set(['medrese', 'kisla', 'saray', 'hamam'])

export function normalizeBuildingSpriteRgba(
  id: string,
  data: Uint8ClampedArray,
  width: number,
  height: number,
): Uint8ClampedArray {
  if (width <= 0 || height <= 0 || data.length !== width * height * 4) return data

  for (let y = 0; y < height; y++) {
    const yr = y / height
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4
      const a = data[i + 3]
      if (a <= 8) continue

      let r = data[i]
      let g = data[i + 1]
      let b = data[i + 2]

      // Hafif palette birleştirme:
      // - saturation biraz azalır
      // - contrast sıkışır
      // - sıcak taş/kiremit tonuna doğru çok hafif sıcak grade
      const lum = r * 0.299 + g * 0.587 + b * 0.114
      const desat = 0.10
      r = r * (1 - desat) + lum * desat
      g = g * (1 - desat) + lum * desat
      b = b * (1 - desat) + lum * desat

      const contrast = 0.93
      r = 128 + (r - 128) * contrast
      g = 128 + (g - 128) * contrast
      b = 128 + (b - 128) * contrast

      r = Math.min(255, r * 1.025 + 2)
      g = Math.min(255, g * 1.002 + 1)
      b = Math.min(255, b * 0.965)

      data[i] = Math.max(0, Math.round(r))
      data[i + 1] = Math.max(0, Math.round(g))
      data[i + 2] = Math.max(0, Math.round(b))

      if (!SOFT_GROUND_IDS.has(id)) continue

      const max = Math.max(r, g, b)
      const min = Math.min(r, g, b)
      const sat = max > 0 ? (max - min) / max : 0
      const xr = x / width

      // Medrese/Kışla/Saray/Hamam assetlerinde yapı çevresine ayrı bir
      // taş platform pişmiş. Yapının merkez kaidesine dokunmadan yalnızca
      // alt/yan taşan, düşük doygunluklu platformu yumuşat.
      const lowSaturationStone =
        yr > 0.58 &&
        max > 85 &&
        max < 235 &&
        sat < 0.24

      const outerWing = Math.abs(xr - 0.5) > 0.29 && yr > 0.60
      const bottomLip = yr > 0.84

      if (lowSaturationStone && (outerWing || bottomLip)) {
        data[i + 3] = Math.round(a * (bottomLip ? 0.16 : 0.34))
      }
    }
  }

  return data
}
