import type Phaser from 'phaser';
import { TILE_HEIGHT, TextureKeys } from '@/config/Constants';
import { depthFor, gridToWorld } from '@/utils/IsoUtils';
import { buildingTextureKey } from './TextureFactory';
import type {
  BuildingDefinition,
  BuildingInstance,
  ConstructionKind,
  ResolvedBuilding,
} from '@/types';

/** Insaat halindeki binanin solgun rengi. */
const CONSTRUCTION_TINT = 0x9fc4e8;

/** Sirada bekleyen gorevin daha soluk, renksiz tonu. */
const QUEUED_TINT = 0x8f9298;

/** Secili binanin vurgu rengi. */
const SELECTED_TINT = 0xffe9a8;

/** Ilerleme cubugu dolgusunun gorev turune gore rengi. */
const BAR_TINT = {
  buildActive: 0x6ee27a,
  buildQueued: 0x6b7178,
  upgradeActive: 0xe8c86a,
  upgradeQueued: 0x7a7059,
} as const;

/**
 * Tek bir binanin gorsel temsili.
 *
 * View YALNIZCA cizer: oyun kurali hesaplamaz, kaynak dusmez, seviye
 * degistirmez, insaat baslatmaz. Ne gosterecegini disaridan hazir olarak alir.
 *
 * ILERLEME CUBUGU
 * Cubuk bir kez olusturulan iki Image'dan olusur; ilerleme yalnizca dolgu
 * parcasinin scaleX degeri degistirilerek gosterilir. Onceki surumde her
 * karede Graphics geometrisi yeniden kuruluyordu ve olculen FPS dususunun
 * ana kaynagi buydu.
 */
export class BuildingView {
  readonly uid: string;

  private readonly sprite: Phaser.GameObjects.Image;
  private readonly barBackground: Phaser.GameObjects.Image;
  private readonly barFill: Phaser.GameObjects.Image;
  private readonly barWidth: number;
  /** Dolgunun tam genislikteki olcegi; ilerleme bunun kesridir. */
  private readonly fullScaleX: number;

  private selected = false;
  /** Devam eden gorevin turu; gorev yoksa null. */
  private taskKind: ConstructionKind | null = null;
  /** Devam eden gorev sirada mi bekliyor? */
  private taskQueued = false;

  constructor(
    scene: Phaser.Scene,
    building: BuildingInstance,
    def: BuildingDefinition,
    resolved: ResolvedBuilding,
  ) {
    this.uid = building.uid;

    // Binanin taban eskenar dortgeninin en on kosesi
    const anchor = gridToWorld(building.gx + def.size - 1, building.gy + def.size - 1);
    const y = anchor.y + TILE_HEIGHT / 2;
    const depth = depthFor(building.gx, building.gy, def.size);

    this.sprite = scene.add
      .image(anchor.x, y, buildingTextureKey(def.id))
      .setOrigin(0.5, 1)
      .setDepth(depth);

    this.barWidth = Math.max(36, def.size * 46);
    const barY = y - 6;

    this.barBackground = scene.add
      .image(anchor.x, barY, TextureKeys.Pixel)
      .setOrigin(0.5, 0.5)
      .setDisplaySize(this.barWidth + 4, 11)
      .setTint(0x14110c)
      .setAlpha(0.9)
      .setDepth(depth + 1)
      .setVisible(false);

    // Dolgu sol kenardan buyur; ilerleme scaleX ile verilir.
    this.barFill = scene.add
      .image(anchor.x - this.barWidth / 2, barY, TextureKeys.Pixel)
      .setOrigin(0, 0.5)
      .setDisplaySize(this.barWidth, 7)
      .setTint(BAR_TINT.buildActive)
      .setDepth(depth + 2)
      .setVisible(false);

    // setDisplaySize scaleX'i degistirdigi icin tam genislikteki olcegi
    // referans alip ilerlemeyi bunun uzerinden hesapliyoruz.
    this.fullScaleX = this.barFill.scaleX;

    this.applyResolved(resolved);
  }

  /** Devam eden bir gorevi gosteriyor mu? */
  get hasTask(): boolean {
    return this.taskKind !== null;
  }

  /** Hesaplanmis duruma gore gorunumu ayarlar (olusturma aninda). */
  applyResolved(resolved: ResolvedBuilding): void {
    if (resolved.construction) {
      this.beginTask(
        resolved.construction.kind,
        resolved.construction.ratio,
        resolved.construction.status === 'queued',
      );
    } else {
      this.endTask();
    }
  }

  /**
   * Gorev gorunumune gecer.
   *
   * build   - bina henuz calismiyor: solgun cizilir, ilerleme cubugu gosterilir.
   * upgrade - bina mevcut seviyesinde calismaya devam ediyor: normal cizilir,
   *           yalnizca ilerleme cubugu gosterilir.
   */
  beginTask(kind: ConstructionKind, ratio = 0, queued = false): void {
    this.taskKind = kind;
    this.taskQueued = queued;

    // Sirada bekleyen insaat, aktif insaattan daha soluk cizilir; oyuncu
    // hangi santiyenin gercekten calistigini bakar bakmaz ayirt eder.
    if (kind === 'build') {
      this.sprite.setAlpha(queued ? 0.35 : 0.55);
    } else {
      this.sprite.setAlpha(queued ? 0.8 : 1);
    }
    this.applyTint();

    this.barFill.setTint(
      kind === 'build'
        ? queued
          ? BAR_TINT.buildQueued
          : BAR_TINT.buildActive
        : queued
          ? BAR_TINT.upgradeQueued
          : BAR_TINT.upgradeActive,
    );
    this.barBackground.setVisible(true).setAlpha(queued ? 0.6 : 0.9);
    this.barFill.setVisible(true);
    this.setProgress(ratio);
  }

  /**
   * Gorev bitti: normal gorunume doner.
   * celebrate=true ise kisa bir olcek geri bildirimi oynatilir; bu tek seferlik
   * bir tween'dir, kare basina maliyet eklemez.
   */
  endTask(celebrate = false): void {
    const hadTask = this.taskKind !== null;
    this.taskKind = null;
    this.taskQueued = false;
    this.sprite.setAlpha(1);
    this.barBackground.setVisible(false);
    this.barFill.setVisible(false);
    this.applyTint();

    if (celebrate && hadTask) this.playCompletionPulse();
  }

  /** Tamamlanmada kisa bir "oturma" hareketi. */
  private playCompletionPulse(): void {
    const scene = this.sprite.scene;
    scene.tweens.killTweensOf(this.sprite);
    this.sprite.setScale(1.12, 0.88);
    scene.tweens.add({
      targets: this.sprite,
      scaleX: 1,
      scaleY: 1,
      duration: 260,
      ease: 'Back.easeOut',
    });
  }

  /**
   * Ilerleme oranini uygular.
   * Tek islem: dolgunun yatay olcegi. Geometri yeniden kurulmaz.
   */
  setProgress(ratio: number): void {
    const clamped = ratio < 0 ? 0 : ratio > 1 ? 1 : ratio;
    this.barFill.scaleX = this.fullScaleX * clamped;
  }

  /** Secili binanin cevresine vurgu uygular. */
  setSelected(value: boolean): void {
    if (this.selected === value) return;
    this.selected = value;
    this.applyTint();
  }

  destroy(): void {
    this.sprite.destroy();
    this.barBackground.destroy();
    this.barFill.destroy();
  }

  /** Secim ve insaat vurgularini tek yerden uygular. */
  private applyTint(): void {
    if (this.taskKind === 'build') {
      this.sprite.setTint(this.taskQueued ? QUEUED_TINT : CONSTRUCTION_TINT);
    } else if (this.selected) {
      this.sprite.setTint(SELECTED_TINT);
    } else {
      this.sprite.clearTint();
    }
  }
}
