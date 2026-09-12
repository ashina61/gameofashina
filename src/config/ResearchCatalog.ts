import type { ResearchDefinition, ResearchId } from '@/types';

/**
 * Arastirma katalogu.
 *
 * BES TEKNOLOJI, TEK MEKANIK
 * Hepsi carpan uygular; yeni bir oyun kurali getirmez. Bunun iki faydasi
 * var: etki her yerde ayni yoldan (BuildingResolver) gecer, ve arayuz
 * "su an ne uretiyorum" sorusunu tek kaynaktan cevaplamaya devam eder.
 *
 * DENGE MANTIGI
 * Maliyet altin + BILGI'dir. Bilgiyi yalnizca Akademi uretir, yani
 * arastirma zinciri once bir bina yatirimi ister. Sureler bilerek uzundur
 * (2-5 dakika): arastirma, oyuncunun sehri buyuturken arkada isleyen ikinci
 * bir ilerleme hattidir.
 *
 * Ucuncu arastirma (Lonca Nizami) Sprint 14 olcumunun bulgusuna dogrudan
 * cevap verir: gec oyunda BOSTA ISCI birikiyordu. Her uretim binasina bir
 * kadro slotu eklemek o isciyi ise sokar, ek uretim de karsiligini verir.
 */
const DEFINITIONS: ResearchDefinition[] = [
  {
    id: 'advanced_farming',
    name: 'Gelismis Tarim',
    description: 'Nadas ve sulama. Butun yiyecek uretimi %30 artar.',
    cost: { gold: 60, knowledge: 30 },
    duration: 120,
    requiredAcademyLevel: 1,
    effect: { productionMultiplier: { food: 1.3 } },
  },
  {
    id: 'forestry',
    name: 'Orman Isletmeciligi',
    description: 'Planli kesim ve bicki. Butun odun uretimi %30 artar.',
    cost: { gold: 70, knowledge: 35 },
    duration: 140,
    requiredAcademyLevel: 1,
    effect: { productionMultiplier: { wood: 1.3 } },
  },
  {
    id: 'stonecutting',
    name: 'Tas Isciligi',
    description: 'Kama ve kaldirac. Butun tas uretimi %40 artar.',
    cost: { gold: 90, knowledge: 45 },
    duration: 180,
    requiredAcademyLevel: 1,
    effect: { productionMultiplier: { stone: 1.4 } },
  },
  {
    id: 'trade_routes',
    name: 'Ticaret Yollari',
    description: 'Deniz asiri pazarlar. Butun altin geliri %30 artar.',
    cost: { gold: 140, knowledge: 70 },
    duration: 240,
    requiredAcademyLevel: 2,
    effect: { productionMultiplier: { gold: 1.3 } },
  },
  {
    id: 'guild_order',
    name: 'Lonca Nizami',
    description: 'Her uretim binasi bir isci daha alir ve %15 fazla uretir.',
    cost: { gold: 180, knowledge: 90 },
    duration: 300,
    requiredAcademyLevel: 2,
    effect: {
      workerSlotBonus: 1,
      productionMultiplier: { food: 1.15, wood: 1.15, stone: 1.15, gold: 1.15 },
    },
  },
];

const BY_ID = new Map<ResearchId, ResearchDefinition>(DEFINITIONS.map((d) => [d.id, d]));

/** Katalogdaki tum arastirmalar, sabit sirada. */
export function allResearch(): readonly ResearchDefinition[] {
  return DEFINITIONS;
}

/** Kimlikten tanim; bilinmeyen kimlik null doner. */
export function getResearch(id: string): ResearchDefinition | null {
  return BY_ID.get(id as ResearchId) ?? null;
}

/** Kimlik katalogda var mi? Kayit dogrulamasi bunu kullanir. */
export function isKnownResearchId(id: string): id is ResearchId {
  return BY_ID.has(id as ResearchId);
}
