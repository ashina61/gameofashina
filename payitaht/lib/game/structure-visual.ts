import type { BuildingId, Game } from './engine'

/** Completion, never plot reservation, controls finished artwork. */
export function structureVisual(game: Game, id: BuildingId): 'empty' | 'queued' | 'construction' | 'built' {
  if (game.buildings[id] > 0) return 'built'
  const position = game.queue.findIndex(job => job.kind === 'build' && job.id === id)
  return position === 0 ? 'construction' : position > 0 ? 'queued' : 'empty'
}
export const cityGround = (game: Game) => game.buildings.surlar > 0 ? 'city-fortified' : 'city-empty'
