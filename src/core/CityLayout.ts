import {
  BASE_GROUND_COUNT,
  CITY_GRID_SIZE,
  GROUND_PER_TOWN_HALL_LEVEL,
  MAX_GROUND_COUNT,
} from '@/config/Constants';
import type { GridPoint } from '@/types';

/**
 * Sehir gorunumunun sabit yerlesimi.
 *
 * Ikariam'da sehir serbest yerlestirilen bir izgara DEGILDIR: Valilik
 * merkezde, Ticaret Limani ve Tersane kiyida, Surlar cevrededir ve geri
 * kalan binalar YAPI ALANLARINA (ground) kurulur. Yapi alanlarinin SAYISI
 * Valilik seviyesiyle artar; konumlari sabittir.
 *
 * Bu yuzden yerlesim bir sabitler tablosudur, uretim degil. Uretim
 * yapmak, her kayitta farkli bir sehir demek olurdu ve oyuncunun
 * binalarinin yeri kayda yazilmadan korunamazdi.
 */

/** Sehir izgarasinin boyutu. */
export const CITY_SIZE = CITY_GRID_SIZE;

/** Valiligin sol ust kosesi (2x2 ayak izi). */
export const CITY_TOWN_HALL: GridPoint = { gx: 6, gy: 6 };

/** Ticaret Limaninin sol ust kosesi (2x2). */
export const CITY_PORT: GridPoint = { gx: 8, gy: 10 };

/** Tersanenin sol ust kosesi (2x2). */
export const CITY_SHIPYARD: GridPoint = { gx: 10, gy: 10 };

/**
 * Yapi alanlari, ACILIS SIRASIYLA.
 *
 * Siralama merkezden disari dogrudur: oyuncu ilk binalarini Valiligin
 * yanina kurar, sehir buyudukce disa tasar. Ikariam'in sehir gorunumu de
 * boyle yogunlasir. Tum konumlar cift sayili izgaradadir ve 2x2 ayak izi
 * birbirine degmez.
 */
export const CITY_GROUNDS: GridPoint[] = [
  // 1. halka - Valilige bitisik
  { gx: 4, gy: 4 },
  { gx: 6, gy: 4 },
  { gx: 8, gy: 4 },
  { gx: 4, gy: 6 },
  { gx: 8, gy: 6 },
  { gx: 4, gy: 8 },
  { gx: 6, gy: 8 },
  { gx: 8, gy: 8 },
  // 2. halka
  { gx: 2, gy: 4 },
  { gx: 2, gy: 6 },
  { gx: 10, gy: 4 },
  { gx: 10, gy: 6 },
  { gx: 2, gy: 8 },
  { gx: 10, gy: 8 },
  { gx: 4, gy: 10 },
  { gx: 6, gy: 10 },
  // 3. halka - sehir genisledikce acilir
  { gx: 2, gy: 2 },
  { gx: 4, gy: 2 },
  { gx: 6, gy: 2 },
  { gx: 8, gy: 2 },
];

/** Tablodaki toplam yapi alani sayisi. */
export const TOTAL_GROUNDS = CITY_GROUNDS.length;

/**
 * Verilen Valilik seviyesinde ACIK olan yapi alani sayisi.
 *
 * Ikariam'da Valilik buyudukce yeni alanlar acilir. Burokrasi arastirmasi
 * bir ek alan verir (extraGround).
 */
export function groundCountFor(townHallLevel: number, extraGround = 0): number {
  const fromLevel = BASE_GROUND_COUNT + GROUND_PER_TOWN_HALL_LEVEL * Math.max(0, townHallLevel - 1);
  return Math.min(
    MAX_GROUND_COUNT,
    TOTAL_GROUNDS,
    Math.max(1, Math.floor(fromLevel) + Math.max(0, extraGround)),
  );
}

/** Bir karonun sehirde hangi yapiya ait oldugunu soyler. */
export type CityZone =
  | 'water'
  | 'land'
  | 'townhall'
  | 'port'
  | 'shipyard'
  | 'ground'
  | 'wall';

/** 2x2 ayak izinin kapsadigi karolar. */
function footprint(origin: GridPoint): GridPoint[] {
  return [
    { gx: origin.gx, gy: origin.gy },
    { gx: origin.gx + 1, gy: origin.gy },
    { gx: origin.gx, gy: origin.gy + 1 },
    { gx: origin.gx + 1, gy: origin.gy + 1 },
  ];
}

/**
 * Sehrin karo haritasini uretir.
 *
 * Sehir bir YARIMADA uzerinde durur: kuzey-bati kisminda kara, guney-dogu
 * kisminda deniz vardir ve liman tam kiyiya oturur. Ikariam'in sehir
 * gorunumunde de deniz her zaman bir kenardadir.
 */
export function buildCityZones(openGrounds: number): CityZone[] {
  const zones: CityZone[] = new Array<CityZone>(CITY_SIZE * CITY_SIZE).fill('water');

  const setZone = (p: GridPoint, zone: CityZone): void => {
    if (p.gx < 0 || p.gy < 0 || p.gx >= CITY_SIZE || p.gy >= CITY_SIZE) return;
    zones[p.gy * CITY_SIZE + p.gx] = zone;
  };

  // Kara: kuzey-bati kosesinden yayilan bir daire. Liman kiyida kalir.
  const centerX = 5.6;
  const centerY = 5.6;
  const landRadius = 6.6;
  for (let gy = 0; gy < CITY_SIZE; gy += 1) {
    for (let gx = 0; gx < CITY_SIZE; gx += 1) {
      const dx = gx - centerX;
      const dy = gy - centerY;
      // Limanin oturacagi guney-dogu kiyisi karaya dogru uzatilir.
      const harborBias = gx >= 8 && gy >= 10 ? 1.9 : 0;
      if (Math.sqrt(dx * dx + dy * dy) <= landRadius + harborBias) {
        zones[gy * CITY_SIZE + gx] = 'land';
      }
    }
  }

  for (const p of footprint(CITY_TOWN_HALL)) setZone(p, 'townhall');
  for (const p of footprint(CITY_PORT)) setZone(p, 'port');
  for (const p of footprint(CITY_SHIPYARD)) setZone(p, 'shipyard');
  CITY_GROUNDS.slice(0, Math.max(0, Math.min(TOTAL_GROUNDS, openGrounds))).forEach((p) => {
    for (const cell of footprint(p)) setZone(cell, 'ground');
  });

  // Surlar: karanin denize bakan sinir halkasidir.
  for (let gy = 0; gy < CITY_SIZE; gy += 1) {
    for (let gx = 0; gx < CITY_SIZE; gx += 1) {
      const index = gy * CITY_SIZE + gx;
      if (zones[index] !== 'land') continue;
      const neighbours = [
        zones[index - 1],
        zones[index + 1],
        zones[index - CITY_SIZE],
        zones[index + CITY_SIZE],
      ];
      const onCoast = neighbours.some((n) => n === 'water' || n === undefined);
      if (onCoast) zones[index] = 'wall';
    }
  }

  return zones;
}

/** Karo turunu okur. */
export function zoneAt(zones: CityZone[], gx: number, gy: number): CityZone {
  if (gx < 0 || gy < 0 || gx >= CITY_SIZE || gy >= CITY_SIZE) return 'water';
  return zones[gy * CITY_SIZE + gx] ?? 'water';
}

/** Yapi alani indeksinden konumunu verir. */
export function groundAt(index: number): GridPoint | null {
  return CITY_GROUNDS[index] ?? null;
}
