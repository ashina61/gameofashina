import { TICKS_PER_SECOND } from '@/config/Constants';
import { allResearch, getResearch } from '@/config/ResearchCatalog';
import { getBuilding } from '@/config/BuildingCatalog';
import type { EventBus } from '@/core/EventBus';
import type { GameState } from '@/core/GameState';
import type { ResourceSystem } from './ResourceSystem';
import type {
  ActiveResearch,
  CityModifiers,
  ResearchDefinition,
  ResearchId,
} from '@/types';

/** Arastirma baslatilamama nedenleri. */
export type ResearchError =
  | 'unknown'
  | 'already_done'
  | 'busy'
  | 'no_academy'
  | 'academy_level'
  | 'cost';

export const RESEARCH_MESSAGES: Record<ResearchError, string> = {
  unknown: 'Bu arastirma tanimli degil.',
  already_done: 'Bu arastirma zaten tamamlandi.',
  busy: 'Baska bir arastirma suruyor.',
  no_academy: 'Once bir Akademi kur.',
  academy_level: 'Akademiyi yukselt: bu arastirma daha ileri seviye ister.',
  cost: 'Yeterli altin ya da bilgi yok.',
};

/**
 * Ayni sebeplerin ROZET karsiliklari.
 *
 * Ustteki uzun cumleler bildirim icin yazildi; arastirma satirinda ise
 * teknoloji adiyla ayni satiri paylasan dar bir alan var. Uzun metin orada
 * adin uzerine biniyordu (olculdu: "Ticaret Yollari" ve "Lonca Nizami"
 * satirlari okunamaz haldeydi). Iki ayri metin, iki ayri yer icin.
 */
export const RESEARCH_BADGES: Record<ResearchError, string> = {
  unknown: 'TANIMSIZ',
  already_done: 'TAMAM',
  busy: 'MESGUL',
  no_academy: 'AKADEMI GEREK',
  academy_level: 'AKADEMI Sv.2',
  cost: 'KAYNAK YOK',
};

export type ResearchResult = { ok: true; active: ActiveResearch } | { ok: false; reason: ResearchError };

/** Hicbir arastirma yokken gecerli olan carpanlar. */
const NEUTRAL: CityModifiers = { production: {}, workerSlotBonus: 0 };

/**
 * Arastirma sistemi.
 *
 * NE YAPAR
 * Oyuncunun secimiyle bir teknolojiyi baslatir, tik tik ilerletir ve
 * tamamlandiginda sehir capinda gecerli CARPANLARI buyutur.
 *
 * TEK GERCEK: TAMAMLANANLAR LISTESI
 * Carpanlar saklanmaz, her seferinde tamamlanan listesinden TURETILIR.
 * Saklamak ikinci bir gercek yaratir ve kayit ile canli durum birbirinden
 * kayabilirdi. Liste kucuk (bes eleman), turetme maliyeti yok denecek
 * kadar az - ama yine de her tikte degil, yalnizca liste DEGISTIGINDE
 * hesaplanip onbellege alinir.
 *
 * AYNI ANDA TEK ARASTIRMA
 * Insaat kuyrugundan farkli olarak burada kuyruk yok: arastirma sehrin
 * dikkatini isteyen tekil bir yatirimdir. Maliyet baslangicta odenir;
 * iptal yoktur (bilgi geri alinamaz).
 *
 * PHASER'DAN BAGIMSIZ: yalnizca GameState, kaynak sistemi ve olay yolu.
 */
export class ResearchSystem {
  private readonly state: GameState;
  private readonly resources: ResourceSystem;
  private readonly bus: EventBus;

  private readonly done = new Set<ResearchId>();
  private current: ActiveResearch | null = null;

  /** Tamamlananlardan turetilen carpanlar; liste degisince tazelenir. */
  private cachedModifiers: CityModifiers = NEUTRAL;

  constructor(state: GameState, resources: ResourceSystem, bus: EventBus) {
    this.state = state;
    this.resources = resources;
    this.bus = bus;
    this.restore();
  }

  /** Tamamlanan arastirmalar (salt okunur). */
  get completed(): ReadonlySet<ResearchId> {
    return this.done;
  }

  /** Devam eden arastirma; yoksa null. */
  get active(): ActiveResearch | null {
    return this.current;
  }

  /** Sehir capinda gecerli carpanlar. */
  get modifiers(): CityModifiers {
    return this.cachedModifiers;
  }

  /** Devam eden arastirmanin kalan tiki; yoksa 0. */
  get remainingTicks(): number {
    if (!this.current) return 0;
    return Math.max(0, this.current.completesAtTick - this.state.tick);
  }

  /** Devam eden arastirmanin 0..1 ilerlemesi; yoksa 0. */
  get progress(): number {
    if (!this.current) return 0;
    const total = this.current.completesAtTick - this.current.startedAtTick;
    if (total <= 0) return 1;
    return Math.min(1, Math.max(0, 1 - this.remainingTicks / total));
  }

  /** Bir arastirma baslatilabilir mi? */
  canStart(id: string): ResearchResult | { ok: true } {
    const def = getResearch(id);
    if (!def) return { ok: false, reason: 'unknown' };
    if (this.done.has(def.id)) return { ok: false, reason: 'already_done' };
    if (this.current) return { ok: false, reason: 'busy' };

    const academyLevel = this.academyLevel();
    if (academyLevel === 0) return { ok: false, reason: 'no_academy' };
    if (academyLevel < def.requiredAcademyLevel) return { ok: false, reason: 'academy_level' };
    if (!this.resources.canAfford(def.cost)) return { ok: false, reason: 'cost' };
    return { ok: true };
  }

  /**
   * Arastirmayi baslatir ve maliyeti duser.
   *
   * ATOMIK: maliyet ancak butun kurallar gectikten SONRA dusulur, yani
   * reddedilen bir istek hicbir sey harcamaz.
   */
  start(id: string): ResearchResult {
    const check = this.canStart(id);
    if (!check.ok) return check as ResearchResult;

    const def = getResearch(id)!;
    if (!this.resources.spend(def.cost)) return { ok: false, reason: 'cost' };

    const startedAtTick = this.state.tick;
    this.current = {
      id: def.id,
      startedAtTick,
      completesAtTick: startedAtTick + Math.max(1, Math.round(def.duration * TICKS_PER_SECOND)),
    };
    this.bus.emit('research:started', this.current);
    return { ok: true, active: this.current };
  }

  /**
   * Zamani ilerletir ve suresi dolan arastirmayi tamamlar.
   *
   * Simulation her tikte cagirir. Toplu ilerletmede (cevrimdisi telafi)
   * de dogru calisir: bitis TIKI mutlaktir, gecen tik sayisi degil.
   */
  advance(): void {
    if (!this.current) return;
    if (this.state.tick < this.current.completesAtTick) return;

    const finished = this.current;
    this.current = null;
    this.done.add(finished.id);
    this.recalculate();
    this.bus.emit('research:completed', finished);
  }

  /** Sehirdeki en yuksek AKTIF akademi seviyesi; yoksa 0. */
  academyLevel(): number {
    let best = 0;
    for (const building of this.state.buildings.values()) {
      if (building.type !== 'academy') continue;
      if (building.state !== 'active') continue;
      const def = getBuilding(building.type);
      best = Math.max(best, Math.min(building.level, def.levels.length));
    }
    return best;
  }

  /** Katalogdaki arastirmalar, tamamlanma durumuyla birlikte. */
  list(): Array<{ def: ResearchDefinition; done: boolean; active: boolean }> {
    return allResearch().map((def) => ({
      def,
      done: this.done.has(def.id),
      active: this.current?.id === def.id,
    }));
  }

  /** Kayit icin durum anlik goruntusu. */
  toSave(): { completed: string[]; active: ActiveResearch | null } {
    return { completed: [...this.done], active: this.current ? { ...this.current } : null };
  }

  /** Kayittan gelen durumu yukler; gecersiz kimlikler sessizce atilir. */
  private restore(): void {
    const saved = this.state.researchState;
    if (!saved) return;

    for (const id of saved.completed) {
      const def = getResearch(id);
      if (def) this.done.add(def.id);
    }
    if (saved.active && getResearch(saved.active.id)) {
      this.current = {
        id: saved.active.id as ResearchId,
        startedAtTick: saved.active.startedAtTick,
        completesAtTick: saved.active.completesAtTick,
      };
      // Tamamlanmisken kaydedilmis bir gorev, yuklenince hemen biter.
      if (this.done.has(this.current.id)) this.current = null;
    }
    this.recalculate();
  }

  /**
   * Carpanlari tamamlanan listesinden yeniden turetir.
   *
   * Carpanlar BIRBIRIYLE CARPILIR, toplanmaz: iki ayri %15 arti arka
   * arkaya gelince %30 degil %32.25 eder. Carpma, art arda gelen
   * gelistirmelerin birbirini beslemesini saglar ve hicbir siraya bagli
   * degildir.
   */
  private recalculate(): void {
    const production: Partial<Record<string, number>> = {};
    let workerSlotBonus = 0;

    for (const id of this.done) {
      const def = getResearch(id);
      if (!def) continue;
      workerSlotBonus += def.effect.workerSlotBonus ?? 0;
      for (const [key, value] of Object.entries(def.effect.productionMultiplier ?? {})) {
        production[key] = (production[key] ?? 1) * value;
      }
    }

    this.cachedModifiers = {
      production: production as CityModifiers['production'],
      workerSlotBonus,
    };
  }
}
