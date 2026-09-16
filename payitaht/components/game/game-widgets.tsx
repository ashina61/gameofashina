'use client'

import { Coins, Trees, Mountain, BookOpen, Hammer, Check, ArrowUpRight, Sparkles } from 'lucide-react'
import { Progress } from '@/components/ui/progress'
import { Button } from '@/components/ui/button'
import { BUILDINGS, RESEARCH, RESOURCE_IDS, RESOURCE_NAMES, OBJECTIVES, rates, capacity, formatNumber, timeLeft, objectiveDone, type Game, type Resource, type Job, type BuildingId, type ResearchId } from '@/lib/game/engine'

export const resourceIcons = { gold: Coins, wood: Trees, stone: Mountain, knowledge: BookOpen }
export function ResourceBar({ game, onSelect }: { game: Game; onSelect: () => void }) {
  const production = rates(game)
  return <section className="resource-bar" aria-label="Şehir kaynakları">{RESOURCE_IDS.map(id => {
    const Icon = resourceIcons[id]
    return <button key={id} className={`resource resource-${id}`} onClick={onSelect} aria-label={`${RESOURCE_NAMES[id]}: ${formatNumber(game.resources[id])}, dakikada ${production[id]}`}>
      <span className="resource-symbol"><Icon aria-hidden="true" /></span>
      <span className="resource-copy"><span className="resource-name">{RESOURCE_NAMES[id]}</span><strong>{formatNumber(game.resources[id])}</strong><span className="resource-rate">+{production[id]}<span>/dk</span></span></span>
    </button>
  })}</section>
}
export function CostDisplay({ value }: { value: Partial<Record<Resource, number>> }) {
  return <div className="cost-display">{RESOURCE_IDS.filter(id => (value[id] ?? 0) > 0).map(id => { const Icon = resourceIcons[id]; return <span key={id} title={RESOURCE_NAMES[id]}><Icon aria-hidden="true" /><span className="sr-only">{RESOURCE_NAMES[id]}: </span>{formatNumber(value[id] ?? 0)}</span> })}</div>
}
export function JobProgress({ job, now }: { job: Job; now: number }) {
  return <div className="job-progress"><div><span>{job.kind === 'build' ? 'Ustalar çalışıyor' : 'Âlimler çalışıyor'}</span><time>{timeLeft(job, now)}</time></div><Progress aria-label="Tamamlanma" value={Math.max(0, Math.min(100, (now - job.start) / (job.end - job.start) * 100))} /></div>
}
export function QueueCard({ game, kind, onClick }: { game: Game; kind: 'build' | 'research'; onClick: () => void }) {
  const job = kind === 'build' ? game.construction : game.study
  const Icon = kind === 'build' ? Hammer : BookOpen
  const title = job ? kind === 'build' ? BUILDINGS[job.id as BuildingId].name : RESEARCH[job.id as ResearchId].name : kind === 'build' ? 'Ustaların hazır' : 'Bilgiyi keşfet'
  return <button className="queue-card" onClick={onClick}><span className="queue-icon"><Icon aria-hidden="true" /></span><span className="queue-copy"><span className="eyebrow">{kind === 'build' ? 'İNŞAAT' : 'ARAŞTIRMA'}</span><strong>{title}</strong>{job ? <span className="queue-meter"><span style={{ width: `${Math.min(100, (game.updatedAt - job.start) / (job.end - job.start) * 100)}%` }} /></span> : <span className="queue-hint">{kind === 'build' ? 'Şehrini geliştirmeye başla' : 'Medresede yeni bir ufuk'}</span>}</span>{job ? <time>{timeLeft(job, game.updatedAt)}</time> : <ArrowUpRight className="queue-arrow" aria-hidden="true" />}</button>
}
export function ObjectiveCard({ game, onClaim, onBuild }: { game: Game; onClaim: (id: string) => void; onBuild: () => void }) {
  const objective = OBJECTIVES.find(o => !game.claimed.includes(o.id))
  if (!objective) return <section className="objective-card"><span className="eyebrow"><Check className="size-3" /> BAŞLANGIÇ TAMAMLANDI</span><h3>Bir şehirden fazlası.</h3><p>Tüm hedefleri tamamladın. Şimdi şehrini büyütmeye devam et.</p></section>
  const done = objectiveDone(game, objective.id)
  return <section className="objective-card"><div className="objective-heading"><span className="eyebrow"><Sparkles className="size-3" /> SIRADAKİ HEDEF</span><span>{game.claimed.length + 1} / 3</span></div><h3>{objective.title}</h3><p>{objective.description}</p><div className="objective-footer"><span><Coins className="size-4" /> {objective.reward} akçe</span><Button size="sm" variant={done ? 'default' : 'outline'} onClick={() => done ? onClaim(objective.id) : onBuild()}>{done ? 'Ödülü al' : 'Hedefe git'}<ArrowUpRight data-icon="inline-end" /></Button></div></section>
}
export function EconomyDetails({ game }: { game: Game }) {
  const production = rates(game)
  return <div className="economy-list">{RESOURCE_IDS.map(id => { const Icon = resourceIcons[id]; return <div className="economy-item" key={id}><Icon className="size-6" /><div><strong>{RESOURCE_NAMES[id]}</strong><span>{formatNumber(game.resources[id])} / {formatNumber(capacity(game))}</span></div><span>+{production[id]}/dk</span></div> })}<p className="fine-print">Prototipte süreler kısaltılmıştır. Oyun kapalıyken en fazla 8 saat üretim hesaplanır. Dolan ambarlarda üretim durur.</p></div>
}
