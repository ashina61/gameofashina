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
 * IKARIAM YOĞUNLUĞUNDA KOMPAKT ŞEHİR.
 *
 * Eski yerleşim 24 slotu ~2000x2600 px'lik bir alana, kıyıyı ~2000 px aşağıya
 * yaymıştı: binalar arasında 4-5 bina boyu çayır kalıyordu ve şehir "boş"
 * görünüyordu. Ikariam'da binalar arasında yalnızca dar sokak vardır; boşluğu
 * şehir değil MANZARA (orman, kayalık, deniz) doldurur.
 *
 * KAFES: ekran-hizalı (u,v) kafesi, u≡v (mod 2) — kaydırmalı "tuğla" dizilim.
 * Adım P=4 karo: 2x2 footprint'ler arasında her yönde 2 karoluk sokak kalır.
 *   gx = 50 + P·(u+v)/2 ,  gy = 70 + P·(v-u)/2
 *   ekran: X = 256·u (yatay), Y = 128·v (dikey)  — belediyeye göre.
 * DİKEY TELEFON için uzun oval: |u|≤2 (5 sütun), v∈[-6,5]. Belediyenin
 * çevresindeki 4 çapraz hücre MEYDAN olarak boş; tepe asimetrik (organik).
 * Dar şehir, HUD'un açık bıraktığı bantta daha BÜYÜK zoom'la tek ekrana sığar.
 *
 * ORGANİKLİK: her slota deterministik ±1 karo sarsıntı verilir; ama hiçbir iki
 * footprint arasında 1 karodan az sokak kalmayacak şekilde (aksi halde sarsıntı
 * reddedilir). Böylece dizilim satranç tahtası gibi durmaz.
 *
 * DEĞİŞMEZLER: belediye (50,70)'te çakılı, bütün slotlar 2x2, slot SAYILARI ve
 * SIRALARI aynı (24 city + 6 coast + 5 defense) → motor kayıtları (index
 * tabanlı) bozulmaz; yalnızca konumlar sıkılaşır.
 */
/*
 * TERAS ŞEHİR (Ikariam). Şehir bir yamaca yayılır: altı teras sırası, her
 * sırada dört arsa, aralarında çayır ve ağaç. Ortadan limandan yukarı TEK ana
 * cadde çıkar; her terasın önünden TEK bir yan sokak geçer ve arsalar ona
 * cephe verir. Belediye dördüncü sıranın ortasında, caddenin üstünde durur.
 *
 * Konumlar ekran pikseli (belediyeye göre) olarak verilir ve izometrik kare
 * koordinatına yuvarlanır. Arsalar ~340 px aralıklıdır (eskiden 256): bina
 * başına nefes alanı kalır, göz ana caddeyi ve binaları kolayca izler.
 */
const toGrid = (dx, dy) => {
  let d = Math.round(dx / 64), sgn = Math.round(dy / 32)
  if (((sgn + d) % 2 + 2) % 2 === 1) sgn += 1
  return { gx: CENTER.gx + (sgn + d) / 2, gy: CENTER.gy + (sgn - d) / 2 }
}
const ROWS = [
  { y: -1080, xs: [-620, -230, 230, 620] },
  { y: -720, xs: [-760, -390, 390, 760] },
  { y: -360, xs: [-620, -230, 230, 620] },
  { y: 0, xs: [-800, -430, 430, 800] }, // belediye (0,0) bu sıranın ortasında
  { y: 360, xs: [-620, -230, 230, 620] },
  { y: 720, xs: [-760, -390, 390, 760] },
]
const STREET_DY = 150 // yan sokak, arsanın önünden (aşağısından) geçer

let seed = 7331
const rnd = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff }

// Arsa hücreleri + küçük deterministik sarsıntı (organik görünüm).
const CITY_CELLS = []
ROWS.forEach((row, r) => row.xs.forEach(x => {
  const jx = Math.round((rnd() - 0.5) * 50), jy = Math.round((rnd() - 0.5) * 40)
  CITY_CELLS.push({ row: r, x: x + jx, y: row.y + jy })
}))
if (CITY_CELLS.length !== 24) throw new Error(`24 city hücresi bekleniyordu, bulundu ${CITY_CELLS.length}`)
/*
 * SIRA = BELEDİYEYE UZAKLIK. Motor arsaları Divanhane seviyesiyle bu sırayla
 * açar: şehir merkezden kenarlara doğru büyür.
 */
CITY_CELLS.sort((a, b) => Math.hypot(a.x, a.y * 1.2) - Math.hypot(b.x, b.y * 1.2) || a.y - b.y || a.x - b.x)

// --- SLOTLAR --------------------------------------------------------------
const slots = []
slots.push(withScreen({ id: 'city_hall', type: 'city', gx: CENTER.gx, gy: CENTER.gy, fw: FOOT, fh: FOOT, fixed: true }))
CITY_CELLS.forEach((c, i) => {
  slots.push(withScreen({ id: `city_${String(i + 1).padStart(2, '0')}`, type: 'city', ...toGrid(c.x, c.y), fw: FOOT, fh: FOOT, fixed: false }))
  c.id = `city_${String(i + 1).padStart(2, '0')}`
})

/*
 * KIYI: limanda üç deniz arsası (Ikariam), caddenin bittiği yerde.
 */
const COAST_PX = [[-520, 1170], [0, 1210], [520, 1170]]
COAST_PX.forEach(([x, y], i) => {
  slots.push(withScreen({ id: `coast_${String(i + 1).padStart(2, '0')}`, type: 'coast', ...toGrid(x, y), fw: FOOT, fh: FOOT, fixed: false }))
})

/*
 * SAVUNMA: teras şehrini saran sur halkası; kapı caddenin limana indiği yerde.
 * Noktalar ekran-göreli [X/64, Y/32].
 */
const ringPt = ([dRel, sRel]) => {
  const d = -20 + dRel, s = 120 + sRel
  return withScreen({ gx: (s + d) / 2, gy: (s - d) / 2 })
}
const DEFENSE_ANCHORS = [
  { id: 'defense_tower_top', at: [0, -41] },
  { id: 'defense_tower_left', at: [-16.5, -8] },
  { id: 'defense_tower_right', at: [16.5, -8] },
  { id: 'defense_tower_bottom', at: [-16.5, 29] },
  { id: 'defense_gate', at: [16.5, 29] },
]
DEFENSE_ANCHORS.forEach(({ id, at }) => {
  const p = ringPt(at)
  slots.push(withScreen({ id, type: 'defense', gx: p.gx, gy: p.gy, fw: FOOT, fh: FOOT, fixed: true }))
})
const foundationPts = [
  [0, -41], [14, -37], [16.5, -8], [16.5, 29], [0, 31], [-16.5, 29], [-16.5, -8], [-14, -37],
].map(ringPt)

// --- YOL AĞACI -----------------------------------------------------------
/*
 * Ana cadde: her teras sokağının caddeyle kavşağı (x=0) yukarıdan aşağıya
 * zincirlenir; belediye kendi terasının kavşağıdır (arkadan girip önden
 * çıkılır). Teras sokakları kavşaktan iki yana, arsaların kapılarına uzanır.
 * Caddenin alt ucu kapıdan limana iner; iskeleler rıhtım boyunca bağlanır.
 */
const citySlots = slots.filter(s => s.type === 'city')
const coastSlots = slots.filter(s => s.type === 'coast')
const street = new Map()
const edges = []
const addNode = (key, dx, dy) => {
  const node = withScreen({ id: `st_${key}`, ...toGrid(dx, dy) })
  street.set(key, node)
  return node.id
}
const junctions = []
ROWS.forEach((row, r) => {
  const sy = row.y + STREET_DY
  const junction = r === 3 ? 'city_hall' : addNode(`j${r}`, 0, sy)
  junctions.push(junction)
  // Sokak iki yana: kavşak → en yakın kapı → sonraki kapı...
  for (const side of [-1, 1]) {
    const cells = CITY_CELLS.filter(c => c.row === r && Math.sign(c.x) === side).sort((a, b) => Math.abs(a.x) - Math.abs(b.x))
    let prev = junction
    cells.forEach((c, k) => {
      const door = addNode(`d${r}_${side > 0 ? 'e' : 'w'}${k}`, c.x, (r === 3 ? STREET_DY * 0.6 : sy) + (c.y - row.y) * 0.5)
      edges.push({ from: prev, to: door })
      edges.push({ from: door, to: c.id })
      prev = door
    })
  }
})
for (let r = 0; r + 1 < junctions.length; r++) edges.push({ from: junctions[r], to: junctions[r + 1] })
const coastSorted = [...coastSlots].sort((a, b) => a.screen.x - b.screen.x)
const mid = coastSorted[Math.floor(coastSorted.length / 2)]
const gate = addNode('gate', 0, 1010)
edges.push({ from: junctions[junctions.length - 1], to: gate })
edges.push({ from: gate, to: mid.id })
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
