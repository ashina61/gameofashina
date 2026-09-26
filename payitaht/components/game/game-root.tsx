'use client'

import { useState } from 'react'
import GameShell from './game-shell'
import { TitleScreen } from './title-screen'

/** Önce giriş ekranı, sonra oyun; ayarlardan giriş ekranına dönülebilir. */
export function GameRoot() {
  const [started, setStarted] = useState(false)
  return started ? <GameShell onTitle={() => setStarted(false)} /> : <TitleScreen onStart={() => setStarted(true)} />
}
