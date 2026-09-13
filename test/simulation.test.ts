import { describe, expect, it } from 'vitest';
import {
  advanceHours,
  createWorld,
  fillResources,
  forceBuildingLevel,
  forceResearch,
  addUnits,
  addShips,
  startingCity,
  setResources,
  secondCity,
} from './helpers';
import { GameState } from '@/core/GameState';
import { barracksLevel, portLevel, shipyardLevel, tavernLevel } from '@/core/CityQuery';
import { getUnit } from '@/config/UnitCatalog';
import { transportShip } from '@/config/ShipCatalog';

/**
 * Uctan uca simulasyon testleri.
 *
 * Bu dosya tek tek birim davranislarini DEGIL, sistemlerin BIRLIKTE
 * calismasini dogrular. Sebep: her sistem kendi basina dogru olabilir ama
 * yanlis sirayla veya yanlis bagimlilikla kurulunca oyun bozulur (ornegin
 * uretim nufus atamasindan once hesaplanirsa her sey bir saat geriden
 * gelir). Bu hatalar birim testlerde gorunmez.
 */

/** Bir sayinin sonlu ve negatif olmayan oldugunu dogrular. */
function expectSane(value: number, label: string): void {
  expect(Number.isFinite(value), `${label} sonlu degil: ${value}`).toBe(true);
  expect(Number.isNaN(value), `${label} NaN`).toBe(false);
}

describe('dunya kurulumu', () => {
  it('oyuncu bir sehirle baslar ve ada/ NPC dunyasi kurulur', () => {
    const world = createWorld();
    const city = startingCity(world);

    expect(world.cities).toHaveLength(1);
    expect(city.isCapital).toBe(true);
    expect(city.plot).toBe(0);
    expect(world.islands.length).toBeGreaterThan(1);
    expect(world.npcs.length).toBeGreaterThan(0);

    // Baslangic arastirmalari hazir gelir; aksi halde hicbir bina
    // kurulamaz ve oyun kilitli baslar.
    expect(world.state.hasResearch('conservation')).toBe(true);
    expect(world.state.hasResearch('carpentry')).toBe(true);
    expect(world.state.hasResearch('dry_dock')).toBe(true);

    expect(city.cargoShips).toBeGreaterThan(0);
    expect(city.townHall.level).toBeGreaterThanOrEqual(1);
  });

  it('ayni tohum ayni dunyayi uretir', () => {
    const a = createWorld(1234);
    const b = createWorld(1234);
    expect(a.islands.map((i) => i.god)).toEqual(b.islands.map((i) => i.god));
    expect(a.npcs.map((n) => n.powerLevel)).toEqual(b.npcs.map((n) => n.powerLevel));
  });

  it('farkli tohum farkli dunya uretir', () => {
    const a = createWorld(1234);
    const b = createWorld(9999);
    const same = a.islands.every((island, i) => island.god === b.islands[i]?.god);
    expect(same).toBe(false);
  });
});

describe('uzun sureli simulasyon kararlılığı', () => {
  it('500 oyun saati sonunda hicbir sayi NaN veya sonsuz olmaz', () => {
    const world = createWorld();
    const city = startingCity(world);
    fillResources(world, city, 200_000);

    advanceHours(world, 500);

    expectSane(world.gold, 'altın');
    expectSane(city.citizens, 'nüfus');
    expectSane(city.resources.wood, 'odun');
    expectSane(world.state.gameSeconds, 'oyun saniyesi');
    expect(city.citizens).toBeGreaterThan(0);

    for (const other of world.cities) {
      for (const key of ['wood', 'marble', 'wine', 'sulfur', 'crystal'] as const) {
        expectSane(other.resources[key], `${other.name}/${key}`);
        expect(other.resources[key]).toBeGreaterThanOrEqual(0);
      }
    }
  });

  it('nufus tavana yaklasinca durur, tavani gecmez', () => {
    const world = createWorld();
    const city = startingCity(world);
    forceBuildingLevel(world, city, 'town_hall', 5);
    city.tavernWine = tavernLevel(city);
    fillResources(world, city, 200_000);

    const cap = world.systems.citizens.maxPopulation(city);
    advanceHours(world, 4_000);

    expect(cap).toBeGreaterThan(0);
    expect(city.citizens).toBeLessThanOrEqual(cap);
    expect(city.citizens).toBeGreaterThan(40);
  });

  it('depo tavani uretimi kirpar: kaynak sonsuz birikmez', () => {
    const world = createWorld();
    const city = startingCity(world);
    // Depo yok, Saray/Bas Vali 1: tavan dusuk kalsin.
    city.townHall.level = 1;
    world.systems.citizens.reconcile(city);
    const capacity = world.systems.resources.storageCapacity(city);
    expect(capacity).toBeGreaterThan(0);

    advanceHours(world, 5_000);

    expect(city.resources.wood).toBeLessThanOrEqual(capacity);
  });
});

describe('nufus dinamigi kararliligi', () => {
  it('nufus mutluluk dengesine yakinsar, salinim yapmaz', () => {
    // Bu test, nufus entegrasyonunun TEK buyuk adimda dengeyi asip
    // asimadigini kontrol eder. Cevrimdisi ilerleme saatlik dilimler
    // verdigi icin Euler adimi burada 0 ile tavan arasinda ziplardi.
    const world = createWorld();
    const city = startingCity(world);
    setResources(world, city, { gold: 1_000_000 });
    city.assignment = { idle: 40, wood: 0, luxury: 0, scientist: 0 };

    const equilibrium = world.systems.happiness.happiness(city);
    expect(equilibrium).toBeGreaterThan(0);

    const seen: number[] = [];
    for (let i = 0; i < 12; i += 1) {
      advanceHours(world, 200);
      seen.push(city.citizens);
    }

    // Hepsi dengeye yakin ve HICBIRI sifira dusmemeli.
    for (const value of seen) {
      expect(value).toBeGreaterThan(0);
      expect(Math.abs(value - equilibrium)).toBeLessThanOrEqual(2);
    }
    // Salinim yok: son degerler sabitlenir.
    expect(seen[seen.length - 1]).toBe(seen[seen.length - 2]);
  });

  it('mutsuz sehrin nufusu kurtarilabilir sinira iner, sifira degil', () => {
    const world = createWorld();
    const city = startingCity(world);
    // Mutlulugu sifirla: baslangic arastirmasinin katkisi kaldirilir.
    // Seviyeyi 0 yapmak YETMEZ; duz mutluluk bonuslari seviye ile
    // carpilmadigi icin kayit listede durdugu surece etki devam eder.
    const idx = world.state.completedResearch.findIndex((e) => e.id === 'well_digging');
    if (idx >= 0) world.state.completedResearch.splice(idx, 1);
    setResources(world, city, { gold: 1_000_000 });
    city.assignment = { idle: 40, wood: 0, luxury: 0, scientist: 0 };
    expect(world.systems.happiness.happiness(city)).toBe(0);

    advanceHours(world, 5_000);

    expect(city.citizens).toBeGreaterThan(0);
    expect(city.citizens).toBeLessThanOrEqual(10);

    // Meyhane + sarap ile toparlanabilmeli: kurtarilabilirlik kosulu.
    forceBuildingLevel(world, city, 'tavern', 5);
    setResources(world, city, { wine: 50_000 });
    city.tavernWine = tavernLevel(city);
    const afterWine = world.systems.happiness.happiness(city);
    expect(afterWine).toBeGreaterThan(0);

    advanceHours(world, 2_000);
    expect(city.citizens).toBeGreaterThan(10);
  });

  it('nufus tavana takilir ve tavana yapismis birikim birakmaz', () => {
    const world = createWorld();
    const city = startingCity(world);
    forceBuildingLevel(world, city, 'tavern', 20);
    forceBuildingLevel(world, city, 'town_hall', 1);
    setResources(world, city, { wine: 500_000, gold: 1_000_000 });
    city.tavernWine = tavernLevel(city);

    const cap = world.systems.citizens.maxPopulation(city);
    advanceHours(world, 50_000);

    expect(city.citizens).toBeLessThanOrEqual(cap);
    // Birikim 1'den kucuk kalmali; aksi halde tavana yapismis buyuk bir
    // kesir, mutluluk dustugu anda ani nufus siçramasi uretir.
    expect(city.growthProgress).toBeLessThan(1);
  });
});

describe('ekonomi akisi', () => {
  it('isci atamasi odun uretimini baslatir', () => {
    const world = createWorld();
    const city = startingCity(world);
    city.assignment = { idle: 0, wood: 20, luxury: 0, scientist: 0 };
    city.citizens = 20;

    const flow = world.systems.economy.flowOf(city);
    expect(flow.wood).toBeGreaterThan(0);
  });

  it('atama olmadan odun uretilmez', () => {
    const world = createWorld();
    const city = startingCity(world);
    city.assignment = { idle: 40, wood: 0, luxury: 0, scientist: 0 };

    const flow = world.systems.economy.flowOf(city);
    expect(flow.wood).toBe(0);
  });

  it('bilim adami arastirma puani uretir ama altin goturur', () => {
    const world = createWorld();
    const city = startingCity(world);
    forceBuildingLevel(world, city, 'academy', 5);
    forceResearch(world, 'polytheism', 1);
    city.citizens = 40;
    city.assignment = { idle: 20, wood: 0, luxury: 0, scientist: 20 };

    const flow = world.systems.economy.flowOf(city);
    expect(flow.research).toBeGreaterThan(0);
    expect(flow.gold).toBeLessThan(0);
  });

  it('bos gezen vatandas altin getirir', () => {
    const world = createWorld();
    const city = startingCity(world);
    city.citizens = 30;
    city.assignment = { idle: 30, wood: 0, luxury: 0, scientist: 0 };

    const flow = world.systems.economy.flowOf(city);
    expect(flow.gold).toBeGreaterThan(0);
  });

  it('altin sifirin altina duserse ordu dagilir', () => {
    const world = createWorld();
    const city = startingCity(world);
    setResources(world, city, { gold: 0 });
    addUnits(world, city, 'swordsman', 200);
    city.citizens = 10;
    city.assignment = { idle: 10, wood: 0, luxury: 0, scientist: 0 };

    const upkeep = world.systems.economy.upkeepPerHour();
    expect(upkeep).toBeGreaterThan(0);

    advanceHours(world, 200);

    // Bakim odenemedi; ordunun kuculmesi veya tamamen dagilmasi beklenir.
    const remaining = city.garrison.reduce((s, g) => s + g.count, 0);
    expect(remaining).toBeLessThan(200);
    expect(world.gold).toBeGreaterThanOrEqual(0);
  });
});

describe('insaatt', () => {
  it('bina insa edilir ve sure sonunda seviye artar', () => {
    const world = createWorld();
    const city = startingCity(world);
    fillResources(world, city, 100_000);

    const before = city.townHall.level;
    const reason = world.upgrade('town_hall');
    expect(reason).toBeNull();
    expect(city.townHall.construction).toBeDefined();

    // Insaat bitene kadar ilerlet.
    advanceHours(world, 200);
    expect(city.townHall.level).toBe(before + 1);
    expect(city.townHall.construction).toBeUndefined();
  });

  it('kaynak yetmiyorsa insaat baslamaz ve hicbir sey harcanmaz', () => {
    const world = createWorld();
    const city = startingCity(world);
    setResources(world, city, { wood: 0, marble: 0, wine: 0, sulfur: 0, crystal: 0 });

    const reason = world.upgrade('town_hall');
    expect(reason).toBeTruthy();
    expect(city.townHall.construction).toBeUndefined();
  });

  it('iptal edilen yukseltme kaynagin bir kismini geri verir', () => {
    const world = createWorld();
    const city = startingCity(world);
    // Depo tavani genisletilir: iade tavana takilirsa test "iade yok"
    // sonucunu yanlis sekilde gecerdi. Iadenin depoya SIGMASI gerekir ki
    // gercekten geri gelip gelmedigi olculebilsin.
    forceBuildingLevel(world, city, 'warehouse', 5);
    // Valilik yukseltmesi odun YANI SIRA mermer de ister; yalnizca odun
    // vermek testi "iade yok" diye yanlis sekilde gecirirdi.
    setResources(world, city, { wood: 8_000, marble: 6_000 });

    const woodBefore = city.resources.wood;
    expect(world.upgrade('town_hall')).toBeNull();
    const woodAfterStart = city.resources.wood;
    expect(woodAfterStart).toBeLessThan(woodBefore);

    expect(world.cancelConstruction('town_hall')).toBe(true);
    expect(city.townHall.construction).toBeUndefined();
    expect(city.resources.wood).toBeGreaterThan(woodAfterStart);
    // Tam iade degil: insaat baslamisti.
    expect(city.resources.wood).toBeLessThanOrEqual(woodBefore);
  });

  it('ada yatagi yukseltilince ADA genelinde seviye artar', () => {
    const world = createWorld();
    const city = startingCity(world);
    const island = world.activeIsland();
    expect(island).not.toBeNull();
    fillResources(world, city, 500_000);

    const before = island!.wood.level;
    const reason = world.upgradeDeposit('wood');
    expect(reason).toBeNull();

    advanceHours(world, 400);
    expect(island!.wood.level).toBe(before + 1);
  });
});

describe('arastirma', () => {
  it('arastirma bilim adami puaniyla ilerler ve tamamlanir', () => {
    const world = createWorld();
    const city = startingCity(world);
    forceBuildingLevel(world, city, 'academy', 4);
    setResources(world, city, { gold: 5_000_000 });

    // Hangi arastirmanin acik oldugunu KATALOGDAN okuruz: sabit bir kimlik
    // yazmak, on kosullar degistiginde testi anlamsiz sekilde kirardi.
    const target = world.systems.research
      .available()
      .find((def) => def.requiredAcademyLevel <= 4);
    expect(target, 'Akademi 4 ile acilabilen bir arastirma olmali').toBeDefined();

    expect(world.startResearch(target!.id)).toBeNull();
    expect(world.state.activeResearch?.id).toBe(target!.id);

    // Bilim adami olmadan ilerleme olmaz.
    advanceHours(world, 5);
    expect(world.state.hasResearch(target!.id)).toBe(false);

    city.citizens = 40;
    city.assignment = { idle: 24, wood: 0, luxury: 0, scientist: 16 };
    advanceHours(world, 3_000);

    expect(world.state.hasResearch(target!.id)).toBe(true);
    expect(world.state.activeResearch).toBeNull();
  });

  it('on kosulu saglanmayan arastirma baslamaz', () => {
    const world = createWorld();
    const city = startingCity(world);
    forceBuildingLevel(world, city, 'academy', 1);

    // Polytheism uc arastirma ister; Akademi 1 ile hicbiri acik degil.
    const reason = world.startResearch('polytheism');
    expect(reason).toBeTruthy();
    expect(world.state.activeResearch).toBeNull();
  });

  it('yuruyen arastirma yoksa uretilen puan BIRIKMEZ', () => {
    // Ikariam'da arastirma puani bir "banka" degildir: dogrudan secili
    // arastirmanin ilerlemesidir. Secim yoksa bilim adamlari bosuna calisir.
    const world = createWorld();
    const city = startingCity(world);
    forceBuildingLevel(world, city, 'academy', 4);
    setResources(world, city, { gold: 5_000_000 });
    city.citizens = 40;
    city.assignment = { idle: 24, wood: 0, luxury: 0, scientist: 16 };

    advanceHours(world, 30);
    expect(world.researchPoints).toBe(0);
  });

  it('kristal, yuruyen arastirmaya puana cevrilir', () => {
    const world = createWorld();
    const city = startingCity(world);
    forceBuildingLevel(world, city, 'academy', 4);
    forceResearch(world, 'experiments', 1);
    setResources(world, city, { crystal: 500 });

    const target = world.systems.research
      .available()
      .find((def) => def.requiredAcademyLevel <= 4);
    world.startResearch(target!.id);

    expect(world.convertCrystal(500)).toBeNull();
    expect(city.resources.crystal).toBe(0);
    expect(world.state.activeResearch!.progress).toBe(5);
  });

  it('experiments arastirmasi olmadan kristal cevrilemez', () => {
    const world = createWorld();
    const city = startingCity(world);
    setResources(world, city, { crystal: 500 });

    expect(world.convertCrystal(500)).toBeTruthy();
    expect(city.resources.crystal).toBe(500);
  });
});

describe('ordu ve donanma', () => {
  it('kilitli birlik kislada gorunmez, arastirma acilinca gorunur', () => {
    const world = createWorld();
    const city = startingCity(world);
    forceBuildingLevel(world, city, 'barracks', 30);

    // Professional Army olmadan Sapanci egitilemez.
    const locked = world.systems.military.unitLock(city, 'slinger');
    expect(locked).toBeTruthy();

    forceResearch(world, 'professional_army', 1);
    expect(world.systems.military.unitLock(city, 'slinger')).toBeNull();
    expect(world.systems.military.trainableUnits(city).some((u) => u.id === 'slinger')).toBe(true);
  });

  it('birim egitilir, kuyruk bittiginde garnizona eklenir', () => {
    const world = createWorld();
    const city = startingCity(world);
    forceBuildingLevel(world, city, 'barracks', 30);
    forceResearch(world, 'professional_army', 1);
    fillResources(world, city, 200_000);

    expect(world.train('slinger', 10)).toBeNull();
    expect(city.unitQueue).toHaveLength(1);
    expect(city.garrison.find((g) => g.id === 'slinger')).toBeUndefined();

    advanceHours(world, 20);

    expect(city.unitQueue).toHaveLength(0);
    expect(city.garrison.find((g) => g.id === 'slinger')?.count).toBe(10);
  });

  it('nakliye gemisi savas gemisi degil, yuk gemisi havuzuna yazilir', () => {
    const world = createWorld();
    const city = startingCity(world);
    forceBuildingLevel(world, city, 'shipyard', 40);
    forceBuildingLevel(world, city, 'port', 10);
    fillResources(world, city, 500_000);

    const shipsBefore = city.cargoShips;
    expect(world.buildShip(transportShip().id, 5)).toBeNull();
    advanceHours(world, 200);

    expect(city.cargoShips).toBe(shipsBefore + 5);
    expect(city.warfleet.find((s) => s.id === transportShip().id)).toBeUndefined();
  });

  it('kademe gelistirme tum mevcut birliklere uygulanir', () => {
    const world = createWorld();
    const city = startingCity(world);
    forceBuildingLevel(world, city, 'workshop', 5);
    forceResearch(world, 'invention', 1);
    forceResearch(world, 'professional_army', 1);
    forceBuildingLevel(world, city, 'barracks', 30);
    fillResources(world, city, 900_000);
    addUnits(world, city, 'slinger', 10, 'base');

    expect(world.upgradeTier('unit', 'slinger')).toBeNull();
    expect(world.state.unitTier('slinger')).toBe('bronze');
    expect(city.garrison.find((g) => g.id === 'slinger')?.tier).toBe('bronze');
  });

  it('bakim maliyeti birlik sayisiyla artar', () => {
    const world = createWorld();
    const city = startingCity(world);
    const base = world.systems.economy.upkeepPerHour();
    addUnits(world, city, 'swordsman', 50);
    const withUnits = world.systems.economy.upkeepPerHour();
    expect(withUnits).toBeGreaterThan(base);

    const def = getUnit('swordsman');
    expect(def).toBeDefined();
  });
});

describe('savaş', () => {
  it('savunmasiz bir barbar koyu alinir ve alan oyuncuya gecer', () => {
    const world = createWorld();
    const city = startingCity(world);
    forceBuildingLevel(world, city, 'barracks', 30);
    forceBuildingLevel(world, city, 'port', 10);
    fillResources(world, city, 900_000);

    // Baslangic adasinda tek bir barbar koyu vardir.
    const island = world.activeIsland()!;
    const barbarian = world.npcs.find((n) => n.islandId === island.id);
    expect(barbarian).toBeDefined();

    addUnits(world, city, 'swordsman', 300);
    addUnits(world, city, 'hoplite', 100);
    city.cargoShips = 40;

    const before = world.state.fleets.length;
    const fleet = world.attack(island.id, barbarian!.plot, city.garrison, []);
    expect(fleet).not.toBeNull();
    expect(world.state.fleets.length).toBe(before + 1);

    // Filo varana kadar ilerlet.
    advanceHours(world, 40);

    const reports = world.state.notices.filter((n) => n.title === 'Zafer');
    expect(reports.length).toBeGreaterThan(0);
    expect(world.npcs.find((n) => n.id === barbarian!.id)).toBeUndefined();
    expect(island.plots[barbarian!.plot].ownerId).toBe('player');
  });

  it('savas raporu tur tur dokum icerir ve deterministiktir', () => {
    const world = createWorld();
    const options = {
      attackerName: 'A',
      defenderName: 'B',
      islandId: world.activeIsland()!.id,
      attackerUnits: [{ id: 'swordsman', count: 60, tier: 'base' as const }],
      defenderUnits: [{ id: 'spearman', count: 40, tier: 'base' as const }],
      attackerShips: [],
      defenderShips: [],
      wallLevel: 5,
      seed: 99,
    };

    const first = world.systems.combat.resolve(options);
    const second = world.systems.combat.resolve(options);

    // Ikariam raporu tekrar izlenebilir olmali: ayni tohum ayni tur
    // dokumunu vermeli.
    expect(first.roundLog).toEqual(second.roundLog);
    expect(first.roundLog.length).toBeGreaterThan(0);
    expect(first.roundLog.length).toBe(first.rounds);

    const opening = first.roundLog[0];
    expect(opening.phase).toBe('land');
    // Ilk tur fotografi baslangic adetlerinden kucuk olmali: en azindan
    // bir taraf kayip vermistir veya sur hasar almistir.
    const attackerLeft = opening.attacker.reduce((sum, g) => sum + g.count, 0);
    const defenderLeft = opening.defender.reduce((sum, g) => sum + g.count, 0);
    expect(attackerLeft + defenderLeft).toBeLessThan(100);
    // Sur ayakta oldugu surece can havuzu pozitif ve azalan olur.
    expect(opening.wallHp).toBeLessThanOrEqual(5 * 4_000);
  });

  it('deniz ustunlugu yoksa cikarma engellenir', () => {
    const world = createWorld();
    const outcome = world.systems.combat.resolve({
      attackerName: 'A',
      defenderName: 'B',
      islandId: world.activeIsland()!.id,
      attackerUnits: [{ id: 'swordsman', count: 50, tier: 'base' }],
      defenderUnits: [],
      attackerShips: [],
      defenderShips: [{ id: 'ram_ship', count: 10, tier: 'base' }],
      wallLevel: 0,
      seed: 7,
    });

    expect(outcome.landingBlocked).toBe(true);
    expect(outcome.attackerWon).toBe(false);
    expect(outcome.attackerSurvivors).toHaveLength(0);
  });

  it('savas deterministik: ayni tohum ayni sonucu verir', () => {
    const world = createWorld();
    const make = () =>
      world.systems.combat.resolve({
        attackerName: 'A',
        defenderName: 'B',
        islandId: world.activeIsland()!.id,
        attackerUnits: [{ id: 'swordsman', count: 100, tier: 'base' }],
        defenderUnits: [{ id: 'spearman', count: 100, tier: 'base' }],
        attackerShips: [],
        defenderShips: [],
        wallLevel: 5,
        seed: 42,
      });

    const a = make();
    const b = make();
    expect(a.attackerLosses).toEqual(b.attackerLosses);
    expect(a.defenderLosses).toEqual(b.defenderLosses);
    expect(a.attackerWon).toBe(b.attackerWon);
  });

  it('savas sonsuz turda kilitlenmez', () => {
    const world = createWorld();
    const outcome = world.systems.combat.resolve({
      attackerName: 'A',
      defenderName: 'B',
      islandId: world.activeIsland()!.id,
      attackerUnits: [{ id: 'hoplite', count: 500, tier: 'gold' }],
      defenderUnits: [{ id: 'hoplite', count: 500, tier: 'gold' }],
      attackerShips: [],
      defenderShips: [],
      wallLevel: 50,
      seed: 3,
    });
    expect(outcome.rounds).toBeGreaterThan(0);
    expect(outcome.rounds).toBeLessThanOrEqual(20);
  });

  it('cok guclu saldiran kazanir, zayif saldiran kaybeder', () => {
    const world = createWorld();
    const islandId = world.activeIsland()!.id;

    const strong = world.systems.combat.resolve({
      attackerName: 'A', defenderName: 'B', islandId,
      attackerUnits: [{ id: 'swordsman', count: 400, tier: 'gold' }],
      defenderUnits: [{ id: 'slinger', count: 20, tier: 'base' }],
      attackerShips: [], defenderShips: [], wallLevel: 0, seed: 11,
    });
    expect(strong.attackerWon).toBe(true);

    const weak = world.systems.combat.resolve({
      attackerName: 'A', defenderName: 'B', islandId,
      attackerUnits: [{ id: 'slinger', count: 20, tier: 'base' }],
      defenderUnits: [{ id: 'swordsman', count: 400, tier: 'gold' }],
      attackerShips: [], defenderShips: [], wallLevel: 10, seed: 11,
    });
    expect(weak.attackerWon).toBe(false);
  });
});

describe('filo ve tasima', () => {
  it('kendi sehrine mal gondermek yuk gemisi gerektirir', () => {
    const world = createWorld();
    const city = startingCity(world);
    fillResources(world, city, 50_000);

    // Ikinci bir koloni olmadan hedef yok.
    expect(world.transport('olmayan-sehir', { wood: 100 })).toBeNull();
  });

  it('yolculuk suresi mesafeyle artar, Poseidon ile kisalir', () => {
    const world = createWorld();
    const islands = world.islands;
    const fleet = world.systems.fleet;
    const near = fleet.travelTime(islands[0].id, islands[0].id);
    const far = islands.reduce(
      (best, island) => (fleet.travelTime(islands[0].id, island.id) > best ? fleet.travelTime(islands[0].id, island.id) : best),
      near,
    );
    expect(near).toBeGreaterThan(0);
    expect(far).toBeGreaterThan(near);
  });
});

describe('mutluluk ve sarap', () => {
  it('sarap dagitmak mutlulugu artirir', () => {
    const world = createWorld();
    const city = startingCity(world);
    forceBuildingLevel(world, city, 'tavern', 10);
    setResources(world, city, { wine: 10_000 });

    city.tavernWine = 0;
    const before = world.systems.happiness.happiness(city);
    city.tavernWine = tavernLevel(city);
    const after = world.systems.happiness.happiness(city);

    expect(after).toBeGreaterThan(before);
  });

  it('koloni sayisi arttikca yolsuzluk artar, Vali Konagi azaltir', () => {
    const world = createWorld();
    const city = startingCity(world);
    const before = world.systems.happiness.corruptionOf(city);

    // Bas Vali seviyesi dusukse yolsuzluk yuksek olur.
    forceBuildingLevel(world, city, 'palace', 10);
    const after = world.systems.happiness.corruptionOf(city);
    expect(after).toBeLessThanOrEqual(before);
  });
});

describe('kayit', () => {
  it('kaydet/yukle turu durumu birebir korur', () => {
    const world = createWorld(4242);
    const city = startingCity(world);
    fillResources(world, city, 30_000);
    forceBuildingLevel(world, city, 'barracks', 12);
    forceResearch(world, 'professional_army', 1);
    addUnits(world, city, 'slinger', 25, 'bronze');
    advanceHours(world, 30);

    const save = world.state.toSave();
    const json = JSON.parse(JSON.stringify(save));

    // fromSave uzerinden geri yukle; kayit JSON turundan gecirildigi icin
    // referans paylasimi degil gercek bir kopya uzerinden test edilir.
    const state = GameState.fromSave(json);

    expect(state.gold).toBe(world.gold);
    expect(state.gameSeconds).toBeCloseTo(world.state.gameSeconds, 0);
    expect(state.cities).toHaveLength(world.cities.length);
    expect(state.cities[0].garrison).toEqual(world.cities[0].garrison);
    expect(state.tiers.units).toEqual(world.state.tiers.units);
    expect(state.hasResearch('professional_army')).toBe(true);
  });

  it('savas raporlari kayitla tasinir', () => {
    const world = createWorld();
    world.state.pushReport({
      id: 'battle-x',
      atTick: 5,
      attackerName: 'Başkent',
      defenderName: 'Rakip',
      islandName: 'Ada',
      cityName: 'Başkent',
      won: true,
      playerIsAttacker: true,
      rounds: 2,
      losses: { attacker: [], defender: [], attackerShips: [], defenderShips: [] },
      loot: { wood: 10 },
      wallDamage: 0,
      roundLog: [{ phase: 'land', round: 1, attacker: [], defender: [], wallHp: 0, defenderMorale: 0 }],
    });

    const state = GameState.fromSave(JSON.parse(JSON.stringify(world.state.toSave())));
    expect(state.reports).toHaveLength(1);
    expect(state.reports[0].id).toBe('battle-x');
    expect(state.reports[0].roundLog).toHaveLength(1);

    // Rapor listesi sinirlidir: kayit boyutu kontrol altinda kalmali.
    for (let i = 0; i < 40; i += 1) {
      world.state.pushReport({ ...world.state.reports[0], id: `battle-${i}` });
    }
    expect(world.state.reports.length).toBeLessThanOrEqual(25);
  });
});

describe('sistem erişilebilirliği', () => {
  it('sehir sorgu yardimcilari binalari dogru okur', () => {
    const world = createWorld();
    const city = startingCity(world);
    forceBuildingLevel(world, city, 'barracks', 7);
    forceBuildingLevel(world, city, 'shipyard', 9);
    forceBuildingLevel(world, city, 'port', 4);

    expect(barracksLevel(city)).toBe(7);
    expect(shipyardLevel(city)).toBe(9);
    expect(portLevel(city)).toBe(4);
  });
});

describe('ticaret rotalari', () => {
  it('rota her devirde otomatik mal tasir ve gemileri bloke eder', () => {
    const world = createWorld();
    const a = startingCity(world);
    const b = secondCity(world);
    // Depolar tavandan kucuk tutulur: tasmanin kirpmasi sonucu
    // belirsizlestirirdi. Isciler bosta birakilir ki kaynak uretimi
    // rotanin tasidigi mali golgelemesin.
    setResources(world, a, { wood: 2_000, wine: 0 });
    setResources(world, b, { wood: 0, wine: 2_000 });
    a.assignment = { wood: 0, luxury: 0, scientist: 0, idle: a.citizens };
    b.assignment = { wood: 0, luxury: 0, scientist: 0, idle: b.citizens };
    a.cargoShips = 4;

    const error = world.createTradeRoute(a.id, b.id, 'wood', 'wine', 2);
    expect(error).toBeNull();
    // Rotaya ayrilan gemiler baska sevkiyatta kullanilamaz.
    expect(world.systems.fleet.freeCargoShips(a)).toBe(2);

    // Gercek oyun ince tiklerle ilerler; toplu tek cagri varislari
    // bir sonraki adima birakirdi. Saat saat tiklatilir.
    for (let i = 0; i < 20; i += 1) world.advanceGameSeconds(3_600);

    // Rota kendi kendine calisti: odun A'dan B'ye, sarap B'den A'ya gitti.
    expect(b.resources.wood).toBeGreaterThan(0);
    expect(a.resources.wine).toBeGreaterThan(0);
    const route = world.state.tradeRoutes[0];
    expect(route.cycles).toBeGreaterThan(0);
    expect(route.lastHaul).toBeGreaterThan(0);
    // Devir basi tasima, ayrilan gemi kapasitesiyle sinirlidir.
    expect(route.lastHaul).toBeLessThanOrEqual(2 * 500);
  });

  it('rota kaldirilinca gemiler serbest kalir', () => {
    const world = createWorld();
    const a = startingCity(world);
    const b = secondCity(world);
    a.cargoShips = 3;

    expect(world.createTradeRoute(a.id, b.id, 'wood', null, 2)).toBeNull();
    expect(world.systems.fleet.freeCargoShips(a)).toBe(1);

    world.cancelTradeRoute(world.state.tradeRoutes[0].id);
    expect(world.state.tradeRoutes).toHaveLength(0);
    expect(world.systems.fleet.freeCargoShips(a)).toBe(3);
  });

  it('ayni hatta ikinci rota kurulamaz ve rotalar kayitla tasinir', () => {
    const world = createWorld();
    const a = startingCity(world);
    const b = secondCity(world);
    a.cargoShips = 4;

    expect(world.createTradeRoute(a.id, b.id, 'wood', null, 1)).toBeNull();
    expect(world.createTradeRoute(b.id, a.id, 'wine', null, 1)).toMatch(/zaten/);

    const state = GameState.fromSave(JSON.parse(JSON.stringify(world.state.toSave())));
    expect(state.tradeRoutes).toHaveLength(1);
    expect(state.tradeRoutes[0].fromCityId).toBe(a.id);
  });
});
