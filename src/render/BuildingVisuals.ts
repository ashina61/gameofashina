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
 * Kendi cizimi olan bina turleri.
 *
 * Katalogdaki yedi binanin tamami buradadir. Listede olmayan bir tur
 * gelirse GENERIC_VISUAL kullanilir - oyun crash etmez, bina jenerik bir
 * kutu olarak gorunur.
 */
export const DRAWN_BUILDING_TYPES = [
  'town_hall',
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
export function visualKeyFor(type: string, level: number): string {
  const base = isDrawnType(type) ? type : GENERIC_VISUAL;
  const safeLevel = Number.isFinite(level) ? Math.trunc(level) : 1;
  const clamped = Math.min(Math.max(1, safeLevel), MAX_VISUAL_LEVEL);
  return `bld:${base}:${clamped}`;
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
}): BuildingVisual {
  if (input.state === 'constructing') {
    return { textureKey: scaffoldKeyFor(input.size), tint: NEUTRAL_TINT, alpha: 1 };
  }

  const textureKey = visualKeyFor(input.type, input.level);

  if (input.state === 'disabled') {
    return { textureKey, tint: DISABLED_TINT, alpha: 0.75 };
  }

  return { textureKey, tint: NEUTRAL_TINT, alpha: 1 };
}
