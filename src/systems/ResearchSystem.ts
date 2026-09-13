import { getResearch, requireResearch, RESEARCHES } from '@/config/ResearchCatalog';
import type { EventBus } from '@/core/EventBus';
import type { GameState } from '@/core/GameState';
import { academyLevel } from '@/core/CityQuery';
import { aggregateEffects } from './ResearchEffects';
import type { AggregatedEffects } from './ResearchEffects';
import type { ActiveResearch, CityState, ResearchDefinition } from '@/types';

/**
 * Arastirma agaci.
 *
 * Ikariam'da arastirma ALTINLA degil ARASTIRMA PUANIYLA (AP) yapilir. AP'yi
 * yalnizca Akademi'de calisan bilim adamlari uretir ve her bilim adami
 * saatte 1 AP verir. Ayni anda TEK arastirma yurur.
 *
 * HARCANMAYAN AP KAYBOLUR
 * Aktif bir arastirma yokken uretilen AP hicbir yere birikmez. Bu,
 * Ikariam'in gercek kuralidir ve oyuncuyu "her zaman bir arastirma secili
 * tutmaya" zorlar. Bir havuzda biriktirmek bu baskiyi kaldirirdi ve
 * oyunun ilerleme temposunu degistirirdi.
 *
 * KESIRLI BIRIKIM
 * `state.researchPoints` bir HAVUZ degil, kesir tasima alanidir. Saatlik
 * AP cogu tikte tam sayi degildir (ornegin 13 bilim adami x carpan); kesir
 * burada birikir ki uzun vadede AP kaybi olmasin.
 */

export class ResearchSystem {
  constructor(
    private readonly state: GameState,
    private readonly bus: EventBus,
  ) {}

  /** Tamamlanmis arastirmalarin toplam etkisi. */
  get effects(): AggregatedEffects {
    return aggregateEffects(this.state.completedResearch);
  }

  /** Oyuncunun en yuksek Akademi seviyesi (tum sehirler arasinda). */
  get academyLevel(): number {
    return this.state.cities.reduce((max, city) => Math.max(max, academyLevel(city)), 0);
  }

  /** Arastirmanin tamamlanmis seviyesi. */
  levelOf(id: string): number {
    return this.state.researchLevel(id);
  }

  /** Arastirma tamamlanmis mi? (seviyeli arastirmalarda en az 1) */
  isDone(id: string): boolean {
    return this.levelOf(id) > 0;
  }

  /** Bir sonraki seviyenin AP maliyeti. */
  costOf(id: string): number {
    const def = getResearch(id);
    if (!def) return Number.POSITIVE_INFINITY;
    const nextLevel = this.levelOf(id) + 1;
    // Ikariam: seviyeli arastirmalarda maliyet "taban x seviye".
    return def.maxLevel > 1 ? Math.round(def.cost * nextLevel) : def.cost;
  }

  /** Arastirmanin bir sonraki seviyesi; son seviyede null. */
  nextLevelOf(id: string): number | null {
    const def = getResearch(id);
    if (!def) return null;
    const next = this.levelOf(id) + 1;
    return next > def.maxLevel ? null : next;
  }

  /**
   * Arastirma su an baslatilabilir mi?
   *
   * Uc kosul: on kosullar tamamlanmis olmali, Akademi seviyesi yetmeli ve
   * arastirma son seviyesine ulasmamis olmali. Basarisizsa nedeni doner;
   * arayuz bu nedeni oyuncuya gosterir.
   */
  canStart(id: string): string | null {
    const def = getResearch(id);
    if (!def) return 'Bilinmeyen araştırma.';
    if (this.nextLevelOf(id) === null) return 'Bu araştırma zaten son seviyesinde.';

    if (this.state.activeResearch) {
      return 'Zaten yürüyen bir araştırma var; önce onu bitirin veya iptal edin.';
    }

    for (const requirement of def.requires) {
      if (!this.isDone(requirement)) {
        const req = getResearch(requirement);
        return `Önce "${req?.name ?? requirement}" araştırması tamamlanmalı.`;
      }
    }

    if (this.academyLevel < def.requiredAcademyLevel) {
      return `Akademi seviyesi en az ${def.requiredAcademyLevel} olmalı (şu an ${this.academyLevel}).`;
    }

    return null;
  }

  /** Arastirmayi baslatir. */
  start(id: string): boolean {
    if (this.canStart(id)) return false;
    const def = requireResearch(id);
    const level = this.nextLevelOf(id) ?? 1;
    const total = this.costOf(id);

    const active: ActiveResearch = {
      id: def.id,
      level,
      totalPoints: total,
      progress: 0,
      startedAtTick: this.state.tick,
    };
    this.state.activeResearch = active;
    this.bus.emit('research:started', active);
    return true;
  }

  /** Yuruyen arastirmayi iptal eder. Biriken AP GERI VERILMEZ. */
  cancel(): boolean {
    const active = this.state.activeResearch;
    if (!active) return false;
    this.state.activeResearch = null;
    this.state.setResearchPoints(0);
    this.bus.emit('research:cancelled', active.id);
    return true;
  }

  /**
   * Uretilen arastirma puanini alir.
   *
   * Aktif arastirma yoksa puan KAYBOLUR ve oyuncuya bir kez bildirilir.
   * Bildirimi her tikte tekrarlamak mesaj kutusunu doldururdu; bu yuzden
   * yalnizca "kayip durumu yeni basladi" gecisinde yayinlanir.
   */
  receive(points: number): void {
    if (!Number.isFinite(points) || points <= 0) return;

    const active = this.state.activeResearch;
    if (!active) {
      this.warnWasted(points);
      return;
    }

    active.progress += points;
    this.state.setResearchPoints(active.progress);
    this.bus.emit('research:points-changed', active.progress);
  }

  /** Kayip AP icin bildirim; ayni uyarı ust uste tekrarlanmaz. */
  private wastedWarnedAtTick = -1;

  private warnWasted(points: number): void {
    if (points <= 0) return;
    if (this.wastedWarnedAtTick === this.state.tick) return;
    this.wastedWarnedAtTick = this.state.tick;

    this.state.pushNotice({
      atTick: this.state.tick,
      title: 'Araştırma puanı boşa gidiyor',
      body: 'Bilim adamları çalışıyor ama yürüyen bir araştırma yok. Üretilen puanlar birikmiyor.',
      tone: 'warn',
      read: false,
    });
    this.bus.emit('notice:added', 'Araştırma puanı boşa gidiyor', 'Bir araştırma seçin.', 'warn');
  }

  /** Tamamlanan arastirmayi uygular. */
  advance(): void {
    const active = this.state.activeResearch;
    if (!active) return;
    if (active.progress < active.totalPoints) return;

    this.state.completeResearch(active.id, active.level);
    this.state.activeResearch = null;
    this.state.setResearchPoints(0);
    this.bus.emit('research:completed', active.id, active.level);

    const def = getResearch(active.id);
    this.state.pushNotice({
      atTick: this.state.tick,
      title: 'Araştırma tamamlandı',
      body: `${def?.name ?? active.id}${active.level > 1 ? ` (seviye ${active.level})` : ''} tamamlandı.`,
      tone: 'success',
      read: false,
    });
    this.bus.emit('notice:added', 'Araştırma tamamlandı', def?.name ?? active.id, 'success');
  }

  /** Su an acilabilir durumdaki arastirmalar (on kosulu saglanmis). */
  available(): ResearchDefinition[] {
    return RESEARCHES.filter((def) => {
      if (this.nextLevelOf(def.id) === null) return false;
      return def.requires.every((r) => this.isDone(r));
    });
  }

  /** Bina kilidini acan arastirma tamamlandi mi? */
  buildingUnlocked(buildingId: string): boolean {
    // Kilidi olan binalar icin: kilidi acan arastirma tamamlanmis olmali.
    for (const def of RESEARCHES) {
      const unlocks = def.effect.unlocksBuildings;
      if (unlocks?.includes(buildingId)) return this.isDone(def.id);
    }
    return true;
  }

  /** Birlik/gemi kilidini acan arastirma tamamlandi mi? */
  unitUnlocked(unitId: string): boolean {
    for (const def of RESEARCHES) {
      const unlocks = def.effect.unlocksUnits;
      if (unlocks?.includes(unitId)) return this.isDone(def.id);
    }
    return true;
  }

  /**
   * Deneyler (Experiments): kristali arastirma puanina cevirir.
   *
   * Ikariam'da bu arastirma kristali AP'ye cevirmeyi acar. Oran bilerek
   * kotudur: 100 kristal 1 AP. Kristal zaten bina maliyetlerinde en dar
   * kaynaktir; iyi bir oran verilse oyuncu hic arastirma yapmaz, sadece
   * kristal basardi.
   */
  static readonly CRYSTAL_PER_POINT = 100;

  convertCrystal(city: CityState, crystal: number): number {
    if (!this.state.hasResearch('experiments')) return 0;
    const amount = Number.isFinite(crystal) ? Math.max(0, Math.floor(crystal)) : 0;
    if (amount <= 0) return 0;

    const have = Math.floor(city.resources.crystal);
    const used = Math.min(amount, have);
    if (used <= 0) return 0;

    const points = Math.floor(used / ResearchSystem.CRYSTAL_PER_POINT);
    city.resources.crystal -= used;
    if (points > 0) this.receive(points);
    this.bus.emit('resources:changed', city.id);
    return points;
  }
}
