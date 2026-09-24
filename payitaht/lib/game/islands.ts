/**
 * ADALAR — haritadaki sekiz ada ve lüks kaynak yatakları.
 *
 * Ayrı dosyada durur: hem imparatorluk (empire.ts) hem sefer (expeditions.ts)
 * modülü bunu okur; birbirlerini döngüsel yüklerken ada listesinin hazır
 * olması gerekir.
 */
export const ISLANDS = [
  { id: 'sahil', name: 'Sahil Adası', x: 4, y: 5, specialty: 'Mermer', luxury: 'mermer' },
  { id: 'zeytin', name: 'Zeytin Adası', x: 8, y: 3, specialty: 'Üzüm', luxury: 'uzum' },
  { id: 'akcam', name: 'Akçam Adası', x: 2, y: 2, specialty: 'Kristal', luxury: 'kristal' },
  { id: 'kizil', name: 'Kızılburun', x: 10, y: 7, specialty: 'Kükürt', luxury: 'kukurt' },
  { id: 'akdeniz', name: 'Akdeniz Adası', x: 6, y: 9, specialty: 'Mermer', luxury: 'mermer' },
  { id: 'yalcin', name: 'Yalçın Ada', x: 12, y: 2, specialty: 'Kristal', luxury: 'kristal' },
  { id: 'baglik', name: 'Bağlık Ada', x: 1, y: 8, specialty: 'Üzüm', luxury: 'uzum' },
  { id: 'atessiz', name: 'Ateşli Ada', x: 11, y: 11, specialty: 'Kükürt', luxury: 'kukurt' },
] as const
export type IslandId = typeof ISLANDS[number]['id']
