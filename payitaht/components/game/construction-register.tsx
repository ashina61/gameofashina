'use client'

import { useState } from 'react'
import { asset, buildingImage } from '@/lib/asset'
import { BUILDINGS, BUILDING_IDS, MAX_LEVEL, PLOTS, QUEUE_LIMIT, buildReason, cost, duration, freePlots, luxuryCost, nextPlotDivan, plotFits, plotOpen, takesPlot, type BuildingId, type Game } from '@/lib/game/engine'
import { GameButton } from './game-button'
import { CostDisplay, JobProgress } from './game-widgets'
import { KumSaatiArt } from './resource-art'
import { Hammer, ChevronRight } from './ui-art'

function ConstructionIntro({ game, plot }: { game: Game; plot?: number }) {
  const slot = plot === undefined ? null : PLOTS[plot]
  const next = nextPlotDivan(game)
  return <>
    <figure className="construction-banner"><img src={asset('/images/game/ui/construction/ustalar.webp')} alt="" width={960} height={320} /></figure>
    <section className="construction-overview" aria-label="İnşa durumu">
      <h2>{slot ? slot.islet ? 'Korsan adası' : slot.zone === 'liman' ? 'Deniz arsası' : 'Kara arsası' : 'Ustaların defteri'}</h2>
      <p>{slot ? slot.islet ? 'Bu kayalık yalnız Korsan Kalesi içindir.' : slot.zone === 'liman' ? 'Ticaret Limanı, Donanma Tersanesi ve Korsan Kalesi deniz arsalarına kurulur.' : 'Kara yapıları bu arsaya kurulabilir. Ayrıntıyı aç, bedeli incele ve inşayı başlat.' : 'Yeni bir yapı seç veya kurulu binanın gelişimine git. Surlar şehir çevresindedir; arsa kaplamaz.'}</p>
      <dl><div><dt>Boş kara arsası</dt><dd>{freePlots(game, 'sehir').length}</dd></div><div><dt>Boş deniz arsası</dt><dd>{freePlots(game, 'liman').length}</dd></div><div><dt>İnşaat sırası</dt><dd>{game.queue.length} / {QUEUE_LIMIT}</dd></div></dl>
      {next && <p className="construction-note">Divanhane {next}. seviyede yeni kara arsaları açılır.</p>}
      {game.queue.length > 0 && <details className="construction-queue"><summary>Ustaların iş sırası ({game.queue.length})</summary>{game.queue.map(job => <div key={job.id}><strong>{BUILDINGS[job.id as BuildingId].name}</strong><JobProgress job={job} now={game.updatedAt} /></div>)}</details>}
    </section>
  </>
}

function ConstructionEntry({ game, id, plot, onSelect, onBuild }: { game: Game; id: BuildingId; plot?: number; onSelect?: (id: BuildingId) => void; onBuild?: (id: BuildingId, plot: number) => void }) {
  const b = BUILDINGS[id], level = game.buildings[id], complete = level >= MAX_LEVEL[id]
  const job = game.queue.find(j => j.id === id)
  const slotReason = plot !== undefined && (!plotOpen(game, plot) || Object.values(game.placement).includes(plot)) ? 'Bu arsa şu an inşaya açık değil.' : null
  const reason = slotReason ?? buildReason(game, id)
  const state = job ? 'İnşaat sırasında' : complete ? 'En yüksek seviye' : reason ?? (level ? 'Yükseltmeye hazır' : 'İnşaya hazır')
  return <details className="construction-entry" data-building={id}>
    <summary><span className="construction-art">{b.art ? <img src={buildingImage(id, level)} alt="" width={88} height={88} loading="lazy" decoding="async" /> : <Hammer aria-hidden="true" />}</span><span className="construction-copy"><small>{b.category} · {level ? `${level}. seviye` : 'Yeni yapı'}</small><strong>{b.name}</strong><span className={reason ? 'construction-locked' : 'construction-ready'}>{state}</span></span><ChevronRight aria-hidden="true" /></summary>
    <div className="construction-detail"><p>{b.description}</p>
      {!complete && !job && <><h3>{level ? `${level + 1}. seviyenin bedeli` : 'İlk inşanın bedeli'}</h3><CostDisplay exact value={cost(game, id)} lux={luxuryCost(game, id)} /><p className="construction-duration"><KumSaatiArt aria-hidden="true" />{duration(game, id).toLocaleString('tr-TR')} saniye</p></>}
      {job && <JobProgress job={job} now={game.updatedAt} />}
      {reason && <p className="construction-lock-note">{reason}</p>}
      {plot !== undefined ? <GameButton disabled={!!reason} onClick={() => onBuild?.(id, plot)}><Hammer aria-hidden="true" />{b.name} inşa et</GameButton> : <GameButton onClick={() => onSelect?.(id)}>{level ? 'Binaya git' : 'Yapıyı incele'}<ChevronRight aria-hidden="true" /></GameButton>}
    </div>
  </details>
}

export function BuildingList({ game, onSelect }: { game: Game; onSelect: (id: BuildingId) => void }) {
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<'all' | 'built' | 'new'>('all')
  const matching = BUILDING_IDS.filter(id => (filter !== 'built' || game.buildings[id] > 0) && (filter !== 'new' || !game.buildings[id]) && `${BUILDINGS[id].name} ${BUILDINGS[id].category}`.toLocaleLowerCase('tr-TR').includes(query.trim().toLocaleLowerCase('tr-TR')))
  return <div className="construction-register"><ConstructionIntro game={game} /><section className="construction-filters" aria-label="Yapı filtreleri"><label htmlFor="building-search">Yapı ara</label><input id="building-search" type="search" placeholder="Örn. Medrese, liman, üretim…" value={query} onChange={e => setQuery(e.target.value)} /><div role="group" aria-label="Yapı durumu">{([['all', 'Tümü'], ['built', 'Kurulu'], ['new', 'Yeni']] as const).map(([key, label]) => <button key={key} type="button" aria-pressed={filter === key} onClick={() => setFilter(key)}>{label}</button>)}</div><p role="status">{matching.length} yapı</p></section><div className="construction-entries">{matching.length === 0 && <p className="construction-empty">Bu aramada yapı bulunamadı. Aramayı veya filtreyi değiştir.</p>}{matching.map(id => <ConstructionEntry key={id} game={game} id={id} onSelect={onSelect} />)}</div></div>
}

export function PlotPicker({ game, plot, onBuild }: { game: Game; plot: number; onBuild: (id: BuildingId, plot: number) => void }) {
  const candidates = BUILDING_IDS.filter(id => takesPlot(id) && game.placement[id] === null && plotFits(plot, id))
  return <div className="construction-register"><ConstructionIntro game={game} plot={plot} /><div className="construction-entries">{candidates.length === 0 && <p className="construction-empty">Bu arsaya kurulabilecek yeni yapı kalmadı. Kurulu yapılarını geliştirebilirsin.</p>}{candidates.map(id => <ConstructionEntry key={`${plot}-${id}`} game={game} id={id} plot={plot} onBuild={onBuild} />)}</div></div>
}
