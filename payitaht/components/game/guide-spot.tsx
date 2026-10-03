'use client'
/**
 * İLK 10 DAKİKA REHBERİ (V2 Faz 5.1): ilk sekiz hedef boyunca ekranda
 * basılacak TEK düğme parlar ve üstünde bir ok sallanır. Hedef bittiyse
 * görev şeridindeki "Ödülü al" parlar; sayfa açık ama düğme henüz
 * basılamıyorsa (kaynak bekleniyor) hiçbir şey parlamaz, sayfa nedenini
 * zaten söyler. Hedefler `data-guide` işaretleriyle bulunur.
 */
import { useEffect, useRef, useState } from 'react'
import { GUIDED_STEPS, OBJECTIVES, UNITS, UNIT_IDS, objectiveDone, type Game, type UnitId } from '@/lib/game/engine'
import { t } from '@/lib/i18n/tr'
import { lowMotion } from '@/lib/motion'

const TARGETS: Record<string, string[]> = {
  'first-upgrade': ['.bp-of-divan .bp-upgrade-button'],
  'first-academy': ['.bp-of-medrese .bp-upgrade-button'],
  'first-worker': ['.bp-of-medrese .workforce-confirm button', `.bp-of-medrese [aria-label="${t.action.increase}"]`],
  'first-research': ['[data-guide="research"]'],
  barracks: ['.bp-of-kisla .bp-upgrade-button'],
  walls: ['.bp-of-surlar .bp-upgrade-button'],
  troops: ['[data-guide="recruit-mizrakci"]', '[data-guide="recruit-yeniceri"]'],
  'first-raid': ['[data-guide="raid"]', '[data-guide="all-mizrakci"]', '[data-guide="all-yeniceri"]', '[data-guide="npc-koy"]'],
}
/** Adımın sayfası: açıksa (inşaat sürerken düğme yerine çubuk olsa da) oyuncu bekler. */
const PAGE: Record<string, string> = {
  'first-upgrade': '.bp-of-divan', 'first-academy': '.bp-of-medrese', 'first-worker': '.bp-of-medrese',
  barracks: '.bp-of-kisla', walls: '.bp-of-surlar',
}
const CHIP = '.quest-chip-go'
/** Rehberin bir kez görünür yere kaydırdığı düğmeler. */
const scrolled = new WeakSet<Element>()
/** Görev şeridi açık bir sayfanın altında kalırsa oyuncu önce sayfayı kapatmalı. */
const LEAVE = ['.bp-back', `[aria-label="${t.action.close}"]`, `[aria-label="${t.action.back}"]`, '[data-guide="to-city"]']

/** Görünür, basılabilir ve üstü örtülü olmayan öğe mi? */
function usable(el: Element): el is HTMLElement {
  if (!(el instanceof HTMLElement) || (el as HTMLButtonElement).disabled || !el.checkVisibility?.({ opacityProperty: true, visibilityProperty: true })) return false
  const r = el.getBoundingClientRect()
  if (r.width < 4 || r.height < 4 || r.bottom < 0 || r.top > innerHeight) return false
  const hit = document.elementFromPoint(Math.min(innerWidth - 1, Math.max(0, r.left + r.width / 2)), Math.min(innerHeight - 1, Math.max(0, r.top + r.height / 2)))
  return !hit || el.contains(hit) || hit.contains(el)
}

const isLandSoldier = (id: UnitId) => UNITS[id]?.branch === 'kara' && UNITS[id].role !== 'spy'
const landSoldiers = (game: Game) => UNIT_IDS.reduce((n, id) => n + (isLandSoldier(id) ? game.army[id] : 0), 0)

export function pickGuideTarget(game: Game): HTMLElement | null {
  const step = OBJECTIVES.slice(0, GUIDED_STEPS).find(o => !game.claimed.includes(o.id))
  if (!step || document.querySelector('.frg')) return null
  const first = (sels: string[]) => {
    for (const sel of sels) for (const el of document.querySelectorAll(sel)) if (usable(el)) return el
    return null
  }
  // Hedef bittiyse ödül görev şeridinde alınır; şerit bir sayfanın altında
  // kalmışsa sayfanın geri/kapat düğmesi parlar (yoksa oyuncu ne yapacağını bilmez).
  if (objectiveDone(game, step.id)) return first([CHIP, ...LEAVE])
  // İlk bölük: eğitimde olanlarla beş kişi tamamsa eğitim bitene kadar bekle
  // (yoksa ok "1 eğit"i parlatmayı sürdürür ve oyuncu gereğinden çok asker basar).
  if (step.id === 'troops' && landSoldiers(game) + game.drills.reduce((n, j) => n + (isLandSoldier(j.id as UnitId) ? j.count ?? 0 : 0), 0) >= 5) return null
  const targets = TARGETS[step.id] ?? []
  const hit = first(targets)
  if (hit) return hit
  // Düğme sayfada ama ekranın dışında: bir kez görünür yere kaydır (oyuncu
  // sonra kendisi kaydırırsa onu geri çekiştirmeyiz).
  for (const sel of targets) for (const el of document.querySelectorAll(sel)) {
    if (el instanceof HTMLElement && !(el as HTMLButtonElement).disabled && !scrolled.has(el)) {
      const r = el.getBoundingClientRect()
      if (r.width >= 4 && (r.bottom < 0 || r.top > innerHeight)) { scrolled.add(el); el.scrollIntoView({ block: 'center', behavior: lowMotion() ? 'auto' : 'smooth' }); return null }
    }
  }
  // Doğru sayfadayız ama düğme henüz basılamıyor (kaynak bekleniyor): hiçbir şey parlamaz.
  if (targets.some(sel => document.querySelector(sel)) || (PAGE[step.id] && document.querySelector(PAGE[step.id]))) return null
  // Yanlış sayfa açıksa önce görev şeridi, o da örtülüyse geri/kapat.
  return first([CHIP, ...LEAVE])
}

export function GuideSpot({ game }: { game: Game }) {
  const [box, setBox] = useState<DOMRect | null>(null)
  const current = useRef<HTMLElement | null>(null)
  const gameRef = useRef(game)
  gameRef.current = game
  useEffect(() => {
    // Kare başına değil, saniyede dört kez bakar: her karede düzen okumak
    // zayıf telefonda ana iş parçacığını tıkar. Kaydırmada da hemen yenilenir.
    const tick = () => {
      if (document.visibilityState === 'hidden') return
      const next = pickGuideTarget(gameRef.current)
      if (next !== current.current) {
        current.current?.classList.remove('guide-glow')
        next?.classList.add('guide-glow')
        current.current = next
      }
      // Kutu hemen ölçülür: güncelleyici sonra çalışır, o an hedef değişmiş olabilir.
      const rect = next?.getBoundingClientRect() ?? null
      setBox(prev => rect ? same(prev, rect) : null)
    }
    tick()
    const id = window.setInterval(tick, 250)
    const onScroll = () => { const rect = current.current?.getBoundingClientRect(); if (rect) setBox(prev => same(prev, rect)) }
    window.addEventListener('scroll', onScroll, { capture: true, passive: true })
    return () => {
      window.clearInterval(id)
      window.removeEventListener('scroll', onScroll, { capture: true })
      current.current?.classList.remove('guide-glow'); current.current = null
    }
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
