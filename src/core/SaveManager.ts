import {
  BASE_POPULATION_CAPACITY,
  GRID_SIZE,
  MIN_SUPPORTED_SAVE_VERSION,
  RESOURCE_ORDER,
  SAVE_KEY,
  SAVE_VERSION,
  TICKS_PER_SECOND,
} from '@/config/Constants';
import { allBuildings, clampLevel, getBuilding, isKnownBuildingId, levelOf } from '@/config/BuildingCatalog';
import { buildCostOf, resolveUpgradeOption } from '@/systems/BuildingResolver';
import type {
  BuildingConstruction,
  BuildingDefinition,
  BuildingInstance,
  BuildingState,
  ConstructionKind,
  ConstructionStatus,
  ResourceAmounts,
  ResourcePool,
  SaveData,
} from '@/types';
import type { GameState } from './GameState';

/**
 * Kaydi localStorage uzerinde yonetir.
 *
 * Iki katmanli dogrulamanin BIRINCI katmani buradadir: sema dogrulamasi.
 * Her alanin tipi tek tek kontrol edilir, eski surumler goc ettirilir.
 * IKINCI katman (izgara sinirlari, ayak izi cakismasi) GameState.fromSave
 * icindedir; cunku butunluk kontrolu izgarayi bilmeyi gerektirir.
 *
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

  /** Kaydi okur, goc ettirir ve dogrular. Kayit yok/bozuk ise null doner. */
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
      return migrateAndSanitize(JSON.parse(raw) as unknown);
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
 * Diskten gelen veriyi guncel semaya tasir ve dogrular.
 *
 * Kullanici tarafindan duzenlenmis olabilecegi icin her alan tek tek kontrol
 * edilir. Taninmayan bina turu, gecersiz seviye veya negatif isci gibi
 * degerler ya duzeltilir ya da kayit disi birakilir.
 */
export function migrateAndSanitize(input: unknown): SaveData | null {
  if (typeof input !== 'object' || input === null) return null;
  const data = input as Record<string, unknown>;

  const version = typeof data.version === 'number' ? data.version : 0;
  if (version < MIN_SUPPORTED_SAVE_VERSION || version > SAVE_VERSION) return null;
  if (typeof data.terrainSeed !== 'number' || !Number.isFinite(data.terrainSeed)) return null;
  if (!Array.isArray(data.buildings)) return null;

  const resources = sanitizeResources(data.resources);
  const tick =
    typeof data.tick === 'number' && Number.isFinite(data.tick) ? Math.max(0, Math.trunc(data.tick)) : 0;

  const buildings: BuildingInstance[] = [];
  let fallbackSequence = 0;
  for (const entry of data.buildings) {
    fallbackSequence += 1;
    const building = sanitizeBuilding(entry, version, tick, fallbackSequence);
    if (building) buildings.push(building);
  }

  return {
    version: SAVE_VERSION,
    savedAt: typeof data.savedAt === 'number' ? data.savedAt : Date.now(),
    tick,
    resources,
    buildings,
    terrainSeed: data.terrainSeed,
    population: sanitizePopulation(data.population, buildings),
  };
}

/**
 * Sehirde teorik olarak yasayabilecek en yuksek vatandas sayisi.
 *
 * Her karo, katalogdaki en cok barindiran binayla dolu olsa bile bu sayiyi
 * asamaz. Kurcalanmis kayitlari elemek icin MUTLAK bir ust sinir gerekir;
 * "guncel kapasite" bu is icin kullanilamaz (asagiya bakiniz).
 */
const MAX_CONCEIVABLE_POPULATION = (() => {
  let best = 0;
  for (const def of allBuildings()) {
    for (const entry of def.levels) {
      best = Math.max(best, entry.populationCapacity ?? 0);
    }
  }
  return BASE_POPULATION_CAPACITY + GRID_SIZE * GRID_SIZE * best;
})();

/**
 * Nufusu dogrular; alan yoksa eski kayittan turetir.
 *
 * Sprint 3 oncesi kayitlarda nufus diye bir sey yoktu: isci, kapasite
 * varsa ANINDA var sayiliyordu. O kaydi nufussuz yuklemek, oyuncunun
 * sehrini bir anda issiz birakirdi. Bu yuzden eski kayit icin o zamanki
 * ortuk deger yeniden kurulur: min(isci ihtiyaci, nufus kapasitesi).
 *
 * GUNCEL KAPASITEYE KIRPILMAZ. Nufusun kapasitenin ustunde olmasi gecerli
 * bir oyun durumudur: bir ev yikildiginda veya yukseltme icin insaata
 * girdiginde kapasite duser, vatandaslar ise yerinde kalir. Kapasiteye
 * kirpmak, kaydi her acisinda o fazlaligi sessizce silerdi.
 *
 * Kurcalamaya karsi MUTLAK sinir kullanilir. Zaten kapasitenin ustundeki
 * nufus oyuncuya avantaj degil YUK getirir (barinmaz ama yemek yer), bu
 * yuzden buradaki dogrulamanin isi absurt degerleri elemekten ibarettir.
 */
function sanitizePopulation(input: unknown, buildings: BuildingInstance[]): number {
  if (typeof input !== 'number' || !Number.isFinite(input)) {
    let capacity = BASE_POPULATION_CAPACITY;
    let workersNeeded = 0;
    for (const building of buildings) {
      if (building.state !== 'active') continue;
      const entry = levelOf(getBuilding(building.type), building.level);
      capacity += entry?.populationCapacity ?? 0;
      workersNeeded += entry?.workerRequirement ?? 0;
    }
    return Math.min(workersNeeded, capacity);
  }
  return Math.min(Math.max(0, Math.trunc(input)), MAX_CONCEIVABLE_POPULATION);
}

function sanitizeResources(input: unknown): ResourcePool {
  const source = (typeof input === 'object' && input !== null ? input : {}) as Record<string, unknown>;
  const resources = {} as ResourcePool;
  for (const key of RESOURCE_ORDER) {
    const value = source[key];
    resources[key] = typeof value === 'number' && Number.isFinite(value) ? Math.max(0, value) : 0;
  }
  return resources;
}

/**
 * Tek bir bina kaydini dogrular ve gerekiyorsa v1'den v2'ye goc ettirir.
 * Kurtarilamayacak bir kayitsa null doner.
 *
 * v1 -> v2 goc kurallari:
 *   defId              -> type
 *   complete: true     -> state: 'active'
 *   complete: false    -> state: 'constructing'
 *   remainingBuildTime -> construction.completesAtTick (kaydin tikine gore)
 */
function sanitizeBuilding(
  entry: unknown,
  version: number,
  saveTick: number,
  fallbackSequence: number,
): BuildingInstance | null {
  if (typeof entry !== 'object' || entry === null) return null;
  const raw = entry as Record<string, unknown>;

  if (typeof raw.uid !== 'string' || raw.uid.length === 0) return null;

  // v1 'defId' kullaniyordu; v2 'type'.
  const typeValue = typeof raw.type === 'string' ? raw.type : raw.defId;
  if (typeof typeValue !== 'string' || !isKnownBuildingId(typeValue)) return null;

  if (typeof raw.gx !== 'number' || !Number.isFinite(raw.gx)) return null;
  if (typeof raw.gy !== 'number' || !Number.isFinite(raw.gy)) return null;

  const def = getBuilding(typeValue);
  const level = clampLevel(def, typeof raw.level === 'number' ? raw.level : 1);

  const building: BuildingInstance = {
    uid: raw.uid,
    type: typeValue,
    gx: Math.trunc(raw.gx),
    gy: Math.trunc(raw.gy),
    level,
    state: 'active',
    assignedWorkers: sanitizeWorkers(raw.assignedWorkers),
  };

  if (version >= 2) {
    applyV2Construction(building, raw, saveTick, fallbackSequence, def);
  } else {
    applyV1Construction(building, raw, saveTick, fallbackSequence, def);
  }

  return building;
}

/**
 * v2 ve v3: state ve construction dogrudan okunur.
 *
 * v2'de gorev turu yoktu; o surumde yalnizca insa gorevi vardi, bu yuzden
 * eksik kind alani 'build' kabul edilir.
 *
 * Bozuk gorevler sessizce tasinmaz - kurtarilamayan bir gorev atilir ve bina
 * gorevsiz, tutarli bir duruma getirilir:
 *   - bilinmeyen kind
 *   - negatif tik
 *   - completesAtTick < startedAtTick
 *   - suresi coktan gecmis gorev
 */
function applyV2Construction(
  building: BuildingInstance,
  raw: Record<string, unknown>,
  saveTick: number,
  fallbackSequence: number,
  def: BuildingDefinition,
): void {
  const state = raw.state;
  if (isBuildingState(state)) {
    building.state = state;
  }

  const task = sanitizeConstruction(raw.construction, saveTick, fallbackSequence, def, building.level);

  if (!task) {
    // Gorev yok veya reddedildi: bina calisir duruma getirilir.
    if (building.state === 'constructing') building.state = 'active';
    return;
  }

  building.construction = task;
  // Gorev turu ile bina durumu tutarli olmali.
  // Kuyruktaki insa gorevi de bina calismadigi icin 'constructing' sayilir.
  building.state = task.kind === 'build' ? 'constructing' : 'active';
}

/**
 * Kayittan gelen gorevi dogrular; kurtarilamazsa null doner.
 *
 * Kuyruk alanlari (status, durationTicks, sequence) v3 icine geriye donuk
 * uyumlu eklendi: eksik olduklarinda eski kayittan turetilirler, bu yuzden
 * surum artirmaya gerek yoktur.
 *   status       -> 'active'  (kuyruk kavrami yoktu)
 *   durationTicks-> completesAtTick - startedAtTick
 *   sequence     -> fallbackSequence (yukleme sirasina gore kararli)
 */
function sanitizeConstruction(
  value: unknown,
  saveTick: number,
  fallbackSequence: number,
  def: BuildingDefinition,
  level: number,
): BuildingConstruction | null {
  if (typeof value !== 'object' || value === null) return null;
  const raw = value as Record<string, unknown>;

  // YOKLUK ile BOZUKLUK ayrilir.
  //
  // v2 kayitlarinda 'kind' alani hic yoktu ve o surumde yalnizca insa gorevi
  // olabilirdi; alan EKSIKSE 'build' varsaymak dogru bir goc adimidir.
  // Ama alan VARSA ve taninmayan bir degerse bu bozuk kayittir: sessizce
  // 'build' kabul etmek, oyuncunun parasini odedigi bir yukseltmeyi seviye
  // artirmayan bir insaata cevirirdi. Bozuk gorev atilir, bina tutarli
  // duruma getirilir.
  if (raw.kind !== undefined && !isConstructionKind(raw.kind)) return null;
  if (raw.status !== undefined && !isConstructionStatus(raw.status)) return null;

  const kind: ConstructionKind = isConstructionKind(raw.kind) ? raw.kind : 'build';
  const status: ConstructionStatus = isConstructionStatus(raw.status) ? raw.status : 'active';

  const sequence =
    typeof raw.sequence === 'number' && Number.isFinite(raw.sequence) && raw.sequence >= 0
      ? Math.trunc(raw.sequence)
      : fallbackSequence;

  const paidCost = sanitizePaidCost(raw.paidCost) ?? recoverPaidCost(def, level, kind);

  if (status === 'queued') {
    // Kuyruktaki gorevin suresi bilinmek zorunda; yoksa kurtarilamaz.
    const duration = raw.durationTicks;
    if (typeof duration !== 'number' || !Number.isFinite(duration) || duration <= 0) return null;

    return {
      kind,
      status: 'queued',
      durationTicks: Math.trunc(duration),
      sequence,
      paidCost,
      startedAtTick: null,
      completesAtTick: null,
    };
  }

  const started = raw.startedAtTick;
  const completes = raw.completesAtTick;
  if (typeof started !== 'number' || !Number.isFinite(started)) return null;
  if (typeof completes !== 'number' || !Number.isFinite(completes)) return null;

  const startedAtTick = Math.trunc(started);
  const completesAtTick = Math.trunc(completes);

  // Negatif tik, ters siralama veya suresi gecmis gorev kabul edilmez.
  if (startedAtTick < 0 || completesAtTick < 0) return null;
  if (completesAtTick < startedAtTick) return null;
  if (completesAtTick <= saveTick) return null;

  const duration =
    typeof raw.durationTicks === 'number' && Number.isFinite(raw.durationTicks) && raw.durationTicks > 0
      ? Math.trunc(raw.durationTicks)
      : completesAtTick - startedAtTick;

  return {
    kind,
    status: 'active',
    durationTicks: duration,
    sequence,
    paidCost,
    startedAtTick,
    completesAtTick,
  };
}

/** Kayittaki odenen maliyeti dogrular; yoksa/gecersizse null. */
function sanitizePaidCost(value: unknown): ResourceAmounts | null {
  if (typeof value !== 'object' || value === null) return null;
  const source = value as Record<string, unknown>;

  const cost: ResourceAmounts = {};
  let found = false;
  for (const key of RESOURCE_ORDER) {
    const amount = source[key];
    if (typeof amount === 'number' && Number.isFinite(amount) && amount > 0) {
      cost[key] = Math.floor(amount);
      found = true;
    }
  }
  return found ? cost : null;
}

/**
 * paidCost alani olmayan eski kayitlar icin maliyeti katalogdan kurtarir.
 *
 * Uydurma bir deger URETILMEZ: bu, alan eklenmeden onceki kodun iadeyi zaten
 * hesapladigi degerin BIREBIR aynisidir. Dolayisiyla eski kayitlarda iptal
 * iadesi degismez. Yalnizca bu kayitlar, katalog dengesi sonradan degisirse
 * yeni fiyattan etkilenmeye devam eder; yeni gorevler etkilenmez.
 */
function recoverPaidCost(
  def: BuildingDefinition,
  level: number,
  kind: ConstructionKind,
): ResourceAmounts {
  if (kind === 'build') return buildCostOf(def);
  return resolveUpgradeOption(def, level)?.cost ?? {};
}

/** v1: complete + remainingBuildTime (saniye) alanlarindan tureti. */
function applyV1Construction(
  building: BuildingInstance,
  raw: Record<string, unknown>,
  saveTick: number,
  fallbackSequence: number,
  def: BuildingDefinition,
): void {
  if (raw.complete === true) {
    building.state = 'active';
    return;
  }

  const remainingSeconds =
    typeof raw.remainingBuildTime === 'number' && Number.isFinite(raw.remainingBuildTime)
      ? Math.max(0, raw.remainingBuildTime)
      : 0;

  if (remainingSeconds <= 0) {
    building.state = 'active';
    return;
  }

  const remainingTicks = Math.max(1, Math.round(remainingSeconds * TICKS_PER_SECOND));
  building.state = 'constructing';
  building.construction = {
    kind: 'build',
    status: 'active',
    durationTicks: remainingTicks,
    sequence: fallbackSequence,
    // v1'de odenen maliyet saklanmiyordu; katalogdan kurtariliyor.
    paidCost: buildCostOf(def),
    startedAtTick: saveTick,
    completesAtTick: saveTick + remainingTicks,
  };
}

function sanitizeWorkers(value: unknown): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) return 0;
  // Negatif isci anlamsizdir; kayit kurcalanmis olabilir.
  return Math.max(0, Math.trunc(value));
}

function isBuildingState(value: unknown): value is BuildingState {
  return value === 'constructing' || value === 'active' || value === 'disabled' || value === 'damaged';
}

function isConstructionKind(value: unknown): value is ConstructionKind {
  return value === 'build' || value === 'upgrade';
}

function isConstructionStatus(value: unknown): value is ConstructionStatus {
  return value === 'queued' || value === 'active';
}
