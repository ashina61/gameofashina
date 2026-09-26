'use client'

/**
 * DÜNYA HARİTASI (Ikariam'daki dünya görünümü): koordinatlı deniz, üstünde
 * adalar. Her adanın yeri [x:y], lüks yatağı, harikası; üstünde senin şehrin,
 * yapay rakip hükümdarlar ve bağımsız yerleşimler görünür. Bir adaya dokununca
 * altında bilgi kartı açılır.
 */
import { useEffect, useMemo, useRef, useState } from 'react'
import { Anchor, Clock3, Crown, Eye } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { MIRACLES } from '@/lib/game/engine'
import { activeCity, type Empire } from '@/lib/game/empire'
import { ISLANDS, type IslandId } from '@/lib/game/islands'
import { seaTravelMs } from '@/lib/game/expeditions'
import { RIVALS, rivalLevel, seaMinutes } from '@/lib/game/rivals'
import { travelFactor } from '@/lib/game/engine'
import { rivalWarLine } from './ai-panels'

const LUX_TINT: Record<string, string> = { uzum: '#8fae5a', mermer: '#d9cfae', kristal: '#9fc3c9', kukurt: '#d8b85a' }
const U = 44 // bir koordinat birimi (px, viewBox içinde)
const clock = (ms: number) => { const m = Math.round(ms / 60_000); return m >= 60 ? `${Math.floor(m / 60)} sa ${m % 60} dk` : `${m} dk` }

/** Ada kıyısı: kimlikten tohumlanmış gürültülü daire. */
function coast(id: string, cx: number, cy: number, r: number) {
  let h = 0
  for (const ch of id) h = (h * 31 + ch.charCodeAt(0)) >>> 0
  const rnd = () => ((h = (h * 1103515245 + 12345) >>> 0) / 4294967296)
  const ph = [rnd() * 6.28, rnd() * 6.28, rnd() * 6.28]
  const pts: string[] = []
  for (let i = 0; i < 28; i++) {
    const a = (2 * Math.PI * i) / 28
    const k = 1 + 0.12 * Math.sin(2 * a + ph[0]) + 0.08 * Math.sin(3 * a + ph[1]) + 0.05 * Math.sin(5 * a + ph[2])
    pts.push(`${(cx + Math.cos(a) * r * k * 1.15).toFixed(1)},${(cy + Math.sin(a) * r * k * 0.85).toFixed(1)}`)
  }
  return pts.join(' ')
}

export function WorldMap({ empire, now, missing, onSelectCity, onColonize, onViewIsland }: {
  empire: Empire; now: number; missing: string | null
  onSelectCity: (id: string) => void; onColonize: (id: IslandId) => void; onViewIsland: (id: IslandId) => void
}) {
  const here = activeCity(empire)
  const [sel, setSel] = useState<IslandId>(here.islandId)
  const maxX = Math.max(...ISLANDS.map(i => i.x)) + 1.5, maxY = Math.max(...ISLANDS.map(i => i.y)) + 1.5
  const W = maxX * U, H = maxY * U
  const island = ISLANDS.find(i => i.id === sel)!
  const own = empire.cities.find(c => c.islandId === sel)
  const rivals = RIVALS.filter(r => r.islandId === sel)
  const travel = seaTravelMs(here.islandId, sel, here.game)
  const routes = useMemo(() => empire.cities.filter(c => c.id !== here.id).map(c => ISLANDS.find(i => i.id === c.islandId)!), [empire.cities, here.id])
  const home = ISLANDS.find(i => i.id === here.islandId)!
  const at = (id: IslandId) => { const i = ISLANDS.find(x => x.id === id)!; return { x: (i.x + 0.75) * U, y: (i.y + 0.75) * U } }
  const wars = (empire.world?.wars ?? []).map(w => {
    const A = RIVALS.find(r => r.id === w.a)!, B = RIVALS.find(r => r.id === w.b)!
    const p = at(A.islandId), q = at(B.islandId)
    return { id: w.id, same: A.islandId === B.islandId, x1: p.x, y1: p.y, x2: q.x, y2: q.y, title: `${A.city} ile ${B.city} savaşta (yapay rakipler)` }
  })
  const ships = [
    ...(empire.world?.deliveries ?? []).flatMap(d => {
      const r = RIVALS.find(x => x.city === d.from), to = empire.cities.find(c => c.id === d.cityId)
      if (!r || !to || r.islandId === to.islandId) return []
      const dur = seaMinutes(r.islandId, to.islandId) * 60_000 * travelFactor(to.game)
      const k = Math.max(0, Math.min(1, 1 - (d.eta - now) / dur))
      const p = at(r.islandId), q = at(to.islandId)
      return [{ id: d.id, x: p.x + (q.x - p.x) * k, y: p.y + (q.y - p.y) * k, title: `${d.from} gemisi ${to.name} yolunda` }]
    }),
    ...empire.shipments.flatMap(sh => {
      const a = empire.cities.find(c => c.id === sh.from), b = empire.cities.find(c => c.id === sh.to)
      if (!a || !b || a.islandId === b.islandId) return []
      const dur = seaTravelMs(a.islandId, b.islandId, a.game)
      const k = dur ? Math.max(0, Math.min(1, 1 - (sh.eta - now) / dur)) : 1
      const p = at(a.islandId), q = at(b.islandId)
      return [{ id: sh.id, x: p.x + (q.x - p.x) * k, y: p.y + (q.y - p.y) * k, title: `Nakliye: ${a.name} → ${b.name}` }]
    }),
  ]
  const scroller = useRef<HTMLDivElement>(null)
  // Açılışta harita kendi adana ortalanır.
  useEffect(() => {
    const el = scroller.current
    if (!el) return
    el.scrollLeft = Math.max(0, (home.x + 0.75) * U - el.clientWidth / 2)
    el.scrollTop = Math.max(0, (home.y + 0.75) * U - el.clientHeight / 2)
  }, [home.x, home.y])
  return <div className="world-map">
    <div className="world-map-scroll" ref={scroller}>
      <svg viewBox={`0 0 ${W} ${H}`} width={W} height={H} role="img" aria-label="Dünya haritası">
        <defs>
          <radialGradient id="wm-sea" cx="50%" cy="40%" r="75%"><stop offset="0" stopColor="#5fa3b5" /><stop offset="1" stopColor="#2f6f86" /></radialGradient>
          <pattern id="wm-wave" width="36" height="18" patternUnits="userSpaceOnUse"><path d="M2 12 q6 -5 12 0 t12 0" stroke="#bfe0e8" strokeWidth="1" fill="none" opacity="0.35" /></pattern>
        </defs>
        <rect width={W} height={H} fill="url(#wm-sea)" />
        <rect width={W} height={H} fill="url(#wm-wave)" />
        {Array.from({ length: Math.ceil(maxX) }, (_, x) => <g key={`x${x}`}><path d={`M${x * U} 0 V${H}`} stroke="#ffffff" strokeOpacity="0.07" /><text x={x * U + 3} y={11} className="wm-coord">{x}</text></g>)}
        {Array.from({ length: Math.ceil(maxY) }, (_, y) => <g key={`y${y}`}><path d={`M0 ${y * U} H${W}`} stroke="#ffffff" strokeOpacity="0.07" /><text x={3} y={y * U + 11} className="wm-coord">{y}</text></g>)}
        {/* Kendi şehirlerin arasındaki deniz yolları */}
        {routes.map(t => <path key={t.id} d={`M${(home.x + 0.75) * U} ${(home.y + 0.75) * U} L${(t.x + 0.75) * U} ${(t.y + 0.75) * U}`} stroke="#f6ecd6" strokeWidth="2" strokeDasharray="5 5" opacity="0.7" />)}
        {/* Yapay rakiplerin kendi aralarındaki savaşlar: kızıl, akan kesikli çizgi. */}
        {wars.map(w => w.same
          ? <g key={w.id} className="wm-war-mark" transform={`translate(${w.x1} ${w.y1 - 26})`}><title>{w.title}</title><circle r="8" fill="#8a1f14" stroke="#f6ecd6" strokeWidth="1.5" /><path d="M-4 -4 L4 4 M4 -4 L-4 4" stroke="#fff4d8" strokeWidth="1.8" strokeLinecap="round" /></g>
          : <g key={w.id}><title>{w.title}</title>
            <path d={`M${w.x1} ${w.y1} L${w.x2} ${w.y2}`} className="wm-war-line" />
            <g className="wm-war-mark" transform={`translate(${(w.x1 + w.x2) / 2} ${(w.y1 + w.y2) / 2})`}><circle r="8" fill="#8a1f14" stroke="#f6ecd6" strokeWidth="1.5" /><path d="M-4 -4 L4 4 M4 -4 L-4 4" stroke="#fff4d8" strokeWidth="1.8" strokeLinecap="round" /></g>
          </g>)}
        {/* Yoldaki gemiler: rakiplerden gelen mallar ve kendi nakliyelerin. */}
        {ships.map(sh => <g key={sh.id} className="wm-ship" transform={`translate(${sh.x} ${sh.y})`}><title>{sh.title}</title>
          <path d="M-7 1 H7 L4 6 H-4 Z" fill="#6b4424" stroke="#2e1c0e" strokeWidth="0.8" /><path d="M0 1 V-9 L6 -2 H0" fill="#f6ecd6" stroke="#2e1c0e" strokeWidth="0.6" />
        </g>)}
        {ISLANDS.map(i => {
          const cx = (i.x + 0.75) * U, cy = (i.y + 0.75) * U
          const mine = empire.cities.find(c => c.islandId === i.id)
          const rv = RIVALS.filter(r => r.islandId === i.id).length
          const active = i.id === sel
          return <g key={i.id} className="wm-island" role="button" tabIndex={0} aria-label={`${i.name} [${i.x}:${i.y}]`} aria-pressed={active}
            onClick={() => setSel(i.id)} onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') setSel(i.id) }}>
            <polygon points={coast(i.id, cx, cy + 3, 19)} fill="#e7d6a6" opacity="0.55" />
            <polygon points={coast(i.id, cx, cy, 17)} fill={LUX_TINT[i.luxury]} stroke={active ? '#fff3c4' : '#5a4a22'} strokeWidth={active ? 3 : 1.2} />
            <circle cx={cx + 6} cy={cy - 4} r="5" fill="#4f7d4a" opacity="0.8" /><circle cx={cx - 7} cy={cy + 3} r="4" fill="#4f7d4a" opacity="0.7" />
            {mine && <g><circle cx={cx} cy={cy - 2} r="7" fill="#b3261e" stroke="#f6ecd6" strokeWidth="1.5" /><path d={`M${cx - 3} ${cy - 2} l2 2 4 -4`} stroke="#fff" strokeWidth="1.6" fill="none" /></g>}
            {Array.from({ length: rv }, (_, k) => <circle key={k} cx={cx + 10 + k * 7} cy={cy + 10} r="3.5" fill="#24406e" stroke="#f6ecd6" strokeWidth="1" />)}
            <text x={cx} y={cy + 30} className={active ? 'wm-label is-active' : 'wm-label'}>{i.name}</text>
          </g>
        })}
      </svg>
    </div>
    <div className="wm-legend"><span><i className="wm-dot wm-you" />Şehrin</span><span><i className="wm-dot wm-rival" />Yapay rakip</span><span>Renk: lüks yatağı</span>{wars.length > 0 && <span><i className="wm-dot wm-war" />Rakip savaşı</span>}</div>
    <article className="wm-card">
      <div className="wm-card-top">
        <span><span className="eyebrow">[{island.x}:{island.y}] · {island.specialty.toLocaleUpperCase('tr')} YATAĞI</span><strong>{island.name}</strong>
          <small>Harika: {MIRACLES[island.wonder].wonder} ({MIRACLES[island.wonder].name})</small></span>
      </div>
      <ul className="wm-facts">
        <li><Crown className="size-3" />{own ? `Şehrin: ${own.name} (Divanhane ${own.game.buildings.divan})` : 'Burada şehrin yok'}</li>
        {rivals.map(r => <li key={r.id}><span className="wm-dot wm-rival" />{r.city} · {r.ruler} · sv. {rivalLevel(empire, r, now)} (yapay rakip){rivalWarLine(empire, r.id) ? ` · ⚔ ${rivalWarLine(empire, r.id)!.split(' (')[0]}` : ''}</li>)}
        <li><Anchor className="size-3" />Üç bağımsız yerleşim: köy, korsan ini, asi kalesi</li>
        {sel !== here.islandId && <li><Clock3 className="size-3" />{here.name} şehrinden deniz yolu ~{clock(travel)}</li>}
      </ul>
      <div className="batch-row">
        <Button size="sm" variant="outline" onClick={() => onViewIsland(sel)}><Eye data-icon="inline-start" />Adayı gör</Button>
        {own
          ? <Button size="sm" onClick={() => onSelectCity(own.id)} disabled={own.id === here.id}>{own.id === here.id ? 'Bu şehir' : 'Şehre git'}</Button>
          : <Button size="sm" disabled={!!missing} onClick={() => onColonize(sel)}>Koloni kur</Button>}
      </div>
      {!own && missing && <p className="fine-print">{missing}</p>}
    </article>
  </div>
}
