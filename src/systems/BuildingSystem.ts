import { getBuilding } from '@/config/BuildingCatalog';
import {
  buildCostOf,
  buildTimeTicksOf,
  resolveBuilding,
  resolveRefund,
  resolveTaskRefund,
} from './BuildingResolver';
import type { BuildingPlotSystem } from './BuildingPlotSystem';
import type { EventBus } from '@/core/EventBus';
import type { GameState } from '@/core/GameState';
import type { ConstructionSystem } from './ConstructionSystem';
import type { ResourceSystem } from './ResourceSystem';
import type {
  BuildingDefinition,
  BuildingId,
  BuildingInstance,
  ResolvedBuilding,
  ResourceAmounts,
  BuildingPlot,
} from '@/types';

/** hedef += kaynak */
function addInto(target: ResourceAmounts, source: ResourceAmounts): void {
  for (const [key, value] of Object.entries(source)) {
    const k = key as keyof ResourceAmounts;
    target[k] = (target[k] ?? 0) + (value ?? 0);
  }
}

/** Yerlestirmenin neden reddedildigini anlatan hata kodlari. */
export type PlacementError =
  | 'out_of_bounds'
  | 'occupied'
  | 'terrain'
  | 'cost'
  | 'max_count'
  | 'needs_water'
  | 'no_plot';

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
  needs_water: 'Liman kiyiya kurulur - suya komsu bir alan sec.',
  no_plot: 'Bu bina buraya kurulamaz - uygun yapi alani sec.',
};

/**
 * Bina yerlestirme ve yikma islemlerini yoneten sistem.
 *
 * Izgara isgali, maliyet ve kural kontrolleri burada toplanir. Insaatin
 * ZAMANLA ilerlemesi bu sistemin isi degildir; yerlestirme tamamlanir
 * tamamlanmaz is ConstructionSystem'e devredilir.
 */
export class BuildingSystem {
  private readonly state: GameState;
  private readonly resources: ResourceSystem;
  private readonly construction: ConstructionSystem;
  private readonly bus: EventBus;

  private readonly plots: BuildingPlotSystem;

  constructor(
    state: GameState,
    resources: ResourceSystem,
    construction: ConstructionSystem,
    bus: EventBus,
    plots: BuildingPlotSystem,
  ) {
    this.state = state;
    this.resources = resources;
    this.construction = construction;
    this.bus = bus;
    this.plots = plots;
  }

  /** Verilen tur icin insa edilebilir yapi alanlari. */
  availablePlots(type: BuildingId): BuildingPlot[] {
    return this.plots.availableFor(type);
  }

  /** Verilen karoyu iceren yapi alani; sokak ya da bos alansa null. */
  plotAt(gx: number, gy: number): BuildingPlot | null {
    return this.plots.plotAt(gx, gy);
  }

  /**
   * Yerlestirmenin gecerli olup olmadigini, kaynak kontrolu dahil dogrular.
   * Yerlestirme onizlemesi de bu fonksiyonu kullanir; kural tek yerde durur.
   */
  /** Karonun dort komsusundan biri su mu? (kiyi kurali) */
  private touchesWater(gx: number, gy: number): boolean {
    for (const [dx, dy] of [
      [0, -1],
      [1, 0],
      [0, 1],
      [-1, 0],
    ]) {
      if (this.state.grid.getTile(gx + dx, gy + dy)?.terrain === 'water') return true;
    }
    return false;
  }

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

    /*
     * KIYI KURALI
     *
     * Liman kara karosunda durur ama dort komsusundan biri su olmalidir.
     * Kontrol ayak izinin TAMAMI icin degil, HERHANGI bir karosu icin
     * yapilir: 1x1'den buyuk bir kiyi yapisinda da tek bir kiyi temasi
     * yeterlidir.
     */
    if (def.requiresWaterAdjacent && !cells.some((tile) => this.touchesWater(tile.gx, tile.gy))) {
      return { ok: false, reason: 'needs_water' };
    }

    /*
     * YAPI ALANI KURALI
     *
     * Bina artik uygun herhangi bir karoya degil, sehrin belirlenmis yapi
     * alanlarina kurulur. Alan kontrolu zemin ve doluluk kontrollerinden
     * SONRA gelir ki oyuncu daha acik bir hata gorsun ("bu zemine
     * kurulamaz" > "uygun alan sec").
     *
     * Plotun kendi basladigi karo istenir: 2x2 sehir merkezi plotunun
     * ortasina dokunup binayi kaydirmak yerlesimi bozardi.
     */
    const plot = this.plots.plotAt(gx, gy);
    if (!plot) return { ok: false, reason: 'no_plot' };
    if (!this.plots.accepts(plot, type)) return { ok: false, reason: 'no_plot' };
    if (plot.gx !== gx || plot.gy !== gy) return { ok: false, reason: 'no_plot' };

    if (!this.resources.canAfford(buildCostOf(def))) return { ok: false, reason: 'cost' };

    return { ok: true };
  }

  /** Binayi kurar: maliyeti duser, izgarayi isgal eder ve insaati baslatir. */
  place(type: BuildingId, gx: number, gy: number): PlacementResult {
    const check = this.validate(type, gx, gy);
    if (!check.ok) return check;

    const def = getBuilding(type);

    // ATOMIKLIK: once bina olusturulur ve izgaraya yazilir, sonra gorev
    // talep edilir. Gorev talebi bu noktada basarisiz OLAMAZ (bina yeni, mesgul
    // degil); yine de basarisiz olursa her sey geri alinir ve kaynak harcanmaz.
    const building: BuildingInstance = {
      uid: this.state.nextUid(type),
      type,
      gx,
      gy,
      level: 1,
      // Gorev baslatilana kadar gecici durum; ConstructionSystem hemen ayarlar.
      state: 'active',
      assignedWorkers: 0,
    };

    this.state.addBuilding(building);
    this.state.grid.occupy(gx, gy, def.size, building.uid);

    const cost = buildCostOf(def);
    const request = this.construction.requestBuild(building, buildTimeTicksOf(def), cost);
    if (!request.ok) {
      // Yarim durum birakma: binayi geri al.
      this.state.removeBuilding(building.uid);
      return { ok: false, reason: 'cost' };
    }

    // Maliyet ancak gorev kesinlestikten sonra dusulur; goreve yazilan
    // paidCost ile burada dusulen tutar ayni degerdir.
    if (!this.resources.spend(cost)) {
      this.construction.cancel(building.uid, { refundResources: false });
      this.state.removeBuilding(building.uid);
      return { ok: false, reason: 'cost' };
    }

    this.bus.emit('building:placed', building);
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

    // Devam eden gorev varsa birlikte iptal edilir; sahipsiz gorev kalmaz.
    // Kaynak iadesini burada tek elden yapiyoruz ki cift iade olmasin.
    const cancelled = this.construction.cancel(uid, { refundResources: false });
    const task = cancelled?.task ?? null;

    // Tamamlanmis seviyelerin iadesi: yatirilan toplamin yarisi.
    const refund = resolveRefund(def, building.level);

    if (task?.kind === 'build') {
      // Bina hic tamamlanmadi. Kuyrukta bekliyorduysa hicbir is yapilmadigi
      // icin tam iade; aktif insaatta yikim orani (yarisi) gecerli.
      // Iade, odenen maliyetten hesaplanir.
      const buildRefund = resolveTaskRefund(task.paidCost, task.status);
      this.state.removeBuilding(uid);
      this.resources.recalculateCapacity();
      this.resources.add(buildRefund);
    } else {
      // Tamamlanmis bina; ayrica devam eden bir yukseltme varsa onun da iadesi.
      if (task?.kind === 'upgrade') {
        addInto(refund, resolveTaskRefund(task.paidCost, task.status));
      }
      this.state.removeBuilding(uid);
      this.resources.recalculateCapacity();
      this.resources.add(refund);
    }

    this.bus.emit('building:removed', building);
    return true;
  }

  /** Bir bina ornegine ait statik tanimi dondurur. */
  definitionOf(building: BuildingInstance): BuildingDefinition {
    return getBuilding(building.type);
  }

  /** Bir bina ornegini hesaplanmis degerleriyle birlikte dondurur. */
  resolve(building: BuildingInstance): ResolvedBuilding {
    return resolveBuilding(building, getBuilding(building.type), this.state.tick);
  }

  /** Verilen hucreyi kaplayan binayi dondurur; bossa null. */
  buildingAt(gx: number, gy: number): BuildingInstance | null {
    const tile = this.state.grid.getTile(gx, gy);
    if (!tile?.occupantUid) return null;
    return this.state.buildings.get(tile.occupantUid) ?? null;
  }
}
