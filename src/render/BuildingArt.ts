import type Phaser from 'phaser';
import { TILE_HEIGHT, TILE_WIDTH } from '@/config/Constants';
import { FACE, PALETTE, SHADOW_ALPHA } from './ArtStyle';
import { DRAWN_BUILDING_TYPES, GENERIC_VISUAL } from './BuildingVisuals';
import type { DrawnBuildingType } from './BuildingVisuals';

/**
 * Binalarin izometrik cizimleri.
 *
 * Her cizim ArtStyle'daki tek spesifikasyona uyar: ayni kamera acisi, sol
 * usttten gelen isik, saga-asagi golge, dusuk detay. Amac telefonda ilk
 * bakista ayirt edilebilen SILUETLER uretmek; detay degil.
 *
 * Cizimler bir kez dokuya pisirilir (TextureFactory), sonra sahne yalnizca
 * Image kullanir - her karede Graphics kurulmaz.
 */

/** Cizim icin ortak olculer. */
export interface ArtCanvas {
  /** Doku genisligi. */
  width: number;
  /** Doku yuksekligi. */
  height: number;
  /** Taban eskenar dortgeninin merkezi (x). */
  cx: number;
  /** Taban eskenar dortgeninin merkezi (y). */
  baseY: number;
  /** Taban eskenar dortgeninin genisligi. */
  footW: number;
  /** Taban eskenar dortgeninin yuksekligi. */
  footH: number;
}

/** Bir binanin belirli seviyedeki cizimi. */
export type ArtDrawer = (g: Phaser.GameObjects.Graphics, c: ArtCanvas, level: number) => void;

/** Binanin govde yuksekligi; doku boyutunu bu belirler. */
const BODY_HEIGHT: Record<DrawnBuildingType | typeof GENERIC_VISUAL, [number, number]> = {
  town_hall: [96, 124],
  house: [50, 74],
  farm: [30, 42],
  lumber_camp: [44, 58],
  quarry: [34, 46],
  market: [46, 60],
  warehouse: [52, 68],
  generic: [52, 64],
};

/** Verilen tur ve seviye icin doku olculerini hesaplar. */
export function artCanvasFor(type: string, size: number, level: number): ArtCanvas {
  const key = (DRAWN_BUILDING_TYPES as readonly string[]).includes(type)
    ? (type as DrawnBuildingType)
    : GENERIC_VISUAL;
  const heights = BODY_HEIGHT[key];
  const bodyH = heights[Math.min(Math.max(1, level), 2) - 1];

  const footW = TILE_WIDTH * size;
  const footH = TILE_HEIGHT * size;
  // Ust bosluk: en yuksek yapinin tepesi kirpilmasin.
  const height = footH + bodyH + 28;

  return { width: footW, height, cx: footW / 2, baseY: height - footH / 2, footW, footH };
}

// --- Cizim yardimcilari ------------------------------------------------------

/** Eskenar dortgen yolu olusturur (izometrik karo yuzeyi). */
function diamond(g: Phaser.GameObjects.Graphics, cx: number, cy: number, w: number, h: number): void {
  g.beginPath();
  g.moveTo(cx, cy - h / 2);
  g.lineTo(cx + w / 2, cy);
  g.lineTo(cx, cy + h / 2);
  g.lineTo(cx - w / 2, cy);
  g.closePath();
}

/**
 * Eskenar dortgen icinde IZOMETRIK SERIT cizer.
 *
 * Dar bir elmas cizmek serit vermez; dikey bir mercek sekli verir. Tarla
 * karigi ve tente cizgileri once oyle cizilmisti ve tarla "yapraklara",
 * tente "alevlere" benziyordu. Dogrusu, elmasin kendi eksenleri boyunca
 * bir paralelkenar cikarmaktir.
 *
 * u ekseni sol kosedan ust koseye, v ekseni sol kosedan alt koseye gider;
 * ikisi de 0..1 arasindadir.
 */
function isoStrip(
  g: Phaser.GameObjects.Graphics,
  cx: number,
  cy: number,
  w: number,
  h: number,
  u0: number,
  u1: number,
): void {
  const at = (u: number, v: number): [number, number] => [
    cx - w / 2 + (u * w) / 2 + (v * w) / 2,
    cy - (u * h) / 2 + (v * h) / 2,
  ];
  const a = at(u0, 0);
  const b = at(u1, 0);
  const c = at(u1, 1);
  const d = at(u0, 1);
  g.beginPath();
  g.moveTo(a[0], a[1]);
  g.lineTo(b[0], b[1]);
  g.lineTo(c[0], c[1]);
  g.lineTo(d[0], d[1]);
  g.closePath();
}

/** Rengi aydinlatir veya koyulastirir. */
export function shade(color: number, amount: number): number {
  const r = (color >> 16) & 0xff;
  const gr = (color >> 8) & 0xff;
  const b = color & 0xff;
  const mix = (v: number) =>
    Math.round(amount >= 0 ? v + (255 - v) * amount : v * (1 + amount)) & 0xff;
  return (mix(r) << 16) | (mix(gr) << 8) | mix(b);
}

/** Zemine temas eden yumusak golge. Butun binalarda ayni yon. */
function contactShadow(g: Phaser.GameObjects.Graphics, c: ArtCanvas, spread = 1): void {
  g.fillStyle(0x1a1206, SHADOW_ALPHA);
  // Golge saga-asagi kayar: isik sol ustten geliyor.
  diamond(g, c.cx + c.footW * 0.04, c.baseY + c.footH * 0.06, c.footW * spread, c.footH * spread);
  g.fillPath();
}

/**
 * Izometrik dikdortgen prizma.
 * Taban merkezi (x, y), tabani w x d eskenar dortgen, yuksekligi h.
 */
function box(
  g: Phaser.GameObjects.Graphics,
  x: number,
  y: number,
  w: number,
  d: number,
  h: number,
  color: number,
): void {
  const hw = w / 2;
  const hd = d / 2;

  // Sag yuz (golgeli)
  g.fillStyle(shade(color, FACE.right), 1);
  g.beginPath();
  g.moveTo(x + hw, y);
  g.lineTo(x, y + hd);
  g.lineTo(x, y + hd - h);
  g.lineTo(x + hw, y - h);
  g.closePath();
  g.fillPath();

  // Sol yuz (aydinlik)
  g.fillStyle(shade(color, FACE.left), 1);
  g.beginPath();
  g.moveTo(x - hw, y);
  g.lineTo(x, y + hd);
  g.lineTo(x, y + hd - h);
  g.lineTo(x - hw, y - h);
  g.closePath();
  g.fillPath();

  // Ust yuz
  g.fillStyle(shade(color, FACE.top), 1);
  diamond(g, x, y - h, w, d);
  g.fillPath();
}

/**
 * Iki egimli cati (sirt ekseni sol-alt <-> sag-ust).
 *
 * Varsayilan kiremit rengidir; anitsal yapilar acik mermer tonu kullanir.
 * Bunun sebebi gorsel hiyerarsi: 80 evin kiremit denizinde ayni renkte bir
 * cati, sehir merkezini gorunmez kiliyordu (olculdu, 120 binalik sahnede
 * Town Hall bulunamiyordu). Acik cati onu bir anda ayirir.
 */
function gableRoof(
  g: Phaser.GameObjects.Graphics,
  x: number,
  y: number,
  w: number,
  d: number,
  rise: number,
  palette: { light: number; mid: number; dark: number } = {
    light: PALETTE.roofLight,
    mid: PALETTE.roof,
    dark: PALETTE.roofDark,
  },
): void {
  const hw = w / 2;
  const hd = d / 2;
  const ridgeY = y - rise;

  // Sag egim (golgeli)
  g.fillStyle(palette.dark, 1);
  g.beginPath();
  g.moveTo(x + hw, y);
  g.lineTo(x, y + hd);
  g.lineTo(x, ridgeY + hd * 0.15);
  g.lineTo(x + hw * 0.15, ridgeY);
  g.closePath();
  g.fillPath();

  // Sol egim (aydinlik)
  g.fillStyle(palette.light, 1);
  g.beginPath();
  g.moveTo(x - hw, y);
  g.lineTo(x, y + hd);
  g.lineTo(x, ridgeY + hd * 0.15);
  g.lineTo(x - hw * 0.15, ridgeY);
  g.closePath();
  g.fillPath();

  // Arka egimler - siluete hacim verir
  g.fillStyle(palette.mid, 1);
  g.beginPath();
  g.moveTo(x - hw, y);
  g.lineTo(x, y - hd);
  g.lineTo(x, ridgeY - hd * 0.15);
  g.lineTo(x - hw * 0.15, ridgeY);
  g.closePath();
  g.fillPath();

  g.fillStyle(shade(palette.mid, -0.12), 1);
  g.beginPath();
  g.moveTo(x + hw, y);
  g.lineTo(x, y - hd);
  g.lineTo(x, ridgeY - hd * 0.15);
  g.lineTo(x + hw * 0.15, ridgeY);
  g.closePath();
  g.fillPath();
}

/** Duz kiremit teras (depo, pazar gibi yapilar icin). */
function flatRoof(
  g: Phaser.GameObjects.Graphics,
  x: number,
  y: number,
  w: number,
  d: number,
  color: number,
): void {
  g.fillStyle(color, 1);
  diamond(g, x, y, w, d);
  g.fillPath();
}

/** Kapi acikligi. */
function doorway(g: Phaser.GameObjects.Graphics, x: number, y: number, w: number, h: number): void {
  g.fillStyle(PALETTE.doorway, 0.85);
  g.fillRect(x - w / 2, y - h, w, h);
}

/**
 * Bir kutunun ON IKI yuzune sutun dizisi cizer.
 *
 * Sutunlar serbest duran cubuklar olarak cizilmisti ve havada duruyor gibi
 * gorunuyordu. Yuzeye islenmis dikey seritler hem daha saglam duruyor hem
 * de telefon olcusunde "tapinak" siluetini kuruyor.
 */
function columnsOnFaces(
  g: Phaser.GameObjects.Graphics,
  x: number,
  y: number,
  w: number,
  d: number,
  h: number,
  count: number,
): void {
  const hw = w / 2;
  const hd = d / 2;

  for (let i = 0; i < count; i += 1) {
    const t = (i + 0.5) / count;

    // Sol on yuz: sol koseden on koseye
    const lx = -hw + t * hw;
    const ly = t * hd;
    g.fillStyle(PALETTE.stoneLight, 1);
    g.fillRect(x + lx - 3, y + ly - h, 6, h);
    g.fillStyle(shade(PALETTE.stoneLight, -0.16), 1);
    g.fillRect(x + lx + 1, y + ly - h, 2, h);

    // Sag on yuz: on koseden sag koseye (golgeli taraf)
    const rx = t * hw;
    const ry = hd - t * hd;
    g.fillStyle(shade(PALETTE.stone, -0.06), 1);
    g.fillRect(x + rx - 3, y + ry - h, 6, h);
    g.fillStyle(shade(PALETTE.stone, -0.26), 1);
    g.fillRect(x + rx + 1, y + ry - h, 2, h);
  }
}

// --- Bina cizimleri ----------------------------------------------------------

/** Sehir Merkezi: basamakli mermer kaide, sutunlu govde, kiremit alinlik. */
const drawTownHall: ArtDrawer = (g, c, level) => {
  contactShadow(g, c, 1.02);
  const grand = level >= 2;

  // Basamakli kaide - anitsal yapinin tabani
  const steps = grand ? 3 : 2;
  let platformY = c.baseY;
  for (let i = 0; i < steps; i += 1) {
    const t = i / steps;
    box(
      g,
      c.cx,
      platformY,
      c.footW * (0.98 - t * 0.08),
      c.footH * (0.98 - t * 0.08),
      8,
      i % 2 === 0 ? PALETTE.stone : PALETTE.stoneLight,
    );
    platformY -= 8;
  }

  // Govde: sutunlarin islendigi mermer kutle
  const bodyW = c.footW * 0.76;
  const bodyD = c.footH * 0.76;
  const bodyH = grand ? 48 : 38;
  box(g, c.cx, platformY, bodyW, bodyD, bodyH, PALETTE.stoneLight);
  columnsOnFaces(g, c.cx, platformY, bodyW, bodyD, bodyH, grand ? 5 : 4);

  // Arsitrav - sutunlarin ustunu kapatan yatay kusak
  const archY = platformY - bodyH;
  box(g, c.cx, archY + 7, bodyW * 1.08, bodyD * 1.08, 7, PALETTE.stone);

  /*
   * MERMER cati - sehir merkezini kiremit denizinden ayiran sey.
   * Saçak bandi kiremit kalir, boylece yapi sehrin paletinden kopmaz.
   */
  gableRoof(g, c.cx, archY, bodyW * 1.1, bodyD * 1.1, grand ? 34 : 27, {
    light: PALETTE.stoneLight,
    mid: PALETTE.stone,
    dark: PALETTE.stoneDark,
  });
  // Kiremit saçak - catinin alt kenarinda ince bir band
  g.fillStyle(PALETTE.roof, 1);
  g.beginPath();
  g.moveTo(c.cx - (bodyW * 1.1) / 2, archY);
  g.lineTo(c.cx, archY + (bodyD * 1.1) / 2);
  g.lineTo(c.cx + (bodyW * 1.1) / 2, archY);
  g.lineTo(c.cx + (bodyW * 1.1) / 2, archY + 5);
  g.lineTo(c.cx, archY + (bodyD * 1.1) / 2 + 5);
  g.lineTo(c.cx - (bodyW * 1.1) / 2, archY + 5);
  g.closePath();
  g.fillPath();

  // Merkez kapi - girisi isaretler
  doorway(g, c.cx, platformY + bodyD * 0.22, 14, Math.round(bodyH * 0.5));

  if (grand) {
    // Altin akroter - catinin tepesindeki vurgu
    g.fillStyle(PALETTE.gold, 1);
    g.fillTriangle(
      c.cx - 7,
      archY - 30,
      c.cx + 7,
      archY - 30,
      c.cx,
      archY - 44,
    );
  }
};

/** Ev: kerpic govde, kiremit besik cati, kucuk kapi. */
const drawHouse: ArtDrawer = (g, c, level) => {
  contactShadow(g, c, 0.8);
  const tall = level >= 2;
  const w = c.footW * 0.62;
  const d = c.footH * 0.62;
  const bodyH = tall ? 40 : 28;

  box(g, c.cx, c.baseY - 2, w, d, bodyH, PALETTE.adobe);

  if (tall) {
    // Ikinci kat biraz iceride - siluete kademe katar
    box(g, c.cx, c.baseY - 2 - bodyH, w * 0.82, d * 0.82, 16, PALETTE.adobeLight);
    gableRoof(g, c.cx, c.baseY - 2 - bodyH - 16, w * 0.92, d * 0.92, 20);
    // Balkon cikintisi
    g.fillStyle(PALETTE.woodLight, 1);
    g.fillRect(c.cx - w * 0.34, c.baseY - 2 - bodyH - 4, w * 0.3, 4);
  } else {
    gableRoof(g, c.cx, c.baseY - 2 - bodyH, w * 1.04, d * 1.04, 16);
  }

  doorway(g, c.cx - w * 0.14, c.baseY + d * 0.16, 8, 13);
  // Pencere
  g.fillStyle(PALETTE.doorway, 0.6);
  g.fillRect(c.cx + w * 0.1, c.baseY - bodyH * 0.55, 7, 7);
};

/** Ciftlik: surulmus tarla seritleri ve kose ambar. */
const drawFarm: ArtDrawer = (g, c, level) => {
  contactShadow(g, c, 0.98);
  const rich = level >= 2;

  // Tarla yuzeyi
  g.fillStyle(PALETTE.adobeDark, 1);
  diamond(g, c.cx, c.baseY, c.footW * 0.94, c.footH * 0.94);
  g.fillPath();

  // Ekin karikleri - tarlayi ilk bakista tarla yapan sey budur.
  const rows = rich ? 8 : 6;
  const fw = c.footW * 0.94;
  const fh = c.footH * 0.94;
  for (let i = 0; i < rows; i += 1) {
    const u0 = i / rows;
    const u1 = u0 + 1 / rows - 0.02;
    g.fillStyle(i % 2 === 0 ? PALETTE.cropGold : PALETTE.cropGreen, 1);
    isoStrip(g, c.cx, c.baseY, fw, fh, u0, u1);
    g.fillPath();
  }
  // Karik araligindaki golge - yuzeye derinlik verir
  g.fillStyle(PALETTE.adobeDark, 0.35);
  for (let i = 0; i < rows; i += 1) {
    isoStrip(g, c.cx, c.baseY, fw, fh, i / rows + 1 / rows - 0.03, i / rows + 1 / rows);
    g.fillPath();
  }

  // Ambar (arka kose)
  const bx = c.cx - c.footW * 0.24;
  const by = c.baseY - c.footH * 0.2;
  box(g, bx, by, c.footW * 0.3, c.footH * 0.3, rich ? 24 : 18, PALETTE.adobeLight);
  gableRoof(g, bx, by - (rich ? 24 : 18), c.footW * 0.34, c.footH * 0.34, 12);

  if (rich) {
    // Saman balyalari
    g.fillStyle(PALETTE.cropGold, 1);
    g.fillEllipse(c.cx + c.footW * 0.24, c.baseY + c.footH * 0.08, 16, 9);
    g.fillStyle(shade(PALETTE.cropGold, -0.18), 1);
    g.fillEllipse(c.cx + c.footW * 0.3, c.baseY + c.footH * 0.14, 13, 7);
  }
};

/** Oduncu kampi: acik cepheli ahsap saya, buyuk kutuk yigini. */
const drawLumberCamp: ArtDrawer = (g, c, level) => {
  contactShadow(g, c, 0.92);
  const big = level >= 2;

  // Toprak zemin - talas ve cali
  g.fillStyle(PALETTE.adobeDark, 1);
  diamond(g, c.cx, c.baseY, c.footW * 0.9, c.footH * 0.9);
  g.fillPath();

  // Saya (acik cepheli ahsap yapi)
  const hx = c.cx - c.footW * 0.2;
  const hy = c.baseY - c.footH * 0.08;
  const hw = c.footW * 0.44;
  const hd = c.footH * 0.44;
  const hh = big ? 30 : 24;
  box(g, hx, hy, hw, hd, hh, PALETTE.wood);

  // Dikey ahsap kaplama - yapiyi tastan ayiran sey
  for (let i = 0; i < 4; i += 1) {
    const t = (i + 0.5) / 4;
    g.fillStyle(shade(PALETTE.woodLight, -0.08), 1);
    g.fillRect(hx - hw / 2 + (t * hw) / 2 - 1.5, hy + (t * hd) / 2 - hh, 3, hh);
  }

  // Ahsap catili ust - kiremit degil, tahta
  gableRoof(g, hx, hy - hh, hw * 1.08, hd * 1.08, 13);
  g.fillStyle(PALETTE.woodDark, 0.35);
  diamond(g, hx, hy - hh, hw * 1.08, hd * 1.08);
  g.fillPath();

  // Kutuk yigini - kampin imzasi, uc uc bakan silindirler
  const stackX = c.cx + c.footW * 0.24;
  const stackY = c.baseY + c.footH * 0.1;
  const rows = big ? 3 : 2;
  for (let row = 0; row < rows; row += 1) {
    const perRow = rows - row;
    for (let i = 0; i < perRow; i += 1) {
      const px = stackX + (i - (perRow - 1) / 2) * 15;
      const py = stackY - row * 11;
      g.fillStyle(PALETTE.woodLight, 1);
      g.fillEllipse(px, py, 15, 10);
      g.fillStyle(shade(PALETTE.woodDark, 0.3), 1);
      g.fillEllipse(px, py, 7, 4.5);
      g.fillStyle(PALETTE.woodDark, 1);
      g.fillEllipse(px, py, 3, 2);
    }
  }

  // Kutuk govdesi - yerde duran tek bir kütük
  g.fillStyle(PALETTE.wood, 1);
  g.fillEllipse(c.cx - c.footW * 0.02, c.baseY + c.footH * 0.3, 26, 9);
  g.fillStyle(PALETTE.woodLight, 1);
  g.fillEllipse(c.cx + c.footW * 0.08, c.baseY + c.footH * 0.3, 9, 8);
};

/**
 * Tas ocagi: zemine oyulmus acik ocak.
 *
 * Ilk surumde arka kutle duz bir KUTU idi ve bina "gri bir kutu" gibi
 * gorunuyordu. Kaya, kutu degil KIRIK bir kutledir: acili fasetlerle
 * cizilir. Cukur de zeminin icine oyulmus gibi durmali, uzerine konmus
 * gri bir tabak gibi degil.
 */
const drawQuarry: ArtDrawer = (g, c, level) => {
  contactShadow(g, c, 0.98);
  const deep = level >= 2;

  // Toprak cevre - ocak zemine oyulmus gibi dursun, uzerine konmus gibi degil
  g.fillStyle(PALETTE.adobeDark, 1);
  diamond(g, c.cx, c.baseY, c.footW * 0.96, c.footH * 0.96);
  g.fillPath();

  // Cukur agzi ve kademeli inis
  const pitCx = c.cx + c.footW * 0.08;
  const pitCy = c.baseY + c.footH * 0.08;
  g.fillStyle(shade(PALETTE.blockDark, -0.05), 1);
  diamond(g, pitCx, pitCy, c.footW * 0.72, c.footH * 0.72);
  g.fillPath();
  const rings = deep ? 3 : 2;
  for (let i = 1; i <= rings; i += 1) {
    g.fillStyle(shade(PALETTE.blockDark, -0.16 * i), 1);
    diamond(g, pitCx, pitCy + i * 4, c.footW * 0.72 * (1 - i * 0.19), c.footH * 0.72 * (1 - i * 0.19));
    g.fillPath();
  }

  /*
   * ARKA KAYA YUZU - ocaga siluet veren kutle.
   * Kutu degil: farkli yukseklikte uc acili kaya dilimi. Isik yine sol
   * usttten geldigi icin sol fasetler acik, sag fasetler koyudur.
   */
  const crags: Array<[number, number, number, number]> = [
    [-0.34, -0.2, 0.3, deep ? 52 : 40],
    [-0.08, -0.3, 0.26, deep ? 40 : 30],
    [0.2, -0.22, 0.24, deep ? 32 : 24],
  ];
  for (const [dx, dy, wFrac, h] of crags) {
    const x = c.cx + c.footW * dx;
    const y = c.baseY + c.footH * dy;
    const w = c.footW * wFrac;

    // Sag faset (golgeli)
    g.fillStyle(shade(PALETTE.block, -0.26), 1);
    g.beginPath();
    g.moveTo(x + w * 0.5, y);
    g.lineTo(x + w * 0.1, y + c.footH * 0.12);
    g.lineTo(x + w * 0.16, y + c.footH * 0.12 - h);
    g.lineTo(x + w * 0.44, y - h * 0.82);
    g.closePath();
    g.fillPath();

    // Sol faset (aydinlik)
    g.fillStyle(shade(PALETTE.blockLight, 0.06), 1);
    g.beginPath();
    g.moveTo(x - w * 0.5, y);
    g.lineTo(x + w * 0.1, y + c.footH * 0.12);
    g.lineTo(x + w * 0.16, y + c.footH * 0.12 - h);
    g.lineTo(x - w * 0.4, y - h * 0.76);
    g.closePath();
    g.fillPath();

    // Tepe fasetleri - kayaya kirik bir ust cizgi verir
    g.fillStyle(PALETTE.block, 1);
    g.fillTriangle(x - w * 0.4, y - h * 0.76, x + w * 0.16, y + c.footH * 0.12 - h, x - w * 0.06, y - h * 0.95);
    g.fillStyle(shade(PALETTE.block, 0.16), 1);
    g.fillTriangle(x - w * 0.06, y - h * 0.95, x + w * 0.16, y + c.footH * 0.12 - h, x + w * 0.44, y - h * 0.82);
  }

  // Kesilmis bloklar - cukurun koyu zemininde parlak ve okunakli
  const blocks: Array<[number, number, number]> = deep
    ? [
        [0.06, 0.14, 18],
        [0.28, 0.06, 16],
        [0.2, 0.3, 16],
        [-0.1, 0.3, 14],
      ]
    : [
        [0.12, 0.16, 17],
        [-0.04, 0.32, 15],
      ];
  for (const [dx, dy, size] of blocks) {
    box(g, c.cx + c.footW * dx, c.baseY + c.footH * dy, size, size * 0.58, size * 0.74, PALETTE.blockLight);
  }

  // Ahsap destek iskelesi - ocagin calisildigini gosterir
  const fx = c.cx - c.footW * 0.3;
  const fy = c.baseY + c.footH * 0.2;
  g.fillStyle(PALETTE.woodDark, 1);
  g.fillRect(fx - 2, fy - 26, 4, 26);
  g.fillRect(fx + 16, fy - 20, 4, 20);
  g.fillStyle(PALETTE.wood, 1);
  g.beginPath();
  g.moveTo(fx - 3, fy - 26);
  g.lineTo(fx + 21, fy - 20);
  g.lineTo(fx + 21, fy - 16);
  g.lineTo(fx - 3, fy - 22);
  g.closePath();
  g.fillPath();

  if (deep) {
    // Kucuk vinc - ikinci seviyenin isareti
    const kx = c.cx + c.footW * 0.34;
    g.fillStyle(PALETTE.woodDark, 1);
    g.fillRect(kx, c.baseY - 46, 5, 46);
    g.fillRect(kx - 22, c.baseY - 48, 32, 5);
    g.fillStyle(PALETTE.wood, 1);
    g.fillRect(kx - 20, c.baseY - 43, 2, 16);
    g.fillStyle(PALETTE.blockLight, 1);
    g.fillRect(kx - 25, c.baseY - 27, 12, 9);
  }
};

/** Pazar: cizgili tente, tezgah, amforalar. */
const drawMarket: ArtDrawer = (g, c, level) => {
  contactShadow(g, c, 0.88);
  const big = level >= 2;

  // Tas platform
  box(g, c.cx, c.baseY, c.footW * 0.86, c.footH * 0.86, 7, PALETTE.stone);
  const deck = c.baseY - 7;

  // Tezgahlar
  box(g, c.cx - c.footW * 0.18, deck, c.footW * 0.3, c.footH * 0.3, 12, PALETTE.wood);
  if (big) box(g, c.cx + c.footW * 0.2, deck + c.footH * 0.1, c.footW * 0.26, c.footH * 0.26, 12, PALETTE.wood);

  // Tente direkleri
  const poleH = big ? 34 : 28;
  g.fillStyle(PALETTE.woodDark, 1);
  g.fillRect(c.cx - c.footW * 0.32, deck - poleH, 3, poleH);
  g.fillRect(c.cx + c.footW * 0.3, deck - poleH, 3, poleH);

  // Cizgili tente - pazarin imzasi. Duz bir ortu, uzerinde izometrik seritler.
  const awnY = deck - poleH;
  const aw = c.footW * 0.78;
  const ah = c.footH * 0.78;
  const stripes = big ? 6 : 5;
  for (let i = 0; i < stripes; i += 1) {
    g.fillStyle(i % 2 === 0 ? PALETTE.clothWarm : PALETTE.clothCool, 1);
    isoStrip(g, c.cx, awnY, aw, ah, i / stripes, (i + 1) / stripes);
    g.fillPath();
  }
  // Tentenin on kenari - kumasa kalinlik hissi
  g.fillStyle(shade(PALETTE.clothWarm, -0.3), 1);
  g.beginPath();
  g.moveTo(c.cx - aw / 2, awnY);
  g.lineTo(c.cx, awnY + ah / 2);
  g.lineTo(c.cx, awnY + ah / 2 + 4);
  g.lineTo(c.cx - aw / 2, awnY + 4);
  g.closePath();
  g.fillPath();

  // Amforalar
  g.fillStyle(PALETTE.roofDark, 1);
  g.fillEllipse(c.cx + c.footW * 0.06, deck + c.footH * 0.26, 9, 12);
  g.fillStyle(PALETTE.roof, 1);
  g.fillEllipse(c.cx - c.footW * 0.04, deck + c.footH * 0.3, 8, 11);
};

/** Ambar: uzun depo yapisi, buyuk kapi, istiflenmis kuplar. */
const drawWarehouse: ArtDrawer = (g, c, level) => {
  contactShadow(g, c, 0.94);
  const big = level >= 2;

  const w = c.footW * 0.74;
  const d = c.footH * 0.74;
  const bodyH = big ? 38 : 28;

  box(g, c.cx, c.baseY, w, d, bodyH, PALETTE.stoneLight);

  // Duz kiremit teras
  flatRoof(g, c.cx, c.baseY - bodyH, w, d, PALETTE.roof);
  // Cati kenarligi - siluete keskin bir ust cizgi verir
  g.fillStyle(PALETTE.roofDark, 1);
  g.beginPath();
  g.moveTo(c.cx + w / 2, c.baseY - bodyH);
  g.lineTo(c.cx, c.baseY - bodyH + d / 2);
  g.lineTo(c.cx, c.baseY - bodyH + d / 2 + 4);
  g.lineTo(c.cx + w / 2, c.baseY - bodyH + 4);
  g.closePath();
  g.fillPath();

  // Buyuk kapi
  doorway(g, c.cx - w * 0.16, c.baseY + d * 0.2, 14, 20);

  // Istiflenmis kuplar / sandiklar
  const crates = big ? 4 : 2;
  for (let i = 0; i < crates; i += 1) {
    const col = i % 2;
    const row = Math.floor(i / 2);
    box(
      g,
      c.cx + c.footW * 0.3 + col * 9,
      c.baseY + c.footH * 0.16 - row * 9,
      13,
      8,
      10,
      col === 0 ? PALETTE.woodLight : PALETTE.wood,
    );
  }

  if (big) {
    // Ust kat penceresi
    g.fillStyle(PALETTE.doorway, 0.55);
    g.fillRect(c.cx + w * 0.08, c.baseY - bodyH * 0.7, 8, 8);
  }
};

/** Taninmayan tur icin yedek: sade kerpic kutu. */
const drawGeneric: ArtDrawer = (g, c) => {
  contactShadow(g, c, 0.85);
  box(g, c.cx, c.baseY, c.footW * 0.66, c.footH * 0.66, 34, PALETTE.adobe);
  gableRoof(g, c.cx, c.baseY - 34, c.footW * 0.72, c.footH * 0.72, 14);
};

/**
 * Insaat iskelesi: temel hattı ve ahsap direkler.
 * Butun binalar icin ortaktir; "burada bir sey yapiliyor" der.
 */
export const drawScaffold: ArtDrawer = (g, c) => {
  contactShadow(g, c, 0.9);

  // Kazilmis temel
  g.fillStyle(PALETTE.adobeDark, 1);
  diamond(g, c.cx, c.baseY, c.footW * 0.86, c.footH * 0.86);
  g.fillPath();
  g.fillStyle(shade(PALETTE.adobeDark, -0.18), 1);
  diamond(g, c.cx, c.baseY + 2, c.footW * 0.66, c.footH * 0.66);
  g.fillPath();

  // Temel tas sirasi
  const r = c.footW * 0.33;
  for (let i = 0; i < 4; i += 1) {
    const a = (Math.PI / 2) * i + Math.PI / 4;
    box(g, c.cx + Math.cos(a) * r, c.baseY + (Math.sin(a) * r) / 2, 16, 9, 7, PALETTE.block);
  }

  // Ahsap iskele direkleri ve yatay kusak
  const postH = 30;
  const posts: Array<[number, number]> = [
    [-0.3, -0.08],
    [0.3, -0.08],
    [0, 0.2],
  ];
  g.fillStyle(PALETTE.woodLight, 1);
  for (const [dx, dy] of posts) {
    g.fillRect(c.cx + c.footW * dx - 2, c.baseY + c.footH * dy - postH, 4, postH);
  }
  g.fillStyle(PALETTE.wood, 1);
  g.fillRect(c.cx - c.footW * 0.3, c.baseY - postH * 0.7, c.footW * 0.6, 3);
};

/** Tur -> cizim eslemesi. */
export const BUILDING_ART: Record<DrawnBuildingType | typeof GENERIC_VISUAL, ArtDrawer> = {
  town_hall: drawTownHall,
  house: drawHouse,
  farm: drawFarm,
  lumber_camp: drawLumberCamp,
  quarry: drawQuarry,
  market: drawMarket,
  warehouse: drawWarehouse,
  generic: drawGeneric,
};
