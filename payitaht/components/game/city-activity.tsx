'use client'

import { useState } from 'react'
import { BookOpen, ChevronDown, Hammer, Swords, ScrollText, Check } from 'lucide-react'
import { cityActivities, activityTime } from './city-activity-model'
import { OBJECTIVES, objectiveDone, type BuildingId, type Game } from '@/lib/game/engine'
import { buildingImage } from '@/lib/asset'

const icons = { build: Hammer, research: BookOpen, drill: Swords }

export function CityActivityHud({ game, onBuilding, onResearch, onObjectives }: {
  game: Game; onBuilding: (id: BuildingId) => void; onResearch: () => void
  onObjectives: () => void
}) {
  const [expanded, setExpanded] = useState(false)
  const activities = cityActivities(game)
  const active = activities.filter(a => !a.waiting)
  const first = activities[0]
  const objective = OBJECTIVES.find(o => !game.claimed.includes(o.id))
  const ready = objective ? objectiveDone(game, objective.id) : false
  return <>
    <section className="city-activity" aria-label="Şehir faaliyetleri">
      <button type="button" className="activity-summary" aria-expanded={expanded} aria-controls="city-activity-list" onClick={() => setExpanded(v => !v)}>
        <span className="activity-seal"><Hammer aria-hidden="true" /></span>
        <span className="activity-summary-copy"><strong>{first ? first.title : 'Şehrin seni bekliyor'}</strong>
          <small>{first ? `${active.length} etkin · ${activities.length - active.length} sırada` : 'İnşaat, ilim ve talim'}</small></span>
        {first && <time>{activityTime(first.job.end - game.updatedAt)}</time>}
        <ChevronDown className={expanded ? 'activity-chevron-open' : ''} aria-hidden="true" />
      </button>
      {expanded && <div className="activity-list" id="city-activity-list">
        {activities.length === 0 && <p>Ustalar yeni emrini bekliyor. Divanhaneyi geliştirerek şehrini büyüt.</p>}
        {activities.map(a => { const Icon = icons[a.kind]; return <button type="button" className="activity-row" key={a.key}
          onClick={() => a.kind === 'research' ? onResearch() : onBuilding(a.building)}>
          <img src={buildingImage(a.building, Math.max(1, game.buildings[a.building]))} alt="" width={44} height={44} />
          <span className="activity-copy"><strong>{a.title}</strong><small><Icon aria-hidden="true" />{a.detail}</small>
            <span className="activity-meter" role="progressbar" aria-label={a.title} aria-valuenow={Math.floor(a.progress)} aria-valuemin={0} aria-valuemax={100}>
              <span style={{ width: `${a.progress}%` }} /></span></span>
          <time aria-label={a.waiting ? 'Başlamasına kalan süre' : 'Tamamlanmasına kalan süre'}>{activityTime((a.waiting ? a.job.start : a.job.end) - game.updatedAt)}{a.waiting && <small>başlar</small>}</time>
        </button> })}
        <div className="activity-shortcuts"><button type="button" onClick={() => onBuilding('divan')}>Divanhane</button><button type="button" onClick={onResearch}>Araştırma</button><button type="button" onClick={() => onBuilding('kisla')}>Kışla</button></div>
      </div>}
    </section>
    {objective && <button type="button" className={`city-quest${ready ? ' city-quest-ready' : ''}`} onClick={onObjectives}>
      <span className="quest-seal">{ready ? <Check aria-hidden="true" /> : <ScrollText aria-hidden="true" />}</span>
      <span><small>{ready ? 'ÖDÜLÜN HAZIR' : 'SIRADAKİ HEDEF'}</small><strong>{objective.title}</strong></span>
      <b>+{objective.reward}<small>akçe</small></b>
    </button>}
  </>
}
