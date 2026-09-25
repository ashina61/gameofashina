import { SLOTS, START_ROADS, isRoadCell, type Zone } from './layout'

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
 * rahiplerin biriktirdiği inançla harikanın mucizesi çağrılır.
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
const govIs = (g: Game, id: GovernmentId) => !anarchy(g) && (g.government?.id ?? 'saltanat') === id

/** ADA ORMANI (Ikariam'ın ada kereste ocağı): işçi ve kereste bağışıyla büyür. */
export type IslandForest = { level: number; wood: number; workers: number }
export const FOREST_MAX_LEVEL = 25
export const FOREST_WORKERS_PER_LEVEL = 14
export function forestCapacity(g: Game) { return Math.floor(g.forest.level * FOREST_WORKERS_PER_LEVEL * (g.research.includes('yardim_eli') ? 1.25 : 1)) }
export function forestUpgradeCost(level: number) { return Math.round(400 * 1.5 ** (level - 1)) }

export const BUILDING_IDS = ['divan', 'saray', 'elcilik', 'konut', 'hamam', 'carsi', 'ambar', 'kereste', 'tas', 'medrese', 'kisla', 'surlar', 'liman', 'tersane', 'kahvehane', 'cami', 'muze', 'marangoz', 'mimar', 'ormanci', 'tasci', 'tophane',
  'bagci', 'simyahane', 'camci', 'mahzen', 'gozlukcu', 'barutane', 'depo', 'ticaret_merkezi', 'harita_arsivi', 'valilik', 'korsan_kalesi', 'kara_pazar', 'siginak'] as const
export type BuildingId = typeof BUILDING_IDS[number]
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
] as const
export type ResearchId = typeof RESEARCH_IDS[number]

/** Ikariam'daki gibi dort araştırma dalı. */
export type ResearchBranch = 'ekonomi' | 'bilim' | 'askeri' | 'denizcilik'
export const RESEARCH_BRANCHES: { key: ResearchBranch; title: string }[] = [
  { key: 'ekonomi', title: 'Ekonomi' },
  { key: 'bilim', title: 'Bilim' },
  { key: 'askeri', title: 'Askerî' },
  { key: 'denizcilik', title: 'Denizcilik' },
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
  /** Lüks kaynak ambarı (ana kaynaklarla aynı ambar kapasitesini paylaşır). */
  luxury: LuxuryStock
  /** Şehrin adasındaki lüks kaynak madeni. */
  mine: IslandMine
  /** Yetişkin halk: huzur ve barınma tavanına doğru ZAMANLA büyür (eski kayıtta yok = tavanda). */
  citizens?: number
  /** Cami rahipleri, inanç, adanın harikası ve mucize durumu. */
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
  /** Yürürlükteki kültür anlaşması sayısı (her biri +50 huzur; imparatorluk yazar). */
  culture?: number
  /** Şehrin sayaçları (günlük görevler için). */
  stats: { builds: number; trained: number; researched: number; donated: number }
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
/**
 * Yapi katalogu.
 *
 * `art` alani, o yapinin BOYALI GORSELI olup olmadigini soyler. Yeni bir yapi
 * once kurallariyla eklenir, gorseli sonra gelir; bu alan olmasaydi eksik
 * dosya haritada kirik resim olarak gorunurdu. Gorsel gelince tek yapilacak
 * sey bu bayragi cevirmektir.
 */
export type BuildingDef = {
  name: string; category: string; description: string
  /** 1. seviyenin temel maliyeti; ustu 1,65 katlanarak artar. */
  base: number
  /** Boyali gorseli var mi? Yoksa harita onu tas kaide olarak cizer. */
  art: boolean
  /**
   * Hangi bolgeye kurulur. Verilmezse sehir izgarasi.
   *
   * 'sur' ozeldir: ARSA KAPLAMAZ, sehrin cevresine orulur. Surlari bir
   * arsaya oturtmak hem gorsel olarak yanlis olurdu hem de oyuncuya
   * "savunma mi yoksa uretim mi" diye sahte bir secim dayatirdi.
   */
  zone?: Zone | 'sur'
  /** Kurulmadan once gereken yapi ve seviyesi. */
  needs?: { id: BuildingId; level: number }
  /** Kurulmadan once gereken araştırma (Ikariam'daki gibi binalar araştırmayla açılır). */
  tech?: ResearchId
  /** Yalnızca başkentte (Saray) ya da yalnızca kolonide (Valilik) kurulur. */
  only?: 'capital' | 'colony'
}

/**
 * YAPI KATALOGU - yeni bina eklemenin TEK yeri.
 *
 * Bir satir yeterlidir: isim, maliyet, varsa on kosul ve bolge. Arsa
 * koordinati, baslangic seviyesi, kayit gocu ve haritadaki cizim bu
 * satirdan turer; hicbirini elle yazmak gerekmez.
 */
export const BUILDINGS: Record<BuildingId, BuildingDef> = {
  divan: { name: 'Divanhane', category: 'YÖNETİM', description: 'Şehrinin kalbi. Yeni yapıları ve daha yüksek bina seviyelerini açar.', base: 100, art: true },
  konut: { name: 'Konaklar', category: 'HALK VE EKONOMİ', description: 'Yeni ailelere yuva, şehrine gelir. Her seviyede nüfus ve akçe üretimi artar.', base: 70, art: true },
  kereste: { name: 'Kereste Ocağı', category: 'ÜRETİM', description: 'Ormanların bereketini şehrine taşır. Her seviyede dakikada 120 kereste üretir.', base: 60, art: true },
  tas: { name: 'Taş Ocağı', category: 'ÜRETİM', description: 'Ustalarının ihtiyacı olan sağlam taş. Her seviyede dakikada 90 taş üretir.', base: 70, art: true },
  ambar: { name: 'Ambar', category: 'DEPOLAMA', description: 'Emeğini güvenle sakla. Her seviye tüm kaynakların kapasitesine 1.500 ekler.', base: 90, art: true },
  medrese: { name: 'Medrese', category: 'BİLİM', description: 'Gelecek, bilgiyle kurulur. İlim üretir ve kalıcı bonuslar veren araştırmaları açar.', base: 120, art: true, needs: { id: 'divan', level: 2 } },
  carsi: { name: 'Çarşı', category: 'TİCARET', description: 'Esnafın sesi, şehrin bereketi. Çalışan her esnaf hazineye akçe taşır.', base: 110, art: true },
  hamam: { name: 'Hamam', category: 'HALKIN HUZURU', description: 'Halkın huzuru, şehrin gücüdür. Her seviye şehrin geçindirebileceği nüfusu artırır.', base: 130, art: true },
  saray: { name: 'Saray', category: 'YÖNETİM', description: 'Hükmünü uzağa taşır. Yalnızca başkentte kurulur; seviyesi kaç koloni kurabileceğini belirler ve kolonilerdeki yolsuzluğu azaltır.', base: 320, art: true, needs: { id: 'divan', level: 3 }, only: 'capital' },
  elcilik: { name: 'Elçilik', category: 'YÖNETİM', description: 'Komşularınla konuşmanın kapısı. Diplomasi danışmanını ve ittifak defterini açar.', base: 200, art: true, needs: { id: 'divan', level: 2 } },
  kisla: { name: 'Kışla', category: 'ASKERÎ', description: 'Halkından asker yetiştirir. Her eğitilen vatandaş üretimden düşer — ordunun bedeli budur.', base: 180, art: true, needs: { id: 'divan', level: 2 } },
  surlar: { name: 'Surlar', category: 'ASKERÎ', description: 'Şehrin taş kalkanı. Her seviye savunmaya asker gerektirmeyen güç ekler. Arsa kaplamaz — şehrin çevresine örülür.', base: 150, art: true, zone: 'sur', needs: { id: 'kisla', level: 1 } },
  liman: { name: 'Ticaret Limanı', category: 'LİMAN', description: 'Denizin kapısı. Ticaret kapasitesi verir ve nakliye gemisi inşa ettirir.', base: 160, art: true, zone: 'liman', needs: { id: 'divan', level: 2 } },
  tersane: { name: 'Tersane', category: 'LİMAN', description: 'Savaş gemilerinin doğduğu yer. Kadırga ve kalyon buradan denize iner. Şehirde değil, denizin kenarındaki iskeleye kurulur.', base: 240, art: true, zone: 'liman', needs: { id: 'liman', level: 1 } },
  /*
   * IKARIAM KARSILIKLARI. Ikariam'daki Meyhane/Müze huzuru, Marangoz/Mimar
   * maliyeti, Ormancı/Taşçı üretimi, Atölye ordunun gücünü artırır. Etkiler
   * seviye başına sabittir ve aşağıdaki BUILDING_EFFECTS'ten tek yerden okunur.
   */
  kahvehane: { name: 'Kahvehane', category: 'HALKIN HUZURU', description: 'Halk şerbet ve üzüm ikramıyla gönül eğlendirir. Her seviye huzuru 20 artırır; ambarda üzüm varsa dakikada 3 üzüm ikram edilir ve seviye başına +35 huzur daha gelir.', base: 90, art: true, needs: { id: 'divan', level: 2 } },
  cami: { name: 'Cami', category: 'HALKIN HUZURU', description: 'Şehrin manevi merkezi. Her seviye huzuru 35 artırır ve ilim üretimine %2 katkı verir.', base: 180, art: true, needs: { id: 'divan', level: 3 } },
  muze: { name: 'Müze', category: 'HALKIN HUZURU', description: 'Eserlerin sergilendiği kültür yapısı. Her seviye huzuru 40 artırır.', base: 210, art: true, needs: { id: 'medrese', level: 2 } },
  marangoz: { name: 'Marangozhane', category: 'MALİYET', description: 'Kerestenin ustaca işlenmesi. Her seviye bina yapımındaki kereste maliyetini %1 azaltır.', base: 110, art: true, needs: { id: 'kereste', level: 2 } },
  mimar: { name: 'Mimarbaşı Odası', category: 'MALİYET', description: 'Hassas plan, az taş. Her seviye bina yapımındaki taş maliyetini %1 azaltır.', base: 130, art: true, needs: { id: 'tas', level: 2 } },
  ormanci: { name: 'Ormancı Evi', category: 'ÜRETİM', description: 'Fidanlık ve bakım. Her seviye kereste üretimini %2 artırır.', base: 100, art: true, needs: { id: 'kereste', level: 3 } },
  tasci: { name: 'Taşçı Ustası', category: 'ÜRETİM', description: 'Usta taşçıların atölyesi. Her seviye taş ve (mermer adasında) mermer üretimini %2 artırır.', base: 110, art: true, needs: { id: 'tas', level: 3 } },
  bagci: { name: 'Bağcı Evi', category: 'ÜRETİM', description: 'Bağların bakımı. Her seviye adadan çıkan üzümü %2 artırır.', base: 100, art: true, tech: 'bagcilik' },
  simyahane: { name: 'Simyahane', category: 'ÜRETİM', description: 'Kükürdü arıtan simyacılar. Her seviye kükürt üretimini %2 artırır.', base: 120, art: true, tech: 'simya' },
  camci: { name: 'Camcı Atölyesi', category: 'ÜRETİM', description: 'Kristali işleyen ustalar. Her seviye kristal üretimini %2 artırır.', base: 120, art: true, tech: 'camcilik' },
  mahzen: { name: 'Şıra Mahzeni', category: 'MALİYET', description: 'Üzüm soğuk mahzende saklanır. Her seviye Kahvehane\'nin üzüm tüketimini %1 azaltır.', base: 110, art: true, tech: 'bagcilik' },
  gozlukcu: { name: 'Gözlükçü', category: 'MALİYET', description: 'Hassas mercekler, az fire. Her seviye kristal maliyetini %1 azaltır.', base: 130, art: true, tech: 'optik' },
  barutane: { name: 'Barut Deneme Alanı', category: 'MALİYET', description: 'Barut karışımları denenir. Her seviye birliklerin kükürt maliyetini %1 azaltır.', base: 140, art: true, tech: 'barut' },
  depo: { name: 'Depo', category: 'DEPOLAMA', description: 'Ambarın yetmediği yerde. Her seviye her kaynağın saklama kapasitesine 2.500 ekler.', base: 150, art: true, tech: 'ambar_teknigi' },
  ticaret_merkezi: { name: 'Ticaret Merkezi', category: 'TİCARET', description: 'Tüccarların buluştuğu han. Her seviye tüccar partisini 200 artırır, alış fiyatını düşürür, satış fiyatını yükseltir.', base: 170, art: true, tech: 'ticaret', needs: { id: 'carsi', level: 3 } },
  harita_arsivi: { name: 'Harita Arşivi', category: 'LİMAN', description: 'Deniz haritaları ve portolanlar. Her seviye nakliye ve sefer yolculuğunu %2 kısaltır.', base: 180, art: true, tech: 'haritacilik' },
  korsan_kalesi: { name: 'Korsan Kalesi', category: 'LİMAN', description: 'Deniz akıncılarının üssü. Tüccar kervanlarına korsan seferi açar; her seviye yağma ganimetini %10 artırır. Limandaki deniz arsasına kurulur.', base: 260, art: true, zone: 'liman', needs: { id: 'tersane', level: 2 } },
  kara_pazar: { name: 'Kara Pazar', category: 'TİCARET', description: 'Gizli takas: herhangi bir malı başka bir mala çevirir. Seviye yükseldikçe oran iyileşir ve parti büyür.', base: 190, art: true, needs: { id: 'carsi', level: 2 } },
  siginak: { name: 'Gizli Sığınak', category: 'YÖNETİM', description: 'Casusların gizlendiği yer. Her seviye 2 casus yeri ve %3 casusluk başarısı ekler; şehre sızan yabancı casusları yakalar.', base: 170, art: true, tech: 'casusluk', needs: { id: 'elcilik', level: 1 } },
  valilik: { name: 'Valilik', category: 'YÖNETİM', description: 'Kolonide Saray\'ın yerini tutar. Her seviye kolonideki yolsuzluğu azaltır; yalnızca kolonilerde kurulur.', base: 260, art: true, only: 'colony' },
  tophane: { name: 'Tophane', category: 'ASKERÎ', description: 'Top dökümü ve silah atölyesi. Her seviye bütün birliklerin saldırı ve savunmasını %2 artırır.', base: 220, art: true, needs: { id: 'kisla', level: 2 } },
}

/** Ikariam binalarının seviye başına etkileri (tek kaynak). */
export const BUILDING_EFFECTS = {
  kahvehaneContentment: 20, kahvehaneWineBonus: 35, kahvehaneWine: 3,
  camiContentment: 35, camiKnowledge: 0.02,
  muzeContentment: 40,
  marangozWood: 0.01, mimarStone: 0.01,
  ormanciWood: 0.02, tasciStone: 0.02,
  tophanePower: 0.02,
  korsanLoot: 0.1,
  siginakSpies: 2, siginakSpySuccess: 0.03,
  bagciWine: 0.02, simyaSulfur: 0.02, camciCrystal: 0.02, mahzenWine: 0.01,
  gozlukcuCrystal: 0.01, barutaneSulfur: 0.01, depoStorage: 2500, harita: 0.02,
  merchantLimit: 200, merchantBuyStep: 0.25, merchantSellStep: 0.15,
  divanHousing: 20, sarayGold: 0.03,
  /** Kışla/Tersane/Liman/Elçilik: kendi birliklerinin eğitimi seviye başına %3 hızlanır (en fazla %45). */
  drillSpeed: 0.03, drillSpeedCap: 0.45,
  /** Elçilik: seviye başına 2 casus yeri ve %5 casusluk başarısı. */
  elcilikSpies: 2, elcilikSpySuccess: 0.05,
} as const

/*
 * ASKERLER VE GEMILER.
 *
 * Tasarimin tek onemli karari: ASKER HALKTAN CIKAR. Bir birligin `pop`
 * degeri, o birlik var oldugu surece SEHIRDEN eksilen vatandas sayisidir -
 * yani ordu kurmak dogrudan uretimi dusurur ve Hamam (huzur) birden
 * degerlenir. Ayri bir "asker sayaci" tutmak bu bagi koparirdi.
 *
 * Egitim BOSTAKI halktan alinir; calisan isci asla sessizce askere gitmez.
 * Oyuncu once Halk panelinden adam bosaltir, sonra Kisla'ya gelir. Bu, bir
 * ekranin baska bir ekrani nicin etkiledigini gorunur kilar.
 */
export const UNIT_IDS = ['yeniceri', 'okcu', 'sipahi', 'topcu', 'kadirga', 'kalyon', 'nakliye', 'casus',
  'mizrakci', 'azap', 'sapanci', 'tufekci', 'kocbasi', 'mancinik', 'asci', 'hekim', 'ates_gemisi', 'mancinik_gemisi',
  'deli', 'humbaraci', 'karamursel', 'humbara_gemisi', 'ikmal_gemisi',
  // Hava birlikleri ve Ikariam'ın kalan gemileri (dönem karşılıklarıyla).
  'hezarfen', 'lagari', 'zenberek_gemisi', 'dalgic_gemisi', 'buharli_koc', 'balon_gemisi'] as const
export type UnitId = typeof UNIT_IDS[number]
export type Army = Record<UnitId, number>
/**
 * Birliğin savaş alanındaki yeri (Ikariam'daki savaş sırası):
 * front = ön cephe, flank = kanat, range = uzak menzil, artillery = kuşatma,
 * bomber = hava (bombardıman), fighter = hava savunması (yalnız havadakine vurur),
 * support = aşçı/hekim, spy = casus, transport = nakliye.
 */
export type UnitRole = 'front' | 'flank' | 'range' | 'artillery' | 'bomber' | 'fighter' | 'support' | 'spy' | 'transport'
export type Unit = {
  name: string; branch: 'kara' | 'deniz'
  role: UnitRole
  /** Bu birligi yetistiren yapi. */
  home: BuildingId
  /** O yapinin gerekli en dusuk seviyesi. */
  level: number
  /** Gereken araştırma (varsa). */
  tech?: ResearchId
  description: string
  /** Birlik basina sehirden dusen vatandas. */
  pop: number
  cost: Resources
  attack: number; defense: number
  /** Tek bir birliğin can puanı (savaşta ölmeden önce emdiği hasar). */
  hp: number
  /** Dakikalık akçe bakım gideri (Ikariam'da birlikler maaş alır). */
  upkeep: number
  /** Tek bir birligin egitim suresi, saniye. */
  seconds: number
  /** Nakliyenin tasidigi mal; digerlerinde 0. */
  cargo: number
}
const R = (gold: number, wood: number, stone = 0): Resources => ({ gold, wood, stone, knowledge: 0 })
export const UNITS: Record<UnitId, Unit> = {
  // ÖN CEPHE
  mizrakci: { name: 'Mızrakçı', branch: 'kara', role: 'front', home: 'kisla', level: 1, description: 'Ucuz ve sağlam. Ön safı tutar, saldırısı zayıftır.', pop: 1, cost: R(40, 30), attack: 6, defense: 12, hp: 40, upkeep: 0.5, seconds: 8, cargo: 0 },
  yeniceri: { name: 'Yeniçeri', branch: 'kara', role: 'front', home: 'kisla', level: 1, description: 'Ordunun belkemiği. Hem vurur hem dayanır.', pop: 1, cost: R(80, 20), attack: 12, defense: 10, hp: 56, upkeep: 1, seconds: 12, cargo: 0 },
  // KANAT
  azap: { name: 'Azap', branch: 'kara', role: 'flank', home: 'kisla', level: 2, description: 'Kılıçlı hafif piyade. Kanattan dalar, okçuları biçer.', pop: 1, cost: R(90, 40), attack: 18, defense: 8, hp: 44, upkeep: 1, seconds: 14, cargo: 0 },
  sipahi: { name: 'Sipahi', branch: 'kara', role: 'flank', home: 'kisla', level: 2, description: 'Atlı akıncı. Hızlıdır, ilk darbeyi o indirir.', pop: 2, cost: R(180, 40), attack: 28, defense: 14, hp: 80, upkeep: 2, seconds: 20, cargo: 0 },
  // UZAK MENZİL
  sapanci: { name: 'Sapancı', branch: 'kara', role: 'range', home: 'kisla', level: 1, description: 'Taş atan ucuz nişancı. Kalabalıkla etkilidir.', pop: 1, cost: R(30, 25), attack: 8, defense: 3, hp: 24, upkeep: 0.5, seconds: 8, cargo: 0 },
  okcu: { name: 'Okçu', branch: 'kara', role: 'range', home: 'kisla', level: 1, description: 'Uzaktan vurur, yakında erir. Yeniçerinin arkasında durur.', pop: 1, cost: R(60, 45), attack: 16, defense: 4, hp: 30, upkeep: 1, seconds: 12, cargo: 0 },
  tufekci: { name: 'Tüfekçi', branch: 'kara', role: 'range', home: 'kisla', level: 4, tech: 'barut', description: 'Barutlu tüfekle en ağır nişancı. Kükürt ister.', pop: 1, cost: R(160, 60), attack: 36, defense: 6, hp: 36, upkeep: 3, seconds: 26, cargo: 0 },
  // KUŞATMA
  kocbasi: { name: 'Koçbaşı', branch: 'kara', role: 'artillery', home: 'kisla', level: 3, tech: 'muhendislik', description: 'Sur kapısını kırar; askere karşı zayıftır.', pop: 3, cost: R(220, 260, 40), attack: 30, defense: 10, hp: 160, upkeep: 3, seconds: 30, cargo: 0 },
  mancinik: { name: 'Mancınık', branch: 'kara', role: 'artillery', home: 'kisla', level: 5, tech: 'kusatma', description: 'Uzaktan taş fırlatır; suru ve safları dağıtır.', pop: 4, cost: R(300, 400, 120), attack: 55, defense: 8, hp: 140, upkeep: 4, seconds: 40, cargo: 0 },
  topcu: { name: 'Topçu', branch: 'kara', role: 'artillery', home: 'kisla', level: 3, description: 'Sur yıkar. Yavaştır ve korunmaya muhtaçtır.', pop: 3, cost: R(320, 140, 90), attack: 65, defense: 6, hp: 120, upkeep: 5, seconds: 34, cargo: 0 },
  deli: { name: 'Deli', branch: 'kara', role: 'front', home: 'kisla', level: 5, tech: 'seref', description: 'Zırhlı, gözü kara ağır piyade. Ön safın en sağlam duvarı.', pop: 2, cost: R(260, 90, 40), attack: 30, defense: 28, hp: 140, upkeep: 3, seconds: 30, cargo: 0 },
  humbaraci: { name: 'Humbaracı', branch: 'kara', role: 'artillery', home: 'kisla', level: 6, tech: 'kus_ucusu', description: 'Humbara (el bombası) atar; surun üstünden safları vurur.', pop: 2, cost: R(380, 120, 60), attack: 70, defense: 4, hp: 60, upkeep: 5, seconds: 40, cargo: 0 },
  // DESTEK
  asci: { name: 'Aşçı', branch: 'kara', role: 'support', home: 'kisla', level: 2, tech: 'askeri_lojistik', description: 'Ordunun moralini yüksek tutar; kazan kaynarsa asker kaçmaz.', pop: 1, cost: R(120, 60), attack: 0, defense: 2, hp: 30, upkeep: 2, seconds: 20, cargo: 0 },
  hekim: { name: 'Hekim', branch: 'kara', role: 'support', home: 'kisla', level: 4, tech: 'tip', description: 'Savaştan sonra yaralıların bir kısmını hayata döndürür.', pop: 1, cost: R(240, 40), attack: 0, defense: 2, hp: 30, upkeep: 3, seconds: 30, cargo: 0 },
  // DENİZ
  kadirga: { name: 'Kadırga', branch: 'deniz', role: 'front', home: 'tersane', level: 1, description: 'Hafif savaş gemisi. Kürekle döner, dar sularda üstündür.', pop: 12, cost: R(600, 420), attack: 45, defense: 35, hp: 420, upkeep: 4, seconds: 45, cargo: 0 },
  ates_gemisi: { name: 'Ateş Gemisi', branch: 'deniz', role: 'range', home: 'tersane', level: 2, tech: 'rum_atesi', description: 'Rum ateşi püskürtür; düşman filosunu tutuşturur.', pop: 10, cost: R(700, 480, 60), attack: 70, defense: 20, hp: 300, upkeep: 5, seconds: 55, cargo: 0 },
  mancinik_gemisi: { name: 'Mancınık Gemisi', branch: 'deniz', role: 'artillery', home: 'tersane', level: 4, tech: 'deniz_topculugu', description: 'Güvertesindeki mancınıkla kıyı surlarını döver.', pop: 14, cost: R(900, 700, 160), attack: 90, defense: 30, hp: 380, upkeep: 6, seconds: 65, cargo: 0 },
  karamursel: { name: 'Karamürsel', branch: 'deniz', role: 'fighter', home: 'tersane', level: 2, tech: 'hafif_tekne', description: 'Hızlı ve ucuz tekne; filonun hava savunması. Düşman balonlarını avlar, hava yoksa kanatlara dalar.', pop: 6, cost: R(380, 300), attack: 40, defense: 15, hp: 220, upkeep: 2, seconds: 30, cargo: 0 },
  humbara_gemisi: { name: 'Humbara Gemisi', branch: 'deniz', role: 'artillery', home: 'tersane', level: 6, tech: 'havan', description: 'Havanlı ağır gemi. Kıyı surlarını ve filoları uzaktan döver.', pop: 16, cost: R(1200, 900, 200), attack: 140, defense: 25, hp: 420, upkeep: 8, seconds: 80, cargo: 0 },
  ikmal_gemisi: { name: 'İkmal Gemisi', branch: 'deniz', role: 'support', home: 'tersane', level: 4, tech: 'ikmal', description: 'Filonun erzakını ve cerrahlarını taşır: moral düşmez, batan gemilerin tayfası kurtarılır.', pop: 10, cost: R(600, 500, 40), attack: 0, defense: 20, hp: 400, upkeep: 3, seconds: 50, cargo: 0 },
  kalyon: { name: 'Kalyon', branch: 'deniz', role: 'front', home: 'tersane', level: 2, description: 'Ağır kalyon. Yavaş ama denizde son sözü söyler.', pop: 25, cost: R(1400, 950, 120), attack: 120, defense: 95, hp: 900, upkeep: 8, seconds: 75, cargo: 0 },
  hezarfen: { name: 'Hezarfen', branch: 'kara', role: 'fighter', home: 'kisla', level: 7, tech: 'kanat', description: 'Kanat takıp süzülen avcı. Düşmanın havadaki birliklerini düşürür; hava yoksa kanatlara dalar.', pop: 1, cost: R(260, 120, 20), attack: 40, defense: 6, hp: 40, upkeep: 3, seconds: 34, cargo: 0 },
  lagari: { name: 'Lagari Roketçisi', branch: 'kara', role: 'bomber', home: 'kisla', level: 8, tech: 'roket', description: 'Barutlu roketle havadan vurur; surun üstünden safları döver. Ona yalnızca Hezarfen yetişir.', pop: 2, cost: R(420, 160, 80), attack: 90, defense: 4, hp: 70, upkeep: 5, seconds: 45, cargo: 0 },
  zenberek_gemisi: { name: 'Zenberek Gemisi', branch: 'deniz', role: 'range', home: 'tersane', level: 3, tech: 'zenberek', description: 'Güvertesinde dev zenberek (arbalet) taşır; uzaktan ucuz ve sürekli atış.', pop: 8, cost: R(520, 420, 20), attack: 40, defense: 18, hp: 260, upkeep: 3, seconds: 42, cargo: 0 },
  dalgic_gemisi: { name: 'Dalgıç Gemisi', branch: 'deniz', role: 'front', home: 'tersane', level: 6, tech: 'dalgic', description: 'Suyun altından yaklaşan gemi: vurulması zordur, gövdelere ağır darbe indirir.', pop: 12, cost: R(900, 520, 140), attack: 75, defense: 30, hp: 280, upkeep: 6, seconds: 70, cargo: 0 },
  buharli_koc: { name: 'Buharlı Koç', branch: 'deniz', role: 'front', home: 'tersane', level: 8, tech: 'buhar', description: 'Buharla yürüyen demir burunlu dev gemi. Denizin en ağır ön cephesi.', pop: 20, cost: R(1800, 1100, 300), attack: 150, defense: 110, hp: 1000, upkeep: 10, seconds: 95, cargo: 0 },
  balon_gemisi: { name: 'Balon Gemisi', branch: 'deniz', role: 'bomber', home: 'tersane', level: 8, tech: 'roket', description: 'Güvertesinden roketli balonlar kaldırır; düşman filosunu havadan döver. Ona yalnızca Karamürsel yetişir.', pop: 14, cost: R(1100, 800, 200), attack: 110, defense: 20, hp: 360, upkeep: 7, seconds: 80, cargo: 0 },
  casus: { name: 'Casus', branch: 'kara', role: 'spy', home: 'elcilik', level: 1, description: 'Elçilikte yetişir. Komşu yerleşimlerin askerini, surunu ve hazinesini gözetler; savaşmaz.', pop: 1, cost: R(140, 0), attack: 0, defense: 0, hp: 10, upkeep: 0.5, seconds: 25, cargo: 0 },
  nakliye: { name: 'Nakliye', branch: 'deniz', role: 'transport', home: 'liman', level: 1, description: 'Asker ve mal taşır. Ticaretin ve seferin ayağıdır.', pop: 8, cost: R(450, 340), attack: 0, defense: 18, hp: 200, upkeep: 1, seconds: 40, cargo: 500 },
}
export const RESEARCH: Record<ResearchId, { branch: ResearchBranch; name: string; description: string; cost: number; duration: number; required: number; needs?: ResearchId }> = {
  // EKONOMİ
  tools: { branch: 'ekonomi', name: 'Usta Elleri', description: 'Akçe, kereste, taş ve ilim üretimi kalıcı olarak %20 artar.', cost: 30, duration: 30, required: 1 },
  storage: { branch: 'ekonomi', name: 'Ambar Nizamı', description: 'Tüm kaynakların depolama kapasitesi kalıcı olarak %25 artar.', cost: 50, duration: 40, required: 1 },
  ticaret: { branch: 'ekonomi', name: 'Ticaret Yolları', description: 'Ticaret Limanı kapasitesi kalıcı olarak %30 artar; Ticaret Merkezi açılır.', cost: 110, duration: 55, required: 3, needs: 'storage' },
  makara: { branch: 'ekonomi', name: 'Makara Düzeni', description: 'Yeni bina yükseltmelerinin kereste ve taş maliyeti %2 azalır.', cost: 24, duration: 25, required: 1 },
  geometri: { branch: 'ekonomi', name: 'Hendese', description: 'Yeni bina yükseltmelerinin kereste ve taş maliyeti ek %4 azalır.', cost: 180, duration: 55, required: 3, needs: 'makara' },
  su_terazisi: { branch: 'ekonomi', name: 'Su Terazisi', description: 'Yeni bina yükseltmelerinin kereste ve taş maliyeti ek %8 azalır.', cost: 900, duration: 105, required: 5, needs: 'geometri' },
  ormancilik: { branch: 'ekonomi', name: 'Ormancılık', description: 'Kereste Ocağı üretimi %15 artar.', cost: 130, duration: 55, required: 2, needs: 'tools' },
  tascilik: { branch: 'ekonomi', name: 'Taş İşçiliği', description: 'Taş Ocağı üretimi %15 artar.', cost: 200, duration: 65, required: 3, needs: 'ormancilik' },
  kent_planlama: { branch: 'ekonomi', name: 'Şehir Planlaması', description: 'Şehir nüfus barınma kapasitesi 40 artar.', cost: 420, duration: 85, required: 4, needs: 'storage' },
  ambar_teknigi: { branch: 'ekonomi', name: 'Geniş Ambarlar', description: 'Kaynak saklama kapasitesi ek %15 artar; Depo açılır.', cost: 480, duration: 95, required: 4, needs: 'storage' },
  // BİLİM
  architecture: { branch: 'bilim', name: 'Mimarın Sırrı', description: 'Yeni inşaat ve eğitim %25 daha hızlı tamamlanır.', cost: 80, duration: 45, required: 2 },
  alimler: { branch: 'bilim', name: 'Âlimler Meclisi', description: 'İlim üretimi kalıcı olarak %30 artar.', cost: 130, duration: 55, required: 3 },
  kagit: { branch: 'bilim', name: 'Kâğıt', description: 'Medrese ilim üretimi %2 artar.', cost: 30, duration: 28, required: 1 },
  murekkep: { branch: 'bilim', name: 'Mürekkep', description: 'Medrese ilim üretimi ek %4 artar.', cost: 250, duration: 65, required: 3, needs: 'kagit' },
  mekanik_kalem: { branch: 'bilim', name: 'Mekanik Kalem', description: 'Medrese ilim üretimi ek %8 artar.', cost: 800, duration: 105, required: 5, needs: 'murekkep' },
  // ASKERÎ
  celik: { branch: 'askeri', name: 'Çelik Tavı', description: 'Kara birliklerinin saldırısı %15 artar.', cost: 100, duration: 50, required: 2 },
  istihkam: { branch: 'askeri', name: 'İstihkâm', description: 'Surların savunması %30 artar.', cost: 150, duration: 60, required: 3, needs: 'celik' },
  talim: { branch: 'askeri', name: 'Talim Nizamı', description: 'Kara ve deniz birliklerinin eğitim süresi %10 kısalır.', cost: 115, duration: 48, required: 2 },
  zirh: { branch: 'askeri', name: 'Zırh Ustalığı', description: 'Kara birliklerinin savunması %10 artar.', cost: 300, duration: 75, required: 4, needs: 'celik' },
  barut: { branch: 'askeri', name: 'Barut Ustalığı', description: 'Topçuların saldırısı %15 artar; Tüfekçi ve Barut Deneme Alanı açılır.', cost: 490, duration: 90, required: 5, needs: 'celik' },
  askeri_lojistik: { branch: 'askeri', name: 'Askerî Lojistik', description: 'Yeni asker eğitiminde akçe ve kereste maliyeti %10 azalır; Aşçı yetiştirilebilir.', cost: 320, duration: 80, required: 4, needs: 'talim' },
  // DENİZCİLİK
  pusula: { branch: 'denizcilik', name: 'Pusula', description: 'Nakliye gemilerinin kargosu %50 artar.', cost: 90, duration: 50, required: 2 },
  yelken: { branch: 'denizcilik', name: 'Yelken Ustalığı', description: 'Deniz birliklerinin saldırısı %15 artar.', cost: 140, duration: 60, required: 3, needs: 'pusula' },
  haritacilik: { branch: 'denizcilik', name: 'Haritacılık', description: 'Şehirler arası nakliye süresi %15 azalır; Harita Arşivi açılır.', cost: 200, duration: 60, required: 3, needs: 'pusula' },
  yukleme: { branch: 'denizcilik', name: 'Liman Yükleme Usulleri', description: 'Nakliye kapasitesi ek %20 artar.', cost: 380, duration: 75, required: 4, needs: 'ticaret' },
  bagcilik: { branch: 'ekonomi', name: 'Bağcılık', description: 'Bağcı Evi ve Şıra Mahzeni kurulabilir.', cost: 160, duration: 50, required: 2, needs: 'tools' },
  simya: { branch: 'bilim', name: 'Simya', description: 'Simyahane kurulabilir.', cost: 260, duration: 60, required: 3, needs: 'alimler' },
  camcilik: { branch: 'bilim', name: 'Cam Ustalığı', description: 'Camcı Atölyesi kurulabilir.', cost: 220, duration: 55, required: 3, needs: 'kagit' },
  optik: { branch: 'bilim', name: 'Optik', description: 'Gözlükçü kurulabilir.', cost: 420, duration: 80, required: 4, needs: 'camcilik' },
  tip: { branch: 'bilim', name: 'Tıp', description: 'Hekim yetiştirilebilir: savaştan sonra yaralıları kurtarır.', cost: 360, duration: 75, required: 4, needs: 'alimler' },
  muhendislik: { branch: 'askeri', name: 'Askerî Mühendislik', description: 'Koçbaşı yapılabilir.', cost: 180, duration: 55, required: 2, needs: 'celik' },
  kusatma: { branch: 'askeri', name: 'Kuşatma Sanatı', description: 'Mancınık yapılabilir.', cost: 340, duration: 75, required: 3, needs: 'muhendislik' },
  rum_atesi: { branch: 'denizcilik', name: 'Rum Ateşi', description: 'Ateş Gemisi yapılabilir.', cost: 300, duration: 70, required: 3, needs: 'yelken' },
  deniz_topculugu: { branch: 'denizcilik', name: 'Deniz Topçuluğu', description: 'Mancınık Gemisi yapılabilir.', cost: 450, duration: 90, required: 4, needs: 'rum_atesi' },
  // EKONOMİ (devam)
  koruma: { branch: 'ekonomi', name: 'Koruma Usulü', description: 'Ambar yağmaya karşı her malın %35\'ini korur (önce %20).', cost: 140, duration: 45, required: 2, needs: 'storage' },
  zenginlik: { branch: 'ekonomi', name: 'Zenginlik', description: 'Ada madeninin lüks üretimi %10 artar.', cost: 220, duration: 55, required: 3, needs: 'tools' },
  tatil: { branch: 'ekonomi', name: 'Bayram Tatili', description: 'Şehirlerde huzur 25 artar.', cost: 260, duration: 60, required: 3 },
  mutfak: { branch: 'ekonomi', name: 'Saray Mutfağı', description: 'Kahvehane\'nin üzüm tüketimi %10 azalır, üzümlü ikramın huzuru %20 artar.', cost: 300, duration: 65, required: 3, needs: 'bagcilik' },
  yardim_eli: { branch: 'ekonomi', name: 'İmece', description: 'Ada madeni ve ormanı %25 daha çok işçi alır.', cost: 360, duration: 70, required: 4, needs: 'zenginlik' },
  yasama: { branch: 'ekonomi', name: 'Kanunnâme', description: 'Kolonilerdeki yolsuzluk %25 azalır.', cost: 520, duration: 85, required: 5, needs: 'tatil' },
  burokrasi: { branch: 'ekonomi', name: 'Bürokrasi', description: 'Her şehirde bir hamle puanı daha.', cost: 700, duration: 95, required: 6, needs: 'yasama' },
  utopya: { branch: 'ekonomi', name: 'Erdemli Şehir', description: 'Başkentte huzur 200 artar.', cost: 2400, duration: 150, required: 10, needs: 'burokrasi' },
  // BİLİM (devam)
  kuyu: { branch: 'bilim', name: 'Kuyu Kazımı', description: 'Başkentte huzur ve barınma 50 artar.', cost: 60, duration: 30, required: 1 },
  casusluk: { branch: 'bilim', name: 'Casusluk', description: 'Casusların başarısı %10 artar; Gizli Sığınak kurulabilir.', cost: 150, duration: 45, required: 2 },
  devlet: { branch: 'bilim', name: 'Devlet Nizamı', description: 'Divanhane\'de yönetim biçimi seçilebilir.', cost: 400, duration: 75, required: 4, needs: 'kagit' },
  kultur: { branch: 'bilim', name: 'Kültür Alışverişi', description: 'Müze\'nin huzur katkısı %50 artar; yabancı hükümdarlarla kültür anlaşması yapılabilir.', cost: 480, duration: 80, required: 5, needs: 'devlet' },
  anatomi: { branch: 'bilim', name: 'Teşrih', description: 'Hekimler savaştan sonra iki kat asker kurtarır.', cost: 520, duration: 85, required: 5, needs: 'tip' },
  deney: { branch: 'bilim', name: 'Deneyler', description: 'Medrese\'de kristal ilime çevrilebilir (100 kristal → 150 ilim).', cost: 600, duration: 90, required: 6, needs: 'optik' },
  din: { branch: 'bilim', name: 'Devlet Dini', description: 'Rahiplerin inancı %50 artar; harika mucizeden sonra üçte bir kısa dinlenir.', cost: 700, duration: 95, required: 6, needs: 'devlet' },
  kus_ucusu: { branch: 'bilim', name: 'Kuş Uçuşu', description: 'Humbaracı yetiştirilebilir: surların üstünden bomba atar.', cost: 900, duration: 110, required: 7, needs: 'deney' },
  matbaa: { branch: 'bilim', name: 'Matbaa', description: 'İlim üretimi %10 artar.', cost: 1400, duration: 130, required: 8, needs: 'mekanik_kalem' },
  // ASKERÎ (devam)
  kuru_havuz: { branch: 'askeri', name: 'Kuru Havuz', description: 'Gemi yapımı %20 hızlanır.', cost: 200, duration: 55, required: 2 },
  meslek_ordusu: { branch: 'askeri', name: 'Kapıkulu Nizamı', description: 'Birliklerin bakım gideri %15 azalır.', cost: 420, duration: 80, required: 4, needs: 'talim' },
  seref: { branch: 'askeri', name: 'Şeref Kanunu', description: 'Ordunun morali savaşta %20 daha yavaş düşer; Deliler yetiştirilebilir.', cost: 380, duration: 75, required: 4, needs: 'zirh' },
  balistik: { branch: 'askeri', name: 'Balistik', description: 'Kuşatma birliklerinin saldırısı %15 artar.', cost: 560, duration: 90, required: 5, needs: 'kusatma' },
  top_dokum: { branch: 'askeri', name: 'Top Dökümü', description: 'Topçu ve Humbaracı birliklerinin kükürt maliyeti %25 azalır.', cost: 820, duration: 105, required: 6, needs: 'barut' },
  // DENİZCİLİK (devam)
  guverte: { branch: 'denizcilik', name: 'Güverte Topları', description: 'Deniz birliklerinin saldırısı ek %10 artar.', cost: 260, duration: 60, required: 3, needs: 'yelken' },
  korsanlik: { branch: 'denizcilik', name: 'Korsanlık', description: 'Korsan seferlerinin ganimeti %20 artar.', cost: 300, duration: 65, required: 3 },
  genisleme: { branch: 'denizcilik', name: 'Genişleme', description: 'Yeni koloni için Saray bir seviye daha az yeter.', cost: 420, duration: 80, required: 4, needs: 'pusula' },
  zift: { branch: 'denizcilik', name: 'Zift', description: 'Gemilerin bakım gideri %25 azalır.', cost: 340, duration: 70, required: 3 },
  yabanci_kultur: { branch: 'denizcilik', name: 'Yabancı Kültürler', description: 'Ticaret Limanı\'nda yükleme iki kat hızlanır.', cost: 380, duration: 75, required: 4, needs: 'haritacilik' },
  hafif_tekne: { branch: 'denizcilik', name: 'Hafif Tekneler', description: 'Karamürsel yapılabilir: hızlı ve ucuz kanat gemisi.', cost: 220, duration: 55, required: 2, needs: 'yelken' },
  ikmal: { branch: 'denizcilik', name: 'İkmal Gemileri', description: 'İkmal Gemisi yapılabilir: filonun moralini korur, yaralıları taşır.', cost: 500, duration: 90, required: 5, needs: 'zift' },
  havan: { branch: 'denizcilik', name: 'Havan Donanımı', description: 'Humbara Gemisi yapılabilir: en ağır deniz kuşatması.', cost: 900, duration: 115, required: 7, needs: 'deniz_topculugu' },
  kanat: { branch: 'bilim', name: 'Hezarfen Kanatları', description: 'Hezarfen yetiştirilebilir: düşmanın hava birliklerini avlar.', cost: 1100, duration: 120, required: 7, needs: 'kus_ucusu' },
  roket: { branch: 'bilim', name: 'Lagari Roketi', description: 'Lagari Roketçisi ve Balon Gemisi yapılabilir: havadan bombardıman.', cost: 1500, duration: 135, required: 8, needs: 'kanat' },
  zenberek: { branch: 'denizcilik', name: 'Zenberek Ustalığı', description: 'Zenberek Gemisi yapılabilir: uzaktan atış yapan ucuz gemi.', cost: 240, duration: 55, required: 3, needs: 'yelken' },
  dalgic: { branch: 'denizcilik', name: 'Dalgıç Gemisi', description: 'Dalgıç Gemisi yapılabilir: suyun altından saldırır, vurulması zordur.', cost: 850, duration: 110, required: 6, needs: 'gemi_govdesi' },
  buhar: { branch: 'denizcilik', name: 'Buhar Makinesi', description: 'Buharlı Koç yapılabilir: denizin en ağır gemisi.', cost: 1700, duration: 140, required: 8, needs: 'dalgic' },
  gemi_govdesi: { branch: 'denizcilik', name: 'Sağlam Gövdeler', description: 'Deniz birliklerinin savunması %12 artar.', cost: 490, duration: 95, required: 5, needs: 'yelken' },
}
export const OBJECTIVES = [
  { id: 'first-upgrade', title: 'Şehrinin temellerini güçlendir', description: 'Divanhaneyi 2. seviyeye yükselt.', reward: 150 },
  { id: 'first-academy', title: 'Bilginin kapılarını aç', description: 'Boş arsaya bir Medrese inşa et.', reward: 200 },
  { id: 'first-research', title: 'Yeni bir çağın başlangıcı', description: 'İlk araştırmanı tamamla.', reward: 300 },
]
/** Her anahtari sifir olan bir kayit - yeni bir bina eklendiginde kendiliginden buyur. */
function blank<T extends string>(ids: readonly T[]): Record<T, number> {
  return Object.fromEntries(ids.map(id => [id, 0])) as Record<T, number>
}
function blankNull<T extends string>(ids: readonly T[]): Record<T, number | null> {
  return Object.fromEntries(ids.map(id => [id, null])) as Record<T, number | null>
}

/** Oyunun basladigi sehir: bes yapi, izgaranin ilk sirasinda. */
const START_LEVELS: Partial<Record<BuildingId, number>> = { divan: 1, konut: 1, kereste: 1, tas: 1, ambar: 1 }
// Belediye (divan) MERKEZDE, index 0, cakili. Digerleri ilk halkaya dagilir.
const START_PLOTS: Partial<Record<BuildingId, number>> = { divan: 0, konut: 2, kereste: 4, tas: 6, ambar: 8 }

export function initialGame(now: number): Game {
  return {
    version: 3, updatedAt: now,
    resources: { gold: 1240, wood: 860, stone: 540, knowledge: 40 },
    buildings: { ...blank(BUILDING_IDS), ...START_LEVELS },
    /*
     * Baslangic sehri. Yalnizca KURULU yapilarin arsasi vardir; gerisini
     * oyuncu yerlestirir. Liste katalogdan turedigi icin yeni bir bina
     * eklemek burayi degistirmeyi GEREKTIRMEZ.
     */
    placement: { ...blankNull(BUILDING_IDS), ...START_PLOTS },
    workers: { ...blank(WORKER_IDS), kereste: WORKERS_PER_LEVEL, tas: WORKERS_PER_LEVEL },
    army: blank(UNIT_IDS),
    roads: [...START_ROADS], flips: [],
    luxury: { uzum: 0, mermer: 0, kristal: 0, kukurt: 0 },
    // Başkent Sahil Adası'nda: mermer yatağı. Koloniler kendi adasınınkini alır.
    mine: { specialty: 'mermer', level: 1, wood: 0, miners: 0 },
    temple: { priests: 0, faith: 0, wonder: 'kalkan', wonderLevel: 0, wonderWood: 0, active: null, until: 0, cooldownUntil: 0 },
    upgrades: {},
    future: { ekonomi: 0, bilim: 0, askeri: 0, denizcilik: 0 },
    piracy: 0,
    forest: { level: 1, wood: 0, workers: 0 },
    government: { id: 'saltanat', changedAt: 0, anarchyUntil: 0 },
    stats: { builds: 0, trained: 0, researched: 0, donated: 0 },
    research: [], queue: [], study: null, drills: [], claimed: [],
    log: [{ text: 'Sahilhisar kuruldu. Hikâyen burada başlıyor.', time: now }],
  }
}

/** Bir uretim yapisinin alabilecegi en fazla isci. */
export function workerCapacity(g: Game, id: WorkerId) { return g.buildings[id] * WORKERS_PER_LEVEL }
/** Dagitilmis toplam isci. */
export function assignedWorkers(g: Game) { return WORKER_IDS.reduce((sum, id) => sum + g.workers[id], 0) }
/**
 * Isi olmayan halk.
 *
 * Askerler nufusun icindedir ama ISCI DEGILDIR: uretim yapmazlar ve baska bir
 * ise verilemezler. Bu yuzden bosta kalan halk hesabindan once onlar dusulur.
 */
export function idleWorkers(g: Game) { return Math.max(0, population(g) - assignedWorkers(g) - g.mine.miners - (g.forest?.workers ?? 0) - (g.temple?.priests ?? 0) - soldiers(g)) }

/**
 * GARNİZON SINIRI (Ikariam): şehrin besleyip barındırabileceği asker ve gemi,
 * nüfus (birlik başına halk) cinsinden. Kara birlikleri Divanhane ve Surlar,
 * savaş gemileri Tersane ile artar. Casus (Elçilik sınırı) ve nakliye sayılmaz.
 */
export function garrisonLimit(g: Game, branch: 'kara' | 'deniz') {
  return branch === 'kara' ? 100 + 50 * g.buildings.divan + 50 * g.buildings.surlar
    : g.buildings.tersane > 0 ? 40 + 60 * g.buildings.tersane : 0
}
export const inGarrison = (id: UnitId) => id !== 'casus' && id !== 'nakliye'
/** Garnizonda sayılan birlikler (seferdekiler dahil) + eğitimi süren. */
export function garrisonUsed(g: Game, branch: 'kara' | 'deniz') {
  const job = (g.drills ?? []).reduce((s, j) => s + (UNITS[j.id as UnitId].branch === branch && inGarrison(j.id as UnitId) ? UNITS[j.id as UnitId].pop * (j.count ?? 0) : 0), 0)
  return UNIT_IDS.reduce((s, id) => s + (UNITS[id].branch === branch && inGarrison(id) ? UNITS[id].pop * (g.army?.[id] ?? 0) : 0), 0) + job
}

/** Egitimi SUREN birligin simdiden ayirdigi vatandas. */
export function trainingPop(g: Game): number {
  return (g.drills ?? []).reduce((s, job) => s + UNITS[job.id as UnitId].pop * (job.count ?? 0), 0)
}
/** Bir yapının eğitim sırasına en fazla bu kadar emir girer. */
export const DRILL_QUEUE_LIMIT = 5
/** Yapının sıradaki eğitim emirleri (ilk yürüyen). */
export function drillsAt(g: Game, home: BuildingId) { return (g.drills ?? []).filter(j => UNITS[j.id as UnitId].home === home) }

/**
 * Askere gitmis vatandas sayisi.
 *
 * Egitimi suren birlik de sayilir: emir verildigi anda o vatandaslar sehirden
 * ayrilir. Aksi halde oyuncu ayni bos halkla arka arkaya iki emir verebilir ve
 * egitimler bitince nufus borca duserdi.
 */
export function soldiers(g: Game): number {
  return UNIT_IDS.reduce((sum, id) => sum + UNITS[id].pop * (g.army?.[id] ?? 0), 0) + trainingPop(g)
}

/** Elindeki birliklerin toplam saldiri ve savunma gucu. */
/** Tophane yükseltmesi: seviye başına birliğin saldırısı ya da zırhı +%5. */
export function unitBonus(g: Game, id: UnitId) {
  const u = g.upgrades?.[id]
  return { atk: 1 + (u?.atk ?? 0) * 0.05, def: 1 + (u?.def ?? 0) * 0.05 }
}
export function power(g: Game, branch: 'kara' | 'deniz') {
  const base = UNIT_IDS.filter(id => UNITS[id].branch === branch).reduce(
    (sum, id) => ({ attack: sum.attack + UNITS[id].attack * g.army[id] * unitBonus(g, id).atk *
      (id === 'topcu' && g.research.includes('barut') ? 1.15 : 1) *
      (UNITS[id].role === 'artillery' && g.research.includes('balistik') ? 1.15 : 1),
      defense: sum.defense + UNITS[id].defense * g.army[id] * unitBonus(g, id).def }),
    { attack: 0, defense: 0 })
  const atkTech = branch === 'kara' ? 'celik' : 'yelken'
  const attackBonus = (g.research.includes(atkTech) ? 1.15 : 1) * (branch === 'deniz' && g.research.includes('guverte') ? 1.1 : 1)
  const defenseTech = branch === 'kara' ? 'zirh' : 'gemi_govdesi'
  const defenseBonus = g.research.includes(defenseTech) ? (branch === 'kara' ? 1.10 : 1.12) : 1
  const workshop = 1 + (g.buildings.tophane ?? 0) * BUILDING_EFFECTS.tophanePower + (g.future?.askeri ?? 0) * 0.02
  const war = 1 + miracle(g, 'savas') * 0.05
  return { attack: Math.round(base.attack * attackBonus * workshop * war), defense: Math.round(base.defense * defenseBonus * workshop) }
}

/** Surlarin asker gerektirmeyen savunmasi. İstihkâm araştırması %30 artırır. */
export function wallDefense(g: Game) { return Math.round(g.buildings.surlar * 150 * (g.research.includes('istihkam') ? 1.3 : 1)) }

/** Sehrin toplam savunmasi: surlar + kara birlikleri. */
export function cityDefense(g: Game) { return Math.round((wallDefense(g) + power(g, 'kara').defense) * (1 + miracle(g, 'kalkan') * 0.1)) }

/**
 * ŞEHİR GÜCÜ — tek bir "kudret" sayisi.
 *
 * Referans oyunlardaki gibi sehrin genel gucunu tek buyuk sayiyla gosterir:
 * bina seviyeleri, ordu, arastirma ve sur savunmasi birlesir. Yalnizca gorsel/
 * ozet amacli; denge hesaplarina girmez.
 */
export function might(g: Game): number {
  const buildingLevels = BUILDING_IDS.reduce((s, id) => s + g.buildings[id], 0)
  const armyPower = power(g, 'kara').attack + power(g, 'kara').defense + power(g, 'deniz').attack + power(g, 'deniz').defense
  return buildingLevels * 4200 + armyPower * 30 + g.research.length * 6500 + wallDefense(g) * 4
}

/** Nakliye gemilerinin tasidigi mal. Pusula araştırması %50 artırır. */
export function cargoCapacity(g: Game) { return Math.round(g.army.nakliye * UNITS.nakliye.cargo *
  (g.research.includes('pusula') ? 1.5 : 1) * (g.research.includes('yukleme') ? 1.2 : 1)) }

/** Ticaret limaninin ayni anda tasinmasina izin verdigi mal. Ticaret Yolları %30 artırır. */
export function tradeCapacity(g: Game) { return Math.round(g.buildings.liman * 1200 * (g.research.includes('ticaret') ? 1.3 : 1) * (govIs(g, 'loncalar') ? 1.2 : 1)) }
/** Limanın dakikada yüklediği mal (nakliye süresine eklenir). */
export function loadingSpeed(g: Game) { return Math.max(1, g.buildings.liman) * 300 * (g.research.includes('yabanci_kultur') ? 2 : 1) }

/**
 * Isci dagitimini GECERLI hale getirir.
 *
 * Uc sinir vardir: yapinin kapasitesi, sehrin nufusu ve askere gitmis halk.
 * Bina yikilmaz ama
 * SEVIYE DUSMESI ya da eski bir kayittan gelen bozuk sayi kapasiteyi asabilir;
 * nufus da konut seviyesinden turedigi icin degisir. Dagitim bu yuzden tek bir
 * yerden budanir - uretim hesabinin asla kapasitenin ustunde calismamasi icin.
 */
export function clampWorkers(g: Game): Workers {
  const limit = Math.max(0, population(g) - soldiers(g))
  const out: Workers = { kereste: 0, tas: 0, medrese: 0, carsi: 0 }
  let left = limit
  for (const id of WORKER_IDS) {
    const want = Number.isFinite(g.workers?.[id]) ? Math.max(0, Math.floor(g.workers[id])) : 0
    const take = Math.min(want, workerCapacity(g, id), left)
    out[id] = take
    left -= take
  }
  return out
}
/** Maden işçileri: kapasite ve (üretim yapılarından artan) boştaki halkla sınırlı. */
export function clampForest(g: Game): number {
  const free = Math.max(0, population(g) - soldiers(g) - assignedWorkers(g) - g.mine.miners)
  const want = Number.isFinite(g.forest.workers) ? Math.max(0, Math.floor(g.forest.workers)) : 0
  return Math.min(want, forestCapacity(g), free)
}
export function clampPriests(g: Game): number {
  const free = Math.max(0, population(g) - soldiers(g) - assignedWorkers(g) - g.mine.miners - (g.forest?.workers ?? 0))
  const want = Number.isFinite(g.temple.priests) ? Math.max(0, Math.floor(g.temple.priests)) : 0
  return Math.min(want, priestCapacity(g), free)
}
export function clampMiners(g: Game): number {
  const free = Math.max(0, population(g) - soldiers(g) - assignedWorkers(g))
  const want = Number.isFinite(g.mine.miners) ? Math.max(0, Math.floor(g.mine.miners)) : 0
  return Math.min(want, mineCapacity(g), free)
}
export function capacity(g: Game) {
  const level = g.buildings.ambar
  // Level 1 remains exactly 4,500: existing city saves and first-game
  // economy do not regress. High-level stores grow so late-game upgrade
  // costs are actually storable with one warehouse per city's slot model.
  const warehouse = level === 0 ? 0 : 1500 * (1.32 ** level - 1) / 0.32
  const multiplier = (g.research.includes('storage') ? 1.25 : 1) *
    (g.research.includes('ambar_teknigi') ? 1.15 : 1)
  return Math.floor((3000 + warehouse) * multiplier) + (g.buildings.depo ?? 0) * BUILDING_EFFECTS.depoStorage
}

/**
 * YOLSUZLUK (Ikariam): başkentte yoktur. Kolonide Valilik seviyesi koloni
 * sayısına yetişmezse üretim düşer: 1 - (Valilik+1)/(koloni+1), yarı şiddetle.
 */
export function corruption(g: Game) {
  const e = g.empire
  if (!e || e.capital) return 0
  const colonies = Math.max(1, e.cities - 1)
  const base = Math.max(0, 1 - (g.buildings.valilik + 1) / (colonies + 1)) * 0.5 * (g.research.includes('yasama') ? 0.75 : 1)
  return Math.max(0, Math.min(0.9, base + (govIs(g, 'ayan') ? 0.03 : 0) - (govIs(g, 'kanun') ? 0.05 : 0)))
}

/** Dakikalık birlik bakım gideri (akçe). */
export function armyUpkeep(g: Game) {
  const ships = g.research?.includes('zift') ? 0.75 : 1
  const pro = (g.research?.includes('meslek_ordusu') ? 0.85 : 1) * (govIs(g, 'sipahi') ? 0.8 : govIs(g, 'meclis') ? 1.05 : 1)
  return UNIT_IDS.reduce((sum, id) => sum + UNITS[id].upkeep * (g.army?.[id] ?? 0) * (UNITS[id].branch === 'deniz' ? ships : 1), 0) * pro
}

/** Yolculuk süresi çarpanı: Harita Arşivi, Denizcilik Geleceği, Poyraz mucizesi. */
export function travelFactor(g: Game) {
  return (1 - Math.min(0.5, g.buildings.harita_arsivi * BUILDING_EFFECTS.harita)) *
    (1 - Math.min(0.3, (g.future?.denizcilik ?? 0) * 0.03)) * (1 - miracle(g, 'ruzgar') * 0.08) * (govIs(g, 'loncalar') ? 0.9 : 1)
}

/** Aynı anda yürütülebilecek görev (sefer, casusluk, nakliye) sayısı: Divanhane ile artar. */
export function actionPoints(g: Game) { return 2 + Math.floor(g.buildings.divan / 4) + (g.research.includes('burokrasi') ? 1 : 0) }
/**
 * Dakikadaki uretim.
 *
 * Uretim artik yalnizca BINA SEVIYESINE degil, o binada CALISAN HALKA da
 * baglidir: bir yapi kapasitesinin yarisi kadar isciyle yarim uretir. Kapasite
 * tamamen doluyken sayilar eski dengeyle birebir aynidir, yani mevcut sehirler
 * bu degisiklikten zarar gormez.
 *
 * Akce konuttan gelir ve isci istemez - halkin kendisi vergi verir.
 */
/** Each staffed Medrese scientist consumes 9 akçe/hour in the accelerated
 *  Payitaht economy. In Ikariam a scientist likewise has an upkeep cost.
 *  Production speed here is intentionally accelerated for a mobile prototype. */
export const SCIENTIST_UPKEEP_PER_HOUR = 9
export function scientistCount(g: Game): number { return clampWorkers(g).medrese }
export function scientistUpkeepPerMinute(g: Game): number {
  return scientistCount(g) * SCIENTIST_UPKEEP_PER_HOUR / 60 * (govIs(g, 'ilmiye') ? 0.8 : 1)
}
export function rates(g: Game): Resources {
  const multiplier = (g.research.includes('tools') ? 1.2 : 1) * (1 - corruption(g)) *
    (1 + (g.future?.ekonomi ?? 0) * 0.02 + miracle(g, 'bereket') * 0.05) * (anarchy(g) ? 0.75 : 1)
  const workers = clampWorkers(g)
  const share = (id: WorkerId) => {
    const cap = workerCapacity(g, id)
    return cap > 0 ? workers[id] / cap : 0
  }
  return {
    // Akce iki kaynaktan gelir: halkin vergisi (isci istemez) ve carsi esnafi.
    gold: Math.max(0, (60 + g.buildings.konut * 120 +
      g.buildings.carsi * 100 * share('carsi')) * multiplier * (1 + g.buildings.saray * BUILDING_EFFECTS.sarayGold) * (govIs(g, 'ayan') ? 1.05 : 1) -
      scientistUpkeepPerMinute(g) - armyUpkeep(g)),
    wood: (g.buildings.kereste * 120 * share('kereste') + forestProduction(g)) * multiplier *
      (g.research.includes('ormancilik') ? 1.15 : 1) * (1 + g.buildings.ormanci * BUILDING_EFFECTS.ormanciWood),
    stone: g.buildings.tas * 90 * share('tas') * multiplier *
      (g.research.includes('tascilik') ? 1.15 : 1) * (1 + g.buildings.tasci * BUILDING_EFFECTS.tasciStone),
    knowledge: g.buildings.medrese * 8 * share('medrese') * multiplier * (1 + g.buildings.cami * BUILDING_EFFECTS.camiKnowledge) *
      (1 + (g.future?.bilim ?? 0) * 0.03 + miracle(g, 'ilim') * 0.1) / (1 + miracle(g, 'bereket') * 0.05) *
      (g.research.includes('alimler') ? 1.3 : 1) *
      (1 + (g.research.includes('kagit') ? .02 : 0) +
       (g.research.includes('murekkep') ? .04 : 0) +
       (g.research.includes('mekanik_kalem') ? .08 : 0)) *
      (g.research.includes('matbaa') ? 1.1 : 1) * (govIs(g, 'ilmiye') ? 1.1 : govIs(g, 'meclis') ? 1.05 : govIs(g, 'mesihat') ? 0.95 : 1),
  }
}
/** Ada ormanındaki işçilerin dakikalık kerestesi (çarpanlardan önce). */
export function forestProduction(g: Game) { return Math.min(g.forest?.workers ?? 0, g.forest ? forestCapacity(g) : 0) * 4 }
/** Konaklarin barindirabilecegi en fazla nufus. */
export function housing(g: Game) {
  // Divanhane her seviyede (1'in üstünde) şehre 20 kişilik idari barınma ekler.
  return 80 + g.buildings.konut * 40 + Math.max(0, g.buildings.divan - 1) * BUILDING_EFFECTS.divanHousing +
    (g.research.includes('kent_planlama') ? 40 : 0) + (g.research.includes('kuyu') && (g.empire?.capital ?? true) ? 50 : 0)
}

/**
 * Sehrin HUZURLA tutabilecegi nufus.
 *
 * Ikariam'in ana kisiti budur: dam altina almak yetmez, halki memnun da
 * etmek gerekir. Taban 120 secildi cunku oyunun basindaki konut seviyesi 1
 * ile barinma da 120'dir - yani kisit ilk andan itibaren canimizi yakmaz,
 * ancak oyuncu Konaklar'i YUKSELTTIGINDE devreye girer ve Hamam'i anlamli
 * kilar.
 */
export function contentment(g: Game) {
  const capital = g.empire?.capital ?? true
  const gov = govIs(g, 'meclis') ? 75 : govIs(g, 'mesihat') ? 50 : govIs(g, 'sipahi') ? -75 : govIs(g, 'ilmiye') ? -25 : 0
  return Math.max(0, 120 + g.buildings.hamam * 60 + g.buildings.kahvehane * BUILDING_EFFECTS.kahvehaneContentment + miracle(g, 'huzur') * 40 +
    (wineServed(g) ? tavernLevel(g) * BUILDING_EFFECTS.kahvehaneWineBonus * (g.research.includes('mutfak') ? 1.2 : 1) : 0) +
    g.buildings.cami * BUILDING_EFFECTS.camiContentment +
    g.buildings.muze * BUILDING_EFFECTS.muzeContentment * (g.research.includes('kultur') ? 1.5 : 1) + (g.culture ?? 0) * 50 +
    (g.research.includes('tatil') ? 25 : 0) + (g.research.includes('kuyu') && capital ? 50 : 0) +
    (g.research.includes('utopya') && capital ? 200 : 0) + gov - (anarchy(g) ? 50 : 0))
}

/**
 * Sehirde GERCEKTEN yasayan nufus.
 *
 * Iki kisidan hangisi kucukse o. Barinma huzurdan buyukse fazla konutlar bos
 * kalir; oyuncu bunu "Halk" panelinde dogrudan gorur.
 */
/* ------------------------------------------------------------------ LÜKS */

/** Ada madeninin alabileceği en fazla işçi (Ikariam'da maden seviyesiyle büyür). */
export const MINERS_PER_LEVEL = 12
export const MINE_MAX_LEVEL = 20
export function mineCapacity(g: Game) { return Math.floor(g.mine.level * MINERS_PER_LEVEL * (g.research.includes('yardim_eli') ? 1.25 : 1)) }
/** Bir sonraki maden seviyesi için gereken toplam kereste bağışı. */
export function mineUpgradeCost(level: number) { return Math.round(600 * 1.55 ** (level - 1)) }

/** Kahvehane üzüm ikram ediyor mu? (Ambarda üzüm var ya da maden üzüm çıkarıyor.) */
/** Kahvehane'de ikram edilen seviye (oyuncu kısabilir). */
export function tavernLevel(g: Game) { return Math.max(0, Math.min(g.buildings.kahvehane, g.tavern ?? g.buildings.kahvehane)) }
export function wineServed(g: Game) {
  if (tavernLevel(g) <= 0) return false
  return g.luxury.uzum > 0 || luxuryProduction(g).uzum >= wineConsumption(g)
}

/** Kahvehane'nin dakikalık üzüm tüketimi (Şıra Mahzeni azaltır). */
export function wineConsumption(g: Game) {
  return tavernLevel(g) * BUILDING_EFFECTS.kahvehaneWine * Math.max(0.5, 1 - g.buildings.mahzen * BUILDING_EFFECTS.mahzenWine) *
    (g.research.includes('mutfak') ? 0.9 : 1)
}

/** Maden işçilerinin dakikadaki brüt lüks üretimi (yalnızca adanın kaynağı). */
export function luxuryProduction(g: Game): LuxuryStock {
  const out: LuxuryStock = { uzum: 0, mermer: 0, kristal: 0, kukurt: 0 }
  const miners = Math.min(g.mine.miners, mineCapacity(g))
  const boost: Record<Luxury, number> = {
    uzum: g.buildings.bagci * BUILDING_EFFECTS.bagciWine,
    kukurt: g.buildings.simyahane * BUILDING_EFFECTS.simyaSulfur,
    kristal: g.buildings.camci * BUILDING_EFFECTS.camciCrystal,
    mermer: g.buildings.tasci * BUILDING_EFFECTS.tasciStone,
  }
  out[g.mine.specialty] = miners * 3 * (g.research.includes('tools') ? 1.2 : 1) * (1 + boost[g.mine.specialty]) * (1 - corruption(g)) *
    (1 + miracle(g, 'bolluk') * 0.1) * (g.research.includes('zenginlik') ? 1.1 : 1) * (anarchy(g) ? 0.75 : 1)
  return out
}

/** Dakikadaki NET lüks değişimi: üretim eksi Kahvehane'nin üzüm ikramı. */
export function luxuryRates(g: Game): LuxuryStock {
  const out = luxuryProduction(g)
  if (tavernLevel(g) > 0 && (g.luxury.uzum > 0 || out.uzum > 0)) {
    out.uzum -= wineConsumption(g)
  }
  return out
}

/**
 * Bir bina yükseltmesinin LÜKS maliyeti.
 *
 * Ikariam'daki gibi: gelişmiş binalar mermer, bilim/kültür yapıları kristal
 * ister. Başlangıçta hiçbir şey istenmez (seviye 3'e kadar mermersiz,
 * seviye 4'e kadar kristalsiz) - yeni oyuncu tıkanmaz, ilerledikçe ada
 * ticareti gerekli olur. Mimarbaşı mermeri de ucuzlatır.
 */
const MARBLE_FREE = new Set<BuildingId>(['konut', 'kereste', 'tas'])
const CRYSTAL_NEEDS = new Set<BuildingId>(['medrese', 'muze', 'mimar', 'cami', 'saray', 'elcilik'])
export function luxuryCost(g: Game, id: BuildingId): Partial<LuxuryStock> {
  const level = g.buildings[id]
  const base = Math.round(BUILDINGS[id].base * BUILDING_GROWTH[id] ** level)
  const out: Partial<LuxuryStock> = {}
  if (level >= 3 && !MARBLE_FREE.has(id)) {
    const factor = Math.max(0.5, 1 - constructionDiscount(g) - g.buildings.mimar * BUILDING_EFFECTS.mimarStone)
    out.mermer = Math.round(base * 0.22 * factor)
  }
  if (level >= 4 && CRYSTAL_NEEDS.has(id)) out.kristal = Math.round(base * 0.12 * Math.max(0.5, 1 - g.buildings.gozlukcu * BUILDING_EFFECTS.gozlukcuCrystal))
  return out
}

/** Ağır birlikler kükürt (barut) ister. */
export const UNIT_SULFUR: Partial<Record<UnitId, number>> = { topcu: 40, kadirga: 30, kalyon: 90, tufekci: 25, ates_gemisi: 45, mancinik_gemisi: 60, humbaraci: 50, humbara_gemisi: 120, lagari: 60, balon_gemisi: 110, buharli_koc: 80, dalgic_gemisi: 40 }
export function unitLuxuryCost(id: UnitId, count: number, g?: Game): Partial<LuxuryStock> {
  const s = UNIT_SULFUR[id]
  const factor = g ? Math.max(0.5, 1 - g.buildings.barutane * BUILDING_EFFECTS.barutaneSulfur) *
    ((id === 'topcu' || id === 'humbaraci') && g.research.includes('top_dokum') ? 0.75 : 1) : 1
  return s ? { kukurt: Math.round(s * count * factor) } : {}
}

function hasLuxury(g: Game, need: Partial<LuxuryStock>) {
  return LUXURY_IDS.every(id => g.luxury[id] >= (need[id] ?? 0))
}
function payLuxury(g: Game, need: Partial<LuxuryStock>) {
  for (const id of LUXURY_IDS) g.luxury[id] -= need[id] ?? 0
}

/* ------------------------------------------------ TOPHANE / GELECEK / KARA PAZAR */

/** Tophane seviyesinin izin verdiği en yüksek yükseltme seviyesi (en fazla 8). */
export function upgradeCap(g: Game) { return Math.min(8, Math.floor(g.buildings.tophane / 2)) }
export function upgradeCost(g: Game, id: UnitId, stat: 'atk' | 'def') {
  const level = g.upgrades?.[id]?.[stat] ?? 0
  const pop = Math.max(1, UNITS[id].pop)
  return { gold: Math.round(150 * (level + 1) ** 1.7 * pop), kristal: Math.round(30 * (level + 1) * pop) }
}
export function upgradeReason(g: Game, id: UnitId, stat: 'atk' | 'def'): string | null {
  const role = UNITS[id].role
  if (role === 'spy' || role === 'transport' || role === 'support') return 'Bu birlik savaşmaz; yükseltilemez.'
  if (g.buildings.tophane < 2) return 'Tophane 2. seviye gerekli.'
  const level = g.upgrades?.[id]?.[stat] ?? 0
  if (level >= upgradeCap(g)) return upgradeCap(g) >= 8 ? 'En yüksek yükseltme.' : `Tophane'yi yükselt (şu an en fazla ${upgradeCap(g)}. seviye).`
  const c = upgradeCost(g, id, stat)
  if (g.resources.gold < c.gold || g.luxury.kristal < c.kristal) return `${c.gold} akçe ve ${c.kristal} kristal gerekli.`
  return null
}
export function futureCost(level: number) { return Math.round(1200 * 1.55 ** level) }
export function futureReason(g: Game, branch: ResearchBranch): string | null {
  const missing = RESEARCH_IDS.filter(id => RESEARCH[id].branch === branch && !g.research.includes(id))
  if (missing.length) return `Önce bu dalın bütün araştırmaları bitmeli (${missing.length} kaldı).`
  if (g.resources.knowledge < futureCost(g.future[branch])) return `${futureCost(g.future[branch])} ilim gerekli.`
  return null
}
export const GOOD_NAMES: Record<Good, string> = {
  gold: 'Akçe', wood: 'Kereste', stone: 'Taş', knowledge: 'İlim', uzum: 'Üzüm', mermer: 'Mermer', kristal: 'Kristal', kukurt: 'Kükürt',
}
export function goodAmount(g: Game, good: Good) { return (LUXURY_IDS as readonly string[]).includes(good) ? g.luxury[good as Luxury] : g.resources[good as Resource] }
export function addGood(g: Game, good: Good, n: number) {
  if ((LUXURY_IDS as readonly string[]).includes(good)) g.luxury[good as Luxury] += n
  else g.resources[good as Resource] += n
}
/** Kara Pazar oranı: kaç birim ver, 1 birim al (3.2'den 2'ye iner). */
export function exchangeRate(g: Game) { return Math.max(2, Math.round((3.2 - 0.1 * g.buildings.kara_pazar) * 10) / 10) }
export function exchangeLimit(g: Game) { return 400 * g.buildings.kara_pazar }

/** Çarşıdaki tüccar: akçe karşılığı lüks alım/satım (NPC; oyuncu pazarı değil). */
export const MERCHANT_BUY = 6
export const MERCHANT_SELL = 2
export function merchantLimit(g: Game) { return g.buildings.carsi * 150 + g.buildings.ticaret_merkezi * BUILDING_EFFECTS.merchantLimit }
/** Ticaret Merkezi fiyatları iyileştirir: alış en az 3, satış en çok 4 akçe. */
export function merchantBuyPrice(g: Game) { return Math.max(3, MERCHANT_BUY - g.buildings.ticaret_merkezi * BUILDING_EFFECTS.merchantBuyStep) }
export function merchantSellPrice(g: Game) { return Math.min(4, MERCHANT_SELL + g.buildings.ticaret_merkezi * BUILDING_EFFECTS.merchantSellStep) }

/** Barınma ve huzurun izin verdiği en yüksek nüfus. */
export function maxPopulation(g: Game) { return Math.min(housing(g), contentment(g)) }
/**
 * Şehirde yaşayan nüfus. Ikariam'daki gibi tavana ZAMANLA yaklaşır
 * (advance içinde büyür); tavan düşerse hemen iner. Eski kayıtta tavandadır.
 */
export function population(g: Game) {
  const max = maxPopulation(g)
  return g.citizens === undefined ? max : Math.min(max, Math.floor(g.citizens))
}
/** Dakikalık nüfus artışı (huzur fazlası büyümeyi hızlandırır). */
export function growthRate(g: Game) {
  const max = maxPopulation(g)
  const now = g.citizens ?? max
  if (now >= max) return 0
  const surplus = Math.max(0, contentment(g) - now) / Math.max(1, contentment(g))
  return Math.max(1, (max - now) * (0.03 + 0.12 * surplus))
}

/** Huzursuzluk yuzunden bos kalan barinma. */
export function unhousedByUnrest(g: Game) { return Math.max(0, housing(g) - contentment(g)) }

/**
 * Ambari DOLMUS kaynaklar.
 *
 * Dolu bir ambarda uretim bosa gider: advance() kaynagi kapasiteye kirpar ve
 * aradaki fark sessizce kaybolur. Oyuncu bunu ancak sayilarin ilerlemedigini
 * fark ederek anliyordu - yani oyunun ona soylemesi gereken bir seyi kendi
 * kesfetmek zorundaydi.
 *
 * Esik %99,5: kayan noktali birikimde tam esitlik neredeyse hic yakalanmaz.
 */
export function fullResources(g: Game): Resource[] {
  const limit = capacity(g)
  return RESOURCE_IDS.filter(id => g.resources[id] >= limit * 0.995)
}

/** Ambari dolmaya YAKIN kaynaklar - uyari icin, kayip icin degil. */
export function nearlyFullResources(g: Game): Resource[] {
  const limit = capacity(g)
  return RESOURCE_IDS.filter(id => g.resources[id] >= limit * 0.9 && g.resources[id] < limit * 0.995)
}
/**
 * Each building has its own growth curve instead of a universal 1.65 factor.
 * These are Payitaht-balanced curves inspired by the exponential shape of
 * Ikariam upgrade tables; NOT a claim of exact current-server Ikariam prices.
 * Level 0 construction cost is unchanged for existing players.
 */
export const BUILDING_GROWTH: Record<BuildingId, number> = {
  divan: 1.35, saray: 1.49, elcilik: 1.36, konut: 1.31, hamam: 1.38,
  carsi: 1.35, ambar: 1.39, kereste: 1.31, tas: 1.31, medrese: 1.40,
  kisla: 1.37, surlar: 1.43, liman: 1.37, tersane: 1.41,
  kahvehane: 1.34, cami: 1.38, muze: 1.40, marangoz: 1.33, mimar: 1.34, ormanci: 1.32, tasci: 1.32, tophane: 1.39,
  bagci: 1.32, simyahane: 1.33, camci: 1.33, mahzen: 1.33, gozlukcu: 1.34, barutane: 1.35, depo: 1.36,
  ticaret_merkezi: 1.37, harita_arsivi: 1.36, valilik: 1.45, korsan_kalesi: 1.40, kara_pazar: 1.37, siginak: 1.36,
}
export function constructionDiscount(g: Game): number {
  return (g.research.includes('makara') ? .02 : 0) +
    (g.research.includes('geometri') ? .04 : 0) +
    (g.research.includes('su_terazisi') ? .08 : 0)
}
export function cost(g: Game, id: BuildingId): Resources {
  const base = Math.round(BUILDINGS[id].base * BUILDING_GROWTH[id] ** g.buildings[id])
  const materialFactor = 1 - constructionDiscount(g)
  // Ikariam: Marangoz keresteyi, Mimar taşı seviye başına %1 ucuzlatır.
  const woodFactor = materialFactor - g.buildings.marangoz * BUILDING_EFFECTS.marangozWood
  const stoneFactor = materialFactor - g.buildings.mimar * BUILDING_EFFECTS.mimarStone
  return { gold: base, wood: Math.round(base * 1.2 * Math.max(0.5, woodFactor)),
    stone: Math.round(base * .75 * Math.max(0.5, stoneFactor)), knowledge: 0 }
}
export function duration(g: Game, id: BuildingId) {
  const level = g.buildings[id]
  // Early-game timers remain unchanged; high levels become progressively
  // longer, with distinct building curves instead of a linear universal timer.
  const growth = level < 3 ? 1 : (BUILDING_GROWTH[id] / 1.25) ** (level - 2)
  return Math.round((20 + level * 10) * growth *
    (g.research.includes('architecture') ? .75 : 1) * (govIs(g, 'ayan') ? 0.8 : govIs(g, 'loncalar') ? 1.05 : 1))
}
export function logEvent(g: Game, text: string, time: number) { g.log = [{ text, time }, ...g.log].slice(0, 60) }
export function advance(source: Game, now: number): Game {
  const g: Game = structuredClone(source)
  if (now <= g.updatedAt) return g
  const start = g.updatedAt
  if (g.citizens === undefined) g.citizens = maxPopulation(g)
  const cutoff = Math.min(now, start + 8 * 3600_000)
  let cursor = start
  function produce(until: number) {
    const minutes = Math.max(0, Math.min(until, cutoff) - Math.min(cursor, cutoff)) / 60_000
    const speed = rates(g)
    for (const r of RESOURCE_IDS) g.resources[r] = Math.min(capacity(g), g.resources[r] + speed[r] * minutes)
    const lux = luxuryRates(g)
    for (const r of LUXURY_IDS) g.luxury[r] = Math.max(0, Math.min(capacity(g), g.luxury[r] + lux[r] * minutes))
    // Nüfus tavana doğru büyür; tavan düştüyse hemen iner.
    const max = maxPopulation(g)
    const citizens = g.citizens ?? max
    g.citizens = citizens >= max ? max : Math.min(max, citizens + growthRate(g) * minutes)
    // Rahipler inanç biriktirir.
    g.temple.faith = Math.min(FAITH_CAP, g.temple.faith + Math.min(g.temple.priests, priestCapacity(g)) * 0.5 * minutes *
      (g.research.includes('din') ? 1.5 : 1) * (govIs(g, 'mesihat') ? 1.5 : 1))
    cursor = until
  }
  /*
   * Biten isler ZAMAN SIRASIYLA islenir.
   *
   * Kuyruktan yalnizca BASTAN itibaren bitmis olanlar alinir: sirada bekleyen
   * bir isin sayaci kendinden oncekiler bitmeden baslamaz, dolayisiyla arada
   * bitmis bir is olamaz. Arastirma ayri yurur ve araya girebilir; bu yuzden
   * hepsi bitis zamanina gore siralanir - uretim hesabi (produce) is bitislerini
   * dogru anlarda bolmek zorunda.
   */
  const jobs: Job[] = []
  while (g.queue.length > 0 && g.queue[0].end <= now) jobs.push(g.queue.shift() as Job)
  if (g.study && g.study.end <= now) jobs.push(g.study)
  for (const job of g.drills) if (job.end <= now) jobs.push(job)
  g.drills = g.drills.filter(job => job.end > now)
  jobs.sort((a, b) => a.end - b.end)
  for (const job of jobs) {
    produce(Math.max(cursor, job.end))
    if (job.kind === 'build') {
      const id = job.id as BuildingId
      g.buildings[id] += 1
      /*
       * Yeni seviye yeni isci kapasitesi acar. Bosta halk varsa fark
       * KENDILIGINDEN doldurulur: oyuncunun her yukseltmeden sonra panele
       * girip elle atama yapmasi gereksiz bir angarya olurdu.
       */
      if ((WORKER_IDS as readonly string[]).includes(id)) {
        const slot = id as WorkerId
        g.workers[slot] = Math.min(workerCapacity(g, slot), g.workers[slot] + WORKERS_PER_LEVEL)
      }
      g.workers = clampWorkers(g)
      g.stats.builds += 1
      logEvent(g, `${BUILDINGS[id].name} ${g.buildings[id]}. seviyeye ulaştı.`, job.end)
    } else if (job.kind === 'research') {
      const id = job.id as ResearchId
      if (!g.research.includes(id)) g.research.push(id)
      g.stats.researched += 1
      g.study = null
      logEvent(g, `${RESEARCH[id].name} araştırması tamamlandı.`, job.end)
    } else {
      /*
       * Egitim bitti. Vatandaslar emir verildigi anda ayrilmisti (trainingPop),
       * simdi orduya gecerler - yani sehrin nufus dengesi DEGISMEZ, yalnizca
       * ayni kisiler artik `army` icinde sayilir.
       */
      const id = job.id as UnitId
      const count = job.count ?? 0
      g.army[id] += count
      g.stats.trained += count
      logEvent(g, `${count} ${UNITS[id].name} sancağın altına girdi.`, job.end)
    }
  }
  produce(now)
  g.mine.miners = clampMiners(g)
  g.forest.workers = clampForest(g)
  g.temple.priests = clampPriests(g)
  if (now - start > 60_000) logEvent(g, `${Math.floor((now - start) / 60_000)} dakika sonra hoş geldin. Kaynak üretimi hesaplandı (en fazla 8 saat).`, now)
  g.updatedAt = now
  return g
}
/**
 * Uzerinde yapi olmayan arsalarin indeksleri.
 *
 * `zone` verilirse yalnizca o bolgedekiler doner: Tersane bir yamac
 * arsasina, Konaklar bir iskeleye kurulamaz.
 */
export function freePlots(g: Game, zone?: Zone): number[] {
  const taken = new Set(Object.values(g.placement).filter((p): p is number => p !== null))
  return PLOTS.filter(slot => !taken.has(slot.index) && plotOpen(g, slot.index) && (zone === undefined || slot.zone === zone)).map(slot => slot.index)
}

/**
 * ŞEHRİN BÜYÜMESİ (Ikariam): kara arsaları belediyeden dışa doğru, Divanhane
 * seviyesiyle açılır — başta 9, her seviyede 2 arsa daha. Arsa sırası
 * belediyeye uzaklıktır (city-slots.json), yani şehir merkezden kenarlara
 * yayılır. Liman (deniz) arsaları hep açıktır. Açılmamış arsada daha önce
 * kurulmuş bir yapı varsa (eski kayıt) yerinde kalır.
 */
export const LAND_PLOTS = PLOTS.filter(p => p.zone === 'sehir').length - 1
export function landPlotsOpen(g: Game) { return Math.min(LAND_PLOTS, 7 + 2 * Math.max(1, g.buildings.divan)) }
export function plotOpen(g: Game, index: number) {
  const slot = PLOTS[index]
  if (!slot) return false
  return slot.zone === 'liman' || index <= landPlotsOpen(g)
}
/** Bir sonraki arsayı açan Divanhane seviyesi (hepsi açıksa null). */
export function nextPlotDivan(g: Game) { return landPlotsOpen(g) >= LAND_PLOTS ? null : Math.max(1, g.buildings.divan) + 1 }

/**
 * BİNA EN YÜKSEK SEVİYELERİ — Ikariam benzeri.
 *
 * Ikariam'da binalar yüksek seviyelere çıkar (Belediye 32+, çoğu bina Belediye
 * seviyesiyle sınırlı). Burada da tavan 32; ayrıca hiçbir bina Divanhane'yi
 * geçemez (bkz. buildReason) - yani gerçek sınır Divanhane seviyesidir.
 * Surlar biraz daha yükseğe çıkar (kalıcı savunma).
 */
export const MAX_LEVEL: Record<BuildingId, number> = {
  divan: 32, saray: 32, elcilik: 32, konut: 32, hamam: 32, carsi: 32, ambar: 32,
  kereste: 32, tas: 32, medrese: 32, kisla: 32, surlar: 40, liman: 32, tersane: 32,
  kahvehane: 32, cami: 32, muze: 32, marangoz: 32, mimar: 32, ormanci: 32, tasci: 32, tophane: 32,
  bagci: 32, simyahane: 32, camci: 32, mahzen: 32, gozlukcu: 32, barutane: 32, depo: 32,
  ticaret_merkezi: 32, harita_arsivi: 32, valilik: 32, korsan_kalesi: 32, kara_pazar: 32, siginak: 32,
}

export function buildReason(g: Game, id: BuildingId): string | null {
  if (g.queue.length >= QUEUE_LIMIT) return `İnşaat sırası dolu (en fazla ${QUEUE_LIMIT}).`
  /*
   * Ayni yapi siraya IKI KEZ girmez.
   *
   * Maliyet ve sure O ANKI seviyeden hesaplanir; ayni yapiyi iki kez siraya
   * almak iki seviyeyi tek seviyenin fiyatina almak olurdu. Ikariam'da sira
   * ayni binayi kabul eder ama orada her sira ogesi kendi seviyesinden
   * fiyatlanir - o hesabi kurmadan bu kapiyi acmak dengeyi bozar.
   */
  if (g.queue.some(job => job.id === id)) return 'Bu yapı zaten inşaat sırasında.'
  if (g.buildings[id] >= MAX_LEVEL[id]) return 'En yüksek seviyeye ulaşıldı.'
  /*
   * ON KOSUL, ARSADAN ONCE sorulur.
   *
   * Henuz Ticaret Limani kurmamis bir oyuncuya "limanda bos iskele yok"
   * demek yanlis cevaptir: eksik olan iskele degil, limanin kendisi. Once
   * neyin eksik oldugunu soyle, sonra nereye sigmayacagini.
   */
  const needs = BUILDINGS[id].needs
  if (needs && g.buildings[needs.id] < needs.level) return `${BUILDINGS[needs.id].name} ${needs.level}. seviye gerekli.`
  const tech = BUILDINGS[id].tech
  if (tech && !g.research.includes(tech)) return `${RESEARCH[tech].name} araştırması gerekli.`
  const only = BUILDINGS[id].only
  const capital = g.empire?.capital ?? true
  if (only === 'capital' && !capital) return 'Saray yalnızca başkentte kurulur; kolonide Valilik kur.'
  if (only === 'colony' && capital) return 'Valilik yalnızca kolonilerde kurulur; başkentte Saray var.'
  // Hic kurulmamis yapi once KENDI BOLGESINDE bir arsaya yerlestirilmeli.
  if (takesPlot(id) && g.placement[id] === null && freePlots(g, zoneOf(id)).length === 0) {
    return zoneOf(id) === 'liman' ? 'Limanda boş iskele kalmadı.'
      : nextPlotDivan(g) ? `Boş arsa kalmadı. Divanhane ${nextPlotDivan(g)}. seviyede şehir büyür, yeni arsalar açılır.` : 'Boş arsa kalmadı.'
  }
  if (id !== 'divan' && g.buildings[id] >= g.buildings.divan + 1) return `Divanhane ${g.buildings.divan + 1}. seviye gerekli.`
  const c = cost(g, id)
  if (RESOURCE_IDS.some(r => g.resources[r] < c[r])) return 'Yeterli kaynak yok. Üretimin devam ediyor.'
  const lux = luxuryCost(g, id)
  const missing = LUXURY_IDS.find(r => g.luxury[r] < (lux[r] ?? 0))
  if (missing) return `${lux[missing]} ${LUXURY_NAMES[missing]} gerekli. Adandan, nakliyeyle ya da Çarşı'daki tüccardan edin.`
  return null
}
/** Bir egitim emrinin toplam maliyeti. */
export function unitCost(id: UnitId, count: number, game?: Game): Resources {
  const c = UNITS[id].cost
  const factor = game?.research.includes('askeri_lojistik') ? .9 : 1
  return { gold: Math.floor(c.gold * count * factor),
    wood: Math.floor(c.wood * count * factor),
    stone: c.stone * count, knowledge: 0 }
}

/** Bir egitim emrinin suresi, saniye. */
export function unitDuration(g: Game, id: UnitId, count: number) {
  return Math.round(UNITS[id].seconds * count *
    (g.research.includes('architecture') ? .75 : 1) *
    (g.research.includes('talim') ? .90 : 1) * (1 - drillBonus(g, UNITS[id].home)) * (1 - miracle(g, 'demirci') * 0.08) *
    (UNITS[id].branch === 'deniz' && g.research.includes('kuru_havuz') ? 0.8 : 1) * (govIs(g, 'sipahi') ? 0.9 : govIs(g, 'kanun') ? 1.05 : 1))
}

/** Elçiliğin barındırabileceği casus sayısı. */
export function spyCapacity(g: Game) { return g.buildings.elcilik * BUILDING_EFFECTS.elcilikSpies + g.buildings.siginak * BUILDING_EFFECTS.siginakSpies }
/** Casusluk başarısına şehir katkısı (Elçilik, Gizli Sığınak, Casusluk). */
export function spyBonus(g: Game) {
  return g.buildings.elcilik * BUILDING_EFFECTS.elcilikSpySuccess + g.buildings.siginak * BUILDING_EFFECTS.siginakSpySuccess +
    (g.research.includes('casusluk') ? 0.1 : 0)
}
/** Şehre sızan yabancı casusları yakalama gücü (0..0.9). */
export function counterSpy(g: Game) { return Math.min(0.9, g.buildings.siginak * 0.06 + (govIs(g, 'kanun') ? 0.2 : 0)) }

/** Eğitim yapısının yükseltmesiyle gelen hız: her yükseltme %3, en fazla %45. */
export function drillBonus(g: Game, home: BuildingId) {
  return Math.min(BUILDING_EFFECTS.drillSpeedCap, Math.max(0, g.buildings[home] - 1) * BUILDING_EFFECTS.drillSpeed)
}

/**
 * Egitim emri verilebilir mi?
 *
 * Nufus kosulu BOSTAKI halka bakar, toplam nufusa degil: calisan bir isci
 * asla sessizce askere alinmaz. Oyuncu once Halk panelinden adam bosaltir.
 * Boylece "ordumu kurdum ama uretimim nicin dustu" sorusu hic dogmaz -
 * dusuren hareketi kendisi yapmis olur.
 */
export function recruitReason(g: Game, id: UnitId, count: number): string | null {
  const unit = UNITS[id]
  if (!Number.isInteger(count) || count <= 0) return 'Geçersiz sayı.'
  if (g.buildings[unit.home] < unit.level) return `${BUILDINGS[unit.home].name} ${unit.level}. seviye gerekli.`
  if (unit.tech && !g.research.includes(unit.tech)) return `${RESEARCH[unit.tech].name} araştırması gerekli.`
  if (drillsAt(g, unit.home).length >= DRILL_QUEUE_LIMIT) return `${BUILDINGS[unit.home].name} sırası dolu (en fazla ${DRILL_QUEUE_LIMIT} emir).`
  if (id === 'casus' && g.army.casus + count > spyCapacity(g)) return `Elçilik ${spyCapacity(g)} casus barındırır. Elçiliği yükselt.`
  const need = unit.pop * count
  if (inGarrison(id) && garrisonUsed(g, unit.branch) + need > garrisonLimit(g, unit.branch)) {
    return `Garnizon sınırı dolu (${garrisonUsed(g, unit.branch)}/${garrisonLimit(g, unit.branch)}). ${unit.branch === 'kara' ? "Divanhane'yi ya da Surları" : "Tersane'yi"} yükselt.`
  }
  if (idleWorkers(g) < need) return `${need} boşta vatandaş gerekli. Halk panelinden işçi çek.`
  const c = unitCost(id, count, g)
  if (RESOURCE_IDS.some(r => g.resources[r] < c[r])) return 'Yeterli kaynak yok.'
  if (!hasLuxury(g, unitLuxuryCost(id, count, g))) return `${unitLuxuryCost(id, count, g).kukurt} kükürt gerekli (barut).`
  return null
}

export function researchReason(g: Game, id: ResearchId): string | null {
  if (g.research.includes(id)) return 'Araştırma tamamlandı.'
  if (g.study) return 'Önce devam eden araştırmayı tamamla.'
  const needs = RESEARCH[id].needs
  if (needs && !g.research.includes(needs)) return `Önce ${RESEARCH[needs].name} araştırılmalı.`
  if (g.buildings.medrese < RESEARCH[id].required) return `Medrese ${RESEARCH[id].required}. seviye gerekli.`
  if (g.resources.knowledge < RESEARCH[id].cost) return 'Yeterli ilim puanı yok.'
  return null
}
export function objectiveDone(g: Game, id: string) { return id === 'first-upgrade' ? g.buildings.divan >= 2 : id === 'first-academy' ? g.buildings.medrese >= 1 : id === 'first-research' ? g.research.length > 0 : false }
export type Command =
  | { type: 'build'; id: BuildingId; plot?: number }
  | { type: 'research'; id: ResearchId }
  | { type: 'claim'; id: string }
  | { type: 'workers'; id: WorkerId; value: number }
  | { type: 'recruit'; id: UnitId; count: number }
  /** Bir yol hucresini ac/kapat (oyuncu yolu kendi doser). */
  | { type: 'road'; cell: string }
  /** Bir binayi yatayda aynala (sag-sol cevir). */
  | { type: 'flip'; id: BuildingId }
  /** Kurulu bir binayi BOS bir arsaya tasi. */
  | { type: 'move'; id: BuildingId; plot: number }
  /** Ada madenine işçi ata. */
  | { type: 'miners'; value: number }
  /** Ada madenine kereste bağışla (maden seviyesi yükselir). */
  | { type: 'donate'; amount: number }
  /** Çarşıdaki tüccardan lüks kaynak al ya da sat. */
  | { type: 'trade'; id: Luxury; side: 'buy' | 'sell'; amount: number }
  /** Cami'ye rahip ata. */
  | { type: 'priests'; value: number }
  /** Adanın harikasına kereste bağışla. */
  | { type: 'wonder'; amount: number }
  /** Harikanın mucizesini çağır. */
  | { type: 'miracle' }
  /** Tophane'de bir birliğin saldırısını ya da zırhını yükselt. */
  | { type: 'upgrade'; id: UnitId; stat: 'atk' | 'def' }
  /** Bir dalın "Gelecek" araştırmasını bir seviye ilerlet. */
  | { type: 'future'; branch: ResearchBranch }
  /** Kara Pazar'da bir malı başka bir mala çevir. */
  | { type: 'exchange'; from: Good; to: Good; amount: number }
  /** Ada ormanına işçi ata / kereste bağışla. */
  | { type: 'foresters'; value: number }
  | { type: 'forestDonate'; amount: number }
  /** Kahvehane'de ikram edilecek seviye. */
  | { type: 'tavern'; value: number }
  /** Yönetim biçimini değiştir. */
  | { type: 'government'; id: GovernmentId }
  /** Bir binayı bir seviye yık. */
  | { type: 'demolish'; id: BuildingId }
  /** Deneyler: kristali ilime çevir (100'lük partiler). */
  | { type: 'experiment'; batches: number }
export function execute(source: Game, command: Command, now: number): { game: Game; error?: string } {
  const g = advance(source, now)
  if (command.type === 'build') {
    const reason = buildReason(g, command.id)
    if (reason) return { game: g, error: reason }
    /*
     * YENI bir yapi bir ARSAYA kurulur.
     *
     * Oyuncu arsayi secebilir; secmediyse ilk bos arsa kullanilir. Secilen
     * arsa doluysa komut reddedilir - aksi halde iki yapi ust uste cizilirdi.
     */
    if (takesPlot(command.id) && g.placement[command.id] === null) {
      const free = freePlots(g, zoneOf(command.id))
      const plot = command.plot ?? free[0]
      if (plot === undefined || !free.includes(plot)) {
        return { game: g, error: zoneOf(command.id) === 'liman' ? 'Bu yapı limana kurulur. Boş bir iskele seç.' : 'Bu arsa dolu. Başka bir arsa seç.' }
      }
      g.placement[command.id] = plot
    }
    const c = cost(g, command.id)
    for (const r of RESOURCE_IDS) g.resources[r] -= c[r]
    payLuxury(g, luxuryCost(g, command.id))
    /*
     * Sirada bekleyen isin sayaci, KENDINDEN ONCEKI bittiginde baslar.
     * Baslangici "now" yapmak, sirayla eklenen uc isin ayni anda bitmesi
     * demek olurdu.
     */
    const start = Math.max(now, g.queue[g.queue.length - 1]?.end ?? now)
    g.queue.push({ id: command.id, kind: 'build', start, end: start + duration(g, command.id) * 1000 })
    logEvent(g, g.queue.length > 1
      ? `${BUILDINGS[command.id].name} inşaat sırasına alındı.`
      : `${BUILDINGS[command.id].name} için ustalar çalışmaya başladı.`, now)
  } else if (command.type === 'workers') {
    /*
     * Isci dagitimi: istenen sayi once kapasiteye, sonra BOSTAKI halka gore
     * budanir. Basarisiz bir komut hata dondurmez - kaydirma cubugunu ucuna
     * dayamak bir hata degildir, oyuncu zaten siniri gorur.
     */
    const others = WORKER_IDS.filter(w => w !== command.id).reduce((sum, w) => sum + g.workers[w], 0)
    const want = Number.isFinite(command.value) ? Math.max(0, Math.floor(command.value)) : 0
    g.workers[command.id] = Math.min(want, workerCapacity(g, command.id), Math.max(0, population(g) - soldiers(g) - others))
  } else if (command.type === 'recruit') {
    const reason = recruitReason(g, command.id, command.count)
    if (reason) return { game: g, error: reason }
    const c = unitCost(command.id, command.count, g)
    for (const r of RESOURCE_IDS) g.resources[r] -= c[r]
    payLuxury(g, unitLuxuryCost(command.id, command.count, g))
    // Aynı yapıdaki önceki emir bitince başlar; diğer yapılar paralel yürür.
    const start = Math.max(now, ...drillsAt(g, UNITS[command.id].home).map(j => j.end))
    g.drills.push({ id: command.id, kind: 'drill', start, end: start + unitDuration(g, command.id, command.count) * 1000, count: command.count })
    logEvent(g, start > now ? `${command.count} ${UNITS[command.id].name} eğitim sırasına girdi.` : `${command.count} ${UNITS[command.id].name} için eğitim başladı.`, now)
  } else if (command.type === 'research') {
    const reason = researchReason(g, command.id)
    if (reason) return { game: g, error: reason }
    g.resources.knowledge -= RESEARCH[command.id].cost
    g.study = { id: command.id, kind: 'research', start: now, end: now + RESEARCH[command.id].duration * 1000 }
    logEvent(g, `${RESEARCH[command.id].name} araştırması başladı.`, now)
  } else if (command.type === 'road') {
    /*
     * Yol dosemek/silmek SESSIZ ve BEDAVA: oyuncu haritada bos zemine dokunup
     * yol agini serbestce cizer. Gecersiz hucre yok sayilir.
     */
    if (!isRoadCell(command.cell)) return { game: g }
    g.roads = g.roads.includes(command.cell)
      ? g.roads.filter(c => c !== command.cell)
      : [...g.roads, command.cell]
  } else if (command.type === 'flip') {
    // Binayi yatayda aynala; sessiz.
    g.flips = g.flips.includes(command.id)
      ? g.flips.filter(id => id !== command.id)
      : [...g.flips, command.id]
  } else if (command.type === 'miners') {
    g.mine.miners = Number.isFinite(command.value) ? Math.max(0, Math.floor(command.value)) : 0
    g.mine.miners = clampMiners(g)
  } else if (command.type === 'donate') {
    const amount = Math.floor(command.amount)
    if (!Number.isSafeInteger(amount) || amount <= 0) return { game: g, error: 'Geçersiz bağış.' }
    if (g.mine.level >= MINE_MAX_LEVEL) return { game: g, error: 'Maden en yüksek seviyede.' }
    if (g.resources.wood < amount) return { game: g, error: 'Bu kadar kereste yok.' }
    g.resources.wood -= amount
    g.mine.wood += amount
    // Birikmiş bağış eşiği geçtikçe maden seviye atlar (Ikariam'daki ada bağışı).
    while (g.mine.level < MINE_MAX_LEVEL && g.mine.wood >= mineUpgradeCost(g.mine.level)) {
      g.mine.wood -= mineUpgradeCost(g.mine.level)
      g.mine.level += 1
      logEvent(g, `${LUXURY_NAMES[g.mine.specialty]} madeni ${g.mine.level}. seviyeye ulaştı.`, now)
    }
    if (g.mine.level >= MINE_MAX_LEVEL) { g.resources.wood += g.mine.wood; g.mine.wood = 0 }
  } else if (command.type === 'trade') {
    const amount = Math.floor(command.amount)
    if (!LUXURY_IDS.includes(command.id) || !Number.isSafeInteger(amount) || amount <= 0) return { game: g, error: 'Geçersiz miktar.' }
    if (g.buildings.carsi < 1) return { game: g, error: 'Tüccar için önce Çarşı kur.' }
    if (amount > merchantLimit(g)) return { game: g, error: `Tüccar tek seferde en fazla ${merchantLimit(g)} birim işler.` }
    if (command.side === 'buy') {
      const price = Math.ceil(amount * merchantBuyPrice(g))
      if (g.resources.gold < price) return { game: g, error: `${price} akçe gerekli.` }
      if (g.luxury[command.id] + amount > capacity(g)) return { game: g, error: 'Ambarda yer yok.' }
      g.resources.gold -= price
      g.luxury[command.id] += amount
      logEvent(g, `Tüccardan ${amount} ${LUXURY_NAMES[command.id]} alındı (${price} akçe).`, now)
    } else {
      if (g.luxury[command.id] < amount) return { game: g, error: `Bu kadar ${LUXURY_NAMES[command.id]} yok.` }
      g.luxury[command.id] -= amount
      g.resources.gold = Math.min(capacity(g), g.resources.gold + Math.floor(amount * merchantSellPrice(g)))
      logEvent(g, `Tüccara ${amount} ${LUXURY_NAMES[command.id]} satıldı.`, now)
    }
  } else if (command.type === 'priests') {
    g.temple.priests = Number.isFinite(command.value) ? Math.max(0, Math.floor(command.value)) : 0
    g.temple.priests = clampPriests(g)
  } else if (command.type === 'wonder') {
    const amount = Math.floor(command.amount)
    if (!Number.isSafeInteger(amount) || amount <= 0) return { game: g, error: 'Geçersiz bağış.' }
    if (g.temple.wonderLevel >= WONDER_MAX) return { game: g, error: 'Harika en yüksek seviyede.' }
    if (g.resources.wood < amount) return { game: g, error: 'Bu kadar kereste yok.' }
    g.resources.wood -= amount
    g.temple.wonderWood += amount
    while (g.temple.wonderLevel < WONDER_MAX && g.temple.wonderWood >= wonderCost(g.temple.wonderLevel)) {
      g.temple.wonderWood -= wonderCost(g.temple.wonderLevel)
      g.temple.wonderLevel += 1
      logEvent(g, `${MIRACLES[g.temple.wonder].wonder} ${g.temple.wonderLevel}. seviyeye yükseldi.`, now)
    }
  } else if (command.type === 'miracle') {
    const t = g.temple
    if (g.buildings.cami < 1) return { game: g, error: 'Mucize için önce Cami kur.' }
    if (t.wonderLevel < 1) return { game: g, error: 'Adanın harikası henüz kurulmadı. Kereste bağışla.' }
    if (t.active && now < t.until) return { game: g, error: 'Mucize zaten etkin.' }
    if (now < t.cooldownUntil) return { game: g, error: 'Harika dinleniyor; bir süre sonra tekrar dene.' }
    if (t.faith < miracleCost(t.wonderLevel)) return { game: g, error: `${miracleCost(t.wonderLevel)} inanç gerekli. Rahiplerin biriktiriyor.` }
    t.faith -= miracleCost(t.wonderLevel)
    t.active = t.wonder
    t.until = now + miracleMinutes(t.wonderLevel) * 60_000
    t.cooldownUntil = t.until + MIRACLE_COOLDOWN_MS * (g.research.includes('din') ? 2 / 3 : 1)
    logEvent(g, `${MIRACLES[t.wonder].name} mucizesi başladı: ${MIRACLES[t.wonder].effect(t.wonderLevel)}.`, now)
  } else if (command.type === 'upgrade') {
    const reason = upgradeReason(g, command.id, command.stat)
    if (reason) return { game: g, error: reason }
    const c = upgradeCost(g, command.id, command.stat)
    g.resources.gold -= c.gold
    g.luxury.kristal -= c.kristal
    const u = g.upgrades[command.id] ?? { atk: 0, def: 0 }
    u[command.stat] += 1
    g.upgrades = { ...g.upgrades, [command.id]: u }
    logEvent(g, `${UNITS[command.id].name} ${command.stat === 'atk' ? 'saldırısı' : 'zırhı'} ${u[command.stat]}. seviyeye çıktı.`, now)
  } else if (command.type === 'future') {
    const reason = futureReason(g, command.branch)
    if (reason) return { game: g, error: reason }
    g.resources.knowledge -= futureCost(g.future[command.branch])
    g.future = { ...g.future, [command.branch]: g.future[command.branch] + 1 }
    logEvent(g, `${RESEARCH_BRANCHES.find(b => b.key === command.branch)!.title} Geleceği ${g.future[command.branch]}. seviyeye ulaştı.`, now)
  } else if (command.type === 'foresters') {
    g.forest.workers = Number.isFinite(command.value) ? Math.max(0, Math.floor(command.value)) : 0
    g.forest.workers = clampForest(g)
    g.temple.priests = clampPriests(g)
  } else if (command.type === 'forestDonate') {
    const amount = Math.floor(command.amount)
    if (!Number.isSafeInteger(amount) || amount <= 0) return { game: g, error: 'Geçersiz bağış.' }
    if (g.forest.level >= FOREST_MAX_LEVEL) return { game: g, error: 'Orman en yüksek seviyede.' }
    if (g.resources.wood < amount) return { game: g, error: 'Bu kadar kereste yok.' }
    g.resources.wood -= amount
    g.forest.wood += amount
    g.stats.donated += amount
    while (g.forest.level < FOREST_MAX_LEVEL && g.forest.wood >= forestUpgradeCost(g.forest.level)) {
      g.forest.wood -= forestUpgradeCost(g.forest.level)
      g.forest.level += 1
      logEvent(g, `Ada ormanı ${g.forest.level}. seviyeye ulaştı.`, now)
    }
    if (g.forest.level >= FOREST_MAX_LEVEL) { g.resources.wood += g.forest.wood; g.forest.wood = 0 }
  } else if (command.type === 'tavern') {
    if (!Number.isFinite(command.value)) return { game: g, error: 'Geçersiz seviye.' }
    g.tavern = Math.max(0, Math.min(g.buildings.kahvehane, Math.floor(command.value)))
  } else if (command.type === 'government') {
    if (!GOVERNMENT_IDS.includes(command.id)) return { game: g, error: 'Bilinmeyen yönetim biçimi.' }
    if (!g.research.includes('devlet')) return { game: g, error: 'Devlet Nizamı araştırması gerekli.' }
    if (g.government.id === command.id) return { game: g, error: 'Zaten bu yönetim biçimi yürürlükte.' }
    if (g.government.changedAt && now < g.government.changedAt + GOVERNMENT_COOLDOWN_MS) {
      return { game: g, error: 'Yönetim yakın zamanda değişti; halk bir süre daha yeni düzene alışmalı.' }
    }
    if (g.resources.gold < governmentCost(g)) return { game: g, error: `${governmentCost(g)} akçe gerekli.` }
    g.resources.gold -= governmentCost(g)
    g.government = { id: command.id, changedAt: now, anarchyUntil: now + ANARCHY_MS }
    logEvent(g, `${GOVERNMENTS[command.id].name} ilan edildi. ${ANARCHY_MS / 60_000} dakika kargaşa sürecek.`, now)
  } else if (command.type === 'demolish') {
    const id = command.id
    if (!BUILDING_IDS.includes(id)) return { game: g, error: 'Bilinmeyen yapı.' }
    if (id === 'divan') return { game: g, error: 'Divanhane yıkılamaz.' }
    if (g.buildings[id] < 1) return { game: g, error: 'Bu yapı kurulu değil.' }
    if (g.queue.some(job => job.id === id)) return { game: g, error: 'İnşaat sırasındaki yapı yıkılamaz.' }
    if (drillsAt(g, id).length) return { game: g, error: 'Burada eğitim sürüyor; önce bitmesini bekle.' }
    g.buildings[id] -= 1
    if (g.buildings[id] === 0 && takesPlot(id)) {
      g.placement[id] = null
      g.flips = g.flips.filter(f => f !== id)
    }
    g.workers = clampWorkers(g)
    g.tavern = g.tavern === undefined ? undefined : Math.min(g.tavern, g.buildings.kahvehane)
    g.temple.priests = clampPriests(g)
    logEvent(g, g.buildings[id] ? `${BUILDINGS[id].name} ${g.buildings[id]}. seviyeye indirildi.` : `${BUILDINGS[id].name} yıkıldı.`, now)
  } else if (command.type === 'experiment') {
    const batches = Math.floor(command.batches)
    if (!g.research.includes('deney')) return { game: g, error: 'Deneyler araştırması gerekli.' }
    if (!Number.isSafeInteger(batches) || batches <= 0 || batches > 50) return { game: g, error: 'Geçersiz miktar.' }
    if (g.luxury.kristal < batches * 100) return { game: g, error: `${batches * 100} kristal gerekli.` }
    g.luxury.kristal -= batches * 100
    g.resources.knowledge = Math.min(capacity(g), g.resources.knowledge + batches * 150)
    logEvent(g, `Medrese deneyleri: ${batches * 100} kristal → ${batches * 150} ilim.`, now)
  } else if (command.type === 'exchange') {
    const amount = Math.floor(command.amount)
    const goods = [...RESOURCE_IDS, ...LUXURY_IDS] as Good[]
    if (!goods.includes(command.from) || !goods.includes(command.to) || command.from === command.to || !Number.isSafeInteger(amount) || amount <= 0) {
      return { game: g, error: 'Geçersiz takas.' }
    }
    if (g.buildings.kara_pazar < 1) return { game: g, error: 'Takas için Kara Pazar kur.' }
    if (amount > exchangeLimit(g)) return { game: g, error: `Kara Pazar tek seferde en fazla ${exchangeLimit(g)} birim takas eder.` }
    if (goodAmount(g, command.from) < amount) return { game: g, error: 'Bu kadar mal yok.' }
    const got = Math.floor(amount / exchangeRate(g))
    if (goodAmount(g, command.to) + got > capacity(g)) return { game: g, error: 'Ambarda yer yok.' }
    addGood(g, command.from, -amount)
    addGood(g, command.to, got)
    logEvent(g, `Kara Pazar: ${amount} ${GOOD_NAMES[command.from]} → ${got} ${GOOD_NAMES[command.to]}.`, now)
  } else if (command.type === 'move') {
    /*
     * Kurulu bir binayi BOS bir arsaya tasi. Hedef arsa bos ve ayni bolgede
     * olmali; degilse komut reddedilir (ust uste bina cizilmez).
     */
    if (g.placement[command.id] === null) return { game: g, error: 'Bu yapı henüz kurulmadı.' }
    if (g.placement[command.id] === command.plot) return { game: g } // ayni yer: sessiz
    if (!freePlots(g, zoneOf(command.id)).includes(command.plot)) return { game: g, error: 'Bu arsa dolu. Başka bir arsa seç.' }
    g.placement[command.id] = command.plot
    logEvent(g, `${BUILDINGS[command.id].name} yeni arsasına taşındı.`, now)
  } else {
    const objective = OBJECTIVES.find(o => o.id === command.id)
    if (!objective || !objectiveDone(g, objective.id) || g.claimed.includes(objective.id)) return { game: g, error: 'Bu ödül henüz alınamaz veya zaten alındı.' }
    g.claimed.push(objective.id)
    g.resources.gold = Math.min(capacity(g), g.resources.gold + objective.reward)
    logEvent(g, `${objective.title}: ${objective.reward} akçe ödülü alındı.`, now)
  }
  return { game: g }
}
/**
 * v1 kaydini v2'ye tasir.
 *
 * v1'de yapi konumlari SABITTI (her yapinin katalogda tek bir x/y'si vardi) ve
 * isci diye bir kavram yoktu. Ikisi de v2'de oyuncunun karari oldugu icin eski
 * sehirler makul varsayilanlarla tasinir:
 *   - Yerlesim: yapilar eskiden bulunduklari arsalara oturur, boylece sehir
 *     oyuncunun hatirladigi gibi gorunur.
 *   - Isciler: uretim yapilari KAPASITELERINE kadar doldurulur; eski denge
 *     tam kapasiteyle hesaplanmisti, dolayisiyla uretim ayni kalir.
 */
const LEGACY_PLOT: Record<BuildingId, number> = {
  divan: 0, konut: 1, kereste: 2, tas: 3, ambar: 4, medrese: 5, carsi: 6, hamam: 6,
  // v1'de bunlar yoktu; hicbir eski kayitta seviyeleri sifirdan buyuk olamaz.
  saray: 6, elcilik: 6, kisla: 6, surlar: 6, liman: 6, tersane: 6,
  kahvehane: 6, cami: 6, muze: 6, marangoz: 6, mimar: 6, ormanci: 6, tasci: 6, tophane: 6,
  bagci: 6, simyahane: 6, camci: 6, mahzen: 6, gozlukcu: 6, barutane: 6, depo: 6,
  ticaret_merkezi: 6, harita_arsivi: 6, valilik: 6, korsan_kalesi: 6, kara_pazar: 6, siginak: 6,
}

/**
 * KATALOGA YENI YAPI EKLENDIGINDE eski kayitlari tasir.
 *
 * Yeni bir yapi, eski kayitlarda hic bulunmayan uc alan demektir: seviye,
 * arsa ve isci. Bunlarin dogru baslangic degeri bellidir - kurulmamis, arsasiz,
 * iscisiz - yani bu bir SURUM YUKSELTMESI degil, eksik alanin doldurulmasidir.
 * Surumu artirmak her yeni bina icin ayri bir goc yolu acardi ve kazanci
 * olmazdi.
 *
 * Taninmayan anahtarlar da ayiklanir: katalogdan CIKARILMIS bir yapi kayitta
 * kalirsa dogrulama onu reddederdi.
 *
 * Ayni gerekce ORDU icin de gecerli: askerler eklendiginde eski kayitlarda
 * `army` ve `drill` alanlari yoktu. Dogru baslangic degeri bellidir - ordu
 * yok, egitim yok - yani yine bir surum yukseltmesi degil, eksik alanin
 * doldurulmasidir.
 */
function fillMissing(g: Record<string, unknown>): Record<string, unknown> {
  const buildings = { ...(g.buildings as Record<string, number> | undefined) }
  const placement = { ...(g.placement as Record<string, number | null> | undefined) }
  const workers = { ...(g.workers as Record<string, number> | undefined) }
  const out: { buildings: Record<string, number>; placement: Record<string, number | null>; workers: Record<string, number> } =
    { buildings: {}, placement: {}, workers: {} }
  for (const id of BUILDING_IDS) {
    out.buildings[id] = Number.isInteger(buildings[id]) ? buildings[id] : 0
    out.placement[id] = placement[id] === undefined ? null : placement[id]
  }
  for (const id of WORKER_IDS) out.workers[id] = Number.isInteger(workers[id]) ? workers[id] : 0
  /*
   * IZGARA DEGISTIGINDE sehri yikmamak icin yeniden yerlestirme.
   *
   * Arsa sayisi ya da bolgeler degisirse eski bir kayittaki indeks artik
   * baska bir yere - ya da hicbir yere - isaret edebilir. Boyle bir kaydi
   * reddetmek oyuncunun sehrini silmek olurdu; oysa bilgi kayipsiz
   * tasinabilir: yapiyi KENDI BOLGESINDE bos bir arsaya tasi.
   *
   * Bu, izgarayi degistirmeyi ucuz kilan sey. Satir eklemek ya da cikarmak
   * artik bir goc yolu yazmayi gerektirmiyor.
   */
  const used = new Set<number>()
  for (const id of BUILDING_IDS) {
    const at = out.placement[id]
    if (at === null) continue
    const fits = Number.isInteger(at) && at >= 0 && at < SLOTS.length && SLOTS[at].zone === zoneOf(id as BuildingId)
    if (fits && !used.has(at as number)) { used.add(at as number); continue }
    /*
     * Once KENDI BOLGESINDE bos arsa aranir; yoksa herhangi bir bos arsa.
     *
     * Ikinci adim bir odun: arsalar artik arkaplan resminden olculdugu icin
     * sayilari ve bolgeleri resimle birlikte degisir. Yeni resimde iskele
     * yoksa, kurulu bir Tersane'yi yok saymak oyuncunun sehrini silmek
     * olurdu - yanlis bolgede durmasi, hic durmamasindan iyidir.
     */
    const free = SLOTS.find(slot => slot.zone === zoneOf(id as BuildingId) && !used.has(slot.index))
      ?? SLOTS.find(slot => !used.has(slot.index))
    out.placement[id] = free ? free.index : null
    if (free) used.add(free.index)
  }
  const army = { ...(g.army as Record<string, number> | undefined) }
  const filled: Record<string, number> = {}
  for (const id of UNIT_IDS) filled[id] = Number.isInteger(army[id]) ? army[id] : 0
  /*
   * YOLLAR ve AYNALAMA yeni alanlar: eski kayitlarda yok. Dogru baslangic
   * bellidir - yol yok, aynalama yok - ve gecersiz/yinelenen ogeler ayiklanir
   * (izgara degisirse eski yol kimlikleri artik gecersiz olabilir).
   */
  const roads = Array.isArray(g.roads)
    ? [...new Set((g.roads as unknown[]).filter((c): c is string => typeof c === 'string' && isRoadCell(c)))]
    : []
  const flips = Array.isArray(g.flips)
    ? [...new Set((g.flips as unknown[]).filter((id): id is BuildingId => BUILDING_IDS.includes(id as BuildingId)))]
    : []
  // Lüks kaynaklar ve ada madeni sonradan eklendi: eski kayıtta boş başlar.
  const lux = (g.luxury ?? {}) as Record<string, unknown>
  const luxury: Record<string, unknown> = {}
  for (const id of LUXURY_IDS) luxury[id] = lux[id] === undefined ? 0 : lux[id]
  const m = (g.mine ?? {}) as Record<string, unknown>
  const mine = { specialty: m.specialty ?? 'mermer', level: m.level ?? 1, wood: m.wood ?? 0, miners: m.miners ?? 0 }
  const t = (g.temple ?? {}) as Record<string, unknown>
  const temple = {
    priests: t.priests ?? 0, faith: t.faith ?? 0, wonder: t.wonder ?? 'kalkan', wonderLevel: t.wonderLevel ?? 0,
    wonderWood: t.wonderWood ?? 0, active: t.active ?? null, until: t.until ?? 0, cooldownUntil: t.cooldownUntil ?? 0,
  }
  const f = (g.future ?? {}) as Record<string, unknown>
  const future = { ekonomi: f.ekonomi ?? 0, bilim: f.bilim ?? 0, askeri: f.askeri ?? 0, denizcilik: f.denizcilik ?? 0 }
  const fo = (g.forest ?? {}) as Record<string, unknown>
  const forest = { level: fo.level ?? 1, wood: fo.wood ?? 0, workers: fo.workers ?? 0 }
  const gv = (g.government ?? {}) as Record<string, unknown>
  const government = { id: gv.id ?? 'saltanat', changedAt: gv.changedAt ?? 0, anarchyUntil: gv.anarchyUntil ?? 0 }
  const st = (g.stats ?? {}) as Record<string, unknown>
  const stats = { builds: st.builds ?? 0, trained: st.trained ?? 0, researched: st.researched ?? 0, donated: st.donated ?? 0 }
  // Eski kayıtta tek eğitim emri (drill) vardı; sıraya çevrilir.
  const drills = Array.isArray(g.drills) ? g.drills : g.drill ? [g.drill] : []
  delete (g as Record<string, unknown>).drill
  return { ...g, ...out, army: filled, roads, flips, drills, luxury, mine, temple,
    upgrades: g.upgrades && typeof g.upgrades === 'object' ? g.upgrades : {}, future, piracy: g.piracy ?? 0, forest, government, stats }
}

/**
 * v2 -> v3: tek insaat alani SIRAYA donusur.
 *
 * Devam eden bir is varsa sira tek elemanli baslar; yoksa bos. Sure ve fiyat
 * zaten ise yazilmis oldugu icin oyuncunun beklemesi degismez.
 */
function migrateQueue(g: Record<string, unknown>): Record<string, unknown> {
  if (g.version !== 2) return g
  const construction = g.construction as Job | null | undefined
  const { construction: _drop, ...rest } = g
  return { ...rest, version: 3, queue: construction ? [construction] : [] }
}

function migrate(g: Record<string, unknown>): Record<string, unknown> {
  if (g.version !== 1) return g
  const buildings = g.buildings as Record<BuildingId, number>
  const placement: Record<string, number | null> = {}
  for (const id of BUILDING_IDS) placement[id] = buildings?.[id] > 0 ? LEGACY_PLOT[id] : null
  const workers: Record<string, number> = {}
  for (const id of WORKER_IDS) workers[id] = (buildings?.[id] ?? 0) * WORKERS_PER_LEVEL
  return { ...g, version: 2, placement, workers }
}

export function parseSave(raw: string): Game {
  const g = fillMissing(migrateQueue(migrate(JSON.parse(raw))))
  const finite = (n: unknown) => typeof n === 'number' && Number.isFinite(n) && n >= 0
  const jobIds = { build: BUILDING_IDS, research: RESEARCH_IDS, drill: UNIT_IDS } as const
  const validJob = (j: Job | null, kind: Job['kind']) => j === null || (j && j.kind === kind && jobIds[kind].includes(j.id as never) && finite(j.start) && finite(j.end) && j.end > j.start
    // Egitim emri kac birlik oldugunu tasir; digerlerinde adet kavrami yoktur.
    && (kind === 'drill' ? Number.isInteger(j.count) && (j.count as number) > 0 && (j.count as number) <= 500 : j.count === undefined))
  const placement = g.placement as Record<BuildingId, number | null> | undefined
  const workers = g.workers as Record<WorkerId, number> | undefined
  /*
   * Yerlesim iki kosulu saglamali: her deger ya null ya gecerli bir arsa
   * indeksi olmali VE iki yapi ayni arsayi paylasmamali. Paylasirlarsa
   * ekranda ust uste cizilirlerdi.
   */
  const placed = placement ? BUILDING_IDS.map(id => placement[id]).filter((p): p is number => p !== null) : []
  const levels = g.buildings as Record<BuildingId, number> | undefined
  const queued = new Set((Array.isArray(g.queue) ? (g.queue as Job[]) : []).map(job => job.id))
  /*
   * Yerlesim kurali, INSAAT HALINDEKI yapiyi da kapsamak zorunda.
   *
   * Yeni bir yapinin arsasi is SIRAYA GIRDIGI anda ayrilir - haritada
   * "inşaat sürüyor" olarak gorunmesi icin - ama seviyesi is bitene kadar
   * 0'dir. "seviye > 0 ise arsa vardir, yoksa yoktur" seklindeki ilk kural
   * bu araligi gecersiz sayiyordu ve oyuncunun sehri, ilk yeni yapisini
   * kurar kurmaz sayfa yenilendiginde SILINIYORDU.
   *
   * Dogru kural iki yonlu degil, tek yonludur:
   *   - kurulmus yapinin arsasi OLMALI,
   *   - arsasi olan yapi ya kurulmus ya da sirada OLMALI.
   */
  const placementValid = !!placement && !!levels
    && BUILDING_IDS.every(id => placement[id] === null || (Number.isInteger(placement[id]) && (placement[id] as number) >= 0 && (placement[id] as number) < PLOTS.length))
    // Arsa kaplamayan yapinin (Surlar) arsasi OLMAMALI; kaplayanin olmali.
    && BUILDING_IDS.every(id => (takesPlot(id) ? !(levels[id] > 0) || placement[id] !== null : placement[id] === null))
    /*
     * Bolge kurali INSA SIRASINDA uygulanir (bkz. buildReason), kayitta
     * degil: arsalar arkaplan resminden olculdugu icin resim degistiginde
     * eski bir yapi kendi bolgesi disinda kalabilir. Onarim onu tasir;
     * reddetmek sehri silmek olurdu.
     */
    && BUILDING_IDS.every(id => placement[id] === null || levels[id] > 0 || queued.has(id))
    && new Set(placed).size === placed.length
  const workersValid = !!workers && WORKER_IDS.every(id => Number.isInteger(workers[id]) && workers[id] >= 0)
  const lux = g.luxury as LuxuryStock
  const mine = g.mine as IslandMine
  if (!LUXURY_IDS.every(id => finite(lux[id])) || !LUXURY_IDS.includes(mine.specialty) ||
      !Number.isInteger(mine.level) || mine.level < 1 || mine.level > MINE_MAX_LEVEL ||
      !finite(mine.wood) || !Number.isInteger(mine.miners) || mine.miners < 0) {
    throw new Error('Kayıt dosyası okunamadı. Eski kaydın korunuyor; yeni oyun başlatabilirsin.')
  }
  const temple = g.temple as Temple
  const future = g.future as Record<ResearchBranch, number>
  const upgrades = g.upgrades as Partial<Record<UnitId, { atk: number; def: number }>>
  if (!finite(temple.faith) || !Number.isInteger(temple.priests) || temple.priests < 0 || !MIRACLE_IDS.includes(temple.wonder) ||
      !Number.isInteger(temple.wonderLevel) || temple.wonderLevel < 0 || temple.wonderLevel > WONDER_MAX || !finite(temple.wonderWood) ||
      !(temple.active === null || MIRACLE_IDS.includes(temple.active)) || !finite(temple.until) || !finite(temple.cooldownUntil) ||
      !RESEARCH_BRANCHES.every(b => Number.isInteger(future[b.key]) && future[b.key] >= 0) || !finite(g.piracy) ||
      (g.citizens !== undefined && !finite(g.citizens)) ||
      !Object.entries(upgrades).every(([id, u]) => UNIT_IDS.includes(id as UnitId) && !!u && Number.isInteger(u.atk) && Number.isInteger(u.def) && u.atk >= 0 && u.def >= 0 && u.atk <= 8 && u.def <= 8)) {
    throw new Error('Kayıt dosyası okunamadı. Eski kaydın korunuyor; yeni oyun başlatabilirsin.')
  }
  const forest = g.forest as IslandForest
  const government = g.government as Government
  const stats = g.stats as Game['stats']
  if (!Number.isInteger(forest.level) || forest.level < 1 || forest.level > FOREST_MAX_LEVEL || !finite(forest.wood) ||
      !Number.isInteger(forest.workers) || forest.workers < 0 ||
      !GOVERNMENT_IDS.includes(government.id) || !finite(government.changedAt) || !finite(government.anarchyUntil) ||
      !(['builds', 'trained', 'researched', 'donated'] as const).every(k => finite(stats[k])) ||
      (g.tavern !== undefined && !(Number.isInteger(g.tavern) && (g.tavern as number) >= 0)) ||
      (g.culture !== undefined && !(Number.isInteger(g.culture) && (g.culture as number) >= 0 && (g.culture as number) <= 20))) {
    throw new Error('Kayıt dosyası okunamadı. Eski kaydın korunuyor; yeni oyun başlatabilirsin.')
  }
  const army = g.army as Army | undefined
  const armyValid = !!army && UNIT_IDS.every(id => Number.isInteger(army[id]) && army[id] >= 0 && army[id] <= 100_000)
  const queue = g.queue as Job[] | undefined
  /*
   * Sira gecerli olmali: uzunlugu sinirin altinda, her ogesi gecerli bir is,
   * ayni yapi birden fazla kez YOK ve isler zaman sirasinda.
   */
  const queueValid = Array.isArray(queue) && queue.length <= QUEUE_LIMIT
    && queue.every(job => validJob(job, 'build'))
    && new Set(queue.map(job => job.id)).size === queue.length
    && queue.every((job, i) => i === 0 || job.start >= queue[i - 1].end - 1)
  if (!g || g.version !== 3 || !queueValid || !finite(g.updatedAt) || !g.resources || !g.buildings || !placementValid || !workersValid || !armyValid || !Array.isArray(g.drills) || (g.drills as Job[]).length > 20 || !(g.drills as Job[]).every(j => validJob(j, 'drill')) || !RESOURCE_IDS.every(r => finite((g.resources as Resources)[r])) || !BUILDING_IDS.every(b => Number.isInteger((g.buildings as Record<BuildingId, number>)[b]) && (g.buildings as Record<BuildingId, number>)[b] >= 0 && (g.buildings as Record<BuildingId, number>)[b] <= MAX_LEVEL[b]) || (g.buildings as Record<BuildingId, number>).divan < 1 || !Array.isArray(g.research) || !(g.research as ResearchId[]).every((id: ResearchId) => RESEARCH_IDS.includes(id)) || new Set(g.research as ResearchId[]).size !== (g.research as ResearchId[]).length || !Array.isArray(g.claimed) || !(g.claimed as string[]).every((id: string) => OBJECTIVES.some(o => o.id === id)) || !validJob(g.study as Job | null, 'research') || !Array.isArray(g.log) || (g.log as unknown[]).length > 60 || !(g.log as { text: unknown; time: unknown }[]).every((l) => typeof l.text === 'string' && l.text.length < 500 && finite(l.time))) throw new Error('Kayıt dosyası okunamadı. Eski kaydın korunuyor; yeni oyun başlatabilirsin.')
  const game = g as unknown as Game
  if (game.queue.some(job => game.buildings[job.id as BuildingId] >= MAX_LEVEL[job.id as BuildingId])) throw new Error('İnşaat kaydı geçersiz.')
  if (game.study && game.research.includes(game.study.id as ResearchId)) throw new Error('Araştırma kaydı geçersiz.')
  /*
   * Ordunun BEDELI nufustur: bir kayit, sehrin besleyebileceginden fazla asker
   * tasiyamaz. Elle duzenlenmis ya da bozulmus bir dosya bu sinirin ustune
   * cikarsa isci hesabi eksiye duser ve uretim anlamsizlasir.
   */
  if (soldiers(game) > maxPopulation(game)) throw new Error('Ordu kaydı geçersiz.')
  // Nufus konut seviyesinden turer; kayittaki dagitim onu asiyorsa budanir.
  game.workers = clampWorkers(game)
  return game
}
export function formatNumber(n: number) { return Math.floor(n).toLocaleString('tr-TR') }
export function timeLeft(job: Job, now: number) { const seconds = Math.max(0, Math.ceil((job.end - now) / 1000)); return `${Math.floor(seconds / 60).toString().padStart(2, '0')}:${(seconds % 60).toString().padStart(2, '0')}` }
