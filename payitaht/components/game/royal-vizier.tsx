'use client'
import { useState } from 'react'
import { asset } from '@/lib/asset'
import { BUILDINGS, activeJob, contentment, fullResources, housing, idleWorkers, maxPopulation, population, rates, timeLeft, formatRate, groupLog, type BuildingId, type Game } from '@/lib/game/engine'
import { activeCity, type Empire } from '@/lib/game/empire'
import { dayGroups, logKind } from '@/lib/game/log-view'
import { ScrollText } from './ui-art'
import { CourtTabs } from './court-kit'
import { ApprovedArt } from './approved-court-art'
import { RoyalMeter, RoyalSection } from './royal-kit'
import { GameButton } from './game-button'

const tabs = [{ id: 'agenda', label: 'Gündem', Icon: ScrollText }, { id: 'cities', label: 'Şehirler', Icon: ScrollText }, { id: 'news', label: 'Haberler', Icon: ScrollText }] as const
const newsArt = { war: 'military', build: 'construction', research: 'science', trade: 'trade', reward: 'laurel', faith: 'city', other: 'seal' }
export function CityAdvisor({ empire, game, onCity, onBuilding, onCities, onBuildList, onOverview, onJournal }: {
  empire: Empire; game: Game; onCity: (id: string) => void; onBuilding: (id: BuildingId) => void; onCities: () => void; onBuildList: () => void; onOverview: () => void; onJournal: () => void
}) {
  const [tab, setTab] = useState<'agenda' | 'cities' | 'news'>('agenda')
  const current = activeCity(empire), job = activeJob(game), production = rates(game)
  const advice = !job ? { title: 'Ustalar emrinizi bekliyor', text: 'Şehrin büyümesi için sıradaki yapıyı seçelim efendim.', action: 'İnşa emri ver', run: onBuildList, art: 'construction' }
    : fullResources(game).length ? { title: 'Ambarlar doluyor', text: 'Üretim boşa gitmesin. Depoları büyütelim ya da biriken kaynakları kullanalım.', action: 'Ambarı incele', run: () => onBuilding('ambar'), art: 'trade' }
    : housing(game) > contentment(game) ? { title: 'Halkın huzura ihtiyacı var', text: 'Konaklar boş kalıyor. Hamam, Kahvehane ve Cami şehrin huzurunu artırır.', action: 'Hamamı incele', run: () => onBuilding('hamam'), art: 'city' }
    : idleWorkers(game) > 20 ? { title: `${idleWorkers(game)} kişi iş bekliyor`, text: 'Ocaklara ve medreseye işçi ayırarak şehrin üretimini güçlendirelim.', action: 'Şehir yönetimine git', run: () => onBuilding('divan'), art: 'science' }
    : { title: 'Şehir yolunda efendim', text: 'İnşaat sürüyor, halk memnun. Yeni emriniz için divan hazır.', action: 'Divanhaneyi aç', run: () => onBuilding('divan'), art: 'laurel' }
  const groups = dayGroups(groupLog(game.log).slice(0, 20), game.updatedAt)
  return <div className="royal-page vizier-page">
    <div className="vizier-scene"><img src={asset('/images/game/ui/divan/vizier-scene.webp')} alt="Vezir, denize bakan divan odasında şehir haritasını inceliyor" width={1200} height={400} /><div><span>Divan-ı hümayun</span><h2>{current.name}</h2><p>Şehrin sözü, vezirin defteri</p></div></div>
    <div className="royal-summary"><span><ApprovedArt name="city" /><span><b>{empire.cities.length}</b>Şehir</span></span><span><ApprovedArt name="kurucu" /><span><b>{population(game)}</b>Nüfus</span></span><span><ApprovedArt name="construction" /><span><b>{empire.cities.filter(c => activeJob(c.game)).length}</b>İnşaat</span></span></div>
    <CourtTabs items={tabs} value={tab} onChange={setTab} label="Vezir defterleri" illustrated={false}>
      {tab === 'agenda' && <>
        <RoyalSection title="Vezirin arzı" detail={`${current.name} için bugünün önceliği`}><div className="vizier-advice"><ApprovedArt name={advice.art} /><div><h4>{advice.title}</h4><p>{advice.text}</p></div></div><GameButton className="vizier-action" onClick={advice.run}>{advice.action}</GameButton></RoyalSection>
        <RoyalSection title="Ustaların işi" art="construction"><div className="vizier-work"><strong>{job ? BUILDINGS[job.id as BuildingId].name : 'Yeni inşaat bekleniyor'}</strong><span>{job ? `Kalan süre · ${timeLeft(job, game.updatedAt)}` : 'İnşa defterinden bir yapı seçin.'}</span></div><GameButton className="vizier-action" variant="outline" onClick={onBuildList}>Bütün yapılar</GameButton></RoyalSection>
        <RoyalSection title="Şehrin üretimi" detail="Dakikadaki net üretim"><div className="vizier-production">{([['gold', 'Akçe', 'akce'], ['wood', 'Kereste', 'kereste'], ['knowledge', 'İlim', 'ilim']] as const).map(([key, label, icon]) => <div key={key}><img src={asset(`/images/game/icons/res-${icon}.webp`)} alt="" width={64} height={64} /><span>{label}<strong data-tone={production[key] < 0 ? 'down' : 'up'}>{formatRate(production[key], true)}<small> /dk</small></strong></span></div>)}</div></RoyalSection>
        <GameButton className="vizier-action" variant="outline" onClick={onOverview}>İmparatorluk özeti</GameButton>
      </>}
      {tab === 'cities' && <RoyalSection title="Şehir sicili" detail="Bir şehri seçerek yönetimine geçin" art="city"><div className="vizier-estates">{empire.cities.map(c => { const work = activeJob(c.game); return <button type="button" key={c.id} className="vizier-estate" onClick={() => onCity(c.id)} aria-label={`${c.name}${c.id === current.id ? ' (buradasın)' : ''}: şehre git`}><ApprovedArt name="city" /><span><span className="vizier-city-title"><strong>{c.name}</strong>{c.id === current.id && <small>Buradasın</small>}</span><span className="vizier-city-level">Divanhane · Seviye {c.game.buildings.divan}</span><RoyalMeter value={population(c.game)} need={maxPopulation(c.game)} label={`${c.name} nüfusu`} /><span className="vizier-city-work">{work ? `${BUILDINGS[work.id as BuildingId].name} · ${timeLeft(work, c.game.updatedAt)}` : 'Ustalar boşta'}</span></span></button> })}</div><GameButton className="vizier-action" onClick={onCities}>Şehirler ve harita</GameButton></RoyalSection>}
      {tab === 'news' && <RoyalSection title="Şehirden haberler" detail={`${current.name} · Son 20 kayıt`} art="seal">{groups.length ? groups.map((group, index) => <div className="vizier-news-day" key={`${group.label}-${index}`}><h4>{group.label}</h4><ol>{group.items.map((entry, i) => <li key={`${entry.time}-${i}`}><ApprovedArt name={newsArt[logKind(entry.text)]} /><div><p>{entry.text}{entry.count > 1 && <b> ×{entry.count}</b>}</p><time dateTime={new Date(entry.time).toISOString()}>{new Date(entry.time).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}</time></div></li>)}</ol></div>) : <div className="vizier-advice"><ApprovedArt name="seal" /><p>Şehir defteri henüz boş. İnşaatlar ve gelişmeler burada kayda geçecek.</p></div>}<GameButton className="vizier-action" onClick={onJournal}>Şehir günlüğünü aç</GameButton></RoyalSection>}
    </CourtTabs>
  </div>
}
