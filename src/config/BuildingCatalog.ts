import type { BuildingDefinition, BuildingId } from '@/types';

/**
 * Bina kataloğu: tum bina turlerinin statik tanimlari.
 * Yeni bina eklemek icin buraya bir kayit eklemek yeterlidir;
 * insa menusu, uretim ve render katmanlari bu tablodan beslenir.
 */
const DEFINITIONS: BuildingDefinition[] = [
  {
    id: 'town_hall',
    name: 'Sehir Merkezi',
    description: 'Sehrin kalbi. Az miktarda altin ve depo alani saglar.',
    category: 'civic',
    size: 2,
    cost: { wood: 120, stone: 80 },
    buildTime: 30,
    production: { gold: 2 },
    populationCapacity: 4,
    storageCapacity: 250,
    maxCount: 1,
    allowedTerrain: ['grass', 'soil'],
    tint: 0xd8c79a,
  },
  {
    id: 'house',
    name: 'Ev',
    description: 'Isci barindirir. Uretim binalari icin nufus saglar.',
    category: 'civic',
    size: 1,
    cost: { wood: 40, stone: 10 },
    buildTime: 12,
    populationCapacity: 5,
    allowedTerrain: ['grass', 'soil'],
    tint: 0xc98f5a,
  },
  {
    id: 'farm',
    name: 'Ciftlik',
    description: 'Yiyecek uretir. Verimli topraga kurulmasi gerekir.',
    category: 'production',
    size: 1,
    cost: { wood: 30 },
    buildTime: 15,
    production: { food: 6 },
    workers: 2,
    allowedTerrain: ['soil', 'grass'],
    tint: 0x9fbf62,
  },
  {
    id: 'lumber_camp',
    name: 'Oduncu Kampi',
    description: 'Odun uretir. Insaatin temel kaynagi.',
    category: 'production',
    size: 1,
    cost: { wood: 20, stone: 10 },
    buildTime: 15,
    production: { wood: 5 },
    workers: 3,
    allowedTerrain: ['grass'],
    tint: 0x6f8f4a,
  },
  {
    id: 'quarry',
    name: 'Tas Ocagi',
    description: 'Tas uretir. Sadece kayalik zemine kurulabilir.',
    category: 'production',
    size: 1,
    cost: { wood: 50 },
    buildTime: 20,
    production: { stone: 4 },
    workers: 4,
    allowedTerrain: ['rock'],
    tint: 0x8d949c,
  },
  {
    id: 'market',
    name: 'Pazar',
    description: 'Ticaretten altin kazandirir.',
    category: 'production',
    size: 1,
    cost: { wood: 80, stone: 40 },
    buildTime: 25,
    production: { gold: 4 },
    workers: 3,
    allowedTerrain: ['grass', 'soil'],
    tint: 0xc06a5a,
  },
  {
    id: 'warehouse',
    name: 'Ambar',
    description: 'Tum kaynaklarin depo kapasitesini artirir.',
    category: 'storage',
    size: 1,
    cost: { wood: 60, stone: 60 },
    buildTime: 20,
    storageCapacity: 400,
    allowedTerrain: ['grass', 'soil', 'rock'],
    tint: 0x7d6b52,
  },
];

const BY_ID = new Map<BuildingId, BuildingDefinition>(DEFINITIONS.map((d) => [d.id, d]));

/** Katalogtaki tum bina tanimlari (menu sirasi ile). */
export function allBuildings(): readonly BuildingDefinition[] {
  return DEFINITIONS;
}

/** Verilen kimlige ait bina tanimini dondurur; yoksa undefined. */
export function findBuilding(id: BuildingId): BuildingDefinition | undefined {
  return BY_ID.get(id);
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
