import type Phaser from 'phaser';
import { TILE_HEIGHT, TILE_WIDTH, TextureKeys } from '@/config/Constants';
import { allBuildings } from '@/config/BuildingCatalog';
import { BUILDING_ART, artCanvasFor, drawScaffold, shade } from './BuildingArt';
import {
  GENERIC_VISUAL,
  MAX_VISUAL_LEVEL,
  isDrawnType,
  scaffoldKeyFor,
  visualKeyFor,
} from './BuildingVisuals';
import type { TerrainType } from '@/types';

/**
 * Tum gorseller calisma zamaninda uretilir; projede ikili varlik dosyasi yoktur.
 * Bu sayede depo hafif kalir ve renk paleti tek yerden degistirilebilir.
 */

/** Zemin turlerinin taban renkleri. */
/**
 * Zemin paleti - sicak Akdeniz tonlari.
 *
 * Cim daha kuru ve zeytin yesili, toprak daha killi, kaya daha bej,
 * su daha turkuaz. Amac bloke renklerden cikip ayni sanat diline oturmak.
 */
const TERRAIN_COLORS: Record<TerrainType, { top: number; side: number; speck: number }> = {
  grass: { top: 0x86a257, side: 0x5f7a3c, speck: 0x9cb468 },
  soil: { top: 0xb08a5c, side: 0x8a6842, speck: 0xc6a273 },
  water: { top: 0x4a86ab, side: 0x33607f, speck: 0x7fb6d4 },
  rock: { top: 0x9a948a, side: 0x726d65, speck: 0xb3ada2 },
};

/** Zemin turune gore yuzey deseni; her karo ayni sanat dilinde kalir. */
type TerrainPattern = 'tuft' | 'furrow' | 'facet' | 'ripple';

const TERRAIN_PATTERN: Record<TerrainType, TerrainPattern> = {
  grass: 'tuft',
  soil: 'furrow',
  water: 'ripple',
  rock: 'facet',
};

/** Zemin turu -> doku anahtari eslemesi. */
export const TERRAIN_TEXTURE: Record<TerrainType, string> = {
  grass: TextureKeys.TileGrass,
  soil: TextureKeys.TileSoil,
  water: TextureKeys.TileWater,
  rock: TextureKeys.TileRock,
};

/** Karonun yan yuzeyinin kalinligi (piksel). */
export const TILE_DEPTH = 10;

/**
 * Zemin dokusunun dikey orijini.
 * Doku alt kenarinda kalinlik payi tasidigi icin, karonun ust yuzeyinin
 * merkezi dokunun tam ortasinda degildir.
 */
export const TILE_ORIGIN_Y = TILE_HEIGHT / 2 / (TILE_HEIGHT + TILE_DEPTH);

/**
 * Oyunun ihtiyac duydugu tum dokulari uretir.
 * PreloadScene tarafindan bir kez cagrilir.
 */
export function generateTextures(scene: Phaser.Scene, artScale = 1): void {
  for (const terrain of Object.keys(TERRAIN_COLORS) as TerrainType[]) {
    createTileTexture(
      scene,
      TERRAIN_TEXTURE[terrain],
      TERRAIN_COLORS[terrain],
      TERRAIN_PATTERN[terrain],
    );
  }

  createOverlayTexture(scene, TextureKeys.TileHighlight, 0xffffff, 0.28);
  createOverlayTexture(scene, TextureKeys.TileValid, 0x6ee27a, 0.42);
  createOverlayTexture(scene, TextureKeys.TileInvalid, 0xe2565a, 0.42);

  // Her bina turu icin seviye 1 ve 2 gorselleri ayri ayri pisirilir.
  for (const def of allBuildings()) {
    for (let level = 1; level <= MAX_VISUAL_LEVEL; level += 1) {
      createArtTexture(scene, def.id, def.size, level, artScale);
    }
  }
  // Taninmayan tur icin yedek gorsel ve her ayak izi olcusu icin iskele.
  createArtTexture(scene, GENERIC_VISUAL, 1, 1, artScale);
  for (const size of collectFootprints()) {
    createScaffoldTexture(scene, size, artScale);
  }

  createPixelTexture(scene, TextureKeys.Pixel);
  createPanelTexture(scene, TextureKeys.Panel, 0x1d1a13, 0x5a4c33);
  createPanelTexture(scene, TextureKeys.ButtonUp, 0x2e2819, 0x7a6540);
  createPanelTexture(scene, TextureKeys.ButtonDown, 0x4a3f27, 0xe8c86a);
}

/** Katalogda gecen benzersiz ayak izi olculeri. */
function collectFootprints(): number[] {
  const sizes = new Set<number>();
  for (const def of allBuildings()) sizes.add(def.size);
  return [...sizes].sort((a, b) => a - b);
}

/**
 * Bir bina gorselini dokuya pisirir.
 *
 * artScale, cizim cozunurlugunu buyutur: DPR 2'de doku iki kat buyuk
 * uretilir, sahne tarafinda 1/artScale ile olceklenir. Boylece dunyadaki
 * boyut ayni kalir ama yakinlastirildiginda kenarlar keskin durur.
 * Sprint 5 arka tamponu buyuttu; bu adim olmadan dokular tuvalden dusuk
 * cozunurlukte kalip kazanci yutuyordu.
 */
function createArtTexture(
  scene: Phaser.Scene,
  type: string,
  size: number,
  level: number,
  artScale: number,
): void {
  const key = visualKeyFor(type, level);
  if (scene.textures.exists(key)) return;

  const canvas = artCanvasFor(type, size, level);
  const drawer = BUILDING_ART[isDrawnType(type) ? type : GENERIC_VISUAL];

  const g = scene.make.graphics({ x: 0, y: 0 }, false);
  g.scale = artScale;
  drawer(g, canvas, level);
  g.generateTexture(key, Math.ceil(canvas.width * artScale), Math.ceil(canvas.height * artScale));
  g.destroy();
}

/** Insaat iskelesi dokusu; her ayak izi olcusu icin bir tane. */
function createScaffoldTexture(scene: Phaser.Scene, size: number, artScale: number): void {
  const key = scaffoldKeyFor(size);
  if (scene.textures.exists(key)) return;

  const canvas = artCanvasFor('generic', size, 1);
  const g = scene.make.graphics({ x: 0, y: 0 }, false);
  g.scale = artScale;
  drawScaffold(g, canvas, 1);
  g.generateTexture(key, Math.ceil(canvas.width * artScale), Math.ceil(canvas.height * artScale));
  g.destroy();
}

/** Hafif kabartmali izometrik zemin karosu. */
function createTileTexture(
  scene: Phaser.Scene,
  key: string,
  colors: { top: number; side: number; speck: number },
  pattern: TerrainPattern,
): void {
  if (scene.textures.exists(key)) return;

  const w = TILE_WIDTH;
  const h = TILE_HEIGHT;
  const g = scene.make.graphics({ x: 0, y: 0 }, false);

  // Yan yuzeyler (karonun kalinlik hissi)
  g.fillStyle(colors.side, 1);
  g.beginPath();
  g.moveTo(0, h / 2);
  g.lineTo(w / 2, h);
  g.lineTo(w, h / 2);
  g.lineTo(w, h / 2 + TILE_DEPTH);
  g.lineTo(w / 2, h + TILE_DEPTH);
  g.lineTo(0, h / 2 + TILE_DEPTH);
  g.closePath();
  g.fillPath();

  // Ust yuzey
  g.fillStyle(colors.top, 1);
  g.beginPath();
  g.moveTo(w / 2, 0);
  g.lineTo(w, h / 2);
  g.lineTo(w / 2, h);
  g.lineTo(0, h / 2);
  g.closePath();
  g.fillPath();

  drawTerrainPattern(g, pattern, colors, w, h);

  /*
   * Cok hafif karo kenari.
   *
   * Tamamen kaldirilmaz: oyuncunun binayi nereye koyacagini anlamasi icin
   * izgara okunabilir kalmali. Ama artik kalin bir cizgi degil, yalnizca
   * yuzeyden bir ton acik bir kenar.
   */
  g.lineStyle(1, shade(colors.top, 0.16), 0.35);
  g.beginPath();
  g.moveTo(w / 2, 0.5);
  g.lineTo(w - 0.5, h / 2);
  g.lineTo(w / 2, h - 0.5);
  g.lineTo(0.5, h / 2);
  g.closePath();
  g.strokePath();

  g.generateTexture(key, w, h + TILE_DEPTH);
  g.destroy();
}

/** Secim/onizleme icin yari saydam karo kaplamasi. */
function createOverlayTexture(
  scene: Phaser.Scene,
  key: string,
  color: number,
  alpha: number,
): void {
  if (scene.textures.exists(key)) return;

  const w = TILE_WIDTH;
  const h = TILE_HEIGHT;
  const g = scene.make.graphics({ x: 0, y: 0 }, false);

  g.fillStyle(color, alpha);
  g.beginPath();
  g.moveTo(w / 2, 0);
  g.lineTo(w, h / 2);
  g.lineTo(w / 2, h);
  g.lineTo(0, h / 2);
  g.closePath();
  g.fillPath();

  g.lineStyle(2, color, Math.min(1, alpha + 0.45));
  g.strokePath();

  g.generateTexture(key, w, h);
  g.destroy();
}

/**
 * Zemin yuzeyine tura ozgu desen isler.
 *
 * Desenler SABIT bir diziye gore uretilir (rastgelelik yok): ayni karo her
 * acilista ayni gorunur ve doku bir kez pisirilir.
 */
function drawTerrainPattern(
  g: Phaser.GameObjects.Graphics,
  pattern: TerrainPattern,
  colors: { top: number; side: number; speck: number },
  w: number,
  h: number,
): void {
  const inside = (px: number, py: number, margin = 0.82): boolean =>
    Math.abs(px - w / 2) / (w / 2) + Math.abs(py - h / 2) / (h / 2) < margin;

  if (pattern === 'tuft') {
    // Cim tutamlari - kucuk dikey firca darbeleri
    g.fillStyle(colors.speck, 0.55);
    for (let i = 0; i < 16; i += 1) {
      const px = w / 2 + (((i * 0.618033) % 1) - 0.5) * w * 0.78;
      const py = h / 2 + (((i * 0.381966) % 1) - 0.5) * h * 0.78;
      if (!inside(px, py)) continue;
      g.fillRect(px, py - 2, 1.5, 3);
      g.fillRect(px + 2, py - 1, 1.5, 2);
    }
    g.fillStyle(shade(colors.top, -0.1), 0.4);
    for (let i = 0; i < 6; i += 1) {
      const px = w / 2 + (((i * 0.754877) % 1) - 0.5) * w * 0.6;
      const py = h / 2 + (((i * 0.56984) % 1) - 0.5) * h * 0.6;
      if (inside(px, py, 0.6)) g.fillEllipse(px, py, 9, 4);
    }
    return;
  }

  if (pattern === 'furrow') {
    // Surulmus toprak - izometrik eksende ince karikler
    g.fillStyle(shade(colors.top, -0.12), 0.5);
    for (let i = 1; i < 5; i += 1) {
      const t = i / 5;
      const x0 = t * (w / 2);
      const y0 = h / 2 - t * (h / 2);
      const x1 = w / 2 + t * (w / 2);
      const y1 = h - t * (h / 2) - h / 2;
      g.beginPath();
      g.moveTo(x0, y0);
      g.lineTo(x1, y1);
      g.lineTo(x1, y1 + 2);
      g.lineTo(x0, y0 + 2);
      g.closePath();
      g.fillPath();
    }
    return;
  }

  if (pattern === 'ripple') {
    // Su - yatay isik cizgileri
    g.fillStyle(colors.speck, 0.45);
    for (let i = 0; i < 5; i += 1) {
      const py = h * (0.28 + i * 0.11);
      const halfSpan = (w / 2) * (1 - Math.abs(py - h / 2) / (h / 2)) * 0.66;
      if (halfSpan <= 2) continue;
      g.fillRect(w / 2 - halfSpan, py, halfSpan * 2, 1.5);
    }
    g.fillStyle(0xffffff, 0.14);
    g.fillEllipse(w * 0.4, h * 0.44, 22, 5);
    return;
  }

  // Kaya - kirik yuzey fasetleri
  g.fillStyle(shade(colors.top, 0.12), 0.6);
  g.fillTriangle(w * 0.3, h * 0.5, w * 0.46, h * 0.32, w * 0.52, h * 0.54);
  g.fillStyle(shade(colors.top, -0.14), 0.6);
  g.fillTriangle(w * 0.52, h * 0.54, w * 0.68, h * 0.4, w * 0.74, h * 0.6);
  g.fillStyle(colors.speck, 0.5);
  g.fillTriangle(w * 0.4, h * 0.68, w * 0.5, h * 0.6, w * 0.56, h * 0.72);
}

/**
 * Tek renkli kucuk doku.
 * Ilerleme cubugu gibi ogeler bunu tint + olcekleyerek kullanir; boylece her
 * karede Graphics geometrisi yeniden kurulmaz.
 */
function createPixelTexture(scene: Phaser.Scene, key: string): void {
  if (scene.textures.exists(key)) return;

  const g = scene.make.graphics({ x: 0, y: 0 }, false);
  g.fillStyle(0xffffff, 1);
  g.fillRect(0, 0, 4, 4);
  g.generateTexture(key, 4, 4);
  g.destroy();
}

/** Arayuz panelleri icin 9-slice uyumlu yuvarlatilmis dikdortgen. */
function createPanelTexture(
  scene: Phaser.Scene,
  key: string,
  fill: number,
  border: number,
): void {
  if (scene.textures.exists(key)) return;

  const size = 48;
  const radius = 14;
  const g = scene.make.graphics({ x: 0, y: 0 }, false);

  g.fillStyle(fill, 0.94);
  g.fillRoundedRect(0, 0, size, size, radius);
  g.lineStyle(2, border, 0.9);
  g.strokeRoundedRect(1, 1, size - 2, size - 2, radius - 1);

  g.generateTexture(key, size, size);
  g.destroy();
}


