import { TILE_HEIGHT, TILE_WIDTH } from '@/config/Constants';
import { PALETTE } from './ArtStyle';
import { shade } from './BuildingArt';
import type Phaser from 'phaser';

/**
 * Sehrin oturdugu ADA ve cevresindeki deniz.
 *
 * NEDEN VAR
 * Izgara ekrandan kucuk oldugu icin sehrin cevresi SIYAH bosluktu
 * (olculdu: 390x844'te ekranin alt %22'si bos). Siyah bosluk oyunu
 * "izgara uzerinde birkac bina" gibi gosteriyordu. Deniz + kumsal, ayni
 * sehri bir YERE oturtur: ada.
 *
 * Bu katman tamamen gorseldir. Zemin karolarinin ALTINDA cizilir, hicbir
 * dokunusu yakalamaz, izgaraya ve navigasyona dokunmaz.
 *
 * MALIYET
 * Deniz tek bir TileSprite (doku tekrarlanir, sprite sayisi 1); kumsal ve
 * kopuk tek bir Graphics'e BIR KEZ cizilir. Kare basina is yoktur.
 */
export class IslandBackdrop {
  private readonly land: Phaser.GameObjects.Graphics;

  constructor(scene: Phaser.Scene, gridSize: number) {
    const half = { w: (gridSize * TILE_WIDTH) / 2, h: (gridSize * TILE_HEIGHT) / 2 };
    const cy = half.h;

    /*
     * ACIK DENIZ hicbir sey CIZMEZ.
     *
     * Once dunya olcusunde dev bir TileSprite kullanildi (5376x4480) ve
     * kare hizini yariya indirdi: 390x844'te 32 yerine 13 FPS. Ekran
     * olcusune kucultmek de yetmedi (16 FPS), kamera arka plan rengi de
     * yetmedi (23 FPS) - ikisi de her kare TAM EKRAN bir yuzey boyuyor ve
     * GPU'suz ortamda bu tek basina karenin dortte birini yiyor.
     *
     * Cozum: deniz rengi OYUN duzeyinde tanimli (GameConfig.BACKGROUND_COLOR),
     * yani dogrudan gl.clearColor. Tampon zaten her kare temizleniyor;
     * maliyeti sifir. Denizin dokusu, gozun gercekten baktigi yerde
     * kaliyor: kiyi seridi.
     */

    this.land = scene.add.graphics().setDepth(-9_000);
    const g = this.land;

    /*
     * Kiyi halkalari DOLGU degil, KALIN CIZGI olarak cizilir.
     *
     * Once her halka adanin tamamini kaplayan bir elmas dolguydu ve ada
     * merkezi alti kez ust uste boyaniyordu - hepsi de zemin karolarinin
     * altinda, yani gorunmeden. Olculdu: bu tek basina 25 FPS'i 15'e
     * dusuruyordu (390x844, GPU yok). Cizgi yalnizca halkanin kendi
     * seridini boyar; gorunus ayni, maliyet onda biri.
     */
    const ring = (scale: number, width: number, color: number, alpha: number): void => {
      g.lineStyle(width, color, alpha);
      g.beginPath();
      g.moveTo(0, cy - half.h * scale);
      g.lineTo(half.w * scale, cy);
      g.lineTo(0, cy + half.h * scale);
      g.lineTo(-half.w * scale, cy);
      g.closePath();
      g.strokePath();
    };

    /*
     * Disaridan iceri: sig su, kopuk, kumsal.
     *
     * Cizgi kalinliklari BILEREK dar. Ilk denemede en distaki halka 90
     * pikseldi ve tek basina 5 FPS goturuyordu (33 -> 28, GPU yok): kalin
     * cizgi genis bir yuzey boyamak demek. Dar seritler ayni kiyi hissini
     * verir, maliyet yariya iner.
     */
    ring(1.17, 44, 0x4d8aac, 0.5);
    ring(1.11, 26, 0x6aa6c4, 0.55);
    ring(1.075, 8, 0xd6e8ef, 0.6);
    ring(1.032, 22, 0xd8c79b, 1);
    // Kumsalin ic kenari - karolar kumun uzerine oturuyor gibi dursun.
    ring(1.005, 6, shade(PALETTE.adobeDark, -0.2), 0.4);

    /*
     * Kiyidaki dalga cizgileri.
     *
     * Denizin tamami duz renk oldugu icin hareket hissi kiyida verilir -
     * gozun zaten baktigi yer orasi. Statik geometri: kare basina ek
     * maliyet yok.
     */
    g.lineStyle(2, 0xdaeaf0, 0.25);
    for (const scale of [1.3, 1.38]) {
      g.beginPath();
      g.moveTo(-half.w * scale, cy);
      g.lineTo(0, cy - half.h * scale);
      g.lineTo(half.w * scale, cy);
      g.strokePath();
    }
  }

  destroy(): void {
    this.land.destroy();
  }
}
