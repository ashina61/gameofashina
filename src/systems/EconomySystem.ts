import {
  BASE_POPULATION_CAPACITY,
  FOOD_UPKEEP_PER_WORKER,
  MAX_OFFLINE_SECONDS,
  OFFLINE_CHUNK_TICKS,
  RESOURCE_ORDER,
  TICKS_PER_SECOND,
} from '@/config/Constants';
import { getBuilding } from '@/config/BuildingCatalog';
import { resolveBuilding } from './BuildingResolver';
import type { EventBus } from '@/core/EventBus';
import type { GameState } from '@/core/GameState';
import type { BuildingSystem } from './BuildingSystem';
import type { ResourceSystem } from './ResourceSystem';
import type { EconomySnapshot, ResourcePool } from '@/types';

/** Bir dakikadaki tik sayisi; uretim oranlari dakika cinsinden tanimlidir. */
const TICKS_PER_MINUTE = 60 * TICKS_PER_SECOND;

/**
 * Ekonomi simulasyonu: insaat esikleri, isci dagilimi, uretim ve yiyecek gideri.
 *
 * ZAMAN MODELI
 * Simulasyon tiklerle ilerler. Gercek zamanin tek isi, kac tam tik islenecegini
 * belirlemektir (SimulationClock); oyun durumu gercek saatten turetilmez.
 * Ayni sayida tik, ayni baslangic durumundan her zaman ayni sonucu verir.
 *
 * Bu sprintte tik sayacini ilerleten tek yer burasidir. ConstructionSystem
 * geldiginde ilerletme sorumlulugu ortak bir simulasyon orkestratorune tasinacak
 * ve bu sistem yalnizca kendisine verilen tik sayisini isleyecek.
 *
 * DENGE KURALLARI (prototipten degismedi)
 * - Uretim binalari isci ister; toplam isci ihtiyaci nufus kapasitesini asarsa
 *   tum uretim ayni oranda dusurulur (verim carpani).
 * - Her isci dakikada sabit miktarda yiyecek tuketir.
 * - Yiyecek bittiginde verim yarilanir.
 */
export class EconomySystem {
  private readonly state: GameState;
  private readonly resources: ResourceSystem;
  private readonly buildings: BuildingSystem;
  private readonly bus: EventBus;

  private lastSnapshot: EconomySnapshot = emptySnapshot();

  constructor(
    state: GameState,
    resources: ResourceSystem,
    buildings: BuildingSystem,
    bus: EventBus,
  ) {
    this.state = state;
    this.resources = resources;
    this.buildings = buildings;
    this.bus = bus;
  }

  /** En son hesaplanan ekonomi ozeti. */
  get snapshot(): EconomySnapshot {
    return this.lastSnapshot;
  }

  /**
   * Simulasyonu verilen tik kadar ilerletir.
   *
   * Sira onemlidir: once tik sayaci ilerler, sonra biten insaatlar devreye
   * girer, en son uretim uygulanir. Boylece bu pencerede tamamlanan bir bina
   * pencerenin uretimine dahil olur - prototipteki davranisin aynisi.
   */
  advance(ticks: number, options: { silent?: boolean } = {}): EconomySnapshot {
    if (!Number.isFinite(ticks) || ticks <= 0) return this.lastSnapshot;
    const whole = Math.floor(ticks);
    if (whole <= 0) return this.lastSnapshot;

    this.state.advanceTick(whole);
    this.completeFinishedConstruction(options.silent === true);

    const snapshot = this.computeSnapshot();
    this.lastSnapshot = snapshot;

    const minutes = whole / TICKS_PER_MINUTE;
    const delta: ResourcePool = { food: 0, wood: 0, stone: 0, gold: 0 };
    for (const key of RESOURCE_ORDER) {
      delta[key] = snapshot.netPerMinute[key] * minutes;
    }

    this.resources.applyDelta(delta, 1);
    if (!options.silent) {
      this.resources.emitChange();
      this.bus.emit('economy:updated', snapshot);
    }
    return snapshot;
  }

  /**
   * Saniye cinsinden ilerletme kolayligi.
   * Cagiran taraflarin tik cevrimini tekrarlamamasi icindir.
   */
  advanceSeconds(seconds: number, options: { silent?: boolean } = {}): EconomySnapshot {
    return this.advance(Math.floor(seconds * TICKS_PER_SECOND), options);
  }

  /**
   * Oyun kapaliyken gecen sureyi telafi eder.
   *
   * Gercek dunya suresi burada YALNIZCA kac tik islenecegini belirlemek icin
   * kullanilir; sonuc tamamen tik sayisindan turer. Ust sinir
   * MAX_OFFLINE_SECONDS'tir. Islenen tik sayisini dondurur.
   */
  applyOfflineProgress(elapsedSeconds: number): number {
    const cappedSeconds = Math.min(Math.max(0, elapsedSeconds), MAX_OFFLINE_SECONDS);
    const totalTicks = Math.floor(cappedSeconds * TICKS_PER_SECOND);
    if (totalTicks <= 0) return 0;

    // Uzun sureyi tek adimda uygulamak insaat esiklerini atlar; parcalara bolunur.
    let remaining = totalTicks;
    while (remaining > 0) {
      const step = Math.min(OFFLINE_CHUNK_TICKS, remaining);
      this.advance(step, { silent: true });
      remaining -= step;
    }

    this.resources.recalculateCapacity();
    this.resources.emitChange();
    this.bus.emit('economy:updated', this.lastSnapshot);
    return totalTicks;
  }

  /** Tamamlanma tikine ulasan insaatlari devreye alir. */
  private completeFinishedConstruction(silent: boolean): void {
    const now = this.state.tick;

    for (const building of this.state.buildings.values()) {
      if (building.state !== 'constructing') continue;

      const completesAt = building.construction?.completesAtTick;
      if (completesAt === undefined || completesAt <= now) {
        this.buildings.completeBuilding(building);
        continue;
      }

      if (!silent) {
        const resolved = resolveBuilding(building, getBuilding(building.type), now);
        this.bus.emit('building:progress', building, resolved.construction?.ratio ?? 0);
      }
    }
  }

  /**
   * Nufus, isci ve uretim dengesini bastan hesaplar.
   *
   * Bina basina degerler resolver'dan gelir; burada seviye, durum veya
   * kapasite mantigi tekrarlanmaz.
   */
  private computeSnapshot(): EconomySnapshot {
    let populationCapacity = BASE_POPULATION_CAPACITY;
    let workersNeeded = 0;
    const gross: ResourcePool = { food: 0, wood: 0, stone: 0, gold: 0 };

    for (const building of this.state.buildings.values()) {
      const resolved = resolveBuilding(building, getBuilding(building.type), this.state.tick);
      if (!resolved.operational) continue;

      populationCapacity += resolved.populationCapacity;
      workersNeeded += resolved.workerRequirement;

      for (const key of RESOURCE_ORDER) {
        gross[key] += resolved.production[key] ?? 0;
      }
    }

    // Isci yetersizse tum uretim ayni oranda dusurulur.
    let efficiency = workersNeeded > 0 ? Math.min(1, populationCapacity / workersNeeded) : 1;

    // Aclik cezasi: depoda yiyecek yoksa uretim yarilanir.
    const starving = this.resources.amountOf('food') <= 0 && workersNeeded > 0;
    if (starving) efficiency *= 0.5;

    const populationUsed = Math.min(workersNeeded, populationCapacity);
    const upkeep = populationUsed * FOOD_UPKEEP_PER_WORKER;

    const netPerMinute: ResourcePool = { food: 0, wood: 0, stone: 0, gold: 0 };
    for (const key of RESOURCE_ORDER) {
      netPerMinute[key] = gross[key] * efficiency;
    }
    netPerMinute.food -= upkeep;

    return {
      netPerMinute,
      populationUsed,
      populationCapacity,
      storageCapacity: this.resources.capacity,
      efficiency,
    };
  }
}

function emptySnapshot(): EconomySnapshot {
  return {
    netPerMinute: { food: 0, wood: 0, stone: 0, gold: 0 },
    populationUsed: 0,
    populationCapacity: 0,
    storageCapacity: 0,
    efficiency: 1,
  };
}
