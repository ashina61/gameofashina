/**
 * Testler icin dunya kurulumu.
 *
 * Testler GameWorld uzerinden kurulur; sistemleri elle kurmak GameWorld'deki
 * bagimlilik sirasindan kopyalamayi gerektirirdi ve o sira degistiginde
 * testler GERCEK OYUNDAN FARKLI bir dunya kurmus olurdu. Bu, testlerin
 * gecen ama oyunun bozuk kalmasi demekti.
 *
 * localStorage test ortaminda yoktur; `loadSave: false` bunu zaten atlar,
 * SaveManager da `typeof window` kontrolu yapar.
 */
import { GameWorld } from '@/core/GameWorld';
import { createPlayerCity } from '@/core/WorldFactory';
import type { CityState, MaterialKey, UpgradeTier } from '@/types';

/** Deterministik test tohumu. */
export const TEST_SEED = 20260912;

/** Test dunyasi. */
export function createWorld(seed: number = TEST_SEED): GameWorld {
  return new GameWorld({ seed, cityName: 'Test Şehri', loadSave: false });
}

/** Oyuncunun baslangic sehri (her zaman vardir). */
export function startingCity(world: GameWorld): CityState {
  const city = world.activeCity;
  if (!city) throw new Error('Test dunyasinda aktif sehir yok.');
  return city;
}

/**
 * Sehrin kaynaklarini dogrudan ayarlar.
 *
 * Testlerin "kaynak biriktir" beklemek yerine istenen duruma atlamasi
 * gerekir; aksi halde her test yuzlerce saat simulasyon calistirir ve
 * test paketi dakikalar surer.
 */
export function setResources(
  world: GameWorld,
  city: CityState,
  values: Partial<Record<MaterialKey | 'gold', number>>,
): void {
  for (const key of Object.keys(values) as Array<MaterialKey | 'gold'>) {
    const value = values[key] ?? 0;
    if (key === 'gold') world.state.setGold(value);
    else world.state.setMaterial(city, key, value);
  }
}

/** Kaynaklari bolca doldurur (maliyet testleri haric). */
export function fillResources(world: GameWorld, city: CityState, amount = 500_000): void {
  setResources(world, city, {
    wood: amount,
    marble: amount,
    wine: amount,
    sulfur: amount,
    crystal: amount,
    gold: amount,
  });
}

/** Bir binayi ANINDA istenen seviyeye getirir (insaat beklemeden). */
export function forceBuildingLevel(
  world: GameWorld,
  city: CityState,
  buildingId: string,
  level: number,
): void {
  const { construction } = world.systems;
  // Insaat gorevleri varsa once temizlenir; aksi halde gorev bittiginde
  // seviye tekrar yazilir ve testin kurdugu deger ezilir.
  for (const entry of construction.activeTasks(city)) {
    if (entry.building.type === buildingId) entry.building.construction = undefined;
  }

  if (buildingId === 'town_hall') {
    city.townHall.level = level;
    city.townHall.construction = undefined;
    return;
  }
  if (buildingId === 'wall') {
    city.wall.level = level;
    city.wall.construction = undefined;
    return;
  }
  if (buildingId === 'port') {
    city.harbor.port.level = level;
    city.harbor.port.construction = undefined;
    return;
  }
  if (buildingId === 'shipyard') {
    city.harbor.shipyard.level = level;
    city.harbor.shipyard.construction = undefined;
    return;
  }

  const existing = city.grounds.find((b) => b.type === buildingId);
  if (existing) {
    existing.level = level;
    existing.construction = undefined;
    return;
  }
  const ground = city.grounds.length;
  city.grounds.push({ type: buildingId, level, ground, construction: undefined });
}

/** Bir arastirmayi ANINDA tamamlar. */
export function forceResearch(world: GameWorld, id: string, level = 1): void {
  world.state.completeResearch(id, level);
}

/** Sehire birlik ekler. */
export function addUnits(
  world: GameWorld,
  city: CityState,
  id: string,
  count: number,
  tier: UpgradeTier = 'base',
): void {
  const existing = city.garrison.find((s) => s.id === id && s.tier === tier);
  if (existing) existing.count += count;
  else city.garrison.push({ id, count, tier });
  void world;
}

/** Sehire gemi ekler. */
export function addShips(
  world: GameWorld,
  city: CityState,
  id: string,
  count: number,
  tier: UpgradeTier = 'base',
): void {
  const existing = city.warfleet.find((s) => s.id === id && s.tier === tier);
  if (existing) existing.count += count;
  else city.warfleet.push({ id, count, tier });
  void world;
}

/**
 * Simulasyonu verilen OYUN saati kadar ilerletir.
 *
 * Gercek kare dongusu yerine dogrudan oyun saniyesi verilir; boylece
 * testler hiz carpanina ve `world.start()` durumuna bagimli olmaz.
 */
/**
 * Baslangic adasindaki bos bir alana ikinci oyuncu sehri kurar.
 *
 * Ticaret rotasi testleri iki sehir gerektirir; normal oyunda bu alan
 * koloni kurma akisiyla dolar, testte dogrudan kurulur.
 */
export function secondCity(world: GameWorld): CityState {
  const island = world.activeIsland();
  if (!island) throw new Error('aktif ada yok');
  const plot = island.plots.findIndex((p) => p.ownerId === null);
  if (plot < 0) throw new Error('bos alan yok');
  const city = createPlayerCity(island.id, plot, 'İkinci Şehir');
  city.isCapital = false;
  world.state.addCity(city);
  world.state.linkPlot(city);
  return city;
}

export function advanceHours(world: GameWorld, hours: number): void {
  world.advanceHours(hours);
}

/** Simulasyonu oyun saniyesi kadar ilerletir. */
export function stepGameSeconds(world: GameWorld, gameSeconds: number): void {
  world.advanceGameSeconds(gameSeconds);
}
