'use client'

import { useId, useState } from 'react'
import { t } from '@/lib/i18n/tr'
import { asset } from '@/lib/asset'
import type { Empire } from '@/lib/game/empire'
import { allianceName, playerScore, profileOf, profileRanks, rulerTitle, setProfile } from '@/lib/game/profile'
import { AdvisorPortrait } from './advisor-portraits'
import { RulerCrest, SancakArt } from './profile-panel'
import { CalendarCheck, Crown, Pencil, Trophy, Users } from './ui-art'
import type { Run } from './world-panels'

type Props = {
  empire: Empire
  now: number
  run: Run
  onCity: (id: string) => void
  onSettings: () => void
  onChangelog: () => void
}

const num = (value: number) => Math.floor(value).toLocaleString('tr-TR')

export function SovereignPage(props: Props) {
  const { empire, now, run } = props
  const p = profileOf(empire)
  const score = playerScore(empire)
  const title = rulerTitle(score.total)
  const ranks = profileRanks(empire, now)
  const alliance = allianceName(empire) ?? 'İttifaksız'
  const [editIdentity, setEditIdentity] = useState(false)
  const [draft, setDraft] = useState({ ruler: p.ruler, motto: p.motto, crest: p.crest, color: p.color, banner: p.banner ?? 'kirlangic' })
  const id = useId()
  const days = Math.max(1, Math.ceil((now - p.since) / 86_400_000))
  const nameValid = draft.ruler.trim().replace(/\s+/g, ' ').length >= 2

  function saveIdentity(event: React.FormEvent) {
    event.preventDefault()
    if (!nameValid) return
    run((e, time) => setProfile(e, draft, time), 'Profil kaydedildi.')
    setEditIdentity(false)
  }

  return <div className="profile-reference-checkpoint">
    <section className="profile-ref-hero" style={{ backgroundImage: `url(${asset('/images/game/terrain/title-background.webp')})` }}>
      <div className="profile-ref-card">
        <div className="profile-ref-avatar-wrap">
          <div className="profile-ref-avatar"><AdvisorPortrait id="city" size={132} /></div>
          <div className="profile-ref-crest"><RulerCrest crest={draft.crest} color={draft.color} size={42} /></div>
        </div>

        <div className="profile-ref-identity">
          <div className="profile-ref-flag" aria-hidden="true"><SancakArt crest={draft.crest} color={draft.color} banner={draft.banner} size={86} still /></div>
          {editIdentity ? <form className="profile-ref-edit" onSubmit={saveIdentity}>
            <label htmlFor={`${id}-name`}>Hükümdarın adı</label>
            <input id={`${id}-name`} value={draft.ruler} maxLength={24} onChange={event => setDraft({ ...draft, ruler: event.target.value })} />
            <label htmlFor={`${id}-motto`}>Düstur</label>
            <textarea id={`${id}-motto`} value={draft.motto} maxLength={60} onChange={event => setDraft({ ...draft, motto: event.target.value })} />
            <div><button type="submit" disabled={!nameValid}>Kaydet</button><button type="button" onClick={() => setEditIdentity(false)}>{t.action.cancel}</button></div>
          </form> : <>
            <div className="profile-ref-name-row"><h2>{draft.ruler || 'Hükümdar'}</h2><button type="button" aria-label="Profili düzenle" onClick={() => setEditIdentity(true)}><Pencil /></button></div>
            <span className="profile-ref-id">#{ranks.total}</span>
            <div className="profile-ref-title"><Crown /><span>{title.name}</span></div>
            <div className="profile-ref-motto"><span>{draft.motto || 'Adalarda yükselen her şehir, daha güçlü bir yarının temelidir.'}</span><button type="button" aria-label="Düsturu düzenle" onClick={() => setEditIdentity(true)}><Pencil /></button></div>
          </>}
        </div>
      </div>
    </section>

    <section className="profile-ref-stats" aria-label="Hükümdar özeti">
      <div><Trophy /><strong>{num(ranks.total)}</strong><span>Sıralama</span></div>
      <div><Crown /><strong>#{num(ranks.builder)}</strong><span>Kıta Sıralaması</span></div>
      <div><Users /><strong>{alliance}</strong><span>İttifak</span></div>
      <div><CalendarCheck /><strong>{num(days)}</strong><span>Oyun Günü</span></div>
    </section>
  </div>
}
