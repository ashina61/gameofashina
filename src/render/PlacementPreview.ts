import type Phaser from 'phaser';
import { TILE_HEIGHT, TextureKeys } from '@/config/Constants';
import { depthFor, gridToWorld } from '@/utils/IsoUtils';
import { buildingTextureKey } from './TextureFactory';
import type { BuildingDefinition } from '@/types';

/**
 * Insa modunda parmagin altinda gezinen hayalet bina ve zemin gostergesi.
 * Yalnizca gorsellikten sorumludur; gecerlilik karari CityScene'den gelir.
 */
export class PlacementPreview {
  private readonly scene: Phaser.Scene;
  private readonly ghost: Phaser.GameObjects.Image;
  private readonly cells: Phaser.GameObjects.Image[] = [];
  private def: BuildingDefinition | null = null;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.ghost = scene.add.image(0, 0, TextureKeys.TileHighlight).setOrigin(0.5, 1).setVisible(false);
  }

  /** Onizlemeyi belirli bir bina turu icin baslatir. */
  start(def: BuildingDefinition): void {
    this.def = def;
    this.ghost.setTexture(buildingTextureKey(def.id)).setAlpha(0.65).setVisible(true);
    this.rebuildCells(def.size);
  }

  /** Onizlemeyi kapatir ve gorselleri gizler. */
  stop(): void {
    this.def = null;
    this.ghost.setVisible(false);
    for (const cell of this.cells) cell.setVisible(false);
  }

  /** Hayaleti verilen izgara hucresine tasir ve gecerlilige gore renklendirir. */
  moveTo(gx: number, gy: number, valid: boolean): void {
    const def = this.def;
    if (!def) return;

    const anchor = gridToWorld(gx + def.size - 1, gy + def.size - 1);
    this.ghost
      .setPosition(anchor.x, anchor.y + TILE_HEIGHT / 2)
      .setDepth(depthFor(gx, gy, def.size) + 2)
      .setTint(valid ? 0xbfffbf : 0xff9b9b);

    const texture = valid ? TextureKeys.TileValid : TextureKeys.TileInvalid;
    let index = 0;
    for (let dy = 0; dy < def.size; dy += 1) {
      for (let dx = 0; dx < def.size; dx += 1) {
        const cell = this.cells[index];
        index += 1;
        const world = gridToWorld(gx + dx, gy + dy);
        cell
          .setTexture(texture)
          .setPosition(world.x, world.y)
          .setDepth(depthFor(gx + dx, gy + dy) + 1)
          .setVisible(true);
      }
    }
  }

  destroy(): void {
    this.ghost.destroy();
    for (const cell of this.cells) cell.destroy();
    this.cells.length = 0;
  }

  /** Bina boyutuna gore zemin gostergesi karolarini hazirlar. */
  private rebuildCells(size: number): void {
    const needed = size * size;
    while (this.cells.length < needed) {
      this.cells.push(
        this.scene.add.image(0, 0, TextureKeys.TileValid).setOrigin(0.5, 0.5).setVisible(false),
      );
    }
    for (let i = needed; i < this.cells.length; i += 1) {
      this.cells[i].setVisible(false);
    }
  }
}
