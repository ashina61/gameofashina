import Phaser from 'phaser';
import { TextureKeys } from '@/config/Constants';
import { UIText, labelStyle } from './UIStyle';

/** Bildirim tonuna gore metin rengi. */
const TONE_COLORS = {
  info: UIText.primary,
  success: UIText.success,
  error: UIText.danger,
} as const;

export type ToastTone = keyof typeof TONE_COLORS;

/**
 * Ekranin ustunde kisa sureli bildirimler gosterir.
 * Ayni anda yalnizca bir bildirim gorunur; yenisi geleni eskisinin yerini alir.
 */
export class Toast extends Phaser.GameObjects.Container {
  private readonly background: Phaser.GameObjects.NineSlice;
  private readonly label: Phaser.GameObjects.Text;
  private hideEvent?: Phaser.Time.TimerEvent;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y);

    this.background = scene.add
      .nineslice(0, 0, TextureKeys.Panel, undefined, 240, 40, 16, 16, 16, 16)
      .setOrigin(0.5, 0.5);

    this.label = scene.add.text(0, 0, '', labelStyle(13)).setOrigin(0.5, 0.5);

    this.add([this.background, this.label]);
    this.setAlpha(0);
    scene.add.existing(this);
  }

  /** Bildirimi gosterir ve belirli sure sonra soldurur. */
  show(message: string, tone: ToastTone = 'info', durationMs = 2200): void {
    this.label.setText(message).setColor(TONE_COLORS[tone]);
    this.background.setSize(this.label.width + 36, Math.max(40, this.label.height + 18));

    this.hideEvent?.remove();
    this.scene.tweens.killTweensOf(this);
    this.setAlpha(1).setScale(1);

    this.hideEvent = this.scene.time.delayedCall(durationMs, () => {
      this.scene.tweens.add({
        targets: this,
        alpha: 0,
        duration: 260,
        ease: 'Sine.easeIn',
      });
    });
  }

  /** Ekran genisligi degistiginde yeniden ortalar. */
  layout(x: number, y: number): void {
    this.setPosition(x, y);
  }
}
