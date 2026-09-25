/**
 * BİRİM ÇİZİMLERİ — her birlik için düz vektör figür (64x64). Kara birlikleri
 * yeşil, deniz birlikleri mavi madalyonda; savaş alanı yuvalarında madalyonsuz
 * (bare) kullanılır. Osmanlı ayrıntıları: börk, sarık, yatağan, kalkan, tuğ...
 */
import type { ReactNode } from 'react'
import { UNITS, type UnitId } from '@/lib/game/engine'

const SKIN = '#e2b487', INK = '#2a1a10', STEEL = '#b9c2c8', WOOD = '#7a4f2a', GOLD = '#e2bd78', RED = '#b3261e'

function Person({ robe, sash, head, skin = SKIN, children, x = 32, y = 0, flip = false }: {
  robe: string; sash?: string; head: ReactNode; skin?: string; children?: ReactNode; x?: number; y?: number; flip?: boolean
}) {
  return <g transform={`translate(${x} ${y})${flip ? ' scale(-1 1)' : ''}`}>
    <ellipse cx="0" cy="58" rx="12" ry="2.6" fill="#1b2a14" opacity="0.25" />
    {/* çizmeler */}
    <rect x="-6" y="50" width="5" height="8" rx="1.5" fill="#5a3a22" /><rect x="1" y="50" width="5" height="8" rx="1.5" fill="#5a3a22" />
    {/* kaftan */}
    <path d="M-10 52 L-7 30 Q0 25 7 30 L10 52 Z" fill={robe} stroke={INK} strokeWidth="1" strokeLinejoin="round" />
    <path d="M0 29 L0 52" stroke={INK} strokeWidth="0.6" opacity="0.4" />
    {sash && <rect x="-8" y="38" width="16" height="3.4" fill={sash} stroke={INK} strokeWidth="0.6" />}
    {/* baş */}
    <circle cx="0" cy="22" r="5.4" fill={skin} stroke={INK} strokeWidth="0.8" />
    <path d="M-3 25 q3 2.4 6 0" stroke={INK} strokeWidth="1.2" fill="none" />
    {head}
    {children}
  </g>
}
const Bork = () => <g><path d="M-5.5 18 L5.5 18 L3 4 Q-1 1 -7 7 Z" fill="#f4efe2" stroke={INK} strokeWidth="0.8" /><rect x="-5.8" y="16.4" width="11.6" height="2.6" fill={GOLD} stroke={INK} strokeWidth="0.5" /><path d="M-1 18 L-1 13" stroke={GOLD} strokeWidth="1.6" /></g>
const Turban = ({ c = '#f6f1e6', cap = RED }: { c?: string; cap?: string }) => <g><ellipse cx="0" cy="17" rx="7" ry="4.2" fill={c} stroke={INK} strokeWidth="0.8" /><path d="M-6 17 Q0 14 6 18" stroke="#cfc6b0" strokeWidth="0.8" fill="none" /><rect x="-2" y="10.5" width="4" height="4" rx="1" fill={cap} /></g>
const Fez = () => <g><path d="M-4.5 18 L4.5 18 L3.6 11 L-3.6 11 Z" fill={RED} stroke={INK} strokeWidth="0.8" /><path d="M0 11 q3 1 3 5" stroke={INK} strokeWidth="0.8" fill="none" /></g>
const Helmet = () => <g><path d="M-6 19 Q-6 9 0 8 Q6 9 6 19 Z" fill={STEEL} stroke={INK} strokeWidth="0.8" /><path d="M0 8 L0 3" stroke={STEEL} strokeWidth="1.6" /><path d="M-6 19 L-7 23 M6 19 L7 23" stroke={STEEL} strokeWidth="1.4" /></g>

function Ship({ hull = '#6b4428', sail = '#efe2c0', masts = 1, lateen = false, oars = false, flag = RED, children }: {
  hull?: string; sail?: string; masts?: number; lateen?: boolean; oars?: boolean; flag?: string; children?: ReactNode
}) {
  const xs = masts === 1 ? [32] : masts === 2 ? [24, 40] : [18, 32, 46]
  return <g>
    <path d="M4 50 Q32 56 60 50" stroke="#4f9bb5" strokeWidth="3" fill="none" opacity="0.7" />
    {oars && [12, 18, 24, 30, 36, 42, 48].map(x => <path key={x} d={`M${x} 44 L${x - 4} 52`} stroke={WOOD} strokeWidth="1.2" />)}
    <path d="M6 40 L58 40 L52 49 Q32 52 12 49 Z" fill={hull} stroke={INK} strokeWidth="1" strokeLinejoin="round" />
    <path d="M8 43 L56 43" stroke={GOLD} strokeWidth="1" opacity="0.8" />
    {xs.map((x, i) => <g key={x}>
      <path d={`M${x} 40 L${x} ${i === Math.floor(xs.length / 2) ? 6 : 12}`} stroke={WOOD} strokeWidth="1.6" />
      {lateen
        ? <path d={`M${x - 12} 36 L${x + 2} ${i === Math.floor(xs.length / 2) ? 8 : 14} L${x + 4} 36 Z`} fill={sail} stroke={INK} strokeWidth="0.8" />
        : <><rect x={x - 8} y={i === Math.floor(xs.length / 2) ? 10 : 16} width="16" height="10" rx="2" fill={sail} stroke={INK} strokeWidth="0.8" />
          <rect x={x - 7} y={i === Math.floor(xs.length / 2) ? 22 : 27} width="14" height="9" rx="2" fill={sail} stroke={INK} strokeWidth="0.8" /></>}
    </g>)}
    <path d={`M${xs[Math.floor(xs.length / 2)]} 6 L${xs[Math.floor(xs.length / 2)] + 9} 8 L${xs[Math.floor(xs.length / 2)]} 11 Z`} fill={flag} />
    {children}
  </g>
}

const FIGURES: Record<UnitId, () => ReactNode> = {
  mizrakci: () => <Person robe="#8a3a24" sash={GOLD} head={<Turban c="#e9e2d0" cap="#5a3a22" />}>
    <path d="M9 56 L9 2" stroke={WOOD} strokeWidth="1.6" /><path d="M9 2 L7 8 L11 8 Z" fill={STEEL} stroke={INK} strokeWidth="0.5" />
    <circle cx="-9" cy="38" r="7" fill="#c9a24e" stroke={INK} strokeWidth="1" /><circle cx="-9" cy="38" r="2.2" fill={RED} />
  </Person>,
  yeniceri: () => <Person robe="#24406e" sash={RED} head={<Bork />}>
    <path d="M8 46 Q14 40 12 30" stroke={STEEL} strokeWidth="2.2" fill="none" strokeLinecap="round" /><rect x="6.5" y="44" width="3" height="5" fill={WOOD} />
    <path d="M-9 50 L-12 20" stroke={WOOD} strokeWidth="1.8" /><path d="M-12 20 L-12.6 16" stroke="#444" strokeWidth="1.6" />
  </Person>,
  deli: () => <Person robe="#7a5a2a" sash="#3a2a1c" head={<g><path d="M-5 18 L5 18 L4 10 L-4 10 Z" fill="#5a3a22" stroke={INK} strokeWidth="0.8" /><path d="M-4 11 Q-14 2 -12 -4 Q-8 4 -3 9 Z M4 11 Q14 2 12 -4 Q8 4 3 9 Z" fill="#f2ead8" stroke={INK} strokeWidth="0.7" /></g>}>
    <path d="M-9 30 Q-12 42 -8 52 L-4 50 Q-7 40 -5 31 Z" fill="#d6a93a" stroke={INK} strokeWidth="0.6" />
    {[[-9, 36], [-8, 42], [-7, 47]].map(([x, y]) => <circle key={y} cx={x} cy={y} r="1" fill={INK} />)}
    <path d="M9 50 L13 26" stroke={WOOD} strokeWidth="2" /><circle cx="13.5" cy="24" r="4" fill={STEEL} stroke={INK} strokeWidth="0.8" />
    <path d="M-12 44 L-6 30 L0 44 Z" fill="#b39c74" stroke={INK} strokeWidth="0.8" opacity="0" />
  </Person>,
  azap: () => <Person robe="#3f6a37" sash="#e9dcc0" head={<Fez />}>
    <path d="M8 44 L16 24" stroke={STEEL} strokeWidth="2" strokeLinecap="round" /><path d="M6 46 L10 42" stroke={GOLD} strokeWidth="2" />
    <rect x="-15" y="32" width="8" height="12" rx="4" fill="#8a5a35" stroke={INK} strokeWidth="0.8" />
  </Person>,
  sipahi: () => <g>
    <ellipse cx="32" cy="58" rx="24" ry="3" fill="#1b2a14" opacity="0.25" />
    {[14, 20, 42, 48].map(x => <rect key={x} x={x} y="44" width="3" height="13" rx="1" fill="#6a4428" />)}
    <path d="M10 44 Q12 32 26 33 L44 33 Q52 30 54 22 L60 24 Q58 34 50 40 L48 46 L12 47 Z" fill="#8a5a35" stroke={INK} strokeWidth="1" strokeLinejoin="round" />
    <path d="M10 38 Q4 42 6 50" stroke="#2a1a10" strokeWidth="3" fill="none" />
    <rect x="24" y="33" width="14" height="6" fill={RED} stroke={INK} strokeWidth="0.6" />
    <g transform="translate(5.6 6) scale(0.82)">
      <Person robe="#b3261e" head={<Helmet />} x={31} y={-10}><path d="M8 34 L24 -4" stroke={WOOD} strokeWidth="1.6" /><path d="M22 -2 L30 0 L24 4 Z" fill={RED} /></Person>
    </g>
  </g>,
  sapanci: () => <Person robe="#8a6a4a" head={<g><ellipse cx="0" cy="17.5" rx="6" ry="3" fill="#6a4a2a" stroke={INK} strokeWidth="0.7" /></g>}>
    <path d="M7 34 Q16 20 12 12" stroke="#5a3a22" strokeWidth="1.2" fill="none" /><circle cx="12" cy="12" r="2.2" fill="#8a8478" stroke={INK} strokeWidth="0.5" />
    <path d="M-8 40 L-12 46" stroke="#5a3a22" strokeWidth="2" />
  </Person>,
  okcu: () => <Person robe="#4f7d4a" sash={GOLD} head={<Turban c="#f6f1e6" cap="#3f6a37" />}>
    <path d="M12 18 Q22 32 12 48" stroke={WOOD} strokeWidth="2" fill="none" /><path d="M12 18 L12 48" stroke="#e9e2d0" strokeWidth="0.6" />
    <path d="M-2 33 L14 33" stroke="#5a3a22" strokeWidth="1" /><path d="M-10 30 L-13 44 L-8 45 L-6 31 Z" fill="#7a4f2a" stroke={INK} strokeWidth="0.6" />
    {[-11, -9, -7].map(x => <path key={x} d={`M${x} 30 L${x} 26`} stroke={RED} strokeWidth="1" />)}
  </Person>,
  tufekci: () => <Person robe="#6a2a3a" sash="#e2bd78" head={<Fez />}>
    <path d="M-6 42 L20 24" stroke={WOOD} strokeWidth="2.6" strokeLinecap="round" /><path d="M8 32 L22 22" stroke="#555" strokeWidth="1.6" />
    <path d="M-9 34 Q-14 38 -10 44" stroke="#e9dcc0" strokeWidth="2.4" fill="none" strokeLinecap="round" />
  </Person>,
  kocbasi: () => <g>
    <ellipse cx="32" cy="58" rx="26" ry="3" fill="#1b2a14" opacity="0.25" />
    <path d="M8 34 L32 16 L56 34 Z" fill="#8a5a35" stroke={INK} strokeWidth="1" /><path d="M14 30 L32 18 L50 30" stroke="#5a3a22" strokeWidth="1" fill="none" />
    <rect x="10" y="34" width="44" height="12" fill="#6b4428" stroke={INK} strokeWidth="1" />
    <path d="M2 40 L50 40" stroke="#4a3020" strokeWidth="5" strokeLinecap="round" /><path d="M1 36 L6 40 L1 44 Z" fill={STEEL} stroke={INK} strokeWidth="0.6" />
    {[16, 48].map(x => <g key={x}><circle cx={x} cy="50" r="6" fill="#5a3a22" stroke={INK} strokeWidth="1" /><circle cx={x} cy="50" r="1.6" fill={GOLD} /></g>)}
  </g>,
  mancinik: () => <g>
    <ellipse cx="32" cy="58" rx="26" ry="3" fill="#1b2a14" opacity="0.25" />
    <rect x="10" y="46" width="44" height="6" fill="#6b4428" stroke={INK} strokeWidth="1" />
    <path d="M18 46 L30 20 L42 46" stroke="#7a4f2a" strokeWidth="3" fill="none" />
    <path d="M12 30 L54 12" stroke="#5a3a22" strokeWidth="3" strokeLinecap="round" /><rect x="8" y="28" width="9" height="9" fill="#8a8478" stroke={INK} strokeWidth="0.8" />
    <path d="M54 12 Q58 20 52 24" stroke="#5a3a22" strokeWidth="1" fill="none" /><circle cx="52" cy="25" r="3" fill="#8a8478" stroke={INK} strokeWidth="0.6" />
    {[16, 48].map(x => <circle key={x} cx={x} cy="53" r="4.5" fill="#5a3a22" stroke={INK} strokeWidth="1" />)}
  </g>,
  topcu: () => <g>
    <ellipse cx="32" cy="58" rx="26" ry="3" fill="#1b2a14" opacity="0.25" />
    <path d="M10 40 L50 26 L52 32 L14 48 Z" fill="#b8872e" stroke={INK} strokeWidth="1" /><ellipse cx="51" cy="29" rx="3" ry="4" fill="#3a2a1c" />
    <path d="M18 38 L20 44" stroke={GOLD} strokeWidth="1.6" /><path d="M30 34 L32 40" stroke={GOLD} strokeWidth="1.6" />
    <path d="M12 46 L34 42 L30 52 L10 52 Z" fill="#6b4428" stroke={INK} strokeWidth="1" />
    <circle cx="22" cy="50" r="7" fill="#5a3a22" stroke={INK} strokeWidth="1" />{[0, 60, 120].map(a => <path key={a} d="M15 50 L29 50" transform={`rotate(${a} 22 50)`} stroke={GOLD} strokeWidth="0.8" />)}
    {[[44, 52], [50, 54], [47, 49]].map(([x, y]) => <circle key={x + y} cx={x} cy={y} r="2.6" fill="#333" />)}
  </g>,
  humbaraci: () => <Person robe="#5a4a3a" sash={RED} head={<Helmet />}>
    <path d="M6 32 L14 20" stroke={SKIN} strokeWidth="3" strokeLinecap="round" /><circle cx="15" cy="17" r="4.5" fill="#2a2a2a" stroke={INK} strokeWidth="0.6" />
    <path d="M17 13 Q19 9 22 10" stroke="#8a5a35" strokeWidth="0.8" fill="none" /><circle cx="22" cy="10" r="1.6" fill="#f2a53a" />
  </Person>,
  asci: () => <g>
    <Person robe="#e9e2d0" sash="#8a3a24" head={<g><path d="M-5 18 L5 18 L6 8 Q0 5 -6 8 Z" fill="#f6f3ea" stroke={INK} strokeWidth="0.8" /></g>} x={22}>
      <path d="M6 30 L20 20" stroke={WOOD} strokeWidth="1.6" />
    </Person>
    <ellipse cx="46" cy="44" rx="12" ry="4" fill="#3a2a1c" /><path d="M34 44 Q34 56 46 56 Q58 56 58 44 Z" fill="#b8872e" stroke={INK} strokeWidth="1" />
    <path d="M40 38 q2 -4 0 -8 M46 38 q2 -4 0 -8 M52 38 q2 -4 0 -8" stroke="#dcd6cc" strokeWidth="1.4" fill="none" opacity="0.8" />
  </g>,
  hekim: () => <Person robe="#2f6b4c" sash="#e9dcc0" head={<Turban c="#f6f1e6" cap="#2f6b4c" />}>
    <rect x="6" y="36" width="10" height="9" rx="2" fill="#8a5a35" stroke={INK} strokeWidth="0.8" /><path d="M11 37.5 L11 43.5 M8 40.5 L14 40.5" stroke={GOLD} strokeWidth="1.4" />
    <path d="M-10 32 L-12 50" stroke={WOOD} strokeWidth="1.4" />
  </Person>,
  casus: () => <Person robe="#2e2a33" head={<path d="M-7 22 Q-7 10 0 9 Q7 10 7 22 L5 20 Q0 14 -5 20 Z" fill="#3a3540" stroke={INK} strokeWidth="0.8" />}>
    <path d="M-10 52 Q-14 36 -7 28" fill="none" stroke="#3a3540" strokeWidth="3" />
    <path d="M8 40 L14 32" stroke={STEEL} strokeWidth="1.6" /><circle cx="-2" cy="21" r="0.9" fill="#f2c94c" /><circle cx="2" cy="21" r="0.9" fill="#f2c94c" />
  </Person>,
  kadirga: () => <Ship lateen oars hull="#7a4a26" />,
  karamursel: () => <Ship lateen hull="#8a5a35" sail="#e9dcc0" />,
  ates_gemisi: () => <Ship lateen oars hull="#5a2a1c">
    <path d="M58 38 Q66 30 60 22 Q64 32 56 36 Z" fill="#f2a53a" /><path d="M58 38 Q62 32 58 28 Q60 34 56 37 Z" fill="#e23b2e" />
  </Ship>,
  mancinik_gemisi: () => <Ship masts={2} lateen hull="#6b4428">
    <path d="M40 38 L50 26" stroke="#5a3a22" strokeWidth="2.4" /><rect x="36" y="34" width="8" height="5" fill="#8a8478" stroke={INK} strokeWidth="0.6" />
  </Ship>,
  humbara_gemisi: () => <Ship masts={2} hull="#4a3020">
    <path d="M26 40 L30 30 L38 30 L40 40 Z" fill="#555" stroke={INK} strokeWidth="0.8" /><circle cx="34" cy="28" r="2.4" fill="#2a2a2a" />
  </Ship>,
  ikmal_gemisi: () => <Ship masts={2} hull="#6b4428" flag="#2f6b4c">
    {[16, 22, 28].map(x => <rect key={x} x={x} y="34" width="5" height="6" rx="1" fill="#b8872e" stroke={INK} strokeWidth="0.5" />)}
  </Ship>,
  kalyon: () => <Ship masts={3} hull="#5a3620" />,
  nakliye: () => <Ship masts={2} hull="#8a5a35" sail="#f2ead8" flag="#2d4a78">
    {[14, 20, 26, 32].map(x => <rect key={x} x={x} y="34" width="5" height="6" fill="#a8764a" stroke={INK} strokeWidth="0.5" />)}
  </Ship>,
}

/** Birlik figürü. bare: madalyonsuz (savaş alanı yuvaları). */
export function UnitFigure({ id, size = 56, bare = false, title }: { id: UnitId; size?: number; bare?: boolean; title?: string }) {
  const sea = UNITS[id].branch === 'deniz'
  const gid = `unit-bg-${sea ? 's' : 'l'}`
  return <svg viewBox="0 0 64 64" width={size} height={size} role="img" aria-label={title ?? UNITS[id].name} className="unit-figure">
    {!bare && <>
      <defs><radialGradient id={gid} cx="50%" cy="40%" r="65%">
        <stop offset="0" stopColor={sea ? '#cfe3ea' : '#e9e6c8'} /><stop offset="1" stopColor={sea ? '#7fa9b8' : '#a9b77e'} />
      </radialGradient></defs>
      <rect x="1" y="1" width="62" height="62" rx="12" fill={`url(#${gid})`} stroke="#8a5a22" strokeWidth="2" />
    </>}
    {FIGURES[id]()}
  </svg>
}
