/**
 * ŞEHİR YERLEŞİMİ — Ikariam benzeri ELMAS AĞAÇ.
 *
 * Şehir, belediyeden (Divanhane) büyüyen bir ELMAS ağaçtır: belediye en altta,
 * ortada ÇAKILI durur; arsalar yukarı doğru genişleyen simetrik sıralar
 * halinde açılır. Toplam 23 arsa (biri belediye).
 *
 * Arsalar ve yollar TEK bir karakter-ızgarasına oturur:
 *   - 'B' arsa, 'T' belediye (çakılı), '.' yol döşenebilir zemin, ' ' dışarı.
 * Böylece yollar arsaların ARASINA denk gelir; oyuncu boş zemine dokunup
 * yolu KENDİ döşer (bkz. ROAD_CELLS). Belediye asla taşınmaz.
 */

import { MEASURED, MEASURED_TILE_W } from './plots.generated'

/**
 * Izometrik karo 2:1'dir: genislik tuvalin yuzdesi, yukseklik yarisi.
 */
export const TILE_W = MEASURED.length > 0 ? MEASURED_TILE_W : 17
export const TILE_H = TILE_W / 2

export type Zone = 'sehir' | 'liman'

export const USES_MEASURED = MEASURED.length > 0

export type Slot = {
  index: number
  zone: Zone
  /** Merkez, tuval genisliginin yuzdesi. */
  x: number
  y: number
}

/**
 * Izgaranin kendi merkezi (yuzde). Sehir dunyaya ayrica ortalanir
 * (city-render), dolayisiyla bu deger yalnizca goreli konumlarin baslangicidir.
 */
export const CENTER = { x: 50, y: 42 }

/*
 * KARAKTER IZGARASI. Her karakter bir hucre; satirlar yukaridan asagiya (v),
 * sutunlar soldan saga (u). Elmas: ustte ve altta tek arsa, ortada dort.
 * Belediye ('T') en altta, ortada.
 */
const CITY_MAP = [
  '     B     ', // 0
  '    B B    ', // 1
  '   B B B   ', // 2
  '  B B B B  ', // 3
  '   B B B   ', // 4
  '  B B B B  ', // 5
  '   B B B   ', // 6
  '    B B    ', // 7
  '     T     ', // 8
]

/*
 * IZOMETRIK ADIMLAR. Bir hucreden komsusuna yatay ve dikey kayma; elmas ada
 * PORTRE ekrani doldursun diye dikey adim yataya yakin tutulur.
 */
const SX = TILE_W * 0.92
const SY = TILE_W * 0.72

/** Karakter- izgara hucresi (col,row) -> yerlesim yuzdesi. */
function gridPos(col: number, row: number) {
  const centerCol = (CITY_MAP[0].length - 1) / 2
  const centerRow = (CITY_MAP.length - 1) / 2
  return { x: CENTER.x + (col - centerCol) * SX, y: CENTER.y + (row - centerRow) * SY }
}

type Cell = { col: number; row: number; kind: 'plot' | 'hall' }
const RAW_CELLS: Cell[] = []
for (let row = 0; row < CITY_MAP.length; row++) {
  const line = CITY_MAP[row]
  for (let col = 0; col < line.length; col++) {
    const ch = line[col]
    if (ch === 'B') RAW_CELLS.push({ col, row, kind: 'plot' })
    else if (ch === 'T') RAW_CELLS.push({ col, row, kind: 'hall' })
  }
}

const HALL = RAW_CELLS.find(c => c.kind === 'hall')!

/*
 * ARSA SIRALAMASI: belediye (index 0, cakili) once, gerisi belediyeye
 * UZAKLIGA gore. Boylece dusuk indeksler merkeze yakin kumelenir - baslangic
 * binalari ve kademeli acilim (ringOf) buna dayanir.
 */
const ORDERED = [
  HALL,
  ...RAW_CELLS.filter(c => c.kind === 'plot').sort((a, b) => {
    const pa = gridPos(a.col, a.row), pb = gridPos(b.col, b.row)
    const ph = gridPos(HALL.col, HALL.row)
    return Math.hypot(pa.x - ph.x, pa.y - ph.y) - Math.hypot(pb.x - ph.x, pb.y - ph.y)
  }),
]

const CITY_SLOTS = ORDERED.map(c => ({ zone: 'sehir' as const, ...gridPos(c.col, c.row) }))

/**
 * Bir arsanin kademeli-acilim HALKASI (0 = belediye). Belediye seviye atladikca
 * bir sonraki halka acilir; her halka ~4 arsa. Boylece sehir merkezden disari
 * buyur - Ikariam'da yeni arsanin seviye/arastirmayla acilmasi gibi.
 */
export function ringOf(index: number): number {
  if (index <= 0) return 0
  if (index >= CITY_SLOTS.length) return Infinity // iskeleler sehir halkasi degil
  return Math.ceil(index / 4)
}

/*
 * LIMAN İSKELELERİ — belediyenin altindaki kiyida, iki tane yan yana.
 */
export const QUAY_COUNT = 2
const QUAY_CELLS: [number, number][] = [[HALL.col - 1.4, HALL.row + 1.6], [HALL.col + 1.4, HALL.row + 1.6]]
const QUAY_SLOTS = QUAY_CELLS.map(([col, row]) => ({ zone: 'liman' as const, ...gridPos(col, row) }))

export const SLOTS: Slot[] = (USES_MEASURED
  ? MEASURED.map(m => ({ zone: m.zone, x: m.x, y: m.y }))
  : [...CITY_SLOTS, ...QUAY_SLOTS]
).map((slot, index) => ({ index, zone: slot.zone, x: slot.x, y: slot.y }))

/** Belediye arsasinin indeksi: her zaman merkez, CAKILI. */
export const CENTER_PLOT = 0

/*
 * YOLLAR — oyuncunun kendi dosedigi.
 *
 * Yol hucreleri, render katmanindaki (phaser-city) izometrik zemin izgarasinda
 * yasar: kimlik "gx,gy" bir izgara hucresidir. Bu dosya (ve motor) izgaranin
 * dunya konusunu bilmez; yalnizca kimligin BICIMINI dogrular. Boylece kayit
 * dogrulamasi cizim izgarasina baglanmaz - phaser gecerli hucreler uretir,
 * bozuk bir kayit da en fazla yersiz bir yol karosu olur.
 */
export function isRoadCell(id: string): boolean {
  return /^-?\d{1,3},-?\d{1,3}$/.test(id)
}

/** Baslangic yollari yok: sehir sifirdan, yolu oyuncu doser. */
export const START_ROADS: string[] = []

/**
 * KARA sehrin dis sinirlari (yalnizca 'sehir' arsalari).
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
 * CIZILEN her seyin disina tasmadigi pay (sur kalinligi dahil).
 */
export const DRAWN_PAD = { platform: 5, wallInner: 5.5, wallMax: 5.5 + 1.1 + 5 * 0.38 }

/**
 * Sehri ceviren SEKIZGEN. Sur, zemin ve rihtim ayni sekilden farkli paylarla
 * turer - izgara degistiginde hepsi birlikte degisir.
 */
export function cityOutline(pad = 0) {
  const b = cityBounds()
  const l = b.left - pad, r = b.right + pad
  const t = b.top - pad / 2, d = b.bottom + pad / 2
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
