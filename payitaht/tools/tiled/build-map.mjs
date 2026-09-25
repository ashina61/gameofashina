/**
 * PAYİTAHT ŞEHİR HARİTASI ÜRETECİ (Tiled uyumlu) — FİNAL organik yerleşim.
 *
 *   node tools/tiled/build-map.mjs
 *
 * İki dosya üretir, ikisi de SENKRON:
 *   1) maps/payitaht/payitaht_city.tmj  — Tiled Map Editor'ün açtığı harita.
 *   2) lib/game/city-map/city-slots.json — oyunun okuduğu SADE slot verisi
 *      (gx/gy kare koordinatı + hazır ekran merkezi + yol grafiği).
 *
 * TASARIM: Ikariam yoğunluğunda KOMPAKT, dikey telefona uygun şehir. Belediye
 * haritanın geometrik merkezinde çakılı; 24 normal city slotu belediyenin
 * çevresinde kaydırmalı (tuğla) bir kafeste, aralarında yalnızca dar sokaklar
 * kalacak şekilde toplanır (hafif organik sarsıntıyla). Hemen altta dalgalı
 * liman hattı (coast); şehri sıkıca saran boş savunma temel hattı. Boşluğu
 * şehir değil manzara (orman/deniz) doldurur — bkz. terrain-builder.
 *
 * DEĞİŞMEZLER: bütün normal city slotları BİREBİR 2x2 footprint (küçük/orta/
 * büyük YOK). BuildingSlotSystem ve footprint standardına dokunulmaz.
 *
 * ÖNEMLİ: Burada ARTWORK üretilmez; ROADS için de yalnızca GRAF/PATH üretilir.
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
const FOOT = 2 // her slot 2x2 karo taban (DEĞİŞMEZ)
const CENTER = { gx: 50, gy: 70 } // BELEDİYE: haritanın geometrik merkezi (100/2, 140/2)

// --- İZOMETRİK EKRAN DÖNÜŞÜMÜ (karo merkezi -> piksel) --------------------
const screenX = (gx, gy) => Math.round((gx - gy) * (TILE_W / 2))
const screenY = (gx, gy) => Math.round((gx + gy) * (TILE_H / 2))
const withScreen = (o) => ({ ...o, screen: { x: screenX(o.gx, o.gy), y: screenY(o.gx, o.gy) } })

/*
 * IKARIAM ŞEHRİ: arsalar izometrik eksenlerde (gx, gy) geniş bir kafese oturur
 * ve belediyenin çevresinde, dikeyde biraz uzun OVAL bir alana yayılır. Satır
 * ya da şerit yok; şehir her yöne eşit büyür. Kafes adımı 7 karo: arsalar
 * arasında 5 karoluk çayır/patika kalır. Hafif sarsıntı organik görünüm verir.
 */
const S = 7
const RX = 1150, RY = 1400 // oval (ekran pikseli)
let seed = 7331
const rnd = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff }
const cands = []
for (let a = -5; a <= 5; a++) for (let b = -5; b <= 5; b++) {
  if (a === 0 && b === 0) continue
  const x = S * (a - b) * 64, y = S * (a + b) * 32
  cands.push({ a, b, x, y, r: (x / RX) ** 2 + (y / RY) ** 2 })
}
cands.sort((p, q) => p.r - q.r || p.y - q.y || p.x - q.x)
const CITY_CELLS = cands.slice(0, 24)
if (CITY_CELLS.length !== 24) throw new Error('24 arsa bekleniyordu')
// Sıra = belediyeye uzaklık (motor arsaları bu sırayla açar).
CITY_CELLS.sort((p, q) => p.r - q.r || p.y - q.y || p.x - q.x)

// --- SLOTLAR --------------------------------------------------------------
const slots = []
slots.push(withScreen({ id: 'city_hall', type: 'city', gx: CENTER.gx, gy: CENTER.gy, fw: FOOT, fh: FOOT, fixed: true }))
const cellId = new Map([['0,0', 'city_hall']])
CITY_CELLS.forEach((c, i) => {
  const id = `city_${String(i + 1).padStart(2, '0')}`
  const jx = Math.round((rnd() - 0.5) * 2), jy = Math.round((rnd() - 0.5) * 2) // ±1 karo
  slots.push(withScreen({ id, type: 'city', gx: CENTER.gx + S * c.a + jx, gy: CENTER.gy + S * c.b + jy, fw: FOOT, fh: FOOT, fixed: false }))
  cellId.set(`${c.a},${c.b}`, id)
})
const toGrid = (dx, dy) => {
  let d = Math.round(dx / 64), sgn = Math.round(dy / 32)
  if (((sgn + d) % 2 + 2) % 2 === 1) sgn += 1
  return { gx: CENTER.gx + (sgn + d) / 2, gy: CENTER.gy + (sgn - d) / 2 }
}
const cityPts = slots.map(s => ({ x: s.screen.x - slots[0].screen.x, y: s.screen.y - slots[0].screen.y }))
const minX = Math.min(...cityPts.map(p => p.x)), maxX = Math.max(...cityPts.map(p => p.x))
const minY = Math.min(...cityPts.map(p => p.y)), maxY = Math.max(...cityPts.map(p => p.y))

/*
 * KIYI: limanda üç deniz arsası, şehrin altında.
 */
const COAST_PX = [[-560, maxY + 430], [0, maxY + 470], [560, maxY + 430]]
COAST_PX.forEach(([x, y], i) => {
  slots.push(withScreen({ id: `coast_${String(i + 1).padStart(2, '0')}`, type: 'coast', ...toGrid(x, y), fw: FOOT, fh: FOOT, fixed: false }))
})

/*
 * SAVUNMA: ovali saran sekizgen sur; kule yuvaları köşelerde.
 */
const L = minX - 300, R = maxX + 300, T = minY - 420, B = maxY + 240
const px = (x, y) => [x / 64, y / 32]
const ringPt = ([dRel, sRel]) => {
  const d = -20 + dRel, s = 120 + sRel
  return withScreen({ gx: (s + d) / 2, gy: (s - d) / 2 })
}
const DEFENSE_ANCHORS = [
  { id: 'defense_tower_top', at: px(0, T) },
  { id: 'defense_tower_left', at: px(L, (T + B) / 2) },
  { id: 'defense_tower_right', at: px(R, (T + B) / 2) },
  { id: 'defense_tower_bottom', at: px(L * 0.62, B) },
  { id: 'defense_gate', at: px(R * 0.62, B) },
]
DEFENSE_ANCHORS.forEach(({ id, at }) => {
  const p = ringPt(at)
  slots.push(withScreen({ id, type: 'defense', gx: p.gx, gy: p.gy, fw: FOOT, fh: FOOT, fixed: true }))
})
const foundationPts = [
  px(0, T), px(R * 0.62, T + (B - T) * 0.12), px(R, (T + B) / 2), px(R * 0.62, B), px(0, B + 40),
  px(L * 0.62, B), px(L, (T + B) / 2), px(L * 0.62, T + (B - T) * 0.12),
].map(ringPt)

// --- YOL AĞACI -----------------------------------------------------------
/*
 * Ikariam patikaları: yollar binadan binaya, izometrik eksenler boyunca uzanır.
 * Aday kenarlar kafeste yan yana duran arsalardır (a±1 ya da b±1); oyun
 * belediyeden açık arsalara giden en kısa ağacı gösterir (road-tree). En alt
 * arsalardan biri kapıdan limana iner; iskeleler rıhtım boyunca bağlanır.
 */
const citySlots = slots.filter(s => s.type === 'city')
const coastSlots = slots.filter(s => s.type === 'coast')
const street = new Map()
const edges = []
const cellsAll = [{ a: 0, b: 0 }, ...CITY_CELLS]
for (const c of cellsAll) {
  for (const [da, db] of [[1, 0], [0, 1]]) {
    const to = cellId.get(`${c.a + da},${c.b + db}`)
    if (to) edges.push({ from: cellId.get(`${c.a},${c.b}`), to })
  }
}
const coastSorted = [...coastSlots].sort((a, b) => a.screen.x - b.screen.x)
const mid = coastSorted[Math.floor(coastSorted.length / 2)]
const bottomPlot = [...citySlots].sort((p, q) => (q.screen.y - Math.abs(q.screen.x - mid.screen.x) * 0.3) - (p.screen.y - Math.abs(p.screen.x - mid.screen.x) * 0.3))[0]
const gateNode = withScreen({ id: 'st_gate', ...toGrid((bottomPlot.screen.x + mid.screen.x) / 2 - slots[0].screen.x, (bottomPlot.screen.y + mid.screen.y) / 2 - slots[0].screen.y) })
street.set('gate', gateNode)
edges.push({ from: bottomPlot.id, to: gateNode.id })
edges.push({ from: gateNode.id, to: mid.id })
for (let i = 0; i + 1 < coastSorted.length; i++) edges.push({ from: coastSorted[i].id, to: coastSorted[i + 1].id })

const roadNodes = [...citySlots, ...coastSlots, ...[...street.values()].map(withScreen)]
  .map(s => ({ id: s.id, gx: s.gx, gy: s.gy, screen: s.screen }))
const nodeById = new Map(roadNodes.map(n => [n.id, n]))
const roadEdges = edges.map((e, i) => {
  const A = nodeById.get(e.from), B = nodeById.get(e.to)
  const mid = { x: (A.screen.x + B.screen.x) / 2, y: (A.screen.y + B.screen.y) / 2 }
  const dx = B.screen.x - A.screen.x, dy = B.screen.y - A.screen.y
  const len = Math.hypot(dx, dy) || 1
  // Sokaklar düz; yalnızca kapı yolu ve rıhtım hafifçe kıvrılır.
  const bend = (i % 2 === 0 ? 1 : -1) * len * 0.06 // hafif kıvrım: yollar cetvelle çizilmiş gibi durmasın
  return { from: e.from, to: e.to, ctrl: { x: Math.round(mid.x + (-dy / len) * bend), y: Math.round(mid.y + (dx / len) * bend) } }
})

// --- Şehir sınırları (rapor + kamera) ------------------------------------
const bounds = (arr) => ({
  minGx: Math.min(...arr.map(s => s.gx)), maxGx: Math.max(...arr.map(s => s.gx)),
  minGy: Math.min(...arr.map(s => s.gy)), maxGy: Math.max(...arr.map(s => s.gy)),
  minX: Math.min(...arr.map(s => s.screen.x)), maxX: Math.max(...arr.map(s => s.screen.x)),
  minY: Math.min(...arr.map(s => s.screen.y)), maxY: Math.max(...arr.map(s => s.screen.y)),
})
const cityBounds = bounds(slots.filter(s => s.type !== 'defense'))

// --- 1) city-slots.json (oyun tarafı) ------------------------------------
const citySlotsJson = {
  generatedBy: 'tools/tiled/build-map.mjs',
  tile: { w: TILE_W, h: TILE_H },
  map: { w: MAP_W, h: MAP_H, orientation: 'isometric' },
  footprint: { w: FOOT, h: FOOT },
  center: withScreen({ gx: CENTER.gx, gy: CENTER.gy }),
  hallSlotId: 'city_hall',
  bounds: cityBounds,
  slots,
  defenseFoundation: foundationPts,
  roadGraph: { nodes: roadNodes, edges: roadEdges },
}
mkdirSync(join(ROOT, 'lib/game/city-map'), { recursive: true })
writeFileSync(join(ROOT, 'lib/game/city-map/city-slots.json'), JSON.stringify(citySlotsJson, null, 2) + '\n')

// --- 2) payitaht_city.tmj (Tiled editör) ---------------------------------
const emptyLayerData = deflateSync(Buffer.alloc(MAP_W * MAP_H * 4)).toString('base64')
let layerId = 0
const nextLayerId = () => ++layerId
let objectId = 0
const nextObjectId = () => ++objectId
const objUnit = TILE_H // Tiled izometrik nesne birimi = tileheight (her iki eksende)

const tileLayer = (name) => ({
  id: nextLayerId(), name, type: 'tilelayer', visible: true, opacity: 1, x: 0, y: 0,
  width: MAP_W, height: MAP_H, encoding: 'base64', compression: 'zlib', data: emptyLayerData,
})
const slotObject = (s) => ({
  id: nextObjectId(), name: s.id, type: s.type,
  x: (s.gx - s.fw / 2) * objUnit, y: (s.gy - s.fh / 2) * objUnit,
  width: s.fw * objUnit, height: s.fh * objUnit, visible: true, rotation: 0,
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
const objectLayer = (name, objects) => ({
  id: nextLayerId(), name, type: 'objectgroup', visible: true, opacity: 1, x: 0, y: 0, draworder: 'topdown', objects,
})

const foundationObject = {
  id: nextObjectId(), name: 'defense_foundation', type: 'foundation', x: 0, y: 0, visible: true, rotation: 0,
  polygon: [...foundationPts, foundationPts[0]].map(p => ({ x: p.gx * objUnit, y: p.gy * objUnit })),
  properties: [{ name: 'note', type: 'string', value: 'Boş savunma temel hattı / hendek. Sur/kule/kapı sonradan defense assetleri olarak yerleşir.' }],
}
// Yol grafiği DEBUG katmanında polyline olarak (Tiled'da görülsün).
const roadObjects = roadEdges.map(e => {
  const A = nodeById.get(e.from), B = nodeById.get(e.to)
  return {
    id: nextObjectId(), name: `road_${e.from}_${e.to}`, type: 'road', x: 0, y: 0, visible: true, rotation: 0,
    polyline: [
      { x: A.gx * objUnit, y: A.gy * objUnit },
      { x: B.gx * objUnit, y: B.gy * objUnit },
    ],
    properties: [{ name: 'from', type: 'string', value: e.from }, { name: 'to', type: 'string', value: e.to }],
  }
})

const map = {
  type: 'map', version: '1.10', tiledversion: '1.10.2',
  orientation: 'isometric', renderorder: 'right-down', infinite: false,
  width: MAP_W, height: MAP_H, tilewidth: TILE_W, tileheight: TILE_H,
  nextlayerid: 0, nextobjectid: 0, tilesets: [],
  properties: [
    { name: 'city', type: 'string', value: 'payitaht' },
    { name: 'footprint', type: 'string', value: `${FOOT}x${FOOT}` },
  ],
  layers: [
    tileLayer('GROUND'),
    tileLayer('ROADS'),
    objectLayer('BUILDING_SLOTS', slots.filter(s => s.type === 'city').map(slotObject)),
    objectLayer('COAST_SLOTS', slots.filter(s => s.type === 'coast').map(slotObject)),
    objectLayer('DEFENSE_FOUNDATION', [foundationObject, ...slots.filter(s => s.type === 'defense').map(slotObject)]),
    objectLayer('DECORATION', []),
    objectLayer('BUILDINGS', []),
    objectLayer('DEFENSE', []),
    objectLayer('DEBUG', roadObjects),
  ],
}
map.nextlayerid = layerId + 1
map.nextobjectid = objectId + 1

mkdirSync(join(ROOT, 'maps/payitaht'), { recursive: true })
writeFileSync(join(ROOT, 'maps/payitaht/payitaht_city.tmj'), JSON.stringify(map, null, 1) + '\n')

const n = (t) => slots.filter(s => s.type === t).length
console.log('Yazıldı: payitaht_city.tmj + city-slots.json')
console.log(`Harita ${MAP_W}x${MAP_H} @ ${TILE_W}x${TILE_H} iso · footprint ${FOOT}x${FOOT}`)
console.log(`Slotlar: city ${n('city')} (1 belediye + ${n('city') - 1} normal), coast ${n('coast')}, defense ${n('defense')}`)
console.log(`Şehir tile kutusu: gx ${cityBounds.minGx}..${cityBounds.maxGx} (${cityBounds.maxGx - cityBounds.minGx}), gy ${cityBounds.minGy}..${cityBounds.maxGy} (${cityBounds.maxGy - cityBounds.minGy})`)
console.log(`Ekran kutusu: ${cityBounds.maxX - cityBounds.minX} x ${cityBounds.maxY - cityBounds.minY} px · yol kenarı ${roadEdges.length}`)
