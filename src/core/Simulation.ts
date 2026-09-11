import { MAX_OFFLINE_SECONDS, OFFLINE_CHUNK_TICKS, TICKS_PER_SECOND } from '@/config/Constants';
import type { GameState } from './GameState';
import type { ConstructionSystem } from '@/systems/ConstructionSystem';
import type { EconomySystem } from '@/systems/EconomySystem';
import type { PopulationSystem } from '@/systems/PopulationSystem';
import type { WorkforceSystem } from '@/systems/WorkforceSystem';

/**
 * Simulasyon orkestratoru: tik sayacini ilerleten TEK yer.
 *
 * Sprint 1'de tik ilerletme gecici olarak EconomySystem icindeydi ve o zaman
 * "ikinci bir sistem geldiginde ortak bir orkestratore tasinacak" diye
 * isaretlenmisti. ConstructionSystem ile birlikte o an geldi: iki sistemin de
 * kendi basina zamani ilerletmesi tikleri iki kez saydirirdi.
 *
 * ADIM SIRASI (prototipteki davranisi korur)
 *   1. Tik sayaci ilerler.
 *   2. Tamamlanma tikine ulasan insaat/yukseltme gorevleri uygulanir.
 *   3. Nufus buyur veya azalir.
 *   4. Is gucu hizalanir ve yoldaki isciler ilerler.
 *   5. Uretim, adim 4'ten SONRAKI kadroya gore hesaplanip uygulanir.
 *
 * Bu sira sayesinde pencerede tamamlanan bir bina o pencerenin uretimine
 * dahil olur - Sprint 1 ve prototip ile ayni sonuc. Nufus uretimden ONCE
 * islenir: yeni gelen vatandas ayni pencerede ise baslar, ayni pencerede
 * yemegini de yer.
 *
 * Gercek zaman burada yoktur; yalnizca tik sayisi islenir.
 */
export class Simulation {
  private readonly state: GameState;
  private readonly construction: ConstructionSystem;
  private readonly population: PopulationSystem;
  private readonly workforce: WorkforceSystem;
  private readonly economy: EconomySystem;

  constructor(
    state: GameState,
    construction: ConstructionSystem,
    population: PopulationSystem,
    workforce: WorkforceSystem,
    economy: EconomySystem,
  ) {
    this.state = state;
    this.construction = construction;
    this.population = population;
    this.workforce = workforce;
    this.economy = economy;
  }

  /** Simulasyonu verilen tik kadar ilerletir. */
  advance(ticks: number, options: { silent?: boolean } = {}): void {
    if (!Number.isFinite(ticks) || ticks <= 0) return;
    const whole = Math.floor(ticks);
    if (whole <= 0) return;

    this.state.advanceTick(whole);
    this.construction.advance(options);
    this.population.advance(whole, options);
    // Once yeni/giden isciler hizalanir, sonra yoldakiler ilerler; boylece
    // ayni pencerede varan isci o pencerenin uretimine katilir.
    this.workforce.reconcile();
    this.workforce.advance(whole, options);
    this.economy.advance(whole, options);
  }

  /** Saniye cinsinden ilerletme kolayligi. */
  advanceSeconds(seconds: number, options: { silent?: boolean } = {}): void {
    this.advance(Math.floor(seconds * TICKS_PER_SECOND), options);
  }

  /**
   * Oyun kapaliyken gecen sureyi telafi eder.
   *
   * Gercek dunya suresi burada YALNIZCA kac tik islenecegini belirlemek icin
   * kullanilir; sonuc tamamen tik sayisindan turer. Islenen tik sayisini
   * dondurur. Ust sinir MAX_OFFLINE_SECONDS.
   */
  applyOfflineProgress(elapsedSeconds: number): number {
    const cappedSeconds = Math.min(Math.max(0, elapsedSeconds), MAX_OFFLINE_SECONDS);
    const totalTicks = Math.floor(cappedSeconds * TICKS_PER_SECOND);
    if (totalTicks <= 0) return 0;

    // Uzun sureyi tek adimda uygulamak gorev esiklerini atlar; parcalara bolunur.
    let remaining = totalTicks;
    while (remaining > 0) {
      const step = Math.min(OFFLINE_CHUNK_TICKS, remaining);
      this.advance(step, { silent: true });
      remaining -= step;
    }

    this.population.publish();
    this.workforce.publishChange();
    this.economy.publish();
    return totalTicks;
  }
}
