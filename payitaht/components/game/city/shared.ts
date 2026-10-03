import * as Phaser from 'phaser'
import { type BuildingId } from '@/lib/game/engine'
import { type ArtSize } from '@/lib/asset'
import { canvasDpr } from '@/lib/render-dpr'
import { liteMode } from '@/lib/motion'
/**
 * Şehir tuvalinde bina görseli boyu (V2 Faz 6.1): web'de 2x ekranda tam boy,
 * aksi halde, hafif modda ve Android paketinde yarı boy. Ölçek dosyanın gerçek genişliğinden
 * okunduğu için iki boy aynı büyüklükte çizilir.
 */
// Android paketinde tam boylar hiç yoktur (android.yml onları APK'den çıkarır).
export const cityArtSize = (): ArtSize => process.env.NEXT_PUBLIC_NATIVE !== '1' && canvasDpr() >= 2 && !liteMode() ? 'full' : 'sm'

/** Sancak direği dikilen devlet yapıları (V2 Faz 4.1). */
export const FLAG_POLE_BUILDINGS = new Set<BuildingId>(['divan', 'saray', 'valilik', 'kisla', 'elcilik', 'tophane', 'korsan_kalesi', 'kara_pazar'])

/** Yolda yürüyen vatandaş (Ikariam'ın sokaktaki halkı). */
export type Walker = { body: Phaser.GameObjects.Graphics; edge: RoadEdge; forward: boolean; t: number; speed: number; side: number }
export type RoadEdge = { key: string; from: string; to: string; curve: Phaser.Curves.QuadraticBezier; length: number }

export type CityEvents = {
  onReady?: () => void
  onBuilding: (id: BuildingId) => void
  onPlot: (index: number) => void
  /** (Artık kullanılmıyor — yollar güvenli road graph'tan zemine pişer.) */
  onRoad: (cell: string) => void
  /** Taşıma kipinde hedef arsa değişti (sürükleme/dokunuş). */
  onMovePlot: (plot: number) => void
  /** Ada madenine dokunuldu. */
  onMine: () => void
}

/** Sürüklemeyi dokunuştan ayıran eşik (ekran pikseli). */
export const TAP_SLOP = 12
/**
 * KADEMELİ BÜYÜME: görsel 3 aşamada değişir (1-3, 4-7, 8+); aşama içinde her
 * seviye binayı biraz büyütür (%90 → %100), böylece her yükseltme görünür.
 */
export function stageGrowth(level: number) {
  if (level <= 0) return 1
  const p = level >= 8 ? Math.min(1, (level - 8) / 4) : level >= 4 ? (level - 4) / 3 : (level - 1) / 2
  return 0.9 + 0.1 * p
}
/** Bina görsellerinde zemin elmasının merkezi, resmin altından bu kadar yukarıda (sanat pikseli, 600px tuval). */
export const ART_GROUND_PX = 118
/** Boyalı tuvalleri eski 600px sprite genişliğiyle aynı dünya ölçeğine eşle. */
export const PAINTED_SOURCE_WIDTH: Partial<Record<BuildingId, number>> = {
  divan: 1466, cami: 1445, saray: 1542, konut: 1633,
  kisla: 1466, medrese: 1448, carsi: 1774,
  kereste: 1774, ambar: 1774,
  elcilik: 1632, hamam: 1632, kahvehane: 1632,
  muze: 1632, marangoz: 1774, mimar: 1632,
  ormanci: 1774, tasci: 1774, bagci: 1774,
  tophane: 1774, simyahane: 1632, camci: 1774,
  mahzen: 1774, gozlukcu: 1632, barutane: 1774,
  depo: 1774, ticaret_merkezi: 1774, harita_arsivi: 1774,
  valilik: 1747, kara_pazar: 1774, siginak: 1774,
  tekke: 1774, mabet: 1774, karagoz: 1642,
  korsan_kalesi: 1774,
  liman: 1598, tersane: 1774,
}
export function isTap(p: Phaser.Input.Pointer) {
  return p.downTime > 0 && Phaser.Math.Distance.Between(p.downX, p.downY, p.upX, p.upY) < TAP_SLOP
}
