/**
 * ŞEHRİN ÇİZİM VERİSİ.
 *
 * Burasi SAF: Phaser'i, React'i, DOM'u bilmez. Yerlesimdeki yuzdeleri dunya
 * pikseline cevirir ve cizilecek her seyi nokta listesi olarak verir.
 *
 * Neden ayri bir dosya: render motoru degisebilir - nitekim degisti, SVG'den
 * Phaser'a gectik - ama sehrin GEOMETRISI degismemeli. Bu dosya sayesinde o
 * gecis, cizim matematigini yeniden yazmak yerine yalnizca cizim cagrilarini
 * yeniden yazmak oldu. Ayrica test edilebilir: bir cokgenin dogru yerde olup
 * olmadigini tarayici acmadan sinayabiliyoruz.
 */
import {
  SLOTS, COLS, ROWS, TILE_W, TILE_H, QUAY_Y, DRAWN_PAD,
  cellCenter, cityBounds, cityOutline, type Slot,
} from './layout'
import { BUILDING_IDS, type BuildingId, type Game } from './engine'

/**
 * SEHIR KARESI: yerlesimdeki yuzdelerin oturdugu alan.
 *
 * Yerlesim %0-100 arasinda konusur; bu sayi o araligi piksele cevirir.
 */
export const CITY_SPAN = 1536

/**
 * DUNYA sehirden BUYUKTUR.
 *
 * Bu farkin sebebi dogrudan oyuncunun sikayeti: dunya ekran kadar oldugunda
 * kaydirilacak tasma kalmiyor ve parmak hicbir sey yapmiyor. Sehrin cevresine
 * her yandan bir pay birakmak, gezinmeyi GERCEK kilan sey - ustelik o pay
 * bos degil, arkaplanin boyali kasabasi.
 *
 * Dunya birimleri CIHAZ pikseli oldugu icin sayi buyuk gorunur: DPR 2 bir
 * telefonda 2304 birim, 1152 CSS pikseline denk gelir - yani ekranin yaklasik
 * uc kati genislik, bir buçuk kati yukseklik.
 */
export const WORLD = 2304

/** Sehir karesinin dunya icindeki sol/ust kosesi. */
export const CITY_ORIGIN = (WORLD - CITY_SPAN) / 2

/** Yerlesim yuzdesini dunya KONUMUNA cevirir. */
export const toWorld = (pct: number) => CITY_ORIGIN + (pct / 100) * CITY_SPAN

/** Yerlesim yuzdesini OLCUYE cevirir (konum degil: kaydirma eklenmez). */
export const px = (pct: number) => (pct / 100) * CITY_SPAN

/** Bir binanin dunya uzerindeki genisligi. */
export const TILE_WORLD = px(TILE_W)

export type Point = { x: number; y: number }
export type Poly = Point[]

const poly = (points: Point[]): Poly => points.map(p => ({ x: toWorld(p.x), y: toWorld(p.y) }))

/** Izometrik elmas karo - arsalarin ve burclarin sekli. */
export function diamondPoints(x: number, y: number, w: number, h: number): Poly {
  return [
    { x, y: y - h / 2 }, { x: x + w / 2, y }, { x, y: y + h / 2 }, { x: x - w / 2, y },
  ]
}

/** Surun seviyeye gore kalinligi (yerlesim yuzdesi). */
export const wallThickness = (level: number) => 1.1 + level * 0.38

const STREET_W = 2.6

export type GroundShapes = {
  platform: Poly
  rim: Poly
  streets: { x: number; y: number; w: number; h: number }[]
  road: Poly
  quayDeck: Poly
  walls: { outer: Poly; inner: Poly; towers: Poly[]; gate: Poly; gateArch: Point } | null
  pads: { slot: Slot; shape: Poly; occupied: boolean }[]
}

/** Cizilecek butun zemin geometrisi, tek seferde. */
export function groundShapes(game: Game): GroundShapes {
  const b = cityBounds()
  const occupied = new Set(BUILDING_IDS.map(id => game.placement[id]).filter((p): p is number => p !== null))
  const quays = SLOTS.filter(s => s.zone === 'liman')
  const level = game.buildings.surlar

  const wallInner = cityOutline(DRAWN_PAD.wallInner)
  const wallOuter = cityOutline(DRAWN_PAD.wallInner + wallThickness(level))
  // Burclar sekizgenin dar kenarlarinda; kapi limana bakan kenarin ortasinda.
  const towerAt = [wallOuter[2], wallOuter[3], wallOuter[6], wallOuter[7]]
  const gateY = wallOuter[4].y

  return {
    platform: poly(cityOutline(DRAWN_PAD.platform)),
    rim: poly(cityOutline(2)),
    streets: [
      ...Array.from({ length: COLS - 1 }, (_, c) => {
        const x = (cellCenter(c, 0).x + cellCenter(c + 1, 0).x) / 2
        return { x: toWorld(x - STREET_W / 2), y: toWorld(b.top - 2.5), w: px(STREET_W), h: px(b.bottom - b.top + 5) }
      }),
      ...Array.from({ length: ROWS - 1 }, (_, r) => {
        const y = (cellCenter(0, r).y + cellCenter(0, r + 1).y) / 2
        return { x: toWorld(b.left - 2.5), y: toWorld(y - STREET_W / 2), w: px(b.right - b.left + 5), h: px(STREET_W) }
      }),
    ],
    road: poly([
      { x: 45.5, y: b.bottom + DRAWN_PAD.platform / 2 - 1 }, { x: 54.5, y: b.bottom + DRAWN_PAD.platform / 2 - 1 },
      { x: 56.5, y: QUAY_Y - TILE_H / 2 - 2.5 }, { x: 43.5, y: QUAY_Y - TILE_H / 2 - 2.5 },
    ]),
    quayDeck: poly([
      { x: quays[0].x - TILE_W / 2 - 3, y: QUAY_Y - TILE_H / 2 - 3 },
      { x: quays[quays.length - 1].x + TILE_W / 2 + 3, y: QUAY_Y - TILE_H / 2 - 3 },
      { x: quays[quays.length - 1].x + TILE_W / 2 - 1, y: QUAY_Y + TILE_H / 2 + 3.5 },
      { x: quays[0].x - TILE_W / 2 + 1, y: QUAY_Y + TILE_H / 2 + 3.5 },
    ]),
    walls: level > 0 ? {
      outer: poly(wallOuter),
      inner: poly(wallInner),
      towers: towerAt.map(t => poly(diamondPoints(t.x, t.y - 1.4, 6.2, 3.1))),
      gate: poly(diamondPoints(50, gateY, 8.5, 4.2)),
      gateArch: { x: toWorld(50), y: toWorld(gateY) },
    } : null,
    pads: SLOTS.map(slot => ({
      slot,
      shape: poly(slot.zone === 'liman'
        ? diamondPoints(slot.x, slot.y, TILE_W - 1.5, TILE_H - 0.8)
        : diamondPoints(slot.x, slot.y, TILE_W, TILE_H)),
      occupied: occupied.has(slot.index),
    })),
  }
}

/**
 * Bir binanin dunya uzerindeki yeri ve boyu.
 *
 * Bina KARONUN UZERINE oturur: yatayda ortali, tabani karonun merkezinde.
 * Kare gorselin hangi noktasinin karo merkezine denk gelecegi buradan cikar -
 * `originY`. Divanhane biraz daha buyuktur; zemini degil, silueti baskin olur.
 */
export function buildingPlacement(id: BuildingId, slot: Slot) {
  const scale = id === 'divan' ? 1.18 : 1
  const size = TILE_WORLD * scale
  return {
    x: toWorld(slot.x),
    y: toWorld(slot.y),
    size,
    /** Kare kutunun tabani, karo merkezinin yarim karo altinda biter. */
    originY: 1 - (TILE_H / 2 / (TILE_W * scale)),
    /** Ressam sirasi: asagidaki once cizilir ki ustunu ortsun. */
    depth: slot.y,
  }
}

/** Kameranin acilista bakacagi nokta: sehir izgarasinin merkezi. */
export function cityCenter(): Point {
  const b = cityBounds()
  return { x: toWorld((b.left + b.right) / 2), y: toWorld((b.top + b.bottom) / 2) }
}

/**
 * Sahnenin GORSEL imzasi.
 *
 * Oyun durumu saniyede bir tikliyor (kaynaklar artiyor), ama sahnede
 * degisen bir sey yok. Yirmi sprite'i saniyede bir yeniden kurmak bosa
 * calismaktir; bu imza degismedikce sahne dokunulmaz.
 */
export function visualSignature(game: Game): string {
  return [
    ...BUILDING_IDS.map(id => `${game.placement[id] ?? '-'}:${game.buildings[id]}`),
    game.queue.map(j => j.id).join(','),
  ].join('|')
}
