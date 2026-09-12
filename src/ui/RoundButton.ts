import Phaser from 'phaser';
import { TextureKeys } from '@/config/Constants';
import { iconKeyFor } from '@/render/IconArt';
import { TOUCH_TARGET, UIText, labelStyle } from './UIStyle';
import type { IconKind } from '@/render/IconArt';

export interface RoundButtonConfig {
  icon: IconKind;
  /** Butonun capi (mantiksal piksel). Asgari dokunma hedefine kirpilir. */
  size?: number;
  /** Dairenin altinda gosterilen kisa etiket. */
  label?: string;
  onPress: () => void;
}

/**
 * Yuvarlak ikon butonu.
 *
 * Sehir gorunumunun uzerinde duran yardimci eylemler (ayarlar, mesaj,
 * basari, harita) ve ana insa eylemi bu bicimi kullanir: daire sehirden
 * gorsel olarak ayrisir ve dikdortgen panellerle karismaz.
 *
 * Cap asla TOUCH_TARGET'in altina inmez; kucuk bir ikon butonu mobilde
 * isabet edilemez hale gelirdi.
 */
export class RoundButton extends Phaser.GameObjects.Container {
  private readonly background: Phaser.GameObjects.Image;
  private readonly icon: Phaser.GameObjects.Image;
  private readonly label: Phaser.GameObjects.Text | null;
  private readonly diameter: number;
  private pressed = false;

  constructor(scene: Phaser.Scene, x: number, y: number, config: RoundButtonConfig) {
    super(scene, x, y);
    this.diameter = Math.max(TOUCH_TARGET, config.size ?? TOUCH_TARGET);

    this.background = scene.add
      .image(0, 0, TextureKeys.RoundUp)
      .setOrigin(0.5, 0.5)
      .setDisplaySize(this.diameter, this.diameter);
    this.icon = scene.add
      .image(0, 0, iconKeyFor(config.icon))
      .setOrigin(0.5, 0.5)
      .setDisplaySize(this.diameter * 0.5, this.diameter * 0.5);

    this.label = config.label
      ? scene.add
          .text(0, this.diameter / 2 + 9, config.label, labelStyle(10, UIText.accent, true))
          .setOrigin(0.5, 0.5)
      : null;

    this.add([this.background, this.icon]);
    if (this.label) this.add(this.label);

    this.setSize(this.diameter, this.diameter);
    // Hit alani (0,0)'dan baslar: Phaser isabet testinden once display
    // origin'i ekliyor, merkezlenmis dikdortgen kaydirmayi iki kez uygular.
    this.setInteractive(
      new Phaser.Geom.Rectangle(0, 0, this.diameter, this.diameter),
      Phaser.Geom.Rectangle.Contains,
    );

    this.on(Phaser.Input.Events.GAMEOBJECT_POINTER_DOWN, () => this.setPressed(true));
    this.on(Phaser.Input.Events.GAMEOBJECT_POINTER_OUT, () => this.setPressed(false));
    this.on(Phaser.Input.Events.GAMEOBJECT_POINTER_UP, () => {
      const was = this.pressed;
      this.setPressed(false);
      if (was) config.onPress();
    });

    scene.add.existing(this);
  }

  /** Butonun capi; yerlesim hesaplari bunu kullanir. */
  get diameterPx(): number {
    return this.diameter;
  }

  private setPressed(value: boolean): void {
    if (this.pressed === value) return;
    this.pressed = value;
    this.background.setTexture(value ? TextureKeys.RoundDown : TextureKeys.RoundUp);
    this.setScale(value ? 0.95 : 1);
  }
}
