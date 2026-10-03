'use client'

import { useEffect, useState } from 'react'
import { Bell, Moon, Music, Sparkles, Vibrate, Volume2, Waves } from './ui-art'
import { GameButton } from './game-button'
import { DEFAULT_NOTICE_PREFS, NOTICE_KINDS, NOTICE_NAMES, type NoticePrefs } from '@/lib/game/notices'
import { ensurePermission, noticePrefs, notificationPermission, onNoticePrefs, setNoticePrefs } from '@/lib/notify'
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

/** Ayarlar (Android): telefon bildirimleri, tür tür açılıp kapanır (V2 Faz 5.5). */
export function NoticeSettings() {
  const [p, setP] = useState<NoticePrefs>(DEFAULT_NOTICE_PREFS)
  const [perm, setPerm] = useState<'granted' | 'denied' | 'prompt' | 'none'>('none')
  useEffect(() => { setP(noticePrefs()); void notificationPermission().then(setPerm); return onNoticePrefs(next => { setP(next); void notificationPermission().then(setPerm) }) }, [])
  return <>
    <div className="sound-settings">{NOTICE_KINDS.map(k => <label key={k} className="toggle-row" htmlFor={`bildirim-${k}`}>
      <Bell aria-hidden="true" />
      <span><strong>{NOTICE_NAMES[k].name}</strong><small>{NOTICE_NAMES[k].hint}</small></span>
      <input id={`bildirim-${k}`} type="checkbox" role="switch" checked={p[k]} onChange={e => setNoticePrefs({ [k]: e.target.checked })} />
    </label>)}</div>
    {perm === 'denied' && <p className="fine-print">Bildirim izni kapalı. Telefonun Ayarlar → Uygulamalar → Payitaht Adaları → Bildirimler bölümünden açabilirsin.</p>}
    {perm === 'prompt' && <GameButton size="sm" variant="outline" onClick={() => void ensurePermission().then(ok => setPerm(ok ? 'granted' : 'denied'))}><Bell data-icon="inline-start" />Bildirim izni ver</GameButton>}
  </>
}
