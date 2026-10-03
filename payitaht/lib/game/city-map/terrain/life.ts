import { TILE } from '../index'
import { FOOTPRINT_DIAMOND_W, ART_DIAMOND_PX } from '../building-assets'
import { cityAqueduct, cityBazaar, cityFields, cityFountains, cityStream, fieldTier, fountainTier } from '../city-extras'
import * as Phaser from 'phaser'
import { cemeterySite, mulberry32 } from '../terrain-builder'

export function drawCityLife({ T, V, plazaDecor, scene, stamp }: { T: { tier: number; }; V: (x: number, y: number) => Phaser.Math.Vector2; plazaDecor: Phaser.GameObjects.GameObject[]; scene: Phaser.Scene; stamp: (key: string, wx: number, wy: number, tw: number, depth: number, oy?: number, alpha?: number, tint?: number | undefined) => Phaser.GameObjects.Image | null }) {
  // 2f) OSMANLI DOKUSU: kuzey kapısı dışında servilikli mezarlık (sarıklı ve
  // fesli şahideler), liman yolunda tenteli çarşı tezgâhları.
  {
    const or = mulberry32(1453)
    // MEZARLIK.
    T.tier = 2
    const cem = cemeterySite()
    const cg = scene.add.graphics().setDepth(-702)
    cg.fillStyle(0x667f45, 0.13); cg.fillEllipse(cem.x, cem.y, TILE.w * 3.8, TILE.h * 3.1)
    const stones: Array<{ x: number; y: number }> = []
    for (let r = -1; r <= 1; r++) {
      for (let c = -3; c <= 3; c++) {
        const x = cem.x + c * TILE.w * 0.49 + r * TILE.w * 0.2 + (or() - 0.5) * 24
        const y = cem.y + r * TILE.h * 0.75 + c * TILE.h * 0.1 + (or() - 0.5) * 14
        if (((x - cem.x) / (TILE.w * 1.9)) ** 2 + ((y - cem.y) / (TILE.h * 1.5)) ** 2 > 1) continue
        if (or() < 0.34) {
          const img = stamp(or() < 0.5 ? 'd_cypress' : 'd_cypress-b', x, y, TILE.w * (0.24 + or() * 0.06), y, 0.92)
          if (img) plazaDecor.push(img)
          continue
        }
        stones.push({ x, y })
      }
    }
    for (const st of stones) {
      const g = scene.add.graphics().setDepth(st.y)
      const h = 16 + or() * 9, w = 6 + or() * 2, tilt = (or() - 0.5) * 4
      g.fillStyle(0x2f421c, 0.25); g.fillEllipse(st.x + 5, st.y + 1, w * 2.4, 4)
      g.fillStyle(0xe9e4d6, 1); g.fillPoints([V(st.x - w / 2, st.y), V(st.x + w / 2, st.y), V(st.x + w / 2 + tilt, st.y - h), V(st.x - w / 2 + tilt, st.y - h)], true)
      g.fillStyle(0xc9c2ae, 1); g.fillRect(st.x + w / 2 - 2, st.y - h + 2, 2, h - 2)
      const top = or()
      if (top < 0.45) { // sarık
        g.fillStyle(0xf6f3ea, 1); g.fillEllipse(st.x + tilt, st.y - h - 3, w * 1.9, 8)
        g.lineStyle(1, 0xc9c2ae, 1); g.lineBetween(st.x + tilt - w * 0.8, st.y - h - 3, st.x + tilt + w * 0.8, st.y - h - 5)
      } else if (top < 0.75) { // fes
        g.fillStyle(0xa8322a, 1); g.fillRect(st.x + tilt - w * 0.55, st.y - h - 7, w * 1.1, 7)
      } else { // sivri (kadın mezarı), çiçek motifi
        g.fillStyle(0xe9e4d6, 1); g.fillTriangle(st.x + tilt - w / 2, st.y - h, st.x + tilt + w / 2, st.y - h, st.x + tilt, st.y - h - 7)
        g.fillStyle(0xc8453a, 1); g.fillCircle(st.x + tilt * 0.5, st.y - h * 0.6, 1.6)
      }
      plazaDecor.push(g)
    }

    T.tier = 5
    // İSKELE PAZARI: binalarla aynı çizim aracından arasta + çadırlı pazar
    // yeri; en yakın yola toprak bir patikayla bağlanır (bkz. cityBazaar).
    const bz = cityBazaar()
    if (bz && scene.textures.exists('b_pazar')) {
      const k = (FOOTPRINT_DIAMOND_W / ART_DIAMOND_PX) * 1.8 * 0.8
      // Patika: pazarın ön köşesinden yola, yol katmanının altında.
      const path = scene.add.graphics().setDepth(-802)
      const front = V(bz.x, bz.y + 211 * k * 0.5 * 0.8)
      const mid = V((front.x + bz.road.x) / 2 + (bz.road.y - front.y) * 0.15, (front.y + bz.road.y) / 2)
      const curve = new Phaser.Curves.QuadraticBezier(front, mid, V(bz.road.x, bz.road.y))
      path.lineStyle(TILE.w * 0.22, 0x9c8458, 0.5); curve.draw(path, 24)
      path.lineStyle(TILE.w * 0.16, 0xc2aa7a, 1); curve.draw(path, 24)
      plazaDecor.push(path)
      const img = scene.add.image(bz.x, bz.y + 118 * k, 'b_pazar').setOrigin(0.5, 1).setScale(k).setDepth(bz.y + 118 * k)
      plazaDecor.push(img)
    }
  }

  // 2g) YAŞAYAN ŞEHİR: sur içindeki bağlar, meyve bahçeleri, bostanlar ve
  // meralar; yol kavşaklarında ve kapı içlerinde Osmanlı çeşmeleri.
  {
    const fr = mulberry32(1071)
    // Sabit çitli, sert elmas tabanlı çizim tarlaları yerine, hiçbir inşa
    // yuvasına bağlı olmayan küçük boyalı korular ve bostan kümeleri.
    for (const [fi, f] of cityFields().entries()) {
      T.tier = fieldTier(fi)
      const ground = scene.add.graphics().setDepth(-805)
      ground.fillStyle(f.kind === 'mera' ? 0x92a95d : 0x9e9f61, 0.13)
      ground.fillEllipse(f.x, f.y, f.hw * 1.8, f.hh * 1.65)
      plazaDecor.push(ground)
      const count = f.kind === 'meyve' ? 4 : f.kind === 'mera' ? 2 : 6
      for (let i = 0; i < count; i++) {
        const x = f.x + (fr() - 0.5) * f.hw * 1.35
        const y = f.y + (fr() - 0.5) * f.hh * 1.3
        const key = f.kind === 'meyve' ? 'd_olive-tree'
          : i % 3 === 0 ? 'd_flower' : 'd_bush'
        const w = f.kind === 'meyve' ? TILE.w * (0.36 + fr() * 0.1)
          : f.kind === 'mera' ? TILE.w * 0.28 : TILE.w * (0.22 + fr() * 0.06)
        const img = stamp(key, x, y, w, y, 0.92, 0.88)
        if (img) plazaDecor.push(img)
      }
    }

    // ÇEŞMELER: mermer ayna taşı, sivri kemerli niş, kitabe, tunç lüle, yalak.
    for (const c of cityFountains()) {
      T.tier = fountainTier(c)
      const g = scene.add.graphics().setDepth(c.y)
      const w = TILE.w * 0.38, h = TILE.h * 0.74, d = w * 0.3
      const x0 = c.x - w / 2, x1 = c.x + w / 2, y0 = c.y
      g.fillStyle(0x1b2a14, 0.24); g.fillEllipse(c.x + w * 0.3, y0 + 6, w * 1.5, 16)
      // Yan yüz, ön yüz, saçak.
      g.fillStyle(0xc9bfa8, 1); g.fillPoints([V(x1, y0), V(x1 + d, y0 - d / 2), V(x1 + d, y0 - d / 2 - h), V(x1, y0 - h)], true)
      g.fillStyle(0xf1ece0, 1); g.fillRect(x0, y0 - h, w, h)
      g.fillStyle(0xd9d1bd, 1); g.fillRect(x0, y0 - h * 0.12, w, h * 0.12)
      // Sivri kemerli niş.
      const nw = w * 0.56, nx = c.x, ny = y0 - h * 0.14
      g.fillStyle(0xcfc6b0, 1)
      g.fillPoints([V(nx - nw / 2, ny), V(nx - nw / 2, ny - h * 0.42), V(nx, ny - h * 0.66), V(nx + nw / 2, ny - h * 0.42), V(nx + nw / 2, ny)], true)
      g.lineStyle(1.5, 0xa99f88, 1)
      g.strokePoints([V(nx - nw / 2, ny), V(nx - nw / 2, ny - h * 0.42), V(nx, ny - h * 0.66), V(nx + nw / 2, ny - h * 0.42), V(nx + nw / 2, ny)], false)
      // Kitabe (yeşil zemin üstünde altın satırlar).
      g.fillStyle(0x2f5a44, 1); g.fillRect(x0 + w * 0.12, y0 - h * 0.95, w * 0.76, h * 0.18)
      g.lineStyle(1.2, 0xe2bd78, 1)
      for (const r of [0.33, 0.66]) g.lineBetween(x0 + w * 0.18, y0 - h * (0.95 - 0.18 * r), x0 + w * 0.82, y0 - h * (0.95 - 0.18 * r))
      // Saçak ve tepe.
      g.fillStyle(0x7f9690, 1); g.fillPoints([V(x0 - 6, y0 - h), V(x1 + 6, y0 - h), V(x1 + d + 6, y0 - h - d / 2), V(x0 + d - 6, y0 - h - d / 2)], true)
      g.fillStyle(0x9fb3ad, 1); g.fillEllipse(c.x + d / 2, y0 - h - d / 2 - 2, w * 0.5, 12)
      g.fillStyle(0xe2bd78, 1); g.fillRect(c.x + d / 2 - 1, y0 - h - d / 2 - 16, 2, 10)
      // Lüle, akan su, yalak.
      g.fillStyle(0xb8872e, 1); g.fillRect(nx - 2, ny - h * 0.3, 4, 6)
      g.lineStyle(2, 0x9fd6e8, 0.9); g.lineBetween(nx, ny - h * 0.3 + 6, nx, ny - 4)
      g.fillStyle(0xd9d1bd, 1); g.fillRect(x0 + w * 0.08, y0 - 8, w * 0.84, 10)
      g.fillStyle(0x5aa6c0, 1); g.fillRect(x0 + w * 0.14, y0 - 6, w * 0.72, 4)
      plazaDecor.push(g)
    }
  }

  T.tier = 0 // dere hep var
  // 2h) DERE: tepeden denize kıvrılan su; kıyıda saz ve taş, yolları geçtiği
  // yerlerde kemerli Osmanlı köprüsü, orta bölümde su değirmeni.
  {
    const st = cityStream()
    const sr = mulberry32(3131)
    const water = scene.add.graphics().setDepth(-803)
    const pass = (extra: number, color: number, alpha: number, scaleW = 1) => {
      for (let i = 0; i + 1 < st.pts.length; i++) {
        const a = st.pts[i], b = st.pts[i + 1]
        water.lineStyle(st.widths[i] * scaleW + extra, color, alpha)
        water.lineBetween(a.x, a.y, b.x, b.y)
      }
      for (let i = 0; i < st.pts.length; i += 3) { water.fillStyle(color, alpha); water.fillCircle(st.pts[i].x, st.pts[i].y, (st.widths[i] * scaleW + extra) / 2) }
    }
    pass(18, 0x5f7a3c, 0.55) // nemli çimen kıyı
    pass(9, 0x8a7a50, 1) // çamur kıyı
    pass(0, 0x3f8aa6, 1) // su
    pass(-6, 0x5aa6c0, 1) // açık su
    pass(-12, 0x8fd0e0, 0.55, 0.5) // parıltı
    // Ağızda denize açılan yelpaze.
    const m = st.pts[st.pts.length - 1]
    water.fillStyle(0x5aa6c0, 0.6); water.fillEllipse(m.x, m.y + 10, 90, 34)
    // Kıyı sazları ve taşlar.
    for (let i = 4; i < st.pts.length - 4; i += 7) {
      const a = st.pts[i - 1], b = st.pts[i + 1], l = Math.hypot(b.x - a.x, b.y - a.y) || 1
      const nx = -(b.y - a.y) / l, ny = (b.x - a.x) / l
      if (st.bridges.some(br => Math.hypot(br.x - st.pts[i].x, br.y - st.pts[i].y) < 60)) continue
      const side = sr() < 0.5 ? 1 : -1, off = st.widths[i] / 2 + 6
      const x = st.pts[i].x + nx * off * side, y = st.pts[i].y + ny * off * side
      const g = scene.add.graphics().setDepth(y)
      if (sr() < 0.7) {
        for (let k = 0; k < 6; k++) {
          const rx = x + (sr() - 0.5) * 16, h = 10 + sr() * 12
          g.lineStyle(1.6, sr() < 0.5 ? 0x4f7d34 : 0x7a9a44, 1); g.lineBetween(rx, y, rx + (sr() - 0.5) * 5, y - h)
          if (sr() < 0.3) { g.fillStyle(0x6a4a2a, 1); g.fillEllipse(rx + 1, y - h, 3, 7) }
        }
      } else {
        g.fillStyle(0x9a948a, 1); g.fillEllipse(x, y - 3, 14, 9); g.fillStyle(0xbab4a8, 1); g.fillEllipse(x - 2, y - 5, 8, 5)
      }
      plazaDecor.push(g)
    }
    // KÖPRÜLER: kambur taş köprü (yol dereyi dik keser).
    for (const br of st.bridges) {
      const g = scene.add.graphics().setDepth(br.y + 2)
      const sx = Math.cos(br.angle), sy = Math.sin(br.angle) // dere yönü
      const rx = -sy, ry = sx // yol yönü
      const L = 78, Wd = 36, hump = 9
      const P = (u: number, v: number, lift = 0) => V(br.x + rx * u + sx * v, br.y + ry * u + sy * v - lift)
      g.fillStyle(0x24424c, 0.45); g.fillEllipse(br.x + sx * 22, br.y + sy * 22 + 6, 46, 16)
      const deck = [P(-L / 2, -Wd / 2), P(0, -Wd / 2, hump), P(L / 2, -Wd / 2), P(L / 2, Wd / 2), P(0, Wd / 2, hump), P(-L / 2, Wd / 2)]
      g.fillStyle(0xb8a67e, 1); g.fillPoints(deck.map(p => V(p.x, p.y + 6)), true)
      g.fillStyle(0xd9c9a4, 1); g.fillPoints(deck, true)
      g.lineStyle(1, 0xa89468, 0.6)
      for (let u = -L / 2 + 10; u < L / 2; u += 10) { const a = P(u, -Wd / 2, hump * (1 - Math.abs(u) / (L / 2))), b = P(u, Wd / 2, hump * (1 - Math.abs(u) / (L / 2))); g.lineBetween(a.x, a.y, b.x, b.y) }
      // Korkuluklar (iki kenar) ve uçlarda taş babalar.
      for (const v of [-Wd / 2, Wd / 2]) {
        const rail = [-1, -0.5, 0, 0.5, 1].map(t => P(t * L / 2, v, hump * (1 - Math.abs(t)) + 7))
        g.lineStyle(6, 0xeee2c4, 1); g.strokePoints(rail, false)
        g.lineStyle(1.5, 0x9c8763, 0.8); g.strokePoints(rail.map(p => V(p.x, p.y + 3)), false)
        for (const t of [-1, 1]) { const q = P(t * L / 2, v, 12); g.fillStyle(0xeee2c4, 1); g.fillRect(q.x - 4, q.y - 4, 8, 10) }
      }
      // Kemer gözü (izleyiciye bakan yüzde).
      const face = sy * 1 >= 0 ? Wd / 2 : -Wd / 2
      const c = P(0, face)
      g.fillStyle(0x2e3a3a, 0.75); g.beginPath(); g.arc(c.x, c.y + 6, 13, Math.PI, 0, false); g.closePath(); g.fillPath()
      plazaDecor.push(g)
    }
    T.tier = 4
    // SU DEĞİRMENİ: taş zemin kat, ahşap üst kat, kiremit çatı (çark sahnede döner).
    if (st.mill) {
      const { x, y } = st.mill
      const g = scene.add.graphics().setDepth(y)
      const w = 112, h1 = 40, h2 = 34, d = 40
      g.fillStyle(0x1b2a14, 0.25); g.fillEllipse(x + 16, y + 6, w * 1.4, 22)
      g.fillStyle(0xa3998a, 1); g.fillPoints([V(x + w / 2, y), V(x + w / 2 + d, y - d / 2), V(x + w / 2 + d, y - d / 2 - h1), V(x + w / 2, y - h1)], true)
      g.fillStyle(0xc9bfa8, 1); g.fillRect(x - w / 2, y - h1, w, h1)
      g.fillStyle(0x7a5230, 1); g.fillRect(x - w / 2 + 2, y - h1 - h2, w - 4, h2)
      g.fillStyle(0x5f3f22, 1); g.fillPoints([V(x + w / 2 - 2, y - h1), V(x + w / 2 + d - 2, y - d / 2 - h1), V(x + w / 2 + d - 2, y - d / 2 - h1 - h2), V(x + w / 2 - 2, y - h1 - h2)], true)
      g.fillStyle(0x3a2a1c, 1); g.fillRect(x - 11, y - 30, 22, 30); g.fillRect(x - w / 2 + 14, y - h1 - 24, 14, 13); g.fillRect(x + w / 2 - 30, y - h1 - 24, 14, 13)
      g.fillStyle(0xb5532e, 1); g.fillPoints([V(x - w / 2 - 6, y - h1 - h2), V(x + w / 2 + 6, y - h1 - h2), V(x + w / 2 + d + 4, y - h1 - h2 - d / 2), V(x + d / 2, y - h1 - h2 - 46), V(x - w / 2 + d / 2 - 6, y - h1 - h2 - 38)], true)
      g.lineStyle(1.2, 0x8a3a20, 0.7)
      for (let k = 1; k < 7; k++) g.lineBetween(x - w / 2 - 6 + k * 4, y - h1 - h2 - k * 6, x + w / 2 + 6 + k * 4, y - h1 - h2 - k * 6)
      g.fillStyle(0xd9d1bd, 1); g.fillRect(x + 12, y - h1 - h2 - 52, 11, 20) // baca
      // Çuval ve saman.
      g.fillStyle(0xe2d3a6, 1); g.fillEllipse(x - w / 2 - 10, y - 5, 12, 12); g.fillEllipse(x - w / 2 - 20, y - 3, 11, 10)
      plazaDecor.push(g)
    }
  }

  // 2i) SU KEMERİ ve MAKSEM: iki katlı kemer dizisi tepeden şehre su taşır,
  // şehir içindeki maksemde (su terazisi) biter. Her göz ayrı parça; derinliği
  // tabanına göre: binalar ve surla doğru sıralanır.
  {
    T.tier = 6
    const aq = cityAqueduct()
    if (aq) {
      const dx = aq.to.x - aq.from.x, dy = aq.to.y - aq.from.y
      const len = Math.hypot(dx, dy), ux = dx / len, uy = dy / len
      // Zemin (karo) uzayında dik: kalınlık izleyiciye doğru.
      const gx = (x: number, y: number) => (x / (TILE.w / 2) + y / (TILE.h / 2)) / 2
      const gy = (x: number, y: number) => (y / (TILE.h / 2) - x / (TILE.w / 2)) / 2
      const lg = Math.hypot(gx(dx, dy), gy(dx, dy)) || 1
      let ngx = -gy(dx, dy) / lg * 0.34, ngy = gx(dx, dy) / lg * 0.34
      let nx = (ngx - ngy) * TILE.w / 2, ny = (ngx + ngy) * TILE.h / 2
      if (ny < 0) { nx = -nx; ny = -ny; ngx = -ngx; ngy = -ngy } // ön yüz izleyiciye baksın
      const Pt = (s: number, z: number, off = 0) => V(aq.from.x + ux * s + nx * off, aq.from.y + uy * s + ny * off - z)
      const B = 58, pw = 13
      const H1 = 49, S1 = 28, H2 = 78, S2 = 62, TOP = 87
      const face = 0xd8c39a, faceDk = 0xb9a276, soffit = 0x6e5a3e, cap = 0xeadbb6
      const n = Math.floor((len - 36) / B)
      const arch = (s0: number, s1: number, spring: number, rise: number, off: number) => {
        const pts: Phaser.Math.Vector2[] = []
        for (let k = 0; k <= 10; k++) {
          const a = k / 10
          pts.push(Pt(s0 + (s1 - s0) * a, spring + Math.sin(a * Math.PI) * rise, off))
        }
        return pts
      }
      for (let i = 0; i < n; i++) {
        const s0 = i * B, s1 = s0 + B
        // Surla kesişen göz surdaki su kapısının içinden geçer (bkz. drawWalls).
        const g = scene.add.graphics().setDepth(Math.max(Pt(s0, 0).y, Pt(s1, 0).y) + ny + 1)
        g.fillStyle(0x2f421c, 0.2)
        g.fillPoints([Pt(s0, 0, 1), Pt(s1, 0, 1), V(Pt(s1, 0, 1).x + 22, Pt(s1, 0, 1).y + 16), V(Pt(s0, 0, 1).x + 22, Pt(s0, 0, 1).y + 16)], true)
        for (const [lo, spring, hi, p] of [[0, S1, H1, pw], [H1, S2, H2, pw * 0.8]] as const) {
          const a0 = s0 + p / 2, a1 = s1 - p / 2
          const rise = Math.min((a1 - a0) * 0.55, hi - spring - 6)
          // Kemer altı (tonoz yüzü): ön ve arka kemer eğrisi arasında koyu şerit.
          const fa = arch(a0, a1, spring, rise, ny > 0 ? 1 : 0), ba = arch(a0, a1, spring, rise, ny > 0 ? 0 : 1)
          g.fillStyle(soffit, 1); g.fillPoints([...fa, ...ba.reverse()], true)
          // Ayakların yan yüzü.
          g.fillStyle(faceDk, 1)
          g.fillPoints([Pt(a1, lo, 1), Pt(a1, lo, 0), Pt(a1, spring, 0), Pt(a1, spring, 1)], true)
          // Ön yüz: sol ayak + sağ ayak + kemer üstü kuşak (kemer eğrisiyle).
          g.fillStyle(face, 1)
          g.fillPoints([Pt(s0, lo, 1), Pt(a0, lo, 1), Pt(a0, spring, 1), Pt(s0, spring, 1)], true)
          g.fillPoints([Pt(a1, lo, 1), Pt(s1, lo, 1), Pt(s1, spring, 1), Pt(a1, spring, 1)], true)
          g.fillPoints([Pt(s0, spring, 1), ...arch(a0, a1, spring, rise, 1), Pt(s1, spring, 1), Pt(s1, hi, 1), Pt(s0, hi, 1)], true)
          // Taş sıraları ve kemer taşları.
          g.lineStyle(1, 0x9c8763, 0.5)
          for (let z = lo + 12; z < hi; z += 12) {
            if (z > spring - 1 && z < spring + rise) { g.lineBetween(Pt(s0, z, 1).x, Pt(s0, z, 1).y, Pt(a0 - 1, z, 1).x, Pt(a0 - 1, z, 1).y); g.lineBetween(Pt(a1 + 1, z, 1).x, Pt(a1 + 1, z, 1).y, Pt(s1, z, 1).x, Pt(s1, z, 1).y) }
            else g.lineBetween(Pt(s0, z, 1).x, Pt(s0, z, 1).y, Pt(s1, z, 1).x, Pt(s1, z, 1).y)
          }
          g.lineStyle(2, 0xb39c74, 1); g.strokePoints(arch(a0, a1, spring, rise, 1), false)
          // Aşınmış harç, gölgeli taş ve dipteki yosun kemeri zemine bağlar.
          for (let k = 0; k < 6; k++) {
            const s = s0 + 5 + (k * 17 + i * 11) % (B - 10)
            const z = lo + 7 + (k * 13) % Math.max(12, hi - lo - 8)
            const p = Pt(s, z, 1)
            g.fillStyle(k % 3 === 0 ? 0x708052 : 0x8e7757, k % 3 === 0 ? 0.24 : 0.16)
            g.fillEllipse(p.x, p.y, 4 + (k % 3) * 2, 2 + (k % 2))
          }
          if (lo === 0) {
            for (const s of [s0 + 4, s1 - 5]) {
              const p = Pt(s, 2, 1)
              g.fillStyle(0x647747, 0.38); g.fillEllipse(p.x, p.y + 3, 12, 5)
            }
          }
          g.fillStyle(cap, 1)
          g.fillPoints([Pt(s0, hi, 1), Pt(s1, hi, 1), Pt(s1, hi + 3, 1), Pt(s0, hi + 3, 1)], true)
        }
        // Su yolu (oluk): üst yüz, içinde akan su.
        g.fillStyle(face, 1); g.fillPoints([Pt(s0, H2, 1), Pt(s1, H2, 1), Pt(s1, TOP, 1), Pt(s0, TOP, 1)], true)
        g.fillStyle(cap, 1); g.fillPoints([Pt(s0, TOP, 1), Pt(s1, TOP, 1), Pt(s1, TOP, 0), Pt(s0, TOP, 0)], true)
        g.fillStyle(0x4f9bb5, 1); g.fillPoints([Pt(s0, TOP + 0.5, 0.65), Pt(s1, TOP + 0.5, 0.65), Pt(s1, TOP + 0.5, 0.35), Pt(s0, TOP + 0.5, 0.35)], true)
        plazaDecor.push(g)
      }
      // MAKSEM: kare taş kule, sivri kemerli pencere, kurşun kırma çatı, alem.
      const m = aq.to, hw = TILE.w * 0.32, hh = hw / 2, mh = 91
      const W_ = V(m.x - hw, m.y), S_ = V(m.x, m.y + hh), E_ = V(m.x + hw, m.y), N_ = V(m.x, m.y - hh)
      const up = (p: Phaser.Math.Vector2, z: number) => V(p.x, p.y - z)
      const mg = scene.add.graphics().setDepth(m.y + hh + 2)
      mg.fillStyle(0x2f421c, 0.25); mg.fillEllipse(m.x + 26, m.y + hh + 4, hw * 2.6, hh * 1.6)
      mg.fillStyle(face, 1); mg.fillPoints([W_, S_, up(S_, mh), up(W_, mh)], true)
      mg.fillStyle(faceDk, 1); mg.fillPoints([S_, E_, up(E_, mh), up(S_, mh)], true)
      mg.lineStyle(1, 0x9c8763, 0.5)
      for (let z = 14; z < mh; z += 14) { mg.lineBetween(W_.x, W_.y - z, S_.x, S_.y - z); mg.lineBetween(S_.x, S_.y - z, E_.x, E_.y - z) }
      // Pencereler (sivri kemer) ve su ağzı.
      for (const [a, b] of [[W_, S_], [S_, E_]] as const) {
        const cx = (a.x + b.x) / 2, cy = (a.y + b.y) / 2
        mg.fillStyle(0x3a2d24, 1)
        mg.fillPoints([V(cx - 6, cy - 43), V(cx + 6, cy - 43 + (b.y - a.y) * 0.12), V(cx + 6, cy - 60 + (b.y - a.y) * 0.12), V(cx, cy - 68), V(cx - 6, cy - 60)], true)
      }
      mg.fillStyle(cap, 1); mg.fillPoints([up(W_, mh), up(S_, mh), up(E_, mh), up(N_, mh)], true)
      const apex = V(m.x, m.y - mh - 30)
      mg.fillStyle(0x7b949c, 1); mg.fillPoints([up(W_, mh - 4), up(S_, mh - 4), apex], true)
      mg.fillStyle(0x8fa7ae, 1); mg.fillPoints([up(S_, mh - 4), up(E_, mh - 4), apex], true)
      mg.fillStyle(0xe2bd78, 1); mg.fillRect(apex.x - 1.5, apex.y - 14, 3, 14); mg.fillCircle(apex.x, apex.y - 16, 3)
      plazaDecor.push(mg)
    }
  }

  T.tier = 0
}
