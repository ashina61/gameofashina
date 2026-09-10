/**
 * Oyun genelinde paylasilan tip tanimlari.
 * Bu dosya sadece tip icerir; calisma zamani kodu barindirmaz.
 */

/** Depolanabilir kaynak turleri. */
export type ResourceKey = 'food' | 'wood' | 'stone' | 'gold';

/** Kaynak miktarlarinin kismi haritasi (uretim, maliyet vb. icin). */
export type ResourceAmounts = Partial<Record<ResourceKey, number>>;

/** Tum kaynaklarin zorunlu haritasi (depo durumu icin). */
export type ResourcePool = Record<ResourceKey, number>;

/** Harita uzerindeki zemin turleri. */
export type TerrainType = 'grass' | 'soil' | 'water' | 'rock';

/** Bina kategorileri; insa menusunde gruplama icin kullanilir. */
export type BuildingCategory = 'civic' | 'production' | 'storage';

/** Katalogdaki bina kimlikleri. */
export type BuildingId =
  | 'town_hall'
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

/** Bir insaat gorevinin turu. */
export type ConstructionKind = 'build' | 'upgrade';

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
  /** Gorevin basladigi simulasyon tiki. */
  startedAtTick: number;
  /** Gorevin bitecegi simulasyon tiki. */
  completesAtTick: number;
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
  /** Dakikada uretim; calismiyorsa bostur. */
  production: ResourceAmounts;
  /** Sagladigi depo kapasitesi; calismiyorsa 0. */
  storageCapacity: number;
  /** Sagladigi nufus kapasitesi; calismiyorsa 0. */
  populationCapacity: number;
  /** Bu seviyede gereken isci sayisi. */
  workerRequirement: number;
  assignedWorkers: number;
  /**
   * Isci ihtiyaci karsilaniyor mu?
   * Bilgilendirme amaclidir; bu sprintte uretimi etkilemez (isci dagitimi
   * hala kuresel havuz uzerinden yapiliyor).
   */
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
  remainingTicks: number;
  totalTicks: number;
  /** 0..1 arasi tamamlanma orani. */
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
  terrainSeed: number;
}

/** Uretim sisteminin her tick sonunda yayinladigi ozet. */
export interface EconomySnapshot {
  /** Dakika basina net uretim. */
  netPerMinute: ResourcePool;
  populationUsed: number;
  populationCapacity: number;
  storageCapacity: number;
  /** Isci yetersizliginden dogan verim carpani (0..1). */
  efficiency: number;
}
