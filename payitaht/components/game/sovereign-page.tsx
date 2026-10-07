'use client'
import { useState } from 'react'
import { asset } from '@/lib/asset'
import type { Empire } from '@/lib/game/empire'
import { TITLES, achievements, playerScore, profileOf, profileStats, rulerTitle, setProfile } from '@/lib/game/profile'
import { Award, Castle, Flag, Settings, ScrollText } from './ui-art'
import { GameButton } from './game-button'
import { CourtTabs } from './court-kit'
import { ApprovedArt, RoyalStandard } from './approved-court-art'
import { RoyalCities, RoyalMedals } from './royal-profile-panels'
import { RoyalWardrobe } from './royal-wardrobe'
import type { Run } from './world-panels'

const TABS = [{ id: 'reign', label: 'Saltanat', Icon: Flag }, { id: 'cities', label: 'Şehirler', Icon: Castle }, { id: 'medals', label: 'Nişanlar', Icon: Award }, { id: 'banner', label: 'Sancak', Icon: Flag }] as const
type Tab = typeof TABS[number]['id']
const num = (value: number) => Math.floor(value).toLocaleString('tr-TR')
export function SovereignPage({ empire, now, run, onCity, onSettings, onChangelog }: { empire: Empire; now: number; run: Run; onCity: (id: string) => void; onSettings: () => void; onChangelog: () => void }) {
  const [tab, setTab] = useState<Tab>('reign')
  const p = profileOf(empire), score = playerScore(empire), title = rulerTitle(score.total), stats = profileStats(empire), list = achievements(empire)
  const [draft, setDraft] = useState({ ruler: p.ruler, motto: p.motto, crest: p.crest, color: p.color, banner: p.banner ?? 'kirlangic' })
  const days = Math.max(1, Math.ceil((now - p.since) / 86_400_000))
  const look = tab === 'banner' ? draft : { ...p, banner: p.banner ?? 'kirlangic' }
  function select(next: Tab) { if (next === 'banner' && tab !== 'banner') setDraft({ ruler: p.ruler, motto: p.motto, crest: p.crest, color: p.color, banner: p.banner ?? 'kirlangic' }); setTab(next) }
  return <div className={`court-page sovereign-page royal-page${tab === 'banner' ? ' is-sancaktar' : ''}`}>
    <div className="royal-profile-scene"><img src={asset('/images/game/ui/profile-v2/scene.webp')} alt="" width={1024} height={492} /><RoyalStandard crest={look.crest} color={look.color} banner={look.banner} /><div className="royal-identity" style={{ '--name-length': (look.ruler || 'Hükümdar').length } as React.CSSProperties}><h2>{look.ruler || 'Hükümdar'}</h2><strong>{title.name}</strong>{look.motto && <p>{look.motto}</p>}</div></div>
    {tab !== 'banner' && <><div className="royal-summary"><span><ApprovedArt name="hourglass" /><span>Saltanat<b>{days} gün</b></span></span><span><ApprovedArt name="city" /><span>Şehir<b>{num(stats.cities)}</b></span></span><span><ApprovedArt name="laurel" /><span>Puan<b style={{ '--total-digits': num(score.total).length } as React.CSSProperties}>{num(score.total)}</b></span></span></div>
    <GameButton className="royal-edit" onClick={() => select('banner')}>Sancağı ve adı düzenle</GameButton></>}
    <CourtTabs items={TABS} value={tab} onChange={select} label="Hükümdarın sarayı" illustrated={false}>
      {tab === 'reign' && <>
        <section className="royal-section profile-title"><h3>Unvan yolu</h3><div className="royal-title-path"><span className="profile-kavuk" aria-hidden="true" /><div><h4>{title.name}{title.next && <> → {title.next}</>}</h4><div className="royal-progress" role="progressbar" aria-label="Unvan ilerlemesi" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(title.progress * 100)}><i style={{ width: `${title.progress * 100}%` }} /><b>{num(score.total)}{title.next && ` / ${num(TITLES.find(t => t.name === title.next)!.min)}`}</b></div><p>{title.next ? `${title.next} için ${num(title.need)} puan` : 'En yüksek unvana ulaştın.'}</p></div></div></section>
        <section className="royal-section profile-ledger"><h3>Saltanat sicili</h3><div className="royal-ledger">{([{ label: 'İnşaat', art: 'construction', value: score.builder }, { label: 'Bilim', art: 'science', value: score.science }, { label: 'Askerî', art: 'military', value: score.military }, { label: 'Ticaret', art: 'trade', value: score.trade }]).map(row => <div key={row.art}><ApprovedArt name={row.art} /><span>{row.label}<b style={{ '--score-digits': num(row.value).length } as React.CSSProperties}>{num(row.value)}</b></span></div>)}</div></section>
        <section className="royal-section profile-honours"><div className="royal-heading"><h3>Şeref rafı</h3><button type="button" onClick={() => select('medals')}>Tüm nişanlar ›</button></div><div className="royal-honours">{['kurucu', 'alim', 'ilk-zafer'].map(key => { const medal = list.find(a => a.id === key)!; const earned = medal.value >= medal.goal; return <button type="button" key={key} className={earned ? undefined : 'profile-unearned'} onClick={() => select('medals')} aria-label={`${medal.name}: ${earned ? 'Kazanıldı' : 'Henüz kazanılmadı'}`}><ApprovedArt name={key} className={earned ? undefined : 'is-locked'} /><span>{medal.name}</span>{!earned && <small>Henüz kazanılmadı</small>}</button> })}</div></section>
      </>}
      {tab === 'cities' && <RoyalCities empire={empire} now={now} onCity={onCity} />}
      {tab === 'medals' && <RoyalMedals empire={empire} />}
      {tab === 'banner' && <RoyalWardrobe value={draft} change={setDraft} cancel={() => setTab('reign')} save={() => { run((e, t) => setProfile(e, draft, t), 'Profil kaydedildi.'); setTab('reign') }} />}
    </CourtTabs>
    {tab !== 'banner' && <footer className="court-footer"><GameButton variant="outline" onClick={onSettings}><Settings aria-hidden="true" />Ayarları aç</GameButton><GameButton variant="outline" onClick={onChangelog}><ScrollText painted aria-hidden="true" />Sürüm arşivi</GameButton></footer>}
  </div>
}
