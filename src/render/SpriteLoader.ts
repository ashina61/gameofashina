import type Phaser from 'phaser';
import { buildingAssets, terrainAssets, uiAssets } from './AssetManifest';

/**
 * Listedeki PNG'leri Phaser yukleyicisine verir.
 *
 * Oyun bugune kadar hic ag istegi yapmiyordu; bu modul o kapiyi acar ama
 * DAR tutar: yalnizca derleme aninda var oldugu bilinen dosyalar istenir
 * (bkz. AssetManifest). Klasorler bosken hic istek cikmaz ve acilis
 * suresi degismez.
 *
 * HATAYA DAYANIKLILIK
 * Bir dosya bozuksa ya da agda bir sey ters giderse oyun ACILMAYA DEVAM
 * EDER: eksik doku icin ilgili bina prosedurel cizimine doner. Gorsel bir
 * iyilestirmenin oyunu acilamaz hale getirmesi kabul edilemez, bu yuzden
 * yukleme hatasi oyunu durdurmaz - yalnizca not edilir.
 */

/** Yuklenemeyen dosyalarin anahtarlari; gorsel secimi bunlari atlar. */
const failed = new Set<string>();

/** PreloadScene bunu preload() icinde cagirir. */
export function queueAssets(scene: Phaser.Scene): void {
  const entries = [...uiAssets(), ...terrainAssets(), ...buildingAssets()];
  if (entries.length === 0) return;

  scene.load.on(
    'loaderror',
    (file: { key?: string }) => {
      if (file?.key) failed.add(file.key);
    },
    null,
  );

  for (const entry of entries) {
    if (scene.textures.exists(entry.key)) continue;
    scene.load.image(entry.key, entry.url);
  }
}

/** Bu doku gercekten kullanilabilir mi? (listede var VE yuklenebilmis) */
export function isLoaded(scene: Phaser.Scene, key: string): boolean {
  return !failed.has(key) && scene.textures.exists(key);
}

/** Yuklenemeyen dosyalar - rapor ve olcum icin. */
export function failedKeys(): string[] {
  return [...failed];
}
