/**
 * PAYİTAHT ŞEHİR HARİTASI ÜRETECİ — Ikariam esintili düz-parsel L1 planı.
 * Mekanik değişmez: 24 taşınabilir city slotu + sabit belediye + 3 coast + 1 islet.
 */
import { deflateSync } from 'node:zlib'
import { writeFileSync, mkdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..')
const TILE_W = 128, TILE_H = 64, MAP_W = 100, MAP_H = 140, FOOT = 2
const CENTER = { gx: 50, gy: 70 }
const screenX = (gx, gy) => Math.round((gx - gy) * (TILE_W / 2))
const screenY = (gx, gy) => Math.round((gx + gy) * (TILE_H / 2))
const withScreen = (o) => ({ ...o, screen: { x: screenX(o.gx, o.gy), y: screenY(o.gx, o.gy) } })
const HALL_SCREEN = { x: screenX(CENTER.gx, CENTER.gy), y: screenY(CENTER.gx, CENTER.gy) }
const toGrid = (dx, dy) => {
  let d = Math.round(dx / 64), s = Math.round(dy / 32)
  if (((s + d) % 2 + 2) % 2 === 1) s += 1
  return { gx: CENTER.gx + (s + d) / 2, gy: CENTER.gy + (s - d) / 2 }
}
const toGridF = (dx, dy) => {
  const d = dx / 64, s = dy / 32
  return { gx: CENTER.gx + (s + d) / 2, gy: CENTER.gy + (s - d) / 2 }
}

const ROWS = [
  { y: -960, xs: [-768, -256, 256, 768] },
  { y: -640, xs: [-1024, -512, 0, 512, 1024] },
  { y: -320, xs: [-1024, -512, 512, 1024] },
  { y: 320, xs: [-1280, -768, -256, 256, 768, 1280] },
  { y: 640, xs: [-1024, -512, 0, 512, 1024] },
]
const PLOTS = ROWS.flatMap((row, ri) => row.xs.map((x, ci) => ({ x, y: row.y, row: ri, col: ci })))
if (PLOTS.length !== 24) throw new Error(`24 arsa bekleniyordu, ${PLOTS.length}`)

const slots = []
slots.push(withScreen({ id: 'city_hall', type: 'city', gx: CENTER.gx, gy: CENTER.gy, fw: FOOT, fh: FOOT, fixed: true }))
PLOTS.forEach((p, i) => {
  p.id = `city_${String(i + 1).padStart(2, '0')}`
  slots.push(withScreen({ id: p.id, type: 'city', ...toGrid(p.x, p.y), fw: FOOT, fh: FOOT, fixed: false }))
})

const COAST_PX = [[-768, 1152], [0, 1152], [768, 1152]]
COAST_PX.forEach(([x, y], i) => slots.push(withScreen({ id: `coast_${String(i + 1).padStart(2, '0')}`, type: 'coast', ...toGrid(x, y), fw: FOOT, fh: FOOT, fixed: false })))
slots.push(withScreen({ id: 'islet_01', type: 'islet', ...toGrid(1408, 1408), fw: FOOT, fh: FOOT, fixed: false }))

const wallY = -1280
const wallXs = Array.from({ length: 25 }, (_, i) => -1536 + i * 128)
const foundationPts = wallXs.map((x, i) => withScreen(toGridF(x, wallY + Math.round(Math.sin((i / (wallXs.length - 1)) * Math.PI) * -48))))
const DEFENSE_ANCHORS = [
  { id: 'defense_tower_left', at: [-1280, wallY] },
  { id: 'defense_tower_top', at: [-640, wallY - 32] },
  { id: 'defense_gate', at: [0, wallY - 48] },
  { id: 'defense_tower_right', at: [640, wallY - 32] },
  { id: 'defense_tower_bottom', at: [1280, wallY] },
]
DEFENSE_ANCHORS.forEach(({ id, at }) => slots.push(withScreen({ id, type: 'defense', ...toGrid(at[0], at[1]), fw: FOOT, fh: FOOT, fixed: true })))

const roadNodes = slots.filter(s => s.type === 'city' || s.type === 'coast').map(s => ({ id: s.id, gx: s.gx, gy: s.gy, screen: s.screen }))
const edges = []
const addEdge = (a, b) => {
  const A = roadNodes.find(n => n.id === a), B = roadNodes.find(n => n.id === b)
  if (!A || !B) return
  edges.push({ from: a, to: b, ctrl: { x: Math.round((A.screen.x + B.screen.x) / 2), y: Math.round((A.screen.y + B.screen.y) / 2) } })
}
let index = 1
const rowIds = []
for (const row of ROWS) {
  const ids = row.xs.map(() => `city_${String(index++).padStart(2, '0')}`)
  rowIds.push(ids)
  for (let i = 0; i + 1 < ids.length; i++) addEdge(ids[i], ids[i + 1])
}
addEdge(rowIds[0][1], rowIds[1][2])
addEdge(rowIds[0][2], rowIds[1][2])
addEdge(rowIds[1][2], 'city_hall')
addEdge(rowIds[2][1], 'city_hall')
addEdge(rowIds[2][2], 'city_hall')
addEdge('city_hall', rowIds[3][2])
addEdge('city_hall', rowIds[3][3])
addEdge(rowIds[3][2], rowIds[4][2])
addEdge(rowIds[3][3], rowIds[4][2])
addEdge(rowIds[1][0], rowIds[2][0]); addEdge(rowIds[1][4], rowIds[2][3])
addEdge(rowIds[2][0], rowIds[3][0]); addEdge(rowIds[2][3], rowIds[3][5])
addEdge(rowIds[3][0], rowIds[4][0]); addEdge(rowIds[3][5], rowIds[4][4])
addEdge(rowIds[4][2], 'coast_02'); addEdge('coast_01', 'coast_02'); addEdge('coast_02', 'coast_03')

const wallGates = [{ id: 'gate_n', kind: 'land', screen: { x: HALL_SCREEN.x, y: HALL_SCREEN.y + wallY }, road: rowIds[0][1] }]
const plaza = { screen: { ...HALL_SCREEN }, rx: 300, ry: 190 }
const ringRoad = { rx: 900, ry: 600 }
const bounds = (arr) => ({
  minGx: Math.min(...arr.map(s => s.gx)), maxGx: Math.max(...arr.map(s => s.gx)),
  minGy: Math.min(...arr.map(s => s.gy)), maxGy: Math.max(...arr.map(s => s.gy)),
  minX: Math.min(...arr.map(s => s.screen.x)), maxX: Math.max(...arr.map(s => s.screen.x)),
  minY: Math.min(...arr.map(s => s.screen.y)), maxY: Math.max(...arr.map(s => s.screen.y)),
})
const cityBounds = bounds(slots.filter(s => s.type !== 'defense'))
const citySlotsJson = {
  generatedBy: 'tools/tiled/build-map.mjs',
  paintedBase: { image: '/images/game/terrain/city-l1.webp', width: 1536, height: 1024 },
  tile: { w: TILE_W, h: TILE_H },
  map: { w: MAP_W, h: MAP_H, orientation: 'isometric' },
  footprint: { w: FOOT, h: FOOT },
  center: withScreen({ gx: CENTER.gx, gy: CENTER.gy }),
  hallSlotId: 'city_hall', bounds: cityBounds, slots, defenseFoundation: foundationPts,
  wallGates, plaza, ringRoad, roadGraph: { nodes: roadNodes, edges },
}
mkdirSync(join(ROOT, 'lib/game/city-map'), { recursive: true })
writeFileSync(join(ROOT, 'lib/game/city-map/city-slots.json'), JSON.stringify(citySlotsJson) + '\n')

const emptyLayerData = deflateSync(Buffer.alloc(MAP_W * MAP_H * 4)).toString('base64')
let layerId = 0, objectId = 0
const nextLayerId = () => ++layerId, nextObjectId = () => ++objectId
const objUnit = TILE_H
const tileLayer = (name) => ({ id: nextLayerId(), name, type: 'tilelayer', visible: true, opacity: 1, x: 0, y: 0, width: MAP_W, height: MAP_H, encoding: 'base64', compression: 'zlib', data: emptyLayerData })
const slotObject = (s) => ({ id: nextObjectId(), name: s.id, type: s.type, x: (s.gx - s.fw / 2) * objUnit, y: (s.gy - s.fh / 2) * objUnit, width: s.fw * objUnit, height: s.fh * objUnit, visible: true, rotation: 0, properties: [
  { name: 'slotId', type: 'string', value: s.id }, { name: 'slotType', type: 'string', value: s.type },
  { name: 'gx', type: 'int', value: s.gx }, { name: 'gy', type: 'int', value: s.gy },
  { name: 'fw', type: 'int', value: s.fw }, { name: 'fh', type: 'int', value: s.fh }, { name: 'fixed', type: 'bool', value: !!s.fixed },
] })
const objectLayer = (name, objects) => ({ id: nextLayerId(), name, type: 'objectgroup', visible: true, opacity: 1, x: 0, y: 0, draworder: 'topdown', objects })
const foundationObject = { id: nextObjectId(), name: 'defense_foundation', type: 'foundation', x: 0, y: 0, visible: true, rotation: 0, polygon: foundationPts.map(p => ({ x: p.gx * objUnit, y: p.gy * objUnit })), properties: [{ name: 'note', type: 'string', value: 'Top-only empty defense trench; walls appear only after construction.' }] }
const nodeById = new Map(roadNodes.map(n => [n.id, n]))
const roadObjects = edges.map(e => { const A=nodeById.get(e.from),B=nodeById.get(e.to); return { id: nextObjectId(), name:`road_${e.from}_${e.to}`, type:'road', x:0,y:0,visible:true,rotation:0, polyline:[{x:A.gx*objUnit,y:A.gy*objUnit},{x:B.gx*objUnit,y:B.gy*objUnit}], properties:[{name:'from',type:'string',value:e.from},{name:'to',type:'string',value:e.to}] } })
const map = { type:'map',version:'1.10',tiledversion:'1.10.2',orientation:'isometric',renderorder:'right-down',infinite:false,width:MAP_W,height:MAP_H,tilewidth:TILE_W,tileheight:TILE_H,nextlayerid:0,nextobjectid:0,tilesets:[],properties:[{name:'city',type:'string',value:'payitaht'},{name:'footprint',type:'string',value:`${FOOT}x${FOOT}`}],layers:[
  tileLayer('GROUND'),tileLayer('ROADS'),
  objectLayer('BUILDING_SLOTS',slots.filter(s=>s.type==='city').map(slotObject)),
  objectLayer('COAST_SLOTS',slots.filter(s=>s.type==='coast').map(slotObject)),
  objectLayer('ISLET_SLOTS',slots.filter(s=>s.type==='islet').map(slotObject)),
  objectLayer('DEFENSE_FOUNDATION',[foundationObject,...slots.filter(s=>s.type==='defense').map(slotObject)]),
  objectLayer('DECORATION',[]),objectLayer('BUILDINGS',[]),objectLayer('DEFENSE',[]),objectLayer('DEBUG',roadObjects),
] }
map.nextlayerid=layerId+1; map.nextobjectid=objectId+1
mkdirSync(join(ROOT,'maps/payitaht'),{recursive:true})
writeFileSync(join(ROOT,'maps/payitaht/payitaht_city.tmj'),JSON.stringify(map)+'\n')
console.log(`OK city=${slots.filter(s=>s.type==='city').length} coast=${slots.filter(s=>s.type==='coast').length} islet=${slots.filter(s=>s.type==='islet').length}`)
