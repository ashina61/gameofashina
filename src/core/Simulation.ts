import { MAX_OFFLINE_SECONDS, OFFLINE_CHUNK_TICKS, TICKS_PER_SECOND } from '@/config/Constants';
import type { GameState } from './GameState';
import type { ConstructionSystem } from '@/systems/ConstructionSystem';
import type { EconomySystem } from '@/systems/EconomySystem';

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
 *   3. Uretim, adim 2'den SONRAKI duruma gore hesaplanip uygulanir.
 *
 * Bu sira sayesinde pencerede tamamlanan bir bina o pencerenin uretimine
 * dahil olur - Sprint 1 ve prototip ile ayni sonuc.
 *
 * Gercek zaman burada yoktur; yalnizca tik sayisi islenir.
 */
export class Simulation {
  private readonly state: GameState;
  private readonly construction: ConstructionSystem;
  private readonly economy: EconomySystem;

  constructor(state: GameState, construction: ConstructionSystem, economy: EconomySystem) {
    this.state = state;
    this.construction = construction;
    this.economy = economy;
  }

  /** Simulasyonu verilen tik kadar ilerletir. */
  advance(ticks: number, options: { silent?: boolean } = {}): void {
    if (!Number.isFinite(ticks) || ticks <= 0) return;
    const whole = Math.floor(ticks);
    if (whole <= 0) return;

    this.state.advanceTick(whole);
    this.construction.advance(options);
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

    this.economy.publish();
    return totalTicks;
  }
}
