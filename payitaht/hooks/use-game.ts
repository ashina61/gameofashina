'use client'

import useSWR from 'swr'
import { advance, execute, initialGame, parseSave, type Command, type Game } from '@/lib/game/engine'

export const SAVE_KEY = 'payitaht-adalari-v1'
let memory: Game | null = null
let warning = ''
let corrupt = false

function save(game: Game) {
  memory = game
  if (corrupt) return
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(game)) }
  catch { warning = 'Cihazda kayıt kullanılamıyor. Bu oturumdaki ilerleme, sayfa kapatıldığında kaybolabilir.' }
}
function load() {
  if (!corrupt) {
    try {
      const raw = localStorage.getItem(SAVE_KEY)
      if (raw) memory = parseSave(raw)
    } catch (error) {
      warning = error instanceof Error ? error.message : 'Kayıt okunamadı.'
      corrupt = true
    }
  }
  const game = advance(memory ?? initialGame(Date.now()), Date.now())
  save(game)
  return game
}
export function useGame() {
  const { data, mutate } = useSWR<Game>(SAVE_KEY, load, { refreshInterval: 1000, revalidateOnFocus: true, dedupingInterval: 0 })
  function command(action: Command) {
    const result = execute(load(), action, Date.now())
    save(result.game)
    void mutate(result.game, { revalidate: false })
    return result.error
  }
  function reset() {
    corrupt = false
    warning = ''
    const game = initialGame(Date.now())
    save(game)
    void mutate(game, { revalidate: false })
  }
  return { game: data, command, reset, warning }
}
