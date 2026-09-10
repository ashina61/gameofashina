import { GridMap } from './GridMap';
import { STARTING_RESOURCES } from '@/config/GameConfig';
import { getBuilding } from '@/config/BuildingCatalog';
import type { BuildingId, BuildingInstance, ResourcePool, SaveData } from '@/types';

/**
 * Oyunun tum degisken verisi.
 * Sistemler bu nesneyi okur/yazar; render ve arayuz katmani asla dogrudan
 * yazmaz, yalnizca sistemler uzerinden degistirir.
 */
export class GameState {
  resources: ResourcePool;
  readonly grid: GridMap;
  readonly buildings = new Map<string, BuildingInstance>();

  /** Benzersiz bina kimligi uretmek icin artan sayac. */
  private uidCounter = 0;

  constructor(terrainSeed: number, resources?: ResourcePool) {
    this.grid = new GridMap(terrainSeed);
    this.resources = resources ? { ...resources } : { ...STARTING_RESOURCES };
  }

  /** Sifirdan yeni bir oyun durumu olusturur. */
  static createNew(): GameState {
    return new GameState(Math.floor(Math.random() * 0xffffffff));
  }

  /** Kayit verisinden oyun durumunu geri yukler. */
  static fromSave(save: SaveData): GameState {
    const state = new GameState(save.terrainSeed, save.resources);
    for (const building of save.buildings) {
      state.buildings.set(building.uid, { ...building });
      const def = getBuilding(building.defId);
      state.grid.occupy(building.gx, building.gy, def.size, building.uid);
      state.rememberUid(building.uid);
    }
    return state;
  }

  /** Yeni bir bina ornegi icin benzersiz kimlik uretir. */
  nextUid(defId: BuildingId): string {
    this.uidCounter += 1;
    return `${defId}#${this.uidCounter}`;
  }

  /** Kayittan gelen kimlikler sayaci gecmesin diye sayaci ilerletir. */
  private rememberUid(uid: string): void {
    const suffix = Number.parseInt(uid.split('#')[1] ?? '', 10);
    if (Number.isFinite(suffix) && suffix > this.uidCounter) {
      this.uidCounter = suffix;
    }
  }

  /** Verilen turden kac adet bina oldugunu sayar (insaat halindekiler dahil). */
  countOf(defId: BuildingId): number {
    let count = 0;
    for (const building of this.buildings.values()) {
      if (building.defId === defId) count += 1;
    }
    return count;
  }

  /** Kayit icin serilestirilebilir anlik goruntu uretir. */
  toSave(version: number): SaveData {
    return {
      version,
      savedAt: Date.now(),
      resources: { ...this.resources },
      buildings: [...this.buildings.values()].map((b) => ({ ...b })),
      terrainSeed: this.grid.seed,
    };
  }
}
