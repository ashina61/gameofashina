'use client'

import { useEffect, useRef, type ReactNode } from 'react'
import { ChevronDown } from './ui-art'

/** Secondary actions appear on request, leaving the painted city unobstructed. */
export function CityAgenda({ children, count, open, onOpenChange }: { children: ReactNode; count: number; open: boolean; onOpenChange: (open: boolean) => void }) {
  const setOpen = onOpenChange
  const root = useRef<HTMLDivElement>(null)
  const toggle = useRef<HTMLButtonElement>(null)
  useEffect(() => {
    if (!open) return
    const outside = (event: MouseEvent) => { if (event.target instanceof Node && !root.current?.contains(event.target)) setOpen(false) }
    const escape = (event: KeyboardEvent) => { if (event.key === 'Escape') { event.stopPropagation(); setOpen(false); toggle.current?.focus() } }
    document.addEventListener('click', outside)
    document.addEventListener('keydown', escape, true)
    return () => { document.removeEventListener('click', outside); document.removeEventListener('keydown', escape, true) }
  }, [open, setOpen])
  return <div className="city-agenda" ref={root}>
    <button type="button" ref={toggle} className="city-agenda-toggle" aria-expanded={open} aria-controls="city-agenda-content" onClick={() => setOpen(!open)}>Gündem{count > 0 && <span>{count}</span>}<ChevronDown aria-hidden="true" /></button>
    {open && <div id="city-agenda-content" className="city-agenda-content" onClick={event => { if ((event.target as Element).closest('button')) setOpen(false) }}>{children}</div>}
  </div>
}
