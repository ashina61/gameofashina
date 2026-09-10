import { CANCEL_REFUND_RATE, TICKS_PER_SECOND } from '@/config/Constants';
import { clampLevel, levelOf, maxLevelOf } from '@/config/BuildingCatalog';
import type {
  BuildPreview,
  BuildingConstruction,
  ConstructionKind,
  ConstructionStatus,
  BuildingDefinition,
  BuildingInstance,
  BuildingLevel,
  ConstructionProgress,
  ResourceAmounts,
  ResolvedBuilding,
  UpgradeOption,
} from '@/types';

/**
 * Bina hesaplarinin TEK kaynagi.
 *
 * Uretim, kapasite, isci ihtiyaci, yikim iadesi ve yukseltme maliyeti burada
 * hesaplanir. Ekonomi, kaynak sistemi, insa menusu ve bilgi paneli hep buradan
 * okur; hicbiri kendi hesabini yapmaz. Bir denge kurali degistiginde
 * degistirilecek tek yer burasidir.
 *
 * Tum fonksiyonlar saftir: ayni girdi her zaman ayni ciktiyi verir, disariya
 * hicbir yan etkileri yoktur ve girdilerini degistirmezler.
 */

/** Saniyeyi tam tik sayisina cevirir. */
export function secondsToTicks(seconds: number): number {
  return Math.max(0, Math.round(seconds * TICKS_PER_SECOND));
}

/** Tik sayisini saniyeye cevirir (arayuzde sure gostermek icin). */
export function ticksToSeconds(ticks: number): number {
  return ticks / TICKS_PER_SECOND;
}

/**
 * Bir bina ornegini, tanimi ve gecerli simulasyon tiki ile birlestirip
 * kullanima hazir degerler uretir.
 */
export function resolveBuilding(
  instance: BuildingInstance,
  def: BuildingDefinition,
  currentTick: number,
): ResolvedBuilding {
  const level = clampLevel(def, instance.level);
  const entry = levelOf(def, level);
  const operational = instance.state === 'active';

  const construction = instance.construction
    ? constructionProgress(instance.construction, currentTick)
    : null;
  const workerRequirement = entry?.workerRequirement ?? 0;

  return {
    uid: instance.uid,
    type: instance.type,
    name: def.name,
    size: def.size,
    level,
    maxLevel: maxLevelOf(def),
    state: instance.state,
    operational,
    // Calismayan bina hicbir sey uretmez ve kapasite saglamaz.
    production: operational ? copyAmounts(entry?.production) : {},
    storageCapacity: operational ? (entry?.storageCapacity ?? 0) : 0,
    populationCapacity: operational ? (entry?.populationCapacity ?? 0) : 0,
    workerRequirement,
    assignedWorkers: instance.assignedWorkers,
    // Bilgilendirme amaclidir; isci dagitimi hala kuresel havuzdan yapiliyor,
    // bu yuzden uretimi etkilemez. PopulationSystem geldiginde baglanacak.
    staffed: workerRequirement === 0 || instance.assignedWorkers >= workerRequirement,
    refund: resolveRefund(def, level),
    construction,
    // Devam eden bir gorev varken yeni bir yukseltme baslatilamaz.
    upgrade: construction ? null : resolveUpgrade(def, level),
  };
}

/**
 * Devam eden gorevin ilerlemesini hesaplar.
 *
 * Bilerek cok ucuz tutuldu: nesne kopyalamaz, katalog okumaz, seviye
 * tablosunu taramaz. Render katmani her karede yalnizca AKTIF gorevler icin
 * bunu cagirir; tam resolveBuilding() cagirmak o dongude cok pahali olur.
 */
export function constructionProgress(
  construction: BuildingConstruction,
  currentTick: number,
): ConstructionProgress {
  const { kind, status, durationTicks, startedAtTick, completesAtTick } = construction;

  // Kuyruktaki gorevde zaman islemez: ilerleme sifir, kalan sure tam sure.
  if (status === 'queued' || startedAtTick === null || completesAtTick === null) {
    return {
      kind,
      status: 'queued',
      remainingTicks: durationTicks,
      totalTicks: durationTicks,
      ratio: 0,
    };
  }

  const totalTicks = Math.max(0, completesAtTick - startedAtTick);
  const remainingTicks = Math.max(0, completesAtTick - currentTick);
  const ratio = totalTicks > 0 ? clamp01(1 - remainingTicks / totalTicks) : 1;

  return { kind, status: 'active', remainingTicks, totalTicks, ratio };
}

/**
 * Gorev iptalinde geri verilecek kaynaklar.
 *
 * Kuyruktaki gorev hic baslamadigi icin tam, aktif gorev yikimdaki oranla
 * (yarisi) iade edilir. Temel maliyet katalogdan degil buradan okunur.
 */
export function resolveTaskRefund(
  def: BuildingDefinition,
  level: number,
  kind: ConstructionKind,
  status: ConstructionStatus,
): ResourceAmounts {
  const base = kind === 'build' ? buildCostOf(def) : (resolveUpgradeOption(def, level)?.cost ?? {});
  const rate = CANCEL_REFUND_RATE[status];

  const refund: ResourceAmounts = {};
  for (const [key, value] of Object.entries(base)) {
    refund[key as keyof ResourceAmounts] = Math.floor((value ?? 0) * rate);
  }
  return refund;
}

/**
 * Bir sonraki seviyeye gecis maliyeti ve suresi.
 * UpgradeSystem maliyeti buradan okur; katalogdan kendi hesabini yapmaz.
 */
export function resolveUpgradeOption(
  def: BuildingDefinition,
  level: number,
): UpgradeOption | null {
  return resolveUpgrade(def, clampLevel(def, level));
}

/**
 * Henuz kurulmamis bir bina turunun insa onizlemesi.
 * Insa menusu maliyet ve sureyi buradan okur; katalogdan dogrudan okumaz.
 */
export function resolveBuildPreview(def: BuildingDefinition): BuildPreview {
  const first = levelOf(def, 1);
  return {
    type: def.id,
    name: def.name,
    description: def.description,
    size: def.size,
    cost: copyAmounts(first?.buildCost),
    buildTimeTicks: secondsToTicks(first?.buildTime ?? 0),
    production: copyAmounts(first?.production),
    workerRequirement: first?.workerRequirement ?? 0,
    populationCapacity: first?.populationCapacity ?? 0,
    storageCapacity: first?.storageCapacity ?? 0,
  };
}

/** Sifirdan insa maliyeti. */
export function buildCostOf(def: BuildingDefinition): ResourceAmounts {
  return copyAmounts(levelOf(def, 1)?.buildCost);
}

/** Sifirdan insa suresi (tik). */
export function buildTimeTicksOf(def: BuildingDefinition): number {
  return secondsToTicks(levelOf(def, 1)?.buildTime ?? 0);
}

/**
 * Yikimda geri verilen kaynaklar: o ana kadar yatirilan toplamin yarisi.
 * Seviye 3 bir bina, insa maliyeti + iki yukseltme maliyetinin yarisini iade eder.
 */
export function resolveRefund(def: BuildingDefinition, level: number): ResourceAmounts {
  const invested: ResourceAmounts = {};
  const capped = clampLevel(def, level);

  for (const entry of def.levels) {
    if (entry.level > capped) continue;
    addInto(invested, entry.buildCost);
    addInto(invested, entry.upgradeCost);
  }

  const refund: ResourceAmounts = {};
  for (const [key, value] of Object.entries(invested)) {
    refund[key as keyof ResourceAmounts] = Math.floor((value ?? 0) * 0.5);
  }
  return refund;
}

/** Sonraki seviye katalogda tanimliysa maliyeti ve suresi. */
function resolveUpgrade(def: BuildingDefinition, level: number): UpgradeOption | null {
  const next = levelOf(def, level + 1);
  if (!next) return null;

  return {
    toLevel: next.level,
    cost: copyAmounts(next.upgradeCost),
    timeTicks: secondsToTicks(next.upgradeTime ?? 0),
  };
}

/** Kaynak haritasinin savunmaci kopyasi; cagiran taraf katalogu degistiremez. */
function copyAmounts(amounts: ResourceAmounts | undefined): ResourceAmounts {
  return amounts ? { ...amounts } : {};
}

/** hedef += kaynak */
function addInto(target: ResourceAmounts, source: ResourceAmounts | undefined): void {
  if (!source) return;
  for (const [key, value] of Object.entries(source)) {
    const k = key as keyof ResourceAmounts;
    target[k] = (target[k] ?? 0) + (value ?? 0);
  }
}

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}

/** Seviye tablosundan tek bir seviyeyi okumak isteyenler icin yeniden disa aktarim. */
export { levelOf, maxLevelOf, clampLevel };
export type { BuildingLevel };
