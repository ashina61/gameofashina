/**
 * Sprint 2.1: gorev yasam dongusu saglamlastirma.
 * Indeks butunlugu, kuyruk, iptal, instant gorev, atomiklik, olay garantileri.
 */
import { describe, expect, it } from 'vitest';
import { getBuilding, levelOf } from '@/config/BuildingCatalog';
import { GameState } from '@/core/GameState';
import { migrateAndSanitize } from '@/core/SaveManager';
import { MAX_CONCURRENT_CONSTRUCTIONS, SAVE_VERSION } from '@/config/Constants';
import { makeWorld, wrap } from './helpers';
import type { ConstructionTask, TestWorldLike } from './helpers';

/**
 * Ardisik bos YAPI ALANI konumlari.
 *
 * Sprint 12'den beri bina yalnizca yapi alanina kurulur; "merkeze yakin
 * bos cimen" artik gecerli bir konum degil, sokak olabilir. Konumlar bu
 * yuzden yerlesimden turetilir.
 */
function spots(world: TestWorld, n: number) {
  const out: { gx: number; gy: number }[] = [];
  for (const plot of world.plots.plots) {
    if (out.length >= n) break;
    if (!world.plots.accepts(plot, 'farm') || !world.plots.isFree(plot)) continue;
    out.push({ gx: plot.gx, gy: plot.gy });
  }
  if (out.length < n) throw new Error('yeterli bos yapi alani yok');
  return out;
}

/**
 * Kaynaklari testin ihtiyacina yetecek kadar doldurur.
 *
 * Taban depo kapasitesi 500'dur ve iadeler bu tavana kirpilir; bu yuzden
 * tavanin uzerine cikmadan doldurmak gerekir, aksi halde iade olcumleri
 * kirpilma yuzunden gorunmez olur.
 */
function rich(w: ReturnType<typeof makeWorld>) {
  const headroom = w.resources.capacity - 20;
  w.state.setResource('wood', headroom);
  w.state.setResource('stone', headroom);
  w.state.setResource('gold', headroom);
  w.state.setResource('food', headroom);
}

/** n adet ev kurar (hepsi gorev talep eder). */
function placeHouses(w: ReturnType<typeof makeWorld>, n: number) {
  rich(w);
  const placed = [];
  for (const p of spots(w, n + 4)) {
    if (placed.length >= n) break;
    const r = w.buildings.place('house', p.gx, p.gy);
    if (r.ok) placed.push(r.building);
  }
  if (placed.length < n) throw new Error(`yalnizca ${placed.length}/${n} bina kurulabildi`);
  return placed;
}

// ---------------------------------------------------------------- INDEKS

describe('indeks butunlugu', () => {
  it('A: normal rebuild - 3 aktif gorev tam olarak 3 olarak kurulur', () => {
    const w = makeWorld();
    placeHouses(w, 3);
    expect(w.construction.activeCount).toBe(3);

    w.construction.rebuildFromState();
    expect(w.construction.activeCount).toBe(3);
    expect(w.construction.queuedCount).toBe(0);
  });

  it('B: suresi dolmus gorev aktif indekse ALINMAZ, kapatilir', () => {
    const w = makeWorld();
    const [house] = placeHouses(w, 1);
    // Tik'i gorevin otesine tasi ama advance() cagirma.
    w.state.advanceTick(1000);

    w.construction.rebuildFromState();

    expect(w.construction.activeCount).toBe(0);
    // Bina asili kalmaz: normal tamamlanma yolundan gecirilir.
    expect(house.state).toBe('active');
    expect(house.construction).toBeUndefined();
  });

  it('C: yapisal olarak gecersiz gorevler indekse alinmaz ve durum onarilir', () => {
    const cases: Record<string, unknown> = {
      tersSiralama: { kind: 'build', status: 'active', durationTicks: 5, sequence: 1, startedAtTick: 50, completesAtTick: 10 },
      negatifTik: { kind: 'build', status: 'active', durationTicks: 5, sequence: 1, startedAtTick: -5, completesAtTick: 40 },
      negatifSure: { kind: 'build', status: 'active', durationTicks: -3, sequence: 1, startedAtTick: 0, completesAtTick: 40 },
      bilinmeyenTur: { kind: 'teleport', status: 'active', durationTicks: 5, sequence: 1, startedAtTick: 0, completesAtTick: 40 },
      bilinmeyenDurum: { kind: 'build', status: 'paused', durationTicks: 5, sequence: 1, startedAtTick: 0, completesAtTick: 40 },
      kuyruktaTikVar: { kind: 'build', status: 'queued', durationTicks: 5, sequence: 1, startedAtTick: 3, completesAtTick: 40 },
    };

    for (const [name, construction] of Object.entries(cases)) {
      const w = makeWorld();
      const [house] = placeHouses(w, 1);
      w.state.setBuildingConstruction(house.uid, construction as never);

      w.construction.rebuildFromState();

      expect(w.construction.activeCount, name).toBe(0);
      expect(w.construction.queuedCount, name).toBe(0);
      expect(house.construction, name).toBeUndefined();
      expect(house.state, name).toBe('active');
    }
  });

  it('D: idempotent - ucuncu rebuild ikincisiyle ayni sonucu verir', () => {
    const w = makeWorld();
    placeHouses(w, MAX_CONCURRENT_CONSTRUCTIONS + 2);

    const snapshot = () => ({
      active: w.construction.activeTasks().map((t) => `${t.targetUid}:${t.sequence}`).sort(),
      queued: w.construction.queuedTasks().map((t) => `${t.targetUid}:${t.sequence}`),
    });

    const first = snapshot();
    w.construction.rebuildFromState();
    const second = snapshot();
    w.construction.rebuildFromState();
    const third = snapshot();

    expect(second).toEqual(first);
    expect(third).toEqual(second);
  });

  it('E: ayni bina indekse iki kez girmez', () => {
    const w = makeWorld();
    const [house] = placeHouses(w, 1);

    w.construction.rebuildFromState();
    w.construction.rebuildFromState();

    const targets = w.construction.activeTasks().map((t) => t.targetUid);
    expect(targets).toEqual([house.uid]);
    expect(w.construction.activeCount + w.construction.queuedCount).toBe(1);
  });

  it('F: indeks her zaman GameState ile ayni gorev kumesini gosterir', () => {
    const w = makeWorld();
    const built = placeHouses(w, MAX_CONCURRENT_CONSTRUCTIONS + 2);

    /** Degismez: indeksteki gorevler == state icindeki gorevler. */
    const invariant = () => {
      const fromState = [...w.state.buildings.values()]
        .filter((b) => b.construction)
        .map((b) => `${b.uid}:${b.construction!.status}`)
        .sort();
      const fromIndex = [
        ...w.construction.activeTasks().map((t) => `${t.targetUid}:active`),
        ...w.construction.queuedTasks().map((t) => `${t.targetUid}:queued`),
      ].sort();
      return { fromState, fromIndex };
    };

    let snap = invariant();
    expect(snap.fromIndex).toEqual(snap.fromState);

    w.simulation.advance(12); // bazilari tamamlanir, kuyruktan terfi olur
    snap = invariant();
    expect(snap.fromIndex).toEqual(snap.fromState);

    w.buildings.demolish(built[built.length - 1].uid);
    snap = invariant();
    expect(snap.fromIndex).toEqual(snap.fromState);

    w.simulation.advance(100); // hepsi biter
    snap = invariant();
    expect(snap.fromIndex).toEqual(snap.fromState);
    expect(w.construction.activeCount).toBe(0);
  });

  it('cancel() indeksi ve durumu birlikte temizler', () => {
    const w = makeWorld();
    const [house] = placeHouses(w, 1);

    w.construction.cancel(house.uid);

    expect(w.construction.activeCount).toBe(0);
    expect(house.construction).toBeUndefined();
  });
});

// ---------------------------------------------------------------- KUYRUK

describe('kuyruk', () => {
  it('slot dolunca yeni gorev kuyruga alinir', () => {
    const w = makeWorld();
    placeHouses(w, MAX_CONCURRENT_CONSTRUCTIONS + 2);

    expect(w.construction.activeCount).toBe(MAX_CONCURRENT_CONSTRUCTIONS);
    expect(w.construction.queuedCount).toBe(2);
    expect(w.construction.freeSlots).toBe(0);
  });

  it('kuyruktaki gorevin zamani islemez ve uretimi etkilemez', () => {
    const w = makeWorld();
    const built = placeHouses(w, MAX_CONCURRENT_CONSTRUCTIONS + 1);
    const queuedBuilding = built[built.length - 1];

    expect(queuedBuilding.construction?.status).toBe('queued');
    expect(queuedBuilding.construction?.startedAtTick).toBeNull();
    expect(queuedBuilding.construction?.completesAtTick).toBeNull();

    w.simulation.advance(5);
    // Hala kuyrukta ve hic ilerlemedi.
    const progress = w.construction.progressFor(queuedBuilding.uid);
    expect(progress?.status).toBe('queued');
    expect(progress?.ratio).toBe(0);
    // Calismadigi icin nufus kapasitesi saglamaz.
    expect(queuedBuilding.state).toBe('constructing');
  });

  it('slot bosalinca kuyruktaki gorev FIFO sirasiyla aktiflesir', () => {
    const w = makeWorld();
    const built = placeHouses(w, MAX_CONCURRENT_CONSTRUCTIONS + 2);
    const [q1, q2] = w.construction.queuedTasks();

    // Sira sequence'e gore: once kurulan once aktiflesir.
    expect(q1.sequence).toBeLessThan(q2.sequence);
    expect(q1.targetUid).toBe(built[MAX_CONCURRENT_CONSTRUCTIONS].uid);

    w.simulation.advance(12); // ev insa suresi -> aktifler biter
    const activeUids = w.construction.activeTasks().map((t) => t.targetUid);
    expect(activeUids).toContain(q1.targetUid);
    expect(activeUids).toContain(q2.targetUid);
    expect(w.construction.queuedCount).toBe(0);
  });

  it('aktiflesirken baslangic tiki o an hesaplanir', () => {
    const w = makeWorld();
    placeHouses(w, MAX_CONCURRENT_CONSTRUCTIONS + 1);
    const queued = w.construction.queuedTasks()[0];

    w.simulation.advance(12);

    const promoted = w.construction.taskFor(queued.targetUid);
    expect(promoted?.status).toBe('active');
    expect(promoted?.startedAtTick).toBe(12);
    expect(promoted?.completesAtTick).toBe(12 + promoted!.durationTicks);
  });

  it('kuyruk sirasi deterministik: ayni senaryo ayni sirayi verir', () => {
    const order = () => {
      const w = makeWorld(777);
      placeHouses(w, MAX_CONCURRENT_CONSTRUCTIONS + 3);
      return w.construction.queuedTasks().map((t) => t.sequence);
    };
    expect(order()).toEqual(order());
  });

  it('iptal bir slot bosaltir ve kuyruktan terfi tetikler', () => {
    const w = makeWorld();
    const built = placeHouses(w, MAX_CONCURRENT_CONSTRUCTIONS + 1);
    const queuedUid = w.construction.queuedTasks()[0].targetUid;

    w.construction.cancel(built[0].uid);

    expect(w.construction.queuedCount).toBe(0);
    expect(w.construction.taskFor(queuedUid)?.status).toBe('active');
  });
});

/** Ev Sv.1'in odun maliyeti; denge ayarindan bagimsiz kalmak icin turetilir. */
const HOUSE_WOOD = levelOf(getBuilding('house'), 1)!.buildCost!.wood ?? 0;

// ---------------------------------------------------------------- IPTAL

describe('iptal', () => {
  it('aktif insaat iptalinde (yikim) maliyetin yarisi iade edilir', () => {
    const w = makeWorld();
    rich(w);
    const p = spots(w, 1)[0];
    const before = w.state.resources.wood;
    const placed = w.buildings.place('house', p.gx, p.gy);
    if (!placed.ok) throw new Error('x');
    expect(w.state.resources.wood).toBe(before - HOUSE_WOOD);

    w.buildings.demolish(placed.building.uid);
    expect(w.state.resources.wood).toBe(before - HOUSE_WOOD / 2); // %50 iade
  });

  it('kuyruktaki insaat iptalinde maliyetin TAMAMI iade edilir', () => {
    const w = makeWorld();
    const built = placeHouses(w, MAX_CONCURRENT_CONSTRUCTIONS + 1);
    const queued = built[built.length - 1];
    expect(queued.construction?.status).toBe('queued');

    const before = w.state.resources.wood;
    w.buildings.demolish(queued.uid);
    expect(w.state.resources.wood).toBe(before + HOUSE_WOOD); // tam iade
  });

  it('yukseltme iptalinde seviye degismez ve gorev temizlenir', () => {
    const w = makeWorld();
    rich(w);
    const p = spots(w, 1)[0];
    const placed = w.buildings.place('farm', p.gx, p.gy);
    if (!placed.ok) throw new Error('x');
    w.simulation.advance(60);

    const upgradeCost = levelOf(getBuilding('farm'), 2)?.upgradeCost ?? {};
    const woodBefore = w.state.resources.wood;
    w.upgrades.requestUpgrade(placed.building.uid);
    expect(w.state.resources.wood).toBe(woodBefore - (upgradeCost.wood ?? 0));

    const result = w.upgrades.cancelUpgrade(placed.building.uid);
    expect(result).toEqual({ ok: true });
    expect(placed.building.level).toBe(1);
    expect(placed.building.construction).toBeUndefined();
    expect(w.construction.activeCount).toBe(0);
    // Aktif gorev -> %50 iade
    const paidWood = upgradeCost.wood ?? 0;
    expect(w.state.resources.wood).toBe(woodBefore - paidWood + Math.floor(paidWood * 0.5));
  });

  it('gorevi olmayan binada iptal reddedilir', () => {
    const w = makeWorld();
    rich(w);
    const p = spots(w, 1)[0];
    const placed = w.buildings.place('farm', p.gx, p.gy);
    if (!placed.ok) throw new Error('x');
    w.simulation.advance(60);

    expect(w.upgrades.cancelUpgrade(placed.building.uid)).toEqual({ ok: false, reason: 'no_task' });
    expect(w.upgrades.cancelUpgrade('yok#1')).toEqual({ ok: false, reason: 'unknown_building' });
  });

  it('insa gorevi cancelUpgrade ile iptal edilemez', () => {
    const w = makeWorld();
    const [house] = placeHouses(w, 1);
    expect(w.upgrades.cancelUpgrade(house.uid)).toEqual({ ok: false, reason: 'not_upgrade' });
  });
});

// ---------------------------------------------------------------- INSTANT

describe('suresiz (instant) gorev', () => {
  it('instant build: started + completed tam birer kez yayinlanir', () => {
    const w = makeWorld();
    rich(w);
    const p = spots(w, 1)[0];
    const r = w.buildings.place('house', p.gx, p.gy);
    if (!r.ok) throw new Error('x');
    w.buildings.demolish(r.building.uid);

    const events: string[] = [];
    w.bus.on('construction:started', () => events.push('start'));
    w.bus.on('construction:completed', () => events.push('done'));
    w.bus.on('building:completed', () => events.push('building'));

    // Bina olustur, sonra suresiz insa gorevi talep et.
    const placed = w.buildings.place('house', p.gx, p.gy);
    if (!placed.ok) throw new Error('x');
    w.construction.cancel(placed.building.uid, { refundResources: false });
    events.length = 0;

    const result = w.construction.request(placed.building.uid, 'build', 0);
    expect(result).toEqual({ ok: true, task: null, instant: true });
    expect(events).toEqual(['start', 'building', 'done']);
    expect(placed.building.state).toBe('active');
    expect(w.construction.activeCount).toBe(0);
  });

  it('instant upgrade: seviye artar ve olaylar tam birer kez yayinlanir', () => {
    const w = makeWorld();
    rich(w);
    const p = spots(w, 1)[0];
    const placed = w.buildings.place('farm', p.gx, p.gy);
    if (!placed.ok) throw new Error('x');
    w.simulation.advance(60);

    let started = 0;
    let completed = 0;
    w.bus.on('construction:started', () => (started += 1));
    w.bus.on('construction:completed', () => (completed += 1));

    const result = w.construction.request(placed.building.uid, 'upgrade', 0);

    expect(result.ok).toBe(true);
    expect(placed.building.level).toBe(2);
    expect(started).toBe(1);
    expect(completed).toBe(1);
    expect(placed.building.construction).toBeUndefined();
  });
});

// ---------------------------------------------------------------- ATOMIKLIK

describe('kaynak atomikligi', () => {
  it('yetersiz kaynakta yukseltme: kaynak, gorev ve seviye degismez', () => {
    const w = makeWorld();
    rich(w);
    const p = spots(w, 1)[0];
    const placed = w.buildings.place('farm', p.gx, p.gy);
    if (!placed.ok) throw new Error('x');
    w.simulation.advance(60);

    w.state.setResource('wood', 0);
    w.state.setResource('stone', 0);
    const before = { ...w.state.resources };

    expect(w.upgrades.requestUpgrade(placed.building.uid)).toEqual({ ok: false, reason: 'cost' });
    expect(w.state.resources).toEqual(before);
    expect(w.construction.activeCount).toBe(0);
    expect(w.construction.queuedCount).toBe(0);
    expect(placed.building.level).toBe(1);
  });

  it('yetersiz kaynakta yerlestirme: kaynak ve bina sayisi degismez', () => {
    const w = makeWorld();
    w.state.setResource('wood', 0);
    w.state.setResource('stone', 0);
    const before = { ...w.state.resources };
    const p = spots(w, 1)[0];

    expect(w.buildings.place('house', p.gx, p.gy)).toEqual({ ok: false, reason: 'cost' });
    expect(w.state.resources).toEqual(before);
    expect(w.state.buildings.size).toBe(0);
    expect(w.construction.activeCount).toBe(0);
    expect(w.state.grid.getTile(p.gx, p.gy)?.occupantUid).toBeNull();
  });

  it('basarili yerlestirmede maliyet tam bir kez dusulur', () => {
    const w = makeWorld();
    rich(w);
    const before = w.state.resources.wood;
    const p = spots(w, 1)[0];
    w.buildings.place('house', p.gx, p.gy);
    expect(w.state.resources.wood).toBe(before - HOUSE_WOOD);
  });
});

// ---------------------------------------------------------------- OLAYLAR

describe('olay garantileri', () => {
  it('bir gorev icin started ve completed tam birer kez', () => {
    const w = makeWorld();
    rich(w);
    const starts: ConstructionTask[] = [];
    const dones: ConstructionTask[] = [];
    w.bus.on('construction:started', (t) => starts.push(t));
    w.bus.on('construction:completed', (t) => dones.push(t));

    const p = spots(w, 1)[0];
    const placed = w.buildings.place('house', p.gx, p.gy);
    if (!placed.ok) throw new Error('x');

    w.simulation.advance(50);

    expect(starts.filter((t) => t.targetUid === placed.building.uid)).toHaveLength(1);
    expect(dones.filter((t) => t.targetUid === placed.building.uid)).toHaveLength(1);
  });

  it('kuyruktaki gorev started olayini ancak aktiflesirken yayinlar', () => {
    const w = makeWorld();
    const starts: string[] = [];
    w.bus.on('construction:started', (t) => starts.push(t.targetUid));

    const built = placeHouses(w, MAX_CONCURRENT_CONSTRUCTIONS + 1);
    const queuedUid = built[built.length - 1].uid;

    // Kuyruga girerken olay yok.
    expect(starts).toHaveLength(MAX_CONCURRENT_CONSTRUCTIONS);
    expect(starts).not.toContain(queuedUid);

    w.simulation.advance(12);

    // Aktiflesince tam bir kez.
    expect(starts.filter((u) => u === queuedUid)).toHaveLength(1);
  });

  it('iptal olayi tam bir kez yayinlanir', () => {
    const w = makeWorld();
    const [house] = placeHouses(w, 1);
    const cancels: ConstructionTask[] = [];
    w.bus.on('construction:cancelled', (t) => cancels.push(t));

    w.construction.cancel(house.uid);
    w.construction.cancel(house.uid); // ikinci cagri gorev yok -> olay yok

    expect(cancels).toHaveLength(1);
    expect(cancels[0].targetUid).toBe(house.uid);
  });

  it('ilerleme icin tik basina olay yayinlanmaz', () => {
    const w = makeWorld();
    let count = 0;
    w.bus.on('construction:started', () => (count += 1));
    w.bus.on('construction:completed', () => (count += 1));
    w.bus.on('construction:cancelled', () => (count += 1));

    placeHouses(w, 1);
    w.simulation.advance(60);

    expect(count).toBe(2); // 1 baslangic + 1 tamamlanma
  });
});

// ---------------------------------------------------------------- KAYIT

describe('kayit: aktif + kuyruk', () => {
  it('2 aktif + 3 kuyruk kaydedilip ayni sirada geri yuklenir', () => {
    const w = makeWorld();
    rich(w);
    // 3 slot dolu + 3 kuyruk olacak sekilde 6 bina
    const built = placeHouses(w, MAX_CONCURRENT_CONSTRUCTIONS + 3);
    expect(w.construction.activeCount).toBe(3);
    expect(w.construction.queuedCount).toBe(3);

    const queuedOrder = w.construction.queuedTasks().map((t) => t.targetUid);

    const restored = wrap(GameState.fromSave(migrateAndSanitize(w.state.toSave(SAVE_VERSION))!));

    expect(restored.construction.activeCount).toBe(3);
    expect(restored.construction.queuedCount).toBe(3);
    expect(restored.construction.queuedTasks().map((t) => t.targetUid)).toEqual(queuedOrder);
    expect(built.length).toBe(6);
  });

  it('yeniden yuklemeden sonra aktif biter, kuyruktaki devreye girer', () => {
    const w = makeWorld();
    const built = placeHouses(w, MAX_CONCURRENT_CONSTRUCTIONS + 1);
    const queuedUid = built[built.length - 1].uid;

    const restored = wrap(GameState.fromSave(migrateAndSanitize(w.state.toSave(SAVE_VERSION))!));

    const starts: string[] = [];
    restored.bus.on('construction:started', (t) => starts.push(t.targetUid));

    restored.simulation.advance(12);

    expect(starts).toEqual([queuedUid]);
    expect(restored.construction.taskFor(queuedUid)?.status).toBe('active');

    restored.simulation.advance(12);
    const building = [...restored.state.buildings.values()].find((b) => b.uid === queuedUid);
    expect(building?.state).toBe('active');
    expect(restored.construction.activeCount).toBe(0);
  });

  it('kayit sonrasi yeni gorev kuyrukta eskilerin onune gecmez', () => {
    const w = makeWorld();
    placeHouses(w, MAX_CONCURRENT_CONSTRUCTIONS + 1);
    const restored = wrap(GameState.fromSave(migrateAndSanitize(w.state.toSave(SAVE_VERSION))!));

    const existingQueued = restored.construction.queuedTasks()[0];
    rich(restored);
    const p = spots(restored, 20).find(
      (s) => restored.state.grid.getTile(s.gx, s.gy)?.occupantUid === null,
    )!;
    restored.buildings.place('house', p.gx, p.gy);

    const queue = restored.construction.queuedTasks();
    expect(queue[0].targetUid).toBe(existingQueued.targetUid);
    expect(queue[0].sequence).toBeLessThan(queue[1].sequence);
  });

  it('kuyruk alani olmayan v3 kaydi geriye donuk yuklenir', () => {
    const legacy = {
      version: 3,
      savedAt: Date.now(),
      tick: 4,
      terrainSeed: 4242,
      resources: { food: 10, wood: 10, stone: 10, gold: 10 },
      buildings: [
        {
          uid: 'house#1',
          type: 'house',
          gx: 5,
          gy: 5,
          level: 1,
          state: 'constructing',
          assignedWorkers: 0,
          // status / durationTicks / sequence YOK
          construction: { kind: 'build', startedAtTick: 0, completesAtTick: 12 },
        },
      ],
    };

    const save = migrateAndSanitize(legacy)!;
    const task = save.buildings[0].construction!;
    expect(task.status).toBe('active');
    expect(task.durationTicks).toBe(12);
    expect(task.sequence).toBeGreaterThan(0);

    const restored = wrap(GameState.fromSave(save));
    expect(restored.construction.activeCount).toBe(1);
    restored.simulation.advance(8);
    expect([...restored.state.buildings.values()][0].state).toBe('active');
  });

  it('bozuk kuyruk gorevi (suresiz) kayitta reddedilir', () => {
    const save = migrateAndSanitize({
      version: SAVE_VERSION,
      savedAt: Date.now(),
      tick: 0,
      terrainSeed: 4242,
      resources: { food: 1, wood: 1, stone: 1, gold: 1 },
      buildings: [
        {
          uid: 'house#1',
          type: 'house',
          gx: 5,
          gy: 5,
          level: 1,
          state: 'constructing',
          assignedWorkers: 0,
          construction: { kind: 'build', status: 'queued', sequence: 1, startedAtTick: null, completesAtTick: null },
        },
      ],
    })!;
    expect(save.buildings[0].construction).toBeUndefined();
    expect(save.buildings[0].state).toBe('active');
  });
});

// Tip yardimcisi (helpers.ts icindeki TestWorld ile ayni sekli tasir)
export type { TestWorldLike };
