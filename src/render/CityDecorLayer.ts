import { TILE_HEIGHT, TILE_WIDTH } from '@/config/Constants';
import { depthFor, gridToWorld } from '@/utils/IsoUtils';
import { DECOR_SPEC, decorKeyFor } from './DecorArt';
import type Phaser from 'phaser';
import type { CityDecorSystem } from '@/systems/CityDecorSystem';
import type { DecorItem } from '@/types';

/**
 * Sehir cevresindeki dekoru ekrana koyan katman.
 *
 * Yerlesim karari burada DEGIL, CityDecorSystem'dedir; bu katman yalnizca
 * hazir listeyi cizer. Sprite'lar BIR KEZ olusturulur ve bir daha
 * dokunulmaz: dekor hicbir oyun olayina tepki vermez, dolayisiyla kare
 * basina ya da olay basina is yoktur.
 */
export class CityDecorLayer {
  private readonly sprites: Phaser.GameObjects.Image[] = [];

  constructor(scene: Phaser.Scene, decor: CityDecorSystem, artScale: number) {
    for (const item of decor.items) {
      this.sprites.push(place(scene, item, artScale));
    }
  }

  /** Ekrandaki dekor sayisi; olcum ve testler icin. */
  get count(): number {
    return this.sprites.length;
  }

  destroy(): void {
    for (const sprite of this.sprites) sprite.destroy();
    this.sprites.length = 0;
  }
}

/** Tek bir dekoru dunya koordinatina oturtur. */
function place(
  scene: Phaser.Scene,
  item: DecorItem,
  artScale: number,
): Phaser.GameObjects.Image {
  const at = gridToWorld(item.gx, item.gy);
  const spec = DECOR_SPEC[item.kind];

  /*
   * Kaydirma karonun KENDI eksenlerinde uygulanir.
   *
   * u ekseni sag-yukari, v ekseni sag-asagi gider. Ekran ekseninde
   * kaydirmak dekoru komsu karonun uzerine tasiyabiliyordu.
   */
  const x = at.x + (item.offsetU + item.offsetV) * (TILE_WIDTH / 2);
  const y = at.y + (item.offsetV - item.offsetU) * (TILE_HEIGHT / 2);

  return scene.add
    .image(x, y, decorKeyFor(item.kind))
    // Taban noktasi dokunun altindadir; oge zemine oturur, havada durmaz.
    .setOrigin(0.5, 1 - spec.baseY / spec.height)
    .setScale(1 / artScale)
    /*
     * Binalarla AYNI derinlik ekseninde siralanir.
     *
     * Dekor zemin katmanina (depthFor - 5) konsaydi onundeki binanin
     * arkasinda kalmasi gerekirken hep onunde ya da hep arkasinda
     * gorunurdu; ayni eksende siralamak izometrik ortusmeyi dogru yapar.
     */
    .setDepth(depthFor(item.gx, item.gy) + (item.offsetV > 0 ? 1 : -1));
}
