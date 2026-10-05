'use client'
import { useId, useState } from 'react'
import { asset, buildingImage } from '@/lib/asset'
import { population, soldiers } from '@/lib/game/engine'
import { capitalId, islandOf, type Empire } from '@/lib/game/empire'
import { BANNERS, BANNER_NAMES, COLOR_NAMES, CREST_COLORS, CREST_NAMES, CRESTS, TITLES, achievements, allianceName, playerScore, profileOf, profileRanks, profileStats, rulerTitle, setProfile, type MedalTier } from '@/lib/game/profile'
import { RulerCrest, SancakArt, Medal } from './profile-panel'
import { AtlasArt } from './deep-art'
import { Award, Castle, Crown, Flag, BookOpen, Hammer, Coins, Ship, Swords, ShieldCheck, Settings, ScrollText, Check, ChevronRight } from './ui-art'
import { GameButton } from './game-button'
import { CourtBook, CourtProgress, CourtTabs } from './court-kit'
import { lowMotion } from '@/lib/motion'
import type { Run } from './world-panels'

const TABS = [{ id: 'reign', label: 'Profil', Icon: Crown }, { id: 'cities', label: 'Şehirler', Icon: Castle }, { id: 'medals', label: 'Nişanlar', Icon: Award }] as const
type Tab = typeof TABS[number]['id']
const TIERS: Record<MedalTier, string> = { 1: 'Tunç', 2: 'Gümüş', 3: 'Altın' }
const num = (value: number) => Math.floor(value).toLocaleString('tr-TR')

export function SovereignPage({ empire, now, run, onCity, onSettings, onChangelog }: { empire: Empire; now: number; run: Run; onCity: (id: string) => void; onSettings: () => void; onChangelog: () => void }) {
  const [tab, setTab] = useState<Tab>('reign'), [choice, setChoice] = useState<'shape' | 'crest' | 'color'>('shape'), [wonOnly, setWonOnly] = useState(false)
  const p = profileOf(empire), score = playerScore(empire), title = rulerTitle(score.total), ranks = profileRanks(empire, now), stats = profileStats(empire), list = achievements(empire)
  const [draft, setDraft] = useState({ ruler: p.ruler, motto: p.motto, crest: p.crest, color: p.color, banner: p.banner ?? 'kirlangic' })
  const id = useId(), days = Math.max(1, Math.ceil((now - p.since) / 86_400_000)), won = list.filter(a => a.value >= a.goal).sort((a, b) => b.tier - a.tier)
  const nameValid = draft.ruler.trim().replace(/\s+/g, ' ').length >= 2
  const nextMedal = list.filter(a => a.value < a.goal).sort((a, b) => b.value / b.goal - a.value / a.goal)[0]
  const alliance = allianceName(empire) ?? 'İttifaksız'
  const ledger = [
    { name: 'Toplam puan', value: score.total, rank: ranks.total, Icon: Crown }, { name: 'İnşaatçı', value: score.builder, rank: ranks.builder, Icon: Hammer },
    { name: 'Askerî', value: score.military, rank: ranks.military, Icon: Swords }, { name: 'Saldırı', value: score.offense, rank: ranks.offense, Icon: Swords },
    { name: 'Savunma', value: score.defense, rank: ranks.defense, Icon: ShieldCheck }, { name: 'Bilim', value: score.science, rank: ranks.science, Icon: BookOpen },
    { name: 'Hazine', value: score.gold, rank: ranks.gold, Icon: Coins }, { name: 'Ticaret', value: score.trade, rank: ranks.trade, Icon: Ship },
  ]
  const records: [string, number][] = [['Şehir', stats.cities], ['Nüfus', stats.population], ['Asker ve tayfa', stats.soldiers], ['Bina seviyesi', stats.levels], ['Araştırma', stats.research], ['Kurulan yapı', stats.builds], ['Eğitilen birlik', stats.trained], ['Bağış (kereste)', stats.donated], ['Kazanılan savaş', stats.won], ['Kaybedilen savaş', stats.lost], ['Sefer yağması', stats.raids], ['Casus görevi', stats.spies], ['Korsan şöhreti', stats.fame], ['Nakliye', stats.shipments]]
  function saveIdentity(event: React.FormEvent) {
    event.preventDefault()
    if (!nameValid) return
    run((e, time) => setProfile(e, draft, time), 'Profil kaydedildi.')
  }

  return <div className="court-page sovereign-page sovereign-profile-v2">
    {tab === 'reign' && <>
      <section className="profile-v2-hero">
        <img className="profile-v2-scenery" src={asset('/images/game/terrain/royal-court.webp')} alt="" width={960} height={480} decoding="async" />
        <div className="profile-v2-portrait" aria-hidden="true"><AtlasArt atlas="rivals" index={0} size={118} /></div>
        <div className="profile-v2-flag" aria-label="Hükümdarın sancağı"><SancakArt crest={draft.crest} color={draft.color} banner={draft.banner} size={108} still={lowMotion()} /></div>
        <div className="profile-v2-identity">
          <span className="profile-v2-title"><Crown aria-hidden="true" />{title.name}</span>
          <h2>{draft.ruler || 'Hükümdar'}</h2>
          <small>{alliance}</small>
          <p>{draft.motto || 'Düsturunu aşağıdaki sancak bölümünden yazabilirsin.'}</p>
        </div>
      </section>
      <div className="profile-v2-stats" aria-label="Hükümdar özeti">
        <span><b>#{ranks.total}</b><small>Sıralama</small></span>
        <button type="button" onClick={() => setTab('cities')}><b>{stats.cities}</b><small>Şehir</small></button>
        <button type="button" onClick={() => setTab('medals')}><b>{won.length}</b><small>Nişan</small></button>
        <span><b>{days}</b><small>Oyun günü</small></span>
      </div>
      <CourtTabs items={TABS} value={tab} onChange={setTab} label="Hükümdar profili bölümleri">
        <form className="profile-v2-banner-editor" onSubmit={saveIdentity}>
          <header className="profile-v2-section-head"><span><Flag painted aria-hidden="true" /></span><div><h3>Sancak Düzenle</h3><p>Adın, düsturun ve sancak görünümün tek yerde.</p></div></header>
          <div className="profile-v2-banner-layout">
            <div className="profile-v2-banner-preview"><SancakArt crest={draft.crest} color={draft.color} banner={draft.banner} size={145} still /><small>{BANNER_NAMES[draft.banner]}</small></div>
            <div className="profile-v2-banner-controls">
              <label htmlFor={`${id}-name`}>Hükümdarın adı</label><input id={`${id}-name`} value={draft.ruler} maxLength={24} required minLength={2} onChange={event => setDraft({ ...draft, ruler: event.target.value })} />
              <label htmlFor={`${id}-motto`}>Düstur</label><input id={`${id}-motto`} value={draft.motto} maxLength={60} placeholder="Devlet-i ebed-müddet" onChange={event => setDraft({ ...draft, motto: event.target.value })} />
            </div>
          </div>
          <div className="court-choice-tabs" aria-label="Sancak ayrıntısı">{(['shape', 'crest', 'color'] as const).map(key => <button type="button" key={key} aria-pressed={choice === key} onClick={() => setChoice(key)}>{key === 'shape' ? 'Biçim' : key === 'crest' ? 'Arma' : 'Renk'}</button>)}</div>
          <p className="court-choice-name">{choice === 'shape' ? BANNER_NAMES[draft.banner] : choice === 'crest' ? CREST_NAMES[draft.crest] : COLOR_NAMES[draft.color as keyof typeof COLOR_NAMES]}</p>
          {choice === 'shape' && <div className="court-banner-options profile-v2-option-grid" role="radiogroup" aria-label="Sancak biçimi">{BANNERS.map(b => <button type="button" role="radio" aria-checked={draft.banner === b} key={b} onClick={() => setDraft({ ...draft, banner: b })}><SancakArt crest={draft.crest} color={draft.color} banner={b} size={92} still /><span>{BANNER_NAMES[b]}</span>{draft.banner === b && <Check aria-hidden="true" />}</button>)}</div>}
          {choice === 'crest' && <div className="court-crest-options profile-v2-option-grid" role="radiogroup" aria-label="Arma">{CRESTS.map(c => <button type="button" role="radio" aria-label={CREST_NAMES[c]} aria-checked={draft.crest === c} key={c} onClick={() => setDraft({ ...draft, crest: c })}><RulerCrest crest={c} color={draft.color} size={44} /><span>{CREST_NAMES[c]}</span>{draft.crest === c && <Check aria-hidden="true" />}</button>)}</div>}
          {choice === 'color' && <div className="court-color-options profile-v2-option-grid" role="radiogroup" aria-label="Renk">{CREST_COLORS.map(c => <button type="button" role="radio" aria-checked={draft.color === c} key={c} onClick={() => setDraft({ ...draft, color: c })}><span style={{ background: c }} aria-hidden="true">{draft.color === c && <Check />}</span><b>{COLOR_NAMES[c]}</b></button>)}</div>}
          <div className="profile-v2-save"><GameButton type="submit" disabled={!nameValid}><Check aria-hidden="true" />Profili ve sancağı kaydet</GameButton>{!nameValid && <small>Ad en az 2 harf olmalı.</small>}</div>
        </form>

        <CourtBook title="Saltanat beratı" detail={`${alliance} · ${new Date(p.since).toLocaleDateString('tr-TR')} tarihinden beri`}>
          <div className="sovereign-title-path" aria-label="Unvan yolu" data-hscroll>{TITLES.map(t => <span key={t.name} className={title.name === t.name ? 'is-current' : score.total >= t.min ? 'is-earned' : ''}><Crown aria-hidden="true" /><b>{t.name}</b><small>{num(t.min)} puan</small></span>)}</div>
          <CourtProgress value={Math.round(title.progress * 100)} need={100} label={`${title.name} unvanı ilerlemesi`} />
          <p className="court-note">{title.next ? `${title.next} unvanına ${num(title.need)} puan kaldı.` : 'En yüksek unvana ulaştın.'}</p>
        </CourtBook>

        {won.length > 0 && <CourtBook title="Rozetler" detail={`${won.length} nişan kazanıldı`}><div className="sovereign-honours profile-v2-honours">{won.slice(0, 4).map(a => <span key={a.id}><Medal id={a.id} tier={a.tier} size={50} /><small>{a.name}</small></span>)}</div><GameButton className="court-wide" variant="outline" onClick={() => setTab('medals')}>Tüm nişanları gör<ChevronRight aria-hidden="true" /></GameButton></CourtBook>}

        <CourtBook title="Hükümdarlar defteri" detail={`Yapay rakiplerle ${ranks.of} hükümdar arasında`}><div className="sovereign-ranks profile-v2-ranks">{ledger.map(({ name, value, rank, Icon }) => <div key={name}><span className="sovereign-rank-icon"><Icon aria-hidden="true" /></span><span><strong>{name}</strong><small>{rank}. sıra / {ranks.of}</small></span><b>{num(value)}</b></div>)}</div></CourtBook>
      </CourtTabs>
    </>}

    {tab !== 'reign' && <CourtTabs items={TABS} value={tab} onChange={setTab} label="Hükümdar profili bölümleri">
      {tab === 'cities' && <>
        <CourtBook title="Hükmündeki topraklar" detail={`${stats.cities} şehir · ${num(stats.population)} nüfus · ${num(stats.soldiers)} asker ve tayfa`}><div className="sovereign-cities">{empire.cities.map(city => <button type="button" key={city.id} className="sovereign-city" onClick={() => onCity(city.id)} aria-label={`${city.name} şehrine git`}><span className="sovereign-city-picture"><img src={asset('/images/game/quests/capital.webp')} alt="" /><img src={buildingImage('divan', city.game.buildings.divan)} alt="" /></span><span className="sovereign-city-copy"><small>{city.id === capitalId(empire) ? 'BAŞKENT' : 'KOLONİ'} · {islandOf(city).name}</small><strong>{city.name}</strong><span>Divanhane {city.game.buildings.divan}. seviye</span><span>{num(population(city.game))} nüfus · {num(soldiers(city.game))} asker</span><b>Şehre git<ChevronRight aria-hidden="true" /></b></span></button>)}</div></CourtBook>
        <CourtBook title="Saltanat sicili" detail="İmparatorluğun gerçek kayıtlarından"><dl className="sovereign-records">{records.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{num(value)}</dd></div>)}</dl></CourtBook>
      </>}
      {tab === 'medals' && <CourtBook title="Nişan hazinesi" detail={`${won.length} / ${list.length} nişan kazanıldı`}>
        <div className="sovereign-medal-tally">{([3, 2, 1] as MedalTier[]).map(tier => <span key={tier}><Medal tier={tier} size={24} /><b>{won.filter(a => a.tier === tier).length}</b><small>{TIERS[tier]}</small></span>)}</div>
        {nextMedal && <div className="sovereign-next-medal"><Medal id={nextMedal.id} tier={nextMedal.tier} earned={false} size={42} /><span><small>SIRADAKİ NİŞAN</small><b>{nextMedal.name}</b><p>{nextMedal.description}</p></span></div>}
        <div className="sovereign-medal-filter"><button type="button" aria-pressed={!wonOnly} onClick={() => setWonOnly(false)}>Bütün nişanlar</button><button type="button" aria-pressed={wonOnly} onClick={() => setWonOnly(true)}>Kazanılanlar · {won.length}</button></div>
        <div className="sovereign-medals">{(wonOnly ? won : [...list].sort((a, b) => Number(b.value >= b.goal) - Number(a.value >= a.goal))).map(a => <article key={a.id} className={`sovereign-medal${a.value >= a.goal ? ' is-earned' : ''}`}><div className="sovereign-medal-face"><Medal id={a.id} tier={a.tier} earned={a.value >= a.goal} size={64} /></div><small>{TIERS[a.tier]} nişan · {a.value >= a.goal ? 'Kazanıldı' : 'Sürüyor'}</small><h4>{a.name}</h4><p>{a.description}</p><CourtProgress value={a.value} need={a.goal} label={a.name} /></article>)}</div>
        {wonOnly && !won.length && <div className="court-empty"><Award aria-hidden="true" /><h4>İlk nişanın seni bekliyor</h4><p>Şehrini büyüttükçe şeref rafın dolacak.</p><GameButton variant="outline" className="court-wide" onClick={() => setWonOnly(false)}>Bütün nişanları göster</GameButton></div>}
      </CourtBook>}
    </CourtTabs>}

    <footer className="court-footer"><GameButton aria-label="Oyun ayarları" variant="outline" onClick={onSettings}><Settings aria-hidden="true" />Ayarları aç</GameButton><GameButton variant="outline" onClick={onChangelog}><ScrollText painted aria-hidden="true" />Sürüm arşivi</GameButton></footer>
  </div>
}
