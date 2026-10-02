'use client'

import { ChevronRight, Gift, ScrollText } from './ui-art'
import { flyGoods } from '@/lib/fx'
import { OBJECTIVES, objectiveDone, type Game } from '@/lib/game/engine'

/**
 * SIRADAKİ HEDEF ŞERİDİ — şehir ekranında yeni oyuncuya yol gösterir.
 * Hedef bitince altın renge döner ve "Ödülü al" der; bütün hedefler
 * tamamlanınca kaybolur. Metne dokunmak Görevler sayfasını açar.
 */
export function QuestChip({ game, onOpen, onGo, onClaim }: { game: Game; onOpen: () => void; onGo: () => void; onClaim: (id: string) => void }) {
  const next = OBJECTIVES.find(o => !game.claimed.includes(o.id))
  if (!next) return null
  const done = objectiveDone(game, next.id)
  const step = OBJECTIVES.indexOf(next) + 1
  return <div className={`quest-chip${done ? ' is-done' : ''}`}>
    <button type="button" className="quest-chip-main" onClick={onOpen} aria-label={`Sıradaki hedef ${step}/${OBJECTIVES.length}: ${next.description}. Görevleri aç`}>
      <span className="quest-chip-icon" aria-hidden="true">{done ? <Gift /> : <ScrollText />}</span>
      <span className="quest-chip-text"><small>Hedef {step}/{OBJECTIVES.length}{done ? ' · tamam!' : ` · ${next.title}`}</small><strong>{next.description}</strong></span>
    </button>
    <button type="button" className="quest-chip-go" onClick={e => { if (done) { flyGoods(e.currentTarget, { gold: next.reward }); onClaim(next.id) } else onGo() }}>
      {done ? 'Ödülü al' : 'Git'}{!done && <ChevronRight aria-hidden="true" />}
    </button>
  </div>
}
