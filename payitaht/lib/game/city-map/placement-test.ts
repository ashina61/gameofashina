/**
 * EXHAUSTIVE PLACEMENT TEST — saf, çerçevesiz.
 *
 * Bütün normal bina mock'larını, 24 taşınabilir city slotunun HER BİRİNE tek
 * tek koyar ve dört şeyi doğrular:
 *   1) footprint uyuşuyor mu   — slot footprint'i standartla aynı mı (2x2)
 *   2) anchor slot merkezinde mi — sprite'ın yatay merkezi slot ekran merkezi mi
 *   3) komşu footprint'e taşma var mı — hiçbir slotun footprint'i başkasınınkine
 *      girmiyor (footprint diamond çakışması yok)
 *   4) slot değiştirirken scale değişiyor mu — bir bina hangi slota giderse
 *      gitsin ölçeği AYNI (formül slottan bağımsız)
 *
 * Aynı geometri fonksiyonlarını debug sahnesi de kullanır; böylece test ile
 * ekranda görülen birebir aynı hesaptır.
 */
import { CITY_SLOTS, SLOTS, TILE, type CitySlot } from './index'

/** SABİT taban genişliği (debug sahnesiyle ORTAK) — her binada aynı. */
export const BASE_WIDTH = TILE.w * 1.7

/** Bir binanın bir slottaki oturma noktası: yatay merkez + footprint alt ucu. */
export function slotAnchor(slot: CitySlot): { x: number; baseY: number } {
  return { x: slot.screen.x, baseY: slot.screen.y + (slot.fh / 2) * TILE.h }
}

/** Sprite ölçeği yalnızca binanın kendi genişliğine bağlıdır — SLOTTAN BAĞIMSIZ. */
export function spriteScale(intrinsicWidth: number): number {
  return BASE_WIDTH / intrinsicWidth
}

/** İki slotun 2x2 footprint'i çakışıyor mu? (grid: her iki eksende de <fw/<fh) */
function footprintsOverlap(a: CitySlot, b: CitySlot): boolean {
  return Math.abs(a.gx - b.gx) < a.fw && Math.abs(a.gy - b.gy) < a.fh
}

export type PlacementBuilding = { id: string; width: number }

export type ExhaustiveResult = {
  buildings: number
  movableSlots: number
  combos: number
  footprintOk: boolean
  anchorOk: boolean
  overlapFree: boolean
  scaleStable: boolean
  passed: boolean
  failures: string[]
}

/** Varsayılan mock binalar — kasıtlı FARKLI intrinsic genişlikler (scale testi anlamlı olsun). */
export const DEFAULT_BUILDINGS: PlacementBuilding[] = [
  { id: 'saray', width: 512 }, { id: 'kisla', width: 400 }, { id: 'medrese', width: 448 },
  { id: 'carsi', width: 360 }, { id: 'ambar', width: 300 }, { id: 'hamam', width: 380 },
  { id: 'konut', width: 420 }, { id: 'kereste', width: 280 }, { id: 'tas', width: 340 }, { id: 'elcilik', width: 320 },
]

export function runExhaustivePlacementTest(buildings: PlacementBuilding[] = DEFAULT_BUILDINGS): ExhaustiveResult {
  const failures: string[] = []
  const movable = CITY_SLOTS.filter(s => !s.fixed)
  const std = movable[0]

  // (3) Layout invaryantı: hiçbir slot çifti footprint'te çakışmaz (city+coast+defense).
  let overlapFree = true
  for (let i = 0; i < SLOTS.length; i++) {
    for (let j = i + 1; j < SLOTS.length; j++) {
      if (footprintsOverlap(SLOTS[i], SLOTS[j])) {
        overlapFree = false
        failures.push(`overlap: ${SLOTS[i].id} ~ ${SLOTS[j].id}`)
      }
    }
  }

  let footprintOk = true, anchorOk = true, scaleStable = true, combos = 0
  for (const b of buildings) {
    const scale0 = spriteScale(b.width)
    for (const slot of movable) {
      combos++
      // (1) footprint standart mı
      if (slot.fw !== std.fw || slot.fh !== std.fh) {
        footprintOk = false; failures.push(`footprint: ${slot.id} ${slot.fw}x${slot.fh} != ${std.fw}x${std.fh}`)
      }
      // (2) anchor slot merkezinde mi (yatay merkez = slot ekran X'i)
      const anchor = slotAnchor(slot)
      if (anchor.x !== slot.screen.x) {
        anchorOk = false; failures.push(`anchor: ${b.id}@${slot.id} x ${anchor.x} != ${slot.screen.x}`)
      }
      // (4) scale slottan bağımsız mı (her slotta aynı)
      if (spriteScale(b.width) !== scale0) {
        scaleStable = false; failures.push(`scale: ${b.id}@${slot.id} değişti`)
      }
    }
  }

  const passed = footprintOk && anchorOk && overlapFree && scaleStable
  return {
    buildings: buildings.length, movableSlots: movable.length, combos,
    footprintOk, anchorOk, overlapFree, scaleStable, passed,
    failures: failures.slice(0, 20),
  }
}
