/**
 * Oyun genelinde paylasilan tip tanimlari.
 * Bu dosya sadece tip icerir; calisma zamani kodu barindirmaz.
 */

/** Depolanabilir kaynak turleri. */
/**
 * Kaynak turleri.
 *
 * Sprint 15'te 'knowledge' (Bilgi) eklendi: Akademi uretir, arastirma
 * harcar. Depo tavanina digerleriyle ayni kurallarla tabidir; ayri bir
 * kaynak sinifi yaratmak ekonominin tek gecerli kuralini ikiye bolerdi.
 */
export type ResourceKey = 'food' | 'wood' | 'stone' | 'gold' | 'knowledge';

/** Kaynak miktarlarinin kismi haritasi (uretim, maliyet vb. icin). */
export type ResourceAmounts = Partial<Record<ResourceKey, number>>;

/** Tum kaynaklarin zorunlu haritasi (depo durumu icin). */
export type ResourcePool = Record<ResourceKey, number>;

/** Harita uzerindeki zemin turleri. */
export type TerrainType = 'grass' | 'soil' | 'water' | 'rock';

/** Bina kategorileri; insa menusunde gruplama icin kullanilir. */
/**
 * Insa menusundeki sekmeler.
 *
 * Sprint 14'te 'civic' | 'production' | 'storage' yerine geldi: eski
 * ayrim menude bir sekme olarak ise yaramiyordu (Sehir Merkezi ile Ev ayni
 * sekmedeydi). Yeni ayrim oyuncunun sordugu soruyu izler: nerede
 * yasayacaklar, ne uretecekler, neyi satacaklar, sehrin ANITI ne.
 */
export type BuildingCategory = 'housing' | 'production' | 'commerce' | 'special';

/** Katalogdaki bina kimlikleri. */
export type BuildingId =
  | 'town_hall'
  | 'temple'
  | 'harbor'
  | 'academy'
  | 'house'
  | 'farm'
  | 'lumber_camp'
  | 'quarry'
  | 'market'
  | 'warehouse';

/** Izometrik izgara koordinati. */
export interface GridPoint {
  gx: number;
  gy: number;
}

/** Ekran (dunya) koordinati. */
export interface WorldPoint {
  x: number;
  y: number;
}

/**
 * Bir bina turunun tek bir seviyesindeki degerleri.
 *
 * Seviye 1 insa maliyetini/suresini tasir; 2 ve sonrasi yukseltme
 * maliyetini/suresini tasir. Bir alan tanimsizsa o seviyede o ozellik yoktur
 * (ornegin ev uretim yapmaz), miras alinmaz.
 */
export interface BuildingLevel {
  /** 1'den baslayan seviye numarasi. */
  level: number;
  /** Sifirdan insa maliyeti (yalnizca seviye 1). */
  buildCost?: ResourceAmounts;
  /** Sifirdan insa suresi, saniye (yalnizca seviye 1). */
  buildTime?: number;
  /** Bir onceki seviyeden bu seviyeye cikma maliyeti (seviye 2+). */
  upgradeCost?: ResourceAmounts;
  /** Yukseltme suresi, saniye (seviye 2+). */
  upgradeTime?: number;
  /** Bu seviyede dakikada uretilen kaynaklar. */
  production?: ResourceAmounts;
  /** Bu seviyede saglanan ek depo kapasitesi. */
  storageCapacity?: number;
  /** Bu seviyede calismak icin gereken isci sayisi. */
  workerRequirement?: number;
  /** Bu seviyede saglanan nufus kapasitesi. */
  populationCapacity?: number;
}

/**
 * Bir bina turunun statik tanimi.
 * Seviyeye gore degisen her sey levels[] icindedir; buradaki alanlar
 * seviyeden bagimsizdir.
 */
export interface BuildingDefinition {
  id: BuildingId;
  /** Kullaniciya gosterilen ad. */
  name: string;
  /** Insa menusunde gosterilen kisa aciklama. */
  description: string;
  category: BuildingCategory;
  /** Izgara uzerinde kapladigi alan (kare). */
  size: number;
  /** Ayni anda kurulabilecek azami adet (tanimsiz ise sinirsiz). */
  maxCount?: number;
  /** Uzerine kurulabilecegi zemin turleri. */
  allowedTerrain: TerrainType[];
  /**
   * Yalnizca SUYA KOMSU bir karoya kurulabilir mi?
   *
   * Liman icin gerekli: gemi baglanacak bir kiyi olmadan liman olmaz.
   * Kural zemin turunden ayridir - liman karanin uzerinde durur, ama
   * dort komsusundan biri su olmalidir.
   */
  requiresWaterAdjacent?: boolean;
  /** Prosedurel doku uretimi icin ana renk. */
  tint: number;
  /** Seviye tablosu; en az bir kayit icerir ve seviyeye gore siralidir. */
  levels: BuildingLevel[];
}

/**
 * Bir binanin yasam dongusundeki durumu.
 *
 * constructing - insaat suruyor, uretim yok
 * active       - calisiyor
 * disabled     - oyuncu tarafindan kapatilmis (henuz arayuzden erisilemiyor)
 * damaged      - hasarli, uretim yok (henuz uretilmiyor)
 */
export type BuildingState = 'constructing' | 'active' | 'disabled' | 'damaged';

/**
 * Bir iscinin durumu.
 *
 *   idle    bosta, meydanda bekliyor
 *   moving  yurüyor - hedefi ya bir bina ya da meydandir
 *   working binada calisiyor - URETIME ancak bu durumda katkida bulunur
 *
 * YURUYUSUN YONU DURUMDA DEGIL, HEDEFTE SAKLI
 * `moving` iki sey anlatir: ise gidiyor (buildingUid dolu) veya eve
 * donuyor (buildingUid null). Ayri bir 'returning' durumu eklemek gorsel
 * katmana dorduncu bir doku ve kayda yeni bir deger sokardi; oysa donen
 * isci de yalnizca yuruyen bir iscidir.
 */
export type WorkerState = 'idle' | 'moving' | 'working';

/**
 * Tek bir isci.
 *
 * Isciler Sprint 8'e kadar yalnizca SAYIydi; bina basina bir tam sayi
 * tutuluyordu ve dagitim her tik otomatik yapiliyordu. Artik her isci
 * kendi kimligi, isi ve yolculuk durumu olan bir kayittir - boylece
 * oyuncu kimin nerede calistigini yonetebilir.
 */
export interface WorkerRecord {
  id: string;
  /** Atandigi binanin uid'i; bosta veya donerken null. */
  buildingUid: string | null;
  state: WorkerState;
  /**
   * Binadaki durus yeri (0..kapasite-1); atanmamissa -1.
   *
   * Ayni binada calisan isciler ayni pikselde ust uste binmesin diye her
   * birine sabit bir yer verilir. Yer, iscinin KIMLIGINDEN degil
   * ATAMASINDAN gelir: bir arkadasi ayrilinca kalanlar yerinde durur.
   */
  slot: number;
  /** Icinde bulundugu yuruyus bacaginin baslangici (dunya koordinati). */
  fromX: number;
  fromY: number;
  /** Bacagin hedefi. Yurumuyorsa iscinin bulundugu nokta. */
  toX: number;
  toY: number;
  /**
   * Bacagin toplam suresi (tik) ve kalan suresi.
   *
   * Sure MESAFEDEN turer: iki kat uzaga giden isci kabaca iki kat uzun
   * yurur. Ikisi de TAM SAYI oldugu icin 10 tiki tek seferde islemekle 10
   * kez tek tik islemek birebir ayni varis anini verir - kesirli bir
   * ilerleme orani bu garantiyi veremezdi.
   */
  travelTicks: number;
  travelLeft: number;
}

/** Bir insaat gorevinin turu. */
export type ConstructionKind = 'build' | 'upgrade';

/**
 * Gorevin kuyruktaki durumu.
 * queued - slot bekliyor; zaman islemez, uretim etkilemez, olay yayinlamaz.
 * active - suresi isliyor; completesAtTick geldiginde tamamlanir.
 */
export type ConstructionStatus = 'queued' | 'active';

/**
 * Devam eden bir insaat gorevinin tik cinsinden zamanlamasi.
 *
 * Gorev, hedef binanin kendi icinde saklanir: bir bina ayni anda en fazla bir
 * gorev tasiyabilir, dolayisiyla ayri bir gorev kimligine gerek yoktur ve
 * "sahipsiz gorev" ya da "ayni hedefe iki gorev" durumlari yapisal olarak
 * imkansizdir.
 */
export interface BuildingConstruction {
  kind: ConstructionKind;
  status: ConstructionStatus;
  /** Gorevin toplam suresi (tik). Kuyruktayken de bilinir. */
  durationTicks: number;
  /**
   * Kuyruk sirasi. Ayni tikte kuyruga giren gorevleri de kesin olarak
   * siralar; FIFO davranisinin deterministik olmasini bu saglar.
   */
  sequence: number;
  /**
   * Gorev olusturulurken GERCEKTEN odenen maliyet.
   *
   * Iade bu degerden hesaplanir, guncel katalog fiyatindan degil. Katalog
   * dengesi sonradan degisse bile oyuncu odedigi kadarini geri alir.
   * Degistirilmemesi gereken bir anlik goruntudur.
   */
  paidCost: ResourceAmounts;
  /**
   * Gorevin basladigi simulasyon tiki.
   * Kuyruktayken null - baslangic ancak aktiflesirken hesaplanir.
   */
  startedAtTick: number | null;
  /** Gorevin bitecegi simulasyon tiki. Kuyruktayken null. */
  completesAtTick: number | null;
}

/**
 * Aktif bir insaat gorevinin, hedefiyle birlikte okunabilir hali.
 * ConstructionSystem bunu olaylarda ve sorgularda dondurur.
 */
export interface ConstructionTask extends BuildingConstruction {
  /** Gorevin uygulandigi bina. Gorevin kimligi de budur. */
  targetUid: string;
}

/** Yerlestirilmis bir binanin calisma zamani durumu. */
export interface BuildingInstance {
  /** Benzersiz ornek kimligi. */
  uid: string;
  /** Katalogdaki bina turu. */
  type: BuildingId;
  gx: number;
  gy: number;
  /** 1'den baslayan gecerli seviye. */
  level: number;
  state: BuildingState;
  /** Bu binaya atanmis isci sayisi. Negatif olamaz. */
  assignedWorkers: number;
  /**
   * Devam eden insaat veya yukseltme gorevi.
   * kind === 'build'   -> state 'constructing', bina henuz calismiyor.
   * kind === 'upgrade'  -> state 'active', bina mevcut seviyesinde calismaya
   *                        devam eder; seviye ancak gorev bitince artar.
   */
  construction?: BuildingConstruction;
}

/**
 * Bir bina ornegi ile tanimindan hesaplanmis, kullanima hazir degerler.
 * Uretim, kapasite ve maliyet hesabinin TEK kaynagi budur; hicbir sistem
 * bu degerleri kendi basina yeniden hesaplamaz.
 */
export interface ResolvedBuilding {
  uid: string;
  type: BuildingId;
  name: string;
  size: number;
  level: number;
  /** Katalogda tanimli en yuksek seviye. */
  maxLevel: number;
  state: BuildingState;
  /** Insaati bitmis ve calisir durumda mi? */
  operational: boolean;
  /**
   * Bu seviyedeki TAM uretim (kadro dolu varsayimiyla); calismiyorsa bostur.
   * Arayuzde binanin potansiyelini gostermek icin kullanilir.
   */
  production: ResourceAmounts;
  /**
   * Kadro doluluguyla olceklenmis GERCEK uretim.
   * Ekonomi bunu toplar; production degil.
   */
  effectiveProduction: ResourceAmounts;
  /** Sagladigi depo kapasitesi; calismiyorsa 0. */
  storageCapacity: number;
  /** Sagladigi nufus kapasitesi; calismiyorsa 0. */
  populationCapacity: number;
  /** Bu seviyede gereken isci sayisi. */
  workerRequirement: number;
  assignedWorkers: number;
  /**
   * Kadro doluluk orani (0..1): assignedWorkers / workerRequirement.
   * Isci istemeyen bina icin her zaman 1.
   * Sprint 3'ten beri uretim DOGRUDAN bununla carpilir.
   */
  staffing: number;
  /** Isci ihtiyaci tam karsilaniyor mu? (staffing >= 1) */
  staffed: boolean;
  /** Yikildiginda geri verilecek kaynaklar. */
  refund: ResourceAmounts;
  /** Devam eden gorev varsa ilerleme bilgisi, yoksa null. */
  construction: ConstructionProgress | null;
  /**
   * Bir sonraki seviyeye gecis secenegi.
   * Son seviyede veya devam eden bir gorev varken null olur.
   */
  upgrade: UpgradeOption | null;
}

/** Devam eden gorevin ilerlemesi. */
export interface ConstructionProgress {
  kind: ConstructionKind;
  status: ConstructionStatus;
  remainingTicks: number;
  totalTicks: number;
  /** 0..1 arasi tamamlanma orani. Kuyruktaki gorev icin 0. */
  ratio: number;
}

/** Bir sonraki seviyeye gecis secenegi. */
export interface UpgradeOption {
  toLevel: number;
  cost: ResourceAmounts;
  timeTicks: number;
}

/** Henuz kurulmamis bir bina turunun insa onizlemesi (insa menusu icin). */
export interface BuildPreview {
  type: BuildingId;
  name: string;
  description: string;
  size: number;
  cost: ResourceAmounts;
  buildTimeTicks: number;
  production: ResourceAmounts;
  workerRequirement: number;
  populationCapacity: number;
  storageCapacity: number;
}

/**
 * Sehir yerlesimindeki bolgeler.
 *
 * Merkezden disari dogru: sivil cekirdek, ticaret, konut, uretim. Bolge
 * yalnizca plotun HANGI binalari kabul ettigini belirler; oyun kurali
 * tasimaz.
 */
export type PlotZone = 'civic' | 'commerce' | 'residential' | 'production';

/**
 * Sehirdeki bir yapi alani.
 *
 * DOLULUK BURADA TUTULMAZ. Plotun dolu olup olmadigi GridMap'teki
 * occupantUid'den okunur; ikinci bir doluluk kaydi iki gercek yaratirdi.
 * Bu yuzden kayda da yazilmaz: yerlesim zeminden, zemin seed'den turer.
 */
export interface BuildingPlot {
  id: string;
  gx: number;
  gy: number;
  width: number;
  height: number;
  zone: PlotZone;
  /** Bu alanin kabul ettigi bina turleri; zemine gore suzulmustur. */
  allowedTypes: BuildingId[];
  /** Su an tum plotlar aciktir; kilit mekanigi ileriki bir sprintin isi. */
  unlocked: boolean;
}

/** Sehir cevresine konan dekor cesitleri. Hepsi yalnizca gorseldir. */
export type DecorKind = 'tree' | 'bush' | 'rock' | 'amphora' | 'logs' | 'column' | 'reed';

/**
 * Tek bir dekor ogesi.
 *
 * OYUN DURUMU DEGILDIR: kayda yazilmaz, izgara dolulugunu degistirmez ve
 * navigasyonu etkilemez. Yerlesim seed'den turedigi icin her acilista ayni
 * uretilir.
 */
export interface DecorItem {
  gx: number;
  gy: number;
  kind: DecorKind;
  /** Karonun kendi eksenlerinde kaydirma (-1..1); karo merkezi bos kalir. */
  offsetU: number;
  offsetV: number;
}

/** Arastirma kimlikleri. */
export type ResearchId =
  | 'advanced_farming'
  | 'stonecutting'
  | 'forestry'
  | 'trade_routes'
  | 'guild_order';

/**
 * Bir arastirmanin sehre etkisi.
 *
 * TEK MEKANIK: carpanlar. Arastirma yeni bir kural getirmez, var olan
 * uretim ve kadro sayilarini olcekler. Boylece etki her yerde ayni yoldan
 * (BuildingResolver) uygulanir ve arayuz de dogru sayiyi gosterir.
 */
export interface ResearchEffect {
  /** Kaynak basina uretim carpani (1.3 = +%30). */
  productionMultiplier?: Partial<Record<ResourceKey, number>>;
  /** Isci isteyen her binanin kadro kapasitesine eklenen slot. */
  workerSlotBonus?: number;
}

/** Arastirma tanimi (statik veri). */
export interface ResearchDefinition {
  id: ResearchId;
  name: string;
  description: string;
  /** Baslatma maliyeti; altin ve bilgi ister. */
  cost: ResourceAmounts;
  /** Tamamlanma suresi, saniye. */
  duration: number;
  /** Baslayabilmek icin gereken Akademi seviyesi. */
  requiredAcademyLevel: number;
  effect: ResearchEffect;
}

/** Devam eden arastirma. */
export interface ActiveResearch {
  id: ResearchId;
  startedAtTick: number;
  completesAtTick: number;
}

/**
 * Sehir capinda gecerli carpanlar.
 *
 * Arastirmalardan TURETILIR; kendi basina bir durum degildir. Tamamlanan
 * arastirma listesi tek gercektir, carpanlar ondan hesaplanir.
 */
export interface CityModifiers {
  production: Partial<Record<ResourceKey, number>>;
  workerSlotBonus: number;
}

/** Tek bir izgara hucresinin durumu. */
export interface TileData {
  gx: number;
  gy: number;
  terrain: TerrainType;
  /** Hucreyi kaplayan binanin uid degeri; bossa null. */
  occupantUid: string | null;
}

/** localStorage'a yazilan kayit yapisi. */
export interface SaveData {
  version: number;
  /** Gercek dunya zaman damgasi; yalnizca bilgi amaclidir. */
  savedAt: number;
  /** Kaydin alindigi simulasyon tiki - oyun zamaninin kaynagi budur. */
  tick: number;
  resources: ResourcePool;
  buildings: BuildingInstance[];
  workers: WorkerRecord[];
  terrainSeed: number;
  /**
   * Sehrin izgara boyutu.
   *
   * Sprint 14'te eklendi ve geriye donuk UYUMLUDUR: alan yoksa kayit
   * Sprint 13 doneminden gelmistir ve LEGACY_GRID_SIZE kullanilir. Bu
   * yuzden kayit surumu artirilmadi.
   */
  gridSize?: number;
  /**
   * Arastirma durumu.
   *
   * Sprint 15'te eklendi ve geriye donuk UYUMLUDUR: alan yoksa hicbir
   * arastirma yapilmamistir. Bu yuzden kayit surumu artirilmadi.
   */
  research?: {
    completed: string[];
    active: { id: string; startedAtTick: number; completesAtTick: number } | null;
  };
  /**
   * Sehirdeki vatandas sayisi.
   * v3 icine geriye donuk uyumlu eklendi: eksikse eski kaydin isci ihtiyaci
   * ve nufus kapasitesinden turetilir, bu yuzden surum artirilmadi.
   */
  population: number;
}

/** Uretim sisteminin her tick sonunda yayinladigi ozet. */
export interface EconomySnapshot {
  /** Dakika basina net uretim. */
  netPerMinute: ResourcePool;
  /** Sehirde yasayan toplam vatandas sayisi (calisan + issiz). */
  population: number;
  /** Bir binada gorevlendirilmis vatandas sayisi. */
  populationUsed: number;
  /** Binalarin sagladigi toplam nufus kapasitesi. */
  populationCapacity: number;
  /** Tum binalarin toplam isci ihtiyaci. */
  workersNeeded: number;
  storageCapacity: number;
  /** Isci yetersizliginden dogan ortalama kadro doluluğu (0..1). */
  efficiency: number;
  /** Nufusun bu tikteki yonu; arayuz bunu gosterir. */
  growth: PopulationTrend;
}

/** Is gucunun anlik ozeti; arayuz bunu gosterir. */
export interface WorkforceSnapshot {
  /** Toplam isci sayisi (nufusa esittir). */
  total: number;
  /** Hicbir binaya atanmamis isci sayisi. */
  idle: number;
  /** Yolda olan isci sayisi. */
  moving: number;
  /** Binasinda calisan isci sayisi - uretime katkida bulunanlar. */
  working: number;
}

/** Nufusun gidisati. */
export type PopulationTrend = 'growing' | 'stable' | 'declining';

/** PopulationSystem'in her ilerlemede urettigi ozet. */
export interface PopulationSnapshot {
  population: number;
  capacity: number;
  workersNeeded: number;
  /** Bir binaya atanmis vatandas sayisi. */
  employed: number;
  trend: PopulationTrend;
}
