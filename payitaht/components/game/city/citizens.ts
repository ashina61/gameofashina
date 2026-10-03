import * as Phaser from 'phaser'
import { cityFields, cityFountains, cityStream, fieldTier, fountainTier } from '@/lib/game/city-map/city-extras'
import { TILE, COAST_SLOTS, ROAD_GRAPH, HALL_SLOT_ID, PLAZA, slotById } from '@/lib/game/city-map'
import { LIVE_SLOTS, liveSlotByIndex } from '@/lib/game/city-map/live-adapter'
import { visualProfile } from '@/lib/game/city-map/building-assets'
import { edgeKey, roadEdgeKeysForTargets } from '@/lib/game/city-map/road-tree'
import { activeJob, population, type BuildingId } from '@/lib/game/engine'
import { liteMode } from '@/lib/motion'
import { type RoadEdge, ART_GROUND_PX } from './shared'
import type { CityScene } from '../phaser-city'

/*
 * HALK — Ikariam'daki gibi sokaklarda yürüyen küçük vatandaşlar.
 *
 * Yalnızca GÖRÜNÜR yollarda (Divanhane'den kurulu binalara giden ağaç)
 * yürürler; sayı nüfusla artar. Bir düğüme varan vatandaş oradan çıkan
 * başka bir görünür yola sapar, çıkmaz sokakta geri döner.
 */
export function syncWalkers(scene: CityScene) {
  const visible = roadEdgeKeysForTargets(scene.openSlotIds(scene.state))
  // Hafif modda sokaklar sadeleşir (V2 Faz 6.4): en çok 10 yürüyen.
  const peacefulCount = visible.size ? Math.min(liteMode() ? 10 : 26, 3 + Math.floor(population(scene.state) / (liteMode() ? 60 : 22))) : 0
  const count = scene.siege.occupation ? Math.min(3, peacefulCount) : peacefulCount
  const key = [...visible].sort().join(',') + '#' + count
  if (key === scene.walkerKey) return
  scene.walkerKey = key
  for (const w of scene.walkers) w.body.destroy()
  scene.walkers = []
  const edges: RoadEdge[] = []
  const nodes = new Map(ROAD_GRAPH.nodes.map(n => [n.id, n.screen]))
  for (const e of ROAD_GRAPH.edges) {
    const k = edgeKey(e.from, e.to)
    const A = nodes.get(e.from), B = nodes.get(e.to)
    if (!visible.has(k) || !A || !B) continue
    const curve = new Phaser.Curves.QuadraticBezier(new Phaser.Math.Vector2(A.x, A.y), new Phaser.Math.Vector2(e.ctrl.x, e.ctrl.y), new Phaser.Math.Vector2(B.x, B.y))
    edges.push({ key: k, from: e.from, to: e.to, curve, length: curve.getLength() })
  }
  scene.roadEdges = edges
  if (!edges.length) return
  // Deterministik tohum: aynı şehir her açılışta aynı kalabalıkla başlar.
  let seed = 0x5eed ^ count
  const rnd = () => { seed = (Math.imul(seed, 1664525) + 1013904223) | 0; return (seed >>> 0) / 4294967296 }
  for (let i = 0; i < count; i++) {
    const g = scene.add.graphics()
    scene.drawCitizen(g, rnd)
    const edge = edges[Math.floor(rnd() * edges.length)]
    scene.walkers.push({ body: g, edge, forward: rnd() < 0.5, t: rnd(), speed: 16 + rnd() * 12, side: (rnd() - 0.5) * 14 })
  }
  scene.stepWalkers(0)
}
/*
 * OSMANLI HALKI: sarıklı/fesli esnaf, beyaz börklü yeniçeri, feraceli ve
 * yaşmaklı kadın, sırtında yükle hamal. Hepsi birkaç piksellik vektör.
 */
export function drawCitizen(scene: CityScene, g: Phaser.GameObjects.Graphics, rnd: () => number) {
  const s = 1.3, roll = rnd()
  const skin = 0xd9a77a
  g.fillStyle(0x1b2a14, 0.22); g.fillEllipse(1.5 * s, 0, 9 * s, 3.4 * s)
  const body = (robe: number, sash?: number) => {
    g.fillStyle(robe, 1); g.fillTriangle(-3.6 * s, 0, 3.6 * s, 0, 0, -12 * s)
    g.fillRoundedRect(-2.6 * s, -12 * s, 5.2 * s, 6 * s, 1.6 * s)
    if (sash !== undefined) { g.fillStyle(sash, 1); g.fillRect(-2.7 * s, -7.4 * s, 5.4 * s, 1.4 * s) }
  }
  if (roll < 0.14) {
    // Yeniçeri: lacivert dolama, kırmızı kuşak, uzun beyaz börk.
    body(0x2d4a78, 0xb3261e)
    g.fillStyle(skin, 1); g.fillCircle(0, -14.6 * s, 2.5 * s)
    g.fillStyle(0xf4efe2, 1); g.fillPoints([
      new Phaser.Math.Vector2(-2.4 * s, -16.4 * s), new Phaser.Math.Vector2(2.4 * s, -16.4 * s),
      new Phaser.Math.Vector2(1.2 * s, -23 * s), new Phaser.Math.Vector2(-3.8 * s, -21.5 * s)], true)
    g.fillStyle(0xe2bd78, 1); g.fillRect(-2.4 * s, -17.2 * s, 4.8 * s, 1 * s)
  } else if (roll < 0.40) {
    // Kadın: ferace (koyu renk), beyaz yaşmak.
    const ferace = [0x3b2a5a, 0x5a2a3a, 0x2a4a4a, 0x6a4a2a][Math.floor(rnd() * 4)]
    body(ferace)
    g.fillStyle(0xf6f1e6, 1); g.fillCircle(0, -14.8 * s, 2.9 * s)
    g.fillStyle(skin, 1); g.fillEllipse(0.6 * s, -14.4 * s, 2.4 * s, 1.6 * s)
  } else if (roll < 0.52) {
    // Hamal: kahverengi yelek, sırtında denk.
    body(0x7a5230)
    g.fillStyle(skin, 1); g.fillCircle(0, -14.6 * s, 2.5 * s)
    g.fillStyle(0x6a3a22, 1); g.fillRect(-2 * s, -18.4 * s, 4 * s, 2.2 * s)
    g.fillStyle(0xc9a46a, 1); g.fillRoundedRect(-7.4 * s, -16 * s, 5.4 * s, 8 * s, 1.2 * s)
    g.lineStyle(1, 0x7a5a30, 1); g.lineBetween(-7.4 * s, -12 * s, -2 * s, -12 * s)
  } else if (roll < 0.6) {
    // Simitçi: beyaz önlük, başında simit tablası.
    body(0xe9e2d0, 0xb3261e)
    g.fillStyle(skin, 1); g.fillCircle(0, -14.6 * s, 2.5 * s)
    g.fillStyle(0x8a5a35, 1); g.fillEllipse(0, -18.4 * s, 12 * s, 3 * s)
    g.lineStyle(1.4 * s, 0xc8883e, 1)
    for (const dx of [-3.6, 0, 3.6]) g.strokeEllipse(dx * s, -19.6 * s, 3.2 * s, 1.8 * s)
  } else if (roll < 0.66) {
    // Sucu: sırtında pirinç kap, elinde tas.
    body(0x3f6f9a, 0xe2bd78)
    g.fillStyle(skin, 1); g.fillCircle(0, -14.6 * s, 2.5 * s)
    g.fillStyle(0xa8322a, 1); g.fillRect(-2 * s, -18.6 * s, 4 * s, 2.6 * s)
    g.fillStyle(0xc9982e, 1); g.fillRoundedRect(-7.6 * s, -17 * s, 5 * s, 9 * s, 2 * s)
    g.fillStyle(0xe8c25a, 1); g.fillRect(-7 * s, -15 * s, 1.2 * s, 5 * s)
    g.fillStyle(0xc9982e, 1); g.fillCircle(4 * s, -8 * s, 1.4 * s)
  } else {
    // Esnaf: renkli entari, fes ya da sarık.
    const robes = [0xb8412f, 0x3f6f9a, 0x4f7d4a, 0xd6a93a, 0x7a4f8a, 0xe9dcc0, 0x8a5a35]
    body(robes[Math.floor(rnd() * robes.length)], rnd() < 0.5 ? 0xe9dcc0 : undefined)
    g.fillStyle(skin, 1); g.fillCircle(0, -14.6 * s, 2.5 * s)
    if (rnd() < 0.5) { g.fillStyle(0xa8322a, 1); g.fillRect(-2 * s, -18.6 * s, 4 * s, 2.6 * s); g.fillStyle(0x1b1b1b, 1); g.fillRect(-0.3 * s, -19 * s, 0.6 * s, 0.6 * s) }
    else { g.fillStyle(0xf2ead8, 1); g.fillEllipse(0, -17 * s, 6.2 * s, 3.6 * s); g.fillStyle(0xb3261e, 1); g.fillCircle(0, -18.2 * s, 1 * s) }
  }
}
export function addBirds(scene: CityScene) {
  for (const b of scene.birds) b.g.destroy()
  for (const g of scene.caravan) g.destroy()
  scene.birds = []
  scene.caravan = []
  let seed = 0xb12d
  const rnd = () => { seed = (Math.imul(seed, 1664525) + 1013904223) | 0; return (seed >>> 0) / 4294967296 }
  const P = PLAZA.screen
  for (let i = 0; i < 16; i++) {
    const a = rnd() * Math.PI * 2, r = 0.45 + rnd() * 0.5
    let hx = P.x + Math.cos(a) * PLAZA.rx * r * 0.7
    const hy = P.y + PLAZA.ry * 0.74 + Math.sin(a) * PLAZA.ry * r * 0.3
    if (Math.abs(hx - P.x) < 60 && Math.abs(hy - (P.y + PLAZA.ry * 0.74)) < 30) hx += 90
    const g = scene.add.graphics()
    const tone = [0x8e9296, 0xa7abae, 0x6f7377, 0xd9d6cf][i % 4]
    g.fillStyle(0x1b2a14, 0.2); g.fillEllipse(0.5, 0.4, 7, 2.2)
    g.fillStyle(tone, 1); g.fillEllipse(0, -2.4, 7.4, 4.2)
    g.fillStyle(0x5b6a6e, 1); g.fillCircle(3.2, -4.6, 1.9)
    g.fillStyle(0x3a3a3a, 1); g.fillRect(-4.6, -3.2, 2.2, 1.2)
    g.fillStyle(0xe0a060, 1); g.fillRect(4.8, -4.8, 1.4, 0.8)
    scene.birds.push({ g, kind: 'pigeon', minLv: 3, hx, hy, x: hx, y: hy, ph: rnd() * 10, r: 60 + rnd() * 90, sp: 0.8 + rnd() * 0.5 })
  }
  const sea = COAST_SLOTS.reduce((m, c) => ({ x: m.x + c.screen.x / COAST_SLOTS.length, y: Math.max(m.y, c.screen.y) }), { x: 0, y: -Infinity })
  for (let i = 0; i < 6; i++) {
    const g = scene.add.graphics()
    g.lineStyle(2.6, 0xf7f7f2, 1)
    g.beginPath(); g.moveTo(-9, -2); g.lineTo(-3, 1); g.lineTo(0, 0); g.lineTo(3, 1); g.lineTo(9, -2); g.strokePath()
    g.fillStyle(0x3a3a3a, 1); g.fillCircle(-9, -2, 1); g.fillCircle(9, -2, 1)
    scene.birds.push({ g, kind: 'gull', hx: sea.x + (rnd() - 0.5) * 900, hy: sea.y + 260 + rnd() * 320, x: 0, y: 0, ph: rnd() * 10, r: 90 + rnd() * 160, sp: 0.25 + rnd() * 0.2 })
  }
  // MERALAR: yünlü koyunlar otlar, yanında asalı çoban.
  for (const [fi, f] of cityFields().entries()) {
    if (f.kind !== 'mera') continue
    const minLv = fieldTier(fi)
    for (let i = 0; i < 9; i++) {
      const g = scene.add.graphics()
      const tone = i % 4 === 3 ? 0x4a3a30 : 0xf2eee4
      g.fillStyle(0x1b2a14, 0.22); g.fillEllipse(1, 1, 16, 5)
      g.fillStyle(0x3a2e26, 1); g.fillRect(-5, -4, 2, 5); g.fillRect(3, -4, 2, 5)
      g.fillStyle(tone, 1); g.fillEllipse(0, -7, 16, 10); g.fillCircle(-4, -9, 4); g.fillCircle(3, -10, 4)
      g.fillStyle(0x3a2e26, 1); g.fillEllipse(8.5, -8, 6, 5)
      const hx = f.x + (rnd() - 0.5) * f.hw * 1.1, hy = f.y + (rnd() - 0.5) * f.hh * 0.9
      scene.birds.push({ g, kind: 'sheep', minLv, hx, hy, x: hx, y: hy, ph: rnd() * 20, r: 14 + rnd() * 18, sp: 0.08 + rnd() * 0.08 })
    }
    const sh = scene.add.graphics().setDepth(f.y + f.hh * 0.3)
    scene.drawCitizen(sh, () => 0.9) // kahverengi entarili, sarıklı çoban
    sh.setPosition(f.x + f.hw * 0.45, f.y + f.hh * 0.3)
    sh.lineStyle(1.6, 0x5a4020, 1); sh.lineBetween(5, 0, 7, -26)
    scene.birds.push({ g: sh, kind: 'sheep', minLv, hx: f.x + f.hw * 0.45, hy: f.y + f.hh * 0.3, x: 0, y: 0, ph: 0, r: 4, sp: 0.03 })
  }
  // KAYIKLAR: limanın içinde kürek çeken iki kayık.
  for (let i = 0; i < 2; i++) {
    const g = scene.add.graphics()
    // İnce köpük izi: kayık hareket ettiğinde deniz "cam levha" gibi durmaz.
    g.lineStyle(1.4, 0xd9f0ea, 0.52)
    g.lineBetween(-28, 5, -48, 11); g.lineBetween(-25, 7, -43, 17)
    g.lineStyle(0.9, 0xbfe4df, 0.38)
    g.lineBetween(-30, 11, -56, 22)
    g.fillStyle(0x1b3a4a, 0.3); g.fillEllipse(2, 3, 40, 9)
    g.fillStyle(0x7a4a26, 1); g.fillPoints([new Phaser.Math.Vector2(-20, -4), new Phaser.Math.Vector2(20, -4), new Phaser.Math.Vector2(14, 3), new Phaser.Math.Vector2(-14, 3)], true)
    g.fillStyle(0xb3261e, 1); g.fillRect(-18, -6, 36, 2.5)
    scene.drawCitizen(g, () => (i ? 0.7 : 0.05))
    g.lineStyle(1.6, 0x5a4020, 1); g.lineBetween(-6, -8, -16, 4); g.lineBetween(6, -8, 16, 4)
    scene.birds.push({ g, kind: 'boat', hx: sea.x + (i ? 260 : -240), hy: sea.y + 190 + i * 70, x: 0, y: 0, ph: rnd() * 6, r: 120 + i * 60, sp: 0.12 + i * 0.05 })
  }
  // ÇEŞME BAŞI: testili kadınlar ve su içen yolcular (sabit).
  for (const c of cityFountains()) {
    for (const [dx, dy] of [[-TILE.w * 0.34, 10], [TILE.w * 0.42, 14]]) {
      if (rnd() < 0.3) continue
      const g = scene.add.graphics().setPosition(c.x + dx, c.y + dy).setDepth(c.y + dy)
      scene.drawCitizen(g, () => (rnd() < 0.6 ? 0.3 : 0.8))
      g.fillStyle(0xb8622e, 1); g.fillEllipse(dx < 0 ? 6 : -6, -9, 6, 8); g.fillRect(dx < 0 ? 5 : -7, -14, 2, 3)
      scene.birds.push({ g, kind: 'sheep', minLv: fountainTier(c), hx: c.x + dx, hy: c.y + dy, x: 0, y: 0, ph: 0, r: 1.5, sp: 0.02 })
    }
  }
  // DERE: akıntıyla süzülen parıltılar, yüzen ördekler, dönen değirmen çarkı.
  const stream = cityStream()
  scene.streamPath = null
  if (stream.pts.length > 3) {
    const path = new Phaser.Curves.Path(stream.pts[0].x, stream.pts[0].y)
    for (const p of stream.pts.slice(1)) path.lineTo(p.x, p.y)
    scene.streamLen = path.getLength()
    // Her karede yol üzerinde arama yapmamak için eşit aralıklı örnekler.
    scene.streamPath = path.getSpacedPoints(600).map(v => ({ x: v.x, y: v.y }))
    for (let i = 0; i < 26; i++) {
      const g = scene.add.graphics().setDepth(-802)
      g.lineStyle(2, 0xeaf8fc, 0.8); g.lineBetween(-5, 0, 5, 0)
      scene.birds.push({ g, kind: 'ripple', hx: 0, hy: 0, x: 0, y: 0, ph: rnd(), r: (rnd() - 0.5) * 8, sp: 0 })
    }
    for (let i = 0; i < 3; i++) {
      const g = scene.add.graphics()
      g.fillStyle(0x1b3a4a, 0.25); g.fillEllipse(1, 1, 14, 5)
      g.fillStyle(i === 0 ? 0x6b4a2a : 0x8a6a4a, 1); g.fillEllipse(0, -2, 13, 7)
      g.fillStyle(i === 0 ? 0x2f6b4c : 0x7a5a3a, 1); g.fillCircle(5, -6, 3)
      g.fillStyle(0xe0a030, 1); g.fillRect(7.5, -6.5, 3, 1.6)
      scene.birds.push({ g, kind: 'duck', hx: 0, hy: 0, x: 0, y: 0, ph: 0.45 + i * 0.012, r: 0, sp: 0.35 + i * 0.05 })
    }
  }
  if (stream.mill) {
    const w = stream.mill.wheel
    const g = scene.add.graphics().setPosition(w.x, w.y - 26).setDepth(w.y + 1)
    g.lineStyle(4, 0x5f3f22, 1); g.strokeCircle(0, 0, 32)
    g.lineStyle(2, 0x7a5230, 1)
    for (let k = 0; k < 10; k++) { const t = k / 10 * Math.PI * 2; g.lineBetween(0, 0, Math.cos(t) * 32, Math.sin(t) * 32); g.fillStyle(0x7a5230, 1); g.fillRect(Math.cos(t) * 32 - 4, Math.sin(t) * 32 - 4, 8, 8) }
    g.fillStyle(0x3a2a1c, 1); g.fillCircle(0, 0, 4)
    g.setScale(0.55, 1) // yandan görünüş
    scene.birds.push({ g, kind: 'wheel', minLv: 4, hx: w.x, hy: w.y, x: 0, y: 0, ph: 0, r: 0, sp: 1.2 })
  }
  // DEVE KERVANI: doğu kapısından girip meydana kadar gelir, geri döner.
  const nodeAt = new Map(ROAD_GRAPH.nodes.map(n => [n.id, n.screen]))
  const route = ['st_out_e', 'st_gate_e', 'st_r0'].map(id => nodeAt.get(id)).filter((p): p is { x: number; y: number } => !!p)
  const hall = slotById(HALL_SLOT_ID)!.screen
  route.push({ x: hall.x + PLAZA.rx * 1.05, y: hall.y + 14 })
  scene.caravanPath = route.length > 2 ? new Phaser.Curves.Path(route[0].x, route[0].y) : null
  if (scene.caravanPath) {
    for (const p of route.slice(1)) scene.caravanPath.lineTo(p.x, p.y)
    scene.caravanLen = scene.caravanPath.getLength()
    for (let i = 0; i < 4; i++) {
      const g = scene.add.graphics()
      if (i === 0) scene.drawCitizen(g, () => 0.9)
      else {
        g.fillStyle(0x1b2a14, 0.22); g.fillEllipse(2, 1, 30, 7)
        g.fillStyle(0x8a6436, 1)
        for (const lx of [-9, -5, 6, 10]) g.fillRect(lx, -12, 2.4, 13)
        g.fillStyle(0xc49a5e, 1); g.fillEllipse(0, -16, 26, 11); g.fillEllipse(-1, -22, 12, 9)
        g.fillStyle(0xb8872e, 1); g.fillRect(-7, -22, 5, 10); g.fillStyle(0xb3261e, 1); g.fillRect(2, -21, 5, 9) // yük denkleri
        g.fillStyle(0xc49a5e, 1); g.fillPoints([new Phaser.Math.Vector2(10, -18), new Phaser.Math.Vector2(16, -30), new Phaser.Math.Vector2(20, -30), new Phaser.Math.Vector2(14, -16)], true)
        g.fillEllipse(19, -31, 8, 5)
        g.lineStyle(1, 0x5a4020, 1); g.lineBetween(20, -30, 26, -24)
      }
      scene.caravan.push(g)
    }
  }
  scene.stepBirds(0)
}
export function addTroops(scene: CityScene) {
  for (const tr of scene.troops) for (const m of tr.members) m.g.destroy()
  scene.troops = []
  const P = PLAZA.screen
  const node = (id: string) => ROAD_GRAPH.nodes.find(n => n.id === id)?.screen
  const rim = (a0: number, a1: number, k = 1.08) => Array.from({ length: 13 }, (_, i) => {
    const a = (a0 + (a1 - a0) * i / 12) * Math.PI / 180
    return { x: P.x + Math.cos(a) * PLAZA.rx * k, y: P.y + Math.sin(a) * PLAZA.ry * k }
  })
  const route = (ids: string[], mid: Array<{ x: number; y: number }>, tail: string[]) =>
    [...ids.map(node), ...mid, ...tail.map(node)].filter((p): p is { x: number; y: number } => !!p)
  const sample = (pts: Array<{ x: number; y: number }>, loop = false) => {
    const path = new Phaser.Curves.Path(pts[0].x, pts[0].y)
    for (const p of pts.slice(1)) path.lineTo(p.x, p.y)
    if (loop) path.lineTo(pts[0].x, pts[0].y)
    const len = path.getLength()
    return { pts: path.getSpacedPoints(Math.max(60, Math.round(len / 6))).map(v => ({ x: v.x, y: v.y })), len }
  }
  const V = (x: number, y: number) => new Phaser.Math.Vector2(x, y)
  const s = 1.55 // alaylar sokak halkından biraz iri: uzaktan seçilsin
  const janissary = (leader: boolean) => {
    const g = scene.add.graphics()
    g.fillStyle(0x1b2a14, 0.22); g.fillEllipse(1.5 * s, 0, 9 * s, 3.4 * s)
    g.fillStyle((scene.siege.occupation?.color ?? 0x24406e), 1); g.fillTriangle(-3.8 * s, 0, 3.8 * s, 0, 0, -12 * s); g.fillRoundedRect(-2.7 * s, -12 * s, 5.4 * s, 6 * s, 1.6 * s)
    g.fillStyle(0xb3261e, 1); g.fillRect(-2.8 * s, -7.6 * s, 5.6 * s, 1.5 * s)
    g.fillStyle(0xd9a77a, 1); g.fillCircle(0, -14.6 * s, 2.5 * s)
    g.fillStyle(0xf4efe2, 1); g.fillPoints([V(-2.4 * s, -16.4 * s), V(2.4 * s, -16.4 * s), V(1.2 * s, -23 * s), V(-4.2 * s, -21 * s)], true)
    g.fillStyle(0xe2bd78, 1); g.fillRect(-2.4 * s, -17.2 * s, 4.8 * s, 1 * s)
    if (leader) { // bayraktar: al sancak
      g.lineStyle(1.4, 0x4a3a28, 1); g.lineBetween(3 * s, -6 * s, 3 * s, -34 * s)
      const banner = scene.siege.occupation?.color ?? scene.look?.color ?? 0xb3261e
      g.fillStyle(banner, 1); g.fillPoints([V(3.2 * s, -34 * s), V(13 * s, -32 * s), V(11 * s, -28 * s), V(13 * s, -24 * s), V(3.2 * s, -25 * s)], true)
      g.fillStyle(0xf6efe0, 1); g.fillCircle(7 * s, -29.5 * s, 1.8 * s); g.fillStyle(banner, 1); g.fillCircle(7.7 * s, -29.5 * s, 1.5 * s)
    } else { // tüfek omuzda
      g.lineStyle(1.3, 0x3a2a1c, 1); g.lineBetween(2.4 * s, -6 * s, 5.6 * s, -22 * s)
    }
    return g
  }
  const mehter = (i: number) => {
    const g = scene.add.graphics()
    g.fillStyle(0x1b2a14, 0.22); g.fillEllipse(1.5 * s, 0, 9 * s, 3.4 * s)
    g.fillStyle(0xa8322a, 1); g.fillTriangle(-3.8 * s, 0, 3.8 * s, 0, 0, -12 * s); g.fillRoundedRect(-2.7 * s, -12 * s, 5.4 * s, 6 * s, 1.6 * s)
    g.fillStyle(0xe2bd78, 1); g.fillRect(-2.8 * s, -7.6 * s, 5.6 * s, 1.4 * s)
    g.fillStyle(0xd9a77a, 1); g.fillCircle(0, -14.6 * s, 2.5 * s)
    g.fillStyle(0xf2ead8, 1); g.fillEllipse(0, -17.4 * s, 6.4 * s, 4 * s); g.fillStyle(0xb3261e, 1); g.fillRect(-1.2 * s, -21 * s, 2.4 * s, 3.2 * s)
    if (i === 0) { // tuğ: at kuyruklu sancak direği
      g.lineStyle(1.5, 0x4a3a28, 1); g.lineBetween(3 * s, -6 * s, 3 * s, -36 * s)
      g.fillStyle(0xe2bd78, 1); g.fillCircle(3 * s, -37 * s, 1.6 * s)
      g.fillStyle(0x2a1a10, 1); g.fillTriangle(1 * s, -34 * s, 5 * s, -34 * s, 3 * s, -24 * s)
    } else if (i % 3 === 1) { // kös/davul
      g.fillStyle(0x8a5a35, 1); g.fillEllipse(3.2 * s, -8.5 * s, 6 * s, 5 * s)
      g.fillStyle(0xe9dcc0, 1); g.fillEllipse(3.2 * s, -10 * s, 5 * s, 2 * s)
    } else if (i % 3 === 2) { // zurna
      g.lineStyle(1.6, 0x6a4a2a, 1); g.lineBetween(1.6 * s, -14 * s, 6.4 * s, -10 * s)
      g.fillStyle(0xc9982e, 1); g.fillCircle(6.6 * s, -9.8 * s, 1.2 * s)
    } else { // zil
      g.fillStyle(0xe2bd78, 1); g.fillCircle(-3 * s, -9 * s, 1.5 * s); g.fillCircle(3 * s, -9 * s, 1.5 * s)
    }
    return g
  }
  const sipahi = () => {
    const g = scene.add.graphics()
    g.fillStyle(0x1b2a14, 0.22); g.fillEllipse(2 * s, 0, 20 * s, 4 * s)
    g.fillStyle(0x6a4428, 1)
    for (const lx of [-6, -3.5, 4, 6.5]) g.fillRect(lx * s, -7 * s, 1.4 * s, 7 * s)
    g.fillEllipse(0, -8.5 * s, 16 * s, 6 * s)
    g.fillPoints([V(6 * s, -9 * s), V(9 * s, -16 * s), V(11.5 * s, -15 * s), V(8.5 * s, -8 * s)], true)
    g.fillEllipse(11 * s, -15.5 * s, 4.6 * s, 2.6 * s)
    g.fillStyle(0x2a1a10, 1); g.fillTriangle(-8 * s, -9 * s, -11 * s, -3 * s, -7 * s, -6 * s)
    g.fillStyle(0xb3261e, 1); g.fillRect(-3.4 * s, -11 * s, 6 * s, 2 * s) // eyer örtüsü
    g.fillStyle(0xb3261e, 1); g.fillRoundedRect(-2 * s, -19 * s, 4.4 * s, 8 * s, 1.4 * s)
    g.fillStyle(0xd9a77a, 1); g.fillCircle(0.2 * s, -21 * s, 2.2 * s)
    g.fillStyle(0xf2ead8, 1); g.fillEllipse(0.2 * s, -23.4 * s, 5.4 * s, 3.2 * s)
    g.lineStyle(1.3, 0x4a3a28, 1); g.lineBetween(-4 * s, -8 * s, 10 * s, -30 * s) // mızrak
    g.fillStyle(0xb3261e, 1); g.fillTriangle(9 * s, -28 * s, 13 * s, -27 * s, 10.5 * s, -25 * s)
    return g
  }
  const add = (pts: Array<{ x: number; y: number }>, members: Array<{ g: Phaser.GameObjects.Graphics; along: number; side: number }>, speed: number, loop: boolean, t0: number, bob = 0) => {
    if (pts.length < 2) { for (const m of members) m.g.destroy(); return }
    const sm = sample(pts, loop)
    scene.troops.push({ members, pts: sm.pts, len: sm.len, t: t0, dir: 1, speed, loop, bob })
  }
  const squad = () => [
    { g: janissary(true), along: 0, side: 0 },
    ...[0, 1, 2, 3, 4].map(i => ({ g: janissary(false), along: 19 + Math.floor(i / 2) * 18, side: i === 4 ? 0 : i % 2 ? 11 : -11 })),
  ]
  const lv = scene.state.buildings.divan
  // 1) Kuzey kapısı → kuzey caddesi → meydan çevresi (doğudan) → güney caddesi → liman.
  if (lv >= 2 || scene.siege.occupation) add(route(['st_gate_n', 'st_ave_n2', 'st_ave_n', 'st_r18'], rim(-90, 90), ['st_r6', 'st_ave_s', 'st_ave_s2', 'st_stairs']), squad(), 30, false, 0.1)
  // 2) Kışla kuruluysa batı-doğu devriyesi (meydanın kuzeyinden).
  if (scene.state.buildings.kisla > 0 || scene.siege.occupation) {
    add(route(['st_gate_w', 'st_r12'], rim(180, 360), ['st_r0', 'st_gate_e']), squad(), 28, false, 0.6)
  }
  // 3) Mehter: meydanı çevreleyen tur (bayram alayı gibi, ritimli).
  if (lv >= 4 && !scene.siege.occupation) add(rim(0, 348, 1.12), Array.from({ length: 8 }, (_, i) => ({ g: mehter(i), along: i === 0 ? 0 : 14 + Math.floor((i - 1) / 2) * 14, side: i === 0 ? 0 : (i % 2 ? 8 : -8) })), 16, true, 0.3, 1.5)
  // 4) Sipahiler: doğu-batı caddesinde çift atlı.
  if (lv >= 5 && !scene.siege.occupation) add(route(['st_gate_e', 'st_r0'], rim(0, 180, 1.14), ['st_r12', 'st_gate_w']), [{ g: sipahi(), along: 0, side: -8 }, { g: sipahi(), along: 6, side: 10 }], 46, false, 0.35)
  scene.stepTroops(0)
}
export function stepTroops(scene: CityScene, dt: number) {
  for (const tr of scene.troops) {
    tr.t += tr.dir * tr.speed * dt / tr.len
    if (tr.loop) tr.t = ((tr.t % 1) + 1) % 1
    else if (tr.t > 1) { tr.t = 1; tr.dir = -1 } else if (tr.t < 0) { tr.t = 0; tr.dir = 1 }
    const n = tr.pts.length
    for (const m of tr.members) {
      let u = tr.t - tr.dir * m.along / tr.len
      u = tr.loop ? ((u % 1) + 1) % 1 : Math.min(1, Math.max(0, u))
      const k = Math.min(n - 2, Math.floor(u * (n - 1)))
      const p = tr.pts[k], q = tr.pts[k + 1]
      const dx = (q.x - p.x) * tr.dir, dy = (q.y - p.y) * tr.dir, l = Math.hypot(dx, dy) || 1
      const bob = tr.bob ? Math.abs(Math.sin(scene.flockClock * 6 + m.along)) * tr.bob : 0
      m.g.setPosition(p.x - dy / l * m.side, p.y + dx / l * m.side * 0.6 - bob).setScale(dx >= 0 ? 1 : -1, 1).setDepth(p.y + 0.5)
    }
  }
}
export function stepLife(scene: CityScene, dt: number) {
  scene.lifeClock += dt
  for (const o of scene.lifeObjs) o.update(scene.lifeClock)
}
export function drawSoldier(scene: CityScene, g: Phaser.GameObjects.Graphics, s: number, coat = 0x24406e) {
  const V = (x: number, y: number) => new Phaser.Math.Vector2(x, y)
  g.fillStyle(0x1b2a14, 0.22); g.fillEllipse(1.5 * s, 0, 9 * s, 3.4 * s)
  g.fillStyle(coat, 1); g.fillTriangle(-3.8 * s, 0, 3.8 * s, 0, 0, -12 * s); g.fillRoundedRect(-2.7 * s, -12 * s, 5.4 * s, 6 * s, 1.6 * s)
  g.fillStyle(0xb3261e, 1); g.fillRect(-2.8 * s, -7.6 * s, 5.6 * s, 1.5 * s)
  g.fillStyle(0xd9a77a, 1); g.fillCircle(0, -14.6 * s, 2.5 * s)
  g.fillStyle(0xf4efe2, 1); g.fillPoints([V(-2.4 * s, -16.4 * s), V(2.4 * s, -16.4 * s), V(1.2 * s, -23 * s), V(-4.2 * s, -21 * s)], true)
  g.fillStyle(0xe2bd78, 1); g.fillRect(-2.4 * s, -17.2 * s, 4.8 * s, 1 * s)
}
export function addLife(scene: CityScene) {
  const life = (g: Phaser.GameObjects.Graphics, update: (t: number) => void) => { scene.lifeObjs.push({ g, update }); update(scene.lifeClock) }
  const artS = scene.artScale()
  // 1) KIŞLA TALİMİ.
  const ks = scene.slotOfBuilding('kisla')
  if (ks && ks.zone !== 'liman') {
    const baseDepth = ks.screen.y + ART_GROUND_PX * artS + 1
    const s = 1.35
    for (let row = 0; row < 2; row++) {
      for (let col = 0; col < 4; col++) {
        const body = scene.add.graphics(); scene.drawSoldier(body, s)
        const musket = scene.add.graphics()
        musket.lineStyle(1.6, 0x3a2a1c, 1); musket.lineBetween(0, 0, 0, -22 * s)
        musket.fillStyle(0xcfd4d8, 1); musket.fillRect(-0.6, -25 * s, 1.2, 3 * s) // süngü
        const ay = 1.52 + row * 0.17
        const drillPos = (t: number) => {
          const c = t % 16
          const off = c < 6 ? c / 6 : c < 8 ? 1 : c < 14 ? 1 - (c - 8) / 6 : 0
          const fwd = c < 7 || c >= 15
          const marching = (c < 6) || (c >= 8 && c < 14)
          const present = (c >= 6.2 && c < 7.6) || (c >= 14.2 && c < 15.6)
          return { ax: 0.4 + col * 0.18 + off * 0.5, fwd, marching, present }
        }
        life(body, t => {
          const d = drillPos(t)
          const p = scene.artPoint(ks, d.ax, ay)
          const bob = d.marching ? Math.abs(Math.sin(t * 7 + col * 0.2)) * 2.2 : 0
          body.setPosition(p.x, p.y - bob).setScale(d.fwd ? 1 : -1, 1).setDepth(baseDepth + p.y * 1e-4)
        })
        life(musket, t => {
          const d = drillPos(t)
          const p = scene.artPoint(ks, d.ax, ay)
          const bob = d.marching ? Math.abs(Math.sin(t * 7 + col * 0.2)) * 2.2 : 0
          const dir = d.fwd ? 1 : -1
          musket.setPosition(p.x + (d.present ? 4 : 2.6) * s * dir, p.y - 7 * s - bob)
            .setRotation(d.present ? 0 : 0.42 * dir).setDepth(baseDepth + p.y * 1e-4 + 1e-5)
        })
      }
    }
    // Çavuş: sıraların karşısında, kolunu sallayarak komut verir.
    const sg = scene.add.graphics(); scene.drawSoldier(sg, s * 1.05, 0x7a1f1f)
    const arm = scene.add.graphics(); arm.lineStyle(2.2, 0x7a1f1f, 1); arm.lineBetween(0, 0, 6 * s, -2 * s)
    const sp = scene.artPoint(ks, 1.66, 1.62)
    life(sg, () => { sg.setPosition(sp.x, sp.y).setScale(-1, 1).setDepth(baseDepth + sp.y * 1e-4) })
    life(arm, t => { arm.setPosition(sp.x - 2 * s, sp.y - 10 * s).setScale(-1, 1).setRotation(-0.5 + Math.sin(t * 3) * 0.6).setDepth(baseDepth + sp.y * 1e-4 + 1e-5) })
  }
  // 2) İNŞAAT USTALARI.
  const job = activeJob(scene.state)
  const js = job ? scene.slotOfBuilding(job.id as BuildingId) ?? (scene.state.placement[job.id as BuildingId] != null ? liveSlotByIndex(scene.state.placement[job.id as BuildingId]!) ?? null : null) : null
  if (js && js.zone !== 'liman') {
    const hall = js.slotId === HALL_SLOT_ID
    const baseDepth = js.screen.y + ART_GROUND_PX * artS * (hall ? visualProfile('divan').scale : 1) + 1
    ;[[1.85, 1.15], [1.2, 1.9], [1.75, 1.8]].forEach(([ax, ay], i) => {
      const p = scene.artPoint(js, ax, ay, 0, hall)
      const g = scene.add.graphics()
      scene.drawCitizen(g, () => 0.47) // hamal kılığında usta
      const hm = scene.add.graphics()
      hm.lineStyle(1.6, 0x5a3a22, 1); hm.lineBetween(0, 0, 0, -9)
      hm.fillStyle(0x6a6a6a, 1); hm.fillRect(-3, -11, 6, 3)
      life(g, () => g.setPosition(p.x, p.y).setScale(i % 2 ? -1 : 1, 1).setDepth(baseDepth + i * 1e-3))
      life(hm, t => hm.setPosition(p.x + (i % 2 ? -5 : 5), p.y - 12).setRotation((i % 2 ? -1 : 1) * (0.2 + Math.max(0, Math.sin(t * 8 + i * 2)) * 1.1)).setDepth(baseDepth + i * 1e-3 + 1e-4))
    })
  }
  // 3) MEYDANDA ÇOCUKLAR (şadırvan 3. seviyede gelir).
  const P = PLAZA.screen
  const fy = P.y + PLAZA.ry * 0.74
  ;(scene.state.buildings.divan >= 3 ? [0x3f6f9a, 0xd6a93a, 0x4f7d4a] : []).forEach((robe, i) => {
    const g = scene.add.graphics()
    const s = 0.95
    g.fillStyle(0x1b2a14, 0.2); g.fillEllipse(1, 0, 7 * s, 2.6 * s)
    g.fillStyle(robe, 1); g.fillTriangle(-3 * s, 0, 3 * s, 0, 0, -10 * s)
    g.fillStyle(0xd9a77a, 1); g.fillCircle(0, -12 * s, 2.3 * s)
    g.fillStyle(i === 1 ? 0xa8322a : 0x3a2a1c, 1); g.fillEllipse(0, -13.6 * s, 4.6 * s, 2 * s)
    life(g, t => {
      const a = t * (1.1 + i * 0.2) + i * 2.1
      const x = P.x + Math.cos(a) * (70 + i * 12), y = fy + Math.sin(a) * (26 + i * 5)
      g.setPosition(x, y - Math.abs(Math.sin(t * 9 + i)) * 4).setScale(-Math.sin(a) >= 0 ? 1 : -1, 1).setDepth(y)
    })
  })
  // 4) CAMİ AVLUSUNDA GÜVERCİNLER.
  const cs = scene.slotOfBuilding('cami')
  if (cs && cs.zone !== 'liman') {
    const baseDepth = cs.screen.y + ART_GROUND_PX * artS + 1
    for (let i = 0; i < 9; i++) {
      const g = scene.add.graphics()
      const tone = [0x8e9296, 0xa7abae, 0x6f7377][i % 3]
      g.fillStyle(tone, 1); g.fillEllipse(0, -2.2, 6.6, 3.8)
      g.fillStyle(0x5b6a6e, 1); g.fillCircle(2.8, -4.2, 1.7)
      const home = scene.artPoint(cs, 0.5 + (i % 5) * 0.22, 1.62 + Math.floor(i / 5) * 0.14)
      life(g, t => {
        const peck = Math.max(0, Math.sin(t * 5 + i * 1.7)) * 1.4
        g.setPosition(home.x + Math.sin(t * 0.6 + i) * 5, home.y - peck).setScale(Math.sin(t * 0.3 + i) > 0 ? 1 : -1, 1).setDepth(baseDepth + i * 1e-3)
      })
    }
  }
  // 5) LİMAN HAYATI — kurulu yapıya bağlı hamal/yük ve tersane çalışma ritmi.
  const limanSlot = scene.slotOfBuilding('liman')
  if (limanSlot) {
    const dir = scene.state.coastFacing.liman === 'right' ? -1 : 1
    for (let i = 0; i < 2; i++) {
      const porter = scene.add.graphics()
      scene.drawCitizen(porter, () => 0.47) // hamal
      life(porter, t => {
        const phase = (t * (0.17 + i * 0.025) + i * 0.46) % 1
        const sweep = phase < 0.5 ? phase * 2 : 2 - phase * 2
        const x = limanSlot.screen.x + dir * (-TILE.w * 0.28 + sweep * TILE.w * 0.56) + (i ? TILE.w * 0.05 : 0)
        const y = limanSlot.screen.y + TILE.h * (0.66 + i * 0.15) + Math.sin(t * 5 + i) * 2
        porter.setPosition(x, y).setScale((phase < 0.5 ? dir : -dir), 1).setDepth(y + 2)
      })
    }
    // Vinç kancası/yük: kısa salınım; büyük yeni sprite yerine sahne detayı.
    const hook = scene.add.graphics()
    hook.lineStyle(2.0, 0x4a3828, 0.9); hook.lineBetween(0, -36, 0, 0)
    hook.fillStyle(0x8b633f, 1); hook.fillRect(-8, 0, 16, 11)
    hook.lineStyle(1.3, 0xd8bd83, 0.75); hook.strokeRect(-8, 0, 16, 11)
    life(hook, t => {
      const sway = Math.sin(t * 1.8) * TILE.w * 0.035
      const x = limanSlot.screen.x + dir * TILE.w * 0.18 + sway
      const y = limanSlot.screen.y + TILE.h * 0.44 + Math.sin(t * 1.3) * 3
      hook.setPosition(x, y).setRotation(Math.sin(t * 1.8) * 0.04).setDepth(y + 3)
    })
  }

  const tersaneSlot = scene.slotOfBuilding('tersane')
  if (tersaneSlot) {
    const worker = scene.add.graphics(); scene.drawCitizen(worker, () => 0.72)
    const hammer = scene.add.graphics()
    hammer.lineStyle(1.8, 0x5a3a22, 1); hammer.lineBetween(0, 0, 0, -11)
    hammer.fillStyle(0x6f7274, 1); hammer.fillRect(-3.5, -13, 7, 3)
    const dir = scene.state.coastFacing.tersane === 'right' ? -1 : 1
    life(worker, () => {
      const x = tersaneSlot.screen.x + dir * TILE.w * 0.05
      const y = tersaneSlot.screen.y + TILE.h * 0.70
      worker.setPosition(x, y).setScale(dir, 1).setDepth(y + 3)
    })
    life(hammer, t => {
      const x = tersaneSlot.screen.x + dir * TILE.w * 0.10
      const y = tersaneSlot.screen.y + TILE.h * 0.58
      const hit = Math.max(0, Math.sin(t * 5.4))
      hammer.setPosition(x, y).setScale(dir, 1).setRotation(dir * (-0.65 + hit * 1.15)).setDepth(y + 4)
    })
    // Tersane çalışıyorsa hafif talaş/toz.
    scene.smoke?.addSource(
      tersaneSlot.screen.x + dir * TILE.w * 0.08,
      tersaneSlot.screen.y + TILE.h * 0.52,
      'pieces', 0.34, 0xc5ad83,
    )
  }

  // 6) BACA DUMANLARI (sanat koordinatındaki baca ağızları).
  const chimneys: Array<[BuildingId, number, number, number, number?]> = [
    ['hamam', 0.36, 0.36, 1.08], ['tophane', 0.46, 0.44, 1.36], ['simyahane', 1.24, 0.51, 1.06],
    ['camci', 1.5, 0.34, 0.56, 0x8a8480], ['kahvehane', 0.75, 0.62, 1.2],
  ]
  for (const [id, ax, ay, az, tint] of chimneys) {
    const sl = scene.slotOfBuilding(id)
    if (!sl || sl.zone === 'liman') continue
    const p = scene.artPoint(sl, ax, ay, az)
    scene.smoke?.addSource(p.x, p.y, 'pieces', id === 'kahvehane' ? 0.8 : 1.3, tint ?? 0xe9e4da)
  }
  if (scene.state.buildings.divan >= 8) { // Topkapı mutfak bacaları
    const hs = LIVE_SLOTS.find(s => s.slotId === HALL_SLOT_ID)
    if (hs) for (const ay of [0.3, 0.7, 1.1]) { const p = scene.artPoint(hs, 1.705, ay, 0.72, true); scene.smoke?.addSource(p.x, p.y, 'pieces', 0.9) }
  }
}
export function stepCaravan(scene: CityScene, dt: number) {
  if (!scene.caravanPath || !scene.caravan.length) return
  if (scene.state.buildings.divan < 3 || scene.siege.occupation) { for (const g of scene.caravan) g.setVisible(false); return }
  // 0→1 içeri, 1 bekleme, 1→0 dışarı, 0 bekleme (toplam ~2 dk).
  scene.caravanT = (scene.caravanT + dt / 120) % 1
  const c = scene.caravanT
  const pos = c < 0.4 ? c / 0.4 : c < 0.5 ? 1 : c < 0.9 ? 1 - (c - 0.5) / 0.4 : 0
  const inbound = c < 0.5
  scene.caravan.forEach((g, i) => {
    const gap = 46 / scene.caravanLen * i
    const t = Math.min(1, Math.max(0, inbound ? pos - gap : pos + gap))
    const p = scene.caravanPath!.getPoint(t)
    const q = scene.caravanPath!.getPoint(Math.min(1, t + 0.01))
    const facingLeft = (q.x - p.x) * (inbound ? 1 : -1) < 0
    g.setPosition(p.x, p.y + (i % 2 ? 4 : -4)).setScale(facingLeft ? -1 : 1, 1).setDepth(p.y)
    g.setVisible(t > 0.002 || pos > 0.002)
  })
}
export function stepBirds(scene: CityScene, dt: number) {
  scene.flockClock += dt
  // 18 sn döngü: ~14 sn yerde, ~4 sn havada.
  const cycle = scene.flockClock % 18, flying = cycle > 14
  const lift = flying ? Math.sin((cycle - 14) / 4 * Math.PI) : 0
  const lv = scene.state.buildings.divan
  for (const b of scene.birds) {
    const on = (!b.minLv || lv >= b.minLv) && !(b.kind === 'boat' && scene.siege.blockade)
    if (b.g.visible !== on) b.g.setVisible(on)
    if (!on) continue
    b.ph += dt * b.sp
    if (b.kind === 'wheel') { b.g.rotation += dt * b.sp; continue }
    if ((b.kind === 'ripple' || b.kind === 'duck') && scene.streamPath) {
      if (b.kind === 'ripple') b.ph = (b.ph + dt * 40 / scene.streamLen) % 1
      const t = b.kind === 'duck' ? 0.35 + 0.25 * (0.5 + 0.5 * Math.sin(b.ph * 0.25 + b.sp * 9)) + (b.sp - 0.35) * 0.1 : b.ph
      const sp = scene.streamPath, k = Math.min(sp.length - 2, Math.max(0, Math.floor(t * (sp.length - 1))))
      const p = sp[k], q = sp[k + 1]
      const l = Math.hypot(q.x - p.x, q.y - p.y) || 1
      if (b.kind === 'ripple') {
        b.g.setPosition(p.x - (q.y - p.y) / l * b.r, p.y + (q.x - p.x) / l * b.r).setRotation(Math.atan2(q.y - p.y, q.x - p.x))
        b.g.setAlpha(0.3 + 0.5 * Math.abs(Math.sin(b.ph * 60)))
      } else {
        const back = Math.cos(b.ph * 0.25 + b.sp * 9) < 0
        b.g.setPosition(p.x, p.y + 2).setScale((q.x - p.x) * (back ? -1 : 1) >= 0 ? 1 : -1, 1).setDepth(p.y + 1)
      }
      continue
    }
    if (b.kind === 'sheep') {
      // Yavaş otlama: küçük bir daire içinde gezinir, arada başını eğer.
      const x = b.hx + Math.cos(b.ph) * b.r, y = b.hy + Math.sin(b.ph * 1.3) * b.r * 0.4
      b.g.setPosition(x, y).setScale(Math.cos(b.ph + Math.PI / 2) < 0 ? 1 : -1, 1).setDepth(y)
      continue
    }
    if (b.kind === 'boat') {
      const x = b.hx + Math.cos(b.ph) * b.r, y = b.hy + Math.sin(b.ph) * b.r * 0.25
      b.g.setPosition(x, y).setScale(-Math.sin(b.ph) >= 0 ? 1 : -1, 1).setDepth(y)
      continue
    }
    if (b.kind === 'gull') {
      b.x = b.hx + Math.cos(b.ph) * b.r
      b.y = b.hy + Math.sin(b.ph) * b.r * 0.4 - 140
      b.g.setPosition(b.x, b.y).setDepth(1e5).setScale(1, 0.6 + 0.4 * Math.abs(Math.sin(b.ph * 9)))
      continue
    }
    if (flying) {
      const a = b.ph * 2.6
      b.g.setPosition(b.hx + Math.cos(a) * b.r * lift, b.hy - lift * (110 + b.r * 0.4) + Math.sin(a) * b.r * 0.3 * lift)
      b.g.setScale(Math.cos(a) > 0 ? 1 : -1, 0.5 + 0.5 * Math.abs(Math.sin(b.ph * 30))).setDepth(1e5)
    } else {
      // Gagalama: küçük sıçrama ve dönüş.
      const peck = Math.max(0, Math.sin(b.ph * 5)) * 1.6
      b.g.setPosition(b.hx + Math.sin(b.ph * 0.7) * 6, b.hy - peck).setScale(Math.sin(b.ph * 0.35) > 0 ? 1 : -1, 1).setDepth(b.hy)
    }
  }
}
export function stepWalkers(scene: CityScene, dt: number) {
  for (const w of scene.walkers) {
    w.t += (w.speed * dt) / Math.max(1, w.edge.length)
    if (w.t >= 1) {
      const at = w.forward ? w.edge.to : w.edge.from
      const options = scene.roadEdges.filter(e => e !== w.edge && (e.from === at || e.to === at))
      const next = options.length ? options[Math.floor(Math.random() * options.length)] : w.edge
      w.forward = next === w.edge ? !w.forward : next.from === at
      w.edge = next
      w.t = 0
    }
    const t = w.forward ? w.t : 1 - w.t
    const p = w.edge.curve.getPoint(t)
    const tan = w.edge.curve.getTangent(t)
    w.body.setPosition(p.x - tan.y * w.side, p.y + tan.x * w.side * 0.5)
    w.body.setScale(w.forward === tan.x > 0 ? 1 : -1, 1)
    w.body.setDepth(w.body.y)
  }
}
