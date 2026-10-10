'use client'

import { useEffect, useRef, type ReactNode, type RefObject } from 'react'
import { Minus, Plus, RotateCcw } from './ui-art'

/** Only the map artwork moves; controls and the surrounding game UI stay fixed. */
export function MapViewport({ children, width, height, fitWidth = false, fitContain = false, className = '', viewportRef }: {
  children: ReactNode; width: number; height: number; fitWidth?: boolean; fitContain?: boolean
  className?: string; viewportRef?: RefObject<HTMLDivElement | null>
}) {
  const localRef = useRef<HTMLDivElement>(null)
  const ref = viewportRef ?? localRef
  const spacer = useRef<HTMLDivElement>(null)
  const content = useRef<HTMLDivElement>(null)
  const zoom = useRef<(factor: number) => void>(() => {})
  const reset = useRef<() => void>(() => {})

  useEffect(() => {
    const el = ref.current!, space = spacer.current!, art = content.current!
    let scale = 1, baseWidth = width, baseHeight = height, moved = false
    const points = new Map<number, { x: number; y: number }>()
    let last: { x: number; y: number; gap: number } | null = null
    const draw = () => {
      space.style.width = `${baseWidth * scale}px`
      space.style.height = `${baseHeight * scale}px`
      art.style.width = `${baseWidth}px`
      art.style.height = `${baseHeight}px`
      art.style.transform = `scale(${scale})`
      el.dataset.mapScale = String(scale)
    }
    const zoomAt = (next: number, x: number, y: number) => {
      const old = scale
      scale = Math.max(.65, Math.min(3, next))
      const mapX = (el.scrollLeft + x) / old, mapY = (el.scrollTop + y) / old
      draw()
      el.scrollLeft = mapX * scale - x
      el.scrollTop = mapY * scale - y
    }
    zoom.current = factor => zoomAt(scale * factor, el.clientWidth / 2, el.clientHeight / 2)
    reset.current = () => zoomAt(1, el.clientWidth / 2, el.clientHeight / 2)
    const resize = new ResizeObserver(() => {
      if (fitWidth || fitContain) { baseWidth = Math.min(560, el.clientWidth, fitContain ? el.clientHeight * width / height : Infinity); baseHeight = baseWidth * height / width }
      draw()
    })
    resize.observe(el)
    draw()
    const sample = () => {
      const [a, b] = [...points.values()]
      if (!a) return null
      return b ? { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2, gap: Math.hypot(a.x - b.x, a.y - b.y) } : { ...a, gap: 0 }
    }
    const down = (e: PointerEvent) => {
      if (e.button !== 0) return
      if (!points.size) moved = false
      points.set(e.pointerId, { x: e.clientX, y: e.clientY })
      last = sample()
      if (points.size > 1) moved = true
    }
    const move = (e: PointerEvent) => {
      if (!points.has(e.pointerId) || !last) return
      points.set(e.pointerId, { x: e.clientX, y: e.clientY })
      const next = sample()!
      const dx = next.x - last.x, dy = next.y - last.y
      if (!moved && Math.hypot(dx, dy) < 5) return
      moved = true
      el.setPointerCapture(e.pointerId)
      e.preventDefault()
      if (next.gap && last.gap) {
        const box = el.getBoundingClientRect()
        zoomAt(scale * next.gap / last.gap, last.x - box.left, last.y - box.top)
      }
      el.scrollLeft -= dx
      el.scrollTop -= dy
      last = next
    }
    const up = (e: PointerEvent) => { points.delete(e.pointerId); last = sample() }
    const click = (e: MouseEvent) => { if (moved) { e.preventDefault(); e.stopPropagation() } }
    const wheel = (e: WheelEvent) => {
      e.preventDefault()
      const box = el.getBoundingClientRect()
      zoomAt(scale * Math.exp(-e.deltaY * .002), e.clientX - box.left, e.clientY - box.top)
    }
    el.addEventListener('pointerdown', down)
    el.addEventListener('pointermove', move, { passive: false })
    window.addEventListener('pointerup', up)
    window.addEventListener('pointercancel', up)
    el.addEventListener('click', click, true)
    el.addEventListener('wheel', wheel, { passive: false })
    return () => {
      resize.disconnect()
      el.removeEventListener('pointerdown', down)
      el.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
      window.removeEventListener('pointercancel', up)
      el.removeEventListener('click', click, true)
      el.removeEventListener('wheel', wheel)
    }
  }, [width, height, fitWidth, fitContain, ref])

  return <div className={`map-viewport-frame ${className}`}>
    <div className="map-viewport" ref={ref}>
      <div className="map-viewport-space" ref={spacer} style={{ width, height }}>
        <div className="map-viewport-art" ref={content} style={{ width, height }}>{children}</div>
      </div>
    </div>
    <div className="map-zoom-controls" aria-label="Harita yakınlaştırma">
      <button type="button" aria-label="Haritayı uzaklaştır" onClick={() => zoom.current(1 / 1.25)}><Minus /></button>
      <button type="button" aria-label="Harita yakınlaştırmasını sıfırla" onClick={() => reset.current()}><RotateCcw /></button>
      <button type="button" aria-label="Haritayı yakınlaştır" onClick={() => zoom.current(1.25)}><Plus /></button>
    </div>
  </div>
}
