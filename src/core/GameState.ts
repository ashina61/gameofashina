import {
  DEFAULT_TIME_SCALE,
  MAX_TIME_SCALE,
  MIN_TIME_SCALE,
  SAVE_VERSION,
  STARTING_RESOURCES,
} from '@/config/Constants';
import { STARTING_RESEARCHES } from '@/config/ResearchCatalog';
import { createNewWorld, PLAYER_ID } from './WorldFactory';
import type {
  BattleReport,
  TradeRoute,
  ActiveResearch,
  CityState,
  CompletedResearch,
  Fleet,
  IslandState,
  MaterialKey,
  NoticeRecord,
  NpcCity,
  SaveData,
  WonderActivation,
  UpgradeTier,
  WorldState,
} from '@/types';

/**
 * Oyunun tum degisken verisi.
 *
 * Bu sinif bir VERI KABI'dir; oyun KURALLARI burada degil `systems/`
 * altindadir. Kuralin buraya sizmasi, kurali tarayici olmadan test
 * edilemez hale getirirdi. Duruma erisim icin yardimci okuyucular
 * (cityOf, islandOf, npcOf) saglanir; boylece sistemler dizilerde arama
 * yapmaz ve ayni nesneyi iki farkli sekilde bulma riski olmaz.
 *
 * Ikariam'da kaynaklar SEHIR BASINA, altin ve arastirma puani OYUNCU
 * BASINAdir. Bu ayrim bilincli olarak modele islenmistir.
 */
export class GameState {
  /** Dunya: adalar ve NPC sehirleri. */
  readonly world: WorldState;

  /** Oyuncunun sehirleri. */
  readonly cities: CityState[] = [];

  /** Oyuncunun yoldaki filolari. */
  readonly fleets: Fleet[] = [];

  /**
   * Aktif/beklemedeki harikalar.
   *
   * Ikariam'da harika ada bazlidir ve PASIF degildir: inanç seviyeyi acar,
   * oyuncu etkileyi AKTIFLESTIRIR ve etki sureli bir pencerede gecerlidir.
   */
  readonly wonders: WonderActivation[] = [];

  /** Tamamlanmis arastirmalar. */
  readonly completedResearch: CompletedResearch[] = [];

  /** Bildirim/posta kutusu. */
  readonly notices: NoticeRecord[] = [];
  /** Savas raporlari; en yenisi bastadir. */
  readonly reports: BattleReport[] = [];
  /** Kalici ticaret rotalari. */
  readonly tradeRoutes: TradeRoute[] = [];

  /** Birlik ve gemi kademe gelistirmeleri. */
  readonly tiers: {
    units: Record<string, UpgradeTier>;
    ships: Record<string, UpgradeTier>;
  } = { units: {}, ships: {} };

  /** Oyuncunun altini (tum sehirler icin ortak havuz). */
  gold = 0;

  /** Birikmis arastirma puani. */
  researchPoints = 0;

  /** Devam eden arastirma; Ikariam'da ayni anda yalnizca bir tane. */
  activeResearch: ActiveResearch | null = null;

  /** Oyuncunun su an baktigi sehir. */
  activeCityId: string;

  /** Oyun ici toplam gecen OYUN saniyesi. */
  gameSeconds = 0;

  /** Simulasyon tiki (gercek saniye sayaci). */
  private currentTick = 0;

  /** Zaman olcegi: bir gercek saniyede kac oyun saniyesi gecer. */
  private scale = DEFAULT_TIME_SCALE;

  /** Dunya uretim tohumu; kayda yazilir. */
  readonly seed: number;

  /** Kimlik ve kuyruk sirasi uretme sayaclari. */
  private uidCounter = 0;
  private sequenceCounter = 0;

  private constructor(world: WorldState, activeCityId: string, seed: number) {
    this.world = world;
    this.activeCityId = activeCityId;
    this.seed = seed;
  }

  // --- Zaman ---------------------------------------------------------------

  /** Gecerli simulasyon tiki. */
  get tick(): number {
    return this.currentTick;
  }

  /**
   * Zaman olcegi.
   *
   * Sinirli tutulur: 0 veya negatif bir olcek simulasyonu durdurur, cok
   * buyuk bir olcek ise tek tikte islenecek uretimi tasirip depo tavanini
   * anlamsizlastirir.
   */
  get timeScale(): number {
    return this.scale;
  }

  set timeScale(value: number) {
    if (!Number.isFinite(value)) return;
    this.scale = Math.min(MAX_TIME_SCALE, Math.max(MIN_TIME_SCALE, Math.round(value)));
  }

  /**
   * Simulasyonu verilen tik kadar ilerletir ve OYUN saniyesini biriktirir.
   *
   * Iki sayac bilincli olarak ayridir: `tick` gercek zamani, `gameSeconds`
   * oyun zamanini olcer. Insaat ve yolculuk sureleri oyun saniyesinde
   * tutuldugu icin hiz degistirmek onlarin anlamini degistirmez.
   */
  advanceTick(ticks: number): number {
    if (!Number.isFinite(ticks) || ticks <= 0) return this.currentTick;
    const whole = Math.floor(ticks);
    this.currentTick += whole;
    this.gameSeconds += whole * this.scale;
    return this.currentTick;
  }

  /** Bir tikte gecen oyun saniyesi. */
  get gameSecondsPerTick(): number {
    return this.scale;
  }

  // --- Okuma yuzeyi --------------------------------------------------------

  /** Kimlige gore sehir; bulunamazsa null. */
  cityOf(cityId: string): CityState | null {
    return this.cities.find((c) => c.id === cityId) ?? null;
  }

  /** Oyuncunun aktif sehri; hic sehir yoksa null. */
  get activeCity(): CityState | null {
    return this.cityOf(this.activeCityId) ?? this.cities[0] ?? null;
  }

  /** Oyuncunun baskenti. */
  get capital(): CityState | null {
    return this.cities.find((c) => c.isCapital) ?? this.cities[0] ?? null;
  }

  /** Oyuncunun koloni sayisi (baskent haric). */
  get colonyCount(): number {
    return Math.max(0, this.cities.length - 1);
  }

  /** Kimlige gore ada. */
  islandOf(islandId: string): IslandState | null {
    return this.world.islands.find((i) => i.id === islandId) ?? null;
  }

  /** Oyuncunun aktif sehrinin adasi. */
  get homeIsland(): IslandState | null {
    const active = this.activeCity;
    return active ? this.islandOf(active.islandId) : this.world.islands[0] ?? null;
  }

  /** Kimlige gore NPC. */
  npcOf(npcId: string): NpcCity | null {
    return this.world.npcs.find((n) => n.id === npcId) ?? null;
  }

  /** Bir adadaki NPC'ler. */
  npcsOnIsland(islandId: string): NpcCity[] {
    return this.world.npcs.filter((n) => n.islandId === islandId);
  }

  /** Bir adadaki bir alanin sahibi olan NPC. */
  npcAtPlot(islandId: string, plot: number): NpcCity | null {
    return this.world.npcs.find((n) => n.islandId === islandId && n.plot === plot) ?? null;
  }

  /** Oyuncunun bir adadaki sehirleri. */
  playerCitiesOnIsland(islandId: string): CityState[] {
    return this.cities.filter((c) => c.islandId === islandId);
  }

  /** Arastirma tamamlanmis mi? */
  hasResearch(id: string): boolean {
    return this.completedResearch.some((r) => r.id === id);
  }

  /** Arastirmanin seviyesi (tamamlanmadiysa 0). */
  researchLevel(id: string): number {
    return this.completedResearch.find((r) => r.id === id)?.level ?? 0;
  }

  /** Birlik kademesi; gelistirilmediyse 'base'. */
  unitTier(id: string): UpgradeTier {
    return this.tiers.units[id] ?? 'base';
  }

  /** Gemi kademesi; gelistirilmediyse 'base'. */
  shipTier(id: string): UpgradeTier {
    return this.tiers.ships[id] ?? 'base';
  }

  // --- Kontrollu mutasyon --------------------------------------------------

  /** Yeni bir benzersiz kimlik uretir. */
  nextUid(prefix: string): string {
    this.uidCounter += 1;
    return `${prefix}#${this.uidCounter}`;
  }

  /** Yeni bir insaat/gorev sira numarasi uretir. */
  nextSequence(): number {
    this.sequenceCounter += 1;
    return this.sequenceCounter;
  }

  /** Altini belirler; negatife dusmez. */
  setGold(value: number): void {
    this.gold = Number.isFinite(value) ? Math.max(0, value) : 0;
  }

  /** Altina ekleme/cikarma yapar; sonuc negatife dusmez. */
  addGold(delta: number): void {
    if (!Number.isFinite(delta)) return;
    this.setGold(this.gold + delta);
  }

  /** Arastirma puanini belirler; negatife dusmez. */
  setResearchPoints(value: number): void {
    this.researchPoints = Number.isFinite(value) ? Math.max(0, value) : 0;
  }

  /** Arastirma puani ekler/cikarir. */
  addResearchPoints(delta: number): void {
    if (!Number.isFinite(delta)) return;
    this.setResearchPoints(this.researchPoints + delta);
  }

  /**
   * Bir sehrin maddesel kaynagini belirler.
   *
   * Negatif depo olmaz. Depo TAVANI burada UYGULANMAZ: tavan bir kuraldir
   * ve ResourceSystem'de yasar. Buraya tavan kontrolu koymak, ayni kurali
   * iki yere yazmak olurdu.
   */
  setMaterial(city: CityState, key: MaterialKey, value: number): void {
    city.resources[key] = Number.isFinite(value) ? Math.max(0, value) : 0;
  }

  /** Bir sehrin kaynagina ekleme/cikarma yapar. */
  addMaterial(city: CityState, key: MaterialKey, delta: number): void {
    if (!Number.isFinite(delta)) return;
    this.setMaterial(city, key, city.resources[key] + delta);
  }

  /** Nufusu belirler; negatife dusmez ve tam sayiya cevrilir. */
  setCitizens(city: CityState, value: number, progress = 0): void {
    city.citizens = Number.isFinite(value) ? Math.max(0, Math.trunc(value)) : 0;
    city.growthProgress = Number.isFinite(progress) ? progress : 0;
  }

  /** Vatandas dagilimini belirler. */
  setAssignment(city: CityState, assignment: Partial<CityState['assignment']>): void {
    const roles = ['idle', 'wood', 'luxury', 'scientist'] as const;
    for (const role of roles) {
      const value = assignment[role];
      if (typeof value === 'number' && Number.isFinite(value)) {
        city.assignment[role] = Math.max(0, Math.trunc(value));
      }
    }
  }

  /** Sehrin ada alanindaki kaydini gunceller. */
  linkPlot(city: CityState): void {
    const slot = this.islandOf(city.islandId)?.plots[city.plot];
    if (!slot) return;
    slot.ownerId = city.ownerId;
    slot.cityId = city.id;
  }

  /** Bir alanin baglantisini koparir. */
  unlinkPlot(islandId: string, plot: number): void {
    const slot = this.islandOf(islandId)?.plots[plot];
    if (!slot) return;
    slot.ownerId = null;
    slot.cityId = null;
  }

  /** Oyuncuya yeni bir sehir (koloni) ekler. */
  addCity(city: CityState): void {
    this.cities.push(city);
    this.linkPlot(city);
    if (this.cities.length === 1) this.activeCityId = city.id;
  }

  /** NPC sehrini dunyadan kaldirir. */
  removeNpc(npcId: string): NpcCity | null {
    const index = this.world.npcs.findIndex((n) => n.id === npcId);
    if (index < 0) return null;
    const removed = this.world.npcs[index];
    if (!removed) return null;
    this.world.npcs.splice(index, 1);
    this.unlinkPlot(removed.islandId, removed.plot);
    return removed;
  }

  /** Bir filoyu ekler. */
  addFleet(fleet: Fleet): void {
    this.fleets.push(fleet);
  }

  /** Bir filoyu kaldirir. */
  removeFleet(fleetId: string): Fleet | null {
    const index = this.fleets.findIndex((f) => f.id === fleetId);
    if (index < 0) return null;
    const removed = this.fleets[index];
    if (!removed) return null;
    this.fleets.splice(index, 1);
    return removed;
  }

  /** Bir arastirmayi tamamlanmis isaretler. */
  completeResearch(id: string, level: number): void {
    const existing = this.completedResearch.find((r) => r.id === id);
    if (existing) existing.level = Math.max(existing.level, level);
    else this.completedResearch.push({ id, level, completedAtTick: this.currentTick });
  }

  /** Bildirim ekler; kutu sinirli tutulur. */
  pushNotice(notice: Omit<NoticeRecord, 'id'>): NoticeRecord {
    const record: NoticeRecord = { ...notice, id: this.nextUid('notice') };
    this.notices.unshift(record);
    if (this.notices.length > 60) this.notices.length = 60;
    return record;
  }

  /** Tum bildirimleri okundu isaretler. */
  markNoticesRead(): void {
    for (const notice of this.notices) notice.read = true;
  }

  /**
   * Savas raporunu saklar.
   *
   * Ikariam'da raporlar mesaj kutusunda kalici olarak durur; oyuncu
   * savasi sonra tekrar okuyabilmelidir. Liste sinirlidir: eski raporlar
   * kayit boyutunu sisirmemek icin dusurulur.
   */
  /** Rota ekler; ayni hatta ikinci rota kurulamaz. */
  addTradeRoute(route: TradeRoute): boolean {
    const duplicate = this.tradeRoutes.some(
      (r) =>
        (r.fromCityId === route.fromCityId && r.toCityId === route.toCityId) ||
        (r.fromCityId === route.toCityId && r.toCityId === route.fromCityId),
    );
    if (duplicate) return false;
    this.tradeRoutes.push(route);
    return true;
  }

  /** Rota kaldirir; yoldaki filosu da geri cagrilir (FleetSystem yapar). */
  removeTradeRoute(routeId: string): void {
    const index = this.tradeRoutes.findIndex((r) => r.id === routeId);
    if (index >= 0) this.tradeRoutes.splice(index, 1);
  }

  pushReport(report: BattleReport): void {
    this.reports.unshift(report);
    if (this.reports.length > 25) this.reports.length = 25;
  }

  /** Okunmamis bildirim sayisi. */
  get unreadNotices(): number {
    return this.notices.filter((n) => !n.read).length;
  }

  // --- Olusturma ve kayit --------------------------------------------------

  /** Sifirdan yeni bir oyun durumu olusturur. */
  static createNew(seed = Math.floor(Math.random() * 0xffffffff), cityName = 'Ashina'): GameState {
    const { world, cities, activeCityId } = createNewWorld(seed, cityName);
    const state = new GameState(world, activeCityId, seed);
    for (const city of cities) state.addCity(city);

    state.gold = STARTING_RESOURCES.gold;
    state.researchPoints = 0;

    /*
     * Oyuncu ogretici arastirmalariyla baslar.
     *
     * Ikariam'in ogreticisi de boyledir: Depo (Koruma), Ticaret Limani
     * (Marangozluk), Tersane (Kuru Havuz) ve Kuyu Kazma hazir verilir.
     * Bunlar olmadan oyun "hicbir bina kurulamiyor" durumuna duserdi,
     * cunku ilk arastirma puani Akademi ister ve Akademi'yi kurmak icin
     * oyuncunun once ekonomiyi gormesi gerekir.
     */
    for (const id of STARTING_RESEARCHES) state.completeResearch(id, 1);

    return state;
  }

  /** Kayit verisinden oyun durumunu geri yukler. */
  static fromSave(save: SaveData): GameState {
    const state = new GameState(save.world, save.activeCityId, save.seed);
    state.currentTick = Number.isFinite(save.tick) ? Math.max(0, Math.trunc(save.tick)) : 0;
    state.gameSeconds = Number.isFinite(save.gameSeconds) ? Math.max(0, save.gameSeconds) : 0;
    state.timeScale = save.timeScale;
    state.gold = Number.isFinite(save.gold) ? Math.max(0, save.gold) : 0;
    state.researchPoints = Number.isFinite(save.researchPoints)
      ? Math.max(0, save.researchPoints)
      : 0;
    state.activeResearch = save.activeResearch ?? null;
    state.completedResearch.push(...save.completedResearch);
    state.notices.push(...save.notices);
    // Eski kayitlarda alan yoksa bos liste: raporlar opsiyoneldir.
    state.reports.push(...(save.reports ?? []));
    state.tradeRoutes.push(...(save.tradeRoutes ?? []));
    state.tiers.units = { ...save.tiers.units };
    state.tiers.ships = { ...save.tiers.ships };
    state.cities.push(...save.cities);
    state.fleets.push(...save.fleets);
    state.wonders.push(...(save.wonders ?? []));

    // Sira sayaci, yuklenen gorevlerin en yukseginden devam etmeli; aksi
    // halde yeni gorevler kuyrukta eskilerin onune gecerdi.
    for (const city of state.cities) {
      const tasks = [
        city.townHall.construction,
        city.wall.construction,
        city.harbor.port.construction,
        city.harbor.shipyard.construction,
        ...city.grounds.map((g) => g.construction),
      ];
      for (const task of tasks) {
        if (typeof task?.sequence === 'number' && task.sequence > state.sequenceCounter) {
          state.sequenceCounter = task.sequence;
        }
      }
    }
    return state;
  }

  /** Kayit icin serilestirilebilir anlik goruntu. */
  toSave(): SaveData {
    return {
      version: SAVE_VERSION,
      savedAt: Date.now(),
      gameSeconds: this.gameSeconds,
      tick: this.currentTick,
      timeScale: this.scale,
      gold: this.gold,
      researchPoints: this.researchPoints,
      completedResearch: this.completedResearch.map((r) => ({ ...r })),
      activeResearch: this.activeResearch ? { ...this.activeResearch } : null,
      cities: structuredClone(this.cities),
      fleets: structuredClone(this.fleets),
      wonders: structuredClone(this.wonders),
      world: structuredClone(this.world),
      activeCityId: this.activeCityId,
      notices: this.notices.map((n) => ({ ...n })),
      reports: this.reports.map((r) => ({ ...r })),
      tradeRoutes: this.tradeRoutes.map((r) => ({ ...r })),
      tiers: { units: { ...this.tiers.units }, ships: { ...this.tiers.ships } },
      seed: this.seed,
    };
  }
}

/** Oyuncunun kimligi; NPC'lerden ayirmak icin. */
export { PLAYER_ID };
