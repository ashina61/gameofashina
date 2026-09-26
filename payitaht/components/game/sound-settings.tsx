'use client'

import { useEffect, useState } from 'react'
import { Music, Vibrate, Volume2, Waves } from 'lucide-react'
import { onSoundPrefs, play, setSoundPrefs, soundPrefs, type SoundPrefs } from '@/lib/sfx'

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
