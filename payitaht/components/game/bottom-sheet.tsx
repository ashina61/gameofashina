'use client'

/**
 * ALT ÇEKMECE (V2 Faz 1.6) — haritada seçilen şeyin bilgisi tam sayfa yerine
 * alttan açılır; harita arkada görünür kalır. Tutamaçtan ya da başlıktan
 * aşağı çekince (90 px) ya da arka plana dokununca kapanır. Escape de kapatır.
 */
import { useEffect, useRef, useState, type PointerEvent, type ReactNode } from 'react'

export function BottomSheet({ label, onClose, children }: { label: string; onClose: () => void; children: ReactNode }) {
  const [drag, setDrag] = useState(0)
  const start = useRef<number | null>(null)
  useEffect(() => {
    const key = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', key)
    return () => window.removeEventListener('keydown', key)
  }, [onClose])
  const down = (e: PointerEvent<HTMLDivElement>) => {
    // Yalnız tutamaç/başlık şeridinden sürüklenir; içerideki düğmeler etkilenmez.
    const t = e.target as HTMLElement
    if (!t.closest('.sheet-handle, .bp-bar') || t.closest('button, a, input, select, textarea')) return
    start.current = e.clientY
    e.currentTarget.setPointerCapture(e.pointerId)
  }
  const move = (e: PointerEvent<HTMLDivElement>) => { if (start.current !== null) setDrag(Math.max(0, e.clientY - start.current)) }
  const up = () => {
    if (start.current === null) return
    start.current = null
    if (drag > 90) onClose()
    else setDrag(0)
  }
  return <>
    <div className="sheet-backdrop" onClick={onClose} aria-hidden="true" />
    <div className="bp bp-sheet" role="dialog" aria-modal="true" aria-label={label}
      style={drag ? { transform: `translateY(${drag}px)`, transition: 'none' } : undefined}>
      <div className="sheet-grip" onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up}>
        <span className="sheet-handle" aria-hidden="true" />
        {children}
      </div>
    </div>
  </>
}
