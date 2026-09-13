import { FAITH_PER_DONATION, MAX_FAITH, WONDER_COOLDOWN, WONDER_DURATION } from '@/config/IslandCatalog';
import { wonderLevelFor } from '@/config/IslandCatalog';
import type { EventBus } from '@/core/EventBus';
import type { GameState } from '@/core/GameState';
import type { GodId, WonderActivation } from '@/types';

/**
 * Ada inanci, tanri tapinagi ve harikalar.
 *
 * Ikariam'da harika PASIF bir bina degildir. Zincir soyledir:
 *
 *   Tapinak kur -> bagis yap -> ada inanci yukselir -> harika seviyesi acar
 *   -> harikayi AKTIFLESTIR -> etki sureli bir pencerede gecerlidir
 *   -> bekleme suresi baslar
 *
 * Inanç ADA bazlidir ve adadaki tum sehirler ayni harikayi kullanir.
 * Bu, Ikariam'da ayni adada oturan oyunculari isbirligine zorlayan
 * mekanigin kendisidir; burada NPC'ler bagis yapmadigi icin inanci
 * oyuncu tek basina yukseltir.
 */

/** Bir faith puani icin gereken odun. */
export const WOOD_PER_FAITH_POINT = 200;

/** Harika aktivasyonunun altin maliyeti (seviye basina). */
export const GOLD_PER_WONDER_LEVEL = 500;

export class WonderSystem {
  constructor(
    private readonly state: GameState,
    private readonly bus: EventBus,
  ) {}

  /** Adanin inanci (0..100). */
  faithOf(islandId: string): number {
    return this.state.islandOf(islandId)?.faith ?? 0;
  }

  /** Adanin tanrisi. */
  godOf(islandId: string): GodId | null {
    return this.state.islandOf(islandId)?.god ?? null;
  }

  /** Inanctan gelen harika seviyesi (0..5). */
  levelOf(islandId: string): number {
    return wonderLevelFor(this.faithOf(islandId));
  }

  /** Harikanin guc orani (0..1): seviye / 5. */
  powerOf(islandId: string): number {
    return this.levelOf(islandId) / 5;
  }

  /** Adanin harika kaydi. */
  activationOf(islandId: string): WonderActivation | null {
    return this.state.wonders.find((w) => w.islandId === islandId) ?? null;
  }

  /** Harika su an aktif mi? */
  isActive(islandId: string): boolean {
    const activation = this.activationOf(islandId);
    if (!activation) return false;
    // Kolos gibi suresiz etkiler endsGameSeconds = 0 tasir.
    if (activation.endsGameSeconds <= 0) return true;
    return this.state.gameSeconds < activation.endsGameSeconds;
  }

  /** Bekleme suresi dolmus mu? */
  isReady(islandId: string): boolean {
    const activation = this.activationOf(islandId);
    if (!activation) return true;
    return this.state.gameSeconds >= activation.cooldownEndsGameSeconds;
  }

  /** Bir faith puani icin gereken odun. */
  donationCost(): number {
    return WOOD_PER_FAITH_POINT;
  }

  /**
   * Tapinaga bagis yapar ve ada inancini yukseltir.
   *
   * Inanç tavanı 100'dur; her 20 inanç bir harika seviyesi acar. Bagis
   * miktari odun olarak alinir ve FAITH_PER_DONATION'a bolunur; kalan
   * odun GERI VERILMEZ cunku Ikariam'da bagis geri alinamaz.
   */
  donate(islandId: string, wood: number): number {
    const island = this.state.islandOf(islandId);
    if (!island) return 0;
    const amount = Number.isFinite(wood) ? Math.max(0, Math.floor(wood)) : 0;
    if (amount <= 0) return 0;

    const gained = Math.floor(amount / WOOD_PER_FAITH_POINT);
    if (gained <= 0) return 0;

    const before = island.faith;
    island.faith = Math.min(MAX_FAITH, before + gained * FAITH_PER_DONATION);
    if (island.faith !== before) this.bus.emit('island:faith-changed', islandId, island.faith);
    return island.faith - before;
  }

  /** Harikayi aktiflestirmenin altin maliyeti. */
  activationCost(islandId: string): number {
    return this.levelOf(islandId) * GOLD_PER_WONDER_LEVEL;
  }

  /** Aktiflestirme neden yapilamiyor? (yapilabiliyorsa null) */
  canActivate(islandId: string): string | null {
    const level = this.levelOf(islandId);
    if (level <= 0) return 'Ada inancı henüz harika seviyesi açmadı (her 20 inanç 1 seviye).';
    if (!this.isReady(islandId)) return 'Harika bekleme süresinde.';
    if (this.state.gold < this.activationCost(islandId)) return 'Yeterli altın yok.';
    return null;
  }

  /** Harikayi aktiflestirir. */
  activate(islandId: string): boolean {
    const reason = this.canActivate(islandId);
    if (reason) return false;

    const island = this.state.islandOf(islandId);
    if (!island) return false;

    const level = this.levelOf(islandId);
    const duration = WONDER_DURATION[island.god];
    const cooldown = WONDER_COOLDOWN[island.god];

    this.state.addGold(-this.activationCost(islandId));

    const existing = this.activationOf(islandId);
    const activation: WonderActivation = {
      islandId,
      god: island.god,
      level,
      startedGameSeconds: this.state.gameSeconds,
      endsGameSeconds: duration > 0 ? this.state.gameSeconds + duration : 0,
      cooldownEndsGameSeconds: this.state.gameSeconds + Math.max(duration, cooldown),
    };
    if (existing) {
      const index = this.state.wonders.indexOf(existing);
      this.state.wonders[index] = activation;
    } else {
      this.state.wonders.push(activation);
    }

    this.bus.emit('wonder:activated', islandId, island.god, level);
    return true;
  }

  /**
   * Suresi dolan harikalari temizler.
   *
   * Bekleme suresi KAYITTA KALIR: harikanin etkisi bitse bile yeniden
   * aktiflestirmek icin bekleme suresinin dolmasi gerekir. Ikariam'da da
   * etki suresi ile bekleme suresi ayri sayaclardir.
   */
  advance(): void {
    for (const activation of this.state.wonders) {
      if (activation.endsGameSeconds > 0 && this.state.gameSeconds >= activation.endsGameSeconds) {
        // Etki bitti; kayit bekleme suresi icin durur.
        activation.endsGameSeconds = 0;
        activation.level = 0;
      }
    }
  }

  // --- Etki okuyuculari ----------------------------------------------------

  /** Poseidon: gemi hizi bonusu (0..1). */
  shipSpeedBonus(islandId: string): number {
    return this.bonusIf(islandId, 'poseidon');
  }

  /** Demeter: saatlik ek nufus artisi (1..6). */
  populationGrowthBonus(islandId: string): number {
    const power = this.bonusIf(islandId, 'demeter');
    return power > 0 ? Math.max(1, Math.round(power * 6)) : 0;
  }

  /** Athena: guvenli kaynak bonusu (0.2..2.0). */
  safeResourceBonus(islandId: string): number {
    return this.bonusIf(islandId, 'athena') * 2;
  }

  /** Hermes: yukleme hizi bonusu (0..1). */
  loadingBonus(islandId: string): number {
    return this.bonusIf(islandId, 'hermes');
  }

  /** Ares: tur basina moral (50..1000). */
  moraleBonus(islandId: string): number {
    return Math.round(this.bonusIf(islandId, 'ares') * 1000);
  }

  /** Hades: olen birliklerin kaynak maliyetinin mermer olarak donen orani. */
  marbleRefundRatio(islandId: string): number {
    return this.bonusIf(islandId, 'hades') * 0.4;
  }

  /** Hephaistos: ek zirh (0..2) ve hasar carpani (1.0..1.2). */
  combatBonus(islandId: string): { armor: number; damageMultiplier: number } {
    const power = this.bonusIf(islandId, 'hephaistos');
    return { armor: power * 2, damageMultiplier: 1 + power * 0.2 };
  }

  /** Kolos (Helios): saldiran dusman birliklerinin kacma orani (0..1). */
  flightChance(islandId: string): number {
    // Kolos savunmada ANINDA calisir; aktivasyon penceresi beklemez.
    const level = this.levelOf(islandId);
    if (level <= 0) return 0;
    const activation = this.activationOf(islandId);
    if (activation && activation.cooldownEndsGameSeconds > this.state.gameSeconds) return 0;
    return level / 5;
  }

  /** Yalnizca verilen tanrinin harikasi aktifse guc oranini dondurur. */
  private bonusIf(islandId: string, god: GodId): number {
    const island = this.state.islandOf(islandId);
    if (!island || island.god !== god) return 0;
    if (!this.isActive(islandId)) return 0;
    const activation = this.activationOf(islandId);
    if (!activation || activation.level <= 0) return 0;
    return activation.level / 5;
  }
}
