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
 * ISCI DAGITIMI BU SISTEMDE DEGIL
 * Sprint 8'e kadar isciler burada her tik OTOMATIK dagitiliyordu ve bu,
 * oyuncunun bir isciyi belirli bir binaya yonlendirmesini imkansiz
 * kiliyordu: elle yapilan atama bir sonraki tikte eziliyordu. Atama artik
 * WorkforceSystem'in ve OYUNCUNUN isidir. Bu sistem yalnizca kac vatandas
 * oldugunu belirler.
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

    if (rate !== 0) this.applyChange(rate * whole, capacity);

    this.lastSnapshot = {
      population: this.state.population,
      capacity,
      workersNeeded,
      employed: this.employedCount(),
      // Rapor edilen yon, pencere SONRASI durumdur: kapasiteye oturmus bir
      // sehir "buyuyor" diye gosterilmemeli.
      trend: this.trendFor(capacity),
    };

    if (!options.silent) this.bus.emit('population:updated', this.lastSnapshot);
    return this.lastSnapshot;
  }

  /**
   * Ozeti gecerli durumdan yeniden kurar; nufusu DEGISTIRMEZ.
   * Yukleme sonrasi ve bina eklendiginde/silindiginde cagrilir.
   */
  rebuildFromState(): PopulationSnapshot {
    const { capacity, workersNeeded } = this.survey();
    this.lastSnapshot = {
      population: this.state.population,
      capacity,
      workersNeeded,
      employed: this.employedCount(),
      trend: 'stable',
    };
    return this.lastSnapshot;
  }

  /** Bir binada CALISAN isci sayisi; atama WorkforceSystem'in isidir. */
  private employedCount(): number {
    let employed = 0;
    for (const building of this.state.buildings.values()) {
      employed += building.assignedWorkers;
    }
    return employed;
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
   *
   * UST SINIR, kapasite ile MEVCUT nufusun buyugudur. Nufus kapasitenin
   * ustundeyse (ev yikildi ya da yukseltme icin insaata girdi) bu fazlalik
   * SILINMEZ: bir evi yikinca yarim sehrin bir tikte yok olmasi, oyuncunun
   * geri alamayacagi sessiz bir kayipti. Fazlalik yerinde kalir, buyume
   * durur ve vatandaslar yemeye devam eder; sehir ya yeni konut kurarak ya
   * da aclikla dogal olarak dengelenir.
   */
  private applyChange(units: number, capacity: number): void {
    const pending = this.state.populationProgress + units;
    const change = Math.trunc(pending / TICKS_PER_MINUTE);
    const remainder = pending - change * TICKS_PER_MINUTE;

    const ceiling = Math.max(capacity, this.state.population);
    const next = this.state.population + change;
    const clamped = Math.min(Math.max(0, next), ceiling);

    this.state.setPopulation(clamped, clamped === next ? remainder : 0);
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
