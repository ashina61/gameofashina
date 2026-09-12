import type Phaser from 'phaser';
import { TILE_HEIGHT, TILE_WIDTH, TextureKeys } from '@/config/Constants';
import { allBuildings } from '@/config/BuildingCatalog';
import { BUILDING_ART, artCanvasFor, drawScaffold, shade } from './BuildingArt';
import { PALETTE } from './ArtStyle';
import {
  GENERIC_VISUAL,
  MAX_VISUAL_LEVEL,
  isDrawnType,
  scaffoldKeyFor,
  variantCountFor,
  visualKeyFor,
} from './BuildingVisuals';
import { WORKER_HEIGHT, WORKER_WIDTH, drawWorker } from './WorkerArt';
import { DECOR_ART, DECOR_SPEC, decorKeyFor } from './DecorArt';
import { ICON_ART, ICON_SIZE, iconKeyFor } from './IconArt';
import type { IconKind } from './IconArt';
import type { DecorKind, TerrainType, WorkerState } from '@/types';

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

  /*
   * Yol ve meydan, zeminin USTUNE ayri bir sprite olarak degil, zeminle
   * BIRLIKTE tek dokuya pisirilir.
   *
   * Ayri kaplama olarak cizildiginde 115 sokak karosu icin 115 fazladan
   * sprite olusuyordu ve zemin iki kez boyaniyordu: olculdu, kare hizi
   * 34'ten 26'ya dusuyordu (GPU'suz ortamda, 390x844). Birlesik doku ayni
   * gorunusu tek cizimde verir.
   */
  for (const terrain of PAVED_TERRAIN) {
    createTileTexture(
      scene,
      pavedKey(TextureKeys.TileStreet, terrain),
      TERRAIN_COLORS[terrain],
      TERRAIN_PATTERN[terrain],
      'street',
    );
    createTileTexture(
      scene,
      pavedKey(TextureKeys.TilePlaza, terrain),
      TERRAIN_COLORS[terrain],
      TERRAIN_PATTERN[terrain],
      'plaza',
    );
  }

  createPlotTexture(scene, TextureKeys.PlotMarker);
  createOverlayTexture(scene, TextureKeys.TileHighlight, 0xffffff, 0.28);
  createOverlayTexture(scene, TextureKeys.TileValid, 0x6ee27a, 0.42);
  createOverlayTexture(scene, TextureKeys.TileInvalid, 0xe2565a, 0.42);
  createOverlayTexture(scene, TextureKeys.TileLocked, 0xb9a068, 0.3);

  // Sehir cevresi: agac, cali, kaya, amfora... Hepsi yalnizca gorseldir.
  for (const kind of Object.keys(DECOR_SPEC) as DecorKind[]) {
    createDecorTexture(scene, kind, artScale);
  }

  // Her bina turu icin seviye 1 ve 2 gorselleri ayri ayri pisirilir.
  for (const def of allBuildings()) {
    const variants = variantCountFor(def.id);
    for (let level = 1; level <= MAX_VISUAL_LEVEL; level += 1) {
      for (let variant = 0; variant < variants; variant += 1) {
        createArtTexture(scene, def.id, def.size, level, artScale, variant);
      }
    }
  }
  // Taninmayan tur icin yedek gorsel ve her ayak izi olcusu icin iskele.
  createArtTexture(scene, GENERIC_VISUAL, 1, 1, artScale, 0);
  for (const size of collectFootprints()) {
    createScaffoldTexture(scene, size, artScale);
  }

  // Isci figurleri; her durum icin bir doku, kare basina cizim yok.
  for (const state of WORKER_TEXTURE_KEYS.keys()) {
    createWorkerTexture(scene, state, artScale);
  }

  // Arayuz ikonlari - emoji degil, oyunun kendi paletiyle cizilir.
  for (const kind of Object.keys(ICON_ART) as IconKind[]) {
    createIconTexture(scene, kind, artScale);
  }

  createPixelTexture(scene, TextureKeys.Pixel);
  /*
   * Paneller TAM OPAK.
   *
   * %94 opaklik koyu bir panelin altindaki PARLAK denizi gecirip paneli
   * "yari saydam" gosteriyordu (ekran goruntusuyle dogrulandi: insa
   * menusunun icinden ada kenarlari okunuyordu). Butonlar hafif saydam
   * kalabilir; onlar kucuk ve zeminleri koyu.
   */
  createPanelTexture(scene, TextureKeys.Panel, 0x1d1a13, 0x5a4c33, 1);
  createPanelTexture(scene, TextureKeys.ButtonUp, 0x2e2819, 0x7a6540);
  createPanelTexture(scene, TextureKeys.ButtonDown, 0x4a3f27, 0xe8c86a);
  createRoundTexture(scene, TextureKeys.RoundUp, 0x2e2819, 0x7a6540, artScale);
  createRoundTexture(scene, TextureKeys.RoundDown, 0x4a3f27, 0xe8c86a, artScale);
}

/** Isci durumu -> doku anahtari. Render katmani bu esleme uzerinden okur. */
export const WORKER_TEXTURE_KEYS = new Map<WorkerState, string>([
  ['idle', TextureKeys.WorkerIdle],
  ['moving', TextureKeys.WorkerMoving],
  ['working', TextureKeys.WorkerWorking],
]);

/** Tek bir isci durumunun dokusunu pisirir. */
function createWorkerTexture(scene: Phaser.Scene, state: WorkerState, artScale: number): void {
  const key = WORKER_TEXTURE_KEYS.get(state);
  if (!key || scene.textures.exists(key)) return;

  const g = scene.make.graphics({ x: 0, y: 0 }, false);
  g.scale = artScale;
  drawWorker(g, state);
  g.generateTexture(
    key,
    Math.ceil(WORKER_WIDTH * artScale),
    Math.ceil(WORKER_HEIGHT * artScale),
  );
  g.destroy();
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
  variant: number,
): void {
  const key = visualKeyFor(type, level, variant);
  if (scene.textures.exists(key)) return;

  const canvas = artCanvasFor(type, size, level);
  const drawer = BUILDING_ART[isDrawnType(type) ? type : GENERIC_VISUAL];

  const g = scene.make.graphics({ x: 0, y: 0 }, false);
  g.scale = artScale;
  drawer(g, canvas, level, variant);
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

/** Tek bir arayuz ikonunu dokuya pisirir. */
function createIconTexture(scene: Phaser.Scene, kind: IconKind, artScale: number): void {
  const key = iconKeyFor(kind);
  if (scene.textures.exists(key)) return;

  const g = scene.make.graphics({ x: 0, y: 0 }, false);
  g.scale = artScale;
  ICON_ART[kind](g, ICON_SIZE);
  g.generateTexture(key, Math.ceil(ICON_SIZE * artScale), Math.ceil(ICON_SIZE * artScale));
  g.destroy();
}

/** Tek bir dekor ogesinin dokusunu pisirir. */
function createDecorTexture(scene: Phaser.Scene, kind: DecorKind, artScale: number): void {
  const key = decorKeyFor(kind);
  if (scene.textures.exists(key)) return;

  const spec = DECOR_SPEC[kind];
  const g = scene.make.graphics({ x: 0, y: 0 }, false);
  g.scale = artScale;
  DECOR_ART[kind](g, spec);
  g.generateTexture(key, Math.ceil(spec.width * artScale), Math.ceil(spec.height * artScale));
  g.destroy();
}

/**
 * Zemin karosunun uzerine tas doseme isler.
 *
 * Sokaklar Sprint 12'de yalnizca "plot OLMAYAN" karolardi ve zeminle ayni
 * gorunduklerinden sehir duzeni okunmuyordu. Doseme onlari gorunur kilar.
 *
 * Karonun TAMAMINI kaplamaz; kenarindan bir serit zemin gorunur. Tamamini
 * tas yapmak (sokaklar haritanin %59'u) sehri tas bir platoya cevirmisti.
 * Ince yesil serit yolu YOL yapar.
 *
 * Yalnizca GORSELDIR - izgara, plot sistemi ve navigasyon degismedi.
 * plaza=true daha genis ve daha acik bir doseme verir; sehir merkezinin
 * cevresinde meydan hissi kurar.
 */
function drawPaving(g: Phaser.GameObjects.Graphics, w: number, h: number, plaza: boolean): void {
  const cx = w / 2;
  const cy = h / 2;
  const inset = plaza ? 0.97 : 0.88;
  /*
   * Sokak SOGUK gri, yapi alani SICAK toprak.
   *
   * Ikisi de kirectasi tonundayken ekranda ayni renk lekesine donusuyordu
   * ve sokak agi okunmuyordu (ilk ekran goruntusunde ada tek bir bej
   * yuzeydi). Ton farki sokagi geri getirir.
   */
  const top = plaza ? shade(PALETTE.stoneLight, 0.02) : shade(PALETTE.block, 0.24);

  const face = (scale: number): void => {
    g.beginPath();
    g.moveTo(cx, cy - (h / 2) * scale);
    g.lineTo(cx + (w / 2) * scale, cy);
    g.lineTo(cx, cy + (h / 2) * scale);
    g.lineTo(cx - (w / 2) * scale, cy);
    g.closePath();
  };

  // Kenar golgesi - doseme zemine GOMULU gorunsun, uzerine konmus gibi degil.
  g.fillStyle(shade(top, -0.4), 0.4);
  face(inset);
  g.fillPath();

  g.fillStyle(top, 1);
  face(inset * 0.94);
  g.fillPath();

  /*
   * Derzler karonun KENDI eksenleri boyunca cizilir.
   *
   * Ekran eksenine paralel cizgiler doseme vermiyordu; karo eksenlerine
   * oturan cizgiler tas bloklarini okutur.
   */
  const seams = plaza ? 4 : 3;
  const span = inset * 0.94;
  g.lineStyle(1, shade(top, -0.24), plaza ? 0.5 : 0.38);
  for (let i = 1; i < seams; i += 1) {
    const t = i / seams;
    g.beginPath();
    g.moveTo(cx - (w / 2) * span + t * (w / 2) * span, cy - t * (h / 2) * span);
    g.lineTo(cx + t * (w / 2) * span, cy + (h / 2) * span - t * (h / 2) * span);
    g.strokePath();
    g.beginPath();
    g.moveTo(cx - (w / 2) * span + t * (w / 2) * span, cy + t * (h / 2) * span);
    g.lineTo(cx + t * (w / 2) * span, cy - (h / 2) * span + t * (h / 2) * span);
    g.strokePath();
  }

  if (plaza) {
    // Meydan: ortada acik renk bir gobek tasi.
    g.fillStyle(shade(top, 0.14), 0.95);
    face(0.46);
    g.fillPath();
    g.lineStyle(1, shade(top, -0.2), 0.55);
    g.strokePath();
  } else {
    // Sokak: asinmis birkac tas.
    g.fillStyle(shade(top, -0.14), 0.45);
    for (const [fx, fy, rw] of [
      [0.38, 0.42, 10],
      [0.6, 0.58, 8],
    ] as Array<[number, number, number]>) {
      g.fillEllipse(w * fx, h * fy, rw, rw * 0.5);
    }
  }
}

/** Yol dosemesi alabilen zemin turleri; su doseme almaz. */
export const PAVED_TERRAIN: TerrainType[] = ['grass', 'soil', 'rock'];

/** Zemin turune gore doseli karo anahtari. */
export function pavedKey(base: string, terrain: TerrainType): string {
  return `${base}:${terrain}`;
}

/** Hafif kabartmali izometrik zemin karosu; istenirse uzerine yol doseli. */
function createTileTexture(
  scene: Phaser.Scene,
  key: string,
  colors: { top: number; side: number; speck: number },
  pattern: TerrainPattern,
  paving: 'street' | 'plaza' | null = null,
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

  if (paving) drawPaving(g, w, h, paving === 'plaza');

  g.generateTexture(key, w, h + TILE_DEPTH);
  g.destroy();
}

/**
 * Bos yapi alaninin isareti: HAZIRLANMIS ARSA.
 *
 * Sprint 12'de yalnizca ince bir bordurdu ve bos alanlar yabani zeminle
 * ayni gorunuyordu; 2x2'lik bir ada icinde dort farkli zemin rengi
 * oldugunda sehir "rastgele renkli karolar" gibi okunuyordu (olculdu:
 * ekran goruntusunde bir adanin dort karosu uc ayri renkteydi).
 *
 * Artik alan, uzeri duzlenmis acik toprak bir PED olarak cizilir: ada
 * icindeki karolar birbirine benzer, sehir dokusu birlesir ve oyuncu
 * "buraya bina kurulur" bilgisini bakar bakmaz alir. Yine de sakindir -
 * dolgu dusuk alfali, bordur ince.
 */
function createPlotTexture(scene: Phaser.Scene, key: string): void {
  if (scene.textures.exists(key)) return;

  const w = TILE_WIDTH;
  const h = TILE_HEIGHT;
  const cx = w / 2;
  const cy = h / 2;
  const g = scene.make.graphics({ x: 0, y: 0 }, false);

  const face = (scale: number): void => {
    g.beginPath();
    g.moveTo(cx, cy - (h / 2) * scale);
    g.lineTo(cx + (w / 2) * scale, cy);
    g.lineTo(cx, cy + (h / 2) * scale);
    g.lineTo(cx - (w / 2) * scale, cy);
    g.closePath();
  };

  /*
   * Duzlenmis toprak ped - SAKIN.
   *
   * Ilk denemede dolgu 0.5 alfaliydi ve butun ada bej bir yuzeye
   * donusuyordu; zemin cesitliligi de sokak agi da kayboluyordu. Dusuk
   * alfa alani belli eder ama zemini ortmez.
   */
  g.fillStyle(shade(PALETTE.adobeLight, 0.12), 0.26);
  face(0.86);
  g.fillPath();

  // Ince kirectasi bordur ve kose sinir taslari.
  g.lineStyle(2, PALETTE.stoneLight, 0.3);
  face(0.9);
  g.strokePath();

  g.fillStyle(PALETTE.stone, 0.42);
  for (const [dx, dy] of [
    [0, -1],
    [1, 0],
    [0, 1],
    [-1, 0],
  ]) {
    g.fillCircle(cx + dx * (w / 2) * 0.9, cy + dy * (h / 2) * 0.9, 3);
  }

  g.generateTexture(key, w, h);
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

/**
 * Yuvarlak buton zemini.
 *
 * 9-slice ile daire yapilamaz (koseler gerilir), bu yuzden ayri bir doku
 * uretilir ve butonda setDisplaySize ile olceklenir. artScale, yuksek
 * DPR'de kenarin keskin kalmasini saglar.
 */
function createRoundTexture(
  scene: Phaser.Scene,
  key: string,
  fill: number,
  border: number,
  artScale: number,
): void {
  if (scene.textures.exists(key)) return;

  const size = 72;
  const g = scene.make.graphics({ x: 0, y: 0 }, false);
  g.scale = artScale;
  g.fillStyle(0x000000, 0.35);
  g.fillCircle(size / 2, size / 2 + 2, size / 2 - 2);
  g.fillStyle(fill, 0.96);
  g.fillCircle(size / 2, size / 2, size / 2 - 3);
  g.lineStyle(2, border, 0.95);
  g.strokeCircle(size / 2, size / 2, size / 2 - 3);

  g.generateTexture(key, Math.ceil(size * artScale), Math.ceil(size * artScale));
  g.destroy();
}

/** Arayuz panelleri icin 9-slice uyumlu yuvarlatilmis dikdortgen. */
function createPanelTexture(
  scene: Phaser.Scene,
  key: string,
  fill: number,
  border: number,
  alpha = 0.94,
): void {
  if (scene.textures.exists(key)) return;

  const size = 48;
  const radius = 14;
  const g = scene.make.graphics({ x: 0, y: 0 }, false);

  g.fillStyle(fill, alpha);
  g.fillRoundedRect(0, 0, size, size, radius);
  g.lineStyle(2, border, 0.9);
  g.strokeRoundedRect(1, 1, size - 2, size - 2, radius - 1);

  g.generateTexture(key, size, size);
  g.destroy();
}


