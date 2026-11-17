'use client'

import { ChevronRight, Gift, Hammer, ScrollText } from './ui-art'
import { flyGoods } from '@/lib/fx'
import { BUILDINGS, GUIDED_STEPS, OBJECTIVES, timeLeft, type BuildingId, type Game } from '@/lib/game/engine'
import { firstSessionStep } from '@/lib/game/first-session'
import { t } from '@/lib/i18n/tr'

export function QuestChip({ game, onOpen, onGo, onClaim, placement, onCancelPlacement }: {
  game: Game
  onOpen: () => void
  onGo: (id: string) => void
  onClaim: (id: string) => void
  placement: BuildingId | null
  onCancelPlacement: () => void
}) {
  const next = OBJECTIVES.find(objective => !game.claimed.includes(objective.id))
  if (!next) return null
  const guided = firstSessionStep(game)
  const done = next.done(game)
  const index = OBJECTIVES.indexOf(next)
  const title = placement ? `${BUILDINGS[placement].name} için arsa seç` : guided?.title ?? next.description
  const caption = placement ? 'Haritadaki işaretli arsalardan birine dokun.'
    : done ? `Tamamlandı · +${next.reward} akçe`
    : guided?.status ?? (guided ? `İlk adımlar · ${index + 1}/${GUIDED_STEPS}` : next.title)
  const action = placement ? t.action.cancel : done ? 'Ödülü al' : guided?.job ? 'İncele' : guided?.action ?? 'Göreve git'
  const Icon = placement ? Hammer : done ? Gift : ScrollText

  return <aside className={`quest-chip${guided ? ' is-guided' : ''}${done ? ' is-done' : ''}${placement ? ' is-placing' : ''}`} aria-label="Sıradaki hedef">
    <button type="button" className="quest-chip-main" onClick={onOpen} aria-label={`${title}. Görev defterini aç`}>
      <span className="quest-chip-icon" aria-hidden="true"><Icon /></span>
      <span className="quest-chip-text">
        <strong>{title}</strong>
        <small>{caption}{guided?.job && <> · <time>{timeLeft(guided.job, game.updatedAt)}</time></>}</small>
      </span>
    </button>
    <button type="button" className="quest-chip-go" onClick={event => {
      if (placement) onCancelPlacement()
      else if (done) { flyGoods(event.currentTarget, { gold: next.reward }); onClaim(next.id) }
      else onGo(next.id)
    }}>
      {action}{!placement && !done && <ChevronRight aria-hidden="true" />}
    </button>
  </aside>
}
