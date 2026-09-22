/**
 * ŞEHİR ZEMİNİ — PAYLAŞILAN katmanlı arazi kurucu.
 *
 * Hem /map-debug doğrulama sahnesi hem CANLI şehir sahnesi AYNI zemini bu
 * modülle kurar; iki ayrı renderer diverjansı olmaz. Zemin, Tiled uyumlu
 * KATMANLAR olarak (tek dev görsel değil) CANLI Phaser game object'leriyle
 * BİR KEZ kurulur ve NEGATİF derinlikte kalır:
 *   -1000 base   : çimen + deniz düz dolgu (boşluk kalmasın)
 *   -900  tiles  : gerçek arazi tile'ları (grass / shore / water) izo ızgara
 *   -800  stone  : taş inşa alanları, merkez meydan, GÜVENLİ yollar (road
 *                  graph, hiçbir footprint altından geçmez), rıhtım, boş
 *                  savunma temeli (sur/kule/kapı YOK)
 *   -700  decor  : arsalar arası deterministik yeşillik
 *
 * Bina sprite'ları (+baseY derinlik) her zaman zeminin üstünde durur; şehir
 * dolu/boş fark etmeksizin zemin hiç yeniden kurulmaz — yalnızca bina katmanı
 * değişir. Slot/koordinat/footprint DEĞİŞMEZ; bu modül yalnızca çizer.
 */
import * as Phaser from 'phaser'
import {
  CITY_SLOTS, COAST_SLOTS, DEFENSE_SLOTS, DEFENSE_FOUNDATION, ROAD_GRAPH,
  HALL_SLOT_ID, slotById, SLOTS, TILE,
} from './index'
import { GROUND_TARGET_W, GROUND_TARGET_D, FOOTPRINT_DIAMOND_W } from './building-assets'
import { asset } from '@/lib/asset'

/** Zemin prototipinde kullanılan GERÇEK arazi/dekor tile'ları. */
export const TERRAIN_TILES = ['grass', 'shore-a', 'shore-b', 'shore-c', 'water', 'water-deep'] as const
export const DECOR_TILES = ['olive-tree', 'bush', 'flower', 'rock'] as const

/** Deterministik tohumlu rastgele (dekor yerleşimi sabit kalsın). */
export function mulberry32(seed: number) {
  return () => {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** Bütün şehri (kıyı/savunma dahil) kapsayan dünya dikdörtgeni + geniş pay. */
export function cityWorldRect() {
  const pts = [...SLOTS.map(s => s.screen), ...DEFENSE_FOUNDATION.map(p => p.screen)]
  const xs = pts.map(p => p.x), ys = pts.map(p => p.y)
  const mx = TILE.w * 3, my = TILE.h * 6
  const minX = Math.min(...xs) - mx, minY = Math.min(...ys) - my
  return { x: minX, y: minY, w: Math.max(...xs) + mx - minX, h: Math.max(...ys) + my - minY }
}

/** OVERVIEW için SIKI kadraj: yalnızca içerik (şehir+savunma+kıyı) + dar pay. */
export function cityContentRect() {
  const pts = [...SLOTS.map(s => s.screen), ...DEFENSE_FOUNDATION.map(p => p.screen)]
  const xs = pts.map(p => p.x), ys = pts.map(p => p.y)
  const pad = FOOTPRINT_DIAMOND_W * 0.75
  const minX = Math.min(...xs) - pad, minY = Math.min(...ys) - pad
  return { x: minX, y: minY, w: Math.max(...xs) + pad - minX, h: Math.max(...ys) + pad - minY }
}

/** Terrain + dekor tile'larını sahneye yükler (scene.preload içinde çağrılır). */
export function preloadTerrain(scene: Phaser.Scene) {
  for (const t of TERRAIN_TILES) if (!scene.textures.exists('t_' + t)) scene.load.image('t_' + t, asset(`/images/game/terrain/${t}.png`))
  for (const d of DECOR_TILES) if (!scene.textures.exists('d_' + d)) scene.load.image('d_' + d, asset(`/images/game/decor/${d}.png`))
}

/**
 * Katmanlı şehir zeminini sahneye kurar. Bina sprite'ları eklenmeden ÖNCE bir
 * kez çağrılır; ürettiği her şey negatif derinlikte kalır.
 */
export function buildCityTerrain(scene: Phaser.Scene) {
  const wr = cityWorldRect()
  const V = (x: number, y: number) => new Phaser.Math.Vector2(x, y)
  const coastMinY = Math.min(...COAST_SLOTS.map(s => s.screen.y))
  const seaLine = coastMinY - 40
  const diamond = (cx: number, cy: number, w: number, h: number) =>
    [V(cx, cy - h / 2), V(cx + w / 2, cy), V(cx, cy + h / 2), V(cx - w / 2, cy)]
  const stamp = (key: string, wx: number, wy: number, tw: number, depth: number, oy = 0.55) => {
    const src = scene.textures.get(key).getSourceImage() as HTMLImageElement
    if (!src?.width) return
    const img = scene.add.image(wx, wy, key).setOrigin(0.5, oy).setDepth(depth)
    img.setDisplaySize(tw, tw * src.height / src.width)
  }

  // 1) TABAN dolgu (boşluk kalmasın): sıcak Akdeniz çimeni + altta deniz.
  const g0 = scene.add.graphics().setDepth(-1000)
  g0.fillStyle(0x6f9a4e, 1); g0.fillRect(wr.x, wr.y, wr.w, wr.h)
  g0.fillStyle(0x2a7d80, 1); g0.fillRect(wr.x, seaLine, wr.w, wr.y + wr.h - seaLine)
  g0.fillStyle(0x134c52, 1); g0.fillRect(wr.x, seaLine + 220, wr.w, wr.y + wr.h - seaLine - 220)

  // 2) GERÇEK tile dokusu: kara=çimen, kıyı bandı=shore, deniz=water.
  const TW = TILE.w * 2.4
  for (let gx = 22; gx <= 100; gx += 2) for (let gy = 40; gy <= 118; gy += 2) {
    const wx = (gx - gy) * (TILE.w / 2), wy = (gx + gy) * (TILE.h / 2)
    if (wx < wr.x - TW || wx > wr.x + wr.w + TW || wy < wr.y - TW || wy > wr.y + wr.h + TW) continue
    if (wy < seaLine - 60) stamp('t_grass', wx, wy, TW, -900)
    else if (wy < seaLine + 70) stamp(['t_shore-a', 't_shore-b', 't_shore-c'][(gx + gy) % 3], wx, wy, TW, -900)
    else stamp((gx + gy) % 2 ? 't_water' : 't_water-deep', wx, wy, TW, -900)
  }

  // 3) TAŞ katmanı (tek Graphics): hendek, GÜVENLİ yollar, inşa alanları, meydan, rıhtım.
  const g = scene.add.graphics().setDepth(-800)
  // Savunma hendeği/temel hattı (boş; sur YOK).
  const fpts = [...DEFENSE_FOUNDATION, DEFENSE_FOUNDATION[0]].map(p => V(p.screen.x, p.screen.y))
  g.lineStyle(TILE.w * 0.55, 0x3a3327, 0.5); g.strokePoints(fpts, false)
  g.lineStyle(TILE.w * 0.26, 0x255049, 0.55); g.strokePoints(fpts, false)
  // Taş yollar: road graph koridorları — hiçbir footprint altından GEÇMEZ.
  const nodeById = new Map(ROAD_GRAPH.nodes.map(n => [n.id, n]))
  for (const e of ROAD_GRAPH.edges) {
    const A = nodeById.get(e.from)!, B = nodeById.get(e.to)!
    const curve = new Phaser.Curves.QuadraticBezier(V(A.screen.x, A.screen.y), V(e.ctrl.x, e.ctrl.y), V(B.screen.x, B.screen.y))
    g.lineStyle(TILE.w * 0.5, 0x7d6f4a, 1); curve.draw(g, 26)
    g.lineStyle(TILE.w * 0.38, 0xb7a877, 1); curve.draw(g, 26)
  }
  // İNŞA ALANLARI: her city slotunda düz, taş, inşaata-hazır zemin.
  const pad = (cx: number, cy: number, w: number, h: number, fill: number, edge: number) => {
    const d = diamond(cx, cy, w, h); g.fillStyle(fill, 1); g.fillPoints(d, true); g.lineStyle(2.5, edge, 0.9); g.strokePoints(d, true)
  }
  const hall = slotById(HALL_SLOT_ID)!
  // Merkez MEYDAN (belediye çevresi) — geniş taş döşeme.
  pad(hall.screen.x, hall.screen.y, FOOTPRINT_DIAMOND_W * 2.05, FOOTPRINT_DIAMOND_W * 1.02, 0xcabd91, 0x9c8a5c)
  for (const s of CITY_SLOTS) pad(s.screen.x, s.screen.y, GROUND_TARGET_W * 1.05, GROUND_TARGET_D * 1.05, 0xcdbb8e, 0xa8925c)
  // KIYI: taş rıhtım (coast slot boş görünür).
  for (const s of COAST_SLOTS) pad(s.screen.x, s.screen.y, GROUND_TARGET_W * 1.08, GROUND_TARGET_D * 1.08, 0x9a8c6a, 0x6f6146)
  // SAVUNMA: boş temel (kule/kapı YOK).
  for (const s of DEFENSE_SLOTS) pad(s.screen.x, s.screen.y, GROUND_TARGET_W * 0.92, GROUND_TARGET_D * 0.92, 0x514937, 0x2a2419)

  // 4) YEŞİLLİK: arsalar arası doğal bitki (deterministik, footprint/yol dışı).
  const rnd = mulberry32(4242)
  const occ = [...CITY_SLOTS, ...COAST_SLOTS, ...DEFENSE_SLOTS]
  const kinds = ['d_olive-tree', 'd_bush', 'd_flower', 'd_bush', 'd_olive-tree', 'd_flower', 'd_rock']
  let di = 0
  for (let gx = 26; gx <= 96; gx++) for (let gy = 44; gy <= 112; gy++) {
    if ((gx + gy) % 2) continue
    if (rnd() > 0.14) continue
    const wx = (gx - gy) * (TILE.w / 2), wy = (gx + gy) * (TILE.h / 2)
    if (wy > seaLine - 80) continue
    if (occ.some(s => Math.abs(s.screen.x - wx) + 2 * Math.abs(s.screen.y - wy) < FOOTPRINT_DIAMOND_W)) continue
    const k = kinds[di++ % kinds.length]
    stamp(k, wx, wy, k.includes('olive') ? TILE.w * 0.95 : TILE.w * 0.55, -700, 0.92)
  }
}
