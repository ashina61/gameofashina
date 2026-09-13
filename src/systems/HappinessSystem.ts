import {
  CORRUPTION_PER_MISSING_LEVEL,
  HAPPINESS_PER_CULTURAL_GOOD,
  HAPPINESS_PER_WINE,
  MAX_CORRUPTION,
} from '@/config/Constants';
import { museumLevel, palaceLevel, governorLevel, tavernLevel } from '@/core/CityQuery';
import type { GameState } from '@/core/GameState';
import { aggregateEffects } from './ResearchEffects';
import type { CityState } from '@/types';

/**
 * Mutluluk ve yolsuzluk.
 *
 * Ikariam'in merkez dongusu buradadir:
 *
 *   sarap -> meyhane -> mutluluk -> nufus artisi -> isci -> kaynak
 *
 * Mutluluk bir "puan"dir ve NUFUSLA KIYASLANIR. Fazla pozitifse sehir
 * buyur, negatifse vatandaslar sehri terk eder. Bu yuzden mutluluk
 * arayuzde daima "X mutluluk / Y vatandas" biciminde gosterilir.
 *
 * KAYNAKLAR
 *   + Meyhane: servis edilen her birim sarap icin +23.4
 *   + Muze: her kultur mali icin +70
 *   + Arastirmalar: Kuyu Kazma (+50, baskent), Tatil (+25, hepsi),
 *     Utopya (+200, baskent), Ekonomik Gelecek (+10/seviye, hepsi)
 *   - Yolsuzluk: brüt mutlulugu yuzdesel kirpar
 *
 * YOLSUZLUK
 * Ikariam'da koloniler, Vali Konagi seviyesi koloni sayisinin altindaysa
 * yolsuzluga duser; baskentte ise ayni isi Saray gorur. Her eksik seviye
 * %8 yolsuzluk demektir ve tavan %92'dir. Tek sehri olan oyuncuda
 * yolsuzluk sifirdir - koloni sayisi 0'dir.
 */

/** Mutlulugun dokum; arayuz bunu satir satir gosterir. */
export interface HappinessBreakdown {
  tavern: number;
  museum: number;
  researchAll: number;
  researchCapital: number;
  gross: number;
  corruption: number;
  corruptionLoss: number;
  net: number;
}

export class HappinessSystem {
  constructor(private readonly state: GameState) {}

  /**
   * Arastirma etkilerinin toplami.
   *
   * Her cagrida yeniden hesaplanir: tamamlanmis arastirma listesi kisa
   * (oyun boyunca yuzlerce degil) ve bu hesap yalnizca sehir ozeti
   * istendiginde yapilir, kare basina degil.
   */
  private get effects() {
    return aggregateEffects(this.state.completedResearch);
  }

  /**
   * Sehrin yolsuzluk orani (0..0.92).
   *
   * Koloni sayisi, o sehrin Saray/Vali Konagi seviyesiyle karsilastirilir.
   * Baskentte Saray, kolonide Vali Konagi baz alinir.
   */
  corruptionOf(city: CityState): number {
    const colonies = this.state.colonyCount;
    if (colonies <= 0) return 0;

    const governing = city.isCapital ? palaceLevel(city) : governorLevel(city);
    // Yonetim binasi hic kurulmadiysa tum koloniler yolsuzluk icindedir.
    const missing = Math.max(0, colonies - Math.max(0, governing));
    return Math.min(MAX_CORRUPTION, missing * CORRUPTION_PER_MISSING_LEVEL);
  }

  /** Sehrin mutluluk dokumunu hesaplar. */
  breakdown(city: CityState): HappinessBreakdown {
    const effects = this.effects;

    // Meyhane: oyuncunun AYARLADIGI sarap miktari esas alinir, seviye degil.
    // Seviye yalnizca servis edilebilecek azami sarabi belirler; azamiyi
    // asan bir istek zaten CitizenSystem tarafindan kirpilir.
    const wine = Math.max(0, city.tavernWine) * (tavernLevel(city) > 0 ? 1 : 0);
    const tavern = wine * HAPPINESS_PER_WINE;

    // Muze: yapilan kultur anlasmalarinin toplam mali.
    const goods = city.museumGoods.reduce((sum, treaty) => sum + Math.max(0, treaty.goods), 0);
    const museum = museumLevel(city) > 0 ? goods * HAPPINESS_PER_CULTURAL_GOOD : 0;

    const researchAll = effects.happinessAll;
    const researchCapital = city.isCapital ? effects.happinessCapital : 0;

    const gross = tavern + museum + researchAll + researchCapital;
    const corruption = this.corruptionOf(city);
    const corruptionLoss = gross * corruption;
    const net = gross - corruptionLoss;

    return { tavern, museum, researchAll, researchCapital, gross, corruption, corruptionLoss, net };
  }

  /** Sehrin mutluluk puani. */
  happiness(city: CityState): number {
    return this.breakdown(city).net;
  }

  /**
   * Mutluluk fazlasi: mutluluk - nufus.
   *
   * Pozitifse sehir buyur, negatifse kuculur. Ikariam arayuzundeki
   * "mutlu/mutsuz" gostergesi tam olarak bu farktir.
   */
  surplus(city: CityState): number {
    return this.happiness(city) - city.citizens;
  }
}
