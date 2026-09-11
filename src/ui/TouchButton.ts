import Phaser from 'phaser';
import { TextureKeys } from '@/config/Constants';
import { TOUCH_TARGET, labelStyle } from './UIStyle';

export interface TouchButtonConfig {
  width?: number;
  height?: number;
  fontSize?: number;
  color?: string;
  onPress: () => void;
}

/**
 * Mobil icin dokunma dostu buton.
 *
 * Asgari 48px yukseklik, basili durumda gorsel geri bildirim ve
 * pointerupoutside ile iptal davranisi saglar; boylece kullanici parmagini
 * kaydirarak yanlislikla basmaktan kacinabilir.
 */
export class TouchButton extends Phaser.GameObjects.Container {
  private readonly background: Phaser.GameObjects.NineSlice;
  private readonly label: Phaser.GameObjects.Text;
  private pressed = false;
  private enabled = true;

  constructor(scene: Phaser.Scene, x: number, y: number, text: string, config: TouchButtonConfig) {
    super(scene, x, y);

    const width = config.width ?? 140;
    const height = config.height ?? TOUCH_TARGET;

    this.background = scene.add
      .nineslice(0, 0, TextureKeys.ButtonUp, undefined, width, height, 16, 16, 16, 16)
      .setOrigin(0.5, 0.5);

    this.label = scene.add
      .text(0, 0, text, labelStyle(config.fontSize ?? 15, config.color, true))
      .setOrigin(0.5, 0.5);

    this.add([this.background, this.label]);
    this.setSize(width, height);

    // Hit alani (0,0)'dan baslar, -width/2'den DEGIL.
    //
    // Phaser, isabet testinden once yerel noktaya nesnenin display origin'ini
    // ekler. Merkezlenmis bir dikdortgen vermek kaydirmayi IKI KEZ uygular:
    // gercek dokunma alani butonun sol ustune kayar ve sag-alt kosesi tam
    // butonun MERKEZINDE biter. Olculdu: 132x52 butonun merkezinin 46px
    // sagina basmak hicbir sey yapmiyordu, cunku orasi hit alaninin disiydi.
    // BuildMenu karti bastan beri dogru formu kullaniyordu.
    this.setInteractive(
      new Phaser.Geom.Rectangle(0, 0, width, height),
      Phaser.Geom.Rectangle.Contains,
    );

    this.on(Phaser.Input.Events.GAMEOBJECT_POINTER_DOWN, () => this.setPressed(true));
    this.on(Phaser.Input.Events.GAMEOBJECT_POINTER_OUT, () => this.setPressed(false));
    this.on(Phaser.Input.Events.GAMEOBJECT_POINTER_UP, () => {
      const wasPressed = this.pressed;
      this.setPressed(false);
      if (wasPressed && this.enabled) config.onPress();
    });

    scene.add.existing(this);
  }

  /** Buton metnini gunceller. */
  setText(text: string): this {
    this.label.setText(text);
    return this;
  }

  /** Butonu etkin/devre disi yapar; devre disi buton soluk gorunur. */
  setEnabled(value: boolean): this {
    this.enabled = value;
    this.setAlpha(value ? 1 : 0.45);
    // Hit alanini korumak icin interaktifligi kaldirmak yerine kapatiyoruz.
    if (this.input) this.input.enabled = value;
    return this;
  }

  private setPressed(value: boolean): void {
    if (this.pressed === value) return;
    this.pressed = value;
    this.background.setTexture(value ? TextureKeys.ButtonDown : TextureKeys.ButtonUp);
    this.setScale(value ? 0.97 : 1);
  }
}
