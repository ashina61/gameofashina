/**
 * PAYİTAHT ŞEHİR HARİTASI ÜRETECİ (Tiled uyumlu).
 *
 *   node tools/tiled/build-map.mjs
 *
 * İki dosya üretir, ikisi de SENKRON:
 *   1) maps/payitaht/payitaht_city.tmj  — Tiled Map Editor'ün açtığı harita
 *      (isometric, 128x64, ~100x140). Katmanlar + slot NESNELERİ burada.
 *   2) lib/game/city-map/city-slots.json — oyunun okuduğu SADE slot verisi
 *      (Tiled'ın izometrik nesne koordinat tuhaflığına bağlı kalmadan, gx/gy
 *      kare koordinatı + hesaplanmış ekran merkezi).
 *
 * Tek gerçek kaynak bu betiğin SPEC'idir; validate-map.mjs ikisinin uyumunu
 * (parity) CI'da denetler. Tiled'da elle düzenleme yapılırsa gx/gy/fw/fh
 * özellikleri korunmalı ve betik yeniden çalıştırılıp JSON güncellenmeli.
 *
 * ÖNEMLİ: Burada ARTWORK üretilmez. Yalnızca GEOMETRİK slot sistemi.
 */
import { deflateSync } from 'node:zlib'
import { writeFileSync, mkdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..')

// --- HARİTA ÖLÇÜLERİ ------------------------------------------------------
const TILE_W = 128
const TILE_H = 64
const MAP_W = 100
const MAP_H = 140

/*
 * STANDART FOOTPRINT: bütün normal binalar aynı 2x2 karo tabanına oturur.
 * Slotlar arasında 1 karoluk boşluk (yol payı) kalsın diye adım 3 karo.
 */
const FOOT = 2            // her slot 2x2 karo taban
const STEP = 3            // slot çapaları arası mesafe (karo)
const CENTER = { gx: 50, gy: 70 } // BELEDİYE: haritanın geometrik merkezi

// --- İZOMETRİK EKRAN DÖNÜŞÜMÜ (karo merkezi -> piksel) --------------------
const screenX = (gx, gy) => Math.round((gx - gy) * (TILE_W / 2))
const screenY = (gx, gy) => Math.round((gx + gy) * (TILE_H / 2))

// --- SLOT SPEC ------------------------------------------------------------
/*
 * ŞEHİR SLOTLARI: merkez etrafında 5x5 kare ızgara = 25 çapa. Merkez BELEDİYE,
 * kalan 24'ü normal city slotu. Hepsi BİREBİR aynı footprint (2x2) ve aynı
 * izometrik yön — bir bina hangisine taşınırsa taşınsın aynı oturur.
 */
const slots = []
let cityCount = 0
for (let j = -2; j <= 2; j++) {
  for (let i = -2; i <= 2; i++) {
    const gx = CENTER.gx + i * STEP
    const gy = CENTER.gy + j * STEP
    const isHall = i === 0 && j === 0
    slots.push({
      id: isHall ? 'city_hall' : `city_${String(++cityCount).padStart(2, '0')}`,
      type: 'city',
      gx, gy, fw: FOOT, fh: FOOT,
      fixed: isHall, // belediye çakılı
    })
  }
}

/*
 * KIYI SLOTLARI: haritanın altındaki denizde. Ticaret limanı, tersane, iskele
 * gibi DENİZ yapıları buraya kurulur (kara slotlarına değil).
 */
const coastAnchors = [[46, 82], [50, 82], [54, 82], [48, 85], [52, 85]]
coastAnchors.forEach(([gx, gy], k) => slots.push({
  id: `coast_${String(k + 1).padStart(2, '0')}`, type: 'coast', gx, gy, fw: FOOT, fh: FOOT, fixed: false,
}))

/*
 * SAVUNMA SLOTLARI: sur KULELERİ ve KAPI için, şehri çevreleyen hattın
 * köşelerinde ve altında. Arkaplanda hazır sur YOK; buraya sonradan defense
 * assetleri (kule/kapı) yerleşir.
 */
const defenseAnchors = [
  { id: 'defense_tower_n', gx: 41, gy: 61 },
  { id: 'defense_tower_e', gx: 59, gy: 61 },
  { id: 'defense_tower_s', gx: 59, gy: 79 },
  { id: 'defense_tower_w', gx: 41, gy: 79 },
  { id: 'defense_gate', gx: 59, gy: 71 },
]
defenseAnchors.forEach(a => slots.push({ ...a, type: 'defense', fw: FOOT, fh: FOOT, fixed: true }))

// Savunma TEMEL HATTI (boş sur hattı / hendek): köşe çapalarını birleştiren halka.
const defenseFoundation = [
  { gx: 41, gy: 61 }, { gx: 59, gy: 61 }, { gx: 59, gy: 79 }, { gx: 41, gy: 79 },
]

// Her slota ekran merkezini ekle (oyun bunu doğrudan kullanır).
for (const s of slots) s.screen = { x: screenX(s.gx, s.gy), y: screenY(s.gx, s.gy) }

// --- 1) city-slots.json (oyun tarafı) ------------------------------------
const citySlots = {
  generatedBy: 'tools/tiled/build-map.mjs',
  tile: { w: TILE_W, h: TILE_H },
  map: { w: MAP_W, h: MAP_H, orientation: 'isometric' },
  footprint: { w: FOOT, h: FOOT },
  center: { ...CENTER, screen: { x: screenX(CENTER.gx, CENTER.gy), y: screenY(CENTER.gx, CENTER.gy) } },
  hallSlotId: 'city_hall',
  slots,
  defenseFoundation: defenseFoundation.map(p => ({ ...p, screen: { x: screenX(p.gx, p.gy), y: screenY(p.gx, p.gy) } })),
}
mkdirSync(join(ROOT, 'lib/game/city-map'), { recursive: true })
writeFileSync(join(ROOT, 'lib/game/city-map/city-slots.json'), JSON.stringify(citySlots, null, 2) + '\n')

// --- 2) payitaht_city.tmj (Tiled editör) ---------------------------------
// Boş tile katmanı verisi: width*height 32-bit sıfır, zlib+base64.
const emptyLayerData = deflateSync(Buffer.alloc(MAP_W * MAP_H * 4)).toString('base64')
let layerId = 0
const nextLayerId = () => ++layerId
let objectId = 0
const nextObjectId = () => ++objectId

const tileLayer = (name) => ({
  id: nextLayerId(), name, type: 'tilelayer', visible: true, opacity: 1, x: 0, y: 0,
  width: MAP_W, height: MAP_H, encoding: 'base64', compression: 'zlib', data: emptyLayerData,
})

// Tiled izometrik nesne koordinatı: birim = tileheight, hem x hem y için.
const objUnit = TILE_H
const slotObject = (s) => ({
  id: nextObjectId(),
  name: s.id,
  type: s.type,
  // Sol-üst köşe = merkez çapadan yarım footprint geride.
  x: (s.gx - s.fw / 2) * objUnit,
  y: (s.gy - s.fh / 2) * objUnit,
  width: s.fw * objUnit,
  height: s.fh * objUnit,
  visible: true, rotation: 0,
  properties: [
    { name: 'slotId', type: 'string', value: s.id },
    { name: 'slotType', type: 'string', value: s.type },
    { name: 'gx', type: 'int', value: s.gx },
    { name: 'gy', type: 'int', value: s.gy },
    { name: 'fw', type: 'int', value: s.fw },
    { name: 'fh', type: 'int', value: s.fh },
    { name: 'fixed', type: 'bool', value: !!s.fixed },
  ],
})

const objectLayer = (name, objects, extra = {}) => ({
  id: nextLayerId(), name, type: 'objectgroup', visible: true, opacity: 1, x: 0, y: 0,
  draworder: 'topdown', objects, ...extra,
})

const buildingSlotObjects = slots.filter(s => s.type === 'city').map(slotObject)
const coastSlotObjects = slots.filter(s => s.type === 'coast').map(slotObject)
const defenseSlotObjects = slots.filter(s => s.type === 'defense').map(slotObject)

// Savunma temel hattı: kapalı bir polygon nesnesi (boş sur hattı).
const foundationObject = {
  id: nextObjectId(), name: 'defense_foundation', type: 'foundation',
  x: 0, y: 0, visible: true, rotation: 0,
  polygon: defenseFoundation.map(p => ({ x: p.gx * objUnit, y: p.gy * objUnit })),
  properties: [{ name: 'note', type: 'string', value: 'Boş savunma temel hattı / hendek. Sur/kule/kapı sonradan defense assetleri olarak yerleşir.' }],
}

const map = {
  type: 'map',
  version: '1.10',
  tiledversion: '1.10.2',
  orientation: 'isometric',
  renderorder: 'right-down',
  infinite: false,
  width: MAP_W, height: MAP_H,
  tilewidth: TILE_W, tileheight: TILE_H,
  nextlayerid: 0, // aşağıda düzeltilecek
  nextobjectid: 0,
  tilesets: [],
  properties: [
    { name: 'city', type: 'string', value: 'payitaht' },
    { name: 'footprint', type: 'string', value: `${FOOT}x${FOOT}` },
  ],
  layers: [
    tileLayer('GROUND'),
    tileLayer('ROADS'),
    objectLayer('BUILDING_SLOTS', buildingSlotObjects),
    objectLayer('COAST_SLOTS', coastSlotObjects),
    objectLayer('DEFENSE_FOUNDATION', [foundationObject, ...defenseSlotObjects]),
    objectLayer('DECORATION', []),
    objectLayer('BUILDINGS', []),
    objectLayer('DEFENSE', []),
    objectLayer('DEBUG', []),
  ],
}
map.nextlayerid = layerId + 1
map.nextobjectid = objectId + 1

mkdirSync(join(ROOT, 'maps/payitaht'), { recursive: true })
writeFileSync(join(ROOT, 'maps/payitaht/payitaht_city.tmj'), JSON.stringify(map, null, 1) + '\n')

const nCity = slots.filter(s => s.type === 'city').length
const nCoast = slots.filter(s => s.type === 'coast').length
const nDef = slots.filter(s => s.type === 'defense').length
console.log(`Yazıldı: maps/payitaht/payitaht_city.tmj + lib/game/city-map/city-slots.json`)
console.log(`Harita ${MAP_W}x${MAP_H} @ ${TILE_W}x${TILE_H} iso · footprint ${FOOT}x${FOOT}`)
console.log(`Slotlar: city ${nCity} (1 belediye + ${nCity - 1} normal), coast ${nCoast}, defense ${nDef}`)
