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

/** Bir bina gorselinin yolu (tools/art/buildings.py ile cizilir). */
export function buildingImage(id: string, level = 1) {
  return asset(`/images/game/buildings/${id}-${buildingStage(level)}.webp`)
}
