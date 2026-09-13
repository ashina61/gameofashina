import Phaser from 'phaser';
import { SceneKeys } from '@/config/Constants';
import { generateTextures } from '@/render/TextureFactory';
import { queueAssets } from '@/render/SpriteLoader';
import { getResolution } from './BootScene';

/**
 * Varliklarin hazirlandigi sahne.
 *
 * Oyunun grafigi hala AGIRLIKLI OLARAK kodla uretilir; bu sahne o dokulari
 * cizer. Sprint 18'den beri ayrica elle uretilmis PNG'ler de yuklenebilir:
 * /src/assets/ altindaki dosyalar varsa yuklenir, yoksa hicbir sey
 * istenmez ve prosedurel cizim aynen gecerlidir.
 *
 * SIRA ONEMLI: once dosyalar yuklenir (preload), sonra dokular uretilir
 * (create). Boylece uretim asamasi "bu dokuyu oyuncu zaten verdi mi?"
 * sorusunu cevaplayabilir ve verilmisse uzerine yazmaz.
 */
export class PreloadScene extends Phaser.Scene {
  constructor() {
    super(SceneKeys.Preload);
  }

  preload(): void {
    queueAssets(this);
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
