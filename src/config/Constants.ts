import type { ResourcePool } from '@/types';

/** Oyunun ayarlanabilir sabitleri. Denge degisiklikleri once burada yapilir. */

/** Yeni bir oyunun baslangic kaynaklari. */
export const STARTING_RESOURCES: ResourcePool = {
  food: 150,
  wood: 220,
  stone: 140,
  gold: 60,
  // Bilgi sifirdan baslar: Akademi kurulmadan arastirma yapilamaz.
  knowledge: 0,
};

/** Izometrik karo genisligi (piksel). */
export const TILE_WIDTH = 128;

/** Izometrik karo yuksekligi (piksel). */
export const TILE_HEIGHT = 64;

/**
 * Sehir izgarasinin boyutu (GRID_SIZE x GRID_SIZE).
 *
 * Sprint 14'te 14'ten 18'e cikti: 14x14'te 75 yapi alani vardi ve sehir
 * "yogun bir sehir" hissi verecek kadar buyuyemiyordu. 18x18 ayni sokak
 * deseniyle 144 yapi karosu verir.
 */
export const GRID_SIZE = 18;

/**
 * Sprint 13 ve oncesinde uretilmis kayitlarin izgara boyutu.
 *
 * Kayitta izgara boyutu YOKSA bu deger kullanilir. Eski bir sehri 18x18'e
 * tasimak, zemin seed'den turedigi icin binalarin altindaki araziyi
 * degistirir (ev suyun uzerinde kalabilir) ve sehir merkezi artik merkezde
 * olmaz. Bu yuzden eski sehirler kendi olcusunde yasamaya devam eder;
 * yalnizca YENI oyunlar buyuk haritada baslar.
 */
export const LEGACY_GRID_SIZE = 14;

/**
 * Sokak araligi: satir/sutun numarasi bunun kati olan karolar yapiya kapalidir.
 *
 * Hem yerlesim (BuildingPlotSystem) hem de zemin uretimi (GridMap) bunu
 * bilmek zorunda: zemin, sehir merkezinin oturacagi ADANIN tamamini duz
 * cimene cevirmeli. Sprint 14'te harita 18x18 olunca merkez adasi
 * temizlenen alanin bir karo disina tasti ve sehir merkezine hic alan
 * ayrilamadi (olculdu: civic plot sayisi 0). Sabit tek yerde durunca ikisi
 * birbirinden kayamaz.
 */
export const STREET_EVERY = 3;

/**
 * Simulasyonun saniyedeki tik sayisi.
 * Oyun durumu tiklerle ilerler; gercek zaman yalnizca kac tik islenecegini
 * belirler. Bu degeri degistirmek dengeyi degistirir.
 */
export const TICKS_PER_SECOND = 1;

/** Bir tikin gercek zamanda karsiligi (ms). */
export const MS_PER_TICK = 1000 / TICKS_PER_SECOND;

/** Cevrimdisi telafi tek seferde en fazla bu kadar tik islenerek uygulanir. */
export const OFFLINE_CHUNK_TICKS = 60 * TICKS_PER_SECOND;

/** Otomatik kayit araligi (ms). */
export const AUTOSAVE_INTERVAL_MS = 15_000;

/**
 * Kaynak turu basina baslangic depo kapasitesi.
 *
 * Sprint 11'de 500'du ve 20 dakikalik oyunda hicbir kaynak ona
 * yaklasmadi bile (olculen en yuksek deger 307) - yani Ambar hicbir
 * problemi cozmuyordu. 300, baslangic kaynaklarinin en buyugunun
 * (220 odun) hala uzerinde, yani acilista hicbir sey kirpilmaz; ama
 * uretim kurulunca depo gercek bir kisit haline gelir.
 */
export const BASE_STORAGE_CAPACITY = 300;

/** Sehir merkezi olmadan bile var olan taban nufus kapasitesi. */
export const BASE_POPULATION_CAPACITY = 0;

/**
 * Her VATANDAS icin dakikada tuketilen yiyecek.
 *
 * Sprint 3'e kadar bu gider calisan isci basinaydi. Nufus gercek bir kaynak
 * oldugundan beri issiz vatandas da yer: sehri buyutmek bedava degildir.
 */
export const FOOD_UPKEEP_PER_CITIZEN = 0.4;

/**
 * Yiyecek fazlasi varken dakikada gelen yeni vatandas sayisi.
 * Bos kapasite bundan azsa yalnizca bos kapasite kadar buyume olur.
 */
export const POPULATION_GROWTH_PER_MINUTE = 2;

/**
 * Yiyecek bittiginde dakikada kaybedilen vatandas sayisi.
 * Buyumeden yavastir: bir aclik kazasi sehri anda silmez, ama uzun aclik
 * nufusu eritir. Bina veya seviye KAYBI asla olmaz.
 */
export const POPULATION_DECLINE_PER_MINUTE = 1;

/**
 * Buyumenin baslamasi icin depoda bulunmasi gereken en az yiyecek.
 * Sifir esigi, deponun sifirda titredigi anda buyume/azalma salinimina yol
 * acardi; kucuk bir tampon bunu engeller.
 */
export const POPULATION_GROWTH_FOOD_THRESHOLD = 1;

/**
 * Iscinin bir tikte yurudugu dunya birimi.
 *
 * Sprint 8'de yolculuk SABIT dort tikti: haritanin obur ucundaki ocak da,
 * bitisikteki ciftlik de ayni suruyordu. Artik sure gercek mesafeden
 * turuyor (bkz. WorkerAnchor.travelTicksFor), yani iki kat uzaga giden
 * isci kabaca iki kat uzun yuruyor.
 *
 * Olcek: komsu iki karo merkezi arasi ~71 birim, haritanin bir ucundan
 * digerine ~900 birim. 60 birim/tik ile yakin bir bina 1-2 tik, en uzak
 * kose 15 tik sürer.
 */
export const WORKER_SPEED = 60;

/**
 * Ayni anda islenebilecek azami insaat/yukseltme gorevi.
 * Slotlar doluyken gelen gorevler kuyruga alinir ve slot bosaldikca
 * FIFO sirasiyla devreye girer.
 */
export const MAX_CONCURRENT_CONSTRUCTIONS = 3;

/**
 * Gorev iptalinde geri verilen maliyet orani.
 * Kuyruktaki gorev hic baslamadigi icin tam iade edilir; aktif gorev,
 * yikimdaki (%50) orani izler.
 */
export const CANCEL_REFUND_RATE: Record<'queued' | 'active', number> = {
  queued: 1,
  active: 0.5,
};

/** Cevrimdisi ilerlemenin ust siniri (saniye) - 8 saat. */
export const MAX_OFFLINE_SECONDS = 8 * 60 * 60;

/** Kamera yakinlastirma sinirlari. */
export const MIN_ZOOM = 0.3;
export const MAX_ZOOM = 1.6;

/**
 * Arayuzun ekranin UST ve ALT kenarindan kapladigi mantiksal yukseklik.
 *
 * Sehir kamerasi kadraji bu iki degerden turer: harita, arayuzun ARTAKALAN
 * bandinda ortalanir. Ikisi de arayuzun kendi yerlesiminde de kullanilir,
 * boylece "kamera nereye ortaliyor" ile "arayuz nereyi kapatiyor" tek
 * kaynaktan gelir ve birbirinden kayamaz.
 */
export const TOP_UI_BAND = 112;
export const BOTTOM_UI_BAND = 168;

/**
 * Acilista ekrana sigmasi hedeflenen karo sayisi (yatay).
 * Baslangic zoom'u ekran genisligine gore bundan hesaplanir; boylece dar bir
 * telefonda da genis bir tablette de benzer bir kadraj olusur.
 */
export const INITIAL_VISIBLE_TILES = 5;

/**
 * Suruklemenin dokunma degil kaydirma sayilmasi icin gereken piksel esigi.
 *
 * 12px Android'in kendi dokunma toleransinin (8dp) altindaydi ve parmak
 * dogal titremesiyle asiliyordu: olculdu, 13px kayma binayi kurmuyordu.
 * Platform normuna cekildi; harita kaydirma bu farkla gozle gorulur sekilde
 * gecikmez, ama dokunmalar cok daha bagislayici olur.
 */
export const DRAG_THRESHOLD_PX = 20;

/**
 * Kayit dosyasi surumu.
 * v1: defId + complete + remainingBuildTime (saniye)
 * v2: type + state + level + assignedWorkers + construction (tik) + tick
 * v3: construction.kind ('build' | 'upgrade'); accumulatedProduction kaldirildi
 *
 * NOT: Kuyruk alanlari (status, durationTicks, sequence) ve nufus alani
 * (population) v3 icine geriye donuk uyumlu eklendi - eksik olduklarinda
 * kayittan turetilebildikleri icin surum artirmaya gerek yoktur. Nufusu
 * olmayan bir kayit, o kayittaki isci ihtiyaci ve kapasiteden turetilir;
 * boylece eski sehir yuklendiginde is gucunu kaybetmez.
 */
export const SAVE_VERSION = 3;

/** Yuklenebilen en eski kayit surumu; arasi goc ile yukseltilir. */
export const MIN_SUPPORTED_SAVE_VERSION = 1;

/** localStorage anahtari. */
export const SAVE_KEY = 'ancient-city:save:v1';

/** Sahne kimlikleri - string literal kullanimini tek noktada toplar. */
export const SceneKeys = {
  Boot: 'BootScene',
  Preload: 'PreloadScene',
  City: 'CityScene',
  UI: 'UIScene',
} as const;

/** Prosedurel olarak uretilen doku anahtarlari. */
export const TextureKeys = {
  TileGrass: 'tile-grass',
  TileSoil: 'tile-soil',
  TileWater: 'tile-water',
  TileRock: 'tile-rock',
  TileStreet: 'tile-street',
  TilePlaza: 'tile-plaza',
  TileHighlight: 'tile-highlight',
  TileValid: 'tile-valid',
  TileInvalid: 'tile-invalid',
  TileLocked: 'tile-locked',
  Panel: 'ui-panel',
  Pixel: 'ui-pixel',
  ButtonUp: 'ui-button-up',
  RoundUp: 'ui-round-up',
  RoundDown: 'ui-round-down',
  ButtonDown: 'ui-button-down',
  PlotMarker: 'plot-marker',
  WorkerIdle: 'worker-idle',
  WorkerMoving: 'worker-moving',
  WorkerWorking: 'worker-working',
} as const;

/** Kaynak turlerinin sabit sirasi - arayuzde tutarli siralama saglar. */
export const RESOURCE_ORDER = ['food', 'wood', 'stone', 'gold', 'knowledge'] as const;

/** Kaynaklarin kullaniciya gosterilen adlari ve renkleri. */
export const RESOURCE_META = {
  food: { label: 'Yiyecek', color: 0x8fbf5a, icon: 'F' },
  wood: { label: 'Odun', color: 0xa9743f, icon: 'O' },
  stone: { label: 'Tas', color: 0x9aa3ab, icon: 'T' },
  gold: { label: 'Altin', color: 0xe8c86a, icon: 'A' },
  knowledge: { label: 'Bilgi', color: 0x7fb0d8, icon: 'B' },
} as const;
