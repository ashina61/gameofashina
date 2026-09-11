/**
 * Sprint 2.2: odenen maliyet anlik goruntusu ve etkilesim kurallari.
 */
import { describe, expect, it } from 'vitest';
import { GameState } from '@/core/GameState';
import { migrateAndSanitize } from '@/core/SaveManager';
import { MAX_CONCURRENT_CONSTRUCTIONS, SAVE_VERSION } from '@/config/Constants';
import { getBuilding, levelOf } from '@/config/BuildingCatalog';
import { resolveTaskRefund } from '@/systems/BuildingResolver';
import { blockSpot, makeWorld, wrap } from './helpers';
import type { TestWorld } from './helpers';
import type { BuildingDefinition, BuildingLevel } from '@/types';

function spot(world: TestWorld, dx = 0, dy = 0) {
  // Konum yerlesimden turetilir; sabit koordinat sokaga denk gelebilir.
  const c = blockSpot(world, ['house', 'farm']);
  return { gx: c.gx + dx, gy: c.gy + dy };
}

function fill(w: ReturnType<typeof makeWorld>) {
  const headroom = w.resources.capacity - 20;
  for (const k of ['wood', 'stone', 'gold', 'food'] as const) w.state.setResource(k, headroom);
}

/**
 * Katalogdaki bir seviyeyi gecici olarak degistirir.
 * Katalog degisikliginin iadeyi ETKILEMEDIGINI kanitlamak icin kullanilir.
 */
function withPatchedLevel<T>(
  def: BuildingDefinition,
  level: number,
  patch: Partial<BuildingLevel>,
  run: () => T,
): T {
  const entry = def.levels.find((l) => l.level === level)!;
  const original = { ...entry };
  Object.assign(entry, patch);
  try {
    return run();
  } finally {
    Object.assign(entry, original);
    for (const key of Object.keys(entry)) {
      if (!(key in original)) delete (entry as Record<string, unknown>)[key];
    }
  }
}

describe('odenen maliyet anlik goruntusu', () => {
  it('insa gorevi odenen maliyeti saklar', () => {
    const w = makeWorld();
    fill(w);
    const p = spot(w);
    const placed = w.buildings.place('house', p.gx, p.gy);
    if (!placed.ok) throw new Error('x');

    // Ev sv1: 40 odun, 10 tas
    expect(placed.building.construction?.paidCost).toEqual({ wood: 40, stone: 10 });
  });

  it('yukseltme gorevi odenen maliyeti saklar', () => {
    const w = makeWorld();
    fill(w);
    const p = spot(w);
    const placed = w.buildings.place('farm', p.gx, p.gy);
    if (!placed.ok) throw new Error('x');
    w.simulation.advance(60);
    fill(w);

    w.upgrades.requestUpgrade(placed.building.uid);
    // Ciftlik sv2: 70 odun, 30 tas
    expect(placed.building.construction?.paidCost).toEqual(
      levelOf(getBuilding('farm'), 2)?.upgradeCost,
    );
  });

  it('katalog fiyati sonradan degisse bile iade odenen uzerinden hesaplanir', () => {
    const w = makeWorld();
    fill(w);
    const p = spot(w);
    const placed = w.buildings.place('house', p.gx, p.gy); // 40 odun odendi
    if (!placed.ok) throw new Error('x');
    expect(placed.building.construction?.paidCost.wood).toBe(40);

    const woodBefore = w.state.resources.wood;

    // Katalog fiyati iki katina cikarilir; iade BUNDAN etkilenmemeli.
    withPatchedLevel(getBuilding('house'), 1, { buildCost: { wood: 200, stone: 100 } }, () => {
      w.buildings.demolish(placed.building.uid);
    });

    // Aktif gorev -> odenenin yarisi = 20 (yeni fiyatin yarisi 100 DEGIL)
    expect(w.state.resources.wood).toBe(woodBefore + 20);
  });

  it('kuyruktaki gorevde katalog degisikligi iadeyi etkilemez', () => {
    const w = makeWorld();
    fill(w);
    const built = [];
    for (const tile of w.state.grid.allTiles()) {
      if (built.length >= MAX_CONCURRENT_CONSTRUCTIONS + 1) break;
      if (tile.occupantUid !== null || tile.terrain === 'water' || tile.terrain === 'rock') continue;
      const r = w.buildings.place('house', tile.gx, tile.gy);
      if (r.ok) built.push(r.building);
    }
    const queued = built[built.length - 1];
    expect(queued.construction?.status).toBe('queued');

    const woodBefore = w.state.resources.wood;
    withPatchedLevel(getBuilding('house'), 1, { buildCost: { wood: 999 } }, () => {
      w.buildings.demolish(queued.uid);
    });

    // Kuyrukta -> odenenin TAMAMI = 40
    expect(w.state.resources.wood).toBe(woodBefore + 40);
  });

  it('resolveTaskRefund artik yalnizca odenen maliyete bakar', () => {
    expect(resolveTaskRefund({ wood: 100, stone: 50 }, 'queued')).toEqual({ wood: 100, stone: 50 });
    expect(resolveTaskRefund({ wood: 100, stone: 50 }, 'active')).toEqual({ wood: 50, stone: 25 });
    expect(resolveTaskRefund({}, 'active')).toEqual({});
  });

  it('yukseltme iptalinde iade odenen uzerinden, guncel fiyattan degil', () => {
    const w = makeWorld();
    fill(w);
    const p = spot(w);
    const placed = w.buildings.place('farm', p.gx, p.gy);
    if (!placed.ok) throw new Error('x');
    w.simulation.advance(60);
    fill(w);

    const paidWood = levelOf(getBuilding('farm'), 2)?.upgradeCost?.wood ?? 0;
    w.upgrades.requestUpgrade(placed.building.uid);
    const woodAfterPay = w.state.resources.wood;

    withPatchedLevel(getBuilding('farm'), 2, { upgradeCost: { wood: 500, stone: 500 } }, () => {
      w.upgrades.cancelUpgrade(placed.building.uid);
    });

    // Iade ODENEN uzerinden hesaplanir: odenenin yarisi.
    expect(w.state.resources.wood).toBe(woodAfterPay + Math.floor(paidWood * 0.5));
  });
});

describe('kayit: odenen maliyet', () => {
  it('paidCost kayitta korunur ve iade ayni kalir', () => {
    const w = makeWorld();
    fill(w);
    const p = spot(w);
    const placed = w.buildings.place('house', p.gx, p.gy);
    if (!placed.ok) throw new Error('x');

    const save = migrateAndSanitize(w.state.toSave(SAVE_VERSION))!;
    expect(save.buildings[0].construction?.paidCost).toEqual({ wood: 40, stone: 10 });

    const restored = wrap(GameState.fromSave(save));
    const uid = [...restored.state.buildings.values()][0].uid;
    for (const k of ['wood', 'stone'] as const) restored.state.setResource(k, 100);

    const before = restored.state.resources.wood;
    restored.buildings.demolish(uid);
    expect(restored.state.resources.wood).toBe(before + 20);
  });

  it('paidCost alani olmayan eski kayit katalogdan kurtarilir', () => {
    const legacy = {
      version: 3,
      savedAt: Date.now(),
      tick: 2,
      terrainSeed: 4242,
      resources: { food: 100, wood: 100, stone: 100, gold: 100 },
      buildings: [
        {
          uid: 'house#1',
          type: 'house',
          gx: 5,
          gy: 5,
          level: 1,
          state: 'constructing',
          assignedWorkers: 0,
          // paidCost YOK
          construction: {
            kind: 'build',
            status: 'active',
            durationTicks: 12,
            sequence: 1,
            startedAtTick: 0,
            completesAtTick: 12,
          },
        },
      ],
    };

    const save = migrateAndSanitize(legacy)!;
    // Katalogdaki ev maliyeti ile birebir kurtarilir; uydurma deger uretilmez.
    expect(save.buildings[0].construction?.paidCost).toEqual({ wood: 40, stone: 10 });
  });

  it('kayit -> yukle -> iptal ayni iadeyi verir', () => {
    const w = makeWorld();
    fill(w);
    const p = spot(w);
    const placed = w.buildings.place('farm', p.gx, p.gy);
    if (!placed.ok) throw new Error('x');
    w.simulation.advance(60);
    fill(w);
    w.upgrades.requestUpgrade(placed.building.uid);

    // Kayit almadan iptal edilseydi ne kadar iade edilirdi?
    const directWorld = wrap(GameState.fromSave(migrateAndSanitize(w.state.toSave(SAVE_VERSION))!));
    const uid = [...directWorld.state.buildings.values()][0].uid;
    for (const k of ['wood', 'stone'] as const) directWorld.state.setResource(k, 100);

    const paidWood = levelOf(getBuilding('farm'), 2)?.upgradeCost?.wood ?? 0;
    const before = directWorld.state.resources.wood;
    directWorld.upgrades.cancelUpgrade(uid);
    expect(directWorld.state.resources.wood).toBe(before + Math.floor(paidWood * 0.5));
  });
});

describe('etkilesim kurallari', () => {
  it('karsilanamayan yerlestirme kaynak ve durum degistirmez', () => {
    const w = makeWorld();
    w.state.setResource('wood', 0);
    w.state.setResource('stone', 0);
    const before = { ...w.state.resources };
    const p = spot(w);

    expect(w.buildings.place('house', p.gx, p.gy)).toEqual({ ok: false, reason: 'cost' });
    expect(w.state.resources).toEqual(before);
    expect(w.state.buildings.size).toBe(0);
  });

  it('karsilanamayan yukseltme reddedilir ve gorev olusmaz', () => {
    const w = makeWorld();
    fill(w);
    const p = spot(w);
    const placed = w.buildings.place('farm', p.gx, p.gy);
    if (!placed.ok) throw new Error('x');
    w.simulation.advance(60);

    w.state.setResource('wood', 0);
    w.state.setResource('stone', 0);
    expect(w.upgrades.canUpgrade(placed.building.uid)).toEqual({ ok: false, reason: 'cost' });
    expect(w.upgrades.requestUpgrade(placed.building.uid)).toEqual({ ok: false, reason: 'cost' });
    expect(w.construction.activeCount).toBe(0);
  });

  it('canUpgrade, butonun etkinligi icin gerekli tum durumlari ayirir', () => {
    const w = makeWorld();
    fill(w);
    const p = spot(w);
    const placed = w.buildings.place('farm', p.gx, p.gy);
    if (!placed.ok) throw new Error('x');

    // insaat surerken
    expect(w.upgrades.canUpgrade(placed.building.uid)).toEqual({ ok: false, reason: 'busy' });

    w.simulation.advance(60);
    fill(w);
    // simdi uygun
    expect(w.upgrades.canUpgrade(placed.building.uid).ok).toBe(true);

    // yukseltme baslatinca yine busy
    w.upgrades.requestUpgrade(placed.building.uid);
    expect(w.upgrades.canUpgrade(placed.building.uid)).toEqual({ ok: false, reason: 'busy' });

    // max seviyede
    w.simulation.advance(60);
    expect(w.upgrades.canUpgrade(placed.building.uid)).toEqual({ ok: false, reason: 'max_level' });
  });
});
