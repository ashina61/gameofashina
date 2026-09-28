/**
 * Genel (public/) varliklarin yolunu uretir.
 *
 * Uygulama normalde alan adinin KOKUNDE durur ve '/images/...' dogru calisir.
 * Ama bir ALT DIZINDEN servis edildiginde - onizleme baglantilari, statik
 * disa aktarim, bir alt yol altinda barindirma - kok-goreli yollar 404 doner
 * ve oyun resimsiz acilir.
 *
 * Taban, derleme aninda NEXT_PUBLIC_ASSET_BASE ile verilir; verilmezse
 * davranis bugunkuyle birebir aynidir.
 */
const base = (process.env.NEXT_PUBLIC_ASSET_BASE ?? '').replace(/\/$/, '')

export function asset(path: string) {
  return `${base}${path.startsWith('/') ? path : `/${path}`}`
}

/**
 * Ikariam'daki gibi bina BUYUDUKCE gorunusu degisir: uc asama.
 * 1 = seviye 0-3 (insaat dahil), 2 = seviye 4-7, 3 = seviye 8+.
 */
export function buildingStage(level: number): 1 | 2 | 3 {
  return level >= 8 ? 3 : level >= 4 ? 2 : 1
}

/**
 * Bina sanat revizyonu. WebP dosya adları seviye/stage için sabit kaldığı için
 * GitHub Pages/CDN/PWA cache eski resmi gösterebilir. Generator sanatı topluca
 * değiştiğinde bu değeri yükselt; query string hem browser hem SW cache anahtarını
 * değiştirir, binary dosya adlarını ve BUILDING_FLAGS anahtarlarını bozmaz.
 */
export const BUILDING_ART_REV = '20260929-painted-resources-v1'

/** Tam şeffaf, eski izokit tuvali yerine boyanmış üç aşamalı görseller. */
export function isPaintedBuilding(id: string) {
  return id === 'divan' || id === 'cami' || id === 'saray' || id === 'konut'
    || id === 'kisla' || id === 'medrese' || id === 'carsi'
    || id === 'kereste' || id === 'tas' || id === 'ambar'
    || id === 'elcilik' || id === 'hamam' || id === 'kahvehane'
    || id === 'muze' || id === 'marangoz' || id === 'mimar'
    || id === 'ormanci' || id === 'tasci' || id === 'bagci'
}

export type CoastFacing = 'left' | 'straight' | 'right'

/**
 * Kıyı binalarında straight ayrı kod-üretilmiş asset'tir; left/right aynı yan
 * sprite'ın aynalanmış iki yönüdür. Kara binalarında dosya adı değişmez.
 */
export function buildingArtKey(id: string, level = 1, facing?: CoastFacing) {
  const straight = (id === 'liman' || id === 'tersane') && facing === 'straight'
  return `${id}${straight ? '-duz' : ''}-${buildingStage(level)}`
}

/** Bir bina gorselinin yolu (tools/art/buildings.py ile cizilir). */
export function buildingImage(id: string, level = 1, facing?: CoastFacing) {
  if (isPaintedBuilding(id)) return `${asset(`/images/game/buildings/${id}-painted-${buildingStage(level)}.webp`)}?art=${BUILDING_ART_REV}`
  return `${asset(`/images/game/buildings/${buildingArtKey(id, level, facing)}.webp`)}?art=${BUILDING_ART_REV}`
}
