import Phaser from 'phaser';
import { TextureKeys } from '@/config/Constants';
import { TouchButton } from './TouchButton';
import { UISpacing, UIText, labelStyle } from './UIStyle';

/** Panelde gosterilecek tek bir satir. */
export interface CityPanelRow {
  label: string;
  value: string;
  /** Dikkat cekmesi gereken satir vurgulanir. */
  highlight?: boolean;
}

/**
 * Alt gezinme cubugundaki NUFUS / ISCILER / DAHA sekmelerinin ozet paneli.
 *
 * Bilgi paneliyle ayni alani kullanir ve ayni anda ikisi acilmaz; sehir
 * gorunumunun ustunde SADECE bir sayfa durur. Panelin kendi hesabi yoktur -
 * satirlari UIScene sistemlerden toplayip verir.
 */
export class CityPanel extends Phaser.GameObjects.Container {
  private static readonly HEIGHT = 172;
  private static readonly MAX_ROWS = 5;

  private readonly background: Phaser.GameObjects.NineSlice;
  private readonly titleText: Phaser.GameObjects.Text;
  private readonly hintText: Phaser.GameObjects.Text;
  private readonly labels: Phaser.GameObjects.Text[] = [];
  private readonly values: Phaser.GameObjects.Text[] = [];
  private readonly closeButton: TouchButton;

  private screenWidth: number;
  private screenHeight: number;
  private bottomInset = 0;
  private visibleState = false;

  constructor(scene: Phaser.Scene, width: number, height: number, private readonly onClose: () => void) {
    super(scene, 0, height);
    this.screenWidth = width;
    this.screenHeight = height;

    this.background = scene.add
      .nineslice(0, 0, TextureKeys.Panel, undefined, width, CityPanel.HEIGHT, 18, 18, 18, 18)
      .setOrigin(0, 0);

    this.titleText = scene.add.text(
      UISpacing.panelPadding,
      14,
      '',
      labelStyle(16, UIText.accent, true),
    );
    this.hintText = scene.add.text(
      UISpacing.panelPadding,
      CityPanel.HEIGHT - 26,
      '',
      labelStyle(11, UIText.muted),
    );

    for (let i = 0; i < CityPanel.MAX_ROWS; i += 1) {
      this.labels.push(scene.add.text(0, 0, '', labelStyle(13, UIText.primary)).setOrigin(0, 0.5));
      this.values.push(
        scene.add.text(0, 0, '', labelStyle(13, UIText.primary, true)).setOrigin(1, 0.5),
      );
    }

    this.closeButton = new TouchButton(scene, 0, 0, 'Kapat', {
      width: 78,
      height: 38,
      fontSize: 13,
      onPress: () => this.onClose(),
    });

    this.add([this.background, this.titleText, this.hintText, ...this.labels, ...this.values, this.closeButton]);
    this.layout(width, height);
    this.setVisible(false);
    scene.add.existing(this);
  }

  static get height(): number {
    return CityPanel.HEIGHT;
  }

  get isOpen(): boolean {
    return this.visibleState;
  }

  bounds(): Phaser.Geom.Rectangle {
    return new Phaser.Geom.Rectangle(0, this.y, this.screenWidth, CityPanel.HEIGHT);
  }

  layout(width: number, height: number, bottomInset = 0): void {
    this.screenWidth = width;
    this.screenHeight = height;
    this.bottomInset = bottomInset;
    this.background.setSize(width, CityPanel.HEIGHT);

    const left = UISpacing.panelPadding;
    const right = width - UISpacing.panelPadding;
    for (let i = 0; i < CityPanel.MAX_ROWS; i += 1) {
      const y = 48 + i * 21;
      this.labels[i].setPosition(left, y);
      this.values[i].setPosition(right, y);
    }
    this.hintText.setPosition(left, CityPanel.HEIGHT - 24);
    this.closeButton.setPosition(right - 39, 28);
    this.setY(this.visibleState ? this.openY() : height);
  }

  /** Paneli verilen basliga ve satirlara gore doldurur ve acar. */
  show(title: string, rows: CityPanelRow[], hint = ''): void {
    this.titleText.setText(title);
    this.hintText.setText(hint);

    for (let i = 0; i < CityPanel.MAX_ROWS; i += 1) {
      const row = rows[i];
      this.labels[i].setText(row?.label ?? '').setVisible(Boolean(row));
      this.values[i]
        .setText(row?.value ?? '')
        .setVisible(Boolean(row))
        .setColor(row?.highlight ? UIText.accent : UIText.primary);
    }

    this.setVisible(true);
    if (this.visibleState) return;
    this.visibleState = true;
    this.scene.tweens.add({
      targets: this,
      y: this.openY(),
      duration: 180,
      ease: 'Cubic.easeOut',
    });
  }

  hide(): void {
    if (!this.visibleState) return;
    this.visibleState = false;
    this.scene.tweens.add({
      targets: this,
      y: this.screenHeight,
      duration: 150,
      ease: 'Cubic.easeIn',
      onComplete: () => this.setVisible(false),
    });
  }

  /** Panelin acik konumu; gezinme cubugunun ve kenar payinin uzerinde. */
  private openY(): number {
    return this.screenHeight - this.bottomInset - CityPanel.HEIGHT;
  }
}
