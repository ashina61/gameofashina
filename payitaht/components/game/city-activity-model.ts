import { BUILDINGS, RESEARCH, UNITS, type BuildingId, type Game, type Job, type ResearchId, type UnitId } from '@/lib/game/engine'

export type CityActivity = {
  key: string
  kind: Job['kind']
  title: string
  detail: string
  building: BuildingId
  job: Job
  waiting: boolean
  progress: number
}

/** Use the engine's timestamps, including separate recruitment queues. */
export function cityActivities(game: Game): CityActivity[] {
  const jobs = [...game.queue, ...(game.study ? [game.study] : []), ...game.drills]
  return jobs.map(job => {
    const building = job.kind === 'build' ? job.id as BuildingId
      : job.kind === 'research' ? 'medrese' : UNITS[job.id as UnitId].home
    const waiting = job.start > game.updatedAt
    return {
      key: `${job.kind}:${job.id}:${job.start}`,
      kind: job.kind, building, job, waiting,
      title: job.kind === 'build' ? BUILDINGS[building].name
        : job.kind === 'research' ? RESEARCH[job.id as ResearchId].name
          : `${job.count ?? 1} ${UNITS[job.id as UnitId].name}`,
      detail: waiting ? 'Sırada bekliyor' : job.kind === 'build' ? `Seviye ${game.buildings[building] + 1}`
        : job.kind === 'research' ? 'Araştırılıyor' : `${BUILDINGS[building].name} · Talimde`,
      progress: Math.max(0, Math.min(100, (game.updatedAt - job.start) / Math.max(1, job.end - job.start) * 100)),
    }
  }).sort((a, b) => Number(a.waiting) - Number(b.waiting) || a.job.end - b.job.end)
}

export function activityTime(milliseconds: number): string {
  const seconds = Math.max(0, Math.ceil(milliseconds / 1000))
  if (seconds >= 3600) return `${Math.floor(seconds / 3600)} sa ${Math.floor(seconds / 60) % 60} dk`
  return `${Math.floor(seconds / 60).toString().padStart(2, '0')}:${(seconds % 60).toString().padStart(2, '0')}`
}
