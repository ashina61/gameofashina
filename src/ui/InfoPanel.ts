import Phaser from 'phaser';
import { RESOURCE_META, RESOURCE_ORDER, TextureKeys } from '@/config/Constants';
import { resolveBuilding, ticksToSeconds } from '@/systems/BuildingResolver';
import { getBuilding } from '@/config/BuildingCatalog';
import { formatDuration } from '@/utils/Format';
import { TouchButton } from './TouchButton';
import { UISpacing, UIText, labelStyle } from './UIStyle';
import type { BuildingInstance, ResolvedBuilding, ResourceAmounts, TileData } from '@/types';

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
  private readonly upgradeButton: TouchButton;

  private screenWidth: number;
  private screenHeight: number;
  private bottomInset = 0;
  private visibleState = false;
  private currentUid: string | null = null;
  /** Panelde gosterilen bina; bos karo seciliyse null. */
  private currentBuilding: BuildingInstance | null = null;
  /** Geri sayimi hesaplamak icin son bilinen simulasyon tiki. */
  private currentTick = 0;
  /** Yukseltme yuvasindaki butonun o anki islevi. */
  private upgradeButtonMode: 'upgrade' | 'cancel' = 'upgrade';

  constructor(
    scene: Phaser.Scene,
    width: number,
    height: number,
    private readonly onDemolish: (uid: string) => void,
    private readonly onUpgrade: (uid: string) => void,
    private readonly onCancelUpgrade: (uid: string) => void,
    /** Maliyetin karsilanip karsilanamadigini soran yordam (ResourceSystem). */
    private readonly canAfford: (cost: ResourceAmounts) => boolean,
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

    this.upgradeButton = new TouchButton(scene, 0, 0, 'Yukselt', {
      width: 96,
      height: 42,
      fontSize: 14,
      color: UIText.accent,
      onPress: () => {
        if (!this.currentUid) return;
        // Ayni yuva iki isi gorur: gorev yokken yukseltir, yukseltme
        // surerken iptal eder. Yerlesim degismez.
        if (this.upgradeButtonMode === 'cancel') {
          this.onCancelUpgrade(this.currentUid);
        } else {
          this.onUpgrade(this.currentUid);
        }
      },
    });

    this.add([
      this.background,
      this.titleText,
      this.bodyText,
      this.upgradeButton,
      this.demolishButton,
    ]);
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

  layout(width: number, height: number, bottomInset = 0): void {
    this.screenWidth = width;
    this.screenHeight = height;
    this.bottomInset = bottomInset;
    this.background.setSize(width, InfoPanel.HEIGHT);
    this.bodyText.setWordWrapWidth(width - UISpacing.panelPadding * 2 - 110);
    this.upgradeButton.setPosition(width - UISpacing.panelPadding - 48, InfoPanel.HEIGHT - 82);
    this.demolishButton.setPosition(width - UISpacing.panelPadding - 48, InfoPanel.HEIGHT - 34);
    this.setY(this.visibleState ? this.openY() : height);
  }

  /** Panelin acik konumu; alt kenar payi kadar yukarida durur. */
  private openY(): number {
    return this.screenHeight - this.bottomInset - InfoPanel.HEIGHT;
  }

  /** Secilen hucreyi gosterir; hucre bossa zemin bilgisi verilir. */
  show(tile: TileData, building: BuildingInstance | null, tick: number): void {
    this.currentUid = building?.uid ?? null;
    this.currentBuilding = building;
    this.currentTick = tick;

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
  tick(currentTick: number): void {
    if (!this.visibleState) return;
    const building = this.currentBuilding;
    // Yalnizca devam eden bir gorev varken tazelenir.
    if (!building?.construction) return;
    this.currentTick = currentTick;
    this.showBuilding(building);
  }

  /**
   * Paneli mevcut secim icin yeniden cizer.
   * Kaynak degistiginde cagrilir; aksi halde yukseltme butonunun etkin/devre
   * disi durumu bayat kalir.
   */
  refresh(currentTick: number): void {
    if (!this.visibleState) return;
    this.currentTick = currentTick;
    if (this.currentBuilding) this.showBuilding(this.currentBuilding);
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
      y: this.openY(),
      duration: 200,
      ease: 'Cubic.easeOut',
    });
  }

  /**
   * Bina bilgisini gosterir.
   * Tum sayilar BuildingResolver'dan gelir; panel kendi hesabini yapmaz.
   */
  private showBuilding(building: BuildingInstance): void {
    const def = getBuilding(building.type);
    const resolved: ResolvedBuilding = resolveBuilding(building, def, this.currentTick);

    // Seviye 1'i gostermeye gerek yok; ustu bilgi tasir.
    this.titleText.setText(
      resolved.level > 1 ? `${def.name} (Sv. ${resolved.level})` : def.name,
    );

    const lines: string[] = [];

    const task = resolved.construction;
    if (task) {
      const verb = task.kind === 'upgrade' ? 'Yukseltiliyor' : 'Insa ediliyor';
      if (task.status === 'queued') {
        lines.push(`${verb} - sirada bekliyor`);
      } else {
        lines.push(`${verb} - ${formatDuration(ticksToSeconds(task.remainingTicks))} kaldi`);
      }
    }

    // Insaat sirasinda uretim degerleri sifirdir; o seviyenin tanimini gosteririz.
    const production = resolved.construction
      ? (def.levels.find((l) => l.level === resolved.level)?.production ?? {})
      : resolved.production;

    const parts = RESOURCE_ORDER.filter((key) => production[key]).map(
      (key) => `${RESOURCE_META[key].label} +${production[key]}/dk`,
    );
    if (parts.length) lines.push(parts.join('  '));

    if (resolved.workerRequirement) lines.push(`${resolved.workerRequirement} isci calistirir`);

    const populationCapacity =
      resolved.populationCapacity ||
      (def.levels.find((l) => l.level === resolved.level)?.populationCapacity ?? 0);
    if (populationCapacity) lines.push(`+${populationCapacity} nufus kapasitesi`);

    const storageCapacity =
      resolved.storageCapacity ||
      (def.levels.find((l) => l.level === resolved.level)?.storageCapacity ?? 0);
    if (storageCapacity) lines.push(`+${storageCapacity} depo`);

    // Yukseltme secenegi: resolver devam eden gorev varken null dondurur.
    const upgrade = resolved.upgrade;
    if (upgrade) {
      const cost = RESOURCE_ORDER.filter((key) => upgrade.cost[key])
        .map((key) => `${RESOURCE_META[key].label} ${upgrade.cost[key]}`)
        .join('  ');
      lines.push(`Sv. ${upgrade.toLevel} icin: ${cost}`);
    }

    if (!lines.length) lines.push(def.description);
    this.bodyText.setText(lines.join('\n'));

    // Buton yuvasi: yukseltme surerken iptal, aksi halde yukseltme.
    if (task?.kind === 'upgrade') {
      this.upgradeButtonMode = 'cancel';
      this.upgradeButton.setText('Iptal').setVisible(true).setEnabled(true);
    } else {
      this.upgradeButtonMode = 'upgrade';
      this.upgradeButton.setText('Yukselt').setVisible(upgrade !== null);
      // Karsilanamayan yukseltme butonu devre disi gorunur; oyuncu tikladiktan
      // sonra degil, tiklamadan once anlar.
      this.upgradeButton.setEnabled(upgrade !== null && this.canAfford(upgrade.cost));
    }
  }

  private showTerrain(tile: TileData): void {
    this.upgradeButton.setVisible(false);
    this.titleText.setText(TERRAIN_LABELS[tile.terrain] ?? tile.terrain);
    this.bodyText.setText(
      `Konum ${tile.gx}, ${tile.gy}\nBu alan bos. Insa etmek icin alttaki menuyu kullan.`,
    );
  }
}
