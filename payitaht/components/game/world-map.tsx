'use client'
import { KumSaatiArt } from './resource-art'

/**
 * DÜNYA HARİTASI (Ikariam'daki dünya görünümü): koordinatlı deniz, üstünde
 * adalar. Her adanın yeri [x:y], lüks yatağı, harikası; üstünde senin şehrin,
 * yapay rakip hükümdarlar ve bağımsız yerleşimler görünür. Bir adaya dokununca
 * altında bilgi kartı açılır.
 */
import { useEffect, useMemo, useRef, useState } from 'react'
import { Anchor, Crown, Eye } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { MapViewport } from './map-viewport'
import { MIRACLES } from '@/lib/game/engine'
import { activeCity, type Empire } from '@/lib/game/empire'
import { ISLANDS, type IslandId } from '@/lib/game/islands'
import { seaTravelMs } from '@/lib/game/expeditions'
import { RIVALS, rivalLevel, seaMinutes } from '@/lib/game/rivals'
import { travelFactor } from '@/lib/game/engine'
import { rivalWarLine } from './ai-panels'

const LUX_TINT: Record<string, string> = { uzum: '#7b9a5b', mermer: '#c5b99b', kristal: '#8eb0b2', kukurt: '#bca35d' }
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

/** Cartographic relief is anchored to the island, so panning never changes it. */
function islandRelief(id: string, cx: number, cy: number, tint: string) {
  let seed = 0
  for (const ch of id) seed = (seed * 33 + ch.charCodeAt(0)) >>> 0
  const hill = (seed % 7) - 3
  return <g aria-hidden="true">
    <path d={`M${cx - 16} ${cy + 4} Q${cx - 8} ${cy - 8 + hill} ${cx - 2} ${cy - 3} Q${cx + 5} ${cy - 13 - hill} ${cx + 15} ${cy + 3} L${cx + 16} ${cy + 12} Q${cx} ${cy + 20} ${cx - 16} ${cy + 9}Z`} fill={tint} opacity=".8" />
    <path d={`M${cx - 10} ${cy + 8} Q${cx - 2} ${cy + 3} ${cx + 13} ${cy + 8}`} fill="none" stroke="#f5e3ac" strokeOpacity=".45" strokeWidth="1.2" />
    <path d={`M${cx - 10} ${cy + 1} l5 -8 4 6 5 -10 8 12`} fill="none" stroke="#344f3d" strokeOpacity=".55" strokeWidth="1.1" strokeLinejoin="round" />
    <path d={`M${cx - 4} ${cy - 3} l3 -4 2 3 M${cx + 5} ${cy - 5} l2 -3 2 3`} fill="none" stroke="#efe1b5" strokeOpacity=".8" strokeWidth=".9" />
    {[[-12, 6], [-8, 10], [11, 4], [14, 8], [hill, 12]].map(([x, y], k) => <g key={k} transform={`translate(${cx + x} ${cy + y})`}>
      <path d="M0 4 V-3" stroke="#3e4c32" strokeWidth=".9" /><ellipse cy="-4" rx={k % 2 ? 2.1 : 1.5} ry={k % 2 ? 3 : 4} fill="#325b43" />
    </g>)}
    <path d={`M${cx - 1} ${cy + 12} L${cx + 7} ${cy + 13} M${cx + 1} ${cy + 10} V${cy + 14}`} stroke="#775b38" strokeWidth="1.1" />
  </g>
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
    <MapViewport width={W} height={H} viewportRef={scroller} className="world-map-scroll">
      <svg viewBox={`0 0 ${W} ${H}`} width={W} height={H} role="img" aria-label="Dünya haritası">
        <defs>
          <radialGradient id="wm-sea" cx="48%" cy="42%" r="78%"><stop offset="0" stopColor="#367686" /><stop offset=".62" stopColor="#245c6b" /><stop offset="1" stopColor="#173e4f" /></radialGradient>
          <linearGradient id="wm-land" x1="0" y1="0" x2=".8" y2="1"><stop offset="0" stopColor="#d5c78e" /><stop offset="1" stopColor="#9da96c" /></linearGradient>
          <filter id="wm-shadow" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="2.5" /></filter>
        </defs>
        <rect width={W} height={H} fill="url(#wm-sea)" />
        {/* Sparse, irregular sea marks read as water without a tiled wallpaper. */}
        {Array.from({ length: Math.ceil(W / 39) * Math.ceil(H / 34) }, (_, n) => {
          const cols = Math.ceil(W / 39), x = (n % cols) * 39 + ((n * 17) % 21), y = Math.floor(n / cols) * 34 + ((n * 13) % 17)
          return <path key={n} d={`M${x} ${y} q5 -2 10 0 m3 2 q4 -1 8 0`} fill="none" stroke="#9fc2c0" strokeWidth=".7" strokeOpacity={n % 4 === 0 ? '.22' : '.10'} />
        })}
        {Array.from({ length: Math.ceil(maxX) }, (_, x) => <g key={`x${x}`}><path d={`M${x * U} 0 V${H}`} stroke="#d8cfad" strokeOpacity="0.09" /><text x={x * U + 3} y={11} className="wm-coord">{x}</text></g>)}
        {Array.from({ length: Math.ceil(maxY) }, (_, y) => <g key={`y${y}`}><path d={`M0 ${y * U} H${W}`} stroke="#d8cfad" strokeOpacity="0.09" /><text x={3} y={y * U + 11} className="wm-coord">{y}</text></g>)}
        <g className="wm-compass" transform={`translate(${W - 38} 36)`} aria-hidden="true"><circle r="18" fill="#102e38" fillOpacity=".45" stroke="#c8b57c" strokeOpacity=".7" /><path d="M0 -13 L3 -3 13 0 3 3 0 13 -3 3 -13 0 -3 -3Z" fill="#d7c58e" /><circle r="2.5" fill="#713b24" /><text y="-22">K</text></g>
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
            <polygon points={coast(i.id, cx + 2, cy + 5, 23)} fill="#071e29" opacity=".5" filter="url(#wm-shadow)" />
            <polygon points={coast(i.id, cx, cy + 2, 23)} fill="#e4cf94" stroke="#f4dfad" strokeWidth="1" />
            <polygon points={coast(i.id, cx, cy, 19.5)} fill="url(#wm-land)" stroke={active ? '#fff2bf' : '#715b3d'} strokeWidth={active ? 2.4 : 1} />
            {islandRelief(i.id, cx, cy, LUX_TINT[i.luxury])}
            {mine && <g><circle cx={cx} cy={cy - 2} r="7" fill="#b3261e" stroke="#f6ecd6" strokeWidth="1.5" /><path d={`M${cx - 3} ${cy - 2} l2 2 4 -4`} stroke="#fff" strokeWidth="1.6" fill="none" /></g>}
            {Array.from({ length: rv }, (_, k) => <circle key={k} cx={cx + 10 + k * 7} cy={cy + 10} r="3.5" fill="#24406e" stroke="#f6ecd6" strokeWidth="1" />)}
            <text x={cx} y={cy + 39} className={active ? 'wm-label is-active' : 'wm-label'}>{i.name}</text>
          </g>
        })}
      </svg>
    </MapViewport>
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
        {sel !== here.islandId && <li><KumSaatiArt className="size-3" />{here.name} şehrinden deniz yolu ~{clock(travel)}</li>}
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
