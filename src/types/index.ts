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

/** Bir bina turunun statik tanimi. */
export interface BuildingDefinition {
  id: BuildingId;
  /** Kullaniciya gosterilen ad. */
  name: string;
  /** Insa menusunde gosterilen kisa aciklama. */
  description: string;
  category: BuildingCategory;
  /** Izgara uzerinde kapladigi alan (kare). */
  size: number;
  /** Insa maliyeti. */
  cost: ResourceAmounts;
  /** Insa suresi (saniye). */
  buildTime: number;
  /** Dakikada uretilen kaynaklar. */
  production?: ResourceAmounts;
  /** Calismasi icin gereken isci sayisi. */
  workers?: number;
  /** Sagladigi nufus kapasitesi. */
  populationCapacity?: number;
  /** Sagladigi ek depo kapasitesi. */
  storageCapacity?: number;
  /** Ayni anda kurulabilecek azami adet (tanimsiz ise sinirsiz). */
  maxCount?: number;
  /** Uzerine kurulabilecegi zemin turleri. */
  allowedTerrain: TerrainType[];
  /** Prosedurel doku uretimi icin ana renk. */
  tint: number;
}

/** Yerlestirilmis bir binanin calisma zamani durumu. */
export interface BuildingInstance {
  /** Benzersiz ornek kimligi. */
  uid: string;
  defId: BuildingId;
  gx: number;
  gy: number;
  level: number;
  /** Insa tamamlandi mi? */
  complete: boolean;
  /** Insaatin bitmesine kalan sure (saniye). */
  remainingBuildTime: number;
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
  savedAt: number;
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
