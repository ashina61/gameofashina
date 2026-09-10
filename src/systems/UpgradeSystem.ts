import { getBuilding } from '@/config/BuildingCatalog';
import { resolveUpgradeOption } from './BuildingResolver';
import type { GameState } from '@/core/GameState';
import type { ConstructionSystem } from './ConstructionSystem';
import type { ResourceSystem } from './ResourceSystem';
import type { ConstructionTask, ResourceAmounts, UpgradeOption } from '@/types';

/** Yukseltmenin neden reddedildigini anlatan hata kodlari. */
export type UpgradeError = 'unknown_building' | 'max_level' | 'busy' | 'cost';

/** Yukseltme iptalinin sonucu. */
export type CancelUpgradeResult =
  | { ok: true }
  | { ok: false; reason: 'unknown_building' | 'no_task' | 'not_upgrade' };

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
   * Yukseltmeyi baslatir: maliyeti duser ve gorevi baslatir veya kuyruga koyar.
   * Seviye burada DEGISMEZ; gorev tamamlaninca artar.
   *
   * ATOMIKLIK: once gorev talep edilir, maliyet ancak gorev kesinlestikten
   * sonra dusulur. Harcama basarisiz olursa gorev geri alinir; hicbir yolda
   * "kaynak gitti ama gorev yok" durumu olusamaz.
   */
  requestUpgrade(uid: string): UpgradeResult {
    const check = this.canUpgrade(uid);
    if (!check.ok) return check;

    const request = this.construction.requestUpgrade(uid, check.option.timeTicks);
    if (!request.ok) {
      // canUpgrade gecmisken buraya dusmek beklenmez; yine de kaynak harcanmaz.
      return { ok: false, reason: request.reason === 'unknown_building' ? 'unknown_building' : 'busy' };
    }

    if (!this.resources.spend(check.option.cost)) {
      // Suresiz yukseltme aninda uygulandigi icin geri alinamaz; bu yol yalnizca
      // canAfford ile spend arasinda kaynak degisirse mumkundur ve gorev iptal edilir.
      if (request.task) {
        this.construction.cancel(uid, { refundResources: false });
      }
      return { ok: false, reason: 'cost' };
    }

    return { ok: true, task: request.task, cost: check.option.cost };
  }

  /**
   * Devam eden yukseltmeyi iptal eder ve politikaya gore kaynak iade eder.
   * Bina seviyesi degismez.
   */
  cancelUpgrade(uid: string): CancelUpgradeResult {
    const building = this.state.buildings.get(uid);
    if (!building) return { ok: false, reason: 'unknown_building' };

    const task = this.construction.taskFor(uid);
    if (!task) return { ok: false, reason: 'no_task' };
    if (task.kind !== 'upgrade') return { ok: false, reason: 'not_upgrade' };

    this.construction.cancel(uid);
    return { ok: true };
  }

  /** Bir binanin sonraki seviye secenegi; yoksa null. */
  optionFor(uid: string): UpgradeOption | null {
    const building = this.state.buildings.get(uid);
    if (!building) return null;
    return resolveUpgradeOption(getBuilding(building.type), building.level);
  }

}
