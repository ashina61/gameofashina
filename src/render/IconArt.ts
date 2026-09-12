import type Phaser from 'phaser';
import { PALETTE } from './ArtStyle';
import { shade } from './BuildingArt';

/**
 * Arayuz ikonlari.
 *
 * Emoji KULLANILMAZ: emoji cihazdan cihaza degisir, palete uymaz ve
 * yuksek DPR'de oyunun geri kalaniyla ayni keskinlikte cizilmez. Butun
 * ikonlar oyunun kendi paletiyle, bina cizimleriyle ayni dilde uretilir.
 *
 * Ikonlar dokuya BIR KEZ pisirilir; arayuz yalnizca Image kullanir.
 */

/** Ikon tuvalinin kenar uzunlugu (mantiksal piksel). */
export const ICON_SIZE = 26;

export type IconKind = 'food' | 'wood' | 'stone' | 'gold' | 'hammer' | 'worker' | 'lock';

export function iconKeyFor(kind: IconKind): string {
  return `icon:${kind}`;
}

/** Bugday demeti - yiyecek. */
function drawFood(g: Phaser.GameObjects.Graphics, s: number): void {
  const cx = s / 2;
  g.fillStyle(PALETTE.cropGreen, 1);
  g.fillRect(cx - 1, s * 0.42, 2, s * 0.42);
  for (const lean of [-1, 0, 1]) {
    const tipX = cx + lean * s * 0.22;
    g.fillStyle(lean === 0 ? PALETTE.cropGold : shade(PALETTE.cropGold, -0.12), 1);
    g.fillEllipse(tipX, s * 0.3 + Math.abs(lean) * s * 0.06, s * 0.17, s * 0.36);
    g.fillStyle(shade(PALETTE.cropGold, -0.3), 0.8);
    g.fillRect(tipX - 0.6, s * 0.18 + Math.abs(lean) * s * 0.06, 1.2, s * 0.24);
  }
}

/** Ust uste iki kutuk - odun. */
function drawWood(g: Phaser.GameObjects.Graphics, s: number): void {
  const cx = s / 2;
  for (const [dy, light] of [
    [0.62, false],
    [0.4, true],
  ] as Array<[number, boolean]>) {
    g.fillStyle(light ? PALETTE.woodLight : PALETTE.wood, 1);
    g.fillEllipse(cx, s * dy, s * 0.66, s * 0.3);
    g.fillStyle(shade(PALETTE.woodDark, 0.3), 1);
    g.fillEllipse(cx - s * 0.16, s * dy, s * 0.22, s * 0.16);
    g.fillStyle(PALETTE.woodDark, 1);
    g.fillEllipse(cx - s * 0.16, s * dy, s * 0.09, s * 0.07);
  }
}

/** Islenmis tas blok - tas. */
function drawStone(g: Phaser.GameObjects.Graphics, s: number): void {
  const cx = s / 2;
  const cy = s * 0.58;
  const w = s * 0.62;
  const h = s * 0.3;
  const rise = s * 0.24;

  g.fillStyle(shade(PALETTE.block, -0.22), 1);
  g.beginPath();
  g.moveTo(cx + w / 2, cy);
  g.lineTo(cx, cy + h / 2);
  g.lineTo(cx, cy + h / 2 - rise);
  g.lineTo(cx + w / 2, cy - rise);
  g.closePath();
  g.fillPath();

  g.fillStyle(PALETTE.block, 1);
  g.beginPath();
  g.moveTo(cx - w / 2, cy);
  g.lineTo(cx, cy + h / 2);
  g.lineTo(cx, cy + h / 2 - rise);
  g.lineTo(cx - w / 2, cy - rise);
  g.closePath();
  g.fillPath();

  g.fillStyle(PALETTE.blockLight, 1);
  g.beginPath();
  g.moveTo(cx, cy - h / 2 - rise);
  g.lineTo(cx + w / 2, cy - rise);
  g.lineTo(cx, cy + h / 2 - rise);
  g.lineTo(cx - w / 2, cy - rise);
  g.closePath();
  g.fillPath();
}

/** Sikke - altin. */
function drawGold(g: Phaser.GameObjects.Graphics, s: number): void {
  const cx = s / 2;
  const cy = s * 0.5;
  g.fillStyle(shade(PALETTE.gold, -0.3), 1);
  g.fillCircle(cx, cy + 1.5, s * 0.34);
  g.fillStyle(PALETTE.gold, 1);
  g.fillCircle(cx, cy, s * 0.34);
  g.fillStyle(shade(PALETTE.gold, 0.3), 1);
  g.fillCircle(cx - s * 0.07, cy - s * 0.07, s * 0.2);
  /*
   * Sikkenin uzerindeki damga bir ELMAS.
   *
   * Once artiya benzeyen iki cubuk cizilmisti ve kucuk olcekte sikke
   * uzerinde "T" harfi gibi okunuyordu (ekran goruntusuyle dogrulandi).
   */
  g.fillStyle(shade(PALETTE.gold, -0.34), 1);
  g.beginPath();
  g.moveTo(cx, cy - s * 0.14);
  g.lineTo(cx + s * 0.1, cy);
  g.lineTo(cx, cy + s * 0.14);
  g.lineTo(cx - s * 0.1, cy);
  g.closePath();
  g.fillPath();
}

/**
 * Cekic - ana insa aksiyonunun isareti.
 *
 * Basi ORTADA, sapi dikey cizilirse kucuk olcekte "T" harfi gibi okunuyor
 * (ekran goruntusuyle dogrulandi). Bas sola kaydirilip sap capraz
 * verildiginde siluet cekice benzer.
 */
function drawHammer(g: Phaser.GameObjects.Graphics, s: number): void {
  // Sap: sag alttan sol yukariya dogru capraz.
  g.fillStyle(PALETTE.woodDark, 1);
  g.beginPath();
  g.moveTo(s * 0.74, s * 0.84);
  g.lineTo(s * 0.84, s * 0.72);
  g.lineTo(s * 0.44, s * 0.3);
  g.lineTo(s * 0.34, s * 0.42);
  g.closePath();
  g.fillPath();

  // Bas: sol uste oturan, tek tarafi genis blok.
  g.fillStyle(shade(PALETTE.block, -0.1), 1);
  g.fillRoundedRect(s * 0.12, s * 0.16, s * 0.44, s * 0.2, 3);
  g.fillStyle(PALETTE.blockLight, 1);
  g.fillRoundedRect(s * 0.12, s * 0.16, s * 0.44, s * 0.1, 3);
  // Carpma yuzu - basin sol ucu kalinlasir.
  g.fillStyle(shade(PALETTE.block, -0.24), 1);
  g.fillRect(s * 0.12, s * 0.16, s * 0.1, s * 0.2);
}

/** Vatandas silueti - nufus/isci. */
function drawWorkerIcon(g: Phaser.GameObjects.Graphics, s: number): void {
  const cx = s / 2;
  g.fillStyle(PALETTE.clothWarm, 1);
  g.fillEllipse(cx, s * 0.66, s * 0.44, s * 0.42);
  g.fillStyle(PALETTE.adobeLight, 1);
  g.fillCircle(cx, s * 0.3, s * 0.16);
}

/** Kilit - acilmamis yapi alani. */
function drawLock(g: Phaser.GameObjects.Graphics, s: number): void {
  const cx = s / 2;
  g.lineStyle(3, shade(PALETTE.gold, -0.2), 1);
  g.beginPath();
  g.arc(cx, s * 0.42, s * 0.18, Math.PI, 0);
  g.strokePath();
  g.fillStyle(PALETTE.gold, 1);
  g.fillRoundedRect(cx - s * 0.26, s * 0.42, s * 0.52, s * 0.38, 3);
  g.fillStyle(shade(PALETTE.gold, -0.45), 1);
  g.fillCircle(cx, s * 0.6, s * 0.06);
}

export const ICON_ART: Record<IconKind, (g: Phaser.GameObjects.Graphics, size: number) => void> = {
  food: drawFood,
  wood: drawWood,
  stone: drawStone,
  gold: drawGold,
  hammer: drawHammer,
  worker: drawWorkerIcon,
  lock: drawLock,
};
