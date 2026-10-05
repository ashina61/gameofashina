'use client'
import { useId, useState } from 'react'
import { t } from '@/lib/i18n/tr'
import { asset, buildingImage } from '@/lib/asset'
import { population, soldiers } from '@/lib/game/engine'
import { capitalId, islandOf, type Empire } from '@/lib/game/empire'
import { BANNERS, BANNER_NAMES, COLOR_NAMES, CREST_COLORS, CREST_NAMES, CRESTS, TITLES, achievements, playerScore, profileOf, profileRanks, profileStats, rulerTitle, setProfile, type MedalTier } from '@/lib/game/profile'
import { RulerCrest, SancakArt, Medal } from './profile-panel'
import { Award, Castle, Crown, Flag, Settings, ScrollText, Check, ChevronRight } from './ui-art'
import { GameButton } from './game-button'
import { CourtBook, CourtProgress, CourtTabs } from './court-kit'
import { ApprovedArt, RoyalStandard } from './approved-court-art'
import type { Run } from './world-panels'

const TABS = [{ id: 'reign', label: 'Saltanat', Icon: Crown }, { id: 'cities', label: 'Şehirler', Icon: Castle }, { id: 'medals', label: 'Nişanlar', Icon: Award }, { id: 'banner', label: 'Sancak', Icon: Flag }] as const
type Tab = typeof TABS[number]['id']
const TIERS: Record<MedalTier, string> = { 1: 'Tunç', 2: 'Gümüş', 3: 'Altın' }
const num = (value: number) => Math.floor(value).toLocaleString('tr-TR')
export function SovereignPage({ empire, now, run, onCity, onSettings, onChangelog }: { empire: Empire; now: number; run: Run; onCity: (id: string) => void; onSettings: () => void; onChangelog: () => void }) {
  const [tab, setTab] = useState<Tab>('reign'), [choice, setChoice] = useState<'shape' | 'crest' | 'color'>('shape'), [wonOnly, setWonOnly] = useState(false)
  const p = profileOf(empire), score = playerScore(empire), title = rulerTitle(score.total), stats = profileStats(empire), list = achievements(empire)
  const [draft, setDraft] = useState({ ruler: p.ruler, motto: p.motto, crest: p.crest, color: p.color, banner: p.banner ?? 'kirlangic' })
  const id = useId(), days = Math.max(1, Math.ceil((now - p.since) / 86_400_000)), won = list.filter(a => a.value >= a.goal).sort((a, b) => b.tier - a.tier)
  const look = tab === 'banner' ? draft : { ...p, banner: p.banner ?? 'kirlangic' }
  const nameValid = draft.ruler.trim().replace(/\s+/g, ' ').length >= 2
  const nextMedal = list.filter(a => a.value < a.goal).sort((a, b) => b.value / b.goal - a.value / a.goal)[0]
  const ranks = profileRanks(empire, now)
  const ledger = [{ name: 'Toplam', key: 'total' }, { name: 'İnşaat', key: 'builder' }, { name: 'Askerî', key: 'military' }, { name: 'Saldırı', key: 'offense' }, { name: 'Savunma', key: 'defense' }, { name: 'Bilim', key: 'science' }, { name: 'Hazine', key: 'gold' }, { name: 'Ticaret', key: 'trade' }] as const
  const records: [string, number][] = [['Şehir', stats.cities], ['Nüfus', stats.population], ['Asker ve tayfa', stats.soldiers], ['Bina seviyesi', stats.levels], ['Araştırma', stats.research], ['Kurulan yapı', stats.builds], ['Eğitilen birlik', stats.trained], ['Bağış (kereste)', stats.donated], ['Kazanılan savaş', stats.won], ['Kaybedilen savaş', stats.lost], ['Sefer yağması', stats.raids], ['Casus görevi', stats.spies], ['Korsan şöhreti', stats.fame], ['Nakliye', stats.shipments]]
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
      {tab === 'cities' && <>
        <CourtBook title="Hükmündeki topraklar" detail={`${stats.cities} şehir · ${num(stats.population)} nüfus · ${num(stats.soldiers)} asker ve tayfa`}><div className="sovereign-cities">{empire.cities.map(city => <button type="button" key={city.id} className="sovereign-city" onClick={() => onCity(city.id)} aria-label={`${city.name} şehrine git`}><span className="sovereign-city-picture"><img src={asset('/images/game/quests/capital.webp')} alt="" /><img src={buildingImage('divan', city.game.buildings.divan)} alt="" /></span><span className="sovereign-city-copy"><small>{city.id === capitalId(empire) ? 'BAŞKENT' : 'KOLONİ'} · {islandOf(city).name}</small><strong>{city.name}</strong><span>Divanhane {city.game.buildings.divan}. seviye</span><span>{num(population(city.game))} nüfus · {num(soldiers(city.game))} asker</span><b>Şehre git<ChevronRight aria-hidden="true" /></b></span></button>)}</div></CourtBook>
        <CourtBook title="Hükümdarlar defteri" detail={`${ranks.of} yapay hükümdar arasında`}><dl className="sovereign-records">{ledger.map(({ name, key }) => <div key={key}><dt>{name} · {ranks[key]}. sıra</dt><dd>{num(score[key])}</dd></div>)}</dl></CourtBook>
        <CourtBook title="Saltanat sicili" detail="İmparatorluğun gerçek kayıtlarından"><p className="court-note">Toplam sıralama: {profileRanks(empire, now).total}. / {profileRanks(empire, now).of} yapay hükümdar</p><dl className="sovereign-records">{records.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{num(value)}</dd></div>)}</dl></CourtBook>
      </>}
      {tab === 'medals' && <CourtBook title="Nişan hazinesi" detail={`${won.length} / ${list.length} nişan kazanıldı`}>
        <div className="sovereign-medal-tally">{([3, 2, 1] as MedalTier[]).map(t => <span key={t}><Medal tier={t} size={24} /><b>{won.filter(a => a.tier === t).length}</b><small>{TIERS[t]}</small></span>)}</div>
        {nextMedal && <div className="sovereign-next-medal"><Medal id={nextMedal.id} tier={nextMedal.tier} earned={false} size={42} /><span><small>SIRADAKİ NİŞAN</small><b>{nextMedal.name}</b><p>{nextMedal.description}</p></span></div>}
        <div className="sovereign-medal-filter"><button type="button" aria-pressed={!wonOnly} onClick={() => setWonOnly(false)}>Bütün nişanlar</button><button type="button" aria-pressed={wonOnly} onClick={() => setWonOnly(true)}>Kazanılanlar · {won.length}</button></div>
        <div className="sovereign-medals">{(wonOnly ? won : [...list].sort((a, b) => Number(b.value >= b.goal) - Number(a.value >= a.goal))).map(a => <article key={a.id} className={`sovereign-medal${a.value >= a.goal ? ' is-earned' : ''}`}><div className="sovereign-medal-face"><Medal id={a.id} tier={a.tier} earned={a.value >= a.goal} size={64} /></div><small>{TIERS[a.tier]} nişan · {a.value >= a.goal ? 'Kazanıldı' : 'Sürüyor'}</small><h4>{a.name}</h4><p>{a.description}</p><CourtProgress value={a.value} need={a.goal} label={a.name} /></article>)}</div>
        {wonOnly && !won.length && <div className="court-empty"><Award aria-hidden="true" /><h4>İlk nişanın seni bekliyor</h4><p>Şehrini büyüttükçe şeref rafın dolacak.</p><GameButton variant="outline" className="court-wide" onClick={() => setWonOnly(false)}>Bütün nişanları göster</GameButton></div>}
      </CourtBook>}
      {tab === 'banner' && <CourtBook title="Sancaktar odası" detail="Seçimlerin yukarıdaki sancakta hemen görünür"><form className="court-wardrobe" onSubmit={event => { event.preventDefault(); if (!nameValid) return; run((e, t) => setProfile(e, draft, t), 'Profil kaydedildi.'); setTab('reign') }}>
        <label htmlFor={`${id}-name`}>Hükümdarın adı</label><input id={`${id}-name`} value={draft.ruler} maxLength={24} required minLength={2} onChange={event => setDraft({ ...draft, ruler: event.target.value })} />
        <label htmlFor={`${id}-motto`}>Düstur</label><input id={`${id}-motto`} value={draft.motto} maxLength={60} placeholder="Devlet-i ebed-müddet" onChange={event => setDraft({ ...draft, motto: event.target.value })} />
        <div className="court-choice-tabs" aria-label="Sancak ayrıntısı">{(['shape', 'crest', 'color'] as const).map(key => <button type="button" key={key} aria-pressed={choice === key} onClick={() => setChoice(key)}>{key === 'shape' ? 'Biçim' : key === 'crest' ? 'Arma' : 'Renk'}</button>)}</div>
        <p className="court-choice-name">{choice === 'shape' ? BANNER_NAMES[draft.banner] : choice === 'crest' ? CREST_NAMES[draft.crest] : COLOR_NAMES[draft.color as keyof typeof COLOR_NAMES]}</p>
        {choice === 'shape' && <div className="court-banner-options" role="radiogroup" aria-label="Sancak biçimi">{BANNERS.map(b => <button type="button" role="radio" aria-checked={draft.banner === b} key={b} onClick={() => setDraft({ ...draft, banner: b })}><SancakArt crest={draft.crest} color={draft.color} banner={b} size={108} still /><span>{BANNER_NAMES[b]}</span>{draft.banner === b && <Check aria-hidden="true" />}</button>)}</div>}
        {choice === 'crest' && <div className="court-crest-options" role="radiogroup" aria-label="Arma">{CRESTS.map(c => <button type="button" role="radio" aria-label={CREST_NAMES[c]} aria-checked={draft.crest === c} key={c} onClick={() => setDraft({ ...draft, crest: c })}><RulerCrest crest={c} color={draft.color} size={48} /><span>{CREST_NAMES[c]}</span>{draft.crest === c && <Check aria-hidden="true" />}</button>)}</div>}
        {choice === 'color' && <div className="court-color-options" role="radiogroup" aria-label="Renk">{CREST_COLORS.map(c => <button type="button" role="radio" aria-checked={draft.color === c} key={c} onClick={() => setDraft({ ...draft, color: c })}><span style={{ background: c }} aria-hidden="true">{draft.color === c && <Check />}</span><b>{COLOR_NAMES[c]}</b></button>)}</div>}
        <div className="court-signature"><GameButton type="submit" disabled={!nameValid}>Sancağı kaydet</GameButton><GameButton variant="outline" onClick={() => setTab('reign')}>{t.action.cancel}</GameButton>{!nameValid && <small>Ad en az 2 harf olmalı.</small>}</div>
      </form></CourtBook>}
    </CourtTabs>
    <footer className="court-footer"><GameButton variant="outline" onClick={onSettings}><Settings aria-hidden="true" />Ayarları aç</GameButton><GameButton variant="outline" onClick={onChangelog}><ScrollText painted aria-hidden="true" />Sürüm arşivi</GameButton></footer>
  </div>
}
