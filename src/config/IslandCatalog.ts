import type { GodDefinition, GodId, LuxuryKind } from '@/types';

/**
 * Adalar, tanrilar ve harikalar.
 *
 * Ikariam'da her adada:
 *   - bir ODUN yatagi (Hizar) - seviyesi adadaki tum sehirler icin ortak
 *   - bir LUKS kaynak yatagi (mermer/sarap/kukurt/kristal - yalnizca biri)
 *   - bir TANRI tapinagi ve ona bagli bir HARIKA
 *   - 16 sehr alani (plot)
 *
 * Harikanin seviyesini ADA INANCI belirler: her 20 inanç bir seviye acar
 * (20 -> 1, 40 -> 2, ..., 100 -> 5). Inanç, adadaki sehirlerin tapinak
 * bagislarindan gelir.
 */

/** Harika seviyesi basina gereken inanç. Ikariam: 20. */
export const FAITH_PER_WONDER_LEVEL = 20;

/** Azami harika seviyesi. Ikariam: 5. */
export const MAX_WONDER_LEVEL = 5;

/** Azami inanç. */
export const MAX_FAITH = 100;

/** Tapinak bagisi basina kazanilan inanç. */
export const FAITH_PER_DONATION = 1;

/** Ikariam'in sekiz tanrisi ve harikalari. */
export const GODS: GodDefinition[] = [
  {
    id: 'poseidon',
    name: 'Poseidon',
    wonderName: 'Poseidon Çeşmesi',
    wonderEffect: 'Savaş ve yük gemilerinin hızı %10 - %100 artar.',
    tint: 0x3f8fc0,
  },
  {
    id: 'demeter',
    name: 'Demeter',
    wonderName: 'Demeter Bahçeleri',
    wonderEffect: 'Şehirlerdeki nüfus artışı saatte +1 ile +6 arasında yükselir.',
    tint: 0x6fae4a,
  },
  {
    id: 'athena',
    name: 'Athena',
    wonderName: 'Athena Parthenon\u2019u',
    wonderEffect: 'Depolardaki güvenli kaynak miktarı %20 - %200 artar.',
    tint: 0xc9a227,
  },
  {
    id: 'hermes',
    name: 'Hermes',
    wonderName: 'Hermes Tapınağı',
    wonderEffect: 'Mal yükleme hızı %20 - %100 artar.',
    tint: 0x7fb0d8,
  },
  {
    id: 'ares',
    name: 'Ares',
    wonderName: 'Ares Kalesi',
    wonderEffect: 'Şehirlerindeki tüm ordulara tur başına +50 ile +1000 moral.',
    tint: 0xc0503a,
  },
  {
    id: 'hades',
    name: 'Hades',
    wonderName: 'Hades Kutsal Korusu',
    wonderEffect:
      'Şehrinde ölen birliklerin kaynak maliyetinin %10 - %40\u2019ı mermer olarak geri döner.',
    tint: 0x5a4a6a,
  },
  {
    id: 'hephaistos',
    name: 'Hephaistos',
    wonderName: 'Hephaistos Demirhanesi',
    wonderEffect: 'Tüm savaş birlikleri +0/+2 zırh ve %10 - %20 ek hasar alır.',
    tint: 0xd07a30,
  },
  {
    id: 'helios',
    name: 'Helios',
    wonderName: 'Kolos',
    wonderEffect:
      'Şehrine saldıran düşman birlik ve gemilerinin %10 - %100\u2019ü kaçarak dağılır.',
    tint: 0xe8c86a,
  },
];

const GOD_BY_ID = new Map<GodId, GodDefinition>(GODS.map((g) => [g.id, g]));

/** Tanri tanimini dondurur. */
export function getGod(id: GodId): GodDefinition {
  const god = GOD_BY_ID.get(id);
  if (!god) throw new Error(`Bilinmeyen tanri: ${id}`);
  return god;
}

/** Tanri kimligi tanimli mi? */
export function isKnownGodId(id: string): id is GodId {
  return GOD_BY_ID.has(id as GodId);
}

/** Inanctan harika seviyesini hesaplar (0..5). */
export function wonderLevelFor(faith: number): number {
  if (!Number.isFinite(faith) || faith <= 0) return 0;
  return Math.min(MAX_WONDER_LEVEL, Math.floor(faith / FAITH_PER_WONDER_LEVEL));
}

/**
 * Harika etkisinin guc oranini dondurur (0..1).
 *
 * Ikariam: seviye 1 -> %20, seviye 5 -> %100. Yani oran = seviye / 5.
 * Harika aktif DEGILSE (seviye 0) oran 0'dir.
 */
export function wonderPower(faith: number): number {
  return wonderLevelFor(faith) / MAX_WONDER_LEVEL;
}

/** Harikanin etkin suresi (oyun saniyesi). Ikariam tablosundan. */
export const WONDER_DURATION: Record<GodId, number> = {
  poseidon: 4 * 3600,
  demeter: 24 * 3600,
  athena: 24 * 3600,
  hermes: 4 * 3600,
  ares: 12 * 3600,
  hades: 16 * 3600,
  hephaistos: 24 * 3600,
  helios: 0, // Kolos pasiftir: saldiri aninda calisir
};

/** Harikanin bekleme suresi (oyun saniyesi). Ikariam tablosundan. */
export const WONDER_COOLDOWN: Record<GodId, number> = {
  poseidon: 24 * 3600,
  demeter: 9 * 24 * 3600,
  athena: 7 * 24 * 3600,
  hermes: 24 * 3600,
  ares: 3 * 24 * 3600,
  hades: 4 * 24 * 3600,
  hephaistos: 7 * 24 * 3600,
  helios: 3 * 24 * 3600,
};

/** Luks kaynaklarin Turkce adlari. */
export const LUXURY_NAMES: Record<LuxuryKind, string> = {
  marble: 'Mermer',
  wine: 'Şarap',
  sulfur: 'Kükürt',
  crystal: 'Kristal',
};

/**
 * Luks kaynaklarin hangi tanriyla eslestigi.
 *
 * Ikariam'da bu esleme sabit DEGILDIR; ada uretiminde rasgeledir. Bu tablo
 * yalnizca arayuzde renk/tutarlilik icin kullanilir.
 */
export const LUXURY_TINT: Record<LuxuryKind, number> = {
  marble: 0xd8d4c8,
  wine: 0x8e2f4a,
  sulfur: 0xd8c74a,
  crystal: 0x8fd0e8,
};
