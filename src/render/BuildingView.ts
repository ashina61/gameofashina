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

/** Secili binanin vurgu rengi. */
const SELECTED_TINT = 0xffe9a8;

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
      .setDisplaySize(this.barWidth + 2, 8)
      .setTint(0x14110c)
      .setAlpha(0.85)
      .setDepth(depth + 1)
      .setVisible(false);

    // Dolgu sol kenardan buyur; ilerleme scaleX ile verilir.
    this.barFill = scene.add
      .image(anchor.x - this.barWidth / 2, barY, TextureKeys.Pixel)
      .setOrigin(0, 0.5)
      .setDisplaySize(this.barWidth, 6)
      .setTint(0x6ee27a)
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
      this.beginTask(resolved.construction.kind, resolved.construction.ratio);
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
  beginTask(kind: ConstructionKind, ratio = 0): void {
    this.taskKind = kind;
    this.sprite.setAlpha(kind === 'build' ? 0.55 : 1);
    this.applyTint();
    this.barFill.setTint(kind === 'build' ? 0x6ee27a : 0xe8c86a);
    this.barBackground.setVisible(true);
    this.barFill.setVisible(true);
    this.setProgress(ratio);
  }

  /** Gorev bitti: normal gorunume doner. */
  endTask(): void {
    this.taskKind = null;
    this.sprite.setAlpha(1);
    this.barBackground.setVisible(false);
    this.barFill.setVisible(false);
    this.applyTint();
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
      this.sprite.setTint(CONSTRUCTION_TINT);
    } else if (this.selected) {
      this.sprite.setTint(SELECTED_TINT);
    } else {
      this.sprite.clearTint();
    }
  }
}
