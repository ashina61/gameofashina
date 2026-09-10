import Phaser from 'phaser';
import { SceneKeys } from '@/config/Constants';
import { generateTextures } from '@/render/TextureFactory';

/**
 * Varliklarin hazirlandigi sahne.
 * Proje prosedurel doku kullandigi icin ag uzerinden yukleme yoktur;
 * dokular burada uretilir ve HTML acilis ekrani kapatilir.
 */
export class PreloadScene extends Phaser.Scene {
  constructor() {
    super(SceneKeys.Preload);
  }

  create(): void {
    generateTextures(this);
    hideBootSplash();

    this.scene.start(SceneKeys.City);
    this.scene.launch(SceneKeys.UI);
  }
}

/** index.html icindeki acilis ekranini kapatir. */
function hideBootSplash(): void {
  const splash = document.getElementById('boot-splash');
  if (!splash) return;
  splash.classList.add('hidden');
  window.setTimeout(() => splash.remove(), 400);
}
