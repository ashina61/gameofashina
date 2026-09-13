import type Phaser from 'phaser';
import { SKIN_PALETTE } from './PanelSkin';

/**
 * Kod ile uretilen arayuz bicimleri: kapsul kartlar, gezinme yuzeyi,
 * altin isima ve arma halkasi.
 *
 * NEDEN AYRI DOSYA
 * PanelSkin degistirilebilir UC DOKUYA dayanir; burasi ise hicbir varliga
 * ihtiyac duymayan, tamamen kodla cizilen bicimlerdir. Ayirmak, "hangisini
 * PNG ile degistirebilirim" sorusunu dosya sinirinda cevaplar: bu dosyadaki
 * hicbir sey degistirilmek zorunda degil, hepsi her cozunurlukte kendi
 * uretir.
 *
 * Hepsi Canvas2D gradyanlari kullanir cunku Phaser Graphics gradyan
 * cizemez ve bu bicimlerin tamami gradyana dayanir.
 */

/**
 * Kapsul derilerinin 9-slice kesme paylari.
 *
 * Pay, kose yaricapindan BUYUK olmali: kucuk olursa yuvarlak kose orta
 * banda tasar ve germe onu yayarak bozar. Yaricap + 2 guvenli en dar
 * degerdir ve kaynagin duz orta seridini olabildigince genis birakir.
 */
export const BUTTON_SLICE = 12;
export const CAPSULE_SLICE = 15;

/** Yuvarlatilmis dikdortgen yolu. */
function roundedPath(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
): void {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + w - radius, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + radius);
  ctx.lineTo(x + w, y + h - radius);
  ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
  ctx.lineTo(x + radius, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}

/** Kapsul kartin gorunum secenekleri. */
export interface CapsuleOptions {
  /** Kaynak dokunun kenar uzunlugu; hedef yukseklige esit olmali. */
  size?: number;
  /** Kose yaricapi; yukseklik/2 tam kapsul verir. */
  radius?: number;
  /** Gradyanin ust ve alt rengi. */
  top?: string;
  bottom?: string;
  /** Kenar cizgisi rengi; null ise cizilmez. */
  border?: string | null;
  /** Kenar cizgisi kalinligi. */
  borderWidth?: number;
  /** Ust kenardaki ic isik seridi - yuzeye hacim verir. */
  sheen?: boolean;
}

/**
 * Kapsul (pill) bicimli 9-slice kaynagi.
 *
 * Kaynak yuksekligi hedef yukseklige esit tutulursa dikey germe olmaz ve
 * yuvarlak uclar bozulmadan kalir; genislik serbestce gerilir.
 */
export function createCapsuleTexture(
  scene: Phaser.Scene,
  key: string,
  options: CapsuleOptions = {},
): void {
  if (scene.textures.exists(key)) return;

  const {
    size = 48,
    radius = 16,
    top = SKIN_PALETTE.parchmentLight,
    bottom = SKIN_PALETTE.parchmentDark,
    border = SKIN_PALETTE.goldDark,
    borderWidth = 1.5,
    sheen = true,
  } = options;

  const canvas = scene.textures.createCanvas(key, size, size);
  if (!canvas) return;
  const ctx = canvas.context;
  ctx.clearRect(0, 0, size, size);

  const inset = borderWidth / 2 + 0.5;
  const w = size - inset * 2;
  const h = size - inset * 2;

  const fill = ctx.createLinearGradient(0, 0, 0, size);
  fill.addColorStop(0, top);
  fill.addColorStop(1, bottom);

  roundedPath(ctx, inset, inset, w, h, radius);
  ctx.fillStyle = fill;
  ctx.fill();

  if (sheen) {
    // Ust kenarda ince bir ic isik: yuzey duz bir renk lekesi olmaktan
    // cikip hacim kazanir. Cok hafif - gozle secilmez, eksikligi hissedilir.
    ctx.save();
    ctx.clip();
    const gloss = ctx.createLinearGradient(0, 0, 0, size * 0.45);
    gloss.addColorStop(0, 'rgba(255,255,255,0.14)');
    gloss.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = gloss;
    ctx.fillRect(0, 0, size, size * 0.45);
    ctx.restore();
  }

  if (border) {
    roundedPath(ctx, inset, inset, w, h, radius);
    ctx.strokeStyle = border;
    ctx.lineWidth = borderWidth;
    ctx.stroke();
  }

  canvas.refresh();
}

/** Alt gezinme cubugunun koyu yuzeyi: yukaridan asagi koyulasan deri. */
export function createNavTexture(scene: Phaser.Scene, key: string): void {
  if (scene.textures.exists(key)) return;

  const size = 32;
  const canvas = scene.textures.createCanvas(key, size, size);
  if (!canvas) return;
  const ctx = canvas.context;

  const gradient = ctx.createLinearGradient(0, 0, 0, size);
  gradient.addColorStop(0, SKIN_PALETTE.navTop);
  gradient.addColorStop(1, SKIN_PALETTE.navBottom);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);

  // Ust kenarda ince altin ayrac: cubugu sehirden ayiran cizgi.
  ctx.fillStyle = SKIN_PALETTE.goldDark;
  ctx.globalAlpha = 0.85;
  ctx.fillRect(0, 0, size, 1);

  canvas.refresh();
}

/** Aktif sekmenin altin plakasi: koyu ahsabin uzerinde kesin bir yuzey. */
export function createNavActiveTexture(scene: Phaser.Scene, key: string): void {
  if (scene.textures.exists(key)) return;

  const size = 48;
  const canvas = scene.textures.createCanvas(key, size, size);
  if (!canvas) return;
  const ctx = canvas.context;
  ctx.clearRect(0, 0, size, size);

  const gradient = ctx.createLinearGradient(0, 0, 0, size);
  gradient.addColorStop(0, SKIN_PALETTE.navActiveTop);
  gradient.addColorStop(1, SKIN_PALETTE.navActiveBottom);

  roundedPath(ctx, 1, 1, size - 2, size - 2, 8);
  ctx.fillStyle = gradient;
  ctx.fill();
  ctx.strokeStyle = SKIN_PALETTE.goldBright;
  ctx.lineWidth = 1.5;
  ctx.stroke();

  canvas.refresh();
}

/**
 * Yumusak isima lekesi (radial gradient).
 *
 * Aktif sekmenin altinda ve secili yuzeylerde kullanilir. Merkezden
 * disari tamamen seffaflasir, yani kenari yoktur - uzerine kondugu her
 * zeminle karisir.
 */
export function createGlowTexture(
  scene: Phaser.Scene,
  key: string,
  color = '232,200,106',
): void {
  if (scene.textures.exists(key)) return;

  const size = 64;
  const canvas = scene.textures.createCanvas(key, size, size);
  if (!canvas) return;
  const ctx = canvas.context;
  ctx.clearRect(0, 0, size, size);

  const half = size / 2;
  const gradient = ctx.createRadialGradient(half, half, 0, half, half, half);
  gradient.addColorStop(0, `rgba(${color},0.55)`);
  gradient.addColorStop(0.45, `rgba(${color},0.22)`);
  gradient.addColorStop(1, `rgba(${color},0)`);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);

  canvas.refresh();
}

/**
 * Arma halkasi: armanin cevresindeki altin cember.
 *
 * Ici BOSTUR - arma gorseli halkanin arkasina konur ve halka onu cerceveler.
 * Tek parca cizilseydi arma degistiginde halka da yeniden uretilmek
 * zorunda kalirdi.
 */
export function createRingTexture(scene: Phaser.Scene, key: string, thickness = 3): void {
  if (scene.textures.exists(key)) return;

  const size = 64;
  const canvas = scene.textures.createCanvas(key, size, size);
  if (!canvas) return;
  const ctx = canvas.context;
  ctx.clearRect(0, 0, size, size);

  const half = size / 2;
  const radius = half - thickness;

  // Halkanin kendisi metalik: acidan gelen isikla ust sol parlak, alt sag koyu.
  const gradient = ctx.createLinearGradient(0, 0, size, size);
  gradient.addColorStop(0, SKIN_PALETTE.goldBright);
  gradient.addColorStop(0.5, SKIN_PALETTE.gold);
  gradient.addColorStop(1, SKIN_PALETTE.goldDark);

  ctx.strokeStyle = gradient;
  ctx.lineWidth = thickness;
  ctx.beginPath();
  ctx.arc(half, half, radius, 0, Math.PI * 2);
  ctx.stroke();

  // Ic golge: halkanin icindeki oyuk hissi.
  ctx.strokeStyle = 'rgba(0,0,0,0.45)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.arc(half, half, radius - thickness / 2 - 0.5, 0, Math.PI * 2);
  ctx.stroke();

  canvas.refresh();
}

/** Dolu daire - seviye rozetinin zemini. */
export function createDiscTexture(
  scene: Phaser.Scene,
  key: string,
  top = SKIN_PALETTE.gold,
  bottom = SKIN_PALETTE.goldDark,
): void {
  if (scene.textures.exists(key)) return;

  const size = 48;
  const canvas = scene.textures.createCanvas(key, size, size);
  if (!canvas) return;
  const ctx = canvas.context;
  ctx.clearRect(0, 0, size, size);

  const half = size / 2;
  const gradient = ctx.createLinearGradient(0, 0, 0, size);
  gradient.addColorStop(0, top);
  gradient.addColorStop(1, bottom);

  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.arc(half, half, half - 2, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = 'rgba(0,0,0,0.5)';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  canvas.refresh();
}
