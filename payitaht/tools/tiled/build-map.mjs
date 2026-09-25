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
 * TASARIM: Ikariam gibi PLANLI kasaba. Belediye meydanın ortasında çakılı;
 * çevresinde oval bir çevre yolu, ortadan geçen kuzey-güney ana cadde. 24
 * arsa bu yolların kenarına dizilir; altta liman, çevrede kuleli sur.
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
 * IKARIAM ŞEHİR PLANI: bir MEYDAN, bir ANA CADDE ve bir ÇEVRE YOLU.
 *
 *   - Belediye meydanın ortasında. Ana cadde güneydeki kapıdan gelir,
 *     meydandan geçer ve kuzeydeki tepeye çıkar.
 *   - Meydanın çevresinde oval bir ÇEVRE YOLU döner. Arsalar bu yolun iki
 *     yanına dizilir: 6 iç arsa meydana bakar, 14 dış arsa yolun dışında
 *     sıralanır; 4 arsa da ana caddenin iki yakasında.
 *   - Her arsa yola kısa bir girişle bağlanır; arsalar birbirine bağlanmaz
 *     (yol ağı sade kalır, binalar sokakları "sıralar").
 *   - Sur, arsaların çevresinde sabit bir payla dolanan yuvarlatılmış bir
 *     halkadır; ana cadde güneydeki kapıdan çıkıp limana iner.
 *
 * Konumlar ekran pikseli (belediyeye göre); toGrid karoya oturtur.
 */
const toGrid = (dx, dy) => {
  let d = Math.round(dx / 64), sgn = Math.round(dy / 32)
  if (((sgn + d) % 2 + 2) % 2 === 1) sgn += 1
  return { gx: CENTER.gx + (sgn + d) / 2, gy: CENTER.gy + (sgn - d) / 2 }
}
const RING = { rx: 860, ry: 620 } // çevre yolu
const RING_N = 24
const ringAt = (deg, k = 1) => [Math.cos(deg * Math.PI / 180) * RING.rx * k, Math.sin(deg * Math.PI / 180) * RING.ry * k]

// İç arsalar (meydan çevresi): kuzey-güney ana caddeye açık.
const INNER = [0, 45, 135, 180, 225, 315].map(a => ({ at: ringAt(a, 0.55), ring: a }))
// Dış arsalar: çevre yolunun dışında, eşit aralıklı; cadde yönleri boş.
const OUTER = Array.from({ length: 14 }, (_, k) => 90 + (k + 0.5) * 360 / 14).map(a => ({ at: ringAt(a, 1.4), ring: a }))
// Ana caddenin iki yakası (güneyde kapıya, kuzeyde tepeye doğru).
const AVE_S = 1180, AVE_N = -1180
const AVENUE = [
  { at: [-300, AVE_S], ave: 's' }, { at: [300, AVE_S], ave: 's' },
  { at: [-300, AVE_N], ave: 'n' }, { at: [300, AVE_N], ave: 'n' },
]
const PLOTS = [...INNER, ...OUTER.sort((p, q) => rOf(p) - rOf(q)), ...AVENUE]
function rOf(p) { return (p.at[0] / 1204) ** 2 + (p.at[1] / 868) ** 2 + p.at[1] * 1e-6 }
if (PLOTS.length !== 24) throw new Error(`24 arsa bekleniyordu, ${PLOTS.length}`)

// --- SLOTLAR --------------------------------------------------------------
const slots = []
slots.push(withScreen({ id: 'city_hall', type: 'city', gx: CENTER.gx, gy: CENTER.gy, fw: FOOT, fh: FOOT, fixed: true }))
PLOTS.forEach((p, i) => {
  p.id = `city_${String(i + 1).padStart(2, '0')}`
  slots.push(withScreen({ id: p.id, type: 'city', ...toGrid(p.at[0], p.at[1]), fw: FOOT, fh: FOOT, fixed: false }))
})
const cityPts = slots.map(s => ({ x: s.screen.x - slots[0].screen.x, y: s.screen.y - slots[0].screen.y }))
const minX = Math.min(...cityPts.map(p => p.x)), maxX = Math.max(...cityPts.map(p => p.x))
const minY = Math.min(...cityPts.map(p => p.y)), maxY = Math.max(...cityPts.map(p => p.y))

/*
 * KIYI: limanda üç deniz arsası, şehrin altında.
 */
const COAST_PX = [[-560, maxY + 470], [0, maxY + 510], [560, maxY + 470]]
COAST_PX.forEach(([x, y], i) => {
  slots.push(withScreen({ id: `coast_${String(i + 1).padStart(2, '0')}`, type: 'coast', ...toGrid(x, y), fw: FOOT, fh: FOOT, fixed: false }))
})

/*
 * SUR: arsaları sabit payla saran yuvarlatılmış halka (süper-elips). Alt
 * kenar düzdür; kapı ana caddenin çıktığı yerde. Kule yuvaları köşelerde.
 */
const W_L = minX - 380, W_R = maxX + 380, W_T = minY - 430, W_B = maxY + 270
const W_CX = (W_L + W_R) / 2, W_CY = (W_T + W_B) / 2, W_RX = (W_R - W_L) / 2, W_RY = (W_B - W_T) / 2
const superPt = (t, e = 3.2) => {
  const c = Math.cos(t), s = Math.sin(t)
  return [W_CX + W_RX * Math.sign(c) * Math.abs(c) ** (2 / e), W_CY + W_RY * Math.sign(s) * Math.abs(s) ** (2 / e)]
}
const ringPt = ([x, y]) => withScreen({ ...toGridF(x, y) })
function toGridF(dx, dy) { const d = dx / 64, s = dy / 32; return { gx: CENTER.gx + (s + d) / 2, gy: CENTER.gy + (s - d) / 2 } }
const WALL_N = 28
const foundationPts = Array.from({ length: WALL_N }, (_, k) => ringPt(superPt(-Math.PI / 2 + k * 2 * Math.PI / WALL_N)))
const DEFENSE_ANCHORS = [
  { id: 'defense_tower_top', at: superPt(-Math.PI / 2) },
  { id: 'defense_tower_left', at: superPt(Math.PI) },
  { id: 'defense_tower_right', at: superPt(0) },
  { id: 'defense_tower_bottom', at: superPt(Math.PI * 0.72) },
  { id: 'defense_gate', at: superPt(Math.PI * 0.28) },
]
DEFENSE_ANCHORS.forEach(({ id, at }) => {
  slots.push(withScreen({ id, type: 'defense', ...toGrid(at[0], at[1]), fw: FOOT, fh: FOOT, fixed: true }))
})

// --- YOL AĞI --------------------------------------------------------------
const street = new Map() // id -> {gx, gy}
const edges = []
const node = (id, x, y) => { street.set(id, { id, ...toGridF(x, y) }); return id } // sokak düğümleri karoya oturtulmaz: kavisler pürüzsüz
// Çevre yolu.
const ringIds = Array.from({ length: RING_N }, (_, k) => node(`st_r${k}`, ...ringAt(k * 360 / RING_N)))
ringIds.forEach((id, k) => edges.push({ from: id, to: ringIds[(k + 1) % RING_N], ring: true }))
const ringNear = (deg) => ringIds[((Math.round(deg / (360 / RING_N)) % RING_N) + RING_N) % RING_N]
// Ana cadde: kapı -> güney çevre -> meydan (belediye) -> kuzey çevre -> tepe.
const south = ringNear(90), north = ringNear(270)
const gateY = W_B
node('st_ave_s', 0, (RING.ry + AVE_S) / 2)
node('st_ave_s2', 0, AVE_S)
node('st_gate', 0, gateY)
node('st_ave_n', 0, (-RING.ry + AVE_N) / 2)
node('st_ave_n2', 0, AVE_N)
edges.push({ from: 'city_hall', to: south }, { from: 'city_hall', to: north })
edges.push({ from: south, to: 'st_ave_s' }, { from: 'st_ave_s', to: 'st_ave_s2' }, { from: 'st_ave_s2', to: 'st_gate' })
edges.push({ from: north, to: 'st_ave_n' }, { from: 'st_ave_n', to: 'st_ave_n2' })
// Arsa girişleri.
for (const p of PLOTS) {
  if (p.ave) edges.push({ from: p.ave === 's' ? 'st_ave_s2' : 'st_ave_n2', to: p.id })
  else edges.push({ from: ringNear(p.ring), to: p.id })
}
// Kapıdan limana; rıhtım boyunca.
const coastSlots = slots.filter(s => s.type === 'coast')
const coastSorted = [...coastSlots].sort((a, b) => a.screen.x - b.screen.x)
edges.push({ from: 'st_gate', to: coastSorted[1].id })
for (let i = 0; i + 1 < coastSorted.length; i++) edges.push({ from: coastSorted[i].id, to: coastSorted[i + 1].id })

const citySlots = slots.filter(s => s.type === 'city')
const roadNodes = [...citySlots, ...coastSlots, ...[...street.values()].map(withScreen)]
  .map(s => ({ id: s.id, gx: s.gx, gy: s.gy, screen: s.screen }))
const nodeById = new Map(roadNodes.map(n => [n.id, n]))
const hall0 = slots[0].screen
const roadEdges = edges.map(e => {
  const A = nodeById.get(e.from), B = nodeById.get(e.to)
  const mid = { x: (A.screen.x + B.screen.x) / 2, y: (A.screen.y + B.screen.y) / 2 }
  if (!e.ring) return { from: e.from, to: e.to, ctrl: { x: Math.round(mid.x), y: Math.round(mid.y) } }
  // Çevre yolu kenarı elips boyunca kavis alır (kontrol noktası dışa doğru).
  const ax = (mid.x - hall0.x) / RING.rx, ay = (mid.y - hall0.y) / RING.ry
  const f = 2 / Math.max(0.5, Math.hypot(ax, ay)) - 1 // eğri orta noktası elipsin üstünde
  return { from: e.from, to: e.to, ctrl: { x: Math.round(hall0.x + (mid.x - hall0.x) * f), y: Math.round(hall0.y + (mid.y - hall0.y) * f) } }
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
