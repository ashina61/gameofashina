'use client'

import { useLayoutEffect, useRef, useState } from 'react'
import { asset } from '@/lib/asset'
import { cityBuildingImage } from '@/lib/game/city-map/parcel-city'
import { BUILDINGS, BUILDING_IDS, MAX_LEVEL, PLOTS, QUEUE_LIMIT, buildReason, cost, duration, freePlots, luxuryCost, nextPlotDivan, plotFits, plotOpen, takesPlot, type BuildingId, type Game } from '@/lib/game/engine'
import { GameButton } from './game-button'
import { CostDisplay, JobProgress } from './game-widgets'
import { KumSaatiArt } from './resource-art'
import { Hammer, ChevronRight } from './ui-art'

function plotReason(game: Game, plot?: number) {
  return plot !== undefined && (!plotOpen(game, plot) || Object.values(game.placement).includes(plot)) ? 'Bu arsa şu an inşaya açık değil.' : null
}

function ConstructionIntro({ game, plot }: { game: Game; plot?: number }) {
  const slot = plot === undefined ? null : PLOTS[plot]
  const next = nextPlotDivan(game)
  return <section className="construction-overview" aria-label="İnşa durumu">
    <p>{slot ? slot.islet ? 'Bu kayalığa Korsan Kalesi kurabilirsin.' : slot.zone === 'liman' ? 'Deniz yapılarından birini seç; bedeli onaylayınca bu arsaya kurulur.' : 'Bir yapı seç; bedeli onaylayınca bu arsaya kurulur.' : 'Yapıyı seç, şehirde arsasını belirle, bedeli onayla.'}</p>
    {(plotReason(game, plot) || game.queue.length >= QUEUE_LIMIT) && <p className="construction-lock-note" role="status">{plotReason(game, plot) ?? 'İnşaat sırası dolu. Yeni iş için sıranın boşalmasını bekle.'}</p>}
    <details className="construction-status"><summary>Arsalar ve iş sırası · {game.queue.length}/{QUEUE_LIMIT}</summary>
      <dl><div><dt>Boş kara arsası</dt><dd>{freePlots(game, 'sehir').length}</dd></div><div><dt>Boş deniz arsası</dt><dd>{freePlots(game, 'liman').length}</dd></div><div><dt>İnşaat sırası</dt><dd>{game.queue.length} / {QUEUE_LIMIT}</dd></div></dl>
      {next && <p className="construction-note">Divanhane {next}. seviyede yeni kara arsaları açılır.</p>}
      {game.queue.length > 0 && <div className="construction-queue">{game.queue.map(job => <div key={job.id}><strong>{BUILDINGS[job.id as BuildingId].name}</strong><JobProgress job={job} now={game.updatedAt} /></div>)}</div>}
      <figure className="construction-banner"><img src={asset('/images/game/ui/construction/ustalar.webp')} alt="" width={960} height={320} loading="lazy" /></figure>
    </details>
  </section>
}

function ConstructionEntry({ game, id, plot, open, onToggle, onSelect, onBuild }: { game: Game; id: BuildingId; plot?: number; open: boolean; onToggle: () => void; onSelect?: (id: BuildingId) => void; onBuild?: (id: BuildingId, plot: number) => void }) {
  const entryRef = useRef<HTMLDetailsElement>(null)
  useLayoutEffect(() => {
    if (!open || !entryRef.current) return
    const scroll = entryRef.current.closest<HTMLElement>('.bp-scroll')
    if (scroll) scroll.scrollBy({ top: entryRef.current.getBoundingClientRect().top - scroll.getBoundingClientRect().top, behavior: 'instant' })
  }, [open])
  const b = BUILDINGS[id], level = game.buildings[id], complete = level >= MAX_LEVEL[id]
  const job = game.queue.find(j => j.id === id)
  const reason = plotReason(game, plot) ?? buildReason(game, id)
  const choosePlot = !level && !job && takesPlot(id)
  const state = job ? 'İnşaat sırasında' : complete ? 'En yüksek seviye' : reason ? 'Koşul eksik · ayrıntıyı aç' : level ? 'Yükseltmeye hazır' : 'İnşaya hazır'
  return <details ref={entryRef} className="construction-entry" data-building={id} open={open}>
    <summary onClick={event => { event.preventDefault(); onToggle() }}><span className="construction-art">{b.art ? <img src={cityBuildingImage(id, level)} alt="" width={88} height={88} loading="lazy" decoding="async" /> : <Hammer aria-hidden="true" />}</span><span className="construction-copy"><small>{b.category} · {level ? `${level}. seviye` : job ? 'Yapım aşamasında' : 'Yeni yapı'}</small><strong>{b.name}</strong><span className={reason ? 'construction-locked' : 'construction-ready'}>{state}</span></span><ChevronRight aria-hidden="true" /></summary>
    <div className="construction-detail">
      {!complete && !job && <><h3>{level ? `${level + 1}. seviyenin bedeli` : 'İlk inşanın bedeli'}</h3><CostDisplay exact value={cost(game, id)} lux={luxuryCost(game, id)} /><p className="construction-duration"><KumSaatiArt aria-hidden="true" />{duration(game, id).toLocaleString('tr-TR')} saniye</p></>}
      {job && <JobProgress job={job} now={game.updatedAt} />}
      {reason && <p className="construction-lock-note">{reason}</p>}
      {plot !== undefined ? <GameButton disabled={!!reason} onClick={() => onBuild?.(id, plot)}><Hammer aria-hidden="true" />{b.name} inşa et</GameButton> : <GameButton disabled={choosePlot && !!reason} onClick={() => onSelect?.(id)}>{choosePlot ? 'Şehirde arsa seç' : level || job ? 'Binaya git' : 'Yapıyı incele'}<ChevronRight aria-hidden="true" /></GameButton>}
      <p>{b.description}</p>
    </div>
  </details>
}

function ConstructionEntries({ game, ids, grouped, searching, plot, onSelect, onBuild }: { game: Game; ids: BuildingId[]; grouped: boolean; searching?: boolean; plot?: number; onSelect?: (id: BuildingId) => void; onBuild?: (id: BuildingId, plot: number) => void }) {
  const [expanded, setExpanded] = useState<BuildingId | null>(null)
  const ready = grouped && !searching ? ids.filter(id => !plotReason(game, plot) && !buildReason(game, id)) : ids
  const blocked = grouped && !searching ? ids.filter(id => !ready.includes(id)) : []
  const entry = (id: BuildingId) => <ConstructionEntry key={id} game={game} id={id} plot={plot} open={expanded === id} onToggle={() => setExpanded(expanded === id ? null : id)} onSelect={onSelect} onBuild={onBuild} />
  return <div className="construction-entries">
    {ids.length === 0 && <p className="construction-empty">{plot !== undefined ? 'Bu arsaya kurulabilecek yeni yapı kalmadı. Kurulu yapılarını geliştirebilirsin.' : 'Bu seçimde yapı bulunamadı. Aramayı veya filtreyi değiştir.'}</p>}
    {grouped && !searching && <h2 className="construction-group-title">Şimdi kurulabilir · {ready.length}</h2>}
    {grouped && !searching && ids.length > 0 && ready.length === 0 && <p className="construction-empty">Şu an kurulabilir yapı yok. Aşağıdan eksik koşulları inceleyebilirsin.</p>}
    {ready.map(entry)}
    {blocked.length > 0 && <details className="construction-blocked"><summary>Koşulu eksik yapılar · {blocked.length}</summary>{blocked.map(entry)}</details>}
  </div>
}

export function BuildingList({ game, onSelect }: { game: Game; onSelect: (id: BuildingId) => void }) {
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<'all' | 'built' | 'new'>('new')
  const matching = BUILDING_IDS.filter(id => {
    const exists = game.buildings[id] > 0 || game.queue.some(job => job.id === id)
    return (filter !== 'built' || exists) && (filter !== 'new' || !exists) && `${BUILDINGS[id].name} ${BUILDINGS[id].category}`.toLocaleLowerCase('tr-TR').includes(query.trim().toLocaleLowerCase('tr-TR'))
  })
  return <div className="construction-register"><ConstructionIntro game={game} /><section className="construction-filters" aria-label="Yapı filtreleri"><label htmlFor="building-search">Yapı ara</label><input id="building-search" type="search" placeholder="Örn. Medrese, liman, üretim…" value={query} onChange={e => setQuery(e.target.value)} /><div role="group" aria-label="Yapı durumu">{([['new', 'Yeni'], ['built', 'Kurulu'], ['all', 'Tümü']] as const).map(([key, label]) => <button key={key} type="button" aria-pressed={filter === key} onClick={() => setFilter(key)}>{label}</button>)}</div><p role="status">{matching.length} yapı{filter === 'built' ? ' · inşa halindekiler dahil' : ''}</p></section><ConstructionEntries game={game} ids={matching} grouped={filter === 'new'} searching={!!query.trim()} onSelect={onSelect} /></div>
}

export function PlotPicker({ game, plot, onBuild }: { game: Game; plot: number; onBuild: (id: BuildingId, plot: number) => void }) {
  const candidates = BUILDING_IDS.filter(id => takesPlot(id) && game.placement[id] === null && plotFits(plot, id))
  return <div className="construction-register"><ConstructionIntro game={game} plot={plot} /><ConstructionEntries key={plot} game={game} ids={candidates} grouped plot={plot} onBuild={onBuild} /></div>
}
