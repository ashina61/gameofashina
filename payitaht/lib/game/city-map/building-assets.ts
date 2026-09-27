/**
 * GERÇEK BİNA ASSET METADATASI (normal kara binaları).
 *
 * Bina görselleri public/images/game/buildings/<id>-<aşama>.webp altında;
 * tools/art/buildings.py ile tek ölçek ve ışıkla çizilir. Burada her
 * bina için GÖRSEL UYGUNLUK metadatası var: origin, ve en önemlisi ZEMİN
 * TEMAS ORANI — çünkü sprite'ın tam bounding box'ı footprint DEĞİLDİR; önemli
 * olan binanın yere BASTIĞI taban.
 *
 * ÖLÇEK KURALI: sprite'ın zemin-temas genişliği (imgW * groundContactWidthRatio)
 * her binada AYNI hedefe (GROUND_TARGET_W) ölçeklenir. Böylece bina hangi 2x2
 * slota giderse gitsin, tabanı footprint'e aynı oturur ve ölçek SLOTTAN
 * BAĞIMSIZDIR (yalnızca binanın kendi görseline bağlı).
 *
 * DEĞİŞMEZ: slot geometrisi, road graph, BuildingSlotSystem ve 2x2 footprint
 * standardı burada DEĞİŞMEZ; bu dosya yalnızca sprite ölçek/anchor metadatası.
 */
import { TILE } from './index'
import { buildingImage } from '@/lib/asset'
import type { BuildingId } from '@/lib/game/engine'

/** Footprint elması genişliği (2x2 => 2*TILE.w). Zemin teması bunun altında kalır. */
export const FOOTPRINT_DIAMOND_W = TILE.w * 2 // 256
/** Bütün binaların hedef zemin-temas genişliği (footprint içinde pay bırakır). */
export const GROUND_TARGET_W = Math.round(FOOTPRINT_DIAMOND_W * 0.82) // ~210
export const GROUND_TARGET_D = GROUND_TARGET_W / 2 // izometrik 2:1
/** Ikariam-benzeri sunum: footprint değişmez, yalnızca sprite dünyada daha küçük görünür. */
export const BUILDING_RENDER_SCALE = 0.82
/**
 * Bina sanatında (tools/art/buildings.py) 2x2 footprint elmasının piksel
 * genişliği. Tuval 600 px, elmas 480 px; tuvalin alt kenarı elmasın alt köşesi.
 */
export const ART_DIAMOND_PX = 480
/** Elmas / tuval oranı: yeni sanatta zemin-temas oranı her binada aynı. */
const ART_CONTACT = (ART_DIAMOND_PX / 600) * (GROUND_TARGET_W * BUILDING_RENDER_SCALE) / FOOTPRINT_DIAMOND_W

export type BuildingAsset = {
  buildingId: string
  name: string
  assetPath: string
  originX: number
  originY: number
  /** Sprite genişliğinin yere basan taban oranı (bbox değil). */
  groundContactWidthRatio: number
  /** Taban izometrik derinlik oranı (görsel; sadece debug çizimi için). */
  groundContactDepthRatio: number
  /** Kubbe/minare gibi YÜKSEK sprite mı? (görsel taşma uyarısı sezgisi) */
  tall: boolean
  /** Belediye çakılı — randomize taşımaz. */
  fixed?: boolean
}

const def = (buildingId: string, name: string, groundContactWidthRatio: number, opts: Partial<BuildingAsset> = {}): BuildingAsset => ({
  buildingId, name, assetPath: buildingImage(buildingId),
  originX: 0.5, originY: 1.0,
  groundContactWidthRatio, groundContactDepthRatio: 0.6, tall: false, ...opts,
})

/** Normal KARA binaları (liman/tersane kıyıya, surlar savunmaya aittir; burada değil). */
export const BUILDING_ASSETS: BuildingAsset[] = [
  def('divan', 'Belediye (Divanhane)', ART_CONTACT, { tall: true, fixed: true }),
  def('saray', 'Saray', ART_CONTACT, { tall: true }),
  // Medrese görsel taşma düzeltmesi: tabanı gövdesine göre dar olduğu için
  // 0.66 oranıyla render genişliği komşu mesafesini aşıyordu. YALNIZCA bu
  // asset'in zemin-temas oranı düzeltildi (slot geometrisi/diğer binalar/scale
  // kuralı DEĞİŞMEDİ). Render genişliği ~318px -> ~269px'e iner.
  def('medrese', 'Medrese (Akademi)', ART_CONTACT, { tall: true }),
  def('kisla', 'Kışla', ART_CONTACT),
  def('carsi', 'Çarşı (Pazar)', ART_CONTACT),
  def('ambar', 'Ambar (Depo)', ART_CONTACT),
  def('hamam', 'Hamam', ART_CONTACT),
  def('konut', 'Konut', ART_CONTACT),
  def('kereste', 'Kereste', ART_CONTACT),
  def('tas', 'Taş Ocağı', ART_CONTACT),
  def('elcilik', 'Elçilik', ART_CONTACT),
]

export const HALL_BUILDING_ID = 'divan'
export const MOVABLE_BUILDING_IDS = BUILDING_ASSETS.filter(b => !b.fixed).map(b => b.buildingId)

export function assetById(id: string): BuildingAsset | undefined {
  return BUILDING_ASSETS.find(b => b.buildingId === id)
}

/**
 * Bir binanın SLOTTAN BAĞIMSIZ ölçeği: zemin-temas genişliği GROUND_TARGET_W'ye
 * eşitlenir. imgW = sprite'ın gerçek piksel genişliği (yüklendikten sonra).
 */
export function groundScale(imgW: number, a: BuildingAsset): number {
  return (GROUND_TARGET_W * BUILDING_RENDER_SCALE) / (imgW * a.groundContactWidthRatio)
}


/* -------------------------------------------------------------------------
 * CANLI ŞEHİR GÖRSEL PROFİLLERİ
 *
 * Procedural bina PNG'lerinin tek kalıptan çıkmış hissini, motor verisine
 * dokunmadan render katmanında kırar. Aynı 2x2 footprint/anchor korunur;
 * yalnızca silüet ölçeği, zemin karakteri ve çevre prop dili değişir.
 * ---------------------------------------------------------------------- */
export type BuildingVisualFamily =
  | 'hall' | 'residential' | 'production' | 'trade' | 'military'
  | 'scholar' | 'monument' | 'culture' | 'harbour' | 'special' | 'defense'

export type BuildingYardStyle = 'none' | 'soft' | 'work' | 'stone' | 'green' | 'military' | 'harbour'

export type BuildingDecorKey =
  | 'olive-tree' | 'bush' | 'flower' | 'rock' | 'cypress' | 'cypress-b'
  | 'pine' | 'plane-tree' | 'poplar' | 'fruit-tree' | 'haystack' | 'well'
  | 'woodpile' | 'beehives' | 'tulip-bed'

export type BuildingVisualProfile = {
  family: BuildingVisualFamily
  yard: BuildingYardStyle
  /** Ortak 2x2 footprint içinde yalnızca görünen sprite boyu. */
  scale: number
  /** Phaser multiply tint; ortak sıcak şehir ışığını korur. */
  tint: number
  /** Seviye yükseldikçe çevreye deterministik olarak eklenen küçük prop havuzu. */
  decor: readonly BuildingDecorKey[]
  /** Aynı footprint içinde bina+slota göre uygulanabilecek mikro ölçek farkı. */
  variation: number
  /** Düşük taş avlu duvarı yalnızca gerçekten avlulu yapılarda. */
  courtyard?: boolean
}

const familyVariation: Record<BuildingVisualFamily, number> = {
  hall: 0,
  residential: 0.035,
  production: 0.03,
  trade: 0.024,
  military: 0.018,
  scholar: 0.018,
  monument: 0.012,
  culture: 0.024,
  harbour: 0.016,
  special: 0.018,
  defense: 0,
}

const vp = (
  family: BuildingVisualFamily,
  yard: BuildingYardStyle,
  scale: number,
  tint: number,
  decor: readonly BuildingDecorKey[],
  courtyard = false,
): BuildingVisualProfile => ({ family, yard, scale, tint, decor, variation: familyVariation[family], courtyard })

export const BUILDING_VISUALS: Record<BuildingId, BuildingVisualProfile> = {
  divan: vp('hall', 'stone', 1.36, 0xfff5e6, ['cypress', 'flower', 'tulip-bed'], false),
  saray: vp('monument', 'green', 1.10, 0xfff5e6, ['cypress', 'flower', 'tulip-bed', 'well'], true),
  elcilik: vp('monument', 'green', 1.06, 0xfff3e4, ['cypress', 'flower', 'well'], true),
  konut: vp('residential', 'soft', 0.91, 0xf7edde, ['bush', 'flower', 'fruit-tree', 'well']),
  hamam: vp('monument', 'stone', 1.05, 0xfff3e4, ['well', 'cypress', 'flower'], true),
  carsi: vp('trade', 'stone', 1.00, 0xf6ead7, ['woodpile', 'flower', 'bush']),
  ambar: vp('production', 'work', 1.01, 0xf1e5d2, ['woodpile', 'haystack', 'rock']),
  kereste: vp('production', 'work', 0.92, 0xefe3cf, ['woodpile', 'pine', 'rock']),
  tas: vp('production', 'work', 0.92, 0xeee5d8, ['rock', 'woodpile', 'bush']),
  medrese: vp('scholar', 'green', 1.08, 0xfff6e8, ['cypress', 'well', 'flower'], true),
  kisla: vp('military', 'military', 1.04, 0xf4ebe0, ['rock', 'woodpile', 'cypress']),
  surlar: vp('defense', 'none', 1.00, 0xf2e7d6, []),
  liman: vp('harbour', 'harbour', 0.95, 0xf5f4ea, []),
  tersane: vp('harbour', 'harbour', 0.99, 0xf2efe4, []),
  kahvehane: vp('culture', 'soft', 0.96, 0xf8edde, ['flower', 'bush', 'well']),
  cami: vp('monument', 'green', 1.10, 0xfff7ea, ['cypress', 'flower', 'well'], true),
  muze: vp('culture', 'stone', 1.06, 0xfff2e1, ['cypress', 'flower', 'rock'], true),
  marangoz: vp('production', 'work', 0.96, 0xf0e3ce, ['woodpile', 'pine', 'haystack']),
  mimar: vp('trade', 'stone', 0.99, 0xf4eadb, ['rock', 'woodpile', 'bush']),
  ormanci: vp('production', 'work', 0.90, 0xeee4d1, ['woodpile', 'pine', 'bush']),
  tasci: vp('production', 'work', 0.91, 0xeee5d9, ['rock', 'woodpile', 'bush']),
  tophane: vp('military', 'military', 1.04, 0xf3e9dd, ['rock', 'woodpile', 'haystack']),
  bagci: vp('production', 'soft', 0.91, 0xf2e6d1, ['fruit-tree', 'bush', 'flower']),
  simyahane: vp('scholar', 'work', 0.94, 0xf4e7d8, ['rock', 'bush', 'flower']),
  camci: vp('production', 'work', 0.92, 0xf1e7d7, ['rock', 'woodpile', 'bush']),
  mahzen: vp('production', 'work', 0.91, 0xeee2cf, ['woodpile', 'haystack', 'rock']),
  gozlukcu: vp('scholar', 'soft', 0.92, 0xf6ebdc, ['flower', 'bush', 'well']),
  barutane: vp('military', 'military', 0.94, 0xf1e6d8, ['rock', 'woodpile', 'bush']),
  depo: vp('production', 'work', 1.02, 0xf0e4d1, ['woodpile', 'haystack', 'rock']),
  ticaret_merkezi: vp('trade', 'stone', 1.05, 0xf8ecda, ['woodpile', 'flower', 'well']),
  harita_arsivi: vp('scholar', 'green', 1.01, 0xf8edde, ['cypress', 'well', 'flower']),
  valilik: vp('monument', 'green', 1.08, 0xfff4e5, ['cypress', 'flower', 'tulip-bed'], true),
  korsan_kalesi: vp('military', 'military', 1.06, 0xeee5dc, ['rock', 'woodpile', 'pine']),
  kara_pazar: vp('trade', 'work', 0.98, 0xf0e3d3, ['woodpile', 'bush', 'haystack']),
  siginak: vp('military', 'military', 0.93, 0xeee6dc, ['rock', 'bush', 'woodpile']),
  tekke: vp('culture', 'green', 1.05, 0xfbf0df, ['cypress', 'flower', 'well'], true),
  mabet: vp('monument', 'green', 1.08, 0xfff5e7, ['cypress', 'tulip-bed', 'flower'], true),
  karagoz: vp('culture', 'soft', 0.92, 0xf7ead8, ['flower', 'bush', 'woodpile']),
}

export function visualProfile(id: BuildingId): BuildingVisualProfile {
  return BUILDING_VISUALS[id]
}
