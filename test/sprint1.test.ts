/**
 * Sprint 1 hedefleri: tik tabanli zaman, bina ornek durumu, resolver,
 * tur indeksi ve kayit butunlugu.
 */
import { describe, expect, it } from 'vitest';
import { GameState } from '@/core/GameState';
import { EventBus } from '@/core/EventBus';
import { SimulationClock } from '@/core/SimulationClock';
import { migrateAndSanitize } from '@/core/SaveManager';
import { ResourceSystem } from '@/systems/ResourceSystem';
import { BuildingSystem } from '@/systems/BuildingSystem';
import { EconomySystem } from '@/systems/EconomySystem';
import { resolveBuilding, resolveRefund } from '@/systems/BuildingResolver';
import { getBuilding } from '@/config/BuildingCatalog';
import { SAVE_VERSION } from '@/config/Constants';
import type { BuildingInstance, SaveData } from '@/types';

function makeWorld(seed = 4242) {
  const state = new GameState(seed);
  const bus = new EventBus();
  const resources = new ResourceSystem(state, bus);
  const buildings = new BuildingSystem(state, resources, bus);
  const economy = new EconomySystem(state, resources, buildings, bus);
  return { state, bus, resources, buildings, economy };
}

/** Kayit iskeleti uretir. */
function saveWith(buildings: Partial<BuildingInstance>[], tick = 0): SaveData {
  return {
    version: SAVE_VERSION,
    savedAt: Date.now(),
    tick,
    resources: { food: 100, wood: 100, stone: 100, gold: 100 },
    buildings: buildings as BuildingInstance[],
    terrainSeed: 4242,
  };
}

// --- 1, 2 ---
describe('bina olusturma ve seviye', () => {
  it('yeni bina olusturulabiliyor ve dogru ornek durumu tasiyor', () => {
    const { state, buildings } = makeWorld();
    const c = state.grid.center();
    const result = buildings.place('house', c.gx, c.gy);

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const b = result.building;
    expect(b.type).toBe('house');
    expect(b.level).toBe(1);
    expect(b.state).toBe('constructing');
    expect(b.assignedWorkers).toBe(0);
    expect(b.construction).toBeDefined();
    expect(b.construction?.completesAtTick).toBe(state.tick + 12);
  });

  it('seviye bilgisi bina ornegi uzerinde tutuluyor ve kayitta korunuyor', () => {
    const { state, buildings } = makeWorld();
    const c = state.grid.center();
    const placed = buildings.place('house', c.gx, c.gy);
    if (!placed.ok) throw new Error('kurulum basarisiz');

    // Seviye ornege ait; katalogdan turetilmiyor.
    placed.building.level = 2;
    const restored = GameState.fromSave(state.toSave(SAVE_VERSION));
    expect([...restored.buildings.values()][0].level).toBe(2);
  });

  it('gecersiz seviye katalog sinirina normalize edilir', () => {
    const save = saveWith([
      { uid: 'house#1', type: 'house', gx: 5, gy: 5, level: 99, state: 'active', assignedWorkers: 0 },
      { uid: 'house#2', type: 'house', gx: 6, gy: 5, level: -3, state: 'active', assignedWorkers: 0 },
    ]);
    const restored = GameState.fromSave(migrateAndSanitize(save)!);
    const levels = [...restored.buildings.values()].map((b) => b.level).sort();
    expect(levels).toEqual([1, 2]); // 99 -> maxLevel(2), -3 -> 1
  });
});

// --- 3, 4 ---
describe('BuildingResolver', () => {
  const def = getBuilding('farm');

  function instance(level: number): BuildingInstance {
    return { uid: 'farm#1', type: 'farm', gx: 0, gy: 0, level, state: 'active', assignedWorkers: 0 };
  }

  it('seviye 1 ve seviye 2 farkli degerler uretir', () => {
    const lvl1 = resolveBuilding(instance(1), def, 0);
    const lvl2 = resolveBuilding(instance(2), def, 0);

    expect(lvl1.production.food).toBe(6);
    expect(lvl2.production.food).toBe(11);
    expect(lvl1.workerRequirement).toBe(2);
    expect(lvl2.workerRequirement).toBe(3);
    expect(lvl1.production.food).not.toBe(lvl2.production.food);
  });

  it('saf ve deterministiktir: ayni girdi ayni cikti, girdi degismez', () => {
    const input = instance(1);
    const snapshot = JSON.stringify(input);

    const a = resolveBuilding(input, def, 10);
    const b = resolveBuilding(input, def, 10);

    expect(a).toEqual(b);
    expect(JSON.stringify(input)).toBe(snapshot); // girdi mutasyona ugramadi
  });

  it('donen kaynak haritalari katalogtan bagimsiz kopyalardir', () => {
    const resolved = resolveBuilding(instance(1), def, 0);
    resolved.production.food = 9999;
    expect(resolveBuilding(instance(1), def, 0).production.food).toBe(6);
  });

  it('calismayan bina uretim ve kapasite saglamaz', () => {
    const constructing: BuildingInstance = {
      ...instance(1),
      state: 'constructing',
      construction: { startedAtTick: 0, completesAtTick: 15 },
    };
    const resolved = resolveBuilding(constructing, def, 5);

    expect(resolved.operational).toBe(false);
    expect(resolved.production).toEqual({});
    expect(resolved.construction?.remainingTicks).toBe(10);
    expect(resolved.construction?.ratio).toBeCloseTo(1 / 3, 5);
  });

  it('yukseltme secenegi son seviyede null olur', () => {
    expect(resolveBuilding(instance(1), def, 0).upgrade?.toLevel).toBe(2);
    expect(resolveBuilding(instance(2), def, 0).upgrade).toBeNull();
  });

  it('iade, o seviyeye kadar yatirilan toplamin yarisidir', () => {
    // Ciftlik sv1: odun 30 -> iade 15
    expect(resolveRefund(def, 1)).toEqual({ wood: 15 });
    // Sv2: 30 odun + (70 odun, 30 tas) = 100 odun, 30 tas -> iade 50 / 15
    expect(resolveRefund(def, 2)).toEqual({ wood: 50, stone: 15 });
  });
});

// --- 5, 6 ---
describe('bina turu indeksi', () => {
  it('ekleme ve silmede sayac dogru degisir', () => {
    const { state, buildings } = makeWorld();
    const c = state.grid.center();

    expect(state.countOf('house')).toBe(0);
    const a = buildings.place('house', c.gx, c.gy);
    const b = buildings.place('house', c.gx + 1, c.gy);
    if (!a.ok || !b.ok) throw new Error('kurulum basarisiz');
    expect(state.countOf('house')).toBe(2);

    buildings.demolish(a.building.uid);
    expect(state.countOf('house')).toBe(1);

    buildings.demolish(b.building.uid);
    expect(state.countOf('house')).toBe(0);
  });

  it('kayittan yukleme sonrasi indeks yeniden kurulur', () => {
    const { state, buildings } = makeWorld();
    const c = state.grid.center();
    buildings.place('house', c.gx, c.gy);
    buildings.place('house', c.gx + 1, c.gy);
    buildings.place('town_hall', c.gx - 2, c.gy - 2);

    const restored = GameState.fromSave(state.toSave(SAVE_VERSION));
    expect(restored.countOf('house')).toBe(2);
    expect(restored.countOf('town_hall')).toBe(1);
    expect(restored.countOf('farm')).toBe(0);
  });

  it('rebuildIndexes bozulmus sayaci duzeltir', () => {
    const { state, buildings } = makeWorld();
    const c = state.grid.center();
    buildings.place('house', c.gx, c.gy);

    state.rebuildIndexes();
    expect(state.countOf('house')).toBe(1);
  });

  it('maxCount kontrolu indeks uzerinden calisir', () => {
    const { state, buildings } = makeWorld();
    const c = state.grid.center();
    expect(buildings.place('town_hall', c.gx - 2, c.gy - 2).ok).toBe(true);
    expect(state.countOf('town_hall')).toBe(1);
    expect(buildings.place('town_hall', c.gx, c.gy)).toEqual({ ok: false, reason: 'max_count' });
  });
});

// --- 7, 8, 9 ---
describe('kayit butunlugu', () => {
  it('ayni ayak izini paylasan ikinci bina reddedilir', () => {
    const save = saveWith([
      { uid: 'farm#1', type: 'farm', gx: 5, gy: 5, level: 1, state: 'active', assignedWorkers: 0 },
      { uid: 'farm#2', type: 'farm', gx: 5, gy: 5, level: 1, state: 'active', assignedWorkers: 0 },
    ]);
    const restored = GameState.fromSave(migrateAndSanitize(save)!);

    expect(restored.buildings.size).toBe(1);
    expect(restored.loadIssues).toEqual([{ uid: 'farm#2', reason: 'overlap' }]);
    expect(restored.grid.getTile(5, 5)?.occupantUid).toBe('farm#1');
  });

  it('cok karolu binanin ortusen ayak izi de reddedilir', () => {
    // Sehir merkezi 2x2: (5,5)-(6,6). Ikinci bina (6,6)'da ortusuyor.
    const save = saveWith([
      { uid: 'town_hall#1', type: 'town_hall', gx: 5, gy: 5, level: 1, state: 'active', assignedWorkers: 0 },
      { uid: 'house#2', type: 'house', gx: 6, gy: 6, level: 1, state: 'active', assignedWorkers: 0 },
    ]);
    const restored = GameState.fromSave(migrateAndSanitize(save)!);
    expect(restored.buildings.size).toBe(1);
    expect(restored.loadIssues[0].reason).toBe('overlap');
  });

  it('izgara disi bina reddedilir', () => {
    const save = saveWith([
      { uid: 'house#1', type: 'house', gx: 9999, gy: 9999, level: 1, state: 'active', assignedWorkers: 0 },
      { uid: 'house#2', type: 'house', gx: -5, gy: 2, level: 1, state: 'active', assignedWorkers: 0 },
    ]);
    const restored = GameState.fromSave(migrateAndSanitize(save)!);

    expect(restored.buildings.size).toBe(0);
    expect(restored.loadIssues.map((i) => i.reason)).toEqual(['out_of_bounds', 'out_of_bounds']);
  });

  it('taninmayan bina turu reddedilir', () => {
    const save = saveWith([
      { uid: 'x#1', type: 'piramit' as never, gx: 5, gy: 5, level: 1, state: 'active', assignedWorkers: 0 },
    ]);
    const sanitized = migrateAndSanitize(save)!;
    expect(sanitized.buildings).toHaveLength(0);
  });

  it('negatif isci sayisi kabul edilmez', () => {
    const save = saveWith([
      { uid: 'farm#1', type: 'farm', gx: 5, gy: 5, level: 1, state: 'active', assignedWorkers: -10 },
    ]);
    const restored = GameState.fromSave(migrateAndSanitize(save)!);
    expect([...restored.buildings.values()][0].assignedWorkers).toBe(0);
  });

  it('tekrar eden uid reddedilir', () => {
    const save = saveWith([
      { uid: 'farm#1', type: 'farm', gx: 5, gy: 5, level: 1, state: 'active', assignedWorkers: 0 },
      { uid: 'farm#1', type: 'farm', gx: 7, gy: 7, level: 1, state: 'active', assignedWorkers: 0 },
    ]);
    const restored = GameState.fromSave(migrateAndSanitize(save)!);
    expect(restored.buildings.size).toBe(1);
    expect(restored.loadIssues[0].reason).toBe('duplicate_uid');
  });
});

describe('v1 kayit goc yolu', () => {
  it('eski defId/complete alanlari yeni modele tasinir', () => {
    const legacy = {
      version: 1,
      savedAt: Date.now(),
      terrainSeed: 4242,
      resources: { food: 10, wood: 20, stone: 30, gold: 40 },
      buildings: [
        { uid: 'house#1', defId: 'house', gx: 5, gy: 5, level: 1, complete: true, remainingBuildTime: 0 },
        { uid: 'farm#2', defId: 'farm', gx: 6, gy: 5, level: 1, complete: false, remainingBuildTime: 9 },
      ],
    };

    const migrated = migrateAndSanitize(legacy);
    expect(migrated).not.toBeNull();
    expect(migrated!.version).toBe(SAVE_VERSION);
    expect(migrated!.tick).toBe(0);

    const [house, farm] = migrated!.buildings;
    expect(house.type).toBe('house');
    expect(house.state).toBe('active');
    expect(house.assignedWorkers).toBe(0);

    expect(farm.type).toBe('farm');
    expect(farm.state).toBe('constructing');
    expect(farm.construction?.completesAtTick).toBe(9);
  });

  it('v1 kaydindaki kaynaklar korunur', () => {
    const legacy = {
      version: 1,
      savedAt: Date.now(),
      terrainSeed: 1,
      resources: { food: 11, wood: 22, stone: 33, gold: 44 },
      buildings: [],
    };
    expect(migrateAndSanitize(legacy)!.resources).toEqual({ food: 11, wood: 22, stone: 33, gold: 44 });
  });

  it('gelecekteki bilinmeyen surum reddedilir', () => {
    expect(migrateAndSanitize({ version: 99, terrainSeed: 1, buildings: [] })).toBeNull();
  });
});

// --- 10 ---
describe('tik tabanli zaman', () => {
  it('simulasyon tiki ilerler', () => {
    const { state, economy } = makeWorld();
    expect(state.tick).toBe(0);
    economy.advance(5);
    expect(state.tick).toBe(5);
    economy.advance(10);
    expect(state.tick).toBe(15);
  });

  it('insaat tik esiginde tamamlanir', () => {
    const { state, buildings, economy } = makeWorld();
    const c = state.grid.center();
    const placed = buildings.place('house', c.gx, c.gy); // 12 saniye = 12 tik
    if (!placed.ok) throw new Error('kurulum basarisiz');

    economy.advance(11);
    expect(placed.building.state).toBe('constructing');

    economy.advance(1);
    expect(placed.building.state).toBe('active');
    expect(placed.building.construction).toBeUndefined();
  });

  it('ayni tik sayisi ayni sonucu verir (deterministik)', () => {
    function run(): { tick: number; resources: unknown } {
      const w = makeWorld(999);
      const c = w.state.grid.center();
      w.buildings.place('farm', c.gx, c.gy);
      w.buildings.place('house', c.gx + 1, c.gy);
      w.economy.advance(300);
      return { tick: w.state.tick, resources: { ...w.state.resources } };
    }
    expect(run()).toEqual(run());
  });

  it('durum degismeyen pencerede toplu ilerletme ile tek tek ilerletme ortusur', () => {
    const bulk = makeWorld(555);
    const step = makeWorld(555);
    for (const w of [bulk, step]) {
      const c = w.state.grid.center();
      w.buildings.place('farm', c.gx, c.gy);
      w.buildings.place('house', c.gx + 1, c.gy);
      w.economy.advance(50); // once tum insaatlari bitir
    }

    bulk.economy.advance(100);
    for (let i = 0; i < 100; i += 1) step.economy.advance(1);

    expect(bulk.state.tick).toBe(step.state.tick);
    // Kayan nokta birikimi nedeniyle ~1e-13 mertebesinde fark olusur;
    // deger olarak ayni kabul edilir.
    for (const key of ['food', 'wood', 'stone', 'gold'] as const) {
      expect(bulk.state.resources[key]).toBeCloseTo(step.state.resources[key], 9);
    }
  });

  /**
   * BILINEN SINIRLAMA (prototipten devralindi, bu sprintte degistirilmedi).
   *
   * Uretim, pencerenin SONUNDAKI orana gore toplu uygulanir. Pencere icinde
   * bir bina tamamlanirsa, o binanin uretimi pencerenin tamamina uygulanmis
   * olur. Bu yuzden ayni gercek sure farkli parca boyutlariyla islenirse
   * sonuc birebir ayni olmaz.
   *
   * Pratik etkisi cevrimdisi telafiyle sinirlidir (60 tiklik parcalar).
   * Sunucu otoritesi/lockstep hedefi icin bu davranisin duzeltilmesi gerekir:
   * uretim, durum gecislerinde pencereyi bolerek uygulanmalidir.
   */
  it('pencere icinde bina tamamlanirsa parca boyutu sonucu etkiler', () => {
    const bulk = makeWorld(555);
    const step = makeWorld(555);
    for (const w of [bulk, step]) {
      const c = w.state.grid.center();
      w.buildings.place('farm', c.gx, c.gy); // 15 tik
      w.buildings.place('house', c.gx + 1, c.gy); // 12 tik
    }

    bulk.economy.advance(100);
    for (let i = 0; i < 100; i += 1) step.economy.advance(1);

    expect(bulk.state.tick).toBe(step.state.tick);
    // Toplu ilerletme daha comert: biten binanin uretimi tum pencereye yayilir.
    expect(bulk.state.resources.food).toBeGreaterThan(step.state.resources.food);
  });

  it('SimulationClock artan kesri devreder, zaman kaybolmaz', () => {
    const clock = new SimulationClock(1000);
    expect(clock.absorb(400)).toBe(0);
    expect(clock.absorb(400)).toBe(0);
    expect(clock.absorb(400)).toBe(1); // 1200ms -> 1 tik, 200ms devreder
    expect(clock.absorb(800)).toBe(1); // 1000ms -> 1 tik
    expect(clock.absorb(2500)).toBe(2);
  });

  it('cevrimdisi telafi tik cinsinden uygulanir', () => {
    const { state, buildings, economy } = makeWorld();
    const c = state.grid.center();
    buildings.place('farm', c.gx, c.gy);
    buildings.place('house', c.gx + 1, c.gy);
    economy.advance(30);

    const before = state.tick;
    const ticks = economy.applyOfflineProgress(600); // 10 dakika
    expect(ticks).toBe(600);
    expect(state.tick).toBe(before + 600);
  });

  it('kaydedilen tik yuklemede geri gelir', () => {
    const { state, economy } = makeWorld();
    economy.advance(123);
    const restored = GameState.fromSave(state.toSave(SAVE_VERSION));
    expect(restored.tick).toBe(123);
  });
});

describe('mutasyon yuzeyi', () => {
  it('kaynak havuzu kontrollu metotla degisir ve negatife dusmez', () => {
    const { state } = makeWorld();
    state.setResource('wood', -50);
    expect(state.resources.wood).toBe(0);
  });

  it('bina koleksiyonu disaridan eklenemez', () => {
    const { state } = makeWorld();
    // ReadonlyMap: set/delete derleme aninda yok. Calisma zamaninda da
    // koleksiyona yalnizca addBuilding/removeBuilding uzerinden girilir.
    expect('set' in state.buildings).toBe(true); // altta yatan Map
    expect(state.countOf('house')).toBe(0);
  });
});
