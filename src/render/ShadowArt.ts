import type Phaser from 'phaser';
import { TILE_HEIGHT, TILE_WIDTH } from '@/config/Constants';

/**
 * Binalarin altina dusen yumusak temas golgesi.
 *
 * NEDEN AYRI BIR KATMAN
 * Prosedurel cizilen binalarin golgesi kendi dokularina PISIRILMIS
 * durumda (bkz. ArtStyle.SHADOW_ALPHA) - onlar icin bu katman
 * kullanilmaz, kullanilsaydi golge iki kez cizilirdi. Elle uretilen bir
 * PNG ise yalnizca binanin kendisini icerir; zemine oturmasi icin altina
 * bir golge gerekir ve onu burasi verir.
 *
 * Yani bu katman "PNG geldiginde otomatik devreye giren" parcadir:
 * sanatcinin golge cizmesi gerekmez, isterse `{ad}_shadow.png` ile kendi
 * golgesini verip bunu gecersiz kilabilir.
 *
 * OLCU: golge binanin AYAK IZINE gore uretilir, boyuna gore degil. Uzun
 * bir kule ile alcak bir ev ayni karoyu kapliyorsa zeminde ayni izi
 * birakir; golgeyi gorsel yuksekligine baglamak binalari havada asili
 * gosteriyordu.
 */

/** Golgenin en koyu noktadaki opakligi. */
const SHADOW_ALPHA = 0.3;

/** Ayak izi disina tasan yumusak kenar payi (piksel). */
const FEATHER = 10;

/** Verilen ayak izi olcusu icin golge dokusunun anahtari. */
export function shadowKeyFor(size: number): string {
  const safe = Number.isFinite(size) ? Math.max(1, Math.trunc(size)) : 1;
  return `shadow:${safe}`;
}

/**
 * Ayak izi olcusune gore izometrik (2:1) yumusak golge uretir.
 *
 * Doku olcu BASINA bir kez uretilir; sehirde yuzlerce bina olsa da en
 * fazla birkac dokudan ibarettir.
 */
export function ensureShadowTexture(scene: Phaser.Scene, size: number): string {
  const key = shadowKeyFor(size);
  if (scene.textures.exists(key)) return key;

  const width = TILE_WIDTH * size + FEATHER * 2;
  const height = TILE_HEIGHT * size + FEATHER * 2;

  const canvas = scene.textures.createCanvas(key, width, height);
  if (!canvas) return key;
  const ctx = canvas.context;
  ctx.clearRect(0, 0, width, height);

  /*
   * Dairesel gradyan cizilip DIKEYDE yariya sikistirilir: izometrik
   * projeksiyonda zemin 2:1 oldugu icin dogru bicim budur. Elips icin
   * ayri bir gradyan tanimlamak yerine olcek kullanmak, yumusak gecisin
   * her iki eksende de esit kalmasini saglar.
   */
  const half = width / 2;
  ctx.save();
  ctx.translate(0, height / 2);
  ctx.scale(1, height / width);
  ctx.translate(0, -half);

  const gradient = ctx.createRadialGradient(half, half, 0, half, half, half);
  gradient.addColorStop(0, `rgba(0,0,0,${SHADOW_ALPHA})`);
  gradient.addColorStop(0.55, `rgba(0,0,0,${SHADOW_ALPHA * 0.6})`);
  gradient.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, width);
  ctx.restore();

  canvas.refresh();
  return key;
}
