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


export type BuildingVisualFamily = 'civic' | 'civil' | 'production' | 'military' | 'commercial' | 'harbour'
export type BuildingYardStyle = 'none' | 'soft' | 'work' | 'stone' | 'courtyard' | 'harbour'
export type BuildingProp =
  | 'bush' | 'flower' | 'cypress' | 'fruit-tree' | 'woodpile' | 'rock'
  | 'well' | 'haystack' | 'beehives' | 'crate' | 'rack' | 'bench' | 'canopy'

export type BuildingVisualProfile = {
  family: BuildingVisualFamily
  scale: number
  tint: number
  yard: BuildingYardStyle
  props: readonly BuildingProp[]
  /** Aynı bina farklı slotlarda kopya gibi görünmesin; footprint değişmez. */
  variation: number
}

/**
 * Canlı şehirdeki sanat yönetimi tek noktada tutulur. Bunlar oyun mekaniği
 * değildir: maliyet, üretim, slot veya kayıt formatını değiştirmez.
 */
const VISUALS: Record<string, BuildingVisualProfile> = {
  divan: { family: 'civic', scale: 1.36, tint: 0xfff5e6, yard: 'courtyard', props: ['flower', 'cypress'], variation: 0 },
  saray: { family: 'civic', scale: 1.08, tint: 0xfff5e6, yard: 'courtyard', props: ['cypress', 'flower'], variation: 0.015 },
  medrese: { family: 'civic', scale: 1.08, tint: 0xfff5e6, yard: 'courtyard', props: ['bench', 'cypress'], variation: 0.012 },
  cami: { family: 'civic', scale: 1.08, tint: 0xfff5e6, yard: 'courtyard', props: ['cypress', 'flower'], variation: 0.01 },
  hamam: { family: 'civic', scale: 1.06, tint: 0xfff5e6, yard: 'stone', props: ['well', 'bush'], variation: 0.014 },
  elcilik: { family: 'civic', scale: 1.06, tint: 0xfff5e6, yard: 'courtyard', props: ['flower', 'cypress'], variation: 0.014 },
  muze: { family: 'civic', scale: 1.07, tint: 0xfff5e6, yard: 'courtyard', props: ['bench', 'flower'], variation: 0.012 },
  valilik: { family: 'civic', scale: 1.08, tint: 0xfff5e6, yard: 'courtyard', props: ['cypress', 'bench'], variation: 0.012 },
  tekke: { family: 'civic', scale: 1.05, tint: 0xfff5e6, yard: 'soft', props: ['cypress', 'flower'], variation: 0.016 },
  mabet: { family: 'civic', scale: 1.07, tint: 0xfff5e6, yard: 'stone', props: ['cypress', 'flower'], variation: 0.012 },
  harita_arsivi: { family: 'civic', scale: 1.02, tint: 0xf8edde, yard: 'stone', props: ['crate', 'bench'], variation: 0.015 },

  konut: { family: 'civil', scale: 0.92, tint: 0xf8edde, yard: 'soft', props: ['flower', 'fruit-tree'], variation: 0.035 },
  kahvehane: { family: 'civil', scale: 0.96, tint: 0xf8edde, yard: 'soft', props: ['bench', 'canopy'], variation: 0.028 },
  karagoz: { family: 'civil', scale: 0.93, tint: 0xf8edde, yard: 'soft', props: ['bench', 'canopy'], variation: 0.03 },

  kereste: { family: 'production', scale: 0.92, tint: 0xf1e6d3, yard: 'work', props: ['woodpile', 'woodpile'], variation: 0.035 },
  ormanci: { family: 'production', scale: 0.92, tint: 0xf1e6d3, yard: 'work', props: ['woodpile', 'bush'], variation: 0.035 },
  marangoz: { family: 'production', scale: 1.01, tint: 0xf1e6d3, yard: 'work', props: ['woodpile', 'rack'], variation: 0.025 },
  tas: { family: 'production', scale: 0.92, tint: 0xf1e6d3, yard: 'work', props: ['rock', 'rock'], variation: 0.035 },
  tasci: { family: 'production', scale: 0.92, tint: 0xf1e6d3, yard: 'work', props: ['rock', 'crate'], variation: 0.035 },
  mimar: { family: 'production', scale: 1.0, tint: 0xf1e6d3, yard: 'work', props: ['rock', 'woodpile'], variation: 0.024 },
  bagci: { family: 'production', scale: 0.92, tint: 0xf1e6d3, yard: 'soft', props: ['beehives', 'fruit-tree'], variation: 0.035 },
  mahzen: { family: 'production', scale: 0.92, tint: 0xf1e6d3, yard: 'work', props: ['crate', 'haystack'], variation: 0.032 },
  simyahane: { family: 'production', scale: 0.92, tint: 0xf1e6d3, yard: 'work', props: ['crate', 'rock'], variation: 0.03 },
  camci: { family: 'production', scale: 0.92, tint: 0xf1e6d3, yard: 'work', props: ['crate', 'rock'], variation: 0.03 },
  gozlukcu: { family: 'production', scale: 0.92, tint: 0xf1e6d3, yard: 'work', props: ['crate', 'bench'], variation: 0.03 },
  barutane: { family: 'production', scale: 0.92, tint: 0xf1e6d3, yard: 'stone', props: ['crate', 'rack'], variation: 0.025 },

  carsi: { family: 'commercial', scale: 0.99, tint: 0xf8edde, yard: 'stone', props: ['canopy', 'crate'], variation: 0.025 },
  ticaret_merkezi: { family: 'commercial', scale: 1.03, tint: 0xf8edde, yard: 'stone', props: ['canopy', 'crate'], variation: 0.02 },
  kara_pazar: { family: 'commercial', scale: 0.98, tint: 0xf3e4d1, yard: 'work', props: ['canopy', 'crate'], variation: 0.028 },
  ambar: { family: 'commercial', scale: 1.03, tint: 0xf8edde, yard: 'work', props: ['crate', 'haystack'], variation: 0.022 },
  depo: { family: 'commercial', scale: 1.03, tint: 0xf8edde, yard: 'work', props: ['crate', 'woodpile'], variation: 0.022 },

  kisla: { family: 'military', scale: 1.03, tint: 0xf5ece0, yard: 'stone', props: ['rack', 'crate'], variation: 0.018 },
  tophane: { family: 'military', scale: 1.03, tint: 0xf5ece0, yard: 'stone', props: ['rack', 'crate'], variation: 0.018 },
  korsan_kalesi: { family: 'military', scale: 1.04, tint: 0xf5ece0, yard: 'stone', props: ['rack', 'rock'], variation: 0.016 },
  siginak: { family: 'military', scale: 0.94, tint: 0xf5ece0, yard: 'stone', props: ['rock', 'rack'], variation: 0.02 },

  liman: { family: 'harbour', scale: 1.03, tint: 0xf2f6ee, yard: 'harbour', props: ['crate', 'woodpile'], variation: 0.018 },
  tersane: { family: 'harbour', scale: 1.06, tint: 0xf2f6ee, yard: 'harbour', props: ['woodpile', 'rack'], variation: 0.018 },
}

const DEFAULT_VISUAL: BuildingVisualProfile = {
  family: 'civil', scale: 0.98, tint: 0xf8edde, yard: 'soft', props: ['bush'], variation: 0.02,
}

export function buildingVisualProfile(id: string): BuildingVisualProfile {
  return VISUALS[id] ?? DEFAULT_VISUAL
}
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
