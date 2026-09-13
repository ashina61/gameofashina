import type { CombatStats, UnitDefinition, UpgradeTier } from '@/types';
import { tiersShape } from './Tiers';

/**
 * Ikariam kara birlikleri.
 *
 * Savas istatistikleri (can/hasar/zirh/isabet/cephane/hiz/yer) Ikariam'in
 * "Infinite Horizons" guncel degerleridir. Bakim ucreti (saat basina altin)
 * Ikariam ekonomi analizinden alinmistir.
 *
 * Egitim maliyetleri Ikariam wiki'sinde birlik bazinda tek tabloda
 * yayinlanmadigi icin, birim GUCU (can + hasar) ve bakim ucretiyle
 * orantili olarak turetilmistir: guclu birlik hem pahali hem bakimi
 * yuksektir. Bu iliski Ikariam'da da boyledir.
 *
 * CEPHANE KURALI: ammo = -1 sonsuz demek. Serilestirilebilir olsun diye
 * Infinity yerine -1 tutulur; savas motoru -1'i sonsuz okur.
 */

/** Sonsuz cephane isareti. */
export const INFINITE_AMMO = -1;

/** Birlik tanimini kisaltilmis bicimde yazmak icin. */
interface UnitSeed {
  id: string;
  name: string;
  description: string;
  unitClass: UnitDefinition['unitClass'];
  requiredBarracksLevel: number;
  requiresResearch?: string;
  cost: UnitDefinition['cost'];
  trainTime: number;
  upkeepGold: number;
  tint: number;
  stats: CombatStats;
  upgradeCost?: UnitDefinition['upgradeCost'];
}

const SEEDS: UnitSeed[] = [
  {
    id: 'slinger',
    name: 'Sapancı',
    description: 'En ucuz menzilli birlik. Cephane bitince ön cepheye düşer.',
    unitClass: 'long_range',
    requiredBarracksLevel: 1,
    requiresResearch: 'professional_army',
    cost: { wood: 40, gold: 30 },
    trainTime: 180,
    upkeepGold: 8, // [wiki]
    tint: 0xb08a5a,
    stats: {
      hp: 160,
      damage: 60,
      armor: 0,
      accuracy: 0.2,
      ammo: 5,
      speed: 60,
      size: 1,
      secondaryDamage: 40,
      secondaryAccuracy: 0.6,
    },
    upgradeCost: {
      bronze: { wood: 30, gold: 20 },
      silver: { wood: 60, crystal: 20, gold: 40 },
      gold: { wood: 120, crystal: 60, gold: 90 },
    },
  },
  {
    id: 'spearman',
    name: 'Mızraklı',
    description: 'Kanat birliği. Hafif piyade; kuşatmada yanlardan vurur.',
    unitClass: 'light_infantry',
    requiredBarracksLevel: 1,
    requiresResearch: 'swordsmanship',
    cost: { wood: 60, gold: 40 },
    trainTime: 210,
    upkeepGold: 10,
    tint: 0x9a8a6a,
    stats: { hp: 260, damage: 80, armor: 0, accuracy: 0.7, ammo: INFINITE_AMMO, speed: 60, size: 1 },
    upgradeCost: {
      bronze: { wood: 40, gold: 30 },
      silver: { wood: 90, marble: 30, gold: 60 },
      gold: { wood: 180, marble: 80, gold: 130 },
    },
  },
  {
    id: 'swordsman',
    name: 'Kılıçlı',
    description: 'Kanat birliği. Mızraklıdan güçlü hafif piyade.',
    unitClass: 'light_infantry',
    requiredBarracksLevel: 3,
    requiresResearch: 'swordsmanship',
    cost: { wood: 100, sulfur: 20, gold: 60 },
    trainTime: 300,
    upkeepGold: 16, // [wiki]
    tint: 0x8a8a94,
    stats: { hp: 360, damage: 200, armor: 0, accuracy: 0.9, ammo: INFINITE_AMMO, speed: 60, size: 1 },
    upgradeCost: {
      bronze: { wood: 70, sulfur: 15, gold: 45 },
      silver: { wood: 150, sulfur: 40, gold: 90 },
      gold: { wood: 300, sulfur: 90, crystal: 60, gold: 200 },
    },
  },
  {
    id: 'hoplite',
    name: 'Hoplite',
    description: 'Ağır piyade hattının çekirdeği. Ön cepheye dizilir ve şehri tutar.',
    unitClass: 'heavy_infantry',
    requiredBarracksLevel: 5,
    requiresResearch: 'phalanx',
    cost: { wood: 160, marble: 40, gold: 90 },
    trainTime: 600,
    upkeepGold: 24, // [wiki]
    tint: 0xa8603a,
    stats: { hp: 1_120, damage: 360, armor: 20, accuracy: 0.9, ammo: INFINITE_AMMO, speed: 60, size: 1 },
    upgradeCost: {
      bronze: { wood: 110, marble: 30, gold: 70 },
      silver: { wood: 240, marble: 80, gold: 150 },
      gold: { wood: 480, marble: 180, crystal: 120, gold: 340 },
    },
  },
  {
    id: 'spartan',
    name: 'Spartalı',
    description: 'En güçlü ağır piyade. Yalnızca Sparta Eğitimi araştırmasıyla eğitilir.',
    unitClass: 'heavy_infantry',
    requiredBarracksLevel: 24,
    requiresResearch: 'spartan_training',
    cost: { wood: 400, marble: 200, gold: 300 },
    trainTime: 2_400,
    upkeepGold: 40,
    tint: 0xc0392b,
    stats: { hp: 1_200, damage: 560, armor: 120, accuracy: 1, ammo: INFINITE_AMMO, speed: 60, size: 1 },
    upgradeCost: {
      bronze: { wood: 280, marble: 140, gold: 210 },
      silver: { wood: 600, marble: 320, gold: 460 },
      gold: { wood: 1_200, marble: 700, crystal: 400, gold: 1_000 },
    },
  },
  {
    id: 'steam_giant',
    name: 'Buhar Devi',
    description: 'Devasa ağır piyade. Savas alanında 3 yer kaplar ama hattı tek başına tutar.',
    unitClass: 'heavy_infantry',
    requiredBarracksLevel: 20,
    requiresResearch: 'robotics',
    cost: { wood: 900, sulfur: 300, crystal: 400, gold: 600 },
    trainTime: 3_600,
    upkeepGold: 68, // [wiki]
    tint: 0x7a6a5a,
    stats: { hp: 3_680, damage: 840, armor: 60, accuracy: 0.8, ammo: INFINITE_AMMO, speed: 40, size: 3 },
    upgradeCost: {
      bronze: { wood: 630, sulfur: 210, crystal: 280, gold: 420 },
      silver: { wood: 1_350, sulfur: 480, crystal: 640, gold: 900 },
      gold: { wood: 2_700, sulfur: 1_000, crystal: 1_400, gold: 2_000 },
    },
  },
  {
    id: 'archer',
    name: 'Okçu',
    description: 'Menzilli birlik. Yalnızca 3 atışlık cephanesi vardır, sonra ön cepheye düşer.',
    unitClass: 'long_range',
    requiredBarracksLevel: 7,
    requiresResearch: 'archery',
    cost: { wood: 120, gold: 70 },
    trainTime: 420,
    upkeepGold: 32, // [wiki]
    tint: 0x6a8a4a,
    stats: {
      hp: 320,
      damage: 100,
      armor: 0,
      accuracy: 0.4,
      ammo: 3,
      speed: 60,
      size: 1,
      secondaryDamage: 100,
      secondaryAccuracy: 0.6,
    },
    upgradeCost: {
      bronze: { wood: 85, gold: 50 },
      silver: { wood: 180, crystal: 40, gold: 110 },
      gold: { wood: 360, crystal: 100, gold: 240 },
    },
  },
  {
    id: 'sulphur_carabineer',
    name: 'Kükürt Karabiniyercisi',
    description: 'Barutlu menzilli birlik. 4 yer kaplar, çok yüksek hasar verir.',
    unitClass: 'long_range',
    requiredBarracksLevel: 14,
    requiresResearch: 'gunpowder',
    cost: { wood: 180, sulfur: 120, crystal: 60, gold: 150 },
    trainTime: 900,
    upkeepGold: 58, // [wiki]
    tint: 0x9a7a3a,
    stats: {
      hp: 240,
      damage: 580,
      armor: 0,
      accuracy: 0.7,
      ammo: 3,
      speed: 60,
      size: 4,
      secondaryDamage: 60,
      secondaryAccuracy: 0.6,
    },
    upgradeCost: {
      bronze: { wood: 130, sulfur: 85, crystal: 40, gold: 110 },
      silver: { wood: 270, sulfur: 190, crystal: 100, gold: 230 },
      gold: { wood: 540, sulfur: 400, crystal: 220, gold: 500 },
    },
  },
  {
    id: 'battering_ram',
    name: 'Koçbaşı',
    description: 'Surlara karşı özel hasar verir. Kuşatmanın anahtarıdır.',
    unitClass: 'artillery',
    requiredBarracksLevel: 10,
    requiresResearch: 'siege_engines',
    cost: { wood: 400, gold: 200 },
    trainTime: 1_800,
    upkeepGold: 52, // [wiki]
    tint: 0x7a5a3a,
    stats: {
      hp: 1_760,
      damage: 1_600,
      armor: 20,
      accuracy: 0.1,
      ammo: INFINITE_AMMO,
      speed: 40,
      size: 5,
      secondaryDamage: 240,
      secondaryAccuracy: 0.7,
      wallDamage: 1_600,
    },
    upgradeCost: {
      bronze: { wood: 280, gold: 140 },
      silver: { wood: 600, marble: 160, gold: 300 },
      gold: { wood: 1_200, marble: 360, gold: 660 },
    },
  },
  {
    id: 'catapult',
    name: 'Mancınık',
    description: 'Topçu birliği. Çok yüksek hasar, çok düşük isabet.',
    unitClass: 'artillery',
    requiredBarracksLevel: 12,
    requiresResearch: 'siege_engines',
    cost: { wood: 320, marble: 120, gold: 180 },
    trainTime: 1_500,
    upkeepGold: 72, // [wiki]
    tint: 0x8a7a5a,
    stats: {
      hp: 1_080,
      damage: 2_660,
      armor: 0,
      accuracy: 0.1,
      ammo: 5,
      speed: 40,
      size: 5,
      secondaryDamage: 80,
      secondaryAccuracy: 0.2,
    },
    upgradeCost: {
      bronze: { wood: 225, marble: 85, gold: 125 },
      silver: { wood: 480, marble: 190, gold: 270 },
      gold: { wood: 960, marble: 420, gold: 590 },
    },
  },
  {
    id: 'mortar',
    name: 'Havan',
    description: 'En yüksek hasarlı topçu. Yalnızca 3 atışlık cephanesi vardır.',
    unitClass: 'artillery',
    requiredBarracksLevel: 16,
    requiresResearch: 'pyrotechnics',
    cost: { wood: 480, sulfur: 200, marble: 160, gold: 300 },
    trainTime: 2_400,
    upkeepGold: 128, // [wiki]
    tint: 0x6a6a72,
    stats: {
      hp: 640,
      damage: 5_400,
      armor: 0,
      accuracy: 0.1,
      ammo: 3,
      speed: 40,
      size: 5,
      secondaryDamage: 200,
      secondaryAccuracy: 0.2,
    },
    upgradeCost: {
      bronze: { wood: 340, sulfur: 140, marble: 110, gold: 210 },
      silver: { wood: 720, sulfur: 320, marble: 250, gold: 450 },
      gold: { wood: 1_440, sulfur: 700, marble: 540, gold: 990 },
    },
  },
  {
    id: 'gyrocopter',
    name: 'Gyrocopter',
    description: 'Hava savunması. Tur başına ilk ateş eder ve düşman hava birliğini düşürür.',
    unitClass: 'air_fighter',
    requiredBarracksLevel: 18,
    requiresResearch: 'aviation',
    cost: { wood: 300, crystal: 200, gold: 250 },
    trainTime: 1_200,
    upkeepGold: 97, // [wiki]
    tint: 0x8aa8c0,
    stats: { hp: 580, damage: 340, armor: 0, accuracy: 0.8, ammo: 4, speed: 80, size: 1 },
    upgradeCost: {
      bronze: { wood: 210, crystal: 140, gold: 175 },
      silver: { wood: 450, crystal: 320, gold: 375 },
      gold: { wood: 900, crystal: 700, gold: 825 },
    },
  },
  {
    id: 'bombardier',
    name: 'Balon Bombardımanı',
    description: 'Hava bombardımanı. Yavaş ama çok yüksek hasar verir.',
    unitClass: 'air_bomber',
    requiredBarracksLevel: 22,
    requiresResearch: 'aviation',
    cost: { wood: 500, sulfur: 250, crystal: 300, gold: 400 },
    trainTime: 2_400,
    upkeepGold: 228, // [wiki]
    tint: 0xb08a4a,
    stats: { hp: 800, damage: 960, armor: 0, accuracy: 0.2, ammo: 2, speed: 20, size: 2 },
    upgradeCost: {
      bronze: { wood: 350, sulfur: 175, crystal: 210, gold: 280 },
      silver: { wood: 750, sulfur: 400, crystal: 480, gold: 600 },
      gold: { wood: 1_500, sulfur: 850, crystal: 1_050, gold: 1_320 },
    },
  },
  {
    id: 'doctor',
    name: 'Doktor',
    description: 'Destek birliği. Tur başına 200 can iyileştirir; sınırsız sayıda bulunabilir.',
    unitClass: 'support',
    requiredBarracksLevel: 8,
    requiresResearch: 'medicine',
    cost: { wood: 100, wine: 50, gold: 120 },
    trainTime: 900,
    upkeepGold: 244, // [wiki]
    tint: 0xe0e0e8,
    stats: {
      hp: 240,
      damage: 160,
      armor: 0,
      accuracy: 0.3,
      ammo: INFINITE_AMMO,
      speed: 60,
      size: 1,
      healPerRound: 200,
    },
    upgradeCost: {
      bronze: { wood: 70, wine: 35, gold: 85 },
      silver: { wood: 150, wine: 80, gold: 180 },
      gold: { wood: 300, wine: 175, gold: 395 },
    },
  },
  {
    id: 'cook',
    name: 'Aşçı',
    description: 'Destek birliği. Tur başına ordunun moralini %1 yükseltir.',
    unitClass: 'support',
    requiredBarracksLevel: 8,
    requiresResearch: 'culinary_specialities',
    cost: { wood: 80, wine: 80, gold: 100 },
    trainTime: 600,
    upkeepGold: 138, // [wiki]
    tint: 0xd8b070,
    stats: {
      hp: 440,
      damage: 400,
      armor: 0,
      accuracy: 0.5,
      ammo: INFINITE_AMMO,
      speed: 40,
      size: 2,
      moralePerRound: 1,
    },
    upgradeCost: {
      bronze: { wood: 56, wine: 56, gold: 70 },
      silver: { wood: 120, wine: 128, gold: 150 },
      gold: { wood: 240, wine: 280, gold: 330 },
    },
  },
];

export const UNITS: UnitDefinition[] = SEEDS.map((seed) => ({
  ...seed,
  stats: tiersShape(seed.stats),
}));

// =========================================================================
// ERISIM
// =========================================================================

const BY_ID = new Map<string, UnitDefinition>(UNITS.map((u) => [u.id, u]));

/** Birlik tanimini dondurur. */
export function getUnit(id: string): UnitDefinition | undefined {
  return BY_ID.get(id);
}

/** Birlik tanimini dondurur; yoksa hata firlatir. */
export function requireUnit(id: string): UnitDefinition {
  const def = BY_ID.get(id);
  if (!def) throw new Error(`Bilinmeyen birlik: ${id}`);
  return def;
}

/** Birlik kimligi tanimli mi? */
export function isKnownUnitId(id: string): boolean {
  return BY_ID.has(id);
}

/** Verilen kisla seviyesinde egitilebilecek birlikler. */
export function unitsForBarracksLevel(level: number): UnitDefinition[] {
  return UNITS.filter((u) => u.requiredBarracksLevel <= level);
}

/** Verilen kademedeki savas istatistikleri. */
export function unitStats(id: string, tier: UpgradeTier): CombatStats {
  return requireUnit(id).stats[tier] ?? requireUnit(id).stats.base;
}

/** Birlik sinifinin savas alanindaki ATES SIRASI (kucuk = once ates eder). */
export const UNIT_FIRE_ORDER: Record<UnitDefinition['unitClass'], number> = {
  air_fighter: 1,
  air_bomber: 2,
  artillery: 3,
  long_range: 4,
  heavy_infantry: 5,
  light_infantry: 6,
  support: 7,
};

/** Kademe carpanlari ve yardimcilari paylasilan moduldendir; tek kaynak orasi. */
export { TIER_DAMAGE, TIER_HP, TIER_ARMOR_BONUS, TIER_UPKEEP_MULTIPLIER, TIER_ORDER,
  TIER_NAMES, nextTier } from './Tiers';
