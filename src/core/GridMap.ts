import { GRID_SIZE } from '@/config/Constants';
import type { GridPoint, TerrainType, TileData } from '@/types';

/**
 * Sehir izgarasi: zemin turlerini ve hangi hucrenin dolu oldugunu tutar.
 * Render katmanindan tamamen bagimsizdir, bu sayede test edilebilir.
 */
export class GridMap {
  readonly size: number;
  readonly seed: number;

  private readonly tiles: TileData[];

  constructor(seed: number, size: number = GRID_SIZE) {
    this.size = size;
    this.seed = seed;
    this.tiles = new Array<TileData>(size * size);
    this.generate();
  }

  /** Koordinatin izgara sinirlari icinde olup olmadigini soyler. */
  inBounds(gx: number, gy: number): boolean {
    return gx >= 0 && gy >= 0 && gx < this.size && gy < this.size;
  }

  /** Hucreyi dondurur; sinirlarin disinda ise null. */
  getTile(gx: number, gy: number): TileData | null {
    if (!this.inBounds(gx, gy)) return null;
    return this.tiles[gy * this.size + gx];
  }

  /** Tum hucreler uzerinde gezinmek icin salt okunur liste. */
  allTiles(): readonly TileData[] {
    return this.tiles;
  }

  /**
   * Bir binanin kaplayacagi tum hucreleri dondurur.
   * Alan izgara disina tasarsa null doner.
   */
  footprint(gx: number, gy: number, size: number): TileData[] | null {
    const cells: TileData[] = [];
    for (let dy = 0; dy < size; dy += 1) {
      for (let dx = 0; dx < size; dx += 1) {
        const tile = this.getTile(gx + dx, gy + dy);
        if (!tile) return null;
        cells.push(tile);
      }
    }
    return cells;
  }

  /** Alanin bos ve verilen zemin turlerine uygun olup olmadigini kontrol eder. */
  canPlace(gx: number, gy: number, size: number, allowedTerrain: TerrainType[]): boolean {
    const cells = this.footprint(gx, gy, size);
    if (!cells) return false;
    return cells.every((tile) => tile.occupantUid === null && allowedTerrain.includes(tile.terrain));
  }

  /** Alani verilen bina ornegi ile isaretler. */
  occupy(gx: number, gy: number, size: number, uid: string): void {
    const cells = this.footprint(gx, gy, size);
    if (!cells) return;
    for (const tile of cells) {
      tile.occupantUid = uid;
    }
  }

  /** Verilen bina ornegine ait tum hucreleri bosaltir. */
  release(uid: string): void {
    for (const tile of this.tiles) {
      if (tile.occupantUid === uid) {
        tile.occupantUid = null;
      }
    }
  }

  /** Izgaranin merkez hucresi - kamera baslangici icin kullanilir. */
  center(): GridPoint {
    const mid = Math.floor(this.size / 2);
    return { gx: mid, gy: mid };
  }

  /**
   * Zemini deterministik olarak uretir.
   * Ayni seed her zaman ayni haritayi verir; boylece kayit/yukleme tutarlidir.
   */
  private generate(): void {
    const rand = createRng(this.seed);
    // Kayalik ve su alanlari icin iki bagimsiz gurultu katmani.
    const rockField = valueNoiseField(this.size, rand, 0.34);
    const soilField = valueNoiseField(this.size, rand, 0.42);

    for (let gy = 0; gy < this.size; gy += 1) {
      for (let gx = 0; gx < this.size; gx += 1) {
        const index = gy * this.size + gx;
        const rock = rockField[index];
        const soil = soilField[index];
        const edgeDistance = Math.min(gx, gy, this.size - 1 - gx, this.size - 1 - gy);

        let terrain: TerrainType = 'grass';
        if (edgeDistance === 0 && rock > 0.58) {
          // Su yalnizca haritanin kenarlarinda olusur; sehir alani bolunmez.
          terrain = 'water';
        } else if (rock > 0.68) {
          terrain = 'rock';
        } else if (soil > 0.6) {
          terrain = 'soil';
        }

        this.tiles[index] = { gx, gy, terrain, occupantUid: null };
      }
    }

    this.carveStartingArea();
  }

  /** Merkezdeki 4x4 alani duz cimene cevirir; oyuncu her zaman insaya baslayabilir. */
  private carveStartingArea(): void {
    const { gx, gy } = this.center();
    for (let dy = -2; dy <= 1; dy += 1) {
      for (let dx = -2; dx <= 1; dx += 1) {
        const tile = this.getTile(gx + dx, gy + dy);
        if (tile) tile.terrain = 'grass';
      }
    }
  }
}

/** Mulberry32: kucuk, hizli ve deterministik bir sozde rastgele sayi ureteci. */
function createRng(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Basit deger gurultusu: dusuk cozunurluklu rastgele bir izgara uretip
 * bilineer interpolasyon ile buyutur. Kume kume zemin olusmasini saglar.
 */
function valueNoiseField(size: number, rand: () => number, scale: number): number[] {
  const coarse = Math.max(2, Math.ceil(size * scale));
  const lattice: number[] = [];
  for (let i = 0; i < (coarse + 1) * (coarse + 1); i += 1) {
    lattice.push(rand());
  }

  const sample = (cx: number, cy: number): number => lattice[cy * (coarse + 1) + cx];
  const field: number[] = new Array<number>(size * size);

  for (let gy = 0; gy < size; gy += 1) {
    for (let gx = 0; gx < size; gx += 1) {
      const fx = (gx / (size - 1)) * coarse;
      const fy = (gy / (size - 1)) * coarse;
      const x0 = Math.floor(fx);
      const y0 = Math.floor(fy);
      const tx = smoothstep(fx - x0);
      const ty = smoothstep(fy - y0);
      const top = lerp(sample(x0, y0), sample(x0 + 1, y0), tx);
      const bottom = lerp(sample(x0, y0 + 1), sample(x0 + 1, y0 + 1), tx);
      field[gy * size + gx] = lerp(top, bottom, ty);
    }
  }
  return field;
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function smoothstep(t: number): number {
  return t * t * (3 - 2 * t);
}
