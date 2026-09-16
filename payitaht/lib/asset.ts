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

/** Bir bina gorselinin yolu. */
export function buildingImage(id: string) {
  return asset(`/images/game/${id}.webp`)
}
