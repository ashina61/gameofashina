'use client'

/**
 * İŞ GÜCÜ KAYDIRICISI (Ikariam'daki işçi kutusu): solda boştaki halk, sağda
 * işçiler resimli durur. Kaydırıcı çekildikçe iki taraftaki sayı ve
 * üretimin nasıl değişeceği anında görünür; "Onayla" ile uygulanır.
 */
import { useEffect, useState, type ReactNode } from 'react'
import { ChevronsLeft, ChevronsRight, Minus, Plus } from './ui-art'
import { GameButton } from './game-button'
import { formatRate } from '@/lib/game/engine'
import { asset } from '@/lib/asset'
import { t } from '@/lib/i18n/tr'

export type Figure = 'halk' | 'oduncu' | 'tasci' | 'alim' | 'esnaf' | 'madenci' | 'rahip'

const FIGURE_FILE: Record<Figure, string> = {
  halk: 'people/citizen-figure', alim: 'people/scholar-figure',
  oduncu: 'production/lumberjack', esnaf: 'commerce/shopkeeper', rahip: 'devotion/imam',
  tasci: 'legacy-replacement/stonemason', madenci: 'legacy-replacement/miner',
}
/** The same full-body painted worker art is used in every labour ledger. */
export function PersonArt({ kind, size = 64 }: { kind: Figure; size?: number }) {
  return <img className="person-art person-figure" src={asset(`/images/game/ui/${FIGURE_FILE[kind]}.webp`)} alt="" width={size} height={size * 80 / 60} style={{ objectFit: 'contain' }} />
}

export function WorkforceSlider({ label, figure, value, cap, idle, preview, onCommit, note }: {
  label: string
  figure: Figure
  value: number
  cap: number
  idle: number
  /** Verilen işçi sayısında üretim (ör. <b>120 kereste/dk</b>) ve karşılaştırma için sayı. */
  preview: (n: number) => { amount: number; text: ReactNode; icon?: ReactNode }
  onCommit: (n: number) => void
  note?: ReactNode
}) {
  const [draft, setDraft] = useState(value)
  useEffect(() => setDraft(value), [value])
  const max = Math.min(cap, value + idle)
  const d = Math.max(0, Math.min(max, draft))
  const freeAfter = idle + value - d
  const now = preview(value), next = preview(d)
  const delta = next.amount - now.amount
  const changed = d !== value
  const set = (n: number) => setDraft(Math.max(0, Math.min(max, n)))
  return <div className="workforce">
    <div className="workforce-stage">
      <div className="workforce-side">
        <PersonArt kind="halk" size={46} />
        <strong>{freeAfter}</strong><small>Boştaki halk</small>
      </div>
      <div className="workforce-mid">
        <div className="workforce-out">{next.icon}<span>{next.text}</span>
          {changed && Math.abs(delta) > 0.001 && <em className={delta > 0 ? 'is-up' : 'is-down'}>{delta > 0 ? '+' : '−'}{Math.abs(delta) >= 10 ? Math.round(Math.abs(delta)) : formatRate(Math.abs(delta))}</em>}</div>
        <input type="range" min={0} max={Math.max(1, cap)} value={d} disabled={cap === 0} aria-label={`${label} sayısı`}
          style={{ ['--fill' as string]: `${cap ? (d / cap) * 100 : 0}%`, ['--limit' as string]: `${cap ? (max / cap) * 100 : 0}%` }}
          onChange={e => set(Number(e.target.value))} />
        <div className="workforce-steps">
          <button type="button" aria-label="Hepsini çek" disabled={d <= 0} onClick={() => set(0)}><ChevronsLeft /></button>
          <button type="button" aria-label={t.action.decrease} disabled={d <= 0} onClick={() => set(d - 1)}><Minus /></button>
          <span className="workforce-count">{d} / {cap}</span>
          <button type="button" aria-label={t.action.increase} disabled={d >= max} onClick={() => set(d + 1)}><Plus /></button>
          <button type="button" aria-label="Doldur" disabled={d >= max} onClick={() => set(max)}><ChevronsRight /></button>
        </div>
      </div>
      <div className="workforce-side is-worker">
        <PersonArt kind={figure} size={46} />
        <strong>{d}</strong><small>{label}</small>
      </div>
    </div>
    {changed && <div className="workforce-confirm">
      <GameButton size="sm" onClick={() => onCommit(d)}>{t.action.confirm}</GameButton>
      <GameButton size="sm" variant="outline" onClick={() => setDraft(value)}>Geri al</GameButton>
    </div>}
    {note && <p className="workforce-note">{note}</p>}
  </div>
}
