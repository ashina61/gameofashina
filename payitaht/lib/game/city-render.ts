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
import { SLOTS, TILE_W, TILE_H, DRAWN_PAD, USES_MEASURED, CENTER, CENTER_PLOT, cityBounds, cityOutline, type Slot } from './layout'
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
export const CITY = USES_MEASURED
  /*
   * Olculmus arsalarda yuzdeler RESMIN kendi yuzdeleridir; cevrim birebir
   * olur ve dunya resmin tamamidir. Ressam nereye koyduysa orasi.
   */
  ? { x: 0, y: 0, scale: WORLD / 100 }
  /*
   * STILIZE mod: dunya tamamen kod tarafindan cizilir. Sehri ortalayip her
   * yanina bol su payi birakiriz - ada bir denizin ortasinda durmali.
   */
  : { x: 452, y: 392, scale: 14 }

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

/** Belediyeye giden bir yol: iki nokta arasi kalin bir hat. */
export type Road = { a: Point; b: Point }

export type GroundShapes = {
  /*
   * STILIZE ADA katmanlari, distan ice:
   *   beach - adanin kum kenari (suyla cim arasi gecis)
   *   body  - cim ada govdesi
   * Ikisi de ayni sekizgenden farkli paylarla turer, yani izgara buyudugunde
   * ada da buyur.
   */
  beach: Poly | null
  body: Poly | null
  /**
   * Belediyeye giden yollar.
   *
   * Her BINA merkezdeki belediyeye bir yolla baglanir, ve belediye seviye
   * atladikca yollar bir sonraki halkaya kadar UZAR - sehir merkezden disari
   * buyur. Bos ver: yol yalnizca stilize modda cizilir.
   */
  roads: Road[]
  walls: { outer: Poly; inner: Poly; towers: Poly[]; gate: Poly; gateArch: Point } | null
  pads: { slot: Slot; shape: Poly; occupied: boolean }[]
}

/** Bir arsanin merkezden kacinci halkada oldugu (0=belediye,1,2). */
function ringOf(index: number) { return index === 0 ? 0 : index <= 8 ? 1 : 2 }

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

  /*
   * YOLLAR: belediyeden (merkez) her arsaya bir yol.
   *
   * Bir arsa iki halde yola baglanir: uzerinde BINA varsa (her bina belediyeye
   * baglidir), ya da halkasi belediye SEVIYESINE ulasmissa (belediye buyudukce
   * yol bir sonraki halkaya uzar). Boylece hem "her binadan belediyeye yol"
   * hem "her level atlayinca yol cikar" ayni kuraldan turer.
   */
  const centre = { x: toWorldX(CENTER.x), y: toWorldY(CENTER.y) }
  const divanLevel = game.buildings.divan
  const roads: Road[] = USES_MEASURED ? [] : SLOTS
    .filter(s => s.index !== CENTER_PLOT && (occupied.has(s.index) || ringOf(s.index) <= divanLevel))
    .map(s => ({ a: centre, b: { x: toWorldX(s.x), y: toWorldY(s.y) } }))

  return {
    // Boyali arkaplan modunda ada resmin icinde; kod cizmez.
    beach: USES_MEASURED ? null : poly(cityOutline(14)),
    body: USES_MEASURED ? null : poly(cityOutline(8.5)),
    roads,
    /*
     * OLCULMUS arsalarda sur CIZILMEZ.
     *
     * Sur, arsalarin sinirlarindan turetilmis bir sekizgendi; resimden
     * olculen arsalar duzensiz dagildigi icin o sekizgen manzaranin
     * uzerinde koca bir bant olarak duruyor. Ustelik boyali ada zaten kendi
     * surlarini tasiyor. Surlar yine kurulur ve savunmaya sayilir -
     * yalnizca uzerine ikinci bir duvar cizilmez.
     */
    walls: !USES_MEASURED && level > 0 ? {
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

/** Sokagin genisligi, yerlesim yuzdesi. */

/**
 * Bir binanin dunya uzerindeki yeri ve boyu.
 *
 * Bina KARONUN UZERINE oturur: yatayda ortali, tabani karonun merkezinde.
 * Kare gorselin hangi noktasinin karo merkezine denk gelecegi buradan cikar -
 * `originY`. Divanhane biraz daha buyuktur; zemini degil, silueti baskin olur.
 */
export function buildingPlacement(id: BuildingId, slot: Slot) {
  const scale = id === 'divan' ? 1.5 : 1
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

/**
 * Adanin dunya uzerindeki boyutu (kum kenari dahil).
 *
 * Kamera acilista adayi ekrana sigdirmak icin bunu kullanir. Boyali modda
 * ada resmin tamami kadardir.
 */
export function islandExtent() {
  if (USES_MEASURED) return { w: WORLD, h: WORLD, cx: WORLD / 2, cy: WORLD / 2 }
  const o = cityOutline(14)
  const xs = o.map(p => toWorldX(p.x)), ys = o.map(p => toWorldY(p.y))
  const minX = Math.min(...xs), maxX = Math.max(...xs), minY = Math.min(...ys), maxY = Math.max(...ys)
  return { w: maxX - minX, h: maxY - minY, cx: (minX + maxX) / 2, cy: (minY + maxY) / 2 }
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
