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

export type IconKind =
  // Kaynaklar
  | 'food'
  | 'wood'
  | 'stone'
  | 'gold'
  // Eylem ve durum
  | 'hammer'
  | 'worker'
  | 'lock'
  | 'people'
  | 'avatar'
  // Insa menusu kategorileri
  | 'all'
  | 'housing'
  | 'production'
  | 'commerce'
  | 'special'
  // Alt gezinme
  | 'cityNav'
  | 'buildingsNav'
  | 'more'
  // Yan dugmeler
  | 'settings'
  | 'mail'
  | 'trophy'
  | 'compass'
  // Bildirim turleri
  | 'ok'
  | 'warn'
  | 'info'
  | 'error';

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

/** Iki vatandas silueti - nufus. */
function drawPeople(g: Phaser.GameObjects.Graphics, s: number): void {
  const cx = s / 2;
  for (const [dx, scale, color] of [
    [-0.16, 0.86, shade(PALETTE.clothWarm, -0.22)],
    [0.16, 1, PALETTE.clothWarm],
  ] as Array<[number, number, number]>) {
    g.fillStyle(color, 1);
    g.fillEllipse(cx + s * dx, s * 0.7, s * 0.34 * scale, s * 0.34 * scale);
    g.fillStyle(PALETTE.adobeLight, 1);
    g.fillCircle(cx + s * dx, s * 0.4, s * 0.13 * scale);
  }
}

/** Dort kare - "tumu" sekmesi. */
function drawAll(g: Phaser.GameObjects.Graphics, s: number): void {
  g.fillStyle(PALETTE.stoneLight, 1);
  for (const [fx, fy] of [
    [0.24, 0.24],
    [0.58, 0.24],
    [0.24, 0.58],
    [0.58, 0.58],
  ]) {
    g.fillRoundedRect(s * fx, s * fy, s * 0.2, s * 0.2, 2);
  }
}

/** Kiremit catili ev - konut kategorisi. */
function drawHousing(g: Phaser.GameObjects.Graphics, s: number): void {
  const cx = s / 2;
  g.fillStyle(PALETTE.adobeLight, 1);
  g.fillRect(cx - s * 0.24, s * 0.44, s * 0.48, s * 0.34);
  g.fillStyle(PALETTE.roof, 1);
  g.fillTriangle(cx - s * 0.32, s * 0.46, cx + s * 0.32, s * 0.46, cx, s * 0.2);
  g.fillStyle(PALETTE.doorway, 0.8);
  g.fillRect(cx - s * 0.06, s * 0.58, s * 0.12, s * 0.2);
}

/** Bugday + disli yerine: orak ve demet - uretim kategorisi. */
function drawProductionIcon(g: Phaser.GameObjects.Graphics, s: number): void {
  const cx = s / 2;
  g.fillStyle(PALETTE.cropGold, 1);
  g.fillEllipse(cx - s * 0.14, s * 0.56, s * 0.2, s * 0.4);
  g.fillStyle(PALETTE.cropGreen, 1);
  g.fillRect(cx - s * 0.15, s * 0.6, s * 0.03, s * 0.24);
  g.fillStyle(shade(PALETTE.block, -0.05), 1);
  g.fillRect(cx + s * 0.1, s * 0.26, s * 0.06, s * 0.42);
  g.fillStyle(PALETTE.blockLight, 1);
  g.fillRect(cx + s * 0.02, s * 0.22, s * 0.28, s * 0.09);
}

/** Amfora ve sikke - ticaret kategorisi. */
function drawCommerceIcon(g: Phaser.GameObjects.Graphics, s: number): void {
  const cx = s / 2;
  g.fillStyle(PALETTE.roofDark, 1);
  g.fillEllipse(cx - s * 0.12, s * 0.58, s * 0.3, s * 0.4);
  g.fillStyle(PALETTE.roof, 1);
  g.fillEllipse(cx - s * 0.15, s * 0.56, s * 0.22, s * 0.3);
  g.fillStyle(shade(PALETTE.gold, -0.25), 1);
  g.fillCircle(cx + s * 0.2, s * 0.6, s * 0.17);
  g.fillStyle(PALETTE.gold, 1);
  g.fillCircle(cx + s * 0.2, s * 0.57, s * 0.17);
}

/** Yildiz - ozel yapilar. */
function drawStar(g: Phaser.GameObjects.Graphics, s: number): void {
  const cx = s / 2;
  const cy = s * 0.5;
  const outer = s * 0.36;
  const inner = s * 0.16;
  g.fillStyle(PALETTE.gold, 1);
  g.beginPath();
  for (let i = 0; i < 10; i += 1) {
    const r = i % 2 === 0 ? outer : inner;
    const a = -Math.PI / 2 + (Math.PI / 5) * i;
    const x = cx + Math.cos(a) * r;
    const y = cy + Math.sin(a) * r;
    if (i === 0) g.moveTo(x, y);
    else g.lineTo(x, y);
  }
  g.closePath();
  g.fillPath();
}

/** Sutunlu cephe - "Sehir" sekmesi. */
function drawCityNav(g: Phaser.GameObjects.Graphics, s: number): void {
  const cx = s / 2;
  g.fillStyle(PALETTE.stoneLight, 1);
  g.fillTriangle(cx - s * 0.36, s * 0.36, cx + s * 0.36, s * 0.36, cx, s * 0.16);
  for (const dx of [-0.22, -0.07, 0.08, 0.23]) {
    g.fillRect(cx + s * dx, s * 0.4, s * 0.08, s * 0.32);
  }
  g.fillStyle(PALETTE.stone, 1);
  g.fillRect(cx - s * 0.36, s * 0.72, s * 0.72, s * 0.08);
}

/** Iki bina silueti - "Binalar" sekmesi. */
function drawBuildingsNav(g: Phaser.GameObjects.Graphics, s: number): void {
  g.fillStyle(PALETTE.adobe, 1);
  g.fillRect(s * 0.16, s * 0.42, s * 0.3, s * 0.38);
  g.fillStyle(PALETTE.roofDark, 1);
  g.fillTriangle(s * 0.12, s * 0.44, s * 0.5, s * 0.44, s * 0.31, s * 0.24);
  g.fillStyle(PALETTE.adobeLight, 1);
  g.fillRect(s * 0.52, s * 0.52, s * 0.3, s * 0.28);
  g.fillStyle(PALETTE.roof, 1);
  g.fillTriangle(s * 0.48, s * 0.54, s * 0.86, s * 0.54, s * 0.67, s * 0.36);
}

/** Uc nokta - "Daha" sekmesi. */
function drawMore(g: Phaser.GameObjects.Graphics, s: number): void {
  g.fillStyle(PALETTE.stoneLight, 1);
  for (const fx of [0.26, 0.5, 0.74]) g.fillCircle(s * fx, s * 0.5, s * 0.08);
}

/** Disli - ayarlar. */
function drawSettings(g: Phaser.GameObjects.Graphics, s: number): void {
  const cx = s / 2;
  const cy = s / 2;
  g.fillStyle(PALETTE.stoneLight, 1);
  for (let i = 0; i < 8; i += 1) {
    const a = (Math.PI / 4) * i;
    const x = cx + Math.cos(a) * s * 0.3;
    const y = cy + Math.sin(a) * s * 0.3;
    g.fillRect(x - s * 0.07, y - s * 0.07, s * 0.14, s * 0.14);
  }
  g.fillCircle(cx, cy, s * 0.27);
  g.fillStyle(PALETTE.panelHole, 1);
  g.fillCircle(cx, cy, s * 0.12);
}

/** Zarf - mesaj. */
function drawMail(g: Phaser.GameObjects.Graphics, s: number): void {
  g.fillStyle(PALETTE.stoneLight, 1);
  g.fillRoundedRect(s * 0.16, s * 0.28, s * 0.68, s * 0.44, 3);
  g.fillStyle(shade(PALETTE.stoneLight, -0.3), 1);
  g.beginPath();
  g.moveTo(s * 0.16, s * 0.3);
  g.lineTo(s * 0.5, s * 0.56);
  g.lineTo(s * 0.84, s * 0.3);
  g.lineTo(s * 0.84, s * 0.36);
  g.lineTo(s * 0.5, s * 0.62);
  g.lineTo(s * 0.16, s * 0.36);
  g.closePath();
  g.fillPath();
}

/** Kupa - basari. */
function drawTrophy(g: Phaser.GameObjects.Graphics, s: number): void {
  const cx = s / 2;
  g.fillStyle(PALETTE.gold, 1);
  g.fillRoundedRect(cx - s * 0.2, s * 0.2, s * 0.4, s * 0.3, 4);
  g.fillEllipse(cx, s * 0.5, s * 0.3, s * 0.16);
  g.fillRect(cx - s * 0.05, s * 0.5, s * 0.1, s * 0.18);
  g.fillRoundedRect(cx - s * 0.2, s * 0.68, s * 0.4, s * 0.1, 2);
  g.lineStyle(3, PALETTE.gold, 1);
  g.beginPath();
  g.arc(cx - s * 0.26, s * 0.3, s * 0.1, Math.PI * 0.5, Math.PI * 1.5, true);
  g.strokePath();
  g.beginPath();
  g.arc(cx + s * 0.26, s * 0.3, s * 0.1, Math.PI * 1.5, Math.PI * 0.5, true);
  g.strokePath();
}

/** Pusula - harita. */
function drawCompass(g: Phaser.GameObjects.Graphics, s: number): void {
  const cx = s / 2;
  const cy = s / 2;
  g.lineStyle(2, PALETTE.stoneLight, 0.9);
  g.strokeCircle(cx, cy, s * 0.34);
  g.fillStyle(PALETTE.clothWarm, 1);
  g.fillTriangle(cx, cy - s * 0.26, cx + s * 0.11, cy, cx - s * 0.11, cy);
  g.fillStyle(PALETTE.stoneLight, 1);
  g.fillTriangle(cx, cy + s * 0.26, cx + s * 0.11, cy, cx - s * 0.11, cy);
}

/** Onay - basarili bildirim. */
function drawOk(g: Phaser.GameObjects.Graphics, s: number): void {
  g.lineStyle(s * 0.13, 0x8ce69a, 1);
  g.beginPath();
  g.moveTo(s * 0.24, s * 0.52);
  g.lineTo(s * 0.44, s * 0.71);
  g.lineTo(s * 0.78, s * 0.3);
  g.strokePath();
}

/** Unlem ucgeni - uyari. */
function drawWarn(g: Phaser.GameObjects.Graphics, s: number): void {
  const cx = s / 2;
  g.fillStyle(0xe8c86a, 1);
  g.fillTriangle(cx, s * 0.16, s * 0.88, s * 0.8, s * 0.12, s * 0.8);
  g.fillStyle(0x2e2819, 1);
  g.fillRect(cx - s * 0.05, s * 0.36, s * 0.1, s * 0.24);
  g.fillCircle(cx, s * 0.69, s * 0.06);
}

/** Bilgi - nokta ve cubuk. */
function drawInfo(g: Phaser.GameObjects.Graphics, s: number): void {
  const cx = s / 2;
  g.fillStyle(0x6fa8d6, 1);
  g.fillCircle(cx, s * 0.5, s * 0.36);
  g.fillStyle(0x14202b, 1);
  g.fillCircle(cx, s * 0.31, s * 0.06);
  g.fillRect(cx - s * 0.05, s * 0.42, s * 0.1, s * 0.26);
}

/** Hata - dolu daire icinde unlem. */
function drawError(g: Phaser.GameObjects.Graphics, s: number): void {
  const cx = s / 2;
  g.fillStyle(0xd05a52, 1);
  g.fillCircle(cx, s * 0.5, s * 0.36);
  g.fillStyle(0x2a1412, 1);
  g.fillRect(cx - s * 0.05, s * 0.3, s * 0.1, s * 0.26);
  g.fillCircle(cx, s * 0.68, s * 0.06);
}

/**
 * Sehir madalyonu - ust cubuktaki avatar.
 *
 * Bir portre degil bir ARMA: defne celengi icinde sutunlu bir cephe. Portre
 * cizmek prosedurel olarak kotu sonuc veriyor (yuz hatlari 40 pikselde
 * bulaniyor) ve oyunun kimligiyle de alakasiz; arma hem net hem de sehre
 * ait.
 */
function drawAvatar(g: Phaser.GameObjects.Graphics, s: number): void {
  const cx = s / 2;
  const cy = s / 2;

  g.fillStyle(shade(PALETTE.stoneDark, -0.35), 1);
  g.fillCircle(cx, cy, s * 0.46);
  g.fillStyle(PALETTE.adobeDark, 1);
  g.fillCircle(cx, cy, s * 0.4);

  // Sutunlu cephe
  g.fillStyle(PALETTE.stoneLight, 1);
  g.fillTriangle(cx - s * 0.26, cy - s * 0.04, cx + s * 0.26, cy - s * 0.04, cx, cy - s * 0.26);
  for (const dx of [-0.18, -0.05, 0.08]) {
    g.fillRect(cx + s * dx, cy, s * 0.07, s * 0.22);
  }
  g.fillStyle(PALETTE.stone, 1);
  g.fillRect(cx - s * 0.26, cy + s * 0.22, s * 0.52, s * 0.06);

  // Defne celengi
  g.lineStyle(2, PALETTE.gold, 0.9);
  g.beginPath();
  g.arc(cx, cy, s * 0.43, Math.PI * 0.35, Math.PI * 0.65);
  g.strokePath();
  g.fillStyle(PALETTE.leaf, 1);
  for (const t of [0.4, 0.5, 0.6]) {
    const a = Math.PI * t;
    g.fillEllipse(cx + Math.cos(a) * s * 0.43, cy + Math.sin(a) * s * 0.43, s * 0.1, s * 0.06);
  }
}

export const ICON_ART: Record<IconKind, (g: Phaser.GameObjects.Graphics, size: number) => void> = {
  food: drawFood,
  wood: drawWood,
  stone: drawStone,
  gold: drawGold,
  hammer: drawHammer,
  worker: drawWorkerIcon,
  lock: drawLock,
  people: drawPeople,
  avatar: drawAvatar,
  all: drawAll,
  housing: drawHousing,
  production: drawProductionIcon,
  commerce: drawCommerceIcon,
  special: drawStar,
  cityNav: drawCityNav,
  buildingsNav: drawBuildingsNav,
  more: drawMore,
  settings: drawSettings,
  mail: drawMail,
  trophy: drawTrophy,
  compass: drawCompass,
  ok: drawOk,
  warn: drawWarn,
  info: drawInfo,
  error: drawError,
};
