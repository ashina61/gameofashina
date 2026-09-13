import type { CombatStats, ShipDefinition } from '@/types';
import { tiersShape } from './Tiers';
import { INFINITE_AMMO } from './UnitCatalog';

/**
 * Ikariam gemileri: savas gemileri + yuk gemisi.
 *
 * Savas istatistikleri Ikariam'in guncel (Infinite Horizons) degerleridir.
 * Bakim ucretleri Ikariam ekonomi analizinden alinmistir. Egitim
 * maliyetleri birim gucuyle orantili turetilmistir (bkz. UnitCatalog).
 */

const SEEDS: Array<{
  id: string;
  name: string;
  description: string;
  shipClass: ShipDefinition['shipClass'];
  requiredShipyardLevel: number;
  requiresResearch?: string;
  cost: ShipDefinition['cost'];
  buildTime: number;
  upkeepGold: number;
  cargo?: number;
  tint: number;
  stats: CombatStats;
  upgradeCost?: ShipDefinition['upgradeCost'];
}> = [
  {
    id: 'transport_ship',
    name: 'Yük Gemisi',
    description:
      'Kaynak taşır. Savaşmaz; filo ile birlikte yola çıkar. Ticaret Limanı seviyesi yükleme hızını belirler.',
    shipClass: 'transport',
    requiredShipyardLevel: 0,
    requiresResearch: 'carpentry',
    cost: { wood: 350, gold: 120 },
    buildTime: 900,
    upkeepGold: 2,
    cargo: 500,
    tint: 0xa8885a,
    stats: { hp: 400, damage: 0, armor: 0, accuracy: 0, ammo: INFINITE_AMMO, speed: 40, size: 1 },
  },
  {
    id: 'ram_ship',
    name: 'Ram Gemisi',
    description: 'Hafif savaş gemisi. İlk tersane gemisi; yakın dövüşte koçbaşı vurur.',
    shipClass: 'light_battleship',
    requiredShipyardLevel: 1,
    requiresResearch: 'cannon_casting',
    cost: { wood: 400, sulfur: 100, gold: 200 },
    buildTime: 900,
    upkeepGold: 20, // [wiki]
    tint: 0x8a6a4a,
    stats: {
      hp: 3_080,
      damage: 1_500,
      armor: 180,
      accuracy: 0.8,
      ammo: INFINITE_AMMO,
      speed: 40,
      size: 3,
    },
    upgradeCost: {
      bronze: { wood: 280, sulfur: 70, gold: 140 },
      silver: { wood: 600, sulfur: 160, gold: 300 },
      gold: { wood: 1_200, sulfur: 350, crystal: 200, gold: 660 },
    },
  },
  {
    id: 'ballista_ship',
    name: 'Ballista Gemisi',
    description: 'Menzilli gemi. 7 atışlık cephanesi vardır; zırhı yüksektir.',
    shipClass: 'long_range',
    requiredShipyardLevel: 3,
    requiresResearch: 'deck_weapons',
    cost: { wood: 500, crystal: 200, gold: 250 },
    buildTime: 1_200,
    upkeepGold: 24, // [wiki]
    tint: 0x7a8a9a,
    stats: {
      hp: 3_080,
      damage: 560,
      armor: 280,
      accuracy: 0.5,
      ammo: 7,
      speed: 40,
      size: 2,
      secondaryDamage: 1_020,
      secondaryAccuracy: 0.7,
    },
    upgradeCost: {
      bronze: { wood: 350, crystal: 140, gold: 175 },
      silver: { wood: 750, crystal: 320, gold: 375 },
      gold: { wood: 1_500, crystal: 700, gold: 825 },
    },
  },
  {
    id: 'fire_ship',
    name: 'Ateş Gemisi',
    description: 'Ağır savaş gemisi. Yakın mesafede yakarak vurur.',
    shipClass: 'heavy_battleship',
    requiredShipyardLevel: 8,
    requiresResearch: 'greek_fire',
    cost: { wood: 700, sulfur: 300, gold: 400 },
    buildTime: 1_800,
    upkeepGold: 45, // [wiki]
    tint: 0xc05a2a,
    stats: {
      hp: 4_380,
      damage: 1_640,
      armor: 160,
      accuracy: 0.5,
      ammo: INFINITE_AMMO,
      speed: 40,
      size: 2,
    },
    upgradeCost: {
      bronze: { wood: 490, sulfur: 210, gold: 280 },
      silver: { wood: 1_050, sulfur: 480, gold: 600 },
      gold: { wood: 2_100, sulfur: 1_050, gold: 1_320 },
    },
  },
  {
    id: 'catapult_ship',
    name: 'Mancınık Gemisi',
    description: 'Menzilli gemi. Yüksek hasar, düşük isabet.',
    shipClass: 'long_range',
    requiredShipyardLevel: 10,
    requiresResearch: 'naval_artillery',
    cost: { wood: 800, marble: 300, gold: 500 },
    buildTime: 2_100,
    upkeepGold: 57, // [wiki]
    tint: 0x9a7a5a,
    stats: {
      hp: 2_960,
      damage: 900,
      armor: 200,
      accuracy: 0.3,
      ammo: 6,
      speed: 40,
      size: 3,
      secondaryDamage: 620,
      secondaryAccuracy: 0.7,
    },
    upgradeCost: {
      bronze: { wood: 560, marble: 210, gold: 350 },
      silver: { wood: 1_200, marble: 480, gold: 750 },
      gold: { wood: 2_400, marble: 1_050, gold: 1_650 },
    },
  },
  {
    id: 'mortar_ship',
    name: 'Havan Gemisi',
    description: 'En yüksek menzilli gemi hasarı. 5 atışlık cephanesi vardır ve yavaştır.',
    shipClass: 'long_range',
    requiredShipyardLevel: 14,
    requiresResearch: 'naval_artillery',
    cost: { wood: 1_100, sulfur: 500, marble: 400, gold: 800 },
    buildTime: 3_000,
    upkeepGold: 130, // [wiki]
    tint: 0x6a7a8a,
    stats: {
      hp: 3_080,
      damage: 1_380,
      armor: 120,
      accuracy: 0.1,
      ammo: 5,
      speed: 30,
      size: 4,
      secondaryDamage: 740,
      secondaryAccuracy: 0.5,
    },
    upgradeCost: {
      bronze: { wood: 770, sulfur: 350, marble: 280, gold: 560 },
      silver: { wood: 1_650, sulfur: 800, marble: 640, gold: 1_200 },
      gold: { wood: 3_300, sulfur: 1_750, marble: 1_400, gold: 2_640 },
    },
  },
  {
    id: 'paddle_wheel_ram',
    name: 'Buharlı Ram',
    description: 'En güçlü savaş gemisi. Devasa can ve zırh; filonun çekirdeği.',
    shipClass: 'heavy_battleship',
    requiredShipyardLevel: 18,
    requiresResearch: 'cannon_casting',
    cost: { wood: 1_500, sulfur: 700, crystal: 600, gold: 1_200 },
    buildTime: 4_200,
    upkeepGold: 114, // [wiki]
    tint: 0x5a5a6a,
    stats: {
      hp: 11_520,
      damage: 3_320,
      armor: 320,
      accuracy: 0.9,
      ammo: INFINITE_AMMO,
      speed: 40,
      size: 5,
    },
    upgradeCost: {
      bronze: { wood: 1_050, sulfur: 490, crystal: 420, gold: 840 },
      silver: { wood: 2_250, sulfur: 1_120, crystal: 960, gold: 1_800 },
      gold: { wood: 4_500, sulfur: 2_450, crystal: 2_100, gold: 3_960 },
    },
  },
  {
    id: 'diving_boat',
    name: 'Dalış Gemisi',
    description: 'İlk vuruş gemisi. Savaştan önce vurur; taşıyıcı gemilere karşı etkilidir.',
    shipClass: 'first_strike',
    requiredShipyardLevel: 22,
    requiresResearch: 'submarine_tech',
    cost: { wood: 1_800, crystal: 900, sulfur: 800, gold: 1_500 },
    buildTime: 5_400,
    upkeepGold: 126, // [wiki]
    tint: 0x4a6a7a,
    stats: {
      hp: 2_200,
      damage: 2_460,
      armor: 120,
      accuracy: 0.8,
      ammo: 4,
      speed: 40,
      size: 3,
      secondaryDamage: 1_800,
      secondaryAccuracy: 0.8,
    },
    upgradeCost: {
      bronze: { wood: 1_260, crystal: 630, sulfur: 560, gold: 1_050 },
      silver: { wood: 2_700, crystal: 1_440, sulfur: 1_280, gold: 2_250 },
      gold: { wood: 5_400, crystal: 3_150, sulfur: 2_800, gold: 4_950 },
    },
  },
  {
    id: 'rocket_ship',
    name: 'Roket Gemisi',
    description: 'En yüksek tek atışlık hasar. Yalnızca 2 roket taşır ve isabeti düşüktür.',
    shipClass: 'first_strike',
    requiredShipyardLevel: 26,
    requiresResearch: 'submarine_tech',
    cost: { wood: 2_200, sulfur: 1_200, crystal: 1_000, gold: 1_800 },
    buildTime: 6_000,
    upkeepGold: 150,
    tint: 0x8a4a6a,
    stats: {
      hp: 1_300,
      damage: 7_600,
      armor: 120,
      accuracy: 0.2,
      ammo: 2,
      speed: 30,
      size: 4,
      secondaryDamage: 400,
      secondaryAccuracy: 0.8,
    },
    upgradeCost: {
      bronze: { wood: 1_540, sulfur: 840, crystal: 700, gold: 1_260 },
      silver: { wood: 3_300, sulfur: 1_920, crystal: 1_600, gold: 2_700 },
      gold: { wood: 6_600, sulfur: 4_200, crystal: 3_500, gold: 5_940 },
    },
  },
  {
    id: 'balloon_carrier',
    name: 'Balon Taşıyıcı',
    description: 'Taşıyıcı gemi. Düşman taşıyıcılarını hedef alır.',
    shipClass: 'carrier',
    requiredShipyardLevel: 24,
    requiresResearch: 'aviation',
    cost: { wood: 2_000, crystal: 1_000, gold: 1_600 },
    buildTime: 5_400,
    upkeepGold: 140,
    tint: 0xb09a6a,
    stats: { hp: 2_800, damage: 2_000, armor: 0, accuracy: 0.5, ammo: 5, speed: 20, size: 5 },
    upgradeCost: {
      bronze: { wood: 1_400, crystal: 700, gold: 1_120 },
      silver: { wood: 3_000, crystal: 1_600, gold: 2_400 },
      gold: { wood: 6_000, crystal: 3_500, gold: 5_280 },
    },
  },
  {
    id: 'paddle_speedboat',
    name: 'Paddle Sürat Teknesi',
    description: 'Taşıyıcı kaçırma gemisi. Çok hızlı ve isabetlidir.',
    shipClass: 'carrier_evasion',
    requiredShipyardLevel: 20,
    requiresResearch: 'aviation',
    cost: { wood: 900, crystal: 400, gold: 700 },
    buildTime: 2_400,
    upkeepGold: 80,
    tint: 0x6aa8b0,
    stats: { hp: 400, damage: 240, armor: 0, accuracy: 0.9, ammo: 5, speed: 60, size: 1 },
    upgradeCost: {
      bronze: { wood: 630, crystal: 280, gold: 490 },
      silver: { wood: 1_350, crystal: 640, gold: 1_050 },
      gold: { wood: 2_700, crystal: 1_400, gold: 2_310 },
    },
  },
  {
    id: 'tender',
    name: 'Destek Gemisi',
    description: 'Destek gemisi. Tur başına 200 can iyileştirir ve moral verir.',
    shipClass: 'support',
    requiredShipyardLevel: 16,
    requiresResearch: 'medicine',
    cost: { wood: 1_200, wine: 400, gold: 900 },
    buildTime: 3_000,
    upkeepGold: 120,
    tint: 0xd0d0d8,
    stats: {
      hp: 2_800,
      damage: 300,
      armor: 0,
      accuracy: 0.5,
      ammo: INFINITE_AMMO,
      speed: 30,
      size: 6,
      healPerRound: 200,
      moralePerRound: 1,
    },
    upgradeCost: {
      bronze: { wood: 840, wine: 280, gold: 630 },
      silver: { wood: 1_800, wine: 640, gold: 1_350 },
      gold: { wood: 3_600, wine: 1_400, gold: 2_970 },
    },
  },
];

export const SHIPS: ShipDefinition[] = SEEDS.map((seed) => ({
  ...seed,
  stats: tiersShape(seed.stats),
}));

// =========================================================================
// ERISIM
// =========================================================================

const BY_ID = new Map<string, ShipDefinition>(SHIPS.map((s) => [s.id, s]));

/** Gemi tanimini dondurur. */
export function getShip(id: string): ShipDefinition | undefined {
  return BY_ID.get(id);
}

/** Gemi tanimini dondurur; yoksa hata firlatir. */
export function requireShip(id: string): ShipDefinition {
  const def = BY_ID.get(id);
  if (!def) throw new Error(`Bilinmeyen gemi: ${id}`);
  return def;
}

/** Gemi kimligi tanimli mi? */
export function isKnownShipId(id: string): boolean {
  return BY_ID.has(id);
}

/** Verilen tersane seviyesinde insa edilebilecek gemiler. */
export function shipsForShipyardLevel(level: number): ShipDefinition[] {
  return SHIPS.filter((s) => s.requiredShipyardLevel <= level && s.id !== 'transport_ship');
}

/** Yuk gemisi tanimi. */
export function transportShip(): ShipDefinition {
  return requireShip('transport_ship');
}

/** Gemi sinifinin deniz savasindaki ATES SIRASI (kucuk = once). */
export const SHIP_FIRE_ORDER: Record<ShipDefinition['shipClass'], number> = {
  carrier_evasion: 1,
  first_strike: 2,
  long_range: 3,
  light_battleship: 4,
  heavy_battleship: 5,
  carrier: 6,
  support: 7,
  transport: 99,
};

