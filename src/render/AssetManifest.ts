/**
 * Varlik listesi: hangi PNG'ler var, nerede duruyorlar.
 *
 * NE ICIN VAR
 * Oyunun butun grafigi bugune kadar kodla ciziliyordu. Bu modul, elle
 * uretilmis PNG'lerin projeye TEK TEK, hazir oldukca girebilmesini
 * saglar: dosya varsa o kullanilir, yoksa mevcut prosedurel cizim aynen
 * devam eder. Ikisi arasinda bir anahtar, bir ayar dosyasi ya da bir
 * kod degisikligi yoktur - dosyayi klasore birakmak yeterlidir.
 *
 * NEDEN DERLEME ZAMANI LISTESI (import.meta.glob)
 * Ilk akla gelen yol "dosyayi yuklemeyi dene, hata alirsan prosedurele
 * don" idi. Bu yol her acilista var olmayan her dosya icin bir 404
 * uretir: konsol kirlenir ve projenin butun tarayici olcumleri
 * "konsol hatasi yok" kapisindan geciyor - kendi olcum altyapimizi
 * bozardik. glob listesi derleme aninda olustugu icin var olmayan dosya
 * icin ISTEK BILE cikmaz. Klasor bosken liste bos doner; bugunku durum
 * tam olarak budur.
 *
 * PHASER'DAN BAGIMSIZ: yalnizca isim ve URL bilir, yukleme islemi
 * SpriteLoader'in isidir.
 */

/**
 * Bina gorselleri: /src/assets/buildings/{tip}_{seviye}.png
 *
 * Istege bagli ekler:
 *   {tip}_{seviye}_v{n}.png   - ayni seviyenin siluet varyanti
 *   {tip}_{seviye}_shadow.png - elle cizilmis golge (verilmezse uretilir)
 */
const BUILDING_FILES = import.meta.glob('/src/assets/buildings/*.png', {
  eager: true,
  query: '?url',
  import: 'default',
}) as Record<string, string>;

/** Arayuz dokulari: /src/assets/ui/{ad}.png */
const UI_FILES = import.meta.glob('/src/assets/ui/*.png', {
  eager: true,
  query: '?url',
  import: 'default',
}) as Record<string, string>;

/** Yol -> URL haritasini "dosya adi (uzantisiz) -> URL" haritasina cevirir. */
function byName(files: Record<string, string>): ReadonlyMap<string, string> {
  const map = new Map<string, string>();
  for (const [path, url] of Object.entries(files)) {
    const base = path.slice(path.lastIndexOf('/') + 1).replace(/\.png$/i, '');
    map.set(base, url);
  }
  return map;
}

const BUILDINGS = byName(BUILDING_FILES);
const UI = byName(UI_FILES);

/** Panel sisteminin bekledigi uc temel doku. */
export const UI_TEXTURE_NAMES = ['panel_bg', 'panel_border', 'panel_corner'] as const;
export type UiTextureName = (typeof UI_TEXTURE_NAMES)[number];

/** Bir varligin yukleme kimligi ve adresi. */
export interface AssetEntry {
  /** Phaser doku anahtari. */
  key: string;
  /** Yukleyicinin kullanacagi URL. */
  url: string;
}

/** Bina sprite'larinin doku anahtari; prosedurel anahtarlarla karismaz. */
export function spriteKeyFor(name: string): string {
  return `spr:${name}`;
}

/** Arayuz kaynak dokusunun anahtari. */
export function uiSourceKeyFor(name: UiTextureName): string {
  return `uisrc:${name}`;
}

/**
 * Bir bina gorselinin dosya adi.
 *
 * Varyant 0 sade adi kullanir; boylece tek gorselli turler icin dosya
 * adi en kisa ve en tahmin edilebilir haliyle kalir.
 */
export function buildingSpriteName(type: string, level: number, variant = 0): string {
  return variant > 0 ? `${type}_${level}_v${variant}` : `${type}_${level}`;
}

/**
 * Verilen bina/seviye/varyant icin sprite adi; yoksa null.
 *
 * VARYANT GERI DUSMESI: istenen varyant yoksa ayni seviyenin sade
 * gorseli denenir. Boylece oyuncu tek bir PNG koyarak o seviyenin butun
 * varyantlarini karsilayabilir.
 *
 * SEVIYE GERI DUSMESI YOKTUR: Sv.3 gorseli yoksa Sv.1'inki KULLANILMAZ,
 * prosedurel cizime donulur. Aksi halde yukseltilmis bina yukseltilmemis
 * gibi gorunur ve oyuncu seviyeyi gozle ayirt edemezdi - sessizce yanlis
 * bilgi vermektense bilinen dogru cizime donmek yeglenir.
 */
export function resolveBuildingSprite(type: string, level: number, variant = 0): string | null {
  const exact = buildingSpriteName(type, level, variant);
  if (BUILDINGS.has(exact)) return exact;

  if (variant > 0) {
    const plain = buildingSpriteName(type, level, 0);
    if (BUILDINGS.has(plain)) return plain;
  }
  return null;
}

/** Bir bina gorseline ait elle cizilmis golge var mi? */
export function resolveShadowSprite(spriteName: string): string | null {
  const name = `${spriteName}_shadow`;
  return BUILDINGS.has(name) ? name : null;
}

/** Yuklenecek butun bina gorselleri. */
export function buildingAssets(): AssetEntry[] {
  return [...BUILDINGS.entries()].map(([name, url]) => ({ key: spriteKeyFor(name), url }));
}

/** Yuklenecek arayuz dokulari - yalnizca tanimli uc ad dikkate alinir. */
export function uiAssets(): AssetEntry[] {
  const out: AssetEntry[] = [];
  for (const name of UI_TEXTURE_NAMES) {
    const url = UI.get(name);
    if (url) out.push({ key: uiSourceKeyFor(name), url });
  }
  return out;
}

/** Bu arayuz dokusu dosyadan mi geliyor? Hayirsa placeholder uretilir. */
export function hasUiTexture(name: UiTextureName): boolean {
  return UI.has(name);
}

/** Olcum ve rapor icin: bulunan dosya adlari. */
export function manifestSummary(): { buildings: string[]; ui: string[] } {
  return { buildings: [...BUILDINGS.keys()].sort(), ui: [...UI.keys()].sort() };
}
