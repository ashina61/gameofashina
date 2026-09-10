import { getBuilding } from '@/config/BuildingCatalog';
import { resolveUpgradeOption } from './BuildingResolver';
import type { GameState } from '@/core/GameState';
import type { ConstructionSystem } from './ConstructionSystem';
import type { ResourceSystem } from './ResourceSystem';
import type { ConstructionTask, ResourceAmounts, UpgradeOption } from '@/types';

/** Yukseltmenin neden reddedildigini anlatan hata kodlari. */
export type UpgradeError = 'unknown_building' | 'max_level' | 'busy' | 'cost';

/** Yukseltme kontrolunun sonucu. */
export type UpgradeCheck =
  | { ok: true; option: UpgradeOption }
  | { ok: false; reason: UpgradeError };

/** Yukseltme denemesinin sonucu. */
export type UpgradeResult =
  | { ok: true; task: ConstructionTask | null; cost: ResourceAmounts }
  | { ok: false; reason: UpgradeError };

/** Hata kodlarinin kullaniciya gosterilecek karsiliklari. */
export const UPGRADE_MESSAGES: Record<UpgradeError, string> = {
  unknown_building: 'Bina bulunamadi.',
  max_level: 'Bu bina en yuksek seviyede.',
  busy: 'Bu binada zaten bir insaat suruyor.',
  cost: 'Yeterli kaynagin yok.',
};

/**
 * Bina yukseltmelerini yoneten sistem.
 *
 * Kurallari dogrular, maliyeti duser ve isin kendisini ConstructionSystem'e
 * devreder. Sure dolunca seviyeyi artirmak ConstructionSystem'in isidir;
 * burada zamanla ilgili hicbir sey yoktur.
 *
 * Maliyet ve sure BuildingResolver'dan okunur; bu dosyada katalog matematigi
 * yapilmaz.
 */
export class UpgradeSystem {
  private readonly state: GameState;
  private readonly resources: ResourceSystem;
  private readonly construction: ConstructionSystem;

  constructor(state: GameState, resources: ResourceSystem, construction: ConstructionSystem) {
    this.state = state;
    this.resources = resources;
    this.construction = construction;
  }

  /**
   * Yukseltmenin mumkun olup olmadigini kaynak kontrolu dahil dogrular.
   * Arayuz butonu da bunu kullanir; kural tek yerde durur.
   */
  canUpgrade(uid: string): UpgradeCheck {
    const building = this.state.buildings.get(uid);
    if (!building) return { ok: false, reason: 'unknown_building' };

    // Devam eden insaat/yukseltme varken yenisi baslatilamaz.
    if (this.construction.isBusy(uid)) return { ok: false, reason: 'busy' };

    const option = resolveUpgradeOption(getBuilding(building.type), building.level);
    if (!option) return { ok: false, reason: 'max_level' };

    if (!this.resources.canAfford(option.cost)) return { ok: false, reason: 'cost' };

    return { ok: true, option };
  }

  /**
   * Yukseltmeyi baslatir: maliyeti duser ve gorevi kuyruga koyar.
   * Seviye burada DEGISMEZ; gorev tamamlaninca artar.
   */
  requestUpgrade(uid: string): UpgradeResult {
    const check = this.canUpgrade(uid);
    if (!check.ok) return check;

    if (!this.resources.spend(check.option.cost)) {
      return { ok: false, reason: 'cost' };
    }

    const task = this.construction.startUpgrade(uid, check.option.timeTicks);
    return { ok: true, task, cost: check.option.cost };
  }

  /** Bir binanin sonraki seviye secenegi; yoksa null. */
  optionFor(uid: string): UpgradeOption | null {
    const building = this.state.buildings.get(uid);
    if (!building) return null;
    return resolveUpgradeOption(getBuilding(building.type), building.level);
  }

}
