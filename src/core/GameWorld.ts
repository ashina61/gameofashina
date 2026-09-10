import { AUTOSAVE_INTERVAL_MS, ECONOMY_TICK_MS } from '@/config/Constants';
import { EventBus } from './EventBus';
import { GameState } from './GameState';
import { SaveManager } from './SaveManager';
import { BuildingSystem } from '@/systems/BuildingSystem';
import { EconomySystem } from '@/systems/EconomySystem';
import { ResourceSystem } from '@/systems/ResourceSystem';

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
  readonly buildings: BuildingSystem;
  readonly economy: EconomySystem;

  /** Ilk acilista telafi edilen cevrimdisi sure (saniye); yoksa 0. */
  readonly offlineSeconds: number;

  /** Kayittan mi yuklendi, yoksa yeni oyun mu? */
  readonly loadedFromSave: boolean;

  private tickAccumulator = 0;
  private autosaveAccumulator = 0;

  private constructor(state: GameState, loadedFromSave: boolean, offlineSeconds: number) {
    this.state = state;
    this.loadedFromSave = loadedFromSave;
    this.resources = new ResourceSystem(state, this.bus);
    this.buildings = new BuildingSystem(state, this.resources, this.bus);
    this.economy = new EconomySystem(state, this.resources, this.buildings, this.bus);
    this.offlineSeconds = offlineSeconds > 0 ? this.economy.applyOfflineProgress(offlineSeconds) : 0;
  }

  /** Kayit varsa onu yukler, yoksa yeni bir oyun baslatir. */
  static bootstrap(): GameWorld {
    const saves = new SaveManager();
    const save = saves.load();

    if (save) {
      const elapsed = Math.max(0, (Date.now() - save.savedAt) / 1000);
      return new GameWorld(GameState.fromSave(save), true, elapsed);
    }
    return new GameWorld(GameState.createNew(), false, 0);
  }

  /**
   * Phaser'in her karesinde cagrilir.
   * Ekonomi sabit araliklarla islenir; kare hizi degisse de denge bozulmaz.
   */
  update(deltaMs: number): void {
    this.tickAccumulator += deltaMs;
    while (this.tickAccumulator >= ECONOMY_TICK_MS) {
      this.tickAccumulator -= ECONOMY_TICK_MS;
      this.economy.tick(ECONOMY_TICK_MS / 1000);
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
