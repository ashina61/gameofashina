import Phaser from 'phaser';
import { CameraController } from '@/input/CameraController';
import type { ResolutionManager } from '@/render/ResolutionManager';
import type { GameWorld } from '@/core/GameWorld';
import type { GridPoint, WorldPoint } from '@/types';

/**
 * Izometrik sahnelerin ortak tabani.
 *
 * Uc sahne (dunya, ada, sehir) ayni altyapiyi paylasir: cozunurluk
 * yonetimi, kamera kaydirma/yakinlastirma, arka plan dokusu ve karo->ekran
 * donusumu. Bunlari her sahnede ayri yazmak uc kopyanin birbirinden
 * kaymasi demekti; ornegin biri DPR degisimini dinleyip digeri
 * dinlemese, yon degistiren bir telefonda ekranlarin yalnizca bazi
 * sahneleri bozuk gorunurdu.
 *
 * DOKUNUS VE ARAYUZ AYRIMI
 * Arayuz HTML katmanindadir ve Phaser'in uzerinde durur. Kameraya
 * dokunus geldiginde once arayuze sorulur: parmak bir panelin ustundeyse
 * dokunus YOK SAYILIR. Bu kontrol olmasa, paneldeki "insa et" dugmesine
 * basmak ayni zamanda haritada bir bina kurardi.
 */
export abstract class IsoScene extends Phaser.Scene {
  protected world!: GameWorld;
  protected resolution!: ResolutionManager;
  protected camera2d!: CameraController;
  protected art!: Phaser.GameObjects.Container;
  private detachResolution: (() => void) | null = null;
  private background: Phaser.GameObjects.TileSprite | null = null;

  /** Sahnenin izometrik karo olcusu; alt sinif belirler. */
  protected abstract readonly tileWidth: number;
  protected abstract readonly tileHeight: number;

  /** Arka plan dokusu anahtari. */
  protected abstract readonly backgroundKey: string;

  /** Dokunus; alt sinif kendi secim mantigini kurar. */
  protected abstract handleTap(worldX: number, worldY: number): void;

  /** Izgara karo -> ekran koordinati. */
  protected toScreen(gx: number, gy: number): WorldPoint {
    return {
      x: (gx - gy) * (this.tileWidth / 2),
      y: (gx + gy) * (this.tileHeight / 2),
    };
  }

  /** Ekran -> izgara karo. */
  protected toGrid(x: number, y: number): GridPoint {
    const gx = (x / (this.tileWidth / 2) + y / (this.tileHeight / 2)) / 2;
    const gy = (y / (this.tileHeight / 2) - x / (this.tileWidth / 2)) / 2;
    return { gx: Math.round(gx), gy: Math.round(gy) };
  }

  /** Ortak kurulum: registry, arka plan, kamera. */
  protected setupIso(): void {
    this.world = this.registry.get('world') as GameWorld;
    this.resolution = this.registry.get('resolution') as ResolutionManager;

    const { logicalWidth, logicalHeight } = this.resolution;
    this.art = this.add.container(0, 0);

    if (this.textures.exists(this.backgroundKey)) {
      this.background = this.add.tileSprite(0, 0, logicalWidth, logicalHeight, this.backgroundKey);
      this.background.setOrigin(0, 0);
      // Kamera ile kaymaz: arka plan her zaman ekrani kaplar.
      this.background.setScrollFactor(0);
      this.background.setDepth(-1000);
    }

    this.camera2d = new CameraController(this, this.cameras.main, {
      onTap: (worldX, worldY) => this.handleTap(worldX, worldY),
      isBlocked: (screenX, screenY) => this.isUiBlocked(screenX, screenY),
      pixelRatio: () => this.resolution.dpr,
    });
    this.resolution.attachUiCamera(this.cameras.main);

    this.detachResolution = this.resolution.onChange((targets) => {
      this.background?.setSize(targets.logicalWidth, targets.logicalHeight);
    });

    // Sahne kapanirken simulasyonu durdurmayiz: oyun arka planda da
    // islemeye devam eder (Ikariam gercek zamanlidir).
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.teardownIso, this);
  }

  /** HTML arayuzun bu ekran noktasini kapatip kapatmadigi. */
  private isUiBlocked(screenX: number, screenY: number): boolean {
    const probe = this.registry.get('uiHitTest') as
      | ((x: number, y: number) => boolean)
      | undefined;
    return probe ? probe(screenX, screenY) : false;
  }

  /** Kare dongusu: kamera + simulasyon. */
  override update(_time: number, deltaMs: number): void {
    this.camera2d.update(deltaMs);
    this.world.update(deltaMs / 1000);
  }

  private teardownIso(): void {
    this.detachResolution?.();
    this.detachResolution = null;
    this.background = null;
  }
}
