import { isBuildable } from './BuildingPlotSystem';
import type { BuildingPlotSystem } from './BuildingPlotSystem';
import type { GridMap } from '@/core/GridMap';
import type { DecorItem, DecorKind, TerrainType } from '@/types';

/**
 * Sehrin CEVRE DEKORASYONU - agaclar, caliliklar, amforalar, kutuk yiginlari.
 *
 * NEDEN VAR
 * Sokaklar ve yapiya kapali karolar bos birakildiginda sehir "izgara
 * uzerinde duran birkac bina" gibi goruluyordu. Dekorasyon o bosluklari
 * doldurur ve sehre yasanmislik verir.
 *
 * SADECE GORSELDIR
 * Bu modul hicbir oyun durumunu degistirmez. Uc kural bunu garanti eder:
 *
 *   1. Dekor YALNIZCA plot OLMAYAN karolara konur. Plot olmayan karoya
 *      bina kurulamaz, dolayisiyla bir dekor asla binanin altinda kalmaz.
 *   2. GridMap'e dokunulmaz: occupantUid degismez, yani NavigationSystem
 *      ayni engelleri gorur ve isci rotalari birebir aynidir.
 *   3. Karo MERKEZI bos birakilir; dekor karo kenarina kaydirilir. Isciler
 *      karo merkezlerinden yurudugu icin agacin icinden gecmis gibi
 *      gorunmezler.
 *
 * DETERMINISTIKTIR
 * Yerlesim seed + karo koordinatindan turer. Rastgelelik yoktur: ayni
 * sehir her acilista ayni gorunur ve kayda tek bir alan bile eklenmez.
 */

/** Karo basina dekor olasiligi (0..1), zemin turune gore. */
const DENSITY: Record<TerrainType, number> = {
  grass: 0.4,
  soil: 0.3,
  rock: 0.34,
  water: 0,
};

/** Zemin turunun uretebilecegi dekor cesitleri. */
const BY_TERRAIN: Record<TerrainType, DecorKind[]> = {
  // Cimen sokak kenari: agac agirlikli, arada cali ve amfora.
  grass: ['tree', 'bush', 'bush', 'amphora', 'tree'],
  soil: ['bush', 'logs', 'amphora', 'logs'],
  rock: ['rock', 'column', 'rock', 'bush'],
  water: [],
};

/** Suya komsu karada sazlik cikar; kiyi cizgisini yumusatir. */
const SHORE_KINDS: DecorKind[] = ['reed', 'reed', 'rock'];

/**
 * Dekorun karo merkezinden kacirildigi mesafe (karo genisliginin orani).
 *
 * Isciler karo MERKEZINDEN yuruyor. 0 birakildiginda agaclar tam yolun
 * ortasinda duruyordu ve isci agacin icinden geciyormus gibi gorunuyordu.
 * 0.3 ile dekor kaldirima cekilir, yol acik kalir.
 */
const EDGE_OFFSET = 0.3;

export class CityDecorSystem {
  private readonly itemList: DecorItem[] = [];

  constructor(grid: GridMap, plots: BuildingPlotSystem) {
    this.plan(grid, plots);
  }

  /** Sehirdeki tum dekor ogeleri (deterministik sirada). */
  get items(): readonly DecorItem[] {
    return this.itemList;
  }

  private plan(grid: GridMap, plots: BuildingPlotSystem): void {
    for (const tile of grid.allTiles()) {
      // 1. Plot olan karo asla dekor almaz: oraya bina kurulabilir.
      if (plots.plotAt(tile.gx, tile.gy) !== null) continue;
      if (tile.terrain === 'water') continue;

      const shore = touchesWater(grid, tile.gx, tile.gy);
      const roll = hash(grid.seed, tile.gx, tile.gy, 1) / 0xffffffff;
      // Kiyida yogunluk artar; sehrin dis hatti bos bir seride donusmesin.
      const density = shore ? 0.72 : DENSITY[tile.terrain];
      if (roll > density) continue;

      const pool = shore ? SHORE_KINDS : BY_TERRAIN[tile.terrain];
      if (pool.length === 0) continue;
      const kind = pool[hash(grid.seed, tile.gx, tile.gy, 2) % pool.length];

      /*
       * Kaydirma karonun KENDI eksenlerinde yapilir.
       *
       * Ekran ekseninde kaydirmak (sadece x/y) dekoru komsu karonun
       * uzerine tasiyabiliyordu; izometrik eksende kaydirmak onu kendi
       * karosunun kenarinda tutar.
       */
      const su = pick(hash(grid.seed, tile.gx, tile.gy, 3));
      const sv = pick(hash(grid.seed, tile.gx, tile.gy, 4));

      this.itemList.push({
        gx: tile.gx,
        gy: tile.gy,
        kind,
        offsetU: su * EDGE_OFFSET,
        offsetV: sv * EDGE_OFFSET,
      });
    }
  }
}

/** Bu karo yapi alanina kapali mi? (sokaklar ve zeminin elediği karolar) */
export function isDecorTile(gx: number, gy: number): boolean {
  return !isBuildable(gx, gy);
}

/** Dort komsudan biri su mu? */
function touchesWater(grid: GridMap, gx: number, gy: number): boolean {
  for (const [dx, dy] of [
    [0, -1],
    [1, 0],
    [0, 1],
    [-1, 0],
  ]) {
    if (grid.getTile(gx + dx, gy + dy)?.terrain === 'water') return true;
  }
  return false;
}

/** -1 veya +1; hash'in tek bir bitinden turer. */
function pick(value: number): number {
  return (value & 1) === 0 ? -1 : 1;
}

/**
 * Karo koordinati ve seed'den kararli bir tam sayi uretir.
 * Ayni girdi her zaman ayni degeri verir; Math.random KULLANILMAZ.
 */
function hash(seed: number, gx: number, gy: number, salt: number): number {
  let h = (seed ^ 0x9e3779b9) >>> 0;
  for (const value of [gx + 97, gy + 193, salt * 31]) {
    h = (h ^ value) >>> 0;
    h = Math.imul(h, 0x85ebca6b) >>> 0;
    h = (h ^ (h >>> 13)) >>> 0;
  }
  return h >>> 0;
}
