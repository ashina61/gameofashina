'use client'
import { useId, useState } from 'react'
import { t } from '@/lib/i18n/tr'
import { asset } from '@/lib/asset'
import type { Empire } from '@/lib/game/empire'
import { BANNERS, BANNER_NAMES, COLOR_NAMES, CREST_COLORS, CREST_NAMES, CRESTS, TITLES, achievements, playerScore, profileOf, profileStats, rulerTitle, setProfile } from '@/lib/game/profile'
import { CrestSymbol } from './profile-panel'
import { Award, Castle, Crown, Flag, Settings, ScrollText, Check, ChevronRight } from './ui-art'
import { GameButton } from './game-button'
import { CourtTabs } from './court-kit'
import { ApprovedArt, RoyalStandard } from './approved-court-art'
import { RoyalCities, RoyalMedals } from './royal-profile-panels'
import { RoyalSection } from './royal-kit'
import type { Run } from './world-panels'

const TABS = [{ id: 'reign', label: 'Saltanat', Icon: Crown }, { id: 'cities', label: 'Şehirler', Icon: Castle }, { id: 'medals', label: 'Nişanlar', Icon: Award }, { id: 'banner', label: 'Sancak', Icon: Flag }] as const
type Tab = typeof TABS[number]['id']
const num = (value: number) => Math.floor(value).toLocaleString('tr-TR')
export function SovereignPage({ empire, now, run, onCity, onSettings, onChangelog }: { empire: Empire; now: number; run: Run; onCity: (id: string) => void; onSettings: () => void; onChangelog: () => void }) {
  const [tab, setTab] = useState<Tab>('reign'), [choice, setChoice] = useState<'shape' | 'crest' | 'color'>('shape')
  const p = profileOf(empire), score = playerScore(empire), title = rulerTitle(score.total), stats = profileStats(empire), list = achievements(empire)
  const [draft, setDraft] = useState({ ruler: p.ruler, motto: p.motto, crest: p.crest, color: p.color, banner: p.banner ?? 'kirlangic' })
  const id = useId(), days = Math.max(1, Math.ceil((now - p.since) / 86_400_000))
  const look = tab === 'banner' ? draft : { ...p, banner: p.banner ?? 'kirlangic' }
  const nameValid = draft.ruler.trim().replace(/\s+/g, ' ').length >= 2
  function select(next: Tab) { if (next === 'banner' && tab !== 'banner') setDraft({ ruler: p.ruler, motto: p.motto, crest: p.crest, color: p.color, banner: p.banner ?? 'kirlangic' }); setTab(next) }
  return <div className="court-page sovereign-page royal-page">
    <div className="royal-profile-scene"><img src={asset('/images/game/ui/approved-court/profile-scene.webp')} alt="" width={1024} height={492} /><RoyalStandard crest={look.crest} color={look.color} banner={look.banner} /><div className="royal-identity"><h2>{look.ruler || 'Hükümdar'}</h2><strong>{title.name}</strong>{look.motto && <p>{look.motto}</p>}</div></div>
    <div className="royal-summary"><span><ApprovedArt name="hourglass" /><span>Saltanat<b>{days} gün</b></span></span><span><ApprovedArt name="city" /><span>Şehir<b>{num(stats.cities)}</b></span></span><span><ApprovedArt name="laurel" /><span>Puan<b>{num(score.total)}</b></span></span></div>
    <GameButton className="royal-edit" onClick={() => select('banner')}>✒ Sancağı ve adı düzenle<ChevronRight aria-hidden="true" /></GameButton>
    <CourtTabs items={TABS} value={tab} onChange={select} label="Hükümdarın sarayı">
      {tab === 'reign' && <>
        <section className="royal-section"><h3>Unvan yolu</h3><div className="royal-title-path"><ApprovedArt name="crown" /><div><h4>{title.name}{title.next && <> → {title.next}</>}</h4><div className="royal-progress" role="progressbar" aria-label="Unvan ilerlemesi" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(title.progress * 100)}><i style={{ width: `${title.progress * 100}%` }} /><b>{num(score.total)}{title.next && ` / ${num(TITLES.find(t => t.name === title.next)!.min)}`}</b></div><p>{title.next ? `${title.next} için ${num(title.need)} puan` : 'En yüksek unvana ulaştın.'}</p></div></div></section>
        <section className="royal-section"><h3>Saltanat sicili</h3><div className="royal-ledger">{([{ label: 'İnşaat', art: 'construction', value: score.builder }, { label: 'Bilim', art: 'science', value: score.science }, { label: 'Askerî', art: 'military', value: score.military }, { label: 'Ticaret', art: 'trade', value: score.trade }]).map(row => <div key={row.art}><ApprovedArt name={row.art} /><span>{row.label}<b>{num(row.value)}</b></span></div>)}</div></section>
        <section className="royal-section"><div className="royal-heading"><h3>Şeref rafı</h3><button type="button" onClick={() => select('medals')}>Tüm nişanlar ›</button></div><div className="royal-honours">{['kurucu', 'alim', 'ilk-zafer'].map(key => { const medal = list.find(a => a.id === key)!; const earned = medal.value >= medal.goal; return <button type="button" key={key} onClick={() => select('medals')} aria-label={`${medal.name}: ${earned ? 'Kazanıldı' : 'Henüz kazanılmadı'}`}><ApprovedArt name={key} className={earned ? undefined : 'is-locked'} /><span>{medal.name}</span>{!earned && <small>Henüz kazanılmadı</small>}</button> })}</div></section>
      </>}
      {tab === 'cities' && <RoyalCities empire={empire} now={now} onCity={onCity} />}
      {tab === 'medals' && <RoyalMedals empire={empire} />}
      {tab === 'banner' && <RoyalSection title="Sancaktar odası" detail="Adını, düsturunu ve şahsi sancağını belirle." art="tempo"><form className="court-wardrobe royal-wardrobe" onSubmit={event => { event.preventDefault(); if (!nameValid) return; run((e, t) => setProfile(e, draft, t), 'Profil kaydedildi.'); setTab('reign') }}>
        <label htmlFor={`${id}-name`}>Hükümdarın adı</label><input id={`${id}-name`} value={draft.ruler} aria-invalid={!nameValid} maxLength={24} required minLength={2} onChange={event => setDraft({ ...draft, ruler: event.target.value })} />
        <label htmlFor={`${id}-motto`}>Düstur</label><input id={`${id}-motto`} value={draft.motto} maxLength={60} placeholder="Devlet-i ebed-müddet" onChange={event => setDraft({ ...draft, motto: event.target.value })} />
        <div className="court-choice-tabs" aria-label="Sancak ayrıntısı">{(['shape', 'crest', 'color'] as const).map(key => <button type="button" key={key} aria-pressed={choice === key} onClick={() => setChoice(key)}>{key === 'shape' ? 'Biçim' : key === 'crest' ? 'Arma' : 'Renk'}</button>)}</div>
        <p className="court-choice-name">{choice === 'shape' ? BANNER_NAMES[draft.banner] : choice === 'crest' ? CREST_NAMES[draft.crest] : COLOR_NAMES[draft.color as keyof typeof COLOR_NAMES]}</p>
        {choice === 'shape' && <div className="court-banner-options" role="radiogroup" aria-label="Sancak biçimi">{BANNERS.map(b => <button type="button" role="radio" aria-label={BANNER_NAMES[b]} aria-checked={draft.banner === b} key={b} onClick={() => setDraft({ ...draft, banner: b })}><div className="royal-standard-option" aria-hidden="true"><RoyalStandard crest={draft.crest} color={draft.color} banner={b} /></div><span>{BANNER_NAMES[b]}</span>{draft.banner === b && <Check aria-hidden="true" />}</button>)}</div>}
        {choice === 'crest' && <div className="court-crest-options" role="radiogroup" aria-label="Arma">{CRESTS.map(c => <button type="button" role="radio" aria-label={CREST_NAMES[c]} aria-checked={draft.crest === c} key={c} onClick={() => setDraft({ ...draft, crest: c })}><span className="royal-crest-coin"><svg viewBox="14 14 38 38" aria-hidden="true"><CrestSymbol crest={c} /></svg></span><span>{CREST_NAMES[c]}</span>{draft.crest === c && <Check aria-hidden="true" />}</button>)}</div>}
        {choice === 'color' && <div className="court-color-options" role="radiogroup" aria-label="Renk">{CREST_COLORS.map(c => <button type="button" role="radio" aria-label={COLOR_NAMES[c]} aria-checked={draft.color === c} key={c} onClick={() => setDraft({ ...draft, color: c })}><div className="royal-standard-option" aria-hidden="true"><RoyalStandard crest={draft.crest} color={c} banner={draft.banner} /></div><b>{COLOR_NAMES[c]}</b></button>)}</div>}
        <div className="court-signature"><GameButton type="submit" disabled={!nameValid}>Sancağı kaydet</GameButton><GameButton variant="outline" onClick={() => setTab('reign')}>{t.action.cancel}</GameButton>{!nameValid && <small>Ad en az 2 harf olmalı.</small>}</div>
      </form></RoyalSection>}
    </CourtTabs>
    <footer className="court-footer"><GameButton variant="outline" onClick={onSettings}><Settings aria-hidden="true" />Ayarları aç</GameButton><GameButton variant="outline" onClick={onChangelog}><ScrollText painted aria-hidden="true" />Sürüm arşivi</GameButton></footer>
  </div>
}
