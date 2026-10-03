'use client'
/**
 * İLK 10 DAKİKA REHBERİ (V2 Faz 5.1): ilk sekiz hedef boyunca ekranda
 * basılacak TEK düğme parlar ve üstünde bir ok sallanır. Hedef bittiyse
 * görev şeridindeki "Ödülü al" parlar; sayfa açık ama düğme henüz
 * basılamıyorsa (kaynak bekleniyor) hiçbir şey parlamaz, sayfa nedenini
 * zaten söyler. Hedefler `data-guide` işaretleriyle bulunur.
 */
import { useEffect, useRef, useState } from 'react'
import { GUIDED_STEPS, OBJECTIVES, objectiveDone, type Game } from '@/lib/game/engine'

const TARGETS: Record<string, string[]> = {
  'first-upgrade': ['.bp-of-divan .bp-upgrade-button'],
  'first-academy': ['.bp-of-medrese .bp-upgrade-button'],
  'first-worker': ['.bp-of-medrese .workforce-confirm button', '.bp-of-medrese [aria-label="Bir artır"]'],
  'first-research': ['[data-guide="research"]'],
  barracks: ['.bp-of-kisla .bp-upgrade-button'],
  walls: ['.bp-of-surlar .bp-upgrade-button'],
  troops: ['[data-guide="recruit-mizrakci"]', '[data-guide="recruit-yeniceri"]'],
  'first-raid': ['[data-guide="raid"]', '[data-guide="all-mizrakci"]', '[data-guide="all-yeniceri"]', '[data-guide="npc-koy"]'],
}
const CHIP = '.quest-chip-go'
const OPEN = '.bp, [role="dialog"]'

/** Görünür, basılabilir ve üstü örtülü olmayan öğe mi? */
function usable(el: Element): el is HTMLElement {
  if (!(el instanceof HTMLElement) || (el as HTMLButtonElement).disabled || !el.checkVisibility?.({ opacityProperty: true, visibilityProperty: true })) return false
  const r = el.getBoundingClientRect()
  if (r.width < 4 || r.height < 4 || r.bottom < 0 || r.top > innerHeight) return false
  const hit = document.elementFromPoint(Math.min(innerWidth - 1, Math.max(0, r.left + r.width / 2)), Math.min(innerHeight - 1, Math.max(0, r.top + r.height / 2)))
  return !hit || el.contains(hit) || hit.contains(el)
}

export function pickGuideTarget(game: Game): HTMLElement | null {
  const step = OBJECTIVES.slice(0, GUIDED_STEPS).find(o => !game.claimed.includes(o.id))
  if (!step || document.querySelector('.frg')) return null
  const list = objectiveDone(game, step.id) ? [CHIP] : [...(TARGETS[step.id] ?? []), CHIP]
  for (const sel of list) for (const el of document.querySelectorAll(sel)) if (usable(el)) return el
  return null
}

export function GuideSpot({ game }: { game: Game }) {
  const [box, setBox] = useState<DOMRect | null>(null)
  const current = useRef<HTMLElement | null>(null)
  const gameRef = useRef(game)
  gameRef.current = game
  useEffect(() => {
    let frame = 0, last = 0
    const loop = (t: number) => {
      frame = requestAnimationFrame(loop)
      if (t - last < 250) { if (current.current) setBox(prev => same(prev, current.current!.getBoundingClientRect())); return }
      last = t
      const next = pickGuideTarget(gameRef.current)
      if (next !== current.current) {
        current.current?.classList.remove('guide-glow')
        next?.classList.add('guide-glow')
        current.current = next
      }
      setBox(prev => next ? same(prev, next.getBoundingClientRect()) : null)
    }
    frame = requestAnimationFrame(loop)
    return () => { cancelAnimationFrame(frame); current.current?.classList.remove('guide-glow'); current.current = null }
  }, [])
  if (!box) return null
  const above = box.top > 70
  // Geniş düğmede (inşa çubuğu) ok sağa kayar: üstteki bedel jetonlarını örtmesin.
  const x = box.width > innerWidth * 0.6 ? box.left + box.width * 0.84 : box.left + box.width / 2
  const style = { left: x, top: above ? box.top - 44 : box.bottom + 4 }
  return <span className={`guide-arrow${above ? '' : ' is-below'}`} style={style} aria-hidden="true">
    <svg viewBox="0 0 34 40" width="34" height="40"><path d="M11 2 H23 V20 H31 L17 38 L3 20 H11 Z" fill="var(--c-gold)" stroke="var(--c-ink)" strokeWidth="2.5" strokeLinejoin="round" /></svg>
  </span>
}
/** Kutu değişmediyse aynı nesneyi döndürür (gereksiz çizim olmasın). */
function same(prev: DOMRect | null, r: DOMRect) {
  return prev && Math.abs(prev.left - r.left) < 0.5 && Math.abs(prev.top - r.top) < 0.5 && prev.width === r.width && prev.height === r.height ? prev : r
}
