/**
 * Bina turu/seviyesi ile GORSEL arasindaki eslemeyi tutan katman.
 *
 * NEDEN AYRI BIR KATMAN
 * BuildingView'in "bu bina soyle cizilir" bilgisini tasimamasi gerekir;
 * yalnizca type, level ve state'i buraya verir ve karsiliginda bir doku
 * anahtari alir. Boylece sanat degistiginde oyun kodu degismez.
 *
 * Bu modul Phaser'dan bagimsizdir: yalnizca isim uretir ve hangi gorsellerin
 * var oldugunu bilir. Cizimin kendisi TextureFactory'dedir.
 */
import type { BuildingState } from '@/types';

/** Gorsel olarak ayri cizilen en yuksek seviye. Ustu bu seviyeyi kullanir. */
export const MAX_VISUAL_LEVEL = 2;

/**
 * Tur basina SILUET varyant sayisi.
 *
 * Yalnizca ev icin birden fazladir. 80 ozdes ev yan yana geldiginde renk
 * varyasyonu tekrar hissini azaltiyor ama yok etmiyordu; ayni kutle ayni
 * kaliyordu. Uc farkli kutle/cati profili sehri mekanik olmaktan cikarir.
 *
 * Varyantlar doku URETIM asamasinda pisirilir; calisma zamaninda doku
 * uretilmez.
 */
export const VARIANT_COUNT: Record<string, number> = { house: 3 };

/** Verilen turun kac siluet varyanti var? */
export function variantCountFor(type: string): number {
  return VARIANT_COUNT[type] ?? 1;
}

/**
 * Kendi cizimi olan bina turleri.
 *
 * Katalogdaki yedi binanin tamami buradadir. Listede olmayan bir tur
 * gelirse GENERIC_VISUAL kullanilir - oyun crash etmez, bina jenerik bir
 * kutu olarak gorunur.
 */
export const DRAWN_BUILDING_TYPES = [
  'town_hall',
  'temple',
  'harbor',
  'house',
  'farm',
  'lumber_camp',
  'quarry',
  'market',
  'warehouse',
] as const;

export type DrawnBuildingType = (typeof DRAWN_BUILDING_TYPES)[number];

/** Taninmayan bir tur icin kullanilan yedek gorsel. */
export const GENERIC_VISUAL = 'generic';

/** Insaat halindeki binanin gorseli - temel ve iskele. */
export const SCAFFOLD_VISUAL = 'scaffold';

/**
 * Ayni turden binalarin birbirinin kopyasi gorunmemesi icin uygulanan
 * cok hafif renk varyasyonu.
 *
 * 80 ozdes ev yan yana geldiginde sehir duvar kagidina donuyordu (olculdu,
 * 120 binalik sahnede tek tek evler secilemiyordu). Varyasyon TINT ile
 * yapilir: ek doku uretmez, bellek maliyeti sifirdir.
 *
 * Deterministiktir - ayni uid her zaman ayni tonu verir, yani kayit
 * yuklendiginde sehir ayni gorunur.
 */
const VARIATION_TINTS = [0xffffff, 0xe8d4be, 0xffe9cf, 0xd9cdbe, 0xfff0d2, 0xe0cdb4] as const;

/** uid'den kararli bir tam sayi uretir. Ayni uid her zaman ayni degeri verir. */
function hashOf(uid: string): number {
  let hash = 0;
  for (let i = 0; i < uid.length; i += 1) {
    hash = (hash * 31 + uid.charCodeAt(i)) >>> 0;
  }
  return hash;
}

/** uid'den kararli bir varyasyon tonu secer. */
export function variationTintFor(uid: string): number {
  return VARIATION_TINTS[hashOf(uid) % VARIATION_TINTS.length];
}

/**
 * uid'den kararli bir siluet varyanti secer.
 *
 * Rastgelelik YOKTUR: ayni uid her zaman ayni varyanti verir, yani kayit
 * yuklendiginde sehir birebir ayni gorunur. Varyanti olmayan turler icin
 * her zaman 0 doner.
 */
export function variantFor(uid: string, type: string): number {
  const count = variantCountFor(type);
  if (count <= 1) return 0;
  // Ton ve varyant ayni hash'ten turemesin; aksi halde belirli bir varyant
  // hep belirli bir tonla eslesir ve cesitlilik yapay gorunur.
  return Math.floor(hashOf(`${uid}#shape`) / 7) % count;
}

/** Bir binanin gorsel kimligi. */
export interface BuildingVisual {
  /** Doku anahtari; TextureFactory bu ada dokuyu uretir. */
  textureKey: string;
  /** Renk carpani; calismayan bina soluklastirilir. */
  tint: number;
  /** Opaklik; devre disi bina biraz saydamdir. */
  alpha: number;
}

/** Devre disi binanin soluk tonu. */
const DISABLED_TINT = 0x8a8a8a;

/** Normal (mudahalesiz) renk. */
const NEUTRAL_TINT = 0xffffff;

/** Bir turun cizimi var mi? */
export function isDrawnType(type: string): type is DrawnBuildingType {
  return (DRAWN_BUILDING_TYPES as readonly string[]).includes(type);
}

/**
 * Tur ve seviye icin doku anahtari uretir.
 *
 * Seviye MAX_VISUAL_LEVEL'a kirpilir: katalog ileride seviye 3 tanimlarsa
 * oyun calismaya devam eder, yalnizca gorsel seviye 2'de kalir.
 */
export function visualKeyFor(type: string, level: number, variant = 0): string {
  const base = isDrawnType(type) ? type : GENERIC_VISUAL;
  const safeLevel = Number.isFinite(level) ? Math.trunc(level) : 1;
  const clamped = Math.min(Math.max(1, safeLevel), MAX_VISUAL_LEVEL);

  const count = variantCountFor(base);
  const safeVariant =
    count > 1 && Number.isFinite(variant) ? Math.min(Math.max(0, Math.trunc(variant)), count - 1) : 0;

  // Varyant 0 eski anahtar bicimini korur; tek varyantli turlerin anahtari
  // degismez, yani onceki testler ve dokular gecerli kalir.
  return safeVariant === 0 ? `bld:${base}:${clamped}` : `bld:${base}:${clamped}v${safeVariant}`;
}

/** Insaat gorselinin doku anahtari; bina buyuklugune gore degisir. */
export function scaffoldKeyFor(size: number): string {
  const safe = Number.isFinite(size) ? Math.max(1, Math.trunc(size)) : 1;
  return `bld:${SCAFFOLD_VISUAL}:${safe}`;
}

/**
 * Bir bina orneginin gosterilecek gorselini belirler.
 *
 * - constructing: henuz bina yok, iskele cizilir.
 * - disabled: bina cizilir ama soluk ve biraz saydam.
 * - digerleri: seviyesine uygun bina gorseli.
 */
export function getBuildingVisual(input: {
  type: string;
  level: number;
  state: BuildingState;
  size: number;
  /** Varyasyon tonu bundan turer; verilmezse varyasyon uygulanmaz. */
  uid?: string;
}): BuildingVisual {
  if (input.state === 'constructing') {
    return { textureKey: scaffoldKeyFor(input.size), tint: NEUTRAL_TINT, alpha: 1 };
  }

  const textureKey = visualKeyFor(
    input.type,
    input.level,
    input.uid ? variantFor(input.uid, input.type) : 0,
  );

  if (input.state === 'disabled') {
    return { textureKey, tint: DISABLED_TINT, alpha: 0.75 };
  }

  /*
   * Anitsal yapilara varyasyon uygulanmaz: sehir merkezi ve tapinak her
   * sehirde ayni ve tanidik gorunmelidir.
   */
  const monumental = input.type === 'town_hall' || input.type === 'temple';
  const tint = input.uid && !monumental ? variationTintFor(input.uid) : NEUTRAL_TINT;
  return { textureKey, tint, alpha: 1 };
}
