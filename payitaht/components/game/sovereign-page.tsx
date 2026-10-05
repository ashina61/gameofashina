'use client'

import { useId, useState } from 'react'
import { t } from '@/lib/i18n/tr'
import { population, soldiers } from '@/lib/game/engine'
import { capitalId, islandOf, type Empire } from '@/lib/game/empire'
import { achievements, allianceName, playerScore, profileOf, profileRanks, profileStats, rulerTitle, setProfile, type MedalTier } from '@/lib/game/profile'
import { AdvisorPortrait } from './advisor-portraits'
import { Medal } from './profile-panel'
import { Award, CalendarCheck, Castle, ChevronRight, Crown, Pencil, Trophy, Users } from './ui-art'
import { GameButton } from './game-button'
import { CourtBook, CourtProgress } from './court-kit'
import { ReferenceShell } from './reference-shell'
import type { Run } from './world-panels'

const TIERS: Record<MedalTier, string> = { 1: 'Tunç', 2: 'Gümüş', 3: 'Altın' }
const num = (value: number) => Math.floor(value).toLocaleString('tr-TR')
type Tab = 'reign' | 'cities' | 'medals'

type Props = {
  empire: Empire
  now: number
  run: Run
  onCity: (id: string) => void
  onSettings: () => void
  onChangelog: () => void
}

function SectionTitle({ children, onAll }: { children: React.ReactNode; onAll?: () => void }) {
  return <header className="ref-os-section-title"><h3>{children}</h3>{onAll && <button type="button" onClick={onAll}>Tümünü Gör <ChevronRight /></button>}</header>
}

export function SovereignPage(props: Props) {
  const { empire, now, run, onCity, onSettings } = props
  const [tab, setTab] = useState<Tab>('reign')
  const [wonOnly, setWonOnly] = useState(false)
  const [editIdentity, setEditIdentity] = useState(false)
  const p = profileOf(empire)
  const score = playerScore(empire)
  const title = rulerTitle(score.total)
  const ranks = profileRanks(empire, now)
  const stats = profileStats(empire)
  const list = achievements(empire)
  const [draft, setDraft] = useState({ ruler: p.ruler, motto: p.motto, crest: p.crest, color: p.color, banner: p.banner ?? 'kirlangic' })
  const id = useId()
  const days = Math.max(1, Math.ceil((now - p.since) / 86_400_000))
  const won = list.filter(a => a.value >= a.goal).sort((a, b) => b.tier - a.tier)
  const nameValid = draft.ruler.trim().replace(/\s+/g, ' ').length >= 2
  const alliance = allianceName(empire) ?? 'İttifaksız'
  const badges = (won.length >= 5 ? won : list).slice(0, 5)
  const featured = [...list].sort((a, b) => (b.value / Math.max(1, b.goal)) - (a.value / Math.max(1, a.goal))).slice(0, 3)
  const records: [string, number][] = [['Şehir', stats.cities], ['Nüfus', stats.population], ['Asker ve tayfa', stats.soldiers], ['Bina seviyesi', stats.levels], ['Araştırma', stats.research], ['Kurulan yapı', stats.builds], ['Eğitilen birlik', stats.trained], ['Kazanılan savaş', stats.won], ['Kaybedilen savaş', stats.lost]]

  function saveIdentity(event: React.FormEvent) {
    event.preventDefault()
    if (!nameValid) return
    run((e, time) => setProfile(e, draft, time), 'Profil kaydedildi.')
    setEditIdentity(false)
  }

  const shell = (children: React.ReactNode) => <ReferenceShell empire={empire} active="profile" onCity={() => onCity(empire.activeCityId)} onProfile={() => setTab('reign')} onSettings={onSettings}>{children}</ReferenceShell>

  if (tab === 'cities') return shell(<div className="ref-os-page ref-os-secondary-page">
    <header className="ref-os-page-title"><span>✦</span><h1>Şehirler</h1></header>
    <div className="ref-profile-mini-nav"><button type="button" onClick={() => setTab('reign')}><Crown />Profil</button><button type="button" aria-current="page"><Castle />Şehirler</button><button type="button" onClick={() => setTab('medals')}><Award />Rozetler</button></div>
    <CourtBook title="Hükmündeki topraklar" detail={`${stats.cities} şehir · ${num(stats.population)} nüfus · ${num(stats.soldiers)} asker ve tayfa`}>
      <div className="sovereign-cities">{empire.cities.map(city => <button type="button" key={city.id} className="sovereign-city" onClick={() => onCity(city.id)}><span className="sovereign-city-copy"><small>{city.id === capitalId(empire) ? 'BAŞKENT' : 'KOLONİ'} · {islandOf(city).name}</small><strong>{city.name}</strong><span>Divanhane {city.game.buildings.divan}. seviye</span><span>{num(population(city.game))} nüfus · {num(soldiers(city.game))} asker</span><b>Şehre git <ChevronRight /></b></span></button>)}</div>
    </CourtBook>
    <CourtBook title="Saltanat sicili" detail="İmparatorluğun gerçek kayıtlarından"><dl className="sovereign-records">{records.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{num(value)}</dd></div>)}</dl></CourtBook>
  </div>)

  if (tab === 'medals') return shell(<div className="ref-os-page ref-os-secondary-page">
    <header className="ref-os-page-title"><span>✦</span><h1>Rozetler</h1></header>
    <div className="ref-profile-mini-nav"><button type="button" onClick={() => setTab('reign')}><Crown />Profil</button><button type="button" onClick={() => setTab('cities')}><Castle />Şehirler</button><button type="button" aria-current="page"><Award />Rozetler</button></div>
    <CourtBook title="Nişan hazinesi" detail={`${won.length} / ${list.length} nişan kazanıldı`}>
      <div className="sovereign-medal-tally">{([3, 2, 1] as MedalTier[]).map(tier => <span key={tier}><Medal tier={tier} size={30} /><b>{won.filter(a => a.tier === tier).length}</b><small>{TIERS[tier]}</small></span>)}</div>
      <div className="sovereign-medal-filter"><button type="button" aria-pressed={!wonOnly} onClick={() => setWonOnly(false)}>Bütün nişanlar</button><button type="button" aria-pressed={wonOnly} onClick={() => setWonOnly(true)}>Kazanılanlar · {won.length}</button></div>
      <div className="sovereign-medals">{(wonOnly ? won : list).map(a => <article key={a.id} className={`sovereign-medal${a.value >= a.goal ? ' is-earned' : ''}`}><Medal id={a.id} tier={a.tier} earned={a.value >= a.goal} size={58} /><small>{TIERS[a.tier]} · {a.value >= a.goal ? 'Kazanıldı' : 'Sürüyor'}</small><h4>{a.name}</h4><p>{a.description}</p><CourtProgress value={a.value} need={a.goal} label={a.name} /></article>)}</div>
      {wonOnly && !won.length && <div className="court-empty"><Award /><h4>İlk nişanın seni bekliyor</h4><GameButton variant="outline" onClick={() => setWonOnly(false)}>Bütün nişanları göster</GameButton></div>}
    </CourtBook>
  </div>)

  return shell(<div className="ref-os-page ref-profile-screen">
    <header className="ref-os-page-title"><span>✦</span><h1>Profil</h1></header>

    <section className="ref-profile-reference-summary">
      <div className="ref-profile-reference-avatar"><AdvisorPortrait id="city" size={126} /><button type="button" className="ref-camera" aria-label="Profil fotoğrafını değiştir">◉</button></div>
      <div className="ref-profile-reference-copy">
        {editIdentity ? <form className="ref-identity-edit" onSubmit={saveIdentity}>
          <label htmlFor={`${id}-name`}>Hükümdarın adı</label><input id={`${id}-name`} value={draft.ruler} maxLength={24} onChange={event => setDraft({ ...draft, ruler: event.target.value })} />
          <label htmlFor={`${id}-motto`}>Düstur</label><textarea id={`${id}-motto`} value={draft.motto} maxLength={60} onChange={event => setDraft({ ...draft, motto: event.target.value })} />
          <div><button type="submit" disabled={!nameValid}>Kaydet</button><button type="button" onClick={() => setEditIdentity(false)}>{t.action.cancel}</button></div>
        </form> : <>
          <h2>{draft.ruler || 'Hükümdar'} <button type="button" aria-label="Profili düzenle" onClick={() => setEditIdentity(true)}><Pencil /></button></h2>
          <small>#{ranks.total}</small>
          <div className="ref-profile-reference-ribbon"><Crown />{title.name}</div>
          <p>{draft.motto || 'Adalarda yükselen her şehir, daha güçlü bir yarının temelidir.'}<button type="button" aria-label="Düsturu düzenle" onClick={() => setEditIdentity(true)}><Pencil /></button></p>
        </>}
      </div>
    </section>

    <section className="ref-profile-reference-stats" aria-label="Hükümdar özeti">
      <span><Trophy /><b>{num(ranks.total)}</b><small>Sıralama</small></span>
      <span><Crown /><b>#{num(ranks.builder)}</b><small>Kıta Sıralaması</small></span>
      <span><Users /><b>{alliance}</b><small>İttifak</small></span>
      <span><CalendarCheck /><b>{num(days)}</b><small>Oyun Günü</small></span>
    </section>

    <section className="ref-profile-reference-section">
      <SectionTitle onAll={() => setTab('medals')}>✥ Rozetler</SectionTitle>
      <div className="ref-profile-reference-badges">{badges.map(a => <button type="button" key={a.id} onClick={() => setTab('medals')}><Medal id={a.id} tier={a.tier} earned={a.value >= a.goal} size={58} /><span>{a.name}</span></button>)}</div>
    </section>

    <section className="ref-profile-reference-section ref-achievements">
      <SectionTitle onAll={() => setTab('medals')}>♜ Başarılar</SectionTitle>
      <div className="ref-achievement-list">{featured.map(a => {
        const pct = Math.min(100, Math.max(0, a.value / Math.max(1, a.goal) * 100))
        return <button type="button" key={a.id} className="ref-achievement-row" onClick={() => setTab('medals')}>
          <span className="ref-achievement-medal"><Medal id={a.id} tier={a.tier} earned={a.value >= a.goal} size={48} /></span>
          <span className="ref-achievement-copy"><b>{a.name}</b><small>{a.description}</small><i><em style={{ width: `${pct}%` }} /></i></span>
          <strong>{num(a.value)} / {num(a.goal)}</strong><ChevronRight />
        </button>
      })}</div>
    </section>
  </div>)
}
