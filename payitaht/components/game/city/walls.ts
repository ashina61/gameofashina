import * as Phaser from 'phaser'
import { aqueductWallCrossings, cityStream } from '@/lib/game/city-map/city-extras'
import { TILE, DEFENSE_SLOTS, DEFENSE_FOUNDATION, HALL_SLOT_ID, WALL_GATES, slotById } from '@/lib/game/city-map'
import { BUILDINGS, activeJob } from '@/lib/game/engine'
import { isTap } from './shared'
import type { CityScene } from '../phaser-city'

/*
 * SURLAR — şehri ve limanı saran kalın kumtaşı duvar, savunma yuvalarında
 * ve köşelerde kuleler. Haritadaki kapılarda açıklık: kara kapılarında
 * kemerli kapı kulesi, limanda iki kule arasında gerili zincir.
 * Duvar seviyeyle yükselir. Parçalar kısa tutulur ve derinlikleri zemin
 * y'sidir: binalar ve ağaçlarla doğru sıralanır.
 */
export function drawWalls(scene: CityScene, level: number) {
  // Surlar yükseltiliyorsa (ya da ilk kez örülüyorsa) iskele ve sayaç görünür.
  const job = activeJob(scene.state)
  const building = job?.id === 'surlar'
  // İlk örülüşte hendek yerine yarı yükselmiş duvar durur.
  const rising = level <= 0 && building
  const trench = level <= 0 && !building
  /*
   * SEVİYE KADEMESİ (Ikariam gibi sur büyüdükçe görünüşü değişir):
   *  1 (sv. 1-3): alçak moloz taş, mazgal yerine sivri ahşap kazık dizisi.
   *  2 (sv. 4-7): kesme taş, mazgallı.
   *  3 (sv. 8+):  yüksek, tuğla kuşaklı; sancak renginde asılı flamalar.
   */
  const tier = rising || level <= 3 ? 1 : level <= 7 ? 2 : 3
  const ring = DEFENSE_FOUNDATION.map(p => p.screen)
  const n = ring.length
  const wallH = TILE.h * (rising ? 0.5 : tier === 1 ? 0.95 + level * 0.03 : tier === 2 ? 1.05 + Math.min(level, 10) * 0.06 : 1.5 + Math.min(level - 7, 10) * 0.04)
  // Asılı flamalar şehrin sancağıyla (işgalde işgalcininkiyle) aynı renkte.
  const bannerColor = scene.sceneBanner().color
  let pieceNo = 0
  // KAPILAR haritadan gelir (kara kapıları + limanın deniz kapısı). Açıklık
  // halka boyunca yay uzunluğuyla açılır; köşeye düşse de tam genişlikte olur.
  const segLen = ring.map((p, i) => Math.hypot(ring[(i + 1) % n].x - p.x, ring[(i + 1) % n].y - p.y))
  const segStart: number[] = []
  segLen.reduce((acc, l, i) => { segStart[i] = acc; return acc + l }, 0)
  const perimeter = segLen.reduce((x, y) => x + y, 0)
  const pointAt = (s: number) => {
    const w = ((s % perimeter) + perimeter) % perimeter
    let i = 0
    while (i < n - 1 && segStart[i + 1] <= w) i++
    const u = (w - segStart[i]) / (segLen[i] || 1), A = ring[i], B = ring[(i + 1) % n]
    return { x: A.x + (B.x - A.x) * u, y: A.y + (B.y - A.y) * u }
  }
  const gateSpans = [...WALL_GATES, ...aqueductWallCrossings().map(screen => ({ kind: 'aq' as const, screen }))].map(gate => {
    let best = { s: 0, d: Infinity }
    for (let i = 0; i < n; i++) {
      const A = ring[i], B = ring[(i + 1) % n], dx = B.x - A.x, dy = B.y - A.y
      const u = Math.max(0, Math.min(1, ((gate.screen.x - A.x) * dx + (gate.screen.y - A.y) * dy) / (dx * dx + dy * dy || 1)))
      const d = Math.hypot(A.x + dx * u - gate.screen.x, A.y + dy * u - gate.screen.y)
      if (d < best.d) best = { s: segStart[i] + u * segLen[i], d }
    }
    const half = gate.kind === 'sea' ? TILE.w * 1.3 : gate.kind === 'aq' ? TILE.w * 0.42 : TILE.w * 0.5
    return { kind: gate.kind, s0: best.s - half, s1: best.s + half, center: pointAt(best.s) }
  })
  // Her kenar için [t0, t1] açıklıkları.
  const gates: Array<{ seg: number; t0: number; t1: number }> = []
  for (const g of gateSpans) {
    for (let i = 0; i < n; i++) {
      for (const shift of [-perimeter, 0, perimeter]) {
        const a0 = segStart[i] + shift, a1 = a0 + segLen[i]
        const lo = Math.max(a0, g.s0), hi = Math.min(a1, g.s1)
        if (hi > lo) gates.push({ seg: i, t0: (lo - a0) / segLen[i], t1: (hi - a0) / segLen[i] })
      }
    }
  }
  const hits = gateSpans.map(g => g.center)
  // Örülmüş sura (parça, burç, kapı) dokunmak Surlar sayfasını açar.
  const tapWall = (o: Phaser.GameObjects.GameObject) => {
    o.on('pointerup', (ptr: Phaser.Input.Pointer) => { if (isTap(ptr) && !scene.moving) scene.events$.onBuilding('surlar') })
  }

  const V = (x: number, y: number) => new Phaser.Math.Vector2(x, y)
  const hall = slotById(HALL_SLOT_ID)!.screen
  // Zemin (karo) uzayında dik vektör: duvarın KALINLIĞI şehre doğru uzanır.
  const thick = (p0: { x: number; y: number }, p1: { x: number; y: number }) => {
    const gx = (x: number, y: number) => (x / (TILE.w / 2) + y / (TILE.h / 2)) / 2
    const gy = (x: number, y: number) => (y / (TILE.h / 2) - x / (TILE.w / 2)) / 2
    const dgx = gx(p1.x - p0.x, p1.y - p0.y), dgy = gy(p1.x - p0.x, p1.y - p0.y)
    const l = Math.hypot(dgx, dgy) || 1
    const ngx = -dgy / l * 0.42, ngy = dgx / l * 0.42 // 0.42 karo kalınlık
    const nx = (ngx - ngy) * TILE.w / 2, ny = (ngx + ngy) * TILE.h / 2
    const mx = (p0.x + p1.x) / 2, my = (p0.y + p1.y) / 2
    if ((hall.x - mx) * nx + (hall.y - my) * ny < 0) return { x: -nx, y: -ny }
    return { x: nx, y: ny }
  }
  // TEMEL HENDEĞİ: kazılmış koyu toprak şerit, dışında atılmış toprak seti,
  // iç kenarda ip gerili ölçü kazıkları. Binaların altında kalır.
  const ditch = (p0: { x: number; y: number }, p1: { x: number; y: number }) => {
    const t = thick(p0, p1), nv = { x: t.x * 2.2, y: t.y * 2.2 }
    const q0 = { x: p0.x + nv.x, y: p0.y + nv.y }, q1 = { x: p1.x + nv.x, y: p1.y + nv.y }
    const g = scene.add.graphics().setDepth(-780)
    // Dışa atılmış toprak seti.
    g.fillStyle(0xb99a68, 0.9)
    g.fillPoints([V(p0.x - nv.x * 0.35, p0.y - nv.y * 0.35), V(p1.x - nv.x * 0.35, p1.y - nv.y * 0.35), V(p1.x, p1.y), V(p0.x, p0.y)], true)
    // Hendek: kenarları açık, dibi koyu (derinlik hissi).
    g.fillStyle(0x7a5a36, 1); g.fillPoints([V(p0.x, p0.y), V(p1.x, p1.y), V(q1.x, q1.y), V(q0.x, q0.y)], true)
    const i0 = { x: p0.x + nv.x * 0.25, y: p0.y + nv.y * 0.25 }, i1 = { x: p1.x + nv.x * 0.25, y: p1.y + nv.y * 0.25 }
    const j0 = { x: p0.x + nv.x * 0.75, y: p0.y + nv.y * 0.75 }, j1 = { x: p1.x + nv.x * 0.75, y: p1.y + nv.y * 0.75 }
    g.fillStyle(0x4e3820, 1); g.fillPoints([V(i0.x, i0.y + 3), V(i1.x, i1.y + 3), V(j1.x, j1.y + 3), V(j0.x, j0.y + 3)], true)
    g.lineStyle(1.4, 0x3a2914, 0.5); g.lineBetween(p0.x, p0.y, p1.x, p1.y)
    g.lineStyle(1.4, 0xd8c08e, 0.7); g.lineBetween(q0.x, q0.y, q1.x, q1.y)
    scene.pieces.push(g)
    // Ölçü kazıkları ve ip (iç kenarda, kendi y'sinde).
    const k = scene.add.graphics().setDepth(Math.max(q0.y, q1.y) + 1)
    const len = Math.hypot(q1.x - q0.x, q1.y - q0.y), ux = (q1.x - q0.x) / (len || 1), uy = (q1.y - q0.y) / (len || 1)
    const posts: Array<{ x: number; y: number }> = []
    for (let d = TILE.w * 0.12; d < len; d += TILE.w * 0.45) posts.push({ x: q0.x + ux * d, y: q0.y + uy * d })
    k.lineStyle(1.2, 0xefe2c0, 0.85)
    for (let i = 1; i < posts.length; i++) k.lineBetween(posts[i - 1].x, posts[i - 1].y - 9, posts[i].x, posts[i].y - 9)
    for (const p of posts) { k.fillStyle(0x6b4a2b, 1); k.fillRect(p.x - 2.5, p.y - 22, 5, 22); k.fillStyle(0xb3261e, 1); k.fillRect(p.x - 2.5, p.y - 24, 5, 5) }
    scene.pieces.push(k)
    // Dışarı atılmış toprak yığınları.
    const m = scene.add.graphics().setDepth(Math.max(p0.y, p1.y))
    const plen = Math.hypot(p1.x - p0.x, p1.y - p0.y)
    for (let d = TILE.w * 0.3; d < plen; d += TILE.w * 0.8) {
      const x = p0.x + (p1.x - p0.x) * d / plen - nv.x * 0.45, y = p0.y + (p1.y - p0.y) * d / plen - nv.y * 0.45
      m.fillStyle(0x8d6a40, 1); m.fillEllipse(x, y, TILE.w * 0.34, TILE.h * 0.3)
      m.fillStyle(0xb99a68, 1); m.fillEllipse(x - 3, y - 4, TILE.w * 0.22, TILE.h * 0.16)
    }
    scene.pieces.push(m)
    // Hendeğe dokunmak Surlar sayfasını açar (binaların altında kalır).
    const cx = (p0.x + p1.x + q0.x + q1.x) / 4, cy = (p0.y + p1.y + q0.y + q1.y) / 4
    const hw = Math.max(Math.abs(p1.x - p0.x), Math.abs(nv.x)) + TILE.w * 0.3, hh = Math.max(Math.abs(p1.y - p0.y), Math.abs(nv.y)) + TILE.h * 0.5
    const hit = scene.add.rectangle(cx, cy, hw, hh).setInteractive({ useHandCursor: true }).setFillStyle(0xffffff, 0).setDepth(-700)
    hit.on('pointerup', (ptr: Phaser.Input.Pointer) => { if (isTap(ptr) && !scene.moving) scene.events$.onBuilding('surlar') })
    scene.pieces.push(hit)
  }
  const piece = (p0: { x: number; y: number }, p1: { x: number; y: number }) => {
    if (trench) return ditch(p0, p1)
    const n = thick(p0, p1)
    // Ön yüz: izleyiciye (ekranda aşağıya) bakan kenar.
    const inFront = n.y > 0
    const f0 = inFront ? { x: p0.x + n.x, y: p0.y + n.y } : p0
    const f1 = inFront ? { x: p1.x + n.x, y: p1.y + n.y } : p1
    const b0 = inFront ? p0 : { x: p0.x + n.x, y: p0.y + n.y }
    const b1 = inFront ? p1 : { x: p1.x + n.x, y: p1.y + n.y }
    const g = scene.add.graphics().setDepth(Math.max(f0.y, f1.y) + 1)
    const dx = f1.x - f0.x, dy = f1.y - f0.y
    // Işık sol-üstten: "\\" yönlü yüzler aydınlık, "/" yönlüler gölgede.
    const lit = dx * dy > 0 ? 1 : Math.abs(dy) < Math.abs(dx) * 0.2 ? 0.6 : 0.25
    const face = tier === 1
      ? (lit > 0.8 ? 0xc7b796 : lit > 0.5 ? 0xb5a482 : 0x9c8a6a)
      : (lit > 0.8 ? 0xdcc497 : lit > 0.5 ? 0xcbb083 : 0xb0936a)
    const top = 0xeadbb6
    // Zemin gölgesi.
    g.fillStyle(0x1b2a14, 0.22)
    g.fillPoints([V(f0.x, f0.y), V(f1.x, f1.y), V(f1.x + TILE.w * 0.2, f1.y + TILE.h * 0.3), V(f0.x + TILE.w * 0.2, f0.y + TILE.h * 0.3)], true)
    // Kaide (koyu taş şerit) + ön yüz.
    g.fillStyle(face, 1)
    g.fillPoints([V(f0.x, f0.y), V(f1.x, f1.y), V(f1.x, f1.y - wallH), V(f0.x, f0.y - wallH)], true)
    g.fillStyle(0x7d6444, 0.35)
    g.fillPoints([V(f0.x, f0.y), V(f1.x, f1.y), V(f1.x, f1.y - wallH * 0.14), V(f0.x, f0.y - wallH * 0.14)], true)
    const len = Math.hypot(dx, dy), ux = dx / (len || 1), uy = dy / (len || 1)
    // Ashlar courses: staggered joints, chipped light edges and varied stone.
    // Coordinates seed the patina, so redraws never shuffle the masonry.
    const stoneW = TILE.w * 0.16, courses = 6
    const stonePoint = (d: number, h: number) => V(f0.x + ux * d, f0.y + uy * d - h)
    for (let row = 0; row < courses; row++) {
      const lo = row * wallH / courses + 1, hi = (row + 1) * wallH / courses - 0.8
      for (let col = -1; col * stoneW < len; col++) {
        const start = Math.max(0, (col + (row % 2) * 0.5) * stoneW + 0.7)
        const end = Math.min(len, (col + 1 + (row % 2) * 0.5) * stoneW - 0.7)
        if (end <= start) continue
        const variation = Math.abs(Math.sin(p0.x * 0.13 + p0.y * 0.17 + row * 7.1 + col * 3.7))
        const c = Phaser.Display.Color.ValueToColor(face)
        if (variation > 0.5) c.lighten(variation * 7)
        else c.darken((0.5 - variation) * 12)
        g.fillStyle(c.color, 1)
        g.fillPoints([stonePoint(start, lo), stonePoint(end, lo), stonePoint(end, hi), stonePoint(start, hi)], true)
        g.lineStyle(0.9, 0xffedc9, 0.32)
        const a = stonePoint(start + 1, hi), b = stonePoint(end, hi)
        g.lineBetween(a.x, a.y, b.x, b.y)
      }
    }
    // Rain-darkened foot and a shallow string course under the parapet.
    g.lineStyle(3, 0x59603b, 0.26)
    g.lineBetween(f0.x, f0.y - 3, f1.x, f1.y - 3)
    g.lineStyle(4, 0x735b3d, 0.30)
    g.lineBetween(f0.x, f0.y - wallH * 0.83, f1.x, f1.y - wallH * 0.83)
    g.lineStyle(2, 0xf0ddb2, 0.8)
    g.lineBetween(f0.x, f0.y - wallH * 0.86, f1.x, f1.y - wallH * 0.86)
    // Recessed arrow slit, painted only: no new interaction or collision.
    if (len > TILE.w * 0.32) {
      const p = stonePoint(len * 0.5, wallH * 0.66)
      g.lineStyle(5, 0xf1dcb3, 0.65); g.lineBetween(p.x + 2, p.y - 6, p.x + 2, p.y + 8)
      g.lineStyle(3, 0x493e30, 0.9); g.lineBetween(p.x, p.y - 7, p.x, p.y + 7)
    }
    // Üst yürüyüş yolu (kalınlık görünür).
    g.fillStyle(top, 1)
    g.fillPoints([V(f0.x, f0.y - wallH), V(f1.x, f1.y - wallH), V(b1.x, b1.y - wallH), V(b0.x, b0.y - wallH)], true)
    g.lineStyle(1.4, 0x8a6c47, 0.45)
    g.lineBetween(b0.x, b0.y - wallH, b1.x, b1.y - wallH)
    // Kademe 3: iki sıra kırmızı tuğla kuşağı (Theodosius surları gibi).
    if (tier === 3) {
      for (const f of [0.3, 0.58]) {
        g.lineStyle(4, 0x9a4a32, 0.85); g.lineBetween(f0.x, f0.y - wallH * f, f1.x, f1.y - wallH * f)
        g.lineStyle(1, 0xd98a64, 0.6); g.lineBetween(f0.x, f0.y - wallH * f - 2, f1.x, f1.y - wallH * f - 2)
      }
    }
    const no = pieceNo++
    // Dokunma alanı: ön yüz + üst yol + mazgal payı (parmak için biraz geniş).
    // Çizimden AYRI görünmez bölge: duvar Graphics'i dokuya pişirilince
    // (BakeAtlas) kendi giriş alanı yok olur, bölge kalır.
    const wallHit = (o: Phaser.GameObjects.Graphics) => {
      const up = wallH + TILE.h * 0.3
      const zone = scene.add.zone(0, 0, 1, 1).setOrigin(0, 0).setDepth(o.depth + 0.01).setInteractive({
        hitArea: new Phaser.Geom.Polygon([f0.x, f0.y + 6, f1.x, f1.y + 6, f1.x, f1.y - up, b1.x, b1.y - up, b0.x, b0.y - up, f0.x, f0.y - up]),
        hitAreaCallback: Phaser.Geom.Polygon.Contains, useHandCursor: true,
      })
      tapWall(zone)
      scene.pieces.push(zone)
    }
    // Kademe 1: mazgal yerine sivri uçlu ahşap kazık dizisi.
    if (tier === 1) {
      if (!rising) {
        for (let d = TILE.w * 0.04; d <= len - 2; d += TILE.w * 0.07) {
          const a = { x: f0.x + ux * d, y: f0.y + uy * d - wallH }
          g.fillStyle(0x7a5532, 1); g.fillRect(a.x - 2.2, a.y - TILE.h * 0.22, 4.4, TILE.h * 0.22)
          g.fillStyle(0x5c3d22, 1); g.fillTriangle(a.x - 2.2, a.y - TILE.h * 0.22, a.x + 2.2, a.y - TILE.h * 0.22, a.x, a.y - TILE.h * 0.3)
        }
        g.lineStyle(2, 0x4e3420, 0.9); g.lineBetween(f0.x, f0.y - wallH - TILE.h * 0.08, f1.x, f1.y - wallH - TILE.h * 0.08)
      }
      g.lineStyle(1.6, 0x5e4630, 0.6); g.lineBetween(f0.x, f0.y, f1.x, f1.y)
      wallHit(g)
      scene.pieces.push(g)
      if (building && (rising || (inFront && no % 2 === 0))) scene.scaffoldOn(f0, f1, wallH, Math.max(f0.y, f1.y) + 1.05)
      return
    }
    // Mazgallar (ön kenar boyunca).
    const step = TILE.w * 0.17, mw = TILE.w * 0.09, mh = TILE.h * 0.2
    // Kademe 3: öne bakan her üçüncü parçada sancak renginde asılı flama.
    if (tier === 3 && inFront && no % 3 === 1 && len > TILE.w * 0.3) {
      const m = { x: f0.x + ux * len * 0.5, y: f0.y + uy * len * 0.5 }
      const w = TILE.w * 0.11, h = wallH * 0.62, top0 = m.y - wallH * 0.97
      const dark = Phaser.Display.Color.ValueToColor(bannerColor).darken(22).color
      g.fillStyle(0x000000, 0.18); g.fillRect(m.x - w / 2 + 3, top0 + 3, w, h)
      g.fillStyle(bannerColor, 1)
      g.fillPoints([V(m.x - w / 2, top0), V(m.x + w / 2, top0), V(m.x + w / 2, top0 + h), V(m.x, top0 + h - w * 0.55), V(m.x - w / 2, top0 + h)], true)
      g.fillStyle(dark, 1); g.fillRect(m.x - w / 2, top0, w, 4)
      g.fillStyle(0xe2bd78, 1); g.fillRect(m.x - w / 2 - 2, top0 - 2, w + 4, 3)
      g.fillStyle(0xf6efe0, 1); g.fillCircle(m.x, top0 + h * 0.38, w * 0.22)
      g.fillStyle(bannerColor, 1); g.fillCircle(m.x + w * 0.08, top0 + h * 0.38, w * 0.17)
    }
    for (let d = step * 0.3; d + mw <= len; d += step) {
      const a = { x: f0.x + ux * d, y: f0.y + uy * d - wallH }
      const b = { x: a.x + ux * mw, y: a.y + uy * mw }
      g.fillStyle(face, 1)
      g.fillPoints([V(a.x, a.y), V(b.x, b.y), V(b.x, b.y - mh), V(a.x, a.y - mh)], true)
      g.fillStyle(top, 1)
      g.fillPoints([V(a.x, a.y - mh), V(b.x, b.y - mh), V(b.x + n.x * 0.35 * (inFront ? -1 : 1), b.y - mh + n.y * 0.35 * (inFront ? -1 : 1)), V(a.x + n.x * 0.35 * (inFront ? -1 : 1), a.y - mh + n.y * 0.35 * (inFront ? -1 : 1))], true)
      const bx = n.x * 0.35 * (inFront ? -1 : 1), by = n.y * 0.35 * (inFront ? -1 : 1)
      g.fillStyle(0x8e7757, 1)
      g.fillPoints([V(b.x, b.y), V(b.x + bx, b.y + by), V(b.x + bx, b.y + by - mh), V(b.x, b.y - mh)], true)
      g.lineStyle(1, 0xffebc6, 0.8); g.lineBetween(a.x, a.y - mh, b.x, b.y - mh)
    }
    g.lineStyle(1.6, 0x5e4630, 0.6); g.lineBetween(f0.x, f0.y, f1.x, f1.y)
    g.lineStyle(1.2, 0x6e5436, 0.5); g.lineBetween(f0.x, f0.y - wallH, f1.x, f1.y - wallH)
    wallHit(g)
    scene.pieces.push(g)
    // Yükseltme sürerken öne bakan parçaların önünde ahşap iskele.
    if (building && inFront && no % 2 === 0) scene.scaffoldOn(f0, f1, wallH, Math.max(f0.y, f1.y) + 1.05)
  }

  // Duvar parçaları (kapı açıklıkları atlanır).
  for (let i = 0; i < n; i++) {
    const A = ring[i], B = ring[(i + 1) % n]
    const len = Math.hypot(B.x - A.x, B.y - A.y)
    const holes = gates.filter(g => g.seg === i).map(g => [g.t0, g.t1] as const)
    const count = Math.max(1, Math.ceil(len / (TILE.w * 0.5)))
    for (let k = 0; k < count; k++) {
      let t0 = k / count, t1 = (k + 1) / count
      for (const [h0, h1] of holes) {
        if (t1 <= h0 || t0 >= h1) continue
        if (t0 < h0 && t1 > h1) { // parça açıklığı ortalıyor: iki yana böl
          piece({ x: A.x + (B.x - A.x) * t0, y: A.y + (B.y - A.y) * t0 }, { x: A.x + (B.x - A.x) * h0, y: A.y + (B.y - A.y) * h0 })
          t0 = h1
        } else if (t0 < h0) t1 = h0
        else t0 = h1
      }
      if (t1 - t0 > 0.002) piece({ x: A.x + (B.x - A.x) * t0, y: A.y + (B.y - A.y) * t0 }, { x: A.x + (B.x - A.x) * t1, y: A.y + (B.y - A.y) * t1 })
    }
  }

  if (trench) { scene.drawWallSite(ring); return }
  if (building && job) {
    const front = scene.wallFront(ring)
    scene.pieces.push(scene.makeTimer(front.x, front.y + TILE.h * 0.5, job.start, job.end, 1e6 + front.y))
  }
  // Etiketler açıkken (ya da yükseltme sürerken) diğer binalar gibi seviye + ad.
  if (level > 0 && (scene.showLabels || building)) {
    const front = scene.wallFront(ring)
    scene.pieces.push(scene.makePaintedLabel(front.x, front.y - wallH - TILE.h * 0.2, level, BUILDINGS.surlar.name, 1e6 + front.y))
  }
  if (rising) return
  // Kuleler: savunma yuvalarında büyük, kapı iki yanında küçük.
  const tower = (x: number, y: number, w: number) => {
    const base = scene.add.graphics().setDepth(y + 1.5)
    base.fillStyle(0x1b2a14, 0.24); base.fillEllipse(x + w * 0.18, y + w * 0.08, w * 1.3, w * 0.5)
    base.fillStyle(0xb3966c, 1); base.fillEllipse(x, y, w * 1.02, w * 0.42)
    scene.pieces.push(base)
    if (scene.textures.exists('w_tower')) {
      const img = scene.add.image(x, y - w * 0.04, 'w_tower').setOrigin(0.5, 1).setDepth(y + 2)
      img.setScale(w / img.width)
      img.setInteractive({ useHandCursor: true }); tapWall(img)
      scene.pieces.push(img)
      // Her kulede al sancak (ay-yıldız), rüzgârda dalgalı.
      const top = y - w * 0.04 - img.height * (w / img.width) + w * 0.06
      const f = scene.add.graphics().setDepth(y + 2.1)
      f.lineStyle(2.5, 0x4a3a28, 1); f.lineBetween(x, top, x, top - w * 0.62)
      f.fillStyle(0xe2bd78, 1); f.fillCircle(x, top - w * 0.64, 2.6)
      scene.pieces.push(f)
      scene.flagField?.add({ x: x + 1, y: top - w * 0.6, w: w * 0.5, h: w * 0.3, depth: y + 2.15 }, 'pieces')
    }
  }
  const placed: Array<{ x: number; y: number }> = []
  // Açılışta görünen (en kuzeydeki) kara kapısı: seviye madalyonu burada.
  let northGate: { x: number; y: number; depth: number } | null = null
  for (const s of DEFENSE_SLOTS) {
    tower(s.screen.x, s.screen.y + TILE.h * 0.2, TILE.w * (tier === 1 ? 0.66 : tier === 3 ? 0.86 : 0.78))
    placed.push(s.screen)
  }
  // KAPILAR. Kara kapısı: iki kule + kemerli kapı kulesi (lento, mazgal,
  // sancak). Deniz kapısı: iki büyük kule arasında gerili liman zinciri.
  for (const g of gateSpans) {
    const land = g.kind === 'land'
    const pad = TILE.w * 0.1
    const L = pointAt(g.s0 - pad), R = pointAt(g.s1 + pad)
    for (const p of [L, R]) {
      placed.push(p)
      tower(p.x, p.y + TILE.h * 0.12, TILE.w * (land ? 0.66 : g.kind === 'aq' ? 0.5 : 0.9))
    }
    if (g.kind === 'aq') continue // su kapısı: kemer açıklıktan geçer, iki küçük burç yeter
    const lg = scene.add.graphics().setDepth(Math.max(L.y, R.y) + 1.8)
    if (land) {
      // Kapı kulesi: yolun üstüne oturan kemerli taş blok. Kemer, geçidin
      // baktığı yüzde (kuzey kapısında ön yüz, yan kapılarda yan yüz).
      const c = g.center, w = TILE.w * 1.1, h = wallH * 1.7, d = w * 0.34
      const x0 = c.x - w / 2, x1 = c.x + w / 2, y0 = c.y + TILE.h * 0.3
      const tgA = pointAt(g.s0), tgB = pointAt(g.s1)
      const sideGate = Math.abs(tgB.y - tgA.y) > Math.abs(tgB.x - tgA.x) // duvar dikey: geçit doğu-batı
      lg.fillStyle(0x1b2a14, 0.24); lg.fillEllipse(c.x + w * 0.25, y0 + 6, w * 1.5, w * 0.34)
      // Yan yüz (sağ), ön yüz, üst.
      lg.fillStyle(0xb0936a, 1); lg.fillPoints([V(x1, y0), V(x1 + d, y0 - d / 2), V(x1 + d, y0 - d / 2 - h), V(x1, y0 - h)], true)
      lg.fillStyle(0xdcc497, 1); lg.fillRect(x0, y0 - h, w, h)
      lg.fillStyle(0xeadbb6, 1); lg.fillPoints([V(x0, y0 - h), V(x1, y0 - h), V(x1 + d, y0 - d / 2 - h), V(x0 + d, y0 - d / 2 - h)], true)
      // Taş sıraları.
      lg.lineStyle(1.2, 0x8a6c47, 0.32)
      for (const f of [0.25, 0.45, 0.65, 0.85]) lg.lineBetween(x0, y0 - h * f, x1, y0 - h * f)
      lg.fillStyle(0x7d6444, 0.35); lg.fillRect(x0, y0 - h * 0.1, w, h * 0.1)
      // Kemerli geçit (koyu) ve açık ahşap kanat.
      const arch = (cx: number, by: number, aw: number, ah: number, skew: number) => {
        const pts: Phaser.Math.Vector2[] = [V(cx - aw / 2, by - skew * aw / 2)]
        for (let k = 0; k <= 12; k++) {
          const t = Math.PI - k / 12 * Math.PI
          pts.push(V(cx + Math.cos(t) * aw / 2, by - ah - Math.sin(t) * aw * 0.42 + skew * Math.cos(t) * aw / 2))
        }
        pts.push(V(cx + aw / 2, by + skew * aw / 2))
        return pts
      }
      lg.fillStyle(0x2e2216, 0.92)
      if (sideGate) lg.fillPoints(arch(x1 + d / 2, y0 - d / 4, d * 0.78, h * 0.42, -0.5), true)
      else lg.fillPoints(arch(c.x, y0, w * 0.42, h * 0.42, 0), true)
      // Mazgallar ve sancak.
      for (let k = 0; k < 5; k++) {
        const x = x0 + (k + 0.2) * w / 5
        lg.fillStyle(0xdcc497, 1); lg.fillRect(x, y0 - h - 14, w / 10, 14)
        lg.fillStyle(0xeadbb6, 1); lg.fillRect(x, y0 - h - 16, w / 10, 3)
      }
      const mx = c.x + d / 2, my = y0 - h - d / 4
      lg.lineStyle(3, 0x5a4630, 1); lg.lineBetween(mx, my, mx, my - 70)
      lg.fillStyle(0xe2bd78, 1); lg.fillCircle(mx, my - 72, 3.5)
      lg.setDepth(y0 + 2)
      scene.flagField?.add({ x: mx + 2, y: my - 68, w: 44, h: 30, depth: y0 + 2.1 }, 'pieces')
      // KİTABE: kemerin üstünde mermer levha (süs; seviye madalyonda yazar).
      const kx = c.x, ky = y0 - h * 0.72, kw = w * 0.42, kh = h * 0.24
      lg.fillStyle(0x3a2914, 0.35); lg.fillRoundedRect(kx - kw / 2 + 2, ky - kh / 2 + 2, kw, kh, 4)
      lg.fillStyle(0xf4ead2, 1); lg.fillRoundedRect(kx - kw / 2, ky - kh / 2, kw, kh, 4)
      lg.lineStyle(2, 0xb08a4e, 1); lg.strokeRoundedRect(kx - kw / 2, ky - kh / 2, kw, kh, 4)
      lg.lineStyle(1.5, 0x8a6c47, 0.7)
      for (const f of [0.35, 0.65]) lg.lineBetween(kx - kw * 0.32, ky - kh / 2 + kh * f, kx + kw * 0.32, ky - kh / 2 + kh * f)
      if (!northGate || y0 < northGate.y) northGate = { x: c.x, y: y0 - h - 18, depth: y0 }
      const gateHit = scene.add.rectangle(c.x + d / 2, y0 - h / 2 - 8, w + d, h + 24).setInteractive({ useHandCursor: true })
        .setFillStyle(0xffffff, 0).setDepth(y0 + 2.2)
      tapWall(gateHit)
      scene.pieces.push(gateHit)
    } else {
      // Liman zinciri: kulelerden sarkan halkalı zincir + şamandıralar.
      const pts: Phaser.Math.Vector2[] = []
      for (let k = 0; k <= 24; k++) {
        const t = k / 24
        pts.push(V(L.x + (R.x - L.x) * t, L.y + (R.y - L.y) * t - wallH * 0.55 + Math.sin(t * Math.PI) * wallH * 0.5))
      }
      lg.lineStyle(5, 0x2b2622, 0.9); lg.strokePoints(pts, false)
      for (let k = 1; k < 24; k += 1) { lg.fillStyle(0x4a423a, 1); lg.fillCircle(pts[k].x, pts[k].y, 3) }
      for (const t of [0.3, 0.7]) {
        const p = pts[Math.round(t * 24)]
        lg.fillStyle(0xb3261e, 1); lg.fillEllipse(p.x, p.y + 8, 18, 10)
      }
    }
    scene.pieces.push(lg)
  }
  // Seviye her zaman okunur: ana kapının üstünde ekranda sabit boyda madalyon
  // (etiketler açıkken tam etiket zaten seviye gösterir).
  const gateBadge = northGate as { x: number; y: number; depth: number } | null
  if (gateBadge && !scene.showLabels && !building) scene.pieces.push(scene.makeLevelBadge(gateBadge.x, gateBadge.y, level, 1e6 + gateBadge.depth))
  // SU KEMERLERİ: derenin surun altından geçtiği yerde demir parmaklıklı kemer.
  for (const a of cityStream().wallArches) {
    const g = scene.add.graphics().setDepth(a.y + 1.9)
    const aw = 34, ah = wallH * 0.5
    g.fillStyle(0x223a40, 0.9); g.beginPath(); g.moveTo(a.x - aw / 2, a.y + 2); g.lineTo(a.x - aw / 2, a.y - ah * 0.5)
    g.arc(a.x, a.y - ah * 0.5, aw / 2, Math.PI, 0, false); g.lineTo(a.x + aw / 2, a.y + 2); g.closePath(); g.fillPath()
    g.lineStyle(2, 0x3a3530, 1)
    for (let k = -2; k <= 2; k++) g.lineBetween(a.x + k * 6, a.y + 2, a.x + k * 6, a.y - ah * 0.5 - Math.sqrt(Math.max(0, 1 - (k * 6 / (aw / 2)) ** 2)) * aw / 2)
    g.lineStyle(2.5, 0xeadbb6, 1); g.beginPath(); g.arc(a.x, a.y - ah * 0.5, aw / 2 + 2, Math.PI, 0, false); g.strokePath()
    scene.pieces.push(g)
  }
  // Ara burçlar: halkanın köşelerinde düzenli aralıkla (kapılarda değil).
  for (const p of ring) {
    if (placed.some(q => Math.hypot(q.x - p.x, q.y - p.y) < TILE.w * 3.2)) continue
    if (hits.some(h => Math.hypot(h.x - p.x, h.y - p.y) < TILE.w * 1.2)) continue
    placed.push(p)
    tower(p.x, p.y + TILE.h * 0.15, TILE.w * 0.6)
  }
}
/**
 * SUR TEMELİ (sur henüz yokken): kule yuvalarında taş yığını ve iskele
 * kazığı, en öndeki kule yuvasında "Surları ör" tabelası. Hendeğe ya da
 * tabelaya dokunmak Surlar sayfasını açar.
 */
/**
 * Surun "ön" noktası: kuzey kapısının hemen yanı (açılışta ekranda);
 * halkanın Divanhane'nin kuzeyinde, ona yatayda en yakın noktası.
 * Tabela ve inşaat sayacı burada durur.
 */
export function wallFront(scene: CityScene, ring: Array<{ x: number; y: number }>) {
  const hall = slotById(HALL_SLOT_ID)!.screen
  let front = ring[0], best = Infinity
  for (let i = 0; i < ring.length; i++) {
    const A = ring[i], B = ring[(i + 1) % ring.length]
    for (let k = 0; k <= 30; k++) {
      const q = { x: A.x + (B.x - A.x) * k / 30, y: A.y + (B.y - A.y) * k / 30 }
      if (q.y >= hall.y || WALL_GATES.some(g => Math.hypot(g.screen.x - q.x, g.screen.y - q.y) < TILE.w * 1.1)) continue
      const score = Math.abs(q.x - hall.x) + Math.abs(q.y - hall.y) * 0.05
      if (score < best) { best = score; front = q }
    }
  }
  return front
}
/** Duvar yüzünün önünde ahşap iskele: dikmeler, iki kat tahta, çapraz payanda. */
export function scaffoldOn(scene: CityScene, f0: { x: number; y: number }, f1: { x: number; y: number }, h: number, depth: number) {
  const g = scene.add.graphics().setDepth(depth)
  const len = Math.hypot(f1.x - f0.x, f1.y - f0.y), ux = (f1.x - f0.x) / (len || 1), uy = (f1.y - f0.y) / (len || 1)
  const at = (d: number, z: number) => ({ x: f0.x + ux * d + 2, y: f0.y + uy * d + 4 - z })
  const posts: number[] = []
  for (let d = TILE.w * 0.04; d < len; d += TILE.w * 0.2) posts.push(d)
  g.lineStyle(2.6, 0x6e4a26, 1)
  for (const d of posts) { const a = at(d, 0), b = at(d, h + 10); g.lineBetween(a.x, a.y, b.x, b.y) }
  g.lineStyle(3.2, 0xa8773f, 1)
  for (const z of [h * 0.42, h * 0.84]) { const a = at(0, z), b = at(len, z); g.lineBetween(a.x, a.y, b.x, b.y) }
  g.lineStyle(1.6, 0x6e4a26, 0.9)
  for (let i = 1; i < posts.length; i += 2) { const a = at(posts[i - 1], 0), b = at(posts[i], h * 0.42); g.lineBetween(a.x, a.y, b.x, b.y) }
  // Tahtada kesme taş blokları.
  const m = at(len * 0.5, h * 0.42)
  g.fillStyle(0xd9c7a1, 1); g.fillRect(m.x - 6, m.y - 7, 9, 6); g.fillRect(m.x + 4, m.y - 6, 7, 5)
  scene.pieces.push(g)
}
export function drawWallSite(scene: CityScene, ring: Array<{ x: number; y: number }>) {
  for (const s of DEFENSE_SLOTS) {
    const { x, y } = s.screen
    const g = scene.add.graphics().setDepth(y + 1)
    g.fillStyle(0x1b2a14, 0.2); g.fillEllipse(x + 6, y + 4, TILE.w * 0.7, TILE.h * 0.4)
    g.fillStyle(0x7a5a36, 1); g.fillEllipse(x, y, TILE.w * 0.62, TILE.h * 0.36)
    g.fillStyle(0x4e3820, 1); g.fillEllipse(x, y + 2, TILE.w * 0.4, TILE.h * 0.22)
    // Kesme taş yığını.
    for (const [dx, dy] of [[-16, -2], [-4, 2], [8, -3], [-10, -10], [2, -9]] as const) {
      g.fillStyle(0xd9c7a1, 1); g.fillRect(x + dx - TILE.w * 0.28, y + dy - 6, 12, 7)
      g.fillStyle(0xb8a37c, 1); g.fillRect(x + dx - TILE.w * 0.28, y + dy + 1, 12, 2)
    }
    scene.pieces.push(g)
  }
  // Tabela.
  const front = scene.wallFront(ring)
  const sx = front.x, sy = front.y - TILE.h * 0.4
  const sign = scene.add.container(sx, sy).setDepth(front.y + 3)
  const board = scene.add.graphics()
  board.fillStyle(0x5e3c22, 1); board.fillRect(-3, -8, 6, 60)
  board.fillStyle(0x1b2a14, 0.25); board.fillRoundedRect(-78, -58, 162, 52, 8)
  board.fillStyle(0xa26f41, 1); board.fillRoundedRect(-82, -62, 164, 52, 8)
  board.lineStyle(3, 0x5e3c22, 1); board.strokeRoundedRect(-82, -62, 164, 52, 8)
  const f = scene.headingFont()
  const t1 = scene.add.text(0, -48, 'SUR TEMELİ', { fontFamily: f.heading, fontSize: '36px', color: '#f8e7bd', fontStyle: '700' }).setOrigin(0.5).setScale(0.5)
  const t2 = scene.add.text(0, -27, 'Dokun: surları ör', { fontFamily: f.body, fontSize: '26px', color: '#fbe9bb', fontStyle: '700' }).setOrigin(0.5).setScale(0.5)
  sign.add([board, t1, t2])
  sign.setScale(2.4)
  // Dokunma alanı ayrı, görünmez bir dikdörtgen (kap nesnesinin yerel koordinatları kaygan).
  const signHit = scene.add.rectangle(sx, sy - 20 * 2.4, 180 * 2.4, 110 * 2.4).setInteractive({ useHandCursor: true })
    .setFillStyle(0xffffff, 0).setDepth(front.y + 3.1)
  signHit.on('pointerup', (p: Phaser.Input.Pointer) => { if (isTap(p) && !scene.moving) scene.events$.onBuilding('surlar') })
  scene.pieces.push(signHit)
  scene.tweens.add({ targets: sign, y: sy - 12, duration: 1100, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' })
  scene.pieces.push(sign)
}
