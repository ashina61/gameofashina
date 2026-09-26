/**
 * ADALAR — haritadaki on altı ada ve lüks kaynak yatakları.
 *
 * Ayrı dosyada durur: hem imparatorluk (empire.ts) hem sefer (expeditions.ts)
 * modülü bunu okur; birbirlerini döngüsel yüklerken ada listesinin hazır
 * olması gerekir.
 */
export const ISLANDS = [
  // wonder: adanın harikası ve verdiği mucize (engine.MIRACLES).
  { id: 'sahil', name: 'Sahil Adası', x: 4, y: 5, specialty: 'Mermer', luxury: 'mermer', wonder: 'kalkan' },
  { id: 'zeytin', name: 'Zeytin Adası', x: 8, y: 3, specialty: 'Üzüm', luxury: 'uzum', wonder: 'bereket' },
  { id: 'akcam', name: 'Akçam Adası', x: 2, y: 2, specialty: 'Kristal', luxury: 'kristal', wonder: 'ilim' },
  { id: 'kizil', name: 'Kızılburun', x: 10, y: 7, specialty: 'Kükürt', luxury: 'kukurt', wonder: 'savas' },
  { id: 'akdeniz', name: 'Akdeniz Adası', x: 6, y: 9, specialty: 'Mermer', luxury: 'mermer', wonder: 'ruzgar' },
  { id: 'yalcin', name: 'Yalçın Ada', x: 12, y: 2, specialty: 'Kristal', luxury: 'kristal', wonder: 'huzur' },
  { id: 'baglik', name: 'Bağlık Ada', x: 1, y: 8, specialty: 'Üzüm', luxury: 'uzum', wonder: 'bolluk' },
  { id: 'atessiz', name: 'Ateşli Ada', x: 11, y: 11, specialty: 'Kükürt', luxury: 'kukurt', wonder: 'demirci' },
  // Açık denizdeki uzak adalar (0.18.0): dünya iki katına çıktı.
  { id: 'mercan', name: 'Mercan Adası', x: 15, y: 4, specialty: 'Üzüm', luxury: 'uzum', wonder: 'ilim' },
  { id: 'sakiz', name: 'Sakız Adası', x: 16, y: 9, specialty: 'Mermer', luxury: 'mermer', wonder: 'huzur' },
  { id: 'lodos', name: 'Lodos Adası', x: 3, y: 12, specialty: 'Kristal', luxury: 'kristal', wonder: 'ruzgar' },
  { id: 'kartal', name: 'Kartal Kayası', x: 8, y: 14, specialty: 'Kükürt', luxury: 'kukurt', wonder: 'savas' },
  { id: 'poyraz', name: 'Poyraz Adası', x: 14, y: 14, specialty: 'Üzüm', luxury: 'uzum', wonder: 'bolluk' },
  { id: 'fener', name: 'Fener Adası', x: 18, y: 1, specialty: 'Kristal', luxury: 'kristal', wonder: 'kalkan' },
  { id: 'hisarada', name: 'Hisar Adası', x: 19, y: 12, specialty: 'Kükürt', luxury: 'kukurt', wonder: 'demirci' },
  { id: 'lalezar', name: 'Lale Adası', x: 6, y: 1, specialty: 'Mermer', luxury: 'mermer', wonder: 'bereket' },
] as const
export type IslandId = typeof ISLANDS[number]['id']
