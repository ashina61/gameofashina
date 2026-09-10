import { getBuilding } from '@/config/BuildingCatalog';
import type { EventBus } from '@/core/EventBus';
import type { GameState } from '@/core/GameState';
import type { ResourceSystem } from './ResourceSystem';
import type { BuildingDefinition, BuildingId, BuildingInstance } from '@/types';

/** Yerlestirmenin neden reddedildigini anlatan hata kodlari. */
export type PlacementError = 'out_of_bounds' | 'occupied' | 'terrain' | 'cost' | 'max_count';

/** Kural kontrolunun sonucu. */
export type ValidationResult = { ok: true } | { ok: false; reason: PlacementError };

/** Yerlestirme denemesinin sonucu. */
export type PlacementResult =
  | { ok: true; building: BuildingInstance }
  | { ok: false; reason: PlacementError };

/** Hata kodlarinin kullaniciya gosterilecek karsiliklari. */
export const PLACEMENT_MESSAGES: Record<PlacementError, string> = {
  out_of_bounds: 'Bu alan haritanin disinda.',
  occupied: 'Burasi dolu.',
  terrain: 'Bu zemine kurulamaz.',
  cost: 'Yeterli kaynagin yok.',
  max_count: 'Bu binadan daha fazla kuramazsin.',
};

/**
 * Bina yerlestirme ve yikma islemlerini yoneten sistem.
 * Izgara isgali, maliyet ve kural kontrolleri tek noktada toplanir.
 */
export class BuildingSystem {
  private readonly state: GameState;
  private readonly resources: ResourceSystem;
  private readonly bus: EventBus;

  constructor(state: GameState, resources: ResourceSystem, bus: EventBus) {
    this.state = state;
    this.resources = resources;
    this.bus = bus;
  }

  /**
   * Yerlestirmenin gecerli olup olmadigini, kaynak kontrolu dahil dogrular.
   * Yerlestirme onizlemesi de bu fonksiyonu kullanir; kural tek yerde durur.
   */
  validate(defId: BuildingId, gx: number, gy: number): ValidationResult {
    const def = getBuilding(defId);

    if (def.maxCount !== undefined && this.state.countOf(defId) >= def.maxCount) {
      return { ok: false, reason: 'max_count' };
    }

    const cells = this.state.grid.footprint(gx, gy, def.size);
    if (!cells) return { ok: false, reason: 'out_of_bounds' };
    if (cells.some((tile) => tile.occupantUid !== null)) return { ok: false, reason: 'occupied' };
    if (cells.some((tile) => !def.allowedTerrain.includes(tile.terrain))) {
      return { ok: false, reason: 'terrain' };
    }
    if (!this.resources.canAfford(def.cost)) return { ok: false, reason: 'cost' };

    return { ok: true };
  }

  /** Kaynak kontrolu haric, sadece zemin uygunlugunu dondurur (onizleme icin). */
  isTerrainValid(defId: BuildingId, gx: number, gy: number): boolean {
    const def = getBuilding(defId);
    return this.state.grid.canPlace(gx, gy, def.size, def.allowedTerrain);
  }

  /** Binayi kurar: maliyeti duser, izgarayi isgal eder ve insaati baslatir. */
  place(defId: BuildingId, gx: number, gy: number): PlacementResult {
    const check = this.validate(defId, gx, gy);
    if (!check.ok) return check;

    const def = getBuilding(defId);
    if (!this.resources.spend(def.cost)) {
      return { ok: false, reason: 'cost' };
    }

    const building: BuildingInstance = {
      uid: this.state.nextUid(defId),
      defId,
      gx,
      gy,
      level: 1,
      complete: def.buildTime <= 0,
      remainingBuildTime: def.buildTime,
    };

    this.state.buildings.set(building.uid, building);
    this.state.grid.occupy(gx, gy, def.size, building.uid);
    this.bus.emit('building:placed', building);

    if (building.complete) {
      this.completeBuilding(building);
    }
    return { ok: true, building };
  }

  /**
   * Binayi yikar ve maliyetin yarisini geri verir.
   * Insaat halindeki binalar da yikilabilir.
   */
  demolish(uid: string): boolean {
    const building = this.state.buildings.get(uid);
    if (!building) return false;

    const def = getBuilding(building.defId);
    this.state.buildings.delete(uid);
    this.state.grid.release(uid);

    const refund = Object.fromEntries(
      Object.entries(def.cost).map(([key, value]) => [key, Math.floor((value ?? 0) * 0.5)]),
    );
    this.resources.recalculateCapacity();
    this.resources.add(refund);
    this.bus.emit('building:removed', building);
    return true;
  }

  /** Insaati biten binayi aktif hale getirir. */
  completeBuilding(building: BuildingInstance): void {
    building.complete = true;
    building.remainingBuildTime = 0;
    this.resources.recalculateCapacity();
    this.resources.emitChange();
    this.bus.emit('building:completed', building);
  }

  /** Bir bina ornegine ait statik tanimi dondurur. */
  definitionOf(building: BuildingInstance): BuildingDefinition {
    return getBuilding(building.defId);
  }

  /** Verilen hucreyi kaplayan binayi dondurur; bossa null. */
  buildingAt(gx: number, gy: number): BuildingInstance | null {
    const tile = this.state.grid.getTile(gx, gy);
    if (!tile?.occupantUid) return null;
    return this.state.buildings.get(tile.occupantUid) ?? null;
  }
}
