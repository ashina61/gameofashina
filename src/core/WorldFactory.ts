import {
  ISLAND_PLOT_COUNT,
  LUXURY_ORDER,
  NPC_RECOVERY_GAME_SECONDS,
  STARTING_CARGO_SHIPS,
  STARTING_CITIZENS,
  STARTING_ISLAND_LUXURY,
  STARTING_RESOURCES,
  STARTING_TOWN_HALL_LEVEL,
  WORLD_GRID,
  WORLD_ISLAND_COUNT,
} from '@/config/Constants';
import { GODS } from '@/config/IslandCatalog';
import { generateIslandLayout } from '@/core/IslandLayout';
import { hashString, rng } from '@/utils/Rng';
import type {
  CityState,
  IslandState,
  LuxuryKind,
  MaterialPool,
  NpcCity,
  WorldState,
} from '@/types';

/**
 * Dunyanin uretimi: adalar, NPC sehirleri ve oyuncunun baslangic sehri.
 *
 * Tamami TOHUMDAN turetilir. Ayni tohum ayni dunyayi verir; bu yuzden
 * kayitta yalnizca tohumu ve degisen degerleri (seviyeler, kaynaklar)
 * tutmak yeterlidir.
 *
 * ZORLUK EGRISI
 * Oyuncunun baslangic adasi dusuk seviyeli ve cogu bos birakilir; uzak
 * adalar hem daha zengin hem daha iyi korunur. Boylece oyuncu Ikariam'in
 * gercek ilerleyisini yasar: once yakin, sonra uzak.
 */

/** Oyuncunun sahibi kimligi. */
export const PLAYER_ID = 'player';

/** Ada adlari. */
const ISLAND_NAMES = [
  'Rhodos',
  'Delos',
  'Naksos',
  'Samos',
  'Kriti',
  'Kiklad',
  'İstanköy',
  'Sakız',
  'Midilli',
  'Limni',
  'Patmos',
  'Sisam',
  'Paros',
  'Tinos',
  'Nisiros',
  'Karpatos',
] as const;

/** NPC sehir adlari. */
const CITY_NAMES = [
  'Sparta',
  'Korint',
  'Teb',
  'Argos',
  'Miken',
  'Efes',
  'Milet',
  'Halikarnas',
  'Pergamon',
  'Truva',
  'Side',
  'Aspendos',
  'Knidos',
  'Foça',
  'Bergama',
  'Letoon',
  'Assos',
  'Priene',
  'Teos',
  'Klazomenai',
] as const;

/** Bos bir madde havuzu. */
export function emptyMaterials(): MaterialPool {
  return { wood: 0, marble: 0, wine: 0, sulfur: 0, crystal: 0 };
}

/** Bos vatandas dagilimi. */
export function emptyAssignment(): CityState['assignment'] {
  return { idle: 0, wood: 0, luxury: 0, scientist: 0 };
}

/**
 * Dunya haritasinda ada konumlari.
 *
 * Adalar WORLD_GRID x WORLD_GRID hucreli bir haritaya, hucre basina en
 * fazla bir ada olacak sekilde yerlesir. Boylece iki ada ayni noktaya
 * dusemez ve mesafe hesabi (filo yolculuk suresi) anlamli olur.
 */
function islandCells(seed: number): Array<{ wx: number; wy: number }> {
  const random = rng(seed ^ 0x9e3779b9);
  const cells: Array<{ wx: number; wy: number }> = [];
  for (let y = 0; y < WORLD_GRID; y += 1) {
    for (let x = 0; x < WORLD_GRID; x += 1) cells.push({ wx: x, wy: y });
  }
  return random.shuffle(cells).slice(0, WORLD_ISLAND_COUNT);
}

/** Bir adanin luks kaynagi. Oyuncunun baslangic adasi sabittir. */
function luxuryFor(random: ReturnType<typeof rng>, isHome: boolean): LuxuryKind {
  if (isHome) return STARTING_ISLAND_LUXURY;
  return random.pick(LUXURY_ORDER);
}

/**
 * Ada kaynak seviyesi.
 *
 * Baslangic adasi DUSUK seviyede baslar (Ikariam'da yeni oyuncunun adasi
 * da boyledir); uzak adalar daha yuksek seviyededir. Mesafe arttikca
 * seviye buyur, boylece genisleme odullendirilir.
 */
function depositLevel(distance: number, random: ReturnType<typeof rng>, home: boolean): number {
  if (home) return random.int(2, 4);
  return Math.max(1, Math.min(40, 3 + distance * 5 + random.int(0, 6)));
}

/** Bir NPC sehrin guc seviyesi. */
function npcPower(distance: number, random: ReturnType<typeof rng>, barbarian: boolean): number {
  if (barbarian) return Math.max(1, 1 + distance + random.int(0, 2));
  return Math.max(2, 2 + distance * 4 + random.int(0, 5));
}

/** NPC sehrin deposundaki kaynaklar (yagmalanabilir). */
function npcResources(power: number, luxury: LuxuryKind): MaterialPool {
  const base = emptyMaterials();
  base.wood = Math.round(400 * power * power);
  base[luxury] = Math.round(260 * power * power);
  // Her NPC sehrin kendine ait bir ikinci kaynagi vardir; ticareti anlamlı kilar.
  const secondary = LUXURY_ORDER.find((l) => l !== luxury) ?? 'marble';
  base[secondary] = Math.round(120 * power * power);
  return base;
}

/** Bir NPC sehrin savunma birlikleri. */
function npcGarrison(power: number, random: ReturnType<typeof rng>): NpcCity['garrison'] {
  const garrison: NpcCity['garrison'] = [];
  const push = (id: string, perPower: number, minPower: number): void => {
    if (power < minPower) return;
    const count = Math.max(1, Math.round(power * perPower * (0.8 + random.next() * 0.4)));
    garrison.push({ id, count, tier: power >= 30 ? 'gold' : power >= 18 ? 'silver' : power >= 9 ? 'bronze' : 'base' });
  };
  push('slinger', 3, 1);
  push('spearman', 2, 2);
  push('hoplite', 1.4, 4);
  push('swordsman', 1.2, 6);
  push('archer', 1, 8);
  push('catapult', 0.4, 12);
  push('battering_ram', 0.3, 14);
  push('sulphur_carabineer', 0.5, 16);
  push('mortar', 0.3, 20);
  push('steam_giant', 0.2, 24);
  return garrison;
}

/** Bir NPC sehrin savas gemileri. */
function npcFleet(power: number, random: ReturnType<typeof rng>): NpcCity['warfleet'] {
  const fleet: NpcCity['warfleet'] = [];
  const push = (id: string, perPower: number, minPower: number): void => {
    if (power < minPower) return;
    const count = Math.max(1, Math.round(power * perPower * (0.7 + random.next() * 0.5)));
    fleet.push({ id, count, tier: power >= 28 ? 'gold' : power >= 16 ? 'silver' : 'bronze' });
  };
  push('ram_ship', 0.6, 3);
  push('ballista_ship', 0.5, 6);
  push('fire_ship', 0.3, 12);
  push('catapult_ship', 0.3, 16);
  push('mortar_ship', 0.2, 22);
  push('paddle_wheel_ram', 0.15, 28);
  return fleet;
}

/** Bir adayi uretir. */
function createIsland(
  index: number,
  cell: { wx: number; wy: number },
  homeCell: { wx: number; wy: number },
  random: ReturnType<typeof rng>,
  seed: number,
): { island: IslandState; npcs: NpcCity[]; distance: number } {
  const isHome = index === 0;
  const distance = Math.max(Math.abs(cell.wx - homeCell.wx), Math.abs(cell.wy - homeCell.wy));
  const luxury = luxuryFor(random, isHome);
  const god = random.pick(GODS).id;
  const islandId = `island-${index}`;

  const island: IslandState = {
    id: islandId,
    name: ISLAND_NAMES[index % ISLAND_NAMES.length] ?? `Ada ${index}`,
    wx: cell.wx,
    wy: cell.wy,
    luxury,
    god,
    faith: isHome ? 20 : random.int(0, 100),
    wood: {
      resource: 'wood',
      buildingId: 'saw_mill',
      level: depositLevel(distance, random, isHome),
      gx: 0,
      gy: 0,
    },
    luxuryDeposit: {
      resource: luxury,
      buildingId: depositBuildingIdFor(luxury),
      level: depositLevel(distance, random, isHome),
      gx: 0,
      gy: 0,
    },
    plots: [],
  };

  // Yatagin ve harikanin KARO konumlari ada yerlesiminden gelir.
  const layout = generateIslandLayout(hashString(islandId) ^ seed);
  island.wood.gx = layout.woodDeposit.gx;
  island.wood.gy = layout.woodDeposit.gy;
  island.luxuryDeposit.gx = layout.luxuryDeposit.gx;
  island.luxuryDeposit.gy = layout.luxuryDeposit.gy;

  // Alanlar: index 0 her zaman oyuncunun baslangic sehrine ayrilir (yalnizca
  // baslangic adasinda). Diger adalarda index 0 da NPC'lere aciktir.
  const npcs: NpcCity[] = [];
  const usedPlots = new Set<number>();
  if (isHome) usedPlots.add(0);

  for (let p = 0; p < ISLAND_PLOT_COUNT; p += 1) {
    island.plots.push({
      index: p,
      gx: layout.plots[p]?.gx ?? 0,
      gy: layout.plots[p]?.gy ?? 0,
      ownerId: null,
      cityId: null,
    });
  }

  // NPC yerlesimi: baslangic adasinda YALNIZCA bir barbar koyu birakilir ki
  // oyuncu ilk savasini guvenli ogrensin. Diger adalarda yogunluk mesafeyle artar.
  const npcCount = isHome ? 1 : Math.min(9, 2 + distance * 2 + random.int(0, 2));
  let placed = 0;
  for (let attempt = 0; attempt < 60 && placed < npcCount; attempt += 1) {
    const plot = random.int(0, ISLAND_PLOT_COUNT - 1);
    if (usedPlots.has(plot)) continue;
    usedPlots.add(plot);
    placed += 1;

    const barbarian = isHome || random.chance(0.25);
    const power = npcPower(distance, random, barbarian);
    const npcId = `npc-${islandId}-${plot}`;
    npcs.push({
      id: npcId,
      name: barbarian ? 'Barbar Köyü' : (CITY_NAMES[(index * 3 + plot) % CITY_NAMES.length] ?? 'Kolon'),
      kind: barbarian ? 'barbarian' : 'city',
      ownerId: npcId,
      islandId,
      plot,
      powerLevel: power,
      resources: npcResources(power, luxury),
      garrison: npcGarrison(power, random),
      warfleet: barbarian ? [] : npcFleet(power, random),
      wallLevel: barbarian ? 0 : Math.max(0, Math.round(power * 1.4)),
      relation: random.int(20, 80),
      lootedAtTick: null,
    });

    const slot = island.plots[plot];
    if (slot) {
      slot.ownerId = npcId;
      slot.cityId = npcId;
    }
  }

  return { island, npcs, distance };
}

/** Luks kaynagin ada binasi kimligi. */
function depositBuildingIdFor(luxury: LuxuryKind): string {
  switch (luxury) {
    case 'marble':
      return 'quarry';
    case 'wine':
      return 'vineyard';
    case 'sulfur':
      return 'sulphur_pit';
    case 'crystal':
      return 'crystal_mine';
  }
}

/** Tum dunyayi uretir. */
export function createWorld(seed: number): WorldState {
  const random = rng(seed);
  const cells = islandCells(seed);
  const homeCell = cells[0] ?? { wx: 0, wy: 0 };

  const islands: IslandState[] = [];
  const npcs: NpcCity[] = [];

  cells.forEach((cell, index) => {
    const { island, npcs: islandNpcs } = createIsland(index, cell, homeCell, random, seed);
    islands.push(island);
    npcs.push(...islandNpcs);
  });

  return { islands, npcs };
}

/**
 * Oyuncunun baslangic sehrini uretir.
 *
 * Ikariam'da oyuncu hazir bir Valilik ile baslar; diger her seyi kendi
 * kurar. Baslangic deposu sehre yazilir cunku Ikariam'da kaynaklar
 * SEHIR BASINADIR.
 */
export function createPlayerCity(islandId: string, plot: number, name: string): CityState {
  return {
    id: `city-${islandId}-${plot}`,
    name,
    ownerId: PLAYER_ID,
    islandId,
    plot,
    isCapital: true,
    // Baslangic kaynaklari TEK yerden okunur: sabit sayi yazmak, Constants
    // icindeki deger degistiginde buranin sessizce eski kalmasi demekti.
    resources: {
      wood: STARTING_RESOURCES.wood,
      marble: STARTING_RESOURCES.marble,
      wine: STARTING_RESOURCES.wine,
      sulfur: STARTING_RESOURCES.sulfur,
      crystal: STARTING_RESOURCES.crystal,
    },
    townHall: { type: 'town_hall', level: STARTING_TOWN_HALL_LEVEL, ground: -1 },
    wall: { type: 'wall', level: 0, ground: -1 },
    harbor: {
      port: { type: 'port', level: 0, ground: -1 },
      shipyard: { type: 'shipyard', level: 0, ground: -1 },
    },
    grounds: [],
    citizens: STARTING_CITIZENS,
    growthProgress: 0,
    assignment: emptyAssignment(),
    tavernWine: 0,
    museumGoods: [],
    garrison: [],
    warfleet: [],
    cargoShips: STARTING_CARGO_SHIPS,
    unitQueue: [],
    shipQueue: [],
  };
}

/** Yeni bir dunya + oyuncu sehri uretir ve adanin 0. alanini oyuncuya verir. */
export function createNewWorld(seed: number, cityName: string): {
  world: WorldState;
  cities: CityState[];
  activeCityId: string;
} {
  const world = createWorld(seed);
  const home = world.islands[0];
  if (!home) throw new Error('Dunya uretilemedi: baslangic adasi yok');
  const city = createPlayerCity(home.id, 0, cityName);
  const plot = home.plots[0];
  if (plot) {
    plot.ownerId = PLAYER_ID;
    plot.cityId = city.id;
  }
  return { world, cities: [city], activeCityId: city.id };
}

/** NPC toparlanma suresi (oyun saniyesi). */
export const NPC_RECOVERY = NPC_RECOVERY_GAME_SECONDS;
