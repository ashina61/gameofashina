import Phaser from 'phaser';
import { TextureKeys } from '@/config/Constants';
import { PANEL_SLICE } from '@/render/PanelSkin';
import { UIText, labelStyle } from './UIStyle';

/**
 * Icine baska bir ogenin oturdugu 9-slice cerceve.
 *
 * NE ICIN
 * Sehrin uzerinde duran kucuk kontrollerin (harita, mini harita) panel
 * deriyle ayni dile konusmasi icin. Cerceve BOS bir kaptir: ne cizecegini
 * bilmez, yalnizca olcusunu ve basligini bilir. Icerik disaridan
 * `attach` ile konur.
 *
 * Kose susu YOKTUR (Frame derisi): 80 pikselkare bir yuzeyde dort kose
 * susu yuzeyin yarisini kaplardi. Ayni deri, ayni altin kenar, sussuz.
 */
export class FramedSlot extends Phaser.GameObjects.Container {
  private readonly frame: Phaser.GameObjects.NineSlice;
  private readonly caption: Phaser.GameObjects.Text | null;

  private readonly slotSize: number;

  constructor(scene: Phaser.Scene, x: number, y: number, size: number, caption?: string) {
    super(scene, x, y);
    this.slotSize = size;

    this.frame = scene.add
      .nineslice(
        0,
        0,
        TextureKeys.Frame,
        undefined,
        size,
        size,
        PANEL_SLICE,
        PANEL_SLICE,
        PANEL_SLICE,
        PANEL_SLICE,
      )
      .setOrigin(0.5, 0.5);

    this.caption = caption
      ? scene.add
          .text(0, size / 2 - 11, caption, labelStyle(9, UIText.accent, true))
          .setOrigin(0.5, 0.5)
      : null;

    this.add(this.frame);
    if (this.caption) this.add(this.caption);
    scene.add.existing(this);
  }

  /** Cercevenin kenar uzunlugu - yerlesim hesaplari bunu kullanir. */
  get sizePx(): number {
    return this.slotSize;
  }

  /**
   * Bir ogeyi cercevenin icine yerlestirir.
   *
   * Oge cercevenin COCUGU YAPILMAZ: sahnede kendi girdi kaydi olan bir
   * nesneyi baska bir kaba tasimak Phaser'in isabet testini bozuyor
   * (Sprint 14'te insa menusu kartlarinda bir kez yasandi). Bunun yerine
   * yalnizca KONUMU cerceveyle hizalanir; oge sahnede oldugu yerde kalir.
   */
  align(target: { setPosition: (x: number, y: number) => unknown }, offsetY = -4): void {
    target.setPosition(this.x, this.y + offsetY);
  }

  /** Ekranda kapladigi dikdortgen (girdi engelleme icin). */
  bounds(): Phaser.Geom.Rectangle {
    return new Phaser.Geom.Rectangle(
      this.x - this.slotSize / 2,
      this.y - this.slotSize / 2,
      this.slotSize,
      this.slotSize,
    );
  }
}
