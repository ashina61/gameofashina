import Phaser from 'phaser';
import { TILE_HEIGHT, TILE_WIDTH, TextureKeys } from '@/config/Constants';
import { allBuildings } from '@/config/BuildingCatalog';
import type { BuildingDefinition, TerrainType } from '@/types';

/**
 * Tum gorseller calisma zamaninda uretilir; projede ikili varlik dosyasi yoktur.
 * Bu sayede depo hafif kalir ve renk paleti tek yerden degistirilebilir.
 */

/** Zemin turlerinin taban renkleri. */
const TERRAIN_COLORS: Record<TerrainType, { top: number; side: number; speck: number }> = {
  grass: { top: 0x6f9e4a, side: 0x4e7434, speck: 0x84b45c },
  soil: { top: 0x9a7448, side: 0x6f5232, speck: 0xb08a58 },
  water: { top: 0x3f6f96, side: 0x2c5070, speck: 0x5b8cb0 },
  rock: { top: 0x7c828a, side: 0x585e66, speck: 0x969ca4 },
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

/** Bir bina dokusunun anahtarini uretir. */
export function buildingTextureKey(defId: string): string {
  return `building-${defId}`;
}

/**
 * Oyunun ihtiyac duydugu tum dokulari uretir.
 * PreloadScene tarafindan bir kez cagrilir.
 */
export function generateTextures(scene: Phaser.Scene): void {
  for (const terrain of Object.keys(TERRAIN_COLORS) as TerrainType[]) {
    createTileTexture(scene, TERRAIN_TEXTURE[terrain], TERRAIN_COLORS[terrain]);
  }

  createOverlayTexture(scene, TextureKeys.TileHighlight, 0xffffff, 0.28);
  createOverlayTexture(scene, TextureKeys.TileValid, 0x6ee27a, 0.42);
  createOverlayTexture(scene, TextureKeys.TileInvalid, 0xe2565a, 0.42);

  for (const def of allBuildings()) {
    createBuildingTexture(scene, def);
  }

  createPanelTexture(scene, TextureKeys.Panel, 0x1d1a13, 0x5a4c33);
  createPanelTexture(scene, TextureKeys.ButtonUp, 0x2e2819, 0x7a6540);
  createPanelTexture(scene, TextureKeys.ButtonDown, 0x4a3f27, 0xe8c86a);
}

/** Hafif kabartmali izometrik zemin karosu. */
function createTileTexture(
  scene: Phaser.Scene,
  key: string,
  colors: { top: number; side: number; speck: number },
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

  // Zemin dokusunu kirmak icin sabit desenli benekler
  g.fillStyle(colors.speck, 0.5);
  for (let i = 0; i < 14; i += 1) {
    const t = (i * 0.618033) % 1;
    const u = (i * 0.381966) % 1;
    const px = w / 2 + (t - 0.5) * w * 0.7;
    const py = h / 2 + (u - 0.5) * h * 0.7;
    // Beneği karo icinde tutmak icin eşkenar dörtgen testi
    if (Math.abs(px - w / 2) / (w / 2) + Math.abs(py - h / 2) / (h / 2) < 0.8) {
      g.fillRect(px, py, 3, 2);
    }
  }

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
 * Bina dokusu: izometrik bir kutu govde ve uzerinde catili bir ust yuzey.
 * Doku, tabanindaki eskenar dortgenin alt kosesi dokunun alt-orta noktasina
 * gelecek sekilde cizilir; sahne tarafinda origin (0.5, 1) ile konumlandirilir.
 */
function createBuildingTexture(scene: Phaser.Scene, def: BuildingDefinition): void {
  const key = buildingTextureKey(def.id);
  if (scene.textures.exists(key)) return;

  const footW = TILE_WIDTH * def.size;
  const footH = TILE_HEIGHT * def.size;
  const bodyH = Math.round(34 + def.size * 18);
  const roofH = Math.round(16 + def.size * 8);

  const w = footW;
  const h = footH + bodyH + roofH;

  const base = Phaser.Display.Color.IntegerToColor(def.tint);
  const left = shade(base, -0.3);
  const right = shade(base, -0.12);
  const roof = shade(base, 0.22);
  const roofDark = shade(base, -0.05);

  const g = scene.make.graphics({ x: 0, y: 0 }, false);

  // Govdenin oturdugu taban gölgesi
  const baseTop = roofH + bodyH;
  g.fillStyle(0x000000, 0.22);
  diamond(g, w / 2, baseTop + footH / 2, footW, footH);
  g.fillPath();

  // Govde: sol ve sag yuzler, tabandan yukari dogru
  const cx = w / 2;
  const topY = roofH;
  const midY = roofH + footH / 2;

  g.fillStyle(left, 1);
  g.beginPath();
  g.moveTo(0, midY);
  g.lineTo(cx, midY + footH / 2);
  g.lineTo(cx, midY + footH / 2 + bodyH);
  g.lineTo(0, midY + bodyH);
  g.closePath();
  g.fillPath();

  g.fillStyle(right, 1);
  g.beginPath();
  g.moveTo(w, midY);
  g.lineTo(cx, midY + footH / 2);
  g.lineTo(cx, midY + footH / 2 + bodyH);
  g.lineTo(w, midY + bodyH);
  g.closePath();
  g.fillPath();

  // Cati: govdenin ustundeki eskenar dortgen
  g.fillStyle(roof, 1);
  diamond(g, cx, midY, footW, footH);
  g.fillPath();

  // Cati sirti - binaya yon hissi verir
  g.fillStyle(roofDark, 1);
  g.beginPath();
  g.moveTo(cx, topY);
  g.lineTo(w * 0.75, midY - footH * 0.25);
  g.lineTo(cx, midY);
  g.lineTo(w * 0.25, midY - footH * 0.25);
  g.closePath();
  g.fillPath();

  // Govde uzerinde kapi/pencere vurgusu
  g.fillStyle(0x241d13, 0.55);
  const doorW = Math.max(8, footW * 0.09);
  const doorH = Math.max(10, bodyH * 0.45);
  g.fillRect(cx - doorW - 2, midY + footH * 0.35, doorW, doorH);
  g.fillStyle(0xf0d79a, 0.35);
  g.fillRect(cx + 4, midY + footH * 0.3, doorW, doorH * 0.6);

  g.generateTexture(key, w, h);
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

/** Merkezi (cx, cy) olan izometrik eskenar dortgen yolu cizer. */
function diamond(
  g: Phaser.GameObjects.Graphics,
  cx: number,
  cy: number,
  width: number,
  height: number,
): void {
  g.beginPath();
  g.moveTo(cx, cy - height / 2);
  g.lineTo(cx + width / 2, cy);
  g.lineTo(cx, cy + height / 2);
  g.lineTo(cx - width / 2, cy);
  g.closePath();
}

/** Rengi aydinlatir (pozitif) veya karartir (negatif). */
function shade(color: Phaser.Display.Color, amount: number): number {
  const target = amount >= 0 ? 255 : 0;
  const t = Math.abs(amount);
  const r = Math.round(color.red + (target - color.red) * t);
  const g = Math.round(color.green + (target - color.green) * t);
  const b = Math.round(color.blue + (target - color.blue) * t);
  return Phaser.Display.Color.GetColor(r, g, b);
}
