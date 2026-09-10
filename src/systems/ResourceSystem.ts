import { BASE_STORAGE_CAPACITY, RESOURCE_ORDER } from '@/config/Constants';
import { getBuilding } from '@/config/BuildingCatalog';
import { resolveBuilding } from './BuildingResolver';
import type { EventBus } from '@/core/EventBus';
import type { GameState } from '@/core/GameState';
import type { ResourceAmounts, ResourceKey, ResourcePool } from '@/types';

/**
 * Kaynak havuzunu yoneten sistem: harcama, ekleme ve depo siniri.
 * Kaynaklarin degistigi tek yer burasidir; boylece arayuz tek bir olayla
 * guncel kalir.
 */
export class ResourceSystem {
  private readonly state: GameState;
  private readonly bus: EventBus;
  private cachedCapacity = BASE_STORAGE_CAPACITY;

  constructor(state: GameState, bus: EventBus) {
    this.state = state;
    this.bus = bus;
    this.recalculateCapacity();
  }

  /** Kaynak turu basina gecerli depo kapasitesi. */
  get capacity(): number {
    return this.cachedCapacity;
  }

  /** Mevcut kaynaklarin salt okunur kopyasi. */
  snapshot(): ResourcePool {
    return { ...this.state.resources };
  }

  /**
   * Calisir durumdaki depo binalarina gore kapasiteyi yeniden hesaplar.
   * Kapasite degeri resolver'dan gelir; burada seviye/durum mantigi tekrarlanmaz.
   */
  recalculateCapacity(): number {
    let capacity = BASE_STORAGE_CAPACITY;
    for (const building of this.state.buildings.values()) {
      const resolved = resolveBuilding(building, getBuilding(building.type), this.state.tick);
      capacity += resolved.storageCapacity;
    }
    this.cachedCapacity = capacity;
    return capacity;
  }

  /** Verilen maliyetin karsilanip karsilanamayacagini kontrol eder. */
  canAfford(cost: ResourceAmounts): boolean {
    return RESOURCE_ORDER.every((key) => this.state.resources[key] >= (cost[key] ?? 0));
  }

  /**
   * Maliyeti duser. Yetersiz kaynak varsa hicbir sey harcamaz ve false doner
   * (kismi harcama yaparak oyuncuyu zarara sokmaz).
   */
  spend(cost: ResourceAmounts): boolean {
    if (!this.canAfford(cost)) return false;
    for (const key of RESOURCE_ORDER) {
      const amount = cost[key] ?? 0;
      if (amount === 0) continue;
      this.state.setResource(key, this.state.resources[key] - amount);
    }
    this.emitChange();
    return true;
  }

  /** Kaynak ekler; depo sinirini asan miktar kaybolur. */
  add(amounts: ResourceAmounts): void {
    this.applyDelta(amounts, 1);
    this.emitChange();
  }

  /** Kaynak dusurur; sifirin altina inmez. */
  subtract(amounts: ResourceAmounts): void {
    this.applyDelta(amounts, -1);
    this.emitChange();
  }

  /**
   * Tick basina uygulanan net degisim.
   * Sik cagrildigi icin olayi disaridan tetiklemek uzere emit parametresi alir.
   */
  applyDelta(amounts: ResourceAmounts, sign: 1 | -1 = 1): void {
    for (const key of RESOURCE_ORDER) {
      const delta = (amounts[key] ?? 0) * sign;
      if (delta === 0) continue;
      this.state.setResource(key, clamp(this.state.resources[key] + delta, 0, this.cachedCapacity));
    }
  }

  /** Tek bir kaynagin guncel miktari. */
  amountOf(key: ResourceKey): number {
    return this.state.resources[key];
  }

  /** Arayuze kaynaklarin degistigini bildirir. */
  emitChange(): void {
    this.bus.emit('resources:changed', this.snapshot(), this.cachedCapacity);
  }
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
