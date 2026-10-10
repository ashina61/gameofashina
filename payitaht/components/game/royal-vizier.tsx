'use client'
import { useState } from 'react'
import { asset } from '@/lib/asset'
import { BUILDINGS, activeJob, contentment, fullResources, housing, idleWorkers, maxPopulation, population, rates, timeLeft, formatRate, groupLog, type BuildingId, type Game } from '@/lib/game/engine'
import { activeCity, type Empire } from '@/lib/game/empire'
import { dayGroups, logKind } from '@/lib/game/log-view'
import { ScrollText } from './ui-art'
import { CourtTabs } from './court-kit'
import { ApprovedArt } from './approved-court-art'
import { RoyalMeter } from './royal-kit'
import { Box } from './building-page'
import type { ReactNode } from 'react'
import { GameButton } from './game-button'

const tabs = [{ id: 'agenda', label: 'Gündem', Icon: ScrollText, art: '/images/game/icons/res-sure.webp' }, { id: 'cities', label: 'Şehirler', Icon: ScrollText, art: '/images/game/buildings/divan-painted-1-sm.webp' }, { id: 'news', label: 'Haberler', Icon: ScrollText, art: '/images/game/ui/approved-court/seal.webp' }] as const
const newsArt = { war: 'military', build: 'construction', research: 'science', trade: 'trade', reward: 'laurel', faith: 'city', other: 'seal' }
function VizierSection({ title, detail, children }: { title: string; detail?: string; children: ReactNode }) {
  return <Box title={title}>{detail && <p className="vizier-detail">{detail}</p>}{children}</Box>
}
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
    <figure className="academy-banner"><img src={asset('/images/game/ui/divan/vizier-scene.webp')} alt="" width={1200} height={400} /><figcaption>{current.name} · Vezirin defteri</figcaption></figure>
    <CourtTabs items={tabs} value={tab} onChange={setTab} label="Vezir defterleri">
      {tab === 'agenda' && <>
        <VizierSection title="Vezirin arzı" detail={`${current.name} için bugünün önceliği`}><div className="vizier-advice"><ApprovedArt name={advice.art} /><div><h4>{advice.title}</h4><p>{advice.text}</p></div></div><GameButton className="vizier-action" onClick={advice.run}>{advice.action}</GameButton></VizierSection>
        <VizierSection title="Ustaların işi"><div className="vizier-work"><strong>{job ? BUILDINGS[job.id as BuildingId].name : 'Yeni inşaat bekleniyor'}</strong><span>{job ? `Kalan süre · ${timeLeft(job, game.updatedAt)}` : 'İnşa defterinden bir yapı seçin.'}</span></div><GameButton className="vizier-action" variant="outline" onClick={onBuildList}>Bütün yapılar</GameButton></VizierSection>
        <VizierSection title="Şehrin üretimi" detail="Dakikadaki net üretim"><div className="vizier-production">{([['gold', 'Akçe', 'akce'], ['wood', 'Kereste', 'kereste'], ['knowledge', 'İlim', 'ilim']] as const).map(([key, label, icon]) => <div key={key}><img src={asset(`/images/game/icons/res-${icon === 'ilim' ? 'ilim-v2' : icon}.webp`)} alt="" width={64} height={64} /><span>{label}<strong data-tone={production[key] < 0 ? 'down' : 'up'}>{formatRate(production[key], true)}<small> /dk</small></strong></span></div>)}</div></VizierSection>
        <VizierSection title="Devlet yoklaması"><dl className="vizier-summary"><div><dt>Şehir</dt><dd>{empire.cities.length}</dd></div><div><dt>Nüfus · bu şehir</dt><dd>{population(game)}</dd></div><div><dt>İnşaat · bütün şehirler</dt><dd>{empire.cities.filter(c => activeJob(c.game)).length}</dd></div></dl></VizierSection>
        <GameButton className="vizier-action" variant="outline" onClick={onOverview}>İmparatorluk özeti</GameButton>
      </>}
      {tab === 'cities' && <VizierSection title="Şehir sicili" detail="Bir şehri seçerek yönetimine geçin"><div className="vizier-estates">{empire.cities.map(c => { const work = activeJob(c.game); return <button type="button" key={c.id} className="vizier-estate" onClick={() => onCity(c.id)} aria-label={`${c.name}${c.id === current.id ? ' (buradasın)' : ''}: şehre git`}><ApprovedArt name="city" /><span><span className="vizier-city-title"><strong>{c.name}</strong>{c.id === current.id && <small>Buradasın</small>}</span><span className="vizier-city-level">Divanhane · Seviye {c.game.buildings.divan}</span><RoyalMeter value={population(c.game)} need={maxPopulation(c.game)} label={`${c.name} nüfusu`} /><span className="vizier-city-work">{work ? `${BUILDINGS[work.id as BuildingId].name} · ${timeLeft(work, c.game.updatedAt)}` : 'Ustalar boşta'}</span></span></button> })}</div><GameButton className="vizier-action" onClick={onCities}>Şehirler ve harita</GameButton></VizierSection>}
      {tab === 'news' && <VizierSection title="Şehirden haberler" detail={`${current.name} · Son 20 kayıt`}>{groups.length ? groups.map((group, index) => <div className="vizier-news-day" key={`${group.label}-${index}`}><h4>{group.label}</h4><ol>{group.items.map((entry, i) => <li key={`${entry.time}-${i}`}><ApprovedArt name={newsArt[logKind(entry.text)]} /><div><p>{entry.text}{entry.count > 1 && <b> ×{entry.count}</b>}</p><time dateTime={new Date(entry.time).toISOString()}>{new Date(entry.time).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}</time></div></li>)}</ol></div>) : <div className="vizier-advice"><ApprovedArt name="seal" /><p>Şehir defteri henüz boş. İnşaatlar ve gelişmeler burada kayda geçecek.</p></div>}<GameButton className="vizier-action" onClick={onJournal}>Şehir günlüğünü aç</GameButton></VizierSection>}
    </CourtTabs>
  </div>
}
