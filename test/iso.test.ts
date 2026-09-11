/**
 * Izometrik koordinat donusumleri.
 *
 * Bu dosya, dokunulan karo ile kurulan karonun ayrismasina yol acan bir
 * hatadan sonra yazildi: worldToGrid en yakina degil ASAGI yuvarliyordu.
 * gridToWorld karonun MERKEZINI dondurdugu icin tam sayi izgara koordinati
 * merkeze oturur; asagi yuvarlamak tam sayinin kosede oldugunu varsaymakti
 * ve secim bolgesini yarim karo kaydiriyordu.
 */
import { describe, expect, it } from 'vitest';
import { GRID_SIZE, TILE_HEIGHT, TILE_WIDTH } from '@/config/Constants';
import { depthFor, gridToWorld, worldToGrid } from '@/utils/IsoUtils';

describe('gridToWorld <-> worldToGrid', () => {
  it('karo merkezi kendi karosuna geri doner (tum izgara)', () => {
    for (let gx = 0; gx < GRID_SIZE; gx += 1) {
      for (let gy = 0; gy < GRID_SIZE; gy += 1) {
        const world = gridToWorld(gx, gy);
        expect(worldToGrid(world.x, world.y)).toEqual({ gx, gy });
      }
    }
  });

  it('merkezin cevresindeki kucuk kaymalar ayni karoda kalir', () => {
    // Asil hata buydu: merkezin 4px yukarisi CAPRAZ iki karo otesini
    // seciyordu. Elmasin yarim yuksekligi 32px, yarim genisligi 64px.
    for (const [gx, gy] of [
      [5, 5],
      [6, 6],
      [7, 5],
      [4, 8],
      [0, 0],
      [GRID_SIZE - 1, GRID_SIZE - 1],
    ]) {
      const world = gridToWorld(gx, gy);
      for (const [ox, oy] of [
        [0, 0],
        [0, -4],
        [0, 4],
        [-10, 0],
        [10, 0],
        [0, -12],
        [-20, 0],
        [20, 8],
      ]) {
        expect(worldToGrid(world.x + ox, world.y + oy)).toEqual({ gx, gy });
      }
    }
  });

  it('elmasin icindeki her nokta o karoyu secer', () => {
    // Elmas: |dx| / (TILE_WIDTH/2) + |dy| / (TILE_HEIGHT/2) <= 1
    const gx = 6;
    const gy = 6;
    const center = gridToWorld(gx, gy);
    const halfW = TILE_WIDTH / 2;
    const halfH = TILE_HEIGHT / 2;

    let checked = 0;
    for (let dx = -halfW + 1; dx < halfW; dx += 3) {
      for (let dy = -halfH + 1; dy < halfH; dy += 2) {
        // Kenara cok yakin noktalar komsuya gidebilir; ic bolgeyi sinariz.
        if (Math.abs(dx) / halfW + Math.abs(dy) / halfH > 0.9) continue;
        expect(worldToGrid(center.x + dx, center.y + dy)).toEqual({ gx, gy });
        checked += 1;
      }
    }
    expect(checked).toBeGreaterThan(100);
  });

  it('komsu karolar gercekten komsu secilir, capraz atlanmaz', () => {
    const center = gridToWorld(5, 5);
    // Bir karo "kuzey" (ekranda yukari) = gx-1, gy-1; tam bir karo yukarisi.
    expect(worldToGrid(center.x, center.y - TILE_HEIGHT)).toEqual({ gx: 4, gy: 4 });
    // Bir karo "guney"
    expect(worldToGrid(center.x, center.y + TILE_HEIGHT)).toEqual({ gx: 6, gy: 6 });
    // Bir karo "bati" (ekranda sola)
    expect(worldToGrid(center.x - TILE_WIDTH, center.y)).toEqual({ gx: 4, gy: 6 });
    // Bir karo "dogu"
    expect(worldToGrid(center.x + TILE_WIDTH, center.y)).toEqual({ gx: 6, gy: 4 });
  });

  it('donusum saftir: ayni girdi ayni cikti, girdi degismez', () => {
    const a = gridToWorld(3, 9);
    const b = gridToWorld(3, 9);
    expect(a).toEqual(b);
    expect(worldToGrid(a.x, a.y)).toEqual(worldToGrid(b.x, b.y));
  });

  it('izgara disi dunya noktasi izgara disi hucre dondurur', () => {
    const far = gridToWorld(GRID_SIZE + 5, GRID_SIZE + 5);
    const cell = worldToGrid(far.x, far.y);
    expect(cell.gx).toBeGreaterThanOrEqual(GRID_SIZE);
    expect(cell.gy).toBeGreaterThanOrEqual(GRID_SIZE);
  });
});

describe('depthFor', () => {
  it('ondeki karo arkadakinden buyuk derinlik alir', () => {
    expect(depthFor(5, 5)).toBeGreaterThan(depthFor(4, 4));
    expect(depthFor(0, 1)).toBeGreaterThan(depthFor(0, 0));
  });

  it('cok karolu bina en on kosesine gore siralanir', () => {
    // 2x2 bina (gx,gy) -> en on karosu (gx+1, gy+1)
    expect(depthFor(4, 4, 2)).toBeGreaterThan(depthFor(4, 4, 1));
    expect(depthFor(4, 4, 2)).toBe(depthFor(5, 5, 1));
  });

  it('deterministiktir', () => {
    expect(depthFor(7, 2, 2)).toBe(depthFor(7, 2, 2));
  });
});
