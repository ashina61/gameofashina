/**
 * UÇAN JETONLAR (V2 Faz 3.1, 3.2) — ödül alınınca mal jetonları karttan üst
 * bardaki sayaca uçar; inşaat başlayınca harcanan mallar sayaçtan düğmeye
 * uçar. Simge, üst bardaki çipin kendi boyalı simgesinden kopyalanır; React
 * gerekmez, efekt bitince öğe silinir. Varınca çip kısa bir nabız atar.
 * Az harekette uçuş yok, yalnız çip nabzı (sayının değiştiği yeri gösterir).
 */
import { lowMotion, particles, tokenCount } from './motion'

const STOCK = new Set(['gold', 'wood', 'stone', 'knowledge'])
const chipOf = (good: string) => document.querySelector<HTMLElement>(`.ika-chip[data-k="${STOCK.has(good) ? good : 'lux'}"]`)

function layer() {
  let el = document.querySelector<HTMLElement>('.fx-layer')
  if (!el) {
    el = document.createElement('div')
    el.className = 'fx-layer'
    el.setAttribute('aria-hidden', 'true')
    document.body.appendChild(el)
  }
  return el
}

function pulse(chip: HTMLElement, delay: number) {
  chip.animate([{ transform: 'scale(1)' }, { transform: 'scale(1.18)', filter: 'brightness(1.35)' }, { transform: 'scale(1)' }],
    { duration: 320, delay, easing: 'ease-out' })
}

const center = (r: DOMRect) => ({ x: r.left + r.width / 2, y: r.top + r.height / 2 })

/**
 * `from`: ödülün geldiği öğe (kart, düğme). `spend`: yön ters, sayaçtan öğeye.
 * Döner: son jetonun varış süresi (ms), sıradaki efekt buna göre beklesin.
 */
export function flyGoods(from: Element | null | undefined, goods: Partial<Record<string, number>>, spend = false): number {
  if (typeof document === 'undefined' || !from) return 0
  const entries = Object.entries(goods).filter(([, n]) => (n ?? 0) > 0) as [string, number][]
  if (!entries.length) return 0
  const quiet = lowMotion()
  const src = center(from.getBoundingClientRect())
  let last = 0
  entries.forEach(([good, amount], gi) => {
    const chip = chipOf(good)
    if (!chip) return
    const icon = chip.querySelector('i')
    const dst = center(chip.getBoundingClientRect())
    if (quiet || !icon || typeof chip.animate !== 'function') { if (typeof chip.animate === 'function') pulse(chip, 0); return }
    const a = spend ? dst : src, b = spend ? src : dst
    const n = particles(tokenCount(amount))
    for (let i = 0; i < n; i++) {
      const t = document.createElement('span')
      t.className = 'fx-token'
      t.appendChild(icon.cloneNode(true))
      t.style.left = `${a.x}px`
      t.style.top = `${a.y}px`
      layer().appendChild(t)
      const dx = b.x - a.x, dy = b.y - a.y
      // Kavis: yolun ortası yukarı ve biraz yana kayar; her jeton biraz farklı.
      const bend = (i % 2 ? 1 : -1) * (18 + i * 7), lift = -40 - (i % 3) * 14
      const delay = gi * 90 + i * 65, duration = 620 + (i % 3) * 70
      last = Math.max(last, delay + duration)
      const anim = t.animate([
        { transform: 'translate(-50%, -50%) scale(.55)', opacity: 0 },
        { transform: 'translate(-50%, -50%) scale(1.05)', opacity: 1, offset: 0.14 },
        { transform: `translate(calc(-50% + ${dx / 2 + bend}px), calc(-50% + ${dy / 2 + lift}px)) scale(1.1)`, opacity: 1, offset: 0.5 },
        { transform: `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px)) scale(.7)`, opacity: 0.85 },
      ], { duration, delay, easing: 'cubic-bezier(.45,.05,.4,1)', fill: 'both' })
      anim.onfinish = () => t.remove()
      anim.oncancel = () => t.remove()
    }
    if (!spend) pulse(chip, gi * 90 + 600)
  })
  return last
}
