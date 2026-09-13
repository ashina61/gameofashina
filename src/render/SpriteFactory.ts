import Phaser from 'phaser';
import { TILE_HEIGHT, TILE_WIDTH } from '@/config/Constants';
import { BUILDINGS } from '@/config/BuildingCatalog';
import { GODS } from '@/config/IslandCatalog';
import { SHIPS } from '@/config/ShipCatalog';
import { UNITS } from '@/config/UnitCatalog';
import type { BuildingDefinition, ShipDefinition, UnitDefinition } from '@/types';

/**
 * Izometrik sprite uretimi.
 *
 * IKI KATMANLI SANAT YAKLASIMI
 *
 *   1. AI ile uretilmis DOKULAR (public/assets/textures): deniz, ada
 *      zemini, parşomen ve baslangic ekrani. Bunlar oyunun genel sanat
 *      yonunu tasir ve tek bir gorsel cok genis bir alani kaplar.
 *
 *   2. BURADA uretilen izometrik objeler: binalar, birlikler, gemiler,
 *      agacllar, yataglar ve harikalar.
 *
 * Objelerin neden prosedural cizildigi:
 *
 *   - OLCEK BAGIMSIZLIGI. Dokular buyutulunce bulaniklasir; vektor
 *     cizim her DPR'de keskin kalir. Mobilde DPR 1 ile 3 arasi degisir
 *     ve tuval yeniden olculendiginde tum dokularin yeniden yuklenmesi
 *     gerekirdi.
 *   - KATALOG VERISIYLE BAG. Her bina/birlik/gemi taniminda zaten bir
 *     `tint` alani var. Prosedural cizim rengi dogrudan katalogdan okur;
 *     boylece katalogdaki bir binanin gorseli AYRI bir dosyada eksik
 *     kalamaz. Ayri gorsel dosyalari olsa, yeni bir bina eklemek hem
 *     katalog hem asset degisikligi gerektirir ve ikisi senkron bozulur.
 *   - SEVIYE GOSTERGESI. Ikariam'da binalar seviye atladikca buyur ve
 *     detay kazanir. Cizim fonksiyonu seviyeyi parametre alir; statik
 *     gorsellerde her seviye icin ayri dosya gerekirdi (33 bina x ~30
 *     seviye).
 */

/** Bir dokunun anahtari. */
export type TextureKey = string;

/** Cizim yuzeyi olcusu: izometrik karo ve obje yuksekligi. */
const OBJ_HEIGHT = 96;

/** Rengi koyulastirir veya aciklastirir (0..1 oran). */
function shade(color: number, amount: number): number {
  const r = Math.min(255, Math.max(0, ((color >> 16) & 0xff) + Math.round(255 * amount)));
  const g = Math.min(255, Math.max(0, ((color >> 8) & 0xff) + Math.round(255 * amount)));
  const b = Math.min(255, Math.max(0, (color & 0xff) + Math.round(255 * amount)));
  return (r << 16) | (g << 8) | b;
}

/** Izometrik elmas (karo) sekli cizer. */
function diamond(
  g: Phaser.GameObjects.Graphics,
  cx: number,
  cy: number,
  w: number,
  h: number,
  fill: number,
  alpha = 1,
): void {
  g.fillStyle(fill, alpha);
  g.beginPath();
  g.moveTo(cx, cy - h / 2);
  g.lineTo(cx + w / 2, cy);
  g.lineTo(cx, cy + h / 2);
  g.lineTo(cx - w / 2, cy);
  g.closePath();
  g.fillPath();
}

/**
 * Tum oyun dokularini bir kez uretir.
 *
 * Sahneler `textures.exists(key)` ile kontrol etmek yerine burayi bir kez
 * cagirir; tekrar cagrilmasa da idempotenttir.
 */
export function buildTextures(scene: Phaser.Scene): void {
  const make = scene.textures;

  isoTile(scene, 'tile-ground');
  isoTile(scene, 'tile-plot', 0xd8c39a);
  isoTile(scene, 'tile-plot-free', 0xcbb287);
  isoTile(scene, 'tile-water', 0x2f6a8c);

  flatSprite(scene, 'dot', 8, 0xffffff);
  flatSprite(scene, 'pixel', 1, 0xffffff);
  ringSprite(scene, 'ring', 64, 0xffd977);

  for (const def of BUILDINGS) buildingTexture(scene, def);
  for (const def of UNITS) unitTexture(scene, def);
  for (const def of SHIPS) shipTexture(scene, def);
  for (const god of GODS) wonderTexture(scene, god.id, god.tint ?? 0xffd977);

  resourceSprite(scene, 'wood', 0x8a5a2b);
  resourceSprite(scene, 'marble', 0xe6e2d6);
  resourceSprite(scene, 'wine', 0x7c2d4a);
  resourceSprite(scene, 'sulfur', 0xd8c13a);
  resourceSprite(scene, 'crystal', 0x7fd6e8);
  resourceSprite(scene, 'gold', 0xf0c419);

  treeSprite(scene, 'tree');
  depositSprite(scene, 'deposit-wood', 0x5f7d3a);

  void make;
}

/** Izometrik zemin karosu. */
function isoTile(scene: Phaser.Scene, key: string, color = 0xc2a878): void {
  if (scene.textures.exists(key)) return;
  const w = TILE_WIDTH;
  const h = TILE_HEIGHT;
  const g = scene.add.graphics();
  diamond(g, w / 2, h / 2, w - 2, h - 2, color);
  // Kenar cizgisi: karolarin siniri okunabilir olsun.
  g.lineStyle(1, shade(color, -0.16), 0.85);
  g.beginPath();
  g.moveTo(w / 2, 1);
  g.lineTo(w - 1, h / 2);
  g.lineTo(w / 2, h - 1);
  g.lineTo(1, h / 2);
  g.closePath();
  g.strokePath();
  g.generateTexture(key, w, h);
  g.destroy();
}

/** Tek renkli kare doku (parcaciklar ve dolgu cubuklari icin). */
function flatSprite(scene: Phaser.Scene, key: string, size: number, color: number): void {
  if (scene.textures.exists(key)) return;
  const g = scene.add.graphics();
  g.fillStyle(color, 1);
  g.fillRect(0, 0, size, size);
  g.generateTexture(key, size, size);
  g.destroy();
}

/** Secim halkasi. */
function ringSprite(scene: Phaser.Scene, key: string, size: number, color: number): void {
  if (scene.textures.exists(key)) return;
  const g = scene.add.graphics();
  g.lineStyle(3, color, 1);
  g.strokeEllipse(size / 2, size / 2, size - 6, (size - 6) / 2);
  g.generateTexture(key, size, size);
  g.destroy();
}

/**
 * Bina dokusu.
 *
 * Seviye, govde YUKSEKLIGINI ve cati katmanini belirler: Ikariam'da bina
 * seviye atladikca gorunur sekilde buyur. Ayni doku tum seviyeler icin
 * uretilir ve `bina:{id}:{level}` anahtariyla saklanir.
 */
export function buildingTexture(scene: Phaser.Scene, def: BuildingDefinition, level = 1): string {
  const key = `building:${def.id}:${level}`;
  if (scene.textures.exists(key)) return key;

  const w = TILE_WIDTH * def.size;
  const h = TILE_HEIGHT * def.size + OBJ_HEIGHT;
  const g = scene.add.graphics();

  const base = def.tint;
  const cx = w / 2;
  const cy = h - TILE_HEIGHT * def.size * 0.5;

  // Zemin golgesi
  g.fillStyle(0x000000, 0.18);
  g.fillEllipse(cx, cy + 4, w * 0.86, TILE_HEIGHT * def.size * 0.8);

  // Govde: seviye arttikca yukselir.
  const bodyHeight = 26 + Math.min(46, level * 3);
  const wallW = w * 0.62;
  const wallH = TILE_HEIGHT * def.size * 0.62;

  // Sol ve sag duvarlar (izometrik kutu)
  g.fillStyle(shade(base, -0.22), 1);
  g.beginPath();
  g.moveTo(cx - wallW / 2, cy - wallH / 2);
  g.lineTo(cx, cy);
  g.lineTo(cx, cy - bodyHeight);
  g.lineTo(cx - wallW / 2, cy - wallH / 2 - bodyHeight);
  g.closePath();
  g.fillPath();

  g.fillStyle(shade(base, -0.06), 1);
  g.beginPath();
  g.moveTo(cx + wallW / 2, cy - wallH / 2);
  g.lineTo(cx, cy);
  g.lineTo(cx, cy - bodyHeight);
  g.lineTo(cx + wallW / 2, cy - wallH / 2 - bodyHeight);
  g.closePath();
  g.fillPath();

  // Cati
  const roofColor = shade(base, 0.14);
  g.fillStyle(roofColor, 1);
  diamond(g, cx, cy - wallH / 2 - bodyHeight, wallW, wallH, roofColor);
  g.fillStyle(shade(base, 0.26), 1);
  g.beginPath();
  g.moveTo(cx, cy - wallH / 2 - bodyHeight - 22);
  g.lineTo(cx + wallW / 2, cy - wallH / 2 - bodyHeight);
  g.lineTo(cx, cy - wallH / 2 - bodyHeight + wallH / 2);
  g.lineTo(cx - wallW / 2, cy - wallH / 2 - bodyHeight);
  g.closePath();
  g.fillPath();

  // Seviye rozetleri: yuksek seviyelerde ek katman cizgisi.
  const floors = Math.min(4, Math.floor(level / 8) + 1);
  g.lineStyle(1, shade(base, -0.32), 0.6);
  for (let i = 1; i < floors; i += 1) {
    const y = cy - (bodyHeight / floors) * i;
    g.beginPath();
    g.moveTo(cx - wallW / 2, y - wallH / 2);
    g.lineTo(cx, y);
    g.lineTo(cx + wallW / 2, y - wallH / 2);
    g.strokePath();
  }

  g.generateTexture(key, w, h);
  g.destroy();
  return key;
}

/** Birlik dokusu: kucuk izometrik asker. */
export function unitTexture(scene: Phaser.Scene, def: UnitDefinition): string {
  const key = `unit:${def.id}`;
  if (scene.textures.exists(key)) return key;

  const w = 40;
  const h = 52;
  const g = scene.add.graphics();
  const base = def.tint;

  g.fillStyle(0x000000, 0.2);
  g.fillEllipse(w / 2, h - 5, 22, 8);

  // Govde
  g.fillStyle(base, 1);
  g.fillRoundedRect(w / 2 - 7, h - 30, 14, 20, 4);
  // Kafa
  g.fillStyle(shade(base, 0.28), 1);
  g.fillCircle(w / 2, h - 36, 7);
  // Mizrak/silah: sinifa gore egim
  g.lineStyle(2, shade(base, -0.3), 1);
  g.beginPath();
  g.moveTo(w / 2 + 8, h - 8);
  g.lineTo(w / 2 + 14, h - 44);
  g.strokePath();

  g.generateTexture(key, w, h);
  g.destroy();
  return key;
}

/** Gemi dokusu: izometrik tekne. */
export function shipTexture(scene: Phaser.Scene, def: ShipDefinition): string {
  const key = `ship:${def.id}`;
  if (scene.textures.exists(key)) return key;

  const w = 72;
  const h = 48;
  const g = scene.add.graphics();
  const base = def.tint;

  g.fillStyle(0x000000, 0.18);
  g.fillEllipse(w / 2, h - 6, 52, 12);

  // Govde
  g.fillStyle(shade(base, -0.12), 1);
  g.beginPath();
  g.moveTo(8, h - 16);
  g.lineTo(w - 8, h - 16);
  g.lineTo(w - 18, h - 4);
  g.lineTo(18, h - 4);
  g.closePath();
  g.fillPath();

  // Direk ve yelken
  g.lineStyle(2, 0x5a4632, 1);
  g.beginPath();
  g.moveTo(w / 2, h - 16);
  g.lineTo(w / 2, 8);
  g.strokePath();

  g.fillStyle(0xf3ead6, 1);
  g.beginPath();
  g.moveTo(w / 2, 8);
  g.lineTo(w / 2 + 18, h - 20);
  g.lineTo(w / 2, h - 18);
  g.closePath();
  g.fillPath();

  // Savas gemilerinde ek silah gostergesi
  if (def.shipClass !== 'transport') {
    g.fillStyle(shade(base, 0.2), 1);
    g.fillCircle(w / 2 - 16, h - 20, 4);
  }

  g.generateTexture(key, w, h);
  g.destroy();
  return key;
}

/** Harika tapinak dokusu (tanri basina). */
export function wonderTexture(scene: Phaser.Scene, godId: string, tint: number): string {
  const key = `wonder:${godId}`;
  if (scene.textures.exists(key)) return key;

  const w = TILE_WIDTH * 2;
  const h = TILE_HEIGHT * 2 + 120;
  const g = scene.add.graphics();
  const cx = w / 2;
  const cy = h - TILE_HEIGHT;

  g.fillStyle(0x000000, 0.22);
  g.fillEllipse(cx, cy + 6, w * 0.8, TILE_HEIGHT * 1.6);

  // Kaide
  diamond(g, cx, cy, w * 0.78, TILE_HEIGHT * 1.5, 0xe8e2d0);
  diamond(g, cx, cy - 12, w * 0.62, TILE_HEIGHT * 1.2, 0xf5f0e2);

  // Kolonlar
  g.fillStyle(0xfaf6ea, 1);
  for (let i = -2; i <= 2; i += 1) {
    const px = cx + i * 16;
    const py = cy - 24 - Math.abs(i) * 5;
    g.fillRect(px - 4, py - 54, 8, 54);
    g.fillStyle(shade(0xfaf6ea, -0.08), 1);
    g.fillRect(px - 5, py - 58, 10, 5);
    g.fillStyle(0xfaf6ea, 1);
  }

  // Cati ve altin vurgu
  g.fillStyle(tint, 1);
  g.beginPath();
  g.moveTo(cx - 46, cy - 82);
  g.lineTo(cx + 46, cy - 82);
  g.lineTo(cx, cy - 116);
  g.closePath();
  g.fillPath();

  // Iltima
  g.fillStyle(shade(tint, 0.2), 0.85);
  g.fillCircle(cx, cy - 96, 9);

  g.generateTexture(key, w, h);
  g.destroy();
  return key;
}

/** Kaynak simgesi (kaynak cubugunda ve yataglarda kullanilir). */
export function resourceSprite(scene: Phaser.Scene, key: string, color: number): void {
  const textureKey = `resource:${key}`;
  if (scene.textures.exists(textureKey)) return;
  const size = 28;
  const g = scene.add.graphics();
  g.fillStyle(0x000000, 0.25);
  g.fillCircle(size / 2, size / 2 + 2, size / 2 - 3);
  g.fillStyle(color, 1);
  g.fillCircle(size / 2, size / 2, size / 2 - 3);
  g.fillStyle(shade(color, 0.24), 0.9);
  g.fillCircle(size / 2 - 3, size / 2 - 4, size / 5);
  g.generateTexture(textureKey, size, size);
  g.destroy();
}

/** Agac. */
function treeSprite(scene: Phaser.Scene, key: string): void {
  if (scene.textures.exists(key)) return;
  const w = 40;
  const h = 56;
  const g = scene.add.graphics();
  g.fillStyle(0x000000, 0.18);
  g.fillEllipse(w / 2, h - 4, 20, 8);
  g.fillStyle(0x6b4a2a, 1);
  g.fillRect(w / 2 - 3, h - 24, 6, 20);
  g.fillStyle(0x4e7a34, 1);
  g.fillCircle(w / 2, h - 32, 13);
  g.fillStyle(0x63963f, 1);
  g.fillCircle(w / 2 - 5, h - 37, 9);
  g.generateTexture(key, w, h);
  g.destroy();
}

/** Odun yatagi (hizar). */
function depositSprite(scene: Phaser.Scene, key: string, color: number): void {
  if (scene.textures.exists(key)) return;
  const w = TILE_WIDTH;
  const h = TILE_HEIGHT + 44;
  const g = scene.add.graphics();
  const cx = w / 2;
  const cy = h - TILE_HEIGHT / 2;
  g.fillStyle(0x000000, 0.18);
  g.fillEllipse(cx, cy + 3, w * 0.8, TILE_HEIGHT * 0.8);
  diamond(g, cx, cy, w * 0.8, TILE_HEIGHT * 0.8, shade(color, -0.1));
  g.fillStyle(color, 1);
  g.fillRoundedRect(cx - 18, cy - 26, 36, 24, 4);
  g.fillStyle(shade(color, 0.2), 1);
  g.fillTriangle(cx - 22, cy - 24, cx + 22, cy - 24, cx, cy - 44);
  g.generateTexture(key, w, h);
  g.destroy();
}
