import Phaser from 'phaser';
import { SceneKeys } from '@/config/Constants';
import { generateTextures } from '@/render/TextureFactory';
import { getResolution } from './BootScene';

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
    /*
     * Dokular CIZIM olceginde uretilir. Sprint 5 arka tamponu DPR kadar
     * buyuttu; dokular eski olcude kalsaydi tuvalden dusuk cozunurlukte
     * olup o kazanci yutardi. Sahne tarafinda sprite 1/artScale ile
     * olceklenir, yani dunyadaki boyut degismez.
     */
    const artScale = getResolution(this)?.dpr ?? 1;
    generateTextures(this, artScale);
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
