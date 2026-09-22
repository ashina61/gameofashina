/**
 * CANLI ŞEHİR ADAPTÖRÜ — eski motor "plot index" ↔ yeni city-map slotu.
 *
 * Motor (lib/game/engine.ts) yerleşimi hâlâ SAYISAL bir arsa indeksiyle tutar
 * (placement: Record<BuildingId, number|null>) ve bütün ekonomi/inşaat/kayıt
 * mantığı buna dayanır. Bu adaptör, motorun indeks düzenini yeni city-slots.json
 * geometrisine BAĞLAR — motoru, kayıt biçimini, testleri değiştirmeden.
 *
 * SIRALI arsa listesi (motorun gördüğü index uzayı):
 *   index 0        → belediye (city_hall) · zone 'sehir' · ÇAKILI
 *   index 1..24    → 24 taşınabilir city slotu · zone 'sehir'
 *   index 25..30   → 6 kıyı (coast) slotu · zone 'liman'
 * Savunma (defense) slotları MOTOR ARSASI DEĞİLDİR: yalnızca zeminde boş temel
 * olarak görünür (sur/kule/kapı yok). Böylece motor onlara asla bina koymaz.
 *
 * Eski kayıtlardaki indeksler (eski 25 arsalı düzen) parseSave→fillMissing ile
 * bölgeye göre yeniden yerleştirilir: kara binaları kendi index'ini korur ve
 * karşılık gelen yeni city slotuna oturur; liman binaları boş bir coast slotuna
 * taşınır. Bina kaybı/çiftlenmesi olmaz (bkz. engine.fillMissing).
 */
import { CITY_SLOTS, COAST_SLOTS, HALL_SLOT_ID, TILE, type CitySlot } from './index'

/** Motorun bölge tipi (layout.Zone ile birebir). */
export type LiveZone = 'sehir' | 'liman'

export type LiveSlot = {
  /** Motorun kullandığı sıralı arsa indeksi. */
  index: number
  /** city-slots.json slot kimliği. */
  slotId: string
  zone: LiveZone
  fixed: boolean
  /** İzometrik ekran merkezi (dünya pikseli) — render bunu kullanır. */
  screen: { x: number; y: number }
  gx: number
  gy: number
  fw: number
  fh: number
  /** Motor layout'u için normalize edilmiş yüzde konum (city-render % modeli). */
  pct: { x: number; y: number }
}

/** Belediye (çakılı) slotu. */
const HALL = CITY_SLOTS.find(s => s.id === HALL_SLOT_ID)!
/** 24 taşınabilir city slotu (json sırasında). */
const MOVABLE_CITY: CitySlot[] = CITY_SLOTS.filter(s => !s.fixed)

/** Sıralı kaynak: belediye, sonra taşınabilir city, sonra coast. */
const ORDERED: { slot: CitySlot; zone: LiveZone }[] = [
  { slot: HALL, zone: 'sehir' },
  ...MOVABLE_CITY.map(slot => ({ slot, zone: 'sehir' as const })),
  ...COAST_SLOTS.map(slot => ({ slot, zone: 'liman' as const })),
]

/*
 * YÜZDE NORMALİZASYONU (motor layout'u + city-render % modeli için).
 *
 * Motorun eski dünyası yerleşimi YÜZDE olarak tutar ve city-render bunu dünya
 * pikseline çevirir; engine.test bu değişmezleri (0<toWorldX<WORLD, tekil
 * (x,y)) doğrular. Yeni slotların ekran koordinatlarını [8,92] yüzde kutusuna
 * doğrusal taşıyoruz: tekillik ve sıra korunur, motor mantığı % ile çalışmaya
 * devam eder. (Render bu yüzdeyi KULLANMAZ; doğrudan screen'i kullanır.)
 */
const XS = ORDERED.map(o => o.slot.screen.x)
const YS = ORDERED.map(o => o.slot.screen.y)
const MINX = Math.min(...XS), MAXX = Math.max(...XS)
const MINY = Math.min(...YS), MAXY = Math.max(...YS)
const spanX = MAXX - MINX || 1, spanY = MAXY - MINY || 1
const toPct = (x: number, y: number) => ({
  x: 8 + ((x - MINX) / spanX) * 84,
  y: 8 + ((y - MINY) / spanY) * 84,
})

export const LIVE_SLOTS: LiveSlot[] = ORDERED.map((o, index) => ({
  index,
  slotId: o.slot.id,
  zone: o.zone,
  fixed: o.slot.fixed,
  screen: { x: o.slot.screen.x, y: o.slot.screen.y },
  gx: o.slot.gx,
  gy: o.slot.gy,
  fw: o.slot.fw,
  fh: o.slot.fh,
  pct: toPct(o.slot.screen.x, o.slot.screen.y),
}))

/** Belediye arsasının indeksi: her zaman 0, çakılı merkez. */
export const LIVE_HALL_INDEX = 0
export const LIVE_TILE_W = TILE.w

const BY_INDEX = new Map(LIVE_SLOTS.map(s => [s.index, s]))
const BY_SLOT_ID = new Map(LIVE_SLOTS.map(s => [s.slotId, s]))

export function liveSlotByIndex(index: number | null | undefined): LiveSlot | undefined {
  return index == null ? undefined : BY_INDEX.get(index)
}
export function liveIndexBySlotId(slotId: string): number | undefined {
  return BY_SLOT_ID.get(slotId)?.index
}

/** Motor bölgesi 'liman' olan (kıyı) arsa mı? */
export function isCoastIndex(index: number): boolean {
  return BY_INDEX.get(index)?.zone === 'liman'
}
