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
const P = 4
const lattice = (u, v) => ({ gx: CENTER.gx + (P * (u + v)) / 2, gy: CENTER.gy + (P * (v - u)) / 2 })

// 24 hücre: yukarıdan aşağıya, soldan sağa (json sırası = motor index sırası).
const CITY_CELLS = []
for (let v = -6; v <= 5; v++) {
  for (let u = -2; u <= 2; u++) {
    if (((u - v) % 2 + 2) % 2 !== 0) continue // tuğla dizilim
    if (u === 0 && v === 0) continue // belediye
    if (Math.abs(u) === 1 && Math.abs(v) === 1) continue // meydan
    if (v === -6 && u === 2) continue // tepe: asimetrik (organik) zirve
    CITY_CELLS.push([u, v])
  }
}
if (CITY_CELLS.length !== 24) throw new Error(`24 city hücresi bekleniyordu, bulundu ${CITY_CELLS.length}`)
/*
 * SIRA = BELEDİYEYE UZAKLIK. Motor boş arsayı en düşük index'ten doldurur ve
 * başlangıç binaları sabit index'lerdedir; yakın slotların düşük index alması
 * şehrin MERKEZDEN DIŞA büyümesini sağlar (Ikariam gibi). Ekran uzaklığı
 * (X=256u, Y=128v) kullanılır; eşitlikte yukarıdan-aşağı, soldan-sağa.
 */
CITY_CELLS.sort(([u1, v1], [u2, v2]) => Math.hypot(2 * u1, v1) - Math.hypot(2 * u2, v2) || v1 - v2 || u1 - u2)

// Deterministik sarsıntı (±1 karo), sokak payı korunarak.
let seed = 7331
const rnd = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff }
const JITTERS = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, -1], [1, -1], [-1, 1]]
const hasStreet = (a, b) => Math.max(Math.abs(a.gx - b.gx), Math.abs(a.gy - b.gy)) >= FOOT + 1

// --- SLOTLAR --------------------------------------------------------------
const slots = []
slots.push(withScreen({ id: 'city_hall', type: 'city', gx: CENTER.gx, gy: CENTER.gy, fw: FOOT, fh: FOOT, fixed: true }))
CITY_CELLS.forEach(([u, v], i) => {
  const base = lattice(u, v)
  const order = [...JITTERS] // Fisher-Yates (tohumlu, motor-bağımsız deterministik)
  for (let k = order.length - 1; k > 0; k--) { const r = Math.floor(rnd() * (k + 1)); [order[k], order[r]] = [order[r], order[k]] }
  let pos = base
  // IKARIAM DÜZENİ: arsalar kafeste tam oturur; aralarındaki sokak ızgarası
  // (aşağıda) ancak böyle düzgün okunur. Sarsıntı kapalı.
  if (false) {
    for (const [dx, dy] of order) {
      const cand = { gx: base.gx + dx, gy: base.gy + dy }
      if (slots.every(s => hasStreet(s, cand))) { pos = cand; break }
    }
  }
  slots.push(withScreen({
    id: `city_${String(i + 1).padStart(2, '0')}`, type: 'city',
    gx: pos.gx, gy: pos.gy, fw: FOOT, fh: FOOT, fixed: false,
  }))
})

/*
 * KIYI SLOTLARI: şehrin hemen ALTINDA dalgalı liman hattı (ekranda ~+900 px).
 * Yatayda 256 px aralıklı, bir aşağı bir yukarı (dalga). Liman/tersane burada.
 *   ekran d = gx-gy = -20 + dRel ,  s = gx+gy = 120 + sRel
 */
const COAST_REL = [[-8, 28], [0, 30], [8, 28]] // Ikariam: limanda üç deniz arsası [dRel (×64px), sRel (×32px)]
COAST_REL.forEach(([dRel, sRel], i) => {
  const d = -20 + dRel, s = 120 + sRel
  slots.push(withScreen({
    id: `coast_${String(i + 1).padStart(2, '0')}`, type: 'coast',
    gx: (s + d) / 2, gy: (s - d) / 2, fw: FOOT, fh: FOOT, fixed: false,
  }))
})

/*
 * SAVUNMA: şehri SIKICA saran boş temel hattı + kule/kapı yuvaları. Kapı
 * limana (alta) bakar. Arkaplanda hazır sur YOK (sonradan defense assetleri).
 * Noktalar ekran-göreli [X/64, Y/32] olarak verilir.
 */
const ringPt = ([dRel, sRel]) => {
  const d = -20 + dRel, s = 120 + sRel
  return withScreen({ gx: (s + d) / 2, gy: (s - d) / 2 })
}
const DEFENSE_ANCHORS = [
  { id: 'defense_tower_top', at: [0, -32] },
  { id: 'defense_tower_left', at: [-13, -4] },
  { id: 'defense_tower_right', at: [13, -4] },
  // Alt köşe kuleleri; aradaki uzun kenarı liman kapısı yolu keser.
  { id: 'defense_tower_bottom', at: [-13, 23] },
  { id: 'defense_gate', at: [13, 23] },
]
DEFENSE_ANCHORS.forEach(({ id, at }) => {
  const p = ringPt(at)
  slots.push(withScreen({ id, type: 'defense', gx: p.gx, gy: p.gy, fw: FOOT, fh: FOOT, fixed: true }))
})

// Temel hattı: şehrin çevresinde sekizgen (kıyıdan önce kapanır).
const foundationPts = [
  // Köşeler kule yuvalarıyla ÇAKIŞIR: sur duvarı kuleden kuleye uzanır.
  [0, -32], [12, -26], [13, -4], [13, 23], [0, 24.5], [-13, 23], [-13, -4], [-12, -26],
].map(ringPt)

// --- YOL GRAFİĞİ (ROAD GRAPH) --------------------------------------------
/*
 * Şimdilik ARTWORK yok; yalnızca gelecekte KIVRIMLI yol çizmek için bir graf.
 * Düğümler = city (belediye dahil) + coast slot merkezleri. Kenarlar:
 *   - city içinde belediyeden dallanan MST (her binaya belediyeye bağlı bir yol)
 *   - tek rıhtım şehre iner (deniz kapısı), diğer rıhtımlar rıhtım boyunca zincirlenir
 * Kenarlar merkez-merkez topolojiktir; kıvrım için her kenara dik kaydırılmış
 * bir kontrol noktası (ctrl) verilir — renderer isterse bezier çizer.
 */
const citySlots = slots.filter(s => s.type === 'city')
const coastSlots = slots.filter(s => s.type === 'coast')
const dist = (p, q) => Math.hypot(p.gx - q.gx, p.gy - q.gy)

/*
 * SOKAK IZGARASI (Ikariam). Tuğla kafeste arsalar u≡v (mod 2) hücrelerindedir;
 * u+v TEK olan kafes noktaları ise dört arsanın ARASINDAKİ kavşaklardır. Kavşaklar
 * çapraz komşularına (u±1, v±1) izometrik düz sokaklarla bağlanır: her arsa dört
 * yandan sokakla çevrili, düzenli mahalle blokları oluşur. Her arsa ön (aşağı,
 * yokuş aşağı) kapısından sokağa bağlanır; belediye dört yanındaki kavşağa.
 * Kavşaktan limana tek bir KAPI yolu iner; rıhtımlar kendi aralarında bağlanır.
 */
const cellKey = (u, v) => `${u},${v}`
const plotCells = new Map(CITY_CELLS.map(([u, v], i) => [cellKey(u, v), slots[i + 1].id]))
plotCells.set(cellKey(0, 0), 'city_hall')
// Meydan hücreleri (belediyenin çaprazları) arsa değil ama sokak çevreler.
const plazaCells = new Set([[1, 1], [-1, 1], [1, -1], [-1, -1]].map(([u, v]) => cellKey(u, v)))
const isCityCell = (u, v) => plotCells.has(cellKey(u, v)) || plazaCells.has(cellKey(u, v))
const street = new Map()
for (let v = -8; v <= 7; v++) for (let u = -3; u <= 3; u++) {
  if (((u + v) % 2 + 2) % 2 !== 1) continue
  const around = [[u + 1, v], [u - 1, v], [u, v + 1], [u, v - 1]].filter(([a, b]) => isCityCell(a, b)).length
  if (around >= 2) street.set(cellKey(u, v), { id: `st_${u}_${v}`, u, v, ...lattice(u, v) })
}
const edges = []
const seenEdge = new Set()
const addEdge = (from, to) => {
  const k = from < to ? `${from}|${to}` : `${to}|${from}`
  if (seenEdge.has(k)) return
  seenEdge.add(k); edges.push({ from, to })
}
for (const st of street.values()) {
  for (const [du, dv] of [[1, 1], [1, -1]]) {
    const nb = street.get(cellKey(st.u + du, st.v + dv))
    if (nb) addEdge(st.id, nb.id)
  }
}
// Arsa kapıları: önce yokuş aşağı (v+1), sonra yanlar, en son arka.
for (const [key, id] of plotCells) {
  const [u, v] = key.split(',').map(Number)
  const doors = id === 'city_hall'
    ? [[0, 1], [0, -1], [1, 0], [-1, 0]]
    : [[0, 1], [u >= 0 ? 1 : -1, 0], [u >= 0 ? -1 : 1, 0], [0, -1]]
  let linked = false
  for (const [du, dv] of doors) {
    const st = street.get(cellKey(u + du, v + dv))
    if (!st) continue
    addEdge(id, st.id)
    linked = true
    if (id !== 'city_hall') break
  }
  if (!linked) throw new Error(`${id} sokağa bağlanamadı`)
}
// Limana iniş: en alt orta kavşaktan kapıya, kapıdan orta rıhtıma.
const bottom = [...street.values()].filter(st => Math.abs(st.u) <= 1).sort((a, b) => b.v - a.v)[0]
const coastSorted = [...coastSlots].sort((a, b) => a.screen.x - b.screen.x)
const mid = coastSorted[Math.floor(coastSorted.length / 2)]
const gateNode = withScreen({ id: 'st_gate', gx: (bottom.gx + mid.gx) / 2, gy: (bottom.gy + mid.gy) / 2 })
street.set('gate', gateNode)
addEdge(bottom.id, gateNode.id)
addEdge(gateNode.id, mid.id)
for (let i = 0; i + 1 < coastSorted.length; i++) addEdge(coastSorted[i].id, coastSorted[i + 1].id)

const roadNodes = [...citySlots, ...coastSlots, ...[...street.values()].map(withScreen)]
  .map(s => ({ id: s.id, gx: s.gx, gy: s.gy, screen: s.screen }))
const nodeById = new Map(roadNodes.map(n => [n.id, n]))
const roadEdges = edges.map((e, i) => {
  const A = nodeById.get(e.from), B = nodeById.get(e.to)
  const mid = { x: (A.screen.x + B.screen.x) / 2, y: (A.screen.y + B.screen.y) / 2 }
  const dx = B.screen.x - A.screen.x, dy = B.screen.y - A.screen.y
  const len = Math.hypot(dx, dy) || 1
  // Sokaklar düz; yalnızca kapı yolu ve rıhtım hafifçe kıvrılır.
  const bend = e.from.startsWith('st_') && e.to.startsWith('st_') ? 0 : (i % 2 === 0 ? 1 : -1) * len * 0.08
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
