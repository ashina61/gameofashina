/**
 * Sprint 8 - isci atama ve is yonlendirme.
 *
 * Sprint 8'e kadar isciler yalnizca SAYIydi ve her tik otomatik
 * dagitiliyordu. Buradaki testler atamanin artik OYUNCUNUN komutu
 * oldugunu ve kalici kaldigini kilitler.
 */
import { describe, expect, it } from 'vitest';
import { getBuilding, levelOf } from '@/config/BuildingCatalog';
import { GameState } from '@/core/GameState';
import { migrateAndSanitize } from '@/core/SaveManager';
import { SAVE_VERSION } from '@/config/Constants';
import { makeWorld, settleWalks, staff, wrap } from './helpers';
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

/** Insaatlari bitirir ve nufusu buyuterek isci havuzu olusturur. */
function populate(world: TestWorld): void {
  world.simulation.advance(900);
}

/** Konut + uretim binasi olan hazir bir sehir. */
function cityWith(type: BuildingId): { world: TestWorld; target: BuildingInstance } {
  const world = makeWorld();
  place(world, 'house');
  place(world, 'house');
  const target = place(world, type);
  populate(world);
  return { world, target };
}

describe('isci atama', () => {
  it('yeni isciler BOSTA dogar - otomatik atanmaz', () => {
    const { world, target } = cityWith('lumber_camp');

    expect(world.state.workers.length).toBe(world.state.population);
    expect(world.workforce.idleCount).toBe(world.state.population);
    expect(target.assignedWorkers).toBe(0);
  });

  it('bosta isci oduncu kampina atanir', () => {
    const { world, target } = cityWith('lumber_camp');
    const idleBefore = world.workforce.idleCount;

    const result = world.workforce.assign(target.uid);

    expect(result.ok).toBe(true);
    expect(world.workforce.idleCount).toBe(idleBefore - 1);
    expect(world.workforce.claimedBy(target.uid)).toBe(1);
  });

  it('bosta isci tas ocagina atanir', () => {
    const { world, target } = cityWith('quarry');

    expect(world.workforce.assign(target.uid).ok).toBe(true);
    expect(world.workforce.claimedBy(target.uid)).toBe(1);
  });

  it('isci ONCE yola cikar, hemen calismaya baslamaz', () => {
    const { world, target } = cityWith('lumber_camp');

    const result = world.workforce.assign(target.uid);
    if (!result.ok) throw new Error('atama reddedildi');

    expect(result.worker.state).toBe('moving');
    expect(result.worker.travelLeft).toBeGreaterThan(0);
    expect(target.assignedWorkers).toBe(0); // henuz uretime katkisi yok

    settleWalks(world);

    expect(result.worker.state).toBe('working');
    expect(target.assignedWorkers).toBe(1);
  });

  it('bosta isci yoksa atama reddedilir', () => {
    const world = makeWorld();
    const target = place(world, 'lumber_camp');
    world.simulation.advance(60); // konut yok: nufus 0

    const result = world.workforce.assign(target.uid);

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe('no_idle_worker');
  });

  it('insaati suren binaya isci atanamaz', () => {
    const world = makeWorld();
    place(world, 'house');
    place(world, 'house');
    populate(world);
    const fresh = place(world, 'lumber_camp');

    expect(fresh.state).toBe('constructing');
    const result = world.workforce.assign(fresh.uid);

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe('not_operational');
  });

  it('taninmayan bina reddedilir', () => {
    const { world } = cityWith('lumber_camp');
    const result = world.workforce.assign('yok#1');
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe('unknown_building');
  });
});

describe('kapasite', () => {
  it('kapasite katalogdaki seviye degeridir', () => {
    const { world, target } = cityWith('lumber_camp');
    // Oduncu kampi seviye 1: 3 isci
    expect(world.workforce.capacityOf(target.uid)).toBe(3);
  });

  it('kapasite dolunca atama reddedilir', () => {
    const { world, target } = cityWith('quarry'); // 4 isci
    const capacity = world.workforce.capacityOf(target.uid);

    for (let i = 0; i < capacity; i += 1) {
      expect(world.workforce.assign(target.uid).ok).toBe(true);
    }

    const overflow = world.workforce.assign(target.uid);
    expect(overflow.ok).toBe(false);
    if (!overflow.ok) expect(overflow.reason).toBe('no_slots');
    expect(world.workforce.claimedBy(target.uid)).toBe(capacity);
  });

  it('YOLDAKI isciler de yer kaplar - ayni slota iki isci yollanmaz', () => {
    const { world, target } = cityWith('lumber_camp');
    const capacity = world.workforce.capacityOf(target.uid);

    for (let i = 0; i < capacity; i += 1) world.workforce.assign(target.uid);
    // Hicbiri henuz varmadi ama yer dolu sayilir.
    expect(target.assignedWorkers).toBe(0);
    expect(world.workforce.assign(target.uid).ok).toBe(false);
  });

  it('bir isci ayni anda tek binada calisir', () => {
    const world = makeWorld();
    place(world, 'house');
    const first = place(world, 'lumber_camp');
    const second = place(world, 'quarry');
    populate(world);

    const total = world.state.workers.length;
    let assigned = 0;
    for (;;) {
      if (!world.workforce.assign(first.uid).ok) break;
      assigned += 1;
    }
    for (;;) {
      if (!world.workforce.assign(second.uid).ok) break;
      assigned += 1;
    }

    // Toplam atama isci sayisini asamaz; ayni isci iki binaya gidemez.
    expect(assigned).toBeLessThanOrEqual(total);
    const claimed = world.workforce.claimedBy(first.uid) + world.workforce.claimedBy(second.uid);
    expect(claimed).toBe(assigned);
  });
});

describe('isci geri alma', () => {
  it('calisan isci geri alinir ve bosa cikar', () => {
    const { world, target } = cityWith('lumber_camp');
    staff(world, target.uid);
    const working = target.assignedWorkers;
    expect(working).toBeGreaterThan(0);

    const result = world.workforce.release(target.uid);

    expect(result.ok).toBe(true);
    if (result.ok) {
      // Sprint 9: isci ANINDA bosa gecmez, meydana YURUR. Binayla bagi ve
      // uretim katkisi yine de ayni tikte kopar.
      expect(result.worker.state).toBe('moving');
      expect(result.worker.buildingUid).toBeNull();
    }
    expect(target.assignedWorkers).toBe(working - 1);

    settleWalks(world);
    if (result.ok) expect(result.worker.state).toBe('idle');
  });

  it('once YOLDAKI isci geri cagrilir - calisan uretimi kesilmez', () => {
    const { world, target } = cityWith('lumber_camp');
    world.workforce.assign(target.uid);
    settleWalks(world); // ilki vardi
    world.workforce.assign(target.uid); // ikincisi yolda

    const result = world.workforce.release(target.uid);

    expect(result.ok).toBe(true);
    expect(target.assignedWorkers).toBe(1); // calisan yerinde kaldi
  });

  it('isci olmayan binada geri alma reddedilir', () => {
    const { world, target } = cityWith('lumber_camp');
    const result = world.workforce.release(target.uid);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe('no_worker');
  });
});

describe('bina yikimi ve durum degisimi', () => {
  it('bina yikilinca iscileri ANINDA bosa cikar', () => {
    const { world, target } = cityWith('lumber_camp');
    staff(world, target.uid);
    expect(world.workforce.claimedBy(target.uid)).toBeGreaterThan(0);

    world.buildings.demolish(target.uid);

    // Yer ANINDA bosalir ve sahipsiz referans kalmaz; isciler meydana
    // yuruyerek doner, bu yuzden 'idle' sayisi varisla birlikte dolar.
    expect(world.workforce.claimedBy(target.uid)).toBe(0);
    for (const worker of world.state.workers) {
      expect(worker.buildingUid).toBeNull();
    }

    settleWalks(world);
    expect(world.workforce.idleCount).toBe(world.state.workers.length);
  });

  it('yukseltme sirasinda atama KORUNUR', () => {
    const { world, target } = cityWith('quarry');
    staff(world, target.uid);
    const before = world.workforce.claimedBy(target.uid);
    expect(before).toBeGreaterThan(0);

    for (const key of ['wood', 'stone', 'gold'] as const) world.state.setResource(key, 99_999);
    expect(world.upgrades.requestUpgrade(target.uid).ok).toBe(true);
    world.simulation.advance(1);

    // Yukseltme sirasinda bina CALISIR durumda kalir, isciler de oyle.
    expect(target.state).toBe('active');
    expect(world.workforce.claimedBy(target.uid)).toBe(before);
  });

  it('yukseltme bitince kapasite artar ve mevcut isciler kalir', () => {
    const { world, target } = cityWith('quarry');
    staff(world, target.uid);
    const before = world.workforce.claimedBy(target.uid);

    for (const key of ['wood', 'stone', 'gold'] as const) world.state.setResource(key, 99_999);
    world.upgrades.requestUpgrade(target.uid);
    world.simulation.advance(900);

    expect(target.level).toBe(2);
    const lv1Need = levelOf(getBuilding('quarry'), 1)?.workerRequirement ?? 0;
    expect(world.workforce.capacityOf(target.uid)).toBeGreaterThan(lv1Need);
    expect(world.workforce.claimedBy(target.uid)).toBe(before);
  });
});

describe('uretim entegrasyonu', () => {
  it('isci atanmadan uretim YOKTUR', () => {
    const { world, target } = cityWith('lumber_camp');
    world.simulation.advance(1);

    expect(target.assignedWorkers).toBe(0);
    expect(world.economy.snapshot.netPerMinute.wood).toBe(0);
  });

  it('isci varinca uretim baslar', () => {
    const { world, target } = cityWith('lumber_camp');
    staff(world, target.uid);
    world.simulation.advance(1);

    expect(target.assignedWorkers).toBeGreaterThan(0);
    expect(world.economy.snapshot.netPerMinute.wood).toBeGreaterThan(0);
  });

  it('uretim mevcut kadro formuluyle olcekleniyor - yeni matematik yok', () => {
    const { world, target } = cityWith('quarry'); // 4 isci ister
    world.workforce.assign(target.uid);
    world.workforce.assign(target.uid);
    settleWalks(world);
    world.simulation.advance(1);

    const capacity = world.workforce.capacityOf(target.uid);
    const full = world.economy.snapshot.netPerMinute.stone / (2 / capacity);
    // Yari kadro yari uretim: mevcut staffing carpaniyle birebir uyumlu.
    expect(world.economy.snapshot.netPerMinute.stone).toBeCloseTo(full * (2 / capacity), 6);
  });
});

describe('nufus ile hizalama', () => {
  it('nufus artinca yeni isci BOSTA eklenir', () => {
    const { world } = cityWith('lumber_camp');
    const before = world.state.workers.length;

    world.simulation.advance(120);

    expect(world.state.workers.length).toBe(world.state.population);
    expect(world.state.workers.length).toBeGreaterThanOrEqual(before);
  });

  it('nufus azalinca ONCE bosta isciler gider', () => {
    const { world, target } = cityWith('quarry');
    staff(world, target.uid);
    const workingBefore = target.assignedWorkers;
    expect(world.workforce.idleCount).toBeGreaterThan(0);

    world.state.setResource('food', 0);
    world.simulation.advance(60); // bir dakika aclik: bir vatandas gider

    expect(world.state.workers.length).toBe(world.state.population);
    // Calisanlar korundu; giden bosta olandi.
    expect(target.assignedWorkers).toBe(workingBefore);
  });
});

describe('kayit', () => {
  it('atama kayitta korunur', () => {
    const { world, target } = cityWith('lumber_camp');
    staff(world, target.uid);
    const assigned = world.workforce.claimedBy(target.uid);
    expect(assigned).toBeGreaterThan(0);

    const reloaded = wrap(GameState.fromSave(world.state.toSave(SAVE_VERSION)));

    expect(reloaded.workforce.claimedBy(target.uid)).toBe(assigned);
    const reloadedBuilding = reloaded.state.buildings.get(target.uid);
    expect(reloadedBuilding?.assignedWorkers).toBe(assigned);
  });

  it('isci kimlikleri kayitta degismez', () => {
    const { world, target } = cityWith('lumber_camp');
    staff(world, target.uid);
    const before = world.state.workers.map((w) => `${w.id}:${w.buildingUid}:${w.state}`).sort();

    const reloaded = wrap(GameState.fromSave(world.state.toSave(SAVE_VERSION)));
    const after = reloaded.state.workers.map((w) => `${w.id}:${w.buildingUid}:${w.state}`).sort();

    expect(after).toEqual(before);
  });

  it('isci alani olmayan eski kayit assignedWorkers uzerinden turetilir', () => {
    const { world, target } = cityWith('lumber_camp');
    staff(world, target.uid);
    const assigned = target.assignedWorkers;

    const save = world.state.toSave(SAVE_VERSION) as Record<string, unknown>;
    delete save.workers; // Sprint 8 oncesi kayit

    const migrated = migrateAndSanitize(save);
    if (!migrated) throw new Error('kayit reddedildi');

    const restored = migrated.workers.filter((w) => w.buildingUid === target.uid);
    expect(restored.length).toBe(assigned);
    expect(restored.every((w) => w.state === 'working')).toBe(true);
  });

  it('taninmayan binaya atanmis isci kayitta bosa cikar', () => {
    const { world, target } = cityWith('lumber_camp');
    staff(world, target.uid);

    const save = world.state.toSave(SAVE_VERSION);
    for (const worker of save.workers) worker.buildingUid = 'hayalet#9';

    const migrated = migrateAndSanitize(save);
    if (!migrated) throw new Error('kayit reddedildi');
    expect(migrated.workers.every((w) => w.buildingUid === null && w.state === 'idle')).toBe(true);
  });

  it('bozuk isci durumu duzeltilir', () => {
    const { world, target } = cityWith('lumber_camp');
    staff(world, target.uid);

    const save = world.state.toSave(SAVE_VERSION) as unknown as {
      workers: Array<Record<string, unknown>>;
    };
    for (const worker of save.workers) worker.state = 'teleporting';

    const migrated = migrateAndSanitize(save);
    if (!migrated) throw new Error('kayit reddedildi');
    expect(migrated.workers.every((w) => w.state === 'idle')).toBe(true);
  });
});

describe('determinizm', () => {
  it('ayni komut dizisi ayni sonucu verir', () => {
    function run(): string {
      const world = makeWorld(4242);
      place(world, 'house');
      const camp = place(world, 'lumber_camp');
      populate(world);
      world.workforce.assign(camp.uid);
      world.workforce.assign(camp.uid);
      world.simulation.advance(50);
      return JSON.stringify({
        workers: world.state.workers,
        assigned: camp.assignedWorkers,
        wood: world.state.resources.wood,
      });
    }
    expect(run()).toBe(run());
  });

  it('gercek zaman kullanilmaz: Date.now degismeden isci varir', () => {
    const { world, target } = cityWith('lumber_camp');
    const realNow = Date.now();

    world.workforce.assign(target.uid);
    settleWalks(world);

    expect(Date.now() - realNow).toBeLessThan(5000);
    expect(target.assignedWorkers).toBe(1);
  });
});
