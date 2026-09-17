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
import { SLOTS, TILE_W, TILE_H, DRAWN_PAD, cityBounds, cityOutline, type Slot } from './layout'
import { BUILDING_IDS, type BuildingId, type Game } from './engine'

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

/**
 * ŞEHRİN ARKAPLANDAKİ AÇIKLIĞA OTURTULMASI.
 *
 * Arkaplan artik gercek bir resim ve ortasindaki bos alan bir DIKDORTGEN
 * DEGIL, oval bir acikilik. Sehir de tam orta noktasinda durmuyor: ustte
 * kayalik bir sinir, altta limana inen daralan bir gecit var.
 *
 * Bu yuzden yerlesim yuzdesi ile dunya arasindaki cevrim tek bir yerden,
 * OLCULMUS uc sayiyla yapilir. Resim degisirse yalnizca bu uc sayi degisir;
 * yerlesimin kendisi (kac sutun, kac satir, hangi bolge) dokunulmaz kalir.
 *
 * Degerler f6769236 numarali arkaplandan olculdu: acikligin genis kusagi
 * resmin x %27-73 / y %34,5-68,3 araliginda.
 */
export const CITY = { x: 424, y: 536, scale: 14.56 }

/** Sehir karesinin kapladigi dunya genisligi (100 yuzde birimi). */
export const CITY_SPAN = 100 * CITY.scale

/** Yerlesim yuzdesini dunya KONUMUNA cevirir. */
export const toWorldX = (pct: number) => CITY.x + pct * CITY.scale
export const toWorldY = (pct: number) => CITY.y + pct * CITY.scale

/** Yerlesim yuzdesini OLCUYE cevirir (konum degil: kaydirma eklenmez). */
export const px = (pct: number) => pct * CITY.scale

/** Bir binanin dunya uzerindeki genisligi. */
export const TILE_WORLD = px(TILE_W)

export type Point = { x: number; y: number }
export type Poly = Point[]

const poly = (points: Point[]): Poly => points.map(p => ({ x: toWorldX(p.x), y: toWorldY(p.y) }))

/** Izometrik elmas karo - arsalarin ve burclarin sekli. */
export function diamondPoints(x: number, y: number, w: number, h: number): Poly {
  return [
    { x, y: y - h / 2 }, { x: x + w / 2, y }, { x, y: y + h / 2 }, { x: x - w / 2, y },
  ]
}

/** Surun seviyeye gore kalinligi (yerlesim yuzdesi). */
export const wallThickness = (level: number) => 1.1 + level * 0.38

export type GroundShapes = {
  walls: { outer: Poly; inner: Poly; towers: Poly[]; gate: Poly; gateArch: Point } | null
  pads: { slot: Slot; shape: Poly; occupied: boolean }[]
}

/*
 * ZEMİNİ ARTIK ÇİZMİYORUZ.
 *
 * Duz renkli bir sekizgen, sokak seritleri ve bir rihtim ciziliyordu; hepsi
 * arkaplanin BOYALI olmadigi donemin cozumuydu. Gercek resim geldiginde o
 * katman iki kez zarar veriyor: boyali toprak dokusunu ortuyor ve resmin
 * oval acikligina oturmayan bir dikdortgen olarak goruruyor.
 *
 * Geriye yalnizca oyunun BILGI tasiyan parcalari kaliyor: nereye
 * kurulabilecegini soyleyen arsalar ve oyuncunun kendi kurdugu surlar.
 */
export function groundShapes(game: Game): GroundShapes {
  const occupied = new Set(BUILDING_IDS.map(id => game.placement[id]).filter((p): p is number => p !== null))
  const level = game.buildings.surlar
  const wallInner = cityOutline(DRAWN_PAD.wallInner)
  const wallOuter = cityOutline(DRAWN_PAD.wallInner + wallThickness(level))
  // Burclar sekizgenin dar kenarlarinda; kapi limana bakan kenarin ortasinda.
  const towerAt = [wallOuter[2], wallOuter[3], wallOuter[6], wallOuter[7]]
  const gateY = wallOuter[4].y

  return {
    walls: level > 0 ? {
      outer: poly(wallOuter),
      inner: poly(wallInner),
      towers: towerAt.map(t => poly(diamondPoints(t.x, t.y - 1.4, 6.2, 3.1))),
      gate: poly(diamondPoints(50, gateY, 8.5, 4.2)),
      gateArch: { x: toWorldX(50), y: toWorldY(gateY) },
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
    x: toWorldX(slot.x),
    y: toWorldY(slot.y),
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
  return { x: toWorldX((b.left + b.right) / 2), y: toWorldY((b.top + b.bottom) / 2) }
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
