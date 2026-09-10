import Phaser from 'phaser';
import { RESOURCE_META, RESOURCE_ORDER, TextureKeys } from '@/config/Constants';
import { allBuildings } from '@/config/BuildingCatalog';
import { resolveBuildPreview, ticksToSeconds } from '@/systems/BuildingResolver';
import { formatDuration } from '@/utils/Format';
import { TOUCH_TARGET, UISpacing, UIText, labelStyle } from './UIStyle';
import type { BuildPreview, BuildingDefinition, BuildingId, ResourcePool } from '@/types';

/**
 * Alttan acilan insa menusu.
 *
 * Yatay olarak parmakla kaydirilabilir bir kart listesi sunar. Karsilanamayan
 * maliyetler kirmizi gosterilir ve kart secilemez hale gelir; oyuncu neden
 * insa edemedigini kart uzerinde gorur.
 */
export class BuildMenu extends Phaser.GameObjects.Container {
  private static readonly CARD_WIDTH = 132;
  private static readonly CARD_GAP = 10;
  private static readonly HEIGHT = 168;

  private readonly background: Phaser.GameObjects.NineSlice;
  private readonly scroller: Phaser.GameObjects.Container;
  private readonly cards: BuildCard[] = [];
  private readonly maskShape: Phaser.GameObjects.Graphics;

  private open = false;
  private screenWidth: number;
  private screenHeight: number;
  private scrollX = 0;
  private dragStartX = 0;
  private dragStartScroll = 0;
  private dragging = false;
  /** Bu jest sirasinda parmagin kat ettigi en buyuk yatay mesafe. */
  private dragDistance = 0;

  constructor(
    scene: Phaser.Scene,
    width: number,
    height: number,
    private readonly onSelect: (defId: BuildingId) => void,
  ) {
    super(scene, 0, height);
    this.screenWidth = width;
    this.screenHeight = height;

    this.background = scene.add
      .nineslice(0, 0, TextureKeys.Panel, undefined, width, BuildMenu.HEIGHT, 18, 18, 18, 18)
      .setOrigin(0, 0);

    const title = scene.add
      .text(UISpacing.panelPadding, 12, 'INSA ET', labelStyle(13, UIText.accent, true))
      .setOrigin(0, 0);
    title.setLetterSpacing?.(2);

    this.scroller = scene.add.container(0, 44);
    this.maskShape = scene.add.graphics().setVisible(false);

    this.add([this.background, title, this.scroller]);
    this.buildCards();
    this.applyMask();

    // Kart listesi parmakla yatay kaydirilir. Kartlar da interaktif oldugu icin
    // kaydirma sahne seviyesinde dinlenir; boylece kartin uzerinden baslayan
    // surukleme de listeyi kaydirir.
    scene.input.on(Phaser.Input.Events.POINTER_DOWN, this.onScrollStart, this);
    scene.input.on(Phaser.Input.Events.POINTER_MOVE, this.onScrollMove, this);
    scene.input.on(Phaser.Input.Events.POINTER_UP, this.onScrollEnd, this);

    this.setVisible(false);
    scene.add.existing(this);
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, this.teardown, this);
  }

  /** Menunun ekranda kapladigi yukseklik. */
  static get height(): number {
    return BuildMenu.HEIGHT;
  }

  /** Menunun kapali/acik oldugunu soyler. */
  get isOpen(): boolean {
    return this.open;
  }

  /** Menuyu asagidan yukari kaydirarak acar. */
  show(): void {
    if (this.open) return;
    this.open = true;
    this.setVisible(true);
    this.scene.tweens.add({
      targets: this,
      y: this.screenHeight - BuildMenu.HEIGHT,
      duration: 220,
      ease: 'Cubic.easeOut',
    });
  }

  /** Menuyu gizler. */
  hide(): void {
    if (!this.open) return;
    this.open = false;
    this.scene.tweens.add({
      targets: this,
      y: this.screenHeight,
      duration: 180,
      ease: 'Cubic.easeIn',
      onComplete: () => this.setVisible(false),
    });
  }

  /** Ekran olculeri degistiginde konumu ve maskeyi tazeler. */
  layout(width: number, height: number): void {
    this.screenWidth = width;
    this.screenHeight = height;
    this.background.setSize(width, BuildMenu.HEIGHT);
    this.setY(this.open ? height - BuildMenu.HEIGHT : height);
    this.applyMask();
  }

  /** Kaynak durumuna gore kartlarin satin alinabilirligini gunceller. */
  refreshAffordability(resources: ResourcePool): void {
    for (const card of this.cards) {
      card.updateAffordability(resources);
    }
  }

  private buildCards(): void {
    allBuildings().forEach((def, index) => {
      const x = UISpacing.panelPadding + index * (BuildMenu.CARD_WIDTH + BuildMenu.CARD_GAP);
      const card = new BuildCard(this.scene, x, 0, def, BuildMenu.CARD_WIDTH, () => {
        // Kaydirma jestinin sonundaki dokunus kart secimi sayilmaz.
        if (this.dragDistance <= 8) this.onSelect(def.id);
      });
      this.cards.push(card);
      this.scroller.add(card);
    });
  }

  /** Kart listesinin panel disina tasmamasi icin dikdortgen maske uygular. */
  private applyMask(): void {
    this.maskShape.clear();
    this.maskShape.fillStyle(0xffffff, 1);
    this.maskShape.fillRect(0, 0, this.screenWidth, BuildMenu.HEIGHT - 44);
    // Maske dunya koordinatinda calisir; scroller'in ekrandaki yerine tasinir.
    this.maskShape.setPosition(0, this.screenHeight - BuildMenu.HEIGHT + 44);
    this.scroller.setMask(this.maskShape.createGeometryMask());
  }

  private onScrollStart(pointer: Phaser.Input.Pointer): void {
    if (!this.open || !this.containsPointer(pointer.y)) return;
    this.dragging = true;
    this.dragDistance = 0;
    this.dragStartX = pointer.x;
    this.dragStartScroll = this.scrollX;
  }

  private onScrollMove(pointer: Phaser.Input.Pointer): void {
    if (!this.dragging) return;
    const delta = pointer.x - this.dragStartX;
    this.dragDistance = Math.max(this.dragDistance, Math.abs(delta));
    this.scrollX = Phaser.Math.Clamp(this.dragStartScroll + delta, this.minScroll(), 0);
    this.scroller.setX(this.scrollX);
  }

  /** Dokunusun menu alani icinde olup olmadigini kontrol eder. */
  private containsPointer(screenY: number): boolean {
    return screenY >= this.y && screenY <= this.y + BuildMenu.HEIGHT;
  }

  /** Menunun ekranda kapladigi dikdortgen (girdi engelleme icin). */
  bounds(): Phaser.Geom.Rectangle {
    return new Phaser.Geom.Rectangle(0, this.y, this.screenWidth, BuildMenu.HEIGHT);
  }

  private onScrollEnd(): void {
    this.dragging = false;
  }

  /** Listenin sola kaydirilabilecegi en uc nokta. */
  private minScroll(): number {
    const contentWidth =
      this.cards.length * (BuildMenu.CARD_WIDTH + BuildMenu.CARD_GAP) + UISpacing.panelPadding;
    return Math.min(0, this.screenWidth - contentWidth);
  }

  private teardown(): void {
    this.scene.input.off(Phaser.Input.Events.POINTER_DOWN, this.onScrollStart, this);
    this.scene.input.off(Phaser.Input.Events.POINTER_MOVE, this.onScrollMove, this);
    this.scene.input.off(Phaser.Input.Events.POINTER_UP, this.onScrollEnd, this);
  }
}

/** Insa menusundeki tek bir bina karti. */
class BuildCard extends Phaser.GameObjects.Container {
  /** Maliyet ve sure tek kaynaktan (BuildingResolver) gelir. */
  private readonly preview: BuildPreview;
  private readonly frame: Phaser.GameObjects.NineSlice;
  private readonly costTexts: { key: string; text: Phaser.GameObjects.Text }[] = [];
  private affordable = true;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    def: BuildingDefinition,
    width: number,
    onPress: () => void,
  ) {
    super(scene, x, y);
    this.preview = resolveBuildPreview(def);

    const height = 112;
    this.frame = scene.add
      .nineslice(0, 0, TextureKeys.ButtonUp, undefined, width, height, 14, 14, 14, 14)
      .setOrigin(0, 0);

    // Bina renginden bir ipucu serit
    const stripe = scene.add.graphics();
    stripe.fillStyle(def.tint, 1);
    stripe.fillRoundedRect(10, 10, width - 20, 6, 3);

    const name = scene.add.text(10, 22, def.name, labelStyle(14, UIText.primary, true));
    const time = scene.add.text(
      10,
      42,
      `${formatDuration(ticksToSeconds(this.preview.buildTimeTicks))} insa`,
      labelStyle(11, UIText.muted),
    );

    this.add([this.frame, stripe, name, time]);

    let costY = 60;
    for (const key of RESOURCE_ORDER) {
      const amount = this.preview.cost[key];
      if (!amount) continue;
      const text = scene.add.text(
        10,
        costY,
        `${RESOURCE_META[key].label} ${amount}`,
        labelStyle(11, UIText.muted),
      );
      this.costTexts.push({ key, text });
      this.add(text);
      costY += 15;
    }

    this.setSize(width, height);
    this.frame.setInteractive(
      new Phaser.Geom.Rectangle(0, 0, width, height),
      Phaser.Geom.Rectangle.Contains,
    );

    this.frame.on(Phaser.Input.Events.GAMEOBJECT_POINTER_DOWN, () => {
      this.frame.setTexture(TextureKeys.ButtonDown);
    });
    this.frame.on(Phaser.Input.Events.GAMEOBJECT_POINTER_OUT, () => {
      this.frame.setTexture(TextureKeys.ButtonUp);
    });
    this.frame.on(Phaser.Input.Events.GAMEOBJECT_POINTER_UP, () => {
      this.frame.setTexture(TextureKeys.ButtonUp);
      if (this.affordable) onPress();
    });
  }

  /** Kaynaklara gore kart rengini ve secilebilirligini gunceller. */
  updateAffordability(resources: ResourcePool): void {
    this.affordable = RESOURCE_ORDER.every(
      (key) => resources[key] >= (this.preview.cost[key] ?? 0),
    );

    for (const entry of this.costTexts) {
      const key = entry.key as keyof ResourcePool;
      const enough = resources[key] >= (this.preview.cost[key] ?? 0);
      entry.text.setColor(enough ? UIText.muted : UIText.danger);
    }
    this.setAlpha(this.affordable ? 1 : 0.55);
  }
}

/** Menuyu acan eylem butonunun yuksekligi. */
export const BUILD_MENU_BUTTON_SIZE = TOUCH_TARGET + 8;
