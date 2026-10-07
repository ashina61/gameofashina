'use client'
import { useState } from 'react'
import { population, soldiers } from '@/lib/game/engine'
import { capitalId, islandOf, type Empire } from '@/lib/game/empire'
import { achievements, playerScore, profileRanks, profileStats, type Achievement, type MedalTier } from '@/lib/game/profile'
import { ApprovedArt } from './approved-court-art'
import { RoyalMeter, RoyalSection } from './royal-kit'
import { GameButton } from './game-button'

const num = (value: number) => Math.floor(value).toLocaleString('tr-TR')
const TIERS: Record<MedalTier, string> = { 1: 'Tunç', 2: 'Gümüş', 3: 'Altın' }
function medalArt(id: string) {
  if (['talebe', 'alim', 'allame'].includes(id)) return 'alim'
  if (['talim', 'ordu', 'donanma', 'ilk-zafer', 'zafer', 'zafer2', 'yagma', 'korsan1', 'korsan', 'casus1', 'casus'].includes(id)) return 'ilk-zafer'
  return 'kurucu'
}
function MedalFace({ medal }: { medal: Achievement }) {
  return <div className={`royal-medal-art${medal.value >= medal.goal ? ' is-earned' : ''}`} data-tier={medal.tier}><ApprovedArt name={medalArt(medal.id)} /></div>
}
export function RoyalMedals({ empire }: { empire: Empire }) {
  const [wonOnly, setWonOnly] = useState(false)
  const list = achievements(empire), won = list.filter(a => a.value >= a.goal), next = list.filter(a => a.value < a.goal).sort((a, b) => b.value / b.goal - a.value / a.goal)[0]
  const visible = wonOnly ? won : [...list].sort((a, b) => Number(b.value >= b.goal) - Number(a.value >= a.goal))
  return <div className="royal-subpage royal-medals-page"><RoyalSection title="Nişan hazinesi" detail={`${won.length} / ${list.length} nişan kazanıldı`} art="laurel">
    <div className="royal-tier-summary">{([3, 2, 1] as MedalTier[]).map(tier => <div key={tier} data-tier={tier}><ApprovedArt name="laurel" /><span><strong>{won.filter(a => a.tier === tier).length}</strong><small>{TIERS[tier]}</small></span></div>)}</div>
    {next && <div className="royal-next-medal"><MedalFace medal={next} /><div><small>SIRADAKİ NİŞAN</small><h4>{next.name}</h4><p>{next.description}</p><RoyalMeter value={next.value} need={next.goal} label={next.name} /></div></div>}
    <div className="royal-filter"><button type="button" aria-pressed={!wonOnly} onClick={() => setWonOnly(false)}>Bütün nişanlar</button><button type="button" aria-pressed={wonOnly} onClick={() => setWonOnly(true)}>Kazanılanlar · {won.length}</button></div>
    <div className="royal-medal-gallery">{visible.map(a => <article key={a.id} className={`royal-medal-card${a.value >= a.goal ? ' is-earned' : ''}`}><MedalFace medal={a} /><small>{TIERS[a.tier]} · {a.value >= a.goal ? 'Kazanıldı' : 'Sürüyor'}</small><h4>{a.name}</h4><p>{a.description}</p><RoyalMeter value={a.value} need={a.goal} label={a.name} /></article>)}</div>
    {wonOnly && !won.length && <div className="royal-empty"><ApprovedArt name="kurucu" /><h4>İlk nişanın seni bekliyor</h4><p>Şehrini büyüttükçe şeref rafın dolacak.</p><GameButton variant="outline" onClick={() => setWonOnly(false)}>Bütün nişanları göster</GameButton></div>}
  </RoyalSection></div>
}
export function RoyalCities({ empire, now, onCity }: { empire: Empire; now: number; onCity: (id: string) => void }) {
  const stats = profileStats(empire), score = playerScore(empire), ranks = profileRanks(empire, now)
  const ledger = [{ name: 'Toplam', key: 'total', art: 'laurel' }, { name: 'İnşaat', key: 'builder', art: 'construction' }, { name: 'Askerî', key: 'military', art: 'military' }, { name: 'Saldırı', key: 'offense', art: 'ilk-zafer' }, { name: 'Savunma', key: 'defense', art: 'military' }, { name: 'Bilim', key: 'science', art: 'science' }, { name: 'Hazine', key: 'gold', art: 'laurel' }, { name: 'Ticaret', key: 'trade', art: 'trade' }] as const
  const records = [
    { title: 'Memleket', art: 'city', rows: [['Şehir', stats.cities], ['Nüfus', stats.population], ['Asker ve tayfa', stats.soldiers], ['Bina seviyesi', stats.levels]] },
    { title: 'İlim ve imar', art: 'science', rows: [['Araştırma', stats.research], ['Kurulan yapı', stats.builds]] },
    { title: 'Sefer defteri', art: 'military', rows: [['Eğitilen birlik', stats.trained], ['Kazanılan savaş', stats.won], ['Kaybedilen savaş', stats.lost], ['Sefer yağması', stats.raids], ['Casus görevi', stats.spies], ['Korsan şöhreti', stats.fame]] },
    { title: 'Memleket işleri', art: 'trade', rows: [['Bağış (kereste)', stats.donated], ['Nakliye', stats.shipments]] },
  ] as const
  return <div className="royal-subpage royal-realms-page"><RoyalSection title="Hükmündeki topraklar" detail={`${stats.cities} şehir · ${num(stats.population)} nüfus · ${num(stats.soldiers)} asker ve tayfa`} art="city"><div className="royal-settlements">{empire.cities.map(city => <button type="button" className="royal-settlement" key={city.id} onClick={() => onCity(city.id)} aria-label={`${city.name} şehrine git`}><div className="royal-settlement-art"><ApprovedArt name="city" /><small>{city.id === capitalId(empire) ? 'BAŞKENT' : 'KOLONİ'}</small></div><span><small>{islandOf(city).name}</small><strong>{city.name}</strong><span>Divanhane · {city.game.buildings.divan}. seviye</span><span>{num(population(city.game))} nüfus · {num(soldiers(city.game))} asker</span><b>Şehre git ›</b></span></button>)}</div></RoyalSection>
    <RoyalSection title="Hükümdarlar defteri" detail={`${ranks.of} yapay hükümdar arasında`} art="laurel"><div className="royal-score-register">{ledger.map(({ name, key, art }) => <div key={key}><ApprovedArt name={art} /><span><small>{name}</small><strong>{num(score[key])}</strong><b>{ranks[key]}. sıra</b></span></div>)}</div></RoyalSection>
    <RoyalSection title="Saltanat sicili" detail="İmparatorluğunun biriken kayıtları" art="tempo"><div className="royal-record-groups">{records.map(group => <section key={group.title}><header><ApprovedArt name={group.art} /><h4>{group.title}</h4></header><dl>{group.rows.map(([name, value]) => <div key={name}><dt>{name}</dt><dd>{num(value)}</dd></div>)}</dl></section>)}</div></RoyalSection>
  </div>
}
