import {
  GAME_SECONDS_PER_HOUR,
  STORAGE_PER_WAREHOUSE_LEVEL,
  TOWN_HALL_BASE_STORAGE,
} from '@/config/Constants';
import type { EventBus } from '@/core/EventBus';
import type { GameState } from '@/core/GameState';
import { totalLevel } from '@/core/CityQuery';
import type { CityState, MaterialAmounts, MaterialKey, MaterialPool, ResourceAmounts } from '@/types';

/**
 * Kaynaklar, depo tavani ve altin.
 *
 * IKI FARKLI HAVUZ
 * Ikariam'da maddesel kaynaklar (odun + luks) SEHIR BASINA depolanir ve
 * bir depo tavanina tabidir; altin ise OYUNCU BASINA tek havuzdur ve
 * tavani yoktur. Bu sistem ikisini de yonetir ama ayri metotlarla:
 * ayni metottan gecirmek "altin da depo tavanina takilir" gibi yanlis bir
 * kuralin sizmasina yol acardi.
 *
 * DEPO TAVANI
 *   kapasite = 2500 (Valilik tabani) + Σ (Depo seviyesi × 2190)
 *
 * Valilik seviyesi kapasiteyi ARTIRMAZ. Ikariam'da da boyledir; bu yuzden
 * depo tavani oyuncuyu gercekten yeni Depo kurmaya zorlayan bir kisittir.
 * Tavan kaynak TURU basinadir: odun icin dolu olan depo mermeri engellemez.
 */

/** Bir alisverisin sonucu. */
export interface AffordResult {
  ok: boolean;
  /** Eksiği olan kaynaklar ve eksik miktarlari. */
  missing: MaterialAmounts;
  /** Eksik altin (0 ise yeterli). */
  missingGold: number;
}

/** Bir ekleme isleminin sonucu. */
export interface AddResult {
  /** Gercekten depoya giren miktar. */
  applied: MaterialAmounts;
  /** Tavana takilip kaybolan miktar. */
  lost: MaterialAmounts;
}

export class ResourceSystem {
  constructor(
    private readonly state: GameState,
    private readonly bus: EventBus,
  ) {}

  // --- Depo tavani ---------------------------------------------------------

  /** Bir sehrin kaynak turu basina depo kapasitesi. */
  storageCapacity(city: CityState): number {
    const fromTownHall = city.townHall.level > 0 ? TOWN_HALL_BASE_STORAGE : 0;
    const fromWarehouses = totalLevel(city, 'warehouse') * STORAGE_PER_WAREHOUSE_LEVEL;
    return fromTownHall + fromWarehouses;
  }

  /** Kapasiteyi arastirma carpaniyla birlikte dondurur. */
  capacityOf(city: CityState, _resource: MaterialKey): number {
    return this.storageCapacity(city);
  }

  /** Depoda bos yer (kaynak turu basina). */
  freeSpace(city: CityState, resource: MaterialKey): number {
    return Math.max(0, this.storageCapacity(city) - city.resources[resource]);
  }

  // --- Yeterlilik kontrolu -------------------------------------------------

  /**
   * Sehrin bu maliyeti karsilayip karsilayamadigini soyley.
   *
   * Harcama YAPMAZ; yalnizca kontrol eder. Arayuz bunu "hangi kaynak
   * kirmizi gosterilecek" icin kullanir, dolayisiyla eksiklerin TAM
   * listesini dondurur - ilk eksikte durmaz.
   */
  canAfford(city: CityState, cost: ResourceAmounts): AffordResult {
    const missing: MaterialAmounts = {};
    let missingGold = 0;
    let ok = true;

    for (const [key, value] of Object.entries(cost) as Array<[string, number]>) {
      if (!Number.isFinite(value) || value <= 0) continue;
      if (key === 'gold') {
        if (this.state.gold < value) {
          missingGold = value - this.state.gold;
          ok = false;
        }
        continue;
      }
      const material = key as MaterialKey;
      const have = city.resources[material] ?? 0;
      if (have < value) {
        missing[material] = value - have;
        ok = false;
      }
    }

    return { ok, missing, missingGold };
  }

  /** Maliyet karsilaniyor mu? */
  affordable(city: CityState, cost: ResourceAmounts): boolean {
    return this.canAfford(city, cost).ok;
  }

  // --- Harcama -------------------------------------------------------------

  /**
   * Maliyeti düşer. Yetersizse HICBIR SEY degistirmez ve false doner.
   *
   * Kismi harcama yapilmaz: yarisi odeyip yarisini borc birakmak, iptal
   * iadesini ve yagma hesabini bozardi. Ya tam ode ya hic odeme.
   */
  spend(city: CityState, cost: ResourceAmounts): boolean {
    if (!this.affordable(city, cost)) return false;

    for (const [key, value] of Object.entries(cost) as Array<[string, number]>) {
      if (!Number.isFinite(value) || value <= 0) continue;
      if (key === 'gold') this.state.addGold(-value);
      else this.state.addMaterial(city, key as MaterialKey, -value);
    }

    this.bus.emit('resources:changed', city.id);
    return true;
  }

  /** Altin harcar; yetersizse false. */
  spendGold(amount: number): boolean {
    if (!Number.isFinite(amount) || amount <= 0) return true;
    if (this.state.gold < amount) return false;
    this.state.addGold(-amount);
    this.bus.emit('gold:changed', this.state.gold);
    return true;
  }

  // --- Ekleme --------------------------------------------------------------

  /**
   * Kaynak ekler ve depo TAVANINI uygular.
   *
   * Tavani asan kisim KAYBOLUR ve `lost` icinde raporlanir. Ikariam'da da
   * boyledir: depo doluysa uretim bosa gider. Kaybi raporlamak onemlidir,
   * cunku arayuz "deponuz doldu" uyarisi gosterir.
   */
  add(city: CityState, materials: MaterialAmounts): AddResult {
    const applied: MaterialAmounts = {};
    const lost: MaterialAmounts = {};
    let changed = false;

    for (const [key, value] of Object.entries(materials) as Array<[MaterialKey, number]>) {
      if (!Number.isFinite(value) || value === 0) continue;

      if (value < 0) {
        // Negatif ekleme bir harcamadir; tavana takilmaz.
        this.state.addMaterial(city, key, value);
        applied[key] = value;
        changed = true;
        continue;
      }

      const capacity = this.storageCapacity(city);
      const room = Math.max(0, capacity - city.resources[key]);
      const accepted = Math.min(value, room);
      const overflow = value - accepted;

      if (accepted > 0) {
        this.state.addMaterial(city, key, accepted);
        applied[key] = accepted;
        changed = true;
      }
      if (overflow > 0) {
        lost[key] = overflow;
        this.bus.emit('storage:overflow', city.id, key);
      }
    }

    if (changed) this.bus.emit('resources:changed', city.id);
    return { applied, lost };
  }

  /** Altin ekler (tavan yoktur). */
  addGold(amount: number): void {
    if (!Number.isFinite(amount) || amount === 0) return;
    this.state.addGold(amount);
    this.bus.emit('gold:changed', this.state.gold);
  }

  // --- Toptanci (Dump) -----------------------------------------------------

  /**
   * Kaynagi altaina cevirir.
   *
   * Ikariam'in Toptancisi kotu bir oran verir: bir birim kaynak, bir
   * vatandasin saatlik kazancindan (3 altin) az eder. Bu oran bilerek
   * kotudur - ticaret ve uretim her zaman daha karli kalmalidir, yoksa
   * Toptanci oyunun tek stratejisine donusur.
   *
   * @param goldPerUnit birim basina verilen altin
   * @returns gercekten satilan miktar
   */
  sellForGold(city: CityState, resource: MaterialKey, amount: number, goldPerUnit: number): number {
    const wanted = Number.isFinite(amount) ? Math.max(0, Math.floor(amount)) : 0;
    if (wanted <= 0 || goldPerUnit <= 0) return 0;

    const have = Math.floor(city.resources[resource]);
    const sold = Math.min(wanted, have);
    if (sold <= 0) return 0;

    this.state.addMaterial(city, resource, -sold);
    this.state.addGold(sold * goldPerUnit);
    this.bus.emit('resources:changed', city.id);
    this.bus.emit('gold:changed', this.state.gold);
    return sold;
  }

  // --- Yardimcilar ---------------------------------------------------------

  /** Sehrin tum maddelerini kopyalar. */
  materialsOf(city: CityState): MaterialPool {
    return { ...city.resources };
  }

  /** Iki kaynak havuzunu toplar. */
  static sumPools(a: MaterialAmounts, b: MaterialAmounts): MaterialAmounts {
    const out: MaterialAmounts = { ...a };
    for (const [key, value] of Object.entries(b) as Array<[MaterialKey, number]>) {
      out[key] = (out[key] ?? 0) + value;
    }
    return out;
  }

  /** Havuzun toplam birim sayisi (yuk gemisi kapasitesi hesabinda kullanilir). */
  static totalUnits(materials: MaterialAmounts): number {
    let total = 0;
    for (const value of Object.values(materials)) {
      if (Number.isFinite(value)) total += value;
    }
    return total;
  }

  /** Bos havuz. */
  static empty(): MaterialPool {
    return { wood: 0, marble: 0, wine: 0, sulfur: 0, crystal: 0 };
  }

  /** Oyun saati basina verilen miktari, tik basina miktara cevirir. */
  static perTick(perHour: number, gameSecondsThisTick: number): number {
    return (perHour * gameSecondsThisTick) / GAME_SECONDS_PER_HOUR;
  }
}
