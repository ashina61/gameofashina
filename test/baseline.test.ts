/**
 * Karakterizasyon testleri: refactor ONCESI davranisi kilitler.
 *
 * Bu dosyadaki beklentiler "dogru olmasi gereken" degil, "bugun olan" davranistir.
 * Sprint boyunca degismemeleri, mimari degisikligin oyunu bozmadiginin kanitidir.
 */
import { describe, expect, it } from 'vitest';
import { GameState } from '@/core/GameState';
import { SAVE_VERSION } from '@/config/Constants';
import { makeWorld } from './helpers';

/** Merkezdeki temizlenmis alan her zaman insa edilebilir. */
function startArea(state: GameState) {
  return state.grid.center();
}

describe('baslangic durumu', () => {
  it('varsayilan kaynaklarla baslar', () => {
    const { state } = makeWorld();
    expect(state.resources).toEqual({ food: 150, wood: 220, stone: 140, gold: 60 });
  });

  it('taban depo kapasitesi 500', () => {
    const { resources } = makeWorld();
    expect(resources.capacity).toBe(500);
  });
});

describe('zemin uretimi deterministik', () => {
  it('ayni seed ayni haritayi verir', () => {
    const a = new GameState(777);
    const b = new GameState(777);
    const terrainA = a.grid.allTiles().map((t) => t.terrain).join(',');
    const terrainB = b.grid.allTiles().map((t) => t.terrain).join(',');
    expect(terrainA).toBe(terrainB);
  });

  it('farkli seed farkli harita verir', () => {
    const a = new GameState(1).grid.allTiles().map((t) => t.terrain).join(',');
    const b = new GameState(2).grid.allTiles().map((t) => t.terrain).join(',');
    expect(a).not.toBe(b);
  });

  it('merkez alan insaya acik cimendir', () => {
    const state = new GameState(42);
    const c = state.grid.center();
    expect(state.grid.getTile(c.gx, c.gy)?.terrain).toBe('grass');
  });
});

describe('yerlestirme kurallari', () => {
  it('gecerli yere bina kurar ve maliyeti duser', () => {
    const { state, buildings } = makeWorld();
    const c = startArea(state);
    const before = { ...state.resources };
    const result = buildings.place('house', c.gx, c.gy);

    expect(result.ok).toBe(true);
    expect(state.resources.wood).toBe(before.wood - 40);
    expect(state.resources.stone).toBe(before.stone - 10);
  });

  it('dolu karoyu reddeder', () => {
    const { state, buildings } = makeWorld();
    const c = startArea(state);
    buildings.place('house', c.gx, c.gy);
    const second = buildings.place('house', c.gx, c.gy);
    expect(second).toEqual({ ok: false, reason: 'occupied' });
  });

  it('izgara disini reddeder', () => {
    const { buildings } = makeWorld();
    expect(buildings.place('house', 999, 999)).toEqual({ ok: false, reason: 'out_of_bounds' });
  });

  it('maxCount sinirini uygular', () => {
    const { state, buildings } = makeWorld();
    const c = startArea(state);
    expect(buildings.place('town_hall', c.gx - 2, c.gy - 2).ok).toBe(true);
    expect(buildings.place('town_hall', c.gx, c.gy)).toEqual({ ok: false, reason: 'max_count' });
  });

  it('yetersiz kaynagi reddeder ve hicbir sey harcamaz', () => {
    const { state, buildings } = makeWorld();
    const c = startArea(state);
    const drained = new GameState(1);
    void drained;
    // Kaynaklari tuket
    while (buildings.place('house', c.gx + 1, c.gy + 1).ok) break;
    const poor = makeWorld();
    const pc = startArea(poor.state);
    poor.resources.spend({ wood: 220, stone: 140 });
    const before = { ...poor.state.resources };
    expect(poor.buildings.place('house', pc.gx, pc.gy)).toEqual({ ok: false, reason: 'cost' });
    expect(poor.state.resources).toEqual(before);
  });

  it('yikim maliyetin yarisini iade eder', () => {
    const { state, buildings } = makeWorld();
    const c = startArea(state);
    const placed = buildings.place('house', c.gx, c.gy);
    if (!placed.ok) throw new Error('kurulum basarisiz');
    const before = state.resources.wood;
    buildings.demolish(placed.building.uid);
    expect(state.resources.wood).toBe(before + 20);
  });
});

describe('ekonomi matematigi', () => {
  /**
   * DENGEDEKI sehir. Sprint 3'te nufus gercek bir kaynak oldugu icin bu
   * denge artik ANINDA olusmuyor: binalar bitse bile vatandaslarin gelmesi
   * gerekiyor. Bu yuzden olcum, nufus kapasiteye oturduktan sonra alinir.
   * Buyume asamasindaki davranis sprint3 testlerinde.
   */
  it('sehir merkezi + ev + ciftlik: bilinen denge', () => {
    const { state, buildings, economy, simulation } = makeWorld();
    const c = startArea(state);
    buildings.place('town_hall', c.gx - 2, c.gy - 2);
    buildings.place('house', c.gx, c.gy);
    buildings.place('farm', c.gx + 1, c.gy);

    simulation.advanceSeconds(400); // insaatlar bitsin ve nufus dolsun
    const snap = economy.snapshot;

    expect(snap.populationCapacity).toBe(9); // 4 (merkez) + 5 (ev)
    expect(snap.population).toBe(9); // kapasite dolmus
    expect(snap.populationUsed).toBe(2); // ciftlik 2 isci; kalan 7 issiz
    expect(snap.efficiency).toBe(1);
    expect(snap.storageCapacity).toBe(750); // 500 taban + 250 merkez
    // 6 uretim - 9 vatandas * 0.4 gider. Gider artik CALISANA degil,
    // sehirde YASAYAN herkese uygulanir.
    expect(snap.netPerMinute.food).toBeCloseTo(2.4, 5);
    expect(snap.netPerMinute.gold).toBeCloseTo(2, 5);
  });

  it('bir dakikalik ilerleme snapshot ile birebir ortusur', () => {
    const { state, buildings, economy, simulation } = makeWorld();
    const c = startArea(state);
    buildings.place('farm', c.gx, c.gy);
    simulation.advanceSeconds(20);

    const before = { ...state.resources };
    simulation.advanceSeconds(60);
    const snap = economy.snapshot;
    expect(state.resources.food - before.food).toBeCloseTo(snap.netPerMinute.food, 5);
  });

  it('isci acigi verimi orantili dusurur', () => {
    const { state, buildings, economy, simulation } = makeWorld();
    const c = startArea(state);
    // Ev yok: nufus kapasitesi 0, ciftlik 2 isci istiyor
    buildings.place('farm', c.gx, c.gy);
    simulation.advanceSeconds(20);
    expect(economy.snapshot.efficiency).toBe(0);
  });

  it('depo tavani asilmaz', () => {
    const { state, resources } = makeWorld();
    resources.add({ wood: 10_000 });
    expect(state.resources.wood).toBe(resources.capacity);
  });
});

describe('kayit gidis-donusu', () => {
  it('bina ve kaynaklar korunur', () => {
    const { state, buildings, simulation } = makeWorld(31337);
    const c = startArea(state);
    buildings.place('house', c.gx, c.gy);
    buildings.place('farm', c.gx + 1, c.gy);
    simulation.advanceSeconds(30);

    const save = state.toSave(SAVE_VERSION);
    const restored = GameState.fromSave(save);

    expect(restored.buildings.size).toBe(2);
    expect(restored.resources).toEqual(state.resources);
    expect(restored.grid.seed).toBe(state.grid.seed);
    // Ayni seed => ayni zemin
    expect(restored.grid.allTiles().map((t) => t.terrain).join(',')).toBe(
      state.grid.allTiles().map((t) => t.terrain).join(','),
    );
  });

  it('yuklenen binalar izgarayi tekrar isgal eder', () => {
    const { state, buildings } = makeWorld();
    const c = startArea(state);
    const placed = buildings.place('house', c.gx, c.gy);
    if (!placed.ok) throw new Error('kurulum basarisiz');

    const restored = GameState.fromSave(state.toSave(SAVE_VERSION));
    expect(restored.grid.getTile(c.gx, c.gy)?.occupantUid).toBe(placed.building.uid);
  });
});
