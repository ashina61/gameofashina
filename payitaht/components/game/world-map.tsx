'use client'
import { KumSaatiArt } from './resource-art'

/**
 * DÜNYA HARİTASI (Ikariam'daki dünya görünümü): koordinatlı deniz, üstünde
 * adalar. Her adanın yeri [x:y], lüks yatağı, harikası; üstünde senin şehrin,
 * yapay rakip hükümdarlar ve bağımsız yerleşimler görünür. V2 Faz 2.4: harita
 * bütün sayfayı kaplar; bir adaya dokununca bilgisi alt çekmecede açılır,
 * harita arkada görünür ve dokunulabilir kalır.
 */
import { useEffect, useMemo, useRef, useState } from 'react'
import { Anchor, Crown, Eye, X } from './ui-art'
import { GameButton } from './game-button'
import { MapViewport } from './map-viewport'
import { BottomSheet } from './bottom-sheet'
import { asset } from '@/lib/asset'
import { MIRACLES } from '@/lib/game/engine'
import { activeCity, type Empire } from '@/lib/game/empire'
import { ISLANDS, type IslandId } from '@/lib/game/islands'
import { seaTravelMs } from '@/lib/game/expeditions'
import { RIVALS, rivalLevel, seaMinutes } from '@/lib/game/rivals'
import { travelFactor } from '@/lib/game/engine'
import { rivalWarLine } from './ai-panels'
import { t } from '@/lib/i18n/tr'

const LUX_TINT: Record<string, string> = { kahve: '#7b9a5b', mermer: '#c5b99b', kristal: '#8eb0b2', kukurt: '#bca35d' }
const U = 44 // bir koordinat birimi (px, viewBox içinde)
const clock = (ms: number) => { const m = Math.round(ms / 60_000); return m >= 60 ? `${Math.floor(m / 60)} sa ${m % 60} dk` : `${m} dk` }


export function WorldMap({ empire, now, missing, colonyCost, onSelectCity, onColonize, onViewIsland }: {
  empire: Empire; now: number; missing: string | null; colonyCost: string
  onSelectCity: (id: string) => void; onColonize: (id: IslandId) => void; onViewIsland: (id: IslandId) => void
}) {
  const here = activeCity(empire)
  const [sel, setSel] = useState<IslandId | null>(null)
  const maxX = Math.max(...ISLANDS.map(i => i.x)) + 1.5, maxY = Math.max(...ISLANDS.map(i => i.y)) + 1.5
  const W = maxX * U, H = maxY * U
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
          <filter id="wm-shadow" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="2.5" /></filter>
          {/* V2 Faz 4.6 — boyalı deniz: fırça dokusu (türbülans) ve sığlık ışığı. */}
          <filter id="wm-paint" x="0" y="0" width="100%" height="100%">
            <feTurbulence type="fractalNoise" baseFrequency="0.012 0.03" numOctaves="3" seed="7" result="n" />
            <feColorMatrix in="n" type="matrix" values="0 0 0 0 0.85  0 0 0 0 0.93  0 0 0 0 0.9  0 0 0 0.55 -0.18" />
          </filter>
          <radialGradient id="wm-shallow" cx="50%" cy="50%" r="50%"><stop offset=".55" stopColor="#5fa6a8" stopOpacity=".55" /><stop offset="1" stopColor="#5fa6a8" stopOpacity="0" /></radialGradient>
          <marker id="wm-arrow" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse"><path d="M0 1 L9 5 L0 9 Z" fill="#f6ecd6" /></marker>
        </defs>
        <rect width={W} height={H} fill="url(#wm-sea)" />
        <rect width={W} height={H} filter="url(#wm-paint)" opacity=".5" />
        {/* Adaların çevresinde sığ su: açık turkuaz hale. */}
        {ISLANDS.map(i => <ellipse key={`sh-${i.id}`} cx={(i.x + 0.75) * U} cy={(i.y + 0.75) * U + 4} rx="46" ry="44" fill="url(#wm-shallow)" />)}
        {/* Sparse, irregular sea marks read as water without a tiled wallpaper. */}
        {Array.from({ length: Math.ceil(W / 39) * Math.ceil(H / 34) }, (_, n) => {
          const cols = Math.ceil(W / 39), x = (n % cols) * 39 + ((n * 17) % 21), y = Math.floor(n / cols) * 34 + ((n * 13) % 17)
          return <path key={n} d={`M${x} ${y} q5 -2 10 0 m3 2 q4 -1 8 0`} fill="none" stroke="#9fc2c0" strokeWidth=".7" strokeOpacity={n % 4 === 0 ? '.22' : '.10'} />
        })}
        {Array.from({ length: Math.ceil(maxX) }, (_, x) => <g key={`x${x}`}><path d={`M${x * U} 0 V${H}`} stroke="#d8cfad" strokeOpacity="0.09" /><text x={x * U + 3} y={11} className="wm-coord" data-tiny>{x}</text></g>)}
        {Array.from({ length: Math.ceil(maxY) }, (_, y) => <g key={`y${y}`}><path d={`M0 ${y * U} H${W}`} stroke="#d8cfad" strokeOpacity="0.09" /><text x={3} y={y * U + 11} className="wm-coord" data-tiny>{y}</text></g>)}
        <g className="wm-compass" transform={`translate(${W - 38} 36)`} aria-hidden="true"><circle r="18" fill="#102e38" fillOpacity=".45" stroke="#c8b57c" strokeOpacity=".7" /><path d="M0 -13 L3 -3 13 0 3 3 0 13 -3 3 -13 0 -3 -3Z" fill="#d7c58e" /><circle r="2.5" fill="#713b24" /><text y="-22">K</text></g>
        {/* Kendi şehirlerin arasındaki deniz yolları */}
        {routes.map(t => {
          // Kavisli deniz yolu: ortası hafif yana kayar, ucunda ok; altında koyu gölge çizgisi.
          const x0 = (home.x + 0.75) * U, y0 = (home.y + 0.75) * U, x1 = (t.x + 0.75) * U, y1 = (t.y + 0.75) * U
          const mx = (x0 + x1) / 2 - (y1 - y0) * 0.18, my = (y0 + y1) / 2 + (x1 - x0) * 0.18
          const d = `M${x0} ${y0} Q${mx} ${my} ${x1} ${y1}`
          return <g key={t.id} className="wm-route">
            <path d={d} stroke="#0e2a33" strokeOpacity=".45" strokeWidth="4.5" fill="none" />
            <path d={d} stroke="#f6ecd6" strokeWidth="2.2" strokeDasharray="7 6" fill="none" markerEnd="url(#wm-arrow)" />
          </g>
        })}
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
            {/* Ada, kendi boyalı ada görselinden kırpılmış simgeyle çizilir (tools/art/island-thumbs.py). */}
            <ellipse cx={cx + 3} cy={cy + 7} rx="26" ry="27" fill="#071e29" opacity=".5" filter="url(#wm-shadow)" />
            {/* Kıyı köpüğü: adanın çevresinde kırık beyaz halka, yavaşça döner. */}
            <ellipse cx={cx} cy={cy + 6} rx="27" ry="29" fill="none" stroke="#e8f6f1" strokeOpacity=".55" strokeWidth="1.6" strokeDasharray="3 5" className="wm-foam" />
            <image href={asset(`/images/game/islands/map-${i.id}.webp`)} x={cx - 25} y={cy - 30} width="50" height="60" preserveAspectRatio="xMidYMid meet" />
            {active && <ellipse cx={cx} cy={cy} rx="31" ry="35" fill="none" stroke="#fff2bf" strokeWidth="2.2" strokeDasharray="6 4" />}
            <circle cx={cx - 21} cy={cy + 22} r="5" fill={LUX_TINT[i.luxury]} stroke="#f6ecd6" strokeWidth="1.3"><title>Lüks yatağı</title></circle>
            {mine && <g><circle cx={cx} cy={cy - 2} r="7" fill="#b3261e" stroke="#f6ecd6" strokeWidth="1.5" /><path d={`M${cx - 3} ${cy - 2} l2 2 4 -4`} stroke="#fff" strokeWidth="1.6" fill="none" /></g>}
            {Array.from({ length: rv }, (_, k) => <circle key={k} cx={cx + 10 + k * 7} cy={cy + 10} r="3.5" fill="#24406e" stroke="#f6ecd6" strokeWidth="1" />)}
            <text x={cx} y={cy + 44} className={active ? 'wm-label is-active' : 'wm-label'}>{i.name}</text>
          </g>
        })}
      </svg>
    </MapViewport>
    <div className="wm-legend" aria-label="Harita işaretleri"><span><i className="wm-dot wm-you" />Şehrin</span><span><i className="wm-dot wm-rival" />Yapay rakip</span>{wars.length > 0 && <span><i className="wm-dot wm-war" />Savaş</span>}</div>
    {!sel && <p className="wm-tip">Bir adaya dokun</p>}
    {sel && <IslandSheet key={sel} empire={empire} now={now} id={sel} missing={missing} colonyCost={colonyCost} onClose={() => setSel(null)}
      onSelectCity={onSelectCity} onColonize={onColonize} onViewIsland={onViewIsland} />}
  </div>
}

function IslandSheet({ empire, now, id, missing, colonyCost, onClose, onSelectCity, onColonize, onViewIsland }: {
  empire: Empire; now: number; id: IslandId; missing: string | null; colonyCost: string; onClose: () => void
  onSelectCity: (id: string) => void; onColonize: (id: IslandId) => void; onViewIsland: (id: IslandId) => void
}) {
  const here = activeCity(empire)
  const island = ISLANDS.find(i => i.id === id)!
  const own = empire.cities.find(c => c.islandId === id)
  const rivals = RIVALS.filter(r => r.islandId === id)
  const travel = seaTravelMs(here.islandId, id, here.game)
  return <BottomSheet label={`${island.name} adası`} onClose={onClose} modeless>
    <header className="bp-bar">
      <div className="bp-title"><h1>{island.name}</h1><small>[{island.x}:{island.y}] · {island.specialty} yatağı · Harika: {MIRACLES[island.wonder].wonder}</small></div>
      <button type="button" className="bp-back" onClick={onClose} aria-label={t.action.close}><X /></button>
    </header>
    <div className="bp-scroll wm-sheet">
      <ul className="wm-facts">
        <li><Crown className="size-4" />{own ? `Şehrin: ${own.name} (Divanhane ${own.game.buildings.divan})` : 'Burada şehrin yok'}</li>
        {rivals.map(r => <li key={r.id}><span className="wm-dot wm-rival" />{r.city} · {r.ruler} · Sv. {rivalLevel(empire, r, now)} (yapay rakip){rivalWarLine(empire, r.id) ? ` · ⚔ ${rivalWarLine(empire, r.id)!.split(' (')[0]}` : ''}</li>)}
        <li><Anchor className="size-4" />Üç bağımsız yerleşim: köy, korsan ini, asi kalesi</li>
        {id !== here.islandId && <li><KumSaatiArt className="size-4" />{here.name} şehrinden deniz yolu ~{clock(travel)}</li>}
      </ul>
      <div className="batch-row">
        <GameButton variant="outline" onClick={() => onViewIsland(id)}><Eye data-icon="inline-start" />Adayı gör</GameButton>
        {own
          ? <GameButton onClick={() => onSelectCity(own.id)} disabled={own.id === here.id}>{own.id === here.id ? 'Bu şehir' : 'Şehre git'}</GameButton>
          : <GameButton disabled={!!missing} onClick={() => onColonize(id)}>Koloni kur</GameButton>}
      </div>
      {!own && <p className="fine-print">{missing ?? `Koloni bedeli: ${colonyCost}.`}</p>}
    </div>
  </BottomSheet>
}
