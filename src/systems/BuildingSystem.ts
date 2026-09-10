import { getBuilding } from '@/config/BuildingCatalog';
import { buildCostOf, buildTimeTicksOf, resolveBuilding, resolveRefund } from './BuildingResolver';
import type { EventBus } from '@/core/EventBus';
import type { GameState } from '@/core/GameState';
import type { ResourceSystem } from './ResourceSystem';
import type {
  BuildingDefinition,
  BuildingId,
  BuildingInstance,
  ResolvedBuilding,
} from '@/types';

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
  validate(type: BuildingId, gx: number, gy: number): ValidationResult {
    const def = getBuilding(type);

    // countOf artik tur indeksinden O(1) okur; koleksiyonu taramaz.
    if (def.maxCount !== undefined && this.state.countOf(type) >= def.maxCount) {
      return { ok: false, reason: 'max_count' };
    }

    const cells = this.state.grid.footprint(gx, gy, def.size);
    if (!cells) return { ok: false, reason: 'out_of_bounds' };
    if (cells.some((tile) => tile.occupantUid !== null)) return { ok: false, reason: 'occupied' };
    if (cells.some((tile) => !def.allowedTerrain.includes(tile.terrain))) {
      return { ok: false, reason: 'terrain' };
    }
    if (!this.resources.canAfford(buildCostOf(def))) return { ok: false, reason: 'cost' };

    return { ok: true };
  }

  /** Binayi kurar: maliyeti duser, izgarayi isgal eder ve insaati baslatir. */
  place(type: BuildingId, gx: number, gy: number): PlacementResult {
    const check = this.validate(type, gx, gy);
    if (!check.ok) return check;

    const def = getBuilding(type);
    if (!this.resources.spend(buildCostOf(def))) {
      return { ok: false, reason: 'cost' };
    }

    const buildTicks = buildTimeTicksOf(def);
    const startedAtTick = this.state.tick;

    const building: BuildingInstance = {
      uid: this.state.nextUid(type),
      type,
      gx,
      gy,
      level: 1,
      state: buildTicks > 0 ? 'constructing' : 'active',
      assignedWorkers: 0,
    };

    if (buildTicks > 0) {
      building.construction = {
        startedAtTick,
        completesAtTick: startedAtTick + buildTicks,
      };
    }

    this.state.addBuilding(building);
    this.state.grid.occupy(gx, gy, def.size, building.uid);
    this.bus.emit('building:placed', building);

    // Insa suresi olmayan bina aninda devreye girer.
    if (building.state === 'active') {
      this.onBuildingActivated(building);
    }
    return { ok: true, building };
  }

  /**
   * Binayi yikar ve o ana kadar yatirilan kaynagin yarisini geri verir.
   * Insaat halindeki binalar da yikilabilir.
   */
  demolish(uid: string): boolean {
    const building = this.state.buildings.get(uid);
    if (!building) return false;

    const def = getBuilding(building.type);
    // Iade, seviyeye gore yatirilan toplamdan hesaplanir - tek kaynak resolver.
    const refund = resolveRefund(def, building.level);

    this.state.removeBuilding(uid);
    this.resources.recalculateCapacity();
    this.resources.add(refund);
    this.bus.emit('building:removed', building);
    return true;
  }

  /**
   * Insaati biten binayi aktif hale getirir.
   * EconomySystem, tik esigi gectiginde burayi cagirir.
   */
  completeBuilding(building: BuildingInstance): void {
    building.state = 'active';
    delete building.construction;
    this.onBuildingActivated(building);
  }

  /** Bir bina ornegine ait statik tanimi dondurur. */
  definitionOf(building: BuildingInstance): BuildingDefinition {
    return getBuilding(building.type);
  }

  /** Bir bina ornegini hesaplanmis degerleriyle birlikte dondurur. */
  resolve(building: BuildingInstance): ResolvedBuilding {
    return resolveBuilding(building, getBuilding(building.type), this.state.tick);
  }

  /** Bina devreye girdiginde kapasiteyi tazeler ve haber verir. */
  private onBuildingActivated(building: BuildingInstance): void {
    this.resources.recalculateCapacity();
    this.resources.emitChange();
    this.bus.emit('building:completed', building);
  }

  /** Verilen hucreyi kaplayan binayi dondurur; bossa null. */
  buildingAt(gx: number, gy: number): BuildingInstance | null {
    const tile = this.state.grid.getTile(gx, gy);
    if (!tile?.occupantUid) return null;
    return this.state.buildings.get(tile.occupantUid) ?? null;
  }
}
