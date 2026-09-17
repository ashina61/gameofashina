/**
 * ŞEHİR YERLEŞİMİ.
 *
 * ESKI YOL: arsalar RESMIN ICINE boyanmisti ve konumlari resmin uzerinden
 * elle olculuyordu. Bunun iki bedeli vardi ve ikisi de agirdi:
 *   - Yeni bir arsa istemek YENI BIR ARKAPLAN istemek demekti.
 *   - Goruntu ureticileri izgara tutturamaz; elimizdeki resimde arsalar
 *     farkli boyutta ve dizilimsizdi, binalar hicbir zaman hizalanmadi.
 *
 * YENI YOL: arsalar resimden CIKTI, koda gecti. Arkaplan artik yalnizca
 * ZEMIN - uzerinde arsa, sur ya da bina yok - dolayisiyla resmin ne kadar
 * tuttugu yerlesimi hic etkilemez.
 *
 * DIZILIM: sutun-satir, izometrik elmas degil.
 *
 * Once gercek bir izometrik izgara denendi (x = (sutun - satir) * adim).
 * Olcum onu eledi: 4x5 bir elmas tuvalin %85'ine yayiliyor ve 390 piksellik
 * bir telefonda bina 71 piksele dusuyordu. Sutun-satir dizilimde GENISLIK
 * YALNIZCA SUTUN SAYISINA baglidir; satir eklemek sehri asagi uzatir,
 * telefonda dogal olan yon budur. Karolar yine elmas cizilir, yani goz
 * izometriyi gorur ama olcu telefona uyar.
 */

import { MEASURED, MEASURED_TILE_W } from './plots.generated'

/**
 * Izometrik karo 2:1'dir: genislik tuvalin yuzdesi, yukseklik yarisi.
 *
 * Olculmus arsalarda bu sayi da OLCULUR: bina, ressamin cizdigi arsa kadar
 * olur. Sabit birakildiginda bina ya arsasini tasiyor ya da ortasinda
 * kayboluyordu - ikisi de "bu bina oraya ait degil" der.
 */
export const TILE_W = MEASURED.length > 0 ? MEASURED_TILE_W : 17
export const TILE_H = TILE_W / 2

export type Zone = 'sehir' | 'liman'

/*
 * ARSALAR NEREDEN GELIYOR?
 *
 * Iki yol var ve aralarindaki fark, sehrin bir YER gibi mi yoksa bir
 * MATRIS gibi mi gorundugunu belirliyor:
 *
 *   OLCULMUS (tercih edilen) - arsalar arkaplan resmine RESSAM tarafindan,
 *   yolun kenarina, duzensiz serpilerek konur; kod onlari olcup okur
 *   (scripts/measure-plots.mjs). Ikariam ve Travian boyle calisir; sehirleri
 *   bir yere ait gorunuyorsa sebebi budur - bina, agaclarin ve duvarlarin
 *   ARASINA yerlestirilmis bir seydir.
 *
 *   IZGARA (yedek) - arsalar esit araliklarla hesaplanir. Daha duzenli
 *   gorunur ama sonuc sehir degil matristir; hicbir sehir kurma oyununun
 *   sehir ekraninda gorunur, duzenli bir izgara yoktur.
 */
export const USES_MEASURED = MEASURED.length > 0

export type Slot = {
  index: number
  zone: Zone
  /** Merkez, tuval genisliginin yuzdesi. */
  x: number
  y: number
}

/**
 * Belediye (belediye) merkezinin ekran konumu.
 *
 * Ada DUNYANIN ortasina ayrica oturtuluyor (city-render), bu yuzden buradaki
 * degerler yalnizca izgaranin kendi merkezidir; onemli olan adimlar ve
 * ada BICIMIDIR.
 */
export const CENTER = { x: 50, y: 42 }

/*
 * İZOMETRİK ADIMLAR — ada PORTRE ekrani DOLDURSUN diye.
 *
 * Onceki sorun: klasik izometri karosu 2:1'dir (yataya iki, dikeye bir); bu,
 * adayi YATIK ve BASIK bir dikdortgen yapiyordu - ekranin ustu ve alti bos
 * suya gidiyordu. Telefon DIKEY. Dikey adimi yataya yaklastirinca ada dikine
 * uzar, ekrani doldurur; karolar hala elmas cizilir ama sehir "basik" durmaz.
 *
 * u = ekranda YATAY birim, v = ekranda DIKEY birim. Karo koordinati (u,v)
 * degil de ekran ekseninde dusunulur: boylece adanin bicimini dogrudan
 * kontrol ederiz.
 */
const STEP_X = TILE_W * 1.32
const STEP_Y = TILE_W * 1.18

/** (u,v) ekran-eksenli izgara noktasi; (0,0) belediyedir. */
function at(u: number, v: number) {
  return { x: CENTER.x + u * STEP_X, y: CENTER.y + v * STEP_Y }
}

/*
 * ŞEHİR ARSALARI — dikine bir ELMAS ada, MERKEZDEN DIŞA dizili.
 *
 * Arsalar rastgele degil, belediyeden disari duzenli halkalar halinde acilir:
 * once merkez (belediye, cakili), sonra ic dort kose, sonra eksenler, sonra
 * dis kanatlar. Bu yuzden ilk kurulan binalar merkezde kumelenir - sehir
 * "gelisi guzel serpilmis" degil, PLANLI gorunur. Ada yukari (ic kara) daralir,
 * asagi (kiyi) genisler: altta limana acilan bir sahil olur.
 */
const CITY_UV: [number, number][] = [
  [0, 0],                          // 0  BELEDIYE - merkez, cakili
  [-1, -1], [1, -1], [-1, 1], [1, 1], // 1-4 ic halka (dort kose)
  [0, -2], [-2, 0], [2, 0], [0, 2],   // 5-8 eksenler (ust/sol/sag/alt)
  [-1, -3], [1, -3],               // 9-10 ust kanatlar (ic kara, daralan)
  [-2, 2], [2, 2],                 // 11-12 alt yanlar (kiyi, genisleyen)
  [0, 3],                          // 13 sahil ucu (limana bakan burun)
]

const CITY_SLOTS = CITY_UV.map(([u, v]) => ({ zone: 'sehir' as const, ...at(u, v) }))

/*
 * Bir arsanin merkezden kacinci HALKADA oldugu (0=belediye,1,2,3).
 *
 * Yol agi buna gore buyur: belediye seviye atladikca yollar bir sonraki
 * halkaya uzar. Halka, ekran-eksenli uzakligin en buyuk bileseninden turer.
 */
const CITY_RINGS = CITY_UV.map(([u, v]) => Math.max(Math.abs(u), Math.abs(v)))
export function ringOf(index: number): number {
  if (index < 0 || index >= CITY_RINGS.length) return Infinity // iskeleler sehir halkasi degil
  return CITY_RINGS[index]
}

/*
 * LIMAN İSKELELERİ — adanin ALT KIYISINDA, ikisi yan yana.
 *
 * Tersane ve Ticaret Limani KARAYA degil buraya kurulur. En alt kara sirasinin
 * (v=3) hemen altina, kiyinin dibine konur; aradaki dar serit kiyi/su olur.
 * Onceki tasarimda iskeleler kara ile arasinda KOCA bir bos su birakacak kadar
 * asagidaydi - artik sahile YAPISIK.
 */
export const QUAY_COUNT = 2
const QUAY_UV: [number, number][] = [[-1.5, 3.7], [1.5, 3.7]]
const QUAY_SLOTS = QUAY_UV.map(([u, v]) => ({ zone: 'liman' as const, ...at(u, v) }))

export const SLOTS: Slot[] = (USES_MEASURED
  ? MEASURED.map(m => ({ zone: m.zone, x: m.x, y: m.y }))
  : [...CITY_SLOTS, ...QUAY_SLOTS]
).map((slot, index) => ({ index, zone: slot.zone, x: slot.x, y: slot.y }))

/** Belediye arsasinin indeksi: her zaman merkez, CAKILI. */
export const CENTER_PLOT = 0

/**
 * KARA sehrin dis sinirlari (yalnizca 'sehir' arsalari).
 *
 * Iskeleler DAHIL EDILMEZ: ada govdesi ve sur yalnizca karayi sarmali,
 * denizdeki iskelelere kadar uzanmamali.
 */
export function cityBounds() {
  const cells = SLOTS.filter(c => c.zone === 'sehir')
  return {
    left: Math.min(...cells.map(c => c.x)) - TILE_W / 2,
    right: Math.max(...cells.map(c => c.x)) + TILE_W / 2,
    top: Math.min(...cells.map(c => c.y)) - TILE_H / 2,
    bottom: Math.max(...cells.map(c => c.y)) + TILE_H / 2,
  }
}

/** Butun arsalari (iskeleler dahil) kapsayan sinir - kamera fiti icin. */
export function fullBounds() {
  return {
    left: Math.min(...SLOTS.map(c => c.x)) - TILE_W,
    right: Math.max(...SLOTS.map(c => c.x)) + TILE_W,
    top: Math.min(...SLOTS.map(c => c.y)) - TILE_W,
    bottom: Math.max(...SLOTS.map(c => c.y)) + TILE_W,
  }
}

/**
/**
 * CIZILEN her seyin disina tasmadigi pay.
 *
 * Arkaplanin boyali kismi ancak bu kutunun DISINDA gorunur; brief'teki
 * "guvenli alan" tam olarak budur. Sur kalinligi seviyeyle buyudugu icin
 * en genis hali baz alinir - yoksa 5. seviyede sur, resmin kenar seridini
 * yutar.
 */
export const DRAWN_PAD = { platform: 5, wallInner: 5.5, wallMax: 5.5 + 1.1 + 5 * 0.38 }

/**
 * Sehri ceviren SEKIZGEN.
 *
 * Duz bir dortgen tepeden bakista duz durur; koseleri kirpmak sur hattina
 * hem izometrik bir derinlik hem de burclar icin dogal dort nokta verir.
 * Sur, zemin ve rihtim ayni sekilden farkli paylarla turer - yani izgara
 * degistiginde hepsi birlikte degisir.
 */
export function cityOutline(pad = 0) {
  const b = cityBounds()
  const l = b.left - pad, r = b.right + pad
  const t = b.top - pad / 2, d = b.bottom + pad / 2
  // Kose kirpma payi: dar kenarda orantiyi bozmasin diye sinirlanir.
  const cut = Math.min(9, (r - l) / 5)
  const cutY = cut / 2
  return [
    { x: l + cut, y: t }, { x: r - cut, y: t },
    { x: r, y: t + cutY }, { x: r, y: d - cutY },
    { x: r - cut, y: d }, { x: l + cut, y: d },
    { x: l, y: d - cutY }, { x: l, y: t + cutY },
  ]
}

/** Bir noktayi izometrik elmas koseye cevirir (karo cizimi icin). */
export function diamond(x: number, y: number, w = TILE_W, h = TILE_H) {
  return `${x},${y - h / 2} ${x + w / 2},${y} ${x},${y + h / 2} ${x - w / 2},${y}`
}

export function polygon(points: { x: number; y: number }[]) {
  return points.map(p => `${p.x.toFixed(2)},${p.y.toFixed(2)}`).join(' ')
}
