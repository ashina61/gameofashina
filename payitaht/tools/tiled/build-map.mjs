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
 * TASARIM: İkariam benzeri ORGANİK, dikey ve büyük şehir. Belediye haritanın
 * geometrik merkezinde çakılı; 24 normal city slotu belediyenin çevresine
 * DÜZ SATRANÇ TAHTASI olmayacak biçimde, kıvrımlı yollara yer bırakan
 * aralıklarla, üst/alt/sağ/sol dengeli dağılır. Alt kıyı boyunca coast
 * slotları; çevrede boş savunma temel hattı.
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
 * ORGANİK OFSETLER (a,b) — belediyeye göre.
 *   gx = 50 + a + b ,  gy = 70 - a + b
 * Böylece  a = yatay adım (ekranda ±128px/br),  b = dikey adım (±64px/br).
 * Ekran dikey birim (64) yatayın yarısı olduğundan DİKEY için b-aralığı geniş
 * tutulur → mobil dikey şehir. Ofsetler bilinçli DÜZENSİZ (organik, satranç
 * değil) ve her çift arası tile mesafesi >= ~4 (2x2 footprint'ler çakışmaz,
 * aralarında yol payı kalır). Üç gevşek halka: iç 6, orta 8, dış 10 = 24.
 */
const CITY_OFFSETS = [
  // iç halka (6) — meydanın çevresi
  [-3, -6], [3, -7], [-4, 0], [4, 1], [-2, 7], [3, 6],
  // orta halka (8)
  [-5, -11], [0, -13], [5, -10], [-6, -2], [6, -3], [-5, 9], [0, 13], [5, 10],
  // dış halka (10) — üst şehir yukarı, alt şehir denize doğru uzanır
  [-3, -18], [4, -19], [-7, -9], [7, -8], [-8, 3], [8, 2], [-6, 14], [6, 15], [-2, 21], [3, 22],
]

// --- SLOTLAR --------------------------------------------------------------
const slots = []
slots.push(withScreen({ id: 'city_hall', type: 'city', gx: CENTER.gx, gy: CENTER.gy, fw: FOOT, fh: FOOT, fixed: true }))
CITY_OFFSETS.forEach(([a, b], i) => slots.push(withScreen({
  id: `city_${String(i + 1).padStart(2, '0')}`, type: 'city',
  gx: CENTER.gx + a + b, gy: CENTER.gy - a + b, fw: FOOT, fh: FOOT, fixed: false,
})))

/*
 * KIYI SLOTLARI: şehrin ALTINDAKİ kıyı boyunca (büyük gx+gy = ekranda alt).
 * Ticaret limanı / tersane / iskele / deniz kışlası bunların ARASINDA
 * taşınabilir. Kıyı hattı hafif dalgalı (organik), 6 slot.
 */
const COAST_OFFSETS = [[-9, 31], [-5, 33], [-1, 31], [3, 33], [7, 31], [11, 33]]
COAST_OFFSETS.forEach(([a, b], i) => slots.push(withScreen({
  id: `coast_${String(i + 1).padStart(2, '0')}`, type: 'coast',
  gx: CENTER.gx + a + b, gy: CENTER.gy - a + b, fw: FOOT, fh: FOOT, fixed: false,
})))

/*
 * SAVUNMA SLOTLARI: sur KULE ve KAPI yuvaları — şehri çevreleyen hattın
 * uçlarında. Arkaplanda hazır sur YOK; buraya sonradan defense assetleri
 * (kule/kapı) yerleşir. Kapı denize (alt) bakar.
 */
const DEFENSE_ANCHORS = [
  { id: 'defense_tower_top', a: 0, b: -27 },
  { id: 'defense_tower_left', a: -14, b: -2 },
  { id: 'defense_tower_right', a: 14, b: -1 },
  { id: 'defense_tower_bottom', a: 0, b: 27 },
  { id: 'defense_gate', a: 1, b: 30 },
]
DEFENSE_ANCHORS.forEach(({ id, a, b }) => slots.push(withScreen({
  id, type: 'defense', gx: CENTER.gx + a + b, gy: CENTER.gy - a + b, fw: FOOT, fh: FOOT, fixed: true,
})))

/*
 * SAVUNMA TEMEL HATTI: şehri saran, kule uçlarını birleştiren BOŞ halka
 * (sur/hendek hattı). Sekizgen: 8 açıda, halka yarıçapı dış slotların ötesinde.
 */
const foundationPts = [
  [0, -30], [11, -18], [16, -2], [11, 16], [0, 30], [-11, 18], [-16, -2], [-11, -18],
].map(([a, b]) => withScreen({ gx: CENTER.gx + a + b, gy: CENTER.gy - a + b }))

// --- YOL GRAFİĞİ (ROAD GRAPH) --------------------------------------------
/*
 * Şimdilik ARTWORK yok; yalnızca gelecekte KIVRIMLI yol çizmek için bir graf.
 * Düğümler = city (belediye dahil) + coast slot merkezleri. Kenarlar:
 *   - city içinde belediyeden dallanan MST (her binaya belediyeye bağlı bir yol)
 *   - her coast slotu en yakın city slotuna (limana inen yol)
 * Kenarlar merkez-merkez topolojiktir; kıvrım için her kenara dik kaydırılmış
 * bir kontrol noktası (ctrl) verilir — renderer isterse bezier çizer.
 */
const citySlots = slots.filter(s => s.type === 'city')
const coastSlots = slots.filter(s => s.type === 'coast')
const dist = (p, q) => Math.hypot(p.gx - q.gx, p.gy - q.gy)

// Prim MST, belediyeden başla.
const inTree = new Set(['city_hall'])
const edges = []
while (inTree.size < citySlots.length) {
  let best = null
  for (const u of citySlots) {
    if (!inTree.has(u.id)) continue
    for (const v of citySlots) {
      if (inTree.has(v.id)) continue
      const d = dist(u, v)
      if (!best || d < best.d) best = { from: u.id, to: v.id, d }
    }
  }
  inTree.add(best.to)
  edges.push({ from: best.from, to: best.to })
}
// Coast bağlantıları: her coast en yakın city'ye.
for (const c of coastSlots) {
  let best = null
  for (const v of citySlots) { const d = dist(c, v); if (!best || d < best.d) best = { to: v.id, d } }
  edges.push({ from: c.id, to: best.to })
}

const roadNodes = [...citySlots, ...coastSlots].map(s => ({ id: s.id, gx: s.gx, gy: s.gy, screen: s.screen }))
const nodeById = new Map(roadNodes.map(n => [n.id, n]))
const roadEdges = edges.map((e, i) => {
  const A = nodeById.get(e.from), B = nodeById.get(e.to)
  const mid = { x: (A.screen.x + B.screen.x) / 2, y: (A.screen.y + B.screen.y) / 2 }
  const dx = B.screen.x - A.screen.x, dy = B.screen.y - A.screen.y
  const len = Math.hypot(dx, dy) || 1
  const bend = (i % 2 === 0 ? 1 : -1) * len * 0.14 // kıvrım ipucu
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
