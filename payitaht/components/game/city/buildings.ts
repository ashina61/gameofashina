import { decorGroundViolation, decorGroundRadius, type DecorLane } from '@/lib/game/city-map/terrain/decor-clearance'
import * as Phaser from 'phaser'
import { BUILDING_FLAGS } from '@/lib/game/banner'
import { TILE, ROAD_GRAPH, HALL_SLOT_ID } from '@/lib/game/city-map'
import { type LiveSlot } from '@/lib/game/city-map/live-adapter'
import { GROUND_TARGET_W } from '@/lib/game/city-map/building-assets'
import { BUILDINGS, activeJob, type BuildingId } from '@/lib/game/engine'
import { buildingArtKey, buildingStage, isPaintedBuilding } from '@/lib/asset'
import { liteMode } from '@/lib/motion'
import { FLAG_POLE_BUILDINGS, stageGrowth, ART_GROUND_PX, PAINTED_SOURCE_WIDTH, isTap } from './shared'
import type { CityScene } from '../phaser-city'

/*
 * AVLU: kurulu her kara binasının çevresinde alçak taş bahçe duvarı. Yola
 * bakan kenarda iki babalı bir avlu kapısı açılır (sokak girişi oradan
 * geçer). Yan köşelerde servi, arkada meyve ağacı, kapı yanında çiçek.
 */
export function addGardenWall(scene: CityScene, slot: LiveSlot, imgY: number, artS: number, id: BuildingId) {
  const V = (x: number, y: number) => new Phaser.Math.Vector2(x, y)
  const cx = slot.screen.x, cy = slot.screen.y
  // Avlu mümkünse geniş (×1.3); yakındaki bir cadde/yol (ve servi sırası)
  // duvarın içinde kalıyorsa yola değmeyene kadar daraltılır.
  const nodeAt = new Map(ROAD_GRAPH.nodes.map(n => [n.id, n.screen]))
  const roadPts: Array<{ x: number; y: number }> = []
  for (const e of ROAD_GRAPH.edges) {
    if (e.from === slot.slotId || e.to === slot.slotId) continue
    const A = nodeAt.get(e.from), B = nodeAt.get(e.to)
    if (!A || !B || Math.min(Math.hypot(A.x - cx, A.y - cy), Math.hypot(B.x - cx, B.y - cy), Math.hypot(e.ctrl.x - cx, e.ctrl.y - cy)) > TILE.w * 6) continue
    for (let k = 0; k <= 24; k++) {
      const t = k / 24, u = 1 - t
      roadPts.push({ x: u * u * A.x + 2 * u * t * e.ctrl.x + t * t * B.x, y: u * u * A.y + 2 * u * t * e.ctrl.y + t * t * B.y })
    }
  }
  let f = 1.3
  const base = 211 * artS
  while (f > 1.06 && roadPts.some(p => Math.abs(p.x - cx) / (base * f) + Math.abs(p.y - cy) / (base * f / 2) < 1 + TILE.w * 0.62 / (base * f))) f -= 0.03
  const hw = base * f, hh = hw / 2
  const N = { x: cx, y: cy - hh }, E = { x: cx + hw, y: cy }, S = { x: cx, y: cy + hh }, W = { x: cx - hw, y: cy }
  const ring = [N, E, S, W]
  // Kapı: bu arsaya bağlanan yol düğümüne bakan noktada.
  const edge = ROAD_GRAPH.edges.find(e => e.from === slot.slotId || e.to === slot.slotId)
  const other = edge ? ROAD_GRAPH.nodes.find(n => n.id === (edge.from === slot.slotId ? edge.to : edge.from))?.screen : undefined
  const dx = (other?.x ?? cx) - cx, dy = (other?.y ?? cy + 1) - cy
  const k = 1 / (Math.abs(dx) / hw + Math.abs(dy) / hh || 1)
  const gate = { x: cx + dx * k, y: cy + dy * k }
  const segs = ring.map((a, i) => [a, ring[(i + 1) % 4]] as const)
  const onSeg = (p: { x: number; y: number }, a: { x: number; y: number }, b: { x: number; y: number }) => {
    const l2 = (b.x - a.x) ** 2 + (b.y - a.y) ** 2
    const t = ((p.x - a.x) * (b.x - a.x) + (p.y - a.y) * (b.y - a.y)) / l2
    return { t, d: Math.hypot(a.x + (b.x - a.x) * t - p.x, a.y + (b.y - a.y) * t - p.y) }
  }
  const gateSeg = segs.map(([a, b], i) => ({ i, ...onSeg(gate, a, b) })).sort((p, q) => p.d - q.d)[0]
  const segLen = Math.hypot(hw, hh), gapHalf = TILE.w * 0.36 / segLen
  const wallH = TILE.h * 0.3
  const rnd = (() => { let sd = (slot.index + 7) * 0x9e3779b1; return () => { sd = (Math.imul(sd, 1664525) + 1013904223) | 0; return (sd >>> 0) / 4294967296 } })()
  const stone = [0xe6d7b4, 0xdccba5, 0xe9dcc0][slot.index % 3]

  const piece = (a: { x: number; y: number }, b: { x: number; y: number }, front: boolean) => {
    const g = scene.add.graphics().setDepth(front ? imgY + 0.1 : cy - hh - 1)
    g.fillStyle(0x1b2a14, 0.18)
    g.fillPoints([V(a.x, a.y), V(b.x, b.y), V(b.x + 6, b.y + 5), V(a.x + 6, a.y + 5)], true)
    g.fillStyle(Phaser.Display.Color.ValueToColor(stone).darken(front ? 10 : 22).color, 1)
    g.fillPoints([V(a.x, a.y), V(b.x, b.y), V(b.x, b.y - wallH), V(a.x, a.y - wallH)], true)
    g.fillStyle(stone, 1)
    g.fillPoints([V(a.x, a.y - wallH), V(b.x, b.y - wallH), V(b.x, b.y - wallH - 4), V(a.x, a.y - wallH - 4)], true)
    g.lineStyle(1, 0x8a6c47, 0.35); g.lineBetween(a.x, a.y - wallH * 0.5, b.x, b.y - wallH * 0.5)
    scene.pieces.push(g)
  }
  const pillar = (p: { x: number; y: number }, front: boolean) => {
    const g = scene.add.graphics().setDepth(front ? imgY + 0.12 : cy - hh - 0.9)
    g.fillStyle(Phaser.Display.Color.ValueToColor(stone).darken(14).color, 1); g.fillRect(p.x - 5, p.y - wallH - 14, 10, wallH + 14)
    g.fillStyle(stone, 1); g.fillRect(p.x - 6, p.y - wallH - 18, 12, 5)
    g.fillStyle(0xb3261e, 1); g.fillCircle(p.x, p.y - wallH - 20, 2.4)
    scene.pieces.push(g)
  }
  const lerp = (a: { x: number; y: number }, b: { x: number; y: number }, t: number) => ({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t })
  // Avlu zemini: bakımlı çimen, kenarında koyu bordür; kapıdan binaya taş yol.
  const yard = scene.add.graphics().setDepth(cy - hh - 2)
  yard.fillStyle(0x6f9447, 0.55); yard.fillPoints(ring.map(p => V(p.x, p.y)), true)
  yard.fillStyle(0x86ab58, 0.45); yard.fillPoints(ring.map(p => V(cx + (p.x - cx) * 0.9, cy + (p.y - cy) * 0.9)), true)
  const padEdge = { x: cx + (gate.x - cx) * 0.7, y: cy + (gate.y - cy) * 0.7 }
  yard.lineStyle(TILE.w * 0.2, 0xcdb88c, 1); yard.lineBetween(gate.x, gate.y, padEdge.x, padEdge.y)
  yard.lineStyle(TILE.w * 0.14, 0xe2d3ae, 1); yard.lineBetween(gate.x, gate.y, padEdge.x, padEdge.y)
  scene.pieces.push(yard)
  // Arka duvarlardan birinin üstünde asma (yeşil yaprak, mor salkım).
  const lvl = scene.state.buildings[id]
  const vineSeg = lvl >= 5 ? [0, 3].find(i => i !== gateSeg.i && rnd() < 0.7) : undefined
  if (vineSeg !== undefined) {
    const [a, b] = segs[vineSeg]
    const vg = scene.add.graphics().setDepth(cy - hh - 0.8)
    for (let t = 0.08; t < 0.92; t += 0.045) {
      const x = a.x + (b.x - a.x) * t, y = a.y + (b.y - a.y) * t - wallH - 3
      vg.fillStyle(rnd() < 0.5 ? 0x4f7d34 : 0x6a9a44, 1); vg.fillEllipse(x, y - rnd() * 4, 14, 9)
      if (rnd() < 0.3) { vg.fillStyle(0x5b2a5a, 1); vg.fillCircle(x + 2, y + 4, 2.4); vg.fillCircle(x, y + 6, 2) }
    }
    scene.pieces.push(vg)
  }
  segs.forEach(([a, b], i) => {
    const front = i === 1 || i === 2 // E→S ve S→W: izleyiciye bakan kenarlar
    if (i !== gateSeg.i) { piece(a, b, front); return }
    const t0 = Math.max(0.05, gateSeg.t - gapHalf), t1 = Math.min(0.95, gateSeg.t + gapHalf)
    piece(a, lerp(a, b, t0), front); piece(lerp(a, b, t1), b, front)
    pillar(lerp(a, b, t0), front); pillar(lerp(a, b, t1), front)
  })

  // Ağaçlar ve çiçekler (sprite: arazi dekoru dokuları).
  const tree = (key: string, x: number, y: number, w: number, tint?: number) => {
    if (!scene.textures.exists(key)) return
    const img = scene.add.image(x, y, key).setOrigin(0.5, 0.92).setDepth(y)
    const src = scene.textures.get(key).getSourceImage() as HTMLImageElement
    img.setDisplaySize(w, w * src.height / src.width)
    if (tint !== undefined) img.setTint(tint)
    scene.pieces.push(img)
  }
  const nearGate = (p: { x: number; y: number }) => Math.hypot(p.x - gate.x, p.y - gate.y) < TILE.w * 0.7
  const inside = (p: { x: number; y: number }, f: number) => ({ x: cx + (p.x - cx) * f, y: cy + (p.y - cy) * f })
  // Yan köşelerde (içeride) servi çifti (3. seviyeden), kapı o köşeye düşmüyorsa.
  for (const c of lvl >= 3 ? [W, E] : []) {
    if (nearGate(c)) continue
    const a = inside(c, 0.9), b = inside(c, 0.8)
    tree(rnd() < 0.5 ? 'd_cypress' : 'd_cypress-b', a.x, a.y - 4, TILE.w * 0.27)
    tree('d_cypress', b.x, b.y + 10, TILE.w * 0.23)
  }
  // Ön köşede çalı kümesi, arka köşede meyve (zeytin/nar) ağacı.
  if (!nearGate(S)) { const p = inside(S, 0.84); tree('d_bush', p.x - 14, p.y - 2, TILE.w * 0.26); tree('d_flower', p.x + 16, p.y + 2, TILE.w * 0.2) }
  if (!nearGate(N) && lvl >= 4) { const p = inside(N, 0.72); tree('d_olive-tree', p.x + (rnd() < 0.5 ? -1 : 1) * 30, p.y, TILE.w * 0.62, rnd() < 0.5 ? 0xd8ecc0 : undefined) }
  // Caminin hazîresi: arka köşede serviler arasında sarıklı şâhideler.
  if (id === 'cami' && lvl >= 3) {
    const corner = !nearGate(W) ? W : E
    const hz = scene.add.graphics().setDepth(corner.y + 2)
    for (let k = 0; k < 7; k++) {
      const p = inside(corner, 0.66 + (k % 3) * 0.08)
      const x = p.x + (corner === W ? 1 : -1) * (Math.floor(k / 3) * 20 + (k % 2) * 8), y = p.y + (k % 3) * 9 - 12
      const h = 13 + rnd() * 7
      hz.fillStyle(0x1b2a14, 0.2); hz.fillEllipse(x + 3, y + 1, 10, 3)
      hz.fillStyle(0xeae5d8, 1); hz.fillRect(x - 2.5, y - h, 5, h)
      if (rnd() < 0.6) { hz.fillStyle(0xf6f3ea, 1); hz.fillEllipse(x, y - h - 2, 9, 5) } else { hz.fillStyle(0xa8322a, 1); hz.fillRect(x - 2.5, y - h - 4, 5, 4) }
    }
    scene.pieces.push(hz)
    const c2 = inside(corner, 0.55)
    tree('d_cypress', c2.x, c2.y - 6, TILE.w * 0.24)
  }
  // Kapının iki yanında çiçek saksısı / çalı.
  for (const t of [-1, 1]) {
    const p = lerp(segs[gateSeg.i][0], segs[gateSeg.i][1], Math.min(0.97, Math.max(0.03, gateSeg.t + t * (gapHalf + 0.07))))
    tree(rnd() < 0.6 ? 'd_flower' : 'd_bush', p.x, p.y + 4, TILE.w * 0.2)
  }
}
/** Bina ailesine göre farklılaşan doğal zemin/işlik/taş avlu izi. */
export function addOccupiedClearing(scene: CityScene, id: BuildingId, slot: LiveSlot, depth: number) {
  if (slot.zone === 'liman') return

  const profile = scene.buildingVisualProfile(id, slot)
  const rnd = scene.visualRnd(scene.buildingVisualSeed(id, slot))
  const g = scene.add.graphics().setDepth(depth - 0.58)
  const cx = slot.screen.x
  const cy = slot.screen.y + TILE.h * 0.05
  const scale = id === 'divan' ? 1.02 : profile.yard === 'stone' || profile.yard === 'green' ? 0.94 : 0.86
  const rx = GROUND_TARGET_W * 0.46 * scale
  const ry = GROUND_TARGET_W * 0.18 * scale
  const points: Phaser.Math.Vector2[] = []

  for (let i = 0; i < 14; i++) {
    const a = (i / 14) * Math.PI * 2
    const jitter = 0.82 + rnd() * 0.24
    points.push(new Phaser.Math.Vector2(cx + Math.cos(a) * rx * jitter, cy + Math.sin(a) * ry * jitter))
  }

  if (profile.yard === 'stone' || profile.yard === 'green') {
    const stone = scene.diamond(cx, cy, rx * 1.55, ry * 2.1)
    g.fillStyle(0x8a7654, 0.12); g.fillPoints(stone.map(p => new Phaser.Math.Vector2(p.x + 4, p.y + 3)), true)
    g.fillStyle(profile.yard === 'green' ? 0x8ea35e : 0xc6b58d, profile.yard === 'green' ? 0.16 : 0.24); g.fillPoints(stone, true)
    if (profile.yard === 'stone') {
      g.lineStyle(1.2, 0xe2d4b2, 0.22)
      g.strokePoints(stone, true)
    }
  } else if (profile.yard === 'military') {
    g.fillStyle(0x9b875f, 0.22); g.fillPoints(points, true)
    g.lineStyle(1.4, 0x796347, 0.18)
    for (const k of [-0.45, 0, 0.45]) g.lineBetween(cx - rx * 0.65, cy + k * ry, cx + rx * 0.65, cy + k * ry)
  } else if (profile.yard === 'work') {
    g.fillStyle(0xa68b5c, 0.18); g.fillPoints(points, true)
    for (let i = 0; i < 4; i++) {
      const x = cx + (rnd() - 0.5) * rx * 1.2, y = cy + (rnd() - 0.5) * ry
      g.fillStyle(i % 2 ? 0x806746 : 0xc0a779, 0.07 + rnd() * 0.05)
      g.fillEllipse(x, y, rx * (0.18 + rnd() * 0.18), ry * (0.16 + rnd() * 0.14))
    }
  } else if (profile.yard !== 'none') {
    g.fillStyle(0xb59e6e, id === 'divan' ? 0.075 : 0.13)
    g.fillPoints(points, true)
    for (let i = 0; i < 3; i++) {
      const x = cx + (rnd() - 0.5) * rx * 0.85, y = cy + (rnd() - 0.5) * ry * 0.75
      g.fillStyle(i % 2 ? 0xd0bc8d : 0x8d7853, 0.020 + rnd() * 0.018)
      g.fillEllipse(x, y, rx * (0.34 + rnd() * 0.22), ry * (0.25 + rnd() * 0.20))
    }
  }

  // Aşınmış avlu kenarı binanın çizilmiş tabanını çimene bağlar. Çok küçük
  // taş/ot izleri yalnızca kurulu yapının footprint'i içinde kalır; boş arsa
  // ve komşu yol üzerine sabit dekor taşınmaz.
  if (id !== 'divan' && profile.yard !== 'none') {
    for (let i = 0; i < 34; i++) {
      const a = rnd() * Math.PI * 2
      const r = Math.sqrt(rnd()) * 0.91
      const x = cx + Math.cos(a) * rx * r
      const y = cy + Math.sin(a) * ry * r
      g.fillStyle(i % 5 === 0 ? 0xe7d7ae : i % 3 === 0 ? 0x596e3b : 0x806b4c, 0.22 + rnd() * 0.16)
      g.fillEllipse(x, y, 2 + rnd() * 6, 1.2 + rnd() * 2.4)
    }
  }

  scene.pieces.push(g)
}
/** Bina ailesine göre deterministik mikro-prop; seviye/stage arttıkça çevre de gelişir. */
export function addBuildingProps(scene: CityScene, id: BuildingId, slot: LiveSlot, level: number, imgY: number) {
  if (level <= 0 || id === 'divan' || id === 'surlar' || slot.zone === 'liman') return
  const profile = scene.buildingVisualProfile(id, slot)
  const stage = buildingStage(level)
  const rnd = scene.visualRnd(scene.buildingVisualSeed(id, slot) ^ 0x51ed270b)
  const cx = slot.screen.x, cy = slot.screen.y
  const count = Math.min(profile.decor.length, stage === 1 ? 1 : stage === 2 ? 2 : 3)
  const spots = [
    { x: -0.62, y: 0.42 }, { x: 0.62, y: 0.40 }, { x: -0.48, y: -0.36 },
    { x: 0.50, y: -0.34 }, { x: 0.05, y: 0.58 },
  ]

  for (let i = 0; i < count; i++) {
    const key = profile.decor[(i + Math.floor(rnd() * profile.decor.length)) % profile.decor.length]
    if (!key || !scene.textures.exists('d_' + key)) continue
    const spot = spots[(i + Math.floor(rnd() * spots.length)) % spots.length]
    const x = cx + spot.x * GROUND_TARGET_W * (0.55 + rnd() * 0.08)
    const y = cy + spot.y * TILE.h * (0.92 + rnd() * 0.12)
    const front = spot.y > 0.12
    const img = scene.add.image(x, y, 'd_' + key).setOrigin(0.5, 0.92).setDepth(front ? imgY + 0.06 : imgY - 0.08)
    const src = scene.textures.get('d_' + key).getSourceImage() as HTMLImageElement
    const baseW = key.includes('tree') || key.includes('pine') || key.includes('cypress') || key.includes('poplar')
      ? TILE.w * (0.24 + stage * 0.025)
      : key === 'well' ? TILE.w * 0.30
        : key === 'woodpile' || key === 'haystack' ? TILE.w * 0.34
          : TILE.w * 0.24
    img.setDisplaySize(baseW, baseW * src.height / src.width).setAlpha(0.90 + rnd() * 0.08)
    if (rnd() > 0.5) img.setFlipX(true)
    scene.pieces.push(img)
  }

  // Aile imzası: öndeki küçük öğeler sprite siluetini gerçekten kıracak
  // şekilde binanın ön depth'ine çıkar; yalnızca zeminde kaybolmaz.
  const g = scene.add.graphics().setDepth(imgY + 0.07)
  let drewFamily = false
  if (profile.family === 'military') {
    drewFamily = true
    const x = cx + GROUND_TARGET_W * 0.34, y = cy + TILE.h * 0.42
    g.fillStyle(0x4e3820, 1); g.fillRect(x - 13, y - 7, 26, 7)
    for (let i = 0; i < 4 + stage; i++) {
      const px = x - 10 + i * 5
      g.lineStyle(2, 0x604428, 1); g.lineBetween(px, y - 5, px + 3, y - 34 - i % 2 * 4)
      g.fillStyle(0xb9a67c, 1); g.fillTriangle(px + 1, y - 38 - i % 2 * 4, px - 2, y - 31, px + 5, y - 33)
    }
  } else if (profile.family === 'trade') {
    drewFamily = true
    const x = cx - GROUND_TARGET_W * 0.36, y = cy + TILE.h * 0.46
    for (let i = 0; i < stage + 1; i++) {
      g.fillStyle(i % 2 ? 0x8b6034 : 0xa97843, 1)
      g.fillRect(x + i * 10, y - 8 - (i % 2) * 6, 15, 10)
      g.lineStyle(1, 0x5f3f23, 0.7); g.strokeRect(x + i * 10, y - 8 - (i % 2) * 6, 15, 10)
    }
  } else if (profile.family === 'harbour') {
    drewFamily = true
    const x = cx + GROUND_TARGET_W * 0.34, y = cy + TILE.h * 0.42
    for (let i = 0; i < stage + 1; i++) {
      g.fillStyle(0x6f4a2b, 1); g.fillEllipse(x + i * 12, y - i % 2 * 4, 13, 10)
      g.lineStyle(1.5, 0xc3a36a, 0.8); g.strokeEllipse(x + i * 12, y - i % 2 * 4, 13, 10)
    }
    g.lineStyle(2, 0xb99a67, 0.8); g.strokeCircle(cx - GROUND_TARGET_W * 0.33, cy + TILE.h * 0.4, 8 + stage * 2)
  } else if (profile.family === 'scholar' || profile.family === 'culture') {
    drewFamily = true
    const x = cx + GROUND_TARGET_W * 0.34, y = cy + TILE.h * 0.44
    g.fillStyle(0x705135, 1); g.fillRect(x - 13, y - 5, 26, 5)
    g.fillRect(x - 11, y, 3, 10); g.fillRect(x + 8, y, 3, 10)
    if (stage >= 2) { g.fillStyle(0xd2b86d, 1); g.fillCircle(x, y - 12, 4); g.lineStyle(1.5, 0x705135, 1); g.lineBetween(x, y - 8, x, y - 2) }
  } else if (profile.family === 'production') {
    drewFamily = true
    const x = cx + GROUND_TARGET_W * 0.30, y = cy + TILE.h * 0.46
    // Küçük iş tezgâhı / malzeme sehpası.
    g.fillStyle(0x765332, 1); g.fillRect(x - 16, y - 11, 32, 6)
    g.fillRect(x - 13, y - 5, 4, 10); g.fillRect(x + 9, y - 5, 4, 10)
    if (stage >= 2) {
      g.lineStyle(2, 0x4d4033, 1); g.lineBetween(x - 10, y - 15, x + 8, y - 26)
      g.lineStyle(1.5, 0xb89d70, 0.9); g.lineBetween(x - 7, y - 17, x + 11, y - 28)
    }
  } else if (profile.family === 'residential' && stage >= 2) {
    drewFamily = true
    const x = cx - GROUND_TARGET_W * 0.31, y = cy + TILE.h * 0.44
    // Çamaşır ipi / küçük gündelik hayat izi: konutları kopya sprite olmaktan çıkarır.
    g.lineStyle(2, 0x68492c, 1); g.lineBetween(x - 14, y, x - 12, y - 28); g.lineBetween(x + 16, y, x + 14, y - 27)
    g.lineStyle(1.2, 0x8e7a5d, 1); g.lineBetween(x - 12, y - 24, x + 14, y - 23)
    g.fillStyle(0xb94b3f, 0.9); g.fillRect(x - 7, y - 23, 7, 8)
    g.fillStyle(0xe2d4b2, 0.95); g.fillRect(x + 4, y - 22, 7, 7)
  }
  if (drewFamily) scene.pieces.push(g)
  else g.destroy()
}
/** Boyalı yapının avlusu boş kalmasın; bitki ve taşlar yalnızca mevcut parselde yaşar. */
export function addPaintedYardProps(scene: CityScene, id: BuildingId, slot: LiveSlot, level: number, imgY: number) {
  if (level <= 0 || slot.zone === 'liman' || id === 'divan') return
  const profile = scene.buildingVisualProfile(id, slot)
  const rnd = scene.visualRnd(scene.buildingVisualSeed(id, slot) ^ 0x61ad29b7)
  const natural = profile.decor.filter(key => ['bush', 'flower', 'rock', 'cypress', 'cypress-b', 'olive-tree', 'tulip-bed'].includes(key))
  const choices = natural.length ? natural : ['bush', 'rock']
  const count = buildingStage(level) >= 2 ? 3 : 2
  for (let i = 0; i < count; i++) {
    const key = choices[(i + Math.floor(rnd() * choices.length)) % choices.length]
    const texture = 'd_' + key
    if (!scene.textures.exists(texture)) continue
    const side = i % 2 ? 1 : -1
    const x = slot.screen.x + side * GROUND_TARGET_W * (0.31 + rnd() * 0.045)
    const y = slot.screen.y + TILE.h * (0.24 + (i === 2 ? 0.12 : 0) + rnd() * 0.08)
    const source = scene.textures.get(texture).getSourceImage() as HTMLImageElement
    const width = TILE.w * (key.includes('cypress') || key.includes('tree') ? 0.19 : 0.16)
    const radius = decorGroundRadius(texture, width)
    const lanes = scene.registry.get('decorClearanceLanes') as DecorLane[]
    if (lanes && decorGroundViolation(x, y, radius, lanes)) continue
    const image = scene.add.image(x, y, texture).setOrigin(0.5, 0.92).setDepth(imgY + 0.06)
    const ordinal = (scene.registry.get('yardDecorOrdinal') as number | undefined ?? 0) + 1
    scene.registry.set('yardDecorOrdinal', ordinal)
    image.setData('decorGroundRadius', radius).setData('decorOrdinal', ordinal).setVisible(!liteMode() || ordinal % 2 === 1)
    image.setDisplaySize(width, width * source.height / source.width).setAlpha(0.85)
    image.setFlipX(side > 0)
    scene.pieces.push(image)
  }
}
export function addBuilding(scene: CityScene, id: BuildingId, slot: LiveSlot, active: boolean) {
  const anc = scene.anchor(slot)
  const level = scene.state.buildings[id]
  // Divanhane meydanın gösterişli merkezi: diğer binalardan büyük.
  // Kademeli büyüme: aynı görsel aşamasında da seviye arttıkça bina biraz büyür.
  const profile = scene.buildingVisualProfile(id, slot)
  // Boyalı tuvalin GERÇEK genişliği kullanılır (V2 Faz 4.3): aşamalar arasında
  // tuval eni farklı olabiliyor (ör. Ticaret Merkezi 2: 1683, tablo 1774).
  const paintedKey = isPaintedBuilding(id) && level > 0 ? buildingArtKey(id, level, id === 'liman' || id === 'tersane' ? scene.state.coastFacing[id] : undefined) : null
  const realW = paintedKey && scene.textures.exists(paintedKey) ? scene.textures.get(paintedKey).getSourceImage().width : 0
  const paintedScale = PAINTED_SOURCE_WIDTH[id] ? 600 / (realW || PAINTED_SOURCE_WIDTH[id]!) : 1
  const artS = scene.artScale() * profile.scale * scene.buildingMicroScale(id, slot, profile) * stageGrowth(level) * paintedScale
  // Görselin zemin elması resmin altından ART_GROUND_PX yukarıda: elmas
  // arsanın (belediyede meydanın) tam ortasına düz oturur. Liman görselleri
  // rıhtıma göre çizildiği için eski temas noktasını kullanır.
  // Kıyı yapıları kara-su çizgisine değil birkaç piksel DENİZE oturur.
  // Kullanıcı ekranlarında eski anchor yapıları sahilin üstüne bırakılmış diorama
  // gibi gösteriyordu. Liman biraz, tersane ise kızakları nedeniyle biraz daha
  // fazla denize kaydırılır.
  const coastSink = slot.zone === 'liman'
    ? TILE.h * (id === 'tersane' ? 0.30 : id === 'liman' ? 0.24 : 0.18)
    : 0
  const imgY = slot.zone === 'liman' ? anc.baseY + coastSink : slot.screen.y + ART_GROUND_PX * artS / paintedScale
  let dispW = TILE.w * 2, dispH = TILE.h * 2
  let buildingSprite: Phaser.GameObjects.Image | null = null

  // Boş slot görünmez; yalnızca kurulu yapının altında doğal açıklık oluşur.
  scene.addOccupiedClearing(id, slot, anc.baseY)
  // Her binayı aynı avlu duvarına hapsetmek şehri tekrar eden bir "compound"
  // ızgarasına çeviriyordu. Avlu yalnızca gerçekten avlulu/temsili yapılarda.
  if (profile.courtyard && !isPaintedBuilding(id) && slot.zone !== 'liman' && slot.slotId !== HALL_SLOT_ID && level >= 2) scene.addGardenWall(slot, imgY, artS, id)
  if (isPaintedBuilding(id)) scene.addPaintedYardProps(id, slot, level, imgY)
  else scene.addBuildingProps(id, slot, level, imgY)

  // İki parçalı temas gölgesi: önce yapının tam altında yumuşak ambient
  // contact, sonra sağ-alt tarafa kısa güneş gölgesi. Böylece sprite zeminden
  // kopmuş gibi değil aynı arazi üzerinde durur.
  const shadow = scene.add.graphics().setDepth(anc.baseY - 0.3)
  if (slot.zone !== 'liman') {
    shadow.fillStyle(0x1d2918, 0.16)
    shadow.fillEllipse(anc.x + TILE.w * 0.08, slot.screen.y + TILE.h * 0.30, GROUND_TARGET_W * 0.72, TILE.h * 0.72)
    // Hafif modda yalnız temas gölgesi kalır.
    if (!liteMode()) {
      shadow.fillStyle(0x1d2918, 0.085)
      shadow.fillEllipse(anc.x + TILE.w * 0.34, slot.screen.y + TILE.h * 0.42, GROUND_TARGET_W * 0.52, TILE.h * 0.42)
    }
  }
  scene.pieces.push(shadow)

  // Ikariam: seviye 0 iken (ilk inşaat) temel + iskele; sonra seviye aşamasının görseli.
  const coastFacing = id === 'liman' || id === 'tersane' ? scene.state.coastFacing[id] : undefined
  const textureKey = level === 0 && scene.textures.exists('b_site') ? 'b_site' : buildingArtKey(id, level, coastFacing)
  if (level > 0 && BUILDINGS[id].art && !scene.textures.exists(textureKey)) scene.ensureBuildingTexture(id, level)
  if (BUILDINGS[id].art && scene.textures.exists(textureKey)) {
    const img = scene.add.image(anc.x, imgY, textureKey).setOrigin(0.5, 1)
    buildingSprite = img
    const scale = artS
    img.setScale(scale).setDepth(imgY).setTint(profile.tint)
    const flip = coastFacing ? coastFacing === 'right' : scene.state.flips.includes(id)
    img.setFlipX(flip)
    dispW = img.width * scale; dispH = img.height * scale
    scene.pieces.push(img)
    // Sancaklar: görseldeki direklerin tepesine oyuncunun sancağı (tools/art → building-flags.json).
    // Boyalı yapılarda sancak/ayrıntı görsele dahildir; eski vektör
    // manifestindeki koordinatlar farklı tuvale işaret eder.
    const anchors = isPaintedBuilding(id) ? undefined : BUILDING_FLAGS[textureKey]
    /*
     * V2 Faz 4.1: boyalı görsellerde gömülü sancak YOK (bütün görseller tarandı:
     * kırmızı bölgeler kiremit, alem ve tente). Devlet yapılarının yanına
     * oyuncunun sancağını taşıyan bir direk dikilir; sancak değişince bu
     * bayraklar da değişir.
     */
    if (isPaintedBuilding(id) && FLAG_POLE_BUILDINGS.has(id) && level > 0 && slot.zone !== 'liman' && !active) {
      const dir = flip ? -1 : 1
      const px = slot.screen.x + dir * (slot.fw + slot.fh) * TILE.w * 0.25 * 0.82
      const py = slot.screen.y + TILE.h * 0.12
      const poleH = TILE.h * (id === 'divan' || id === 'saray' ? 3.6 : 3.0)
      const pole = scene.add.graphics().setDepth(imgY + 0.03)
      pole.fillStyle(0x0d1c16, 0.18); pole.fillEllipse(px + 4, py, 22, 8)
      pole.fillStyle(0x5a3d24, 1); pole.fillRect(px - 2.5, py - poleH, 5, poleH)
      pole.fillStyle(0x7a5634, 1); pole.fillRect(px - 2.5, py - poleH, 2, poleH)
      pole.fillStyle(0xcaa24a, 1); pole.fillCircle(px, py - poleH, 5)
      scene.pieces.push(pole)
      scene.flagField?.add({ x: px + 2.5 * dir, y: py - poleH + 4, w: TILE.w * 0.46, h: TILE.w * 0.28, depth: imgY + 0.04, dir }, 'pieces')
    }
    if (anchors) {
      const [W, H, list] = anchors
      for (const [fx, fy, fw, fh] of list) {
        scene.flagField?.add({
          x: anc.x + (fx - W / 2) * scale * (flip ? -1 : 1), y: imgY - (H - fy) * scale,
          w: fw * scale * 1.2, h: fh * scale * 1.25, depth: imgY + 0.02, dir: flip ? -1 : 1,
        }, 'pieces')
      }
    }
    // Gece: pencerelerde kandil ışığı (liman ve iskeleler hariç).
    if (level > 0 && slot.zone !== 'liman') {
      const lightDir = flip ? -1 : 1
      scene.sky?.addLight(anc.x - lightDir * dispW * 0.12, imgY - dispH * 0.34, 'pieces')
      scene.sky?.addLight(anc.x + lightDir * dispW * 0.16, imgY - dispH * 0.28, 'pieces')
    }
    // Yükseltme sürerken binanın önünde ahşap iskele durur.
    if (active && level > 0 && scene.textures.exists('b_scaffold')) {
      const sc = scene.add.image(anc.x, imgY, 'b_scaffold').setOrigin(0.5, 1).setScale(scale).setDepth(imgY + 0.05).setTint(0xf3e5cf)
      scene.pieces.push(sc)
      // Çekiç/saw hareketine eşlik eden ince taş-ahşap tozu. SmokeField redraw'da
      // "pieces" grubunu temizlediği için uzun oturumda kaynak birikmez.
      const dustY = slot.zone === 'liman' ? imgY - TILE.h * 0.12 : anc.baseY - TILE.h * 0.20
      scene.smoke?.addSource(anc.x - TILE.w * 0.10, dustY, 'pieces', 0.55, 0xcdbb93)
      scene.smoke?.addSource(anc.x + TILE.w * 0.08, dustY - TILE.h * 0.06, 'pieces', 0.40, 0xd9c9a5)
    }
  } else {
    // Görseli olmayan yapı: basit taş kaide (yalnızca yedek).
    const g = scene.add.graphics().setDepth(anc.baseY)
    g.fillStyle(0xb9a877, 1); g.fillPoints(scene.diamond(anc.x, anc.baseY - TILE.h * 0.5, GROUND_TARGET_W * 0.8, GROUND_TARGET_W * 0.4), true)
    scene.pieces.push(g)
  }

  // Dokunuş: binaya dokun → panel aç.
  const hit = scene.add.rectangle(anc.x, imgY - dispH * 0.4, dispW * 0.7, dispH * 0.6)
    .setInteractive({ useHandCursor: true }).setFillStyle(0xffffff, 0).setDepth(imgY + 0.2)
  const restoreSprite = () => {
    if (!buildingSprite?.active) return
    scene.tweens.killTweensOf(buildingSprite)
    buildingSprite.setScale(artS)
  }
  hit.on('pointerdown', () => {
    if (!buildingSprite?.active || scene.moving) return
    scene.tweens.killTweensOf(buildingSprite)
    buildingSprite.setScale(artS * 0.985)
  })
  hit.on('pointerout', restoreSprite)
  hit.on('pointerup', (p: Phaser.Input.Pointer) => {
    if (!isTap(p) || scene.moving) { restoreSprite(); return }
    if (buildingSprite?.active) {
      scene.tweens.killTweensOf(buildingSprite)
      buildingSprite.setScale(artS * 0.985)
      scene.tweens.add({
        targets: buildingSprite,
        scaleX: artS * 1.025,
        scaleY: artS * 1.025,
        duration: 75,
        yoyo: true,
        ease: 'Sine.easeOut',
        onComplete: () => { if (buildingSprite?.active) buildingSprite.setScale(artS) },
      })
    }
    scene.flashBuildingTap(anc.x, anc.baseY - TILE.h * 0.06, GROUND_TARGET_W * (slot.zone === 'liman' ? 0.34 : 0.29), imgY + 0.18)
    scene.events$.onBuilding(id)
  })
  scene.pieces.push(hit)

  // Normal şehir görünümünde UI bina sanatının üstüne binmez.
  // Seviye rozeti yalnızca etiketler açıldığında veya inşaat aktifken görünür.
  // Boyalı etiket: seviye dairesi + isim plakası (binanın alt yarısında, her şeyin üstünde).
  if (scene.showLabels || active) {
    const label = scene.makePaintedLabel(anc.x, imgY - dispH * 0.30, level, BUILDINGS[id].name, 1e6 + imgY)
    scene.labelOf.set(id, label)
    scene.pieces.push(label)
  }
  // İnşaat sürüyorsa altında süre çubuğu (çekiç, ilerleme, kalan süre, yeşil ok).
  const job = activeJob(scene.state)
  if (active && job) scene.pieces.push(scene.makeTimer(anc.x, anc.baseY + TILE.h * 0.15, job.start, job.end, 1e6 + anc.baseY + 1))
}
/** BOŞ ARSA: normal şehir görünümünde gerçekten doğal zemin olarak kalır.
 * Slot çerçevesi/bayrağı yalnızca oyuncu inşa veya taşıma kararı verirken açılır.
 */
export function addEmptyPlot(scene: CityScene, slot: LiveSlot) {
  const anc = scene.anchor(slot)
  const editingPlots = scene.placing || scene.moving !== null
  if (editingPlots) {
    scene.drawBuildPad(slot)
    // Bayrak arsanın TAM ORTASINA dikilir (footprint merkezi).
    scene.drawBuildFlag(slot.screen.x, slot.screen.y, slot.zone === 'liman')
  }
  const hit = scene.add.rectangle(slot.screen.x, slot.screen.y - TILE.h * 0.3, TILE.w * 1.6, TILE.h * 1.8)
    .setInteractive({ useHandCursor: true }).setFillStyle(0xffffff, 0).setDepth(anc.baseY + 0.2)
  hit.on('pointerup', (p: Phaser.Input.Pointer) => { if (isTap(p) && !scene.moving) scene.events$.onPlot(slot.index) })
  scene.pieces.push(hit)
}
/** İnşa kipinde standard 2x2 alanı göster; normal şehirde tamamen kaybolur. */
export function drawBuildPad(scene: CityScene, slot: LiveSlot) {
  const g = scene.add.graphics().setDepth(slot.screen.y + 0.05)
  const w = TILE.w * 1.86, h = TILE.h * 1.86
  const fill = slot.zone === 'liman' ? 0x5f9d91 : 0xc5ad72
  const edge = slot.zone === 'liman' ? 0x9fd0c7 : 0xead197
  g.fillStyle(fill, 0.13)
  g.fillPoints(scene.diamond(slot.screen.x, slot.screen.y, w, h), true)
  g.lineStyle(2.2, edge, 0.66)
  g.strokePoints(scene.diamond(slot.screen.x, slot.screen.y, w, h), true)
  scene.pieces.push(g)
}
/**
 * İnşa arsası (Ikariam): düzlenmiş toprak elmas, taş kenar ve tam ortada
 * kırmızı flamalı bayrak. Denizdeki arsa ahşap iskele olarak çizilir.
 */
export function drawBuildFlag(scene: CityScene, x: number, cy: number, sea = false) {
  const s = TILE.w
  // Zemin (arsa/iskele) yolların üstünde ama bütün binaların ALTINDA; bayrak ise kendi y'sinde.
  const pad = scene.add.graphics().setDepth(-790)
  const g = scene.add.graphics().setDepth(cy)
  const poleH = s * 0.5
  const baseY = cy
  {
  const g = pad
  if (sea) {
    g.fillStyle(0x6b4a2b, 0.95); g.fillPoints(scene.diamond(x, cy, TILE.w * 1.5, TILE.h * 1.5), true)
    // Kalas çizgileri: sol-üst kenara paralel.
    const hw = TILE.w * 0.75, hh = TILE.h * 0.75
    g.lineStyle(2, 0x3e2a17, 0.7)
    for (let k = 1; k <= 4; k++) {
      const t = k / 5
      g.lineBetween(x - hw + hw * t, cy + hh * t, x + hw * t, cy - hh + hh * t)
    }
    g.lineStyle(3, 0x3e2a17, 0.9); g.strokePoints(scene.diamond(x, cy, TILE.w * 1.5, TILE.h * 1.5), true)
  } else {
    // Sade inşaat izi: çimde küçük, yumuşak toprak lekesi (plaka değil).
    g.fillStyle(0xa48b5c, 0.28); g.fillEllipse(x, cy, TILE.w * 0.95, TILE.h * 0.95)
    g.fillStyle(0xc2a878, 0.30); g.fillEllipse(x, cy, TILE.w * 0.6, TILE.h * 0.6)
  }
  }
  scene.pieces.push(pad)
  g.fillStyle(0x0d1c16, 0.12); g.fillEllipse(x + 1, baseY - 1, s * 0.24, s * 0.09)
  g.fillStyle(0x5a3d24, 0.92); g.fillRect(x - s * 0.018, baseY - poleH, s * 0.036, poleH)
  // Arsa sancağı: oyuncunun sancağı, rüzgârda dalgalanır.
  scene.flagField?.add({ x: x + s * 0.018, y: baseY - poleH + s * 0.01, w: s * 0.26, h: s * 0.16, depth: cy + 0.01 }, 'pieces')
  g.fillStyle(0xcaa24a, 0.9); g.fillCircle(x, baseY - poleH, s * 0.03)
  scene.pieces.push(g)
}
/** TAŞIMA hedefinin yeşil çerçevesi. */
export function drawMoveFrame(scene: CityScene, slot: LiveSlot) {
  const x = slot.screen.x, y = slot.screen.y
  const g = scene.add.graphics().setDepth(9000)
  const w = TILE.w * 2, h = TILE.h * 2
  g.fillStyle(0x5dff86, 0.16); g.fillPoints(scene.diamond(x, y, w, h), true)
  g.lineStyle(3, 0x74ff92, 0.95); g.strokePoints(scene.diamond(x, y, w, h), true)
  scene.pieces.push(g)
}
