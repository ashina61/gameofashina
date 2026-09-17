/**
 * GÖRSELİ OLMAYAN YAPILAR İÇİN ÇİZİM TARİFİ.
 *
 * On dort yapinin sekizinin boyali gorseli yok ve haritada kahverengi birer
 * kutu olarak duruyorlardi. Bir kutu "eksik varlik" der; oyuncu onu bir bina
 * olarak gormez, hatayi gorur.
 *
 * Buradaki tarif onlari izometrik BASIT BINALAR olarak cizdirir: tas kaide,
 * isik yonune gore iki duvar yuzu, piramit cati. Boyali gorsellerin yerini
 * tutmaz - tutmasi da gerekmiyor. Isi, gorsel gelene kadar sehrin bir sehir
 * gibi gorunmesini saglamak; bir satir (`art: true`) ile devreden cikar.
 *
 * Palet yapinin ISLEVINDEN turer: yonetim kursun kubbeli beyaz tas, askeri
 * yapilar kaba gri tas, liman ahsap, halk yapilari kiremitli beyaz siva.
 */
import type { BuildingId } from './engine'

export type ArtPalette = {
  /** Isiga bakan duvar (sol-on yuz) ve golgedeki duvar (sag-on yuz). */
  wallLit: number; wallShade: number
  roofLit: number; roofShade: number
  base: number; baseEdge: number
}

const PLASTER = { wallLit: 0xf6ecd9, wallShade: 0xb8a98d }
const STONE = { wallLit: 0xd6cdb8, wallShade: 0x938a77 }
const TIMBER = { wallLit: 0xd4a96f, wallShade: 0x8e6a41 }
const TILE = { roofLit: 0xcf6640, roofShade: 0x8a3c22 }
const LEAD = { roofLit: 0x87a2a4, roofShade: 0x4e6163 }
const SLATE = { roofLit: 0x958d80, roofShade: 0x585349 }
const FOOT = { base: 0xa59a80, baseEdge: 0x6d6555 }

const PALETTES: Record<string, ArtPalette> = {
  yonetim: { ...PLASTER, ...LEAD, ...FOOT },
  askeri: { ...STONE, ...SLATE, ...FOOT },
  liman: { ...TIMBER, ...SLATE, ...FOOT },
  halk: { ...PLASTER, ...TILE, ...FOOT },
}

const BY_ID: Partial<Record<BuildingId, keyof typeof PALETTES>> = {
  saray: 'yonetim', elcilik: 'yonetim', hamam: 'yonetim',
  kisla: 'askeri', surlar: 'askeri',
  liman: 'liman', tersane: 'liman',
  carsi: 'halk',
}

export function paletteFor(id: BuildingId): ArtPalette {
  return PALETTES[BY_ID[id] ?? 'halk']
}

/**
 * Binanin OLCULERI, seviyeye gore.
 *
 * Seviye yukseldikce yapi biraz buyur - oyuncu ilerlemesini sayidan once
 * siluetten gorur. Artis dogrusal degil sonumlu: 5. seviye 1. seviyenin iki
 * kati olsaydi komsu arsalari ezerdi.
 */
export function shapeFor(size: number, level: number) {
  const grow = 1 + Math.min(level, 5) * 0.045
  // Boyali gorsellerle ayni agirlikta dursun: onlar karonun neredeyse
  // tamamini kapliyor, kucuk bir kutu yanlarinda maket gibi kaliyordu.
  const width = size * 0.72 * grow
  return {
    width,
    /** Karonun yarim yuksekligi: 2:1 izometri. */
    depth: width / 2,
    body: size * 0.30 * grow,
    roof: size * 0.23 * grow,
    /** Catinin duvardan disari tasma payi. */
    eave: width * 0.10,
    foot: size * 0.70,
  }
}
