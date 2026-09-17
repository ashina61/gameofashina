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
 * Yukari kaydirilmis: ALTTA denize inen bir LIMAN mahallesine yer birakir.
 * Referans sehirde de kara yukarida, iskeleler asagida denizin kenarindadir.
 */
export const CENTER = { x: 50, y: 40 }

/*
 * Izometrik adimlar. Bilerek GENIS: referans sehirde binalar arasinda bol
 * cim, kavisli yollar ve nefes vardir - iç içe gecmis bir yigin degil.
 * Dikey adim yataya yakin tutuldu ki sehir hem saga hem ASAGI acilsin,
 * dar bir dikdortgen gibi sikismasin.
 */
const STEP_X = TILE_W * 1.5
const STEP_Y = TILE_W * 0.86

/** Bir izgara hucresinin (col,row) ekran konumu; merkez (0,0) belediyedir. */
export function cellCenter(col: number, row: number) {
  return { x: CENTER.x + (col - row) * STEP_X, y: CENTER.y + (col + row) * STEP_Y }
}

/*
 * ŞEHİR ARSALARI: belediye MERKEZDE, cevresinde OturttuGumuz bir kume.
 *
 * Hucreler merkeze OKLID mesafesine gore siralanir ve en yakin N tanesi
 * alinir - bu, Chebyshev karesinden daha yuvarlak, daha organik bir sehir
 * verir (referanstaki gibi). Ilk hucre (0,0) belediyedir, CAKILI.
 */
const RANGE = 2
const CITY_PLOTS = 16
function cityCells(): { col: number; row: number; d: number }[] {
  const cells: { col: number; row: number; d: number }[] = []
  for (let col = -RANGE; col <= RANGE; col++) {
    for (let row = -RANGE; row <= RANGE; row++) {
      cells.push({ col, row, d: col * col + row * row })
    }
  }
  // Merkeze yakinlik, sonra ekran yuksekligi: ic halkalar once dolar,
  // cizim/indeks sirasi ustten alta tutarli kalir.
  cells.sort((a, b) => a.d - b.d || (a.col + a.row) - (b.col + b.row) || (a.col - a.row) - (b.col - b.row))
  return cells.slice(0, CITY_PLOTS)
}

const CITY_CELLS = cityCells()
const CITY_SLOTS = CITY_CELLS.map(({ col, row }) => ({ zone: 'sehir' as const, ...cellCenter(col, row) }))

/*
 * Bir sehir arsasinin merkezden kacinci HALKADA oldugu.
 *
 * Halka = merkeze OKLID uzakligina gore siralanmis farkli uzakliklarin sirasi
 * (0=belediye, 1, 2, ...). Yol buyumesi buna bagli: belediye seviye atladikca
 * yol bir sonraki halkaya kadar uzar. Indeks tabanli eski hesap yeni dizilimle
 * tutmuyordu; artik gercek uzakliktan turer.
 */
const RING_DISTS = [...new Set(CITY_CELLS.map(c => c.d))].sort((a, b) => a - b)
export function ringOf(index: number): number {
  if (index < 0 || index >= CITY_CELLS.length) return Infinity // iskeleler sehir halkasi degil
  return RING_DISTS.indexOf(CITY_CELLS[index].d)
}

/*
 * LIMAN İSKELELERİ: denizin kenarinda, sehrin ALTINDA, ikisi yan yana.
 *
 * Tersane ve Ticaret Limani KARAYA degil buraya kurulur. Sehir kumesinin
 * altina, bir bosluk birakilarak konur; aradaki bosluk kiyi/su olur ve
 * iskeleler denize uzanan ahsap platformlar gibi cizilir.
 */
export const QUAY_COUNT = 2
const quayY = CENTER.y + (RANGE + 2.4) * STEP_Y
const QUAY_SLOTS = Array.from({ length: QUAY_COUNT }, (_, i) => ({
  zone: 'liman' as const,
  x: CENTER.x + (i - (QUAY_COUNT - 1) / 2) * STEP_X * 1.5,
  y: quayY,
}))

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
