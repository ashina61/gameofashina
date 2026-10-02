'use client'
/**
 * SAYARAK DEĞİŞEN SAYI (V2 Faz 3.8) — sayı yeni değerine atlamaz, kısa sürede
 * sayarak gider (büyük değişim biraz daha uzun sürer). Metin doğrudan DOM'a
 * yazılır; her karede React yeniden çizmez. Az harekette anında değişir.
 */
import { useLayoutEffect, useRef } from 'react'
import { lowMotion } from '@/lib/motion'

export function CountUp({ value, format, className }: { value: number; format: (n: number) => string; className?: string }) {
  const ref = useRef<HTMLElement>(null)
  const shown = useRef<number | null>(null)
  const fmt = useRef(format)
  fmt.current = format
  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    const from = shown.current
    if (from === null || from === value || lowMotion() || Math.abs(value - from) < 1) {
      shown.current = value
      el.textContent = fmt.current(value)
      return
    }
    const start = performance.now()
    const duration = Math.min(900, 280 + Math.log10(Math.abs(value - from) + 1) * 110)
    let raf = 0
    const step = (t: number) => {
      const k = Math.min(1, (t - start) / duration)
      const v = from + (value - from) * (1 - (1 - k) ** 3)
      shown.current = v
      el.textContent = fmt.current(k < 1 ? v : value)
      if (k < 1) raf = requestAnimationFrame(step)
      else shown.current = value
    }
    raf = requestAnimationFrame(step)
    return () => cancelAnimationFrame(raf)
  }, [value])
  return <b ref={ref} className={className} />
}
