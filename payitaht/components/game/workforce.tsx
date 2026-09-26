'use client'

/**
 * İŞ GÜCÜ KAYDIRICISI (Ikariam'daki işçi kutusu): solda boştaki halk, sağda
 * işçiler resimli durur. Kaydırıcı çekildikçe iki taraftaki sayı ve
 * üretimin nasıl değişeceği anında görünür; "Onayla" ile uygulanır.
 */
import { useEffect, useState, type ReactNode } from 'react'
import { Check, ChevronsLeft, ChevronsRight, Minus, Plus, Undo2 } from 'lucide-react'
import { Button } from '@/components/ui/button'

export type Figure = 'halk' | 'oduncu' | 'tasci' | 'alim' | 'esnaf' | 'madenci' | 'rahip'

const INK = '#2e1c0e'
const SKIN = '#e8b98a'
/** Ayakta duran küçük figür: başlık, cübbe ve elindeki alet mesleği anlatır. */
export function PersonArt({ kind, size = 64 }: { kind: Figure; size?: number }) {
  const look: Record<Figure, { robe: string; sash: string; hat: ReactNode; tool: ReactNode }> = {
    halk: { robe: '#4f7fa8', sash: '#e2bd78',
      hat: <path d="M23 13 l1.5 -8 h11 l1.5 8 Z" fill="#b3261e" stroke={INK} strokeWidth="1.2" />, tool: null },
    oduncu: { robe: '#7a5a34', sash: '#3f6a37',
      hat: <path d="M21 14 q9 -9 18 0 Z" fill="#5e3c22" stroke={INK} strokeWidth="1.2" />,
      tool: <g><path d="M44 30 L50 60" stroke="#6b4424" strokeWidth="3" strokeLinecap="round" /><path d="M41 27 q6 -6 10 1 l-6 5 Z" fill="#9aa3a8" stroke={INK} strokeWidth="1" /></g> },
    tasci: { robe: '#8d8878', sash: '#d9cfae',
      hat: <path d="M21 14 q9 -8 18 0 v1 h-18 Z" fill="#e6dccb" stroke={INK} strokeWidth="1.2" />,
      tool: <g><path d="M45 34 L50 58" stroke="#6b4424" strokeWidth="3" strokeLinecap="round" /><rect x="40" y="29" width="12" height="7" rx="1" fill="#7c8388" stroke={INK} strokeWidth="1" /><rect x="6" y="62" width="12" height="8" fill="#d9c7a1" stroke={INK} strokeWidth="1" /></g> },
    alim: { robe: '#3f6a4f', sash: '#e2bd78',
      hat: <g><ellipse cx="30" cy="11" rx="11" ry="7" fill="#fbf6e6" stroke={INK} strokeWidth="1.2" /><path d="M22 10 q8 4 16 0" stroke="#c9bfa4" fill="none" /></g>,
      tool: <g><rect x="40" y="40" width="13" height="10" rx="1" fill="#8a3a2a" stroke={INK} strokeWidth="1" /><path d="M46.5 40 v10" stroke="#e2bd78" /></g> },
    esnaf: { robe: '#a8412f', sash: '#e2bd78',
      hat: <path d="M23 13 l1.5 -8 h11 l1.5 8 Z" fill="#6b2a1e" stroke={INK} strokeWidth="1.2" />,
      tool: <g><path d="M47 36 v14 M40 40 h14" stroke="#6b4424" strokeWidth="1.6" /><path d="M38 40 l2 6 h-4 Z M52 40 l2 6 h-4 Z" fill="#e2bd78" stroke={INK} strokeWidth="0.8" /></g> },
    madenci: { robe: '#5a5048', sash: '#b08a4a',
      hat: <g><path d="M20 15 q10 -12 20 0 Z" fill="#b08a4a" stroke={INK} strokeWidth="1.2" /><circle cx="30" cy="8" r="2.4" fill="#f5d27a" stroke={INK} strokeWidth="0.8" /></g>,
      tool: <g><path d="M45 30 L50 60" stroke="#6b4424" strokeWidth="3" strokeLinecap="round" /><path d="M36 30 q10 -8 18 2" stroke="#7c8388" strokeWidth="3.4" fill="none" strokeLinecap="round" /></g> },
    rahip: { robe: '#2f3a4a', sash: '#fbf6e6',
      hat: <g><ellipse cx="30" cy="11" rx="10" ry="6.5" fill="#fbf6e6" stroke={INK} strokeWidth="1.2" /><path d="M30 4 v-2" stroke="#3f6a4f" strokeWidth="2" /></g>,
      tool: <g>{[0, 1, 2, 3, 4, 5, 6].map(i => <circle key={i} cx={43 + Math.sin(i * 0.9) * 3} cy={40 + i * 2.4} r="1.3" fill="#8a5a22" />)}</g> },
  }
  const L = look[kind]
  return <svg viewBox="0 0 60 80" width={size} height={size * 80 / 60} aria-hidden="true" className="person-art">
    <ellipse cx="30" cy="76" rx="16" ry="3.5" fill="#000" opacity="0.18" />
    <path d="M16 74 q-2 -30 6 -44 h16 q8 14 6 44 Z" fill={L.robe} stroke={INK} strokeWidth="1.2" strokeLinejoin="round" />
    <path d="M18 50 h24" stroke={L.sash} strokeWidth="4" />
    <path d="M22 31 q-8 8 -7 22 M38 31 q8 8 7 22" stroke={L.robe} strokeWidth="6" fill="none" strokeLinecap="round" />
    <path d="M22 31 q-8 8 -7 22 M38 31 q8 8 7 22" stroke={INK} strokeWidth="0.8" fill="none" opacity="0.5" />
    <circle cx="15.5" cy="54" r="3" fill={SKIN} stroke={INK} strokeWidth="0.8" />
    <circle cx="45.5" cy="54" r="3" fill={SKIN} stroke={INK} strokeWidth="0.8" />
    <path d="M26 30 l4 7 l4 -7" fill="#f6ecd6" stroke={INK} strokeWidth="0.8" />
    <circle cx="30" cy="21" r="8.5" fill={SKIN} stroke={INK} strokeWidth="1.2" />
    <path d="M24 24 q6 7 12 0 q-2 6 -6 6 q-4 0 -6 -6 Z" fill="#4a2e1a" opacity={kind === 'halk' || kind === 'esnaf' ? 0 : 0.85} />
    <circle cx="27" cy="20" r="0.9" fill={INK} /><circle cx="33" cy="20" r="0.9" fill={INK} />
    {L.hat}
    {L.tool}
  </svg>
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
          {changed && Math.abs(delta) > 0.001 && <em className={delta > 0 ? 'is-up' : 'is-down'}>{delta > 0 ? '+' : '−'}{Math.abs(delta) >= 10 ? Math.round(Math.abs(delta)) : Math.abs(delta).toFixed(1)}</em>}</div>
        <input type="range" min={0} max={Math.max(1, cap)} value={d} disabled={cap === 0} aria-label={`${label} sayısı`}
          style={{ ['--fill' as string]: `${cap ? (d / cap) * 100 : 0}%`, ['--limit' as string]: `${cap ? (max / cap) * 100 : 0}%` }}
          onChange={e => set(Number(e.target.value))} />
        <div className="workforce-steps">
          <button type="button" aria-label="Hepsini çek" disabled={d <= 0} onClick={() => set(0)}><ChevronsLeft /></button>
          <button type="button" aria-label="Bir azalt" disabled={d <= 0} onClick={() => set(d - 1)}><Minus /></button>
          <span className="workforce-count">{d} / {cap}</span>
          <button type="button" aria-label="Bir artır" disabled={d >= max} onClick={() => set(d + 1)}><Plus /></button>
          <button type="button" aria-label="Doldur" disabled={d >= max} onClick={() => set(max)}><ChevronsRight /></button>
        </div>
      </div>
      <div className="workforce-side is-worker">
        <PersonArt kind={figure} size={46} />
        <strong>{d}</strong><small>{label}</small>
      </div>
    </div>
    {changed && <div className="workforce-confirm">
      <Button size="sm" onClick={() => onCommit(d)}><Check data-icon="inline-start" />Onayla</Button>
      <Button size="sm" variant="outline" onClick={() => setDraft(value)}><Undo2 data-icon="inline-start" />Geri al</Button>
    </div>}
    {note && <p className="workforce-note">{note}</p>}
  </div>
}
