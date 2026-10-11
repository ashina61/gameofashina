/** Visual thresholds only: no construction, population, cost or save changes. */
export const GLARIUM_GROWTH_STAGES = [
  { level: 1, name: 'İlk yerleşim', description: 'Küçük divanhane, seyrek evler, toprak yollar', texture: 'ottoman-hall-01' },
  { level: 5, name: 'Kasaba', description: 'Merkez çevresinde mahalleler ve ilk taş sokaklar', texture: 'ottoman-hall-05' },
  { level: 10, name: 'Şehir', description: 'Genişleyen mahalleler, taş meydan ve gelişen rıhtım', texture: 'ottoman-hall-10' },
  { level: 15, name: 'Büyük şehir', description: 'Dış mahalleler, gelişmiş yollar ve liman çevresi', texture: 'ottoman-hall-15' },
  { level: 20, name: 'Payitaht', description: 'Olgun şehir dokusu ve görkemli divanhane', texture: 'ottoman-hall-20' },
] as const

export function glariumGrowthForLevel(level: number) {
  const safe = Number.isFinite(level) ? Math.max(1, Math.floor(level)) : 1
  return [...GLARIUM_GROWTH_STAGES].reverse().find(stage => safe >= stage.level)!
}
