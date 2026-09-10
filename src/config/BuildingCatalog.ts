import type { BuildingDefinition, BuildingId, BuildingLevel } from '@/types';

/**
 * Bina katalogu: tum bina turlerinin statik tanimlari.
 *
 * Seviyeye gore degisen her sey levels[] icindedir. Seviye 1, sifirdan insa
 * maliyetini ve suresini tasir; sonraki seviyeler yukseltme maliyetini ve
 * suresini tasir.
 *
 * ONEMLI: Seviye 1 degerleri prototipteki degerlerle birebir aynidir; bu
 * sprintte oyun dengesi degismedi. Seviye 2 tanimlari ileride devreye girecek
 * UpgradeSystem icin hazirdir - su an hicbir bina yukseltilemez.
 */
const DEFINITIONS: BuildingDefinition[] = [
  {
    id: 'town_hall',
    name: 'Sehir Merkezi',
    description: 'Sehrin kalbi. Az miktarda altin ve depo alani saglar.',
    category: 'civic',
    size: 2,
    maxCount: 1,
    allowedTerrain: ['grass', 'soil'],
    tint: 0xd8c79a,
    levels: [
      {
        level: 1,
        buildCost: { wood: 120, stone: 80 },
        buildTime: 30,
        production: { gold: 2 },
        populationCapacity: 4,
        storageCapacity: 250,
      },
      {
        level: 2,
        upgradeCost: { wood: 240, stone: 200, gold: 60 },
        upgradeTime: 90,
        production: { gold: 5 },
        populationCapacity: 8,
        storageCapacity: 500,
      },
    ],
  },
  {
    id: 'house',
    name: 'Ev',
    description: 'Isci barindirir. Uretim binalari icin nufus saglar.',
    category: 'civic',
    size: 1,
    allowedTerrain: ['grass', 'soil'],
    tint: 0xc98f5a,
    levels: [
      {
        level: 1,
        buildCost: { wood: 40, stone: 10 },
        buildTime: 12,
        populationCapacity: 5,
      },
      {
        level: 2,
        upgradeCost: { wood: 90, stone: 40 },
        upgradeTime: 40,
        populationCapacity: 9,
      },
    ],
  },
  {
    id: 'farm',
    name: 'Ciftlik',
    description: 'Yiyecek uretir. Verimli topraga kurulmasi gerekir.',
    category: 'production',
    size: 1,
    allowedTerrain: ['soil', 'grass'],
    tint: 0x9fbf62,
    levels: [
      {
        level: 1,
        buildCost: { wood: 30 },
        buildTime: 15,
        production: { food: 6 },
        workerRequirement: 2,
      },
      {
        level: 2,
        upgradeCost: { wood: 70, stone: 30 },
        upgradeTime: 45,
        production: { food: 11 },
        workerRequirement: 3,
      },
    ],
  },
  {
    id: 'lumber_camp',
    name: 'Oduncu Kampi',
    description: 'Odun uretir. Insaatin temel kaynagi.',
    category: 'production',
    size: 1,
    allowedTerrain: ['grass'],
    tint: 0x6f8f4a,
    levels: [
      {
        level: 1,
        buildCost: { wood: 20, stone: 10 },
        buildTime: 15,
        production: { wood: 5 },
        workerRequirement: 3,
      },
      {
        level: 2,
        upgradeCost: { wood: 60, stone: 45 },
        upgradeTime: 45,
        production: { wood: 9 },
        workerRequirement: 4,
      },
    ],
  },
  {
    id: 'quarry',
    name: 'Tas Ocagi',
    description: 'Tas uretir. Sadece kayalik zemine kurulabilir.',
    category: 'production',
    size: 1,
    allowedTerrain: ['rock'],
    tint: 0x8d949c,
    levels: [
      {
        level: 1,
        buildCost: { wood: 50 },
        buildTime: 20,
        production: { stone: 4 },
        workerRequirement: 4,
      },
      {
        level: 2,
        upgradeCost: { wood: 110, stone: 50 },
        upgradeTime: 60,
        production: { stone: 7 },
        workerRequirement: 6,
      },
    ],
  },
  {
    id: 'market',
    name: 'Pazar',
    description: 'Ticaretten altin kazandirir.',
    category: 'production',
    size: 1,
    allowedTerrain: ['grass', 'soil'],
    tint: 0xc06a5a,
    levels: [
      {
        level: 1,
        buildCost: { wood: 80, stone: 40 },
        buildTime: 25,
        production: { gold: 4 },
        workerRequirement: 3,
      },
      {
        level: 2,
        upgradeCost: { wood: 160, stone: 100 },
        upgradeTime: 70,
        production: { gold: 7 },
        workerRequirement: 5,
      },
    ],
  },
  {
    id: 'warehouse',
    name: 'Ambar',
    description: 'Tum kaynaklarin depo kapasitesini artirir.',
    category: 'storage',
    size: 1,
    allowedTerrain: ['grass', 'soil', 'rock'],
    tint: 0x7d6b52,
    levels: [
      {
        level: 1,
        buildCost: { wood: 60, stone: 60 },
        buildTime: 20,
        storageCapacity: 400,
      },
      {
        level: 2,
        upgradeCost: { wood: 140, stone: 140 },
        upgradeTime: 55,
        storageCapacity: 900,
      },
    ],
  },
];

const BY_ID = new Map<BuildingId, BuildingDefinition>(DEFINITIONS.map((d) => [d.id, d]));

/** Katalogtaki tum bina tanimlari (menu sirasi ile). */
export function allBuildings(): readonly BuildingDefinition[] {
  return DEFINITIONS;
}

/**
 * Verilen kimlige ait bina tanimini dondurur.
 * Katalogda olmayan bir kimlik programlama hatasidir; hata firlatir.
 */
export function getBuilding(id: BuildingId): BuildingDefinition {
  const def = BY_ID.get(id);
  if (!def) {
    throw new Error(`Bilinmeyen bina kimligi: ${id}`);
  }
  return def;
}

/** Kimligin katalogda tanimli olup olmadigini kontrol eder. */
export function isKnownBuildingId(id: string): id is BuildingId {
  return BY_ID.has(id as BuildingId);
}

/**
 * Bir binanin verilen seviyedeki tanimini dondurur.
 * Seviye tabloda yoksa undefined doner; cagiran taraf sinirlamalidir.
 */
export function levelOf(def: BuildingDefinition, level: number): BuildingLevel | undefined {
  return def.levels.find((entry) => entry.level === level);
}

/** Katalogda tanimli en yuksek seviye. */
export function maxLevelOf(def: BuildingDefinition): number {
  return def.levels.reduce((max, entry) => Math.max(max, entry.level), 1);
}

/** Seviyeyi katalogun tanimli araligina sikistirir. */
export function clampLevel(def: BuildingDefinition, level: number): number {
  if (!Number.isFinite(level)) return 1;
  return Math.min(Math.max(1, Math.trunc(level)), maxLevelOf(def));
}
