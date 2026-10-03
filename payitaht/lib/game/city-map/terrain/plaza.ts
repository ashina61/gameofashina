import { CITY_SLOTS, COAST_SLOTS, DEFENSE_SLOTS, DEFENSE_FOUNDATION, ROAD_GRAPH, PLAZA, RING_ROAD, HALL_SLOT_ID, TILE } from '../index'
import { FOOTPRINT_DIAMOND_W, ART_DIAMOND_PX } from '../building-assets'
import { cityFountains, nearStreamAt } from '../city-extras'
import * as Phaser from 'phaser'
import { mulberry32, nearSlot, paintedGroundTexture } from '../terrain-builder'

export function drawPlaza({ T, V, dirtSurface, scene, shoreY, stamp }: { T: { tier: number; }; V: (x: number, y: number) => Phaser.Math.Vector2; dirtSurface: string | null; scene: Phaser.Scene; shoreY: (x: number) => number; stamp: (key: string, wx: number, wy: number, tw: number, depth: number, oy?: number, alpha?: number, tint?: number | undefined) => Phaser.GameObjects.Image | null }) {
  // 2e) MEYDAN VE ÇEVRE DÜZENLEMESİ (Ikariam): Divanhane taş döşeli oval bir
  // meydanın ortasında tek başına durur. Meydanda köşegen çiçek tarhları,
  // önünde şadırvan, girişlerinde bayrak direkleri; meydan ile çevre yolu
  // arası bakımlı çimen. Dört caddenin iki yanı servi ağaçlı.
  const plazaDecor: Phaser.GameObjects.GameObject[] = []
  /** Canlı katmanda dalgalanacak sancak kumaşları (direk/alem burada çizilir). */
  const flags: Array<{ x: number; y: number; w: number; h: number; depth: number; minLevel: number }> = []
  {
    const P = PLAZA.screen, prx = PLAZA.rx, pry = PLAZA.ry
    // Meydan ile çevre yolu arasındaki çayır ilk günden okunur. Gelişmiş
    // park düzeni daha sonra açılır; seviye 1'de geniş düz yeşil leke yerine
    // kırık renkli, biçilmiş ot ve seyrek kır çiçeği görünür.
    T.tier = 0
    const lawn = scene.add.graphics().setDepth(-858)
    lawn.fillStyle(0xb9c978, 0.15); lawn.fillEllipse(P.x, P.y, RING_ROAD.rx * 1.76, RING_ROAD.ry * 1.76)
    const meadowRnd = mulberry32(53091)
    const meadowSlots = [...CITY_SLOTS, ...COAST_SLOTS, ...DEFENSE_SLOTS]
    for (let i = 0; i < 640; i++) {
      const a = meadowRnd() * Math.PI * 2
      const r = 0.49 + meadowRnd() * 0.43
      const x = P.x + Math.cos(a) * RING_ROAD.rx * r
      const y = P.y + Math.sin(a) * RING_ROAD.ry * r
      if (((x - P.x) / prx) ** 2 + ((y - P.y) / pry) ** 2 < 1.25) continue
      if (meadowSlots.some(s => nearSlot(x, y, s, 0.78))) continue
      const color = i % 11 === 0 ? 0xd8cb81 : i % 4 === 0 ? 0x668d49 : 0xaac36c
      lawn.fillStyle(color, i % 11 === 0 ? 0.28 : 0.16)
      lawn.fillEllipse(x, y, 9 + meadowRnd() * 22, 3 + meadowRnd() * 7)
      if (i % 7 === 0) {
        lawn.lineStyle(1.5, 0x527b3d, 0.50)
        lawn.lineBetween(x, y, x - 2, y - 5)
        lawn.lineBetween(x + 3, y, x + 5, y - 4)
      }
    }
    T.tier = 3
    const tendedLawn = scene.add.graphics().setDepth(-857)
    tendedLawn.fillStyle(0xc6db88, 0.12)
    tendedLawn.fillEllipse(P.x, P.y, RING_ROAD.rx * 1.6, RING_ROAD.ry * 1.6)

    // Seviye 1: sıkıştırılmış toprak meydan (taş döşeme 2. seviyede gelir).
    T.tier = 0
    const dirt = scene.add.graphics().setDepth(-796)
    dirt.fillStyle(0x2f421c, 0.16); dirt.fillEllipse(P.x + 8, P.y + 10, prx * 2 + 20, pry * 2 + 16)
    const soilRnd = mulberry32(41381)
    const soilEdge = Array.from({ length: 96 }, (_, i) => {
      const a = i / 96 * Math.PI * 2, r = 0.98 + soilRnd() * 0.04
      return V(P.x + Math.cos(a) * prx * r, P.y + Math.sin(a) * pry * r)
    })
    dirt.fillStyle(0xbfa578, 1); dirt.fillPoints(soilEdge, true)
    if (dirtSurface) {
      const soil = stamp(dirtSurface, P.x, P.y, prx * 2.1, -795.9, 0.5, 0.58)
      soil?.setDisplaySize(prx * 2.1, pry * 2.25)
    }
    // Mottled packed earth, with a worn centre and a broken grassy edge.
    // Static seeded marks share the terrain bake; no animated objects.
    for (let i = 0; i < 1500; i++) {
      const a = soilRnd() * Math.PI * 2, r = Math.sqrt(soilRnd()) * 0.99
      const x = P.x + Math.cos(a) * prx * r, y = P.y + Math.sin(a) * pry * r
      dirt.fillStyle(i % 3 === 0 ? 0x8e7750 : 0xe0c797, 0.07 + soilRnd() * 0.12)
      dirt.fillEllipse(x, y, 5 + soilRnd() * 24, 2 + soilRnd() * 9)
      if (i % 7 === 0) {
        dirt.fillStyle(0x7c6a4d, 0.35); dirt.fillEllipse(x, y, 2.5, 1.5)
        dirt.fillStyle(0xe1cfaa, 0.7); dirt.fillEllipse(x - 0.5, y - 0.8, 2, 1)
      }
      if (r > 0.94 && i % 3 === 0) {
        dirt.lineStyle(1.4, 0x748c45, 0.65)
        dirt.lineBetween(x, y, x - 2, y - 4)
        dirt.lineBetween(x, y, x + 2, y - 3)
      }
    }
    T.tier = 2
    let pz = scene.add.graphics().setDepth(-795)
    const ell = (k: number) => Array.from({ length: 64 }, (_, i) => {
      const t = i / 64 * Math.PI * 2
      return V(P.x + Math.cos(t) * prx * k, P.y + Math.sin(t) * pry * k)
    })
    // Bordür + gölge, taş zemin, iki halka bant.
    pz.fillStyle(0x2f421c, 0.22); pz.fillEllipse(P.x + 10, P.y + 12, prx * 2 + 30, pry * 2 + 24)
    pz.fillStyle(0x9a845e, 1); pz.fillEllipse(P.x, P.y, prx * 2 + 22, pry * 2 + 16)
    pz.fillStyle(0xdccba3, 1); pz.fillEllipse(P.x, P.y, prx * 2, pry * 2)
    pz.fillStyle(0xcfbb91, 1); pz.fillEllipse(P.x, P.y, prx * 1.56, pry * 1.56)
    pz.fillStyle(0xe4d6b3, 1); pz.fillEllipse(P.x, P.y, prx * 1.4, pry * 1.4)
    const plazaSurface = paintedGroundTexture(scene, 't_plaza-stone')
    if (plazaSurface) {
      const img = stamp(plazaSurface, P.x, P.y, prx * 2, -794.8, 0.5, 0.72)
      img?.setDisplaySize(prx * 2, pry * 2)
      if (img) plazaDecor.push(img)
    }
    // Individually laid, staggered limestone voussoirs instead of giant wedges.
    const pavingRnd = mulberry32(29117)
    for (let row = 2; row < 16; row++) {
      const inner = row / 16 + 0.003, outer = (row + 1) / 16 - 0.003
      const count = Math.round(outer * 110)
      for (let i = 0; i < count; i++) {
        const a = (i + (row % 2) * 0.5) / count * Math.PI * 2
        const b = a + Math.PI * 2 / count - 0.006
        const p = (t: number, r: number) => V(P.x + Math.cos(t) * prx * r, P.y + Math.sin(t) * pry * r)
        const band = row === 11 || row === 15
        const colors = band ? [0xab9166, 0xb99f74, 0xc3ad83] : [0xd9c69e, 0xe4d3ae, 0xcfbc95, 0xddcda9]
        pz.fillStyle(colors[Math.floor(pavingRnd() * colors.length)], 1)
        pz.fillPoints([p(a, inner), p(b, inner), p(b, outer), p(a, outer)], true)
        pz.lineStyle(0.8, 0xf5e9cf, 0.45)
        pz.lineBetween(p(a, inner).x, p(a, inner).y, p(b, inner).x, p(b, inner).y)
      }
    }
    pz.lineStyle(3, 0xf1e6ca, 0.9); pz.strokePoints(ell(1), true)
    // KÜRSÜ: Divanhane'nin iki basamaklı taş kaidesi. Görselin zemin
    // elmasıyla aynı yönde ve ortada: bina meydana düz oturur.
    const podium = (hw: number, lift: number, top: number, side: number, rim: number) => {
      const hh = hw / 2
      const N = V(P.x, P.y - hh - lift), E = V(P.x + hw, P.y - lift), S = V(P.x, P.y + hh - lift), W = V(P.x - hw, P.y - lift)
      pz.fillStyle(side, 1)
      pz.fillPoints([W, S, V(S.x, S.y + 12), V(W.x, W.y + 12)], true)
      pz.fillStyle(Phaser.Display.Color.ValueToColor(side).darken(12).color, 1)
      pz.fillPoints([S, E, V(E.x, E.y + 12), V(S.x, S.y + 12)], true)
      pz.fillStyle(top, 1); pz.fillPoints([N, E, S, W], true)
      pz.lineStyle(2.5, rim, 0.9); pz.strokePoints([N, E, S, W], true)
    }
    // Görseldeki zemin elmasının yarı genişliği: 211 sanat pikseli × bina
    // ölçeği (phaser-city artScale) × belediye silüet katsayısı 1.36.
    const hallHalf = 211 * (FOOTPRINT_DIAMOND_W / ART_DIAMOND_PX) * 1.8 * 1.36
    const lowHalf = hallHalf * 1.16
    T.tier = 0; pz = scene.add.graphics().setDepth(-794.9)
    podium(lowHalf, 0, 0xcdb88c, 0xa48b62, 0xeee2c4)
    T.tier = 3; pz = scene.add.graphics().setDepth(-794.8)
    podium(hallHalf * 1.06, 12, 0xe2d3ae, 0xb49b70, 0xf6ecd2)
    // Kürsünün dört ucunda basamak.
    for (const [dx, dy] of [[0, 0.5], [1, 0], [-1, 0], [0, -0.5]]) {
      const ex = P.x + dx * lowHalf, ey = P.y + dy * lowHalf
      pz.fillStyle(0xa48b62, 1); pz.fillEllipse(ex + dx * 16, ey + dy * 20 + 10, 62, 24)
      pz.fillStyle(0xf1e6ca, 1); pz.fillEllipse(ex + dx * 16, ey + dy * 20 + 4, 62, 24)
    }

    // LALE TARHLARI (arka köşegenler): çitle çevrili, kırmızı-sarı laleler.
    T.tier = 4; pz = scene.add.graphics().setDepth(-794.7)
    const fr = mulberry32(8080)
    const tulips = (bx: number, by: number, bw: number, bh: number) => {
      pz.fillStyle(0x3e5f2a, 1); pz.fillEllipse(bx, by + 3, bw + 14, bh + 10)
      pz.fillStyle(0x6f9a48, 1); pz.fillEllipse(bx, by, bw, bh)
      const colors = [0xc8231c, 0xe23b2e, 0xf2c230, 0xf6efe0, 0xa31d4f]
      for (let k = 0; k < 34; k++) {
        const a = fr() * Math.PI * 2, r = Math.sqrt(fr()) * 0.4
        const x = bx + Math.cos(a) * bw * r, y = by + Math.sin(a) * bh * r
        pz.lineStyle(1.4, 0x2f5a22, 1); pz.lineBetween(x, y, x, y - 7)
        pz.fillStyle(colors[k % colors.length], 1)
        pz.fillPoints([V(x - 3, y - 7), V(x - 3.4, y - 12), V(x - 1.2, y - 10), V(x, y - 13), V(x + 1.2, y - 10), V(x + 3.4, y - 12), V(x + 3, y - 7)], true)
      }
    }
    for (const deg of [215, 325]) {
      const t = deg * Math.PI / 180
      tulips(P.x + Math.cos(t) * prx * 0.8, P.y + Math.sin(t) * pry * 0.8, TILE.w * 0.9, TILE.h * 0.55)
    }

    // ÇINAR ve SEKİ (ön köşegenler): meydanın gölgelik ulu çınarları, dibinde
    // yuvarlak taş oturma sekisi.
    T.tier = 3; pz = scene.add.graphics().setDepth(-794.6)
    for (const deg of [35, 145]) {
      const t = deg * Math.PI / 180
      const cx = P.x + Math.cos(t) * prx * 0.8, cy = P.y + Math.sin(t) * pry * 0.8
      pz.fillStyle(0x2f421c, 0.25); pz.fillEllipse(cx + 26, cy + 10, TILE.w * 1.5, TILE.h * 0.7)
      pz.fillStyle(0xa48b62, 1); pz.fillEllipse(cx, cy + 5, TILE.w * 0.62, TILE.h * 0.36)
      pz.fillStyle(0xe9dcbc, 1); pz.fillEllipse(cx, cy, TILE.w * 0.62, TILE.h * 0.36)
      pz.fillStyle(0x6a5a3a, 1); pz.fillEllipse(cx, cy, TILE.w * 0.36, TILE.h * 0.2)
      const img = stamp('d_olive-tree', cx, cy + 2, TILE.w * 1.3, cy + 2, 0.93, 1, 0xb9d49a)
      if (img) plazaDecor.push(img)
    }

    // ŞADIRVAN: sekizgen havuz, sekiz sütun, geniş saçaklı kurşun kubbe, alem.
    const fx = P.x, fy = P.y + pry * 0.74
    const f = scene.add.graphics().setDepth(fy)
    const oct = (rx: number, ry: number, dy = 0) => Array.from({ length: 8 }, (_, i) => {
      const t = (i + 0.5) / 8 * Math.PI * 2
      return V(fx + Math.cos(t) * rx, fy + dy + Math.sin(t) * ry)
    })
    const R = TILE.w * 0.46
    f.fillStyle(0x2f421c, 0.25); f.fillEllipse(fx + 14, fy + 12, R * 2.6, R * 0.9)
    f.fillStyle(0xa48b62, 1); f.fillPoints(oct(R * 1.12, R * 0.56, 4), true)
    f.fillStyle(0xe9dcbc, 1); f.fillPoints(oct(R * 1.12, R * 0.56, -6), true)
    f.fillStyle(0x4f9bb5, 1); f.fillPoints(oct(R * 0.94, R * 0.46, -7), true)
    f.fillStyle(0x8fd0e0, 0.7); f.fillEllipse(fx - 10, fy - 12, R * 0.9, R * 0.22)
    // Sütunlar (arkadakiler önce).
    const colH = TILE.h * 1.25, roofY = fy - 6 - colH
    const cols = Array.from({ length: 8 }, (_, i) => (i + 0.5) / 8 * Math.PI * 2)
      .map(t => ({ x: fx + Math.cos(t) * R * 0.8, y: fy - 6 + Math.sin(t) * R * 0.4 }))
      .sort((a, b) => a.y - b.y)
    for (const c of cols) {
      f.fillStyle(0xf1e8d2, 1); f.fillRect(c.x - 3.5, c.y - colH, 7, colH)
      f.fillStyle(0xc9b893, 1); f.fillRect(c.x + 1, c.y - colH, 2.5, colH)
    }
    // Orta musluk taşı.
    f.fillStyle(0xd9c9a4, 1); f.fillRect(fx - 9, fy - 44, 18, 36)
    // Saçak (geniş sekizgen), kasnak, kurşun kubbe, alem.
    f.fillStyle(0x6d7f7b, 1); f.fillPoints(oct(R * 1.3, R * 0.5, roofY - fy + 6), true)
    f.fillStyle(0x8fa19c, 1); f.fillPoints(oct(R * 1.3, R * 0.5, roofY - fy), true)
    f.fillStyle(0xe8dcc0, 1); f.fillRect(fx - R * 0.55, roofY - 16, R * 1.1, 14)
    f.fillStyle(0x7f9690, 1); f.fillEllipse(fx, roofY - 16, R * 1.1, R * 0.5)
    f.fillStyle(0x9fb3ad, 1); f.fillCircle(fx, roofY - 26, R * 0.52)
    f.fillStyle(0x7f9690, 1); f.fillRect(fx - R * 0.55, roofY - 26, R * 1.1, 10)
    f.fillStyle(0xb9cac5, 0.7); f.fillEllipse(fx - R * 0.2, roofY - 38, R * 0.35, R * 0.22)
    f.fillStyle(0xe2bd78, 1); f.fillRect(fx - 1.5, roofY - 70, 3, 22)
    f.lineStyle(3, 0xe2bd78, 1); f.beginPath(); f.arc(fx + 2, roofY - 74, 6, Math.PI * 0.35, Math.PI * 1.65, false); f.strokePath()
    plazaDecor.push(f)

    T.tier = 2
    // Girişlerde bayrak direkleri (al sancak, ay-yıldız, altın alem).
    const pole = (x: number, y: number) => {
      const g = scene.add.graphics().setDepth(y)
      g.fillStyle(0x2f421c, 0.25); g.fillEllipse(x + 6, y + 3, 22, 8)
      g.fillStyle(0xb39c74, 1); g.fillRect(x - 7, y - 8, 14, 9)
      g.lineStyle(4, 0x5a4630, 1); g.lineBetween(x, y - 6, x, y - 118)
      g.fillStyle(0xe2bd78, 1); g.fillCircle(x, y - 121, 4)
      flags.push({ x: x + 2, y: y - 114, w: 46, h: 30, depth: y + 0.5, minLevel: T.tier }) // kumaş canlı katmanda dalgalanır
      plazaDecor.push(g)
    }
    for (const deg of [90, 270, 0, 180]) {
      const t = deg * Math.PI / 180
      const ex = P.x + Math.cos(t) * prx, ey = P.y + Math.sin(t) * pry
      const side = deg % 180 === 0 ? { x: 0, y: TILE.h * 0.62 } : { x: TILE.w * 0.62, y: 0 }
      pole(ex - side.x, ey - side.y); pole(ex + side.x, ey + side.y)
    }
    T.tier = 5
    // Meydan fenerleri: bordür boyunca demir direkli kandiller.
    for (let k = 0; k < 6; k++) {
      const t = (k + 0.5) / 8 * Math.PI * 2
      const x = P.x + Math.cos(t) * prx * 0.97, y = P.y + Math.sin(t) * pry * 0.97
      const g = scene.add.graphics().setDepth(y)
      g.lineStyle(3, 0x2e2a26, 1); g.lineBetween(x, y, x, y - 58)
      g.lineBetween(x, y - 56, x + 10, y - 60)
      g.fillStyle(0x2e2a26, 1); g.fillTriangle(x + 4, y - 58, x + 16, y - 58, x + 10, y - 66)
      g.fillStyle(0xf6d27a, 1); g.fillRect(x + 6, y - 58, 8, 11)
      g.fillStyle(0x2e2a26, 1); g.fillRect(x + 5, y - 48, 10, 2)
      plazaDecor.push(g)
    }

    T.tier = 3
    // Caddelerin iki yanı servi ağaçlı (yalnızca sur içinde, arsalardan uzak).
    const wall = DEFENSE_FOUNDATION.map(p => p.screen)
    const insideWall = (x: number, y: number) => {
      let inside = false
      for (let i = 0, j = wall.length - 1; i < wall.length; j = i++) {
        const a = wall[i], b = wall[j]
        if ((a.y > y) !== (b.y > y) && x < (b.x - a.x) * (y - a.y) / (b.y - a.y) + a.x) inside = !inside
      }
      return inside
    }
    const nodeAt = new Map(ROAD_GRAPH.nodes.map(n => [n.id, n.screen]))
    const mainIds = (id: string) => id === HALL_SLOT_ID || /^st_(ave|gate|r0$|r6$|r12$|r18$)/.test(id)
    const tr = mulberry32(2718)
    for (const e of ROAD_GRAPH.edges) {
      if (!mainIds(e.from) || !mainIds(e.to)) continue
      if (e.from.startsWith('st_r') && e.to.startsWith('st_r')) continue
      const A = nodeAt.get(e.from)!, B = nodeAt.get(e.to)!
      const len = Math.hypot(B.x - A.x, B.y - A.y), ux = (B.x - A.x) / len, uy = (B.y - A.y) / len
      const off = TILE.w * 0.44
      for (let d = TILE.w * 0.3; d < len - TILE.w * 0.2; d += TILE.w * 0.72) {
        for (const side of [-1, 1]) {
          if (tr() < 0.34) continue
          const x = A.x + ux * d - uy * off * side, y = A.y + uy * d + ux * off * side * 0.8
          const pr = ((x - P.x) / prx) ** 2 + ((y - P.y) / pry) ** 2
          if (pr < 1.35) continue // meydanın kendisi
          const rr = Math.hypot((x - P.x) / RING_ROAD.rx, (y - P.y) / RING_ROAD.ry)
          if (Math.abs(rr - 1) < 0.1) continue // çevre yolu kavşağı
          if (!insideWall(x, y) || y > shoreY(x) - TILE.h * 1.2) continue
          if (cityFountains().some(c => Math.hypot(x - c.x, (y - c.y) * 1.6) < TILE.w * 0.75)) continue // çeşme başı açık
          if (nearStreamAt(x, y, 40, 40)) continue // dere
          if ([...CITY_SLOTS, ...COAST_SLOTS, ...DEFENSE_SLOTS].some(s => s.id !== HALL_SLOT_ID && nearSlot(x, y, s, 0.95))) continue
          const img = stamp(tr() < 0.5 ? 'd_cypress' : 'd_cypress-b', x, y, TILE.w * (0.24 + tr() * 0.05), y, 0.92)
          if (img) plazaDecor.push(img)
        }
      }
    }
  }

  return { flags, plazaDecor }
}
