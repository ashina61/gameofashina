'use client'
import { useId, type ReactNode } from 'react'
import { ApprovedArt } from './approved-court-art'

export function RoyalSection({ title, detail, children, art }: { title: string; detail?: string; children: ReactNode; art?: string }) {
  return <section className="royal-section royal-subsection"><header className="royal-section-heading">{art && <ApprovedArt name={art} />}<div><h3>{title}</h3>{detail && <p>{detail}</p>}</div></header>{children}</section>
}
export function RoyalMeter({ value, need, label }: { value: number; need: number; label: string }) {
  const current = Math.min(need, Math.max(0, value))
  return <div className="royal-meter"><div className="royal-progress" role="progressbar" aria-label={label} aria-valuemin={0} aria-valuemax={need} aria-valuenow={current}><i style={{ width: `${need > 0 ? current / need * 100 : 0}%` }} /></div><span>{Math.floor(current).toLocaleString('tr-TR')} / {Math.floor(need).toLocaleString('tr-TR')}</span></div>
}
export function RoyalToggle({ name, art, hint, checked, change }: { name: string; art: string; hint?: string; checked: boolean; change: (value: boolean) => void }) {
  const id = useId()
  return <label className="royal-preference royal-notice-row" htmlFor={id}><ApprovedArt name={art} /><span><strong>{name}</strong>{hint && <small>{hint}</small>}</span><span className="royal-switch"><input id={id} type="checkbox" role="switch" aria-label={name} checked={checked} onChange={event => change(event.target.checked)} /><span aria-hidden="true">{checked ? 'Açık' : 'Kapalı'}</span></span></label>
}
export function RoyalStatus({ art, title, children }: { art: string; title: string; children: ReactNode }) {
  return <div className="royal-status"><ApprovedArt name={art} /><span><small>{title}</small><strong>{children}</strong></span></div>
}
