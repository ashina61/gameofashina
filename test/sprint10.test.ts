/**
 * Sprint 10 - sehir navigasyonu ve mekansal okunabilirlik.
 *
 * Sprint 9'da hareket GERCEKTI ama sehrin bir sekli oldugunu bilmiyordu:
 * isci binalarin icinden, gerekirse sudan geciyordu. Buradaki testler
 * gezilebilirlik modelini, BFS'in deterministikligini ve iscinin artik
 * engellerin ETRAFINDAN dolastigini kilitler.
 */
import { describe, expect, it } from 'vitest';
import { GameState } from '@/core/GameState';
import { GridMap } from '@/core/GridMap';
import { migrateAndSanitize } from '@/core/SaveManager';
import { SAVE_VERSION, WORKER_SPEED } from '@/config/Constants';
import { getBuilding } from '@/config/BuildingCatalog';
import { gridToWorld, worldToGrid } from '@/utils/IsoUtils';
import {
  NEIGHBOR_ORDER,
  NavigationSystem,
  WALKABLE_TERRAIN,
  isWalkableTile,
  toWaypoints,
} from '@/systems/NavigationSystem';
import { workAnchorFor, workerPosition } from '@/systems/WorkerAnchor';
import { makeWorld, settleWalks, wrap } from './helpers';
import type { TestWorld } from './helpers';
import type { BuildingId, BuildingInstance, GridPoint } from '@/types';

/** Tamamen duz, engelsiz bir harita uzerinde navigasyon. */
function openMap(size = 8): { grid: GridMap; nav: NavigationSystem } {
  const grid = new GridMap(1, size);
  for (const tile of grid.allTiles()) {
    tile.terrain = 'grass';
    tile.occupantUid = null;
  }
  return { grid, nav: new NavigationSystem(grid) };
}

/** Verilen turu kurulabilecek ilk noktaya kurar. */
function place(world: TestWorld, type: BuildingId): BuildingInstance {
  for (const tile of world.state.grid.allTiles()) {
    for (const key of ['wood', 'stone', 'gold'] as const) world.state.setResource(key, 99_999);
    world.state.setResource('food', 450);
    const result = world.buildings.place(type, tile.gx, tile.gy);
    if (result.ok) return result.building;
  }
  throw new Error(`${type} icin uygun yer bulunamadi`);
}

/** Konut + uretim binasi olan, nufusu oturmus bir sehir. */
function cityWith(type: BuildingId): { world: TestWorld; target: BuildingInstance } {
  const world = makeWorld();
  place(world, 'house');
  place(world, 'house');
  const target = place(world, type);
  world.simulation.advance(900);
  return { world, target };
}

/** Kaydi gocurur; reddedilirse testi aciklamayla durdurur. */
function loadOrThrow(save: unknown) {
  const migrated = migrateAndSanitize(save);
  if (!migrated) throw new Error('kayit reddedildi');
  return migrated;
}

/** Bir iscinin rotasindaki tum ara noktalarin karolarini toplar. */
function tilesWalked(world: TestWorld, id: string, limit = 200): GridPoint[] {
  const seen: GridPoint[] = [];
  for (let i = 0; i < limit; i += 1) {
    const worker = world.state.workers.find((w) => w.id === id);
    if (!worker) break;
    const at = workerPosition(worker);
    seen.push(worldToGrid(at.x, at.y));
    if (worker.state !== 'moving') break;
    world.workforce.advance(1);
  }
  return seen;
}

describe('gezilebilirlik', () => {
  it('cimen, toprak ve kaya yurunebilir; kaya tas ocagina gitmek icin sart', () => {
    expect([...WALKABLE_TERRAIN].sort()).toEqual(['grass', 'rock', 'soil']);
  });

  it('duz zemin true doner', () => {
    const { nav } = openMap();
    expect(nav.isWalkable(3, 3)).toBe(true);
  });

  it('su false doner', () => {
    const { grid, nav } = openMap();
    const tile = grid.getTile(2, 2);
    if (!tile) throw new Error('karo yok');
    tile.terrain = 'water';
    expect(nav.isWalkable(2, 2)).toBe(false);
    expect(isWalkableTile(tile)).toBe(false);
  });

  it('harita siniri false doner - dort kenar da', () => {
    const { nav } = openMap(8);
    expect(nav.isWalkable(-1, 3)).toBe(false); // sol
    expect(nav.isWalkable(8, 3)).toBe(false); // sag
    expect(nav.isWalkable(3, -1)).toBe(false); // ust
    expect(nav.isWalkable(3, 8)).toBe(false); // alt
  });

  it('binanin ayak izi kapali, yikilinca yeniden acilir', () => {
    const world = makeWorld();
    const quarry = place(world, 'quarry');
    const size = getBuilding(quarry.type).size;

    for (let dy = 0; dy < size; dy += 1) {
      for (let dx = 0; dx < size; dx += 1) {
        expect(world.navigation.isWalkable(quarry.gx + dx, quarry.gy + dy)).toBe(false);
      }
    }

    world.buildings.demolish(quarry.uid);

    for (let dy = 0; dy < size; dy += 1) {
      for (let dx = 0; dx < size; dx += 1) {
        expect(world.navigation.isWalkable(quarry.gx + dx, quarry.gy + dy)).toBe(true);
      }
    }
  });

  it('gezilebilirlik GORSEL sinirdan degil AYAK IZINDEN turer', () => {
    const world = makeWorld();
    const camp = place(world, 'lumber_camp');
    const size = getBuilding(camp.type).size;
    // Ayak izinin hemen disindaki karo, bina kocaman cizilse de aciktir.
    expect(world.navigation.isWalkable(camp.gx + size, camp.gy + size)).toBe(
      world.state.grid.getTile(camp.gx + size, camp.gy + size) !== null &&
        isWalkableTile(world.state.grid.getTile(camp.gx + size, camp.gy + size)),
    );
  });
});

describe('rota bulma (BFS)', () => {
  it('acik arazide rota bulur ve iki ucu da icerir', () => {
    const { nav } = openMap();
    const path = nav.findPath({ gx: 1, gy: 1 }, { gx: 5, gy: 4 });
    expect(path.length).toBeGreaterThan(1);
    expect(path[0]).toEqual({ gx: 1, gy: 1 });
    expect(path[path.length - 1]).toEqual({ gx: 5, gy: 4 });
  });

  it('rota bitisik karolardan olusur - atlama yok', () => {
    const { nav } = openMap();
    const path = nav.findPath({ gx: 0, gy: 0 }, { gx: 6, gy: 6 });
    for (let i = 1; i < path.length; i += 1) {
      const step = Math.abs(path[i].gx - path[i - 1].gx) + Math.abs(path[i].gy - path[i - 1].gy);
      expect(step).toBe(1);
    }
  });

  it('kapali karodan gecmez', () => {
    const { grid, nav } = openMap();
    // (3, *) sutununu tek bir acikligi kalacak sekilde duvara cevir.
    for (let gy = 0; gy < 7; gy += 1) {
      const tile = grid.getTile(3, gy);
      if (tile) tile.occupantUid = 'duvar';
    }
    const path = nav.findPath({ gx: 1, gy: 1 }, { gx: 5, gy: 1 });

    expect(path.length).toBeGreaterThan(0);
    for (const cell of path) expect(cell.gx === 3 && cell.gy < 7).toBe(false);
  });

  it('sudan gecmez', () => {
    const { grid, nav } = openMap();
    for (let gy = 0; gy < 7; gy += 1) {
      const tile = grid.getTile(4, gy);
      if (tile) tile.terrain = 'water';
    }
    const path = nav.findPath({ gx: 2, gy: 2 }, { gx: 6, gy: 2 });
    expect(path.length).toBeGreaterThan(0);
    for (const cell of path) {
      expect(grid.getTile(cell.gx, cell.gy)?.terrain).not.toBe('water');
    }
  });

  it('harita disina cikmaz', () => {
    const { nav } = openMap(6);
    const path = nav.findPath({ gx: 0, gy: 0 }, { gx: 5, gy: 5 });
    for (const cell of path) {
      expect(cell.gx).toBeGreaterThanOrEqual(0);
      expect(cell.gy).toBeGreaterThanOrEqual(0);
      expect(cell.gx).toBeLessThan(6);
      expect(cell.gy).toBeLessThan(6);
    }
  });

  it('sinir disi baslangic veya hedef BOS rota verir - cokmez', () => {
    const { nav } = openMap(6);
    expect(nav.findPath({ gx: -1, gy: 0 }, { gx: 2, gy: 2 })).toEqual([]);
    expect(nav.findPath({ gx: 2, gy: 2 }, { gx: 99, gy: 99 })).toEqual([]);
  });

  it('ayni girdi HER ZAMAN ayni rotayi verir', () => {
    const { nav } = openMap();
    const first = nav.findPath({ gx: 0, gy: 0 }, { gx: 7, gy: 7 });
    const second = nav.findPath({ gx: 0, gy: 0 }, { gx: 7, gy: 7 });
    expect(second).toEqual(first);
  });

  it('komsu sirasi sabit ve belgelenmis: yukari, saga, asagi, sola', () => {
    expect(NEIGHBOR_ORDER).toEqual([
      { gx: 0, gy: -1 },
      { gx: 1, gy: 0 },
      { gx: 0, gy: 1 },
      { gx: -1, gy: 0 },
    ]);
    const { nav } = openMap();
    expect(nav.getNeighbors(3, 3)).toEqual([
      { gx: 3, gy: 2 },
      { gx: 4, gy: 3 },
      { gx: 3, gy: 4 },
      { gx: 2, gy: 3 },
    ]);
  });

  it('rota yoksa BOS dizi doner - sonsuz donguye girmez', () => {
    const { grid, nav } = openMap();
    // (5,5) karosunu tamamen suyla cevrele.
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const tile = grid.getTile(5 + dx, 5 + dy);
      if (tile) tile.terrain = 'water';
    }
    expect(nav.findPath({ gx: 1, gy: 1 }, { gx: 5, gy: 5 })).toEqual([]);
  });

  it('en yakin acik karo deterministik secilir', () => {
    const { grid, nav } = openMap();
    const blocked = grid.getTile(4, 4);
    if (!blocked) throw new Error('karo yok');
    blocked.occupantUid = 'bina';

    const first = nav.nearestWalkable(4, 4);
    const second = nav.nearestWalkable(4, 4);
    expect(first).not.toBeNull();
    expect(second).toEqual(first);
    expect(nav.isWalkable(first?.gx ?? -1, first?.gy ?? -1)).toBe(true);
  });

  it('ara noktalar duz giden parcalari birlestirir', () => {
    const straight = toWaypoints([
      { gx: 0, gy: 0 },
      { gx: 1, gy: 0 },
      { gx: 2, gy: 0 },
      { gx: 3, gy: 0 },
    ]);
    expect(straight).toEqual([gridToWorld(0, 0), gridToWorld(3, 0)]);
  });
});

describe('isci hedefi', () => {
  it('isci binanin ayak izine ASLA girmez', () => {
    const { world, target } = cityWith('quarry');
    const size = getBuilding(target.type).size;
    const result = world.workforce.assign(target.uid);
    if (!result.ok) throw new Error('atama reddedildi');

    const inside = (cell: GridPoint): boolean =>
      cell.gx >= target.gx && cell.gx < target.gx + size &&
      cell.gy >= target.gy && cell.gy < target.gy + size;

    for (const cell of tilesWalked(world, result.worker.id)) {
      expect(inside(cell)).toBe(false);
    }
  });

  it('isci duruş noktasina varir ve calismaya baslar', () => {
    const { world, target } = cityWith('lumber_camp');
    const result = world.workforce.assign(target.uid);
    if (!result.ok) throw new Error('atama reddedildi');

    settleWalks(world);
    const anchor = workAnchorFor(target, result.worker.slot);
    const at = workerPosition(result.worker);

    expect(result.worker.state).toBe('working');
    expect(at.x).toBeCloseTo(anchor.x, 6);
    expect(at.y).toBeCloseTo(anchor.y, 6);
    expect(target.assignedWorkers).toBe(1);
  });

  it('calisma ancak VARISTAN sonra baslar - rota kurulmasi yetmez', () => {
    const { world, target } = cityWith('quarry');
    const result = world.workforce.assign(target.uid);
    if (!result.ok) throw new Error('atama reddedildi');

    expect(result.worker.state).toBe('moving');
    expect(target.assignedWorkers).toBe(0);
    world.workforce.advance(1);
    // Rota var ama isci hala yolda olabilir; varmadan uretim yok.
    if (result.worker.state === 'moving') expect(target.assignedWorkers).toBe(0);
  });

  it('isci engelin ETRAFINDAN dolasir - duz cizgi degil', () => {
    const world = makeWorld();
    const center = world.state.grid.center();

    // Meydan ile hedef arasina bir duvar or.
    for (let dx = -3; dx <= 3; dx += 1) {
      const tile = world.state.grid.getTile(center.gx + dx, center.gy + 3);
      if (tile) tile.occupantUid = 'duvar#1';
    }

    const nav = world.navigation;
    const path = nav.findPath({ gx: center.gx, gy: center.gy }, { gx: center.gx, gy: center.gy + 4 });
    expect(path.length).toBeGreaterThan(0);
    // Duz cizgi 5 karo olurdu; duvari dolasmak daha uzun surer.
    expect(path.length).toBeGreaterThan(5);
    // Duvarin HICBIR karosuna basilmamis olmali (duvarin ucundan dolasmak serbest).
    for (const cell of path) {
      const inWall =
        cell.gy === center.gy + 3 && cell.gx >= center.gx - 3 && cell.gx <= center.gx + 3;
      expect(inWall).toBe(false);
    }
  });

  it('duruş yerleri rota eklenince de KORUNUR', () => {
    const { world, target } = cityWith('quarry');
    for (let i = 0; i < 4; i += 1) world.workforce.assign(target.uid);
    settleWalks(world);

    const crew = world.state.workers.filter((w) => w.buildingUid === target.uid);
    expect(crew.length).toBeGreaterThan(1);
    expect(new Set(crew.map((w) => w.slot)).size).toBe(crew.length);
    expect(new Set(crew.map((w) => `${w.toX.toFixed(3)},${w.toY.toFixed(3)}`)).size).toBe(crew.length);
  });
});

describe('mesafe', () => {
  it('rota suresi ARA NOKTALARDAN hesaplanir - kus ucusu degil', () => {
    const world = makeWorld();
    const center = world.state.grid.center();
    for (let dx = -3; dx <= 3; dx += 1) {
      const tile = world.state.grid.getTile(center.gx + dx, center.gy + 2);
      if (tile) tile.occupantUid = 'duvar#1';
    }
    place(world, 'house');
    world.simulation.advance(900);

    /*
     * Duvarin ARKASINDA, yapi alani olan bir ciftlik yeri bulunur.
     * Sprint 12'den beri bina sabit koordinata degil yapi alanina kurulur.
     */
    let farm: BuildingInstance | null = null;
    for (const plot of world.plots.plots) {
      if (farm) break;
      if (plot.gy <= center.gy + 2) continue; // duvarin onunde kalmasin
      if (!world.plots.accepts(plot, 'farm') || !world.plots.isFree(plot)) continue;
      const r = world.buildings.place('farm', plot.gx, plot.gy);
      if (r.ok) farm = r.building;
    }
    if (!farm) throw new Error('ciftlik kurulamadi');
    world.simulation.advance(400);

    const result = world.workforce.assign(farm.uid);
    if (!result.ok) throw new Error('atama reddedildi');

    // Toplam sure, ilk bacagin suresinden fazladir: rota cok bacakli.
    const legs = world.workforce.remainingWaypoints(result.worker.id);
    expect(legs).toBeGreaterThan(1);
  });

  it('uzun rota kisa rotadan daha uzun surer', () => {
    const { nav } = openMap(10);
    const short = nav.findPath({ gx: 1, gy: 1 }, { gx: 3, gy: 1 });
    const long = nav.findPath({ gx: 1, gy: 1 }, { gx: 9, gy: 9 });
    expect(long.length).toBeGreaterThan(short.length);
  });
});

describe('geri donus ve yeniden yonlendirme', () => {
  it('calisan isci gecerli bir rota uzerinden doner', () => {
    const { world, target } = cityWith('lumber_camp');
    world.workforce.assign(target.uid);
    settleWalks(world);

    const result = world.workforce.release(target.uid);
    if (!result.ok) throw new Error('geri alma reddedildi');
    expect(result.worker.state).toBe('moving');

    for (const cell of tilesWalked(world, result.worker.id)) {
      expect(world.navigation.isWalkable(cell.gx, cell.gy)).toBe(true);
    }
    expect(result.worker.state).toBe('idle');
  });

  it('yoldaki isci BULUNDUGU yerden yeniden yonlendirilir', () => {
    const { world, target } = cityWith('quarry');
    const result = world.workforce.assign(target.uid);
    if (!result.ok) throw new Error('atama reddedildi');
    world.workforce.advance(1);
    const midway = workerPosition(result.worker);

    world.workforce.release(target.uid);

    expect(result.worker.fromX).toBeCloseTo(midway.x, 6);
    expect(result.worker.fromY).toBeCloseTo(midway.y, 6);
    expect(result.worker.buildingUid).toBeNull();
  });

  it('yeniden yonlendirme sirasinda ISINLAMA olmaz', () => {
    const { world, target } = cityWith('quarry');
    const result = world.workforce.assign(target.uid);
    if (!result.ok) throw new Error('atama reddedildi');
    world.workforce.advance(1);

    const before = workerPosition(result.worker);
    world.workforce.release(target.uid);
    const after = workerPosition(result.worker);

    expect(Math.hypot(after.x - before.x, after.y - before.y)).toBeLessThan(0.001);
  });

  it('bina kurulunca yoldaki isciler yeniden yonlendirilir', () => {
    const { world, target } = cityWith('lumber_camp');
    const result = world.workforce.assign(target.uid);
    if (!result.ok) throw new Error('atama reddedildi');
    world.workforce.advance(1);

    const before = world.workforce.pathQueryCount;
    place(world, 'house'); // building:placed -> reroute
    expect(world.workforce.pathQueryCount).toBeGreaterThan(before);
    expect(result.worker.state).toBe('moving');
  });
});

describe('gecersiz hedef ve rotasizlik', () => {
  it('ulasilamayan binaya atama REDDEDILIR - isci yarida kalmaz', () => {
    const world = makeWorld();
    place(world, 'house');
    world.simulation.advance(900);

    const farm = place(world, 'farm');
    world.simulation.advance(400); // insaat bitsin, yoksa 'not_operational' doner
    expect(farm.state).toBe('active');

    const size = getBuilding(farm.type).size;
    // Ciftligi tamamen suyla cevrele: hicbir acik komsu kalmasin.
    for (let dy = -1; dy <= size; dy += 1) {
      for (let dx = -1; dx <= size; dx += 1) {
        if (dx >= 0 && dx < size && dy >= 0 && dy < size) continue;
        const tile = world.state.grid.getTile(farm.gx + dx, farm.gy + dy);
        if (tile) tile.terrain = 'water';
      }
    }

    const result = world.workforce.assign(farm.uid);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe('unreachable');
    // Sahipsiz atama kalmamali.
    expect(world.workforce.claimedBy(farm.uid)).toBe(0);
    expect(farm.assignedWorkers).toBe(0);
  });

  it('yikilan bina hedefi gecersiz kilar; isci guvenle ayrilir', () => {
    const { world, target } = cityWith('lumber_camp');
    world.workforce.assign(target.uid);
    world.workforce.assign(target.uid);
    settleWalks(world);

    world.buildings.demolish(target.uid);

    expect(world.workforce.claimedBy(target.uid)).toBe(0);
    for (const worker of world.state.workers) expect(worker.buildingUid).toBeNull();

    settleWalks(world);
    expect(world.workforce.idleCount).toBe(world.state.workers.length);
  });

  it('gecersiz hedeften uretim devam etmez', () => {
    const { world, target } = cityWith('lumber_camp');
    world.workforce.assign(target.uid);
    settleWalks(world);

    world.state.setBuildingState(target.uid, 'disabled');
    world.workforce.reconcile();

    expect(world.buildings.resolve(target).effectiveProduction.wood ?? 0).toBe(0);
    expect(world.workforce.claimedBy(target.uid)).toBe(0);
  });
});

describe('kayit / yukleme', () => {
  it('surum artmadi; v3 kaydi hala yukleniyor', () => {
    const { world, target } = cityWith('lumber_camp');
    world.workforce.assign(target.uid);
    settleWalks(world);

    const save = world.state.toSave(SAVE_VERSION);
    expect(save.version).toBe(3);
    expect(migrateAndSanitize(save)).not.toBeNull();
  });

  it('rota KAYDA yazilmaz - turetilmis veridir', () => {
    const { world, target } = cityWith('quarry');
    world.workforce.assign(target.uid);

    const save = world.state.toSave(SAVE_VERSION);
    for (const worker of save.workers) {
      expect(Object.keys(worker).sort()).toEqual(
        ['buildingUid', 'fromX', 'fromY', 'id', 'slot', 'state', 'toX', 'toY', 'travelLeft', 'travelTicks'].sort(),
      );
    }
  });

  it('yuklemeden sonra konum korunur ve rota yeniden uretilir', () => {
    const { world, target } = cityWith('quarry');
    const result = world.workforce.assign(target.uid);
    if (!result.ok) throw new Error('atama reddedildi');
    world.workforce.advance(1);
    const before = workerPosition(result.worker);
    const id = result.worker.id;

    const loaded = wrap(GameState.fromSave(loadOrThrow(world.state.toSave(SAVE_VERSION))));
    const after = loaded.state.workers.find((w) => w.id === id);
    if (!after) throw new Error('isci kaybedildi');

    expect(after.state).toBe('moving');
    expect(workerPosition(after)).toEqual(before);
    // Kuyruk yeniden kuruldu: isci hedefine ulasabiliyor.
    settleWalks(loaded);
    expect(after.state).toBe('working');
  });

  it('yuklemeden sonra isci yine binanin icinden gecmez', () => {
    const { world, target } = cityWith('quarry');
    const result = world.workforce.assign(target.uid);
    if (!result.ok) throw new Error('atama reddedildi');
    world.workforce.advance(1);

    const loaded = wrap(GameState.fromSave(loadOrThrow(world.state.toSave(SAVE_VERSION))));
    const size = getBuilding(target.type).size;
    for (const cell of tilesWalked(loaded, result.worker.id)) {
      const inside =
        cell.gx >= target.gx && cell.gx < target.gx + size &&
        cell.gy >= target.gy && cell.gy < target.gy + size;
      expect(inside).toBe(false);
    }
  });
});

describe('hareket surekliligi', () => {
  it('tik basina atilan adim WORKER_SPEED sinirini ASMAZ - cok bacakli rotada da', () => {
    const { world, target } = cityWith('quarry');
    const result = world.workforce.assign(target.uid);
    if (!result.ok) throw new Error('atama reddedildi');

    let previous = workerPosition(result.worker);
    for (let i = 0; i < 60; i += 1) {
      if (result.worker.state !== 'moving') break;
      world.workforce.advance(1);
      const at = workerPosition(result.worker);
      // Bacak degisimi de bir adimdir; sinir onun icin de gecerlidir.
      expect(Math.hypot(at.x - previous.x, at.y - previous.y)).toBeLessThanOrEqual(WORKER_SPEED + 1e-9);
      previous = at;
    }
    expect(result.worker.state).toBe('working');
  });

  it('toplu ilerletme adim adim ilerletmeyle AYNI sonucu verir - cok bacakli rotada', () => {
    const bulk = cityWith('quarry');
    const step = cityWith('quarry');
    bulk.world.workforce.assign(bulk.target.uid);
    step.world.workforce.assign(step.target.uid);

    bulk.world.workforce.advance(5);
    for (let i = 0; i < 5; i += 1) step.world.workforce.advance(1);

    const shape = (w: TestWorld) =>
      w.state.workers
        .map((x) => `${x.state}:${x.travelLeft}/${x.travelTicks}:${x.toX.toFixed(3)},${x.toY.toFixed(3)}`)
        .join('|');
    expect(shape(bulk.world)).toBe(shape(step.world));
  });
});

describe('olcek', () => {
  it('ilerletme rota HESAPLAMAZ - yalnizca kurulmus rotayi tuketir', () => {
    const { world, target } = cityWith('quarry');
    for (let i = 0; i < 4; i += 1) world.workforce.assign(target.uid);

    const afterAssign = world.workforce.pathQueryCount;
    for (let i = 0; i < 40; i += 1) world.workforce.advance(1);

    expect(world.workforce.pathQueryCount).toBe(afterAssign);
  });

  it('rota hesabi atama basina SABIT sayida - kacak uretim yok', () => {
    const { world, target } = cityWith('quarry');
    const before = world.workforce.pathQueryCount;
    world.workforce.assign(target.uid);
    expect(world.workforce.pathQueryCount).toBe(before + 1);
  });

  it('120 isci ilerletmek rota hesabi tetiklemez', () => {
    const world = makeWorld();
    place(world, 'house');
    world.state.setPopulation(120, 0);
    world.workforce.reconcile();
    expect(world.state.workers.length).toBe(120);

    const before = world.workforce.pathQueryCount;
    for (let i = 0; i < 30; i += 1) world.workforce.advance(1);
    expect(world.workforce.pathQueryCount).toBe(before);
  });
});
