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
 * IKARIAM ŞEHİR PLANI: MEYDAN, DÖRT CADDE, ÇEVRE YOLU, LİMANI SARAN SUR.
 *
 *   - Belediye (Divanhane) taş döşeli oval MEYDANIN ortasında TEK başınadır;
 *     meydanda başka arsa yoktur.
 *   - Dört cadde meydana bağlanır: güney caddesi limana iner, kuzey, doğu ve
 *     batı caddeleri surdaki kara kapılarından çıkar.
 *   - Meydanın çevresinde oval bir ÇEVRE YOLU döner. 4 arsa yol ile meydan
 *     arasında (köşegenlerde), 16 arsa yolun dışında, 4 arsa da kuzey-güney
 *     caddesinin iki yakasında. Her arsanın yola kendi kısa girişi var.
 *   - SUR limanı ve tersaneyi de içine alır: alt kenarı denizde bir mendirek
 *     olarak uzanır, ortasında zincirli DENİZ KAPISI vardır.
 *
 * Konumlar ekran pikseli (belediyeye göre); toGrid karoya oturtur.
 */
const toGrid = (dx, dy) => {
  let d = Math.round(dx / 64), sgn = Math.round(dy / 32)
  if (((sgn + d) % 2 + 2) % 2 === 1) sgn += 1
  return { gx: CENTER.gx + (sgn + d) / 2, gy: CENTER.gy + (sgn - d) / 2 }
}
function toGridF(dx, dy) { const d = dx / 64, s = dy / 32; return { gx: CENTER.gx + (s + d) / 2, gy: CENTER.gy + (s - d) / 2 } }
const PLAZA = { rx: 440, ry: 320 } // taş meydan
const RING = { rx: 1000, ry: 720 } // çevre yolu
const RING_N = 24
const ringAt = (deg, k = 1) => [Math.cos(deg * Math.PI / 180) * RING.rx * k, Math.sin(deg * Math.PI / 180) * RING.ry * k]

// Meydan ile çevre yolu arası: yalnızca köşegenler (caddeler boş kalır).
const INNER = [45, 135, 225, 315].map(a => ({ at: ringAt(a, 0.74), ring: a }))
// Çevre yolunun dışı: eşit aralıklı 16 arsa, dört cadde yönü boş.
const OUTER = Array.from({ length: 16 }, (_, k) => 90 + (k + 0.5) * 360 / 16).map(a => ({ at: ringAt(a, 1.34), ring: a }))
// Kuzey-güney caddesinin iki yakası.
const AVE_S = 1330, AVE_N = -1330
const AVENUE = [
  { at: [-300, AVE_S], ave: 's' }, { at: [300, AVE_S], ave: 's' },
  { at: [-300, AVE_N], ave: 'n' }, { at: [300, AVE_N], ave: 'n' },
]
const rOf = (p) => (p.at[0] / 1340) ** 2 + (p.at[1] / 965) ** 2 + p.at[1] * 1e-6
const PLOTS = [...INNER, ...OUTER.sort((p, q) => rOf(p) - rOf(q)), ...AVENUE]
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
const coastMaxY = Math.max(...COAST_PX.map(p => p[1]))

/*
 * SUR: arsaları ve limanı saran yuvarlatılmış halka (süper-elips). Üstte ve
 * yanlarda arsalardan sabit pay; altta limanın önünden, denizden geçer.
 */
const W_L = minX - 400, W_R = maxX + 400, W_T = minY - 440, W_B = coastMaxY + 330
const W_CX = (W_L + W_R) / 2, W_CY = (W_T + W_B) / 2, W_RX = (W_R - W_L) / 2, W_RY = (W_B - W_T) / 2
const superPt = (t, e = 3.4) => {
  const c = Math.cos(t), s = Math.sin(t)
  return [W_CX + W_RX * Math.sign(c) * Math.abs(c) ** (2 / e), W_CY + W_RY * Math.sign(s) * Math.abs(s) ** (2 / e)]
}
const WALL_N = 36
const foundationPts = Array.from({ length: WALL_N }, (_, k) => withScreen(toGridF(...superPt(-Math.PI / 2 + k * 2 * Math.PI / WALL_N))))
// Surun belli bir yükseklikteki (y) sağ/sol kenarı.
const wallXAt = (y, side) => {
  let best = null
  for (let k = 0; k < 4000; k++) {
    const p = superPt(k * 2 * Math.PI / 4000)
    if (Math.sign(p[0]) !== side) continue
    if (!best || Math.abs(p[1] - y) < Math.abs(best[1] - y)) best = p
  }
  return best[0]
}
const DEFENSE_ANCHORS = [
  { id: 'defense_tower_top', at: superPt(-Math.PI / 2 - 0.55) },
  { id: 'defense_tower_left', at: superPt(Math.PI - 0.5) },
  { id: 'defense_tower_right', at: superPt(-0.5) },
  { id: 'defense_tower_bottom', at: superPt(Math.PI * 0.8) },
  { id: 'defense_gate', at: superPt(Math.PI * 0.2) },
]
DEFENSE_ANCHORS.forEach(({ id, at }) => {
  slots.push(withScreen({ id, type: 'defense', ...toGrid(at[0], at[1]), fw: FOOT, fh: FOOT, fixed: true }))
})

// --- YOL AĞI --------------------------------------------------------------
const street = new Map() // id -> {gx, gy}
const edges = []
// Sokak düğümleri karoya oturtulmaz: kavisler pürüzsüz kalır.
const node = (id, x, y) => { street.set(id, { id, ...toGridF(x, y) }); return id }
// Çevre yolu.
const ringIds = Array.from({ length: RING_N }, (_, k) => node(`st_r${k}`, ...ringAt(k * 360 / RING_N)))
ringIds.forEach((id, k) => edges.push({ from: id, to: ringIds[(k + 1) % RING_N], ring: true }))
const ringNear = (deg) => ringIds[((Math.round(deg / (360 / RING_N)) % RING_N) + RING_N) % RING_N]
// Dört cadde meydana (belediyeye) bağlanır.
for (const deg of [0, 90, 180, 270]) edges.push({ from: 'city_hall', to: ringNear(deg) })
// Güney caddesi: çevre yolundan limana; set basamakları (st_stairs).
node('st_ave_s', 0, (RING.ry + AVE_S) / 2)
node('st_ave_s2', 0, AVE_S)
node('st_stairs', 0, (AVE_S + coastMaxY) / 2)
edges.push({ from: ringNear(90), to: 'st_ave_s' }, { from: 'st_ave_s', to: 'st_ave_s2' }, { from: 'st_ave_s2', to: 'st_stairs' })
// Kuzey caddesi: kuzey kapısına.
node('st_ave_n', 0, (-RING.ry + AVE_N) / 2)
node('st_ave_n2', 0, AVE_N)
node('st_gate_n', 0, W_T)
node('st_out_n', 0, W_T - 420)
edges.push({ from: ringNear(270), to: 'st_ave_n' }, { from: 'st_ave_n', to: 'st_ave_n2' }, { from: 'st_ave_n2', to: 'st_gate_n' }, { from: 'st_gate_n', to: 'st_out_n' })
// Doğu ve batı caddeleri: yan kapılara.
const gateE = wallXAt(0, 1), gateW = wallXAt(0, -1)
node('st_gate_e', gateE, 0); node('st_out_e', gateE + 480, 60)
node('st_gate_w', gateW, 0); node('st_out_w', gateW - 480, 60)
edges.push({ from: ringNear(0), to: 'st_gate_e' }, { from: 'st_gate_e', to: 'st_out_e' })
edges.push({ from: ringNear(180), to: 'st_gate_w' }, { from: 'st_gate_w', to: 'st_out_w' })
// Arsa girişleri.
for (const p of PLOTS) {
  if (p.ave) edges.push({ from: p.ave === 's' ? 'st_ave_s2' : 'st_ave_n2', to: p.id })
  else edges.push({ from: ringNear(p.ring), to: p.id })
}
// Setten limana; rıhtım boyunca.
const coastSlots = slots.filter(s => s.type === 'coast')
const coastSorted = [...coastSlots].sort((a, b) => a.screen.x - b.screen.x)
edges.push({ from: 'st_stairs', to: coastSorted[1].id })
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

// Sur kapıları: üç kara kapısı + limanın zincirli deniz kapısı.
const at = (x, y) => ({ x: hall0.x + Math.round(x), y: hall0.y + Math.round(y) })
const wallGates = [
  { id: 'gate_n', kind: 'land', screen: at(0, W_T), road: 'st_out_n' },
  { id: 'gate_e', kind: 'land', screen: at(gateE, 0), road: 'st_out_e' },
  { id: 'gate_w', kind: 'land', screen: at(gateW, 0), road: 'st_out_w' },
  { id: 'gate_sea', kind: 'sea', screen: at(0, W_B) },
]
const plaza = { screen: at(0, 0), rx: PLAZA.rx, ry: PLAZA.ry }
const ringRoad = { rx: RING.rx, ry: RING.ry }

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
  wallGates,
  plaza,
  ringRoad,
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
