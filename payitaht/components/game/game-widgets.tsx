'use client'

import { Hint } from './hint'
import { Hammer, Check, ArrowUpRight, Sparkles, TriangleAlert, Landmark, Swords, Handshake, LockKeyhole, Pickaxe } from 'lucide-react'
import type { ComponentType, SVGProps } from 'react'
import { AkceArt, IlimArt, KeresteArt, KristalArt, KukurtArt, MermerArt, TasArt, UzumArt } from './resource-art'
import { Progress } from '@/components/ui/progress'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { LUXURY_IDS, LUXURY_NAMES, luxuryRates, type Luxury, type LuxuryStock } from '@/lib/game/engine'
import { BUILDINGS, RESEARCH, RESOURCE_IDS, RESOURCE_NAMES, OBJECTIVES, activeJob, rates, capacity, fullResources, nearlyFullResources, formatNumber, population, soldiers, timeLeft, objectiveDone, type Game, type Resource, type Job, type BuildingId, type ResearchId } from '@/lib/game/engine'

type ArtIcon = ComponentType<SVGProps<SVGSVGElement>>
export const resourceIcons: Record<Resource, ArtIcon> = { gold: AkceArt, wood: KeresteArt, stone: TasArt, knowledge: IlimArt }
export const luxuryIcons: Record<Luxury, ArtIcon> = { uzum: UzumArt, mermer: MermerArt, kristal: KristalArt, kukurt: KukurtArt }
export function ResourceBar({ game, onSelect }: { game: Game; onSelect: () => void }) {
  const production = rates(game)
  const full = fullResources(game)
  const nearly = nearlyFullResources(game)
  return <section className="resource-bar" aria-label="Şehir kaynakları">{RESOURCE_IDS.map(id => {
    const Icon = resourceIcons[id]
    const isFull = full.includes(id)
    const isNearly = nearly.includes(id)
    /*
     * Dolu ambar, uretimin BOSA GITTIGI tek durumdur; bu yuzden sayinin
     * yaninda bir uyari isareti ve okunabilir bir aria metni verilir.
     * Dolmaya yakin olan yalnizca renkle uyarilir - erken panik yaratmadan.
     */
    return <button key={id} className={cn(`resource resource-${id}`, isFull && 'resource-full', isNearly && 'resource-nearly')} onClick={onSelect}
      aria-label={`${RESOURCE_NAMES[id]}: ${formatNumber(game.resources[id])}, dakikada ${formatNumber(production[id])}${isFull ? '. Ambar dolu, üretim boşa gidiyor' : isNearly ? '. Ambar dolmak üzere' : ''}`}>
      <span className="resource-symbol">{isFull ? <TriangleAlert aria-hidden="true" /> : <Icon aria-hidden="true" />}</span>
      {/* Uretim TAM SAYIYA yuvarlanir: yuvarlanmamis ondalik "+16.3637484..." gibi tasiyordu. */}
      <span className="resource-copy"><span className="resource-name">{RESOURCE_NAMES[id]}</span><strong>{formatNumber(game.resources[id])}</strong><span className="resource-rate">{isFull ? 'Ambar dolu' : <>+{formatNumber(production[id])}<span>/dk</span></>}</span></span>
    </button>
  })}<button className="resource resource-population" onClick={onSelect} aria-label={`Nüfus: ${formatNumber(population(game))}`}>
    <span className="resource-symbol"><Landmark aria-hidden="true" /></span>
    <span className="resource-copy"><span className="resource-name">Nüfus</span><strong>{formatNumber(population(game))}</strong><span className="resource-rate">Halk</span></span>
  </button></section>
}
export function CostDisplay({ value, lux }: { value: Partial<Record<Resource, number>>; lux?: Partial<LuxuryStock> }) {
  return <div className="cost-display">{RESOURCE_IDS.filter(id => (value[id] ?? 0) > 0).map(id => { const Icon = resourceIcons[id]; return <span key={id} title={RESOURCE_NAMES[id]}><Icon aria-hidden="true" /><span className="sr-only">{RESOURCE_NAMES[id]}: </span>{formatNumber(value[id] ?? 0)}</span> })}
    {lux && LUXURY_IDS.filter(id => (lux[id] ?? 0) > 0).map(id => { const Icon = luxuryIcons[id]; return <span key={id} className="cost-luxury" title={LUXURY_NAMES[id]}><Icon aria-hidden="true" /><span className="sr-only">{LUXURY_NAMES[id]}: </span>{formatNumber(lux[id] ?? 0)}</span> })}</div>
}
export function JobProgress({ job, now }: { job: Job; now: number }) {
  return <div className="job-progress"><div><span>{job.kind === 'build' ? 'Ustalar çalışıyor' : job.kind === 'research' ? 'Âlimler çalışıyor' : 'Talim meydanı dolu'}</span><time>{timeLeft(job, now)}</time></div><Progress aria-label="Tamamlanma" value={Math.max(0, Math.min(100, (now - job.start) / (job.end - job.start) * 100))} /></div>
}
export function QueueCard({ game, kind, onClick }: { game: Game; kind: 'build' | 'research'; onClick: () => void }) {
  const job = kind === 'build' ? activeJob(game) : game.study
  const waiting = kind === 'build' ? Math.max(0, game.queue.length - 1) : 0
  const Icon = kind === 'build' ? Hammer : IlimArt
  const title = job ? kind === 'build' ? BUILDINGS[job.id as BuildingId].name : RESEARCH[job.id as ResearchId].name : kind === 'build' ? 'Ustaların hazır' : 'Bilgiyi keşfet'
  return <button className="queue-card" onClick={onClick}><span className="queue-icon"><Icon aria-hidden="true" /></span><span className="queue-copy"><span className="eyebrow">{kind === 'build' ? 'İNŞAAT' : 'ARAŞTIRMA'}</span><strong>{title}</strong>{job ? <span className="queue-meter"><span style={{ width: `${Math.min(100, (game.updatedAt - job.start) / (job.end - job.start) * 100)}%` }} /></span> : <span className="queue-hint">{kind === 'build' ? 'Şehrini geliştirmeye başla' : 'Medresede yeni bir ufuk'}</span>}</span>{job ? <span className="queue-right">{waiting > 0 && <span className="queue-waiting" title={`Sırada ${waiting} iş daha`}>+{waiting}</span>}<time>{timeLeft(job, game.updatedAt)}</time></span> : <ArrowUpRight className="queue-arrow" aria-hidden="true" />}</button>
}
export function ObjectiveCard({ game, onClaim, onBuild }: { game: Game; onClaim: (id: string) => void; onBuild: () => void }) {
  const objective = OBJECTIVES.find(o => !game.claimed.includes(o.id))
  const ready = OBJECTIVES.filter(o => !game.claimed.includes(o.id) && objectiveDone(game, o.id))
  const list = <details className="objective-list">
    <summary>Bütün adımlar · {game.claimed.length}/{OBJECTIVES.length}</summary>
    <ol>{OBJECTIVES.map(o => {
      const got = game.claimed.includes(o.id), done = objectiveDone(game, o.id)
      return <li key={o.id} className={got ? 'is-got' : done ? 'is-ready' : o.id === objective?.id ? 'is-current' : ''}>
        <span className="objective-mark" aria-hidden="true">{got ? '✓' : done ? '!' : '·'}</span>
        <span><strong>{o.title}</strong><small>{o.description}</small></span>
        {!got && done ? <Button size="sm" onClick={() => onClaim(o.id)}>{o.reward}</Button> : <small className="objective-reward">{o.reward} akçe</small>}
      </li>
    })}</ol>
  </details>
  if (!objective) return <section className="objective-card"><span className="eyebrow"><Check className="size-3" /> BAŞLANGIÇ TAMAMLANDI</span><h3>Bir şehirden fazlası.</h3><p>Tüm hedefleri tamamladın. Şimdi şehrini büyütmeye devam et.</p>{list}</section>
  const done = objectiveDone(game, objective.id)
  return <section className="objective-card"><div className="objective-heading"><span className="eyebrow"><Sparkles className="size-3" /> SIRADAKİ HEDEF</span><span>{game.claimed.length + 1} / {OBJECTIVES.length}</span></div>
    <span className="objective-track" aria-hidden="true"><span style={{ width: `${(game.claimed.length / OBJECTIVES.length) * 100}%` }} /></span>
    <h3>{objective.title}</h3><p>{objective.description}</p>
    <div className="objective-footer"><span><AkceArt className="size-4" /> {objective.reward} akçe</span>
      <Button size="sm" variant={done ? 'default' : 'outline'} onClick={() => done ? onClaim(objective.id) : onBuild()}>{done ? 'Ödülü al' : 'Hedefe git'}<ArrowUpRight data-icon="inline-end" /></Button></div>
    {ready.length > 1 && <Button size="sm" variant="outline" className="objective-all" onClick={() => ready.forEach(o => onClaim(o.id))}><Check data-icon="inline-start" />Tamamlanan {ready.length} adımın ödülünü al ({ready.reduce((s, o) => s + o.reward, 0)} akçe)</Button>}
    {list}
  </section>
}
export function EconomyDetails({ game }: { game: Game }) {
  const production = rates(game)
  const luxRates = luxuryRates(game)
  const limit = capacity(game)
  const full = fullResources(game)
  return <div className="economy-list">
    {full.length > 0 && <p className="storage-alert" role="status"><TriangleAlert className="size-4" />{full.map(id => RESOURCE_NAMES[id]).join(', ')} ambarı dolu. Üretim boşa gidiyor — Ambar’ı yükselt ya da harca.</p>}
    {RESOURCE_IDS.map(id => {
      const Icon = resourceIcons[id]
      const ratio = Math.min(1, game.resources[id] / limit)
      return <div className={cn('economy-item', full.includes(id) && 'economy-item-full')} key={id}>
        <Icon className="size-6" />
        <div>
          <strong>{RESOURCE_NAMES[id]}</strong>
          <span>{formatNumber(game.resources[id])} / {formatNumber(limit)}</span>
          <span className="storage-meter"><span style={{ width: `${ratio * 100}%` }} /></span>
        </div>
        <span>+{production[id]}/dk</span>
      </div>
    })}
    {LUXURY_IDS.map(id => {
      const Icon = luxuryIcons[id]
      const ratio = Math.min(1, game.luxury[id] / limit)
      const rate = Math.round(luxRates[id] * 10) / 10
      return <div className="economy-item economy-luxury" key={id}>
        <Icon className="size-6" />
        <div>
          <strong>{LUXURY_NAMES[id]}{game.mine.specialty === id ? ' · ada yatağı' : ''}</strong>
          <span>{formatNumber(game.luxury[id])} / {formatNumber(limit)}</span>
          <span className="storage-meter"><span style={{ width: `${ratio * 100}%` }} /></span>
        </div>
        <span>{rate >= 0 ? '+' : ''}{rate}/dk</span>
      </div>
    })}
    <Hint>Prototipte süreler kısaltılmıştır. Oyun kapalıyken en fazla 8 saat üretim hesaplanır. Dolan ambarlarda üretim durur.</Hint>
  </div>
}

/**
 * DANISMAN CUBUGU.
 *
 * Ikariam'da ekranin sag ustunde dort danisman basi durur ve her biri bir
 * yonetim ekrani acar. Burada ayni dort sekme, kaynak cubugunun hemen altinda.
 *
 * Kilitli bir sekme GIZLENMEZ, sonuk gorunur ve dokununca gereken yapiyi
 * soyler: oyuncunun hedefi gormesi, ozelligin yoklugundan daha iyidir.
 * Rozet, o danismanin ilgilendigi bir isin SURDUGUNU gosterir - sayfanin
 * derinlerine bakmadan.
 */
export function AdvisorBar({ game, active, onSelect }: { game: Game; active: string | null; onSelect: (id: 'cities' | 'army' | 'research' | 'diplomacy' | 'island') => void }) {
  const advisors = [
    { id: 'island' as const, label: 'Ada', icon: Pickaxe, open: true, badge: game.luxury[game.mine.specialty] >= 1 ? formatNumber(Math.floor(game.luxury[game.mine.specialty])) : null },
    { id: 'cities' as const, label: 'Şehirler', icon: Landmark, open: true, badge: activeJob(game) ? timeLeft(activeJob(game) as Job, game.updatedAt) : null },
    { id: 'army' as const, label: 'Ordu', icon: Swords, open: game.buildings.kisla > 0, badge: game.drills[0] ? timeLeft(game.drills.reduce((a, b) => (a.end < b.end ? a : b)), game.updatedAt) : soldiers(game) > 0 ? String(soldiers(game)) : null },
    { id: 'research' as const, label: 'Araştırma', icon: IlimArt, open: game.buildings.medrese > 0, badge: game.study ? timeLeft(game.study, game.updatedAt) : null },
    { id: 'diplomacy' as const, label: 'Dünya', icon: Handshake, open: true, badge: null },
  ]
  return <nav className="advisor-bar" aria-label="Danışmanlar">{advisors.map(advisor => {
    const Icon = advisor.icon
    return <button key={advisor.id} className={cn('advisor', !advisor.open && 'advisor-locked', active === advisor.id && 'advisor-active')}
      aria-current={active === advisor.id ? 'page' : undefined}
      aria-label={`${advisor.label} danışmanı${advisor.open ? '' : ', henüz açılmadı'}`}
      onClick={() => onSelect(advisor.id)}>
      <span className="advisor-head">{advisor.open ? <Icon aria-hidden="true" /> : <LockKeyhole aria-hidden="true" />}</span>
      <span className="advisor-label">{advisor.label}</span>
      {advisor.badge && <span className="advisor-badge">{advisor.badge}</span>}
    </button>
  })}</nav>
}
