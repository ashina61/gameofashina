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

import { MEASURED } from './plots.generated'

/** Izometrik karo 2:1'dir: genislik tuvalin yuzdesi, yukseklik yarisi. */
export const TILE_W = 17
export const TILE_H = TILE_W / 2

/** Karolar arasindaki bosluk - sehirde sokak olarak okunur. */
const GAP_X = 1.6

/**
 * Iki satir arasindaki dikey adim.
 *
 * Binanin boyu karo genisligi kadardir (%17) ve bina karonun UZERINE oturur.
 * Adim bundan kucuk olursa on satirin binasi arka satirin etiketini orter -
 * 12,5 ile tam olarak bu oluyordu. 15, bir satirin binasini bir sonrakinin
 * karosunun hemen ustunde bitirir: derinlik var, ortusme yok.
 */
const ROW_PITCH = 15

export const COLS = 4
export const ROWS = 4

const PITCH_X = TILE_W + GAP_X
/*
 * Izgaranin ust kenari.
 *
 * Tuvalin en ustunden baslamaz: ustte BOYALI CEVREYE yer birakir. Sehir
 * ekranin kenarina dayandiginda hicbir yere ait gorunmuyordu; ustteki serit
 * uzaktaki mahalleyi gosterir ve sehri bir yere oturtur.
 */
const ORIGIN_Y = 22

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

/** Bir izgara hucresinin ekrandaki merkezi. */
export function cellCenter(col: number, row: number) {
  return { x: 50 + (col - (COLS - 1) / 2) * PITCH_X, y: ORIGIN_Y + row * ROW_PITCH }
}

/** Limandaki iskele satirinin y'si - yamacin son satirindan ayri durur. */
export const QUAY_Y = ORIGIN_Y + ROWS * ROW_PITCH + 3
export const QUAYS = 4

/*
 * ARSALAR.
 *
 * Once sehir izgarasi (satir satir, soldan saga), sonra limandaki iskeleler.
 * Sira onemlidir: kayitlardaki yerlesim bu INDEKSLERI tutar, yani var olan
 * arsalarin sirasi degismedigi surece eski sehirler ayni yerde durur.
 */
const GRID_SLOTS = [
  ...Array.from({ length: ROWS }, (_, row) =>
    Array.from({ length: COLS }, (_, col) => ({ zone: 'sehir' as const, ...cellCenter(col, row) }))).flat(),
  ...Array.from({ length: QUAYS }, (_, i) => ({
    zone: 'liman' as const,
    x: 50 + (i - (QUAYS - 1) / 2) * PITCH_X,
    y: QUAY_Y,
  })),
]

export const SLOTS: Slot[] = (USES_MEASURED ? MEASURED : GRID_SLOTS)
  .map((slot, index) => ({ index, zone: slot.zone, x: slot.x, y: slot.y }))

/** Sehir izgarasinin dis sinirlari (tuval yuzdesi). */
export function cityBounds() {
  const cells = SLOTS.filter(s => s.zone === 'sehir')
  return {
    left: Math.min(...cells.map(c => c.x)) - TILE_W / 2,
    right: Math.max(...cells.map(c => c.x)) + TILE_W / 2,
    top: Math.min(...cells.map(c => c.y)) - TILE_H / 2,
    bottom: Math.max(...cells.map(c => c.y)) + TILE_H / 2,
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
export const DRAWN_PAD = { platform: 5, wallInner: 3.4, wallMax: 3.4 + 1.1 + 5 * 0.38 }

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

/**
 * ACILIS GORUNUMU: sehir mahallesi.
 *
 * Tuvalin TAMAMINI sigdirmak yanlis hedef. Liman ayri bir mahalledir ve
 * ekranin alt seridi zaten hedef karti tarafindan ortuluyor; her seyi birden
 * sigdirmaya calismak binalari 46 piksele dusuruyordu (olculdu). Acilista
 * sehir izgarasi sigar, liman bir kaydirma uzakta kalir - sehir kurma
 * oyunlarinda beklenen davranis budur.
 *
 * Ustteki pay binanin karodan YUKARI tasan boyudur: bina karonun uzerine
 * oturur, yani tepesi karonun merkezinden bir karo genisligi yukaridadir.
 */
export function cityFocus() {
  const b = cityBounds()
  return { left: b.left, right: b.right, top: b.top - TILE_W + TILE_H, bottom: b.bottom }
}

/** Bir noktayi izometrik elmas koseye cevirir (karo cizimi icin). */
export function diamond(x: number, y: number, w = TILE_W, h = TILE_H) {
  return `${x},${y - h / 2} ${x + w / 2},${y} ${x},${y + h / 2} ${x - w / 2},${y}`
}

export function polygon(points: { x: number; y: number }[]) {
  return points.map(p => `${p.x.toFixed(2)},${p.y.toFixed(2)}`).join(' ')
}
