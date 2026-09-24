'use client'

import useSWR from 'swr'
import { execute, type Command, type UnitId } from '@/lib/game/engine'
import { dispatchPiracy, dispatchRaid, dispatchSpies } from '@/lib/game/expeditions'
import {
  activeCity, advanceEmpire, foundColony, initialEmpire, parseEmpire,
  shipResources, type Cargo, type Empire, type IslandId,
} from '@/lib/game/empire'

// Same key as the legacy single-city save. First load upgrades it in place.
export const SAVE_KEY = 'payitaht-adalari-v1'
let memory: Empire | null = null
let warning = ''
let corrupt = false

function save(empire: Empire) {
  memory = empire
  if (corrupt) return
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(empire)) }
  catch { warning = 'Cihazda kayıt kullanılamıyor. Bu oturumdaki ilerleme, sayfa kapatıldığında kaybolabilir.' }
}
function load(): Empire {
  if (!corrupt) {
    try {
      const raw = localStorage.getItem(SAVE_KEY)
      if (raw) memory = parseEmpire(raw)
    } catch (error) {
      warning = error instanceof Error ? error.message : 'Kayıt okunamadı.'
      corrupt = true // Never overwrite a damaged save with a fresh game.
    }
  }
  const empire = advanceEmpire(memory ?? initialEmpire(Date.now()), Date.now())
  save(empire)
  return empire
}
export function useGame() {
  const { data, mutate } = useSWR<Empire>(SAVE_KEY, load, {
    refreshInterval: 1000, revalidateOnFocus: true, dedupingInterval: 0,
  })
  const game = data ? activeCity(data).game : undefined
  function commit(empire: Empire) {
    save(empire)
    void mutate(empire, { revalidate: false })
  }
  function command(action: Command) {
    const empire = load()
    const city = activeCity(empire)
    const result = execute(city.game, action, Date.now())
    city.game = result.game
    commit(empire)
    return result.error
  }
  function selectCity(cityId: string): string | undefined {
    const empire = load()
    if (!empire.cities.some(city => city.id === cityId)) return 'Şehir bulunamadı.'
    empire.activeCityId = cityId
    commit(empire)
  }
  function colonize(islandId: IslandId): string | undefined {
    const result = foundColony(load(), islandId, Date.now())
    if (result.error) return result.error
    commit(result.empire)
  }
  function sendCargo(to: string, resource: Cargo, amount: number): string | undefined {
    const result = shipResources(load(), to, resource, amount, Date.now())
    if (result.error) return result.error
    commit(result.empire)
  }
  function spy(npcId: string, count: number): string | undefined {
    const result = dispatchSpies(load(), npcId, count, Date.now())
    if (result.error) return result.error
    commit(result.empire)
  }
  function raid(npcId: string, units: Partial<Record<UnitId, number>>): string | undefined {
    const result = dispatchRaid(load(), npcId, units, Date.now())
    if (result.error) return result.error
    commit(result.empire)
  }
  function piracy(targetId: string, units: Partial<Record<UnitId, number>>): string | undefined {
    const result = dispatchPiracy(load(), targetId, units, Date.now())
    if (result.error) return result.error
    commit(result.empire)
  }
  /** İmparatorluk düzeyinde herhangi bir işlem (diplomasi, pazar, işgal...). */
  function run(op: (e: Empire, now: number) => { empire: Empire; error?: string }): string | undefined {
    const result = op(load(), Date.now())
    if (result.error) return result.error
    commit(result.empire)
  }
  function reset() {
    corrupt = false
    warning = ''
    commit(initialEmpire(Date.now()))
  }
  return { game, empire: data, command, selectCity, colonize, sendCargo, spy, raid, piracy, run, reset, warning }
}
