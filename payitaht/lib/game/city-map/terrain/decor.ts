import { CITY_SLOTS, COAST_SLOTS, DEFENSE_SLOTS, DEFENSE_FOUNDATION, PLAZA, RING_ROAD, HALL_SLOT_ID, slotById, TILE } from '../index'
import { aqueductHits, cityBazaar, cityFields, cityFountains, cityStream, nearStreamAt } from '../city-extras'
import * as Phaser from 'phaser'
import { mineSite, cemeterySite, mulberry32, type RoadCurve, nearSlot } from '../terrain-builder'

export function placeDecor({ ambientDecor, curves, occupiedSlotIds, quaySpine, scene, seaLine, shoreY, stamp, wr }: { ambientDecor: { image: Phaser.GameObjects.Image; x: number; y: number; minLevel?: number | undefined; }[]; curves: RoadCurve[]; occupiedSlotIds: string[]; quaySpine: Phaser.Curves.Spline; scene: Phaser.Scene; seaLine: number; shoreY: (x: number) => number; stamp: (key: string, wx: number, wy: number, tw: number, depth: number, oy?: number, alpha?: number, tint?: number | undefined) => Phaser.GameObjects.Image | null; wr: { x: number; y: number; w: number; h: number; } }) {
  // 4) DEKOR. Dama gibi eşit serpme yerine yol kenarı KÜMELERİ + seyrek boş arazi.
  const occ = [...CITY_SLOTS, ...COAST_SLOTS, ...DEFENSE_SLOTS]
  // Yol üstüne ağaç/çalı çıkmasın (önceden yalnızca arsalara bakılıyordu).
  const roadSamples = [
    ...curves.flatMap(r => Array.from({ length: 24 }, (_, i) => r.curve.getPoint(i / 23))),
    ...Array.from({ length: 48 }, (_, i) => quaySpine.getPoint(i / 47)),
  ]
  const initialOccupied = new Set(occupiedSlotIds)
  initialOccupied.add(HALL_SLOT_ID)
  const clearForDecor = (wx: number, wy: number, margin = 0.9) =>
    wy < shoreY(wx) - TILE.h * 0.58 &&
    ((wx - PLAZA.screen.x) / PLAZA.rx) ** 2 + ((wy - PLAZA.screen.y) / PLAZA.ry) ** 2 > 1.5 &&
    !cityFields().some(f => Math.abs(wx - f.x) / (f.hw + 30) + Math.abs(wy - f.y) / (f.hh + 15) < 1) &&
    !cityFountains().some(c => Math.hypot(wx - c.x, (wy - c.y) * 2) < TILE.w * 0.8) &&
    !nearStreamAt(wx, wy, 46, 30) &&
    !aqueductHits(wx, wy, 40, 26) &&
    !(cityBazaar() && Math.abs(cityBazaar()!.x - wx) < 200 && wy > cityBazaar()!.y - 120 && wy < cityBazaar()!.y + 100) &&
    !occ.some(s => nearSlot(
      wx, wy, s,
      initialOccupied.has(s.id) ? margin : Math.min(margin, s.fixed ? 0.90 : 0.66),
    )) &&
    !roadSamples.some(p => Math.hypot(p.x - wx, p.y - wy) < TILE.w * 0.18)
  const kinds = ['d_olive-tree', 'd_bush', 'd_flower', 'd_rock']
  let di = 0
  const decorRnd = mulberry32(4242)
  const decorWidth = (key: string) =>
    key.includes('olive')
      ? TILE.w * (0.56 + decorRnd() * 0.12)
      : key.includes('rock')
        ? TILE.w * (0.28 + decorRnd() * 0.10)
        : TILE.w * (0.24 + decorRnd() * 0.10)
  const placeDecor = (
    wx: number, wy: number, forced?: string, alpha = 1, margin = 0.76,
  ) => {
    if (!clearForDecor(wx, wy, margin)) return
    const key = forced ?? kinds[di++ % kinds.length]
    const image = stamp(key, wx, wy, decorWidth(key), -700, 0.92, alpha)
    if (image) ambientDecor.push({ image, x: wx, y: wy })
  }

  // Ikariam hissi: dekor "nesne" değil, YEŞİL KÜTLE gibi davranır.
  const clusterRnd = mulberry32(9917)
  const clusterCenters: Array<{ x: number; y: number; size: number; spread: number }> = []

  const placeCluster = (cx: number, cy: number, size: number, spread: number) => {
    // 2-3 zeytin ağacı aynı kütlenin omurgasını kurar.
    const treeCount = Math.min(3, Math.max(2, Math.round(size / 3)))
    for (let i = 0; i < treeCount; i++) {
      const a = (i / treeCount) * Math.PI * 2 + clusterRnd() * 0.7
      const r = TILE.w * spread * (i === 0 ? 0.05 : 0.24 + clusterRnd() * 0.18)
      placeDecor(
        cx + Math.cos(a) * r,
        cy + Math.sin(a) * r * 0.42,
        clusterRnd() < 0.3 ? 'd_cypress' : 'd_olive-tree',
        0.82 + clusterRnd() * 0.10,
        0.68,
      )
    }

    for (let i = treeCount; i < size; i++) {
      const a = clusterRnd() * Math.PI * 2
      const radius = Math.sqrt(clusterRnd())
      const rx = TILE.w * spread * radius
      const ry = TILE.h * spread * 1.15 * radius
      const roll = clusterRnd()
      const key = roll < 0.60 ? 'd_bush' : roll < 0.83 ? 'd_flower' : 'd_rock'
      placeDecor(
        cx + Math.cos(a) * rx,
        cy + Math.sin(a) * ry,
        key,
        0.62 + clusterRnd() * 0.18,
        0.66,
      )
    }
  }

  // İç alanda az sayıda ama daha büyük koruluk.
  let guard = 0
  while (clusterCenters.length < 10 && guard++ < 280) {
    const x = wr.x + wr.w * (0.08 + clusterRnd() * 0.84)
    const y = wr.y + (shoreY(x) - wr.y) * (0.08 + clusterRnd() * 0.78)
    if (!clearForDecor(x, y, 0.78)) continue
    if (clusterCenters.some(c => Math.hypot(c.x - x, c.y - y) < TILE.w * 2.15)) continue
    clusterCenters.push({
      x, y,
      size: 6 + Math.floor(clusterRnd() * 5),
      spread: 0.48 + clusterRnd() * 0.25,
    })
  }
  for (const c of clusterCenters) placeCluster(c.x, c.y, c.size, c.spread)

  // Meydan çevresindeki boş çayır, dünya ölçeğindeki rastgele koruluklara
  // bırakılınca başlangıç kadrajında ıssız kalıyor. Küçük ağaç grupları
  // çevre yolunun iç kenarına yerleşir; arsa, dere ve yol güvenliği aynı
  // clearForDecor kontrolünden geçer. Yerleşim kayıtları değişmez.
  const ringRnd = mulberry32(31721)
  for (let i = 0; i < 32; i++) {
    const a = (i + 0.25 + ringRnd() * 0.5) / 32 * Math.PI * 2
    const r = 0.78 + ringRnd() * 0.15
    const x = PLAZA.screen.x + Math.cos(a) * RING_ROAD.rx * r
    const y = PLAZA.screen.y + Math.sin(a) * RING_ROAD.ry * r
    if (!clearForDecor(x, y, 0.82)) continue
    if (clusterCenters.some(c => Math.hypot(c.x - x, (c.y - y) * 1.5) < TILE.w * 1.15)) continue
    placeCluster(x, y, 3 + Math.floor(ringRnd() * 3), 0.24)
  }

  // Haritanın üst/yan kenarlarını koruluklarla hafifçe çerçevele.
  // Bu, sonsuz boş zemin hissini keser ama şehir merkezini kapatmaz.
  const edgeAnchors = [
    [0.10, 0.16], [0.28, 0.09], [0.50, 0.07], [0.72, 0.10], [0.90, 0.17],
    [0.07, 0.38], [0.93, 0.40], [0.09, 0.63], [0.91, 0.64],
  ] as const
  for (const [px, py] of edgeAnchors) {
    const x = wr.x + wr.w * px + (clusterRnd() - 0.5) * TILE.w * 0.45
    const y = wr.y + (shoreY(x) - wr.y) * py + (clusterRnd() - 0.5) * TILE.h * 0.65
    if (clearForDecor(x, y, 0.72)) placeCluster(x, y, 7 + Math.floor(clusterRnd() * 4), 0.56)
  }

  // Yol kenarında sadece birkaç küçük doğal parça; ritmik süs dizisi yok.
  for (const r of curves.filter(r => r.kind === 'avenue')) {
    for (const t of [0.30, 0.72]) {
      if (clusterRnd() > 0.24) continue
      const p = r.curve.getPoint(t)
      const tangent = r.curve.getTangent(t)
      const len = Math.hypot(tangent.x, tangent.y) || 1
      const side = clusterRnd() > 0.5 ? 1 : -1
      const nx = -tangent.y / len, ny = tangent.x / len
      const distance = TILE.w * (0.50 + clusterRnd() * 0.14)
      const x = p.x + nx * distance * side
      const y = p.y + ny * distance * side
      if (clearForDecor(x, y, 0.68)) placeCluster(x, y, 3 + Math.floor(clusterRnd() * 3), 0.30)
    }
  }

  /*
   * IKARIAM ÇERÇEVESİ — kasaba ormanla çevrili bir AÇIKLIKTA durur.
   *
   * Savunma halkasının dışında, merkezden uzaklaştıkça SIKLAŞAN bir zeytinlik/
   * çalılık kuşağı; dış kenarlara doğru kayalık artar. Geniş haritanın boşluğunu
   * şehir değil MANZARA doldurur. Belediye hizasının altında açıklık yalnızca
   * yanlara uzanır; kasaba ile liman arasındaki kıyı şeridi açık kalır. Yollar,
   * slotlar ve deniz clearForDecor ile korunur. Yeni görsel yok: mevcut dekor.
   */
  {
    const hallS = slotById(HALL_SLOT_ID)!.screen
    const ringXs = DEFENSE_FOUNDATION.map(p => p.screen.x)
    const ringYs = DEFENSE_FOUNDATION.map(p => p.screen.y)
    const clearRx = Math.max(...ringXs.map(x => Math.abs(x - hallS.x))) + TILE.w * 0.9
    const clearTop = hallS.y - Math.min(...ringYs) + TILE.h * 2.2
    // Orman burunlara da iner; kıyıdan kum/kayalık şeridi kadar geride durur.
    const coastTop = seaLine + TILE.h * 16
    const wildRnd = mulberry32(31337)
    const mine = mineSite()
    const cem = cemeterySite()
    const tints = [0xffffff, 0xeef3e2, 0xe3ebd4, 0xf4eedc, 0xdde6cc]
    const wild: Array<{ x: number; y: number; key: string; w: number; tint: number; flip: boolean; clump: number }> = []
    const stepX = TILE.w * 0.78, stepY = TILE.h * 1.15
    // Düşük frekanslı YOĞUNLUK ALANI: ağaçlar tek tek serpilmez, koruluk
    // KÜTLELERİ oluşturur; aralarında çayır boşlukları kalır (≈[-1,1]).
    const S = TILE.w * 3.2
    const grove = (x: number, y: number) => (
      Math.sin(x / S + 1.3) * Math.cos(y / (S * 0.6) - 0.7)
      + 0.6 * Math.sin((x + y * 1.7) / (S * 1.9) + 2.1)
      + 0.35 * Math.cos((x * 0.8 - y) / (S * 1.1) + 0.4)) / 1.95
    for (let y = wr.y + TILE.h * 0.6; y < coastTop; y += stepY) {
      for (let x = wr.x + TILE.w * 0.3; x < wr.x + wr.w; x += stepX) {
        const jx = x + (wildRnd() - 0.5) * stepX * 0.9
        const jy = y + (wildRnd() - 0.5) * stepY * 0.9
        if (jy > shoreY(jx) - TILE.h * 2.4) { wildRnd(); wildRnd(); wildRnd(); continue }
        const dx = (jx - hallS.x) / clearRx
        const dy = jy < hallS.y ? (hallS.y - jy) / clearTop : 0
        const e = Math.hypot(dx, dy)
        const roll = wildRnd(), pick = wildRnd(), size = wildRnd()
        if (e < 1) continue // kasabanın açıklığı
        if (Math.hypot((jx - mine.x) / 2, jy - mine.y) < TILE.h * 3.2) continue // ada madeni
        if (Math.hypot((jx - cem.x) / 2, jy - cem.y) < TILE.h * 3.6) continue // mezarlık
        const t = Math.min(1, (e - 1) / 0.45) // açıklık kenarından uzaklık
        const g = grove(jx, jy)
        const clump = Math.min(1, Math.max(0, (g + 0.15) / 0.6)) // 0 çayır .. 1 koru
        // Koru içinde taç taca (sık kütle), çayırda seyrek; açıklık kenarında incelir.
        if (roll > (0.10 + 0.70 * t) * (0.12 + 1.6 * clump)) continue
        if (!clearForDecor(jx, jy, 0.8)) continue
        const rockBias = 0.08 * t
        // 0.26: zeytinliğin arasına fıstık çamı, çınar ve kavak karışır.
        const key = pick < 0.34 - rockBias ? 'd_olive-tree'
          : pick < 0.43 - rockBias ? 'd_pine'
          : pick < 0.49 - rockBias ? 'd_plane-tree'
          : pick < 0.54 - rockBias ? 'd_cypress'
          : pick < 0.58 - rockBias ? 'd_cypress-b'
          : pick < 0.61 - rockBias ? 'd_poplar'
          : pick < 0.82 - rockBias ? 'd_bush'
          : pick < 0.95 ? 'd_rock' : 'd_flower'
        const w = key === 'd_olive-tree' ? TILE.w * (0.62 + size * 0.34 + clump * 0.36)
          : key === 'd_pine' ? TILE.w * (0.66 + size * 0.3 + clump * 0.3)
          : key === 'd_plane-tree' ? TILE.w * (0.7 + size * 0.3 + clump * 0.3)
          : key === 'd_poplar' ? TILE.w * (0.26 + size * 0.1)
          : key.startsWith('d_cypress') ? TILE.w * (0.30 + size * 0.12)
          : key === 'd_rock' ? TILE.w * (0.30 + size * 0.18)
          : key === 'd_bush' ? TILE.w * (0.30 + size * 0.14)
          : TILE.w * (0.24 + size * 0.08)
        wild.push({ x: jx, y: jy, key, w, tint: tints[Math.floor(size * tints.length) % tints.length], flip: pick > 0.5, clump })
      }
    }
    // Orman TABANI: koruların altına yumuşak koyu gölge; taçlar tek tek değil
    // KÜTLE olarak okunur (tek Graphics, ucuz).
    const floor = scene.add.graphics().setDepth(-706)
    for (const p of wild) {
      if (p.clump < 0.45 || !['d_olive-tree', 'd_pine', 'd_plane-tree'].includes(p.key)) continue
      floor.fillStyle(0x2f4a24, 0.10 + 0.10 * p.clump)
      floor.fillEllipse(p.x, p.y - TILE.h * 0.35, p.w * 1.35, p.w * 0.62)
    }
    // Arkadan öne: aşağıdaki ağaç yukarıdakinin gövdesini örter.
    wild.sort((a, b) => a.y - b.y)
    for (const p of wild) {
      const image = stamp(p.key, p.x, p.y, p.w, -700, 0.92, 1, p.tint)
      if (image) { image.setFlipX(p.flip); ambientDecor.push({ image, x: p.x, y: p.y }) }
    }
  }

  /*
   * KIR HAYATI (0.26): sur içindeki boş çimen artık ıssız değil. Arsalardan,
   * yollardan ve dereden uzak açıklıklara küçük sahneler: çınar gölgesi,
   * meyve bahçesi, kuyu başı, lale tarhı. Tarla kenarında saman, kovan ve
   * odun; dere boyunca kavak sırası. Bir arsaya bina kurulunca yakınındaki
   * sahne (ambientDecor) kendiliğinden kaybolur.
   */
  {
    const lifeRnd = mulberry32(260926)
    const spots: Array<{ x: number; y: number }> = []
    const far = (x: number, y: number, d: number) =>
      !spots.some(p => Math.hypot(p.x - x, (p.y - y) * 1.6) < d) &&
      !clusterCenters.some(c => Math.hypot(c.x - x, (c.y - y) * 1.6) < TILE.w * 1.2)
    const put = (key: string, x: number, y: number, w: number) => {
      if (!clearForDecor(x, y, 0.72)) return false
      const image = stamp(key, x, y, w, -700, 0.92, 1)
      if (image) { image.setFlipX(lifeRnd() > 0.5); ambientDecor.push({ image, x, y }) }
      return !!image
    }
    const scenes: Array<(x: number, y: number) => void> = [
      // Çınar gölgesi: ulu çınar, dibinde çalı ve çiçek.
      (x, y) => { put('d_plane-tree', x, y, TILE.w * 0.95); put('d_bush', x + TILE.w * 0.42, y + TILE.h * 0.3, TILE.w * 0.3); put('d_flower', x - TILE.w * 0.38, y + TILE.h * 0.35, TILE.w * 0.28) },
      // Meyve bahçesi: üç portakal / nar ağacı.
      (x, y) => { for (const [dx, dy] of [[0, 0], [0.45, 0.25], [-0.4, 0.3]]) put('d_fruit-tree', x + TILE.w * dx, y + TILE.h * dy, TILE.w * 0.5) },
      // Kuyu başı.
      (x, y) => { put('d_well', x, y, TILE.w * 0.42); put('d_fruit-tree', x + TILE.w * 0.45, y - TILE.h * 0.15, TILE.w * 0.46); put('d_flower', x - TILE.w * 0.35, y + TILE.h * 0.2, TILE.w * 0.26) },
      // Lale tarhı ve fıstık çamı.
      (x, y) => { put('d_tulip-bed', x, y, TILE.w * 0.9); put('d_pine', x + TILE.w * 0.55, y - TILE.h * 0.25, TILE.w * 0.8) },
      // Lale bahçesi: üç tarh ve kenarında öbekler (Lale Devri bahçeleri).
      (x, y) => {
        put('d_tulip-bed', x, y, TILE.w * 0.95); put('d_tulip-bed', x + TILE.w * 0.9, y + TILE.h * 0.45, TILE.w * 0.85)
        put('d_tulip-bed', x - TILE.w * 0.88, y + TILE.h * 0.42, TILE.w * 0.85); put('d_tulip-clump', x + TILE.w * 0.1, y + TILE.h * 0.85, TILE.w * 0.5)
        put('d_cypress', x - TILE.w * 0.2, y - TILE.h * 0.35, TILE.w * 0.22)
      },
      // Çayırda lale öbekleri ve bir zeytin.
      (x, y) => { for (const [dx, dy] of [[0, 0], [0.5, 0.28], [-0.46, 0.32], [0.06, 0.6]]) put('d_tulip-clump', x + TILE.w * dx, y + TILE.h * dy, TILE.w * 0.48); put('d_olive-tree', x + TILE.w * 0.7, y - TILE.h * 0.25, TILE.w * 0.6) },
    ]
    const hallS = slotById(HALL_SLOT_ID)!.screen
    let tries = 0
    while (spots.length < 22 && tries++ < 1200) {
      const x = wr.x + wr.w * (0.1 + lifeRnd() * 0.8)
      const y = wr.y + (shoreY(x) - wr.y) * (0.12 + lifeRnd() * 0.8)
      if (Math.hypot(x - hallS.x, (y - hallS.y) * 1.8) < TILE.w * 2.2) continue
      if (!clearForDecor(x, y, 0.85) || !far(x, y, TILE.w * 1.5)) continue
      spots.push({ x, y })
      scenes[spots.length % scenes.length](x, y)
    }
    // Tek tük gölgelik ağaçlar: çayırı noktalayan çınar, çam ve meyve ağaçları.
    const singles = ['d_plane-tree', 'd_pine', 'd_fruit-tree', 'd_olive-tree', 'd_fruit-tree', 'd_poplar']
    for (let i = 0, placed = 0; i < 500 && placed < 28; i++) {
      const x = wr.x + wr.w * (0.06 + lifeRnd() * 0.88)
      const y = wr.y + (shoreY(x) - wr.y) * (0.1 + lifeRnd() * 0.84)
      if (!far(x, y, TILE.w * 0.9)) continue
      const key = singles[Math.floor(lifeRnd() * singles.length)]
      const w = key === 'd_plane-tree' ? 0.78 : key === 'd_pine' ? 0.74 : key === 'd_olive-tree' ? 0.66 : key === 'd_poplar' ? 0.28 : 0.46
      if (put(key, x, y, TILE.w * w * (0.85 + lifeRnd() * 0.3))) { spots.push({ x, y }); placed++ }
    }
    // Çayıra serpilmiş tek tük lale öbekleri.
    for (let i = 0, placed = 0; i < 500 && placed < 28; i++) {
      const x = wr.x + wr.w * (0.06 + lifeRnd() * 0.88)
      const y = wr.y + (shoreY(x) - wr.y) * (0.1 + lifeRnd() * 0.84)
      if (!far(x, y, TILE.w * 0.7)) continue
      if (put('d_tulip-clump', x, y, TILE.w * (0.42 + lifeRnd() * 0.14))) { spots.push({ x, y }); placed++ }
    }
    // Tarla kenarları: saman yığını, arı kovanı, odun.
    for (const [i, f] of cityFields().entries()) {
      const sideX = f.x + (i % 2 ? 1 : -1) * (f.hw + TILE.w * 0.45)
      put(['d_haystack', 'd_beehives', 'd_woodpile'][i % 3], sideX, f.y + TILE.h * 0.1, TILE.w * (i % 3 === 0 ? 0.42 : 0.5))
      if (i % 2 === 0) put('d_haystack', sideX + TILE.w * 0.2, f.y + TILE.h * 0.55, TILE.w * 0.34)
    }
    // Dere boyunca kavak sırası (iki yakada, aralıklı).
    const pts = cityStream().pts
    for (let i = 4; i < pts.length - 2; i += 3) {
      const p = pts[i], q = pts[i + 1]
      const l = Math.hypot(q.x - p.x, q.y - p.y) || 1
      const nx = -(q.y - p.y) / l, ny = (q.x - p.x) / l
      const side = i % 2 ? 1 : -1
      if (lifeRnd() < 0.7) put('d_poplar', p.x + nx * 68 * side, p.y + ny * 40 * side, TILE.w * (0.28 + lifeRnd() * 0.08))
    }
    /*
     * MAHALLE (V2 Faz 4.4): şehir büyüdükçe boş çimen dolar. Her sahnenin bir
     * açılış seviyesi var (Divanhane 3'ten 14'e); Divanhane 10+ şehirde
     * çeşme başları, pazar tezgâhları, bostanlar, mezarlık ve yel değirmenleri
     * çayırın büyük kısmını kaplar. Bina kurulunca yakınındaki sahne kaybolur.
     */
    const putL = (key: string, x: number, y: number, w: number, minLevel: number) => {
      if (!clearForDecor(x, y, 0.7)) return false
      const image = stamp(key, x, y, w, -700, 0.92, 1)
      if (image) { image.setFlipX(lifeRnd() > 0.5); ambientDecor.push({ image, x, y, minLevel }) }
      return !!image
    }
    const hoods: Array<(x: number, y: number, lv: number) => void> = [
      // Çeşme başı: mermer çeşme, iki servi, çiçek.
      (x, y, lv) => { if (putL('d_cesme', x, y, TILE.w * 0.62, lv)) { putL('d_cypress', x - TILE.w * 0.48, y - TILE.h * 0.2, TILE.w * 0.2, lv); putL('d_cypress-b', x + TILE.w * 0.5, y - TILE.h * 0.1, TILE.w * 0.2, lv); putL('d_flower', x + TILE.w * 0.1, y + TILE.h * 0.55, TILE.w * 0.26, lv) } },
      // Mahalle pazarı: iki tezgâh, sandık ve odun.
      (x, y, lv) => { if (putL('d_tezgah', x, y, TILE.w * 0.62, lv)) { putL('d_tezgah', x + TILE.w * 0.72, y + TILE.h * 0.38, TILE.w * 0.58, lv); putL('d_woodpile', x - TILE.w * 0.5, y + TILE.h * 0.3, TILE.w * 0.34, lv) } },
      // Bostan: sebze tarhı, kuyu, saman.
      (x, y, lv) => { if (putL('d_bostan', x, y, TILE.w * 0.86, lv)) { putL('d_well', x + TILE.w * 0.66, y - TILE.h * 0.1, TILE.w * 0.36, lv); putL('d_haystack', x - TILE.w * 0.6, y + TILE.h * 0.25, TILE.w * 0.32, lv) } },
      // Mezarlık: servilerin gölgesinde.
      (x, y, lv) => { if (putL('d_mezarlik', x, y, TILE.w * 0.84, lv)) { putL('d_cypress', x - TILE.w * 0.5, y - TILE.h * 0.15, TILE.w * 0.22, lv); putL('d_cypress-b', x + TILE.w * 0.15, y - TILE.h * 0.5, TILE.w * 0.2, lv) } },
      // Yel değirmeni ve tarla kenarı.
      (x, y, lv) => { if (putL('d_degirmen', x, y, TILE.w * 0.7, lv)) { putL('d_haystack', x + TILE.w * 0.55, y + TILE.h * 0.3, TILE.w * 0.34, lv); putL('d_bush', x - TILE.w * 0.45, y + TILE.h * 0.35, TILE.w * 0.28, lv) } },
    ]
    for (let tries2 = 0, placed = 0; tries2 < 1600 && placed < 16; tries2++) {
      const x = wr.x + wr.w * (0.08 + lifeRnd() * 0.84)
      const y = wr.y + (shoreY(x) - wr.y) * (0.12 + lifeRnd() * 0.78)
      if (Math.hypot(x - hallS.x, (y - hallS.y) * 1.8) < TILE.w * 2.4) continue
      if (!clearForDecor(x, y, 0.9) || !far(x, y, TILE.w * 1.4)) continue
      spots.push({ x, y })
      // Seviye: ilk sahneler Divanhane 3'te, sonuncular 14'te açılır.
      hoods[placed % hoods.length](x, y, 3 + Math.round(placed * 11 / 15))
      placed++
    }
  }

  // İlk updateRoads çağrısı dekor üretilmeden önce yapılıyor.
  // İlk bina/arsa doluluğunu tüm koruluklar yaratıldıktan sonra da uygula.
}
