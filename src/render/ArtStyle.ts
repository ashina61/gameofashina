/**
 * Ancient City sanat spesifikasyonu.
 *
 * BUTUN binalar ve zemin bu tek dosyadaki kurallara gore cizilir; amac
 * sehrin tek bir sanat yonetmeninden cikmis gibi gorunmesidir. Yeni bir
 * bina eklenirken renkler burdan alinir, elle sabit deger yazilmaz.
 *
 * SPESIFIKASYON
 *   Kamera      : izometrik 2:1 (karo 128x64), sabit acı
 *   Isik        : SOL USTTEN. Sol yuzler aydinlik, sag yuzler golgeli.
 *   Golge       : saga-asagi dogru, zemine temas eden yumusak eskenar dortgen
 *   Detay       : dusuk - telefonda okunabilirlik icin buyuk sekiller
 *   Kontur      : yok; ayrim ton farkiyla saglanir
 *   Zemin       : sicak Akdeniz paleti, dusuk doygunluk
 */

/** Akdeniz paleti. Butun binalar bu renklerden beslenir. */
export const PALETTE = {
  /** Kirec tasi / mermer - anitsal yapilar */
  stoneLight: 0xe4d8bd,
  stone: 0xcdbf9f,
  stoneDark: 0xa89a7c,
  stoneShadow: 0x8a7d63,

  /** Kerpic - sivil evler */
  adobeLight: 0xdcb98c,
  adobe: 0xc39f73,
  adobeDark: 0x9c7c56,

  /** Kiremit cati */
  roofLight: 0xc9754a,
  roof: 0xad5c38,
  roofDark: 0x8a4529,

  /** Ahsap */
  woodLight: 0x9c7046,
  wood: 0x7d5735,
  woodDark: 0x5c3e25,

  /** Islenmis tas blok */
  blockLight: 0xb4b0a6,
  block: 0x96928a,
  blockDark: 0x726f68,

  /** Ekin ve yesillik */
  cropGold: 0xd7b45a,
  cropGreen: 0x7d9c4a,
  leaf: 0x5f8a3e,
  leafDark: 0x45672c,

  /** Kumas / tente */
  clothWarm: 0xd8694f,
  clothCool: 0xe8dcc0,

  /** Vurgular */
  gold: 0xd9b25a,
  doorway: 0x3b2c1d,
  water: 0x4a86ab,
} as const;

/** Temas golgesinin koyulugu. */
export const SHADOW_ALPHA = 0.26;

/**
 * Yuz aydinlatma carpanlari.
 * Isik sol ustten geldigi icin sol yuz aydinlik, sag yuz koyudur.
 */
export const FACE = {
  top: 0.18,
  left: 0.0,
  right: -0.22,
  back: -0.3,
} as const;
