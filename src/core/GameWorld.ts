import {
  AUTOSAVE_INTERVAL_MS,
  DEFAULT_TIME_SCALE,
  DUMP_GOLD_PER_UNIT,
  GAME_SECONDS_PER_HOUR,
  MAX_TIME_SCALE,
  MIN_TIME_SCALE,
} from '@/config/Constants';
import { EventBus } from '@/core/EventBus';
import { GameState } from '@/core/GameState';
import { SaveManager } from '@/core/SaveManager';
import { Simulation, type Systems } from '@/core/Simulation';
import { PLAYER_ID } from '@/core/WorldFactory';
import { CitizenSystem } from '@/systems/CitizenSystem';
import { CombatSystem } from '@/systems/CombatSystem';
import { ConstructionSystem } from '@/systems/ConstructionSystem';
import { EconomySystem } from '@/systems/EconomySystem';
import { FleetSystem } from '@/systems/FleetSystem';
import { HappinessSystem } from '@/systems/HappinessSystem';
import { IslandSystem } from '@/systems/IslandSystem';
import { MilitarySystem, type TierKind } from '@/systems/MilitarySystem';
import { NpcSystem } from '@/systems/NpcSystem';
import { ResearchSystem } from '@/systems/ResearchSystem';
import { ResourceSystem } from '@/systems/ResourceSystem';
import { WonderSystem } from '@/systems/WonderSystem';
import { tavernLevel } from '@/core/CityQuery';
import type {
  CitySnapshot,
  CityState,
  Fleet,
  IslandState,
  MaterialKey,
  NpcCity,
  ResourceAmounts,
  ShipStack,
  UnitStack,
} from '@/types';

/**
 * Oyun dunyasinin kok nesnesi.
 *
 * GameWorld; durum (GameState), sistemler ve zamanlama (Simulation)
 * arasindaki TEK baglanti noktasidir. Phaser sahneleri ve arayuz yalnizca
 * bununla konusur; hicbir sistem bir sahneyi bilmez. Bu ayrim tum oyun
 * mantiginin Phaser olmadan test edilebilmesini saglar.
 *
 * TEK STATE REFERANSI
 * Sistemler ayni GameState nesnesini paylasir. Bir sistemin kendi
 * kopyasini tutmasi, arayuzun gordugu ile simulasyonun isledigi
 * degerlerin ayrismasi demek olurdu - bu tur oyunlarda en sik rastlanan
 * ve en zor bulunan hata sinifi budur.
 *
 * EYLEMLER "NEDEN" DONER
 * UI'nin cagirdigi her eylem metot ya `null` (basarili) ya da oyuncuya
 * gosterilecek TURKCE bir gerekce doner. "Yapilamadi" demek yerine neden
 * yapilamadigini soylemek, Ikariam'in kendi arayuz davranisidir ve
 * oyuncunun bir sonraki adimi anlamasini saglar.
 */

export interface GameWorldOptions {
  seed?: number;
  cityName?: string;
  /** Kayittan yuklemeyi dene (varsayilan: true). */
  loadSave?: boolean;
}

export class GameWorld {
  readonly bus = new EventBus();
  readonly state: GameState;
  readonly systems: Systems;

  private readonly simulation: Simulation;
  private readonly saveManager = new SaveManager();
  private readonly bootNotices: string[] = [];
  private isRunning = false;

  constructor(options: GameWorldOptions = {}) {
    // --- Durum: kayit veya yeni dunya ---
    let loaded: GameState | null = null;
    let offlineGameSeconds = 0;

    if (options.loadSave !== false) {
      const result = this.saveManager.load();
      if (result.discarded === 'version') {
        this.saveManager.clear();
        this.bootNotices.push('Kayıt sürümü bu oyunla uyumlu değil; yeni bir dünya kuruldu.');
      } else if (result.discarded === 'corrupt') {
        this.saveManager.clear();
        this.bootNotices.push('Kayıt okunamadı; yeni bir dünya kuruldu.');
      } else if (result.data) {
        loaded = GameState.fromSave(result.data);
        offlineGameSeconds = result.offlineGameSeconds;
      }
    }

    this.state = loaded ?? GameState.createNew(options.seed, options.cityName ?? 'Ashina');

    // --- Sistemler: bagimlilik sirasiyla kurulur ---
    const resources = new ResourceSystem(this.state, this.bus);
    const wonders = new WonderSystem(this.state, this.bus);
    const happiness = new HappinessSystem(this.state);
    const citizens = new CitizenSystem(this.state, happiness, wonders, this.bus);
    const research = new ResearchSystem(this.state, this.bus);
    const construction = new ConstructionSystem(this.state, resources, research, citizens, this.bus);
    const island = new IslandSystem(this.state, resources, construction, this.bus);
    const economy = new EconomySystem(
      this.state,
      resources,
      citizens,
      happiness,
      wonders,
      this.bus,
      (points) => research.receive(points),
    );
    const military = new MilitarySystem(this.state, resources, construction, research, this.bus);
    const combat = new CombatSystem(wonders);
    const npc = new NpcSystem(this.state, this.bus);
    const fleet = new FleetSystem(this.state, resources, wonders, combat, npc, this.bus);

    this.systems = {
      resources,
      wonders,
      happiness,
      citizens,
      economy,
      research,
      construction,
      island,
      military,
      fleet,
      combat,
      npc,
    };
    this.simulation = new Simulation(this.state, this.systems, this.bus);

    // --- Cevrimdisi ilerleme ---
    // Yalnizca bir oyundan fazlasi biriktiyse bildirilir; kisa sureler
    // oyuncunun her acilista ayni mesaji gormesi demek olurdu.
    if (loaded && offlineGameSeconds > GAME_SECONDS_PER_HOUR) {
      this.simulation.applyOfflineProgress(offlineGameSeconds);
      const hours = Math.floor(offlineGameSeconds / GAME_SECONDS_PER_HOUR);
      this.bootNotices.push(`Sen yokken ${hours} oyun saati geçti.`);
    }
  }

  /** Kurulus sirasinda biriken mesajlar; UI ilk acilista bir kez okur. */
  consumeBootNotices(): string[] {
    const list = [...this.bootNotices];
    this.bootNotices.length = 0;
    return list;
  }

  // --- Zamanlama -----------------------------------------------------------

  get timeScale(): number {
    return this.state.timeScale;
  }

  get running(): boolean {
    return this.isRunning;
  }

  setScale(scale: number): void {
    const before = this.state.timeScale;
    this.state.timeScale = scale;
    if (this.state.timeScale !== before) this.bus.emit('time:scale-changed', this.state.timeScale);
  }

  start(): void {
    if (this.isRunning) return;
    this.isRunning = true;
    this.saveManager.startAutoSave(() => this.save(), AUTOSAVE_INTERVAL_MS);
    this.bus.emit('game:resumed');
  }

  pause(): void {
    if (!this.isRunning) return;
    this.isRunning = false;
    this.saveManager.stopAutoSave();
    this.save();
    this.bus.emit('game:paused');
  }

  togglePause(): void {
    if (this.isRunning) this.pause();
    else this.start();
  }

  /** Phaser kare dongusunden cagrilir. */
  update(deltaRealSeconds: number): void {
    if (!this.isRunning) return;
    // Cok buyuk delta (sekme degisimi, cihaz uykusu) simulasyonu tek
    // tikta yuzlerce saat ilerletir. Bu yuzden kirpilir; kalan sure
    // advanceGameSeconds ile ayrica yakalanabilir.
    this.simulation.step(Math.min(deltaRealSeconds, 5));
  }

  /**
   * Simulasyonu dogrudan OYUN saniyesiyle ilerletir.
   *
   * Iki kullanim alani vardir:
   *   - Cevrimdisi ilerleme (uzun sureler, dilimlenerek)
   *   - Testler: hiz carpanina ve kare delta'sina bagimli olmadan
   *     "10 oyun saati gecsin" diyebilmek
   *
   * Bu metot `update` gibi kirpma UYGULAMAZ; cagiran ne kadar sure
   * istedigini bilir. Kirpma yalnizca kare dongusunun savunmasidir.
   */
  advanceGameSeconds(gameSeconds: number): void {
    this.simulation.stepGameSeconds(gameSeconds);
  }

  /** Simulasyonu oyun SAATI kadar ilerletir. */
  advanceHours(hours: number): void {
    this.advanceGameSeconds(hours * GAME_SECONDS_PER_HOUR);
  }

  // --- Kayit ---------------------------------------------------------------

  save(): boolean {
    const ok = this.saveManager.save(this.state.toSave());
    if (ok) this.bus.emit('game:saved', Date.now());
    return ok;
  }

  hasSave(): boolean {
    return this.saveManager.hasSave();
  }

  clearSave(): void {
    this.saveManager.stopAutoSave();
    this.saveManager.clear();
  }

  /** Varsayilan hiz (arayuzdeki hiz secici icin). */
  get defaultScale(): number {
    return DEFAULT_TIME_SCALE;
  }

  get scaleBounds(): { min: number; max: number } {
    return { min: MIN_TIME_SCALE, max: MAX_TIME_SCALE };
  }

  // --- Durum okuma ---------------------------------------------------------

  get activeCity(): CityState | null {
    return this.state.activeCity;
  }

  get cities(): readonly CityState[] {
    return this.state.cities;
  }

  get fleets(): readonly Fleet[] {
    return this.state.fleets;
  }

  get islands(): readonly IslandState[] {
    return this.state.world.islands;
  }

  get npcs(): readonly NpcCity[] {
    return this.state.world.npcs;
  }

  get gold(): number {
    return this.state.gold;
  }

  get researchPoints(): number {
    return this.state.researchPoints;
  }

  /** Aktif sehrin anlik goruntusu; arayuz her karede bunu okur. */
  snapshot(): CitySnapshot | null {
    const city = this.state.activeCity;
    return city ? this.systems.economy.snapshot(city) : null;
  }

  setActiveCity(cityId: string): boolean {
    const city = this.state.cityOf(cityId);
    if (!city || city.ownerId !== PLAYER_ID) return false;
    this.state.activeCityId = cityId;
    this.bus.emit('active-city:changed', cityId);
    return true;
  }

  // --- Insaat --------------------------------------------------------------

  build(buildingId: string, ground: number): string | null {
    const city = this.state.activeCity;
    if (!city) return 'Aktif şehir yok.';
    const reason = this.systems.construction.canBuild(city, buildingId, ground);
    if (reason) return reason;
    return this.systems.construction.build(city, buildingId, ground) ? null : 'İnşaat başlatılamadı.';
  }

  upgrade(buildingId: string, ground = -1): string | null {
    const city = this.state.activeCity;
    if (!city) return 'Aktif şehir yok.';
    const reason = this.systems.construction.canUpgrade(city, buildingId, ground);
    if (reason) return reason;
    return this.systems.construction.upgrade(city, buildingId, ground) ? null : 'Yükseltme başlatılamadı.';
  }

  cancelConstruction(buildingId: string, ground = -1): boolean {
    const city = this.state.activeCity;
    if (!city) return false;
    return this.systems.construction.cancel(city, buildingId, ground);
  }

  /** Adadaki ortak yatagi (hizar veya luks) yukseltir. */
  upgradeDeposit(resource: MaterialKey): string | null {
    const city = this.state.activeCity;
    const island = city ? this.state.islandOf(city.islandId) : null;
    if (!city || !island) return 'Aktif şehir veya ada yok.';
    const reason = this.systems.island.canUpgradeDeposit(island, resource, city);
    if (reason) return reason;
    return this.systems.island.upgradeDeposit(island, resource, city) ? null : 'Yükseltme başlatılamadı.';
  }

  // --- Ordu ----------------------------------------------------------------

  train(unitId: string, count: number): string | null {
    const city = this.state.activeCity;
    if (!city) return 'Aktif şehir yok.';
    const reason = this.systems.military.canTrain(city, unitId, count);
    if (reason) return reason;
    return this.systems.military.train(city, unitId, count) ? null : 'Eğitim başlatılamadı.';
  }

  buildShip(shipId: string, count: number): string | null {
    const city = this.state.activeCity;
    if (!city) return 'Aktif şehir yok.';
    const reason = this.systems.military.canBuildShip(city, shipId, count);
    if (reason) return reason;
    return this.systems.military.buildShip(city, shipId, count) ? null : 'İnşaat başlatılamadı.';
  }

  upgradeTier(kind: TierKind, id: string): string | null {
    const city = this.state.activeCity;
    if (!city) return 'Aktif şehir yok.';
    const reason = this.systems.military.canUpgradeTier(city, kind, id);
    if (reason) return reason;
    return this.systems.military.upgradeTier(city, kind, id) ? null : 'Kademe yükseltilemedi.';
  }

  // --- Arastirma -----------------------------------------------------------

  startResearch(id: string): string | null {
    const reason = this.systems.research.canStart(id);
    if (reason) return reason;
    return this.systems.research.start(id) ? null : 'Araştırma başlatılamadı.';
  }

  cancelResearch(): boolean {
    return this.systems.research.cancel();
  }

  /** Kristal -> arastirma puani cevrimi. */
  convertCrystal(crystal: number): string | null {
    const city = this.state.activeCity;
    if (!city) return 'Aktif şehir yok.';
    const gained = this.systems.research.convertCrystal(city, crystal);
    return gained > 0 ? null : 'Çevrilecek kristal yok.';
  }

  // --- Filo ----------------------------------------------------------------

  attack(
    targetIslandId: string,
    targetPlot: number,
    units: readonly UnitStack[],
    ships: readonly ShipStack[],
  ): Fleet | null {
    const city = this.state.activeCity;
    if (!city) return null;
    return this.systems.fleet.attack(city, targetIslandId, targetPlot, units, ships);
  }

  transport(toCityId: string, cargo: ResourceAmounts): Fleet | null {
    const city = this.state.activeCity;
    if (!city) return null;
    return this.systems.fleet.transport(city, toCityId, cargo);
  }

  /**
   * Kalici ticaret rotasi kurar (Ikariam trade route).
   *
   * @returns hata sebebi; kurulduysa null
   */
  createTradeRoute(
    fromCityId: string,
    toCityId: string,
    send: MaterialKey,
    bring: MaterialKey | null,
    cargoShips: number,
  ): string | null {
    return this.systems.fleet.createRoute(fromCityId, toCityId, send, bring, cargoShips);
  }

  /** Rotayi kaldirir ve yoldaki devrini geri cagirir. */
  cancelTradeRoute(routeId: string): void {
    this.systems.fleet.cancelRoute(routeId);
  }

  trade(npcId: string, sell: ResourceAmounts, buy: { resource: MaterialKey; amount: number }): Fleet | null {
    const city = this.state.activeCity;
    if (!city) return null;
    return this.systems.fleet.trade(city, npcId, sell, buy);
  }

  recallFleet(fleetId: string): boolean {
    return this.systems.fleet.recall(fleetId);
  }

  // --- Koloni ve ada -------------------------------------------------------

  foundColony(islandId: string, plot: number, name: string): string | null {
    const city = this.state.activeCity;
    if (!city) return 'Aktif şehir yok.';
    const result = this.systems.island.foundColony(islandId, plot, name, city);
    if (result.ok) this.setActiveCity(result.city?.id ?? city.id);
    return result.ok ? null : result.reason;
  }

  /** Harikaya odun bagisi yaparak inanci artirir. */
  donateWood(amount: number): string | null {
    const island = this.activeIsland();
    if (!island) return 'Aktif ada yok.';
    const gained = this.systems.wonders.donate(island.id, Math.max(0, Math.floor(amount)));
    if (gained <= 0) return 'Bağış yapılamadı; yeterli odun yok.';
    this.bus.emit('island:faith-changed', island.id, island.faith);
    return null;
  }

  /** Harikayi etkinlestirir. */
  activateWonder(): string | null {
    const island = this.activeIsland();
    if (!island) return 'Aktif ada yok.';
    const reason = this.systems.wonders.canActivate(island.id);
    if (reason) return reason;
    return this.systems.wonders.activate(island.id) ? null : 'Harika etkinleştirilemedi.';
  }

  /** Aktif sehrin adasi. */
  activeIsland(): IslandState | null {
    const city = this.state.activeCity;
    return city ? this.state.islandOf(city.islandId) : null;
  }

  // --- Mutluluk ve ticaret eylemleri ---------------------------------------

  /** Meyhanede dagitilan sarap miktari. */
  serveWine(count: number): boolean {
    const city = this.state.activeCity;
    if (!city) return false;
    const max = tavernLevel(city);
    const clamped = Math.max(0, Math.min(max, Math.floor(count)));
    if (clamped === city.tavernWine) return true;
    city.tavernWine = clamped;
    this.bus.emit('city:updated', this.systems.economy.snapshot(city));
    return true;
  }

  /**
   * Muzeye kultrel mal ekler.
   *
   * Ikariam'da muzedeki kultrel mallar BASKA OYUNCULARIN sehirleriyle
   * yapilan anlasmalardan gelir. Tek oyunculu bu surumde ayni mekanik
   * NPC sehirleriyle kurulan anlasmalara baglanir: anlasmayi bozmak
   * maliyeti geri vermez, cunku Ikariam'da da anlasmalar sureliktir.
   */
  addMuseumGood(npcId: string): string | null {
    const city = this.state.activeCity;
    if (!city) return 'Aktif şehir yok.';
    const npc = this.state.npcOf(npcId);
    if (!npc) return 'Anlaşma yapılacak şehir bulunamadı.';
    if (city.museumGoods.some((t) => t.cityId === npcId)) {
      return 'Bu şehirle zaten anlaşma var.';
    }
    city.museumGoods.push({ cityId: npcId, cityName: npc.name, goods: 1 });
    this.bus.emit('city:updated', this.systems.economy.snapshot(city));
    return null;
  }

  /** Muze anlasmasini iptal eder. */
  removeMuseumGood(npcId: string): boolean {
    const city = this.state.activeCity;
    if (!city) return false;
    const before = city.museumGoods.length;
    city.museumGoods = city.museumGoods.filter((t) => t.cityId !== npcId);
    if (city.museumGoods.length === before) return false;
    this.bus.emit('city:updated', this.systems.economy.snapshot(city));
    return true;
  }

  /** Toptanci: kaynagi altina cevirir. */
  sellResource(resource: MaterialKey, amount: number): number {
    const city = this.state.activeCity;
    if (!city) return 0;
    return this.systems.resources.sellForGold(city, resource, Math.max(0, Math.floor(amount)), DUMP_GOLD_PER_UNIT);
  }

  /** Vatandas atamasi. */
  assign(role: 'idle' | 'wood' | 'luxury' | 'scientist', delta: number): number {
    const city = this.state.activeCity;
    if (!city) return 0;
    const applied = this.systems.citizens.assign(city, role, delta);
    this.bus.emit('assignment:changed', city.id);
    this.bus.emit('city:updated', this.systems.economy.snapshot(city));
    return applied;
  }

  /** Bildirimleri okundu isaretler. */
  markNoticesRead(): void {
    this.state.markNoticesRead();
  }

  destroy(): void {
    this.saveManager.stopAutoSave();
    this.bus.destroy();
  }
}
