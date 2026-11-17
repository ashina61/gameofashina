import { GUIDED_STEPS, OBJECTIVES, UNITS, UNIT_IDS, type BuildingId, type Game, type UnitId } from './engine'

type Step = { title: string; action: string; building?: BuildingId; choosePlot?: boolean }

const STEPS: Record<string, Step> = {
  'first-upgrade': { title: 'Divanhaneyi yükselt', action: 'Divanhaneyi aç', building: 'divan' },
  'first-academy': { title: 'Medreseyi kur', action: 'Arsa seç', building: 'medrese', choosePlot: true },
  'first-worker': { title: 'Medresede ilim üret', action: 'Âlim ata' },
  'first-research': { title: 'İlk araştırmanı tamamla', action: 'Araştır' },
  barracks: { title: 'Kışlayı kur', action: 'Arsa seç', building: 'kisla', choosePlot: true },
  walls: { title: 'Şehir surlarını inşa et', action: 'Surları aç', building: 'surlar' },
  troops: { title: 'Beş kara askeri yetiştir', action: 'Asker eğit' },
  'first-raid': { title: 'Köye ilk seferini gönder', action: 'Adaya git' },
}

const isSoldier = (id: UnitId) => UNITS[id]?.branch === 'kara' && UNITS[id].role !== 'spy'

export function firstSessionStep(game: Game) {
  const index = OBJECTIVES.findIndex(objective => !game.claimed.includes(objective.id))
  if (index < 0 || index >= GUIDED_STEPS || game.buildings.divan >= 5) return null

  const objective = OBJECTIVES[index]
  const step = STEPS[objective.id]
  const done = objective.done(game)
  const build = !done && step.building ? game.queue.find(job => job.id === step.building) : undefined
  const study = !done && objective.id === 'first-research' ? game.study : null
  let training
  if (!done && objective.id === 'troops') {
    let soldiers = UNIT_IDS.reduce((total, id) => total + (isSoldier(id) ? game.army[id] : 0), 0)
    for (const job of game.drills) {
      if (!isSoldier(job.id as UnitId)) continue
      soldiers += job.count ?? 0
      if (soldiers >= 5) { training = job; break }
    }
  }

  const job = build ?? study ?? training
  const status = build ? build.start > game.updatedAt ? 'İnşaat sırasında' : 'İnşaat sürüyor'
    : study ? 'Araştırma sürüyor' : training ? 'Eğitim sürüyor' : null
  return { ...step, objective, index, done, job, status }
}
