/**
 * GERÇEK BİNA ASSET METADATASI (normal kara binaları).
 *
 * Asıl bina görselleri şu an public/images/game/<id>.webp altında; assets/
 * city/buildings ileride ayrı şehir artwork'ü için ayrılmıştır. Burada her
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
  def('divan', 'Belediye (Divanhane)', 0.70, { tall: true, fixed: true }),
  def('saray', 'Saray', 0.70, { tall: true }),
  def('medrese', 'Medrese (Akademi)', 0.66, { tall: true }),
  def('kisla', 'Kışla', 0.80),
  def('carsi', 'Çarşı (Pazar)', 0.82),
  def('ambar', 'Ambar (Depo)', 0.80),
  def('hamam', 'Hamam', 0.78),
  def('konut', 'Konut', 0.74),
  def('kereste', 'Kereste', 0.82),
  def('tas', 'Taş Ocağı', 0.84),
  def('elcilik', 'Elçilik', 0.74),
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
  return GROUND_TARGET_W / (imgW * a.groundContactWidthRatio)
}
