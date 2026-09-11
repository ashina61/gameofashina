import type Phaser from 'phaser';
import { TILE_HEIGHT, TextureKeys } from '@/config/Constants';
import { depthFor, gridToWorld } from '@/utils/IsoUtils';
import { getBuildingVisual } from './BuildingVisuals';
import type {
  BuildingDefinition,
  BuildingInstance,
  ConstructionKind,
  ResolvedBuilding,
} from '@/types';

/** Sirada bekleyen gorevin soluk tonu - is henuz baslamadi. */
const QUEUED_TINT = 0x9aa0a6;

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
  private readonly def: BuildingDefinition;
  /** Dolgunun tam genislikteki olcegi; ilerleme bunun kesridir. */
  private readonly fullScaleX: number;

  private selected = false;
  /** Durum gorselinden gelen opaklik (devre disi bina soluktur). */
  private stateAlpha = 1;
  /** Durum gorselinden gelen renk carpani. */
  private stateTint = 0xffffff;
  /** Devam eden gorevin turu; gorev yoksa null. */
  private taskKind: ConstructionKind | null = null;
  /** Devam eden gorev sirada mi bekliyor? */
  private taskQueued = false;

  /**
   * Dokular DPR olceginde uretilir; sprite bunun tersiyle olceklenir ki
   * dunyadaki boyut degismesin. Tum olcek islemleri bu degeri taban alir.
   */
  private readonly baseScale: number;

  constructor(
    scene: Phaser.Scene,
    building: BuildingInstance,
    def: BuildingDefinition,
    resolved: ResolvedBuilding,
    artScale = 1,
  ) {
    this.uid = building.uid;
    this.baseScale = 1 / (artScale > 0 ? artScale : 1);

    // Binanin taban eskenar dortgeninin en on kosesi
    const anchor = gridToWorld(building.gx + def.size - 1, building.gy + def.size - 1);
    const y = anchor.y + TILE_HEIGHT / 2;
    const depth = depthFor(building.gx, building.gy, def.size);

    const visual = getBuildingVisual({
      type: building.type,
      level: building.level,
      state: building.state,
      size: def.size,
      uid: building.uid,
    });
    this.stateTint = visual.tint;
    this.stateAlpha = visual.alpha;

    this.sprite = scene.add
      .image(anchor.x, y, visual.textureKey)
      .setOrigin(0.5, 1)
      .setDepth(depth)
      .setScale(this.baseScale);

    this.def = def;

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

  /**
   * Bina orneginin GORSELINI type/level/state'e gore tazeler.
   *
   * View burada "bu bina soyle cizilir" bilgisi tutmaz; kimligi
   * BuildingVisuals'a sorar. Yukseltme bitince veya durum degisince
   * cagrilir; doku bir kez degistirilir, her karede degil.
   */
  syncVisual(building: BuildingInstance): void {
    const visual = getBuildingVisual({
      type: building.type,
      level: building.level,
      state: building.state,
      size: this.def.size,
      uid: building.uid,
    });
    if (this.sprite.texture.key !== visual.textureKey) {
      this.sprite.setTexture(visual.textureKey);
    }
    this.stateAlpha = visual.alpha;
    this.stateTint = visual.tint;
    this.applyTint();
    if (this.taskKind === null) this.sprite.setAlpha(this.stateAlpha);
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

    /*
     * Insaat halindeki bina artik AYRI bir iskele gorseliyle cizilir.
     * Eskiden bitmis bina solgunlastirilarak "yapim asamasinda" hissi
     * veriliyordu; o solgunlastirma simdi iskelenin uzerine binince santiye
     * hayalet gibi gorunuyordu. Aktif santiye tam opak cizilir, yalnizca
     * KUYRUKTA bekleyen is soluk kalir - oyuncu hangi santiyenin gercekten
     * calistigini bakar bakmaz ayirt eder.
     */
    if (kind === 'build') {
      this.sprite.setAlpha(queued ? 0.5 : 1);
    } else {
      this.sprite.setAlpha((queued ? 0.8 : 1) * this.stateAlpha);
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
    this.sprite.setAlpha(this.stateAlpha);
    this.barBackground.setVisible(false);
    this.barFill.setVisible(false);
    this.applyTint();

    if (celebrate && hadTask) this.playCompletionPulse();
  }

  /** Tamamlanmada kisa bir "oturma" hareketi. */
  private playCompletionPulse(): void {
    const scene = this.sprite.scene;
    scene.tweens.killTweensOf(this.sprite);
    this.sprite.setScale(this.baseScale * 1.12, this.baseScale * 0.88);
    scene.tweens.add({
      targets: this.sprite,
      scaleX: this.baseScale,
      scaleY: this.baseScale,
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

  /**
   * Secim, insaat ve durum vurgularini tek yerden uygular.
   *
   * Oncelik: kuyrukta bekleyen is > secim > durum (devre disi) > normal.
   * Insaat halindeki bina artik solgun bir BINA degil, ayri bir ISKELE
   * gorseliyle cizildigi icin ayrica renklendirilmesine gerek yok.
   */
  private applyTint(): void {
    if (this.taskKind === 'build' && this.taskQueued) {
      this.sprite.setTint(QUEUED_TINT);
    } else if (this.selected) {
      this.sprite.setTint(SELECTED_TINT);
    } else if (this.stateTint !== 0xffffff) {
      this.sprite.setTint(this.stateTint);
    } else {
      this.sprite.clearTint();
    }
  }
}
