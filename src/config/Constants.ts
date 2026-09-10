import type { ResourcePool } from '@/types';

/** Oyunun ayarlanabilir sabitleri. Denge degisiklikleri once burada yapilir. */

/** Yeni bir oyunun baslangic kaynaklari. */
export const STARTING_RESOURCES: ResourcePool = {
  food: 150,
  wood: 220,
  stone: 140,
  gold: 60,
};

/** Izometrik karo genisligi (piksel). */
export const TILE_WIDTH = 128;

/** Izometrik karo yuksekligi (piksel). */
export const TILE_HEIGHT = 64;

/** Sehir izgarasinin boyutu (GRID_SIZE x GRID_SIZE). */
export const GRID_SIZE = 14;

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

/** Kaynak turu basina baslangic depo kapasitesi. */
export const BASE_STORAGE_CAPACITY = 500;

/** Sehir merkezi olmadan bile var olan taban nufus kapasitesi. */
export const BASE_POPULATION_CAPACITY = 0;

/** Her isci icin dakikada tuketilen yiyecek. */
export const FOOD_UPKEEP_PER_WORKER = 0.4;

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
 * Acilista ekrana sigmasi hedeflenen karo sayisi (yatay).
 * Baslangic zoom'u ekran genisligine gore bundan hesaplanir; boylece dar bir
 * telefonda da genis bir tablette de benzer bir kadraj olusur.
 */
export const INITIAL_VISIBLE_TILES = 5;

/** Suruklemenin dokunma degil kaydirma sayilmasi icin gereken piksel esigi. */
export const DRAG_THRESHOLD_PX = 12;

/** Dokunmanin "tap" sayilmasi icin azami basili tutma suresi (ms). */
export const TAP_MAX_DURATION_MS = 400;

/**
 * Kayit dosyasi surumu.
 * v1: defId + complete + remainingBuildTime (saniye)
 * v2: type + state + level + assignedWorkers + construction (tik) + tick
 * v3: construction.kind ('build' | 'upgrade'); accumulatedProduction kaldirildi
 *
 * NOT: Kuyruk alanlari (status, durationTicks, sequence) v3 icine geriye donuk
 * uyumlu eklendi - eksik olduklarinda kayittan turetilebildikleri icin surum
 * artirmaya gerek yoktur.
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
  TileHighlight: 'tile-highlight',
  TileValid: 'tile-valid',
  TileInvalid: 'tile-invalid',
  Panel: 'ui-panel',
  Pixel: 'ui-pixel',
  ButtonUp: 'ui-button-up',
  ButtonDown: 'ui-button-down',
} as const;

/** Kaynak turlerinin sabit sirasi - arayuzde tutarli siralama saglar. */
export const RESOURCE_ORDER = ['food', 'wood', 'stone', 'gold'] as const;

/** Kaynaklarin kullaniciya gosterilen adlari ve renkleri. */
export const RESOURCE_META = {
  food: { label: 'Yiyecek', color: 0x8fbf5a, icon: 'F' },
  wood: { label: 'Odun', color: 0xa9743f, icon: 'O' },
  stone: { label: 'Tas', color: 0x9aa3ab, icon: 'T' },
  gold: { label: 'Altin', color: 0xe8c86a, icon: 'A' },
} as const;
