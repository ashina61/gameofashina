import { MS_PER_TICK, TICKS_PER_SECOND } from '@/config/Constants';

/**
 * Gercek zamani simulasyon tikine ceviren biriktirici.
 *
 * Tik SAYACINI tutmaz - o, kaydedilen oyun durumunun parcasidir
 * (GameState.tick). Bu sinif yalnizca "gecen sureye karsilik kac tam tik
 * islenmeli" sorusunu yanitlar ve artan kesri bir sonraki kareye tasir.
 *
 * Bu ayrim sayesinde oyun durumu gercek saatten bagimsizdir: ayni sayida tik
 * her zaman ayni sonucu verir, kare hizi ne olursa olsun.
 */
export class SimulationClock {
  private readonly msPerTick: number;

  /** Henuz bir tike yetmemis, devreden gercek zaman (ms). */
  private carryMs = 0;

  constructor(msPerTick: number = MS_PER_TICK) {
    this.msPerTick = msPerTick > 0 ? msPerTick : MS_PER_TICK;
  }

  /**
   * Gecen gercek zamani yutar ve islenmesi gereken tam tik sayisini dondurur.
   * Artan kesir bir sonraki cagriya devreder; zaman kaybolmaz.
   */
  absorb(deltaMs: number): number {
    if (!Number.isFinite(deltaMs) || deltaMs <= 0) return 0;

    this.carryMs += deltaMs;
    const ticks = Math.floor(this.carryMs / this.msPerTick);
    if (ticks > 0) {
      this.carryMs -= ticks * this.msPerTick;
    }
    return ticks;
  }

  /** Devreden kesri sifirlar (ornegin cevrimdisi telafiden sonra). */
  reset(): void {
    this.carryMs = 0;
  }
}

/** Saniyeyi tam tik sayisina cevirir. */
export function secondsToTicks(seconds: number): number {
  if (!Number.isFinite(seconds) || seconds <= 0) return 0;
  return Math.floor(seconds * TICKS_PER_SECOND);
}
