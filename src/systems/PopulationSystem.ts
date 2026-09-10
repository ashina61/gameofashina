import {
  BASE_POPULATION_CAPACITY,
  POPULATION_DECLINE_PER_MINUTE,
  POPULATION_GROWTH_FOOD_THRESHOLD,
  POPULATION_GROWTH_PER_MINUTE,
  TICKS_PER_SECOND,
} from '@/config/Constants';
import { getBuilding, levelOf } from '@/config/BuildingCatalog';
import type { EventBus } from '@/core/EventBus';
import type { GameState } from '@/core/GameState';
import type { ResourceSystem } from './ResourceSystem';
import type { PopulationSnapshot, PopulationTrend } from '@/types';

/** Bir dakikadaki tik sayisi; buyume oranlari dakika cinsinden tanimlidir. */
const TICKS_PER_MINUTE = 60 * TICKS_PER_SECOND;

/**
 * Nufus simulasyonu: vatandas sayisi ve isci dagitimi.
 *
 * SORUMLULUK SINIRI
 * Bu sistem KIM oldugunu ve NEREDE calistigini belirler. Ne uretildigi
 * EconomySystem'in, ne kadar zaman gectigi Simulation'in isidir. Kaynak
 * havuzuna dokunmaz - yiyecegi yalnizca OKUR, gideri ekonomi duser.
 *
 * MODEL
 * - Binalar nufus KAPASITESI acar; kapasite vatandas demek degildir.
 * - Depoda yiyecek varken bos kapasiteye dogru tik tik vatandas gelir.
 * - Yiyecek bittiginde vatandaslar sehri terk eder; bina veya seviye KAYBI
 *   asla olmaz, yiyecek gelince nufus yeniden buyur.
 * - Vatandaslar binalara KURULUS SIRASIYLA dagitilir: erken kurulan bina
 *   once dolar. Bu sira GameState'in bina koleksiyonunun sirasidir ve kayitla
 *   birlikte tasinir, dolayisiyla yeniden yuklemede dagitim degismez.
 *
 * TURETILMIS DURUM
 * BuildingInstance.assignedWorkers bu sistemin ciktisidir; hicbir zaman
 * kayittan oldugu gibi guvenilmez, her ilerlemede ve her yuklemede nufustan
 * yeniden hesaplanir. Boylece "kayittaki isci sayisi ile nufus tutmuyor"
 * diye bir tutarsizlik olusamaz.
 *
 * Bu sistemde gercek zaman yoktur; yalnizca kendisine verilen tik sayisi
 * islenir.
 */
export class PopulationSystem {
  private readonly state: GameState;
  private readonly resources: ResourceSystem;
  private readonly bus: EventBus;

  private lastSnapshot: PopulationSnapshot = emptySnapshot();

  constructor(state: GameState, resources: ResourceSystem, bus: EventBus) {
    this.state = state;
    this.resources = resources;
    this.bus = bus;
  }

  /** En son hesaplanan nufus ozeti. */
  get snapshot(): PopulationSnapshot {
    return this.lastSnapshot;
  }

  /**
   * Nufus kapasitesi ve toplam isci ihtiyacini binalardan okur.
   *
   * Yalnizca CALISIR durumdaki binalar sayilir: insaati suren bir ev
   * kimseyi barindirmaz, insaati suren bir ciftlik kimseyi calistirmaz.
   */
  survey(): { capacity: number; workersNeeded: number } {
    let capacity = BASE_POPULATION_CAPACITY;
    let workersNeeded = 0;

    for (const building of this.state.buildings.values()) {
      if (building.state !== 'active') continue;
      const entry = levelOf(getBuilding(building.type), building.level);
      capacity += entry?.populationCapacity ?? 0;
      workersNeeded += entry?.workerRequirement ?? 0;
    }

    return { capacity, workersNeeded };
  }

  /**
   * Nufusu verilen tik kadar ilerletir ve isciyi yeniden dagitir.
   *
   * Buyume ve azalma dakikalik oranlardir; tik basina dusen kesir
   * biriktirilir. Bu sayede 60 tiki tek seferde islemekle 60 kez tek tik
   * islemek ayni sonucu verir.
   */
  advance(ticks: number, options: { silent?: boolean } = {}): PopulationSnapshot {
    if (!Number.isFinite(ticks) || ticks <= 0) return this.lastSnapshot;
    const whole = Math.floor(ticks);
    if (whole <= 0) return this.lastSnapshot;

    const { capacity, workersNeeded } = this.survey();

    // Yon, pencerenin BASINDAKI duruma gore belirlenir ve pencere boyunca
    // ayni kalir - tik sayacini bolmeden ilerletmenin bedeli budur ve
    // insaat/uretim tarafindaki toplu ilerletme davranisiyla ayni.
    const rate = rateFor(this.trendFor(capacity));

    if (rate !== 0) {
      this.applyChange(rate * whole, capacity);
    } else if (this.state.population > capacity) {
      // Kapasite dustuyse (ev yikildi veya insaata girdi) fazla vatandas
      // barinaksiz kalir ve sehri terk eder - bu aclik degil, yer yoklugudur.
      this.state.setPopulation(capacity);
    }

    const employed = this.assignWorkers();

    this.lastSnapshot = {
      population: this.state.population,
      capacity,
      workersNeeded,
      employed,
      // Rapor edilen yon, pencere SONRASI durumdur: kapasiteye oturmus bir
      // sehir "buyuyor" diye gosterilmemeli.
      trend: this.trendFor(capacity),
    };

    if (!options.silent) this.bus.emit('population:updated', this.lastSnapshot);
    return this.lastSnapshot;
  }

  /**
   * Isci dagitimini nufustan yeniden kurar; nufusu DEGISTIRMEZ.
   * Yukleme sonrasi ve bina eklendiginde/silindiginde cagrilir.
   */
  rebuildFromState(): PopulationSnapshot {
    const { capacity, workersNeeded } = this.survey();
    if (this.state.population > capacity) this.state.setPopulation(capacity);

    const employed = this.assignWorkers();
    this.lastSnapshot = {
      population: this.state.population,
      capacity,
      workersNeeded,
      employed,
      trend: 'stable',
    };
    return this.lastSnapshot;
  }

  /** Arayuze son durumu bildirir. */
  publish(): void {
    this.bus.emit('population:updated', this.lastSnapshot);
  }

  /**
   * Nufusun bu pencerede hangi yone gidecegini belirler.
   *
   * Yiyecek esigi sifir degil kucuk bir tampondur; depo tam sifirda
   * titrerken buyume ve azalmanin donusumlu tetiklenmesini engeller.
   */
  private trendFor(capacity: number): PopulationTrend {
    const fed = this.resources.amountOf('food') >= POPULATION_GROWTH_FOOD_THRESHOLD;
    if (!fed) return this.state.population > 0 ? 'declining' : 'stable';
    return this.state.population < capacity ? 'growing' : 'stable';
  }

  /**
   * Birikmis degisim birimini tam vatandasa cevirir.
   *
   * Birim alaninda calisilir: bir vatandas TICKS_PER_MINUTE birimdir ve
   * bir tik `oran` birim ekler. Toplama tam sayilarla yapildigi icin 90 tiki
   * tek seferde islemekle 90 kez tek tik islemek birebir ayni sonucu verir.
   *
   * Sinira dayandiginda (0 veya kapasite) bekleyen birim SIFIRLANIR; aksi
   * halde kapasite dolu bir sehirde birim birikir ve yeni bir ev kurulur
   * kurulmaz bir anda vatandas yagardi.
   */
  private applyChange(units: number, capacity: number): void {
    const pending = this.state.populationProgress + units;
    const change = Math.trunc(pending / TICKS_PER_MINUTE);
    const remainder = pending - change * TICKS_PER_MINUTE;

    const next = this.state.population + change;
    const clamped = Math.min(Math.max(0, next), capacity);

    this.state.setPopulation(clamped, clamped === next ? remainder : 0);
  }

  /**
   * Vatandaslari binalara kurulus sirasiyla dagitir ve calisan sayisini
   * dondurur.
   *
   * Kismi kadro kabul edilir: 4 isci isteyen bir ciftlige 2 vatandas
   * dusuyorsa bina yarim verimle calisir. Boylece isci acigi tum sehri
   * ayni anda felce ugratmaz, once en gec kurulan binalar zayiflar.
   */
  private assignWorkers(): number {
    let remaining = this.state.population;
    let employed = 0;

    for (const building of this.state.buildings.values()) {
      if (building.state !== 'active') {
        if (building.assignedWorkers !== 0) this.state.setAssignedWorkers(building.uid, 0);
        continue;
      }

      const need = levelOf(getBuilding(building.type), building.level)?.workerRequirement ?? 0;
      const given = need > 0 ? Math.min(need, remaining) : 0;

      if (building.assignedWorkers !== given) this.state.setAssignedWorkers(building.uid, given);
      remaining -= given;
      employed += given;
    }

    return employed;
  }
}

/** Yonun dakikalik vatandas orani; birim alaninda tik basina eklenen deger. */
function rateFor(trend: PopulationTrend): number {
  if (trend === 'growing') return POPULATION_GROWTH_PER_MINUTE;
  if (trend === 'declining') return -POPULATION_DECLINE_PER_MINUTE;
  return 0;
}

function emptySnapshot(): PopulationSnapshot {
  return { population: 0, capacity: 0, workersNeeded: 0, employed: 0, trend: 'stable' };
}
