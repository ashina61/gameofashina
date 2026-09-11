/**
 * Sprint 9 - isci yasam dongusu ve gercek mesafeye dayali hareket.
 *
 * Sprint 8'de yolculuk SABIT dort tikti ve geri alinan isci aninda bosa
 * geciyordu - yani ISINLANIYORDU. Buradaki testler yeni sozlesmeyi kilitler:
 * her gecis yurunur, sure mesafeden turer, ayni binadaki isciler ayri
 * noktalarda durur ve hicbiri binanin icinde kalmaz.
 */
import { describe, expect, it } from 'vitest';
import { GameState } from '@/core/GameState';
import { migrateAndSanitize } from '@/core/SaveManager';
import { SAVE_VERSION, TILE_HEIGHT, WORKER_SPEED } from '@/config/Constants';
import { getBuilding } from '@/config/BuildingCatalog';
import { gridToWorld } from '@/utils/IsoUtils';
import {
  idleAnchorFor,
  plazaFor,
  travelTicksFor,
  workAnchorFor,
  workerPosition,
} from '@/systems/WorkerAnchor';
import { makeWorld, settleWalks, wrap } from './helpers';
import type { TestWorld } from './helpers';
import type { BuildingId, BuildingInstance } from '@/types';

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

/** Bir iscinin kaydini id ile bulur. */
function workerById(world: TestWorld, id: string) {
  const worker = world.state.workers.find((w) => w.id === id);
  if (!worker) throw new Error(`isci bulunamadi: ${id}`);
  return worker;
}

describe('yasam dongusu: ise gidis', () => {
  it('atanan isci YURUMEYE baslar - isinlanmaz', () => {
    const { world, target } = cityWith('lumber_camp');
    const result = world.workforce.assign(target.uid);
    if (!result.ok) throw new Error('atama reddedildi');

    const worker = result.worker;
    expect(worker.state).toBe('moving');
    expect(worker.travelTicks).toBeGreaterThan(0);
    expect(worker.travelLeft).toBe(worker.travelTicks);
    // Bacagin iki ucu farkli: gercekten bir yol var.
    expect(Math.hypot(worker.toX - worker.fromX, worker.toY - worker.fromY)).toBeGreaterThan(0);
  });

  it('yolun ortasinda konum iki uc arasindadir', () => {
    const { world, target } = cityWith('quarry');
    const result = world.workforce.assign(target.uid);
    if (!result.ok) throw new Error('atama reddedildi');
    const worker = result.worker;

    const start = workerPosition(worker);
    world.workforce.advance(1);
    const mid = workerPosition(worker);

    // Yola cikti ama daha varmadi.
    expect(mid.x).not.toBe(start.x);
    expect(worker.state).toBe('moving');
    const toStart = Math.hypot(mid.x - worker.fromX, mid.y - worker.fromY);
    const toEnd = Math.hypot(worker.toX - mid.x, worker.toY - mid.y);
    const full = Math.hypot(worker.toX - worker.fromX, worker.toY - worker.fromY);
    expect(toStart + toEnd).toBeCloseTo(full, 6);
  });

  it('varinca calismaya baslar ve kadroya sayilir', () => {
    const { world, target } = cityWith('lumber_camp');
    const result = world.workforce.assign(target.uid);
    if (!result.ok) throw new Error('atama reddedildi');

    expect(target.assignedWorkers).toBe(0);
    settleWalks(world);

    expect(result.worker.state).toBe('working');
    expect(result.worker.travelLeft).toBe(0);
    expect(target.assignedWorkers).toBe(1);
  });

  it('yoldaki isci URETMEZ ama yerini tutar', () => {
    const { world, target } = cityWith('lumber_camp');
    world.workforce.assign(target.uid);

    expect(world.workforce.claimedBy(target.uid)).toBe(1); // yer dolu
    expect(target.assignedWorkers).toBe(0); // uretim yok
    expect(world.buildings.resolve(target).effectiveProduction.wood ?? 0).toBe(0);
  });
});

describe('mesafeye dayali sure', () => {
  it('iki kat uzaga giden kabaca iki kat uzun yurur', () => {
    const origin = { x: 0, y: 0 };
    const near = travelTicksFor(origin, { x: 240, y: 0 });
    const far = travelTicksFor(origin, { x: 480, y: 0 });
    expect(far).toBe(near * 2);
  });

  it('sure hiza gore olceklenir', () => {
    expect(travelTicksFor({ x: 0, y: 0 }, { x: WORKER_SPEED * 3, y: 0 })).toBe(3);
  });

  it('sifir mesafe guvenli: en az bir tik, isinlanma yok', () => {
    expect(travelTicksFor({ x: 10, y: 10 }, { x: 10, y: 10 })).toBe(1);
    expect(travelTicksFor({ x: 0, y: 0 }, { x: Number.NaN, y: 0 })).toBe(1);
  });

  it('uzaktaki bina yakindakinden DAHA GEC kadro doldurur', () => {
    const world = makeWorld();
    const plaza = plazaFor(world.state.grid.center());

    // Ayni turden iki bina: biri meydana yakin, digeri uzak.
    const all = [...world.state.grid.allTiles()];
    const sorted = all
      .map((t) => ({ t, d: Math.hypot(gridToWorld(t.gx, t.gy).x - plaza.x, gridToWorld(t.gx, t.gy).y - plaza.y) }))
      .sort((a, b) => a.d - b.d);

    for (const key of ['wood', 'stone', 'gold'] as const) world.state.setResource(key, 99_999);
    world.state.setResource('food', 450);

    let near: BuildingInstance | null = null;
    let far: BuildingInstance | null = null;
    for (const { t } of sorted) {
      if (near) break;
      const r = world.buildings.place('farm', t.gx, t.gy);
      if (r.ok) near = r.building;
    }
    for (const { t } of [...sorted].reverse()) {
      if (far) break;
      const r = world.buildings.place('farm', t.gx, t.gy);
      if (r.ok) far = r.building;
    }
    if (!near || !far) throw new Error('iki ciftlik kurulamadi');

    place(world, 'house');
    world.simulation.advance(900);

    const a = world.workforce.assign(near.uid);
    const b = world.workforce.assign(far.uid);
    if (!a.ok || !b.ok) throw new Error('atama reddedildi');

    expect(b.worker.travelTicks).toBeGreaterThan(a.worker.travelTicks);
  });
});

describe('durus noktasi', () => {
  it('isci binanin ICINDE degil, ON kenarinin disinda durur', () => {
    const world = makeWorld();
    for (const type of ['house', 'farm', 'quarry', 'lumber_camp', 'market', 'town_hall'] as const) {
      const building = place(world, type);
      const size = getBuilding(type).size;
      const center = gridToWorld(building.gx + (size - 1) / 2, building.gy + (size - 1) / 2);
      const frontEdge = center.y + (size * TILE_HEIGHT) / 2;

      for (let slot = 0; slot < 6; slot += 1) {
        const anchor = workAnchorFor(building, slot);
        // Ayak izinin on kosesinden DAHA ONDE: bina siluetinin altinda kalmaz.
        expect(anchor.y).toBeGreaterThan(frontEdge);
      }
    }
  });

  it('ayni binadaki isciler AYRI noktalarda durur', () => {
    const world = makeWorld();
    const quarry = place(world, 'quarry');
    const seen = new Set<string>();
    for (let slot = 0; slot < 6; slot += 1) {
      const anchor = workAnchorFor(quarry, slot);
      seen.add(`${anchor.x.toFixed(3)},${anchor.y.toFixed(3)}`);
    }
    expect(seen.size).toBe(6);
  });

  it('durus noktasi KARARLI: ayni yer her zaman ayni nokta', () => {
    const world = makeWorld();
    const camp = place(world, 'lumber_camp');
    const first = workAnchorFor(camp, 2);
    const second = workAnchorFor(camp, 2);
    expect(second).toEqual(first);
  });

  it('kadro dolunca herkesin yeri farklidir', () => {
    const { world, target } = cityWith('quarry');
    for (let i = 0; i < 4; i += 1) world.workforce.assign(target.uid);
    settleWalks(world);

    const crew = world.state.workers.filter((w) => w.buildingUid === target.uid);
    expect(crew.length).toBeGreaterThan(1);

    const spots = new Set(crew.map((w) => `${w.toX.toFixed(3)},${w.toY.toFixed(3)}`));
    expect(spots.size).toBe(crew.length);
    expect(new Set(crew.map((w) => w.slot)).size).toBe(crew.length);
  });

  it('meydandaki bosta isciler de ust uste binmez', () => {
    const plaza = { x: 0, y: 0 };
    const spots = new Set<string>();
    for (let i = 1; i <= 200; i += 1) {
      const at = idleAnchorFor(`w#${i}`, plaza);
      spots.add(`${at.x.toFixed(4)},${at.y.toFixed(4)}`);
    }
    expect(spots.size).toBe(200);
  });
});

describe('yasam dongusu: geri donus', () => {
  it('calisan isci geri alininca YURUYEREK doner', () => {
    const { world, target } = cityWith('lumber_camp');
    world.workforce.assign(target.uid);
    settleWalks(world);
    expect(target.assignedWorkers).toBe(1);

    const result = world.workforce.release(target.uid);
    if (!result.ok) throw new Error('geri alma reddedildi');

    // Uretim katkisi ANINDA biter, yuruyus sonra.
    expect(target.assignedWorkers).toBe(0);
    expect(result.worker.state).toBe('moving');
    expect(result.worker.buildingUid).toBeNull();
    expect(result.worker.travelLeft).toBeGreaterThan(0);

    settleWalks(world);
    expect(result.worker.state).toBe('idle');
    expect(world.workforce.idleCount).toBeGreaterThan(0);
  });

  it('donen isci meydandaki KENDI yerine varir', () => {
    const { world, target } = cityWith('lumber_camp');
    world.workforce.assign(target.uid);
    settleWalks(world);
    const result = world.workforce.release(target.uid);
    if (!result.ok) throw new Error('geri alma reddedildi');
    settleWalks(world);

    const home = idleAnchorFor(result.worker.id, world.workforce.plazaPoint);
    const at = workerPosition(result.worker);
    expect(at.x).toBeCloseTo(home.x, 6);
    expect(at.y).toBeCloseTo(home.y, 6);
  });

  it('YOLDAKI isci geri alininca bulundugu yerden geri doner', () => {
    const { world, target } = cityWith('quarry');
    const result = world.workforce.assign(target.uid);
    if (!result.ok) throw new Error('atama reddedildi');
    world.workforce.advance(1);
    const midway = workerPosition(result.worker);

    world.workforce.release(target.uid);

    // Yeni bacak, iscinin O ANKI konumundan baslar - basa donmez.
    expect(result.worker.fromX).toBeCloseTo(midway.x, 6);
    expect(result.worker.fromY).toBeCloseTo(midway.y, 6);
    expect(result.worker.buildingUid).toBeNull();

    settleWalks(world);
    expect(result.worker.state).toBe('idle');
  });

  it('geri alinan isci artik URETMEZ', () => {
    const { world, target } = cityWith('lumber_camp');
    world.workforce.assign(target.uid);
    settleWalks(world);
    const withCrew = world.buildings.resolve(target).effectiveProduction.wood ?? 0;
    expect(withCrew).toBeGreaterThan(0);

    world.workforce.release(target.uid);
    expect(world.buildings.resolve(target).effectiveProduction.wood ?? 0).toBe(0);
  });

  it('donmekte olan isci yeniden gorevlendirilebilir', () => {
    const { world, target } = cityWith('lumber_camp');
    world.workforce.assign(target.uid);
    settleWalks(world);
    world.workforce.release(target.uid);
    expect(world.workforce.snapshot.moving).toBe(1);

    // Bosta kimse kalmamis olsa bile donen isci geri cevrilebilmeli.
    const again = world.workforce.assign(target.uid);
    expect(again.ok).toBe(true);
    settleWalks(world);
    expect(target.assignedWorkers).toBeGreaterThan(0);
  });
});

describe('gecersiz hedef', () => {
  it('yikilan bina iscilerini birakir; sahipsiz referans kalmaz', () => {
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

  it('insaata giren bina iscilerini birakir', () => {
    const { world, target } = cityWith('quarry');
    world.workforce.assign(target.uid);
    settleWalks(world);
    expect(target.assignedWorkers).toBe(1);

    // Yukseltme binayi gecici olarak insaat durumuna sokar.
    world.state.setBuildingState(target.uid, 'constructing');
    world.workforce.reconcile();

    expect(world.workforce.claimedBy(target.uid)).toBe(0);
    expect(target.assignedWorkers).toBe(0);
    settleWalks(world);
    expect(world.workforce.idleCount).toBe(world.state.workers.length);
  });

  it('gecersiz binadan uretim devam etmez', () => {
    const { world, target } = cityWith('lumber_camp');
    world.workforce.assign(target.uid);
    settleWalks(world);

    world.state.setBuildingState(target.uid, 'disabled');
    world.workforce.reconcile();

    expect(world.buildings.resolve(target).effectiveProduction.wood ?? 0).toBe(0);
  });
});

describe('kayit / yukleme', () => {
  it('calisan isci konumuyla birlikte geri gelir', () => {
    const { world, target } = cityWith('quarry');
    world.workforce.assign(target.uid);
    world.workforce.assign(target.uid);
    settleWalks(world);

    const save = world.state.toSave(SAVE_VERSION);
    const loaded = wrap(GameState.fromSave(loadOrThrow(save)));
    const crew = loaded.state.workers.filter((w) => w.buildingUid === target.uid);

    expect(crew.length).toBe(2);
    for (const worker of crew) {
      expect(worker.state).toBe('working');
      const building = loaded.state.buildings.get(target.uid);
      if (!building) throw new Error('bina kaybedildi');
      const anchor = workAnchorFor(building, worker.slot);
      const at = workerPosition(worker);
      expect(at.x).toBeCloseTo(anchor.x, 6);
      expect(at.y).toBeCloseTo(anchor.y, 6);
    }
    // Duruş yerleri yuklemeden sonra da ayri.
    expect(new Set(crew.map((w) => w.slot)).size).toBe(crew.length);
  });

  it('yoldaki isci yolun ortasindan devam eder', () => {
    const { world, target } = cityWith('quarry');
    const result = world.workforce.assign(target.uid);
    if (!result.ok) throw new Error('atama reddedildi');
    world.workforce.advance(1);
    const before = { ...workerById(world, result.worker.id) };
    expect(before.travelLeft).toBeGreaterThan(0);

    const loaded = wrap(GameState.fromSave(loadOrThrow(world.state.toSave(SAVE_VERSION))));
    const after = loaded.state.workers.find((w) => w.id === before.id);
    if (!after) throw new Error('isci kaybedildi');

    expect(after.state).toBe('moving');
    expect(after.travelLeft).toBe(before.travelLeft);
    expect(workerPosition(after)).toEqual(workerPosition(before));
  });

  it('taninmayan binaya atanmis isci guvenle bosa duser', () => {
    const { world, target } = cityWith('lumber_camp');
    world.workforce.assign(target.uid);
    settleWalks(world);

    const save = world.state.toSave(SAVE_VERSION);
    for (const worker of save.workers) worker.buildingUid = 'hayalet#1';

    const loaded = wrap(GameState.fromSave(loadOrThrow(save)));
    for (const worker of loaded.state.workers) {
      expect(worker.buildingUid).toBeNull();
      expect(worker.state).toBe('idle');
      // Meydandaki yerine oturmus olmali - (0,0)'da asili kalmamali.
      const home = idleAnchorFor(worker.id, loaded.workforce.plazaPoint);
      expect(workerPosition(worker).x).toBeCloseTo(home.x, 6);
    }
  });

  it('konumsuz eski kayit (Sprint 8) kadrosunu ve yerini kurtarir', () => {
    const { world, target } = cityWith('lumber_camp');
    world.workforce.assign(target.uid);
    settleWalks(world);

    const save = world.state.toSave(SAVE_VERSION);
    // Sprint 8 kaydinda konum alanlari yoktu.
    const legacy = {
      ...save,
      workers: save.workers.map((w) => ({ id: w.id, buildingUid: w.buildingUid, state: w.state })),
    };

    const loaded = wrap(GameState.fromSave(loadOrThrow(legacy)));
    const crew = loaded.state.workers.filter((w) => w.buildingUid === target.uid);
    expect(crew.length).toBe(1);

    const building = loaded.state.buildings.get(target.uid);
    if (!building) throw new Error('bina kaybedildi');
    const anchor = workAnchorFor(building, crew[0].slot);
    expect(workerPosition(crew[0]).x).toBeCloseTo(anchor.x, 6);
  });

  it('surum artmadi - eski kayit hala yuklenebilir', () => {
    expect(SAVE_VERSION).toBe(3);
  });
});

describe('determinizm', () => {
  it('toplu ilerletme ile adim adim ilerletme AYNI varis anini verir', () => {
    const bulk = cityWith('quarry');
    const step = cityWith('quarry');

    for (let i = 0; i < 4; i += 1) {
      bulk.world.workforce.assign(bulk.target.uid);
      step.world.workforce.assign(step.target.uid);
    }

    bulk.world.workforce.advance(3);
    for (let i = 0; i < 3; i += 1) step.world.workforce.advance(1);

    const shape = (w: TestWorld) =>
      w.state.workers.map((x) => `${x.state}:${x.travelLeft}/${x.travelTicks}`).join('|');
    expect(shape(bulk.world)).toBe(shape(step.world));
    expect(bulk.target.assignedWorkers).toBe(step.target.assignedWorkers);
  });

  it('gercek zaman kullanilmaz', () => {
    const { world, target } = cityWith('lumber_camp');
    const realNow = Date.now();
    world.workforce.assign(target.uid);
    settleWalks(world);
    expect(Date.now() - realNow).toBeLessThan(5000);
    expect(target.assignedWorkers).toBe(1);
  });
});
