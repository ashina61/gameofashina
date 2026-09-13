import { getResearch } from '@/config/ResearchCatalog';
import type { CompletedResearch, ResearchEffect } from '@/types';

/**
 * Tamamlanmis arastirmalardan TURETILMIS toplam etki.
 *
 * Arastirmalarin etkisi ayri bir durum olarak TUTULMAZ; her gerektiginde
 * tamamlanmis listeden hesaplanir. Iki kaynak tutmak (liste + toplam etki)
 * birinin gecikmesi halinde oyunun kendisiyle celiskmesi demekti.
 *
 * TOPLAMA KURALLARI
 *   - indirimler TOPLANIR (Kasnak %2 + Geometri %4 = %6) ve tavana kirpilir
 *   - carpanlar TOPLANIR (1 + %5 + %8 = 1.13), carpilmaz
 *   - duz bonuslar TOPLANIR (+25 mutluluk, +50 nufus)
 *   - kilitler BIRLESIK kume olur
 *
 * Carpanlari carpmak yerine toplamak bilerek secildi: Ikariam'in
 * araştırmaları da boyledir ve carpma, cok sayıda kucuk bonusun birikip
 * ustel bir patlama yaratmasina yol acardi.
 */

/** Bir sehrin arastirmalardan aldigi toplam etki. */
export interface AggregatedEffects {
  /** Insa maliyeti indirimi (0..tavan). */
  buildCostReduction: number;
  /** Birlik/gemi bakim ucreti indirimi. */
  upkeepReduction: number;
  /** Bilim adami basina arastirma puani carpani (1 = degisiklik yok). */
  researchMultiplier: number;
  /** Tum sehirlerde duz mutluluk. */
  happinessAll: number;
  /** Yalnizca baskentte duz mutluluk. */
  happinessCapital: number;
  /** Tum sehirlerde duz maksimum nufus. */
  populationAll: number;
  /** Yalnizca baskentte duz maksimum nufus. */
  populationCapital: number;
  /** Yukleme hizi carpani. */
  loadingSpeedMultiplier: number;
  /** Gemi hizi carpani. */
  shipSpeedMultiplier: number;
  /** Ek yapi alani. */
  extraGround: number;
  /** Kilidi acilan binalar. */
  buildings: Set<string>;
  /** Kilidi acilan birlik/gemiler. */
  units: Set<string>;
  /** Kilidi acilan mekanikler. */
  features: Set<string>;
}

/** Etkisiz (bos) bir toplam. */
export function emptyEffects(): AggregatedEffects {
  return {
    buildCostReduction: 0,
    upkeepReduction: 0,
    researchMultiplier: 1,
    happinessAll: 0,
    happinessCapital: 0,
    populationAll: 0,
    populationCapital: 0,
    loadingSpeedMultiplier: 1,
    shipSpeedMultiplier: 1,
    extraGround: 0,
    buildings: new Set(),
    units: new Set(),
    features: new Set(),
  };
}

/**
 * Baskent/koloni ayrimi gerektiren etkileri ayirir.
 *
 * Ikariam'da Kuyu Kazma ve Utopya YALNIZCA baskenti etkiler, Tatil ise
 * tum sehirleri. Tek bir "happinessFlat" alani bunu ifade edemezdi;
 * bu yuzden arastirma hangi sehirleri hedefledigini kendi taniminda
 * tasir ve burada ayristirilir.
 */
const CAPITAL_ONLY: Record<string, 'happiness' | 'population'> = {
  well_digging: 'happiness',
  utopia: 'happiness',
};

/** Tamamlanmis arastirmalardan toplam etkiyi hesaplar. */
export function aggregateEffects(completed: readonly CompletedResearch[]): AggregatedEffects {
  const out = emptyEffects();

  for (const entry of completed) {
    const def = getResearch(entry.id);
    if (!def) continue;
    const level = Math.max(1, entry.level);
    apply(out, def.id, def.effect, level);
  }

  return out;
}

/** Tek bir arastirmanin etkisini toplama ekler. */
function apply(
  out: AggregatedEffects,
  id: string,
  effect: ResearchEffect,
  level: number,
): void {
  const capitalOnly = CAPITAL_ONLY[id] !== undefined;

  if (effect.buildCostReduction) out.buildCostReduction += effect.buildCostReduction * level;
  if (effect.upkeepReduction) out.upkeepReduction += effect.upkeepReduction * level;
  if (effect.researchMultiplier) out.researchMultiplier += effect.researchMultiplier * level;
  if (effect.loadingSpeedMultiplier) {
    out.loadingSpeedMultiplier += (effect.loadingSpeedMultiplier - 1) * level;
  }
  if (effect.shipSpeedMultiplier) {
    out.shipSpeedMultiplier += (effect.shipSpeedMultiplier - 1) * level;
  }
  if (effect.extraGround) out.extraGround += effect.extraGround * level;

  if (effect.happinessFlat) {
    if (capitalOnly) out.happinessCapital += effect.happinessFlat * level;
    else out.happinessAll += effect.happinessFlat * level;
  }
  if (effect.populationFlat) {
    if (capitalOnly) out.populationCapital += effect.populationFlat * level;
    else out.populationAll += effect.populationFlat * level;
  }

  for (const building of effect.unlocksBuildings ?? []) out.buildings.add(building);
  for (const unit of effect.unlocksUnits ?? []) out.units.add(unit);
  if (effect.unlocksFeature) out.features.add(effect.unlocksFeature);
}
