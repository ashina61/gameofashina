/**
 * OLAY ZAMAN ÇİZELGESİ (V2 Faz 2.2) — günlük satırları gün başlıkları
 * altında, her biri türüne göre boyalı simgeyle (çekiç, kılıç, gemi…).
 * Art arda aynı olay tek satırda "×n" rozetiyle (groupLog).
 */
import { groupLog, type Game } from '@/lib/game/engine'
import { dayGroups, logKind, type LogKind } from '@/lib/game/log-view'
import { BookOpen, Gift, Hammer, ScrollText, Ship, Sparkles, Swords } from './ui-art'

const ICON: Record<LogKind, typeof Swords> = { war: Swords, build: Hammer, research: BookOpen, trade: Ship, reward: Gift, faith: Sparkles, other: ScrollText }

export function EventTimeline({ log, now, limit = 20 }: { log: Game['log']; now: number; limit?: number }) {
  const groups = dayGroups(groupLog(log).slice(0, limit), now)
  if (!groups.length) return <p className="bp-note">Henüz bir olay yok.</p>
  return <div className="tl">{groups.map(g => <section key={g.label} className="tl-day">
    <h4 className="tl-day-head"><span>{g.label}</span></h4>
    <ol>{g.items.map((l, i) => {
      const kind = logKind(l.text), Icon = ICON[kind]
      return <li key={i} className={`tl-item is-${kind}`}>
        <span className="tl-icon" aria-hidden="true"><Icon /></span>
        <span className="tl-text">{l.text}{l.count > 1 && <b className="ika-events-count"> ×{l.count}</b>}</span>
        <time>{new Date(l.time).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}</time>
      </li>
    })}</ol>
  </section>)}</div>
}
