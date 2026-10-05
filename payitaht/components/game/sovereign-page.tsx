'use client'
import { useId, useState } from 'react'
import { asset, buildingImage } from '@/lib/asset'
import { population, soldiers } from '@/lib/game/engine'
import { capitalId, islandOf, type Empire } from '@/lib/game/empire'
import { BANNERS, BANNER_NAMES, COLOR_NAMES, CREST_COLORS, CREST_NAMES, CRESTS, TITLES, achievements, allianceName, playerScore, profileOf, profileRanks, profileStats, rulerTitle, setProfile, type MedalTier } from '@/lib/game/profile'
import { RulerCrest, SancakArt, Medal } from './profile-panel'
import { AdvisorPortrait } from './advisor-portraits'
import { Award, Castle, Crown, Flag, BookOpen, Hammer, Coins, Ship, Swords, ShieldCheck, Settings, ScrollText, Check, ChevronRight, Pencil, Trophy, Users, CalendarCheck } from './ui-art'
import { GameButton } from './game-button'
import { CourtBook, CourtProgress } from './court-kit'
import type { Run } from './world-panels'

const TIERS: Record<MedalTier, string> = { 1: 'Tunç', 2: 'Gümüş', 3: 'Altın' }
const num = (value: number) => Math.floor(value).toLocaleString('tr-TR')
type Tab = 'reign' | 'cities' | 'medals'

function HangingBanner({ crest, color, banner }: { crest: Parameters<typeof RulerCrest>[0]['crest']; color: string; banner: string }) {
  return <span className={`ref-hanging-banner banner-${banner}`} aria-hidden="true">
    <i className="ref-banner-finial" />
    <i className="ref-banner-crossbar" />
    <i className="ref-banner-pole" />
    <span className="ref-banner-cloth" style={{ backgroundColor: color }}><RulerCrest crest={crest} color={color} size={38} /></span>
    <i className="ref-banner-tassel left" /><i className="ref-banner-tassel right" />
  </span>
}

export function SovereignPage({ empire, now, run, onCity, onSettings, onChangelog }: { empire: Empire; now: number; run: Run; onCity: (id: string) => void; onSettings: () => void; onChangelog: () => void }) {
  const [tab, setTab] = useState<Tab>('reign'), [wonOnly, setWonOnly] = useState(false), [editIdentity, setEditIdentity] = useState(false)
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
    setEditIdentity(false)
  }

  if (tab === 'cities') return <div className="court-page sovereign-page sovereign-profile-v2 ref-profile-secondary">
    <nav className="ref-profile-mini-nav" aria-label="Hükümdar profili bölümleri"><button onClick={() => setTab('reign')}><Crown />Profil</button><button aria-current="page"><Castle />Şehirler</button><button onClick={() => setTab('medals')}><Award />Nişanlar</button></nav>
    <CourtBook title="Hükmündeki topraklar" detail={`${stats.cities} şehir · ${num(stats.population)} nüfus · ${num(stats.soldiers)} asker ve tayfa`}><div className="sovereign-cities">{empire.cities.map(city => <button type="button" key={city.id} className="sovereign-city" onClick={() => onCity(city.id)} aria-label={`${city.name} şehrine git`}><span className="sovereign-city-picture"><img src={asset('/images/game/quests/capital.webp')} alt="" /><img src={buildingImage('divan', city.game.buildings.divan)} alt="" /></span><span className="sovereign-city-copy"><small>{city.id === capitalId(empire) ? 'BAŞKENT' : 'KOLONİ'} · {islandOf(city).name}</small><strong>{city.name}</strong><span>Divanhane {city.game.buildings.divan}. seviye</span><span>{num(population(city.game))} nüfus · {num(soldiers(city.game))} asker</span><b>Şehre git<ChevronRight aria-hidden="true" /></b></span></button>)}</div></CourtBook>
    <CourtBook title="Saltanat sicili" detail="İmparatorluğun gerçek kayıtlarından"><dl className="sovereign-records">{records.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{num(value)}</dd></div>)}</dl></CourtBook>
  </div>

  if (tab === 'medals') return <div className="court-page sovereign-page sovereign-profile-v2 ref-profile-secondary">
    <nav className="ref-profile-mini-nav" aria-label="Hükümdar profili bölümleri"><button onClick={() => setTab('reign')}><Crown />Profil</button><button onClick={() => setTab('cities')}><Castle />Şehirler</button><button aria-current="page"><Award />Nişanlar</button></nav>
    <CourtBook title="Nişan hazinesi" detail={`${won.length} / ${list.length} nişan kazanıldı`}>
      <div className="sovereign-medal-tally">{([3, 2, 1] as MedalTier[]).map(tier => <span key={tier}><Medal tier={tier} size={24} /><b>{won.filter(a => a.tier === tier).length}</b><small>{TIERS[tier]}</small></span>)}</div>
      {nextMedal && <div className="sovereign-next-medal"><Medal id={nextMedal.id} tier={nextMedal.tier} earned={false} size={42} /><span><small>SIRADAKİ NİŞAN</small><b>{nextMedal.name}</b><p>{nextMedal.description}</p></span></div>}
      <div className="sovereign-medal-filter"><button type="button" aria-pressed={!wonOnly} onClick={() => setWonOnly(false)}>Bütün nişanlar</button><button type="button" aria-pressed={wonOnly} onClick={() => setWonOnly(true)}>Kazanılanlar · {won.length}</button></div>
      <div className="sovereign-medals">{(wonOnly ? won : [...list].sort((a, b) => Number(b.value >= b.goal) - Number(a.value >= a.goal))).map(a => <article key={a.id} className={`sovereign-medal${a.value >= a.goal ? ' is-earned' : ''}`}><div className="sovereign-medal-face"><Medal id={a.id} tier={a.tier} earned={a.value >= a.goal} size={64} /></div><small>{TIERS[a.tier]} nişan · {a.value >= a.goal ? 'Kazanıldı' : 'Sürüyor'}</small><h4>{a.name}</h4><p>{a.description}</p><CourtProgress value={a.value} need={a.goal} label={a.name} /></article>)}</div>
      {wonOnly && !won.length && <div className="court-empty"><Award aria-hidden="true" /><h4>İlk nişanın seni bekliyor</h4><p>Şehrini büyüttükçe şeref rafın dolacak.</p><GameButton variant="outline" className="court-wide" onClick={() => setWonOnly(false)}>Bütün nişanları göster</GameButton></div>}
    </CourtBook>
  </div>

  return <div className="court-page sovereign-page sovereign-profile-v2 ref-profile-screen">
    <section className="ref-profile-card">
      <div className="ref-profile-sky"><img src={asset('/images/game/terrain/title-background.webp')} alt="" width={960} height={420} decoding="async" /></div>
      <div className="ref-profile-identity-card">
        <div className="ref-profile-portrait"><AdvisorPortrait id="city" size={118} /><button type="button" aria-label="Profil fotoğrafı" className="ref-camera">◉</button></div>
        <div className="ref-profile-small-banner"><HangingBanner crest={draft.crest} color={draft.color} banner={draft.banner} /></div>
        <div className="ref-profile-copy">
          {editIdentity ? <div className="ref-identity-edit">
            <label htmlFor={`${id}-name`}>Hükümdarın adı</label><input id={`${id}-name`} value={draft.ruler} maxLength={24} minLength={2} onChange={event => setDraft({ ...draft, ruler: event.target.value })} />
            <label htmlFor={`${id}-motto`}>Düstur</label><input id={`${id}-motto`} value={draft.motto} maxLength={60} onChange={event => setDraft({ ...draft, motto: event.target.value })} />
          </div> : <>
            <h2>{draft.ruler || 'Hükümdar'}<button type="button" aria-label="Adı ve düsturu düzenle" onClick={() => setEditIdentity(true)}><Pencil /></button></h2>
            <small>#{ranks.total}</small>
            <span className="ref-profile-title-ribbon"><Crown />{title.name} · {alliance}</span>
            <p>{draft.motto || 'Adalarda yükselen her şehir, daha güçlü bir yarının temelidir.'}<button type="button" aria-label="Düsturu düzenle" onClick={() => setEditIdentity(true)}><Pencil /></button></p>
          </>}
        </div>
      </div>
      <div className="ref-profile-stats" aria-label="Hükümdar özeti">
        <span><Trophy /><b>{ranks.total}</b><small>Sıralama</small></span>
        <span><Crown /><b>#{ranks.builder}</b><small>Kıta Sıralaması</small></span>
        <span><Users /><b>{alliance}</b><small>İttifak</small></span>
        <span><CalendarCheck /><b>{days}</b><small>Oyun Günü</small></span>
      </div>
    </section>

    <form className="profile-v2-banner-editor ref-banner-editor" onSubmit={saveIdentity}>
      <header className="ref-section-title"><span><Flag aria-hidden="true" /></span><h3>Sancak Düzenle</h3><small>Sancağın, kimliğini temsil eder.</small><i>i</i></header>
      <div className="ref-banner-workbench">
        <div className="ref-banner-large"><HangingBanner crest={draft.crest} color={draft.color} banner={draft.banner} /><small>{BANNER_NAMES[draft.banner]}</small></div>
        <div className="ref-banner-choices">
          <section><b>Sancak Şekli</b><div className="court-banner-options ref-choice-strip" role="radiogroup" aria-label="Sancak biçimi">{BANNERS.map(b => <button type="button" role="radio" aria-label={BANNER_NAMES[b]} aria-checked={draft.banner === b} key={b} title={BANNER_NAMES[b]} onClick={() => setDraft({ ...draft, banner: b })}><SancakArt crest={draft.crest} color={draft.color} banner={b} size={54} still />{draft.banner === b && <Check aria-hidden="true" />}</button>)}</div></section>
          <section><b>Sembol</b><div className="court-crest-options ref-choice-strip" role="radiogroup" aria-label="Arma">{CRESTS.map(c => <button type="button" role="radio" aria-label={CREST_NAMES[c]} aria-checked={draft.crest === c} key={c} title={CREST_NAMES[c]} onClick={() => setDraft({ ...draft, crest: c })}><RulerCrest crest={c} color={draft.color} size={35} />{draft.crest === c && <Check aria-hidden="true" />}</button>)}</div></section>
          <section><b>Renk</b><div className="court-color-options ref-color-strip" role="radiogroup" aria-label="Renk">{CREST_COLORS.map(c => <button type="button" role="radio" aria-label={COLOR_NAMES[c]} aria-checked={draft.color === c} key={c} title={COLOR_NAMES[c]} onClick={() => setDraft({ ...draft, color: c })}><span style={{ background: c }}>{draft.color === c && <Check aria-hidden="true" />}</span></button>)}</div></section>
        </div>
      </div>
      <button className="ref-red-action" type="submit" disabled={!nameValid} aria-label="Profili ve sancağı kaydet"><Flag />Sancağını Düzenle</button>
      {editIdentity && <small className="ref-edit-note">Ad ve düstur da bu düğmeyle kaydedilir.</small>}
    </form>

    <section className="ref-badges-strip">
      <header><h3>✥ Rozetler</h3><button type="button" onClick={() => setTab('medals')}>Tümünü Gör <ChevronRight /></button></header>
      <div>{(won.length ? won : list.slice(0, 4)).slice(0, 4).map(a => <button type="button" key={a.id} onClick={() => setTab('medals')}><Medal id={a.id} tier={a.tier} earned={a.value >= a.goal} size={58} /><small>{a.name}</small></button>)}</div>
    </section>

    <section className="ref-profile-more">
      <CourtBook title="Saltanat beratı" detail={`${alliance} · ${new Date(p.since).toLocaleDateString('tr-TR')} tarihinden beri`}>
        <div className="sovereign-title-path" aria-label="Unvan yolu" data-hscroll>{TITLES.map(t => <span key={t.name} className={title.name === t.name ? 'is-current' : score.total >= t.min ? 'is-earned' : ''}><Crown aria-hidden="true" /><b>{t.name}</b><small>{num(t.min)} puan</small></span>)}</div>
        <CourtProgress value={Math.round(title.progress * 100)} need={100} label={`${title.name} unvanı ilerlemesi`} />
        <p className="court-note">{title.next ? `${title.next} unvanına ${num(title.need)} puan kaldı.` : 'En yüksek unvana ulaştın.'}</p>
      </CourtBook>
      <CourtBook title="Hükümdarlar defteri" detail={`Yapay rakiplerle ${ranks.of} hükümdar arasında`}><div className="sovereign-ranks profile-v2-ranks">{ledger.map(({ name, value, rank, Icon }) => <div key={name}><span className="sovereign-rank-icon"><Icon aria-hidden="true" /></span><span><strong>{name}</strong><small>{rank}. sıra / {ranks.of}</small></span><b>{num(value)}</b></div>)}</div></CourtBook>
    </section>

    <footer className="court-footer ref-profile-footer"><GameButton aria-label="Oyun ayarları" variant="outline" onClick={onSettings}><Settings aria-hidden="true" />Ayarları aç</GameButton><GameButton variant="outline" onClick={onChangelog}><ScrollText painted aria-hidden="true" />Sürüm arşivi</GameButton></footer>
  </div>
}
