import { GridMap } from './GridMap';
import { STARTING_RESOURCES } from '@/config/Constants';
import { clampLevel, getBuilding, isKnownBuildingId } from '@/config/BuildingCatalog';
import type {
  BuildingConstruction,
  BuildingId,
  BuildingInstance,
  BuildingState,
  ResourceKey,
  ResourcePool,
  SaveData,
} from '@/types';

/** Kayit yuklenirken atilan bir kaydin nedeni. */
export interface LoadIssue {
  uid: string;
  reason: 'unknown_type' | 'out_of_bounds' | 'overlap' | 'duplicate_uid';
}

/**
 * Oyunun tum degisken verisi.
 *
 * Mutasyon yuzeyi bilerek daraltildi: kaynaklar ve bina koleksiyonu disariya
 * salt okunur tiplerle acilir, degisiklikler yalnizca buradaki kontrollu
 * metotlar uzerinden yapilir. Boylece `state.resources.wood = 1000000` gibi
 * kazara (veya kasitli) mudahaleler derleme aninda yakalanir ve bina indeksi
 * her zaman koleksiyonla tutarli kalir.
 *
 * Not: Bu derleme zamani bir korumadir. Calisma zamaninda nesneler hala
 * degistirilebilir; tam koruma (komut katmani) sonraki sprintlerin isi.
 */
export class GameState {
  readonly grid: GridMap;

  /**
   * Simulasyon zamani. Oyun durumu bu sayacla ilerler; gercek dunya saati
   * yalnizca kac tik islenecegini belirler, durumun kendisini belirlemez.
   */
  private currentTick = 0;

  private readonly resourcePool: ResourcePool;
  private readonly buildingMap = new Map<string, BuildingInstance>();

  /** Bina turu basina adet; countOf() icin O(1) arama saglar. */
  private readonly countsByType = new Map<BuildingId, number>();

  /** Benzersiz bina kimligi uretmek icin artan sayac. */
  private uidCounter = 0;

  /**
   * Insaat gorevlerine kesin bir sira vermek icin artan sayac.
   * Kuyrugun FIFO davranisi buna dayanir; kayitla birlikte tasinir ki
   * yeniden yuklemede sira degismesin.
   */
  private sequenceCounter = 0;

  /** Son yuklemede atilan kayitlar; tani amaclidir. */
  private issues: LoadIssue[] = [];

  /**
   * Sehirde yasayan vatandas sayisi (tam sayi).
   * Isci dagitiminin kaynagi budur; kapasite yalnizca ust siniri belirler.
   */
  private citizens = 0;

  /**
   * Bekleyen nufus degisimi, TAM SAYI birimlerde.
   *
   * Buyume ve azalma dakikalik oranlarla tanimli oldugu icin tek bir tik cogu
   * zaman tam bir vatandas etmez. Artan kisim burada biriktirilir; bir
   * vatandas TICKS_PER_MINUTE birim eder.
   *
   * NEDEN KESIR DEGIL DE BIRIM: kesirli birikim (her tikte +2/60 gibi) kayan
   * noktada asiniyordu - 90 tik sonra 5 yerine 4.99999999999999 cikiyor ve
   * asagi yuvarlanirken bir vatandas yok oluyordu. Birim alaninda toplama
   * tam sayilarla yapilir, boyle bir kayip olamaz ve parcali ilerletme tek
   * seferlik ilerletmeyle birebir ortusur.
   *
   * Isaretlidir: pozitif buyume, negatif azalma yolundadir. Yon degisince
   * kalan birim dogal olarak sadelesir.
   *
   * Kasten KAYDEDILMEZ: yarim vatandas gorunur bir durum degildir ve kayitta
   * tasimak, kaydi kurcalamaya acik bir alan daha eklerdi.
   */
  private growthUnits = 0;

  constructor(terrainSeed: number, resources?: ResourcePool) {
    this.grid = new GridMap(terrainSeed);
    this.resourcePool = resources ? { ...resources } : { ...STARTING_RESOURCES };
  }

  // --- Okuma yuzeyi --------------------------------------------------------

  /** Gecerli simulasyon tiki. */
  get tick(): number {
    return this.currentTick;
  }

  /**
   * Kaynak havuzu - salt okunur.
   * Degisiklik icin ResourceSystem kullanilir; bu tip dogrudan atamayi
   * derleme aninda engeller.
   */
  get resources(): Readonly<ResourcePool> {
    return this.resourcePool;
  }

  /** Bina koleksiyonu - ekleme/silme disaridan yapilamaz. */
  get buildings(): ReadonlyMap<string, BuildingInstance> {
    return this.buildingMap;
  }

  /** Son yuklemede atilan kayitlar. */
  get loadIssues(): readonly LoadIssue[] {
    return this.issues;
  }

  /** Sehirdeki vatandas sayisi. */
  get population(): number {
    return this.citizens;
  }

  /** Bekleyen nufus degisimi (birim); yalnizca PopulationSystem kullanir. */
  get populationProgress(): number {
    return this.growthUnits;
  }

  /** Verilen turden kac adet bina oldugunu dondurur (insaattakiler dahil). */
  countOf(type: BuildingId): number {
    return this.countsByType.get(type) ?? 0;
  }

  // --- Kontrollu mutasyon --------------------------------------------------

  /** Simulasyonu verilen tik kadar ilerletir. */
  advanceTick(ticks: number): number {
    if (!Number.isFinite(ticks) || ticks <= 0) return this.currentTick;
    this.currentTick += Math.floor(ticks);
    return this.currentTick;
  }

  /**
   * Nufusu belirler; negatife dusmez ve tam sayiya yuvarlanir.
   * Bekleyen degisim birimi ayri tutulur ki dakikalik oranlar tik tik
   * biriktirilebilsin.
   */
  setPopulation(value: number, progress = 0): void {
    this.citizens = Number.isFinite(value) ? Math.max(0, Math.trunc(value)) : 0;
    this.growthUnits = Number.isFinite(progress) ? progress : 0;
  }

  /** Tek bir kaynagin miktarini belirler; negatife dusmez. */
  setResource(key: ResourceKey, value: number): void {
    this.resourcePool[key] = Number.isFinite(value) ? Math.max(0, value) : 0;
  }

  /** Bina ekler ve tur sayacini gunceller. */
  addBuilding(building: BuildingInstance): void {
    if (this.buildingMap.has(building.uid)) return;
    this.buildingMap.set(building.uid, building);
    this.countsByType.set(building.type, this.countOf(building.type) + 1);
  }

  /** Binayi kaldirir, izgarayi bosaltir ve tur sayacini gunceller. */
  removeBuilding(uid: string): BuildingInstance | null {
    const building = this.buildingMap.get(uid);
    if (!building) return null;

    this.buildingMap.delete(uid);
    this.countsByType.set(building.type, Math.max(0, this.countOf(building.type) - 1));
    this.grid.release(uid);
    return building;
  }

  /**
   * Binanin yasam dongusu durumunu degistirir.
   * Sistemler bina alanlarina dogrudan yazmaz; mutasyon buradan gecer.
   */
  setBuildingState(uid: string, next: BuildingState): void {
    const building = this.buildingMap.get(uid);
    if (building) building.state = next;
  }

  /** Binanin seviyesini belirler; 1'in altina inmez. */
  setBuildingLevel(uid: string, level: number): void {
    const building = this.buildingMap.get(uid);
    if (!building) return;
    building.level = Number.isFinite(level) ? Math.max(1, Math.trunc(level)) : 1;
  }

  /** Binaya atanan isci sayisini belirler; negatif olamaz. */
  setAssignedWorkers(uid: string, workers: number): void {
    const building = this.buildingMap.get(uid);
    if (!building) return;
    building.assignedWorkers = Number.isFinite(workers) ? Math.max(0, Math.trunc(workers)) : 0;
  }

  /** Devam eden insaat gorevini atar veya (undefined ile) kaldirir. */
  setBuildingConstruction(uid: string, construction: BuildingConstruction | undefined): void {
    const building = this.buildingMap.get(uid);
    if (!building) return;

    if (construction) {
      building.construction = construction;
    } else {
      delete building.construction;
    }
  }

  /** Bir sonraki gorev sira numarasini uretir. */
  nextConstructionSequence(): number {
    this.sequenceCounter += 1;
    return this.sequenceCounter;
  }

  /** Yeni bir bina ornegi icin benzersiz kimlik uretir. */
  nextUid(type: BuildingId): string {
    this.uidCounter += 1;
    return `${type}#${this.uidCounter}`;
  }

  /**
   * Tur sayacini koleksiyondan bastan kurar.
   * Indeksin herhangi bir nedenle tutarsiz kalmasi durumunda oyun durumunu
   * bozmadan duzeltmenin yoludur; yukleme sonrasi da bu cagrilir.
   */
  rebuildIndexes(): void {
    this.countsByType.clear();
    for (const building of this.buildingMap.values()) {
      this.countsByType.set(building.type, this.countOf(building.type) + 1);
    }
  }

  // --- Olusturma ve kayit --------------------------------------------------

  /** Sifirdan yeni bir oyun durumu olusturur. */
  static createNew(): GameState {
    return new GameState(Math.floor(Math.random() * 0xffffffff));
  }

  /**
   * Kayit verisinden oyun durumunu geri yukler.
   *
   * Sema dogrulamasi SaveManager'da yapilir; burada BUTUNLUK dogrulanir:
   * izgara disi koordinat, ayni ayak izini paylasan binalar ve tekrar eden
   * kimlikler reddedilir. Reddedilen kayitlar loadIssues altinda raporlanir -
   * sessizce yok sayilmazlar.
   */
  static fromSave(save: SaveData): GameState {
    const state = new GameState(save.terrainSeed, save.resources);
    state.currentTick = Number.isFinite(save.tick) ? Math.max(0, Math.trunc(save.tick)) : 0;

    for (const incoming of save.buildings) {
      const issue = state.acceptSavedBuilding(incoming);
      if (issue) state.issues.push(issue);
    }

    state.rebuildIndexes();
    state.setPopulation(save.population);

    // Sira sayaci, yuklenen gorevlerin en yukseginin uzerinden devam etmeli;
    // aksi halde yeni gorevler kuyrukta eski gorevlerin onune gecerdi.
    for (const building of state.buildingMap.values()) {
      const sequence = building.construction?.sequence;
      if (typeof sequence === 'number' && sequence > state.sequenceCounter) {
        state.sequenceCounter = sequence;
      }
    }
    return state;
  }

  /** Kayit icin serilestirilebilir anlik goruntu uretir. */
  toSave(version: number): SaveData {
    return {
      version,
      savedAt: Date.now(),
      tick: this.currentTick,
      resources: { ...this.resourcePool },
      buildings: [...this.buildingMap.values()].map((b) => ({ ...b })),
      terrainSeed: this.grid.seed,
      population: this.citizens,
    };
  }

  /**
   * Kayittan gelen tek bir binayi butunluk kontrolunden gecirip kabul eder.
   * Kabul edilmezse nedeni doner.
   */
  private acceptSavedBuilding(incoming: BuildingInstance): LoadIssue | null {
    if (!isKnownBuildingId(incoming.type)) {
      return { uid: incoming.uid, reason: 'unknown_type' };
    }
    if (this.buildingMap.has(incoming.uid)) {
      return { uid: incoming.uid, reason: 'duplicate_uid' };
    }

    const def = getBuilding(incoming.type);

    // Ayak izi tamamen izgara icinde olmali.
    const cells = this.grid.footprint(incoming.gx, incoming.gy, def.size);
    if (!cells) {
      return { uid: incoming.uid, reason: 'out_of_bounds' };
    }

    // Hicbir hucre baska bir binaya ait olmamali.
    if (cells.some((tile) => tile.occupantUid !== null)) {
      return { uid: incoming.uid, reason: 'overlap' };
    }

    const building: BuildingInstance = {
      ...incoming,
      level: clampLevel(def, incoming.level),
      assignedWorkers: Math.max(0, Math.trunc(incoming.assignedWorkers)),
    };

    this.buildingMap.set(building.uid, building);
    this.grid.occupy(building.gx, building.gy, def.size, building.uid);
    this.rememberUid(building.uid);
    return null;
  }

  /** Kayittan gelen kimlikler sayaci gecmesin diye sayaci ilerletir. */
  private rememberUid(uid: string): void {
    const suffix = Number.parseInt(uid.split('#')[1] ?? '', 10);
    if (Number.isFinite(suffix) && suffix > this.uidCounter) {
      this.uidCounter = suffix;
    }
  }
}
