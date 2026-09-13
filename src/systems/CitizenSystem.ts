import {
  DECLINE_RATE_PER_DEFICIT,
  GAME_SECONDS_PER_HOUR,
  GROWTH_RATE_PER_SURPLUS,
  LUXURY_CAPACITY_FACTOR,
  MAX_POPULATION_BASE,
  MAX_POPULATION_COEFF,
  MAX_POPULATION_MULTIPLIER,
  SAWMILL_CAPACITY_FACTOR,
  SCIENTISTS_PER_ACADEMY_LEVEL,
  MIN_SURVIVING_CITIZENS,
} from '@/config/Constants';
import { academyLevel } from '@/core/CityQuery';
import type { EventBus } from '@/core/EventBus';
import type { GameState } from '@/core/GameState';
import { aggregateEffects } from './ResearchEffects';
import type { HappinessSystem } from './HappinessSystem';
import type { WonderSystem } from './WonderSystem';
import type { CitizenRole, CityState } from '@/types';

/**
 * Vatandaslar: nufus, roller ve kapasiteler.
 *
 * IKARIAM'IN VATANDAS MODELI
 * Bir vatandas ayni anda TEK bir iste olabilir ve dort rol vardir:
 *
 *   idle      -> +3 altin/saat
 *   wood      -> +1 odun/saat (Hizar kapasitesine kadar)
 *   luxury    -> +1 luks/saat (maden kapasitesine kadar)
 *   scientist -> +1 arastirma puani/saat, -6 altin/saat
 *
 * Askerler VATANDAS DEGILDIR: Ikariam'da birlikler kaynak + saatlik altin
 * bakimiyla egitilir, nufustan dusmez. Bu yuzden burada 'soldier' rolu yok.
 *
 * KAPASITELER
 *   maksimum nufus  = floor(10 * sqrt(Valilik^3)) * 2 + 40 + arastirmalar
 *   bilim adami     = Akademi seviyesi * 4
 *   hizar iscisi    = floor(Hizar seviyesi^2 * 1.02)
 *   luks iscisi     = floor(maden seviyesi^2 * 0.78)
 *
 * Yatagin seviyesi URETIMI CARPMaz; isci KAPASITESINI acar. Ikariam'da da
 * boyledir: 450 isci saatte 450 odun verir, seviye yalnizca 450 isciye
 * yer acilmasini saglar.
 */

/** Nufus hareketinin yonu. */
export type GrowthTrend = 'growing' | 'stable' | 'declining';

export class CitizenSystem {
  constructor(
    private readonly state: GameState,
    private readonly happiness: HappinessSystem,
    private readonly wonders: WonderSystem,
    private readonly bus: EventBus,
  ) {}

  // --- Kapasiteler ---------------------------------------------------------

  /** Sehrin maksimum nufusu. Ikariam formulu birebir uygulanir. */
  maxPopulation(city: CityState): number {
    const level = Math.max(1, city.townHall.level);
    const base =
      Math.floor(MAX_POPULATION_COEFF * Math.sqrt(level * level * level)) *
        MAX_POPULATION_MULTIPLIER +
      MAX_POPULATION_BASE;

    const effects = aggregateEffects(this.state.completedResearch);
    const fromResearch = effects.populationAll + (city.isCapital ? effects.populationCapital : 0);
    return Math.max(1, Math.floor(base + fromResearch));
  }

  /** Bilim adami kapasitesi (Akademi seviyesi x 4). */
  scientistCapacity(city: CityState): number {
    return academyLevel(city) * SCIENTISTS_PER_ACADEMY_LEVEL;
  }

  /** Sehre bagli adanin Hizar seviyesi. */
  private sawmillLevel(city: CityState): number {
    return this.state.islandOf(city.islandId)?.wood.level ?? 0;
  }

  /** Sehre bagli adanin luks yatagi seviyesi. */
  private luxuryLevel(city: CityState): number {
    return this.state.islandOf(city.islandId)?.luxuryDeposit.level ?? 0;
  }

  /** Hizar isci kapasitesi: floor(seviye^2 * 1.02). */
  woodCapacity(city: CityState): number {
    const level = this.sawmillLevel(city);
    return level > 0 ? Math.floor(level * level * SAWMILL_CAPACITY_FACTOR) : 0;
  }

  /**
   * Luks kaynak isci kapasitesi: floor(seviye^2 * 0.78).
   *
   * Zenginlik (Wealth) arastirmasi yapilmadiysa kapasite SIFIRdir:
   * Ikariam'da luks kaynak o arastirmayla islenmeye baslar. Kapasiteyi
   * sifir dondurmek, ayri bir "kilitli mi" kontrolu tasimaktan iyidir -
   * arayuzdeki kaydirma cubugu kendiliginden kilitli kalir.
   */
  luxuryCapacity(city: CityState): number {
    if (!this.state.hasResearch('wealth')) return 0;
    const level = this.luxuryLevel(city);
    return level > 0 ? Math.floor(level * level * LUXURY_CAPACITY_FACTOR) : 0;
  }

  /**
   * Yardimci Eller arastirmasiyla kapasitenin ustune cikilabilir mi?
   *
   * Ikariam'da bu arastirma, kapasiteyi asan isci atanmasina izin verir;
   * asan her 4 odun iscisi (ve her 8 luks iscisi) saatte yalnizca 1 birim
   * uretir. Uretim tarafi EconomySystem'de.
   */
  canOverload(): boolean {
    return this.state.hasResearch('helping_hands');
  }

  /** Bir role atanabilecek azami isci. */
  capacityFor(city: CityState, role: CitizenRole): number {
    switch (role) {
      case 'wood':
        return this.woodCapacity(city);
      case 'luxury':
        return this.luxuryCapacity(city);
      case 'scientist':
        return this.scientistCapacity(city);
      case 'idle':
        return Number.MAX_SAFE_INTEGER;
    }
  }

  /** Calisan (bos durmayan) vatandas sayisi. */
  employed(city: CityState): number {
    return city.assignment.wood + city.assignment.luxury + city.assignment.scientist;
  }

  /** Rol dagiliminin toplami nufusa esit mi? */
  isBalanced(city: CityState): boolean {
    const a = city.assignment;
    return a.idle + a.wood + a.luxury + a.scientist === city.citizens;
  }

  // --- Atama ---------------------------------------------------------------

  /**
   * Vatandaslari roller arasinda tasir.
   *
   * delta > 0: bosta duran vatandaslar verilen role atanir.
   * delta < 0: verilen rolden bosa cekilir.
   *
   * Uc kisit birlikte uygulanir: bosta vatandas olmali, rolun kapasitesi
   * yetmeli (Yardimci Eller yoksa) ve toplam nufus asilmamali. Basarisiz
   * olursa HICBIR SEY degismez ve uygulanan miktar 0 doner; kismi atama
   * yapmak oyuncunun "kaca bastim da neden 3 atandi" sorusuna yol acardi.
   */
  assign(city: CityState, role: CitizenRole, delta: number): number {
    if (role === 'idle' || !Number.isFinite(delta) || delta === 0) return 0;
    const wanted = Math.trunc(delta);

    if (wanted > 0) {
      const available = city.assignment.idle;
      const capacity = this.capacityFor(city, role);
      const room = this.canOverload()
        ? Number.MAX_SAFE_INTEGER
        : Math.max(0, capacity - city.assignment[role]);
      const moved = Math.min(wanted, available, room);
      if (moved <= 0) return 0;
      city.assignment.idle -= moved;
      city.assignment[role] += moved;
      this.bus.emit('assignment:changed', city.id);
      return moved;
    }

    const released = Math.min(-wanted, city.assignment[role]);
    if (released <= 0) return 0;
    city.assignment[role] -= released;
    city.assignment.idle += released;
    this.bus.emit('assignment:changed', city.id);
    return -released;
  }

  /**
   * Nufus degistiginde rol dagilimini yeniden dengeler.
   *
   * Toplam her zaman nufusa esitlenir. Once bosta duranlar ayarlanir;
   * bosta vatandas kalmadiysa ve nufus dustuyse isler GERI cekilir.
   *
   * GERI CEKME SIRASI: bilim adami -> luks -> odun.
   * Sira bilerek boyle: bilim adami en pahali roldur (saatte -6 altin),
   * odun iscisi ise ekonominin belkemigidir. Nufus dustugunde oyuncunun
   * en az hissedecegi yerden kesilir.
   */
  reconcile(city: CityState): void {
    const a = city.assignment;
    const total = a.idle + a.wood + a.luxury + a.scientist;
    let diff = city.citizens - total;

    if (diff > 0) {
      // Yeni gelen vatandaslar bosta baslar; oyuncu nereye gonderecegine karar verir.
      a.idle += diff;
      return;
    }

    diff = -diff;
    a.idle = Math.max(0, a.idle - diff);
    diff -= Math.min(diff, Math.max(0, city.citizens - (a.wood + a.luxury + a.scientist)));

    for (const role of ['scientist', 'luxury', 'wood'] as const) {
      if (diff <= 0) break;
      const cut = Math.min(diff, a[role]);
      a[role] -= cut;
      diff -= cut;
    }

    // Kapasite dusmus olabilir (ornegin ada yatagi yikildi): fazla isciler bosa.
    if (!this.canOverload()) {
      for (const role of ['scientist', 'luxury', 'wood'] as const) {
        const capacity = this.capacityFor(city, role);
        const excess = Math.max(0, a[role] - capacity);
        if (excess > 0) {
          a[role] -= excess;
          a.idle += excess;
        }
      }
    }
  }

  // --- Zaman ---------------------------------------------------------------

  /** Sehrin saatlik nufus degisimi (isaretli). */
  growthPerHour(city: CityState): number {
    const surplus = this.happiness.surplus(city);
    let rate = surplus > 0 ? surplus * GROWTH_RATE_PER_SURPLUS : 0;
    if (surplus < 0) rate = surplus * DECLINE_RATE_PER_DEFICIT;

    // Demeter harikasi aktifken saatte +1..+6 sabit artis ekler.
    if (surplus >= 0) rate += this.wonders.populationGrowthBonus(city.islandId);
    return rate;
  }

  /** Nufusun gidisati. */
  trend(city: CityState): GrowthTrend {
    const rate = this.growthPerHour(city);
    if (rate > 0.01 && city.citizens < this.maxPopulation(city)) return 'growing';
    if (rate < -0.01) return 'declining';
    return 'stable';
  }

  /**
   * Nufusu verilen oyun saniyesi kadar ilerletir.
   *
   * NEDEN ANALITIK COZUM, NEDEN EULER DEGIL
   * Nufus dinamigi bir geri besleme dongusudur:
   *
   *     dP/dh = k * (H - P)
   *
   * burada H net mutluluk (dengenin kendisi), k ise fazlada 0.25,
   * acikta 0.1'dir. Euler adimi `P += k*(H-P)*hours` bu denklemin
   * yaklasigidir ve YALNIZCA `k*hours` kucukken dogrudur. Cevrimdisi
   * ilerleme saatlik dilimler verdigi icin `k*hours = 0.25` olur ve
   * adim dengeyi ASAR: nufus H'yi gecer, sonra geri duser, sonra tekrar
   * asar. Dilim buyudukce salinim genisler ve nufus 0 ile tavan arasinda
   * ziplar - 0 ise kurtarilamaz bir oyundur.
   *
   * Denklem lineer oldugu icin kapali form cozumu vardir ve HER adim
   * buyuklugunde kararlıdır:
   *
   *     P(h) = P* - (P* - P0) * exp(-k*h)
   *
   * P* denge noktasidir. Ustel yaklasma monoton oldugu icin dengeyi
   * hicbir zaman asmaz; kisa adimlarda Euler ile ayni sonucu verir,
   * uzun adimlarda ise dogru yere yakinsar.
   *
   * DEMETER
   * Harika sabit bir artis ekler: dP/dh = g*(H-P) + D. Bu da lineerdir
   * ve dengesi P* = H + D/g olur; ayri bir biriktirme mekanizmasi
   * gerekmez.
   *
   * KESIRLI BIRIKIM
   * Cozum surekli bir sayi verir; tam kisim vatandas, kesirli kisim
   * `growthProgress` olarak saklanir. Kesir bilerek kayda YAZILMAZ:
   * yarim vatandas gorunur bir durum degildir.
   */
  advance(gameSeconds: number): void {
    if (gameSeconds <= 0) return;
    const hours = gameSeconds / GAME_SECONDS_PER_HOUR;

    for (const city of this.state.cities) {
      const before = city.citizens;
      const next = this.integrate(city, hours);

      const whole = Math.floor(next);
      this.state.setCitizens(city, whole, next - whole);

      if (city.citizens !== before) {
        this.reconcile(city);
        this.bus.emit('population:changed', city.id, city.citizens);
      }
    }
  }

  /**
   * Bir sehir icin nufus entegrasyonu; surekli (kesirli) deger doner.
   *
   * Sinirlar: altta MIN_SURVIVING_CITIZENS (kurtarilabilirlik), ustte
   * maxPopulation (Ikariam'in nufus tavani). Denge noktasi bu sinirlara
   * kirpilir, aksi halde ustel yaklasma sinir disina yakinsar ve son
   * kirpma ani bir ziplama uretirdi.
   */
  private integrate(city: CityState, hours: number): number {
    const cap = this.maxPopulation(city);
    const floor = Math.min(MIN_SURVIVING_CITIZENS, cap);
    const happiness = this.happiness.happiness(city);
    const demeter = this.wonders.populationGrowthBonus(city.islandId);

    // Surekli nufus: tam vatandaslar + birikmis kesir.
    const current = city.citizens + Math.max(0, Math.min(1, city.growthProgress));

    let equilibrium: number;
    let rate: number;

    if (current < happiness) {
      // Buyume dali.
      rate = GROWTH_RATE_PER_SURPLUS;
      equilibrium = happiness + demeter / rate;
    } else {
      // Azalma dali: Demeter yalnizca fazlada katki verir.
      rate = DECLINE_RATE_PER_DEFICIT;
      equilibrium = happiness;
    }

    const target = Math.max(floor, Math.min(cap, equilibrium));
    const next = target - (target - current) * Math.exp(-rate * hours);

    return Math.max(floor, Math.min(cap, next));
  }
}
