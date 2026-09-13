import Phaser from 'phaser';
import { buildTextures } from '@/render/SpriteFactory';

/**
 * Acilis sahnesi.
 *
 * Yalnizca HTML acilis ekraniyla Phaser arasindaki kopruyu kurar ve
 * prosedural dokulari uretir. Agir isi PreloadScene yapar.
 *
 * Prosedural dokular BURADA uretilir, cunku PreloadScene agdan gorsel
 * beklerken bu dokular hazir olursa yukleme ekrani bos kalmaz.
 */
export class BootScene extends Phaser.Scene {
  constructor() {
    super('BootScene');
  }

  create(): void {
    buildTextures(this);
    this.scene.start('PreloadScene');
  }
}
