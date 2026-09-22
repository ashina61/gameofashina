import { test } from 'node:test'
import assert from 'node:assert/strict'
import { LIVE_SLOTS, LIVE_HALL_INDEX, liveSlotByIndex, liveIndexBySlotId, isCoastIndex } from './live-adapter'
import { HALL_SLOT_ID, CITY_MAP } from './index'
import { initialGame, parseSave, BUILDING_IDS, PLOTS, zoneOf, type BuildingId } from '../engine'

const now = 1_700_000_000_000

test('adaptör: sıralı arsa uzayı (belediye + 24 city + 6 coast)', () => {
  // 1 belediye + 24 taşınabilir city + 6 coast = 31 motor arsası.
  assert.equal(LIVE_SLOTS.length, 31)
  assert.ok(LIVE_SLOTS.every((s, i) => s.index === i), 'indeksler ardışık')
  const sehir = LIVE_SLOTS.filter(s => s.zone === 'sehir')
  const liman = LIVE_SLOTS.filter(s => s.zone === 'liman')
  assert.equal(sehir.length, 25, '1 belediye + 24 taşınabilir')
  assert.equal(liman.length, 6, '6 coast')
})

test('adaptör: belediye index 0, city_hall, çakılı, merkez (50,70)', () => {
  const hall = LIVE_SLOTS[LIVE_HALL_INDEX]
  assert.equal(hall.index, 0)
  assert.equal(hall.slotId, HALL_SLOT_ID)
  assert.equal(hall.zone, 'sehir')
  assert.equal(hall.fixed, true)
  assert.equal(hall.gx, CITY_MAP.center.gx)
  assert.equal(hall.gy, CITY_MAP.center.gy)
})

test('adaptör: index ↔ slotId gidiş-dönüş tutarlı', () => {
  for (const s of LIVE_SLOTS) {
    assert.equal(liveIndexBySlotId(s.slotId), s.index)
    assert.equal(liveSlotByIndex(s.index)?.slotId, s.slotId)
  }
  assert.equal(liveSlotByIndex(null), undefined)
  assert.equal(liveSlotByIndex(999), undefined)
})

test('adaptör: coast slotları liman bölgesi olarak işaretli', () => {
  assert.ok(LIVE_SLOTS.filter(s => isCoastIndex(s.index)).length === 6)
  assert.ok(!isCoastIndex(0))
})

test('adaptör: yüzde konumlar tekil ve (0,100) aralığında', () => {
  const keys = LIVE_SLOTS.map(s => `${s.pct.x.toFixed(2)},${s.pct.y.toFixed(2)}`)
  assert.equal(new Set(keys).size, keys.length, 'yüzde konumlar tekil olmalı')
  assert.ok(LIVE_SLOTS.every(s => s.pct.x > 0 && s.pct.x < 100 && s.pct.y > 0 && s.pct.y < 100))
})

test('motor arsaları adaptörle aynı bölge ve sıradadır', () => {
  // engine PLOTS = layout SLOTS, adaptörden türer.
  assert.equal(PLOTS.length, LIVE_SLOTS.length)
  assert.ok(PLOTS.every((p, i) => p.zone === LIVE_SLOTS[i].zone))
})

/*
 * KAYIT GÖÇÜ (#11): eski düzenden gelen indeksler bina KAYBI/ÇİFTLENMESİ
 * olmadan yeni city slotlarına deterministik biçimde taşınır.
 */
test('göç: eski liman indeksleri (23/24) yeni coast slotuna taşınır, kayıp yok', () => {
  const g = initialGame(now)
  g.buildings.divan = 3
  g.buildings.liman = 1
  g.buildings.tersane = 1
  // Eski düzende 23/24 liman iskeleleriydi; yeni düzende bunlar KARA (sehir)
  // slotları — fillMissing bunları boş bir coast slotuna taşımalı.
  g.placement.liman = 23
  g.placement.tersane = 24
  const parsed = parseSave(JSON.stringify(g))

  // Hiçbir bina kaybolmadı: seviyesi>0 olan her yapı hâlâ yerleşik.
  for (const id of BUILDING_IDS) {
    if (g.buildings[id] > 0 && id !== 'surlar') {
      assert.notEqual(parsed.placement[id], null, `${id} yerleşimi kaybolmamalı`)
    }
  }
  // Liman/tersane artık liman (coast) bölgesinde.
  assert.equal(PLOTS[parsed.placement.liman!].zone, 'liman')
  assert.equal(PLOTS[parsed.placement.tersane!].zone, 'liman')
  // Belediye hâlâ merkez arsada (0).
  assert.equal(parsed.placement.divan, 0)
  // Çiftlenme yok: her arsa en fazla bir binada.
  const placed = BUILDING_IDS.map(id => parsed.placement[id]).filter((p): p is number => p !== null)
  assert.equal(new Set(placed).size, placed.length)
})

test('göç: yeni düzen kaydı olduğu gibi yeniden yüklenir (idempotent)', () => {
  const g = initialGame(now)
  const parsed = parseSave(JSON.stringify(g))
  assert.deepEqual(parsed.placement, g.placement)
  // Kara başlangıç binaları sehir, hiçbiri liman değil.
  const land: BuildingId[] = ['divan', 'konut', 'kereste', 'tas', 'ambar']
  for (const id of land) assert.equal(PLOTS[g.placement[id]!].zone, zoneOf(id))
})
