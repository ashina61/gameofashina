import { RESOURCE_ORDER, SAVE_KEY, SAVE_VERSION } from '@/config/Constants';
import { isKnownBuildingId } from '@/config/BuildingCatalog';
import type { BuildingInstance, ResourcePool, SaveData } from '@/types';
import type { GameState } from './GameState';

/**
 * Kaydi localStorage uzerinde yonetir.
 * Depolama erisimi gizli sekmelerde veya kota dolulugunda hata firlatabilir,
 * bu yuzden tum erisimler try/catch ile korunur ve oyun kayitsiz da calisir.
 */
export class SaveManager {
  private readonly key: string;

  constructor(key: string = SAVE_KEY) {
    this.key = key;
  }

  /** Oyun durumunu diske yazar. Basarisiz olursa false doner. */
  save(state: GameState): boolean {
    try {
      const payload = state.toSave(SAVE_VERSION);
      window.localStorage.setItem(this.key, JSON.stringify(payload));
      return true;
    } catch (error) {
      console.warn('[SaveManager] Kayit yazilamadi:', error);
      return false;
    }
  }

  /** Kaydi okur ve dogrular. Kayit yok/bozuk/eski ise null doner. */
  load(): SaveData | null {
    let raw: string | null = null;
    try {
      raw = window.localStorage.getItem(this.key);
    } catch (error) {
      console.warn('[SaveManager] Kayit okunamadi:', error);
      return null;
    }
    if (!raw) return null;

    try {
      return sanitize(JSON.parse(raw) as unknown);
    } catch (error) {
      console.warn('[SaveManager] Kayit cozumlenemedi, sifirlaniyor:', error);
      this.clear();
      return null;
    }
  }

  /** Kaydi siler. */
  clear(): void {
    try {
      window.localStorage.removeItem(this.key);
    } catch (error) {
      console.warn('[SaveManager] Kayit silinemedi:', error);
    }
  }
}

/**
 * Diskten gelen veriyi dogrular.
 * Kullanici tarafindan duzenlenmis olabilecegi icin her alan tek tek kontrol
 * edilir; beklenmeyen bir sey gorulurse kayit reddedilir.
 */
function sanitize(input: unknown): SaveData | null {
  if (typeof input !== 'object' || input === null) return null;
  const data = input as Partial<SaveData>;

  if (data.version !== SAVE_VERSION) return null;
  if (typeof data.terrainSeed !== 'number' || !Number.isFinite(data.terrainSeed)) return null;
  if (!Array.isArray(data.buildings)) return null;

  const resources = {} as ResourcePool;
  for (const key of RESOURCE_ORDER) {
    const value = (data.resources as ResourcePool | undefined)?.[key];
    resources[key] = typeof value === 'number' && Number.isFinite(value) ? Math.max(0, value) : 0;
  }

  const buildings: BuildingInstance[] = [];
  for (const entry of data.buildings) {
    const b = entry as Partial<BuildingInstance>;
    if (typeof b.uid !== 'string' || typeof b.defId !== 'string') continue;
    if (!isKnownBuildingId(b.defId)) continue;
    if (typeof b.gx !== 'number' || typeof b.gy !== 'number') continue;
    buildings.push({
      uid: b.uid,
      defId: b.defId,
      gx: Math.trunc(b.gx),
      gy: Math.trunc(b.gy),
      level: typeof b.level === 'number' ? Math.max(1, Math.trunc(b.level)) : 1,
      complete: b.complete === true,
      remainingBuildTime:
        typeof b.remainingBuildTime === 'number' && Number.isFinite(b.remainingBuildTime)
          ? Math.max(0, b.remainingBuildTime)
          : 0,
    });
  }

  return {
    version: SAVE_VERSION,
    savedAt: typeof data.savedAt === 'number' ? data.savedAt : Date.now(),
    resources,
    buildings,
    terrainSeed: data.terrainSeed,
  };
}
