import Phaser from 'phaser';
import { renderTargets } from '@/utils/RenderScale';

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
  // Ilk kare dogru cozunurlukte cizilsin; sonrasini ResolutionManager surdurur.
  const initial = renderTargets(window.innerWidth, window.innerHeight, window.devicePixelRatio);

  return {
    type: Phaser.AUTO,
    parent,
    backgroundColor: BACKGROUND_COLOR,
    scale: {
      /*
       * NONE kipi, RESIZE degil.
       *
       * RESIZE kipinde ScaleManager oyun boyutunu surekli parent'in CSS
       * olcusune geri ceker; resize() ve setZoom() etkisiz kalir (olculdu).
       * Tuvalin arka tamponu da oyun boyutuna esit oldugu icin cizim her
       * zaman CSS pikseli kadar olur ve yuksek DPR ekranlarda gerilir.
       *
       * NONE kipinde olculeri ResolutionManager yonetir: oyun boyutu cihaz
       * pikselinde, tuvalin CSS olcusu mantiksal pikselde tutulur.
       */
      mode: Phaser.Scale.NONE,
      autoCenter: Phaser.Scale.CENTER_BOTH,
      width: initial.deviceWidth,
      height: initial.deviceHeight,
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
