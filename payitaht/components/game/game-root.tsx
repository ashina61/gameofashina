'use client'

import { useEffect, useState } from 'react'
import { wantMusic, wireUiSounds } from '@/lib/sfx'
import GameShell from './game-shell'
import { TitleScreen } from './title-screen'

/** Önce giriş ekranı, sonra oyun; ayarlardan giriş ekranına dönülebilir. */
export function GameRoot() {
  const [started, setStarted] = useState(false)
  // Müzik giriş ekranında da çalar (ilk dokunuşta başlar).
  useEffect(() => { wireUiSounds(); wantMusic(true); return () => wantMusic(false) }, [])
  return started ? <GameShell onTitle={() => setStarted(false)} /> : <TitleScreen onStart={() => setStarted(true)} />
}
