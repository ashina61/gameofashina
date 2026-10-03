import { CITY_SLOTS, COAST_SLOTS, DEFENSE_SLOTS, DEFENSE_FOUNDATION, PLAZA, HALL_SLOT_ID, slotById, TILE } from '../index'
import { roadStyleFor, roadTierForHallLevel } from '../road-style'
import { edgeKey, roadEdgeKeysForTargets } from '../road-tree'
import { cityFields, cityFountains, nearStreamAt } from '../city-extras'
import { bakeGraphics } from '../bake'
import * as Phaser from 'phaser'
import { liteMode } from '@/lib/motion'
import { mulberry32, type RoadCurve, roadCurves, displayRoadCurves, nearSlot, paintedGroundTexture } from '../terrain-builder'

export function buildRoads({ V, divanLevel, occupiedSlotIds, scene, shoreY, stamp }: { V: (x: number, y: number) => Phaser.Math.Vector2; divanLevel: number; occupiedSlotIds: string[]; scene: Phaser.Scene; shoreY: (x: number) => number; stamp: (key: string, wx: number, wy: number, tw: number, depth: number, oy?: number, alpha?: number, tint?: number | undefined) => Phaser.GameObjects.Image | null }) {
  // 3) TAŞ / TOPRAK katmanı.
  const g = scene.add.graphics().setDepth(-800)

  // Savunma geometrisi normal şehir görünümünde saklıdır.
  // Sur/inşa kipi gerektiğinde ayrı etkileşim katmanı bunu gösterebilir.
  const fpts = [...DEFENSE_FOUNDATION, DEFENSE_FOUNDATION[0]].map(p => V(p.screen.x, p.screen.y))
  g.lineStyle(TILE.w * 0.035, 0x6c593f, 0.035); g.strokePoints(fpts, false)

  // Yollar zemin/pad altında AYRI Graphics katmanında: Divan yükselince
  // yalnızca bu katman yenilenir; ağaçlar, binalar, kamera ve kayıt değişmez.
  const allCurves = roadCurves(V)
  const curves = displayRoadCurves(allCurves)
  const coastSorted = [...COAST_SLOTS].sort((a, b) => a.screen.x - b.screen.x)
  const quaySpine = new Phaser.Curves.Spline(
    coastSorted.map(s => V(s.screen.x, s.screen.y - TILE.h * 0.12)),
  )
  const roads = scene.add.graphics().setDepth(-801)
  // Ambient ağaç/çalılar boş slotların çevresine kadar yaklaşabilir. Bir slot
  // sonradan inşa edilince statik terrain'i yeniden üretmek yerine yalnızca
  // o binayla çakışan ambient sprite'ları gizleriz (save/slot etkilenmez).
  const ambientDecor: Array<{ image: Phaser.GameObjects.Image; x: number; y: number; minLevel?: number }> = []
  // Mahalle dekoru Divanhane seviyesiyle açılır (V2 Faz 4.4).
  let hallLevel = divanLevel
  let lastActive: string[] = occupiedSlotIds
  const syncAmbientDecor = (activeSlotIds: string[]) => {
    lastActive = activeSlotIds
    const active = new Set(activeSlotIds)
    active.add(HALL_SLOT_ID)
    const occupiedSlots = [...active].map(id => slotById(id)).filter(
      (slot): slot is NonNullable<typeof slot> => slot != null,
    )
    for (const item of ambientDecor) {
      item.image.setVisible((!liteMode() || item.image.getData('decorOrdinal') % 2 === 1) && hallLevel >= (item.minLevel ?? 0) && !occupiedSlots.some(slot => nearSlot(item.x, item.y, slot, 1.14)))
    }
  }

  let lastRoadKey = ''
  let roadTextures: Phaser.GameObjects.GameObject[] = []

  const updateRoads = (level: number, activeSlotIds: string[] = occupiedSlotIds) => {
    if (level !== hallLevel) { hallLevel = level; syncAmbientDecor(activeSlotIds ?? lastActive) }
    const tier = roadTierForHallLevel(level)
    const active = new Set(activeSlotIds)
    active.add(HALL_SLOT_ID)
    const roadKey = tier + ':' + [...active].sort().join(',')
    if (roadKey === lastRoadKey) return
    lastRoadKey = roadKey
    syncAmbientDecor(activeSlotIds)
    roads.clear().setVisible(true)
    for (const o of roadTextures) o.destroy()
    roadTextures = []

    // Yalnızca Divanhane'den GERÇEKTEN kurulu slotlara ulaşan yol ağacı.
    // Boş parsellerin komşu yolları artık sırf yakında bina var diye görünmez.
    const visibleKeys = roadEdgeKeysForTargets(active)
    const hasHarbour = COAST_SLOTS.some(s => active.has(s.id))
    const visibleCurves = curves.filter(r => {
      const key = edgeKey(r.from, r.to)
      if (r.kind !== 'quay') return visibleKeys.has(key)
      if (!hasHarbour) return false
      const cityId = r.from.startsWith('coast_') ? r.to : r.from
      return visibleKeys.has(key) || active.has(cityId)
    })

    // Her normal kara yuvası aynı giriş bağlantısını alır. Bina kimliğine
    // bağlı yön/arsa kuralı yoktur; kışla başka yuvaya taşınınca da yol yeni
    // yuvanın ön kenarına kadar uzanır.
    for (const id of active) {
      if (id === HALL_SLOT_ID) continue
      const slot = slotById(id)
      if (!slot || slot.type !== 'city') continue
      const ends = visibleCurves.flatMap(r => r.from === id ? [r.curve.getPoint(0)] : r.to === id ? [r.curve.getPoint(1)] : [])
      const front = ends.sort((a, b) => b.y - a.y)[0]
      if (front) visibleCurves.push({ from: id, to: id, kind: 'street', curve: new Phaser.Curves.Line(front, V(slot.screen.x, slot.screen.y + TILE.h * 0.08)) })
    }

    // Henüz açılmamış bir arsanın İÇİNDEN geçen yol, arsa kenarında kesik
    // kalmasın: uçları arsa ortasına bağlanır, yol tek parça görünür.
    const through: RoadCurve[] = []
    for (const r of visibleCurves) {
      for (const [id, end] of [[r.from, r.curve.getPoint(0)], [r.to, r.curve.getPoint(1)]] as const) {
        const slot = active.has(id) ? null : slotById(id)
        if (!slot || slot.type !== 'city') continue
        through.push({ from: id, to: id, kind: r.kind, curve: new Phaser.Curves.Line(end, V(slot.screen.x, slot.screen.y)) })
      }
    }
    visibleCurves.push(...through)

    // Kıyı promenadı bir slot göstergesi değildir; ilk liman/tersane
    // kurulunca dünyaya doğal biçimde eklenir.
    if (hasHarbour) {
      const quayStyle = roadStyleFor('quay', level)
      roads.lineStyle(TILE.w * 0.25, 0x5e5548, 0.20)
      quaySpine.draw(roads, 60)
      roads.lineStyle(TILE.w * 0.18, quayStyle.border, 0.40)
      quaySpine.draw(roads, 60)
      roads.lineStyle(TILE.w * 0.125, quayStyle.fill, 0.58)
      quaySpine.draw(roads, 60)
    }

    // Çok geçişli çizim, kavşakların düzgün birleşmesini sağlar.
    for (const r of visibleCurves) {
      const s = roadStyleFor(r.kind, level)
      const alpha = r.kind === 'avenue' ? 1 : r.kind === 'street' ? 0.95 : 1
      roads.lineStyle(TILE.w * s.shoulderW, s.shoulder, s.shoulderAlpha * alpha)
      r.curve.draw(roads, 36)
    }
    for (const r of visibleCurves) {
      const s = roadStyleFor(r.kind, level)
      const alpha = r.kind === 'avenue' ? 1 : r.kind === 'street' ? 0.95 : 1
      roads.lineStyle(TILE.w * s.borderW, s.border, s.borderAlpha * alpha)
      r.curve.draw(roads, 36)
    }
    for (const r of visibleCurves) {
      const s = roadStyleFor(r.kind, level)
      const alpha = r.kind === 'avenue' ? 1 : r.kind === 'street' ? 0.95 : 1
      roads.lineStyle(TILE.w * s.fillW, s.fill, alpha)
      r.curve.draw(roads, 36)
    }

    /*
     * YOL DOKUSU (0.28) — her seviyenin kendi malzemesi:
     *  1 toprak: tekerlek izleri, çakıl, ortada ot; kenarlar çimenle kaynaşır.
     *  2 taş kenarlı: sıkıştırılmış toprak, iki yanda bordür taşları.
     *  3 arnavut kaldırımı: şaşırtmalı dizilmiş tek tek taşlar, harç derzleri.
     *  4 kesme taş: büyük levhalar, bordür ve ortada su oluğu.
     * Kavşaklar yuvarlak birleşir; ana caddelerde fenerler durur. Hepsi bir kez
     * dokuya pişirilir, kamerada ek maliyet yok.
     */
    const rnd = mulberry32(68511)
    const mixc = (a: number, b: number, t: number) => {
      const ch = (sh: number) => Math.round(((a >> sh) & 255) * (1 - t) + ((b >> sh) & 255) * t)
      return (ch(16) << 16) | (ch(8) << 8) | ch(0)
    }
    type Pt = { x: number; y: number }
    /** Yol boyunca eşit aralıklı örnek: konum, birim teğet ve normal. */
    const along = (r: RoadCurve, step: number, fn: (p: Pt, tx: number, ty: number, nx: number, ny: number, u: number) => void) => {
      const L = r.curve.getLength()
      const n = Math.max(2, Math.floor(L / step))
      for (let i = 0; i <= n; i++) {
        const u = i / n
        const p = r.curve.getPointAt(u), tg = r.curve.getTangentAt(u)
        const l = Math.hypot(tg.x, tg.y) || 1
        const tx = tg.x / l, ty = tg.y / l
        fn(p, tx, ty, -ty, tx, u)
      }
    }
    const quad = (cx: number, cy: number, tx: number, ty: number, nx: number, ny: number, a: number, b: number, color: number, alpha: number) => {
      roads.fillStyle(color, alpha)
      roads.fillPoints([
        { x: cx - tx * a - nx * b, y: cy - ty * a - ny * b }, { x: cx + tx * a - nx * b, y: cy + ty * a - ny * b },
        { x: cx + tx * a + nx * b, y: cy + ty * a + ny * b }, { x: cx - tx * a + nx * b, y: cy - ty * a + ny * b },
      ] as Phaser.Types.Math.Vector2Like[], true)
    }
    // Kavşak kapakları: uç noktalarda yuvarlak dolgu (çizgiler düzgün birleşir).
    const ends = new Map<string, { p: Pt; s: ReturnType<typeof roadStyleFor> }>()
    for (const r of visibleCurves) {
      const s = roadStyleFor(r.kind, level)
      for (const p of [r.curve.getPoint(0), r.curve.getPoint(1)]) {
        const k = `${Math.round(p.x / 6)}:${Math.round(p.y / 6)}`
        const prev = ends.get(k)
        if (!prev || prev.s.fillW < s.fillW) ends.set(k, { p, s })
      }
    }
    for (const { p, s } of ends.values()) {
      // Yalnızca dolgu: yarı saydam omuz üst üste binince halka izi bırakıyordu.
      roads.fillStyle(s.fill, 1); roads.fillCircle(p.x, p.y, TILE.w * s.fillW * 0.5)
    }
    for (const r of visibleCurves) {
      const s = roadStyleFor(r.kind, level)
      const W = TILE.w * s.fillW
      const dirt = tier === 1 && r.kind !== 'quay'
      if (dirt) {
        // Tekerlek izleri ve ortada ot.
        for (const side of [-0.24, 0.24]) {
          along(r, 4, (p, _tx, _ty, nx, ny) => {
            roads.fillStyle(0x5e4a30, 0.22)
            roads.fillCircle(p.x + nx * W * side + (rnd() - 0.5), p.y + ny * W * side + (rnd() - 0.5), 1.3 + rnd() * 0.6)
          })
        }
        along(r, 5, (p, _tx, _ty, nx, ny) => {
          if (rnd() < 0.5) return
          const o = (rnd() - 0.5) * W * 0.16
          roads.lineStyle(1.1, 0x6f8f45, 0.55)
          roads.lineBetween(p.x + nx * o, p.y + ny * o, p.x + nx * o - 1.5, p.y + ny * o - 3 - rnd() * 2)
        })
        along(r, 3, (p, _tx, _ty, nx, ny) => {
          const o = (rnd() - 0.5) * W * 0.9
          roads.fillStyle(rnd() > 0.5 ? 0xb8a27a : 0x6f5a3c, 0.35)
          roads.fillEllipse(p.x + nx * o, p.y + ny * o, 1.5 + rnd() * 2.5, 1 + rnd() * 1.4)
        })
      } else if (tier === 2 && r.kind !== 'quay') {
        // Sıkıştırılmış toprak + seyrek taş.
        along(r, 3, (p, _tx, _ty, nx, ny) => {
          const o = (rnd() - 0.5) * W * 0.85
          roads.fillStyle(rnd() > 0.4 ? s.stoneColor : 0x7a6a4e, 0.4 + rnd() * 0.3)
          roads.fillEllipse(p.x + nx * o, p.y + ny * o, 2 + rnd() * 3.5, 1.3 + rnd() * 1.8)
        })
      } else {
        // Kaldırım: harç zemin üstünde şaşırtmalı taş sıraları.
        const slab = tier >= 4 && r.kind !== 'quay'
        const len = slab ? 9 : 5.2
        const across = Math.max(3, Math.round(W / (slab ? 10 : 5.2)))
        const sw = W / across
        let course = 0
        roads.lineStyle(W, mixc(s.border, s.fill, 0.35), 1)
        r.curve.draw(roads, 36)
        along(r, len, (p, tx, ty, nx, ny) => {
          const shift = course++ % 2 ? 0.5 : 0
          for (let j = 0; j < across; j++) {
            const o = -W / 2 + (j + 0.5 + shift) * sw
            if (o > W / 2 - sw * 0.3) continue
            const cx = p.x + nx * o + (rnd() - 0.5) * 0.5, cy = p.y + ny * o + (rnd() - 0.5) * 0.5
            const c = mixc(s.fill, s.stoneColor, 0.2 + rnd() * 0.7)
            quad(cx, cy, tx, ty, nx, ny, len * 0.42, sw * 0.4, mixc(c, 0x3a2f24, 0.25), 1)
            quad(cx - 0.3, cy - 0.5, tx, ty, nx, ny, len * 0.36, sw * 0.33, c, 1)
          }
        })
        if (slab) {
          // Ortada su oluğu.
          roads.lineStyle(2.4, mixc(s.border, 0x2f2a24, 0.3), 0.8); r.curve.draw(roads, 36)
          roads.lineStyle(0.8, s.highlight, 0.6); r.curve.draw(roads, 36)
        }
      }
      // Bordür taşları (seviye 2+): iki kenarda açık-koyu sıralı taşlar.
      if (!dirt) {
        for (const side of [-1, 1]) {
          let k = 0
          along(r, 4.2, (p, tx, ty, nx, ny) => {
            const o = side * (W / 2 + 0.8)
            quad(p.x + nx * o, p.y + ny * o, tx, ty, nx, ny, 1.8, 1.1, k++ % 2 ? mixc(s.highlight, 0xffffff, 0.2) : s.highlight, 0.95)
          })
        }
      }
      // Kenar: çimen tutamları yolun kıyısına taşar (sert çizgi kalmasın).
      const edge = TILE.w * s.shoulderW * 0.5
      for (const side of [-1, 1]) {
        along(r, 3.4, (p, _tx, _ty, nx, ny) => {
          if (rnd() < 0.35) return
          const o = side * (edge - rnd() * 2.5)
          const x = p.x + nx * o, y = p.y + ny * o
          roads.lineStyle(1.2, rnd() > 0.5 ? 0x5d8a3c : 0x7da04e, 0.7)
          roads.lineBetween(x, y, x - 1.5 + rnd() * 3, y - 2.5 - rnd() * 3)
        })
      }
      // Ana caddede fenerler (arnavut kaldırımından sonra), iki yanda sırayla.
      if (r.kind === 'avenue' && tier >= 3) {
        let k = 0
        along(r, TILE.w * 1.1, (p, _tx, _ty, nx, ny, u) => {
          if (u < 0.08 || u > 0.92) return
          const side = k++ % 2 ? 1 : -1
          const x = p.x + nx * side * (W / 2 + 5), y = p.y + ny * side * (W / 2 + 5)
          roads.fillStyle(0x000000, 0.18); roads.fillEllipse(x + 3, y + 1, 8, 3)
          roads.fillStyle(0x2f2a26, 1); roads.fillRect(x - 0.8, y - 17, 1.6, 17)
          roads.fillStyle(0x3a332c, 1); roads.fillRect(x - 3, y - 22, 6, 5)
          roads.fillStyle(0xffd98a, 0.95); roads.fillRect(x - 2, y - 21, 4, 3)
          roads.fillStyle(0x2f2a26, 1); roads.fillTriangle(x - 3.6, y - 22, x + 3.6, y - 22, x, y - 25)
        })
      }
    }
    // Yol ağı dokuya pişirilir; yol dokusunun üstünde sadece az sayıda,
    // anlamlı sokak kenarı prop'u canlı kalır. Böylece şehir yoğunlaşır ama
    // zemin rastgele dekorla kirlenmez. Props yalnızca GÖRÜNÜR yol ağında doğar.
    roadTextures = bakeGraphics(scene, roads, { keep: true, maxPixels: 4_000_000 }).filter(o => o !== roads)

    // Boyalı malzeme aynı görünür yol eğrilerine uygulanır; ağ ve genişlik değişmez.
    for (const r of visibleCurves) {
      const material = r.kind === 'quay' ? 't_quay-stone' : tier <= 2 ? 't_dirt' : tier === 3 ? 't_cobble' : 't_plaza-stone'
      const key = paintedGroundTexture(scene, material)
      if (!key) continue
      const width = TILE.w * roadStyleFor(r.kind, level).fillW
      const count = Math.min(80, Math.max(2, Math.ceil(r.curve.getLength() / (width * 0.65))))
      for (let i = 0; i <= count; i++) {
        const u = i / count, p = r.curve.getPointAt(u), tangent = r.curve.getTangentAt(u)
        const img = stamp(key, p.x, p.y, width * 1.45, -800.8, 0.5, 0.50)
        if (img) { img.setDisplaySize(width * 1.45, width * 0.95).setRotation(Math.atan2(tangent.y, tangent.x)); roadTextures.push(img) }
      }
    }

    const propRnd = mulberry32(91217 + tier * 997 + active.size * 37)
    const propSlots = [...CITY_SLOTS, ...COAST_SLOTS, ...DEFENSE_SLOTS]
    const roadsideClear = (x: number, y: number) =>
      y < shoreY(x) - TILE.h * 0.7 &&
      ((x - PLAZA.screen.x) / (PLAZA.rx * 1.12)) ** 2 + ((y - PLAZA.screen.y) / (PLAZA.ry * 1.12)) ** 2 > 1 &&
      !nearStreamAt(x, y, 48, 34) &&
      !cityFields().some(f => Math.abs(x - f.x) / (f.hw + 22) + Math.abs(y - f.y) / (f.hh + 14) < 1) &&
      !cityFountains().some(f => Math.hypot(x - f.x, (y - f.y) * 1.6) < TILE.w * 0.68) &&
      !propSlots.some(s => nearSlot(x, y, s, active.has(s.id) ? 1.02 : 0.70))

    for (const r of visibleCurves.filter(r => r.kind === 'avenue')) {
      const samples = [0.38, 0.68]
      for (const u of samples) {
        if (r.kind === 'street' && propRnd() < 0.52) continue
        if (r.kind === 'avenue' && propRnd() < 0.18) continue
        const p = r.curve.getPoint(u), tangent = r.curve.getTangent(u)
        const len = Math.hypot(tangent.x, tangent.y) || 1
        const side = propRnd() > 0.5 ? 1 : -1
        const nx = -tangent.y / len, ny = tangent.x / len
        const distance = TILE.w * (r.kind === 'avenue' ? 0.46 : 0.34)
        const x = p.x + nx * distance * side
        const y = p.y + ny * distance * side * 0.78
        if (!roadsideClear(x, y)) continue
        const key = u < 0.5 ? 'd_terracotta-pots' : 'd_stone-bench'
        const width = TILE.w * (u < 0.5 ? 0.4 : 0.6)
        const image = stamp(key, x, y, width, y - 0.2, 0.92, 1)
        if (image) roadTextures.push(image)
      }
    }
  }
  updateRoads(divanLevel, occupiedSlotIds)

  // Normal görünümde sabit arsa / Divanhane meydan plakası çizilmez.
  // Kurulu yapıların doğal açıklığı Phaser bina katmanında dinamik üretilir.

  return { ambientDecor, curves, quaySpine, roads, syncAmbientDecor, updateRoads }
}
