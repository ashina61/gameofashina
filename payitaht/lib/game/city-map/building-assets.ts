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
