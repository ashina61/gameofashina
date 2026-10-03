'use client'
/**
 * TERİM (V2 Faz 5.10): oyun terimini ⓘ ile gösterir; dokununca sözlükteki
 * tek cümlelik açıklama altında açılır. Sözlükte olmayan etiket düz yazı
 * olarak kalır (glossary.test.ts bina etiketlerinin hepsini denetler).
 */
import { useId, useState, type ReactNode } from 'react'
import { explain } from '@/lib/game/glossary'
import { Info } from './ui-art'

export function Term({ label, children }: { label: string; children?: ReactNode }) {
  const text = explain(label)
  const [open, setOpen] = useState(false)
  const id = useId()
  if (!text) return <>{children ?? label}</>
  return <span className="term">
    <button type="button" className="term-btn" aria-expanded={open} aria-controls={id} onClick={() => setOpen(v => !v)}>
      {children ?? label}<Info aria-hidden="true" className="term-i" />
    </button>
    {open && <small id={id} className="term-note" role="note">{text}</small>}
  </span>
}
