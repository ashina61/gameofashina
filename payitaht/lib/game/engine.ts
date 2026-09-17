import { SLOTS, type Zone } from './layout'

export const RESOURCE_IDS = ['gold', 'wood', 'stone', 'knowledge'] as const
export type Resource = typeof RESOURCE_IDS[number]
export type Resources = Record<Resource, number>
export const BUILDING_IDS = ['divan', 'saray', 'elcilik', 'konut', 'hamam', 'carsi', 'ambar', 'kereste', 'tas', 'medrese', 'kisla', 'surlar', 'liman', 'tersane'] as const
export type BuildingId = typeof BUILDING_IDS[number]
export const RESEARCH_IDS = ['tools', 'storage', 'architecture'] as const
export type ResearchId = typeof RESEARCH_IDS[number]
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
  /** Kisla/tersanede suren TEK egitim emri; bos ise null. */
  drill: Job | null
  /** Sehrin elindeki birlikler. */
  army: Army
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
  saray: { name: 'Saray', category: 'YÖNETİM', description: 'Hükmünü uzağa taşır. Yeni şehirler kurmanın yolunu açar ve Şehirler danışmanını çalıştırır.', base: 320, art: true, needs: { id: 'divan', level: 3 } },
  elcilik: { name: 'Elçilik', category: 'YÖNETİM', description: 'Komşularınla konuşmanın kapısı. Diplomasi danışmanını ve ittifak defterini açar.', base: 200, art: true, needs: { id: 'divan', level: 2 } },
  kisla: { name: 'Kışla', category: 'ASKERÎ', description: 'Halkından asker yetiştirir. Her eğitilen vatandaş üretimden düşer — ordunun bedeli budur.', base: 180, art: true, needs: { id: 'divan', level: 2 } },
  surlar: { name: 'Surlar', category: 'ASKERÎ', description: 'Şehrin taş kalkanı. Her seviye savunmaya asker gerektirmeyen güç ekler. Arsa kaplamaz — şehrin çevresine örülür.', base: 150, art: false, zone: 'sur', needs: { id: 'kisla', level: 1 } },
  liman: { name: 'Ticaret Limanı', category: 'LİMAN', description: 'Denizin kapısı. Ticaret kapasitesi verir ve nakliye gemisi inşa ettirir.', base: 160, art: true, zone: 'liman', needs: { id: 'divan', level: 2 } },
  tersane: { name: 'Tersane', category: 'LİMAN', description: 'Savaş gemilerinin doğduğu yer. Kadırga ve kalyon buradan denize iner. Şehirde değil, denizin kenarındaki iskeleye kurulur.', base: 240, art: true, zone: 'liman', needs: { id: 'liman', level: 1 } },
}

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
export const UNIT_IDS = ['yeniceri', 'okcu', 'sipahi', 'topcu', 'kadirga', 'kalyon', 'nakliye'] as const
export type UnitId = typeof UNIT_IDS[number]
export type Army = Record<UnitId, number>
export type Unit = {
  name: string; branch: 'kara' | 'deniz'
  /** Bu birligi yetistiren yapi. */
  home: BuildingId
  /** O yapinin gerekli en dusuk seviyesi. */
  level: number
  description: string
  /** Birlik basina sehirden dusen vatandas. */
  pop: number
  cost: Resources
  attack: number; defense: number
  /** Tek bir birligin egitim suresi, saniye. */
  seconds: number
  /** Nakliyenin tasidigi mal; digerlerinde 0. */
  cargo: number
}
export const UNITS: Record<UnitId, Unit> = {
  yeniceri: { name: 'Yeniçeri', branch: 'kara', home: 'kisla', level: 1, description: 'Ordunun belkemiği. Hem vurur hem dayanır.', pop: 1, cost: { gold: 80, wood: 20, stone: 0, knowledge: 0 }, attack: 12, defense: 10, seconds: 12, cargo: 0 },
  okcu: { name: 'Okçu', branch: 'kara', home: 'kisla', level: 1, description: 'Uzaktan vurur, yakında erir. Yeniçerinin arkasında durur.', pop: 1, cost: { gold: 60, wood: 45, stone: 0, knowledge: 0 }, attack: 16, defense: 4, seconds: 12, cargo: 0 },
  sipahi: { name: 'Sipahi', branch: 'kara', home: 'kisla', level: 2, description: 'Atlı akıncı. Hızlıdır, ilk darbeyi o indirir.', pop: 2, cost: { gold: 180, wood: 40, stone: 0, knowledge: 0 }, attack: 28, defense: 14, seconds: 20, cargo: 0 },
  topcu: { name: 'Topçu', branch: 'kara', home: 'kisla', level: 3, description: 'Sur yıkar. Yavaştır ve korunmaya muhtaçtır.', pop: 3, cost: { gold: 320, wood: 140, stone: 90, knowledge: 0 }, attack: 65, defense: 6, seconds: 34, cargo: 0 },
  kadirga: { name: 'Kadırga', branch: 'deniz', home: 'tersane', level: 1, description: 'Hafif savaş gemisi. Kürekle döner, dar sularda üstündür.', pop: 12, cost: { gold: 600, wood: 420, stone: 0, knowledge: 0 }, attack: 45, defense: 35, seconds: 45, cargo: 0 },
  kalyon: { name: 'Kalyon', branch: 'deniz', home: 'tersane', level: 2, description: 'Ağır kalyon. Yavaş ama denizde son sözü söyler.', pop: 25, cost: { gold: 1400, wood: 950, stone: 120, knowledge: 0 }, attack: 120, defense: 95, seconds: 75, cargo: 0 },
  nakliye: { name: 'Nakliye', branch: 'deniz', home: 'liman', level: 1, description: 'Asker ve mal taşır. Ticaretin ve seferin ayağıdır.', pop: 8, cost: { gold: 450, wood: 340, stone: 0, knowledge: 0 }, attack: 0, defense: 18, seconds: 40, cargo: 500 },
}
export const RESEARCH: Record<ResearchId, { name: string; description: string; cost: number; duration: number; required: number }> = {
  tools: { name: 'Usta Elleri', description: 'Akçe, kereste, taş ve ilim üretimi kalıcı olarak %20 artar.', cost: 30, duration: 30, required: 1 },
  storage: { name: 'Ambar Nizamı', description: 'Tüm kaynakların depolama kapasitesi kalıcı olarak %25 artar.', cost: 50, duration: 40, required: 1 },
  architecture: { name: 'Mimarın Sırrı', description: 'Yeni inşaat ve yükseltmeler %25 daha hızlı tamamlanır.', cost: 80, duration: 45, required: 2 },
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
    research: [], queue: [], study: null, drill: null, claimed: [],
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
export function idleWorkers(g: Game) { return Math.max(0, population(g) - assignedWorkers(g) - soldiers(g)) }

/** Egitimi SUREN birligin simdiden ayirdigi vatandas. */
export function trainingPop(g: Game): number {
  const job = g.drill
  return job ? UNITS[job.id as UnitId].pop * (job.count ?? 0) : 0
}

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
export function power(g: Game, branch: 'kara' | 'deniz') {
  return UNIT_IDS.filter(id => UNITS[id].branch === branch).reduce(
    (sum, id) => ({ attack: sum.attack + UNITS[id].attack * g.army[id], defense: sum.defense + UNITS[id].defense * g.army[id] }),
    { attack: 0, defense: 0 })
}

/** Surlarin asker gerektirmeyen savunmasi. */
export function wallDefense(g: Game) { return g.buildings.surlar * 150 }

/** Sehrin toplam savunmasi: surlar + kara birlikleri. */
export function cityDefense(g: Game) { return wallDefense(g) + power(g, 'kara').defense }

/** Nakliye gemilerinin tasidigi mal. */
export function cargoCapacity(g: Game) { return g.army.nakliye * UNITS.nakliye.cargo }

/** Ticaret limaninin ayni anda tasinmasina izin verdigi mal. */
export function tradeCapacity(g: Game) { return g.buildings.liman * 1200 }

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
export function capacity(g: Game) { return (3000 + g.buildings.ambar * 1500) * (g.research.includes('storage') ? 1.25 : 1) }
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
export function rates(g: Game): Resources {
  const multiplier = g.research.includes('tools') ? 1.2 : 1
  const workers = clampWorkers(g)
  const share = (id: WorkerId) => {
    const cap = workerCapacity(g, id)
    return cap > 0 ? workers[id] / cap : 0
  }
  return {
    // Akce iki kaynaktan gelir: halkin vergisi (isci istemez) ve carsi esnafi.
    gold: (60 + g.buildings.konut * 120 + g.buildings.carsi * 100 * share('carsi')) * multiplier,
    wood: g.buildings.kereste * 120 * share('kereste') * multiplier,
    stone: g.buildings.tas * 90 * share('tas') * multiplier,
    knowledge: g.buildings.medrese * 8 * share('medrese') * multiplier,
  }
}
/** Konaklarin barindirabilecegi en fazla nufus. */
export function housing(g: Game) { return 80 + g.buildings.konut * 40 }

/**
 * Sehrin HUZURLA tutabilecegi nufus.
 *
 * Ikariam'in ana kisiti budur: dam altina almak yetmez, halki memnun da
 * etmek gerekir. Taban 120 secildi cunku oyunun basindaki konut seviyesi 1
 * ile barinma da 120'dir - yani kisit ilk andan itibaren canimizi yakmaz,
 * ancak oyuncu Konaklar'i YUKSELTTIGINDE devreye girer ve Hamam'i anlamli
 * kilar.
 */
export function contentment(g: Game) { return 120 + g.buildings.hamam * 60 }

/**
 * Sehirde GERCEKTEN yasayan nufus.
 *
 * Iki kisidan hangisi kucukse o. Barinma huzurdan buyukse fazla konutlar bos
 * kalir; oyuncu bunu "Halk" panelinde dogrudan gorur.
 */
export function population(g: Game) { return Math.min(housing(g), contentment(g)) }

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
export function cost(g: Game, id: BuildingId): Resources {
  const base = Math.round(BUILDINGS[id].base * 1.65 ** g.buildings[id])
  return { gold: base, wood: Math.round(base * 1.2), stone: Math.round(base * .75), knowledge: 0 }
}
export function duration(g: Game, id: BuildingId) { return Math.round((20 + g.buildings[id] * 10) * (g.research.includes('architecture') ? .75 : 1)) }
export function logEvent(g: Game, text: string, time: number) { g.log = [{ text, time }, ...g.log].slice(0, 60) }
export function advance(source: Game, now: number): Game {
  const g: Game = structuredClone(source)
  if (now <= g.updatedAt) return g
  const start = g.updatedAt
  const cutoff = Math.min(now, start + 8 * 3600_000)
  let cursor = start
  function produce(until: number) {
    const minutes = Math.max(0, Math.min(until, cutoff) - Math.min(cursor, cutoff)) / 60_000
    const speed = rates(g)
    for (const r of RESOURCE_IDS) g.resources[r] = Math.min(capacity(g), g.resources[r] + speed[r] * minutes)
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
  if (g.drill && g.drill.end <= now) jobs.push(g.drill)
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
      logEvent(g, `${BUILDINGS[id].name} ${g.buildings[id]}. seviyeye ulaştı.`, job.end)
    } else if (job.kind === 'research') {
      const id = job.id as ResearchId
      if (!g.research.includes(id)) g.research.push(id)
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
      g.drill = null
      g.army[id] += count
      logEvent(g, `${count} ${UNITS[id].name} sancağın altına girdi.`, job.end)
    }
  }
  produce(now)
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
  return PLOTS.filter(slot => !taken.has(slot.index) && (zone === undefined || slot.zone === zone)).map(slot => slot.index)
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
  if (g.buildings[id] >= 5) return 'En yüksek seviyeye ulaşıldı.'
  /*
   * ON KOSUL, ARSADAN ONCE sorulur.
   *
   * Henuz Ticaret Limani kurmamis bir oyuncuya "limanda bos iskele yok"
   * demek yanlis cevaptir: eksik olan iskele degil, limanin kendisi. Once
   * neyin eksik oldugunu soyle, sonra nereye sigmayacagini.
   */
  const needs = BUILDINGS[id].needs
  if (needs && g.buildings[needs.id] < needs.level) return `${BUILDINGS[needs.id].name} ${needs.level}. seviye gerekli.`
  // Hic kurulmamis yapi once KENDI BOLGESINDE bir arsaya yerlestirilmeli.
  if (takesPlot(id) && g.placement[id] === null && freePlots(g, zoneOf(id)).length === 0) {
    return zoneOf(id) === 'liman' ? 'Limanda boş iskele kalmadı.' : 'Boş arsa kalmadı.'
  }
  if (id !== 'divan' && g.buildings[id] >= g.buildings.divan + 1) return `Divanhane ${g.buildings.divan + 1}. seviye gerekli.`
  const c = cost(g, id)
  if (RESOURCE_IDS.some(r => g.resources[r] < c[r])) return 'Yeterli kaynak yok. Üretimin devam ediyor.'
  return null
}
/** Bir egitim emrinin toplam maliyeti. */
export function unitCost(id: UnitId, count: number): Resources {
  const c = UNITS[id].cost
  return { gold: c.gold * count, wood: c.wood * count, stone: c.stone * count, knowledge: 0 }
}

/** Bir egitim emrinin suresi, saniye. */
export function unitDuration(g: Game, id: UnitId, count: number) {
  return Math.round(UNITS[id].seconds * count * (g.research.includes('architecture') ? .75 : 1))
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
  if (g.drill) return 'Eğitim sürüyor. Önce onun bitmesini bekle.'
  const need = unit.pop * count
  if (idleWorkers(g) < need) return `${need} boşta vatandaş gerekli. Halk panelinden işçi çek.`
  const c = unitCost(id, count)
  if (RESOURCE_IDS.some(r => g.resources[r] < c[r])) return 'Yeterli kaynak yok.'
  return null
}

export function researchReason(g: Game, id: ResearchId): string | null {
  if (g.research.includes(id)) return 'Araştırma tamamlandı.'
  if (g.study) return 'Önce devam eden araştırmayı tamamla.'
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
    const c = unitCost(command.id, command.count)
    for (const r of RESOURCE_IDS) g.resources[r] -= c[r]
    g.drill = { id: command.id, kind: 'drill', start: now, end: now + unitDuration(g, command.id, command.count) * 1000, count: command.count }
    logEvent(g, `${command.count} ${UNITS[command.id].name} için eğitim başladı.`, now)
  } else if (command.type === 'research') {
    const reason = researchReason(g, command.id)
    if (reason) return { game: g, error: reason }
    g.resources.knowledge -= RESEARCH[command.id].cost
    g.study = { id: command.id, kind: 'research', start: now, end: now + RESEARCH[command.id].duration * 1000 }
    logEvent(g, `${RESEARCH[command.id].name} araştırması başladı.`, now)
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
  return { ...g, ...out, army: filled, drill: g.drill === undefined ? null : g.drill }
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
  if (!g || g.version !== 3 || !queueValid || !finite(g.updatedAt) || !g.resources || !g.buildings || !placementValid || !workersValid || !armyValid || !validJob(g.drill as Job | null, 'drill') || !RESOURCE_IDS.every(r => finite((g.resources as Resources)[r])) || !BUILDING_IDS.every(b => Number.isInteger((g.buildings as Record<BuildingId, number>)[b]) && (g.buildings as Record<BuildingId, number>)[b] >= 0 && (g.buildings as Record<BuildingId, number>)[b] <= 5) || (g.buildings as Record<BuildingId, number>).divan < 1 || !Array.isArray(g.research) || !(g.research as ResearchId[]).every((id: ResearchId) => RESEARCH_IDS.includes(id)) || new Set(g.research as ResearchId[]).size !== (g.research as ResearchId[]).length || !Array.isArray(g.claimed) || !(g.claimed as string[]).every((id: string) => OBJECTIVES.some(o => o.id === id)) || !validJob(g.study as Job | null, 'research') || !Array.isArray(g.log) || (g.log as unknown[]).length > 60 || !(g.log as { text: unknown; time: unknown }[]).every((l) => typeof l.text === 'string' && l.text.length < 500 && finite(l.time))) throw new Error('Kayıt dosyası okunamadı. Eski kaydın korunuyor; yeni oyun başlatabilirsin.')
  const game = g as unknown as Game
  if (game.queue.some(job => game.buildings[job.id as BuildingId] >= 5)) throw new Error('İnşaat kaydı geçersiz.')
  if (game.study && game.research.includes(game.study.id as ResearchId)) throw new Error('Araştırma kaydı geçersiz.')
  /*
   * Ordunun BEDELI nufustur: bir kayit, sehrin besleyebileceginden fazla asker
   * tasiyamaz. Elle duzenlenmis ya da bozulmus bir dosya bu sinirin ustune
   * cikarsa isci hesabi eksiye duser ve uretim anlamsizlasir.
   */
  if (soldiers(game) > population(game)) throw new Error('Ordu kaydı geçersiz.')
  // Nufus konut seviyesinden turer; kayittaki dagitim onu asiyorsa budanir.
  game.workers = clampWorkers(game)
  return game
}
export function formatNumber(n: number) { return Math.floor(n).toLocaleString('tr-TR') }
export function timeLeft(job: Job, now: number) { const seconds = Math.max(0, Math.ceil((job.end - now) / 1000)); return `${Math.floor(seconds / 60).toString().padStart(2, '0')}:${(seconds % 60).toString().padStart(2, '0')}` }
