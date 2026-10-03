import { CITY_SLOTS, COAST_SLOTS, DEFENSE_SLOTS, PLAZA, RING_ROAD, HALL_SLOT_ID, TILE } from '../index'
import { aqueductHits, cityBazaar, cityFields, cityFountains, nearStreamAt } from '../city-extras'
import * as Phaser from 'phaser'
import { mulberry32, type RoadCurve, nearSlot } from '../terrain-builder'

export function placeDecor({ ambientDecor, curves, occupiedSlotIds, quaySpine, shoreY, stamp, wr }: { ambientDecor: { image: Phaser.GameObjects.Image; x: number; y: number; minLevel?: number | undefined; }[]; curves: RoadCurve[]; occupiedSlotIds: string[]; quaySpine: Phaser.Curves.Spline; scene: Phaser.Scene; seaLine: number; shoreY: (x: number) => number; stamp: (key: string, wx: number, wy: number, tw: number, depth: number, oy?: number, alpha?: number, tint?: number | undefined) => Phaser.GameObjects.Image | null; wr: { x: number; y: number; w: number; h: number; } }) {
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
  // Az sayıda belirgin, tam opak 3–7 parçalık bahçe; araları temiz çim.
  type Piece = { key: string; dx: number; dy: number; w: number }
  const gardens: Piece[][] = [
    [{ key: 'olive-tree', dx: -1, dy: -0.6, w: 0.9 }, { key: 'pine', dx: 1, dy: -0.4, w: 1 }, { key: 'bush', dx: 0, dy: 0.7, w: 0.45 }, { key: 'flower', dx: 1.1, dy: 0.8, w: 0.45 }],
    [{ key: 'fig-tree', dx: -1, dy: -0.5, w: 0.85 }, { key: 'orange-tree', dx: 1, dy: -0.5, w: 0.85 }, { key: 'pomegranate-tree', dx: 0, dy: 0.9, w: 0.85 }],
    [{ key: 'bostan', dx: -0.8, dy: 0.2, w: 0.9 }, { key: 'well', dx: 0.8, dy: -0.6, w: 0.5 }, { key: 'haystack', dx: 1.1, dy: 0.8, w: 0.45 }],
    [{ key: 'lavender', dx: -0.7, dy: -0.4, w: 0.6 }, { key: 'tulip-bed', dx: 0.7, dy: 0, w: 0.85 }, { key: 'tulip-clump', dx: -0.5, dy: 0.8, w: 0.5 }, { key: 'terracotta-pots', dx: 0.8, dy: 0.9, w: 0.4 }],
    [{ key: 'coffee-garden', dx: -0.6, dy: 0, w: 1 }, { key: 'grain-sacks', dx: 1, dy: 0.6, w: 0.45 }, { key: 'tezgah', dx: 0.7, dy: -0.8, w: 0.7 }],
    [{ key: 'plane-tree', dx: 0, dy: -0.7, w: 1.1 }, { key: 'beehives', dx: -0.8, dy: 0.8, w: 0.65 }, { key: 'woodpile', dx: 0.9, dy: 0.7, w: 0.5 }, { key: 'rock', dx: 1.4, dy: -0.4, w: 0.45 }],
    [{ key: 'cesme', dx: 0, dy: 0, w: 0.7 }, { key: 'cypress', dx: -1, dy: -0.6, w: 0.3 }, { key: 'cypress-b', dx: 1, dy: -0.6, w: 0.3 }],
    [{ key: 'degirmen', dx: 0, dy: -0.5, w: 0.9 }, { key: 'dry-grass', dx: -0.9, dy: 0.5, w: 0.4 }, { key: 'reed-clump', dx: 0.9, dy: 0.6, w: 0.35 }],
  ]
  const centers: Array<{ x: number; y: number }> = []
  const putGarden = (x: number, y: number, pieces: Piece[], minLevel = 0) => {
    const points = pieces.map(p => ({ ...p, x: x + TILE.w * p.dx, y: y + TILE.h * p.dy }))
    // Büyük silüetler için daha geniş koruma; arsa/yol geometrisi değişmez.
    if (!points.every(p => clearForDecor(p.x, p.y, 1.12))) return false
    if (centers.some(c => Math.hypot(c.x - x, (c.y - y) * 1.7) < TILE.w * 4.2)) return false
    centers.push({ x, y })
    for (const p of points) {
      const image = stamp('d_' + p.key, p.x, p.y, TILE.w * p.w, -700 + p.y * 0.0001, 0.92, 1)
      if (image) ambientDecor.push({ image, x: p.x, y: p.y, minLevel })
    }
    return true
  }
  // Meydan çevresindeki dört düzenli bahçe: servi sırası + saksı + bank.
  for (let i = 0; i < 4; i++) {
    const a = (i + 0.5) / 4 * Math.PI * 2
    const x = PLAZA.screen.x + Math.cos(a) * RING_ROAD.rx * 0.82
    const y = PLAZA.screen.y + Math.sin(a) * RING_ROAD.ry * 0.82
    putGarden(x, y, [
      { key: 'cypress', dx: -1, dy: -0.7, w: 0.3 },
      { key: 'cypress', dx: 0, dy: -0.7, w: 0.3 },
      { key: 'cypress-b', dx: 1, dy: -0.7, w: 0.3 },
      { key: 'stone-bench', dx: 0, dy: 0.7, w: 0.65 },
      { key: 'terracotta-pots', dx: 1, dy: 0.7, w: 0.4 },
    ])
  }
  const rnd = mulberry32(9917)
  // Toplam en fazla 28 küme; eski binlerce tekil orman/çayır nesnesi yok.
  for (let tries = 0; tries < 2000 && centers.length < 28; tries++) {
    const x = wr.x + wr.w * (0.07 + rnd() * 0.86)
    const y = wr.y + (shoreY(x) - wr.y) * (0.12 + rnd() * 0.77)
    putGarden(x, y, gardens[centers.length % gardens.length], centers.length > 22 ? 3 : 0)
  }
}
