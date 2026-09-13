import type { LuxuryKind, MaterialKey, ResourcePool } from '@/types';

/**
 * Ikariam'in denge sabitleri.
 *
 * Buradaki sayilarIN COGU Ikariam'in kendi sayilaridir ve wiki
 * kaynaklarindan alinmistir. Degistirirken "Ikariam gibi olsun" kurali
 * gecerlidir: bir sayiyi buradan degistirmek Ikariam'dan uzaklastirir.
 */

// =========================================================================
// ZAMAN
// =========================================================================

/** Simulasyonun saniyedeki tik sayisi (gercek zaman). */
export const TICKS_PER_SECOND = 1;

/** Bir tikin gercek zamanda karsiligi (ms). */
export const MS_PER_TICK = 1000 / TICKS_PER_SECOND;

/**
 * Zaman olcegi: bir gercek saniyede kac OYUN saniyesi gecer.
 *
 * Ikariam gercek zamanli bir oyundur ve insaatlar saatler surer. Mobilde
 * bu oynanamaz, bu yuzden saat hizlandirilir. ONEMLI: tum denge sayilari
 * OYUN zamaninda tanimlidir (saat basina uretim, oyun saniyesi insaat),
 * dolayisiyla bu degeri degistirmek dengeyi DEGISTIRMEZ.
 */
export const DEFAULT_TIME_SCALE = 60;

/** Arayuzdeki hiz dugmesinin secenekleri. */
export const TIME_SCALE_OPTIONS = [1, 10, 60, 300] as const;

/** Bir oyunda izin verilen en yuksek hiz. */
export const MAX_TIME_SCALE = 300;

/** Bir oyunda izin verilen en dusuk hiz. */
export const MIN_TIME_SCALE = 1;

/** Cevrimdisi ilerlemenin ust siniri (gercek saniye) - 8 saat. */
export const MAX_OFFLINE_SECONDS = 8 * 60 * 60;

/** Cevrimdisi telafi tek seferde en fazla bu kadar tik islenir. */
export const OFFLINE_CHUNK_TICKS = 30;

/** Bir oyun saatinde kac oyun saniyesi var (sabit, degismez). */
export const GAME_SECONDS_PER_HOUR = 3600;

// =========================================================================
// VATANDASLAR
// =========================================================================

/** Bos (idle) vatandas basina saatlik altin geliri. Ikariam: 3. */
export const GOLD_PER_IDLE_CITIZEN = 3;

/**
 * Bilim adami basina saatlik altin GIDERI. Ikariam: -9.
 *
 * Bu sayi iki parcadan olusur: bos duran bir vatandasin getirecegi 3
 * altinin kaybi (firsat maliyeti) + bilim adaminin kendi 6 altin ucreti.
 * Ikisi ayri tutulmaz cunku oyuncu arayuzde tek bir "-9" gorur.
 */
export const GOLD_PER_SCIENTIST = 9;

/**
 * Bilim adaminin DOGRUDAN saatlik altin gideri.
 *
 * Wiki'nin -9 sayisi iki parcadan olusur: -3 (bos duran vatandasin
 * getirisinin kaybi) ve -6 (bilim adaminin kendi ucreti). Ekonomi
 * formulu vatandaslari ROL bazinda topladigi icin burada yalnizca -6
 * kullanilir; -3 zaten "idle degil" olmaktan dogar. Ikisini birden
 * dusmek bilim adamini iki kez vergilendirmek olurdu.
 */
export const SCIENTIST_GOLD_DIRECT = 6;

/** Bilim adami basina saatlik arastirma puani. Ikariam: 1. */
export const RESEARCH_POINTS_PER_SCIENTIST = 1;

/**
 * Yatagin isci kapasitesi carpanlari.
 *
 * Ikariam olcusunden uyduruldu:
 *   Hizar seviye 21 -> 450 isci -> 450 odun/saat   (21^2 * 1.02 = 450)
 *   Maden  seviye 16 -> 200 isci -> 200 luks/saat  (16^2 * 0.78 = 200)
 *
 * Yani kapasite seviyenin KARESIyle buyur; luks kaynak odunun ~%76'si
 * kadar kapasite verir. Bu fark Ikariam'in temel gerilimini kurar: luks
 * kaynak her zaman odun kadar bol olmaz.
 */
export const SAWMILL_CAPACITY_FACTOR = 1.02;
export const LUXURY_CAPACITY_FACTOR = 0.78;

/**
 * Yardimci Eller (Helping Hands) asiri yukleme orani.
 *
 * Kapasitenin ustundeki her 4 odun iscisi saatte 1 odun, her 8 luks
 * iscisi saatte 1 luks uretir. Ikariam'in kendi orani.
 */
export const OVERLOAD_WOOD_WORKERS_PER_UNIT = 4;
export const OVERLOAD_LUXURY_WORKERS_PER_UNIT = 8;

/** Uretim binasi (Ormanci Evi vb.) seviye basina uretim bonusu. */
export const PRODUCTION_BUILDING_BONUS_PER_LEVEL = 0.02;

/** Indirim binasi (Marangoz vb.) seviye basina maliyet indirimi. */
export const REDUCTION_BUILDING_BONUS_PER_LEVEL = 0.01;

/** Indirimlerin tabani: toplam indirim bu orani asamaz. */
export const MAX_COST_REDUCTION = 0.6;

/** Nufus artisi: mutluluk fazlasinin bu orani saatlik buyume olur. */
export const GROWTH_RATE_PER_SURPLUS = 0.25;

/** Nufus azalmasi: mutluluk aciginin bu orani saatlik kayip olur. */
export const DECLINE_RATE_PER_DEFICIT = 0.1;

/*
 * Nufusun DUSEBILECEGI EN KUCUK DEGER.
 *
 * Mutluluk sifirsa nufus matematiksel olarak sifira kadar iner; ancak
 * sifir nufus KURTARILAMAZ bir oyundur: vatandas yok -> isci yok ->
 * kaynak yok -> mutluluk duzeltilmez. Oyuncu kendi hatasindan bir daha
 * cikamaz, ki bu Ikariam'da olmayan bir durumdur: orada mutsuz sehrin
 * nufusu kuculur ama oyuncu her zaman meyhaneyi kurup toparlayabilir.
 *
 * 5 vatandas bilerek secildi: bes bos gezen vatandas saatte 15 altin
 * uretir, yani sehir "olmez" ama oyuncu hatasinin bedelini de belirgin
 * sekilde oder.
 */
export const MIN_SURVIVING_CITIZENS = 5;

/** Toptanci'nin (Dump) birim basina verdigi altin. */
export const DUMP_GOLD_PER_UNIT = 2;

/**
 * Insaat iptalinde geri verilen maliyet orani.
 *
 * Ikariam'da insaat IPTAL EDILEMEZ; bu mobil surume bilincli olarak
 * eklenmis bir kolayliktir (bkz. docs/IKARIAM.md "Bilincli farklar").
 *
 * Sifirdan insaat tam iade edilir: bina hic var olmadi, oyuncu yalnizca
 * yanlis alana dokundu. Yukseltme ise yari yariya iade edilir - tam iade,
 * insaati bedava bir "kaynak park yeri"ne cevirirdi: kaynagi harcayip
 * depoda tutmak yerine insaata baglayip istedigin an geri almak.
 */
export const CANCEL_REFUND_RATE: Record<'queued' | 'active', number> = {
  queued: 1,
  active: 0.5,
};

/** Atolye kademe gelistirmesi icin gereken minimum Atolye seviyeleri. */
export const TIER_WORKSHOP_REQUIREMENT: Record<string, number> = {
  bronze: 1,
  silver: 5,
  gold: 10,
};

/** Koloni kurmanin odun maliyeti (Saray seviyesi ile carpilir). */
export const COLONY_WOOD_COST_PER_PALACE_LEVEL = 4_200;

/** Koloni kurmak icin gereken bos yuk gemisi sayisi. Ikariam: 3. */
export const COLONY_CARGO_SHIPS = 3;

/**
 * Akademi seviyesi basina calistirilabilecek bilim adami sayisi.
 *
 * Ikariam'da Akademi seviyesi bilim adami kapasitesini belirler. Bu
 * katsayi 4 secildi: Akademi 16 -> 64 bilim adami -> 64 AP/saat, yani
 * 25.632 AP'lik "Deniz Haritalari" arastirmasi ~400 oyun saati surer.
 * Ikariam'in gercek temposu da budur (gec oyun arastirmalari gunler surer).
 */
export const SCIENTISTS_PER_ACADEMY_LEVEL = 4;

/** Hizar iscisi basina saatlik odun. Ikariam: 1. */
export const WOOD_PER_WORKER_HOUR = 1;

/** Luks kaynak iscisi basina saatlik uretim. Ikariam: 1. */
export const LUXURY_PER_WORKER_HOUR = 1;

/**
 * Maksimum nufus formulu: floor(10 * sqrt(Valilik^3)) * 2 + 40
 *
 * Ikariam'in kendi formulu. Sabitler buraya acildi ki testler formulu
 * degil SAYILARI kilitlesin.
 */
export const MAX_POPULATION_BASE = 40;
export const MAX_POPULATION_COEFF = 10;
export const MAX_POPULATION_MULTIPLIER = 2;

/*
 * Nufus artisi/azalmasi oranlari GROWTH_RATE_PER_SURPLUS ve
 * DECLINE_RATE_PER_DEFICIT olarak asagida, mutluluk sabitlerinin yaninda
 * durur: Ikariam'da nufus hareketi DOGRUDAN mutluluk fazlasindan turer,
 * dolayisiyla ikisini ayri bolumlere koymak iliskiyi gizlerdi.
 */

// =========================================================================
// MUTLULUK
// =========================================================================

/**
 * Meyhanede servis edilen her birim sarap icin mutluluk.
 *
 * Ikariam olcusu: Meyhane 16 -> 63 sarap/saat -> 1472 mutluluk.
 * 1472 / 63 = 23.4.
 */
export const HAPPINESS_PER_WINE = 23.4;

/** Meyhane seviyesi basina saatlik sarap servis kapasitesi (1472/23.4/16). */
export const WINE_PER_TAVERN_LEVEL = 3.94;

/**
 * Muzedeki her kultur mali icin mutluluk.
 *
 * Ikariam olcusu: Muze 8 dolu -> 560 mutluluk, yani mal basina 70.
 */
export const HAPPINESS_PER_CULTURAL_GOOD = 70;

/** Kuyuyu Kazi (Well Digging) arastirmasi: yalnizca baskentte mutluluk. */
export const HAPPINESS_WELL_DIGGING = 50;

/** Tatil (Holiday) arastirmasi: tum sehirlerde mutluluk. */
export const HAPPINESS_HOLIDAY = 25;

/** Utopia arastirmasi: yalnizca baskentte mutluluk. */
export const HAPPINESS_UTOPIA = 200;

/** Ekonomik Gelecek: seviye basina tum sehirlerde mutluluk. */
export const HAPPINESS_ECONOMIC_FUTURE_PER_LEVEL = 10;

/**
 * Yolsuzluk: Vali Konagi/Saray seviyesi koloni sayisinin altindaysa
 * uretim ve mutluluk bu oranda kirpilir. Ikariam'da 0..%92 arasi.
 */
export const CORRUPTION_PER_MISSING_LEVEL = 0.08;
export const MAX_CORRUPTION = 0.92;

// =========================================================================
// DEPO
// =========================================================================

/**
 * Valiligin sagladigi TABAN depo kapasitesi (kaynak turu basina).
 *
 * Ikariam: "Valilik her kaynak turu icin 2500 depo saglar". Bu deger
 * Valilik SEVIYESIYLE BUYUMEZ; kapasiteyi buyuten tek sey Depo
 * binalaridir. Ikariam'da da boyledir - bu yuzden depo tavani, oyuncuyu
 * yeni Depo kurmaya zorlayan gercek bir kisittir.
 */
export const TOWN_HALL_BASE_STORAGE = 2500;

/**
 * Depo binasinin seviye basina ek kapasitesi.
 *
 * Ikariam olcusu: seviye 16 Depo ~35.000 mermer tutar. 35000/16 ~ 2190.
 */
export const STORAGE_PER_WAREHOUSE_LEVEL = 2190;

/** Bir sehirde kurulabilecek azami Depo sayisi. Ikariam: 5. */
export const MAX_WAREHOUSES = 5;

/**
 * Yagmada korunmayan kaynaklarin orani.
 *
 * Athena Parthenon'u "guvenli kaynak" verir; temelde deponun bir kismi
 * yagmaya kapali degildir. Ikariam'da saldiriya ugrayan sehirde depo
 * tavanina kadar olan kaynak yagmalanabilir.
 */
export const LOOT_RATIO_PER_TRANSPORT = 1;

// =========================================================================
// BASLANGIC
// =========================================================================

/*
 * Yeni bir oyunun baslangic kaynaklari.
 *
 * Odun miktari BILEREK depo tavaninin altindadir (TOWN_HALL_BASE_STORAGE).
 * Tavanin uzerinde baslamak iki sorun yaratirdi:
 *   1. Oyuncunun ilk saatlerinde uretim tamamen kirpilir, "oyun
 *      ilerlemiyor" hissi verir
 *   2. "Kaynaklar hicbir zaman tavani asamaz" degismezi bozulur; bu
 *      degismez bozulunca depo yonetimi anlamsizlasir
 * Tavanin hemen altinda baslamak oyuncuyu ilk iste Depo kurmaya iter,
 * ki bu Ikariam'in kendi ogretici akisidir.
 */
export const STARTING_RESOURCES: ResourcePool = {
  wood: 2400,
  marble: 0,
  wine: 0,
  sulfur: 0,
  crystal: 0,
  gold: 2000,
};

/** Baslangic nufus. Ikariam yeni hesapta ~40 vatandasla baslar. */
export const STARTING_CITIZENS = 40;

/** Baslangic yuk gemisi sayisi. Ikariam: 3. */
export const STARTING_CARGO_SHIPS = 3;

/** Baslangic Valilik seviyesi. Ikariam'da Valilik hazir gelir. */
export const STARTING_TOWN_HALL_LEVEL = 1;

/** Baslangic arastirma puani. */
export const STARTING_RESEARCH_POINTS = 0;

/**
 * Oyuncunun baslayacagi adanin luks kaynagi.
 *
 * Baslangic adasi SARAP uretir: Ikariam'in ogreticisi de boyledir, cunku
 * Meyhane sarap ister ve mutluluk olmadan nufus buyumez. Boylece oyuncu
 * ilk dakikalarda Ikariam'in merkez dongusunu (sarap -> mutluluk ->
 * nufus -> isci -> odun) ogrenir.
 */
export const STARTING_ISLAND_LUXURY: LuxuryKind = 'wine';

// =========================================================================
// IZOMETRIK HARITA
// =========================================================================

/** Izometrik karo genisligi (piksel). */
export const TILE_WIDTH = 128;

/** Izometrik karo yuksekligi (piksel). */
export const TILE_HEIGHT = 64;

/**
 * Ada izgarasinin boyutu (ADA_N x ADA_N).
 *
 * Ikariam'in adasi yaklasik 20x20 karoluk bir alana oturur: 16 sehr alani
 * kiyiya, Hizar/luks kaynak/harica iceye yerlesir.
 */
export const ISLAND_GRID_SIZE = 20;

/** Bir adadaki sehr alani sayisi. Ikariam: 16. */
export const ISLAND_PLOT_COUNT = 16;

/** Dunya haritasindaki ada sayisi. */
export const WORLD_ISLAND_COUNT = 12;

/** Dunya haritasinin izgara boyutu (ada x ada). */
export const WORLD_GRID = 4;

/** Sehir gorunumundeki yapi alani halkasi boyutu. */
export const CITY_GRID_SIZE = 14;

/**
 * Valilik seviyesi basina acilan yapi alani sayisi.
 *
 * Ikariam'da Valilik buyudukce yeni yapi alanlari acilir. Taban 8 alan
 * verilir ve her 2 seviyede bir alan eklenir; tavan 20'dir.
 */
export const BASE_GROUND_COUNT = 8;
export const GROUND_PER_TOWN_HALL_LEVEL = 0.6;
export const MAX_GROUND_COUNT = 20;

// =========================================================================
// SAVAS
// =========================================================================

/** Bir kara savasinda oynanacak azami tur. */
export const MAX_LAND_ROUNDS = 20;

/** Bir deniz savasinda oynanacak azami tur. */
export const MAX_SEA_ROUNDS = 20;

/** Sur seviyesi basina savunma bonusu. Ikariam: seviye 24 -> %240. */
export const WALL_DEFENSE_BONUS_PER_LEVEL = 0.1;

/** Savunan tarafin temel savunma carpani (sur olmadan). */
export const BASE_DEFENSE_MULTIPLIER = 1;

/** Ganimet olarak alinabilecek azami kaynak orani (deponun yuzdesi). */
export const MAX_LOOT_RATIO = 0.5;

/** Yagmalanan NPC sehrin toparlanma suresi (oyun saniyesi). */
export const NPC_RECOVERY_GAME_SECONDS = 6 * GAME_SECONDS_PER_HOUR;

/** Filolarin temel hizi: ada basina oyun saniyesi. */
export const FLEET_SECONDS_PER_ISLAND_DISTANCE = 30 * 60;

/** Yuk gemisi basina tasima kapasitesi. */
export const CARGO_SHIP_CAPACITY = 500;

/** Ticaret limani seviyesi basina ek yuk gemisi kapasitesi (yukleme hizi). */
export const LOADING_PER_PORT_LEVEL = 500;

// =========================================================================
// ARAYUZ
// =========================================================================

/** Kamera yakinlastirma sinirlari. */
export const MIN_ZOOM = 0.35;
export const MAX_ZOOM = 1.8;

/** Arayuzun ekranin ust ve alt kenarindan kapladigi mantiksal yukseklik. */
export const TOP_UI_BAND = 104;
export const BOTTOM_UI_BAND = 132;

/** Acilista ekrana sigmasi hedeflenen karo sayisi (yatay). */
export const INITIAL_VISIBLE_TILES = 6;

/** Suruklemenin dokunma sayilmasi icin gereken piksel esigi (Android 8dp+). */
export const DRAG_THRESHOLD_PX = 20;

/** Otomatik kayit araligi (ms). */
export const AUTOSAVE_INTERVAL_MS = 15_000;

// =========================================================================
// KAYIT
// =========================================================================

/**
 * Kayit dosyasi surumu.
 *
 * v1..v3: "Ancient City" donemi (tek sehir, odun/tas/altin/yiyecek).
 * v4: Ikariam donusumu - ada/sehir/dunya modeli, 6 kaynak, arastirma puani,
 *     birlikler, gemiler, filolar, NPC'ler.
 *
 * v4 eski kayitlarla GERIYE DONUK UYUMLU DEGILDIR: veri modeli tamamen
 * degisti (yiyecek/tas kaynaklari kalkti, sehir izgarasi yerini ada
 * plotlarina birakti). Eski kayit sessizce silinir ve yeni oyun baslar;
 * bozuk bir sehri yarim yuklemek oyuncuya anlasilmaz bir durum verirdi.
 */
export const SAVE_VERSION = 4;

/** Yuklenebilen en eski kayit surumu. */
export const MIN_SUPPORTED_SAVE_VERSION = 4;

/** localStorage anahtari. */
export const SAVE_KEY = 'ikariam-mobile:save:v4';

/** Sahne kimlikleri. */
export const SceneKeys = {
  Boot: 'BootScene',
  Preload: 'PreloadScene',
  Island: 'IslandScene',
  City: 'CityScene',
  World: 'WorldScene',
  UI: 'UIScene',
} as const;

/** Prosedurel olarak uretilen doku anahtarlari. */
export const TextureKeys = {
  TileGrass: 'tile-grass',
  TileSand: 'tile-sand',
  TileWater: 'tile-water',
  TileRock: 'tile-rock',
  TilePlaza: 'tile-plaza',
  TileStreet: 'tile-street',
  TileHighlight: 'tile-highlight',
  TileValid: 'tile-valid',
  TileInvalid: 'tile-invalid',
  Panel: 'ui-panel',
  Pixel: 'ui-pixel',
  ButtonUp: 'ui-button-up',
  ButtonDown: 'ui-button-down',
  RoundUp: 'ui-round-up',
  RoundDown: 'ui-round-down',
  PlotMarker: 'plot-marker',
} as const;

/**
 * Kaynaklarin sabit sirasi.
 *
 * Ikariam'in kaynak cubugu bu sirayla gosterir: odun, sonra adanin luks
 * kaynagi, sonra altin. Arayuz tutarliligi icin sabit bir sira tutulur.
 */
export const RESOURCE_ORDER = ['wood', 'marble', 'wine', 'sulfur', 'crystal', 'gold'] as const;

/** Luks kaynaklarin sabit sirasi. */
export const LUXURY_ORDER = ['marble', 'wine', 'sulfur', 'crystal'] as const;

/** Kaynaklarin kullaniciya gosterilen adlari, renkleri ve kisaltmalari. */
export const RESOURCE_META: Record<
  MaterialKey | 'gold',
  { label: string; short: string; color: number; hex: string }
> = {
  wood: { label: 'Odun', short: 'Odun', color: 0x8a5a2b, hex: '#8a5a2b' },
  marble: { label: 'Mermer', short: 'Mermer', color: 0xd8d4c8, hex: '#d8d4c8' },
  wine: { label: 'Şarap', short: 'Şarap', color: 0x8e2f4a, hex: '#8e2f4a' },
  sulfur: { label: 'Kükürt', short: 'Kükürt', color: 0xd8c74a, hex: '#d8c74a' },
  crystal: { label: 'Kristal', short: 'Kristal', color: 0x8fd0e8, hex: '#8fd0e8' },
  gold: { label: 'Altın', short: 'Altın', color: 0xe8c86a, hex: '#e8c86a' },
};

/** Luks kaynaklarin hangi ada binasindan geldigi. */
export const LUXURY_BUILDING: Record<LuxuryKind, string> = {
  marble: 'quarry',
  wine: 'vineyard',
  sulfur: 'sulphur_pit',
  crystal: 'crystal_mine',
};

/** Kaynagin adadaki yatagi icin kullanilan Turkce ad. */
export const DEPOSIT_NAME: Record<MaterialKey, string> = {
  wood: 'Hızar',
  marble: 'Taş Ocağı',
  wine: 'Bağ',
  sulfur: 'Kükürt Çukuru',
  crystal: 'Kristal Madeni',
};

// =========================================================================
// NPC EKONOMISI
// =========================================================================
/*
 * NPC'ler oyuncuyla ayni simulasyonu CALISTIRMAZ.
 *
 * Ikariam'in gercek AI'i her NPC icin tam bir sehir simulasyonu isletir;
 * bu, yuzlerce NPC olan bir dunyada ciddi bir CPU maliyetidir. Burada
 * NPC'ler oyuncuya RAKIP degil, HEDEF oldugu icin basitlestirilmis bir
 * birikim modeli kullanilir: saat basina guc seviyesiyle orantili kaynak
 * uretirler ve belli aralikla bir bina seviyesi kazanirlar.
 *
 * Bu model oyuncuya karsi iki sey saglar:
 *   1. Yagmalanan NPC zamanla tekrar dolar -> tekrar saldirma anlami olur
 *   2. Uzak adalardaki NPC'ler guclenir -> ilerledikce zorluk artar
 */

/** NPC'nin guc seviyesi basina saatlik kaynak uretimi. */
export const NPC_PRODUCTION_PER_POWER_HOUR = 14;

/** NPC'nin kaynak basina depo tavani: guc seviyesinin karesiyle buyur. */
export const NPC_STORAGE_PER_POWER = 900;

/** NPC'nin kendini gelistirme denemesi araligi (oyun saati). */
export const NPC_GROWTH_INTERVAL_HOURS = 12;

/** NPC gelistirmesi icin harcanan toplam kaynak. */
export const NPC_GROWTH_COST = 1_200;

/** Ticarette NPC'nin kaynak basina odedigi/istedigi altin (birim basina). */
export const NPC_TRADE_GOLD_PER_UNIT = 3;

/** Ticarette NPC kar marji: alista odedigi, satista istedigi oran. */
export const NPC_TRADE_MARGIN = 1.35;
