/** Art thresholds use the building's own level, independently of the city hall. */
export const BUILDING_ART_LEVELS = [1, 5, 10, 15, 20] as const
export type BuildingArtLevel = typeof BUILDING_ART_LEVELS[number]
export function buildingArtLevel(level: number): BuildingArtLevel {
  const safe = Number.isFinite(level) ? Math.max(1, Math.floor(level)) : 1
  return safe >= 20 ? 20 : safe >= 15 ? 15 : safe >= 10 ? 10 : safe >= 5 ? 5 : 1
}
/** Alpha bounds measured from the generated sprites. Physical structures grow
 * inside one legal plot; contact points stay fixed as their height increases.
 */
const BARRACKS_CONTACT = {
  1: { originX: .496013, originY: .818182, contactWidthRatio: .802233, occupancyScale: .72 },
  5: { originX: .5, originY: .800638, contactWidthRatio: .926635, occupancyScale: .88 },
  10: { originX: .5, originY: .811005, contactWidthRatio: .923445, occupancyScale: 1 },
  15: { originX: .5, originY: .870813, contactWidthRatio: .974482, occupancyScale: 1 },
  20: { originX: .5, originY: .871611, contactWidthRatio: .972887, occupancyScale: 1 },
} as const
export const FIVE_STAGE_ART_REV = '20261011-ottoman-barracks-v1'
/** Register a family only after all five variants are actually present. */
export function fiveStageBuildingArt(id: string, level: number) {
  if (id !== 'kisla') return null
  const stage = buildingArtLevel(level)
  return {
    stage,
    key: `${id}-growth-${stage}`,
    path: `/images/game/buildings/glarium/${id}-${String(stage).padStart(2, '0')}`,
    ...BARRACKS_CONTACT[stage],
  }
}
