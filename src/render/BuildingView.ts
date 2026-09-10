import type Phaser from 'phaser';
import { TILE_HEIGHT } from '@/config/Constants';
import { depthFor, gridToWorld } from '@/utils/IsoUtils';
import { buildingTextureKey } from './TextureFactory';
import type { BuildingDefinition, BuildingInstance, ResolvedBuilding } from '@/types';

/**
 * Tek bir binanin gorsel temsili.
 *
 * Model (BuildingInstance) ile gorsel arasindaki tek bagi burasidir; sahne
 * yalnizca create/refresh/destroy cagirir. Insaat halindeki binalar saydam
 * cizilir ve altlarinda ilerleme cubugu gosterilir.
 */
export class BuildingView {
  readonly uid: string;

  private readonly sprite: Phaser.GameObjects.Image;
  private readonly progressBar: Phaser.GameObjects.Graphics;
  private readonly def: BuildingDefinition;
  private selected = false;

  constructor(
    scene: Phaser.Scene,
    building: BuildingInstance,
    def: BuildingDefinition,
    resolved: ResolvedBuilding,
  ) {
    this.uid = building.uid;
    this.def = def;

    // Binanin taban eskenar dortgeninin en on kosesi
    const anchor = gridToWorld(building.gx + def.size - 1, building.gy + def.size - 1);
    const y = anchor.y + TILE_HEIGHT / 2;

    this.sprite = scene.add
      .image(anchor.x, y, buildingTextureKey(def.id))
      .setOrigin(0.5, 1)
      .setDepth(depthFor(building.gx, building.gy, def.size));

    this.progressBar = scene.add
      .graphics()
      .setDepth(depthFor(building.gx, building.gy, def.size) + 1);

    this.refresh(resolved);
  }

  /**
   * Hesaplanmis durumu gorsele yansitir.
   * Ilerleme orani BuildingResolver'dan gelir; burada yeniden hesaplanmaz.
   */
  refresh(resolved: ResolvedBuilding): void {
    if (!resolved.construction) {
      this.sprite.setAlpha(1).clearTint();
      this.progressBar.clear();
      return;
    }

    // Insaat halindeki bina: soluk ve mavimsi
    this.sprite.setAlpha(0.55).setTint(0x9fc4e8);
    this.drawProgress(resolved.construction.ratio);
  }

  /** Secili binanin cevresine vurgu uygular. */
  setSelected(value: boolean): void {
    if (this.selected === value) return;
    this.selected = value;
    this.sprite.setTint(value ? 0xffe9a8 : 0xffffff);
    if (!value) this.sprite.clearTint();
  }

  /** Bu gorselin ekranda kapladigi merkez nokta (kamera odaklamak icin). */
  get position(): { x: number; y: number } {
    return { x: this.sprite.x, y: this.sprite.y - this.sprite.displayHeight / 2 };
  }

  destroy(): void {
    this.sprite.destroy();
    this.progressBar.destroy();
  }

  /**
   * TODO(sprint-2): Bu cizim her karede yeniden yapiliyor ve olculen FPS
   * dususunun ana kaynagi (120 insaat: 46 -> 9 FPS). Graphics yerine bir kez
   * olusturulan sprite'in scaleX'i guncellenmeli ve yalnizca insaat olayi
   * geldiginde dokunulmali. ConstructionSystem ile birlikte ele alinacak.
   */
  private drawProgress(ratio: number): void {
    const width = Math.max(36, this.def.size * 46);
    const height = 6;
    const x = this.sprite.x - width / 2;
    const y = this.sprite.y - 4;

    this.progressBar.clear();
    this.progressBar.fillStyle(0x14110c, 0.8);
    this.progressBar.fillRoundedRect(x - 1, y - 1, width + 2, height + 2, 3);
    this.progressBar.fillStyle(0x6ee27a, 1);
    this.progressBar.fillRoundedRect(x, y, Math.max(2, width * ratio), height, 2);
  }
}
