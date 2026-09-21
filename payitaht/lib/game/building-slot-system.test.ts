import { test } from 'node:test'
import assert from 'node:assert/strict'
import { BuildingSlotSystem } from './building-slot-system'
import { SLOTS, CITY_SLOTS, COAST_SLOTS, DEFENSE_SLOTS, HALL_SLOT_ID, slotById, footprintDiamond } from './city-map'

test('harita: 24 normal city slotu + belediye + kıyı + savunma', () => {
  assert.ok(CITY_SLOTS.length >= 25, `city slotları >= 25 olmalı, bulundu ${CITY_SLOTS.length}`)
  const normal = CITY_SLOTS.filter(s => !s.fixed)
  assert.ok(normal.length >= 24, `en az 24 taşınabilir city slotu, bulundu ${normal.length}`)
  assert.equal(slotById(HALL_SLOT_ID)?.fixed, true, 'belediye slotu çakılı olmalı')
  assert.ok(COAST_SLOTS.length >= 1)
  assert.ok(DEFENSE_SLOTS.length >= 1)
})

test('bütün normal city slotları BİREBİR aynı footprint ve yön', () => {
  const { fw, fh } = CITY_SLOTS[0]
  for (const s of CITY_SLOTS) {
    assert.equal(s.fw, fw, `${s.id} footprint genişliği farklı`)
    assert.equal(s.fh, fh, `${s.id} footprint yüksekliği farklı`)
  }
  // Footprint elması her slotta AYNI şekil/ölçü (yalnızca konum kayar).
  const shape = (id: string) => {
    const s = slotById(id)!
    const d = footprintDiamond(s)
    return d.map(p => ({ x: p.x - s.screen.x, y: p.y - s.screen.y })) // merkeze göreli
  }
  const ref = JSON.stringify(shape(CITY_SLOTS[0].id))
  for (const s of CITY_SLOTS) {
    assert.equal(JSON.stringify(shape(s.id)), ref, `${s.id} footprint şekli farklı`)
  }
})

test('placeBuilding / getEmptySlots / buildingAt', () => {
  const sys = new BuildingSlotSystem()
  const empties = sys.getEmptySlots('city').length
  const a = CITY_SLOTS[1].id
  assert.equal(sys.placeBuilding('saray', a), true)
  assert.equal(sys.buildingAt(a), 'saray')
  assert.equal(sys.slotOf('saray')?.id, a)
  assert.equal(sys.getEmptySlots('city').length, empties - 1)
  // Dolu slota başka bina konmaz.
  assert.equal(sys.placeBuilding('kisla', a), false)
  // Geçersiz slot reddedilir.
  assert.equal(sys.placeBuilding('kisla', 'yok_boyle_slot'), false)
})

test('moveBuilding: boş slota taşır, doluya/uyumsuza taşımaz', () => {
  const sys = new BuildingSlotSystem(SLOTS, { saray: CITY_SLOTS[0].id, kisla: CITY_SLOTS[1].id })
  const empty = CITY_SLOTS[5].id
  assert.equal(sys.moveBuilding('saray', empty), true)
  assert.equal(sys.slotOf('saray')?.id, empty)
  // Dolu slota taşınmaz.
  assert.equal(sys.moveBuilding('saray', CITY_SLOTS[1].id), false)
  // Tip uyumsuz (city -> coast) taşınmaz.
  assert.equal(sys.moveBuilding('saray', COAST_SLOTS[0].id), false)
  // Kurulu olmayan bina taşınmaz.
  assert.equal(sys.moveBuilding('hamam', empty), false)
})

test('swapBuildings: iki binayı yer değiştirir', () => {
  const A = CITY_SLOTS[0].id, B = CITY_SLOTS[1].id
  const sys = new BuildingSlotSystem(SLOTS, { saray: A, kisla: B })
  assert.equal(sys.swapBuildings(A, B), true)
  assert.equal(sys.buildingAt(A), 'kisla')
  assert.equal(sys.buildingAt(B), 'saray')
  // Biri boşsa basit taşımaya döner.
  const C = CITY_SLOTS[2].id
  assert.equal(sys.swapBuildings(B, C), true) // B'de saray vardı, C boş
  assert.equal(sys.buildingAt(C), 'saray')
  assert.equal(sys.buildingAt(B), null)
  // Farklı tip slotlar takas edilmez.
  assert.equal(sys.swapBuildings(A, COAST_SLOTS[0].id), false)
})

test('removeBuilding', () => {
  const sys = new BuildingSlotSystem(SLOTS, { saray: CITY_SLOTS[0].id })
  assert.equal(sys.removeBuilding('saray'), true)
  assert.equal(sys.buildingAt(CITY_SLOTS[0].id), null)
  assert.equal(sys.removeBuilding('saray'), false)
})

test('randomize invaryantı: her normal bina her normal slota geçerli oturur', () => {
  // Debug "Randomize" ne yaparsa yapsın, sonuç HEP geçerli olmalı: her bina
  // benzersiz bir city slotunda ve footprint aynı.
  const buildings = ['saray', 'kisla', 'medrese', 'carsi', 'ambar', 'hamam', 'konut', 'kereste', 'tas']
  const sys = new BuildingSlotSystem()
  const movable = CITY_SLOTS.filter(s => !s.fixed)
  buildings.forEach((b, i) => assert.equal(sys.placeBuilding(b, movable[i].id), true))
  // Deterministik "karıştır": her binayı bir sonraki slota kaydır (swap zinciri).
  for (let i = 0; i < buildings.length; i++) {
    const from = sys.slotOf(buildings[i])!.id
    const to = movable[(i + 3) % movable.length].id
    sys.swapBuildings(from, to)
  }
  const used = new Set<string>()
  for (const b of buildings) {
    const s = sys.slotOf(b)
    assert.ok(s, `${b} bir slotta olmalı`)
    assert.equal(s!.type, 'city')
    assert.equal(used.has(s!.id), false, 'iki bina aynı slotta olamaz')
    used.add(s!.id)
  }
})
