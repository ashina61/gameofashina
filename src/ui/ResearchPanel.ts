import Phaser from 'phaser';
import { RESOURCE_ORDER, TextureKeys } from '@/config/Constants';
import { allResearch } from '@/config/ResearchCatalog';
import { iconKeyFor } from '@/render/IconArt';
import { TouchButton } from './TouchButton';
import { UIColors, UISpacing, UIText, labelStyle, titleStyle } from './UIStyle';
import type { ResearchDefinition, ResourceAmounts } from '@/types';

/** Bir arastirmanin oyuncuya gorunen durumu. */
export interface ResearchRowState {
  /** Tamamlandi. */
  done: boolean;
  /** Su an suruyor. */
  active: boolean;
  /** Baslatilabilir. */
  startable: boolean;
  /** Baslatilamiyorsa kisa sebep (kilit metni). */
  blocked: string;
}

/** Panelin disaridan aldigi baglantilar. */
export interface ResearchPanelHooks {
  /** Katalogdaki her arastirmanin o anki durumu. */
  stateOf: (id: string) => ResearchRowState;
  /** Devam eden arastirma: ad, kalan sure metni, 0..1 ilerleme. */
  activeInfo: () => { name: string; remaining: string; progress: number } | null;
  onStart: (id: string) => void;
  onClose: () => void;
}

/**
 * Arastirma sayfasi.
 *
 * Bes teknoloji tek bir listede durur; her satir NE KAZANDIRDIGINI,
 * maliyetini ve neden baslatilamadigini yazar. Oyuncunun "neden gri?"
 * diye sormasi gereken hicbir satir yoktur - kilit sebebi satirin
 * kendisinde yazilidir.
 *
 * Devam eden arastirma listenin USTUNDE ayri bir seritte durur: sehirdeki
 * insaat gibi arka planda isleyen bir surectir ve oyuncunun onu her an
 * gorebilmesi gerekir.
 */
export class ResearchPanel extends Phaser.GameObjects.Container {
  private static readonly HEIGHT = 312;
  private static readonly ROW_HEIGHT = 44;

  private readonly background: Phaser.GameObjects.NineSlice;
  private readonly titleText: Phaser.GameObjects.Text;
  private readonly closeButton: TouchButton;

  /** Devam eden arastirma seridi. */
  private readonly activeText: Phaser.GameObjects.Text;
  private readonly progressTrack: Phaser.GameObjects.Image;
  private readonly progressFill: Phaser.GameObjects.Image;

  private readonly rows: ResearchRow[] = [];

  private screenWidth: number;
  private screenHeight: number;
  private bottomInset = 0;
  private visibleState = false;

  constructor(
    scene: Phaser.Scene,
    width: number,
    height: number,
    private readonly hooks: ResearchPanelHooks,
  ) {
    super(scene, 0, height);
    this.screenWidth = width;
    this.screenHeight = height;

    this.background = scene.add
      .nineslice(0, 0, TextureKeys.Panel, undefined, width, ResearchPanel.HEIGHT, 18, 18, 18, 18)
      .setOrigin(0, 0);

    this.titleText = scene.add
      .text(UISpacing.panelPadding, 24, 'ARASTIRMA', titleStyle(16, UIText.accent))
      .setOrigin(0, 0.5);
    this.closeButton = new TouchButton(scene, 0, 0, 'Kapat', {
      width: 72,
      height: 34,
      fontSize: 12,
      onPress: () => this.hooks.onClose(),
    });

    this.activeText = scene.add
      .text(UISpacing.panelPadding, 52, '', labelStyle(12, UIText.primary, true))
      .setOrigin(0, 0.5);
    this.progressTrack = scene.add
      .image(0, 0, TextureKeys.Pixel)
      .setOrigin(0, 0.5)
      .setTint(0x000000)
      .setAlpha(0.45);
    this.progressFill = scene.add
      .image(0, 0, TextureKeys.Pixel)
      .setOrigin(0, 0.5)
      .setTint(UIColors.accent);

    this.add([
      this.background,
      this.titleText,
      this.closeButton,
      this.activeText,
      this.progressTrack,
      this.progressFill,
    ]);

    for (const def of allResearch()) {
      const row = new ResearchRow(scene, def, () => this.hooks.onStart(def.id));
      this.rows.push(row);
      this.add(row);
    }

    this.layout(width, height);
    this.setVisible(false);
    scene.add.existing(this);
  }

  static get height(): number {
    return ResearchPanel.HEIGHT;
  }

  get isOpen(): boolean {
    return this.visibleState;
  }

  bounds(): Phaser.Geom.Rectangle {
    return new Phaser.Geom.Rectangle(0, this.y, this.screenWidth, ResearchPanel.HEIGHT);
  }

  layout(width: number, height: number, bottomInset = 0): void {
    this.screenWidth = width;
    this.screenHeight = height;
    this.bottomInset = bottomInset;
    this.background.setSize(width, ResearchPanel.HEIGHT);

    const left = UISpacing.panelPadding;
    const right = width - UISpacing.panelPadding;
    this.closeButton.setPosition(right - 36, 24);
    this.progressTrack.setPosition(left, 68).setDisplaySize(right - left, 6);
    this.progressFill.setPosition(left, 68).setDisplaySize(1, 6);

    this.rows.forEach((row, index) => {
      row.setPosition(left, 84 + index * ResearchPanel.ROW_HEIGHT);
      row.resize(right - left, ResearchPanel.ROW_HEIGHT - 4);
    });

    this.setY(this.visibleState ? this.openY() : height);
  }

  /** Paneli gecerli duruma gore tazeler ve acar. */
  show(): void {
    this.refresh();
    this.setVisible(true);
    if (this.visibleState) return;
    this.visibleState = true;
    this.scene.tweens.add({
      targets: this,
      y: this.openY(),
      duration: 200,
      ease: 'Cubic.easeOut',
    });
  }

  hide(): void {
    if (!this.visibleState) return;
    this.visibleState = false;
    this.scene.tweens.add({
      targets: this,
      y: this.screenHeight,
      duration: 160,
      ease: 'Cubic.easeIn',
      onComplete: () => this.setVisible(false),
    });
  }

  /**
   * Satirlari ve ilerleme seridini yeniden cizer.
   *
   * Panel acikken duzenli cagrilir: arastirma arka planda ilerliyor ve
   * oyuncu kalan sureyi gormeli.
   */
  refresh(): void {
    const active = this.hooks.activeInfo();
    if (active) {
      this.activeText.setText(`${active.name} - ${active.remaining}`).setColor(UIText.accent);
      const full = this.screenWidth - UISpacing.panelPadding * 2;
      this.progressFill.setDisplaySize(Math.max(2, full * active.progress), 6);
      this.progressTrack.setVisible(true);
      this.progressFill.setVisible(true);
    } else {
      this.activeText.setText('Devam eden arastirma yok').setColor(UIText.muted);
      this.progressTrack.setVisible(false);
      this.progressFill.setVisible(false);
    }

    for (const row of this.rows) row.refresh(this.hooks.stateOf(row.definition.id));
  }

  private openY(): number {
    return this.screenHeight - this.bottomInset - ResearchPanel.HEIGHT;
  }
}

/** Listedeki tek bir arastirma satiri. */
class ResearchRow extends Phaser.GameObjects.Container {
  readonly definition: ResearchDefinition;

  private readonly frame: Phaser.GameObjects.NineSlice;
  private readonly nameText: Phaser.GameObjects.Text;
  private readonly statusText: Phaser.GameObjects.Text;
  private readonly costIcons: Phaser.GameObjects.Image[] = [];
  private readonly costTexts: Phaser.GameObjects.Text[] = [];
  private readonly zone: Phaser.GameObjects.Zone;

  private rowWidth = 300;

  constructor(scene: Phaser.Scene, def: ResearchDefinition, onPress: () => void) {
    super(scene, 0, 0);
    this.definition = def;

    this.frame = scene.add
      .nineslice(0, 0, TextureKeys.ButtonUp, undefined, 300, 40, 14, 14, 14, 14)
      .setOrigin(0, 0);
    this.nameText = scene.add
      .text(0, 0, def.name, labelStyle(13, UIText.primary, true))
      .setOrigin(0, 0.5);
    this.statusText = scene.add.text(0, 0, '', labelStyle(10, UIText.muted)).setOrigin(1, 0.5);

    for (let i = 0; i < 2; i += 1) {
      this.costIcons.push(
        scene.add.image(0, 0, iconKeyFor('gold')).setOrigin(0.5, 0.5).setDisplaySize(12, 12).setVisible(false),
      );
      this.costTexts.push(
        scene.add.text(0, 0, '', labelStyle(10, UIText.muted)).setOrigin(0, 0.5).setVisible(false),
      );
    }

    this.zone = scene.add.zone(0, 0, 300, 40).setOrigin(0, 0).setInteractive();
    this.zone.on(Phaser.Input.Events.GAMEOBJECT_POINTER_UP, onPress);

    this.add([this.frame, this.nameText, this.statusText, ...this.costIcons, ...this.costTexts, this.zone]);
    this.fillCost(def.cost);
  }

  resize(width: number, height: number): void {
    this.rowWidth = width;
    this.frame.setSize(width, height);
    this.zone.setSize(width, height);
    if (this.zone.input) this.zone.input.hitArea.setSize(width, height);

    this.nameText.setPosition(12, height / 2 - 8);
    this.statusText.setPosition(width - 12, height / 2 - 8);
    this.clampStatus();

    let x = 12;
    for (let i = 0; i < this.costIcons.length; i += 1) {
      if (!this.costIcons[i].visible) continue;
      this.costIcons[i].setPosition(x + 6, height / 2 + 10);
      this.costTexts[i].setPosition(x + 15, height / 2 + 10);
      x += 16 + this.costTexts[i].width + 10;
    }
  }

  /** Maliyet ikonlarini bir kez doldurur; maliyet statiktir. */
  private fillCost(cost: ResourceAmounts): void {
    let slot = 0;
    for (const key of RESOURCE_ORDER) {
      const amount = cost[key];
      if (!amount || slot >= this.costIcons.length) continue;
      this.costIcons[slot].setTexture(iconKeyFor(key)).setVisible(true);
      this.costTexts[slot].setText(`${amount}`).setVisible(true);
      slot += 1;
    }
  }

  /** Satiri duruma gore boyar ve durum metnini yazar. */
  refresh(state: ResearchRowState): void {
    if (state.done) {
      this.statusText.setText('TAMAMLANDI').setColor(UIText.success);
      this.nameText.setColor(UIText.success);
      this.setAlpha(0.85);
      return;
    }
    if (state.active) {
      this.statusText.setText('SURUYOR').setColor(UIText.accent);
      this.nameText.setColor(UIText.accent);
      this.setAlpha(1);
      return;
    }
    if (state.startable) {
      this.statusText.setText('BASLAT').setColor(UIText.accent);
      this.nameText.setColor(UIText.primary);
      this.setAlpha(1);
      return;
    }
    // Kilitli: SEBEBI yazilir. "Gri satir" oyuncuya hicbir sey ogretmez.
    this.statusText.setText(state.blocked).setColor(UIText.muted);
    this.nameText.setColor(UIText.muted);
    this.setAlpha(0.7);
    this.clampStatus();
  }

  /**
   * Durum metnini adin uzerine binmeyecek sekilde kisaltir.
   *
   * Sadece kisa metin YAZMAK yetmez: metnin uzunlugu koda dagilmis bir
   * varsayim olarak kalirdi ve bir gun biri uzun bir sebep eklediginde
   * satir yine okunamaz hale gelirdi (bir kez oldu: "Akademiyi yukselt:
   * bu arastirma daha ileri seviye ister." adin uzerine biniyordu).
   * Burasi o varsayimi bir KURALA cevirir - satir kendi sinirini bilir.
   */
  private clampStatus(): void {
    const budget = this.rowWidth - this.nameText.width - 28;
    if (budget <= 0 || this.statusText.width <= budget) return;

    const full = this.statusText.text;
    for (let cut = full.length - 1; cut > 0; cut -= 1) {
      this.statusText.setText(`${full.slice(0, cut)}...`);
      if (this.statusText.width <= budget) return;
    }
    this.statusText.setText('');
  }

  /** Satirin genisligi - olcum ve testler icin. */
  measuredWidth(): number {
    return this.rowWidth;
  }
}
