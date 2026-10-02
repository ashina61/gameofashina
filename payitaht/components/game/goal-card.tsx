/**
 * HEDEF KARTI (V2 Faz 2.8) — günlük görev, büyük hedef ve ittifak görevi aynı
 * kartı kullanır: solda görsel (bina, görev çizimi), ortada ad + kalın
 * ilerleme çubuğu, altında ödül sandığı ve boyalı ödül jetonları, en altta
 * tek büyük düğme. Ödül hazırken sandık sallanır.
 */
import type { ReactNode } from 'react'
import { Gift } from './ui-art'
import { GameButton } from './game-button'
import { Meter } from './stat-kit'
import { GOOD_NAMES, LUXURY_IDS, formatNumber, type Good, type Luxury, type Resource } from '@/lib/game/engine'
import { luxuryIcons, resourceIcons } from './game-widgets'

export type GoalState = 'run' | 'ready' | 'done'

export function RewardTokens({ reward, extra }: { reward: Partial<Record<Good, number>>; extra?: ReactNode }) {
  return <span className="goal-reward">
    <span className="goal-chest" aria-hidden="true"><Gift /></span>
    {(Object.entries(reward) as [Good, number][]).map(([g, n]) => {
      const Icon = (LUXURY_IDS as readonly string[]).includes(g) ? luxuryIcons[g as Luxury] : resourceIcons[g as Resource]
      return <span key={g} className="goal-token"><Icon aria-hidden="true" /><b>{formatNumber(n)}</b><span className="sr-only">{GOOD_NAMES[g]}</span></span>
    })}
    {extra}
  </span>
}

export function GoalCard({ art, title, text, value, need, reward, state, onClaim, claim = 'Ödülü al' }: {
  art: ReactNode; title: ReactNode; text?: ReactNode; value: number; need: number
  reward: ReactNode; state: GoalState; onClaim: () => void; claim?: string
}) {
  return <article className={`goal-card is-${state}`}>
    <span className="goal-art" aria-hidden="true">{art}</span>
    <span className="goal-body">
      <strong>{title}</strong>
      {text && <small>{text}</small>}
      <Meter value={Math.min(value, need)} max={need} label={`İlerleme: ${formatNumber(Math.min(value, need))} / ${formatNumber(need)}`} tone={state === 'run' ? undefined : 'full'} />
      {reward}
    </span>
    <GameButton size="sm" variant={state === 'ready' ? 'default' : 'outline'} disabled={state !== 'ready'} onClick={onClaim}>
      {state === 'done' ? 'Alındı' : state === 'ready' ? claim : 'Sürüyor'}
    </GameButton>
  </article>
}
