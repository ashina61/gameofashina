import type Phaser from 'phaser';
import {
  UI_TEXTURE_NAMES,
  hasUiTexture,
  uiSourceKeyFor,
  type UiTextureName,
} from './AssetManifest';

/**
 * Panel derisi: uc temel dokudan her olcude cerceve ureten sistem.
 *
 * UC DOKU
 *   panel_bg     - parsomen/deri zemin
 *   panel_border - altin kenarlik seridi
 *   panel_corner - kose susu
 *
 * Ucu de /src/assets/ui/ icinde ayni adla bir PNG ile degistirilebilir.
 * Dosya yoksa bu modul yerine gecen bir gradyan uretir; oyun her iki
 * durumda da ayni sekilde calisir.
 *
 * NEDEN TEK DOKUYA PISIRILIYOR
 * "Uc dokuyu her panelde ust uste koymak" akla yatkin gorunur ama panel
 * basina dokuz nesne demektir. Bu projede ayni hata daha once olculdu:
 * sokak kaplamasi ayri sprite katmani olarak konunca 34 FPS 26'ya dustu,
 * dokuya pisirilince geri geldi. Bu yuzden uc kaynak doku BIR KEZ tek bir
 * 9-slice dokusuna pisirilir; her panel yine tek bir nesnedir ve istedigi
 * olcude gerilir.
 *
 * NEDEN CANVAS
 * Phaser Graphics gradyan cizemez. Gradyan (deri dokusu, metalik altin)
 * Canvas2D ile uretilir ve dokuya yazilir.
 */

/** 9-slice kaynak dokusunun kenar uzunlugu. */
const SKIN_SIZE = 64;

/** 9-slice kesme payi: bu kadarlik kose bolgesi gerilmeden kalir. */
export const PANEL_SLICE = 22;

/** Kenarlik seridinin kalinligi (kaynak doku pikseli). */
const BORDER_THICKNESS = 5;

/** Kose susunun kenar uzunlugu. */
const CORNER_SIZE = 20;

/**
 * Parsomen/altin/kahve paleti - butun arayuz derileri buradan beslenir.
 *
 * PANELLER ACIK, GEZINME KOYU.
 * Ilk surumde butun arayuz koyu deriydi; referans duzende ise paneller
 * ACIK PARSOMEN, yalnizca alt gezinme cubugu koyu ahsaptir. Bu yalnizca
 * bir renk tercihi degil bir okunabilirlik karari: acik zemin uzerinde
 * koyu kahve yazi, gunes altindaki telefonda koyu zemindeki krem yazidan
 * belirgin sekilde daha okunur.
 */
export const SKIN_PALETTE = {
  /** Parsomen zeminin acik ve koyu ucu (ust kenar aydinlik). */
  parchmentLight: '#f7ebd2',
  parchment: '#eddcb8',
  parchmentDark: '#dcc496',

  /** Panel uzerindeki yazi renkleri. */
  ink: '#4a3520',
  inkSoft: '#7d6446',

  /** Altin seridin tonlari: kenarlarda koyu, ortada parlak. */
  goldDark: '#8a6a22',
  gold: '#c9a227',
  goldBright: '#f0d98c',

  /** Koyu ahsap gezinme yuzeyi. */
  navTop: '#4a3520',
  navBottom: '#2b1d10',

  /** Aktif sekmenin altin plakasi. */
  navActiveTop: '#c9912f',
  navActiveBottom: '#8a5f1c',
} as const;

/** Bir panel derisinin gorunum secenekleri. */
export interface PanelSkinOptions {
  /** Zeminin opakligi. Sehrin uzerinde duran paneller tam opaktir. */
  alpha?: number;
  /** Zemini bu renge dogru koyultur/acar; null ise dokunun kendi rengi. */
  tint?: string | null;
  /** Kose susu cizilsin mi? Kucuk yuzeylerde sus gurultu yapar. */
  corners?: boolean;
  /** Kenarlik rengi (metalik seridin orta tonu). */
  borderColor?: string;
}

/**
 * Uc kaynak dokuyu hazirlar.
 *
 * Dosyadan geleni oldugu gibi birakir, eksik olani gradyanla uretir.
 * Yukleme SpriteLoader'da yapildigi icin burada yalnizca "var mi, yoksa
 * uret" karari verilir.
 */
export function ensureUiSources(scene: Phaser.Scene): void {
  for (const name of UI_TEXTURE_NAMES) {
    const key = uiSourceKeyFor(name);
    // Dosyadan yuklendiyse dokunma: oyuncunun kendi sanati kazanir.
    if (hasUiTexture(name) && scene.textures.exists(key)) continue;
    if (scene.textures.exists(key)) continue;
    createPlaceholder(scene, name, key);
  }
}

/**
 * Uc kaynagi tek bir 9-slice dokusuna pisirir.
 *
 * Sonuc `scene.add.nineslice(key, undefined, w, h, PANEL_SLICE x4)` ile
 * her olcude kullanilabilir.
 */
export function buildPanelSkin(
  scene: Phaser.Scene,
  key: string,
  options: PanelSkinOptions = {},
): void {
  if (scene.textures.exists(key)) return;
  ensureUiSources(scene);

  const { alpha = 1, tint = null, corners = true, borderColor = SKIN_PALETTE.gold } = options;

  const canvas = scene.textures.createCanvas(key, SKIN_SIZE, SKIN_SIZE);
  if (!canvas) return;
  const ctx = canvas.context;
  ctx.clearRect(0, 0, SKIN_SIZE, SKIN_SIZE);

  // 1. ZEMIN - kaynak doku butun yuzeye gerilir.
  ctx.save();
  ctx.globalAlpha = alpha;
  drawSource(scene, ctx, 'panel_bg', 0, 0, SKIN_SIZE, SKIN_SIZE);
  if (tint) {
    // Ton, zeminin uzerine yumusak bir renk katmani olarak gecer; dokunun
    // damarlari gorunmeye devam eder.
    ctx.globalAlpha = alpha * 0.55;
    ctx.fillStyle = tint;
    ctx.fillRect(0, 0, SKIN_SIZE, SKIN_SIZE);
  }
  ctx.restore();

  // 2. KENARLIK - serit dort kenara gerilir; dikey kenarlar dondurulur.
  ctx.save();
  drawBorderStrip(scene, ctx, 0, 0, SKIN_SIZE, BORDER_THICKNESS, borderColor);
  drawBorderStrip(
    scene,
    ctx,
    0,
    SKIN_SIZE - BORDER_THICKNESS,
    SKIN_SIZE,
    BORDER_THICKNESS,
    borderColor,
  );
  drawVerticalBorder(scene, ctx, 0, 0, BORDER_THICKNESS, SKIN_SIZE, borderColor);
  drawVerticalBorder(
    scene,
    ctx,
    SKIN_SIZE - BORDER_THICKNESS,
    0,
    BORDER_THICKNESS,
    SKIN_SIZE,
    borderColor,
  );
  ctx.restore();

  // 3. KOSE SUSU - dort koseye aynalanarak konur.
  if (corners) {
    drawCorner(scene, ctx, 0, 0, 1, 1);
    drawCorner(scene, ctx, SKIN_SIZE, 0, -1, 1);
    drawCorner(scene, ctx, 0, SKIN_SIZE, 1, -1);
    drawCorner(scene, ctx, SKIN_SIZE, SKIN_SIZE, -1, -1);
  }

  canvas.refresh();
}

/** Kaynak dokuyu hedef dikdortgene cizer. */
function drawSource(
  scene: Phaser.Scene,
  ctx: CanvasRenderingContext2D,
  name: UiTextureName,
  x: number,
  y: number,
  w: number,
  h: number,
): void {
  const source = scene.textures.get(uiSourceKeyFor(name)).getSourceImage();
  ctx.drawImage(source as CanvasImageSource, x, y, w, h);
}

/** Yatay kenarlik seridi. */
function drawBorderStrip(
  scene: Phaser.Scene,
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  color: string,
): void {
  ctx.save();
  ctx.translate(x, y);
  drawSource(scene, ctx, 'panel_border', 0, 0, w, h);
  // Renk secimi seridin uzerine carpim olarak gecer: tek bir altin doku
  // farkli vurgu renkleriyle (altin, kirmizi, yesil) kullanilabilir.
  ctx.globalCompositeOperation = 'multiply';
  ctx.globalAlpha = 0.45;
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, w, h);
  ctx.restore();
}

/** Dikey kenarlik: ayni serit 90 derece dondurulerek kullanilir. */
function drawVerticalBorder(
  scene: Phaser.Scene,
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  color: string,
): void {
  ctx.save();
  ctx.translate(x + w, y);
  ctx.rotate(Math.PI / 2);
  drawBorderStrip(scene, ctx, 0, 0, h, w, color);
  ctx.restore();
}

/** Kose susu; isaretler aynalamayi verir. */
function drawCorner(
  scene: Phaser.Scene,
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  sx: number,
  sy: number,
): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(sx, sy);
  drawSource(scene, ctx, 'panel_corner', 0, 0, CORNER_SIZE, CORNER_SIZE);
  ctx.restore();
}

// --------------------------------------------------------------- PLACEHOLDER

/**
 * Yerine gecen dokular.
 *
 * Bunlar BILEREK sade gradyanlardir: nihai sanat degil, sistemin dogru
 * calistigini gosteren ve gercek PNG gelene kadar duran bir iskele.
 * Uretim boyutlari gercek dosyalarin da hedefledigi boyutlardir.
 */
function createPlaceholder(scene: Phaser.Scene, name: UiTextureName, key: string): void {
  if (name === 'panel_bg') return createParchment(scene, key);
  if (name === 'panel_border') return createGoldStrip(scene, key);
  return createCornerOrnament(scene, key);
}

/** Parsomen zemin: dikey gradyan + hafif damar. */
function createParchment(scene: Phaser.Scene, key: string): void {
  const size = 64;
  const canvas = scene.textures.createCanvas(key, size, size);
  if (!canvas) return;
  const ctx = canvas.context;

  const gradient = ctx.createLinearGradient(0, 0, 0, size);
  gradient.addColorStop(0, SKIN_PALETTE.parchmentLight);
  gradient.addColorStop(0.6, SKIN_PALETTE.parchment);
  gradient.addColorStop(1, SKIN_PALETTE.parchmentDark);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);

  /*
   * Damar: duzenli arali yatay cizgiler. Rastgelelik YOK - doku her
   * acilista birebir ayni uretilir, yani ekran goruntuleri ve gorsel
   * testler kararlidir.
   */
  ctx.globalAlpha = 0.05;
  ctx.fillStyle = '#8a6a3a';
  for (let y = 5; y < size; y += 9) ctx.fillRect(0, y, size, 1);

  canvas.refresh();
}

/** Altin serit: kisa eksende koyu-parlak-koyu metalik gecis. */
function createGoldStrip(scene: Phaser.Scene, key: string): void {
  const width = 64;
  const height = 8;
  const canvas = scene.textures.createCanvas(key, width, height);
  if (!canvas) return;
  const ctx = canvas.context;

  const gradient = ctx.createLinearGradient(0, 0, 0, height);
  gradient.addColorStop(0, SKIN_PALETTE.goldDark);
  gradient.addColorStop(0.35, SKIN_PALETTE.goldBright);
  gradient.addColorStop(0.6, SKIN_PALETTE.gold);
  gradient.addColorStop(1, SKIN_PALETTE.goldDark);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);

  canvas.refresh();
}

/** Kose susu: ic ice iki altin ayrac. */
function createCornerOrnament(scene: Phaser.Scene, key: string): void {
  const size = 20;
  const canvas = scene.textures.createCanvas(key, size, size);
  if (!canvas) return;
  const ctx = canvas.context;
  ctx.clearRect(0, 0, size, size);

  ctx.strokeStyle = SKIN_PALETTE.goldBright;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(2, size - 3);
  ctx.lineTo(2, 2);
  ctx.lineTo(size - 3, 2);
  ctx.stroke();

  ctx.strokeStyle = SKIN_PALETTE.gold;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(6, size - 2);
  ctx.lineTo(6, 6);
  ctx.lineTo(size - 2, 6);
  ctx.stroke();

  // Kosedeki kucuk elmas - Akdeniz mozaiginin kose tasi.
  ctx.fillStyle = SKIN_PALETTE.goldBright;
  ctx.beginPath();
  ctx.moveTo(9, 2);
  ctx.lineTo(12, 5);
  ctx.lineTo(9, 8);
  ctx.lineTo(6, 5);
  ctx.closePath();
  ctx.fill();

  canvas.refresh();
}
