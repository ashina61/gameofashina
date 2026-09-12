import { TextureKeys } from '@/config/Constants';
import { iconKeyFor } from './IconArt';
import { depthFor, gridToWorld } from '@/utils/IsoUtils';
import type Phaser from 'phaser';
import type { BuildingPlotSystem } from '@/systems/BuildingPlotSystem';
import type { BuildingId, BuildingPlot } from '@/types';

/** Insa modunda bir alanin gosterilme bicimi. */
type PlotPaint = 'valid' | 'invalid' | 'locked';

/**
 * Sehrin yapi alanlarini gosteren katman.
 *
 * IKI MOD
 *   Normal    - bos alanlar yalnizca duzlenmis bir toprak pedle belli olur;
 *               sehir "isaretli kareler tarlasi" gibi gorunmez.
 *   Insa modu - her alan uc durumdan biriyle boyanir:
 *                 yesil   kurabilirsin
 *                 kirmizi bu bina buraya olmaz
 *                 altin   alan henuz acilmadi (uzerinde kilit isareti)
 *
 * SORUMLULUK SINIRI
 * Burada hicbir kural yoktur. Hangi alanin uygun oldugunu
 * BuildingPlotSystem soyler; bu katman yalnizca cizer. Isaretler
 * havuzlanir ve yalnizca DURUM DEGISTIGINDE guncellenir - kare basina
 * plot taramasi yoktur.
 */
export class PlotLayer {
  /** Bos alan isaretinin normal gorunurlugu. */
  private static readonly IDLE_ALPHA = 0.5;

  private readonly scene: Phaser.Scene;
  private readonly plots: BuildingPlotSystem;

  /** Plot id -> isaret sprite'lari (cok karolu plot birden fazla tasir). */
  private readonly markers = new Map<string, Phaser.GameObjects.Image[]>();
  /** Insa modunda uygunlugu gosteren kaplamalar. */
  private readonly overlays: Phaser.GameObjects.Image[] = [];
  /** Kilitli alanlarin uzerindeki kilit isareti. */
  private readonly locks: Phaser.GameObjects.Image[] = [];

  private placing: BuildingId | null = null;

  constructor(scene: Phaser.Scene, plots: BuildingPlotSystem) {
    this.scene = scene;
    this.plots = plots;
    this.createMarkers();
    this.refresh();
  }

  /**
   * Insa moduna girer: verilen tur icin uygun alanlar vurgulanir.
   * Tur null ise normal moda donulur.
   */
  setPlacing(type: BuildingId | null): void {
    if (this.placing === type) return;
    this.placing = type;
    this.refresh();
  }

  /**
   * Isaretleri gecerli duruma gore tazeler.
   *
   * Bina kurulunca/yikilinca cagrilir. Kare basina DEGIL: plot durumu
   * yalnizca bu olaylarda degisir.
   */
  refresh(): void {
    // 1. Dolu alanlarin isareti gizlenir; bina zaten orada duruyor.
    for (const plot of this.plots.plots) {
      const free = this.plots.isFree(plot);
      for (const marker of this.markers.get(plot.id) ?? []) {
        marker.setVisible(free).setAlpha(PlotLayer.IDLE_ALPHA);
      }
    }

    // 2. Insa modu kaplamalari.
    for (const overlay of this.overlays) overlay.setVisible(false);
    for (const lock of this.locks) lock.setVisible(false);
    if (!this.placing) return;

    let index = 0;
    let lockIndex = 0;
    for (const plot of this.plots.plots) {
      if (!this.plots.isFree(plot)) continue;
      const state: PlotPaint = !plot.unlocked
        ? 'locked'
        : this.plots.accepts(plot, this.placing)
          ? 'valid'
          : 'invalid';
      index = this.paint(plot, state, index);
      if (state === 'locked') lockIndex = this.markLocked(plot, lockIndex);
    }
  }

  /** Kilitli alanin ortasina kilit isareti koyar. */
  private markLocked(plot: BuildingPlot, from: number): number {
    const at = gridToWorld(plot.gx + (plot.width - 1) / 2, plot.gy + (plot.height - 1) / 2);
    const lock = this.lockAt(from);
    lock
      .setPosition(at.x, at.y - 10)
      .setDepth(depthFor(plot.gx, plot.gy) + 1)
      .setVisible(true);
    return from + 1;
  }

  private lockAt(index: number): Phaser.GameObjects.Image {
    const existing = this.locks[index];
    if (existing) return existing;
    const created = this.scene.add
      .image(0, 0, iconKeyFor('lock'))
      .setOrigin(0.5, 0.5)
      .setVisible(false);
    this.locks.push(created);
    return created;
  }

  destroy(): void {
    for (const list of this.markers.values()) for (const m of list) m.destroy();
    this.markers.clear();
    for (const overlay of this.overlays) overlay.destroy();
    this.overlays.length = 0;
    for (const lock of this.locks) lock.destroy();
    this.locks.length = 0;
  }

  /** Bos alanlarin sakin bordurlerini bir kez olusturur. */
  private createMarkers(): void {
    for (const plot of this.plots.plots) {
      const images: Phaser.GameObjects.Image[] = [];
      for (let dy = 0; dy < plot.height; dy += 1) {
        for (let dx = 0; dx < plot.width; dx += 1) {
          const at = gridToWorld(plot.gx + dx, plot.gy + dy);
          images.push(
            this.scene.add
              .image(at.x, at.y, TextureKeys.PlotMarker)
              .setOrigin(0.5, 0.5)
              // Zeminin ustunde, binalarin altinda.
              .setDepth(depthFor(plot.gx + dx, plot.gy + dy) - 3)
              .setAlpha(PlotLayer.IDLE_ALPHA),
          );
        }
      }
      this.markers.set(plot.id, images);
    }
  }

  /**
   * Bir plotu durumuna gore boyar; kullanilan kaplama sayisini doner.
   *
   * Uc durum uc AYRI renk kullanir (Sprint 13 §4): yesil "kurabilirsin",
   * kirmizi "bu bina buraya olmaz", altin "bu alan henuz acilmadi". Sprint
   * 12'de uygunsuz alan yalnizca soluyordu ve oyuncu farki goremiyordu.
   */
  private paint(plot: BuildingPlot, state: PlotPaint, from: number): number {
    const key =
      state === 'valid'
        ? TextureKeys.TileValid
        : state === 'locked'
          ? TextureKeys.TileLocked
          : TextureKeys.TileInvalid;
    const alpha = state === 'valid' ? 0.5 : state === 'locked' ? 0.6 : 0.3;
    let index = from;
    for (let dy = 0; dy < plot.height; dy += 1) {
      for (let dx = 0; dx < plot.width; dx += 1) {
        const overlay = this.overlayAt(index);
        index += 1;
        const at = gridToWorld(plot.gx + dx, plot.gy + dy);
        overlay
          .setTexture(key)
          .setPosition(at.x, at.y)
          .setDepth(depthFor(plot.gx + dx, plot.gy + dy) - 2)
          .setAlpha(alpha)
          .setVisible(true);
      }
    }
    return index;
  }

  /** Kaplama havuzundan sirayi verir; yoksa bir tane uretir. */
  private overlayAt(index: number): Phaser.GameObjects.Image {
    const existing = this.overlays[index];
    if (existing) return existing;
    const created = this.scene.add
      .image(0, 0, TextureKeys.TileValid)
      .setOrigin(0.5, 0.5)
      .setVisible(false);
    this.overlays.push(created);
    return created;
  }
}
