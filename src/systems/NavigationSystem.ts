import { gridToWorld, worldToGrid } from '@/utils/IsoUtils';
import type { GridMap } from '@/core/GridMap';
import type { GridPoint, TerrainType, TileData, WorldPoint } from '@/types';

/**
 * Sehrin gezilebilirlik modeli ve rota bulma.
 *
 * NEDEN VAR
 * Sprint 9'da isciler DUZ CIZGI yuruyordu: binalarin icinden, gerekirse
 * sudan geciyorlardi. Hareketin kendisi gercekti ama sehrin bir sekli
 * oldugunu bilmiyordu. Bu modul o eksigi kapatir - "nereye basilabilir"
 * sorusunun tek cevap yeri burasidir.
 *
 * IKINCI BIR HARITA YOK
 * Gezilebilirlik GridMap'ten CANLI okunur; ayri bir engel kopyasi
 * tutulmaz. Bina kurulunca GridMap'te occupantUid dolar ve karo ayni anda
 * kapanir, yikilinca bosalir. Bu yuzden "bayat engel" diye bir durum
 * olusamaz: senkron tutulacak ikinci bir gercek yok.
 *
 * PHASER YOK
 * Bu dosya cizim katmanini bilmez. WorkerLayer'in gezilebilirlik sormasi
 * ya da rota hesaplamasi mimari bir hatadir.
 */

/**
 * Uzerinde yurunebilen zemin turleri.
 *
 * Kaya da yurunebilir: tas ocagi kayaya kurulur ve isci oraya gidebilmeli.
 * Su tek engeldir. Yeni bir zemin turu EKLENMEDI - karar var olan modelden
 * tek noktada turetiliyor.
 */
export const WALKABLE_TERRAIN: readonly TerrainType[] = ['grass', 'soil', 'rock'];

/**
 * Komsu tarama sirasi: yukari, saga, asagi, sola.
 *
 * SABIT ve belgelenmis olmasi determinizmin tek sarti: ayni harita ve ayni
 * iki nokta her zaman ayni rotayi verir. Capraz komsu YOKTUR; dort yon,
 * izometrik ekranda okunakli merdiven rotalari uretir.
 */
export const NEIGHBOR_ORDER: readonly GridPoint[] = [
  { gx: 0, gy: -1 },
  { gx: 1, gy: 0 },
  { gx: 0, gy: 1 },
  { gx: -1, gy: 0 },
];

/** Bir karonun uzerinde yurunebilir mi? Bos olmali ve zemini uygun olmali. */
export function isWalkableTile(tile: TileData | null): boolean {
  if (!tile) return false;
  if (tile.occupantUid !== null) return false;
  return WALKABLE_TERRAIN.includes(tile.terrain);
}

export class NavigationSystem {
  private readonly grid: GridMap;

  constructor(grid: GridMap) {
    this.grid = grid;
  }

  /**
   * Verilen karoya basilabilir mi?
   * Harita disi, su ve bina kaplayan karolar kapalidir.
   */
  isWalkable(gx: number, gy: number): boolean {
    return isWalkableTile(this.grid.getTile(gx, gy));
  }

  /** Dunya noktasinin dustugu karoya basilabilir mi? */
  isWalkableAt(point: WorldPoint): boolean {
    const cell = worldToGrid(point.x, point.y);
    return this.isWalkable(cell.gx, cell.gy);
  }

  /**
   * Karonun gezilebilir komsulari - SABIT sirada.
   * Sinir disi ve kapali komsular listeye girmez.
   */
  getNeighbors(gx: number, gy: number): GridPoint[] {
    const out: GridPoint[] = [];
    for (const step of NEIGHBOR_ORDER) {
      const nx = gx + step.gx;
      const ny = gy + step.gy;
      if (this.isWalkable(nx, ny)) out.push({ gx: nx, gy: ny });
    }
    return out;
  }

  /**
   * Verilen karoya en yakin gezilebilir karo.
   *
   * Hedefin kendisi kapaliysa (bina, su) isci oraya basamaz ama YANINA
   * gidebilir. Halka halka disari dogru taranir; ayni uzaklikta birden
   * cok aday varsa NEIGHBOR_ORDER'daki sira karar verir, yani secim
   * deterministiktir.
   */
  nearestWalkable(gx: number, gy: number, maxRadius = 4): GridPoint | null {
    if (this.isWalkable(gx, gy)) return { gx, gy };

    for (let radius = 1; radius <= maxRadius; radius += 1) {
      let best: GridPoint | null = null;
      let bestKey = Number.POSITIVE_INFINITY;

      for (let dy = -radius; dy <= radius; dy += 1) {
        for (let dx = -radius; dx <= radius; dx += 1) {
          if (Math.max(Math.abs(dx), Math.abs(dy)) !== radius) continue;
          const nx = gx + dx;
          const ny = gy + dy;
          if (!this.isWalkable(nx, ny)) continue;
          // Once gercek uzaklik, esitlikte sabit bir tarama sirasi.
          const key = (dx * dx + dy * dy) * 1000 + (dy + radius) * 100 + (dx + radius);
          if (key < bestKey) {
            bestKey = key;
            best = { gx: nx, gy: ny };
          }
        }
      }
      if (best) return best;
    }
    return null;
  }

  /**
   * Bir ayak izini SARAN gezilebilir karolar.
   *
   * Isci binaya ancak buradan yaklasabilir. "En yakin acik karo"yu serbest
   * birakmak yetmezdi: etrafi suyla cevrili bir ciftligin iki karo
   * otesindeki kiyi da "en yakin" sayilir ve isci golun karsi yakasindan
   * calisiyormus gibi gorunurdu. Bina ULASILABILIR ancak bitisiginde acik
   * bir karo varsa sayilir.
   *
   * Tarama sirasi sabittir, dolayisiyla secim deterministiktir.
   */
  ringAround(gx: number, gy: number, size: number): GridPoint[] {
    const out: GridPoint[] = [];
    for (let dy = -1; dy <= size; dy += 1) {
      for (let dx = -1; dx <= size; dx += 1) {
        const inside = dx >= 0 && dx < size && dy >= 0 && dy < size;
        if (inside) continue;
        const nx = gx + dx;
        const ny = gy + dy;
        if (this.isWalkable(nx, ny)) out.push({ gx: nx, gy: ny });
      }
    }
    return out;
  }

  /**
   * Iki karo arasinda gezilebilir bir rota.
   *
   * GENISLIK ONCELIKLI ARAMA (BFS). A* degil, Dijkstra degil: her adimin
   * bedeli ayni ve harita 14x14, yani sezgisel bir maliyet fonksiyonuna
   * gerek yok. BFS hem en kisa adim sayisini garanti eder hem de sabit
   * komsu siralamasiyla tamamen deterministiktir.
   *
   * Rota bulunamazsa BOS dizi doner - cagiran taraf bunu ele almak
   * zorundadir. Kapali karoya asla girilmez, harita disina asla cikilmaz.
   */
  findPath(start: GridPoint, goal: GridPoint): GridPoint[] {
    if (!this.isWalkable(start.gx, start.gy)) return [];
    if (!this.isWalkable(goal.gx, goal.gy)) return [];
    if (start.gx === goal.gx && start.gy === goal.gy) return [{ ...start }];

    const size = this.grid.size;
    const indexOf = (gx: number, gy: number): number => gy * size + gx;
    // -1 = henuz gorulmedi. Ziyaret isareti ve geri iz ayni dizide tutulur.
    const cameFrom = new Int32Array(size * size).fill(-1);
    const startIndex = indexOf(start.gx, start.gy);
    const goalIndex = indexOf(goal.gx, goal.gy);
    cameFrom[startIndex] = startIndex;

    // Basit dizi kuyrugu; bas isaretcisi ile O(1) cikarma.
    const queue: number[] = [startIndex];
    for (let head = 0; head < queue.length; head += 1) {
      const current = queue[head];
      if (current === goalIndex) return this.tracePath(cameFrom, startIndex, goalIndex, size);

      const cx = current % size;
      const cy = (current - cx) / size;
      for (const step of NEIGHBOR_ORDER) {
        const nx = cx + step.gx;
        const ny = cy + step.gy;
        if (!this.isWalkable(nx, ny)) continue;
        const next = indexOf(nx, ny);
        if (cameFrom[next] !== -1) continue;
        cameFrom[next] = current;
        queue.push(next);
      }
    }

    return [];
  }

  /** Geri izi baslangictan hedefe dogru bir karo dizisine cevirir. */
  private tracePath(
    cameFrom: Int32Array,
    startIndex: number,
    goalIndex: number,
    size: number,
  ): GridPoint[] {
    const reversed: GridPoint[] = [];
    let cursor = goalIndex;
    // Ust sinir: her karo en fazla bir kez gezilir.
    for (let guard = 0; guard <= size * size; guard += 1) {
      const gx = cursor % size;
      reversed.push({ gx, gy: (cursor - gx) / size });
      if (cursor === startIndex) break;
      cursor = cameFrom[cursor];
    }
    return reversed.reverse();
  }
}

/**
 * Rotayi dunya noktalarina cevirir ve duz giden parcalari birlestirir.
 *
 * Ayni dogrultuda giden ara karolar ayiklanir: isci her karo merkezinde
 * duraklamak yerine kosede doner. Bu yalnizca bir sadelestirmedir, rota
 * DEGISMEZ - ayiklanan noktalar zaten iki ucu birlestiren dogrunun
 * uzerindedir.
 */
export function toWaypoints(path: readonly GridPoint[]): WorldPoint[] {
  const out: WorldPoint[] = [];
  for (let i = 0; i < path.length; i += 1) {
    const previous = path[i - 1];
    const next = path[i + 1];
    if (previous && next) {
      const sameRow = previous.gy === path[i].gy && path[i].gy === next.gy;
      const sameColumn = previous.gx === path[i].gx && path[i].gx === next.gx;
      if (sameRow || sameColumn) continue;
    }
    out.push(gridToWorld(path[i].gx, path[i].gy));
  }
  return out;
}
