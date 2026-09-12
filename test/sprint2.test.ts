/**
 * Sprint 2 hedefleri: ConstructionSystem, UpgradeSystem, gorev olaylari
 * ve kayit dayanikliligi.
 */
import { describe, expect, it, vi } from 'vitest';
import { GameState } from '@/core/GameState';
import { migrateAndSanitize } from '@/core/SaveManager';
import { getBuilding, levelOf, maxLevelOf } from '@/config/BuildingCatalog';
import { BASE_STORAGE_CAPACITY, SAVE_VERSION } from '@/config/Constants';
import { resolveUpgradeOption } from '@/systems/BuildingResolver';
import { blockSpot, hallSpot, makeWorld, wrap } from './helpers';
import type { ConstructionTask, SaveData } from '@/types';

/**
 * Sehirde gecerli bir YAPI ALANI konumu.
 *
 * Sprint 12'de bina artik uygun herhangi bir karoya degil yapi alanina
 * kurulur; izgara merkezi de sehir merkezine ayrilmistir. Konum bu yuzden
 * yerlesimden turetilir, elle yazilmaz.
 */
function spot(world: TestWorld, dx = 0, dy = 0) {
  const c = blockSpot(world, ['house', 'farm']);
  return { gx: c.gx + dx, gy: c.gy + dy };
}

describe('ConstructionSystem - insa gorevi', () => {
  it('bina kurulunca gorev olusturulur', () => {
    const w = makeWorld();
    const p = spot(w);
    const placed = w.buildings.place('house', p.gx, p.gy);
    if (!placed.ok) throw new Error('kurulum basarisiz');

    expect(w.construction.activeCount).toBe(1);
    const task = w.construction.taskFor(placed.building.uid);
    expect(task).not.toBeNull();
    expect(task?.kind).toBe('build');
    expect(task?.targetUid).toBe(placed.building.uid);
  });

  it('startedAtTick ve completesAtTick dogru', () => {
    const w = makeWorld();
    w.simulation.advance(7); // tik sifirdan farkli olsun
    const p = spot(w);
    const placed = w.buildings.place('house', p.gx, p.gy); // ev: 12 saniye
    if (!placed.ok) throw new Error('kurulum basarisiz');

    const task = w.construction.taskFor(placed.building.uid);
    expect(task?.startedAtTick).toBe(7);
    expect(task?.completesAtTick).toBe(19);
  });

  it('tamamlanmadan bina active olmuyor', () => {
    const w = makeWorld();
    const p = spot(w);
    const placed = w.buildings.place('house', p.gx, p.gy);
    if (!placed.ok) throw new Error('kurulum basarisiz');

    w.simulation.advance(11);
    expect(placed.building.state).toBe('constructing');
    expect(w.construction.activeCount).toBe(1);
    // Calismiyorken nufus kapasitesi saglamaz.
    expect(w.economy.snapshot.populationCapacity).toBe(0);
  });

  it('tamamlaninca active oluyor ve gorev kapaniyor', () => {
    const w = makeWorld();
    const p = spot(w);
    const placed = w.buildings.place('house', p.gx, p.gy);
    if (!placed.ok) throw new Error('kurulum basarisiz');

    w.simulation.advance(12);
    expect(placed.building.state).toBe('active');
    expect(placed.building.construction).toBeUndefined();
    expect(w.construction.activeCount).toBe(0);
    expect(w.economy.snapshot.populationCapacity).toBe(5);
  });

  it('ayni bina icin ikinci gorev baslatilamaz', () => {
    const w = makeWorld();
    const p = spot(w);
    const placed = w.buildings.place('house', p.gx, p.gy);
    if (!placed.ok) throw new Error('kurulum basarisiz');

    // API adi degisti (startUpgrade -> requestUpgrade); dogrulanan davranis ayni:
    // ayni binada ikinci bir gorev baslatilamaz.
    const second = w.construction.requestUpgrade(placed.building.uid, 10);
    expect(second).toEqual({ ok: false, reason: 'busy' });
    expect(w.construction.activeCount).toBe(1);
  });

  it('bina yikilinca gorev de iptal olur - sahipsiz gorev kalmaz', () => {
    const w = makeWorld();
    const p = spot(w);
    const placed = w.buildings.place('house', p.gx, p.gy);
    if (!placed.ok) throw new Error('kurulum basarisiz');

    expect(w.construction.activeCount).toBe(1);
    w.buildings.demolish(placed.building.uid);
    expect(w.construction.activeCount).toBe(0);
  });

  it('gercek zaman kullanilmaz: Date.now degismeden gorev ilerler', () => {
    const w = makeWorld();
    const p = spot(w);
    const placed = w.buildings.place('house', p.gx, p.gy);
    if (!placed.ok) throw new Error('kurulum basarisiz');

    const now = vi.spyOn(Date, 'now').mockReturnValue(1_000_000);
    w.simulation.advance(12);
    now.mockRestore();

    expect(placed.building.state).toBe('active');
  });
});

describe('UpgradeSystem', () => {
  /** Tamamlanmis bir bina kurar. */
  function completedBuilding(w = makeWorld(), type: 'farm' | 'town_hall' = 'farm') {
    // Sehir merkezi kendi ozel alanina, digerleri normal yapi alanina.
    const p = type === 'town_hall' ? hallSpot(w) : spot(w);
    const placed = w.buildings.place(type, p.gx, p.gy);
    if (!placed.ok) throw new Error('kurulum basarisiz');
    w.simulation.advance(60);
    return { w, building: placed.building };
  }

  it('seviye 1 -> seviye 2 yukseltir', () => {
    const { w, building } = completedBuilding();
    w.state.setResource('wood', 500);
    w.state.setResource('stone', 500);

    const result = w.upgrades.requestUpgrade(building.uid);
    expect(result.ok).toBe(true);
    expect(building.level).toBe(1); // henuz degismedi

    w.simulation.advance(45); // ciftlik yukseltme suresi 45 sn
    expect(building.level).toBe(2);
  });

  it('yukseltme maliyeti resolver ile ayni', () => {
    const { w, building } = completedBuilding();
    w.state.setResource('wood', 500);
    w.state.setResource('stone', 500);

    const option = resolveUpgradeOption(getBuilding('farm'), 1);
    const woodBefore = w.state.resources.wood;
    const stoneBefore = w.state.resources.stone;

    const result = w.upgrades.requestUpgrade(building.uid);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.cost).toEqual(option?.cost);
    expect(w.state.resources.wood).toBe(woodBefore - (option?.cost.wood ?? 0));
    expect(w.state.resources.stone).toBe(stoneBefore - (option?.cost.stone ?? 0));
  });

  it('kaynak yetersizse yukseltme baslamaz ve hicbir sey harcanmaz', () => {
    const { w, building } = completedBuilding();
    w.state.setResource('wood', 0);
    w.state.setResource('stone', 0);
    const before = { ...w.state.resources };

    expect(w.upgrades.requestUpgrade(building.uid)).toEqual({ ok: false, reason: 'cost' });
    expect(w.state.resources).toEqual(before);
    expect(w.construction.activeCount).toBe(0);
  });

  it('max seviyede yukseltme baslamaz', () => {
    const { w, building } = completedBuilding();
    w.state.setResource('wood', 5000);
    w.state.setResource('stone', 5000);

    /*
     * KATALOGDAKI EN YUKSEK seviyeye kadar cikilir.
     *
     * Sabit "2" yazmak, katalog Sprint 15'te seviye 3 kazaninca testi
     * kirdi. Sinir katalogdan okunursa yeni seviyeler testi bozmaz.
     */
    const top = maxLevelOf(getBuilding(building.type));
    for (let level = building.level; level < top; level += 1) {
      expect(w.upgrades.requestUpgrade(building.uid).ok).toBe(true);
      w.simulation.advance(400);
    }
    expect(building.level).toBe(top);

    expect(w.upgrades.requestUpgrade(building.uid)).toEqual({ ok: false, reason: 'max_level' });
  });

  it('insaat sirasinda yukseltme baslatilamaz', () => {
    const w = makeWorld();
    const p = spot(w);
    const placed = w.buildings.place('farm', p.gx, p.gy);
    if (!placed.ok) throw new Error('kurulum basarisiz');
    w.state.setResource('wood', 5000);
    w.state.setResource('stone', 5000);

    expect(w.upgrades.requestUpgrade(placed.building.uid)).toEqual({ ok: false, reason: 'busy' });
  });

  it('yukseltme sirasinda ikinci yukseltme baslatilamaz', () => {
    const { w, building } = completedBuilding();
    w.state.setResource('wood', 5000);
    w.state.setResource('stone', 5000);

    expect(w.upgrades.requestUpgrade(building.uid).ok).toBe(true);
    expect(w.upgrades.requestUpgrade(building.uid)).toEqual({ ok: false, reason: 'busy' });
  });

  it('yukseltme bitmeden uretim ve kapasite eski seviyeden hesaplanir', () => {
    const { w, building } = completedBuilding(makeWorld(), 'town_hall');
    w.state.setResource('wood', 5000);
    w.state.setResource('stone', 5000);
    w.state.setResource('gold', 5000);

    const depoOnce = w.resources.capacity;
    const hall1 = levelOf(getBuilding('town_hall'), 1)?.storageCapacity ?? 0;
    const hall2 = levelOf(getBuilding('town_hall'), 2)?.storageCapacity ?? 0;
    expect(depoOnce).toBe(BASE_STORAGE_CAPACITY + hall1);

    w.upgrades.requestUpgrade(building.uid);
    w.simulation.advance(10); // yukseltme 90 sn, henuz bitmedi

    expect(building.level).toBe(1);
    expect(w.resources.capacity).toBe(BASE_STORAGE_CAPACITY + hall1);
    expect(w.economy.snapshot.netPerMinute.gold).toBeCloseTo(2, 5); // sv1 uretimi

    w.simulation.advance(90);
    expect(building.level).toBe(2);
    expect(w.resources.capacity).toBe(BASE_STORAGE_CAPACITY + hall2);
    const hallGold = levelOf(getBuilding('town_hall'), 2)?.production?.gold ?? 0;
    expect(w.economy.snapshot.netPerMinute.gold).toBeCloseTo(hallGold, 5);
  });

  it('yukseltme sirasinda bina calismaya devam eder', () => {
    const { w, building } = completedBuilding(makeWorld(), 'town_hall');
    w.state.setResource('wood', 5000);
    w.state.setResource('stone', 5000);
    w.state.setResource('gold', 5000);

    w.upgrades.requestUpgrade(building.uid);
    expect(building.state).toBe('active');
    w.simulation.advance(5);
    expect(w.economy.snapshot.netPerMinute.gold).toBeCloseTo(2, 5);
  });

  it('bilinmeyen bina reddedilir', () => {
    const w = makeWorld();
    expect(w.upgrades.requestUpgrade('yok#1')).toEqual({ ok: false, reason: 'unknown_building' });
  });
});

describe('gorev olaylari', () => {
  it('construction:started yalnizca gorev baslarken yayinlanir', () => {
    const w = makeWorld();
    const started: ConstructionTask[] = [];
    w.bus.on('construction:started', (t) => started.push(t));

    const p = spot(w);
    const placed = w.buildings.place('house', p.gx, p.gy);
    if (!placed.ok) throw new Error('kurulum basarisiz');
    expect(started).toHaveLength(1);
    expect(started[0].kind).toBe('build');

    // Ilerleyen tikler yeni baslangic olayi uretmez.
    w.simulation.advance(5);
    expect(started).toHaveLength(1);
  });

  it('construction:completed yalnizca tamamlanma tikinde yayinlanir', () => {
    const w = makeWorld();
    const completed: ConstructionTask[] = [];
    w.bus.on('construction:completed', (t) => completed.push(t));

    const p = spot(w);
    w.buildings.place('house', p.gx, p.gy);

    w.simulation.advance(11);
    expect(completed).toHaveLength(0);

    w.simulation.advance(1);
    expect(completed).toHaveLength(1);
    expect(completed[0].kind).toBe('build');

    w.simulation.advance(50);
    expect(completed).toHaveLength(1);
  });

  it('her tikte ilerleme olayi yayinlanmaz - olay yagmuru yok', () => {
    const w = makeWorld();
    let emissions = 0;
    w.bus.on('construction:started', () => (emissions += 1));
    w.bus.on('construction:completed', () => (emissions += 1));

    const p = spot(w);
    w.buildings.place('house', p.gx, p.gy);
    w.simulation.advance(30);

    // 30 tik boyunca yalnizca 1 baslangic + 1 tamamlanma.
    expect(emissions).toBe(2);
  });

  it('yukseltme de ayni olaylari kullanir', () => {
    const w = makeWorld();
    const p = spot(w);
    const placed = w.buildings.place('farm', p.gx, p.gy);
    if (!placed.ok) throw new Error('kurulum basarisiz');
    w.simulation.advance(60);

    const kinds: string[] = [];
    w.bus.on('construction:started', (t) => kinds.push(`start:${t.kind}`));
    w.bus.on('construction:completed', (t) => kinds.push(`done:${t.kind}`));

    w.state.setResource('wood', 5000);
    w.state.setResource('stone', 5000);
    w.upgrades.requestUpgrade(placed.building.uid);
    w.simulation.advance(45);

    expect(kinds).toEqual(['start:upgrade', 'done:upgrade']);
  });
});

describe('kayit: devam eden gorevler', () => {
  it('insaat sururken alinan kayit gorevi korur ve dogru tikte bitirir', () => {
    const w = makeWorld();
    const p = spot(w);
    const placed = w.buildings.place('house', p.gx, p.gy); // 12 tik
    if (!placed.ok) throw new Error('kurulum basarisiz');
    w.simulation.advance(5);

    const save = migrateAndSanitize(w.state.toSave(SAVE_VERSION));
    expect(save).not.toBeNull();

    const restored = wrap(GameState.fromSave(save!));
    expect(restored.state.tick).toBe(5);
    expect(restored.construction.activeCount).toBe(1);

    const task = restored.construction.taskFor(placed.building.uid);
    expect(task?.kind).toBe('build');
    expect(task?.startedAtTick).toBe(0);
    expect(task?.completesAtTick).toBe(12);

    restored.simulation.advance(6);
    expect([...restored.state.buildings.values()][0].state).toBe('constructing');

    restored.simulation.advance(1);
    expect([...restored.state.buildings.values()][0].state).toBe('active');
  });

  it('yukseltme gorevi de kayitta korunur', () => {
    const w = makeWorld();
    const p = spot(w);
    const placed = w.buildings.place('farm', p.gx, p.gy);
    if (!placed.ok) throw new Error('kurulum basarisiz');
    w.simulation.advance(60);
    w.state.setResource('wood', 5000);
    w.state.setResource('stone', 5000);
    w.upgrades.requestUpgrade(placed.building.uid);
    w.simulation.advance(10);

    const restored = wrap(GameState.fromSave(migrateAndSanitize(w.state.toSave(SAVE_VERSION))!));
    const task = restored.construction.taskFor(placed.building.uid);
    expect(task?.kind).toBe('upgrade');

    const building = [...restored.state.buildings.values()][0];
    expect(building.level).toBe(1);
    restored.simulation.advance(35);
    expect(building.level).toBe(2);
  });

  it('bozuk gorevler sessizce tasinmaz', () => {
    function saveWithTask(construction: unknown): SaveData | null {
      return migrateAndSanitize({
        version: SAVE_VERSION,
        savedAt: Date.now(),
        tick: 10,
        resources: { food: 1, wood: 1, stone: 1, gold: 1 },
        terrainSeed: 4242,
        buildings: [
          {
            uid: 'house#1',
            type: 'house',
            gx: 5,
            gy: 5,
            level: 1,
            state: 'constructing',
            assignedWorkers: 0,
            construction,
          },
        ],
      });
    }

    // completesAtTick < startedAtTick
    let save = saveWithTask({ kind: 'build', startedAtTick: 20, completesAtTick: 5 });
    expect(save!.buildings[0].construction).toBeUndefined();
    expect(save!.buildings[0].state).toBe('active');

    // negatif tik
    save = saveWithTask({ kind: 'build', startedAtTick: -5, completesAtTick: 40 });
    expect(save!.buildings[0].construction).toBeUndefined();

    // Bilinmeyen tur BOZUK kayittir ve atilir.
    //
    // Bu beklenti Sprint 3'te bilerek sikilastirildi. Once 'build' kabul
    // ediliyordu; bu, odenmis bir yukseltmeyi seviye artirmayan bir insaata
    // cevirdigi icin sessiz veri kaybiydi. YOKLUK (v2 goc yolu) hala
    // 'build' sayilir - asagidaki ayri beklenti bunu koruyor.
    save = saveWithTask({ kind: 'teleport', startedAtTick: 0, completesAtTick: 40 });
    expect(save!.buildings[0].construction).toBeUndefined();
    expect(save!.buildings[0].state).toBe('active');

    // Bilinmeyen durum da bozuk sayilir.
    save = saveWithTask({ kind: 'build', status: 'melting', startedAtTick: 0, completesAtTick: 40 });
    expect(save!.buildings[0].construction).toBeUndefined();

    // ALANIN YOKLUGU bozukluk degildir: v2 kaydi hala 'build' olarak yuklenir.
    save = saveWithTask({ startedAtTick: 0, completesAtTick: 40 });
    expect(save!.buildings[0].construction?.kind).toBe('build');

    // suresi coktan gecmis gorev
    save = saveWithTask({ kind: 'build', startedAtTick: 0, completesAtTick: 3 });
    expect(save!.buildings[0].construction).toBeUndefined();
    expect(save!.buildings[0].state).toBe('active');
  });

  it('v2 kaydindaki gorev kind olmadan yuklenir ve build sayilir', () => {
    const legacy = {
      version: 2,
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
          construction: { startedAtTick: 0, completesAtTick: 12 },
        },
      ],
    };

    const save = migrateAndSanitize(legacy);
    expect(save!.version).toBe(SAVE_VERSION);
    expect(save!.buildings[0].construction?.kind).toBe('build');

    const restored = wrap(GameState.fromSave(save!));
    expect(restored.construction.activeCount).toBe(1);
    restored.simulation.advance(8);
    expect([...restored.state.buildings.values()][0].state).toBe('active');
  });

  it('accumulatedProduction artik kayitta tasinmaz', () => {
    const save = migrateAndSanitize({
      version: 2,
      savedAt: Date.now(),
      tick: 0,
      terrainSeed: 4242,
      resources: { food: 1, wood: 1, stone: 1, gold: 1 },
      buildings: [
        {
          uid: 'farm#1',
          type: 'farm',
          gx: 5,
          gy: 5,
          level: 1,
          state: 'active',
          assignedWorkers: 0,
          accumulatedProduction: { food: 42 },
        },
      ],
    });
    expect(save!.buildings[0]).not.toHaveProperty('accumulatedProduction');
  });
});

describe('gorev indeksi', () => {
  it('yuklemede aktif gorev indeksi durumdan yeniden kurulur', () => {
    const w = makeWorld();
    const a = spot(w);
    const b = spot(w, 1, 0);
    w.buildings.place('house', a.gx, a.gy);
    w.buildings.place('house', b.gx, b.gy);
    expect(w.construction.activeCount).toBe(2);

    const restored = wrap(GameState.fromSave(migrateAndSanitize(w.state.toSave(SAVE_VERSION))!));
    expect(restored.construction.activeCount).toBe(2);
  });

  it('rebuildFromState indeksi durumla hizalar', () => {
    const w = makeWorld();
    const p = spot(w);
    w.buildings.place('house', p.gx, p.gy);
    w.construction.rebuildFromState();
    expect(w.construction.activeCount).toBe(1);
  });
});
