'use client'

import { Anchor, Check, ChevronRight } from './ui-art'
import { GameButton } from './game-button'
import type { ExpansionStep, ExpansionTarget } from '@/lib/game/expansion-plan'

export function ExpansionChip({ steps, onOpen, onGo }: {
  steps: ExpansionStep[]
  onOpen: () => void
  onGo: (target: ExpansionTarget) => void
}) {
  const next = steps.find(step => !step.done)
  if (!next) return null
  return <aside className="quest-chip is-guided is-expansion" aria-label="Denize açılma hedefi">
    <button type="button" className="quest-chip-main" onClick={onOpen} aria-label={`${next.title}. Gelişim planını aç`}>
      <span className="quest-chip-icon" aria-hidden="true"><Anchor /></span>
      <span className="quest-chip-text"><strong>{next.title}</strong><small>Denize açılma · {steps.filter(step => step.done).length}/{steps.length} tamamlandı</small></span>
    </button>
    <button type="button" className="quest-chip-go" onClick={() => onGo(next.target)}>{next.action}<ChevronRight aria-hidden="true" /></button>
  </aside>
}

export function ExpansionPlan({ steps, onGo }: { steps: ExpansionStep[]; onGo: (target: ExpansionTarget) => void }) {
  if (!steps.length) return null
  const next = steps.find(step => !step.done)
  const completed = steps.filter(step => step.done).length
  return <section className="expansion-plan" aria-label="İlk koloniye gelişim planı">
    <header><h3>{next ? 'Denize açılma' : 'Şehirlerin birbirini besliyor'}</h3><p>{next ? `${completed}/${steps.length} hazırlık tamamlandı` : 'İlk koloni planı tamamlandı. İmparatorluk nişanlarından yeni hedeflerini izleyebilirsin.'}</p></header>
    {next && <article className="expansion-current" aria-current="step"><h4>{next.title}</h4><p>{next.detail}</p><GameButton onClick={() => onGo(next.target)}>{next.action}<ChevronRight aria-hidden="true" /></GameButton></article>}
    <details><summary>Hazırlık adımları · {completed}/{steps.length}</summary>
    <ol>{steps.map(step => <li key={step.id} className={step.done ? 'is-done' : step === next ? 'is-current' : ''} aria-current={step === next ? 'step' : undefined}>
      <span className="expansion-step-mark" aria-hidden="true">{step.done ? <Check /> : <Anchor />}</span>
      <div><h4>{step.title}</h4>{!step.done && <p>{step.detail}</p>}
      </div>
    </li>)}</ol></details>
  </section>
}
