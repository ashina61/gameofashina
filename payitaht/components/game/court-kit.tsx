'use client'
import { useId, useRef, type ReactNode } from 'react'
import { asset } from '@/lib/asset'
import type { ScrollText } from './ui-art'

export function CourtTabs<K extends string>({ items, value, onChange, label, children, illustrated = true }: {
  items: readonly { id: K; label: string; Icon: typeof ScrollText; art?: string }[]; value: K; onChange: (value: K) => void; label: string; children: ReactNode; illustrated?: boolean
}) {
  const id = useId(), refs = useRef<(HTMLButtonElement | null)[]>([])
  return <><div className="court-tabs" role="tablist" aria-label={label}>{items.map((item, index) => <button key={item.id} type="button" ref={el => { refs.current[index] = el }} id={`${id}-${item.id}-tab`} role="tab" aria-selected={value === item.id} aria-controls={`${id}-${item.id}-body`} tabIndex={value === item.id ? 0 : -1}
    onClick={() => onChange(item.id)} onKeyDown={event => {
      const next = event.key === 'ArrowRight' ? (index + 1) % items.length : event.key === 'ArrowLeft' ? (index + items.length - 1) % items.length : event.key === 'Home' ? 0 : event.key === 'End' ? items.length - 1 : null
      if (next === null) return
      event.preventDefault(); onChange(items[next].id); refs.current[next]?.focus()
    }}>{illustrated && (item.art ? <img className="court-tab-art" src={asset(item.art)} alt="" /> : <item.Icon painted aria-hidden="true" />)}<span>{item.label}</span></button>)}</div><section className="court-tab-body" role="tabpanel" id={`${id}-${value}-body`} aria-labelledby={`${id}-${value}-tab`}>{children}</section></>
}
export function CourtBook({ title, detail, children }: { title: string; detail?: string; children: ReactNode }) {
  return <section className="court-book"><header className="court-book-heading"><span aria-hidden="true">✧</span><h3>{title}</h3><span aria-hidden="true">✧</span>{detail && <p>{detail}</p>}</header>{children}</section>
}
export function CourtProgress({ value, need, label }: { value: number; need: number; label: string }) {
  const v = Math.min(need, Math.max(0, value))
  return <div className="court-progress"><span>{label}</span><b>{Math.floor(v).toLocaleString('tr-TR')} / {Math.floor(need).toLocaleString('tr-TR')}</b><span role="progressbar" aria-label={label} aria-valuemin={0} aria-valuemax={need} aria-valuenow={v}><i style={{ width: `${need > 0 ? v / need * 100 : 0}%` }} /></span></div>
}
export function CourtVignette({ scene, title, children }: { scene: string; title: string; children: ReactNode }) {
  return <div className="court-vignette"><img src={asset(`/images/game/quests/${scene}.webp`)} alt="" width={96} height={96} /><div><h4>{title}</h4><p>{children}</p></div></div>
}
