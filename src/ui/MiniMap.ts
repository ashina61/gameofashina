import Phaser from 'phaser';
import { TextureKeys } from '@/config/Constants';
import { iconKeyFor } from '@/render/IconArt';
import { PANEL_SLICE } from '@/render/PanelSkin';
import { UIText, labelStyle } from './UIStyle';
import type { TerrainType } from '@/types';

/**
 * Alt sagdaki mini harita.
 *
 * NE CIZER
 * Sehrin izgarasini kus bakisi bir elmas olarak: zemin turune gore renk,
 * bina olan karolar koyu isaret, ustune de kameranin baktigi yeri
 * gosteren ucgen.
 *
 * NEDEN CANVAS, HER KARE SPRITE DEGIL
 * 18x18 = 324 karo. Her karoyu bir sprite yapmak 324 nesne demekti;
 * bu projede benzer bir deneme (sokak kaplamasi ayri katman) 34 FPS'i
 * 26'ya dusurmustu. Bunun yerine izgara TEK BIR dokuya cizilir ve
 * yalnizca DEGISTIGINDE yeniden cizilir - kamera oynarken sadece ucgen
 * hareket eder, doku dokunulmaz.
 *
 * OYUN KURALI BILMEZ: zemin ve bina bilgisini disaridan hazir alir.
 */

/** Mini haritada zemin turlerinin rengi. */
const TERRAIN_COLOR: Record<TerrainType, string> = {
  grass: '#6f8f4a',
  soil: '#b08b5c',
  rock: '#8d8b84',
  water: '#3f7fa6',
};

/** Bina isaretinin rengi. */
const BUILDING_COLOR = '#d9522e';

/** Mini haritaya verilen izgara fotografi. */
export interface MiniMapSnapshot {
  size: number;
  /** Satir satir zemin turleri. */
  terrain: TerrainType[][];
  /** Bina bulunan karolar. */
  occupied: boolean[][];
}

export class MiniMap extends Phaser.GameObjects.Container {
  static readonly SIZE = 112;

  /** Icerideki cizim alani (cerceve payindan sonra). */
  private static readonly INNER = MiniMap.SIZE - 18;

  private readonly canvasKey: string;
  private readonly canvas: Phaser.Textures.CanvasTexture | null;
  private readonly marker: Phaser.GameObjects.Triangle;

  /** Son cizilen izgaranin parmak izi; degismediyse yeniden cizilmez. */
  private lastSignature = '';

  constructor(scene: Phaser.Scene, x: number, y: number, onZoom: () => void) {
    super(scene, x, y);

    this.canvasKey = 'minimap-grid';
    this.canvas =
      scene.textures.get(this.canvasKey).key === '__MISSING'
        ? scene.textures.createCanvas(this.canvasKey, MiniMap.INNER, MiniMap.INNER)
        : (scene.textures.get(this.canvasKey) as Phaser.Textures.CanvasTexture);

    const frame = scene.add
      .nineslice(
        0,
        0,
        TextureKeys.Frame,
        undefined,
        MiniMap.SIZE,
        MiniMap.SIZE,
        PANEL_SLICE,
        PANEL_SLICE,
        PANEL_SLICE,
        PANEL_SLICE,
      )
      .setOrigin(0, 0);

    const grid = scene.add
      .image(MiniMap.SIZE / 2, MiniMap.SIZE / 2, this.canvasKey)
      .setOrigin(0.5, 0.5)
      .setDisplaySize(MiniMap.INNER, MiniMap.INNER);

    /*
     * Kamera isareti: haritanin ortasina bakan kucuk bir ucgen. Referansta
     * beyaz bir ok; burada da ayni isi gorur - "su an buraya bakiyorsun".
     */
    this.marker = scene.add
      .triangle(MiniMap.SIZE / 2, MiniMap.SIZE / 2, 0, -7, 7, 6, -7, 6, 0xffffff, 0.95)
      .setOrigin(0.5, 0.5);

    const compass = scene.add
      .image(MiniMap.SIZE - 16, 16, iconKeyFor('compass'))
      .setOrigin(0.5, 0.5)
      .setDisplaySize(18, 18);
    const north = scene.add
      .text(MiniMap.SIZE - 16, 3, 'N', labelStyle(8, UIText.accent, true))
      .setOrigin(0.5, 0.5);

    const zoomIcon = scene.add
      .image(MiniMap.SIZE - 15, MiniMap.SIZE - 15, iconKeyFor('zoomIn'))
      .setOrigin(0.5, 0.5)
      .setDisplaySize(17, 17);

    const zone = scene.add
      .zone(0, 0, MiniMap.SIZE, MiniMap.SIZE)
      .setOrigin(0, 0)
      .setInteractive({ useHandCursor: true });
    zone.on(Phaser.Input.Events.GAMEOBJECT_POINTER_UP, onZoom);

    this.add([frame, grid, this.marker, compass, north, zoomIcon, zone]);
    scene.add.existing(this);
  }

  /**
   * Izgarayi yeniden cizer - yalnizca GERCEKTEN degistiyse.
   *
   * Imza, boyut ve dolu karolarin desenidir. Kamera hareketi imzayi
   * degistirmez, yani surukleme sirasinda tek bir piksel bile yeniden
   * cizilmez.
   */
  updateGrid(snapshot: MiniMapSnapshot): void {
    if (!this.canvas) return;

    const signature = `${snapshot.size}:${snapshot.occupied
      .map((row) => row.map((v) => (v ? 1 : 0)).join(''))
      .join('')}`;
    if (signature === this.lastSignature) return;
    this.lastSignature = signature;

    const ctx = this.canvas.context;
    const n = MiniMap.INNER;
    ctx.clearRect(0, 0, n, n);

    /*
     * Izgara EKRANDAKI gibi elmas cizilir, kare degil. Kare cizmek daha
     * kolay olurdu ama oyuncunun gordugu sehir izometrik; mini haritanin
     * bicimi sehrin bicimine benzemezse "neredeyim" sorusuna cevap
     * vermez.
     */
    const half = n / 2;
    const step = n / snapshot.size;

    for (let gy = 0; gy < snapshot.size; gy += 1) {
      for (let gx = 0; gx < snapshot.size; gx += 1) {
        const terrain = snapshot.terrain[gy]?.[gx] ?? 'grass';
        const filled = snapshot.occupied[gy]?.[gx] ?? false;
        ctx.fillStyle = filled ? BUILDING_COLOR : TERRAIN_COLOR[terrain];

        // Izometrik yerlesim: x ekseninde fark, y ekseninde toplam.
        const cx = half + ((gx - gy) * step) / 2;
        const cy = ((gx + gy) * step) / 2;
        const w = step / 2 + 0.6;
        const h = step / 4 + 0.6;

        ctx.beginPath();
        ctx.moveTo(cx, cy - h);
        ctx.lineTo(cx + w, cy);
        ctx.lineTo(cx, cy + h);
        ctx.lineTo(cx - w, cy);
        ctx.closePath();
        ctx.fill();
      }
    }

    this.canvas.refresh();
  }

  /**
   * Kamera isaretini tasir.
   *
   * ratioX/ratioY, kameranin izgara uzerindeki 0..1 konumudur; donusum
   * izgaranin kendi elmas yerlesimiyle ayni olmali ki isaret gercekten
   * bakilan yere dussun.
   */
  setViewport(ratioX: number, ratioY: number): void {
    const n = MiniMap.INNER;
    const half = n / 2;
    const gx = Phaser.Math.Clamp(ratioX, 0, 1);
    const gy = Phaser.Math.Clamp(ratioY, 0, 1);
    const offset = (MiniMap.SIZE - n) / 2;
    this.marker.setPosition(
      offset + half + ((gx - gy) * n) / 2,
      offset + ((gx + gy) * n) / 2,
    );
  }

  bounds(): Phaser.Geom.Rectangle {
    return new Phaser.Geom.Rectangle(this.x, this.y, MiniMap.SIZE, MiniMap.SIZE);
  }
}
