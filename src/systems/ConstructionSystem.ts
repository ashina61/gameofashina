import {
  CANCEL_REFUND_RATE,
  MAX_COST_REDUCTION,
  REDUCTION_BUILDING_BONUS_PER_LEVEL,
} from '@/config/Constants';
import { getBuilding, requireBuilding } from '@/config/BuildingCatalog';
import { ikariamCost } from '@/config/Formulas';
import { buildingLevel, canBuildMore, freeGrounds } from '@/core/CityQuery';
import type { EventBus } from '@/core/EventBus';
import type { GameState } from '@/core/GameState';
import type { ResearchSystem } from './ResearchSystem';
import type { ResourceSystem } from './ResourceSystem';
import type { CitizenSystem } from './CitizenSystem';
import type {
  CityState,
  ConstructionTask,
  MaterialKey,
  PlacedBuilding,
  ResourceAmounts,
} from '@/types';

/**
 * Insaat ve yukseltme.
 *
 * MALIYET VE SURE
 * Ikariam'da seviye tablosu yoktur; tek bir formul vardir:
 *
 *     deger(seviye) = A / B * C^seviye - D
 *
 * Katsayilar Ikariam wiki'sinden alindi (bkz. config/BuildingCatalog.ts).
 * Depo seviye 1 icin 1600/3 * 1.2 - 480 = 160 odun cikar ve Ikariam'daki
 * deger de 160'tir.
 *
 * INDIRIMLER
 * Maliyet iki kaynaktan indirilir ve TOPLANARAK uygulanir:
 *   - Arastirmalar: Kasnak %2, Geometri %4, Su Terazisi %8
 *   - Indirim binalari: Marangoz (odun), Mimarlik Ofisi (mermer),
 *     Sarap Presi (sarap), Havai Fisik Test Alani (kukurt), Optikci (kristal)
 *     her seviyede %1
 * Toplam indirim MAX_COST_REDUCTION ile sinirlanir; sinirsiz indirim
 * bir noktadan sonra binayi bedavaya getirir ve ekonomi anlamini yitirir.
 *
 * ES ZAMANLI INSAAT
 * Ikariam ayni anda birden fazla insaata izin verir; burada da oyle.
 * Gorevler `sequence` ile FIFO siralanir, boylece ayni tikte baslayan iki
 * gorevin tamamlanma sirasi deterministik kalir.
 */

/** Indirim binalarinin hangi kaynagi indirdigi. */
const REDUCTION_BUILDING_FOR: Record<MaterialKey, string> = {
  wood: 'carpenter',
  marble: 'architects_office',
  wine: 'wine_press',
  sulfur: 'firework_test_area',
  crystal: 'optician',
};

export class ConstructionSystem {
  constructor(
    private readonly state: GameState,
    private readonly resources: ResourceSystem,
    private readonly research: ResearchSystem,
    private readonly citizens: CitizenSystem,
    private readonly bus: EventBus,
  ) {}

  // --- Maliyet ve sure -----------------------------------------------------

  /** Bir kaynak icin toplam indirim orani (0..tavan). */
  reductionFor(city: CityState, resource: MaterialKey): number {
    const fromResearch = this.research.effects.buildCostReduction;
    const buildingId = REDUCTION_BUILDING_FOR[resource];
    const fromBuilding = buildingLevel(city, buildingId) * REDUCTION_BUILDING_BONUS_PER_LEVEL;
    return Math.min(MAX_COST_REDUCTION, Math.max(0, fromResearch + fromBuilding));
  }

  /**
   * Bir binanin verilen seviyeye cikma maliyeti (indirimler uygulanmis).
   *
   * @param toLevel hedef seviye (1 = sifirdan insaat)
   */
  costFor(city: CityState, buildingId: string, toLevel: number): ResourceAmounts {
    const def = getBuilding(buildingId);
    if (!def) return {};

    const cost: ResourceAmounts = {};
    for (const [resource, coefficients] of Object.entries(def.cost) as Array<
      [MaterialKey, (typeof def.cost)[MaterialKey]]
    >) {
      if (!coefficients) continue;
      const raw = ikariamCost(coefficients, toLevel);
      if (raw <= 0) continue;
      cost[resource] = Math.max(1, Math.floor(raw * (1 - this.reductionFor(city, resource))));
    }
    return cost;
  }

  /** Bir binanin verilen seviyeye cikma insa suresi (OYUN saniyesi). */
  timeFor(buildingId: string, toLevel: number): number {
    const def = getBuilding(buildingId);
    if (!def) return 0;
    return Math.max(1, ikariamCost(def.time, toLevel));
  }

  // --- Dogrulama -----------------------------------------------------------

  /**
   * Binanin bu sehre kurulup kurulamayacagi.
   * Basarisizsa oyuncuya gosterilecek nedeni dondurur.
   */
  canBuild(city: CityState, buildingId: string, ground: number): string | null {
    const def = getBuilding(buildingId);
    if (!def) return 'Bilinmeyen bina.';

    if (!this.research.buildingUnlocked(buildingId)) {
      return `"${def.name}" için gereken araştırma tamamlanmamış.`;
    }

    if (def.requiredTownHallLevel && city.townHall.level < def.requiredTownHallLevel) {
      return `Valilik seviyesi en az ${def.requiredTownHallLevel} olmalı.`;
    }

    if (def.capitalOnly && !city.isCapital) {
      return `${def.name} yalnızca başkentte kurulabilir.`;
    }
    if (def.colonyOnly && city.isCapital) {
      return `${def.name} yalnızca kolonilerde kurulabilir.`;
    }

    if (def.slot === 'island') {
      return `${def.name} şehirde değil, adada yükseltilir.`;
    }

    if (!canBuildMore(city, buildingId)) {
      return `${def.name} için azami sayıya ulaşıldı.`;
    }

    if (def.slot === 'ground') {
      const free = freeGrounds(city, this.research.effects.extraGround);
      if (!free.includes(ground)) {
        return 'Bu yapı alanı boş değil ya da henüz açılmadı. Valiliği yükseltince yeni alanlar açılır.';
      }
      if (city.grounds.some((b) => b.ground === ground)) {
        return 'Bu yapı alanında zaten bir bina var.';
      }
    } else {
      // Sabit yapilar (Valilik/Liman/Tersane/Sur) yalnizca YUKSELTILEBILIR.
      const current = this.fixedBuilding(city, buildingId);
      if (!current) return `${def.name} bu şehirde kurulamaz.`;
      if (current.level > 0 || current.construction) {
        return `${def.name} zaten kurulu veya inşaatı sürüyor.`;
      }
    }

    const cost = this.costFor(city, buildingId, 1);
    const affordability = this.resources.canAfford(city, cost);
    if (!affordability.ok) return 'Kaynaklar yetmiyor.';

    return null;
  }

  /** Yukseltme yapilabilir mi? */
  canUpgrade(city: CityState, buildingId: string, ground = -1): string | null {
    const def = getBuilding(buildingId);
    if (!def) return 'Bilinmeyen bina.';

    const building = this.locate(city, buildingId, ground);
    if (!building) return 'Bu bina şehirde yok.';
    if (building.construction) return 'Bu binada zaten bir inşaat sürüyor.';
    if (building.level <= 0) return 'Bina henüz kurulmadı.';

    const next = building.level + 1;
    if (next > def.maxLevel) return `${def.name} azami seviyede.`;

    if (def.requiredTownHallLevel && city.townHall.level < def.requiredTownHallLevel) {
      return `Valilik seviyesi en az ${def.requiredTownHallLevel} olmalı.`;
    }

    // Ikariam'in gercek tavani: maliyet depo kapasitesini asamaz, cunku
    // kaynaklar depoda tutulamaz. Bu kontrol olmadan oyuncu "yeterli kaynagim
    // var ama harcayamiyorum" durumuna duserdi.
    const cost = this.costFor(city, buildingId, next);
    const capacity = this.resources.storageCapacity(city);
    for (const [resource, value] of Object.entries(cost) as Array<[MaterialKey, number]>) {
      if (value > capacity) {
        return `Bu yükseltme için gereken ${resource} miktarı depo kapasitesini aşıyor. Önce Depo kurun.`;
      }
    }

    if (!this.resources.affordable(city, cost)) return 'Kaynaklar yetmiyor.';
    return null;
  }

  // --- Eylemler ------------------------------------------------------------

  /** Binayi kurar veya sabit yapiyi insa eder. */
  build(city: CityState, buildingId: string, ground: number): boolean {
    const reason = this.canBuild(city, buildingId, ground);
    if (reason) return false;

    const def = requireBuilding(buildingId);
    const cost = this.costFor(city, buildingId, 1);
    if (!this.resources.spend(city, cost)) return false;

    const task = this.createTask('build', 1, this.timeFor(buildingId, 1), cost);

    if (def.slot === 'ground') {
      city.grounds.push({ type: buildingId, level: 0, ground, construction: task });
    } else {
      const fixed = this.fixedBuilding(city, buildingId);
      if (!fixed) {
        // Maliyet geri verilir: gorev olusturulamadi.
        this.resources.spend(city, negate(cost));
        return false;
      }
      fixed.level = 0;
      fixed.construction = task;
    }

    this.bus.emit('construction:started', city.id, buildingId, 1);
    return true;
  }

  /** Binayi bir seviye yukseltir. */
  upgrade(city: CityState, buildingId: string, ground = -1): boolean {
    const reason = this.canUpgrade(city, buildingId, ground);
    if (reason) return false;

    const building = this.locate(city, buildingId, ground);
    if (!building) return false;

    const toLevel = building.level + 1;
    const cost = this.costFor(city, buildingId, toLevel);
    if (!this.resources.spend(city, cost)) return false;

    building.construction = this.createTask(
      'upgrade',
      toLevel,
      this.timeFor(buildingId, toLevel),
      cost,
    );

    this.bus.emit('construction:started', city.id, buildingId, toLevel);
    return true;
  }

  /**
   * Insaati iptal eder ve maliyeti kismen iade eder.
   *
   * Ikariam'da iptal yoktur; bu MOBIL icin bilincli bir kolayliktir.
   * Iade orani CANCEL_REFUND_RATE'ten gelir: sifirdan insaat tam,
   * yukseltme yari yariya iade edilir. Yukseltmede tam iade vermek,
   * insaati bedava bir "kaynak park yeri"ne cevirirdi.
   */
  cancel(city: CityState, buildingId: string, ground = -1): boolean {
    const building = this.locate(city, buildingId, ground);
    const task = building?.construction;
    if (!building || !task) return false;

    const rate = CANCEL_REFUND_RATE[task.kind === 'build' ? 'queued' : 'active'];
    const refund: ResourceAmounts = {};
    for (const [key, value] of Object.entries(task.paidCost) as Array<[MaterialKey, number]>) {
      const amount = Math.floor(value * rate);
      if (amount > 0) refund[key] = amount;
    }

    /*
     * Iade depo tavanina takilabilir.
     *
     * Tavan ASILMAZ: asmak "kaynaklar hicbir zaman tavani gecmez"
     * degismezini bozardi ve iptal->doldur->iptal dongusuyle sinirsiz
     * tavan-ustu stok biriktirmeye izin verirdi. Ancak bu durumda iade
     * SESSIZCE kaybolmamalidir: oyuncu iptale tiklayip kaynaklarinin
     * bir kismini hicsesiz yitirirse bunu bir hata olarak gorur. Bu
     * yuzden kayip miktari bildirim olarak yuzeye cikarilir.
     */
    const result = this.resources.add(city, refund);
    const lost = result.lost;
    const lostTotal = Object.values(lost).reduce((sum, v) => sum + (v ?? 0), 0);
    if (lostTotal > 0) {
      this.bus.emit(
        'notice:added',
        'İptal iadesi depoya sığmadı',
        `${Math.round(lostTotal)} birim kaynak depo dolu olduğu için geri alınamadı.`,
        'warn',
      );
    }

    if (task.kind === 'build') {
      // Sifirdan insaat iptal edilirse bina tamamen kaldirilir.
      if (ground >= 0) {
        const index = city.grounds.indexOf(building);
        if (index >= 0) city.grounds.splice(index, 1);
      } else {
        building.level = 0;
        building.construction = undefined;
      }
    } else {
      building.construction = undefined;
    }

    this.bus.emit('construction:cancelled', city.id, buildingId);
    return true;
  }

  // --- Zaman ---------------------------------------------------------------

  /**
   * Tum insaatlari verilen oyun saniyesi kadar ilerletir.
   *
   * Gorevler `sequence` sirasiyla islenir: ayni pencerede biten iki gorevin
   * hangisinin once uygulandigi, olusturulma sirasina baglidir. Bu sira
   * olmadan ayni tikte biten gorevler dizinin o anki siralamasina bagli
   * kalirdi ve kayit gidis-donusu sonucu degistirebilirdi.
   */
  advance(gameSeconds: number): void {
    if (gameSeconds <= 0) return;

    const tasks: Array<{ city: CityState; building: PlacedBuilding }> = [];
    for (const city of this.state.cities) {
      for (const building of [
        city.townHall,
        city.wall,
        city.harbor.port,
        city.harbor.shipyard,
        ...city.grounds,
      ]) {
        if (building.construction) tasks.push({ city, building });
      }
    }

    tasks.sort((a, b) => {
      const sa = a.building.construction?.sequence ?? 0;
      const sb = b.building.construction?.sequence ?? 0;
      return sa - sb;
    });

    for (const { city, building } of tasks) {
      const task = building.construction;
      if (!task) continue;

      task.remainingGameSeconds -= gameSeconds;
      if (task.remainingGameSeconds > 0) continue;

      building.level = task.toLevel;
      building.construction = undefined;

      // Yeni bina nufus/kapasite hesaplarini degistirdigi icin dagilim
      // yeniden dengelenir (ornegin Akademi bilim adami kapasitesi acar).
      this.citizens.reconcile(city);

      const def = getBuilding(building.type);
      this.bus.emit('construction:completed', city.id, building.type, building.level);
      this.state.pushNotice({
        atTick: this.state.tick,
        title: 'İnşaat tamamlandı',
        body: `${city.name}: ${def?.name ?? building.type} seviye ${building.level}.`,
        tone: 'success',
        read: false,
      });
      this.bus.emit('notice:added', 'İnşaat tamamlandı', def?.name ?? building.type, 'success');
    }
  }

  /** Sehrin devam eden tum insaatlari (arayuz icin). */
  activeTasks(city: CityState): Array<{ building: PlacedBuilding; task: ConstructionTask }> {
    const out: Array<{ building: PlacedBuilding; task: ConstructionTask }> = [];
    for (const building of [
      city.townHall,
      city.wall,
      city.harbor.port,
      city.harbor.shipyard,
      ...city.grounds,
    ]) {
      if (building.construction) out.push({ building, task: building.construction });
    }
    return out;
  }

  // --- Ic yardimcilar ------------------------------------------------------

  /** Sabit yapinin kaydini bulur (Valilik/Sur/Liman/Tersane). */
  private fixedBuilding(city: CityState, buildingId: string): PlacedBuilding | null {
    const def = getBuilding(buildingId);
    if (!def) return null;
    switch (def.slot) {
      case 'townhall':
        return city.townHall;
      case 'wall':
        return city.wall;
      case 'port':
        return city.harbor.port;
      case 'shipyard':
        return city.harbor.shipyard;
      default:
        return null;
    }
  }

  /** Binayi slot turune gore bulur. */
  private locate(city: CityState, buildingId: string, ground: number): PlacedBuilding | null {
    const def = getBuilding(buildingId);
    if (!def) return null;

    if (def.slot === 'ground') {
      if (ground >= 0) return city.grounds.find((b) => b.ground === ground && b.type === buildingId) ?? null;
      return city.grounds.find((b) => b.type === buildingId) ?? null;
    }
    return this.fixedBuilding(city, buildingId);
  }

  /** Yeni bir insaat gorevi kaydi uretir. */
  private createTask(
    kind: ConstructionTask['kind'],
    toLevel: number,
    durationGameSeconds: number,
    paidCost: ResourceAmounts,
  ): ConstructionTask {
    return {
      kind,
      toLevel,
      durationGameSeconds: Math.max(1, durationGameSeconds),
      remainingGameSeconds: Math.max(1, durationGameSeconds),
      paidCost: { ...paidCost },
      sequence: this.state.nextSequence(),
      startedAtTick: this.state.tick,
    };
  }
}

/** Maliyet haritasini negatife cevirir (iade/icin). */
function negate(cost: ResourceAmounts): ResourceAmounts {
  const out: ResourceAmounts = {};
  for (const [key, value] of Object.entries(cost) as Array<[MaterialKey, number]>) {
    out[key] = -Math.max(0, value);
  }
  return out;
}
