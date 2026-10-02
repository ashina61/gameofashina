'use client'

import { useEffect, useState } from 'react'
import { Moon, Music, Sparkles, Vibrate, Volume2, Waves } from './ui-art'
import { lowMotionSetting, setLowMotion } from '@/lib/motion'
import { onSoundPrefs, play, setSoundPrefs, soundPrefs, type SoundPrefs } from '@/lib/sfx'
import { dayNightEnabled, setDayNight } from '@/lib/game/sky'

/** Ayarlar: efekt sesleri, ortam sesi, titreşim. */
export function SoundSettings() {
  const [p, setP] = useState<SoundPrefs>({ music: true, sfx: true, ambient: false, haptics: true })
  useEffect(() => { setP(soundPrefs()); return onSoundPrefs(setP) }, [])
  const rows: { key: keyof SoundPrefs; label: string; hint: string; icon: typeof Music }[] = [
    { key: 'music', label: 'Müzik', hint: 'Hicaz makamında ud, ney ve darbuka', icon: Music },
    { key: 'sfx', label: 'Efekt sesleri', hint: 'Onay, inşaat, ödül ve savaş anlarında', icon: Volume2 },
    { key: 'ambient', label: 'Ortam sesi', hint: 'Şehirde hafif dalga uğultusu', icon: Waves },
    { key: 'haptics', label: 'Titreşim', hint: 'Önemli anlarda kısa titreşim (Android)', icon: Vibrate },
  ]
  return <div className="sound-settings">{rows.map(r => <label key={r.key} className="toggle-row" htmlFor={`ses-${r.key}`}>
    <r.icon aria-hidden="true" />
    <span><strong>{r.label}</strong><small>{r.hint}</small></span>
    <input id={`ses-${r.key}`} type="checkbox" role="switch" checked={p[r.key]}
      onChange={e => { setSoundPrefs({ [r.key]: e.target.checked }); if (e.target.checked && (r.key === 'sfx' || r.key === 'haptics')) play('ok') }} />
  </label>)}</div>
}

/** Ayarlar: şehirde gerçek saate bağlı gece-gündüz örtüsü. */
export function DayNightSetting() {
  const [on, setOn] = useState(true)
  useEffect(() => { setOn(dayNightEnabled()) }, [])
  return <div className="sound-settings"><label className="toggle-row" htmlFor="gece-gunduz">
    <Moon aria-hidden="true" />
    <span><strong>Gece ve gündüz</strong><small>Şehir gerçek saate göre akşam olur, fenerler yanar. Kapalıyken hep gündüz.</small></span>
    <input id="gece-gunduz" type="checkbox" role="switch" checked={on} onChange={e => { setDayNight(e.target.checked); setOn(e.target.checked) }} />
  </label></div>
}

/** Ayarlar: "Az hareket" — uçan jetonlar, sayarak değişen sayılar, şehirdeki toz ve ışık efektleri kapanır. */
export function MotionSetting() {
  const [on, setOn] = useState(false)
  useEffect(() => { setOn(lowMotionSetting()) }, [])
  return <div className="sound-settings"><label className="toggle-row" htmlFor="az-hareket">
    <Sparkles aria-hidden="true" />
    <span><strong>Az hareket</strong><small>Uçan jetonlar, sayan sayılar, toz ve ışık efektleri kapanır; sonuç hemen görünür. Cihazında "hareketi azalt" açıksa zaten kapalıdır.</small></span>
    <input id="az-hareket" type="checkbox" role="switch" checked={on} onChange={e => { setLowMotion(e.target.checked); setOn(e.target.checked) }} />
  </label></div>
}
