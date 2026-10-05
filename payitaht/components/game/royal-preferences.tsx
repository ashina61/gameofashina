'use client'
import { useEffect, useState } from 'react'
import { onSoundPrefs, play, setSoundPrefs, soundPrefs, type SoundPrefs } from '@/lib/sfx'
import { dayNightEnabled, setDayNight } from '@/lib/game/sky'
import { liteSetting, lowMotionSetting, setLiteSetting, setLowMotion, type LiteSetting } from '@/lib/motion'
import type { Empire } from '@/lib/game/empire'
import type { Run } from './world-panels'
import { PaceSetting } from './ai-panels'
import { ApprovedArt } from './approved-court-art'

function Preference({ name, art, checked, change }: { name: string; art: string; checked: boolean; change: (value: boolean) => void }) {
  return <label className="royal-preference"><ApprovedArt name={art} /><strong>{name}</strong><span className="royal-switch"><input type="checkbox" role="switch" aria-label={name} checked={checked} onChange={e => change(e.target.checked)} /><span aria-hidden="true">{checked ? 'Açık' : 'Kapalı'}</span></span></label>
}
export function RoyalPreferences({ empire, run }: { empire?: Empire; run: Run }) {
  const [sound, setSound] = useState<SoundPrefs>({ music: true, sfx: true, ambient: false, haptics: true })
  const [night, setNight] = useState(true), [motion, setMotion] = useState(false), [lite, setLite] = useState<LiteSetting>('otomatik'), [pace, setPace] = useState(false)
  useEffect(() => { setSound(soundPrefs()); setNight(dayNightEnabled()); setMotion(lowMotionSetting()); setLite(liteSetting()); return onSoundPrefs(setSound) }, [])
  const sounds = [{ key: 'music', name: 'Müzik', art: 'oud' }, { key: 'sfx', name: 'Efekt sesleri', art: 'drum' }, { key: 'ambient', name: 'Ortam sesi', art: 'bell' }, { key: 'haptics', name: 'Titreşim', art: 'vibration' }] as const
  return <div className="royal-preferences"><h3>Ses ve titreşim</h3>{sounds.map(s => <Preference key={s.key} name={s.name} art={s.art} checked={sound[s.key]} change={value => { setSoundPrefs({ [s.key]: value }); if (value && (s.key === 'sfx' || s.key === 'haptics')) play('ok') }} />)}<h3>Görünüm</h3>
    <Preference name="Gece ve gündüz" art="sky" checked={night} change={value => { setDayNight(value); setNight(value) }} />
    <Preference name="Az hareket" art="motion" checked={motion} change={value => { setLowMotion(value); setMotion(value) }} />
    <div className="royal-preference royal-lite"><ApprovedArt name="olive" /><span><strong>Hafif mod</strong><small>Pil ve ısı kullanımını azaltır.</small></span><div role="radiogroup" aria-label="Hafif mod">{([['otomatik', 'Otomatik'], ['acik', 'Açık'], ['kapali', 'Kapalı']] as const).map(([key, name]) => <button type="button" key={key} role="radio" aria-checked={lite === key} onClick={() => { setLiteSetting(key); setLite(key) }}>{name}</button>)}</div></div>
    {empire && <><button type="button" className="royal-preference royal-tempo" aria-expanded={pace} aria-controls="royal-tempo-choices" onClick={() => setPace(!pace)}><ApprovedArt name="tempo" /><span><strong>Dünya temposu</strong><small>Yapay rakiplerin hareket sıklığı.</small></span><b aria-hidden="true">{pace ? '⌄' : '›'}</b></button>{pace && <div id="royal-tempo-choices"><PaceSetting empire={empire} run={run} /></div>}</>}
    <p className="royal-autosave"><ApprovedArt name="seal" /><span role="status">Tercihler otomatik kaydedilir.</span></p>
  </div>
}
