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

      // Painterly palette birleştirme:
      // - mikro kontrastı/saturasyonu biraz azalt
      // - koyu gölgeleri hafif kaldır
      // - kiremitleri ortak terracotta, taşı ortak sıcak-bej aileye yaklaştır
      let lum = r * 0.299 + g * 0.587 + b * 0.114
      const desat = 0.16
      r = r * (1 - desat) + lum * desat
      g = g * (1 - desat) + lum * desat
      b = b * (1 - desat) + lum * desat

      const contrast = 0.88
      r = 128 + (r - 128) * contrast
      g = 128 + (g - 128) * contrast
      b = 128 + (b - 128) * contrast

      // Çok koyu AI-gölge ceplerini biraz aç; düz griye çevirmeden.
      lum = r * 0.299 + g * 0.587 + b * 0.114
      if (lum < 92) {
        const lift = (92 - lum) * 0.12
        r += lift
        g += lift
        b += lift * 0.82
      }

      const max0 = Math.max(r, g, b)
      const min0 = Math.min(r, g, b)
      const sat0 = max0 > 0 ? (max0 - min0) / max0 : 0

      const terracotta =
        r > 105 &&
        r > g * 1.18 &&
        g > b * 0.92 &&
        sat0 > 0.24

      if (terracotta) {
        const mix = 0.18
        r = r * (1 - mix) + 190 * mix
        g = g * (1 - mix) + 112 * mix
        b = b * (1 - mix) + 70 * mix
      }

      const warmStone =
        max0 > 95 &&
        max0 < 235 &&
        sat0 < 0.20 &&
        r >= b * 0.94 &&
        g >= b * 0.92

      if (warmStone) {
        const mix = 0.10
        r = r * (1 - mix) + 194 * mix
        g = g * (1 - mix) + 178 * mix
        b = b * (1 - mix) + 148 * mix
      }

      r = Math.min(255, r * 1.018 + 2)
      g = Math.min(255, g * 1.002 + 1)
      b = Math.min(255, b * 0.972)

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
