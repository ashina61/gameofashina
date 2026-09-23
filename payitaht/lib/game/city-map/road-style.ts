/**
 * Payitaht yol malzemeleri. Yalnızca görsel sınıflandırma:
 * ekonomi, inşaat süresi, kaydedilen yol hücreleri etkilenmez.
 */
export type RoadKind = 'avenue' | 'street' | 'quay'
export type RoadTier = 1 | 2 | 3 | 4

/** Divan 1-2: toprak; 3-4: taş kenarlı; 5-6: arnavut kaldırımı; 7+: kesme taş. */
export function roadTierForHallLevel(level: number): RoadTier {
  if (level >= 7) return 4
  if (level >= 5) return 3
  if (level >= 3) return 2
  return 1
}

export const ROAD_TIER_NAMES: Record<RoadTier, string> = {
  1: 'Toprak yol',
  2: 'Taş kenarlı yol',
  3: 'Arnavut kaldırımı',
  4: 'Kesme taş cadde',
}

export type RoadVisualStyle = {
  shoulderW: number
  shoulder: number
  shoulderAlpha: number
  borderW: number
  border: number
  borderAlpha: number
  fillW: number
  fill: number
  highlightW: number
  highlight: number
  stoneDensity: number
  stoneColor: number
}

/**
 * Genişlikler TILE.w çarpanı cinsinden. Kıyı yolu tüm seviyelerde
 * taş rıhtım kalır; taşın tonu Divan ile birlikte olgunlaşır.
 */
export function roadStyleFor(kind: RoadKind, level: number): RoadVisualStyle {
  const tier = roadTierForHallLevel(level)
  const avenue = kind === 'avenue'
  const quay = kind === 'quay'
  // Mobilde yol, bina/parselden rol çalmamalı: ana arter okunur ama dar,
  // mahalle yolu daha ince. Kıyı promenadı ayrı olarak terrain-builder'da çizilir.
  const scale = avenue ? 0.64 : quay ? 0.62 : 0.42

  const palette = quay
    ? [
        [0x5c5347, 0x81745b, 0x9a8b6d, 0xb8aa87],
        [0x5c5347, 0x80735e, 0xaaa087, 0xc4baa1],
        [0x5c5347, 0x81776a, 0xb5ab95, 0xd7cab0],
        [0x5c5347, 0x81786b, 0xc3b9a4, 0xe1d5bc],
      ][tier - 1]
    : [
        [0x6d593f, 0x846c49, 0x9a8056, 0xbba375],
        [0x65533e, 0x817055, 0xb09b73, 0xcebd95],
        [0x615443, 0x887a62, 0xb9ab8b, 0xd5c7a5],
        [0x60564a, 0x877c68, 0xc6b99a, 0xe0d4b8],
      ][tier - 1]

  return {
    shoulderW: (quay ? 0.44 : tier === 1 ? 0.36 : 0.40) * scale,
    shoulder: palette[0],
    shoulderAlpha: quay ? 0.30 : tier === 1 ? 0.10 : 0.11,
    borderW: (tier === 1 && !quay ? 0.29 : 0.325) * scale,
    border: palette[1],
    borderAlpha: quay ? 0.30 : tier === 1 ? 0 : tier === 2 ? 0.14 : tier === 3 ? 0.22 : 0.28,
    fillW: (quay ? 0.27 : tier === 1 ? 0.22 : 0.245) * scale,
    fill: palette[2],
    highlightW: 0.018 * scale,
    highlight: palette[3],
    stoneDensity: quay ? 4 : tier === 1 ? 0 : tier === 2 ? 2 : tier === 3 ? 5 : 7,
    stoneColor: palette[3],
  }
}
