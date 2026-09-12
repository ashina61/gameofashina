import type Phaser from 'phaser';
import { PALETTE, SHADOW_ALPHA } from './ArtStyle';
import { shade } from './BuildingArt';
import type { DecorKind } from '@/types';

/**
 * Sehir cevresindeki kucuk ogelerin cizimleri.
 *
 * Binalarla AYNI sanat spesifikasyonuna uyarlar (bkz. ArtStyle): sol ustten
 * isik, saga-asagi temas golgesi, kontursuz, dusuk detay. Amac sehri
 * doldurmak; dikkat cekmek degil. Bu yuzden hepsi bir evden alcaktir ve
 * doygunlugu dusuk tutulur - aksi halde bir cali, binadan once goze
 * carpardi (gorsel hiyerarsi: bkz. Sprint 13 §13).
 *
 * Her cizim bir kez dokuya pisirilir; sahnede yalnizca Image kullanilir.
 */

/** Dekor dokusunun olculeri ve taban noktasi. */
export interface DecorSpec {
  width: number;
  height: number;
  /** Tabanin dokunun altindan yuksekligi; sprite bu noktadan yerlestirilir. */
  baseY: number;
}

export const DECOR_SPEC: Record<DecorKind, DecorSpec> = {
  tree: { width: 46, height: 62, baseY: 10 },
  bush: { width: 34, height: 28, baseY: 7 },
  rock: { width: 34, height: 26, baseY: 7 },
  amphora: { width: 24, height: 32, baseY: 6 },
  logs: { width: 40, height: 28, baseY: 7 },
  column: { width: 26, height: 46, baseY: 8 },
  reed: { width: 30, height: 30, baseY: 7 },
};

/** Dekor doku anahtari. */
export function decorKeyFor(kind: DecorKind): string {
  return `deco:${kind}`;
}

/** Zemine oturan yumusak golge; butun dekorlarda ayni yon. */
function groundShadow(g: Phaser.GameObjects.Graphics, cx: number, y: number, w: number): void {
  g.fillStyle(0x1a1206, SHADOW_ALPHA * 0.8);
  g.fillEllipse(cx + w * 0.08, y, w * 0.8, w * 0.34);
}

/** Servi/zeytin karisimi kucuk agac: koyu govde, iki katmanli tepe. */
function drawTree(g: Phaser.GameObjects.Graphics, s: DecorSpec): void {
  const cx = s.width / 2;
  const base = s.height - s.baseY;
  groundShadow(g, cx, base, s.width * 0.66);

  g.fillStyle(PALETTE.woodDark, 1);
  g.fillRect(cx - 2.5, base - 16, 5, 16);

  // Tepe: alt katman genis ve koyu, ust katman dar ve aydinlik.
  g.fillStyle(PALETTE.leafDark, 1);
  g.fillEllipse(cx, base - 24, 30, 22);
  g.fillStyle(PALETTE.leaf, 1);
  g.fillEllipse(cx - 3, base - 30, 25, 20);
  g.fillStyle(shade(PALETTE.leaf, 0.18), 1);
  g.fillEllipse(cx - 6, base - 35, 15, 12);
}

/** Alcak cali obegi - uc yuvarlak kutle. */
function drawBush(g: Phaser.GameObjects.Graphics, s: DecorSpec): void {
  const cx = s.width / 2;
  const base = s.height - s.baseY;
  groundShadow(g, cx, base, s.width * 0.7);

  g.fillStyle(PALETTE.leafDark, 1);
  g.fillEllipse(cx + 5, base - 6, 18, 13);
  g.fillStyle(PALETTE.leaf, 1);
  g.fillEllipse(cx - 5, base - 7, 17, 13);
  g.fillStyle(shade(PALETTE.leaf, 0.2), 1);
  g.fillEllipse(cx - 1, base - 12, 12, 9);
}

/** Kirik kaya parcasi: acili fasetler, kutu degil. */
function drawRock(g: Phaser.GameObjects.Graphics, s: DecorSpec): void {
  const cx = s.width / 2;
  const base = s.height - s.baseY;
  groundShadow(g, cx, base, s.width * 0.66);

  g.fillStyle(shade(PALETTE.block, -0.22), 1);
  g.fillTriangle(cx + 12, base, cx - 2, base - 3, cx + 4, base - 13);
  g.fillStyle(PALETTE.blockLight, 1);
  g.fillTriangle(cx - 12, base, cx - 2, base - 3, cx + 4, base - 13);
  g.fillStyle(PALETTE.block, 1);
  g.fillTriangle(cx - 12, base, cx + 12, base, cx - 2, base - 3);
  // Yanindaki kucuk tas - tek parca "cop" gibi durmasin.
  g.fillStyle(shade(PALETTE.blockLight, -0.1), 1);
  g.fillEllipse(cx - 11, base - 2, 10, 6);
}

/** Amfora: dar boyun, genis govde, koyu agiz. */
function drawAmphora(g: Phaser.GameObjects.Graphics, s: DecorSpec): void {
  const cx = s.width / 2;
  const base = s.height - s.baseY;
  groundShadow(g, cx, base, s.width * 0.8);

  g.fillStyle(PALETTE.roofDark, 1);
  g.fillEllipse(cx, base - 9, 16, 20);
  g.fillStyle(PALETTE.roof, 1);
  g.fillEllipse(cx - 2, base - 10, 12, 16);
  g.fillStyle(PALETTE.roofDark, 1);
  g.fillRect(cx - 3, base - 24, 6, 8);
  g.fillStyle(PALETTE.doorway, 0.7);
  g.fillEllipse(cx, base - 24, 7, 3);
}

/** Kesilmis kutuk istifi - iki sira, kesit halkalari gorunur. */
function drawLogs(g: Phaser.GameObjects.Graphics, s: DecorSpec): void {
  const cx = s.width / 2;
  const base = s.height - s.baseY;
  groundShadow(g, cx, base, s.width * 0.78);

  for (const [dx, dy, light] of [
    [-8, 0, false],
    [8, 0, true],
    [0, -8, true],
  ] as Array<[number, number, boolean]>) {
    g.fillStyle(light ? PALETTE.woodLight : PALETTE.wood, 1);
    g.fillEllipse(cx + dx, base - 5 + dy, 15, 10);
    g.fillStyle(shade(PALETTE.woodDark, 0.34), 1);
    g.fillEllipse(cx + dx, base - 5 + dy, 7, 4.5);
  }
}

/** Devrilmemis kolon parcasi - antik kalinti hissi. */
function drawColumn(g: Phaser.GameObjects.Graphics, s: DecorSpec): void {
  const cx = s.width / 2;
  const base = s.height - s.baseY;
  groundShadow(g, cx, base, s.width * 0.72);

  g.fillStyle(PALETTE.stone, 1);
  g.fillEllipse(cx, base - 2, 20, 8);
  g.fillStyle(PALETTE.stoneLight, 1);
  g.fillRect(cx - 6, base - 30, 12, 28);
  g.fillStyle(shade(PALETTE.stoneLight, -0.18), 1);
  g.fillRect(cx + 2, base - 30, 4, 28);
  g.fillStyle(PALETTE.stone, 1);
  g.fillEllipse(cx, base - 30, 17, 7);
}

/** Sazlik - kiyi karolarinda su ile kara arasini yumusatir. */
function drawReed(g: Phaser.GameObjects.Graphics, s: DecorSpec): void {
  const cx = s.width / 2;
  const base = s.height - s.baseY;
  g.fillStyle(0x1a1206, SHADOW_ALPHA * 0.5);
  g.fillEllipse(cx, base, s.width * 0.6, s.width * 0.22);

  for (const [dx, h, lean] of [
    [-7, 16, -3],
    [-2, 21, -1],
    [4, 18, 2],
    [9, 13, 4],
  ] as Array<[number, number, number]>) {
    g.fillStyle(dx % 2 === 0 ? PALETTE.cropGreen : PALETTE.leaf, 1);
    g.beginPath();
    g.moveTo(cx + dx - 1.4, base);
    g.lineTo(cx + dx + 1.4, base);
    g.lineTo(cx + dx + lean + 1, base - h);
    g.lineTo(cx + dx + lean - 1, base - h);
    g.closePath();
    g.fillPath();
  }
}

/** Cesit -> cizim eslemesi. */
export const DECOR_ART: Record<DecorKind, (g: Phaser.GameObjects.Graphics, s: DecorSpec) => void> =
  {
    tree: drawTree,
    bush: drawBush,
    rock: drawRock,
    amphora: drawAmphora,
    logs: drawLogs,
    column: drawColumn,
    reed: drawReed,
  };
