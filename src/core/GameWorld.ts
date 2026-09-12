import { AUTOSAVE_INTERVAL_MS } from '@/config/Constants';
import type { CityModifiers } from '@/types';
import { EventBus } from './EventBus';
import { GameState } from './GameState';
import { SaveManager } from './SaveManager';
import { Simulation } from './Simulation';
import { SimulationClock } from './SimulationClock';
import { BuildingSystem } from '@/systems/BuildingSystem';
import { ConstructionSystem } from '@/systems/ConstructionSystem';
import { EconomySystem } from '@/systems/EconomySystem';
import { PopulationSystem } from '@/systems/PopulationSystem';
import { BuildingPlotSystem } from '@/systems/BuildingPlotSystem';
import { CityDecorSystem } from '@/systems/CityDecorSystem';
import { ResearchSystem } from '@/systems/ResearchSystem';
import { NavigationSystem } from '@/systems/NavigationSystem';
import { ResourceSystem } from '@/systems/ResourceSystem';
import { WorkforceSystem } from '@/systems/WorkforceSystem';
import { UpgradeSystem } from '@/systems/UpgradeSystem';

/**
 * Oyunun modeli ile sistemlerini bir arada tutan kok nesne.
 *
 * Sahneler bu nesneyi Phaser registry uzerinden alir. Boylece sahne
 * degisimlerinde durum kaybolmaz ve sahneler birbirine bagimli olmaz.
 * Render/arayuz katmani buradaki sistemleri cagirir, veriyi dogrudan degistirmez.
 */
export class GameWorld {
  readonly bus = new EventBus();
  readonly saves = new SaveManager();

  readonly state: GameState;
  readonly resources: ResourceSystem;
  readonly construction: ConstructionSystem;
  readonly research: ResearchSystem;
  readonly plots: BuildingPlotSystem;
  /** Sehir cevresi dekoru - yalnizca gorsel, kayda yazilmaz. */
  readonly decor: CityDecorSystem;
  readonly buildings: BuildingSystem;
  readonly upgrades: UpgradeSystem;
  readonly population: PopulationSystem;
  readonly navigation: NavigationSystem;
  readonly workforce: WorkforceSystem;
  readonly economy: EconomySystem;
  readonly simulation: Simulation;

  /** Ilk acilista telafi edilen cevrimdisi sure (saniye); yoksa 0. */
  readonly offlineSeconds: number;

  /** Kayittan mi yuklendi, yoksa yeni oyun mu? */
  readonly loadedFromSave: boolean;

  /** Gercek zamani simulasyon tikine ceviren biriktirici. */
  private readonly clock = new SimulationClock();

  private autosaveAccumulator = 0;

  private constructor(state: GameState, loadedFromSave: boolean, offlineSeconds: number) {
    this.state = state;
    this.loadedFromSave = loadedFromSave;
    this.resources = new ResourceSystem(state, this.bus);
    this.construction = new ConstructionSystem(state, this.resources, this.bus);
    /*
     * Arastirma, KAYNAK sisteminden sonra kurulur (maliyeti o dusuyor) ama
     * carpanlarini ondan once kurulan sistemler de okumak zorunda. Bu
     * yuzden carpan kaynagi GEC BAGLANIR; asagida bindModifiers ile.
     */
    this.research = new ResearchSystem(state, this.resources, this.bus);
    const modifiers = (): CityModifiers => this.research.modifiers;
    this.resources.bindModifiers(modifiers);
    // Yapi alanlari zeminden turer; zemin seed'den. Kayda yazilmaz.
    this.plots = new BuildingPlotSystem(state.grid);
    this.buildings = new BuildingSystem(
      state,
      this.resources,
      this.construction,
      this.bus,
      this.plots,
    );
    // Dekor plotlardan SONRA kurulur: plot olan karo dekor almaz.
    this.decor = new CityDecorSystem(state.grid, this.plots);
    this.upgrades = new UpgradeSystem(state, this.resources, this.construction);
    this.population = new PopulationSystem(state, this.resources, this.bus);
    // Gezilebilirlik GridMap'ten canli okunur; ayri bir engel kopyasi yok.
    this.navigation = new NavigationSystem(state.grid);
    this.workforce = new WorkforceSystem(state, this.bus, this.navigation);
    this.economy = new EconomySystem(state, this.resources, this.population, this.bus);
    this.economy.bindModifiers(modifiers);
    this.buildings.bindModifiers(modifiers);
    // Kayit, arastirma durumunu ResearchSystem'den okur; GameState kurali bilmez.
    state.bindResearchReader(() => this.research.toSave());
    this.simulation = new Simulation(
      state,
      this.construction,
      this.population,
      this.workforce,
      this.economy,
      this.research,
    );

    /*
     * Isciler once KONUMLANDIRILIR, sonra nufusla hizalanir.
     *
     * Sira onemli: uzlastirma sirasinda fazla isci meydana yollanir ve o
     * yuruyusun suresi iscinin BULUNDUGU yerden hesaplanir. Konum
     * yerlesmeden uzlastirmak, herkesi haritanin kosesinden yurutmek
     * olurdu. Ikisi de ilk tikten once yapilmalidir ki cevrimdisi
     * telafinin ilk penceresi de dogru kadroyla uretsin.
     */
    this.workforce.restorePositions();
    this.workforce.reconcile();
    this.population.rebuildFromState();

    /*
     * Bina yikilinca iscileri ANINDA bosa cikar.
     *
     * reconcile() zaten bir sonraki tikte ayni temizligi yapar (kapasitesi
     * olmayan binadaki isciler birakilir), ama oyuncu yikim dugmesine
     * bastiginda sonucu beklemeden gormeli. Olay uzerinden baglamak,
     * BuildingSystem'e yeni bir bagimlilik eklemeden bunu saglar.
     */
    this.bus.on('building:removed', (building) => {
      this.workforce.releaseAll(building.uid);
    });

    /*
     * Yeni bina kurulunca yoldaki iscileri yeniden yonlendir.
     *
     * Gezilebilirlik GridMap'ten canli okundugu icin karo ayni anda
     * kapanir, ama O AN yolda olan bir iscinin rotasi o karodan geciyor
     * olabilirdi - yani isci yeni binanin icinden yururdu. Rota
     * turetilmis veri oldugundan yeniden hesaplamak yeterli.
     */
    this.bus.on('building:placed', () => {
      this.workforce.reroute();
    });

    this.offlineSeconds =
      offlineSeconds > 0 ? this.simulation.applyOfflineProgress(offlineSeconds) : 0;
  }

  /**
   * Kayit varsa onu yukler, yoksa yeni bir oyun baslatir.
   *
   * Date.now() burada YALNIZCA gercek dunyada ne kadar sure gectigini olcmek
   * icin kullanilir. Oyun durumunun kendisi bu farktan turemez: gecen sure
   * tike cevrilir ve simulasyon o kadar tik ilerletilir.
   *
   * NOT: Bu olcum hala cihaz saatine guvenir. Saat dogrulamasi ve tik
   * tabanli cevrimdisi kaniti, sunucu otoritesiyle birlikte ele alinacak.
   */
  static bootstrap(): GameWorld {
    const saves = new SaveManager();
    const save = saves.load();

    if (save) {
      const elapsed = Math.max(0, (Date.now() - save.savedAt) / 1000);
      return new GameWorld(GameState.fromSave(save), true, elapsed);
    }
    return new GameWorld(GameState.createNew(), false, 0);
  }

  /** Gecerli simulasyon tiki. */
  get tick(): number {
    return this.state.tick;
  }

  /**
   * Phaser'in her karesinde cagrilir.
   *
   * Gercek zaman burada yalnizca kac tam tik islenecegini belirler; artan
   * kesir bir sonraki kareye devreder. Kare hizi ne olursa olsun ayni gercek
   * sure ayni sayida tik uretir, dolayisiyla denge kare hizindan etkilenmez.
   */
  update(deltaMs: number): void {
    const ticks = this.clock.absorb(deltaMs);
    if (ticks > 0) {
      this.simulation.advance(ticks);
    }

    this.autosaveAccumulator += deltaMs;
    if (this.autosaveAccumulator >= AUTOSAVE_INTERVAL_MS) {
      this.autosaveAccumulator = 0;
      this.save();
    }
  }

  /** Durumu diske yazar ve arayuze bildirir. */
  save(): void {
    if (this.saves.save(this.state)) {
      this.bus.emit('game:saved', Date.now());
    }
  }

  /** Kaydi siler; cagiran taraf sayfayi yeniden yuklemelidir. */
  reset(): void {
    this.saves.clear();
  }

  destroy(): void {
    this.bus.destroy();
  }
}
