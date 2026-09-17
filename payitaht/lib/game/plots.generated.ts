/**
 * ÖLÇÜLMÜŞ ARSALAR - elle yazilmaz, uretilir.
 *
 *   node scripts/measure-plots.mjs <resim> lib/game/plots.generated.ts
 *
 * ŞU AN BOŞ: oyun boyali bir arkaplan resmi KULLANMIYOR. Dunyanin tamami -
 * su, ada, cim, yollar, arsalar, binalar - kod tarafindan STILIZE cizilir.
 * Bir arkaplan resmiyle calisilmak istenirse betik bu dosyayi doldurur ve
 * layout otomatik olarak olculmus arsalara gecer.
 */
import type { Zone } from './layout'

export const MEASURED_TILE_W = 17

export const MEASURED: { x: number; y: number; zone: Zone }[] = []
