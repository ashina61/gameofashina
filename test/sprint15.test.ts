/**
 * Sprint 15: seviye 3, Akademi, Bilgi kaynagi ve arastirma.
 *
 * Uc yeni kural var ve ucu de burada kilitleniyor:
 *   1. Seviye 3 - mevcut ustel egrinin bir basamak devami,
 *   2. Bilgi kaynagi - yalnizca Akademi uretir, arastirma harcar,
 *   3. Arastirma carpanlari - uretim ve kadro sayilarini olcekler.
 *
 * Ayrica eski kayitlarin (bilgisiz, arastirmasiz) hala acildigi dogrulanir.
 */
import { describe, expect, it } from 'vitest';
import { GameState } from '@/core/GameState';
import { migrateAndSanitize } from '@/core/SaveManager';
import { resolveBuilding } from '@/systems/BuildingResolver';
import { allBuildings, getBuilding, levelOf, maxLevelOf } from '@/config/BuildingCatalog';
import { allResearch, getResearch } from '@/config/ResearchCatalog';
import { RESOURCE_ORDER, SAVE_VERSION, TICKS_PER_SECOND } from '@/config/Constants';
import { MAX_VISUAL_LEVEL } from '@/render/BuildingVisuals';
import { blockSpot, makeWorld } from './helpers';
import type { ResourceKey, TestWorld } from './helpers';
import type { BuildingInstance, ResearchId } from '@/types';

/** Butun kaynaklari doldurur. */
function fill(world: TestWorld, amount = 5000): void {
  for (const key of RESOURCE_ORDER) world.state.setResource(key, amount);
}

/**
 * Akademiyi kurar, tamamlar ve istenirse yukseltir.
 *
 * Once EV kurulur: akademi isci ister, isci nufustan gelir ve nufus da
 * konuttan. Evsiz bir akademi kurulur ama hicbir sey uretmez.
 */
function academyAt(world: TestWorld, level = 1): BuildingInstance {
  fill(world);
  for (let i = 0; i < 2; i += 1) {
    const houseSpot = world.plots.availableFor('house')[0];
    world.buildings.place('house', houseSpot.gx, houseSpot.gy);
  }
  const plot = world.plots.availableFor('academy')[0];
  const placed = world.buildings.place('academy', plot.gx, plot.gy);
  if (!placed.ok) throw new Error('akademi kurulamadi');

  for (let i = 0; i < 400; i += 1) world.simulation.advance(1);
  for (let current = 1; current < level; current += 1) {
    fill(world);
    world.upgrades.requestUpgrade(placed.building.uid);
    for (let i = 0; i < 400; i += 1) world.simulation.advance(1);
  }
  fill(world);
  return placed.building;
}

describe('seviye 3: egrinin bir basamak devami', () => {
  it('her binanin ucuncu seviyesi var ve gorsel sinir da 3', () => {
    for (const def of allBuildings()) {
      expect(maxLevelOf(def), def.id).toBe(3);
    }
    expect(MAX_VISUAL_LEVEL).toBe(3);
  });

  it('maliyet, sure ve uretim her basamakta ARTAR', () => {
    for (const def of allBuildings()) {
      const two = levelOf(def, 2)!;
      const three = levelOf(def, 3)!;

      // Sure artar.
      expect(three.upgradeTime, `${def.id} sure`).toBeGreaterThan(two.upgradeTime ?? 0);

      // Her malzeme kalemi artar (Sv2'de olan hicbir kalem ucuzlamaz).
      for (const key of RESOURCE_ORDER) {
        const before = two.upgradeCost?.[key] ?? 0;
        if (before === 0) continue;
        expect(three.upgradeCost?.[key] ?? 0, `${def.id} ${key}`).toBeGreaterThan(before);
      }

      // Uretim/kapasite kalemleri de artar.
      for (const key of RESOURCE_ORDER) {
        const before = two.production?.[key] ?? 0;
        if (before === 0) continue;
        expect(three.production?.[key] ?? 0, `${def.id} uretim ${key}`).toBeGreaterThan(before);
      }
      for (const field of ['populationCapacity', 'storageCapacity', 'workerRequirement'] as const) {
        const before = two[field] ?? 0;
        if (before === 0) continue;
        expect(three[field] ?? 0, `${def.id} ${field}`).toBeGreaterThan(before);
      }
    }
  });

  it('ucuncu seviye de altin ister - altin zinciri kapali kalir', () => {
    for (const def of allBuildings()) {
      // Sehir merkezi muaf: altinin kaynagi altinla kilitlenemez.
      // Gerekcesi sprint11 testindeki "ALTIN GIDERI GERCEK" maddesinde.
      if (def.id === 'town_hall') continue;
      expect(levelOf(def, 3)?.upgradeCost?.gold ?? 0, def.id).toBeGreaterThan(0);
    }
  });

  it('seviye 3 maliyetleri TAS agirlikli: tasin gercek bir alicisi var', () => {
    let stoneHeavy = 0;
    for (const def of allBuildings()) {
      const cost = levelOf(def, 3)?.upgradeCost ?? {};
      if ((cost.stone ?? 0) > 0) stoneHeavy += 1;
    }
    // Dokuz binanin en az yedisi ucuncu seviyede tas ister.
    expect(stoneHeavy).toBeGreaterThanOrEqual(7);
  });
});

describe('Bilgi kaynagi ve Akademi', () => {
  it('bilgi kaynak listesinde ve sifirdan baslar', () => {
    expect(RESOURCE_ORDER).toContain('knowledge');
    expect(new GameState(1).resources.knowledge).toBe(0);
  });

  it('bilgiyi YALNIZCA akademi uretir', () => {
    const producers = allBuildings()
      .filter((d) => d.levels.some((l) => (l.production?.knowledge ?? 0) > 0))
      .map((d) => d.id);
    expect(producers).toEqual(['academy']);
  });

  it('akademi tek, isci ister ve tas agirlikli', () => {
    const def = getBuilding('academy');
    expect(def.maxCount).toBe(1);
    expect(def.category).toBe('special');
    expect(levelOf(def, 1)?.workerRequirement ?? 0).toBeGreaterThan(0);
    expect(levelOf(def, 1)?.buildCost?.stone ?? 0).toBeGreaterThan(0);
  });

  it('akademi kurulunca bilgi akmaya baslar', () => {
    const world = makeWorld(4242);
    const academy = academyAt(world);
    while (world.workforce.assign(academy.uid).ok) {
      /* kadroyu doldur */
    }
    for (let i = 0; i < 120; i += 1) world.simulation.advance(1);

    expect(world.economy.snapshot.netPerMinute.knowledge).toBeGreaterThan(0);
  });
});

describe('arastirma sistemi', () => {
  it('bes teknoloji var ve hepsi altin + bilgi ister', () => {
    expect(allResearch().length).toBe(5);
    for (const def of allResearch()) {
      expect(def.cost.gold ?? 0, def.id).toBeGreaterThan(0);
      expect(def.cost.knowledge ?? 0, def.id).toBeGreaterThan(0);
      expect(def.duration, def.id).toBeGreaterThan(0);
    }
  });

  it('akademi yokken arastirma baslamaz', () => {
    const world = makeWorld();
    fill(world);
    expect(world.research.start('advanced_farming')).toEqual({ ok: false, reason: 'no_academy' });
  });

  it('yetersiz kaynakta hicbir sey harcanmaz', () => {
    const world = makeWorld(777);
    academyAt(world);
    for (const key of RESOURCE_ORDER) world.state.setResource(key, 0);

    const before = { ...world.state.resources };
    expect(world.research.start('advanced_farming')).toEqual({ ok: false, reason: 'cost' });
    expect(world.state.resources).toEqual(before);
    expect(world.research.active).toBeNull();
  });

  it('baslatinca maliyet dusulur, suresi dolunca tamamlanir', () => {
    const world = makeWorld(555);
    academyAt(world);
    const def = getResearch('advanced_farming')!;

    const goldBefore = world.state.resources.gold;
    const knowledgeBefore = world.state.resources.knowledge;
    const started = world.research.start(def.id);
    expect(started.ok).toBe(true);

    expect(world.state.resources.gold).toBe(goldBefore - (def.cost.gold ?? 0));
    expect(world.state.resources.knowledge).toBe(knowledgeBefore - (def.cost.knowledge ?? 0));

    // Sure dolmadan bitmez.
    for (let i = 0; i < def.duration * TICKS_PER_SECOND - 1; i += 1) world.simulation.advance(1);
    expect(world.research.completed.has(def.id)).toBe(false);

    world.simulation.advance(1);
    expect(world.research.completed.has(def.id)).toBe(true);
    expect(world.research.active).toBeNull();
  });

  it('ayni anda tek arastirma yurur', () => {
    const world = makeWorld(606);
    academyAt(world);
    expect(world.research.start('advanced_farming').ok).toBe(true);
    expect(world.research.start('forestry')).toEqual({ ok: false, reason: 'busy' });
  });

  it('tamamlanan arastirma tekrar baslatilamaz', () => {
    const world = makeWorld(909);
    academyAt(world);
    const def = getResearch('forestry')!;
    world.research.start(def.id);
    for (let i = 0; i < def.duration * TICKS_PER_SECOND; i += 1) world.simulation.advance(1);
    fill(world);
    expect(world.research.start(def.id)).toEqual({ ok: false, reason: 'already_done' });
  });

  it('akademi seviyesi yetmezse ileri teknoloji kilitli', () => {
    const world = makeWorld(31337);
    academyAt(world, 1);
    expect(world.research.start('trade_routes')).toEqual({ ok: false, reason: 'academy_level' });

    const upgraded = makeWorld(31337);
    academyAt(upgraded, 2);
    expect(upgraded.research.start('trade_routes').ok).toBe(true);
  });
});

describe('arastirma etkileri', () => {
  it('uretim carpani GERCEK uretime yansir', () => {
    const world = makeWorld(2024);
    fill(world);
    const spot = blockSpot(world, 'farm');
    const placed = world.buildings.place('farm', spot.gx, spot.gy);
    if (!placed.ok) throw new Error('ciftlik kurulamadi');
    for (let i = 0; i < 200; i += 1) world.simulation.advance(1);

    const base = resolveBuilding(placed.building, getBuilding('farm'), world.state.tick).production
      .food!;
    const boosted = resolveBuilding(placed.building, getBuilding('farm'), world.state.tick, {
      production: { food: 1.3 },
      workerSlotBonus: 0,
    }).production.food!;

    expect(boosted).toBeCloseTo(Math.round(base * 1.3 * 10) / 10, 5);
  });

  it('kadro slotu YALNIZCA isci isteyen binaya eklenir', () => {
    const world = makeWorld(4321);
    fill(world);
    const farmSpot = blockSpot(world, 'farm');
    const farm = world.buildings.place('farm', farmSpot.gx, farmSpot.gy);
    const houseSpot = blockSpot(world, 'house');
    const house = world.buildings.place('house', houseSpot.gx, houseSpot.gy);
    if (!farm.ok || !house.ok) throw new Error('kurulum basarisiz');
    for (let i = 0; i < 200; i += 1) world.simulation.advance(1);

    const bonus = { production: {}, workerSlotBonus: 1 };
    const farmBase = resolveBuilding(farm.building, getBuilding('farm'), world.state.tick);
    const farmBoost = resolveBuilding(farm.building, getBuilding('farm'), world.state.tick, bonus);
    expect(farmBoost.workerRequirement).toBe(farmBase.workerRequirement + 1);

    // Ev isci istemez: slot eklense de sifir kalir.
    const houseBoost = resolveBuilding(house.building, getBuilding('house'), world.state.tick, bonus);
    expect(houseBoost.workerRequirement).toBe(0);
  });

  it('tamamlanan arastirma sehir capinda carpani acar', () => {
    const world = makeWorld(8080);
    academyAt(world);
    const def = getResearch('stonecutting')!;
    expect(world.research.modifiers.production.stone).toBeUndefined();

    world.research.start(def.id);
    for (let i = 0; i < def.duration * TICKS_PER_SECOND; i += 1) world.simulation.advance(1);
    expect(world.research.modifiers.production.stone).toBeCloseTo(1.4, 5);
  });
});

describe('kayit uyumu', () => {
  it('arastirma durumu kayda yazilir ve geri yuklenir', () => {
    const world = makeWorld(1234);
    academyAt(world);
    const def = getResearch('advanced_farming')!;
    world.research.start(def.id);
    for (let i = 0; i < def.duration * TICKS_PER_SECOND; i += 1) world.simulation.advance(1);

    const save = world.state.toSave(SAVE_VERSION);
    expect(save.research?.completed).toContain(def.id);

    const restored = GameState.fromSave(migrateAndSanitize(save)!);
    expect(restored.researchState?.completed).toContain(def.id);
  });

  it('arastirmasiz ESKI kayit hala acilir ve bilgi sifirdan baslar', () => {
    const legacy = {
      version: 3,
      savedAt: Date.now(),
      tick: 10,
      terrainSeed: 99,
      resources: { food: 50, wood: 60, stone: 70, gold: 80 },
      buildings: [],
    };

    const save = migrateAndSanitize(legacy)!;
    expect(save.resources.knowledge).toBe(0);
    expect(save.research?.completed).toEqual([]);
    expect(save.research?.active).toBeNull();
    expect(GameState.fromSave(save).resources.knowledge).toBe(0);
  });

  it('taninmayan arastirma kimligi sessizce atilir', () => {
    const save = migrateAndSanitize({
      version: 3,
      savedAt: Date.now(),
      tick: 0,
      terrainSeed: 5,
      resources: { food: 0, wood: 0, stone: 0, gold: 0 },
      buildings: [],
      research: { completed: ['advanced_farming', 'uydurma_teknoloji'], active: null },
    })!;
    expect(save.research?.completed).toEqual(['advanced_farming']);
  });

  it('kayit surumu hala 3', () => {
    expect(SAVE_VERSION).toBe(3);
  });
});

describe('arastirma kimlikleri katalogla tutarli', () => {
  it('her kimlik benzersiz ve katalogdan okunabilir', () => {
    const ids = allResearch().map((d) => d.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of ids) expect(getResearch(id)?.id).toBe(id as ResearchId);
    expect(getResearch('yok_boyle_bir_sey')).toBeNull();
  });
});

/** Tip kontrolu: kaynak anahtari genisledi mi? */
const _key: ResourceKey = 'knowledge';
void _key;

/*
 * 60 DAKIKALIK OLCUMUN BULDUKLARI
 *
 * Asagidaki uc kural, Sprint 15 ekonomi olcumunde gercekten olusmus
 * kilitlenmelerden turedi. Rakamlar degisebilir; KURALLAR degismemeli.
 * Her biri olcumde gorulen somut bir felakete karsi durur.
 */
describe('kilitlenme kurallari - 60 dakikalik olcumun bulgulari', () => {
  /** Bir kaynagi Sv.1'de ureten binalar. */
  function producersOf(key: ResourceKey): string[] {
    return allBuildings()
      .filter((def) => (levelOf(def, 1)?.production?.[key] ?? 0) > 0)
      .map((def) => def.id);
  }

  it('KURTULUS YOLU KENDI KAYNAGINI ISTEMEZ: her kaynagin bedava bir uretici yolu var', () => {
    /*
     * Olcumde gorulen: sehrin odunu bitti, odun ureten tek bina (oduncu
     * kampi) 3 isci istiyordu, isci veren tek bina (ev) 40 ODUN istiyordu.
     * Sehir 282 tas ve 177 altinla 60 dakika uc binada cakili kaldi.
     *
     * Kural: bir kaynak sifirlandiginda, o kaynagi uretecek EN AZ BIR
     * binanin insa maliyeti o kaynaktan bagimsiz olmali. Yoksa sifir,
     * geri donusu olmayan bir durumdur.
     */
    for (const key of ['food', 'wood', 'stone', 'gold'] as const) {
      const escapes = producersOf(key).filter(
        (id) => (levelOf(getBuilding(id as never), 1)?.buildCost?.[key] ?? 0) === 0,
      );
      expect(escapes.length, `${key} icin bedava uretici yok - kaynak sifirlaninca kilitlenir`).toBeGreaterThan(0);
    }
  });

  it('NUFUS HER ZAMAN ACILABILIR: evin maliyeti tek bir kaynaga bagli degil', () => {
    /*
     * Nufus her seyin cikis yoludur: isci olmadan hicbir uretim binasi
     * calismaz. Ev tek bir kaynaga agirlik verirse o kaynak bittiginde
     * sehir isci uretemez hale gelir - olcumde tam olarak bu oldu.
     *
     * Evin maliyeti en az iki kaynaga yayilmali ve hicbiri baskin
     * olmamali, boylece bir kaynagin darligi nufusu tek basina kilitlemesin.
     */
    const cost = levelOf(getBuilding('house'), 1)?.buildCost ?? {};
    const parts = Object.values(cost).filter((v) => (v ?? 0) > 0) as number[];
    expect(parts.length, 'ev maliyeti tek kaynaga bagli').toBeGreaterThan(1);
    const total = parts.reduce((a, b) => a + b, 0);
    expect(Math.max(...parts) / total, 'ev maliyetinde tek kaynak baskin').toBeLessThan(0.75);
  });

  it('ODUN CIKISI, SEHIR AYAKTAYKEN CALISTIRILABILIR', () => {
    /*
     * Oduncu kampi, odun bittiginde tek cikis yolu - ama olcumdeki sehir
     * onu kuramadi cunku dort kisilik nufusunun tamami tarlada ve ocakta
     * calisiyordu. "Kamp merkezin nufusundan kucuk" demek yetmez; sehrin
     * ayni anda KARNINI DOYURUP kampi da calistirabilmesi gerekir.
     *
     * Kural: tarla + oduncu kampi kadrosu, sehir merkezinin tek basina
     * verdigi nufusa sigmali. Olcumdeki degerlerle (2 + 3 > 4) sigmiyordu
     * ve sehir aclikla odunsuzluk arasinda secim yapmak zorunda kaliyordu.
     */
    const hallPop = levelOf(getBuilding('town_hall'), 1)?.populationCapacity ?? 0;
    const campNeed = levelOf(getBuilding('lumber_camp'), 1)?.workerRequirement ?? 0;
    const farmNeed = levelOf(getBuilding('farm'), 1)?.workerRequirement ?? 0;
    expect(campNeed).toBeGreaterThan(0);
    expect(
      farmNeed + campNeed,
      'sehir merkezi nufusu tarla ile oduncu kampini birlikte calistiramiyor',
    ).toBeLessThanOrEqual(hallPop);
  });

  it('AKADEMI BIR DUVAR DEGIL: Sv.1 maliyeti en pahali bina degil', () => {
    /*
     * Ilk denemede Akademi oyunun Sv.1'deki EN PAHALI binasiydi ve 60
     * dakikalik olcumde UC senaryonun ucunde de hic kurulamadi - yani
     * arastirma katmani oyunda fiilen yoktu. Arastirma bir orta oyun
     * karari olmali, bir saatlik bir duvar degil.
     */
    const totalOf = (id: string): number =>
      Object.values(levelOf(getBuilding(id as never), 1)?.buildCost ?? {}).reduce(
        (a: number, b) => a + (b ?? 0),
        0,
      );
    const academy = totalOf('academy');
    const dearer = allBuildings().filter((def) => totalOf(def.id) > academy);
    expect(dearer.length, 'Akademi oyunun en pahali Sv.1 binasi').toBeGreaterThan(0);
  });

  it('ALTIN OLCEKLENIR: pazar, isci basina en kotu bina degil', () => {
    /*
     * Olcumde altin geliri 93 nufuslu sehirde bile dakikada 2'de kaldi:
     * altinin tek olcekli kaynagi pazardi ve pazar 3 isciye 4 altin
     * veriyordu - tas ocagi 2 isciye 4 tas verirken. Makul oyuncu onu
     * hicbir zaman secmiyordu.
     *
     * Kural: pazarin isci basina getirisi, temel uretim binalarininkinden
     * dusuk olamaz. Altin oyunun her yukseltmesinde gerekli; kaynagi
     * oyunun en kotu yatirimi olmamali.
     */
    const perWorker = (id: string, key: ResourceKey): number => {
      const lv = levelOf(getBuilding(id as never), 1);
      return (lv?.production?.[key] ?? 0) / Math.max(1, lv?.workerRequirement ?? 1);
    };
    const market = perWorker('market', 'gold');
    expect(market).toBeGreaterThanOrEqual(perWorker('quarry', 'stone'));
    expect(market).toBeGreaterThanOrEqual(perWorker('lumber_camp', 'wood'));
  });
});
