import Phaser from 'phaser';
import { RESOURCE_META, RESOURCE_ORDER, TextureKeys } from '@/config/Constants';
import { getBuilding } from '@/config/BuildingCatalog';
import { formatDuration } from '@/utils/Format';
import { TouchButton } from './TouchButton';
import { UISpacing, UIText, labelStyle } from './UIStyle';
import type { BuildingInstance, TileData } from '@/types';

/** Zemin turlerinin kullaniciya gosterilen adlari. */
const TERRAIN_LABELS: Record<string, string> = {
  grass: 'Cimen',
  soil: 'Verimli toprak',
  water: 'Su',
  rock: 'Kayalik',
};

/**
 * Secilen hucre veya bina hakkinda bilgi veren alt panel.
 * Bina seciliyse uretim/isci ozeti ve yikma butonu gosterilir.
 */
export class InfoPanel extends Phaser.GameObjects.Container {
  private static readonly HEIGHT = 132;

  private readonly background: Phaser.GameObjects.NineSlice;
  private readonly titleText: Phaser.GameObjects.Text;
  private readonly bodyText: Phaser.GameObjects.Text;
  private readonly demolishButton: TouchButton;

  private screenWidth: number;
  private screenHeight: number;
  private visibleState = false;
  private currentUid: string | null = null;
  /** Panelde gosterilen bina; bos karo seciliyse null. */
  private currentBuilding: BuildingInstance | null = null;

  constructor(
    scene: Phaser.Scene,
    width: number,
    height: number,
    private readonly onDemolish: (uid: string) => void,
  ) {
    super(scene, 0, height);
    this.screenWidth = width;
    this.screenHeight = height;

    this.background = scene.add
      .nineslice(0, 0, TextureKeys.Panel, undefined, width, InfoPanel.HEIGHT, 18, 18, 18, 18)
      .setOrigin(0, 0);

    this.titleText = scene.add.text(
      UISpacing.panelPadding,
      14,
      '',
      labelStyle(17, UIText.accent, true),
    );

    this.bodyText = scene.add.text(
      UISpacing.panelPadding,
      42,
      '',
      labelStyle(13, UIText.primary),
    );
    this.bodyText.setLineSpacing(4);

    this.demolishButton = new TouchButton(scene, 0, 0, 'Yik', {
      width: 96,
      height: 42,
      fontSize: 14,
      color: UIText.danger,
      onPress: () => {
        if (this.currentUid) this.onDemolish(this.currentUid);
      },
    });

    this.add([this.background, this.titleText, this.bodyText, this.demolishButton]);
    this.layout(width, height);
    this.setVisible(false);
    scene.add.existing(this);
  }

  /** Panelin ekranda kapladigi yukseklik. */
  static get height(): number {
    return InfoPanel.HEIGHT;
  }

  /** Panelin ekranda olup olmadigini soyler. */
  get isOpen(): boolean {
    return this.visibleState;
  }

  /** Ekranda kapladigi dikdortgen (girdi engelleme icin). */
  bounds(): Phaser.Geom.Rectangle {
    return new Phaser.Geom.Rectangle(0, this.y, this.screenWidth, InfoPanel.HEIGHT);
  }

  layout(width: number, height: number): void {
    this.screenWidth = width;
    this.screenHeight = height;
    this.background.setSize(width, InfoPanel.HEIGHT);
    this.bodyText.setWordWrapWidth(width - UISpacing.panelPadding * 2 - 110);
    this.demolishButton.setPosition(width - UISpacing.panelPadding - 48, InfoPanel.HEIGHT - 34);
    this.setY(this.visibleState ? height - InfoPanel.HEIGHT : height);
  }

  /** Secilen hucreyi gosterir; hucre bossa zemin bilgisi verilir. */
  show(tile: TileData, building: BuildingInstance | null): void {
    this.currentUid = building?.uid ?? null;
    this.currentBuilding = building;

    if (building) {
      this.showBuilding(building);
    } else {
      this.showTerrain(tile);
    }

    this.demolishButton.setVisible(building !== null);
    this.open();
  }

  /**
   * Insaat halindeki bina icin geri sayimi tazeler.
   * UIScene tarafindan duzenli araliklarla cagrilir; panel kapaliysa veya
   * bina tamamlanmissa hicbir sey yapmaz.
   */
  tick(): void {
    if (!this.visibleState) return;
    const building = this.currentBuilding;
    if (!building || building.complete) return;
    this.showBuilding(building);
  }

  /** Paneli kapatir. */
  hide(): void {
    if (!this.visibleState) return;
    this.visibleState = false;
    this.currentUid = null;
    this.currentBuilding = null;
    this.scene.tweens.add({
      targets: this,
      y: this.screenHeight,
      duration: 160,
      ease: 'Cubic.easeIn',
      onComplete: () => this.setVisible(false),
    });
  }

  private open(): void {
    this.setVisible(true);
    if (this.visibleState) return;
    this.visibleState = true;
    this.scene.tweens.add({
      targets: this,
      y: this.screenHeight - InfoPanel.HEIGHT,
      duration: 200,
      ease: 'Cubic.easeOut',
    });
  }

  private showBuilding(building: BuildingInstance): void {
    const def = getBuilding(building.defId);
    this.titleText.setText(def.name);

    const lines: string[] = [];
    if (!building.complete) {
      lines.push(`Insa ediliyor - ${formatDuration(building.remainingBuildTime)} kaldi`);
    }
    if (def.production) {
      const parts = RESOURCE_ORDER.filter((key) => def.production?.[key]).map(
        (key) => `${RESOURCE_META[key].label} +${def.production?.[key]}/dk`,
      );
      if (parts.length) lines.push(parts.join('  '));
    }
    if (def.workers) lines.push(`${def.workers} isci calistirir`);
    if (def.populationCapacity) lines.push(`+${def.populationCapacity} nufus kapasitesi`);
    if (def.storageCapacity) lines.push(`+${def.storageCapacity} depo`);
    if (!lines.length) lines.push(def.description);

    this.bodyText.setText(lines.join('\n'));
  }

  private showTerrain(tile: TileData): void {
    this.titleText.setText(TERRAIN_LABELS[tile.terrain] ?? tile.terrain);
    this.bodyText.setText(
      `Konum ${tile.gx}, ${tile.gy}\nBu alan bos. Insa etmek icin alttaki menuyu kullan.`,
    );
  }
}
