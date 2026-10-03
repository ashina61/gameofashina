import { type Shows } from '../theatre'
import { type Gods } from '../gods'
import { type Guilds } from '../guilds'
import { SLOTS, type Zone } from '../layout'
import { type Army, BUILDINGS, type UnitId } from './data'

export const RESOURCE_IDS = ['gold', 'wood', 'stone', 'knowledge'] as const
export type Resource = typeof RESOURCE_IDS[number]
export type Resources = Record<Resource, number>
/**
 * LÜKS KAYNAKLAR (Ikariam'ın şarap/mermer/kristal/kükürdü).
 *
 * Her ada TEK bir lüks kaynak yatağına sahiptir; şehir yalnızca kendi
 * adasının kaynağını madenden çıkarır, diğerlerini koloni, nakliye ya da
 * çarşıdaki tüccar yoluyla edinir. Ana kaynaklardan AYRI tutulur: kaynak
 * şeridi ve bütün Resources hesapları değişmeden kalır.
 */
export const LUXURY_IDS = ['uzum', 'mermer', 'kristal', 'kukurt'] as const
export type Luxury = typeof LUXURY_IDS[number]
export type LuxuryStock = Record<Luxury, number>
export const LUXURY_NAMES: Record<Luxury, string> = { uzum: 'Üzüm', mermer: 'Mermer', kristal: 'Kristal', kukurt: 'Kükürt' }
/** Adanın ortak madeni: seviye, bağışla biriken kereste ve maden işçileri. */
export type IslandMine = { specialty: Luxury; level: number; wood: number; miners: number }
/** Ana ya da lüks kaynak (Kara Pazar, nakliye). */
export type Good = Resource | Luxury

/**
 * HARİKALAR VE MUCİZELER (Ikariam'ın ada harikaları ve tapınağı).
 * Her adanın bir harikası vardır; harika bağışla yükselir, Cami'deki
 * imamların biriktirdiği inançla harikanın mucizesi çağrılır.
 */
export const MIRACLE_IDS = ['kalkan', 'bereket', 'ilim', 'savas', 'ruzgar', 'huzur', 'bolluk', 'demirci'] as const
export type MiracleId = typeof MIRACLE_IDS[number]
export const MIRACLES: Record<MiracleId, { wonder: string; name: string; effect: (level: number) => string }> = {
  kalkan: { wonder: 'Kız Kulesi', name: 'Kalkan', effect: l => `Şehir savunması +%${10 * l}` },
  bereket: { wonder: 'Bereket Bahçeleri', name: 'Bereket', effect: l => `Akçe, kereste ve taş üretimi +%${5 * l}` },
  ilim: { wonder: 'Bilgelik Kütüphanesi', name: 'İlham', effect: l => `İlim üretimi +%${10 * l}` },
  savas: { wonder: 'Ateş Ocağı', name: 'Cenk', effect: l => `Birliklerin saldırısı +%${5 * l}` },
  ruzgar: { wonder: 'Denizciler Mabedi', name: 'Poyraz', effect: l => `Yolculuk süresi -%${8 * l}` },
  huzur: { wonder: 'Huzur Çeşmesi', name: 'Huzur', effect: l => `Huzur +${40 * l}` },
  bolluk: { wonder: 'Hasat Sofrası', name: 'Bolluk', effect: l => `Lüks kaynak üretimi +%${10 * l}` },
  demirci: { wonder: 'Tophane-i Âmire', name: 'Demirci', effect: l => `Birlik eğitimi %${8 * l} hızlı` },
}
export type Temple = {
  priests: number; faith: number
  wonder: MiracleId; wonderLevel: number; wonderWood: number
  active: MiracleId | null; until: number; cooldownUntil: number
}
export const WONDER_MAX = 5
export function wonderCost(level: number) { return Math.round(2500 * 2 ** level) }
export function miracleCost(level: number) { return 500 + 250 * level }
export function miracleMinutes(level: number) { return 20 + 10 * level }
export const MIRACLE_COOLDOWN_MS = 3 * 3600_000
export const FAITH_CAP = 5000
export function priestCapacity(g: Game) { return g.buildings.cami * 8 }
/** O an etkin mucizenin gücü (seviye), yoksa 0. */
export function miracle(g: Game, id: MiracleId) {
  const t = g.temple
  return t && t.active === id && g.updatedAt < t.until ? t.wonderLevel : 0
}
/**
 * YÖNETİM BİÇİMLERİ (Ikariam'daki hükümet biçimleri). Devlet Nizamı araştırmasıyla
 * açılır; değiştirmek akçe ister ve kısa bir kargaşa (anarşi) dönemi getirir.
 */
export const GOVERNMENT_IDS = ['saltanat', 'ayan', 'sipahi', 'meclis', 'kanun', 'loncalar', 'ilmiye', 'mesihat'] as const
export type GovernmentId = typeof GOVERNMENT_IDS[number]
export const GOVERNMENTS: Record<GovernmentId, { name: string; effects: string[] }> = {
  saltanat: { name: 'Saltanat', effects: ['Dengeli yönetim: ne artı ne eksi.'] },
  ayan: { name: 'Âyan Yönetimi', effects: ['İnşaat %20 hızlı', 'Akçe geliri +%5', 'Yolsuzluk +%3'] },
  sipahi: { name: 'Sipahi Yönetimi', effects: ['Birlik bakımı -%20', 'Eğitim %10 hızlı', 'Huzur -75'] },
  meclis: { name: 'Meşveret Meclisi', effects: ['Huzur +75', 'İlim +%5', 'Birlik bakımı +%5'] },
  kanun: { name: 'Kanun Devleti', effects: ['Yolsuzluk -%5', 'Casus savunması +%20', 'Eğitim %5 yavaş'] },
  loncalar: { name: 'Loncalar', effects: ['Yolculuk %10 hızlı', 'Ticaret kapasitesi +%20', 'İnşaat %5 yavaş'] },
  ilmiye: { name: 'İlmiye', effects: ['İlim +%10', 'Âlim bakımı -%20', 'Huzur -25'] },
  mesihat: { name: 'Meşihat', effects: ['İnanç +%50', 'Huzur +50', 'İlim -%5'] },
}
export type Government = { id: GovernmentId; changedAt: number; anarchyUntil: number }
export const ANARCHY_MS = 20 * 60_000
export const GOVERNMENT_COOLDOWN_MS = 6 * 3600_000
export function governmentCost(g: Game) { return 400 * Math.max(1, g.buildings.divan) }
/** Anarşi sürüyor mu (yönetim değişikliğinden hemen sonra). */
export function anarchy(g: Game) { return !!g.government && g.updatedAt < g.government.anarchyUntil }
export const govIs = (g: Game, id: GovernmentId) => !anarchy(g) && (g.government?.id ?? 'saltanat') === id

/** ADA ORMANI (Ikariam'ın ada kereste ocağı): işçi ve kereste bağışıyla büyür. */
export type IslandForest = { level: number; wood: number; workers: number }
export const FOREST_MAX_LEVEL = 25
export const FOREST_WORKERS_PER_LEVEL = 14
export function forestCapacity(g: Game) { return Math.floor(g.forest.level * FOREST_WORKERS_PER_LEVEL * (g.research.includes('yardim_eli') ? 1.25 : 1)) }
export function forestUpgradeCost(level: number) { return Math.round(400 * 1.5 ** (level - 1)) }

export const BUILDING_IDS = ['divan', 'saray', 'elcilik', 'konut', 'hamam', 'carsi', 'ambar', 'kereste', 'tas', 'medrese', 'kisla', 'surlar', 'liman', 'tersane', 'kahvehane', 'cami', 'muze', 'marangoz', 'mimar', 'ormanci', 'tasci', 'tophane',
  'bagci', 'simyahane', 'camci', 'mahzen', 'gozlukcu', 'barutane', 'depo', 'ticaret_merkezi', 'harita_arsivi', 'valilik', 'korsan_kalesi', 'kara_pazar', 'siginak', 'tekke', 'mabet', 'karagoz'] as const
export type BuildingId = typeof BUILDING_IDS[number]
export const COAST_FACING_IDS = ['liman', 'tersane'] as const
export type CoastBuildingId = typeof COAST_FACING_IDS[number]
export type CoastFacing = 'left' | 'straight' | 'right'
export type CoastFacings = Record<CoastBuildingId, CoastFacing>
export const RESEARCH_IDS = [
  'tools', 'storage', 'ticaret', 'architecture', 'alimler', 'celik',
  'istihkam', 'pusula', 'yelken',
  'makara', 'geometri', 'su_terazisi', 'ormancilik', 'tascilik',
  'kent_planlama', 'ambar_teknigi', 'kagit', 'murekkep',
  'mekanik_kalem', 'talim', 'zirh', 'barut', 'askeri_lojistik',
  'haritacilik', 'yukleme', 'gemi_govdesi',
  'bagcilik', 'simya', 'camcilik', 'optik', 'tip', 'muhendislik', 'kusatma', 'rum_atesi', 'deniz_topculugu',
  // Ikariam'ın geri kalan araştırma ağacı (her dal ~15 araştırma).
  'koruma', 'zenginlik', 'tatil', 'mutfak', 'yardim_eli', 'yasama', 'burokrasi', 'utopya',
  'kuyu', 'casusluk', 'devlet', 'kultur', 'anatomi', 'deney', 'din', 'kus_ucusu', 'matbaa',
  'kuru_havuz', 'meslek_ordusu', 'seref', 'balistik', 'top_dokum',
  'guverte', 'korsanlik', 'genisleme', 'zift', 'yabanci_kultur', 'hafif_tekne', 'ikmal', 'havan',
  // Hava ve buhar çağı birlikleri.
  'kanat', 'roket', 'zenberek', 'dalgic', 'buhar',
  // Mitoloji dalı (Ikariam'ın beşinci dalı): kadim Türk inancı.
  'ongun_toresi', 'balbal', 'destan', 'kam_ayini', 'tore', 'gok_kutu',
] as const
export type ResearchId = typeof RESEARCH_IDS[number]

/** Ikariam'daki gibi beş araştırma dalı (Mitoloji tanrılar ve gösterilerle ilgilidir). */
export type ResearchBranch = 'ekonomi' | 'bilim' | 'askeri' | 'denizcilik' | 'mitoloji'
export const RESEARCH_BRANCHES: { key: ResearchBranch; title: string }[] = [
  { key: 'ekonomi', title: 'Ekonomi' },
  { key: 'bilim', title: 'Bilim' },
  { key: 'askeri', title: 'Askerî' },
  { key: 'denizcilik', title: 'Denizcilik' },
  { key: 'mitoloji', title: 'Mitoloji' },
]
/**
 * Suren bir is.
 *
 * `count` YALNIZCA egitimde kullanilir: bir kisla emri tek tek degil, parti
 * halinde verilir (5 yeniceri tek istir). Insaat ve arastirmada adet kavrami
 * yoktur, bu yuzden alan istege bagli birakildi.
 */
export type Job = { id: BuildingId | ResearchId | UnitId; kind: 'build' | 'research' | 'drill'; start: number; end: number; count?: number }

/**
 * YAPI ARSALARI.
 *
 * Konumlar artik RESIMDEN OLCULMUYOR, izometrik izgaradan hesaplaniyor
 * (bkz. layout.ts). Bu dosya yalnizca "kac arsa var ve hangisi hangi
 * bolgede" bilgisini kullanir; piksel isi cizim katmaninda kalir.
 */
export const PLOTS = SLOTS

/** Halkin calisabilecegi uretim yapilari. */
export const WORKER_IDS = ['kereste', 'tas', 'medrese', 'carsi'] as const
export type WorkerId = typeof WORKER_IDS[number]
export type Workers = Record<WorkerId, number>

/** Bir yapinin her SEVIYESININ aldigi isci sayisi. */
export const WORKERS_PER_LEVEL = 20

/** Ayni anda siraya alinabilecek inşaat sayisi. */
export const QUEUE_LIMIT = 3

export type Game = {
  version: 3; updatedAt: number; resources: Resources; buildings: Record<BuildingId, number>
  /** Hangi yapi hangi arsada; hic kurulmamis yapi icin null. */
  placement: Record<BuildingId, number | null>
  /** Uretim yapilarina dagitilmis isciler. */
  workers: Workers
  research: ResearchId[]
  /**
   * INSAAT SIRASI, en ondeki calisiyor.
   *
   * Tek bir `construction` alani vardi ve oyuncu her isin bitmesini ekrana
   * bakarak beklemek zorundaydi. Sirada bekleyen isin sayaci, KENDINDEN
   * ONCEKI bittiginde baslar - bu yuzden is bitimleri advance() icinde
   * yeniden zamanlanir.
   */
  queue: Job[]
  study: Job | null
  /**
   * EĞİTİM SIRASI (Ikariam gibi): her yapının (Kışla, Tersane, Elçilik, Liman)
   * kendi sırası vardır ve yapılar aynı anda eğitir; bir yapıdaki emirler
   * birbiri ardına yürür.
   */
  drills: Job[]
  /** Sehrin elindeki birlikler. */
  army: Army
  /**
   * Oyuncunun KENDI dosedigi yollar; her oge bir yol hucresi kimligi ("col,row",
   * bkz. layout.ROAD_CELLS). Belediye cakili, ama yol agini oyuncu kurar.
   */
  roads: string[]
  /**
   * Aynalanmis (sag-sol cevrilmis) binalar. Tek sprite oldugu icin gercek
   * donme yok; oyuncu binayi yatayda cevirebilir (flipX).
   */
  flips: BuildingId[]
  /** Kıyı yapılarının görsel yönü. Oyun mekaniğini etkilemez. */
  coastFacing: CoastFacings
  /** Lüks kaynak ambarı (ana kaynaklarla aynı ambar kapasitesini paylaşır). */
  luxury: LuxuryStock
  /** Şehrin adasındaki lüks kaynak madeni. */
  mine: IslandMine
  /** Yetişkin halk: huzur ve barınma tavanına doğru ZAMANLA büyür (eski kayıtta yok = tavanda). */
  citizens?: number
  /** Cami imamları, inanç, adanın harikası ve mucize durumu. */
  temple: Temple
  /** Tophane'de birlik başına saldırı/zırh yükseltmeleri. */
  upgrades: Partial<Record<UnitId, { atk: number; def: number }>>
  /** Tekrarlanan "Gelecek" araştırmalarının seviyeleri. */
  future: Record<ResearchBranch, number>
  /** Korsan Kalesi seferlerinden kazanılan korsan şöhreti. */
  piracy: number
  /** Ada ormanı: işçiler kereste keser, bağış seviye kazandırır. */
  forest: IslandForest
  /** Kahvehane'de ikram edilen seviye (0..Kahvehane seviyesi); yoksa hepsi. */
  tavern?: number
  /** Yönetim biçimi. */
  government: Government
  /** Ahi Tekkesi: himmet, loncalara adanan himmet, himaye edilen loncalar. */
  guilds: Guilds
  /** Ongun Mabedi: lütuf, hami tanrı, kudretlerin dinlenmesi, süren kudret. */
  gods: Gods
  /** Karagöz Perdesi: süren gösteri ve perdenin yeniden açılacağı an. */
  shows?: Shows
  /** Yürürlükteki kültür anlaşması sayısı (her biri +50 huzur; imparatorluk yazar). */
  culture?: number
  /** Şehrin sayaçları (günlük görevler için). */
  stats: { builds: number; trained: number; researched: number; donated: number; raids?: number }
  /**
   * İmparatorluk bilgisi (empire.ts her ilerlemede yazar): toplam şehir
   * sayısı ve bu şehir başkent mi. Tek şehirli oyunda yoktur = başkent.
   */
  empire?: { cities: number; capital: boolean }
  claimed: string[]; log: { text: string; time: number }[]
}

/** Bu yapi bir arsa kaplar mi? (Surlar kaplamaz.) */
export function takesPlot(id: BuildingId) { return BUILDINGS[id].zone !== 'sur' }
/** Bu yapinin kurulabilecegi bolge. */
export function zoneOf(id: BuildingId): Zone { return BUILDINGS[id].zone === 'liman' ? 'liman' : 'sehir' }

/** Su an calisan insaat; sira bossa null. */
export function activeJob(g: Game): Job | null { return g.queue[0] ?? null }
export const RESOURCE_NAMES: Record<Resource, string> = { gold: 'Akçe', wood: 'Kereste', stone: 'Taş', knowledge: 'İlim' }
