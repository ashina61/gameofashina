import { MAX_WAREHOUSES } from '@/config/Constants';
import { requireBuilding } from '@/config/BuildingCatalog';
import { groundCountFor, TOTAL_GROUNDS } from '@/core/CityLayout';
import type { CityState, PlacedBuilding } from '@/types';

/**
 * Sehir binalari uzerine saf sorgular.
 *
 * Bu fonksiyonlar KURAL icermez; yalnizca "bu sehirde bu binadan kac tane
 * var, kacinci seviyede" sorusunu tek bir yerden yanitlar. Ayni sorguyu her
 * sistemin kendince yazmasi, bir binanin seviyesinin iki sistemde farkli
 * okunmasi riskini dogururdu.
 *
 * Ikariam'da binalar dort yerde durur: Valilik (merkez), Sur (cevre),
 * Liman + Tersane (kiyi) ve yapi alanlari (ground). Bir binanin turu
 * hangi grupta oldugunu belirledigi icin arama once sabit yapilarda,
 * sonra alanlarda yapilir.
 */

/** Sehre ait TUM binalarin duz listesi (sabit yapilar + alanlar). */
export function allBuildings(city: CityState): PlacedBuilding[] {
  return [city.townHall, city.wall, city.harbor.port, city.harbor.shipyard, ...city.grounds];
}

/**
 * Bir bina turunun seviyesi; kurulmadiysa 0.
 *
 * Ayni turden birden fazla bina olabilir (Depo). Bu durumda EN YUKSEK
 * seviye doner; "sehirde Depo var mi" sorusunun dogru cevabi budur.
 * Toplam etki (ornegin depo kapasitesi) icin `buildingsOfType` kullanilir.
 */
export function buildingLevel(city: CityState, id: string): number {
  let best = 0;
  for (const building of allBuildings(city)) {
    if (building.type === id) best = Math.max(best, building.level);
  }
  return best;
}

/** Bir bina turunden kac adet var (insaattakiler dahil). */
export function buildingCount(city: CityState, id: string): number {
  let count = 0;
  for (const building of allBuildings(city)) {
    if (building.type === id && building.level > 0) count += 1;
  }
  return count;
}

/** Bir bina turunun TUM ornekleri (Depo gibi coklu binalar icin). */
export function buildingsOfType(city: CityState, id: string): PlacedBuilding[] {
  return allBuildings(city).filter((b) => b.type === id && b.level > 0);
}

/** Bir bina turunun toplam seviyesi (ornegin toplam depo seviyesi). */
export function totalLevel(city: CityState, id: string): number {
  return buildingsOfType(city, id).reduce((sum, b) => sum + b.level, 0);
}

/**
 * Bir bina turune ait PlacedBuilding kaydini bulur.
 *
 * `ground` -1 ise sabit yapilarda aranir; 0..n ise yapi alanlarinda.
 * Insa/yukseltme gorevi bu kayit uzerine yazilir.
 */
export function findBuilding(city: CityState, id: string, ground = -1): PlacedBuilding | null {
  if (ground >= 0) {
    return city.grounds.find((b) => b.ground === ground && b.type === id) ?? null;
  }
  return (
    allBuildings(city).find((b) => b.type === id && b.ground === -1) ??
    city.grounds.find((b) => b.type === id) ??
    null
  );
}

/** Sehirde insaati/yukseltmesi devam eden tum gorevler. */
export function activeConstructions(city: CityState): PlacedBuilding[] {
  return allBuildings(city).filter((b) => b.construction !== undefined);
}

/**
 * Valilik seviyesinin actigi yapi alani sayisi.
 *
 * Burokrasi arastirmasi bir ek alan verir; bu yuzden arastirma etkisi
 * burada PARAMETRE olarak alinir. Sistemin arastirma kuralini bilmesi
 * gerekmez.
 */
export function openGrounds(city: CityState, extraGrounds = 0): number {
  return Math.min(TOTAL_GROUNDS, groundCountFor(city.townHall.level, extraGrounds));
}

/** Bos yapi alani indeksleri. */
export function freeGrounds(city: CityState, extraGrounds = 0): number[] {
  const total = openGrounds(city, extraGrounds);
  const used = new Set(city.grounds.map((b) => b.ground));
  const free: number[] = [];
  for (let i = 0; i < total; i += 1) if (!used.has(i)) free.push(i);
  return free;
}

/** Bina daha fazla kurulabilir mi? (maxCount siniri) */
export function canBuildMore(city: CityState, id: string): boolean {
  const def = requireBuilding(id);
  if (def.maxCount === undefined) return true;
  if (id === 'warehouse') return buildingCount(city, id) < MAX_WAREHOUSES;
  return buildingCount(city, id) < def.maxCount;
}

/** Sur seviyesi (kurulmadiysa 0). */
export function wallLevel(city: CityState): number {
  return city.wall.level;
}

/** Kisla seviyesi. */
export function barracksLevel(city: CityState): number {
  return buildingLevel(city, 'barracks');
}

/** Tersane seviyesi. */
export function shipyardLevel(city: CityState): number {
  return city.harbor.shipyard.level;
}

/** Ticaret Limani seviyesi. */
export function portLevel(city: CityState): number {
  return city.harbor.port.level;
}

/** Akademi seviyesi. */
export function academyLevel(city: CityState): number {
  return buildingLevel(city, 'academy');
}

/** Atolye seviyesi. */
export function workshopLevel(city: CityState): number {
  return buildingLevel(city, 'workshop');
}

/** Meyhane seviyesi. */
export function tavernLevel(city: CityState): number {
  return buildingLevel(city, 'tavern');
}

/** Muze seviyesi. */
export function museumLevel(city: CityState): number {
  return buildingLevel(city, 'museum');
}

/** Tapinak seviyesi. */
export function templeLevel(city: CityState): number {
  return buildingLevel(city, 'temple');
}

/** Saray seviyesi (yoksa 0). */
export function palaceLevel(city: CityState): number {
  return buildingLevel(city, 'palace');
}

/** Vali Konagi seviyesi (yoksa 0). */
export function governorLevel(city: CityState): number {
  return buildingLevel(city, 'governors_residence');
}

/** Toplam depo binasi sayisi. */
export function warehouseCount(city: CityState): number {
  return buildingCount(city, 'warehouse');
}
