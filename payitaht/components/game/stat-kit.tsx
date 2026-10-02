/**
 * DEĞER KİTİ (V2 Faz 1.5) — tabloların yerine geçen dört oyun bileşeni:
 *
 *   StatRow    simge madalyonu · ad · değer (+ değişim rozeti)
 *   Meter      kalın doluluk çubuğu, içinde "stok / sınır" yazılı
 *   NowNext    bir etkinin şimdiki ve sonraki seviyedeki değeri, okla
 *   CostTokens boyalı maliyet jetonları; eksik olan kızarır, altında "eksik N"
 */
import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { formatNumber } from '@/lib/game/engine'

export function StatRow({ icon, label, value, note, tone }: { icon: ReactNode; label: ReactNode; value: ReactNode; note?: ReactNode; tone?: 'up' | 'down' | 'idle' }) {
  return <div className={cn('sk-row', tone && `is-${tone}`)}>
    <span className="sk-medal" aria-hidden="true">{icon}</span>
    <span className="sk-label">{label}{note && <small>{note}</small>}</span>
    <b className="sk-value">{value}</b>
  </div>
}

export function Meter({ value, max, label, tone }: { value: number; max: number; label: string; tone?: 'ok' | 'warn' | 'full' }) {
  const ratio = max > 0 ? Math.max(0, Math.min(1, value / max)) : 0
  return <span className={cn('sk-meter', tone && `is-${tone}`)} role="meter" aria-valuemin={0} aria-valuemax={max} aria-valuenow={Math.floor(value)} aria-label={label}>
    <span style={{ width: `${ratio * 100}%` }} />
    <b>{formatNumber(value)} / {formatNumber(max)}</b>
  </span>
}

export function NowNext({ label, now, next, nowLabel, nextLabel }: { label: ReactNode; now: ReactNode; next?: ReactNode; nowLabel: string; nextLabel?: string }) {
  return <div className="sk-nn">
    <span className="sk-nn-label">{label}</span>
    <span className="sk-nn-values">
      <span className="sk-nn-now"><small>{nowLabel}</small><b>{now}</b></span>
      {next !== undefined && <>
        <span className="sk-nn-arrow" aria-hidden="true">➜</span>
        <span className="sk-nn-next"><small>{nextLabel}</small><b>{next}</b></span>
      </>}
    </span>
  </div>
}

export type CostItem = { key: string; icon: ReactNode; name: string; need: number; have: number }
export function CostTokens({ items, extra }: { items: CostItem[]; extra?: ReactNode }) {
  return <ul className="bp-costs sk-costs">{items.map(c => {
    const short = c.have < c.need
    return <li key={c.key} className={short ? 'bp-short' : undefined} title={c.name}>
      <span className="sk-token" aria-hidden="true">{c.icon}</span><span className="sr-only">{c.name}</span><strong>{formatNumber(c.need)}</strong>
      {short && <small>eksik {formatNumber(c.need - c.have)}</small>}
    </li>
  })}{extra}</ul>
}
