/**
 * @vitest-environment jsdom
 *
 * Arayuz katmaninin duman testi.
 *
 * Phaser olmadan, gercek GameWorld uzerinde HTML arayuzunu kurar ve
 * tum panelleri ACIP kapatir. Amac gorsel dogrulama DEGIL, arayuzdeki
 * sablon (template) hatalarini yakalamaktir: tanimlanmamis bir alana
 * erisim, yanlis isimli bir alan veya null bir nesnenin ozelligini okuma
 * burada "Cannot read properties of undefined" olarak patlar.
 *
 * Bu sinif hata birim testlerde gorunmez, cunku birimler sistemi test
 * eder; arayuz ise o sistemi BASKA isimlerle okur.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createWorld, startingCity, secondCity, fillResources, forceBuildingLevel, addUnits, addShips } from './helpers';
import { Ui } from '@/ui/Ui';
import type { GameWorld } from '@/core/GameWorld';
import type { CitySlotSelection } from '@/types';

/** Phaser.Game'in arayuzun dokundugu kismi. */
function stubGame(): {
  registry: Map<string, unknown>;
  scene: { getScenes: () => Array<{ scene: { key: string } }>; isActive: () => boolean; start: () => void; stop: () => void };
} {
  const registry = new Map<string, unknown>();
  return {
    registry: registry as unknown as Map<string, unknown>,
    scene: {
      getScenes: () => [{ scene: { key: 'CityScene' } }],
      isActive: () => true,
      start: () => undefined,
      stop: () => undefined,
    },
  };
}

let world: GameWorld;
let game: ReturnType<typeof stubGame>;
let ui: Ui | null = null;

beforeEach(() => {
  document.body.innerHTML = '<div id="ui-root"></div>';
  world = createWorld();
  game = stubGame();
  ui = new Ui(world, game as never);
});

afterEach(() => {
  ui?.destroy();
  ui = null;
  vi.restoreAllMocks();
});

/** Arayuzdeki bir sayfayi acmak icin alt gezinmeye tiklar. */
function openPage(id: string): void {
  const button = document.querySelector(`.bottomnav button[data-page="${id}"]`) as HTMLButtonElement;
  expect(button, `alt gezinmede ${id} yok`).toBeTruthy();
  button.click();
}

function sheetHtml(): string {
  return document.querySelector('.sheet-body')?.innerHTML ?? '';
}

describe('arayuz kurulumu', () => {
  it('ust cubuk ve alt gezinme kurulur', () => {
    expect(document.querySelector('.topbar')).toBeTruthy();
    expect(document.querySelectorAll('.bottomnav button').length).toBe(5);
    expect(document.querySelector('.resource-row')?.children.length).toBeGreaterThan(0);
  });

  it('kaynak cubugunda NaN veya undefined gorunmez', () => {
    const html = document.querySelector('.resource-row')?.textContent ?? '';
    expect(html).not.toContain('NaN');
    expect(html).not.toContain('undefined');
  });
});

describe('paneller', () => {
  it('bilim paneli acilir ve arastirmalari listeler', () => {
    const city = startingCity(world);
    forceBuildingLevel(world, city, 'academy', 4);
    openPage('research');

    const html = sheetHtml();
    expect(html).toContain('Araştırma');
    expect(html).toContain('list-row');
    expect(html).not.toContain('NaN');
  });

  it('ordu paneli uc sekmede de patlamaz', () => {
    const city = startingCity(world);
    forceBuildingLevel(world, city, 'barracks', 20);
    forceBuildingLevel(world, city, 'shipyard', 20);
    forceBuildingLevel(world, city, 'workshop', 5);
    addUnits(world, city, 'swordsman', 10);
    addShips(world, city, 'ram_ship', 3);

    openPage('military');
    expect(sheetHtml()).toContain('Kışla');

    for (const tab of ['ships', 'tiers', 'units']) {
      const button = document.querySelector(`.tabs button[data-mtab="${tab}"]`) as HTMLButtonElement;
      button.click();
      expect(sheetHtml().length).toBeGreaterThan(0);
      expect(sheetHtml()).not.toContain('NaN');
    }
  });

  it('posta paneli bosken de cizilir', () => {
    // Posta alt gezinmede degil, ust cubuktaki ikondadir.
    const button = document.querySelector('.topbar [data-page="notices"]') as HTMLButtonElement;
    expect(button).toBeTruthy();
    button.click();
    expect(sheetHtml()).toContain('bildirim');
  });

  it('sehir ozeti ust cubuktaki sehir hapindan acilir', () => {
    const pill = document.querySelector('[data-action="city-overview"]') as HTMLButtonElement;
    expect(pill).toBeTruthy();
    pill.click();
    const html = sheetHtml();
    expect(html).toContain('Vatandaş dağılımı');
    expect(html).toContain('wine-plus');
  });

  it('ada ozeti ust cubuktaki ada ikonundan acilir', () => {
    const button = document.querySelector('[data-action="island-overview"]') as HTMLButtonElement;
    expect(button).toBeTruthy();
    button.click();
    const html = sheetHtml();
    expect(html).toContain('İnanç');
    expect(html).toContain('activate-wonder');
  });
});

describe('secim akisi', () => {
  it('sehir karosu secildiginde bina sayfasi acilir', () => {
    const city = startingCity(world);
    const selection: CitySlotSelection = {
      cityId: city.id,
      kind: 'town_hall',
      buildingId: 'town_hall',
      ground: -1,
    };
    world.bus.emit('select:city-slot', selection);

    // Bina adi sayfa BASLIGINDA, eylemler govdededir.
    expect(document.querySelector('.sheet-head h2')?.textContent).toContain('Valilik');
    expect(sheetHtml()).toContain('Yükselt');
  });

  it('bos alana dokunulunca bina secici acilir', () => {
    const city = startingCity(world);
    const selection: CitySlotSelection = {
      cityId: city.id,
      kind: 'ground',
      buildingId: '',
      ground: 0,
    };
    world.bus.emit('select:city-slot', selection);

    expect(document.querySelector('.sheet-head h2')?.textContent).toContain('Boş yapı alanı');
    expect(sheetHtml()).toContain('list-row');
  });

  it('ada seciminde bos alan koloni kurma ekrani getirir', () => {
    const island = world.activeIsland();
    expect(island).not.toBeNull();
    const freePlot = island!.plots.findIndex((p) => p.ownerId === null);

    world.bus.emit('select:island-slot', { islandId: island!.id, plot: freePlot, kind: 'plot' });
    const html = sheetHtml();
    expect(html).toContain('koloni');
  });

  it('NPC seciminde saldiri ve ticaret ekrani gelir', () => {
    const city = startingCity(world);
    fillResources(world, city, 100_000);
    addUnits(world, city, 'swordsman', 50);
    city.cargoShips = 20;

    const island = world.activeIsland();
    const npc = world.npcs.find((n) => n.islandId === island!.id);
    expect(npc, 'başlangıç adasında bir NPC olmalı').toBeDefined();

    world.bus.emit('select:island-slot', { islandId: island!.id, plot: npc!.plot, kind: 'plot' });
    const html = sheetHtml();
    expect(html).toContain('Saldırı');
    expect(html).toContain('Ticaret');
    expect(html).not.toContain('NaN');
  });

  it('dunya seciminde ada detayi gelir', () => {
    const island = world.activeIsland();
    world.bus.emit('select:world-island', { islandId: island!.id });
    expect(sheetHtml()).toContain('İnanç');
  });
});

describe('eylemler', () => {
  it('hiz degistirme butonlari calisir', () => {
    const button = document.querySelector('.speed-pill button[data-speed="10"]') as HTMLButtonElement;
    expect(button).toBeTruthy();
    button.click();
    expect(world.timeScale).toBe(10);
  });

  it('duraklat dugmesi simulasyonu durdurur', () => {
    const pause = document.querySelector('[data-action="toggle-pause"]') as HTMLButtonElement;
    expect(pause).toBeTruthy();
    const before = world.running;
    pause.click();
    expect(world.running).toBe(!before);
    // Ikinci tiklama geri alir. Buton yeniden cizildigi icin yeniden bul.
    const again = document.querySelector('[data-action="toggle-pause"]') as HTMLButtonElement;
    again.click();
    expect(world.running).toBe(before);
  });

  it('sarap artir/azalt dugmeleri meyhaneye dokunur', () => {
    const city = startingCity(world);
    forceBuildingLevel(world, city, 'tavern', 5);
    fillResources(world, city, 10_000);

    // Sarap kontrolleri sehir OZET sayfasindadir.
    (document.querySelector('[data-action="city-overview"]') as HTMLButtonElement).click();
    const plus = document.querySelector('[data-action="wine-plus"]') as HTMLButtonElement;
    expect(plus).toBeTruthy();
    plus.click();
    expect(city.tavernWine).toBe(1);
  });
});

describe('filo ve savas raporlari', () => {
  it('askeri sayfanin filolar sekmesi calisir', () => {
    const city = startingCity(world);
    forceBuildingLevel(world, city, 'barracks', 20);
    addUnits(world, city, 'swordsman', 20);
    city.cargoShips = 5;

    const island = world.activeIsland()!;
    const npc = world.npcs.find((n) => n.islandId === island.id)!;
    world.attack(island.id, npc.plot, [{ id: 'swordsman', count: 10, tier: 'base' }], []);

    openPage('military');
    const tab = document.querySelector('.tabs button[data-mtab="fleets"]') as HTMLButtonElement;
    expect(tab, 'filolar sekmesi yok').toBeTruthy();
    tab.click();

    const html = sheetHtml();
    expect(html).toContain('Saldırı');
    expect(html).toContain('open-fleet');
  });

  it('filo sayfası acilir ve geri cagirma calisir', () => {
    const city = startingCity(world);
    forceBuildingLevel(world, city, 'barracks', 20);
    addUnits(world, city, 'swordsman', 20);
    city.cargoShips = 5;

    const island = world.activeIsland()!;
    const npc = world.npcs.find((n) => n.islandId === island.id)!;
    world.attack(island.id, npc.plot, [{ id: 'swordsman', count: 10, tier: 'base' }], []);
    const fleet = world.state.fleets[0];
    expect(fleet, 'filo yola cikmadi').toBeTruthy();

    world.bus.emit('select:fleet', fleet.id);
    expect(document.querySelector('.sheet-head h2')?.textContent).toContain('Saldırı');
    expect(sheetHtml()).toContain('Geri çağır');

    const recall = document.querySelector('[data-action="recall-fleet"]') as HTMLButtonElement;
    recall.click();
    expect(fleet.returning).toBe(true);
  });

  it('posta sayfası savas raporlarini listeler ve rapor acilir', () => {
    world.state.pushReport({
      id: 'battle-test',
      atTick: 10,
      attackerName: 'Başkent',
      defenderName: 'Rakip',
      islandName: 'Test Adası',
      cityName: 'Başkent',
      won: true,
      playerIsAttacker: true,
      rounds: 3,
      losses: {
        attacker: [{ id: 'swordsman', count: 4, tier: 'base' }],
        defender: [{ id: 'spearman', count: 9, tier: 'base' }],
        attackerShips: [],
        defenderShips: [],
      },
      loot: { wood: 120 },
      wallDamage: 800,
      roundLog: [
        {
          phase: 'land',
          round: 1,
          attacker: [{ id: 'swordsman', count: 10 }],
          defender: [{ id: 'spearman', count: 12 }],
          wallHp: 4000,
          defenderMorale: 80,
        },
      ],
    });

    const noticesButton = document.querySelector('.topbar [data-page="notices"]') as HTMLButtonElement;
    noticesButton.click();
    expect(sheetHtml()).toContain('Savaş raporları');

    const open = document.querySelector('[data-action="open-report"]') as HTMLButtonElement;
    open.click();
    const html = sheetHtml();
    expect(document.querySelector('.sheet-head h2')?.textContent).toContain('Zafer');
    expect(html).toContain('Kara savaşı');
    expect(html).toContain('Tur 1');
    expect(html).toContain('120');
  });
});

describe('ticaret rotalari arayuzu', () => {
  it('rota kurma formu sehir ozetinde calisir', () => {
    const a = startingCity(world);
    secondCity(world);
    a.cargoShips = 3;

    (document.querySelector('[data-action="city-overview"]') as HTMLButtonElement).click();
    expect(sheetHtml()).toContain('Ticaret rotaları');
    expect(sheetHtml()).toContain('Yeni rota');

    (document.querySelector('[data-action="route-ships-plus"]') as HTMLButtonElement).click();
    (document.querySelector('[data-action="create-route"]') as HTMLButtonElement).click();
    expect(world.state.tradeRoutes).toHaveLength(1);
    expect(world.state.tradeRoutes[0].cargoShips).toBe(2);
    expect(sheetHtml()).toContain('Kaldır');

    (document.querySelector('[data-action="cancel-route"]') as HTMLButtonElement).click();
    expect(world.state.tradeRoutes).toHaveLength(0);
  });
});
