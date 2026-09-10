import Phaser from 'phaser';

/**
 * Bu dosya yalnizca Phaser baglantisini kurar.
 * Denge verisi (baslangic kaynaklari vb.) config/Constants.ts icindedir;
 * boylece core/ ve systems/ katmanlari Phaser'i import etmeden o veriye erisir.
 */

/** Sahne disindaki arka plan (letterbox) rengi. */
export const BACKGROUND_COLOR = '#12100b';

/**
 * Phaser oyun yapilandirmasini uretir.
 * Sahneler burada degil, main.ts icinde kaydedilir; boylece bu modul
 * sahne siniflarina bagimli olmaz ve test edilmesi kolaylasir.
 */
export function createGameConfig(
  parent: HTMLElement,
  scenes: Phaser.Types.Scenes.SceneType[],
): Phaser.Types.Core.GameConfig {
  return {
    type: Phaser.AUTO,
    parent,
    backgroundColor: BACKGROUND_COLOR,
    scale: {
      // Mobil cihazlarda ekrani doldurur, yon degisiminde otomatik uyum saglar.
      mode: Phaser.Scale.RESIZE,
      autoCenter: Phaser.Scale.CENTER_BOTH,
      width: '100%',
      height: '100%',
    },
    render: {
      antialias: true,
      roundPixels: false,
      powerPreference: 'low-power',
    },
    input: {
      activePointers: 3, // iki parmakla pinch-zoom icin gereken pointer sayisi
      touch: { capture: true },
    },
    dom: { createContainer: false },
    banner: false,
    scene: scenes,
  };
}
