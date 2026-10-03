'use client'

import { useEffect } from 'react'
import useSWR, { mutate as mutateCache } from 'swr'
import { execute, type Command, type UnitId } from '@/lib/game/engine'
import { dispatchPiracy, dispatchRaid, dispatchSpies } from '@/lib/game/expeditions'
import {
  activeCity, advanceEmpire, foundColony, initialEmpire,
  shipResources, type Cargo, type Empire, type IslandId,
} from '@/lib/game/empire'
import {
  SAVE_KEY, exportStoredEmpire, importStoredEmpire, loadStoredEmpire, peekStoredEmpire, saveStoredEmpire,
} from '@/lib/game/save-storage'

export { SAVE_KEY } from '@/lib/game/save-storage'
import { awaySummary, type AwaySummary } from '@/lib/game/away'
import { startClock, tickClock, type ClockState } from '@/lib/game/clock'
import { clearNotices, scheduleNotices } from '@/lib/notify'

/*
 * OYUN SAATİ (V2 Faz 5.4): bütün zaman damgaları gameNow()'dan gelir. Cihaz
 * saati geri alınırsa oyun son görülen andan gerçek zamanla sürer; geri
 * alınan saat kazanç getirmez (lib/game/clock.ts).
 */
let clock: ClockState | null = null
const REWIND_WARNING = 'Cihaz saati geri alınmış. Oyun saati son görülen andan gerçek zamanla sürüyor; geri alınan saat ilerleme kazandırmaz.'
function gameNow(lastSeen = 0): number {
  const wall = Date.now()
  const mono = typeof performance !== 'undefined' ? performance.now() : wall
  if (!clock) {
    const s = startClock(lastSeen, wall, mono)
    clock = s.state
    if (s.rewound) warning = REWIND_WARNING
    return clock.game
  }
  const t = tickClock(clock, wall, mono)
  clock = t.state
  if (t.rewound) warning = REWIND_WARNING
  return t.now
}
const lastSeenOf = (e: Empire | null) => e ? Math.max(...e.cities.map(c => c.game.updatedAt)) : 0
let memory: Empire | null = null
let warning = ''
let corrupt = false
let hydrated = false
let lastPersistedAt = 0
/** Açılışta hesaplanan "yokluğunda olanlar" özeti (bir kez okunur). */
let away: AwaySummary | null = null
export function takeAwaySummary(): AwaySummary | null { const a = away; away = null; return a }
const PASSIVE_PERSIST_MS = 5_000

function save(empire: Empire, force = false) {
  memory = empire
  if (corrupt) return
  const now = Date.now()
  if (!force && now - lastPersistedAt < PASSIVE_PERSIST_MS) return
  try {
    saveStoredEmpire(localStorage, empire)
    lastPersistedAt = now
  } catch {
    warning = 'Cihazda kayıt kullanılamıyor. Bu oturumdaki ilerleme, sayfa kapatıldığında kaybolabilir.'
  }
}
function load(): Empire {
  // SWR saniyede bir ilerletir; synchronous localStorage yalnızca ilk hydrate'ta
  // okunur. Sonraki tick'ler bellekte ilerler ve 5 sn'de bir diske yazılır.
  let restored: Empire | null = null
  if (!corrupt && !hydrated) {
    hydrated = true
    const stored = loadStoredEmpire(localStorage)
    if (stored.error) {
      warning = stored.error
      corrupt = true // Ana + backup birlikte okunamıyorsa hiçbir şeyi ezme.
    } else {
      if (stored.empire) { memory = stored.empire; restored = stored.empire }
      if (stored.warning) warning = stored.warning
    }
  }
  const now = gameNow(lastSeenOf(memory))
  const empire = advanceEmpire(memory ?? initialEmpire(now), now)
  if (restored) away = awaySummary(restored, empire)
  save(empire)
  return empire
}
/**
 * GİRİŞ EKRANI İÇİN: kaydı DEĞİŞTİRMEDEN okur. Kayıt yoksa `empire`
 * boştur; bozuksa `error` dolar (oyun o kaydın üstüne yazmaz).
 */
export function peekSave(): { empire?: Empire; error?: string } {
  const stored = peekStoredEmpire(localStorage)
  return stored.error ? { error: stored.error } : stored.empire ? { empire: stored.empire } : {}
}
/** Giriş ekranındaki "Yeni oyun": eski kaydın yerine verilen imparatorluk. */
export function startNewGame(empire: Empire) {
  corrupt = false
  hydrated = true
  warning = ''
  save(empire, true)
  void mutateCache(SAVE_KEY, empire, { revalidate: false })
}
export function useGame() {
  const { data, mutate } = useSWR<Empire>(SAVE_KEY, load, {
    refreshInterval: 1000, revalidateOnFocus: true, dedupingInterval: 0,
  })
  useEffect(() => {
    const flush = () => { if (memory && !corrupt) save(memory, true) }
    // Arka plana geçerken telefon bildirimleri kurulur, dönünce silinir (V2 Faz 5.5).
    const onVisibility = () => {
      if (document.visibilityState === 'hidden') { flush(); if (memory && !corrupt) void scheduleNotices(memory, gameNow()) }
      else void clearNotices()
    }
    void clearNotices()
    window.addEventListener('pagehide', flush)
    document.addEventListener('visibilitychange', onVisibility)
    return () => {
      window.removeEventListener('pagehide', flush)
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [])
  const game = data ? activeCity(data).game : undefined
  function commit(empire: Empire) {
    save(empire, true)
    void mutate(empire, { revalidate: false })
  }
  function command(action: Command) {
    const empire = load()
    const city = activeCity(empire)
    const result = execute(city.game, action, gameNow())
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
    const result = foundColony(load(), islandId, gameNow())
    if (result.error) return result.error
    commit(result.empire)
  }
  function sendCargo(to: string, resource: Cargo, amount: number): string | undefined {
    const result = shipResources(load(), to, resource, amount, gameNow())
    if (result.error) return result.error
    commit(result.empire)
  }
  function spy(npcId: string, count: number): string | undefined {
    const result = dispatchSpies(load(), npcId, count, gameNow())
    if (result.error) return result.error
    commit(result.empire)
  }
  function raid(npcId: string, units: Partial<Record<UnitId, number>>): string | undefined {
    const result = dispatchRaid(load(), npcId, units, gameNow())
    if (result.error) return result.error
    commit(result.empire)
  }
  function piracy(targetId: string, units: Partial<Record<UnitId, number>>): string | undefined {
    const result = dispatchPiracy(load(), targetId, units, gameNow())
    if (result.error) return result.error
    commit(result.empire)
  }
  /** İmparatorluk düzeyinde herhangi bir işlem (diplomasi, pazar, işgal...). */
  function run(op: (e: Empire, now: number) => { empire: Empire; error?: string }): string | undefined {
    const result = op(load(), gameNow())
    if (result.error) return result.error
    commit(result.empire)
  }
  function reset() {
    corrupt = false
    warning = ''
    commit(initialEmpire(gameNow()))
  }
  function exportSave() {
    return exportStoredEmpire(load())
  }
  function importSave(raw: string): string | undefined {
    try {
      const empire = importStoredEmpire(localStorage, raw)
      memory = empire
      corrupt = false
      hydrated = true
      warning = ''
      void mutate(empire, { revalidate: false })
    } catch (error) {
      return error instanceof Error ? error.message : 'Yedek dosyası okunamadı.'
    }
  }
  return { game, empire: data, command, selectCity, colonize, sendCargo, spy, raid, piracy, run, reset, exportSave, importSave, warning }
}
